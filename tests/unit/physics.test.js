import test from 'node:test';
import assert from 'node:assert/strict';
import { PhysicsWorld, createPhysicsHost, SHAPE_BOX } from '../../src/physics.js';
import { rng } from '../../src/util.js';

/* ---------- ブロードフェーズ検証ヘルパ ---------- */
function verifyBroadphase(world, label) {
  const cand = world.computeCandidatePairs(), seen = new Set(); let dup = 0;
  for (const [i, j] of cand) {
    assert.ok(i < j, label + ': 正規化されていない');
    assert.ok(world.alive[i] && world.alive[j], label + ': 死んだ物体が候補に含まれる');
    assert.ok(!(world.invMass[i] === 0 && world.invMass[j] === 0), label + ': 静的どうしが候補に含まれる');
    const k = i * 1000003 + j; if (seen.has(k)) dup++; seen.add(k);
  }
  assert.equal(dup, 0, label + ': 重複候補 ' + dup);
  const truth = world.bruteForceOverlaps(); let missing = 0; const miss = [];
  for (const [i, j] of truth) if (!seen.has(i * 1000003 + j)) { missing++; if (miss.length < 5) miss.push([i, j]); }
  assert.equal(missing, 0, label + ': 漏れた衝突ペア ' + missing + ' ' + JSON.stringify(miss));
  return { candidates: cand.length, overlaps: truth.length };
}
const mk = (opts) => new PhysicsWorld(Object.assign({ bounds: { min: [-20, -20, -20], max: [20, 20, 20] }, walls: false }, opts));

const SCENARIOS = {
  'ランダム配置(球)': w => { const r = rng(1); for (let i = 0; i < 900; i++) w.addBody({ radius: 0.2 + r() * 0.1, position: [(r() - 0.5) * 30, (r() - 0.5) * 30, (r() - 0.5) * 30] }); },
  '密集配置(多重重なり)': w => { const r = rng(2); for (let i = 0; i < 700; i++) w.addBody({ radius: 0.25, position: [(r() - 0.5) * 3, (r() - 0.5) * 3, (r() - 0.5) * 3] }); },
  'セル境界ちょうど': w => { w.setOptions({ cellSize: 0.5 }); for (let k = -10; k < 10; k++) for (let a = 0; a < 3; a++) { const x = k * 0.5, e = [0, 1e-6, -1e-6][a]; w.addBody({ radius: 0.2, position: [x + e, 0.5 * a, 0] }); w.addBody({ radius: 0.2, position: [x + 0.3 + e, 0.5 * a, 0.1] }); } },
  '巨大な物体(動的+静的)混在': w => { const r = rng(3); for (let i = 0; i < 500; i++) w.addBody({ radius: 0.25, position: [(r() - 0.5) * 30, (r() - 0.5) * 30, (r() - 0.5) * 30] }); w.addBody({ radius: 5, position: [0, 0, 0] }); w.addBody({ radius: 4, position: [8, 3, -2], static: true }); w.addBody({ shape: 'box', halfExtents: [10, 0.5, 10], position: [0, -5, 0], static: true }); w.addBody({ shape: 'box', halfExtents: [3, 6, 2], position: [-9, 1, 4] }); },
  '空セルが大半(疎)': w => { w.setOptions({ bounds: { min: [-500, -500, -500], max: [500, 500, 500] } }); const r = rng(4); for (let i = 0; i < 60; i++) { const b = [(r() - 0.5) * 900, (r() - 0.5) * 900, (r() - 0.5) * 900]; w.addBody({ radius: 0.3, position: b }); if (i % 3 === 0) w.addBody({ radius: 0.3, position: [b[0] + 0.4, b[1], b[2]] }); } },
  '平面モード(planar)': w => { w.setOptions({ planar: true }); const r = rng(5); for (let i = 0; i < 800; i++) w.addBody({ radius: 0.22 + r() * 0.06, position: [(r() - 0.5) * 30, 0, (r() - 0.5) * 30] }); },
  '静的ブロック群 + 動的球(ボクセル風)': w => { for (let x = -6; x < 6; x++) for (let z = -6; z < 6; z++) for (let y = -2; y < 0; y++) w.addBody({ shape: 'box', halfExtents: [0.5, 0.5, 0.5], position: [x + 0.5, y + 0.5, z + 0.5], static: true }); const r = rng(6); for (let i = 0; i < 300; i++) w.addBody({ radius: 0.3, position: [(r() - 0.5) * 12, r() * 3 - 0.5, (r() - 0.5) * 12] }); },
  '領域外の物体(境界へ丸め)': w => { const r = rng(7); for (let i = 0; i < 300; i++) w.addBody({ radius: 0.3, position: [(r() - 0.5) * 60, (r() - 0.5) * 60, (r() - 0.5) * 60] }); for (let i = 0; i < 20; i++) { w.addBody({ radius: 0.3, position: [25 + i * 0.1, 0, 0] }); } },
  '大きさがばらばら(セル幅 > 半径)': w => { const r = rng(8); for (let i = 0; i < 600; i++) w.addBody({ radius: 0.1 + r() * 1.4, position: [(r() - 0.5) * 25, (r() - 0.5) * 25, (r() - 0.5) * 25] }); },
  'reach=2 (maxReach:2, 半径がセル幅の半分超)': w => { w.setOptions({ maxReach: 2, cellSize: 0.6 }); const r = rng(10); for (let i = 0; i < 500; i++) w.addBody({ radius: 0.1 + r() * 0.5, position: [(r() - 0.5) * 14, (r() - 0.5) * 14, (r() - 0.5) * 14] }); for (let i = 0; i < 60; i++) w.addBody({ shape: 'box', halfExtents: [0.55, 0.3, 0.5], position: [(r() - 0.5) * 14, (r() - 0.5) * 14, (r() - 0.5) * 14], static: true }); },
  '球と箱の混合': w => { const r = rng(9); for (let i = 0; i < 500; i++) { const p = [(r() - 0.5) * 16, (r() - 0.5) * 16, (r() - 0.5) * 16]; if (i % 2) w.addBody({ radius: 0.3, position: p }); else w.addBody({ shape: 'box', halfExtents: [0.2 + r() * 0.2, 0.2 + r() * 0.2, 0.2 + r() * 0.2], position: p, static: i % 8 === 0 }); } }
};

