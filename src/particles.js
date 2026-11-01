/*
 * パーティクルシステム（プール式・一括更新・発光対応）。
 *
 *   const ps = new ParticleSystem({ capacity: 20000, glow: true, color: [1,.6,.2], size: 0.15 });
 *   engine.add(ps.mesh);
 *   ps.emit({ x,y,z, count: 50, speed: 3, spread: 1, life: 1.2 });   // 発生（容量超過分は捨てて overflow に数える）
 *   engine.addUpdate(dt => ps.update(dt));
 *
 * 設計:
 *  - 位置・速度・寿命は Float32Array の SoA。確保はコンストラクタで 1 回だけ（emit/update で配列を作らない）。
 *  - 死んだ粒子は「末尾の生きている粒子」を移して詰める（swap-remove）。生存粒子は常に [0, count) に連続する。
 *  - 描画は InstancedMesh 1 つ（= 1 ドローコール）。実際に使う範囲だけ GPU へ転送される（dirty range）。
 *  - glow:true は加算合成（additive）・unlit・深度書き込みなし。寿命に応じ色を暗くして消す（加算では黒=透明）。
 *    glow:false は通常合成で寿命に応じて縮小して消す。
 *  - CPU シミュレーションのみ。GPU 上でのパーティクル更新（transform feedback 等）は未実装。
 */
import { Geometry } from './geometry.js';
import { Material } from './material.js';
import { InstancedMesh } from './node.js';
import { parseColor } from './util.js';

