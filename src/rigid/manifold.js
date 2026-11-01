/*
 * 接触マニフォールド生成（ナローフェーズ）。1 組の形状から、最大 4 点の接触点・共通の法線・貫通深度・特徴 ID を作る。
 *
 * 規約
 *   - 法線 (nx,ny,nz) は「a から b へ」向かう単位ベクトル。
 *   - depth > 0: めり込み量 / depth < 0: 離れている距離（margin 以内なら推測的(speculative)接触として生成する）。
 *   - 接触点は両表面の中間点（ワールド座標）。
 *   - id: 同じ接触特徴は次フレームでも同じ値になる（ウォームスタートの対応付け用）。
 *   - S は CollisionWorld のナローフェーズと同じ形 { type, pos(3N), rotm(9N: ローカルX,Y,Zのワールド表現), par(4N) }。
 *
 * 対応する組み合わせ（種別順 球 < 箱(OBB/AABB) < カプセル < 平面）:
 *   球×球 / 球×箱 / 球×カプセル / 球×平面 / 箱×箱(SAT+クリッピング: 面接触は最大4点, 辺×辺は1点) / 箱×平面(最大4点)
 *   箱×カプセル(最近点 + 端点の最大2点: 近似マニフォールド) / カプセル×カプセル(平行なら2点) / カプセル×平面(最大2点)
 *   平面×平面は静的どうしなので常に「接触なし」。
 */
import { SHAPE_SPHERE, SHAPE_AABB, SHAPE_OBB, SHAPE_CAPSULE, SHAPE_PLANE } from '../collision/shapes.js';

export const MAX_MANIFOLD_POINTS = 4;
const CAP = 16, EPS = 1e-9;

export class ContactOut {
  constructor() { this.nx = 0; this.ny = 1; this.nz = 0; this.count = 0; this.p = new Float64Array(CAP * 3); this.depth = new Float64Array(CAP); this.id = new Int32Array(CAP); }
}
function add(o, x, y, z, depth, id) { const k = o.count++, j = k * 3; o.p[j] = x; o.p[j + 1] = y; o.p[j + 2] = z; o.depth[k] = depth; o.id[k] = id; }
function setN(o, x, y, z) { o.nx = x; o.ny = y; o.nz = z; }
function perp(ax, ay, az, out) { // 単位ベクトルに垂直な単位ベクトル
  const bx = Math.abs(ax), by = Math.abs(ay), bz = Math.abs(az); let x, y, z;
  if (bx <= by && bx <= bz) { x = 0; y = -az; z = ay; } else if (by <= bz) { x = az; y = 0; z = -ax; } else { x = -ay; y = ax; z = 0; }
  const l = Math.hypot(x, y, z) || 1; out[0] = x / l; out[1] = y / l; out[2] = z / l;
}
const _v = new Float64Array(3);

/** 接触点が 5 個以上のとき、面積が最大になるように 4 点へ減らす（最深点 → それから最遠 → 三角形面積最大 → 反対側で面積最大）。 */
function reduce(o) {
  const n = o.count; if (n <= MAX_MANIFOLD_POINTS) return;
  const P = o.p, D = o.depth, I = o.id; let i0 = 0;
  for (let k = 1; k < n; k++) if (D[k] > D[i0]) i0 = k;
  let i1 = -1, best = -1;
  for (let k = 0; k < n; k++) { if (k === i0) continue; const dx = P[k * 3] - P[i0 * 3], dy = P[k * 3 + 1] - P[i0 * 3 + 1], dz = P[k * 3 + 2] - P[i0 * 3 + 2], d = dx * dx + dy * dy + dz * dz; if (d > best) { best = d; i1 = k; } }
  const ex = P[i1 * 3] - P[i0 * 3], ey = P[i1 * 3 + 1] - P[i0 * 3 + 1], ez = P[i1 * 3 + 2] - P[i0 * 3 + 2];
  let i2 = -1, i3 = -1, a2 = -1, a3 = -1, sgn2 = 1;
  const nx = o.nx, ny = o.ny, nz = o.nz;
  for (let k = 0; k < n; k++) { // 辺 i0→i1 に対する符号付き面積（法線方向の成分）
    if (k === i0 || k === i1) continue;
    const dx = P[k * 3] - P[i0 * 3], dy = P[k * 3 + 1] - P[i0 * 3 + 1], dz = P[k * 3 + 2] - P[i0 * 3 + 2];
    const cx = ey * dz - ez * dy, cy = ez * dx - ex * dz, cz = ex * dy - ey * dx, a = cx * nx + cy * ny + cz * nz;
    if (Math.abs(a) > a2) { a2 = Math.abs(a); i2 = k; sgn2 = a >= 0 ? 1 : -1; }
  }
  for (let k = 0; k < n; k++) {
    if (k === i0 || k === i1 || k === i2) continue;
    const dx = P[k * 3] - P[i0 * 3], dy = P[k * 3 + 1] - P[i0 * 3 + 1], dz = P[k * 3 + 2] - P[i0 * 3 + 2];
    const cx = ey * dz - ez * dy, cy = ez * dx - ex * dz, cz = ex * dy - ey * dx, a = (cx * nx + cy * ny + cz * nz) * -sgn2; // 反対側
    if (a > a3) { a3 = a; i3 = k; }
  }
  const sel = [i0, i1, i2]; if (i3 >= 0) sel.push(i3); else { for (let k = 0; k < n; k++) if (!sel.includes(k)) { sel.push(k); break; } }
  const tp = new Float64Array(12), td = new Float64Array(4), ti = new Int32Array(4);
  for (let s = 0; s < 4; s++) { const k = sel[s]; tp[s * 3] = P[k * 3]; tp[s * 3 + 1] = P[k * 3 + 1]; tp[s * 3 + 2] = P[k * 3 + 2]; td[s] = D[k]; ti[s] = I[k]; }
  for (let s = 0; s < 4; s++) { P[s * 3] = tp[s * 3]; P[s * 3 + 1] = tp[s * 3 + 1]; P[s * 3 + 2] = tp[s * 3 + 2]; D[s] = td[s]; I[s] = ti[s]; }
  o.count = 4;
}

