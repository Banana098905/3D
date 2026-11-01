import test from 'node:test';
import assert from 'node:assert/strict';
import { CollisionWorld, DynamicTree } from '../../src/collision/index.js';
import { HandleAllocator, HandlePool } from '../../src/handles.js';
import { rng } from '../../src/util.js';

const KINDS = ['brute', 'hash', 'tree'];
const pairKey = ([a, b]) => a * 4194304 + b;

/** ブロードフェーズが返すペア == 総当たりの AABB 重なりペア（漏れ・重複・静的どうし 0） */
function checkBroad(w, label) {
  w._ensureReady(); const A = w.aabb, got = new Map();
  w.bp.findPairs((i, j) => { const k = pairKey(i < j ? [i, j] : [j, i]); got.set(k, (got.get(k) || 0) + 1); });
  let dup = 0; for (const v of got.values()) if (v > 1) dup++; assert.equal(dup, 0, label + ': 重複ペア');
  const truth = new Set(), live = []; for (let i = 0; i < w.alloc.highWaterMark; i++) if (w.alloc.isIndexLive(i) && (w.flags[i] & 1) && w.type[i] !== 4) live.push(i);
  for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) {
    const i = live[a], j = live[b]; if ((w.flags[i] & 2) && (w.flags[j] & 2)) continue;
    const p = i * 6, q = j * 6; if (A[p] <= A[q + 3] && A[p + 3] >= A[q] && A[p + 1] <= A[q + 4] && A[p + 4] >= A[q + 1] && A[p + 2] <= A[q + 5] && A[p + 5] >= A[q + 2]) truth.add(pairKey([i, j]));
  }
  let missing = 0; for (const k of truth) if (!got.has(k)) missing++;
  assert.equal(missing, 0, label + ': 漏れたペア ' + missing); assert.equal(got.size, truth.size, label + ': 余分なペア');
  return truth.size;
}

const SCENES = {
  'ランダム球': (w, R) => { for (let i = 0; i < 600; i++) w.addSphere({ radius: 0.2 + R() * 0.2, position: [(R() - .5) * 20, (R() - .5) * 20, (R() - .5) * 20] }); },
  '密集': (w, R) => { for (let i = 0; i < 400; i++) w.addSphere({ radius: 0.3, position: [(R() - .5) * 3, (R() - .5) * 3, (R() - .5) * 3] }); },
  '大小混在+巨大': (w, R) => { for (let i = 0; i < 500; i++) w.addSphere({ radius: 0.1 + R() * 0.4, position: [(R() - .5) * 30, (R() - .5) * 30, (R() - .5) * 30] }); w.addAABB({ halfExtents: [20, 0.5, 20], position: [0, -5, 0], static: true }); w.addSphere({ radius: 8, position: [0, 0, 0] }); w.addOBB({ halfExtents: [12, 1, 1], position: [3, 2, 1], rotation: [0.2, 0.3, 0.1, 0.93] }); },
  '静的多数+動的': (w, R) => { for (let i = 0; i < 400; i++) w.addAABB({ halfExtents: [0.5, 0.5, 0.5], position: [(i % 20) - 10, -1, ((i / 20) | 0) - 10], static: true }); for (let i = 0; i < 200; i++) w.addCapsule({ radius: 0.3, halfLength: 0.4, position: [(R() - .5) * 20, R() * 3, (R() - .5) * 20], rotation: [R() - .5, R() - .5, R() - .5, 1] }); },
  'セル境界ぴったり': (w) => { for (let k = -10; k < 10; k++) for (let a = 0; a < 3; a++) { w.addSphere({ radius: 0.25, position: [k * 0.5, a * 0.5, 0] }); w.addSphere({ radius: 0.25, position: [k * 0.5 + 0.5, a * 0.5, 0] }); } },
  '極端に遠い座標': (w, R) => { for (let i = 0; i < 100; i++) w.addSphere({ radius: 0.5, position: [1e6 + R() * 3, -2e6 + R() * 3, 5e5 + R() * 3] }); for (let i = 0; i < 50; i++) w.addSphere({ radius: 0.5, position: [-1e5 * R(), 0, 0] }); },
  '負座標': (w, R) => { for (let i = 0; i < 300; i++) w.addSphere({ radius: 0.4, position: [-50 + R() * 10, -50 + R() * 10, -50 + R() * 10] }); }
};
for (const [name, build] of Object.entries(SCENES)) for (const kind of KINDS) {
  test(`ブロードフェーズ[${kind}] ${name}: 漏れ・重複・余分なし（移動/追加/削除/無効化の後も）`, () => {
    const R = rng(3), w = new CollisionWorld({ broadphase: kind, cellSize: kind === 'hash' && name === 'セル境界ぴったり' ? 0.5 : 0 }); build(w, R);
    const n0 = checkBroad(w, '初期'); assert.ok(n0 >= 0);
    const hs = []; for (let i = 0; i < w.alloc.highWaterMark; i++) { const h = w.alloc.handleAt(i); if (h && !(w.flags[i] & 2) && w.type[i] !== 4) hs.push(h); }
    for (let round = 0; round < 4; round++) {
      for (const h of hs) if (w.isValid(h) && R() < 0.5) { const p = w.getPosition(h); w.setPosition(h, p[0] + (R() - .5) * 2, p[1] + (R() - .5) * 2, p[2] + (R() - .5) * 2); }
      for (let k = 0; k < 20; k++) { const h = hs[(R() * hs.length) | 0]; if (w.isValid(h)) { if (R() < 0.4) w.remove(h); else w.setEnabled(h, R() < 0.5); } }
      for (let k = 0; k < 20; k++) hs.push(w.addSphere({ radius: 0.1 + R() * 2, position: [(R() - .5) * 20, (R() - .5) * 20, (R() - .5) * 20] }));
      checkBroad(w, '移動後' + round);
    }
  });
}
test('動的AABBツリー: 乱挿入・削除・移動後も構造が正しい', () => {
  const t = new DynamicTree(), R = rng(9), leaves = []; const box = () => { const x = R() * 100, y = R() * 100, z = R() * 100, s = R() * 3 + 0.1; return [x, y, z, x + s, y + s, z + s]; };
  for (let i = 0; i < 2000; i++) leaves.push(t.createLeaf(i, ...box()));
  assert.deepEqual(t.validate(), []);
  for (let i = 0; i < 1000; i++) { const k = (R() * leaves.length) | 0; t.moveLeaf(leaves[k], ...box()); }
  for (let i = 0; i < 800; i++) { const k = (R() * leaves.length) | 0; t.destroyLeaf(leaves[k]); leaves.splice(k, 1); }
  assert.deepEqual(t.validate(), []); assert.ok(t.height[t.root] < 40, '高さが対数的: ' + t.height[t.root]);
});

