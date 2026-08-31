#!/usr/bin/env python3
"""Windows 单机版打包：Zig 启动器 + 内嵌载荷 zip → 单文件自解压 exe

用法:
  python3 scripts/package-win-exe.py [输出路径]
  默认输出: exe/xuex-2027-pro-windows-x64.exe

前置:
  .pkg/launcher/launcher.exe   （zig build-exe 交叉编译产物）
  .pkg/payload.zip             （bun.exe + Windows PostgreSQL + Next 生产构建 + 种子脚本）
"""
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = b"\n===XUEX_PAYLOAD_2027===\n"
OUT_DEFAULT = ROOT / "exe" / "xuex-2027-pro-windows-x64.exe"


def main() -> None:
    launcher = ROOT / ".pkg" / "launcher" / "launcher.exe"
    payload = ROOT / ".pkg" / "payload.zip"
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT_DEFAULT

    for p in (launcher, payload):
        if not p.exists():
            sys.exit(f"缺少输入文件: {p}")

    launcher_bytes = launcher.read_bytes()
    assert launcher_bytes[:2] == b"MZ", "launcher.exe 不是 PE 文件"
    zip_bytes = payload.read_bytes()
    assert zip_bytes[:4] == b"PK\x03\x04", "payload.zip 不是 zip 文件"

    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("wb") as f:
        f.write(launcher_bytes)
        f.write(MARKER)
        f.write(struct.pack("<Q", len(zip_bytes)))
        f.write(zip_bytes)

    print(f"打包完成: {out}")
    print(f"  启动器   {len(launcher_bytes)/1048576:.1f} MB")
    print(f"  载荷     {len(zip_bytes)/1048576:.1f} MB (zip)")
    print(f"  最终 exe {out.stat().st_size/1048576:.1f} MB")


if __name__ == "__main__":
    main()
