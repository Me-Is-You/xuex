//! sha1 — 自实现 SHA-1（Zig 0.15.1 std 已移除该实现；dex 头部校验需要）
//!
//! FIPS 180-1 标准算法。自检向量：
//!   SHA1("abc")  = a9993e364706816aba3e25717850c26c9cd0d89d
//!   SHA1("")     = da39a3ee5e6b4b0d3255bfef95601890afd80709
//!   SHA1(fox)    = 2fd4e1c67a2d28fced849ee1bb76e7391b93eb12

const std = @import("std");

pub const Digest = [20]u8;

fn rotl32(v: u32, n: u5) u32 {
    const a: u5 = @intCast(n);
    const b: u5 = @intCast(@as(u32, 32) - n);
    return (v << a) | (v >> b);
}

/// 计算 data 的 SHA-1 摘要（一次性接口）
pub fn digest(data: []const u8) Digest {
    var st = State.init();
    st.update(data);
    return st.final();
}

pub const State = struct {
    h: [5]u32 = .{ 0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0 },
    len: u64 = 0,
    block: [64]u8 = [_]u8{0} ** 64,
    blen: usize = 0,

    pub fn init() State {
        return .{};
    }

    pub fn update(self: *State, data: []const u8) void {
        self.len += data.len;
        var i: usize = 0;
        if (self.blen > 0) {
            const take = @min(64 - self.blen, data.len);
            @memcpy(self.block[self.blen..], data[0..take]);
            self.blen += take;
            i = take;
            if (self.blen == 64) {
                self.compress(self.block[0..64]);
                self.blen = 0;
            }
        }
        while (i + 64 <= data.len) {
            self.compress(data[i .. i + 64]);
            i += 64;
        }
        if (i < data.len) {
            @memcpy(self.block[0 .. data.len - i], data[i..]);
            self.blen = data.len - i;
        }
    }

    fn compress(self: *State, block: []const u8) void {
        var w = [_]u32{0} ** 80;
        var i: u32 = 0;
        while (i < 16) : (i += 1) {
            w[i] = (@as(u32, block[i * 4]) << 24) | (@as(u32, block[i * 4 + 1]) << 16) | (@as(u32, block[i * 4 + 2]) << 8) | block[i * 4 + 3];
        }
        i = 16;
        while (i < 80) : (i += 1) {
            w[i] = rotl32(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
        }

        var a = self.h[0];
        var b = self.h[1];
        var c = self.h[2];
        var d = self.h[3];
        var e = self.h[4];

        var t: u32 = 0;
        while (t < 80) : (t += 1) {
            const f: u32 = if (t < 20)
                (b & c) | ((~b) & d)
            else if (t < 40)
                b ^ c ^ d
            else if (t < 60)
                (b & c) | (b & d) | (c & d)
            else
                b ^ c ^ d;
            const k: u32 = if (t < 20)
                0x5A827999
            else if (t < 40)
                0x6ED9EBA1
            else if (t < 60)
                0x8F1BBCDC
            else
                0xCA62C1D6;
            const sum = @as(u64, rotl32(a, 5)) + f + e + k + w[t];
            const tmp: u32 = @intCast(sum & 0xFFFFFFFF);
            e = d;
            d = c;
            c = rotl32(b, 30);
            b = a;
            a = tmp;
        }

        self.h[0] = @intCast((@as(u64, self.h[0]) + a) & 0xFFFFFFFF);
        self.h[1] = @intCast((@as(u64, self.h[1]) + b) & 0xFFFFFFFF);
        self.h[2] = @intCast((@as(u64, self.h[2]) + c) & 0xFFFFFFFF);
        self.h[3] = @intCast((@as(u64, self.h[3]) + d) & 0xFFFFFFFF);
        self.h[4] = @intCast((@as(u64, self.h[4]) + e) & 0xFFFFFFFF);
    }

    pub fn final(self: *State) Digest {
        const bitlen: u64 = self.len * 8;
        var rest = std.ArrayList(u8).empty;
        defer rest.deinit(std.heap.page_allocator);
        rest.append(std.heap.page_allocator, 0x80) catch unreachable;
        const zeros: usize = (56 - (self.blen + 1) % 64) % 64;
        var i: usize = 0;
        while (i < zeros) : (i += 1) {
            rest.append(std.heap.page_allocator, 0) catch unreachable;
        }
        var k: u32 = 0;
        while (k < 8) : (k += 1) {
            const lo: u6 = @intCast(8 * k);
            const sh: u6 = 56 - lo;
            rest.append(std.heap.page_allocator, @as(u8, @intCast((bitlen >> sh) & 0xff))) catch unreachable;
        }
        self.update(rest.items);
        var out: [20]u8 = undefined;
        var j: u32 = 0;
        while (j < 5) : (j += 1) {
            out[j * 4] = @intCast((self.h[j] >> 24) & 0xff);
            out[j * 4 + 1] = @intCast((self.h[j] >> 16) & 0xff);
            out[j * 4 + 2] = @intCast((self.h[j] >> 8) & 0xff);
            out[j * 4 + 3] = @intCast(self.h[j] & 0xff);
        }
        return out;
    }
};

var hexbuf: [40]u8 = undefined;

fn hx(d: Digest) []const u8 {
    const hexd: [16]u8 = .{ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f' };
    var i: usize = 0;
    while (i < 20) : (i += 1) {
        hexbuf[i * 2] = hexd[d[i] >> 4];
        hexbuf[i * 2 + 1] = hexd[d[i] & 0xf];
    }
    return &hexbuf;
}

test "sha1_vectors" {
    try std.testing.expectEqualSlices(u8, "a9993e364706816aba3e25717850c26c9cd0d89d", hx(digest("abc")));
    try std.testing.expectEqualSlices(u8, "da39a3ee5e6b4b0d3255bfef95601890afd80709", hx(digest("")));
    try std.testing.expectEqualSlices(u8, "2fd4e1c67a2d28fced849ee1bb76e7391b93eb12", hx(digest("The quick brown fox jumps over the lazy dog")));
}
