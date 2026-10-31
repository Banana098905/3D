/* 数学ユーティリティ。行列は列優先 (WebGL 互換)。out 引数を取り、確保を避ける。 */

export const vec3 = {
  create: (x = 0, y = 0, z = 0) => new Float64Array([x, y, z]),
  set(o, x, y, z) { o[0] = x; o[1] = y; o[2] = z; return o; },
  copy(o, a) { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; return o; },
  add(o, a, b) { o[0] = a[0] + b[0]; o[1] = a[1] + b[1]; o[2] = a[2] + b[2]; return o; },
  sub(o, a, b) { o[0] = a[0] - b[0]; o[1] = a[1] - b[1]; o[2] = a[2] - b[2]; return o; },
  scale(o, a, s) { o[0] = a[0] * s; o[1] = a[1] * s; o[2] = a[2] * s; return o; },
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross(o, a, b) { const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0]; o[0] = x; o[1] = y; o[2] = z; return o; },
  length: a => Math.hypot(a[0], a[1], a[2]),
  distance: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  normalize(o, a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; o[0] = a[0] / l; o[1] = a[1] / l; o[2] = a[2] / l; return o; },
  transformMat4(o, a, m) {
    const x = a[0], y = a[1], z = a[2];
    const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
    o[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    o[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    o[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    return o;
  },
  transformDir(o, a, m) {
    const x = a[0], y = a[1], z = a[2];
    o[0] = m[0] * x + m[4] * y + m[8] * z; o[1] = m[1] * x + m[5] * y + m[9] * z; o[2] = m[2] * x + m[6] * y + m[10] * z; return o;
  }
};

export const quat = {
  create: () => new Float64Array([0, 0, 0, 1]),
  identity(o) { o[0] = 0; o[1] = 0; o[2] = 0; o[3] = 1; return o; },
  copy(o, a) { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; o[3] = a[3]; return o; },
  normalize(o, a) { const l = Math.hypot(a[0], a[1], a[2], a[3]) || 1; o[0] = a[0] / l; o[1] = a[1] / l; o[2] = a[2] / l; o[3] = a[3] / l; return o; },
  multiply(o, a, b) {
    const ax = a[0], ay = a[1], az = a[2], aw = a[3], bx = b[0], by = b[1], bz = b[2], bw = b[3];
    o[0] = ax * bw + aw * bx + ay * bz - az * by; o[1] = ay * bw + aw * by + az * bx - ax * bz;
    o[2] = az * bw + aw * bz + ax * by - ay * bx; o[3] = aw * bw - ax * bx - ay * by - az * bz; return o;
  },
  fromAxisAngle(o, ax, ay, az, angle) {
    const l = Math.hypot(ax, ay, az) || 1, s = Math.sin(angle / 2) / l;
    o[0] = ax * s; o[1] = ay * s; o[2] = az * s; o[3] = Math.cos(angle / 2); return o;
  },
  /** オイラー角 (ラジアン)、回転順は X→Y→Z（three.js の 'XYZ' と同じ） */
  fromEuler(o, x, y, z) {
    const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2), s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
    o[0] = s1 * c2 * c3 + c1 * s2 * s3; o[1] = c1 * s2 * c3 - s1 * c2 * s3;
    o[2] = c1 * c2 * s3 + s1 * s2 * c3; o[3] = c1 * c2 * c3 - s1 * s2 * s3; return o;
  },
  slerp(o, a, b, t) {
    let bx = b[0], by = b[1], bz = b[2], bw = b[3];
    let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
    if (cos < 0) { cos = -cos; bx = -bx; by = -by; bz = -bz; bw = -bw; }
    let s0, s1;
    if (1 - cos > 1e-6) { const om = Math.acos(cos), so = Math.sin(om); s0 = Math.sin((1 - t) * om) / so; s1 = Math.sin(t * om) / so; }
    else { s0 = 1 - t; s1 = t; }
    o[0] = s0 * a[0] + s1 * bx; o[1] = s0 * a[1] + s1 * by; o[2] = s0 * a[2] + s1 * bz; o[3] = s0 * a[3] + s1 * bw; return o;
  },
  /** 回転行列の基底 (列ベクトル x,y,z) から */
  fromBasis(o, xx, xy, xz, yx, yy, yz, zx, zy, zz) {
    const tr = xx + yy + zz;
    if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; o[3] = s / 4; o[0] = (yz - zy) / s; o[1] = (zx - xz) / s; o[2] = (xy - yx) / s; }
    else if (xx > yy && xx > zz) { const s = Math.sqrt(1 + xx - yy - zz) * 2; o[3] = (yz - zy) / s; o[0] = s / 4; o[1] = (yx + xy) / s; o[2] = (zx + xz) / s; }
    else if (yy > zz) { const s = Math.sqrt(1 + yy - xx - zz) * 2; o[3] = (zx - xz) / s; o[0] = (yx + xy) / s; o[1] = s / 4; o[2] = (zy + yz) / s; }
    else { const s = Math.sqrt(1 + zz - xx - yy) * 2; o[3] = (xy - yx) / s; o[0] = (zx + xz) / s; o[1] = (zy + yz) / s; o[2] = s / 4; }
    return quat.normalize(o, o);
  }
};

