import { build } from 'esbuild';
import { rmSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const outdir = 'public';
rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

await build({
  entryPoints: {
    background: 'src/background.ts',
    offscreen: 'src/offscreen.ts',
    popup: 'src/popup.ts'
  },
  bundle: true,
  format: 'esm',
  outdir,
  target: 'chrome120',
  sourcemap: true
});

for (const f of ['manifest.json', 'offscreen.html', 'popup.html', 'firebaseConfig.json']) {
  copyFileSync(join('src', f), join(outdir, f));
}
console.log('Built to', outdir);