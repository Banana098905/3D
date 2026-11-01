/*
 * 拘束（ジョイント）— 拡張基盤の上に載せた【実験的】な最小実装。
 *   DistanceConstraint   : 2 つの剛体のアンカー間距離を一定に保つ（ロッド）
 *   BallSocketConstraint : 2 つの剛体のアンカー点を一致させる（球面ジョイント。回転は自由）
 * 未実装: ヒンジ / 固定 / 可動域制限 / モーター / ばね。 world.addConstraint() で登録する。
 * 位置ずれはバイアス速度(Baumgarte, beta)で補正するため、スプリットインパルスほど「エネルギーを足さない」性質はない。
 * 両端とも剛体ハンドルが必要（世界に固定したい場合は static ボディを作って使う）。
 */
import { angK, applyImpulse } from './world.js';

const _r = new Float64Array(6);
function setup(world, c) {
  const a = world.alloc.indexOf(c.a), b = world.alloc.indexOf(c.b); c.ia = a; c.ib = b; if (a < 0 || b < 0) return false;
  const R = world.rotm, P = world.pos;
  for (const [s, i, la, out] of [['A', a, c.la, 0], ['B', b, c.lb, 3]]) { const r = i * 9; _r[out] = R[r] * la[0] + R[r + 3] * la[1] + R[r + 6] * la[2]; _r[out + 1] = R[r + 1] * la[0] + R[r + 4] * la[1] + R[r + 7] * la[2]; _r[out + 2] = R[r + 2] * la[0] + R[r + 5] * la[1] + R[r + 8] * la[2]; void s; }
  c.rA = [_r[0], _r[1], _r[2]]; c.rB = [_r[3], _r[4], _r[5]];
  c.pa = [P[a * 3] + c.rA[0], P[a * 3 + 1] + c.rA[1], P[a * 3 + 2] + c.rA[2]]; c.pb = [P[b * 3] + c.rB[0], P[b * 3 + 1] + c.rB[1], P[b * 3 + 2] + c.rB[2]];
  return true;
}
function relVel(world, c, out) {
  const v = world.vel, w = world.ang, a = c.ia * 3, b = c.ib * 3, [rax, ray, raz] = c.rA, [rbx, rby, rbz] = c.rB;
  out[0] = v[b] + w[b + 1] * rbz - w[b + 2] * rby - v[a] - (w[a + 1] * raz - w[a + 2] * ray); out[1] = v[b + 1] + w[b + 2] * rbx - w[b] * rbz - v[a + 1] - (w[a + 2] * rax - w[a] * raz); out[2] = v[b + 2] + w[b] * rby - w[b + 1] * rbx - v[a + 2] - (w[a] * ray - w[a + 1] * rax);
}
const RA = new Float64Array(3), RB = new Float64Array(3);
function applyImpulseArr(world, c, x, y, z) { RA.set(c.rA); RB.set(c.rB); applyImpulse(world.vel, world.ang, world.invMass, world.iw, c.ia, c.ib, c.ia * 3, c.ib * 3, c.ia * 9, c.ib * 9, RA, RB, 0, x, y, z); }
const _v = [0, 0, 0];