/* ---------------- 接触状態・イベント ---------------- */
const types = w => w.events.map(e => e.type);
for (const kind of KINDS) test(`[${kind}] 衝突イベント: start → stay → end、Trigger は別種別`, () => {
  const w = new CollisionWorld({ broadphase: kind }), a = w.addSphere({ radius: 1, userData: 'A' }), b = w.addSphere({ radius: 1, position: [5, 0, 0], userData: 'B' }), t = w.addAABB({ halfExtents: [1, 1, 1], position: [0, 10, 0], trigger: true, static: true });
  w.step(); assert.deepEqual(types(w), []);
  w.setPosition(b, 1.5, 0, 0); w.step(); assert.deepEqual(types(w), ['collisionstart']); const e = w.events[0]; assert.equal(e.a, a); assert.equal(e.b, b); assert.equal(e.userA, 'A'); assert.equal(e.userB, 'B'); assert.ok(e.nx > 0.99 && Math.abs(e.depth - 0.5) < 1e-9);
  w.step(); assert.deepEqual(types(w), ['collisionstay']);
  w.setPosition(b, 5, 0, 0); w.step(); assert.deepEqual(types(w), ['collisionend']);
  w.step(); assert.deepEqual(types(w), []);
  w.setPosition(a, 0, 10, 0); w.step(); assert.deepEqual(types(w), ['triggerenter']); w.step(); assert.deepEqual(types(w), ['triggerstay']);
  w.setPosition(a, 0, 20, 0); w.step(); assert.deepEqual(types(w), ['triggerexit']);
});
test('削除・無効化すると終了イベントが出る。ハンドルは無効になり、userData は終了イベントに残る', () => {
  const w = new CollisionWorld(), a = w.addSphere({ radius: 1, userData: 1 }), b = w.addSphere({ radius: 1, position: [1, 0, 0], userData: 2 });
  w.step(); assert.deepEqual(types(w), ['collisionstart']); w.remove(b); assert.equal(w.isValid(b), false); w.step();
  assert.deepEqual(types(w), ['collisionend']); assert.equal(w.events[0].userB, 2); assert.equal(w.contactPairs().length, 0);
  const c = w.addSphere({ radius: 1, position: [1, 0, 0], userData: 3 }); assert.notEqual(c, b, '再利用された添字でも別ハンドル'); w.step(); assert.deepEqual(types(w), ['collisionstart']); assert.equal(w.events[0].userB, 3);
  w.setEnabled(c, false); w.step(); assert.deepEqual(types(w), ['collisionend']); w.setEnabled(c, true); w.step(); assert.deepEqual(types(w), ['collisionstart']);
});
test('削除→同じ添字の再利用が同一ステップ内でも、古いペアは終了し新しいペアが開始する', () => {
  const w = new CollisionWorld(), a = w.addSphere({ radius: 1 }), b = w.addSphere({ radius: 1, position: [1, 0, 0] }); w.step();
  w.remove(b); const b2 = w.addSphere({ radius: 1, position: [1, 0, 0] }); w.step();
  assert.deepEqual(types(w).sort(), ['collisionend', 'collisionstart']); assert.equal(w.contactPairs().length, 1); assert.equal(w.events.find(e => e.type === 'collisionstart').b, b2);
});
test('Layer / Mask: 双方向で一致したときだけ衝突する', () => {
  const w = new CollisionWorld(); const P = w.addSphere({ radius: 1, layer: 0b001, mask: 0b110 }), E = w.addSphere({ radius: 1, layer: 0b010, mask: 0b001, position: [1, 0, 0] }), X = w.addSphere({ radius: 1, layer: 0b100, mask: 0b100, position: [0, 1, 0] });
  w.step(); const k = w.contactPairs().map(p => p.join()); assert.equal(k.length, 1, '1 組だけ'); assert.deepEqual(w.getTouching(P).sort(), [E]);
  w.setFilter(X, 0b100, 0b001); w.step(); assert.equal(w.contactPairs().length, 2, 'X.mask(0b001) が P.layer を含み、P.mask(0b110) が X.layer(0b100) を含むので P-X も衝突');
});
test('静的どうしは衝突しない / 平面との衝突 / 一括操作', () => {
  const w = new CollisionWorld(); w.addAABB({ static: true }); w.addAABB({ static: true, position: [0.5, 0, 0] }); w.step(); assert.equal(w.stats.contacts, 0);
  const p = w.addPlane({ normal: [0, 1, 0], offset: 0 }), hs = w.addMany([...Array(50)].map((_, i) => ({ type: 'sphere', radius: 0.5, position: [i * 3, 0.2, 10] }))); w.step(); assert.equal(w.stats.contacts, 50);
  assert.equal(w.removeMany(hs), 50); w.step(); assert.equal(w.stats.contacts, 0); assert.throws(() => w.addMany([{ type: 'sphere', radius: 1 }, { type: 'sphere', radius: -1 }])); assert.equal(w.count, 3, '失敗した一括登録は全部巻き戻す');
});
test('ワールドの接触 == 総当たりの接触（3 種のブロードフェーズ・移動を繰り返しても）', () => {
  for (const kind of KINDS) {
    const R = rng(77), w = new CollisionWorld({ broadphase: kind, checkDuplicates: true }); const ty = ['sphere', 'aabb', 'obb', 'capsule'];
    for (let i = 0; i < 300; i++) { const t = ty[i % 4]; w.add({ type: t, radius: 0.2 + R() * 0.3, halfExtents: [0.2 + R() * 0.3, 0.2 + R() * 0.3, 0.2 + R() * 0.3], halfLength: R() * 0.5, position: [(R() - .5) * 8, (R() - .5) * 8, (R() - .5) * 8], rotation: [R() - .5, R() - .5, R() - .5, 1], static: i % 7 === 0, layer: 1 << (i % 3), mask: i % 5 === 0 ? 0b011 : 0xffffffff }); }
    w.addPlane({ normal: [0, 1, 0], offset: -3.5 });
    for (let s = 0; s < 6; s++) {
      for (let i = 0; i < w.alloc.highWaterMark; i++) { const h = w.alloc.handleAt(i); if (h && !(w.flags[i] & 2) && w.type[i] !== 4) { const p = w.getPosition(h); w.setPosition(h, p[0] + (R() - .5), p[1] + (R() - .5), p[2] + (R() - .5)); } }
      w.step(); assert.equal(w.stats.duplicatePairs, 0);
      assert.deepEqual(w.contactPairs(), w.bruteForcePairs(), `${kind} step ${s}: 接触が総当たりと異なる`);
    }
  }
});
test('イベント順序と内容はブロードフェーズの種類に依らず同じ（決定性）', () => {
  const logs = KINDS.map(kind => {
    const R = rng(5), w = new CollisionWorld({ broadphase: kind }), log = []; for (let i = 0; i < 150; i++) w.addSphere({ radius: 0.4, position: [R() * 6, R() * 6, R() * 6] });
    for (let s = 0; s < 8; s++) { for (let i = 0; i < 150; i++) { const h = w.alloc.handleAt(i); const p = w.getPosition(h); w.setPosition(h, p[0] + (R() - .5) * 0.8, p[1] + (R() - .5) * 0.8, p[2] + (R() - .5) * 0.8); } w.step(); for (const e of w.events) if (e.type !== 'collisionstay') log.push(s + e.type + e.a + '-' + e.b + ':' + e.depth.toFixed(9)); }
    return log.join('|');
  });
  assert.equal(logs[0], logs[1]); assert.equal(logs[0], logs[2]); assert.ok(logs[0].length > 100);
});

