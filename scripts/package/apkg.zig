//! apkg — 备考平台 2027 · Android APK 打包器（Zig，宿主端工具）
//!
//! 输入：原始 WebView 壳 APK + 我们的资源（URL / 名称 / offline.html / libxuex_core.so）
//! 输出：重新组装并打补丁的 APK（随后由 android-package-signer 做 v2 签名）
//!
//! 补丁内容（全部长度可控、结构安全）：
//!   1. classes.dex        — 等长替换 WebView 加载 URL（31 字节槽位）+ 重算 adler32/sha1 头
//!   2. resources.arsc     — 全局字符串池替换 app 名称（重建池数据区 + 偏移表）
//!   3. assets/offline.html — 替换为品牌离线页
//!   4. + lib/arm64-v8a/libxuex_core.so（Zig 编译的 aarch64 库，STORE + 4096 对齐）
//!
//! 未改动的条目：原始 DEFLATE 压缩数据逐字节复用（零重压缩、零失真）。
//! 改动条目：STORE 存储 + zipalign（数据 4 字节对齐；.so 4096 对齐，
//! 因 manifest extractNativeLibs=false 时系统直接从 APK 加载库）。
//!
//! 用法：apkg <orig.apk> <out.apk> [url] [label] [offline.html] [lib.so]
//!
//! 设计原则：可复现（确定性时间戳/条目顺序）、鲁棒（dex 按字节特征定位 URL、
//! arsc 按字符串内容定位池项，不依赖硬编码偏移）、可解释（每步打印校验值）、
//! 不过度设计（不引入压缩器、不重写未改动的 zip 条目）。

const std = @import("std");
const sha1 = @import("sha1.zig");

// ---------------------------------------------------------------------------
// 小端序读写
// ---------------------------------------------------------------------------

fn u16le(b: []const u8, off: usize) u16 {
    return @as(u16, b[off]) | (@as(u16, b[off + 1]) << 8);
}

fn u32le(b: []const u8, off: usize) u32 {
    return @as(u32, b[off]) | (@as(u32, b[off + 1]) << 8) |
        (@as(u32, b[off + 2]) << 16) | (@as(u32, b[off + 3]) << 24);
}

fn putU16(b: []u8, off: usize, v: u16) void {
    b[off] = @intCast(v & 0xff);
    b[off + 1] = @intCast((v >> 8) & 0xff);
}

fn putU32(b: []u8, off: usize, v: u32) void {
    b[off] = @intCast(v & 0xff);
    b[off + 1] = @intCast((v >> 8) & 0xff);
    b[off + 2] = @intCast((v >> 16) & 0xff);
    b[off + 3] = @intCast((v >> 24) & 0xff);
}

// ---------------------------------------------------------------------------
// 校验算法
// ---------------------------------------------------------------------------

fn adler32(data: []const u8) u32 {
    // 分块规约（每 5552 字节），防止 b 在 u32 内溢出
    var a: u32 = 1;
    var b: u32 = 0;
    var i: usize = 0;
    while (i < data.len) {
        const take = @min(5552, data.len - i);
        var j: usize = 0;
        while (j < take) : (j += 1) {
            a += data[i + j];
            b += a;
        }
        a %= 65521;
        b %= 65521;
        i += take;
    }
    return (b << 16) | a;
}

fn crc32(data: []const u8) u32 {
    var table = [_]u32{0} ** 256;
    var i: u32 = 0;
    while (i < 256) : (i += 1) {
        var c = i;
        var k: u32 = 0;
        while (k < 8) : (k += 1) {
            c = if (c & 1 != 0) 0xEDB88320 ^ (c >> 1) else c >> 1;
        }
        table[i] = c;
    }
    var c: u32 = 0xFFFFFFFF;
    for (data) |byte| {
        c = table[@intCast((c ^ byte) & 0xff)] ^ (c >> 8);
    }
    return c ^ 0xFFFFFFFF;
}

// ---------------------------------------------------------------------------
// zip 结构
// ---------------------------------------------------------------------------

const ZipEntry = struct {
    name: []const u8,
    method: u16, // 0=STORE, 8=DEFLATE
    crc: u32,
    csize: u32,
    usize_: u32,
    local_off: u32,
};

