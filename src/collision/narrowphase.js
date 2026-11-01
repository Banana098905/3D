/*
 * ナローフェーズ: 2 つの形状の厳密な交差判定・接触情報、レイ判定、球スイープ(連続衝突)。
 *
 * 規約:
 *   - collide(S, a, b, c) は a, b を衝突体のインデックスとして判定する。接触法線 (c.nx,ny,nz) は「a から b へ向かう」単位ベクトル。
 *     b を +法線方向へ depth だけ動かす（または a を逆方向へ動かす）と離れる。
 *   - c.px,py,pz は接触点（重なり領域の代表点）。単一点（マニフォールドではない）。
 *   - 接触ちょうど（距離 = 0）は「接触なし」として扱う（< で判定）。
 *   - S は { type:Uint8Array, pos:Float64Array(3N), rotm:Float64Array(9N), par:Float64Array(4N) }。
 */
import { SHAPE_SPHERE, SHAPE_AABB, SHAPE_OBB, SHAPE_CAPSULE, SHAPE_PLANE } from './shapes.js';

export class Contact {
  constructor() { this.nx = 0; this.ny = 0; this.nz = 0; this.depth = 0; this.px = 0; this.py = 0; this.pz = 0; this.toi = -1; }
  set(o) { this.nx = o.nx; this.ny = o.ny; this.nz = o.nz; this.depth = o.depth; this.px = o.px; this.py = o.py; this.pz = o.pz; this.toi = o.toi; return this; }
}

const EPS = 1e-12;
/** 単位ベクトル a に垂直な単位ベクトルを (out.x,y,z) に。 */
function perp(ax, ay, az, out) {
  const bx = Math.abs(ax), by = Math.abs(ay), bz = Math.abs(az);
  let x, y, z; // 最小成分の軸との外積
  if (bx <= by && bx <= bz) { x = 0; y = -az; z = ay; } else if (by <= bz) { x = az; y = 0; z = -ax; } else { x = -ay; y = ax; z = 0; }
  const l = Math.hypot(x, y, z) || 1; out.x = x / l; out.y = y / l; out.z = z / l;
}
const _p = { x: 0, y: 0, z: 0 };

/* ---------------------------------------------------------------- 球 */
function sphereSphere(S, a, b, c) {
  const P = S.pos, Q = S.par, i = a * 3, j = b * 3, dx = P[j] - P[i], dy = P[j + 1] - P[i + 1], dz = P[j + 2] - P[i + 2];
  const ra = Q[a * 4], rb = Q[b * 4], rr = ra + rb, d2 = dx * dx + dy * dy + dz * dz;
  if (!(d2 < rr * rr)) return false;
  const d = Math.sqrt(d2);
  if (d > EPS) { c.nx = dx / d; c.ny = dy / d; c.nz = dz / d; } else { c.nx = 1; c.ny = 0; c.nz = 0; }
  c.depth = rr - d; const k = ra - c.depth * 0.5;
  c.px = P[i] + c.nx * k; c.py = P[i + 1] + c.ny * k; c.pz = P[i + 2] + c.nz * k; return true;
}

/** a=球, b=箱（AABB/OBB 共通。AABB の回転行列は単位行列）。 */
function sphereBox(S, a, b, c) {
  const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, j = b * 3, o = b * 9, q = b * 4, r = Q[a * 4];
  const cx = P[i] - P[j], cy = P[i + 1] - P[j + 1], cz = P[i + 2] - P[j + 2];
  const lx = cx * R[o] + cy * R[o + 1] + cz * R[o + 2], ly = cx * R[o + 3] + cy * R[o + 4] + cz * R[o + 5], lz = cx * R[o + 6] + cy * R[o + 7] + cz * R[o + 8];
  const hx = Q[q], hy = Q[q + 1], hz = Q[q + 2];
  const qx = lx < -hx ? -hx : lx > hx ? hx : lx, qy = ly < -hy ? -hy : ly > hy ? hy : ly, qz = lz < -hz ? -hz : lz > hz ? hz : lz;
  const dx = lx - qx, dy = ly - qy, dz = lz - qz, d2 = dx * dx + dy * dy + dz * dz;
  let nlx, nly, nlz, depth, sx, sy, sz; // nl*: 箱→球 の法線（箱ローカル）、s*: 箱表面の接触点（箱ローカル）
  if (d2 > 0) {
    if (!(d2 < r * r)) return false;
    const d = Math.sqrt(d2); nlx = dx / d; nly = dy / d; nlz = dz / d; depth = r - d; sx = qx; sy = qy; sz = qz;
  } else { // 球の中心が箱の内部: 最も近い面から押し出す
    const fx = hx - Math.abs(lx), fy = hy - Math.abs(ly), fz = hz - Math.abs(lz);
    nlx = nly = nlz = 0; sx = lx; sy = ly; sz = lz;
    if (fx <= fy && fx <= fz) { const s = lx < 0 ? -1 : 1; nlx = s; sx = s * hx; depth = r + fx; }
    else if (fy <= fz) { const s = ly < 0 ? -1 : 1; nly = s; sy = s * hy; depth = r + fy; }
    else { const s = lz < 0 ? -1 : 1; nlz = s; sz = s * hz; depth = r + fz; }
  }
  // 箱→球 を ワールドへ。a(球)→b(箱) は逆向き
  c.nx = -(nlx * R[o] + nly * R[o + 3] + nlz * R[o + 6]); c.ny = -(nlx * R[o + 1] + nly * R[o + 4] + nlz * R[o + 7]); c.nz = -(nlx * R[o + 2] + nly * R[o + 5] + nlz * R[o + 8]);
  c.depth = depth;
  c.px = P[j] + sx * R[o] + sy * R[o + 3] + sz * R[o + 6]; c.py = P[j + 1] + sx * R[o + 1] + sy * R[o + 4] + sz * R[o + 7]; c.pz = P[j + 2] + sx * R[o + 2] + sy * R[o + 5] + sz * R[o + 8];
  return true;
}

