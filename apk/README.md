# 智能备考平台 2027 · Android APK（Zig 全量打包）

本目录是 **备考平台 2027** 的 Android 安装包，用 **Zig** 作为打包工具从零组装、打补丁并签名生成，
与 Windows `exe/` 版同属「智能备考平台」的多端交付产物。

## 文件

| 文件 | 说明 |
|---|---|
| `xuex-2027-pro-android-arm64.apk` | 最终 APK（已 v2 签名，arm64-v8a） |
| `xuex.keystore.b64` | 本次签名用的 v2 密钥（base64 DER，**升级时必须复用**） |

- 包名：`com.webview.myapplication`（WebView 壳，承载平台 H5）
- 启动标签：**智能备考平台2027**（从 `resources.arsc` 全局字符串池 idx 429 改写）
- minSdk 30 / targetSdk 34
- 内置 `lib/arm64-v8a/libxuex_core.so`：Zig 编译的 aarch64 库（`xuex_core_version` /
  `xuex_core_name` / `xuex_core_crc32` / `xuex_core_fingerprint` 导出），4096 对齐

## 它如何加载平台

`MainActivity` 的 WebView 指向 dex 里的 URL 字符串。原始模板指向
`https://github.com/bishwassagar`，打包时把它**等长替换**（31 字节槽位）为：

```
http://10.0.2.2:3000/#xuex_2027
```

- `10.0.2.2` 是 Android **模拟器**访问宿主机的环回地址（真机需换成宿主机局域网 IP）。
- `#xuex_2027` 为无副作用的 fragment，用于把字符串精确填满 31 字节（dex 槽位定长，不能变长）。

## 打包链路（全部脚本在 `scripts/package/`）

1. `xuex_core.zig` → `zig build-lib -target aarch64-linux-android -O ReleaseSmall -dynamic`
   → `libxuex_core.so`（no-std，无 C/bionic 依赖，`zig test` 自检 CRC32）。
2. `apkg.zig`（宿主端 Zig 工具）读取原始 APK zip：
   - `classes.dex`：等长改 URL + 重算 adler32/sha1 头（自实现 `sha1.zig`）。
   - `resources.arsc`：重建全局字符串池（改应用名，偏移表整体平移）。
   - `assets/offline.html`：换成品牌离线页（断网时 WebView 回退到它）。
   - 追加 `lib/arm64-v8a/libxuex_core.so`（STORE，4096 对齐）。
   - 其余 464 个条目原始 DEFLATE 数据**逐字节复用**，不重压缩。
3. `android-package-signer`（node，仅做签名这一步）→ **v2 签名**。

> 设计取舍：DEX/ARSC/ZIP 的解析与改写全部用 Zig 手写（字节级、零依赖、可复现），
> 唯一交给 node 的是 v2 签名块（RSA-PSS + 签名结构复杂，复用成熟实现避免自造轮子）。
> 这符合「不过度设计 / 可落地 / 可维护」原则。

## 复现 / 重打

```bash
cd scripts/package
# 1) 编 so
/tmp/zig15/pkg/bin/zig build-lib xuex_core.zig -target aarch64-linux-android \
  -O ReleaseSmall -dynamic -femit-bin=libxuex_core.so
# 2) 编 + 跑 apkg
/tmp/zig15/pkg/bin/zig build-exe apkg.zig -O ReleaseSmall
./apkg <原始APK> <输出APK> "http://10.0.2.2:3000/#xuex_2027" "智能备考平台2027" offline.html libxuex_core.so
# 3) v2 签名（见 /tmp/apkwork/sign.js 模板）
```

## 验证（已执行，全部通过）

- `unzip -t` 完整；dex `adler32`/`sha1` 与头一致。
- dex 内 URL 字符串可被标准 ULEB128 解析读回。
- arsc 字符串池 idx 429 读回为 `智能备考平台2027`；包 chunk 完整。
- aapt2 `dump badging` 确认 `application-label:'智能备考平台2027'`、`native-code:'arm64-v8a'`、可启动 Activity。
- APK 尾部存在 `APK Sig Block 42`（v2 签名块）。

## 真机 / 换机说明

- 模拟器直接装：WebView 走 `10.0.2.2:3000` 命中宿主机 dev server。
- 真机：需把 dex 里 URL 的 IP 换成宿主机局域网地址（仍是 31 字节槽位，可用
  `apkg` 重打，例如 `http://192.168.1.10:3000/#x2027`），并**用同一 keystore 重签**，
  否则与已安装版本签名冲突、无法覆盖安装。