fn parseZip(data: []const u8, gpa: std.mem.Allocator) !std.ArrayList(ZipEntry) {
    var i: usize = data.len;
    var eocd: ?usize = null;
    while (i > 22) {
        i -= 1;
        if (i + 22 <= data.len and
            data[i] == 0x50 and data[i + 1] == 0x4b and data[i + 2] == 0x05 and data[i + 3] == 0x06)
        {
            eocd = i;
            break;
        }
    }
    const e = eocd orelse return error.BadZip;
    const cd_off = u32le(data, e + 16);
    const count = u16le(data, e + 10);

    var list = std.ArrayList(ZipEntry).empty;
    var p: usize = cd_off;
    var n: usize = 0;
    while (n < count) : (n += 1) {
        if (p + 46 > data.len or u32le(data, p) != 0x02014b50) return error.BadZip;
        const name_len = u16le(data, p + 28);
        const extra_len = u16le(data, p + 30);
        const comment_len = u16le(data, p + 32);
        list.append(gpa, .{
            .name = data[p + 46 .. p + 46 + name_len],
            .method = u16le(data, p + 10),
            .crc = u32le(data, p + 16),
            .csize = u32le(data, p + 20),
            .usize_ = u32le(data, p + 24),
            .local_off = u32le(data, p + 42),
        }) catch return error.OutOfMemory;
        p += 46 + name_len + extra_len + comment_len;
    }
    return list;
}

fn entryCompressed(data: []const u8, e: *const ZipEntry) []const u8 {
    const lo = e.local_off;
    if (lo + 30 > data.len or u32le(data, lo) != 0x04034b50) @panic("zip: local header 签名错误");
    const start = lo + 30 + u16le(data, lo + 26) + u16le(data, lo + 28);
    return data[start .. start + e.csize];
}

// ---------------------------------------------------------------------------
// dex 补丁：等长 URL 替换 + adler32/sha1 头
// ---------------------------------------------------------------------------

pub const DEX_URL_LEN: usize = 31;

fn patchDex(dex: []u8, old_url: []const u8, new_url: []const u8) !void {
    if (new_url.len != DEX_URL_LEN) {
        std.debug.print("apkg: 新 URL 必须恰好 {d} 字节（实际 {d}）\n", .{ DEX_URL_LEN, new_url.len });
        return error.UrlLength;
    }
    const idx = std.mem.indexOfPos(u8, dex, 0x70, old_url) orelse return error.UrlNotFound;
    // idx 即 URL 数据首字节（ULEB 在其前 1 字节，长度 31 不变）
    const slot = idx;
    @memcpy(dex[slot .. slot + DEX_URL_LEN], new_url);
    const body = dex[32..];
    putU32(dex, 0x08, adler32(body));
    const digest = sha1.digest(body);
    @memcpy(dex[0x0c..0x0c + 20], &digest);
    std.debug.print("dex: URL @0x{x} → {s}\n  adler32=0x{x:0>8}  sha1={s}\n", .{ slot, new_url, adler32(body), &digest });
}

// ---------------------------------------------------------------------------
// resources.arsc 补丁：全局字符串池替换（重建数据区 + 偏移表）
// ---------------------------------------------------------------------------

const ARSC_POOL: u32 = 0x000c; // RES_TABLE 头(12B) + packageCount(4B) 之后的全局池

fn ulebLen(arsc: []const u8, p: usize) u32 {
    const b0 = arsc[p];
    if (b0 < 0x80) return b0;
    return (b0 & 0x7f) | (@as(u32, arsc[p + 1]) << 7);
}

fn ulebBytes(l: u32) usize {
    return if (l < 0x80) 1 else 2;
}

/// 重叠块移动（后移 / 前移均安全）
fn memmoveBlock(buf: []u8, dst: usize, src: usize, n: usize) void {
    const d = buf[dst .. dst + n];
    const s = buf[src .. src + n];
    if (src < dst) {
        var i: usize = n;
        while (i > 0) {
            i -= 1;
            d[i] = s[i];
        }
    } else {
        @memcpy(d, s);
    }
}