export const mat4 = {
  create() { const m = new Float64Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  identity(o) { o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; },
  copy(o, a) { for (let i = 0; i < 16; i++) o[i] = a[i]; return o; },
  multiply(o, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
      a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    o[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30; o[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    o[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32; o[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    o[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30; o[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    o[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32; o[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    o[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30; o[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    o[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32; o[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    o[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30; o[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    o[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32; o[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return o;
  },
  compose(o, p, q, s) {
    const x = q[0], y = q[1], z = q[2], w = q[3], x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
    const sx = s[0], sy = s[1], sz = s[2];
    o[0] = (1 - (yy + zz)) * sx; o[1] = (xy + wz) * sx; o[2] = (xz - wy) * sx; o[3] = 0;
    o[4] = (xy - wz) * sy; o[5] = (1 - (xx + zz)) * sy; o[6] = (yz + wx) * sy; o[7] = 0;
    o[8] = (xz + wy) * sz; o[9] = (yz - wx) * sz; o[10] = (1 - (xx + yy)) * sz; o[11] = 0;
    o[12] = p[0]; o[13] = p[1]; o[14] = p[2]; o[15] = 1; return o;
  },
  /** 逆行列。特異行列の場合 null を返し out は変更しない。 */
  invert(o, a) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
      a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11,
      b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30,
      b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det || !isFinite(det)) return null;
    det = 1 / det;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return o;
  },
  perspective(o, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    o.fill(0); o[0] = f / aspect; o[5] = f; o[10] = (far + near) * nf; o[11] = -1; o[14] = 2 * far * near * nf; return o;
  },
  ortho(o, l, r, b, t, n, f) {
    const lr = 1 / (l - r), bt = 1 / (b - t), nf = 1 / (n - f);
    o.fill(0); o[0] = -2 * lr; o[5] = -2 * bt; o[10] = 2 * nf; o[12] = (l + r) * lr; o[13] = (t + b) * bt; o[14] = (f + n) * nf; o[15] = 1; return o;
  },
  lookAt(o, eye, target, up) {
    let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
    let len = Math.hypot(zx, zy, zz) || 1; zx /= len; zy /= len; zz /= len;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz);
    if (len < 1e-9) { xx = 1; xy = 0; xz = 0; len = 1; } // up と視線が平行な場合の退避
    xx /= len; xy /= len; xz /= len;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0; o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0; o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]); o[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]); o[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]); o[15] = 1;
    return o;
  },
  /** 上位3x3の逆転置 (法線行列) を 9 要素の out に書く */
  normalMatrix(o, m) {
    const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
    const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g;
    let det = a * A + b * B + c * C;
    if (!det) { o[0] = 1; o[1] = 0; o[2] = 0; o[3] = 0; o[4] = 1; o[5] = 0; o[6] = 0; o[7] = 0; o[8] = 1; return o; }
    det = 1 / det;
    o[0] = A * det; o[3] = B * det; o[6] = C * det;
    o[1] = (c * h - b * i) * det; o[4] = (a * i - c * g) * det; o[7] = (b * g - a * h) * det;
    o[2] = (b * f - c * e) * det; o[5] = (c * d - a * f) * det; o[8] = (a * e - b * d) * det;
    return o;
  },
  /** ローカルAABBをmで変換したワールドAABB (中心+|M|*半径 法) */
  transformAABB(outMin, outMax, min, max, m) {
    const cx = (min[0] + max[0]) / 2, cy = (min[1] + max[1]) / 2, cz = (min[2] + max[2]) / 2;
    const ex = (max[0] - min[0]) / 2, ey = (max[1] - min[1]) / 2, ez = (max[2] - min[2]) / 2;
    const wx = m[0] * cx + m[4] * cy + m[8] * cz + m[12], wy = m[1] * cx + m[5] * cy + m[9] * cz + m[13], wz = m[2] * cx + m[6] * cy + m[10] * cz + m[14];
    const hx = Math.abs(m[0]) * ex + Math.abs(m[4]) * ey + Math.abs(m[8]) * ez;
    const hy = Math.abs(m[1]) * ex + Math.abs(m[5]) * ey + Math.abs(m[9]) * ez;
    const hz = Math.abs(m[2]) * ex + Math.abs(m[6]) * ey + Math.abs(m[10]) * ez;
    outMin[0] = wx - hx; outMin[1] = wy - hy; outMin[2] = wz - hz; outMax[0] = wx + hx; outMax[1] = wy + hy; outMax[2] = wz + hz;
  }
};

/** ビュー・フラスタム (Gribb-Hartmann)。planes は [nx,ny,nz,d] x 6、内側が正。 */
export class Frustum {
  constructor() { this.planes = new Float64Array(24); }
  setFromMatrix(m) {
    const p = this.planes;
    const set = (i, a, b, c, d) => { const l = Math.hypot(a, b, c) || 1; p[i] = a / l; p[i + 1] = b / l; p[i + 2] = c / l; p[i + 3] = d / l; };
    set(0, m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]);
    set(4, m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]);
    set(8, m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]);
    set(12, m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]);
    set(16, m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]);
    set(20, m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]);
    return this;
  }
  intersectsSphere(cx, cy, cz, r) {
    const p = this.planes;
    for (let i = 0; i < 24; i += 4) if (p[i] * cx + p[i + 1] * cy + p[i + 2] * cz + p[i + 3] < -r) return false;
    return true;
  }
  intersectsAABB(min, max) {
    const p = this.planes;
    for (let i = 0; i < 24; i += 4) {
      const nx = p[i], ny = p[i + 1], nz = p[i + 2];
      const x = nx >= 0 ? max[0] : min[0], y = ny >= 0 ? max[1] : min[1], z = nz >= 0 ? max[2] : min[2];
      if (nx * x + ny * y + nz * z + p[i + 3] < 0) return false;
    }
    return true;
  }
}
