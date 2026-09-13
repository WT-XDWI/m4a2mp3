// 本地静态服务器 —— m4a 转 mp3 页面必须通过 http 打开。
// 原因：浏览器禁止 file:// 页面创建 Worker，而 ffmpeg.wasm 需要 Worker。
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// On Windows the console defaults to a legacy codepage; without this the
// Chinese status lines below turn into mojibake when launched from .bat.
if (process.platform === 'win32') {
  try { exec('chcp 65001 >nul', () => {}); } catch (e) {}
}

// 本脚本位于 windows/ 子目录，网站根目录是其上一级（index.html 与 vendor/ 所在处）
const ROOT = path.dirname(__dirname);
const START_PORT = 8420;
const MAX_TRIES = 20;

// ffmpeg-core.wasm 有 31MB，不适合放进 git 仓库，首次运行时自动下载。
const WASM_FILE = path.join(ROOT, 'vendor', 'ffmpeg-core.wasm');
const WASM_URLS = [
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
  'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm'
];

function downloadWasm(urls, idx) {
  return new Promise((resolve, reject) => {
    if (idx >= urls.length) return reject(new Error('所有下载源都失败了'));
    const url = urls[idx];
    const https = require('https');
    console.log('  下载中: ' + url);
    https.get(url, { headers: { 'User-Agent': 'node' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.destroy();
        return downloadWasm([res.headers.location], 0).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.destroy();
        return downloadWasm(urls, idx + 1).then(resolve, reject);
      }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let got = 0, last = -1;
      const tmp = WASM_FILE + '.part';
      const out = fs.createWriteStream(tmp);
      res.on('data', (c) => {
        got += c.length;
        const pct = total ? Math.floor(got / total * 100) : 0;
        if (pct >= last + 10) { last = pct; process.stdout.write('\r  ' + pct + '%   '); }
      });
      res.pipe(out);
      out.on('finish', () => {
        out.close(() => {
          fs.renameSync(tmp, WASM_FILE);
          process.stdout.write('\r  完成 ' + (got / 1048576).toFixed(1) + 'MB\n');
          resolve();
        });
      });
      out.on('error', reject);
    }).on('error', () => downloadWasm(urls, idx + 1).then(resolve, reject));
  });
}

async function ensureWasm() {
  if (fs.existsSync(WASM_FILE) && fs.statSync(WASM_FILE).size > 1000000) return true;
  console.log('');
  console.log('  首次运行，需要下载 ffmpeg 引擎（约 31MB，只需一次）');
  try {
    await downloadWasm(WASM_URLS, 0);
    return true;
  } catch (e) {
    console.log('');
    console.log('  [!] 引擎下载失败: ' + e.message);
    console.log('      请手动下载下面的文件，放到 vendor\\ 目录并命名为 ffmpeg-core.wasm');
    console.log('      ' + WASM_URLS[0]);
    console.log('');
    return false;
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ico': 'image/x-icon'
};

function handler(req, res) {
  let p;
  try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) { p = '/index.html'; }
  if (p === '/' || p === '') p = '/index.html';

  const file = path.join(ROOT, p);
  // 防止路径穿越
  if (!path.normalize(file).startsWith(path.normalize(ROOT))) {
    res.writeHead(403); return res.end('forbidden');
  }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('找不到文件: ' + p);
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': st.size,
      // wasm 需要这个才能用 compileStreaming；其余资源不缓存，改完刷新即生效
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(file).pipe(res);
  });
}

function openBrowser(url) {
  // 各平台打开默认浏览器的命令不同，失败也不影响服务本身
  var cmd;
  if (process.platform === 'win32') {
    // start 是 cmd 内置命令，需用 cmd /c 包一层
    cmd = 'cmd /c start "" "' + url + '"';
  } else if (process.platform === 'darwin') {
    cmd = 'open "' + url + '"';
  } else {
    cmd = 'xdg-open "' + url + '"';
  }
  exec(cmd, function () {});
}

let port = START_PORT;
let attempts = 0;

function listen() {
  const server = http.createServer(handler);

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && attempts < MAX_TRIES) {
      attempts++;
      port++;
      listen();
    } else {
      console.error('\n  启动失败：' + e.message + '\n');
      process.exit(1);
    }
  });

  server.listen(port, '127.0.0.1', () => {
    const url = 'http://127.0.0.1:' + port + '/index.html';
    console.log('');
    console.log('  ================================================');
    console.log('   音频 → MP3 批量转换');
    console.log('  ================================================');
    console.log('');
    console.log('   地址： ' + url);
    console.log('');
    console.log('   浏览器已自动打开。若没有，请手动复制上面的地址。');
    console.log('   用完请关闭这个窗口（即停止服务）。');
    console.log('');
    if (process.argv.indexOf('--no-open') < 0) openBrowser(url);
  });
}