function sphereCapsule(S, a, b, c) {
  const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, j = b * 3, o = b * 9, rs = Q[a * 4], rc = Q[b * 4], h = Q[b * 4 + 1];
  const ux = R[o + 3], uy = R[o + 4], uz = R[o + 5], dx0 = P[i] - P[j], dy0 = P[i + 1] - P[j + 1], dz0 = P[i + 2] - P[j + 2];
  let t = dx0 * ux + dy0 * uy + dz0 * uz; t = t < -h ? -h : t > h ? h : t;
  const qx = P[j] + ux * t, qy = P[j + 1] + uy * t, qz = P[j + 2] + uz * t;
  const dx = P[i] - qx, dy = P[i + 1] - qy, dz = P[i + 2] - qz, rr = rs + rc, d2 = dx * dx + dy * dy + dz * dz;
  if (!(d2 < rr * rr)) return false;
  const d = Math.sqrt(d2); let nx, ny, nz; // カプセル→球
  if (d > EPS) { nx = dx / d; ny = dy / d; nz = dz / d; } else { perp(ux, uy, uz, _p); nx = _p.x; ny = _p.y; nz = _p.z; }
  c.depth = rr - d; c.nx = -nx; c.ny = -ny; c.nz = -nz;
  const k = rc - c.depth * 0.5; c.px = qx + nx * k; c.py = qy + ny * k; c.pz = qz + nz * k; return true;
}

function spherePlane(S, a, b, c) {
  const P = S.pos, Q = S.par, i = a * 3, q = b * 4, r = Q[a * 4];
  const nx = Q[q], ny = Q[q + 1], nz = Q[q + 2], dist = nx * P[i] + ny * P[i + 1] + nz * P[i + 2] - Q[q + 3];
  if (!(dist < r)) return false;
  c.nx = -nx; c.ny = -ny; c.nz = -nz; c.depth = r - dist; c.px = P[i] - nx * dist; c.py = P[i + 1] - ny * dist; c.pz = P[i + 2] - nz * dist; return true;
}

/* ---------------------------------------------------------------- 箱 */
function aabbAabb(S, a, b, c) {
  const P = S.pos, Q = S.par, i = a * 3, j = b * 3, qa = a * 4, qb = b * 4;
  const dx = P[j] - P[i], dy = P[j + 1] - P[i + 1], dz = P[j + 2] - P[i + 2];
  const ox = Q[qa] + Q[qb] - Math.abs(dx); if (!(ox > 0)) return false;
  const oy = Q[qa + 1] + Q[qb + 1] - Math.abs(dy); if (!(oy > 0)) return false;
  const oz = Q[qa + 2] + Q[qb + 2] - Math.abs(dz); if (!(oz > 0)) return false;
  c.nx = c.ny = c.nz = 0;
  if (ox <= oy && ox <= oz) { c.nx = dx < 0 ? -1 : 1; c.depth = ox; } else if (oy <= oz) { c.ny = dy < 0 ? -1 : 1; c.depth = oy; } else { c.nz = dz < 0 ? -1 : 1; c.depth = oz; }
  // 重なり領域の中心
  const x0 = Math.max(P[i] - Q[qa], P[j] - Q[qb]), x1 = Math.min(P[i] + Q[qa], P[j] + Q[qb]);
  const y0 = Math.max(P[i + 1] - Q[qa + 1], P[j + 1] - Q[qb + 1]), y1 = Math.min(P[i + 1] + Q[qa + 1], P[j + 1] + Q[qb + 1]);
  const z0 = Math.max(P[i + 2] - Q[qa + 2], P[j + 2] - Q[qb + 2]), z1 = Math.min(P[i + 2] + Q[qa + 2], P[j + 2] + Q[qb + 2]);
  c.px = (x0 + x1) / 2; c.py = (y0 + y1) / 2; c.pz = (z0 + z1) / 2; return true;
}

