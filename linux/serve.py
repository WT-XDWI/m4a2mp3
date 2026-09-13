#!/usr/bin/env python3
"""
m4a2mp3 本地服务（Linux / 树莓派 / Orange Pi 版）

与原版 serve.js 等价，但用 Python 实现，无需安装 Node.js。
- 监听 0.0.0.0，局域网内其他设备可访问
- 首次运行自动下载 ffmpeg-core.wasm（约 31MB）
- 正确的 MIME 类型（.wasm 必须为 application/wasm）
"""
import http.server
import socketserver
import os
import socket
import sys
import urllib.request
import ssl

PORT = 8420
# 本脚本位于 linux/ 子目录，网站根目录是其上一级（index.html 与 vendor/ 所在处）
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WASM = os.path.join(ROOT, 'vendor', 'ffmpeg-core.wasm')

WASM_URLS = [
    'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
    'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
    'https://registry.npmmirror.com/-/binary/@ffmpeg/core/0.12.6/dist/umd/ffmpeg-core.wasm',
]


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.wasm': 'application/wasm',
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.html': 'text/html',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_head(self):
        # 只放出网页运行必需的文件，避免源码/文档/脚本被下载
        rel = self.path.split('?')[0].lstrip('/')
        if rel in ('', 'index.html') or rel.startswith('vendor/'):
            return super().send_head()
        self.send_error(404, 'Not Found')
        return None

    def end_headers(self):
        # wasm 需要正确类型才能用 compileStreaming；其余不缓存，改完即生效
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        # 只记录错误，避免刷屏
        if args and str(args[1]).startswith(('4', '5')):
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def download_wasm():
    if os.path.exists(WASM) and os.path.getsize(WASM) > 1_000_000:
        return True
    print()
    print('  首次运行，正在下载 ffmpeg 引擎（约 31MB，只需一次）')
    os.makedirs(os.path.dirname(WASM), exist_ok=True)
    # 板子上的证书链可能不完整，下载 CDN 资源时放宽校验
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    for url in WASM_URLS:
        try:
            print(f'  尝试: {url}')
            with urllib.request.urlopen(url, context=ctx, timeout=120) as r, \
                 open(WASM + '.part', 'wb') as f:
                total = int(r.headers.get('Content-Length', 0))
                got = 0
                while True:
                    chunk = r.read(65536)
                    if not chunk:
                        break
                    f.write(chunk)
                    got += len(chunk)
                    if total:
                        pct = int(got / total * 100)
                        print(f'\r  {pct}%   ', end='', flush=True)
            os.replace(WASM + '.part', WASM)
            print(f'\r  完成 {got / 1048576:.1f}MB        ')
            return True
        except Exception as e:
            print(f'  失败: {e}')
    print()
    print('  [!] 引擎下载失败。请手动下载后放到 vendor/ffmpeg-core.wasm：')
    print('      ' + WASM_URLS[0])
    print()
    return False


def local_ip():
    """取本机在局域网中的 IP，用于显示访问地址。取不到就退回 127.0.0.1。"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # 不会真的发包，只是让内核选出对外网卡
        s.connect(('8.8.8.8', 80))
        return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'
    finally:
        s.close()


SERVICE_TEMPLATE = """[Unit]
Description=m4a2mp3 音频转 MP3 网页服务
After=network.target

[Service]
Type=simple
User={user}
Group={group}
WorkingDirectory={root}
ExecStart={python} -u {script}
Restart=always
RestartSec=5
StandardOutput=append:{root}/serve.log
StandardError=append:{root}/serve.log

[Install]
WantedBy=multi-user.target
"""


def install_service():
    """安装 systemd 服务并开机自启。需要 root。"""
    import getpass
    import subprocess

    if os.geteuid() != 0:
        print('  需要 root 权限，请用: sudo python3 serve.py --install-service')
        sys.exit(1)

    root = ROOT
    user = os.environ.get('SUDO_USER') or 'root'
    script = os.path.abspath(__file__)
    python = sys.executable or '/usr/bin/python3'

    try:
        import pwd
        group = pwd.getpwnam(user).pw_gid
        group = pwd.getpwuid(group).pw_name
    except Exception:
        group = user

    content = SERVICE_TEMPLATE.format(
        user=user, group=group, root=root, script=script, python=python)

    unit = '/etc/systemd/system/m4a2mp3.service'
    with open(unit, 'w', encoding='utf-8') as f:
        f.write(content)

    print('  已写入 ' + unit)
    subprocess.run(['systemctl', 'daemon-reload'], check=False)
    subprocess.run(['systemctl', 'enable', '--now', 'm4a2mp3'], check=False)
    print('  服务已启动并设为开机自启')
    print('  查看状态: systemctl status m4a2mp3')
    print('  查看日志: journalctl -u m4a2mp3 -f')


def main():
    if '--install-service' in sys.argv:
        install_service()
        return

    ok = download_wasm()

    class Server(socketserver.ThreadingTCPServer):
        allow_reuse_address = True

    port = PORT
    for _ in range(20):
        try:
            httpd = Server(('0.0.0.0', port), Handler)
            break
        except OSError:
            port += 1
    else:
        print('  端口被占用，无法启动')
        sys.exit(1)

    ip = local_ip()
    print()
    print('  ================================================')
    print('   音频 → MP3 批量转换')
    print('  ================================================')
    print()
    print(f'   本机访问：   http://127.0.0.1:{port}/index.html')
    if ip != '127.0.0.1':
        print(f'   局域网访问： http://{ip}:{port}/index.html')
    print()
    if not ok:
        print('   [!] 引擎未就绪，页面会提示失败')
    print('   按 Ctrl+C 停止服务')
    print('   安装为系统服务: sudo python3 serve.py --install-service')
    print()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n  已停止')
        httpd.shutdown()


if __name__ == '__main__':
    main()
