// 衝突システム(CollisionWorld)のベンチマーク（Node.js・描画なし）。
// 使い方: node --expose-gc bench/collision-bench.mjs [--json out.json] [--quick] [--sizes 1000,10000]
// 注意: この実行環境の CPU/Node での値です。ブラウザや他の端末での性能保証ではありません。
import { CollisionWorld } from '../src/collision/index.js';
import { rng, percentileOf } from '../src/util.js';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
const args = process.argv.slice(2), quick = args.includes('--quick'), jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const sizes = args.includes('--sizes') ? args[args.indexOf('--sizes') + 1].split(',').map(Number) : (quick ? [1000, 10000] : [1000, 10000, 50000, 100000]);
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const gc = () => { if (global.gc) global.gc(); };

/** 密度一定（1 球あたり約 8 セル分の空間）の箱の中を動き回る球。壁で反射。 */
function crowd(n, kind, { mixed = false, seed = 1 } = {}) {
  const R = rng(seed), side = Math.cbrt(n * 8) * 0.6, w = new CollisionWorld({ broadphase: kind });
  const hs = new Array(n), vel = new Float64Array(n * 3), pos = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = mixed ? (R() < 0.02 ? 1.5 : 0.2 + R() * 0.2) : 0.25;
    pos[i * 3] = R() * side; pos[i * 3 + 1] = R() * side; pos[i * 3 + 2] = R() * side; vel[i * 3] = (R() - .5) * 6; vel[i * 3 + 1] = (R() - .5) * 6; vel[i * 3 + 2] = (R() - .5) * 6;
    hs[i] = w.addSphere({ radius: r, position: [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]] });
  }
  const move = dt => { for (let i = 0; i < n * 3; i++) { pos[i] += vel[i] * dt; if (pos[i] < 0 || pos[i] > side) vel[i] = -vel[i]; } for (let i = 0; i < n; i++) w.setPosition(hs[i], pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); };
  return { w, move, side };
}
function measure(label, n, kind, opts, steps, warm) {
  const { w, move } = crowd(n, kind, opts); for (let i = 0; i < warm; i++) { move(1 / 60); w.step(); }
  const tot = [], broad = [], narrow = [], upd = []; let tests = 0, cand = 0, cont = 0, ev = 0;
  for (let i = 0; i < steps; i++) {
    const t0 = performance.now(); move(1 / 60); const t1 = performance.now(); const s = w.step(); upd.push(t1 - t0); tot.push(s.stepMs); broad.push(s.broadMs); narrow.push(s.narrowMs); tests += s.broadTests; cand += s.candidatePairs; cont += s.contacts; ev += s.events;
  }
  return { label, kind, bodies: n, steps, updateMs: +mean(upd).toFixed(3), stepMeanMs: +mean(tot).toFixed(3), stepMedianMs: +percentileOf(tot, 0.5).toFixed(3), stepP95Ms: +percentileOf(tot, 0.95).toFixed(3), stepMaxMs: +Math.max(...tot).toFixed(3), broadMs: +mean(broad).toFixed(3), narrowMs: +mean(narrow).toFixed(3), eventMs: 0,
    broadTestsPerStep: Math.round(tests / steps), candidatePairsPerStep: Math.round(cand / steps), contactsPerStep: Math.round(cont / steps), eventsPerStep: Math.round(ev / steps), broadEfficiency: +(cand / Math.max(1, tests)).toFixed(3) };
}
console.log(`環境: Node ${process.version} / ${os.cpus()[0].model} x${os.cpus().length} / ${os.platform()}\n`);
const rows = [];
for (const n of sizes) for (const kind of ['hash', 'tree']) { rows.push(measure('球(均一) ' + n, n, kind, {}, n >= 50000 ? 20 : 40, 5)); gc(); }
for (const n of sizes.filter(x => x <= 10000)) for (const kind of ['hash', 'tree']) { rows.push(measure('球(大小混在) ' + n, n, kind, { mixed: true }, 40, 5)); gc(); }
rows.push(measure('球(均一) 1000 [総当たり=基準]', 1000, 'brute', {}, 20, 3));
const H = ['ラベル', '方式', '物体', '更新ms', '平均ms', '中央値', 'P95ms', '最大ms', '広域', '狭域', 'AABB判定/step', '候補ペア', '接触', 'イベント'];
console.log(H.join('\t')); for (const r of rows) console.log([r.label, r.kind, r.bodies, r.updateMs, r.stepMeanMs, r.stepMedianMs, r.stepP95Ms, r.stepMaxMs, r.broadMs, r.narrowMs, r.broadTestsPerStep, r.candidatePairsPerStep, r.contactsPerStep, r.eventsPerStep].join('\t'));