/* ---------------------------------------------------------------- 球 */
function sphereSphere(S, a, b, o, m) {
  const P = S.pos, Q = S.par, i = a * 3, j = b * 3, dx = P[j] - P[i], dy = P[j + 1] - P[i + 1], dz = P[j + 2] - P[i + 2];
  const ra = Q[a * 4], rb = Q[b * 4], rr = ra + rb + m, d2 = dx * dx + dy * dy + dz * dz;
  if (!(d2 < rr * rr)) return;
  const d = Math.sqrt(d2); let nx = 1, ny = 0, nz = 0;
  if (d > EPS) { nx = dx / d; ny = dy / d; nz = dz / d; }
  const depth = ra + rb - d; setN(o, nx, ny, nz);
  const k = ra - depth * 0.5; add(o, P[i] + nx * k, P[i + 1] + ny * k, P[i + 2] + nz * k, depth, 0);
}

/** 箱ローカル座標の点 (lx,ly,lz) に対する球(半径 r)と箱の接触。法線は箱→球（ローカル）で返す。 */
function sphereBoxLocal(lx, ly, lz, hx, hy, hz, r, m, res) {
  const qx = lx < -hx ? -hx : lx > hx ? hx : lx, qy = ly < -hy ? -hy : ly > hy ? hy : ly, qz = lz < -hz ? -hz : lz > hz ? hz : lz;
  const dx = lx - qx, dy = ly - qy, dz = lz - qz, d2 = dx * dx + dy * dy + dz * dz;
  if (d2 > 0) {
    const lim = r + m; if (!(d2 < lim * lim)) return false;
    const d = Math.sqrt(d2); res[0] = dx / d; res[1] = dy / d; res[2] = dz / d; res[3] = r - d; res[4] = qx; res[5] = qy; res[6] = qz; return true;
  }
  const fx = hx - Math.abs(lx), fy = hy - Math.abs(ly), fz = hz - Math.abs(lz);
  res[0] = res[1] = res[2] = 0; res[4] = lx; res[5] = ly; res[6] = lz;
  if (fx <= fy && fx <= fz) { const s = lx < 0 ? -1 : 1; res[0] = s; res[4] = s * hx; res[3] = r + fx; }
  else if (fy <= fz) { const s = ly < 0 ? -1 : 1; res[1] = s; res[5] = s * hy; res[3] = r + fy; }
  else { const s = lz < 0 ? -1 : 1; res[2] = s; res[6] = s * hz; res[3] = r + fz; }
  return true;
}
const _res = new Float64Array(8);

function sphereBox(S, a, b, o, m) { // a=球, b=箱
  const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, j = b * 3, rb = b * 9, q = b * 4, r = Q[a * 4];
  const cx = P[i] - P[j], cy = P[i + 1] - P[j + 1], cz = P[i + 2] - P[j + 2];
  const lx = cx * R[rb] + cy * R[rb + 1] + cz * R[rb + 2], ly = cx * R[rb + 3] + cy * R[rb + 4] + cz * R[rb + 5], lz = cx * R[rb + 6] + cy * R[rb + 7] + cz * R[rb + 8];
  if (!sphereBoxLocal(lx, ly, lz, Q[q], Q[q + 1], Q[q + 2], r, m, _res)) return;
  const nlx = _res[0], nly = _res[1], nlz = _res[2], depth = _res[3];
  const bnx = nlx * R[rb] + nly * R[rb + 3] + nlz * R[rb + 6], bny = nlx * R[rb + 1] + nly * R[rb + 4] + nlz * R[rb + 7], bnz = nlx * R[rb + 2] + nly * R[rb + 5] + nlz * R[rb + 8]; // 箱→球（ワールド）
  const sx = _res[4], sy = _res[5], sz = _res[6]; // 箱表面の点（ローカル）
  const wx = P[j] + sx * R[rb] + sy * R[rb + 3] + sz * R[rb + 6], wy = P[j + 1] + sx * R[rb + 1] + sy * R[rb + 4] + sz * R[rb + 7], wz = P[j + 2] + sx * R[rb + 2] + sy * R[rb + 5] + sz * R[rb + 8];
  setN(o, -bnx, -bny, -bnz); add(o, wx - bnx * depth * 0.5, wy - bny * depth * 0.5, wz - bnz * depth * 0.5, depth, 0);
}

