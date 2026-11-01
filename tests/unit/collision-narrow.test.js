import test from 'node:test';
import assert from 'node:assert/strict';
import { CollisionWorld, pointDistance, Contact } from '../../src/collision/index.js';
import { gjkIntersect, support } from '../helpers/gjk.js';
import { makeRand } from '../helpers/shapes.js';

const TYPES = ['sphere', 'aabb', 'obb', 'capsule'];
const one = (desc) => { const w = new CollisionWorld({ broadphase: 'brute' }); return [w, w.add(desc)]; };
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} !≈ ${b}`);

test('球-球: 法線・深度・接触点', () => {
  const w = new CollisionWorld(), a = w.addSphere({ radius: 1 }), b = w.addSphere({ radius: 1, position: [1.5, 0, 0] });
  const c = w.testPair(a, b); assert.ok(c); near(c.nx, 1); near(c.depth, 0.5); near(c.px, 0.75);
  w.setPosition(b, 2, 0, 0); assert.equal(w.testPair(a, b), null, 'ちょうど接触は接触なし');
});
test('AABB-AABB / 球-AABB(内部) / 平面 の既知ケース', () => {
  const w = new CollisionWorld(), A = w.addAABB({ halfExtents: [1, 1, 1] }), B = w.addAABB({ halfExtents: [1, 1, 1], position: [1.5, 0.2, 0] });
  let c = w.testPair(A, B); near(c.nx, 1); near(c.depth, 0.5);
  const S = w.addSphere({ radius: 0.5, position: [0.9, 0, 0] }); c = w.testPair(A, S); near(c.nx, 1); near(c.depth, 0.6);
  const P = w.addPlane({ normal: [0, 1, 0], offset: 0 }), S2 = w.addSphere({ radius: 1, position: [0, 0.4, 0] });
  c = w.testPair(S2, P); near(c.ny, -1); near(c.depth, 0.6); // a=球 → b=平面 なので球→平面（下向き）
  c = w.testPair(P, S2); near(c.ny, 1);
});
test('a↔b を入れ替えると法線が逆・深度は同じ（全形状ペア）', () => {
  const { shape } = makeRand(7);
  for (const ta of TYPES) for (const tb of TYPES) for (let k = 0; k < 300; k++) {
    const A = shape(ta), B = shape(tb), w = new CollisionWorld(); const a = w.add(A.desc), b = w.add(B.desc);
    const c1 = w.testPair(a, b), c2 = w.testPair(b, a); assert.equal(!!c1, !!c2);
    if (c1) { near(c1.nx, -c2.nx, 1e-7); near(c1.ny, -c2.ny, 1e-7); near(c1.nz, -c2.nz, 1e-7); near(c1.depth, c2.depth, 1e-7); }
  }
});
test('全形状ペア: 乱数配置で GJK 基準実装と判定が一致し、深度×法線で必ず分離できる', () => {
  const { shape } = makeRand(42); let total = 0, hits = 0;
  for (const ta of TYPES) for (const tb of TYPES) for (let k = 0; k < 1500; k++) {
    const A = shape(ta), B = shape(tb), w = new CollisionWorld({ broadphase: 'brute' }); const a = w.add(A.desc), b = w.add(B.desc);
    const c = w.testPair(a, b), g = gjkIntersect(support(A.ref), support(B.ref)); total++;
    assert.equal(!!c, g, `判定不一致 ${ta}-${tb} ${JSON.stringify([A.desc, B.desc])}`);
    if (!c) continue; hits++;
    assert.ok(Math.abs(Math.hypot(c.nx, c.ny, c.nz) - 1) < 1e-9, '法線が単位長でない'); assert.ok(c.depth > 0);
    const bp = B.desc.position, s = c.depth * 1.001 + 1e-7, w2 = new CollisionWorld(); const a2 = w2.add(A.desc);
    const b2 = w2.add(Object.assign({}, B.desc, { position: [bp[0] + c.nx * s, bp[1] + c.ny * s, bp[2] + c.nz * s] }));
    assert.equal(w2.testPair(a2, b2), null, `深度×法線で分離できない ${ta}-${tb}`);
  }
  assert.ok(hits > 5000, '当たりのケースが十分にあること: ' + hits);
});
test('平面: 基準（支持関数の最小値）と一致', () => {
  const { shape, rr, R } = makeRand(5);
  for (const t of TYPES) for (let k = 0; k < 800; k++) {
    const S = shape(t), n = [R() - 0.5, R() - 0.5, R() - 0.5], l = Math.hypot(...n), nn = n.map(v => v / l), off = rr(-1, 1);
    const w = new CollisionWorld(), a = w.add(S.desc), p = w.addPlane({ normal: nn, offset: off }), c = w.testPair(a, p);
    const sup = support(S.ref)(nn.map(v => -v)), minDist = sup[0] * nn[0] + sup[1] * nn[1] + sup[2] * nn[2] - off; // 形状の最深点の符号付き距離
    assert.equal(!!c, minDist < 0, t); if (c) near(c.depth, -minDist, 1e-9);
  }
});

/* ---------------- レイ ---------------- */
test('レイキャスト: 一定刻みの行進（サンプリング）による基準と一致', () => {
  const { shape, rr, R } = makeRand(11); let hit = 0;
  for (const t of TYPES) for (let k = 0; k < 400; k++) {
    const S = shape(t, 1), w = new CollisionWorld({ broadphase: 'brute' }); const h = w.add(S.desc), idx = w.alloc.indexOf(h);
    const o = [rr(-5, 5), rr(-5, 5), rr(-5, 5)], c0 = S.desc.position, d = [c0[0] - o[0] + rr(-1.2, 1.2), c0[1] - o[1] + rr(-1.2, 1.2), c0[2] - o[2] + rr(-1.2, 1.2)], l = Math.hypot(...d), u = d.map(v => v / l);
    const r = w.raycast(o[0], o[1], o[2], u[0], u[1], u[2], 30);
    const step = 0.002; let tm = -1; const c = new Contact();
    for (let s = 0; s <= 30; s += step) if (pointDistance(w, idx, o[0] + u[0] * s, o[1] + u[1] * s, o[2] + u[2] * s, c) <= 0) { tm = s; break; }
    if (tm < 0 && r) { assert.ok(r.t - 30 < 1e-9); const dd = pointDistance(w, idx, r.px, r.py, r.pz, c); assert.ok(Math.abs(dd) < 1e-6, 'かすり命中のはずが表面上にない ' + dd); continue; } // 行進が見逃したかすり
    if (tm < 0) { assert.equal(r, null); continue; }
    assert.ok(r, `レイが当たらない ${t}`); hit++; assert.ok(r.t <= tm + 1e-9 && r.t >= tm - step - 1e-9, `t が基準とずれる ${t}: ${r.t} vs ${tm}`);
  }
  assert.ok(hit > 150);
});
test('レイ: 始点が内部なら t=0, inside=true', () => {
  const w = new CollisionWorld(); w.addOBB({ halfExtents: [1, 1, 1], rotation: [0, 0.38268343, 0, 0.92387953] });
  const r = w.raycast(0, 0, 0, 1, 0, 0); assert.equal(r.t, 0); assert.equal(r.inside, true);
});

/* ---------------- スイープ（連続衝突の基礎） ---------------- */
test('球スイープ: 細かく進める基準と TOI が一致し、見逃しがない', () => {
  const { shape, rr, R } = makeRand(21); let hit = 0, miss = 0;
  for (const t of TYPES) for (let k = 0; k < 300; k++) {
    const S = shape(t, 1), w = new CollisionWorld({ broadphase: 'brute' }); const h = w.add(S.desc), idx = w.alloc.indexOf(h), c = new Contact();
    const o = [rr(-2.5, 2.5), rr(-2.5, 2.5), rr(-2.5, 2.5)], d = [rr(-4, 4), rr(-4, 4), rr(-4, 4)], rad = rr(0.05, 0.4);
    const sw = w.sweepSphere(o[0], o[1], o[2], rad, d[0], d[1], d[2], 0xffffffff, true);
    const N = 4000; let tm = -1;
    for (let s = 0; s <= N; s++) { const f = s / N; if (pointDistance(w, idx, o[0] + d[0] * f, o[1] + d[1] * f, o[2] + d[2] * f, c) - rad <= 0) { tm = f; break; } }
    if (tm >= 0) { assert.ok(sw, `見逃し(すり抜け) ${t}`); hit++; assert.ok(sw.toi <= tm + 1e-6 && sw.toi >= tm - 2 / N - 1e-6, `toi ずれ ${t}: ${sw.toi} vs ${tm}`); }
    else if (sw) { // 行進が刻み間を飛ばした可能性: 実際に toi で表面に接しているか
      const f = sw.toi, dd = pointDistance(w, idx, o[0] + d[0] * f, o[1] + d[1] * f, o[2] + d[2] * f, c) - rad; assert.ok(Math.abs(dd) < 1e-4, `偽の命中 ${t} dd=${dd}`);
    } else miss++;
  }
  assert.ok(hit > 100 && miss > 100, `hit=${hit} miss=${miss}`);
});
