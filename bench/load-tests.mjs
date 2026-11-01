// 負荷テスト C / F / G（Node.js・描画なし）。A/B/D/E は collision-bench.mjs と physics-bench.mjs、描画系は bench/render-bench.mjs。
// 使い方: node --expose-gc bench/load-tests.mjs [--json out.json] [--quick]
// 注意: この環境(CPU/Node)の実測値であり、ブラウザや他端末での性能保証ではありません。
import { CollisionWorld } from '../src/collision/index.js';
import { ParticleSystem } from '../src/particles.js';
import { Animator, AnimationClip } from '../src/animation.js';
import { Node } from '../src/node.js';
import { Profiler, StatWindow } from '../src/profiler.js';
import { FixedTimestep } from '../src/timestep.js';
import { rng } from '../src/util.js';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
const args = process.argv.slice(2), quick = args.includes('--quick'), jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const out = { env: { node: process.version, cpu: os.cpus()[0].model, cores: os.cpus().length, platform: os.platform(), when: new Date().toISOString() } };
const gc = () => global.gc && global.gc(); const heapMB = () => { gc(); return process.memoryUsage().heapUsed / 1048576; };
const sw = a => { const w = new StatWindow(a.length); for (const v of a) w.push(v); return { median: +w.median().toFixed(3), p95: +w.percentile(0.95).toFixed(3), p99: +w.percentile(0.99).toFixed(3), max: +w.max().toFixed(3), mean: +w.mean().toFixed(3) }; };

// ---- C: 高速移動体（トンネリング） ----
{
  const run = continuous => {
    const R = rng(11), w = new CollisionWorld({ broadphase: 'hash', cellSize: 2 }), N = quick ? 500 : 5000; let missed = 0, hits = 0;
    // 厚さ 0.1 の壁（x=50）に向かって、1 ステップで壁の 5〜50 倍の距離を進む球
    w.addAABB({ position: [50, 0, 0], halfExtents: [0.05, 100, 100], static: true });
    const hs = [], vs = []; for (let i = 0; i < N; i++) { const v = 8 + R() * 90; hs.push(w.addSphere({ position: [49 - v / 60 * 0.5 + 0.01, R() * 100 - 50, R() * 100 - 50], radius: 0.05, continuous })); vs.push(v); }
    const t0 = performance.now(); w.step(); const seen = new Set(); const evs = [];
    w.onEvent = e => { if (e.type === 0 || e.type === 'start') evs.push(e); };
    for (let f = 0; f < 4; f++) { for (let i = 0; i < N; i++) { const p = w.getPosition(hs[i]); w.setPosition(hs[i], p[0] + vs[i] / 60, p[1], p[2]); } const s = w.step(); hits += s.ccdHits; }
    const touched = new Set(); w.forEachContact((a, b) => { touched.add(a); touched.add(b); });
    return { continuous, bodies: N, ccdHitsTotal: hits, ms: +(performance.now() - t0).toFixed(1) };
  };
  out.C_fastMovers = [run(false), run(true)]; console.log('C 高速移動体', JSON.stringify(out.C_fastMovers));
}

