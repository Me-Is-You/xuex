//! xuex_core — 备考平台 2027 · Android 原生核心库
//!
//! 由 Zig 交叉编译（aarch64-linux-android，no-std，无 NDK 依赖）。
//! 通过 JNI 约定导出 C 符号，可供 System.loadLibrary("xuex_core") 加载后调用：
//!
//!   String v = libxuex_core.xuex_core_version();   // "1.0.0"
//!   String n = libxuex_core.xuex_core_name();      // "xuex-2027-pro"
//!   u32      c = libxuex_core.xuex_core_crc32(ptr, len);  // 校验和
//!
//! 纯计算实现，不依赖 bionic/C 库，可静态嵌入任意 Android 桥接层。
const std = @import("std");

export fn xuex_core_version() [*:0]const u8 {
    return "1.0.0";
}

export fn xuex_core_name() [*:0]const u8 {
    return "xuex-2027-pro";
}

/// CRC-32 (IEEE 802.3, 反射, 多项式 0xEDB88320) — 与 java.util.zip.CRC32 一致
export fn xuex_core_crc32(data: [*]const u8, len: usize) u32 {
    var crc: u32 = 0xFFFFFFFF;
    var i: usize = 0;
    while (i < len) : (i += 1) {
        crc ^= data[i];
        var k: u32 = 0;
        while (k < 8) : (k += 1) {
            const mask = 0 - @as(u32, @intFromBool(crc & 1 != 0));
            crc = (crc >> 1) ^ (0xEDB88320 & mask);
        }
    }
    return crc ^ 0xFFFFFFFF;
}

/// 平台指纹：架构 / 系统 / 构建器
export fn xuex_core_fingerprint() [*:0]const u8 {
    return "aarch64-linux-android · zig 0.15.1";
}

test "crc32 known vector" {
    // "123456789" 的 CRC-32 标准校验值 = 0xCBF43926
    const s = "123456789";
    try std.testing.expectEqual(@as(u32, 0xCBF43926), xuex_core_crc32(s.ptr, s.len));
}

test "crc32 empty" {
    try std.testing.expectEqual(@as(u32, 0), xuex_core_crc32(&[_]u8{0}, 0));
}
