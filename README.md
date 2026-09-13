# 音频 → MP3 批量转换

纯浏览器本地转换，**文件不会上传到任何服务器**。支持 40+ 种音频/视频格式。

## 快速开始

```bash
git clone https://github.com/WT-XDWI/m4a2mp3.git
cd m4a2mp3
```

按系统选择启动方式：

| 系统 | 启动方式 | 依赖 |
|---|---|---|
| **Windows** | 双击 `windows\启动.bat` | Node.js 或 Python 3 |
| **Linux** | `python3 linux/serve.py` | Python 3 |
| 任意系统 | `node windows/serve.js` | Node.js |

启动后浏览器会自动打开，把文件拖进去即可。

首次运行需联网下载 ffmpeg 引擎（约 31 MB），之后缓存在 `vendor/`，不再联网。

## 命令行批量转换

不想开浏览器时，可以直接用命令行转整个目录：

```bash
node windows/serve.js --cli "D:\Music" 192
```

- 第一个参数是目录，第二个是码率（默认 192）
- 输出到该目录下的 `mp3/` 子文件夹
- 已存在的文件会自动跳过，可中断后续跑

## Linux 服务部署

安装为 systemd 服务并开机自启（会自动读取当前用户和路径）：

```bash
sudo python3 linux/serve.py --install-service
```

服务监听 `0.0.0.0:8420`，**局域网内其他设备也能访问**（启动时会显示实际地址）。

```bash
systemctl status m4a2mp3     # 查看状态
journalctl -u m4a2mp3 -f     # 查看日志
```

## 为什么不能直接打开 index.html

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

## 性能

解码与编码合并为**一次 ffmpeg 调用**完成。实测（192 kbps）：

| 素材 | 耗时 |
|---|---|
| 2 分钟音频 | 约 1.5 秒 |
| 20 分钟音频 | 约 14 秒 |

进度条由 ffmpeg 日志的 `time=` 字段驱动，长文件也能平滑显示。

## 注意事项

- **MP3 输入会原样复制**，不重新编码，避免二次损失音质。若手动改了采样率或声道则会重新编码。
- 码率低于 **64 kbps** 时，MP3 格式限制会使其实际以 64 kbps 输出。
- 采样率低于 **32 kHz** 时会改用 MPEG-2/2.5 编码，实际输出采样率会提升到 32 kHz。
- 转换在内存中进行，**单个文件越大占用内存越多**。

## 目录结构

```
m4a2mp3/
├── index.html            网页主程序（转换逻辑都在这里）
├── vendor/               前端依赖
├── windows/
│   ├── 启动.bat          双击启动
│   └── serve.js          本地服务 + 命令行模式
└── linux/
    └── serve.py          本地服务 + systemd 安装
```

## 第三方组件

本项目依赖以下组件，**它们不构成本项目许可证所称「软件」的一部分**，不受本项目非商业条款约束：

| 组件 | 许可证 | 说明 |
|---|---|---|
| `@ffmpeg/core` | **GPL-2.0-or-later** | wasm 引擎，运行时从 CDN 下载，本仓库不分发 |
| `@ffmpeg/ffmpeg` | MIT | 浏览器端封装 |
| `JSZip` | MIT / GPL-3.0 双许可 | 本项目按 MIT 使用 |

> ⚠️ 若你要将本项目用于**商业目的**，请注意 ffmpeg-core 的 GPL-2.0 不允许叠加更严格的限制。
> 你需要自行就该组件确认合规方案，本项目的非商业条款**不能凌驾于** GPL 之上。
>
> 若你**连同 `ffmpeg-core.wasm` 一起分发给他人**（打包、网盘、预装设备），
> 你就成为 GPL 意义上的分发者，需提供该组件的完整源码或书面获取方式，且不得附加非商业限制。

## 许可证

本项目采用 **非商业使用许可证 v5.4**，全文见 [LICENSE](LICENSE)。

**简言之**：允许个人学习、教学、学术研究、开源社区等非商业用途；
**禁止**任何以营利为目的的使用（包括嵌入商业产品、付费服务、AI 模型训练等）。
商业使用需另行取得授权。