// ============================================================
//  入口：默认启动网页服务；带 --cli 时改为命令行批量转换
// ============================================================

if (process.argv.indexOf('--cli') >= 0) {
  runCli();
} else {
  // 启动前确认引擎就位，缺了就自动下载
  ensureWasm().then(() => listen());
}

// ------------------------------------------------------------
//  命令行批量转换：node serve.js --cli <输入目录> [码率]
//  用 ffmpeg.wasm core 直接转码，不需要浏览器
// ------------------------------------------------------------
function runCli() {
  var argv = process.argv.slice(2).filter(function (a) { return a !== '--cli'; });
  var inDir = argv[0];
  var bitrate = argv[1] || '192';

  if (!inDir || !fs.existsSync(inDir)) {
    console.log('用法: node serve.js --cli <输入目录> [码率kbps]');
    console.log('例如: node serve.js --cli "D:\\\\Music" 192');
    process.exit(1);
  }

  var EXTS = ['.m4a', '.m4b', '.m4r', '.aac', '.mp3', '.flac', '.wav', '.aiff', '.aif',
              '.ogg', '.oga', '.opus', '.wma', '.amr', '.ac3', '.ape', '.wv', '.tta',
              '.au', '.mp4', '.m4v', '.mov', '.mkv', '.webm', '.avi', '.flv', '.wmv',
              '.ts', '.mpg', '.mpeg'];

  var files = fs.readdirSync(inDir).filter(function (f) {
    return EXTS.indexOf(path.extname(f).toLowerCase()) >= 0;
  }).map(function (f) {
    var full = path.join(inDir, f);
    return { name: f, full: full, size: fs.statSync(full).size };
  });

  if (!files.length) { console.log('没有找到可转换的文件'); return; }

  var outDir = path.join(inDir, 'mp3');
  fs.mkdirSync(outDir, { recursive: true });

  console.log('找到 ' + files.length + ' 个文件，码率 ' + bitrate + ' kbps');
  console.log('输出目录: ' + outDir + '\n');
  console.log('加载 ffmpeg core ...');

  var t0 = Date.now();
  var core = require(path.join(ROOT, 'vendor', 'ffmpeg-core.js'));
  core({
    locateFile: function (f) { return f.endsWith('.wasm') ? WASM_FILE : f; },
    print: function () {}, printErr: function () {}, noInitialRun: true
  }).then(function (ff) {
    console.log('就绪 (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)\n');

    var ok = 0, fail = 0, i = 0;

    (function next() {
      if (i >= files.length) {
        console.log('\n完成: 成功 ' + ok + ', 失败 ' + fail);
        return;
      }
      var f = files[i++];
      var outPath = path.join(outDir, path.basename(f.name, path.extname(f.name)) + '.mp3');
      var tag = '[' + i + '/' + files.length + '] ' + f.name;

      if (fs.existsSync(outPath)) { console.log(tag + ' -> 已存在，跳过'); ok++; return next(); }

      process.stdout.write(tag + ' (' + (f.size / 1048576).toFixed(1) + 'MB) ... ');
      var t = Date.now();

      try {
        var vIn = 'in' + path.extname(f.name).toLowerCase();
        var vOut = 'out.mp3';
        ff.FS.writeFile(vIn, new Uint8Array(fs.readFileSync(f.full)));

        // core 的 exec 是可变参数形式，不是数组
        var rc = ff.exec.apply(ff, ['-hide_banner', '-loglevel', 'error', '-y',
                                    '-i', vIn, '-vn', '-c:a', 'libmp3lame',
                                    '-b:a', bitrate + 'k', vOut]);
        if (rc !== 0) throw new Error('ffmpeg 返回码 ' + rc);

        var data = ff.FS.readFile(vOut);
        if (!data || !data.length) throw new Error('输出为空');
        fs.writeFileSync(outPath, Buffer.from(data));

        try { ff.FS.unlink(vIn); } catch (e) {}
        try { ff.FS.unlink(vOut); } catch (e) {}

        console.log('OK ' + (data.length / 1048576).toFixed(2) + 'MB (' + ((Date.now() - t) / 1000).toFixed(1) + 's)');
        ok++;
      } catch (e) {
        console.log('失败: ' + e.message);
        fail++;
      }
      setImmediate(next);
    })();
  }).catch(function (e) {
    console.error('ffmpeg core 加载失败: ' + e.message);
    process.exit(1);
  });
}