export class DistanceConstraint {
  /** @param {{a:number,b:number,anchorA?:number[],anchorB?:number[],length?:number,beta?:number}} o  anchor はローカル座標 */
  constructor(o) { this.a = o.a; this.b = o.b; this.la = o.anchorA || [0, 0, 0]; this.lb = o.anchorB || [0, 0, 0]; this.length = o.length; this.beta = o.beta === undefined ? 0.2 : o.beta; this.lambda = 0; }
  prepare(world, dt) {
    if (!setup(world, this)) return; const d = [this.pb[0] - this.pa[0], this.pb[1] - this.pa[1], this.pb[2] - this.pa[2]], len = Math.hypot(d[0], d[1], d[2]) || 1e-9;
    if (this.length === undefined) this.length = len; this.n = [d[0] / len, d[1] / len, d[2] / len]; this.C = len - this.length; const n = this.n, [rax, ray, raz] = this.rA, [rbx, rby, rbz] = this.rB;
    const k = world.invMass[this.ia] + world.invMass[this.ib] + angK(world.iw, this.ia * 9, ray * n[2] - raz * n[1], raz * n[0] - rax * n[2], rax * n[1] - ray * n[0]) + angK(world.iw, this.ib * 9, rby * n[2] - rbz * n[1], rbz * n[0] - rbx * n[2], rbx * n[1] - rby * n[0]);
    this.m = k > 0 ? 1 / k : 0; this.bias = this.beta * this.C / dt; this.lambda = 0;
  }
  solveVelocity(world) {
    if (this.ia < 0 || this.ib < 0) return; relVel(world, this, _v); const n = this.n, l = -this.m * (_v[0] * n[0] + _v[1] * n[1] + _v[2] * n[2] + this.bias); this.lambda += l; applyImpulseArr(world, this, n[0] * l, n[1] * l, n[2] * l);
  }
}
export class BallSocketConstraint {
  constructor(o) { this.a = o.a; this.b = o.b; this.la = o.anchorA || [0, 0, 0]; this.lb = o.anchorB || [0, 0, 0]; this.beta = o.beta === undefined ? 0.2 : o.beta; }
  prepare(world, dt) {
    if (!setup(world, this)) return; const [ax, ay, az] = this.rA, [bx, by, bz] = this.rB, im = world.invMass[this.ia] + world.invMass[this.ib], A = world.iw, ia = this.ia * 9, ib = this.ib * 9;
    const sk = (x, y, z) => [0, -z, y, z, 0, -x, -y, x, 0], mul = (p, q) => { const o = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = p[r * 3] * q[c] + p[r * 3 + 1] * q[3 + c] + p[r * 3 + 2] * q[6 + c]; return o; };
    const SA = sk(ax, ay, az), SB = sk(bx, by, bz), IA = Array.from(A.subarray(ia, ia + 9)), IB = Array.from(A.subarray(ib, ib + 9)), T1 = mul(mul(SA, IA), SA), T2 = mul(mul(SB, IB), SB);
    const K = new Array(9); for (let i = 0; i < 9; i++) K[i] = (i % 4 === 0 ? im : 0) - T1[i] - T2[i];
    const det = K[0] * (K[4] * K[8] - K[5] * K[7]) - K[1] * (K[3] * K[8] - K[5] * K[6]) + K[2] * (K[3] * K[7] - K[4] * K[6]); const id = Math.abs(det) > 1e-300 ? 1 / det : 0;
    this.Ki = [(K[4] * K[8] - K[5] * K[7]) * id, (K[2] * K[7] - K[1] * K[8]) * id, (K[1] * K[5] - K[2] * K[4]) * id, (K[5] * K[6] - K[3] * K[8]) * id, (K[0] * K[8] - K[2] * K[6]) * id, (K[2] * K[3] - K[0] * K[5]) * id, (K[3] * K[7] - K[4] * K[6]) * id, (K[1] * K[6] - K[0] * K[7]) * id, (K[0] * K[4] - K[1] * K[3]) * id];
    this.bias = [this.beta * (this.pb[0] - this.pa[0]) / dt, this.beta * (this.pb[1] - this.pa[1]) / dt, this.beta * (this.pb[2] - this.pa[2]) / dt];
  }
  solveVelocity(world) {
    if (this.ia < 0 || this.ib < 0 || !this.Ki) return; relVel(world, this, _v); const x = _v[0] + this.bias[0], y = _v[1] + this.bias[1], z = _v[2] + this.bias[2], K = this.Ki;
    applyImpulseArr(world, this, -(K[0] * x + K[1] * y + K[2] * z), -(K[3] * x + K[4] * y + K[5] * z), -(K[6] * x + K[7] * y + K[8] * z));
  }
}
