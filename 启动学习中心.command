#!/bin/zsh
# 双击启动；整个学习中心文件夹可以一起移动。
SCRIPT_DIR="${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
if ! command -v python3 >/dev/null 2>&1; then
  print '未找到 Python 3。请安装 Python 3 后重试，或直接双击 index.html 离线使用。'
  read '?按回车关闭…'
  exit 1
fi
python3 -u - "$SCRIPT_DIR" "$@" <<'PY'
import errno
import functools
import http.server
import os
from pathlib import Path
import socket
import subprocess
import sys
import threading
import webbrowser

root = Path(sys.argv[1]).resolve()
if not (root / 'index.html').is_file():
    print('找不到 index.html，请将启动脚本放回“九年级学习中心”文件夹。')
    sys.exit(1)
try:
    preferred = int(os.environ.get('AETHERVIZ_PORT', '8080'))
    if not 0 <= preferred <= 65535:
        raise ValueError()
except ValueError:
    print('端口设置无效，请使用 0 至 65535 的整数。')
    sys.exit(1)

class Handler(http.server.SimpleHTTPRequestHandler):
    def list_directory(self, path):
        self.send_error(403, 'Directory listing disabled')
        return None

handler = functools.partial(Handler, directory=str(root))
server = None
for port in ([0] if preferred == 0 else range(preferred, min(preferred + 20, 65536))):
    try:
        server = http.server.ThreadingHTTPServer(('0.0.0.0', port), handler)
        break
    except OSError as exc:
        if exc.errno == errno.EADDRINUSE:
            continue
        print('启动失败：', exc)
        sys.exit(1)
if server is None:
    print('可用端口均被占用，请关闭以前的启动窗口后重试。')
    sys.exit(1)
port = server.server_port
interfaces = []
try:
    route = subprocess.run(['/sbin/route', '-n', 'get', 'default'], capture_output=True, text=True, timeout=3)
    for line in route.stdout.splitlines():
        if line.strip().startswith('interface:'):
            interfaces.append(line.split(':', 1)[1].strip())
except (OSError, subprocess.SubprocessError):
    pass
interfaces += ['en0', 'en1']
addresses = []
for interface in dict.fromkeys(interfaces):
    try:
        result = subprocess.run(['/usr/sbin/ipconfig', 'getifaddr', interface], capture_output=True, text=True, timeout=3)
        address = result.stdout.strip()
        socket.inet_aton(address)
        if not address.startswith('127.') and address not in addresses:
            addresses.append(address)
    except (OSError, subprocess.SubprocessError):
        pass
local_url = f'http://127.0.0.1:{port}/index.html'
print('\n九年级学习中心已启动\n')
print('本机访问：' + local_url)
for address in addresses:
    print(f'局域网访问：http://{address}:{port}/index.html')
if not addresses:
    print('尚未取得局域网地址。连接 Wi-Fi 后重新启动即可显示。')
if preferred and port != preferred:
    print(f'端口 {preferred} 已被占用，本次自动使用 {port}。')
print('\n其他设备需连接同一网络。请保留此窗口；按 Control+C 停止服务。')
print('若 macOS 询问是否允许接收传入连接，请选择“允许”。\n', flush=True)
if '--no-browser' not in sys.argv[2:]:
    timer = threading.Timer(0.6, lambda: webbrowser.open(local_url))
    timer.daemon = True
    timer.start()
try:
    server.serve_forever(poll_interval=0.2)
except KeyboardInterrupt:
    print('\n学习中心服务已停止。')
finally:
    server.server_close()
PY
result=$?
if (( result != 0 )); then
  read '?启动未成功，按回车关闭…'
fi
exit $result