for (const [name, build] of Object.entries(SCENARIOS)) {
  for (const pre of [true, false]) {
    test(`ブロードフェーズ[${name}] 事前計算隣接=${pre}: 漏れ・重複なし`, () => {
      const w = mk({ precomputeNeighbors: pre }); build(w);
      const r = verifyBroadphase(w, name);
      assert.ok(r.candidates >= r.overlaps);
      // 数ステップ進めて動いた後でも検証（動的グリッド再構築の確認）
      w.setOptions({ gravity: [0, 0, 0] }); const rr = rng(11); for (let i = 0; i < w.count; i++) if (w.alive[i] && w.invMass[i] > 0) w.setVelocity(i, (rr() - 0.5) * 4, (rr() - 0.5) * 4, (rr() - 0.5) * 4);
      for (let k = 0; k < 5; k++) w.step(1 / 60);
      verifyBroadphase(w, name + ' (5step後)');
    });
  }
}

test('事前計算あり/なしで候補ペア集合が完全一致する', () => {
  const sets = [true, false].map(pre => { const w = mk({ precomputeNeighbors: pre }); SCENARIOS['ランダム配置(球)'](w); return new Set(w.computeCandidatePairs().map(p => p.join(','))); });
  assert.equal(sets[0].size, sets[1].size); for (const k of sets[0]) assert.ok(sets[1].has(k));
});

test('動的に追加・削除・移動しても漏れなし（ID再利用・静的の移動）', () => {
  const w = mk(); const r = rng(21); const ids = [];
  for (let i = 0; i < 300; i++) ids.push(w.addBody({ radius: 0.3, position: [(r() - 0.5) * 8, (r() - 0.5) * 8, (r() - 0.5) * 8] }));
  verifyBroadphase(w, '初期');
  for (let i = 0; i < 100; i++) w.removeBody(ids[i * 3]);
  verifyBroadphase(w, '削除後'); assert.equal(w.aliveCount, 200);
  const reused = w.addBody({ radius: 0.3, position: [0, 0, 0] }); assert.ok(ids.includes(reused), 'IDが再利用される');
  const st = w.addBody({ shape: 'box', halfExtents: [1, 1, 1], position: [3, 3, 3], static: true }); verifyBroadphase(w, '静的追加');
  w.setPosition(st, -3, -3, -3); verifyBroadphase(w, '静的移動後');
  w.setMass(ids[1], 0); verifyBroadphase(w, '動的→静的');
  assert.throws(() => w.removeBody(ids[0]), RangeError); assert.throws(() => w.setPosition(99999, 0, 0, 0), RangeError);
});

