# 智能备考平台 2027 · Windows 单机版

**`xuex-2027-pro-windows-x64.exe`** — 单文件自解压安装包（约 187 MB），双击即用，无需安装任何环境。

## 运行方式

1. 双击 `xuex-2027-pro-windows-x64.exe`（或在 PowerShell 中运行，保留控制台窗口）
2. 首次启动：自动解压平台文件 → 初始化 PostgreSQL → 建库建表 → 写入种子数据（约 1-2 分钟）
3. 自动打开浏览器 **http://127.0.0.1:3000**
4. 演示账号：`jiang2027`（学生）/ `teacher-zhang`（教师）/ `admin-li`（管理员）
5. 关闭控制台窗口（或 Ctrl+C）即可停止全部服务

> 平台文件解压到 `%TEMP%\x27`，删除该目录可完全重置（下次启动重新解压）。
> 若 3000 端口被占用：先关闭占用程序，或等待启动器报告错误。

## 内部结构（全部内嵌于 exe）

```
bun.exe                    Bun 1.4.0 Windows 运行时（承载 Next.js 服务端）
pg/bin/                    PostgreSQL 18 Windows 版（initdb / pg_ctl / postgres）
app/.next/                 Next.js 16 生产构建（自然绿主题、11 模块、34 张表）
app/node_modules/          生产依赖（next / react / pg / drizzle-orm …，仅 win32 原生件）
app/drizzle/0000_*.sql     SQL 迁移（32 张表结构）
app/seed.ts                种子数据（知识图谱 / 题库 / 演示账号）
app/bootstrap-db.ts        首次启动建库脚本
```

## 构建方式（可复现）

```bash
# 1. Zig 交叉编译启动器（Zig 0.15.1，-target x86_64-windows-gnu，mingw 运行时由 Zig 从源码构建）
zig build-exe .pkg/launcher/launcher.zig -target x86_64-windows-gnu -O ReleaseSmall -lc -lshell32 -lws2_32

# 2. 组装载荷 zip（bun.exe + Windows PostgreSQL + next build 产物 + 精简 node_modules + 迁移/种子脚本）
# 3. 拼接：launcher.exe + marker + u64le(zip长度) + payload.zip
python3 scripts/package-win-exe.py
```

### Zig 负责的部分

- **launcher.zig（本 exe 的可执行主体，Zig 编译的 Win64 PE）**：
  自解压（读取自身尾部载荷 → `std.zip.extract` 解压）、
  PostgreSQL 生命周期管理（initdb / pg_ctl start-stop / 端口探测）、
  数据库引导（SQL 迁移 + 种子）、Web 服务启动（CreateProcessW）、
  浏览器打开（ShellExecuteW）、Ctrl+C 清理（SetConsoleCtrlHandler）。

### 载荷中非 Zig 的部分（如实说明）

- `bun.exe` / `postgres*`：Bun 与 PostgreSQL 官方 Windows 二进制（经 npm 分发），平台运行时
- `app/.next`：Next.js 16 编译产物（Zig 启动器负责运行与引导）
- `app/node_modules`：纯 JS 依赖 + `@next/swc-win32-x64-msvc`（Next 官方 Windows 原生编译器）
