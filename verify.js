const fs = require('fs');
const path = require('path');
const dir = 'J:/歌曲/mp3';
const BR=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320,0],SR=[44100,48000,32000,0];
const files = fs.readdirSync(dir).filter(f=>f.endsWith('.mp3'));
let bad = 0;
console.log('检查 ' + files.length + ' 个文件\n');
for (const f of files) {
  const b = fs.readFileSync(path.join(dir,f));
  let id3 = 0;
  if (b[0]===0x49&&b[1]===0x44&&b[2]===0x33) id3 = 10 + (((b[6]&0x7f)<<21)|((b[7]&0x7f)<<14)|((b[8]&0x7f)<<7)|(b[9]&0x7f));
  let off = id3, n = 0, first = null;
  while (off < b.length - 4) {
    if (b[off]===0xFF && (b[off+1]&0xE0)===0xE0) {
      const b2 = b[off+2];
      const br = BR[(b2>>4)&0xF], sr = SR[(b2>>2)&3];
      const len = Math.floor(144*br*1000/sr) + ((b2>>1)&1);
      if (len > 4 && off+len <= b.length) {
        if (!first) first = { br, sr, ch: ((b[3]>>6)&3)===3?'mono':'stereo' };
        n++; off += len; continue;
      }
    }
    off++;
  }
  const cov = n * Math.floor(144*(first?first.br:192)*1000/(first?first.sr:44100)) / b.length * 100;
  const dur = first ? n*1152/first.sr : 0;
  const ok = first && first.br===192 && n>0 && cov>95;
  if (!ok) bad++;
  console.log((ok?'OK  ':'BAD ') + f.padEnd(26) + ' ' + (b.length/1048576).toFixed(2).padStart(6) + 'MB  ' +
    String(first?first.br:'?').padStart(3) + 'kbps ' + String(first?first.sr:'?').padStart(5) + 'Hz ' +
    (first?first.ch:'?').padEnd(6) + ' ' + Math.floor(dur/60) + ':' + String(Math.round(dur%60)).padStart(2,'0') +
    '  覆盖 ' + cov.toFixed(1) + '%  ID3 ' + id3 + 'B');
}
console.log('\n不合格: ' + bad + ' / ' + files.length);
