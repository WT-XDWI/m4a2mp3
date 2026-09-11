# 音频 → MP3 批量转换

纯浏览器本地转换，**文件不会上传到任何服务器**。支持 40+ 种音频/视频格式批量转 MP3。

## 快速开始

```bash
# 1. 克隆
git clone https://github.com/WT-XDWI/m4a2mp3.git
cd m4a2mp3

# 2. 启动（需要 Node.js，首次会自动下载 31MB 引擎）
node serve.js
```

浏览器会自动打开页面，把音频文件拖进去即可。

Windows 用户也可以直接**双击 `启动.bat`**。

### 环境要求

- **Node.js**（推荐）或 **Python 3** —— 用于起一个本地 HTTP 服务
- 首次运行需联网下载 ffmpeg 引擎（约 31 MB），之后缓存在 `vendor/`，不再联网
- 浏览器：Chrome / Edge / Firefox 等现代浏览器（需支持 WebAssembly）

## 为什么不能直接双击 index.html

浏览器禁止 `file://` 页面创建 Worker，而 ffmpeg.wasm 必须依赖 Worker。直接打开会报：

```
Failed to construct 'Worker': Script ... cannot be accessed from origin 'null'
```

这是浏览器的硬性安全限制，**无法用代码绕过**，必须通过本地 HTTP 服务打开。

## 支持的输入格式

> 除了音频，视频文件也可以直接拖进来，程序会自动提取其中的音轨。

| 类型 | 格式 |
|---|---|
| Apple / AAC | m4a、m4b、m4r、aac、mp4、m4v、mov、3gp、caf |
| 有损 | mp3、ogg、oga、opus、wma、amr、ac3、eac3、dts、mp2、ra |
| 无损 / 未压缩 | wav、flac、aiff、ape、wv、tta、alac、dsf、dff、au |
| 视频（自动提取音轨） | mkv、webm、avi、flv、wmv、mpg、ts、m2ts、vob、rmvb |

## 功能

- 拖拽或点击，一次添加多个文件
- 码率 96–320 kbps
- 采样率、声道（保持原样 / 立体声 / 单声道）
- 单文件下载 + 一键打包 ZIP
- 可中途停止，未完成的可以继续
- 文件名冲突自动去重（`a.m4a` 与 `a.flac` 不会互相覆盖）

## 命令行版本

不想开浏览器时，可以用 Node 直接批量转换：

```bash
node convert.js "路径/到/歌曲目录" 192
```

输出到该目录下的 `mp3/` 子文件夹。默认 192 kbps。

转换完可以用 `node verify.js` 校验输出文件完整性。

## 注意事项

- **MP3 输入会原样复制**，不重新编码，避免二次损失音质。若手动改了采样率或声道则会重新编码。
- 选 **≤96 kbps 且源是 44.1 kHz** 时，编码器会自动降到 32 kHz（MPEG-1 规范限制），页面会给出提示。
- 转换在内存中进行，**单个文件越大占用内存越多**。几百 MB 的文件建议用命令行版本。
- 首次启动需下载约 31 MB 的 ffmpeg 引擎（之后缓存在 `vendor/`，不再联网）。

## 技术栈

| 组件 | 用途 | 许可证 |
|---|---|---|
| [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) | 解码各种格式为 PCM | MIT（封装层）/ GPL-2.0（core） |
| [lamejs](https://github.com/zhuker/lamejs) | PCM 编码为 MP3 | LGPL-3.0 |
| [JSZip](https://github.com/Stuk/jszip) | 打包批量下载 | MIT |

## 许可证

本项目采用 **非商业使用许可证 v5.4**，全文见 [LICENSE](LICENSE)。

**简言之**：允许个人学习、教学、学术研究、开源社区等非商业用途；
**禁止**任何以营利为目的的使用（包括嵌入商业产品、付费服务、AI 模型训练等）。
商业使用需另行取得授权。

### 第三方组件

本项目依赖的部分组件采用不同的许可证，**不受上述非商业限制的约束**：

| 组件 | 许可证 | 说明 |
|---|---|---|
| `@ffmpeg/core` | **GPL-2.0-or-later** | 由 CDN 运行时获取，本仓库不分发 |
| `lamejs` | **LGPL-3.0** | — |
| `JSZip` | MIT / GPL-3.0 双许可 | 本项目按 MIT 使用 |

详细清单与分发注意事项见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。

> ⚠️ 若你计划将本项目用于**商业目的**，请注意 ffmpeg-core 的 GPL-2.0 许可证不允许叠加更严格的限制，
> 你需要自行就该组件向权利人确认合规方案。本项目的非商业条款**不能凌驾于** GPL 之上。
