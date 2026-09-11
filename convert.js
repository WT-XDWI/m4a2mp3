// 用 ffmpeg.wasm core 在 Node 里批量把音频转成 MP3
// 用法: node convert.js <输入目录> <码率kbps>
const fs = require('fs');
const path = require('path');

const CORE_JS = path.join(__dirname, 'vendor', 'ffmpeg-core.js');
const CORE_WASM = path.join(__dirname, 'vendor', 'ffmpeg-core.wasm');

const IN_DIR = process.argv[2];
const BITRATE = process.argv[3] || '192';

// 支持的输入扩展名
const AUDIO_EXT = ['.m4a','.m4b','.m4r','.aac','.mp3','.flac','.wav','.aiff','.aif','.ogg','.oga','.opus','.wma','.amr','.ac3','.ape','.wv','.tta','.au','.mp4','.m4v','.mov','.mkv','.webm','.avi','.flv','.wmv','.ts','.mpg','.mpeg'];

async function main() {
  if (!IN_DIR || !fs.existsSync(IN_DIR)) {
    console.error('用法: node convert.js <输入目录> [码率]');
    process.exit(1);
  }

  const files = fs.readdirSync(IN_DIR)
    .filter(f => AUDIO_EXT.includes(path.extname(f).toLowerCase()))
    .map(f => ({ name: f, full: path.join(IN_DIR, f), size: fs.statSync(path.join(IN_DIR, f)).size }));

  if (!files.length) { console.log('没有找到可转换的文件'); return; }
  console.log('找到 ' + files.length + ' 个文件，码率 ' + BITRATE + ' kbps\n');

  const outDir = path.join(IN_DIR, 'mp3');
  fs.mkdirSync(outDir, { recursive: true });

  console.log('加载 ffmpeg core ...');
  const t0 = Date.now();
  const core = require(CORE_JS);
  const ff = await core({
    // wasm 文件位置
    locateFile: (f) => (f.endsWith('.wasm') ? CORE_WASM : f),
    print: () => {},
    printErr: () => {},
    noInitialRun: true,
  });
  console.log('core 就绪 (' + ((Date.now()-t0)/1000).toFixed(1) + 's)\n');

  let ok = 0, fail = 0;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const outName = path.basename(f.name, path.extname(f.name)) + '.mp3';
    const outPath = path.join(outDir, outName);
    const tag = '[' + (i+1) + '/' + files.length + '] ' + f.name;

    if (fs.existsSync(outPath)) { console.log(tag + '  -> 已存在，跳过'); ok++; continue; }

    process.stdout.write(tag + ' (' + (f.size/1048576).toFixed(1) + 'MB) ... ');
    const t = Date.now();

    try {
      // 输入用原扩展名写进虚拟 FS
      const vIn = 'in' + path.extname(f.name).toLowerCase();
      const vOut = 'out.mp3';
      ff.FS.writeFile(vIn, new Uint8Array(fs.readFileSync(f.full)));

      const args = ['-hide_banner','-loglevel','error','-y','-i',vIn,
                    '-vn','-c:a','libmp3lame','-b:a',BITRATE+'k', vOut];
      // core 的 exec 是可变参数形式: exec('a','b',...)，不是数组
      const rc = ff.exec.apply(ff, args);

      if (rc !== 0) throw new Error('ffmpeg 返回码 ' + rc);

      const data = ff.FS.readFile(vOut);
      if (!data || !data.length) throw new Error('输出为空');
      fs.writeFileSync(outPath, Buffer.from(data));

      try { ff.FS.unlink(vIn); } catch (e) {}
      try { ff.FS.unlink(vOut); } catch (e) {}

      console.log('OK ' + (data.length/1048576).toFixed(2) + 'MB (' + ((Date.now()-t)/1000).toFixed(1) + 's)');
      ok++;
    } catch (e) {
      console.log('失败: ' + e.message);
      fail++;
    }
  }

  console.log('\n完成: 成功 ' + ok + '，失败 ' + fail);
  console.log('输出目录: ' + outDir);
}

main().catch(e => { console.error('致命错误:', e); process.exit(1); });