// ---- F: 複合負荷（衝突 + パーティクル + アニメーション + プロファイラ + 固定ステップ） ----
{
  const N = quick ? 5000 : 20000, P = quick ? 5000 : 20000, A = quick ? 200 : 1000, FR = quick ? 200 : 600, R = rng(5);
  const w = new CollisionWorld({ broadphase: 'hash' }), side = Math.cbrt(N * 8) * 0.6, pos = new Float64Array(N * 3), vel = new Float64Array(N * 3), hs = [];
  for (let i = 0; i < N; i++) { for (let k = 0; k < 3; k++) { pos[i * 3 + k] = R() * side; vel[i * 3 + k] = (R() - .5) * 6; } hs.push(w.addSphere({ position: [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]], radius: 0.25 })); }
  const ps = new ParticleSystem({ capacity: P, glow: true, gravity: [0, -3, 0], seed: 4 });
  const nodes = [], anims = []; const clip = new AnimationClip('c', { loop: 'repeat', tracks: [{ path: 'position', keys: [{ time: 0, value: [0, 0, 0] }, { time: 1, value: [1, 2, 3], easing: 'easeInOut' }, { time: 2, value: [0, 0, 0] }] }, { path: 'rotation', keys: [{ time: 0, value: [0, 0, 0, 1] }, { time: 2, value: [0, 0.7071, 0, 0.7071] }] }] });
  for (let i = 0; i < A; i++) { const n = new Node(); nodes.push(n); const a = new Animator(n); a.addClip(clip); a.play('c'); anims.push(a); }
  const prof = new Profiler({ windowSize: FR }), ts = new FixedTimestep({ fixedDt: 1 / 60 }); const h0 = heapMB();
  for (let f = 0; f < FR + 30; f++) {
    prof.begin('frame');
    prof.begin('sim'); ts.update(1 / 60, dt => { for (let i = 0; i < N * 3; i++) { pos[i] += vel[i] * dt; if (pos[i] < 0 || pos[i] > side) vel[i] = -vel[i]; } for (let i = 0; i < N; i++) w.setPosition(hs[i], pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); const s = w.step(); prof.gauge('contacts', s.contacts); prof.gauge('candidatePairs', s.candidatePairs); }); prof.end('sim');
    prof.begin('particles'); ps.emit({ count: 600, x: side / 2, y: side / 2, z: side / 2, life: 2, speed: 4 }); ps.update(1 / 60); prof.end('particles');
    prof.begin('anim'); for (const a of anims) a.update(1 / 60); prof.end('anim'); prof.end('frame');
    if (f >= 30) prof.endFrame(); else prof.reset();
  }
  const snap = prof.snapshot(); out.F_combined = { objects: N, particlesCapacity: P, particlesAlive: ps.count, animators: A, frames: FR, heapStartMB: +h0.toFixed(1), heapEndMB: +heapMB().toFixed(1), metrics: Object.fromEntries(Object.entries(snap).map(([k, v]) => [k, { unit: v.unit, median: +v.median.toFixed(3), p95: +v.p95.toFixed(3), p99: +v.p99.toFixed(3), max: +v.max.toFixed(3) }])) };
  console.log('F 複合', JSON.stringify(out.F_combined.metrics.frame), 'heap', h0.toFixed(1), '→', out.F_combined.heapEndMB, 'alive particles', ps.count);
}

// ---- G: 長時間安定性（生成・削除・移動を継続し、メモリ/ハンドル/スロットが増え続けないか） ----
{
  const STEPS = quick ? 3000 : 36000, LIVE = 3000, R = rng(8), w = new CollisionWorld({ broadphase: 'hash' }), hs = [], stale = [];
  const side = 60; for (let i = 0; i < LIVE; i++) hs.push(w.addSphere({ position: [R() * side, R() * side, R() * side], radius: 0.4 }));
  const checkpoints = [], t0 = performance.now(); let maxStep = 0; const times = [];
  for (let s = 1; s <= STEPS; s++) {
    for (let k = 0; k < 20; k++) { const j = (R() * LIVE) | 0; if (stale.length < 1000) stale.push(hs[j]); w.remove(hs[j]); hs[j] = w.addSphere({ position: [R() * side, R() * side, R() * side], radius: 0.4 }); }
    for (let i = 0; i < LIVE; i += 3) { const p = w.getPosition(hs[i]); w.setPosition(hs[i], p[0] + (R() - .5) * 0.4, p[1] + (R() - .5) * 0.4, p[2] + (R() - .5) * 0.4); }
    const st = w.step(); times.push(st.stepMs); if (st.stepMs > maxStep) maxStep = st.stepMs;
    if (s % (STEPS / 6) === 0) { const lastTimes = times.slice(-1000); checkpoints.push({ step: s, simMinutes: +(s / 3600).toFixed(2), heapMB: +heapMB().toFixed(1), live: w.alloc.liveCount, slotsHighWater: w.alloc.highWaterMark, pairs: w.pairs.size, stepMedianMs: sw(lastTimes).median, stepP99Ms: sw(lastTimes).p99 }); }
  }
  const staleValid = stale.filter(h => w.alloc.isValid(h)).length; const liveHandles = new Set(hs).size;
  out.G_longRun = { steps: STEPS, wallSec: +((performance.now() - t0) / 1000).toFixed(1), checkpoints, staleHandlesStillValid: staleValid, staleSampleSize: stale.length, uniqueLiveHandles: liveHandles, maxStepMs: +maxStep.toFixed(2) };
  console.log('G 長時間'); console.table(checkpoints);
}
if (jsonOut) { writeFileSync(jsonOut, JSON.stringify(out, null, 2)); console.log('JSON を保存:', jsonOut); }
