// 'auto' ブロードフェーズの総当たり→ハッシュ切替閾値の実測。node bench/rigid-broadphase-threshold.mjs [--json out.json]
// 同一配置（散らばった球と箱、疎〜中密度）で brute / hash / tree の 1 ステップ中央値を比較する。Node CPU 時間のみ。
import { RigidBodyWorld } from '../src/rigid/world.js';
import { rng, percentileOf } from '../src/util.js';
import { writeFileSync } from 'node:fs';
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null, DT = 1 / 60;
function build(n, bp) {
  const r = rng(5), s = Math.max(3, Math.cbrt(n) * 1.2), w = new RigidBodyWorld({ broadphase: bp, enableSleeping: false, gravity: [0, 0, 0], onWarning: () => {} });
  for (let i = 0; i < n; i++) w.addBody({ shape: i % 2 ? 'sphere' : 'box', radius: 0.3, halfExtents: [0.3, 0.3, 0.3], position: [(r() - 0.5) * 2 * s, (r() - 0.5) * 2 * s, (r() - 0.5) * 2 * s], velocity: [(r() - 0.5) * 2, (r() - 0.5) * 2, (r() - 0.5) * 2] });
  return w;
}
const rows = [];
for (const n of [8, 16, 24, 32, 48, 64, 96, 128, 256]) {
  const row = { n }; for (const bp of ['brute', 'hash', 'tree']) { const w = build(n, bp); for (let i = 0; i < 30; i++) w.step(DT); const t = []; for (let k = 0; k < 300; k++) { const a = performance.now(); w.step(DT); t.push(performance.now() - a); } row[bp] = +percentileOf(t, 0.5).toFixed(4); row[bp + 'BroadphaseMs'] = +(w.getStats().broadphaseMs).toFixed(4); }
  rows.push(row); console.log(`n=${String(n).padStart(4)}  brute ${row.brute}ms  hash ${row.hash}ms  tree ${row.tree}ms   （step 全体の中央値）`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ node: process.version, rows }, null, 2));