function sphereCapsule(S, a, b, o, m) { // a=球, b=カプセル
  const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, j = b * 3, rb = b * 9, rs = Q[a * 4], rc = Q[b * 4], hl = Q[b * 4 + 1];
  const ux = R[rb + 3], uy = R[rb + 4], uz = R[rb + 5], px = P[i] - P[j], py = P[i + 1] - P[j + 1], pz = P[i + 2] - P[j + 2];
  let t = px * ux + py * uy + pz * uz; t = t < -hl ? -hl : t > hl ? hl : t;
  const qx = P[j] + ux * t, qy = P[j + 1] + uy * t, qz = P[j + 2] + uz * t, dx = qx - P[i], dy = qy - P[i + 1], dz = qz - P[i + 2], d2 = dx * dx + dy * dy + dz * dz, lim = rs + rc + m;
  if (!(d2 < lim * lim)) return;
  const d = Math.sqrt(d2); let nx, ny, nz; if (d > EPS) { nx = dx / d; ny = dy / d; nz = dz / d; } else { perp(ux, uy, uz, _v); nx = _v[0]; ny = _v[1]; nz = _v[2]; }
  const depth = rs + rc - d; setN(o, nx, ny, nz); const k = rs - depth * 0.5; add(o, P[i] + nx * k, P[i + 1] + ny * k, P[i + 2] + nz * k, depth, 0);
}

function spherePlane(S, a, b, o, m) { // a=球, b=平面 (n·x = d, n 側が外)
  const P = S.pos, Q = S.par, i = a * 3, q = b * 4, nx = Q[q], ny = Q[q + 1], nz = Q[q + 2], r = Q[a * 4];
  const dist = nx * P[i] + ny * P[i + 1] + nz * P[i + 2] - Q[q + 3];
  if (!(dist < r + m)) return;
  setN(o, -nx, -ny, -nz); const k = (r + dist) * 0.5; add(o, P[i] - nx * k, P[i + 1] - ny * k, P[i + 2] - nz * k, r - dist, 0);
}

/* ---------------------------------------------------------------- 箱 × 平面 */
const _vx = new Float64Array(8), _vy = new Float64Array(8), _vz = new Float64Array(8);
function boxPlane(S, a, b, o, m) { // a=箱, b=平面
  const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, ra = a * 9, qa = a * 4, q = b * 4, nx = Q[q], ny = Q[q + 1], nz = Q[q + 2], off = Q[q + 3];
  const hx = Q[qa], hy = Q[qa + 1], hz = Q[qa + 2];
  // 早期棄却: 中心の距離 - 平面法線方向の投影半径
  const cd = nx * P[i] + ny * P[i + 1] + nz * P[i + 2] - off;
  const pr = hx * Math.abs(nx * R[ra] + ny * R[ra + 1] + nz * R[ra + 2]) + hy * Math.abs(nx * R[ra + 3] + ny * R[ra + 4] + nz * R[ra + 5]) + hz * Math.abs(nx * R[ra + 6] + ny * R[ra + 7] + nz * R[ra + 8]);
  if (!(cd - pr < m)) return;
  setN(o, -nx, -ny, -nz);
  for (let v = 0; v < 8; v++) {
    const sx = v & 1 ? hx : -hx, sy = v & 2 ? hy : -hy, sz = v & 4 ? hz : -hz;
    const wx = P[i] + sx * R[ra] + sy * R[ra + 3] + sz * R[ra + 6], wy = P[i + 1] + sx * R[ra + 1] + sy * R[ra + 4] + sz * R[ra + 7], wz = P[i + 2] + sx * R[ra + 2] + sy * R[ra + 5] + sz * R[ra + 8];
    const dist = nx * wx + ny * wy + nz * wz - off;
    if (dist < m) add(o, wx - nx * dist * 0.5, wy - ny * dist * 0.5, wz - nz * dist * 0.5, -dist, v);
  }
  reduce(o);
}

/* ---------------------------------------------------------------- 箱 × 箱 (SAT + クリッピング) */
const _C = new Float64Array(9), _aC = new Float64Array(9), _tA = new Float64Array(3), _tB = new Float64Array(3);
const _poly0 = new Float64Array(16 * 3), _poly1 = new Float64Array(16 * 3), _pid0 = new Int32Array(16), _pid1 = new Int32Array(16);
const _L = new Float64Array(3);

