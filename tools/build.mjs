// ビルドスクリプト: esbuild（開発時のみ必要。MIT）で src/ から配布物を生成する。
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
let esbuild;
for (const p of [root, '/opt/npm-tools/node_modules', process.env.ESBUILD_PATH].filter(Boolean)) {
  try { esbuild = require(require.resolve('esbuild', { paths: [p] })); break; } catch (_) { /* 次の候補へ */ }
}
if (!esbuild) { console.error('esbuild が見つかりません。`npm install` を実行してください。'); process.exit(1); }

const VERSION = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const banner = `/*! MASSIVE ENGINE v${VERSION} — dependency-free WebGL 2 3D engine. (c) project owner. License: not specified by the author. */`;
mkdirSync(join(root, 'dist'), { recursive: true });
mkdirSync(join(root, 'src/generated'), { recursive: true });

// 1) 物理ワーカー（IIFE・minify）を文字列化して本体へ埋め込む
const worker = await esbuild.build({ entryPoints: [join(root, 'src/physics-worker-entry.js')], bundle: true, format: 'iife', minify: true, target: 'es2020', write: false });
writeFileSync(join(root, 'src/generated/worker-source.js'), '// 自動生成: tools/build.mjs\nexport default ' + JSON.stringify(worker.outputFiles[0].text) + ';\n');

// 2) 本体
const common = { entryPoints: [join(root, 'src/index.js')], bundle: true, target: 'es2020', banner: { js: banner }, legalComments: 'none' };
const outputs = [
  { outfile: 'dist/massive-engine.esm.js', format: 'esm' },
  { outfile: 'dist/massive-engine.esm.min.js', format: 'esm', minify: true },
  { outfile: 'dist/massive-engine.js', format: 'iife', globalName: 'MassiveEngine' },
  { outfile: 'dist/massive-engine.min.js', format: 'iife', globalName: 'MassiveEngine', minify: true }
];
for (const o of outputs) await esbuild.build({ ...common, ...o, outfile: join(root, o.outfile) });

// 3) 試作版と同じファイル名（既存サイトの <script src> を壊さない）
copyFileSync(join(root, 'dist/massive-engine.js'), join(root, 'massive-engine.js'));
copyFileSync(join(root, 'dist/massive-engine.esm.js'), join(root, 'massive-engine.mjs'));
writeFileSync(join(root, 'VERSION'), VERSION + '\n');

for (const f of ['dist/massive-engine.js', 'dist/massive-engine.min.js', 'dist/massive-engine.esm.js', 'dist/massive-engine.esm.min.js']) {
  const b = readFileSync(join(root, f));
  console.log(f.padEnd(34), (statSync(join(root, f)).size / 1024).toFixed(1).padStart(7) + ' KB', ' gzip ' + (gzipSync(b).length / 1024).toFixed(1) + ' KB');
}
