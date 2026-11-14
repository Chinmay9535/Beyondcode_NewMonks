// Resumable render: 600-frame chunks, each written atomically; finished chunks are skipped on restart.
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition, openBrowser} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
const CH = 600;
// optional: node tools/render_chunks.mjs 8,9,10  -> only these chunk indices
const ONLY = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const EXE = fs.existsSync('/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell') ? '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell' : undefined;
const browser = await openBrowser('chrome', {browserExecutable: EXE, chromiumOptions: {gl: 'swangle'}});
const composition = await selectComposition({serveUrl, id: 'Film', puppeteerInstance: browser});
const N = composition.durationInFrames;
for (let a = 0, i = 0; a < N; a += CH, i++) {
  const out = `out/chunks/c${String(i).padStart(2, '0')}.mp4`;
  if (ONLY && !ONLY.includes(i)) continue;
  if (fs.existsSync(out)) { console.log('skip', out); continue; }
  const b = Math.min(N - 1, a + CH - 1);
  const t0 = Date.now();
  await renderMedia({composition, serveUrl, codec: 'h264', crf: 14, muted: true, frameRange: [a, b], concurrency: 4,
    outputLocation: out + '.part.mp4', puppeteerInstance: browser, timeoutInMilliseconds: 180000, chromiumOptions: {gl: 'swangle'}});
  fs.renameSync(out + '.part.mp4', out);
  console.log('done', out, `${a}-${b}`, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
await browser.close({silent: true});
console.log('ALL DONE', N);