/** 凸多角形(3D 点列)を平面 (axis 方向の符号付き距離 d = h - sgn * (x-c)·axis ≥ 0 が内側) でクリップする。 */
function clipPoly(inP, inI, nIn, outP, outI, ax, ay, az, cx, cy, cz, h, sgn, planeTag) {
  let nOut = 0;
  for (let k = 0; k < nIn; k++) {
    const k2 = (k + 1) % nIn, j1 = k * 3, j2 = k2 * 3;
    const d1 = h - sgn * ((inP[j1] - cx) * ax + (inP[j1 + 1] - cy) * ay + (inP[j1 + 2] - cz) * az);
    const d2 = h - sgn * ((inP[j2] - cx) * ax + (inP[j2 + 1] - cy) * ay + (inP[j2 + 2] - cz) * az);
    if (d1 >= 0) { const o = nOut * 3; outP[o] = inP[j1]; outP[o + 1] = inP[j1 + 1]; outP[o + 2] = inP[j1 + 2]; outI[nOut++] = inI[k]; }
    if ((d1 >= 0) !== (d2 >= 0)) {
      const t = d1 / (d1 - d2), o = nOut * 3;
      outP[o] = inP[j1] + (inP[j2] - inP[j1]) * t; outP[o + 1] = inP[j1 + 1] + (inP[j2 + 1] - inP[j1 + 1]) * t; outP[o + 2] = inP[j1 + 2] + (inP[j2 + 2] - inP[j1 + 2]) * t;
      outI[nOut++] = 4 + ((inI[k] * 7 + inI[k2] * 3 + planeTag * 11) & 0x7f);
      if (nOut >= 15) return nOut;
    }
  }
  return nOut;
}