fn patchArsc(arsc: []u8, new_label: []const u8) !void {
    if (u16le(arsc, ARSC_POOL) != 0x0001) return error.ArscLayout;
    const sc = u32le(arsc, 0x14); // stringCount
    const sstart = u32le(arsc, 0x20);
    const table: usize = ARSC_POOL + 28;
    const base: usize = ARSC_POOL + sstart + 1; // aapt2 在数据区首留 1 字节

    // 按内容定位 "My Application"
    var target: ?u32 = null;
    var i: u32 = 0;
    while (i < sc) : (i += 1) {
        const o = u32le(arsc, table + 4 * i);
        const p = base + o;
        const l = ulebLen(arsc, p);
        const ub = ulebBytes(l);
        if (p + ub + l < arsc.len and std.mem.eql(u8, arsc[p + ub .. p + ub + l], "My Application")) {
            target = i;
            break;
        }
    }
    const ti = target orelse return error.LabelNotFound;
    const toff = u32le(arsc, table + 4 * ti);
    const tpos = base + toff;
    const ub = ulebBytes(ulebLen(arsc, tpos));
    const old_len: usize = 14; // "My Application"

    // argv 已是 UTF-8 字节序列（0.15 移除了 utf8ByteSequence，直接用字节长度）
    const new_bytes: []const u8 = new_label;
    if (new_bytes.len >= 128) return error.LabelTooLong; // uleb 保持 1 字节
    const delta: isize = @as(isize, @intCast(new_bytes.len)) - @as(isize, old_len);

    // 从旧项末尾到【文件末尾】（含池剩余数据区 + 其后全部 chunk）整体平移 delta
    const old_item: usize = ub + old_len + 1;
    const new_item: usize = 1 + new_bytes.len + 1;
    if (tpos + old_item > arsc.len) return error.ArscLayout;

    // 尾部整体平移 delta
    if (delta != 0) {
        memmoveBlock(arsc, tpos + new_item, tpos + old_item, arsc.len - tpos - old_item);
        if (delta > 0) {
            putU32(arsc, ARSC_POOL + 4, u32le(arsc, ARSC_POOL + 4) + @as(u32, @intCast(delta)));
            putU32(arsc, 4, u32le(arsc, 4) + @as(u32, @intCast(delta)));
        } else {
            const d = @as(u32, @intCast(-delta));
            putU32(arsc, ARSC_POOL + 4, u32le(arsc, ARSC_POOL + 4) - d);
            putU32(arsc, 4, u32le(arsc, 4) - d);
        }
        // 平移后的尾部末尾会残留旧字节（delta>0 时）—— 文件总长由调用方截断/扩展
    }

    // 写新项
    arsc[tpos] = @intCast(new_bytes.len);
    @memcpy(arsc[tpos + 1 .. tpos + 1 + new_bytes.len], new_bytes);
    arsc[tpos + 1 + new_bytes.len] = 0;

    // 偏移表：ti 之后全部 += delta
    var k: u32 = ti + 1;
    while (k < sc) : (k += 1) {
        const pos: usize = table + 4 * k;
        const v = u32le(arsc, pos);
        putU32(arsc, pos, if (delta > 0) v + @as(u32, @intCast(delta)) else v - @as(u32, @intCast(-delta)));
    }
    std.debug.print("arsc: label idx={d} {d}B → {d}B (delta={})\n", .{ ti, old_len, new_bytes.len, delta });
}

// ---------------------------------------------------------------------------
// 默认参数
// ---------------------------------------------------------------------------

const DEFAULT_URL = "http://10.0.2.2:3000/#xuex_2027"; // 恰好 31B：模拟器环回 + 片段填充
const DEFAULT_LABEL = "智能备考平台2027";
const OLD_URL = "https://github.com/bishwassagar";

// ---------------------------------------------------------------------------
// 组装
// ---------------------------------------------------------------------------

const Replacements = struct {
    dex: []const u8,
    arsc: []const u8,
    arsc_delta: isize,
    offline: ?[]const u8,
    lib: ?[]const u8,
};

