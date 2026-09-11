# 第三方组件声明 / Third-Party Notices

本文件列出 m4a2mp3 所依赖的第三方组件及其许可证。

**边界说明**：下列组件**不构成本项目 LICENSE 所称"软件"的一部分**。它们的获取、使用与分发分别适用各自的许可证条款，**不受本项目 LICENSE 第 1.2 条"商业目的"限制的约束**。
（参见本项目 LICENSE 第 30.3、30.4 条。）

---

## 一、运行时依赖

这些组件在网页运行时加载。其中 wasm 引擎由用户首次运行时通过公共 CDN 获取，**本仓库不包含其二进制文件**。

### 1. ffmpeg.wasm 系列

| 组件 | 版本 | 许可证 | 本项目用途 |
|---|---|---|---|
| `@ffmpeg/ffmpeg` | 0.12.10 | MIT | 浏览器端 ffmpeg 封装（JS 胶水层） |
| `@ffmpeg/core` | 0.12.6 | **GPL-2.0-or-later** | 解码各种音频格式为 PCM（wasm 引擎） |

- 上游项目：https://github.com/ffmpegwasm/ffmpeg.wasm
- 许可证全文：https://www.gnu.org/licenses/old-licenses/gpl-2.0.html
- 获取方式：由 `serve.js` 在首次运行时从 jsdelivr / unpkg CDN 下载，**本仓库不分发**

> ⚠️ **重要提示**：`@ffmpeg/core` 采用 GPL-2.0-or-later。GPL 第 7 条不允许在其之上叠加更严格的限制。
> 若你拟将本项目用于**商业目的**，请自行就该组件向权利人确认并取得授权。
> 本项目 LICENSE 中的非商业限制**不适用于**该组件本身。

### 2. lamejs

| 组件 | 版本 | 许可证 | 本项目用途 |
|---|---|---|---|
| `lamejs` | 1.2.1 | **LGPL-3.0** | 将 PCM 编码为 MP3 |

- 上游项目：https://github.com/zhuker/lamejs
- 许可证全文：https://www.gnu.org/licenses/lgpl-3.0.html

> LGPL-3.0 要求：若你修改了该库本身，需以 LGPL 分发修改后的库；
> 仅作为库调用（本项目的情形）则无此要求，但需保留声明并允许用户替换该库。

### 3. JSZip

| 组件 | 版本 | 许可证 | 本项目用途 |
|---|---|---|---|
| `JSZip` | 3.10.1 | MIT 或 GPL-3.0-or-later（双许可） | 批量下载时打包 ZIP |

- 上游项目：https://github.com/Stuk/jszip
- 本项目按 **MIT** 条款使用

---

## 二、本仓库中包含的文件

以下文件随本仓库分发，均为宽松许可证，**不与本项目 LICENSE 冲突**：

| 文件 | 来源 | 许可证 |
|---|---|---|
| `vendor/ffmpeg.js` | @ffmpeg/ffmpeg | MIT |
| `vendor/814.ffmpeg.js` | @ffmpeg/ffmpeg | MIT |
| `vendor/lame.min.js` | lamejs | LGPL-3.0 |
| `vendor/jszip.min.js` | JSZip | MIT |
| `vendor/ffmpeg-core.js` | @ffmpeg/core | **GPL-2.0-or-later** |

> 注：`vendor/ffmpeg-core.wasm`（约 31MB）**不在本仓库中**，已列入 `.gitignore`，由 `serve.js` 运行时下载。

---

## 三、分发者须知

如果你要**重新分发**本项目（打包为离线包、上传网盘、预装到设备等），请注意：

1. 若你**连同 `ffmpeg-core.wasm` 一起分发**，则你成为 GPL-2.0 意义上的"分发者"，必须：
   - 提供该组件的完整源代码，或指向上游的书面获取方式
   - 保留全部版权与许可证声明
   - **不得**对其附加本项目 LICENSE 中的非商业限制

2. 若你仅分发本仓库原有内容（不含 wasm），则未发生 GPL 分发，上述义务不适用。

3. 无论如何，本项目的 LICENSE 非商业条款**不能凌驾于** GPL/LGPL 之上。
   二者冲突时，以第三方许可证为准（见 LICENSE 第 30.2 条）。

---

## 四、合规建议

| 使用场景 | 建议 |
|---|---|
| 个人学习、非商业使用 | 直接使用即可 |
| 教学、开源项目 | 保留本声明与 LICENSE 即可 |
| 商业使用 | 需另行取得 ffmpeg-core 的 GPL 合规方案（或替换为 LGPL 构建版） |

**替代方案**：ffmpeg.wasm 官方另有 `@ffmpeg/core-mt` 与 LGPL 构建选项。
若商业场景必须规避 GPL，可考虑改用 LGPL 构建的 ffmpeg.wasm，或改用系统 ffmpeg 子进程方案。

---

*本文件由项目维护者生成，内容力求准确但**不构成法律意见**。重大商业决策请咨询专业律师。*

*最后更新：与 m4a2mp3 首次发布同步*