/* ---------- 動作テスト ---------- */
test('自由落下: 解析解（半陰的オイラー）と一致', () => {
  const w = mk({ walls: false }); const id = w.addBody({ radius: 0.5, position: [0, 10, 0] });
  for (let i = 0; i < 60; i++) w.step(1 / 60);
  const dt = 1 / 60, n = 60, expected = 10 - 9.8 * dt * dt * n * (n + 1) / 2;
  assert.ok(Math.abs(w.getPosition(id)[1] - expected) < 1e-3, `${w.getPosition(id)[1]} vs ${expected}`);
  assert.ok(Math.abs(w.getVelocity(id)[1] + 9.8) < 1e-3);
});

test('床で静止（反発しながら減衰し、貫通・発散しない）', () => {
  const w = new PhysicsWorld({ bounds: { min: [-5, 0, -5], max: [5, 20, 5] }, boundsRestitution: 0.4 }); const id = w.addBody({ radius: 0.5, position: [0, 5, 0] });
  let minY = 1e9; for (let i = 0; i < 60 * 8; i++) { w.step(1 / 60); minY = Math.min(minY, w.getPosition(id)[1]); }
  assert.ok(minY >= 0.5 - 1e-6, '床を貫通: ' + minY); assert.ok(Math.abs(w.getPosition(id)[1] - 0.5) < 1e-2); assert.ok(Math.abs(w.getVelocity(id)[1]) < 0.5);
});

test('弾性衝突: 運動量保存・反発係数1で相対速度が反転', () => {
  const w = mk({ gravity: [0, 0, 0], restitution: 1, positionCorrection: 0.8 }); const a = w.addBody({ radius: 0.5, mass: 2, position: [-1, 0, 0], velocity: [3, 0, 0] }), b = w.addBody({ radius: 0.5, mass: 1, position: [1, 0, 0], velocity: [-1, 0, 0] });
  const p0 = 2 * 3 + 1 * -1; for (let i = 0; i < 120; i++) w.step(1 / 60);
  const va = w.getVelocity(a), vb = w.getVelocity(b), p1 = 2 * va[0] + vb[0];
  assert.ok(Math.abs(p0 - p1) < 1e-4, '運動量 ' + p0 + ' → ' + p1);
  assert.ok(Math.abs((vb[0] - va[0]) - 4) < 1e-4, '反発後の相対速度 ' + (vb[0] - va[0]));       // 衝突前 -1 - 3 = -4 → +4
});

test('静的ボックス上に球が乗る・箱どうしが重なり解消・球が箱に押し出される', () => {
  const w = mk({ walls: false, restitution: 0 }); w.addBody({ shape: 'box', halfExtents: [5, 0.5, 5], position: [0, 0, 0], static: true });
  const s = w.addBody({ radius: 0.5, position: [0.3, 3, 0.2] }), bx = w.addBody({ shape: 'box', halfExtents: [0.5, 0.5, 0.5], position: [2, 4, 1] });
  for (let i = 0; i < 300; i++) w.step(1 / 60);
  assert.ok(Math.abs(w.getPosition(s)[1] - 1.0) < 0.02, '球 y=' + w.getPosition(s)[1]); assert.ok(Math.abs(w.getPosition(bx)[1] - 1.0) < 0.02, '箱 y=' + w.getPosition(bx)[1]);
  const inside = w.addBody({ radius: 0.3, position: [1, 0.2, 1], static: false }); w.setVelocity(inside, 0, 0, 0);       // 箱の内部に生成
  for (let i = 0; i < 120; i++) w.step(1 / 60); assert.ok(w.getPosition(inside)[1] >= 0.79, '内部から押し出される y=' + w.getPosition(inside)[1]);
});