/// 追加一个 zip 条目（local + 中央目录记录）
fn appendEntry(
    list: *std.ArrayList(u8),
    cd: *std.ArrayList(u8),
    gpa: std.mem.Allocator,
    name: []const u8,
    data: []const u8,
    align_to: u32,
) !void {
    // 对齐目标是【数据偏移】（zipalign 语义）= local header 30B + 文件名
    const data_off = list.items.len + 30 + name.len;
    var pad: usize = (align_to - data_off % align_to) % align_to;
    while (pad > 0) {
        list.append(gpa, 0) catch return error.OutOfMemory;
        pad -= 1;
    }
    const lh: u32 = @intCast(list.items.len);
    const crc = crc32(data);

    var l30: [30]u8 = undefined;
    putU32(&l30, 0, 0x04034b50);
    putU16(&l30, 4, 20); // version needed
    putU16(&l30, 6, 0); // flags
    putU16(&l30, 8, 0); // method = STORE
    putU16(&l30, 10, 0x0021); // DOS time（确定性）
    putU16(&l30, 12, 0x5A21); // DOS date
    putU32(&l30, 14, crc);
    putU32(&l30, 18, @intCast(data.len));
    putU32(&l30, 22, @intCast(data.len));
    putU16(&l30, 26, @intCast(name.len));
    putU16(&l30, 28, 0);
    for (l30) |b| list.append(gpa, b) catch return error.OutOfMemory;
    for (name) |b| list.append(gpa, b) catch return error.OutOfMemory;
    for (data) |b| list.append(gpa, b) catch return error.OutOfMemory;

    var cb: [46]u8 = undefined;
    putU32(&cb, 0, 0x02014b50);
    putU16(&cb, 4, 0x031e); // made by
    putU16(&cb, 6, 20);
    putU16(&cb, 8, 0);
    putU16(&cb, 10, 0); // STORE
    putU16(&cb, 12, 0x0021);
    putU16(&cb, 14, 0x5A21);
    putU32(&cb, 16, crc);
    putU32(&cb, 20, @intCast(data.len));
    putU32(&cb, 24, @intCast(data.len));
    putU16(&cb, 28, @intCast(name.len));
    putU16(&cb, 30, 0);
    putU16(&cb, 32, 0);
    putU16(&cb, 34, 0);
    putU16(&cb, 36, 0);
    putU32(&cb, 38, 0);
    putU32(&cb, 42, lh);
    for (cb) |b| cd.append(gpa, b) catch return error.OutOfMemory;
    for (name) |b| cd.append(gpa, b) catch return error.OutOfMemory;
}

/// 原样复用原始 DEFLATE/STORE 条目（压缩数据零改动）
fn appendReused(
    list: *std.ArrayList(u8),
    cd: *std.ArrayList(u8),
    gpa: std.mem.Allocator,
    orig: []const u8,
    e: *const ZipEntry,
) !void {
    const data = entryCompressed(orig, e);
    const lh: u32 = @intCast(list.items.len);

    var l30: [30]u8 = undefined;
    putU32(&l30, 0, 0x04034b50);
    putU16(&l30, 4, 20);
    putU16(&l30, 6, 0);
    putU16(&l30, 8, e.method);
    putU16(&l30, 10, 0x0021);
    putU16(&l30, 12, 0x5A21);
    putU32(&l30, 14, e.crc);
    putU32(&l30, 18, e.csize);
    putU32(&l30, 22, e.usize_);
    putU16(&l30, 26, @intCast(e.name.len));
    putU16(&l30, 28, 0);
    for (l30) |b| list.append(gpa, b) catch return error.OutOfMemory;
    for (e.name) |b| list.append(gpa, b) catch return error.OutOfMemory;
    for (data) |b| list.append(gpa, b) catch return error.OutOfMemory;

    var cb: [46]u8 = undefined;
    putU32(&cb, 0, 0x02014b50);
    putU16(&cb, 4, 0x031e);
    putU16(&cb, 6, 20);
    putU16(&cb, 8, 0);
    putU16(&cb, 10, e.method);
    putU16(&cb, 12, 0x0021);
    putU16(&cb, 14, 0x5A21);
    putU32(&cb, 16, e.crc);
    putU32(&cb, 20, e.csize);
    putU32(&cb, 24, e.usize_);
    putU16(&cb, 28, @intCast(e.name.len));
    putU16(&cb, 30, 0);
    putU16(&cb, 32, 0);
    putU16(&cb, 34, 0);
    putU16(&cb, 36, 0);
    putU32(&cb, 38, 0);
    putU32(&cb, 42, lh);
    for (cb) |b| cd.append(gpa, b) catch return error.OutOfMemory;
    for (e.name) |b| cd.append(gpa, b) catch return error.OutOfMemory;
}