/* ---- 正確性込みの比較（Test B）: 総当たりとの突き合わせ（取りこぼし数・重複数） ---- */
const accuracy = [];
for (const kind of ['hash', 'tree']) for (const n of [3000]) {
  const { w, move } = crowd(n, kind, { mixed: true, seed: 5 }); let missed = 0, extra = 0, dup = 0, compared = 0; w.options.checkDuplicates = true;
  for (let s = 0; s < 10; s++) { move(1 / 30); const st = w.step(); const a = w.contactPairs().map(p => p.join()), b = w.bruteForcePairs().map(p => p.join()); const A = new Set(a), B = new Set(b); for (const k of B) if (!A.has(k)) missed++; for (const k of A) if (!B.has(k)) extra++; dup += st.duplicatePairs; compared += b.length; }
  accuracy.push({ kind, bodies: n, steps: 10, trueContacts: compared, missed, extra, duplicates: dup });
}
console.log('\n正確性（総当たりとの比較）:'); for (const a of accuracy) console.log(JSON.stringify(a));

/* ---- 大量生成・削除（Test D） ---- */
function churn(kind) {
  const w = new CollisionWorld({ broadphase: kind }), R = rng(9), live = []; const stale = []; let heap0, heapMax = 0, steps = 0;
  const N = quick ? 20000 : 100000;
  for (let i = 0; i < 2000; i++) live.push(w.addSphere({ radius: 0.3, position: [R() * 40, R() * 40, R() * 40] })); w.step(); gc(); heap0 = process.memoryUsage().heapUsed;
  const t0 = performance.now(); let staleOK = true;
  for (let it = 0; it < N; it++) {
    const k = (R() * live.length) | 0; stale.push(live[k]); w.remove(live[k]); live[k] = w.addSphere({ radius: 0.3, position: [R() * 40, R() * 40, R() * 40] });
    if (it % 200 === 0) { w.step(); steps++; if (stale.length > 5000) { for (const h of stale) if (w.isValid(h)) staleOK = false; stale.length = 0; } heapMax = Math.max(heapMax, process.memoryUsage().heapUsed); }
  }
  const ms = performance.now() - t0; gc(); const heap1 = process.memoryUsage().heapUsed;
  return { kind, cycles: N, liveEnd: w.count, slotsHighWater: w.alloc.highWaterMark, totalMs: +ms.toFixed(1), usPerCycle: +(ms * 1000 / N).toFixed(2), heapStartMB: +(heap0 / 1048576).toFixed(1), heapEndMB: +(heap1 / 1048576).toFixed(1), staleHandlesAllInvalid: staleOK, gcExposed: !!global.gc };
}
const churnRows = [churn('hash'), churn('tree')]; console.log('\n大量生成・削除:'); for (const c of churnRows) console.log(JSON.stringify(c));
if (jsonOut) { writeFileSync(jsonOut, JSON.stringify({ env: { node: process.version, cpu: os.cpus()[0].model, cores: os.cpus().length, platform: os.platform() }, rows, accuracy, churn: churnRows }, null, 2)); console.log('\nJSON を保存:', jsonOut); }