test('摩擦: 摩擦ありは水平速度が減る', () => {
  const run = fr => { const w = new PhysicsWorld({ bounds: { min: [-50, 0, -50], max: [50, 20, 50] }, friction: fr, boundsRestitution: 0 });
    w.addBody({ shape: 'box', halfExtents: [20, 0.5, 20], position: [0, 0.5, 0], static: true, friction: fr });
    const s = w.addBody({ shape: 'box', halfExtents: [0.5, 0.5, 0.5], position: [0, 1.5, 0], velocity: [5, 0, 0], friction: fr }); for (let i = 0; i < 120; i++) w.step(1 / 60); return w.getVelocity(s)[0]; };
  const fr0 = run(0), fr1 = run(0.8); assert.ok(fr0 > 4.5, '摩擦なし ' + fr0); assert.ok(fr1 < fr0 - 1, '摩擦あり ' + fr1);
});

test('大規模でも NaN/Infinity が出ず、境界内に収まる(3000体 x 300step)', () => {
  const w = new PhysicsWorld({ bounds: { min: [-10, 0, -10], max: [10, 12, 10] } }); const r = rng(33);
  for (let i = 0; i < 3000; i++) w.addBody({ radius: 0.18 + r() * 0.1, position: [(r() - 0.5) * 18, r() * 10 + 1, (r() - 0.5) * 18], velocity: [(r() - 0.5) * 5, 0, (r() - 0.5) * 5] });
  for (let i = 0; i < 300; i++) w.step(1 / 60);
  let bad = 0; for (let i = 0; i < w.count; i++) { const p = w.getPosition(i); if (!p.every(Number.isFinite) || p[0] < -10 || p[0] > 10 || p[1] < 0 || p[1] > 12 || p[2] < -10 || p[2] > 10) bad++; }
  assert.equal(bad, 0); assert.equal(w.invalidBodies, 0);
});

test('固定時間刻み: 蓄積・substep上限・超過分の破棄', () => {
  const w = mk({ maxSubSteps: 4 }); w.addBody({ position: [0, 0, 0] });
  assert.equal(w.advance(0.05), 3); assert.ok(Math.abs(w.acc - (0.05 - 3 / 60)) < 1e-9);
  assert.equal(w.advance(0.01), 0);                        // 余りがほぼ 0 なので 1 ステップ未満
  assert.equal(w.advance(0.01), 1);                        // 蓄積 0.02s で 1 ステップ
  assert.equal(w.advance(2), 4); assert.equal(w.acc, 0); assert.ok(w.droppedTime > 1.5, '追いつけない分を捨てる'); assert.ok(w.stats.droppedTime > 1.5);
  assert.equal(w.advance(0), 0); assert.equal(w.advance(NaN), 0); assert.equal(w.advance(-1), 0);
  w.setOptions({ timeScale: 0.5 }); w.acc = 0; assert.equal(w.advance(2 / 60), 1);
});

test('時間予算(stepBudgetMs): 超えたら以降のサブステップを打ち切る', () => {
  const w = mk({ maxSubSteps: 50, stepBudgetMs: 0.0001 }); const r = rng(1); for (let i = 0; i < 3000; i++) w.addBody({ radius: 0.3, position: [(r() - 0.5) * 8, (r() - 0.5) * 8, (r() - 0.5) * 8] });
  assert.ok(w.advance(0.5) < 50); assert.equal(w.acc, 0);
});

test('候補ペア上限(maxCandidatePairs): 打ち切りと警告、通常時は打ち切らない', () => {
  const warns = []; const w = mk({ maxCandidatePairs: 100, onWarning: m => warns.push(m) }); const r = rng(1);
  for (let i = 0; i < 400; i++) w.addBody({ radius: 0.3, position: [(r() - 0.5) * 3, (r() - 0.5) * 3, (r() - 0.5) * 3] });
  w.step(1 / 60); assert.equal(w.stats.truncated, true); assert.equal(w.truncatedSteps, 1); assert.ok(warns.some(m => /maxCandidatePairs/.test(m)));
  w.setOptions({ maxCandidatePairs: 1e9 }); w.step(1 / 60); assert.equal(w.stats.truncated, false);
});