/* ---------------- クエリ ---------------- */
for (const kind of KINDS) test(`[${kind}] raycast / queryAABB / queryRadius / sweepSphere が総当たりと一致`, () => {
  const R = rng(13), w = new CollisionWorld({ broadphase: kind }), ty = ['sphere', 'aabb', 'obb', 'capsule'];
  for (let i = 0; i < 300; i++) w.add({ type: ty[i % 4], radius: 0.3, halfExtents: [0.3, 0.4, 0.3], halfLength: 0.3, position: [(R() - .5) * 20, (R() - .5) * 20, (R() - .5) * 20], rotation: [R() - .5, R() - .5, R() - .5, 1], static: i % 3 === 0 });
  w.addPlane({ normal: [0, 1, 0], offset: -12 });
  const ref = new CollisionWorld({ broadphase: 'brute' }); for (let i = 0; i < w.alloc.highWaterMark; i++) { if (!w.alloc.isIndexLive(i)) continue; ref.add({ type: w.type[i], position: Array.from(w.pos.subarray(i * 3, i * 3 + 3)), rotation: Array.from(w.quat.subarray(i * 4, i * 4 + 4)), radius: w.par[i * 4], halfExtents: Array.from(w.par.subarray(i * 4, i * 4 + 3)), halfLength: w.par[i * 4 + 1], normal: Array.from(w.par.subarray(i * 4, i * 4 + 3)), offset: w.par[i * 4 + 3], static: !!(w.flags[i] & 2) }); }
  for (let k = 0; k < 150; k++) {
    const o = [(R() - .5) * 24, (R() - .5) * 24, (R() - .5) * 24], d = [R() - .5, R() - .5, R() - .5];
    const a = w.raycast(...o, ...d), b = ref.raycast(...o, ...d); assert.equal(!!a, !!b); if (a) { assert.ok(Math.abs(a.t - b.t) < 1e-9, `ray t ${a.t} vs ${b.t}`); }
    const c = w.queryRadius(o[0], o[1], o[2], 3).map(x => x.handle & 0), c2 = ref.queryRadius(o[0], o[1], o[2], 3); assert.equal(c.length, c2.length, 'queryRadius 件数');
    const dd = [(R() - .5) * 6, (R() - .5) * 6, (R() - .5) * 6], s1 = w.sweepSphere(o[0], o[1], o[2], 0.3, dd[0], dd[1], dd[2]), s2 = ref.sweepSphere(o[0], o[1], o[2], 0.3, dd[0], dd[1], dd[2]); assert.equal(!!s1, !!s2); if (s1) assert.ok(Math.abs(s1.toi - s2.toi) < 1e-9);
  }
  const all = w.raycastAll(-15, 0.123, 0.01, 1, 0, 0, 40), all2 = ref.raycastAll(-15, 0.123, 0.01, 1, 0, 0, 40); assert.deepEqual(all.map(h => +h.t.toFixed(9)), all2.map(h => +h.t.toFixed(9)));
});