function boxBox(S, a, b, o, m) {
  const P = S.pos, R = S.rotm, Q = S.par, pa = a * 3, pb = b * 3, ra = a * 9, rb = b * 9, qa = a * 4, qb = b * 4;
  const ah0 = Q[qa], ah1 = Q[qa + 1], ah2 = Q[qa + 2], bh0 = Q[qb], bh1 = Q[qb + 1], bh2 = Q[qb + 2];
  const tx = P[pb] - P[pa], ty = P[pb + 1] - P[pa + 1], tz = P[pb + 2] - P[pa + 2];
  const C = _C, aC = _aC;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const c = R[ra + i * 3] * R[rb + j * 3] + R[ra + i * 3 + 1] * R[rb + j * 3 + 1] + R[ra + i * 3 + 2] * R[rb + j * 3 + 2];
    C[i * 3 + j] = c; aC[i * 3 + j] = Math.abs(c) + 1e-7;
  }
  for (let i = 0; i < 3; i++) { _tA[i] = tx * R[ra + i * 3] + ty * R[ra + i * 3 + 1] + tz * R[ra + i * 3 + 2]; _tB[i] = tx * R[rb + i * 3] + ty * R[rb + i * 3 + 1] + tz * R[rb + i * 3 + 2]; }
  // A の面
  let sepA = -Infinity, ia = 0;
  const aH = [ah0, ah1, ah2], bH = [bh0, bh1, bh2];
  for (let i = 0; i < 3; i++) { const s = Math.abs(_tA[i]) - (aH[i] + aC[i * 3] * bh0 + aC[i * 3 + 1] * bh1 + aC[i * 3 + 2] * bh2); if (s > m) return; if (s > sepA) { sepA = s; ia = i; } }
  let sepB = -Infinity, ib = 0;
  for (let j = 0; j < 3; j++) { const s = Math.abs(_tB[j]) - (bH[j] + aC[j] * ah0 + aC[3 + j] * ah1 + aC[6 + j] * ah2); if (s > m) return; if (s > sepB) { sepB = s; ib = j; } }
  // 辺×辺
  let sepE = -Infinity, ei = 0, ej = 0;
  const L = _L;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const ix = R[ra + i * 3], iy = R[ra + i * 3 + 1], iz = R[ra + i * 3 + 2], jx = R[rb + j * 3], jy = R[rb + j * 3 + 1], jz = R[rb + j * 3 + 2];
    let lx = iy * jz - iz * jy, ly = iz * jx - ix * jz, lz = ix * jy - iy * jx; const ll = Math.sqrt(lx * lx + ly * ly + lz * lz);
    if (ll < 1e-4) continue; lx /= ll; ly /= ll; lz /= ll;
    const rA = ah0 * Math.abs(R[ra] * lx + R[ra + 1] * ly + R[ra + 2] * lz) + ah1 * Math.abs(R[ra + 3] * lx + R[ra + 4] * ly + R[ra + 5] * lz) + ah2 * Math.abs(R[ra + 6] * lx + R[ra + 7] * ly + R[ra + 8] * lz);
    const rB = bh0 * Math.abs(R[rb] * lx + R[rb + 1] * ly + R[rb + 2] * lz) + bh1 * Math.abs(R[rb + 3] * lx + R[rb + 4] * ly + R[rb + 5] * lz) + bh2 * Math.abs(R[rb + 6] * lx + R[rb + 7] * ly + R[rb + 8] * lz);
    const s = Math.abs(tx * lx + ty * ly + tz * lz) - rA - rB;
    if (s > m) return; if (s > sepE) { sepE = s; ei = i; ej = j; }
  }
  // 面を優先（ヒステリシス）: B の面は A の面より明確に浅い時のみ採用。辺は面より明確に浅い時のみ採用。
  const REL = 0.95, ABS = 0.01;
  let refB = sepB > REL * sepA + ABS; const sepF = refB ? sepB : sepA;
  if (sepE > REL * sepF + ABS) { edgeContact(S, a, b, o, ei, ej, sepE, tx, ty, tz); return; }
  // 面接触: 参照面 = 基準箱の面、入射面 = 他方の箱で最も反対向きの面
  const rP = refB ? pb : pa, rR = refB ? rb : ra, rH = refB ? bH : aH, iP = refB ? pa : pb, iR = refB ? ra : rb, iH = refB ? aH : bH;
  const axis = refB ? ib : ia, dirSign = refB ? -1 : 1; // 参照面の向き: 基準箱 → 他方
  const tAxis = refB ? _tB[axis] : _tA[axis]; const sg = (tAxis * dirSign) >= 0 ? 1 : -1;
  const Nx = sg * R[rR + axis * 3], Ny = sg * R[rR + axis * 3 + 1], Nz = sg * R[rR + axis * 3 + 2];
  // 入射面の選択
  let jj = 0, bestAbs = -1, dd = 0;
  for (let j = 0; j < 3; j++) { const d = Nx * R[iR + j * 3] + Ny * R[iR + j * 3 + 1] + Nz * R[iR + j * 3 + 2]; if (Math.abs(d) > bestAbs) { bestAbs = Math.abs(d); jj = j; dd = d; } }
  const isg = dd > 0 ? -1 : 1; // 入射面の法線 = isg * 軸 (N と反対向き)
  const u = (jj + 1) % 3, v = (jj + 2) % 3;
  const icx = P[iP] + isg * iH[jj] * R[iR + jj * 3], icy = P[iP + 1] + isg * iH[jj] * R[iR + jj * 3 + 1], icz = P[iP + 2] + isg * iH[jj] * R[iR + jj * 3 + 2];
  const ux = R[iR + u * 3] * iH[u], uy = R[iR + u * 3 + 1] * iH[u], uz = R[iR + u * 3 + 2] * iH[u], vx = R[iR + v * 3] * iH[v], vy = R[iR + v * 3 + 1] * iH[v], vz = R[iR + v * 3 + 2] * iH[v];
  const inc = _poly0; const incFace = jj * 2 + (isg > 0 ? 0 : 1), refFace = axis * 2 + (sg > 0 ? 0 : 1);
  const su = [1, -1, -1, 1], sv = [1, 1, -1, -1];
  for (let k = 0; k < 4; k++) { inc[k * 3] = icx + su[k] * ux + sv[k] * vx; inc[k * 3 + 1] = icy + su[k] * uy + sv[k] * vy; inc[k * 3 + 2] = icz + su[k] * uz + sv[k] * vz; _pid0[k] = k; }
  // 参照面の 4 側面でクリップ
  const ru = (axis + 1) % 3, rv = (axis + 2) % 3, rcx = P[rP], rcy = P[rP + 1], rcz = P[rP + 2];
  let n = 4, curP = _poly0, curI = _pid0, nxtP = _poly1, nxtI = _pid1;
  const planes = [[ru, 1], [ru, -1], [rv, 1], [rv, -1]];
  for (let pidx = 0; pidx < 4 && n > 0; pidx++) {
    const ax = planes[pidx][0], sgn = planes[pidx][1];
    n = clipPoly(curP, curI, n, nxtP, nxtI, R[rR + ax * 3], R[rR + ax * 3 + 1], R[rR + ax * 3 + 2], rcx, rcy, rcz, rH[ax], sgn, pidx);
    let tp = curP; curP = nxtP; nxtP = tp; let ti = curI; curI = nxtI; nxtI = ti;
  }
  if (n === 0) return;
  // 参照面上の点: N·(x - rc) = rH[axis]
  const nsx = refB ? -Nx : Nx, nsy = refB ? -Ny : Ny, nsz = refB ? -Nz : Nz; // a→b 向きの法線
  setN(o, nsx, nsy, nsz);
  const idBase = ((refB ? 1 : 0) << 14) | (refFace << 10) | (incFace << 7);
  for (let k = 0; k < n; k++) {
    const x = curP[k * 3], y = curP[k * 3 + 1], z = curP[k * 3 + 2];
    const sep = Nx * (x - rcx) + Ny * (y - rcy) + Nz * (z - rcz) - rH[axis];
    if (sep > m) continue;
    add(o, x - Nx * sep * 0.5, y - Ny * sep * 0.5, z - Nz * sep * 0.5, -sep, idBase | (curI[k] & 0x7f));
  }
  reduce(o);
}