test('異常値: NaN 速度の物体は無効化され、他の物体は影響を受けない。入力検証', () => {
  const warns = []; const w = mk({ onWarning: m => warns.push(m) }); const a = w.addBody({ position: [0, 0, 0] }), b = w.addBody({ position: [5, 0, 0] });
  w.setVelocity(a, NaN, 0, 0); w.step(1 / 60);
  assert.equal(w.isAlive(a), false); assert.equal(w.isAlive(b), true); assert.equal(w.invalidBodies, 1); assert.ok(warns.length === 1); assert.ok(Number.isFinite(w.getPosition(b)[0]));
  assert.throws(() => w.addBody({ radius: -1 }), RangeError); assert.throws(() => w.addBody({ radius: 0 }), RangeError);
  assert.throws(() => w.addBody({ position: [NaN, 0, 0] }), RangeError); assert.throws(() => w.addBody({ shape: 'box', halfExtents: [0, 1, 1] }), RangeError);
  assert.throws(() => new PhysicsWorld({ bounds: { min: [0, 0, 0], max: [0, 1, 1] } }), RangeError); assert.throws(() => new PhysicsWorld({ fixedTimeStep: 0 }), RangeError);
  assert.throws(() => w.setOptions({ nonsense: 1 }), RangeError);
});

test('セル数上限(maxCells): セル幅を自動拡大して警告し、漏れは出ない', () => {
  const warns = []; const w = new PhysicsWorld({ bounds: { min: [-1000, -1000, -1000], max: [1000, 1000, 1000] }, walls: false, maxCells: 100000, cellSize: 1, onWarning: m => warns.push(m) });
  const r = rng(5); for (let i = 0; i < 200; i++) w.addBody({ radius: 0.4, position: [(r() - 0.5) * 100, (r() - 0.5) * 100, (r() - 0.5) * 100] });
  verifyBroadphase(w, 'maxCells'); assert.ok(w.stats.cells <= 100000); assert.ok(warns.length > 0);
});

test('接触コールバック(onContact)', () => {
  const hits = []; const w = mk({ gravity: [0, 0, 0], onContact: (i, j, nx, ny, nz, pen) => hits.push([i, j, nx, pen]) });
  const a = w.addBody({ radius: 0.5, position: [0, 0, 0] }), b = w.addBody({ radius: 0.5, position: [0.8, 0, 0] }); w.step(1 / 60);
  assert.equal(hits.length > 0, true); assert.equal(hits[0][0], a); assert.equal(hits[0][1], b); assert.ok(hits[0][2] > 0.99); assert.ok(Math.abs(hits[0][3] - 0.2) < 1e-5);
});

test('決定論: 同じ入力は同じ結果。JSON 保存→復元でも同一軌道', () => {
  const build = () => { const w = new PhysicsWorld({ bounds: { min: [-6, 0, -6], max: [6, 10, 6] } }); const r = rng(77); for (let i = 0; i < 400; i++) w.addBody({ radius: 0.25, position: [(r() - 0.5) * 10, r() * 8 + 1, (r() - 0.5) * 10], velocity: [(r() - 0.5) * 2, 0, (r() - 0.5) * 2] }); w.addBody({ shape: 'box', halfExtents: [2, 0.3, 2], position: [0, 3, 0], static: true }); return w; };
  const a = build(), b = build(); for (let i = 0; i < 120; i++) { a.step(1 / 60); b.step(1 / 60); }
  assert.deepEqual(Array.from(a.pos.subarray(0, a.count * 3)), Array.from(b.pos.subarray(0, b.count * 3)));
  const c = PhysicsWorld.fromJSON(JSON.parse(JSON.stringify(a.toJSON())));
  for (let i = 0; i < 60; i++) { a.step(1 / 60); c.step(1 / 60); }
  assert.deepEqual(Array.from(a.pos.subarray(0, a.count * 3)), Array.from(c.pos.subarray(0, c.count * 3)));
  assert.throws(() => PhysicsWorld.fromJSON({ format: 'x' }), /形式/);
});