export class ParticleSystem {
  constructor(o = {}) {
    const cap = this.capacity = Math.max(1, o.capacity | 0 || 1000);
    this.gravity = o.gravity === undefined ? [0, 0, 0] : o.gravity; this.drag = o.drag || 0;
    this.baseSize = o.size === undefined ? 0.1 : o.size; this.baseColor = parseColor(o.color === undefined ? 0xffffff : o.color, [1, 1, 1]);
    this.glow = !!o.glow; this.sizeOverLife = o.sizeOverLife || 'shrink'; // 'shrink' | 'none' | 'grow'
    this.count = 0; this.overflow = 0; this.spawned = 0; this.died = 0;
    this.px = new Float32Array(cap); this.py = new Float32Array(cap); this.pz = new Float32Array(cap);
    this.vx = new Float32Array(cap); this.vy = new Float32Array(cap); this.vz = new Float32Array(cap);
    this.life = new Float32Array(cap); this.maxLife = new Float32Array(cap); this.size = new Float32Array(cap);
    this.cr = new Float32Array(cap); this.cg = new Float32Array(cap); this.cb = new Float32Array(cap);
    this._seed = (o.seed === undefined ? 12345 : o.seed) >>> 0 || 1; // 決定的な乱数（Math.random を使わない）
    const geo = o.geometry || Geometry.sphere(0.5, 6, 4);
    this.material = o.material || new Material({ color: 0xffffff, unlit: true, transparent: this.glow, opacity: 1, depthWrite: !this.glow, blending: this.glow ? 'additive' : 'normal' });
    this.mesh = new InstancedMesh(geo, this.material, { capacity: cap, count: 0, frustumCulled: false, dynamic: true, spin: false });
    this.mesh.name = 'ParticleSystem';
  }
  _rand() { let s = this._seed; s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; this._seed = s || 1; return s / 4294967296; }
  /** 粒子を count 個発生させる。返り値は実際に発生できた数。 */
  emit(e = {}) {
    const n = Math.max(0, (e.count === undefined ? 1 : e.count) | 0), x = e.x || 0, y = e.y || 0, z = e.z || 0;
    const speed = e.speed === undefined ? 1 : e.speed, spread = e.spread === undefined ? 1 : e.spread, life = e.life === undefined ? 1 : e.life, lifeJitter = e.lifeJitter === undefined ? 0.3 : e.lifeJitter;
    const dir = e.direction || [0, 1, 0], size = e.size === undefined ? this.baseSize : e.size, col = e.color ? parseColor(e.color, [1, 1, 1]) : this.baseColor, radius = e.radius || 0;
    let made = 0;
    for (let k = 0; k < n; k++) {
      if (this.count >= this.capacity) { this.overflow += n - k; break; }
      const i = this.count++;
      // 単位球上の一様乱数 → 方向 dir に spread で混ぜる
      const u = this._rand() * 2 - 1, th = this._rand() * 6.283185307, r = Math.sqrt(1 - u * u), sx = r * Math.cos(th), sy = u, sz = r * Math.sin(th);
      let dx = dir[0] + sx * spread, dy = dir[1] + sy * spread, dz = dir[2] + sz * spread; const l = Math.hypot(dx, dy, dz) || 1;
      const sp = speed * (0.6 + 0.8 * this._rand());
      this.vx[i] = dx / l * sp; this.vy[i] = dy / l * sp; this.vz[i] = dz / l * sp;
      this.px[i] = x + (radius ? sx * radius * this._rand() : 0); this.py[i] = y + (radius ? sy * radius * this._rand() : 0); this.pz[i] = z + (radius ? sz * radius * this._rand() : 0);
      const lf = life * (1 - lifeJitter + lifeJitter * 2 * this._rand()); this.life[i] = this.maxLife[i] = Math.max(1e-4, lf);
      this.size[i] = size; this.cr[i] = col[0]; this.cg[i] = col[1]; this.cb[i] = col[2]; made++;
    }
    this.spawned += made; return made;
  }
  /** 全粒子を 1 回のループで進め、行列/色を InstancedMesh へ書き込む。 */
  update(dt) {
    const g = this.gravity, gx = g[0] * dt, gy = g[1] * dt, gz = g[2] * dt, damp = this.drag > 0 ? Math.max(0, 1 - this.drag * dt) : 1;
    const { px, py, pz, vx, vy, vz, life, maxLife, size, cr, cg, cb } = this; const M = this.mesh.matrices, C = this.mesh.colors, glow = this.glow, mode = this.sizeOverLife;
    let n = this.count;
    for (let i = 0; i < n;) {
      const L = life[i] - dt;
      if (L <= 0) { // swap-remove: 末尾を移す（移した粒子は同じ i で再処理）
        const t = --n; this.died++;
        if (i !== t) { px[i] = px[t]; py[i] = py[t]; pz[i] = pz[t]; vx[i] = vx[t]; vy[i] = vy[t]; vz[i] = vz[t]; life[i] = life[t]; maxLife[i] = maxLife[t]; size[i] = size[t]; cr[i] = cr[t]; cg[i] = cg[t]; cb[i] = cb[t]; }
        continue;
      }
      life[i] = L;
      vx[i] = (vx[i] + gx) * damp; vy[i] = (vy[i] + gy) * damp; vz[i] = (vz[i] + gz) * damp;
      const x = px[i] += vx[i] * dt, y = py[i] += vy[i] * dt, z = pz[i] += vz[i] * dt;
      const t = L / maxLife[i]; // 1 → 0
      const s = size[i] * (mode === 'shrink' ? (glow ? 0.5 + 0.5 * t : t) : mode === 'grow' ? 1.5 - 0.5 * t : 1);
      const o = i * 16;
      M[o] = s; M[o + 1] = 0; M[o + 2] = 0; M[o + 3] = 0; M[o + 4] = 0; M[o + 5] = s; M[o + 6] = 0; M[o + 7] = 0; M[o + 8] = 0; M[o + 9] = 0; M[o + 10] = s; M[o + 11] = 0; M[o + 12] = x; M[o + 13] = y; M[o + 14] = z; M[o + 15] = 1;
      const f = glow ? t : 1, c = i * 4; C[c] = cr[i] * f; C[c + 1] = cg[i] * f; C[c + 2] = cb[i] * f; C[c + 3] = 0;
      i++;
    }
    const old = this.mesh.count; this.count = n;
    if (n > old) this.mesh.count = n, this.mesh.markInstancesDirty(0, n); // setCount の初期化を省く（全て上で書く）
    else { this.mesh.count = n; this.mesh.markInstancesDirty(0, Math.max(n, 1)); }
    return n;
  }
  clear() { this.count = 0; this.mesh.count = 0; this.mesh.markInstancesDirty(0, 1); return this; }
  stats() { return { alive: this.count, capacity: this.capacity, spawned: this.spawned, died: this.died, overflow: this.overflow }; }
  dispose() { this.mesh.count = 0; if (this.mesh.parent) this.mesh.parent.remove(this.mesh); }
}