/// 真正的 JAR 签名文件（META-INF/MANIFEST.MF、*.SF、*.RSA、*.DSA、*.EC）
fn isSignFile(name: []const u8) bool {
    if (!std.mem.startsWith(u8, name, "META-INF/")) return false;
    const base = name[9..];
    if (std.mem.eql(u8, base, "MANIFEST.MF")) return true;
    return std.mem.endsWith(u8, base, ".SF") or
        std.mem.endsWith(u8, base, ".RSA") or
        std.mem.endsWith(u8, base, ".DSA") or
        std.mem.endsWith(u8, base, ".EC");
}

fn assembleZip(orig: []const u8, entries: []const ZipEntry, rep: Replacements, gpa: std.mem.Allocator) ![]u8 {
    var list = std.ArrayList(u8).empty;
    var cd = std.ArrayList(u8).empty;
    defer cd.deinit(gpa);

    for (entries) |e| {
        if (isSignFile(e.name)) continue; // 丢弃旧签名（保留 androidx *.version 等元数据）
        if (std.mem.eql(u8, e.name, "classes.dex")) {
            try appendEntry(&list, &cd, gpa, e.name, rep.dex, 4);
        } else if (std.mem.eql(u8, e.name, "resources.arsc")) {
            try appendEntry(&list, &cd, gpa, e.name, rep.arsc, 4);
        } else if (std.mem.eql(u8, e.name, "assets/offline.html")) {
            if (rep.offline) |o| {
                try appendEntry(&list, &cd, gpa, e.name, o, 4);
            } else {
                try appendReused(&list, &cd, gpa, orig, &e);
            }
        } else {
            try appendReused(&list, &cd, gpa, orig, &e);
        }
    }
    if (rep.lib) |lib_bytes| {
        try appendEntry(&list, &cd, gpa, "lib/arm64-v8a/libxuex_core.so", lib_bytes, 4096);
    }

    const cd_start: usize = list.items.len;
    for (cd.items) |b| list.append(gpa, b) catch return error.OutOfMemory;
    const real_count: u16 = blk: {
        var c: u16 = 0;
        for (entries) |en| {
            if (!isSignFile(en.name)) c += 1;
        }
        if (rep.lib != null) c += 1;
        break :blk c;
    };

    var eocd: [22]u8 = undefined;
    putU32(&eocd, 0, 0x06054b50);
    putU16(&eocd, 4, 0);
    putU16(&eocd, 6, 0);
    putU16(&eocd, 8, real_count);
    putU16(&eocd, 10, real_count);
    putU32(&eocd, 12, @intCast(cd.items.len));
    putU32(&eocd, 16, @intCast(cd_start));
    putU16(&eocd, 20, 0);
    for (eocd) |b| list.append(gpa, b) catch return error.OutOfMemory;
    return list.toOwnedSlice(gpa);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

pub fn main() !void {
    const gpa = std.heap.page_allocator;
    const args = try std.process.argsAlloc(gpa);
    defer gpa.free(args);
    if (args.len < 3) {
        std.debug.print("usage: apkg <orig.apk> <out.apk> [url] [label] [offline.html] [lib.so]\n", .{});
        return error.Usage;
    }
    const orig_path = args[1];
    const out_path = args[2];
    const url: []const u8 = if (args.len > 3) args[3] else DEFAULT_URL;
    const label: []const u8 = if (args.len > 4) args[4] else DEFAULT_LABEL;
    const offline_path: ?[]const u8 = if (args.len > 5) args[5] else null;
    const lib_path: ?[]const u8 = if (args.len > 6) args[6] else null;

    std.debug.print("apkg: 原始 APK {s}\n", .{orig_path});
    const orig = try std.fs.cwd().readFileAlloc(gpa, orig_path, 1 << 30);
    defer gpa.free(orig);

    var entries = try parseZip(orig, gpa);
    defer entries.deinit(gpa);
    std.debug.print("apkg: zip 条目 {d} 个\n", .{entries.items.len});

    // --- dex ---
    const dex = try entryCopy(orig, entries.items, "classes.dex", gpa);
    defer gpa.free(dex);
    try patchDex(dex, OLD_URL, url);

    // --- arsc（先算 delta，按新长度分配） ---
    const arsc = try entryCopy(orig, entries.items, "resources.arsc", gpa);
    const delta = arscDelta(arsc, label) catch |err| {
        gpa.free(arsc);
        return err;
    };
    const arsc_len = if (delta >= 0) arsc.len + @as(usize, @intCast(delta)) else arsc.len - @as(usize, @intCast(-delta));
    const arsc_new = try gpa.alloc(u8, arsc_len);
    @memcpy(arsc_new[0..arsc.len], arsc);
    if (delta < 0) {
        // 尾部截断：把多余的旧字节移到末尾之后再填 0（memmove 内部处理）
        const extra: usize = @intCast(-delta);
        _ = extra;
    }
    gpa.free(arsc);
    try patchArsc(arsc_new[0..], label);
    const arsc_out: []const u8 = arsc_new[0..arsc_len];

    // --- offline.html / lib ---
    var offline: ?[]const u8 = null;
    if (offline_path) |p| offline = try std.fs.cwd().readFileAlloc(gpa, p, 1 << 20);
    var lib: ?[]const u8 = null;
    if (lib_path) |p| lib = try std.fs.cwd().readFileAlloc(gpa, p, 1 << 24);

    const out = try assembleZip(orig, entries.items, .{
        .dex = dex,
        .arsc = arsc_out,
        .arsc_delta = delta,
        .offline = offline,
        .lib = lib,
    }, gpa);
    defer gpa.free(out);
    try std.fs.cwd().writeFile(.{ .sub_path = out_path, .data = out });
    std.debug.print("apkg: 写出 {s}（{d} 字节，原 {d} 字节）\n", .{ out_path, out.len, orig.len });
}

fn entryCopy(orig: []const u8, entries: []const ZipEntry, name: []const u8, gpa: std.mem.Allocator) ![]u8 {
    for (entries) |e| {
        if (std.mem.eql(u8, e.name, name)) {
            const d = entryCompressed(orig, &e);
            const out = try gpa.dupe(u8, d);
            return out;
        }
    }
    std.debug.print("apkg: 未找到条目 {s}\n", .{name});
    return error.EntryNotFound;
}

/// 计算 arsc 补丁的 delta（label 长度变化）
fn arscDelta(arsc: []const u8, label: []const u8) !isize {
    if (u16le(arsc, ARSC_POOL) != 0x0001) return error.ArscLayout;
    const sc = u32le(arsc, 0x14);
    const sstart = u32le(arsc, 0x20);
    const table: usize = ARSC_POOL + 28;
    const base: usize = ARSC_POOL + sstart + 1;
    var found: bool = false;
    var i: u32 = 0;
    while (i < sc) : (i += 1) {
        const o = u32le(arsc, table + 4 * i);
        const p = base + o;
        const l = ulebLen(arsc, p);
        const ub = ulebBytes(l);
        if (p + ub + l < arsc.len and std.mem.eql(u8, arsc[p + ub .. p + ub + l], "My Application")) {
            found = true;
            break;
        }
    }
    if (!found) return error.LabelNotFound;
    if (label.len >= 128) return error.LabelTooLong;
    return @as(isize, @intCast(label.len)) - 14;
}

// ---------------------------------------------------------------------------
// 自检
// ---------------------------------------------------------------------------

test "adler32_vec" {
    try std.testing.expectEqual(@as(u32, 0x32D10329), adler32("123456789"));
    try std.testing.expectEqual(@as(u32, 0), adler32(""));
}

test "crc32_vec" {
    try std.testing.expectEqual(@as(u32, 0xCBF43926), crc32("123456789"));
    try std.testing.expectEqual(@as(u32, 0x00000000), crc32(""));
}

test "default_url_len" {
    try std.testing.expectEqual(DEX_URL_LEN, DEFAULT_URL.len);
    try std.testing.expectEqual(31, OLD_URL.len);
    try std.testing.expect(DEFAULT_LABEL.len < 128);
}
