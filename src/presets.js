import { PhysicsWorld } from './physics.js';
import { Geometry } from './geometry.js';
import { Material } from './material.js';
import { InstancedMesh, createGridHelper } from './node.js';
import { hashRandom, hsl } from './util.js';

/**
 * 試作版 MASSIVE ENGINE と同じ「XZ 平面上で大量の立方体が円衝突する」シーン。
 * MassiveEngine.create({ count }) で自動生成される（互換モード）。球の3D物理 + 回転する立方体のインスタンス描画。
 * 試作版の実測で有効だった設定（セル幅 0.60・逆質量/AABB 早期棄却なし）を既定値にしている。
 */
export class ParticleField {
  constructor(engine, o = {}) {
    this.engine = engine; this.count = 0; this.speed = 1; this.gridCellSize = Number.isFinite(o.gridCellSize) ? Math.max(0.3, Math.min(2, o.gridCellSize)) : 0.6;
    this.speed = Number.isFinite(o.speed) ? Math.max(0.1, Math.min(3, o.speed)) : 1;
    this.mesh = null; this.grid = null; this.spin = o.cubeRotation !== false; this.world = null; this.seed = 0;
    this.setCount(Number.isFinite(o.count) ? o.count : 2500);
  }
  _clear() {
    if (this.mesh) { this.mesh.disposeResources({ textures: false }); this.mesh.removeFromParent(); this.mesh = null; }
    if (this.grid) { this.grid.disposeResources(); this.grid.removeFromParent(); this.grid = null; }
  }
  setCount(requested) {
    const n = Number(requested); if (!Number.isFinite(n)) throw new TypeError('count must be a finite number.');
    const count = Math.max(100, Math.min(100000, Math.round(n / 100) * 100)), cols = Math.ceil(Math.sqrt(count)), rows = Math.ceil(count / cols), sp = 0.62;
    const W = cols * sp, D = rows * sp; this._clear(); this.count = count;
    const opts = { gravity: [0, 0, 0], bounds: { min: [-W / 2, -1, -D / 2], max: [W / 2, 1, D / 2] }, planar: true, cellSize: this.gridCellSize, restitution: 0.12, boundsRestitution: 1, positionCorrection: 0.78, slop: 0.001, timeScale: this.speed, maxSpeed: 20, maxSubSteps: 3, friction: 0 };
    const eng = this.engine; eng.disablePhysics(); this.world = eng.enablePhysics(opts, { worker: false });
    this.world.reserve(count);
    this.mesh = new InstancedMesh(Geometry.box(1, 1, 1), new Material({ specular: 0.1 }), { capacity: count, chunkSize: 4096, spin: this.spin, name: 'particles' });
    this.mesh.setCount(count); const m = this.mesh.matrices, c = this.mesh.colors, rgb = [0, 0, 0];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols), col = i % cols;
      const x = (col - (cols - 1) / 2) * sp + (hashRandom(i, 1) - 0.5) * 0.035, z = (row - (rows - 1) / 2) * sp + (hashRandom(i, 2) - 0.5) * 0.035;
      const ang = hashRandom(i, 3) * Math.PI * 2, v = 0.38 + hashRandom(i, 4) * 0.85, r = 0.22 + hashRandom(i, 5) * 0.06;
      this.world.addBody({ radius: r, mass: r * r, position: [x, 0, z], velocity: [Math.cos(ang) * v, 0, Math.sin(ang) * v] });
      hsl((i * 0.61803398875) % 1, 0.72, 0.58, rgb);
      const o = i * 16, s = r * 2; m[o] = m[o + 5] = m[o + 10] = s; m[o + 12] = x; m[o + 14] = z;
      c[i * 4] = rgb[0]; c[i * 4 + 1] = rgb[1]; c[i * 4 + 2] = rgb[2]; c[i * 4 + 3] = hashRandom(i, 6) * Math.PI * 2;
    }
    this.mesh.markInstancesDirty(0, count); this.world.bindInstanced(this.mesh, 0, count);
    this.mesh.setPosition(0, 0, 0);
    this.grid = createGridHelper(Math.max(W, D), Math.max(1, Math.round(Math.max(W, D) / Math.max(1, Math.ceil(Math.max(W, D) / 80)))), '#336a8c', 0.4); this.grid.setPosition(0, -0.31, 0);
    eng.scene.add(this.grid, this.mesh);
    if (eng.controls) { eng.controls.minPitch = 0.1; eng.controls.maxPitch = 1.42; eng.controls.maxDistance = Math.max(W, D) * 4; eng.controls.target.set([0, 0, 0]); eng.controls.distance = Math.max(16, Math.max(W, D) * 1.15); eng.controls.yaw = 0.68; eng.controls.pitch = 0.78; eng.controls.update(); eng.camera.far = Math.max(5000, eng.controls.distance * 10); }
    return this;
  }
  reset() { return this.setCount(this.count); }
  setSpeed(v) { const s = Number(v); if (!Number.isFinite(s)) throw new TypeError('speed must be a finite number.'); this.speed = Math.max(0.1, Math.min(3, s)); this.world.setOptions({ timeScale: this.speed }); return this; }
  setGridCellSize(v) { const w = Number(v); if (!Number.isFinite(w) || w < 0.3 || w > 2) throw new RangeError('gridCellSize must be between 0.3 and 2.0.'); this.gridCellSize = w; this.world.setOptions({ cellSize: w }); return this; }
  setSpin(on) { this.spin = !!on; if (this.mesh) this.mesh.spin = this.spin; }
  dispose() { this._clear(); }
}