test('レイキャスト(物理ワールド)', () => {
  const w = mk(); const s = w.addBody({ radius: 1, position: [0, 0, -10] }), b = w.addBody({ shape: 'box', halfExtents: [1, 1, 1], position: [0, 0, -20] });
  let h = w.raycast([0, 0, 0], [0, 0, -2]); assert.equal(h.index, s); assert.ok(Math.abs(h.distance - 9) < 1e-5); assert.ok(h.normal[2] > 0.99);
  w.removeBody(s); h = w.raycast([0, 0, 0], [0, 0, -1]); assert.equal(h.index, b); assert.ok(Math.abs(h.distance - 19) < 1e-5); assert.deepEqual(h.normal, [0, 0, 1]);
  assert.equal(w.raycast([0, 0, 0], [0, 1, 0]), null); assert.equal(w.raycast([0, 0, 0], [0, 0, -1], 5), null);
});

test('描画オブジェクトとの同期（ノード/インスタンス）', async () => {
  const { Node, InstancedMesh } = await import('../../src/node.js'); const { Geometry } = await import('../../src/geometry.js'); const { Material } = await import('../../src/material.js');
  const w = mk(); const n = new Node(); const a = w.addBody({ position: [1, 2, 3], node: n }); const im = new InstancedMesh(Geometry.box(), new Material(), { count: 3 });
  const b0 = w.addBody({ position: [4, 5, 6] }); w.addBody({ position: [7, 8, 9] }); w.bindInstanced(im, b0, 2, 1);
  w.syncTransforms(); assert.deepEqual(Array.from(n.position), [1, 2, 3]);
  assert.equal(im.matrices[1 * 16 + 12], 4); assert.equal(im.matrices[2 * 16 + 14], 9); assert.equal(im.matrices[0 * 16 + 12], 0);
  assert.equal(im.chunks[0].uploadDirty, true); void a;
});

test('ワーカーホスト: メッセージプロトコルが直接実行と同じ結果を返す', () => {
  const out = []; const host = createPhysicsHost((m, t) => out.push([m, t]));
  host.handle({ type: 'step', dt: 0.1 }); assert.equal(out.pop()[0].type, 'error');     // init 前
  const opts = { bounds: { min: [-5, 0, -5], max: [5, 10, 5] } };
  host.handle({ type: 'init', options: opts }); assert.equal(out.pop()[0].type, 'ready');
  const N = 50, r = rng(3), d = { pos: new Float32Array(N * 3), vel: new Float32Array(N * 3), ext: new Float32Array(N * 3), shape: new Uint8Array(N), invMass: new Float32Array(N), rest: new Float32Array(N), fric: new Float32Array(N) };
  for (let i = 0; i < N; i++) { d.pos.set([(r() - 0.5) * 8, r() * 8 + 1, (r() - 0.5) * 8], i * 3); d.ext.set([0.3, 0.3, 0.3], i * 3); d.invMass[i] = 1 / 0.1; d.rest[i] = 0.2; }
  host.handle({ type: 'addBodies', data: d, count: N, token: 9 }); const bm = out.pop()[0]; assert.equal(bm.type, 'bodies'); assert.equal(bm.token, 9); assert.equal(bm.ids.length, N);
  const direct = new PhysicsWorld(opts); for (let i = 0; i < N; i++) direct.addBody({ radius: 0.3, mass: 0.1, position: Array.from(d.pos.subarray(i * 3, i * 3 + 3)), restitution: 0.2, friction: 0 });
  for (let k = 0; k < 30; k++) { host.handle({ type: 'step', dt: 1 / 60 }); const [msg, tr] = out.pop(); assert.equal(msg.type, 'result'); assert.ok(tr[0] === msg.pos.buffer); direct.advance(1 / 60); }
  const res = host.world; assert.deepEqual(Array.from(res.pos.subarray(0, N * 3)), Array.from(direct.pos.subarray(0, N * 3)));
  host.handle({ type: 'call', method: 'setVelocity', args: [0, 1, 2, 3] }); assert.deepEqual(Array.from(res.getVelocity(0)), [1, 2, 3]);
  host.handle({ type: 'call', method: 'constructor', args: [] }); assert.equal(out.pop()[0].type, 'error');     // 許可リスト外
  host.handle({ type: 'bogus' }); assert.equal(out.pop()[0].type, 'error'); host.handle({ type: 'dispose' }); assert.equal(host.world, null);
});
void SHAPE_BOX;