/** 辺×辺接触。a=辺軸 ei の箱, b=辺軸 ej の箱。 */
function edgeContact(S, a, b, o, ei, ej, sep, tx, ty, tz) {
  const P = S.pos, R = S.rotm, Q = S.par, pa = a * 3, pb = b * 3, ra = a * 9, rb = b * 9, qa = a * 4, qb = b * 4;
  const aix = R[ra + ei * 3], aiy = R[ra + ei * 3 + 1], aiz = R[ra + ei * 3 + 2], bjx = R[rb + ej * 3], bjy = R[rb + ej * 3 + 1], bjz = R[rb + ej * 3 + 2];
  let lx = aiy * bjz - aiz * bjy, ly = aiz * bjx - aix * bjz, lz = aix * bjy - aiy * bjx; const ll = Math.hypot(lx, ly, lz) || 1; lx /= ll; ly /= ll; lz /= ll;
  if (lx * tx + ly * ty + lz * tz < 0) { lx = -lx; ly = -ly; lz = -lz; } // a→b
  // a の支持辺の中心: 辺軸以外の 2 軸は L 側へ
  let cax = P[pa], cay = P[pa + 1], caz = P[pa + 2], cbx = P[pb], cby = P[pb + 1], cbz = P[pb + 2];
  for (let k = 0; k < 3; k++) {
    if (k !== ei) { const d = lx * R[ra + k * 3] + ly * R[ra + k * 3 + 1] + lz * R[ra + k * 3 + 2], s = d > 0 ? 1 : -1, h = Q[qa + k]; cax += s * h * R[ra + k * 3]; cay += s * h * R[ra + k * 3 + 1]; caz += s * h * R[ra + k * 3 + 2]; }
    if (k !== ej) { const d = lx * R[rb + k * 3] + ly * R[rb + k * 3 + 1] + lz * R[rb + k * 3 + 2], s = d > 0 ? -1 : 1, h = Q[qb + k]; cbx += s * h * R[rb + k * 3]; cby += s * h * R[rb + k * 3 + 1]; cbz += s * h * R[rb + k * 3 + 2]; }
  }
  // 2 直線 (ca + aI s, cb + bJ t) の最近点
  const rx = cax - cbx, ry = cay - cby, rz = caz - cbz, bb = aix * bjx + aiy * bjy + aiz * bjz, c = aix * rx + aiy * ry + aiz * rz, f = bjx * rx + bjy * ry + bjz * rz, den = 1 - bb * bb;
  const s = den > 1e-9 ? (bb * f - c) / den : 0, t = bb * s + f;
  const qax = cax + aix * s, qay = cay + aiy * s, qaz = caz + aiz * s, qbx = cbx + bjx * t, qby = cby + bjy * t, qbz = cbz + bjz * t;
  setN(o, lx, ly, lz); add(o, (qax + qbx) * 0.5, (qay + qby) * 0.5, (qaz + qbz) * 0.5, -sep, 0x8000 | (ei * 3 + ej));
}

/* ---------------------------------------------------------------- カプセル */
/** 線分 (c ± u·h) の、箱(ローカル中心原点, 半サイズ)への最近点パラメータ t と距離² を返す（凸区分二次関数を厳密に最小化）。 */
const _ts = new Float64Array(12);
function segBoxClosest(lcx, lcy, lcz, lux, luy, luz, hl, hx, hy, hz, res) {
  const c = [lcx, lcy, lcz], u = [lux, luy, luz], h = [hx, hy, hz]; let n = 0;
  _ts[n++] = -hl; _ts[n++] = hl;
  for (let k = 0; k < 3; k++) if (Math.abs(u[k]) > 1e-12) for (const s of [-1, 1]) { const t = (s * h[k] - c[k]) / u[k]; if (t > -hl && t < hl) _ts[n++] = t; }
  const arr = Array.from(_ts.subarray(0, n)).sort((p, q) => p - q);
  let bestD2 = Infinity, bestT = 0;
  for (let i = 0; i + 1 < arr.length; i++) {
    const t0 = arr[i], t1 = arr[i + 1], tm = (t0 + t1) * 0.5; let num = 0, den = 0;
    for (let k = 0; k < 3; k++) { const l = c[k] + u[k] * tm; if (l > h[k]) { num += u[k] * (c[k] - h[k]); den += u[k] * u[k]; } else if (l < -h[k]) { num += u[k] * (c[k] + h[k]); den += u[k] * u[k]; } }
    let t = den > 1e-18 ? -num / den : tm; t = t < t0 ? t0 : t > t1 ? t1 : t;
    let d2 = 0; for (let k = 0; k < 3; k++) { const l = c[k] + u[k] * t, e = Math.abs(l) - h[k]; if (e > 0) d2 += e * e; }
    if (d2 < bestD2 - 1e-15) { bestD2 = d2; bestT = t; }
  }
  if (arr.length === 1) bestT = arr[0];
  res[0] = bestT; res[1] = bestD2;
  if (bestD2 === 0) { // 線分が箱の内部を通る: 最も深い点（表面までの最短距離が最大）を選ぶ
    let bd = -1, bt = bestT;
    for (let i = 0; i < arr.length; i++) { const t = arr[i]; let dep = Infinity; for (let k = 0; k < 3; k++) { const e = h[k] - Math.abs(c[k] + u[k] * t); if (e < dep) dep = e; } if (dep > bd) { bd = dep; bt = t; } }
    res[0] = bt;
  }
}
const _sb = new Float64Array(2), _res2 = new Float64Array(8);