/* ---------------- 連続衝突判定 ---------------- */
for (const kind of KINDS) test(`[${kind}] 連続衝突: 高速な小さい弾が薄い壁をすり抜けない（離散判定だけだと抜ける）`, () => {
  const run = continuous => {
    const w = new CollisionWorld({ broadphase: kind }); w.addAABB({ halfExtents: [0.05, 5, 5], position: [10, 0, 0], static: true });
    const bullet = w.addSphere({ radius: 0.05, position: [0, 0, 0], continuous }); let started = null;
    for (let s = 0; s < 10; s++) { w.setPosition(bullet, (s + 1) * 4, 0, 0); w.step(); for (const e of w.events) if (e.type === 'collisionstart' && !started) started = { step: s, toi: e.toi, e }; }
    return started;
  };
  assert.equal(run(false), null, '離散判定だけならすり抜ける（比較用）');
  const r = run(true); assert.ok(r, '連続判定なら検出する'); assert.equal(r.step, 2); assert.ok(r.toi > 0 && r.toi < 1);
  // TOI 位置 = 壁の手前面(9.95) から弾の半径 0.05 手前 → x = 9.9。区間は 8→12 なので toi = 0.475
  assert.ok(Math.abs(r.toi - 0.475) < 1e-6, 'toi=' + r.toi);
});
test('連続衝突: ccdClamp で弾が壁の手前に止まり、teleport はスイープしない', () => {
  const w = new CollisionWorld({ ccdClamp: true }); w.addAABB({ halfExtents: [0.05, 5, 5], position: [10, 0, 0], static: true }); const b = w.addSphere({ radius: 0.05, continuous: true });
  w.setPosition(b, 30, 0, 0); w.step(); const p = w.getPosition(b); assert.ok(Math.abs(p[0] - 9.9) < 1e-6, 'x=' + p[0]);
  const w2 = new CollisionWorld(); w2.addAABB({ halfExtents: [0.05, 5, 5], position: [10, 0, 0], static: true }); const b2 = w2.addSphere({ radius: 0.05, continuous: true }); w2.step(); w2.teleport(b2, 30, 0, 0); w2.step(); assert.equal(w2.stats.contacts, 0);
  assert.throws(() => w2.addAABB({ continuous: true }), /sphere/);
});
test('連続衝突: 球・カプセル・平面・回転した箱に対しても検出', () => {
  const shapes = [{ type: 'sphere', radius: 1 }, { type: 'capsule', radius: 0.3, halfLength: 2, rotation: [0.7071068, 0, 0, 0.7071068] }, { type: 'obb', halfExtents: [0.05, 3, 3], rotation: [0, 0.2588190, 0, 0.9659258] }];
  for (const sh of shapes) { const w = new CollisionWorld(); w.add(Object.assign({ position: [20, 0, 0], static: true }, sh)); const b = w.addSphere({ radius: 0.02, continuous: true }); w.setPosition(b, 40, 0, 0); w.step(); assert.equal(w.stats.contacts, 1, sh.type); }
  const w = new CollisionWorld(); w.addPlane({ normal: [0, 1, 0], offset: 0 }); const b = w.addSphere({ radius: 0.02, continuous: true, position: [0, 5, 0] }); w.step(); w.setPosition(b, 0, -50, 0); w.step(); assert.equal(w.stats.contacts, 1);
});

