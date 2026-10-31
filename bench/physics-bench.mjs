// 物理(衝突検出・応答)のみのベンチマーク（Node.js 用・描画なし）。
// 使い方: node bench/physics-bench.mjs [--json out.json] [--quick]
// 注意: 結果はこの実行環境(CPU/Node版)の値であり、ブラウザや他端末での性能保証ではありません。
import { PhysicsWorld } from '../src/physics.js';
import { rng, percentileOf } from '../src/util.js';
import { writeFileSync } from 'node:fs';
import os from 'node:os';

const args = process.argv.slice(2), quick = args.includes('--quick'), jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;

// 試作版と同じ配置: 格子状 + 微小ジッタ、XZ 平面、半径 0.22–0.28、ランダム方向
function particleWorld(count, cell, opts = {}) {
  const cols = Math.ceil(Math.sqrt(count)), rows = Math.ceil(count / cols), sp = 0.62, W = cols * sp, D = rows * sp, r = rng(1);
  const w = new PhysicsWorld(Object.assign({ gravity: [0, 0, 0], bounds: { min: [-W / 2, -1, -D / 2], max: [W / 2, 1, D / 2] }, planar: true, cellSize: cell, restitution: 0.12, boundsRestitution: 1, maxSubSteps: 1 }, opts));
  w.reserve(count);
  for (let i = 0; i < count; i++) { const row = Math.floor(i / cols), col = i % cols, a = r() * Math.PI * 2, v = 0.38 + r() * 0.85, rad = 0.22 + r() * 0.06;
    w.addBody({ radius: rad, mass: rad * rad, position: [(col - (cols - 1) / 2) * sp + (r() - 0.5) * 0.035, 0, (row - (rows - 1) / 2) * sp + (r() - 0.5) * 0.035], velocity: [Math.cos(a) * v, 0, Math.sin(a) * v] }); }
  return w;
}
function boxWorld(count, kind) { // 3D: 箱の中の落下球
  const r = rng(2), s = Math.cbrt(count) * 0.9;
  const w = new PhysicsWorld({ bounds: { min: [-s, 0, -s], max: [s, s * 1.6, s] }, maxSubSteps: 1, restitution: 0.3, friction: 0.2 }); w.reserve(count);
  for (let i = 0; i < count; i++) w.addBody({ radius: 0.25, position: kind === 'dense' ? [(r() - 0.5) * s * 0.8, r() * s * 0.8 + 1, (r() - 0.5) * s * 0.8] : [(r() - 0.5) * 2 * s * 0.95, r() * s * 1.5 + 0.5, (r() - 0.5) * 2 * s * 0.95] });
  return w;
}
function measure(label, w, steps, warm) {
  for (let i = 0; i < warm; i++) w.step(1 / 60);
  const tot = [], grid = [], col = [], integ = []; let pairs = 0, over = 0, trunc = 0;
  for (let i = 0; i < steps; i++) {
    const s = w.stats; const before = [s.stepMs, s.gridMs, s.collisionMs, s.integrateMs]; w.step(1 / 60);
    tot.push(s.stepMs - before[0]); grid.push(s.gridMs - before[1]); col.push(s.collisionMs - before[2]); integ.push(s.integrateMs - before[3]); pairs += s.candidatePairs; over += s.overlaps; if (s.truncated) trunc++;
  }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  return { label, bodies: w.aliveCount, steps, stepMeanMs: +mean(tot).toFixed(3), stepP95Ms: +percentileOf(tot, 0.95).toFixed(3), stepMaxMs: +Math.max(...tot).toFixed(3), integrateMs: +mean(integ).toFixed(3), gridMs: +mean(grid).toFixed(3), collisionMs: +mean(col).toFixed(3), candidatePairsPerStep: Math.round(pairs / steps), overlapsPerStep: Math.round(over / steps), cells: w.stats.cells, cellSize: +w.cell.toFixed(3), truncatedSteps: trunc };
}
const rows = [], N = quick ? [1000, 10000] : [1000, 10000, 100000], steps = quick ? 30 : 60, warm = 10;
console.log(`環境: Node ${process.version} / ${os.cpus()[0].model} x${os.cpus().length} / ${os.platform()}\n`);
for (const n of N) rows.push(measure(`粒子(試作配置) ${n}`, particleWorld(n, 0.6), n >= 100000 ? Math.floor(steps / 2) : steps, warm));
// 0.45 は物体直径(0.44–0.56)より小さく、巨大物体扱いで総当たりになる悪い例（打切が出る）
for (const cell of [0.45, 0.6, 0.75, 1.0]) rows.push(measure(`粒子 10000 セル幅${cell}`, particleWorld(10000, cell), steps, warm));
rows.push(measure('粒子 10000 隣接事前計算なし', particleWorld(10000, 0.6, { precomputeNeighbors: false }), steps, warm));
rows.push(measure('粒子 10000 反復2回', particleWorld(10000, 0.6, { iterations: 2 }), steps, warm));
for (const n of quick ? [5000] : [5000, 30000]) { rows.push(measure(`3D疎 ${n}`, boxWorld(n, 'sparse'), steps, 30)); rows.push(measure(`3D密 ${n}`, boxWorld(n, 'dense'), steps, 30)); }
console.log('ラベル'.padEnd(30), '物体'.padStart(7), '平均ms'.padStart(8), 'P95ms'.padStart(8), '最大ms'.padStart(8), '積分'.padStart(7), '格子'.padStart(7), '衝突'.padStart(8), '候補/step'.padStart(11), '重なり'.padStart(9), 'セル幅'.padStart(6), '打切'.padStart(5));
for (const r of rows) console.log(r.label.padEnd(30), String(r.bodies).padStart(7), String(r.stepMeanMs).padStart(8), String(r.stepP95Ms).padStart(8), String(r.stepMaxMs).padStart(8), String(r.integrateMs).padStart(7), String(r.gridMs).padStart(7), String(r.collisionMs).padStart(8), String(r.candidatePairsPerStep).padStart(11), String(r.overlapsPerStep).padStart(9), String(r.cellSize).padStart(6), String(r.truncatedSteps).padStart(5));
if (jsonOut) { writeFileSync(jsonOut, JSON.stringify({ env: { node: process.version, cpu: os.cpus()[0].model, cores: os.cpus().length, platform: os.platform() }, steps, rows }, null, 2)); console.log('\nJSON を保存:', jsonOut); }