function boxCapsule(S, a, b, o, m) { // a=箱, b=カプセル
  const P = S.pos, Q = S.par, R = S.rotm, ia = a * 3, ib = b * 3, ra = a * 9, rb = b * 9, qa = a * 4, r = Q[b * 4], hl = Q[b * 4 + 1];
  const hx = Q[qa], hy = Q[qa + 1], hz = Q[qa + 2], ux = R[rb + 3], uy = R[rb + 4], uz = R[rb + 5];
  const cx = P[ib] - P[ia], cy = P[ib + 1] - P[ia + 1], cz = P[ib + 2] - P[ia + 2];
  const lcx = cx * R[ra] + cy * R[ra + 1] + cz * R[ra + 2], lcy = cx * R[ra + 3] + cy * R[ra + 4] + cz * R[ra + 5], lcz = cx * R[ra + 6] + cy * R[ra + 7] + cz * R[ra + 8];
  const lux = ux * R[ra] + uy * R[ra + 1] + uz * R[ra + 2], luy = ux * R[ra + 3] + uy * R[ra + 4] + uz * R[ra + 5], luz = ux * R[ra + 6] + uy * R[ra + 7] + uz * R[ra + 8];
  segBoxClosest(lcx, lcy, lcz, lux, luy, luz, hl, hx, hy, hz, _sb);
  const t1 = _sb[0];
  // 点 t でのカプセル球 vs 箱
  const emit = (t, id, first) => {
    if (!sphereBoxLocal(lcx + lux * t, lcy + luy * t, lcz + luz * t, hx, hy, hz, r, m, _res2)) return false;
    const nlx = _res2[0], nly = _res2[1], nlz = _res2[2], depth = _res2[3]; // 箱→球(ローカル)
    const bnx = nlx * R[ra] + nly * R[ra + 3] + nlz * R[ra + 6], bny = nlx * R[ra + 1] + nly * R[ra + 4] + nlz * R[ra + 7], bnz = nlx * R[ra + 2] + nly * R[ra + 5] + nlz * R[ra + 8];
    if (first) setN(o, bnx, bny, bnz); else if (bnx * o.nx + bny * o.ny + bnz * o.nz < 0.9) return false; // 法線がほぼ同じ時のみ追加
    const sx = _res2[4], sy = _res2[5], sz = _res2[6];
    const wx = P[ia] + sx * R[ra] + sy * R[ra + 3] + sz * R[ra + 6], wy = P[ia + 1] + sx * R[ra + 1] + sy * R[ra + 4] + sz * R[ra + 7], wz = P[ia + 2] + sx * R[ra + 2] + sy * R[ra + 5] + sz * R[ra + 8];
    add(o, wx - bnx * depth * 0.5, wy - bny * depth * 0.5, wz - bnz * depth * 0.5, depth, id); // 表面から内側へ depth/2
    return true;
  };
  if (!emit(t1, 0, true)) return;
  const t2 = t1 >= 0 ? -hl : hl; if (Math.abs(t2 - t1) > 1e-6) emit(t2, 1, false);
}