/* ---------------- Handle ---------------- */
test('HandleAllocator: 解放後の古いハンドルは再利用スロットでも無効', () => {
  const a = new HandleAllocator(2), h1 = a.alloc(); assert.ok(a.isValid(h1)); assert.ok(a.free(h1)); assert.equal(a.free(h1), false, '二重解放は false'); const h2 = a.alloc();
  assert.equal(h2 % 4194304, h1 % 4194304, '同じスロットを再利用'); assert.notEqual(h1, h2); assert.equal(a.isValid(h1), false); assert.equal(a.isValid(h2), true); assert.equal(a.isValid(0), false); assert.equal(a.isValid(-5), false); assert.equal(a.isValid(NaN), false);
  a.clear(); assert.equal(a.isValid(h2), false); const h3 = a.alloc(); assert.equal(a.isValid(h2), false); assert.equal(a.isValid(h3), true);
});
test('HandlePool: 大量の生成・削除でもスロット数はピーク同時数まで。参照は壊れない', () => {
  let made = 0; const pool = new HandlePool(() => ({ v: 0, id: ++made }), o => { o.v = 0; }), live = new Map(), R = rng(2);
  let peak = 0;
  for (let it = 0; it < 20000; it++) {
    if (live.size < 500 && (R() < 0.55 || live.size === 0)) { const h = pool.acquire(); pool.get(h).v = it; live.set(h, it); }
    else { const keys = Array.from(live.keys()).slice(0, 1); const h = keys[0]; assert.equal(pool.get(h).v, live.get(h)); assert.ok(pool.release(h)); live.delete(h); assert.equal(pool.get(h), null); assert.equal(pool.release(h), false); }
    peak = Math.max(peak, live.size);
  }
  assert.equal(pool.stats().slots, peak); assert.equal(made, peak, '生成したオブジェクト数 == ピーク同時数（再利用されている）'); assert.ok(pool.stats().reused > 1000);
  const hs = pool.acquireMany(100); assert.equal(pool.setActiveMany(hs.slice(0, 40), false), 40); let n = 0; pool.forEachActive(() => n++); assert.equal(n, live.size + 60); assert.equal(pool.releaseMany(hs), 100);
});
