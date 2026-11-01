/*
 * 固定タイムステップ（描画フレームレートとシミュレーション速度の分離）。
 *
 *   update(realDt, stepFn): 実時間を蓄積し、固定刻み fixedDt ごとに stepFn(fixedDt, stepIndex) を呼ぶ。
 *   - 1 回の update で実行する最大ステップ数 maxSubSteps。超えた分の時間は捨てる（「死の螺旋」を防ぐ）。
 *   - 1 フレームで受け取る実時間は maxFrameDt に切り詰める（タブ復帰直後などの巨大な dt 対策）。
 *   - pause()/resume()、timeScale（0〜: スローモーション/早送り）。
 *   - 決定性: シミュレーション時間は steps * fixedDt（浮動小数の足し込みで誤差が溜まらない）。
 *     実時間 dt の揺れは「何回 stepFn が呼ばれるか」にだけ影響し、stepFn に渡る値は常に fixedDt と整数の stepIndex。
 *   - alpha: 次のステップまでの進み具合 0..1。描画側が補間（Interpolator）に使う。
 */
export class FixedTimestep {
  constructor({ fixedDt = 1 / 60, maxSubSteps = 5, maxFrameDt = 0.25, timeScale = 1, paused = false } = {}) {
    if (!(fixedDt > 0)) throw new RangeError('FixedTimestep: fixedDt は正の数が必要です。');
    this.fixedDt = fixedDt; this.maxSubSteps = Math.max(1, maxSubSteps | 0); this.maxFrameDt = maxFrameDt; this.timeScale = timeScale; this.paused = paused;
    this.acc = 0; this.steps = 0; this.droppedTime = 0; this.lastSubSteps = 0; this.clampedFrames = 0;
  }
  get simTime() { return this.steps * this.fixedDt; }
  get alpha() { return this.acc / this.fixedDt; }
  pause() { this.paused = true; return this; }
  resume() { this.paused = false; return this; }
  setTimeScale(v) { if (!(v >= 0) || !isFinite(v)) throw new RangeError('timeScale は 0 以上の有限数'); this.timeScale = v; return this; }
  /** 一時停止中に 1 ステップだけ進める（デバッグ用コマ送り）。 */
  stepOnce(stepFn) { stepFn(this.fixedDt, this.steps++); return this; }
  update(realDt, stepFn) {
    this.lastSubSteps = 0;
    if (this.paused || !(realDt > 0) || !isFinite(realDt)) return 0;
    if (realDt > this.maxFrameDt) { realDt = this.maxFrameDt; this.clampedFrames++; }
    this.acc += realDt * this.timeScale; const f = this.fixedDt; let n = 0;
    while (this.acc >= f && n < this.maxSubSteps) { stepFn(f, this.steps++); this.acc -= f; n++; }
    if (this.acc >= f) { this.droppedTime += this.acc - (this.acc % f); this.acc %= f; } // 追いつけない分は捨てる（端数は保持）
    this.lastSubSteps = n; return n;
  }
  reset() { this.acc = 0; this.steps = 0; this.droppedTime = 0; this.lastSubSteps = 0; return this; }
}

/**
 * 固定ステップの「前の状態」と「現在の状態」から、描画用の滑らかな位置を作る。
 *   毎ステップ後に capture(positions) を呼ぶ → 描画前に lerp(out, alpha)。
 *   quats を指定した場合は球面線形補間（最短経路）。count 個の 3 次元位置（と任意で 4 元数）を扱う。
 */
export class Interpolator {
  constructor(count, { rotations = false } = {}) {
    this.count = count; this.prev = new Float32Array(count * 3); this.curr = new Float32Array(count * 3); this.primed = false;
    this.rotations = rotations; if (rotations) { this.prevQ = new Float32Array(count * 4); this.currQ = new Float32Array(count * 4); }
  }
  capture(pos, quat = null) {
    this.prev.set(this.primed ? this.curr : pos.subarray(0, this.count * 3)); this.curr.set(pos.subarray(0, this.count * 3));
    if (this.rotations && quat) { this.prevQ.set(this.primed ? this.currQ : quat.subarray(0, this.count * 4)); this.currQ.set(quat.subarray(0, this.count * 4)); }
    this.primed = true; return this;
  }
  lerp(out, alpha) {
    const a = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha, p = this.prev, c = this.curr, n = this.count * 3; for (let k = 0; k < n; k++) out[k] = p[k] + (c[k] - p[k]) * a; return out;
  }
  slerp(out, alpha) {
    if (!this.rotations) throw new Error('Interpolator: rotations:true で作成してください。');
    const a = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha, p = this.prevQ, c = this.currQ;
    for (let i = 0; i < this.count; i++) {
      const o = i * 4; let bx = c[o], by = c[o + 1], bz = c[o + 2], bw = c[o + 3], d = p[o] * bx + p[o + 1] * by + p[o + 2] * bz + p[o + 3] * bw;
      if (d < 0) { d = -d; bx = -bx; by = -by; bz = -bz; bw = -bw; } let s0, s1;
      if (1 - d > 1e-6) { const om = Math.acos(d > 1 ? 1 : d), so = Math.sin(om); s0 = Math.sin((1 - a) * om) / so; s1 = Math.sin(a * om) / so; } else { s0 = 1 - a; s1 = a; }
      const x = s0 * p[o] + s1 * bx, y = s0 * p[o + 1] + s1 * by, z = s0 * p[o + 2] + s1 * bz, w = s0 * p[o + 3] + s1 * bw, l = Math.hypot(x, y, z, w) || 1;
      out[o] = x / l; out[o + 1] = y / l; out[o + 2] = z / l; out[o + 3] = w / l;
    }
    return out;
  }
}