function capsuleCapsule(S, a, b, o, m) {
  const P = S.pos, Q = S.par, R = S.rotm, ia = a * 3, ib = b * 3, ra = a * 9, rb = b * 9, r1 = Q[a * 4], h1 = Q[a * 4 + 1], r2 = Q[b * 4], h2 = Q[b * 4 + 1];
  const u1x = R[ra + 3], u1y = R[ra + 4], u1z = R[ra + 5], u2x = R[rb + 3], u2y = R[rb + 4], u2z = R[rb + 5];
  const rx = P[ia] - P[ib], ry = P[ia + 1] - P[ib + 1], rz = P[ia + 2] - P[ib + 2];
  const bb = u1x * u2x + u1y * u2y + u1z * u2z, c = u1x * rx + u1y * ry + u1z * rz, f = u2x * rx + u2y * ry + u2z * rz, den = 1 - bb * bb, lim = r1 + r2 + m;
  const cl = (v, h) => v < -h ? -h : v > h ? h : v;
  if (den < 1e-6) { // ほぼ平行: 重なり区間の両端の 2 点
    // a 軸上の s 区間: b 線分を a 軸へ射影 → [lo, hi] ∩ [-h1, h1]
    const sgn = bb >= 0 ? 1 : -1, off = -c; // b の中心の a 軸座標 = -c ... s = b*t - c
    const p1 = off + sgn * (-h2), p2 = off + sgn * h2, lo = Math.max(-h1, Math.min(p1, p2)), hi = Math.min(h1, Math.max(p1, p2));
    if (lo <= hi) {
      let any = false;
      for (let k = 0; k < 2; k++) {
        const s = k === 0 ? lo : hi, t = cl((s + c) / (bb || 1), h2); // s = b t - c → t = (s + c)/b
        const ax = P[ia] + u1x * s, ay = P[ia + 1] + u1y * s, az = P[ia + 2] + u1z * s, bx = P[ib] + u2x * t, by = P[ib + 1] + u2y * t, bz = P[ib + 2] + u2z * t;
        const dx = bx - ax, dy = by - ay, dz = bz - az, d2 = dx * dx + dy * dy + dz * dz;
        if (!(d2 < lim * lim)) continue; const d = Math.sqrt(d2); let nx, ny, nz;
        if (d > EPS) { nx = dx / d; ny = dy / d; nz = dz / d; } else { perp(u1x, u1y, u1z, _v); nx = _v[0]; ny = _v[1]; nz = _v[2]; }
        if (!any) setN(o, nx, ny, nz); else if (nx * o.nx + ny * o.ny + nz * o.nz < 0.9) continue; any = true;
        const depth = r1 + r2 - d, kk = r1 - depth * 0.5; add(o, ax + o.nx * kk, ay + o.ny * kk, az + o.nz * kk, depth, k);
      }
      if (any) return;
    }
  }
  let s = den > 1e-9 ? cl((bb * f - c) / den, h1) : 0, t = cl(bb * s + f, h2); s = cl(bb * t - c, h1);
  const ax = P[ia] + u1x * s, ay = P[ia + 1] + u1y * s, az = P[ia + 2] + u1z * s, bx = P[ib] + u2x * t, by = P[ib + 1] + u2y * t, bz = P[ib + 2] + u2z * t;
  const dx = bx - ax, dy = by - ay, dz = bz - az, d2 = dx * dx + dy * dy + dz * dz; if (!(d2 < lim * lim)) return;
  const d = Math.sqrt(d2); let nx, ny, nz;
  if (d > EPS) { nx = dx / d; ny = dy / d; nz = dz / d; } else { nx = u1y * u2z - u1z * u2y; ny = u1z * u2x - u1x * u2z; nz = u1x * u2y - u1y * u2x; const l = Math.hypot(nx, ny, nz); if (l > 1e-9) { nx /= l; ny /= l; nz /= l; } else { perp(u1x, u1y, u1z, _v); nx = _v[0]; ny = _v[1]; nz = _v[2]; } }
  setN(o, nx, ny, nz); const depth = r1 + r2 - d, k = r1 - depth * 0.5; add(o, ax + nx * k, ay + ny * k, az + nz * k, depth, 0);
}

function capsulePlane(S, a, b, o, m) { // a=カプセル, b=平面
  const P = S.pos, Q = S.par, R = S.rotm, ia = a * 3, ra = a * 9, q = b * 4, nx = Q[q], ny = Q[q + 1], nz = Q[q + 2], off = Q[q + 3], r = Q[a * 4], hl = Q[a * 4 + 1];
  setN(o, -nx, -ny, -nz);
  for (let k = 0; k < 2; k++) {
    const s = k === 0 ? -hl : hl, ex = P[ia] + R[ra + 3] * s, ey = P[ia + 1] + R[ra + 4] * s, ez = P[ia + 2] + R[ra + 5] * s, dist = nx * ex + ny * ey + nz * ez - off;
    if (dist < r + m) { const kk = (r + dist) * 0.5; add(o, ex - nx * kk, ey - ny * kk, ez - nz * kk, r - dist, k); }
  }
}

/* ---------------------------------------------------------------- ディスパッチ */
const TY = [SHAPE_SPHERE, SHAPE_AABB, SHAPE_OBB, SHAPE_CAPSULE, SHAPE_PLANE]; void TY;
const NONE = null;
/** [typeA][typeB] (typeA <= typeB)。AABB(1) と OBB(2) は同じ箱として扱う（rotm が単位なら AABB）。 */
const TABLE = [
  /* 球     */ [sphereSphere, sphereBox, sphereBox, sphereCapsule, spherePlane],
  /* AABB   */ [NONE, boxBox, boxBox, boxCapsule, boxPlane],
  /* OBB    */ [NONE, NONE, boxBox, boxCapsule, boxPlane],
  /* カプセル */ [NONE, NONE, NONE, capsuleCapsule, capsulePlane],
  /* 平面   */ [NONE, NONE, NONE, NONE, NONE]
];
/** この形状の組み合わせに対応した接触生成があるか（平面×平面は「静的どうし」なので false）。 */
export function isPairSupported(ta, tb) { const lo = ta <= tb ? ta : tb, hi = ta <= tb ? tb : ta; return !!TABLE[lo][hi]; }

/**
 * 2 つの剛体形状の接触マニフォールドを o に書く。法線は a→b。接触があれば o.count > 0。
 * margin: 離れていても margin 以内なら推測的接触として生成する（depth は負になる）。
 */
export function generateManifold(S, a, b, o, margin) {
  o.count = 0; const ta = S.type[a], tb = S.type[b];
  if (ta <= tb) { const f = TABLE[ta][tb]; if (!f) return false; f(S, a, b, o, margin); return o.count > 0; }
  const f = TABLE[tb][ta]; if (!f) return false;
  f(S, b, a, o, margin); if (o.count === 0) return false;
  o.nx = -o.nx; o.ny = -o.ny; o.nz = -o.nz; return true;
}