const _R = new Float64Array(9), _AR = new Float64Array(9);
/** OBB-OBB: 分離軸判定（15 軸）。AABB も回転行列が単位行列の OBB として扱える。 */
function boxBox(S, a, b, c) {
  if (S.type[a] === SHAPE_AABB && S.type[b] === SHAPE_AABB) return aabbAabb(S, a, b, c);
  const P = S.pos, Q = S.par, M = S.rotm, i = a * 3, j = b * 3, oa = a * 9, ob = b * 9, qa = a * 4, qb = b * 4;
  const ea0 = Q[qa], ea1 = Q[qa + 1], ea2 = Q[qa + 2], eb0 = Q[qb], eb1 = Q[qb + 1], eb2 = Q[qb + 2];
  const tx = P[j] - P[i], ty = P[j + 1] - P[i + 1], tz = P[j + 2] - P[i + 2];
  // R[i][j] = Ua_i · Ub_j
  for (let m = 0; m < 3; m++) for (let n = 0; n < 3; n++) { const v = M[oa + m * 3] * M[ob + n * 3] + M[oa + m * 3 + 1] * M[ob + n * 3 + 1] + M[oa + m * 3 + 2] * M[ob + n * 3 + 2]; _R[m * 3 + n] = v; _AR[m * 3 + n] = Math.abs(v) + 1e-9; }
  const t0 = tx * M[oa] + ty * M[oa + 1] + tz * M[oa + 2], t1 = tx * M[oa + 3] + ty * M[oa + 4] + tz * M[oa + 5], t2 = tx * M[oa + 6] + ty * M[oa + 7] + tz * M[oa + 8];
  const ea = [ea0, ea1, ea2], eb = [eb0, eb1, eb2], t = [t0, t1, t2];
  let facePen = Infinity, faceAxis = -1, faceSign = 1, edgePen = Infinity, edgeI = -1, edgeJ = -1, edgeSign = 1;
  // A の面軸
  for (let m = 0; m < 3; m++) {
    const ra = ea[m], rb = eb0 * _AR[m * 3] + eb1 * _AR[m * 3 + 1] + eb2 * _AR[m * 3 + 2], d = Math.abs(t[m]), pen = ra + rb - d;
    if (!(pen > 0)) return false; if (pen < facePen) { facePen = pen; faceAxis = m; faceSign = t[m] < 0 ? -1 : 1; }
  }
  // B の面軸
  for (let n = 0; n < 3; n++) {
    const ra = ea0 * _AR[n] + ea1 * _AR[3 + n] + ea2 * _AR[6 + n], rb = eb[n], proj = t0 * _R[n] + t1 * _R[3 + n] + t2 * _R[6 + n], pen = ra + rb - Math.abs(proj);
    if (!(pen > 0)) return false; if (pen < facePen) { facePen = pen; faceAxis = 3 + n; faceSign = proj < 0 ? -1 : 1; }
  }
  // 辺×辺 軸（ほぼ平行な辺は除外）
  for (let m = 0; m < 3; m++) for (let n = 0; n < 3; n++) {
    const m1 = (m + 1) % 3, m2 = (m + 2) % 3, n1 = (n + 1) % 3, n2 = (n + 2) % 3, r = _R[m * 3 + n];
    const len2 = 1 - r * r; if (len2 < 1e-6) continue; const len = Math.sqrt(len2);
    const ra = ea[m1] * _AR[m2 * 3 + n] + ea[m2] * _AR[m1 * 3 + n], rb = eb[n1] * _AR[m * 3 + n2] + eb[n2] * _AR[m * 3 + n1];
    const proj = t[m2] * _R[m1 * 3 + n] - t[m1] * _R[m2 * 3 + n], pen = (ra + rb - Math.abs(proj)) / len;
    if (!(pen > 0)) return false; if (pen < edgePen) { edgePen = pen; edgeI = m; edgeJ = n; edgeSign = proj < 0 ? -1 : 1; }
  }
  let nx, ny, nz, depth;
  if (edgeI >= 0 && edgePen < facePen * 0.95 - 1e-9) { // 辺どうしの接触が明らかに浅い場合のみ採用（面を優先して安定させる）
    const ax = M[oa + edgeI * 3], ay = M[oa + edgeI * 3 + 1], az = M[oa + edgeI * 3 + 2], bx = M[ob + edgeJ * 3], by = M[ob + edgeJ * 3 + 1], bz = M[ob + edgeJ * 3 + 2];
    nx = ay * bz - az * by; ny = az * bx - ax * bz; nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    // 向きを a→b にそろえる（t·n ≥ 0）
    if (nx * tx + ny * ty + nz * tz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    depth = edgePen;
  } else {
    const m = faceAxis < 3 ? oa + faceAxis * 3 : ob + (faceAxis - 3) * 3;
    nx = M[m] * faceSign; ny = M[m + 1] * faceSign; nz = M[m + 2] * faceSign; depth = facePen;
  }
  // 接触点: A の +n 側の支持点と B の −n 側の支持点の中点
  let sax = P[i], say = P[i + 1], saz = P[i + 2], sbx = P[j], sby = P[j + 1], sbz = P[j + 2];
  for (let m = 0; m < 3; m++) {
    const dA = nx * M[oa + m * 3] + ny * M[oa + m * 3 + 1] + nz * M[oa + m * 3 + 2], sA = (dA < 0 ? -1 : 1) * ea[m];
    sax += sA * M[oa + m * 3]; say += sA * M[oa + m * 3 + 1]; saz += sA * M[oa + m * 3 + 2];
    const dB = nx * M[ob + m * 3] + ny * M[ob + m * 3 + 1] + nz * M[ob + m * 3 + 2], sB = (dB < 0 ? -1 : 1) * eb[m];
    sbx -= sB * M[ob + m * 3]; sby -= sB * M[ob + m * 3 + 1]; sbz -= sB * M[ob + m * 3 + 2];
  }
  c.nx = nx; c.ny = ny; c.nz = nz; c.depth = depth; c.px = (sax + sbx) / 2; c.py = (say + sby) / 2; c.pz = (saz + sbz) / 2; return true;
}

/** 箱ローカル座標の点 (lx,ly,lz) から箱 (±h) までの距離² 。最近点を _q に。 */
const _q = { x: 0, y: 0, z: 0 };
function boxDist2(lx, ly, lz, hx, hy, hz) {
  const qx = lx < -hx ? -hx : lx > hx ? hx : lx, qy = ly < -hy ? -hy : ly > hy ? hy : ly, qz = lz < -hz ? -hz : lz > hz ? hz : lz;
  _q.x = qx; _q.y = qy; _q.z = qz; const dx = lx - qx, dy = ly - qy, dz = lz - qz; return dx * dx + dy * dy + dz * dz;
}

/** a=箱, b=カプセル。法線は箱→カプセル。 */
function boxCapsule(S, a, b, c) {
  const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, j = b * 3, oa = a * 9, ob = b * 9, qa = a * 4, qb = b * 4;
  const hx = Q[qa], hy = Q[qa + 1], hz = Q[qa + 2], rc = Q[qb], hl = Q[qb + 1];
  const ux = R[ob + 3], uy = R[ob + 4], uz = R[ob + 5];
  // 線分端点を箱ローカルへ
  const toL = (wx, wy, wz, k) => { const dx = wx - P[i], dy = wy - P[i + 1], dz = wz - P[i + 2]; return dx * R[oa + k * 3] + dy * R[oa + k * 3 + 1] + dz * R[oa + k * 3 + 2]; };
  const p0x = P[j] - ux * hl, p0y = P[j + 1] - uy * hl, p0z = P[j + 2] - uz * hl, p1x = P[j] + ux * hl, p1y = P[j + 1] + uy * hl, p1z = P[j + 2] + uz * hl;
  const l0x = toL(p0x, p0y, p0z, 0), l0y = toL(p0x, p0y, p0z, 1), l0z = toL(p0x, p0y, p0z, 2);
  const dX = toL(p1x, p1y, p1z, 0) - l0x, dY = toL(p1x, p1y, p1z, 1) - l0y, dZ = toL(p1x, p1y, p1z, 2) - l0z;
  // 1) 線分が箱を貫く/内部にある場合: スラブ法でクリップ
  let s0 = 0, s1 = 1, hit = true;
  const slab = (l, d, h) => {
    if (Math.abs(d) < 1e-14) { if (Math.abs(l) > h) hit = false; return; }
    let ta = (-h - l) / d, tb = (h - l) / d; if (ta > tb) { const x = ta; ta = tb; tb = x; }
    if (ta > s0) s0 = ta; if (tb < s1) s1 = tb; if (s0 > s1) hit = false;
  };
  slab(l0x, dX, hx); if (hit) slab(l0y, dY, hy); if (hit) slab(l0z, dZ, hz);
  let nlx, nly, nlz, depth, sx, sy, sz; // 箱→カプセル法線（ローカル）、箱表面の接触点（ローカル）
  if (hit) {
    // 線分が箱と交差: 6 つの面方向それぞれについて「カプセル全体が面の外へ出るのに必要な移動量」を求め、最小のものを採用（確実に分離できる方向）
    const lo = [l0x, l0y, l0z], dd = [dX, dY, dZ], hh = [hx, hy, hz];
    let best = Infinity, bk = 0, bs = 1, ex = 0;
    for (let k = 0; k < 3; k++) {
      const e0 = lo[k], e1 = lo[k] + dd[k], mn = e0 < e1 ? e0 : e1, mx = e0 < e1 ? e1 : e0;
      const up = hh[k] + rc - mn, dn = mx + rc + hh[k]; // +k 方向へ押し出す量 / -k 方向へ押し出す量
      if (up < best) { best = up; bk = k; bs = 1; ex = mn; }
      if (dn < best) { best = dn; bk = k; bs = -1; ex = mx; }
    }
    nlx = nly = nlz = 0; depth = best;
    // 箱表面側の接触点: 押し出し方向に最も深い線分上の点を、その面へ射影
    const tEx = Math.abs(dd[bk]) < 1e-14 ? 0.5 : (ex - lo[bk]) / dd[bk];
    sx = l0x + dX * tEx; sy = l0y + dY * tEx; sz = l0z + dZ * tEx;
    if (bk === 0) { nlx = bs; sx = bs * hx; } else if (bk === 1) { nly = bs; sy = bs * hy; } else { nlz = bs; sz = bs * hz; }
  } else {
    // 2) 線分上の点から箱までの距離² は t について凸 → 黄金分割法で最小点を求める
    let lo = 0, hi = 1;
    for (let it = 0; it < 56; it++) {
      const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
      const f1 = boxDist2(l0x + dX * m1, l0y + dY * m1, l0z + dZ * m1, hx, hy, hz), f2 = boxDist2(l0x + dX * m2, l0y + dY * m2, l0z + dZ * m2, hx, hy, hz);
      if (f1 < f2) hi = m2; else lo = m1;
    }
    const tb = (lo + hi) / 2; let best = tb, bf = boxDist2(l0x + dX * tb, l0y + dY * tb, l0z + dZ * tb, hx, hy, hz);
    for (const e of [0, 1]) { const f = boxDist2(l0x + dX * e, l0y + dY * e, l0z + dZ * e, hx, hy, hz); if (f < bf) { bf = f; best = e; } } // 端点も確認
    const f = boxDist2(l0x + dX * best, l0y + dY * best, l0z + dZ * best, hx, hy, hz);
    if (!(f < rc * rc)) return false;
    const d = Math.sqrt(f); sx = _q.x; sy = _q.y; sz = _q.z;
    nlx = (l0x + dX * best - sx) / d; nly = (l0y + dY * best - sy) / d; nlz = (l0z + dZ * best - sz) / d; depth = rc - d;
  }
  c.nx = nlx * R[oa] + nly * R[oa + 3] + nlz * R[oa + 6]; c.ny = nlx * R[oa + 1] + nly * R[oa + 4] + nlz * R[oa + 7]; c.nz = nlx * R[oa + 2] + nly * R[oa + 5] + nlz * R[oa + 8];
  c.depth = depth;
  c.px = P[i] + sx * R[oa] + sy * R[oa + 3] + sz * R[oa + 6]; c.py = P[i + 1] + sx * R[oa + 1] + sy * R[oa + 4] + sz * R[oa + 7]; c.pz = P[i + 2] + sx * R[oa + 2] + sy * R[oa + 5] + sz * R[oa + 8];
  return true;
}

/** a=箱, b=平面。 */
function boxPlane(S, a, b, c) {
  const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, o = a * 9, q = a * 4, pq = b * 4;
  const nx = Q[pq], ny = Q[pq + 1], nz = Q[pq + 2];
  let dist = nx * P[i] + ny * P[i + 1] + nz * P[i + 2] - Q[pq + 3], vx = P[i], vy = P[i + 1], vz = P[i + 2];
  for (let m = 0; m < 3; m++) {
    const dn = nx * R[o + m * 3] + ny * R[o + m * 3 + 1] + nz * R[o + m * 3 + 2], h = Q[q + m], s = dn < 0 ? -1 : 1;
    dist -= Math.abs(dn) * h; vx -= s * h * R[o + m * 3]; vy -= s * h * R[o + m * 3 + 1]; vz -= s * h * R[o + m * 3 + 2];
  }
  if (!(dist < 0)) return false;
  c.nx = -nx; c.ny = -ny; c.nz = -nz; c.depth = -dist; c.px = vx; c.py = vy; c.pz = vz; return true;
}

/* ---------------------------------------------------------------- カプセル */
const _cs = { s: 0, t: 0 };
/** 線分 p1-q1 と p2-q2 の最近点パラメータ (Ericson)。結果は _cs.s, _cs.t。 */
function closestSegSeg(p1x, p1y, p1z, q1x, q1y, q1z, p2x, p2y, p2z, q2x, q2y, q2z) {
  const d1x = q1x - p1x, d1y = q1y - p1y, d1z = q1z - p1z, d2x = q2x - p2x, d2y = q2y - p2y, d2z = q2z - p2z, rx = p1x - p2x, ry = p1y - p2y, rz = p1z - p2z;
  const a = d1x * d1x + d1y * d1y + d1z * d1z, e = d2x * d2x + d2y * d2y + d2z * d2z, f = d2x * rx + d2y * ry + d2z * rz;
  const cl = v => v < 0 ? 0 : v > 1 ? 1 : v; let s, t;
  if (a <= EPS && e <= EPS) { s = 0; t = 0; }
  else if (a <= EPS) { s = 0; t = cl(f / e); }
  else {
    const cc = d1x * rx + d1y * ry + d1z * rz;
    if (e <= EPS) { t = 0; s = cl(-cc / a); }
    else {
      const b = d1x * d2x + d1y * d2y + d1z * d2z, denom = a * e - b * b;
      s = denom > 1e-14 * a * e ? cl((b * f - cc * e) / denom) : 0; t = (b * s + f) / e;
      if (t < 0) { t = 0; s = cl(-cc / a); } else if (t > 1) { t = 1; s = cl((b - cc) / a); }
    }
  }
  _cs.s = s; _cs.t = t;
}
function capsuleCapsule(S, a, b, c) {
  const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, j = b * 3, oa = a * 9, ob = b * 9, ra = Q[a * 4], rb = Q[b * 4], ha = Q[a * 4 + 1], hb = Q[b * 4 + 1];
  const aux = R[oa + 3], auy = R[oa + 4], auz = R[oa + 5], bux = R[ob + 3], buy = R[ob + 4], buz = R[ob + 5];
  closestSegSeg(P[i] - aux * ha, P[i + 1] - auy * ha, P[i + 2] - auz * ha, P[i] + aux * ha, P[i + 1] + auy * ha, P[i + 2] + auz * ha,
    P[j] - bux * hb, P[j + 1] - buy * hb, P[j + 2] - buz * hb, P[j] + bux * hb, P[j + 1] + buy * hb, P[j + 2] + buz * hb);
  const sa = (_cs.s * 2 - 1) * ha, sb = (_cs.t * 2 - 1) * hb;
  const c1x = P[i] + aux * sa, c1y = P[i + 1] + auy * sa, c1z = P[i + 2] + auz * sa, c2x = P[j] + bux * sb, c2y = P[j + 1] + buy * sb, c2z = P[j + 2] + buz * sb;
  const dx = c2x - c1x, dy = c2y - c1y, dz = c2z - c1z, rr = ra + rb, d2 = dx * dx + dy * dy + dz * dz;
  if (!(d2 < rr * rr)) return false;
  const d = Math.sqrt(d2);
  if (d > EPS) { c.nx = dx / d; c.ny = dy / d; c.nz = dz / d; }
  else { // 軸が交差・重なる場合: 軸の外積、平行なら任意の垂直方向
    let nx = auy * buz - auz * buy, ny = auz * bux - aux * buz, nz = aux * buy - auy * bux; const l = Math.hypot(nx, ny, nz);
    if (l > 1e-9) { c.nx = nx / l; c.ny = ny / l; c.nz = nz / l; } else { perp(aux, auy, auz, _p); c.nx = _p.x; c.ny = _p.y; c.nz = _p.z; }
  }
  c.depth = rr - d; const k = ra - c.depth * 0.5; c.px = c1x + c.nx * k; c.py = c1y + c.ny * k; c.pz = c1z + c.nz * k; return true;
}
function capsulePlane(S, a, b, c) {
  const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, o = a * 9, pq = b * 4, rc = Q[a * 4], h = Q[a * 4 + 1];
  const nx = Q[pq], ny = Q[pq + 1], nz = Q[pq + 2], ux = R[o + 3], uy = R[o + 4], uz = R[o + 5];
  const dc = nx * P[i] + ny * P[i + 1] + nz * P[i + 2] - Q[pq + 3], da = (nx * ux + ny * uy + nz * uz) * h;
  const s = da > 0 ? -1 : 1, m = dc - Math.abs(da); // 端点のうち平面に近い方
  if (!(m < rc)) return false;
  c.nx = -nx; c.ny = -ny; c.nz = -nz; c.depth = rc - m;
  const ex = P[i] + s * ux * h, ey = P[i + 1] + s * uy * h, ez = P[i + 2] + s * uz * h; c.px = ex - nx * m; c.py = ey - ny * m; c.pz = ez - nz * m; return true;
}

const none = () => false;
const DISPATCH = [
  /* 球     */ [sphereSphere, sphereBox, sphereBox, sphereCapsule, spherePlane],
  /* AABB   */ [null, boxBox, boxBox, boxCapsule, boxPlane],
  /* OBB    */ [null, null, boxBox, boxCapsule, boxPlane],
  /* カプセル */ [null, null, null, capsuleCapsule, capsulePlane],
  /* 平面   */ [null, null, null, null, none]
];
/** 2 つの衝突体を判定。接触があれば true を返し c を埋める（法線は a→b）。 */
export function collide(S, a, b, c) {
  const ta = S.type[a], tb = S.type[b];
  if (ta <= tb) return DISPATCH[ta][tb](S, a, b, c);
  if (!DISPATCH[tb][ta](S, b, a, c)) return false;
  c.nx = -c.nx; c.ny = -c.ny; c.nz = -c.nz; return true;
}

/* ---------------------------------------------------------------- 点と形状の符号付き距離（スイープ・近傍検索用） */
/**
 * 点 (x,y,z) から形状 i の表面までの符号付き距離（外側が正、内部は負）。
 * 表面上の最近点を c.px.. に、形状→点 の単位法線を c.nx.. に書く。
 */
export function pointDistance(S, i, x, y, z, c) {
  const P = S.pos, Q = S.par, R = S.rotm, j = i * 3, o = i * 9, q = i * 4;
  switch (S.type[i]) {
    case SHAPE_SPHERE: {
      const dx = x - P[j], dy = y - P[j + 1], dz = z - P[j + 2], d = Math.hypot(dx, dy, dz), r = Q[q];
      if (d > EPS) { c.nx = dx / d; c.ny = dy / d; c.nz = dz / d; } else { c.nx = 0; c.ny = 1; c.nz = 0; }
      c.px = P[j] + c.nx * r; c.py = P[j + 1] + c.ny * r; c.pz = P[j + 2] + c.nz * r; return d - r;
    }
    case SHAPE_AABB: case SHAPE_OBB: {
      const dx = x - P[j], dy = y - P[j + 1], dz = z - P[j + 2], hx = Q[q], hy = Q[q + 1], hz = Q[q + 2];
      const lx = dx * R[o] + dy * R[o + 1] + dz * R[o + 2], ly = dx * R[o + 3] + dy * R[o + 4] + dz * R[o + 5], lz = dx * R[o + 6] + dy * R[o + 7] + dz * R[o + 8];
      const d2 = boxDist2(lx, ly, lz, hx, hy, hz); let nlx, nly, nlz, dist, sx = _q.x, sy = _q.y, sz = _q.z;
      if (d2 > 0) { dist = Math.sqrt(d2); nlx = (lx - sx) / dist; nly = (ly - sy) / dist; nlz = (lz - sz) / dist; }
      else {
        const fx = hx - Math.abs(lx), fy = hy - Math.abs(ly), fz = hz - Math.abs(lz); nlx = nly = nlz = 0; sx = lx; sy = ly; sz = lz;
        if (fx <= fy && fx <= fz) { const s = lx < 0 ? -1 : 1; nlx = s; sx = s * hx; dist = -fx; } else if (fy <= fz) { const s = ly < 0 ? -1 : 1; nly = s; sy = s * hy; dist = -fy; } else { const s = lz < 0 ? -1 : 1; nlz = s; sz = s * hz; dist = -fz; }
      }
      c.nx = nlx * R[o] + nly * R[o + 3] + nlz * R[o + 6]; c.ny = nlx * R[o + 1] + nly * R[o + 4] + nlz * R[o + 7]; c.nz = nlx * R[o + 2] + nly * R[o + 5] + nlz * R[o + 8];
      c.px = P[j] + sx * R[o] + sy * R[o + 3] + sz * R[o + 6]; c.py = P[j + 1] + sx * R[o + 1] + sy * R[o + 4] + sz * R[o + 7]; c.pz = P[j + 2] + sx * R[o + 2] + sy * R[o + 5] + sz * R[o + 8];
      return dist;
    }
    case SHAPE_CAPSULE: {
      const ux = R[o + 3], uy = R[o + 4], uz = R[o + 5], h = Q[q + 1], r = Q[q], dx0 = x - P[j], dy0 = y - P[j + 1], dz0 = z - P[j + 2];
      let t = dx0 * ux + dy0 * uy + dz0 * uz; t = t < -h ? -h : t > h ? h : t;
      const cx = P[j] + ux * t, cy = P[j + 1] + uy * t, cz = P[j + 2] + uz * t, dx = x - cx, dy = y - cy, dz = z - cz, d = Math.hypot(dx, dy, dz);
      if (d > EPS) { c.nx = dx / d; c.ny = dy / d; c.nz = dz / d; } else { perp(ux, uy, uz, _p); c.nx = _p.x; c.ny = _p.y; c.nz = _p.z; }
      c.px = cx + c.nx * r; c.py = cy + c.ny * r; c.pz = cz + c.nz * r; return d - r;
    }
    default: { // 平面
      const nx = Q[q], ny = Q[q + 1], nz = Q[q + 2], d = nx * x + ny * y + nz * z - Q[q + 3];
      c.nx = nx; c.ny = ny; c.nz = nz; c.px = x - nx * d; c.py = y - ny * d; c.pz = z - nz * d; return d;
    }
  }
}

/* ---------------------------------------------------------------- レイ */
export class RayHit {
  constructor() { this.t = 0; this.nx = 0; this.ny = 0; this.nz = 0; this.inside = false; }
}
/**
 * レイ (o + t·d, d は単位ベクトル) と形状 i の交差。0 ≤ t ≤ tmax のとき最初の交点を h に書いて true。
 * レイの始点が形状内部なら t=0, inside=true, 法線は -d。
 * inflate > 0 を与えると形状を球で膨らませたもの（球スイープ用の Minkowski 和）に対して判定する（球・カプセル・平面のみ厳密）。
 */
export function rayShape(S, i, ox, oy, oz, dx, dy, dz, tmax, h, inflate = 0) {
  const P = S.pos, Q = S.par, R = S.rotm, j = i * 3, o = i * 9, q = i * 4;
  h.inside = false;
  switch (S.type[i]) {
    case SHAPE_SPHERE: return raySphere(P[j], P[j + 1], P[j + 2], Q[q] + inflate, ox, oy, oz, dx, dy, dz, tmax, h);
    case SHAPE_AABB: case SHAPE_OBB: {
      const rx = ox - P[j], ry = oy - P[j + 1], rz = oz - P[j + 2];
      const lox = rx * R[o] + ry * R[o + 1] + rz * R[o + 2], loy = rx * R[o + 3] + ry * R[o + 4] + rz * R[o + 5], loz = rx * R[o + 6] + ry * R[o + 7] + rz * R[o + 8];
      const ldx = dx * R[o] + dy * R[o + 1] + dz * R[o + 2], ldy = dx * R[o + 3] + dy * R[o + 4] + dz * R[o + 5], ldz = dx * R[o + 6] + dy * R[o + 7] + dz * R[o + 8];
      const lo = [lox, loy, loz], ld = [ldx, ldy, ldz]; let t0 = 0, t1 = tmax, ax = -1, sg = 0;
      for (let k = 0; k < 3; k++) {
        const e = Q[q + k] + inflate;
        if (Math.abs(ld[k]) < 1e-14) { if (lo[k] < -e || lo[k] > e) return false; continue; }
        let a = (-e - lo[k]) / ld[k], b = (e - lo[k]) / ld[k], s = -1; // s: 入る面の符号（-e 側から入るなら法線は -軸）
        if (a > b) { const x = a; a = b; b = x; s = 1; }
        if (a > t0) { t0 = a; ax = k; sg = s; } if (b < t1) t1 = b; if (t0 > t1) return false;
      }
      h.t = t0;
      if (ax < 0) { h.inside = true; h.nx = -dx; h.ny = -dy; h.nz = -dz; return true; }
      const nl = [0, 0, 0]; nl[ax] = sg;
      h.nx = nl[0] * R[o] + nl[1] * R[o + 3] + nl[2] * R[o + 6]; h.ny = nl[0] * R[o + 1] + nl[1] * R[o + 4] + nl[2] * R[o + 7]; h.nz = nl[0] * R[o + 2] + nl[1] * R[o + 5] + nl[2] * R[o + 8]; return true;
    }
    case SHAPE_CAPSULE: return rayCapsule(P[j], P[j + 1], P[j + 2], R[o + 3], R[o + 4], R[o + 5], Q[q + 1], Q[q] + inflate, ox, oy, oz, dx, dy, dz, tmax, h);
    default: {
      const nx = Q[q], ny = Q[q + 1], nz = Q[q + 2], off = Q[q + 3] + inflate, dist0 = nx * ox + ny * oy + nz * oz - off, den = nx * dx + ny * dy + nz * dz;
      if (dist0 <= 0) { h.t = 0; h.inside = true; h.nx = nx; h.ny = ny; h.nz = nz; return true; }
      if (den >= 0) return false; const t = -dist0 / den; if (t > tmax) return false;
      h.t = t; h.nx = nx; h.ny = ny; h.nz = nz; return true;
    }
  }
}
function raySphere(cx, cy, cz, r, ox, oy, oz, dx, dy, dz, tmax, h) {
  const mx = ox - cx, my = oy - cy, mz = oz - cz, b = mx * dx + my * dy + mz * dz, cc = mx * mx + my * my + mz * mz - r * r;
  if (cc <= 0) { h.t = 0; h.inside = true; h.nx = -dx; h.ny = -dy; h.nz = -dz; return true; }
  if (b > 0) return false; const disc = b * b - cc; if (disc < 0) return false;
  const t = -b - Math.sqrt(disc); if (t > tmax) return false;
  h.t = t; h.nx = (mx + dx * t) / r; h.ny = (my + dy * t) / r; h.nz = (mz + dz * t) / r; return true;
}
function rayCapsule(cx, cy, cz, ux, uy, uz, hl, r, ox, oy, oz, dx, dy, dz, tmax, h) {
  const mx = ox - cx, my = oy - cy, mz = oz - cz, oa = mx * ux + my * uy + mz * uz;
  // 始点が内部か
  const s0 = oa < -hl ? -hl : oa > hl ? hl : oa, ex = mx - ux * s0, ey = my - uy * s0, ez = mz - uz * s0;
  if (ex * ex + ey * ey + ez * ez <= r * r) { h.t = 0; h.inside = true; h.nx = -dx; h.ny = -dy; h.nz = -dz; return true; }
  let best = Infinity, bnx = 0, bny = 0, bnz = 0;
  // 円筒部
  const da = dx * ux + dy * uy + dz * uz, opx = mx - ux * oa, opy = my - uy * oa, opz = mz - uz * oa, dpx = dx - ux * da, dpy = dy - uy * da, dpz = dz - uz * da;
  const A = dpx * dpx + dpy * dpy + dpz * dpz, B = opx * dpx + opy * dpy + opz * dpz, C = opx * opx + opy * opy + opz * opz - r * r;
  if (A > 1e-14) {
    const disc = B * B - A * C;
    if (disc >= 0) { const t = (-B - Math.sqrt(disc)) / A; if (t >= 0 && t <= tmax) { const s = oa + da * t; if (s >= -hl && s <= hl) { best = t; bnx = (opx + dpx * t) / r; bny = (opy + dpy * t) / r; bnz = (opz + dpz * t) / r; } } }
  }
  // 端の半球（球で判定し、軸方向に外側の半球部分のみ採用…球全体の最初の交点が円筒の外側にある場合に限る）
  for (const e of [-hl, hl]) {
    const sx = cx + ux * e, sy = cy + uy * e, sz = cz + uz * e, px = ox - sx, py = oy - sy, pz = oz - sz, b = px * dx + py * dy + pz * dz, cc = px * px + py * py + pz * pz - r * r;
    if (b > 0 && cc > 0) continue; const disc = b * b - cc; if (disc < 0) continue;
    const t = -b - Math.sqrt(disc); if (t < 0 || t > tmax || t >= best) continue;
    const hx = px + dx * t, hy = py + dy * t, hz = pz + dz * t, side = (hx * ux + hy * uy + hz * uz) * (e < 0 ? -1 : 1);
    if (side >= 0) { best = t; bnx = hx / r; bny = hy / r; bnz = hz / r; }
  }
  if (best === Infinity) return false; h.t = best; h.nx = bnx; h.ny = bny; h.nz = bnz; return true;
}

/* ---------------------------------------------------------------- 球スイープ（連続衝突判定） */
const _hit = new RayHit(), _pc = new Contact();
/**
 * 半径 r の球が (x,y,z) から変位 (dx,dy,dz) だけ直線移動する間に、形状 i に最初に触れる時刻 t∈[0,1] を求める。
 *  - 球・カプセル・平面: 膨らませた形状への線分レイ判定で厳密。
 *  - AABB/OBB: 保守的前進法（Conservative Advancement）。距離関数から安全な前進量を求めて繰り返す。最大 64 回。
 *    収束しない（ほぼ接線方向に擦る）場合は「当たり」として扱う（すり抜けより誤検出を選ぶ）。
 * 初期状態で既に重なっていれば t=0。当たれば c に toi=t、法線（形状→球）、接触点を書いて true。
 */
export function sweepSphere(S, i, x, y, z, r, dx, dy, dz, c) {
  const len = Math.hypot(dx, dy, dz), type = S.type[i];
  if (len < 1e-12) { const d = pointDistance(S, i, x, y, z, _pc) - r; if (d > 0) return false; fillSweep(S, i, x, y, z, r, 0, c); return true; }
  const ux = dx / len, uy = dy / len, uz = dz / len;
  if (type !== SHAPE_AABB && type !== SHAPE_OBB) {
    if (!rayShape(S, i, x, y, z, ux, uy, uz, len, _hit, r)) return false;
    fillSweep(S, i, x, y, z, r, _hit.t / len, c, dx, dy, dz, _hit); return true;
  }
  // 箱までの距離は（外側で）凸関数なので、接線法で前進できる: t += f / (-f')。f' = n·d（n は形状→球の法線）。
  // f' >= 0（遠ざかる/平行）なら二度と触れない。通常の「距離 / 速度」より速く収束し、接線方向のかすりでも反復が増えない。
  const eps = 1e-7 * (1 + r); let t = 0;
  for (let it = 0; it < 64; it++) {
    const px = x + dx * t, py = y + dy * t, pz = z + dz * t, d = pointDistance(S, i, px, py, pz, _pc) - r;
    if (d <= eps) { fillSweep(S, i, x, y, z, r, t, c, dx, dy, dz); return true; }
    const slope = _pc.nx * dx + _pc.ny * dy + _pc.nz * dz; // df/dt
    if (slope >= 0) return false;
    if (t >= 1) return false; // 終点で評価済みでまだ離れている
    t += d / -slope; if (t > 1) t = 1;
  }
  fillSweep(S, i, x, y, z, r, t, c, dx, dy, dz); return true; // 収束しなかった: 保守的に当たり扱い
}
function fillSweep(S, i, x, y, z, r, t, c, dx = 0, dy = 0, dz = 0) {
  const px = x + dx * t, py = y + dy * t, pz = z + dz * t, d = pointDistance(S, i, px, py, pz, _pc) - r;
  c.nx = _pc.nx; c.ny = _pc.ny; c.nz = _pc.nz; c.px = _pc.px; c.py = _pc.py; c.pz = _pc.pz; c.depth = d < 0 ? -d : 0; c.toi = t;
}
