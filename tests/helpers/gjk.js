// テスト専用: 凸形状どうしの交差を GJK で判定する「独立した基準実装」（本体の衝突コードとは別に書いたもの）。
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const neg = a => [-a[0], -a[1], -a[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** 形状記述 {type, c:[x,y,z], r, h:[hx,hy,hz], hl, axes:[ux,uy,uz]} から支持関数を作る。axes は列ベクトル3本。 */
export function support(s) {
  const U = s.axes || [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  if (s.type === 'sphere') return d => { const n = norm(d); return [s.c[0] + n[0] * s.r, s.c[1] + n[1] * s.r, s.c[2] + n[2] * s.r]; };
  if (s.type === 'box') return d => { const p = [s.c[0], s.c[1], s.c[2]]; for (let k = 0; k < 3; k++) { const sg = dot(d, U[k]) < 0 ? -1 : 1; for (let m = 0; m < 3; m++) p[m] += sg * s.h[k] * U[k][m]; } return p; };
  if (s.type === 'capsule') return d => { const n = norm(d), sg = dot(d, U[1]) < 0 ? -1 : 1; return [0, 1, 2].map(m => s.c[m] + sg * s.hl * U[1][m] + n[m] * s.r); };
  throw new Error('unsupported ' + s.type);
}

function doSimplex(S, st) {
  const A = S[0];
  if (S.length === 2) {
    const B = S[1], AB = sub(B, A), AO = neg(A);
    if (dot(AB, AO) > 0) st.dir = cross(cross(AB, AO), AB); else { S.length = 1; st.dir = AO; }
    return false;
  }
  if (S.length === 3) {
    const B = S[1], C = S[2], AB = sub(B, A), AC = sub(C, A), AO = neg(A), ABC = cross(AB, AC);
    if (dot(cross(ABC, AC), AO) > 0) {
      if (dot(AC, AO) > 0) { S.length = 0; S.push(A, C); st.dir = cross(cross(AC, AO), AC); }
      else { S.length = 0; S.push(A, B); return doSimplex(S, st); }
    } else if (dot(cross(AB, ABC), AO) > 0) { S.length = 0; S.push(A, B); return doSimplex(S, st); }
    else if (dot(ABC, AO) > 0) st.dir = ABC; else { S.length = 0; S.push(A, C, B); st.dir = neg(ABC); }
    return false;
  }
  const B = S[1], C = S[2], D = S[3], AB = sub(B, A), AC = sub(C, A), AD = sub(D, A), AO = neg(A);
  const ABC = cross(AB, AC), ACD = cross(AC, AD), ADB = cross(AD, AB);
  if (dot(ABC, AO) > 0) { S.length = 0; S.push(A, B, C); return doSimplex(S, st); }
  if (dot(ACD, AO) > 0) { S.length = 0; S.push(A, C, D); return doSimplex(S, st); }
  if (dot(ADB, AO) > 0) { S.length = 0; S.push(A, D, B); return doSimplex(S, st); }
  return true;
}
/** 2 つの凸形状（支持関数）が交差するか。接しているだけの境界は不定。 */
export function gjkIntersect(sa, sb) {
  const sup = d => { const a = sa(d), b = sb(neg(d)); return sub(a, b); };
  const st = { dir: [1, 0.37, 0.21] };
  let p = sup(st.dir); const S = [p]; st.dir = neg(p);
  if (Math.hypot(...st.dir) < 1e-12) return true;
  for (let it = 0; it < 100; it++) {
    p = sup(st.dir); if (dot(p, st.dir) < 0) return false;
    S.unshift(p); if (doSimplex(S, st)) return true;
    if (Math.hypot(...st.dir) < 1e-14) return true;
  }
  return false;
}
