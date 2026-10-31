/*
 * 空間分割つき簡易3D物理（球・AABB）。描画から独立しており Node.js でもテスト可能。
 *
 * 実装範囲: 固定時間刻み / 重力 / 球・AABB衝突 / 一様グリッドのブロードフェーズ /
 *           位置補正+インパルス応答（反発・摩擦）/ 境界壁 / 静的・動的分離 / 巨大物体の別処理
 * 非対応:   回転する剛体、拘束・ジョイント、連続衝突判定(CCD)、スリープ、多面体・メッシュ衝突
 */
import { now, MassiveEngineError, f32ToBase64, base64ToF32 } from './util.js';

export const SHAPE_SPHERE = 0, SHAPE_BOX = 1;

/** 一様グリッド (カウントソート方式)。active セルのみ走査できる。 */
class UniformGrid {
  constructor() {
    this.nx = 1; this.ny = 1; this.nz = 1; this.cell = 1; this.inv = 1; this.ox = 0; this.oy = 0; this.oz = 0; this.planar = false; this.total = 1;
    this.counts = new Int32Array(1); this.starts = new Int32Array(2); this.cursor = new Int32Array(1);
    this.items = new Int32Array(0); this.cellOf = new Int32Array(0); this.active = new Int32Array(1); this.activeCount = 0; this.itemCount = 0;
  }
  configure(ox, oy, oz, cell, nx, ny, nz, planar) {
    this.ox = ox; this.oy = oy; this.oz = oz; this.cell = cell; this.inv = 1 / cell; this.nx = nx; this.ny = planar ? 1 : ny; this.nz = nz; this.planar = planar;
    this.total = this.nx * this.ny * this.nz;
    this.counts = new Int32Array(this.total); this.starts = new Int32Array(this.total + 1); this.cursor = new Int32Array(this.total); this.active = new Int32Array(this.total);
    this.activeCount = 0; this.itemCount = 0;
  }
  ensure(n) { if (this.items.length < n) { this.items = new Int32Array(n); this.cellOf = new Int32Array(n); } }
  cellIndex(x, y, z) {
    let cx = Math.floor((x - this.ox) * this.inv), cz = Math.floor((z - this.oz) * this.inv), cy = 0;
    if (cx < 0) cx = 0; else if (cx >= this.nx) cx = this.nx - 1;
    if (cz < 0) cz = 0; else if (cz >= this.nz) cz = this.nz - 1;
    if (!this.planar) { cy = Math.floor((y - this.oy) * this.inv); if (cy < 0) cy = 0; else if (cy >= this.ny) cy = this.ny - 1; }
    return (cy * this.nz + cz) * this.nx + cx;
  }
  rebuild(list, n, pos) {
    this.ensure(n);
    const counts = this.counts, cellOf = this.cellOf;
    counts.fill(0); this.activeCount = 0; this.itemCount = n;
    for (let k = 0; k < n; k++) { const j = list[k] * 3, c = this.cellIndex(pos[j], pos[j + 1], pos[j + 2]); cellOf[k] = c; counts[c]++; }
    let off = 0; const total = this.total, starts = this.starts, cursor = this.cursor, active = this.active;
    for (let c = 0; c < total; c++) { starts[c] = off; cursor[c] = off; if (counts[c] > 0) active[this.activeCount++] = c; off += counts[c]; }
    starts[total] = off;
    const items = this.items;
    for (let k = 0; k < n; k++) items[cursor[cellOf[k]]++] = list[k];
  }
  /** AABB と重なるセルに属する物体を out に書き出し個数を返す（候補。厳密判定は呼び出し側）。 */
  query(minx, miny, minz, maxx, maxy, maxz, out) {
    const inv = this.inv; let n = 0;
    let x0 = Math.floor((minx - this.ox) * inv), x1 = Math.floor((maxx - this.ox) * inv), z0 = Math.floor((minz - this.oz) * inv), z1 = Math.floor((maxz - this.oz) * inv);
    let y0 = 0, y1 = 0;
    if (!this.planar) { y0 = Math.floor((miny - this.oy) * inv); y1 = Math.floor((maxy - this.oy) * inv); y0 = Math.max(0, y0); y1 = Math.min(this.ny - 1, y1); }
    x0 = Math.max(0, x0); x1 = Math.min(this.nx - 1, x1); z0 = Math.max(0, z0); z1 = Math.min(this.nz - 1, z1);
    // 領域外の物体は端のセルに丸められているため、範囲が端を越えていれば端セルを含める
    if (Math.floor((minx - this.ox) * inv) < 0) x0 = 0; if (Math.floor((maxx - this.ox) * inv) >= this.nx) x1 = this.nx - 1;
    if (Math.floor((minz - this.oz) * inv) < 0) z0 = 0; if (Math.floor((maxz - this.oz) * inv) >= this.nz) z1 = this.nz - 1;
    for (let cy = y0; cy <= y1; cy++) for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      const c = (cy * this.nz + cz) * this.nx + cx, s = this.starts[c], e = s + this.counts[c];
      for (let p = s; p < e; p++) out[n++] = this.items[p];
    }
    return n;
  }
}

const DEFAULTS = {
  gravity: [0, -9.8, 0], bounds: { min: [-50, -50, -50], max: [50, 50, 50] }, walls: true,
  fixedTimeStep: 1 / 60, maxSubSteps: 4, stepBudgetMs: 0, maxCandidatePairs: 20000000,
  cellSize: 0, maxReach: 1, planar: false, iterations: 1, maxCells: 2097152,
  restitution: 0.2, friction: 0.0, boundsRestitution: 0.3, positionCorrection: 0.78, slop: 0.001,
  damping: 0, maxSpeed: 100, precomputeNeighbors: true, timeScale: 1, onContact: null, onWarning: null
};

export class PhysicsWorld {
  constructor(options = {}) {
    const o = this.options = Object.assign({}, DEFAULTS, options);
    o.gravity = Array.from(o.gravity); o.bounds = { min: Array.from(o.bounds.min), max: Array.from(o.bounds.max) };
    for (let k = 0; k < 3; k++) if (!(o.bounds.max[k] > o.bounds.min[k])) throw new RangeError('PhysicsWorld: bounds.max は bounds.min より大きい必要があります。');
    if (!(o.fixedTimeStep > 0)) throw new RangeError('PhysicsWorld: fixedTimeStep は正の数が必要です。');
    this.capacity = 0; this.count = 0; this.aliveCount = 0;
    this.pos = new Float32Array(0); this.vel = new Float32Array(0); this.ext = new Float32Array(0);
    this.invMass = new Float32Array(0); this.rest = new Float32Array(0); this.fric = new Float32Array(0);
    this.shape = new Uint8Array(0); this.alive = new Uint8Array(0);
    this.free = []; this.bodyNode = []; this.instanceBindings = [];
    this._ensure(256);
    this.acc = 0; this.time = 0; this.droppedTime = 0; this.truncatedSteps = 0; this.invalidBodies = 0;
    this._listsDirty = true; this._staticDirty = true; this._built = false;
    this.dynGrid = new UniformGrid(); this.statGrid = new UniformGrid();
    this.dynAll = new Int32Array(0); this.nDynAll = 0; this.dynSmall = new Int32Array(0); this.nDynSmall = 0;
    this.statSmall = new Int32Array(0); this.nStatSmall = 0; this.ovDyn = new Int32Array(0); this.nOvDyn = 0; this.ovStat = new Int32Array(0); this.nOvStat = 0;
    this.cell = 0; this.reach = 1; this.maxSmallHalf = 0;
    this._fwd = new Int32Array(0); this._fwdStarts = null; this._fwdCells = null;
    this._scratch = new Int32Array(0);
    this._cand = 0; this._overlaps = 0; this._truncated = false; this._mode = 0; this._pairs = null;
    this.stats = { bodies: 0, staticBodies: 0, oversizeBodies: 0, substeps: 0, stepMs: 0, integrateMs: 0, gridMs: 0, collisionMs: 0, candidatePairs: 0, overlaps: 0, activeCells: 0, cells: 0, cellSize: 0, droppedTime: 0, truncated: false };
  }
  _ensure(n) {
    if (n <= this.capacity) return;
    const cap = Math.max(n, this.capacity * 2);
    const g32 = (old, k) => { const a = new Float32Array(cap * k); a.set(old); return a; };
    this.pos = g32(this.pos, 3); this.vel = g32(this.vel, 3); this.ext = g32(this.ext, 3); this.invMass = g32(this.invMass, 1); this.rest = g32(this.rest, 1); this.fric = g32(this.fric, 1);
    const s = new Uint8Array(cap); s.set(this.shape); this.shape = s; const a = new Uint8Array(cap); a.set(this.alive); this.alive = a;
    this.capacity = cap;
  }
  reserve(n) { this._ensure(n); return this; }
  setOptions(o) {
    const keys = Object.keys(o);
    for (const k of keys) {
      if (!(k in DEFAULTS)) throw new RangeError('PhysicsWorld.setOptions: 未知のオプション ' + k);
      this.options[k] = (k === 'gravity') ? Array.from(o[k]) : (k === 'bounds' ? { min: Array.from(o[k].min), max: Array.from(o[k].max) } : o[k]);
    }
    if ('cellSize' in o || 'bounds' in o || 'planar' in o || 'maxReach' in o || 'maxCells' in o || 'precomputeNeighbors' in o) this._listsDirty = true;
    if ('bounds' in o) this._staticDirty = true;
    return this;
  }
  _warn(msg) { if (this.options.onWarning) this.options.onWarning(msg); }

  /** 物体を追加し、インデックス(ID)を返す。shape: 'sphere'(radius) | 'box'(halfExtents)。mass<=0 か static:true で静的。 */
  addBody(d = {}) {
    const shape = d.shape === 'box' ? SHAPE_BOX : SHAPE_SPHERE;
    let hx, hy, hz;
    if (shape === SHAPE_SPHERE) { const r = d.radius === undefined ? 0.5 : d.radius; if (!(r > 0) || !isFinite(r)) throw new RangeError('addBody: radius は正の有限数が必要です。'); hx = hy = hz = r; }
    else { const h = d.halfExtents || (d.size ? [d.size[0] / 2, d.size[1] / 2, d.size[2] / 2] : [0.5, 0.5, 0.5]); hx = h[0]; hy = h[1]; hz = h[2]; if (!(hx > 0 && hy > 0 && hz > 0) || !isFinite(hx + hy + hz)) throw new RangeError('addBody: halfExtents/size は正の有限数が必要です。'); }
    const p = d.position || [0, 0, 0], v = d.velocity || [0, 0, 0];
    if (!isFinite(p[0] + p[1] + p[2] + v[0] + v[1] + v[2])) throw new RangeError('addBody: position/velocity は有限数が必要です。');
    let id;
    if (this.free.length) id = this.free.pop(); else { id = this.count++; this._ensure(this.count); }
    const i3 = id * 3;
    this.pos[i3] = p[0]; this.pos[i3 + 1] = p[1]; this.pos[i3 + 2] = p[2]; this.vel[i3] = v[0]; this.vel[i3 + 1] = v[1]; this.vel[i3 + 2] = v[2];
    this.ext[i3] = hx; this.ext[i3 + 1] = hy; this.ext[i3 + 2] = hz; this.shape[id] = shape; this.alive[id] = 1;
    let mass = d.mass;
    if (mass === undefined) mass = shape === SHAPE_SPHERE ? (4 / 3) * Math.PI * hx * hx * hx : 8 * hx * hy * hz;
    this.invMass[id] = (d.static || !(mass > 0) || !isFinite(mass)) ? 0 : 1 / mass;
    this.rest[id] = d.restitution === undefined ? this.options.restitution : d.restitution;
    this.fric[id] = d.friction === undefined ? this.options.friction : d.friction;
    this.bodyNode[id] = d.node || null;
    this.aliveCount++; this._listsDirty = true; if (this.invMass[id] === 0) this._staticDirty = true;
    return id;
  }
  removeBody(i) {
    this._check(i);
    if (this.invMass[i] === 0) this._staticDirty = true;
    this.alive[i] = 0; this.free.push(i); this.bodyNode[i] = null; this.aliveCount--; this._listsDirty = true;
  }
  _check(i) { if (!(i >= 0 && i < this.count) || !this.alive[i]) throw new RangeError('PhysicsWorld: 無効な物体ID ' + i); }
  isAlive(i) { return i >= 0 && i < this.count && this.alive[i] === 1; }
  setPosition(i, x, y, z) { this._check(i); const j = i * 3; this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z; if (this.invMass[i] === 0) this._staticDirty = true; return this; }
  setVelocity(i, x, y, z) { this._check(i); const j = i * 3; this.vel[j] = x; this.vel[j + 1] = y; this.vel[j + 2] = z; return this; }
  getPosition(i, out = [0, 0, 0]) { this._check(i); const j = i * 3; out[0] = this.pos[j]; out[1] = this.pos[j + 1]; out[2] = this.pos[j + 2]; return out; }
  getVelocity(i, out = [0, 0, 0]) { this._check(i); const j = i * 3; out[0] = this.vel[j]; out[1] = this.vel[j + 1]; out[2] = this.vel[j + 2]; return out; }
  /** mass<=0 または Infinity で静的化 */
  setMass(i, mass) { this._check(i); const was = this.invMass[i] === 0; this.invMass[i] = (mass > 0 && isFinite(mass)) ? 1 / mass : 0; if (was || this.invMass[i] === 0) this._staticDirty = true; this._listsDirty = true; return this; }
  applyImpulse(i, x, y, z) { this._check(i); const im = this.invMass[i], j = i * 3; this.vel[j] += x * im; this.vel[j + 1] += y * im; this.vel[j + 2] += z * im; return this; }
  clear() { this.count = 0; this.aliveCount = 0; this.free.length = 0; this.bodyNode.length = 0; this.instanceBindings.length = 0; this.alive.fill(0); this.acc = 0; this._listsDirty = true; this._staticDirty = true; return this; }

  /* ---- 描画オブジェクトとの同期 ---- */
  bindNode(i, node) { this._check(i); this.bodyNode[i] = node; return this; }
  /** 物体 firstBody..+count-1 を InstancedMesh のインスタンス instanceStart.. に対応づける。 */
  bindInstanced(mesh, firstBody, count, instanceStart = 0) { this.instanceBindings.push({ mesh, firstBody, count, instanceStart }); return this; }
  unbindInstanced(mesh) { this.instanceBindings = this.instanceBindings.filter(b => b.mesh !== mesh); }
  syncTransforms() {
    const pos = this.pos;
    for (let i = 0; i < this.count; i++) {
      const n = this.bodyNode[i];
      if (n && this.alive[i]) { const j = i * 3; if (n.position[0] !== pos[j] || n.position[1] !== pos[j + 1] || n.position[2] !== pos[j + 2]) { n.position[0] = pos[j]; n.position[1] = pos[j + 1]; n.position[2] = pos[j + 2]; n.markDirty(); } }
    }
    for (const b of this.instanceBindings) {
      const m = b.mesh.matrices, n = Math.min(b.count, b.mesh.count - b.instanceStart);
      for (let k = 0; k < n; k++) { const j = (b.firstBody + k) * 3, o = (b.instanceStart + k) * 16; m[o + 12] = pos[j]; m[o + 13] = pos[j + 1]; m[o + 14] = pos[j + 2]; }
      if (n > 0) b.mesh.markInstancesDirty(b.instanceStart, b.instanceStart + n);
    }
  }

  /* ---- ブロードフェーズの準備 ---- */
  _maxHalf(i) { const j = i * 3; return Math.max(this.ext[j], this.ext[j + 1], this.ext[j + 2]); }
  _rebuildLists() {
    const o = this.options, n = this.count, halves = [];
    for (let i = 0; i < n; i++) if (this.alive[i]) halves.push(this._maxHalf(i));
    // セル幅: 指定がなければ 90 パーセンタイルの半径 × 2.2（試作の実測最良値 0.60 は半径 0.22〜0.28 に相当）
    let cell = o.cellSize;
    if (!(cell > 0)) {
      if (halves.length) { halves.sort((a, b) => a - b); cell = 2.2 * halves[Math.min(halves.length - 1, Math.floor(halves.length * 0.9))]; } else cell = 1;
    }
    const b = o.bounds, size = [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
    const dims = c => [Math.max(1, Math.ceil(size[0] / c)), o.planar ? 1 : Math.max(1, Math.ceil(size[1] / c)), Math.max(1, Math.ceil(size[2] / c))];
    let d = dims(cell);
    while (d[0] * d[1] * d[2] > o.maxCells) { cell *= 1.25; d = dims(cell); this._warn('セル数が maxCells を超えるためセル幅を ' + cell.toFixed(3) + ' に拡大しました。'); }
    const smallLimit = cell * Math.max(1, o.maxReach) / 2;
    if (this.dynAll.length < n) { this.dynAll = new Int32Array(this.capacity); this.dynSmall = new Int32Array(this.capacity); this.statSmall = new Int32Array(this.capacity); this.ovDyn = new Int32Array(this.capacity); this.ovStat = new Int32Array(this.capacity); this._scratch = new Int32Array(this.capacity); }
    let nA = 0, nD = 0, nS = 0, nOD = 0, nOS = 0, maxSmall = 0;
    for (let i = 0; i < n; i++) {
      if (!this.alive[i]) continue;
      const h = this._maxHalf(i), st = this.invMass[i] === 0;
      if (!st) this.dynAll[nA++] = i;
      if (h <= smallLimit) { if (h > maxSmall) maxSmall = h; if (st) this.statSmall[nS++] = i; else this.dynSmall[nD++] = i; }
      else if (st) this.ovStat[nOS++] = i; else this.ovDyn[nOD++] = i;
    }
    if (nOD + nOS > 256 && !this._warnedOversize) { this._warnedOversize = true; this._warn('セル幅(' + cell.toFixed(3) + ')に対して大きすぎる物体が ' + (nOD + nOS) + ' 個あり、これらは総当たり(O(k²))で処理されます。cellSize を物体直径以上（目安: 半径の2.2倍以上）にするか、maxReach を上げてください。'); }
    this.nDynAll = nA; this.nDynSmall = nD; this.nStatSmall = nS; this.nOvDyn = nOD; this.nOvStat = nOS;
    this.maxSmallHalf = maxSmall; this.reach = Math.max(1, Math.ceil(2 * maxSmall / cell - 1e-9));
    const gridChanged = cell !== this.cell || this.dynGrid.nx !== d[0] || this.dynGrid.nz !== d[2] || this.dynGrid.planar !== o.planar || this.dynGrid.ny !== (o.planar ? 1 : d[1]) || this.dynGrid.ox !== b.min[0];
    this.cell = cell;
    if (gridChanged) {
      this.dynGrid.configure(b.min[0], b.min[1], b.min[2], cell, d[0], d[1], d[2], o.planar);
      this.statGrid.configure(b.min[0], b.min[1], b.min[2], cell, d[0], d[1], d[2], o.planar);
      this._staticDirty = true; this._buildNeighbors();
    }
    this._rebuildFwdOffsets();
    this._listsDirty = false; this._built = true;
  }
  _rebuildFwdOffsets() {
    const R = this.reach, planar = this.options.planar, list = [];
    for (let dy = planar ? 0 : -R; dy <= (planar ? 0 : R); dy++) for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      if (dy > 0 || (dy === 0 && (dz > 0 || (dz === 0 && dx > 0)))) list.push(dx, dy, dz);
    }
    this._fwd = Int32Array.from(list);
    if (this._fwdReach !== R) { this._fwdReach = R; this._buildNeighbors(); }
  }
  /** 事前計算した隣接セル表（試作で有効だった方式）。大きすぎる場合は作らず都度計算する。 */
  _buildNeighbors() {
    this._fwdStarts = null; this._fwdCells = null;
    if (!this.options.precomputeNeighbors || !this._fwd.length) return;
    const g = this.dynGrid, per = this._fwd.length / 3;
    if (g.total * per > 4000000) return;
    const nx = g.nx, ny = g.ny, nz = g.nz, fwd = this._fwd, starts = new Int32Array(g.total + 1);
    let cnt = 0;
    for (let pass = 0; pass < 2; pass++) {
      const cells = pass ? new Int32Array(cnt) : null; let c = 0, w = 0;
      for (let cy = 0; cy < ny; cy++) for (let cz = 0; cz < nz; cz++) for (let cx = 0; cx < nx; cx++, c++) {
        if (pass === 0) starts[c] = cnt; 
        for (let k = 0; k < fwd.length; k += 3) {
          const x = cx + fwd[k], y = cy + fwd[k + 1], z = cz + fwd[k + 2];
          if (x < 0 || x >= nx || y < 0 || y >= ny || z < 0 || z >= nz) continue;
          if (pass) cells[w++] = (y * nz + z) * nx + x; else cnt++;
        }
      }
      if (pass === 0) starts[g.total] = cnt; else { this._fwdCells = cells; this._fwdStarts = starts; }
    }
  }
  /** グリッドを現在位置で構築する（積分は行わない）。テスト・デバッグ用に公開。 */
  prepareBroadphase() {
    if (this._listsDirty || !this._built) this._rebuildLists();
    if (this._staticDirty) { this.statGrid.rebuild(this.statSmall, this.nStatSmall, this.pos); this._staticDirty = false; }
    this.dynGrid.rebuild(this.dynSmall, this.nDynSmall, this.pos);
  }

  /* ---- ペア列挙 (fn(i,j) を候補ごとに呼ぶ) ---- */
  _enumerate(fn) {
    const dg = this.dynGrid, sg = this.statGrid, counts = dg.counts, starts = dg.starts, items = dg.items, budget = this.options.maxCandidatePairs;
    let checks = 0;
    const fwdS = this._fwdStarts, fwdC = this._fwdCells, fwd = this._fwd, nx = dg.nx, ny = dg.ny, nz = dg.nz, R = this.reach, planar = dg.planar;
    // 1) 動的小物体どうし
    for (let ai = 0; ai < dg.activeCount; ai++) {
      const cell = dg.active[ai], s = starts[cell], e = s + counts[cell];
      for (let p = s; p < e; p++) { const i = items[p]; for (let q = p + 1; q < e; q++) { checks++; fn(i, items[q]); } }
      if (fwdS) {
        for (let ni = fwdS[cell], ne = fwdS[cell + 1]; ni < ne; ni++) {
          const other = fwdC[ni], os = starts[other], oe = os + counts[other];
          if (os === oe) continue;
          for (let p = s; p < e; p++) { const i = items[p]; for (let q = os; q < oe; q++) { checks++; fn(i, items[q]); } }
        }
      } else {
        const cx = cell % nx, t = (cell / nx) | 0, cz = t % nz, cy = (t / nz) | 0;
        for (let k = 0; k < fwd.length; k += 3) {
          const x = cx + fwd[k], y = cy + fwd[k + 1], z = cz + fwd[k + 2];
          if (x < 0 || x >= nx || y < 0 || y >= ny || z < 0 || z >= nz) continue;
          const other = (y * nz + z) * nx + x, os = starts[other], oe = os + counts[other];
          if (os === oe) continue;
          for (let p = s; p < e; p++) { const i = items[p]; for (let q = os; q < oe; q++) { checks++; fn(i, items[q]); } }
        }
      }
      if (checks > budget) { this._truncated = true; this._cand = checks; return; }
    }
    // 2) 動的小物体 × 静的小物体（静的グリッドは別構築・同一セル配置）
    if (sg.itemCount > 0) {
      const sc = sg.counts, ss = sg.starts, si = sg.items;
      for (let ai = 0; ai < dg.activeCount; ai++) {
        const cell = dg.active[ai], s = starts[cell], e = s + counts[cell];
        const cx = cell % nx, t = (cell / nx) | 0, cz = t % nz, cy = (t / nz) | 0;
        for (let dy = planar ? 0 : -R; dy <= (planar ? 0 : R); dy++) for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
          const x = cx + dx, y = cy + dy, z = cz + dz;
          if (x < 0 || x >= nx || y < 0 || y >= ny || z < 0 || z >= nz) continue;
          const other = (y * nz + z) * nx + x, os = ss[other], oe = os + sc[other];
          if (os === oe) continue;
          for (let p = s; p < e; p++) { const i = items[p]; for (let q = os; q < oe; q++) { checks++; fn(i, si[q]); } }
        }
        if (checks > budget) { this._truncated = true; this._cand = checks; return; }
      }
    }
    // 3) 巨大（oversize）物体: グリッドをAABBで問い合わせ + 巨大物体どうしは総当たり
    const pos = this.pos, ext = this.ext, scratch = this._scratch, m = this.maxSmallHalf;
    for (let a = 0; a < this.nOvDyn; a++) {
      const i = this.ovDyn[a], j = i * 3;
      const x0 = pos[j] - ext[j] - m, y0 = pos[j + 1] - ext[j + 1] - m, z0 = pos[j + 2] - ext[j + 2] - m, x1 = pos[j] + ext[j] + m, y1 = pos[j + 1] + ext[j + 1] + m, z1 = pos[j + 2] + ext[j + 2] + m;
      let n = dg.query(x0, y0, z0, x1, y1, z1, scratch); for (let k = 0; k < n; k++) { checks++; fn(i, scratch[k]); }
      n = sg.query(x0, y0, z0, x1, y1, z1, scratch); for (let k = 0; k < n; k++) { checks++; fn(i, scratch[k]); }
      for (let b = a + 1; b < this.nOvDyn; b++) { checks++; fn(i, this.ovDyn[b]); }
      for (let b = 0; b < this.nOvStat; b++) { checks++; fn(i, this.ovStat[b]); }
      if (checks > budget) { this._truncated = true; this._cand = checks; return; }
    }
    for (let a = 0; a < this.nOvStat; a++) {
      const i = this.ovStat[a], j = i * 3;
      const n = dg.query(pos[j] - ext[j] - m, pos[j + 1] - ext[j + 1] - m, pos[j + 2] - ext[j + 2] - m, pos[j] + ext[j] + m, pos[j + 1] + ext[j + 1] + m, pos[j + 2] + ext[j + 2] + m, scratch);
      for (let k = 0; k < n; k++) { checks++; fn(i, scratch[k]); }
    }
    this._cand = checks;
  }

  /** テスト用: 現在位置での候補ペア (i<j 正規化) を配列で返す。重複や漏れの検証に使う。 */
  computeCandidatePairs() {
    this.prepareBroadphase();
    const out = []; this._truncated = false;
    this._enumerate((i, j) => out.push(i < j ? [i, j] : [j, i]));
    return out;
  }
  /** テスト用: 総当たりで本当に重なっている組 (少なくとも一方が動的)。 */
  bruteForceOverlaps() {
    const out = [];
    for (let i = 0; i < this.count; i++) { if (!this.alive[i]) continue; for (let j = i + 1; j < this.count; j++) { if (!this.alive[j]) continue; if (this.invMass[i] === 0 && this.invMass[j] === 0) continue; if (this._contact(i, j)) out.push([i, j]); } }
    return out;
  }

  /* ---- 狭域判定と応答 ---- */
  _contact(i, j) {
    const p = this.pos, e = this.ext, a = i * 3, b = j * 3, si = this.shape[i], sj = this.shape[j];
    if (si === SHAPE_SPHERE && sj === SHAPE_SPHERE) {
      const dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2], r = e[a] + e[b], d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= r * r) return false;
      const d = Math.sqrt(d2);
      if (d < 1e-7) { const ang = (i * 2.399963229728653 + j * 0.017) % (Math.PI * 2); this._nx = Math.cos(ang); this._ny = 0; this._nz = Math.sin(ang); this._pen = r; }
      else { this._nx = dx / d; this._ny = dy / d; this._nz = dz / d; this._pen = r - d; }
      return true;
    }
    if (si === SHAPE_BOX && sj === SHAPE_BOX) {
      const dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2];
      const ox = e[a] + e[b] - Math.abs(dx), oy = e[a + 1] + e[b + 1] - Math.abs(dy), oz = e[a + 2] + e[b + 2] - Math.abs(dz);
      if (ox <= 0 || oy <= 0 || oz <= 0) return false;
      this._nx = 0; this._ny = 0; this._nz = 0;
      if (ox <= oy && ox <= oz) { this._nx = dx < 0 ? -1 : 1; this._pen = ox; } else if (oy <= oz) { this._ny = dy < 0 ? -1 : 1; this._pen = oy; } else { this._nz = dz < 0 ? -1 : 1; this._pen = oz; }
      return true;
    }
    // 球 × 箱
    const sph = si === SHAPE_SPHERE ? a : b, box = si === SHAPE_SPHERE ? b : a, r = e[sph];
    const cx = p[sph], cy = p[sph + 1], cz = p[sph + 2];
    const qx = Math.max(p[box] - e[box], Math.min(cx, p[box] + e[box])), qy = Math.max(p[box + 1] - e[box + 1], Math.min(cy, p[box + 1] + e[box + 1])), qz = Math.max(p[box + 2] - e[box + 2], Math.min(cz, p[box + 2] + e[box + 2]));
    let vx = cx - qx, vy = cy - qy, vz = cz - qz; const d2 = vx * vx + vy * vy + vz * vz;
    let nx, ny, nz, pen; // 箱→球 向きの法線
    if (d2 > 0) { if (d2 >= r * r) return false; const d = Math.sqrt(d2); nx = vx / d; ny = vy / d; nz = vz / d; pen = r - d; }
    else { // 中心が箱の内部: 最も近い面から押し出す
      const dx = cx - p[box], dy = cy - p[box + 1], dz = cz - p[box + 2];
      const fx = e[box] - Math.abs(dx), fy = e[box + 1] - Math.abs(dy), fz = e[box + 2] - Math.abs(dz);
      nx = ny = nz = 0;
      if (fx <= fy && fx <= fz) { nx = dx < 0 ? -1 : 1; pen = r + fx; } else if (fy <= fz) { ny = dy < 0 ? -1 : 1; pen = r + fy; } else { nz = dz < 0 ? -1 : 1; pen = r + fz; }
    }
    // i→j の向きに揃える
    if (si === SHAPE_SPHERE) { this._nx = -nx; this._ny = -ny; this._nz = -nz; } else { this._nx = nx; this._ny = ny; this._nz = nz; }
    this._pen = pen; return true;
  }
  _resolve(i, j) {
    if (!this._contact(i, j)) return;
    this._overlaps++;
    const o = this.options, nx = this._nx, ny = this._ny, nz = this._nz, pen = this._pen;
    const im = this.invMass, imi = im[i], imj = im[j], invSum = imi + imj;
    if (invSum === 0) return;
    const pos = this.pos, vel = this.vel, a = i * 3, b = j * 3;
    const corr = Math.max(0, pen - o.slop) * o.positionCorrection / invSum;
    if (imi > 0) { pos[a] -= nx * corr * imi; pos[a + 1] -= ny * corr * imi; pos[a + 2] -= nz * corr * imi; }
    if (imj > 0) { pos[b] += nx * corr * imj; pos[b + 1] += ny * corr * imj; pos[b + 2] += nz * corr * imj; }
    const rvx = vel[b] - vel[a], rvy = vel[b + 1] - vel[a + 1], rvz = vel[b + 2] - vel[a + 2], vn = rvx * nx + rvy * ny + rvz * nz;
    let jn = 0;
    if (vn < 0) {
      const e = Math.min(this.rest[i], this.rest[j]); jn = -(1 + e) * vn / invSum;
      vel[a] -= jn * imi * nx; vel[a + 1] -= jn * imi * ny; vel[a + 2] -= jn * imi * nz; vel[b] += jn * imj * nx; vel[b + 1] += jn * imj * ny; vel[b + 2] += jn * imj * nz;
      const mu = Math.sqrt(this.fric[i] * this.fric[j]);
      if (mu > 0) {
        const wx = vel[b] - vel[a], wy = vel[b + 1] - vel[a + 1], wz = vel[b + 2] - vel[a + 2], wn = wx * nx + wy * ny + wz * nz;
        const tx = wx - wn * nx, ty = wy - wn * ny, tz = wz - wn * nz, tl = Math.sqrt(tx * tx + ty * ty + tz * tz);
        if (tl > 1e-6) { const jt = Math.min(tl / invSum, mu * jn), ux = tx / tl, uy = ty / tl, uz = tz / tl; vel[a] += jt * imi * ux; vel[a + 1] += jt * imi * uy; vel[a + 2] += jt * imi * uz; vel[b] -= jt * imj * ux; vel[b + 1] -= jt * imj * uy; vel[b + 2] -= jt * imj * uz; }
      }
    }
    if (o.onContact) o.onContact(i, j, nx, ny, nz, pen);
  }

  /** 1ステップ(固定dt)を進める。通常は advance() を使う。 */
  step(dt) {
    const t0 = now(), o = this.options, pos = this.pos, vel = this.vel, ext = this.ext;
    if (this._listsDirty || !this._built) this._rebuildLists();
    const g = o.gravity, gx = g[0] * dt, gy = g[1] * dt, gz = g[2] * dt, damp = o.damping > 0 ? Math.exp(-o.damping * dt) : 1, maxS2 = o.maxSpeed * o.maxSpeed;
    const bmin = o.bounds.min, bmax = o.bounds.max, walls = o.walls, br = o.boundsRestitution;
    let invalid = 0;
    for (let k = 0; k < this.nDynAll; k++) {
      const i = this.dynAll[k], j = i * 3;
      let vx = (vel[j] + gx) * damp, vy = (vel[j + 1] + gy) * damp, vz = (vel[j + 2] + gz) * damp;
      const s2 = vx * vx + vy * vy + vz * vz;
      if (s2 > maxS2) { const f = o.maxSpeed / Math.sqrt(s2); vx *= f; vy *= f; vz *= f; }
      let x = pos[j] + vx * dt, y = pos[j + 1] + vy * dt, z = pos[j + 2] + vz * dt;
      if (!isFinite(x + y + z + vx + vy + vz)) { this.alive[i] = 0; this.free.push(i); this.aliveCount--; invalid++; continue; }
      if (walls) {
        let lo = bmin[0] + ext[j], hi = bmax[0] - ext[j];
        if (x < lo) { x = lo; if (vx < 0) vx = -vx * br; } else if (x > hi) { x = hi; if (vx > 0) vx = -vx * br; }
        lo = bmin[1] + ext[j + 1]; hi = bmax[1] - ext[j + 1];
        if (y < lo) { y = lo; if (vy < 0) vy = -vy * br; } else if (y > hi) { y = hi; if (vy > 0) vy = -vy * br; }
        lo = bmin[2] + ext[j + 2]; hi = bmax[2] - ext[j + 2];
        if (z < lo) { z = lo; if (vz < 0) vz = -vz * br; } else if (z > hi) { z = hi; if (vz > 0) vz = -vz * br; }
      }
      vel[j] = vx; vel[j + 1] = vy; vel[j + 2] = vz; pos[j] = x; pos[j + 1] = y; pos[j + 2] = z;
    }
    if (invalid) { this.invalidBodies += invalid; this._listsDirty = true; this._warn('非有限値になった物体を ' + invalid + ' 個無効化しました。'); this._rebuildLists(); }
    const t1 = now();
    if (this._staticDirty) { this.statGrid.rebuild(this.statSmall, this.nStatSmall, pos); this._staticDirty = false; }
    this.dynGrid.rebuild(this.dynSmall, this.nDynSmall, pos);
    const t2 = now();
    this._overlaps = 0; this._truncated = false; this._cand = 0;
    const resolve = this._resolveBound || (this._resolveBound = (i, j) => this._resolve(i, j));
    let cand = 0;
    for (let it = 0; it < Math.max(1, o.iterations); it++) { this._enumerate(resolve); cand = this._cand; if (this._truncated) break; }
    if (walls) { // 補正で壁外へ押し出された物体を戻す
      for (let k = 0; k < this.nDynAll; k++) {
        const i = this.dynAll[k]; if (!this.alive[i]) continue; const j = i * 3;
        for (let a = 0; a < 3; a++) { const lo = bmin[a] + ext[j + a], hi = bmax[a] - ext[j + a]; if (pos[j + a] < lo) pos[j + a] = lo; else if (pos[j + a] > hi) pos[j + a] = hi; }
      }
    }
    const t3 = now();
    if (this._truncated) { this.truncatedSteps++; this._warn('候補ペア数が maxCandidatePairs=' + o.maxCandidatePairs + ' を超えたため、このステップの衝突処理を打ち切りました。'); }
    const s = this.stats;
    s.integrateMs += t1 - t0; s.gridMs += t2 - t1; s.collisionMs += t3 - t2; s.stepMs += t3 - t0;
    s.candidatePairs = cand; s.overlaps = this._overlaps; s.activeCells = this.dynGrid.activeCount; s.truncated = this._truncated;
    this.time += dt;
    return s;
  }

  /** 実時間 dt (秒) を固定刻みに分割して進める。substep 数・時間予算で上限をかけ、超過分は破棄する。 */
  advance(dt) {
    const o = this.options, s = this.stats;
    s.integrateMs = 0; s.gridMs = 0; s.collisionMs = 0; s.stepMs = 0; s.substeps = 0;
    if (!(dt > 0) || !isFinite(dt)) { this._fillStats(); return 0; }
    this.acc += dt * o.timeScale;
    const fixed = o.fixedTimeStep, start = now();
    let steps = 0;
    while (this.acc >= fixed && steps < o.maxSubSteps) {
      this.step(fixed); this.acc -= fixed; steps++;
      if (o.stepBudgetMs > 0 && now() - start > o.stepBudgetMs) break;
    }
    if (this.acc >= fixed) { this.droppedTime += this.acc; this.acc = 0; } // 追いつけない分は捨てて固まりを防ぐ
    s.substeps = steps; this._fillStats();
    return steps;
  }
  _fillStats() {
    const s = this.stats; s.bodies = this.aliveCount; s.oversizeBodies = this.nOvDyn + this.nOvStat; s.staticBodies = this.nStatSmall + this.nOvStat;
    s.cells = this.dynGrid.total; s.cellSize = this.cell; s.droppedTime = this.droppedTime;
  }

  /** O(N) のレイキャスト。最も近い物体 {index, distance, point, normal} を返す。 */
  raycast(origin, dir, maxDistance = Infinity) {
    const l = Math.hypot(dir[0], dir[1], dir[2]) || 1, d = [dir[0] / l, dir[1] / l, dir[2] / l];
    let best = null;
    for (let i = 0; i < this.count; i++) {
      if (!this.alive[i]) continue; const j = i * 3; let t = -1, n = null;
      if (this.shape[i] === SHAPE_SPHERE) {
        const ox = origin[0] - this.pos[j], oy = origin[1] - this.pos[j + 1], oz = origin[2] - this.pos[j + 2], r = this.ext[j];
        const b = ox * d[0] + oy * d[1] + oz * d[2], c = ox * ox + oy * oy + oz * oz - r * r, disc = b * b - c;
        if (disc >= 0) { const s = Math.sqrt(disc); t = -b - s; if (t < 0) t = -b + s; if (t >= 0) n = [(ox + d[0] * t) / r, (oy + d[1] * t) / r, (oz + d[2] * t) / r]; else t = -1; }
      } else {
        let t0 = 0, t1 = Infinity, ax = -1, sg = 0;
        for (let k = 0; k < 3; k++) {
          const lo = this.pos[j + k] - this.ext[j + k], hi = this.pos[j + k] + this.ext[j + k];
          if (Math.abs(d[k]) < 1e-14) { if (origin[k] < lo || origin[k] > hi) { t1 = -1; break; } continue; }
          let a = (lo - origin[k]) / d[k], b = (hi - origin[k]) / d[k], s = -1; if (a > b) { const x = a; a = b; b = x; s = 1; }
          if (a > t0) { t0 = a; ax = k; sg = s; } if (b < t1) t1 = b; if (t0 > t1) { t1 = -1; break; }
        }
        if (t1 >= 0 && t0 <= t1) { t = t0; n = [0, 0, 0]; if (ax >= 0) n[ax] = sg; }
      }
      if (t >= 0 && t <= maxDistance && (!best || t < best.distance)) best = { index: i, distance: t, point: [origin[0] + d[0] * t, origin[1] + d[1] * t, origin[2] + d[2] * t], normal: n };
    }
    return best;
  }

  toJSON() {
    const n = this.count;
    return { format: 'massive-engine-physics', version: 1, options: Object.assign({}, this.options, { onContact: undefined, onWarning: undefined }), count: n,
      pos: f32ToBase64(this.pos.subarray(0, n * 3)), vel: f32ToBase64(this.vel.subarray(0, n * 3)), ext: f32ToBase64(this.ext.subarray(0, n * 3)),
      invMass: f32ToBase64(this.invMass.subarray(0, n)), rest: f32ToBase64(this.rest.subarray(0, n)), fric: f32ToBase64(this.fric.subarray(0, n)),
      shape: Array.from(this.shape.subarray(0, n)), alive: Array.from(this.alive.subarray(0, n)) };
  }
  static fromJSON(j) {
    if (!j || j.format !== 'massive-engine-physics') throw new MassiveEngineError('物理JSONの形式が不正です。', 'E_SCENE_FORMAT');
    if (j.version !== 1) throw new MassiveEngineError('未対応の物理JSONバージョン: ' + j.version, 'E_SCENE_FORMAT');
    const w = new PhysicsWorld(j.options), n = j.count; w._ensure(n); w.count = n;
    w.pos.set(base64ToF32(j.pos)); w.vel.set(base64ToF32(j.vel)); w.ext.set(base64ToF32(j.ext)); w.invMass.set(base64ToF32(j.invMass)); w.rest.set(base64ToF32(j.rest)); w.fric.set(base64ToF32(j.fric));
    w.shape.set(j.shape); w.alive.set(j.alive); w.aliveCount = 0;
    for (let i = 0; i < n; i++) { if (w.alive[i]) w.aliveCount++; else w.free.push(i); }
    return w;
  }
}

/* ---------------- Web Worker 用ホスト（メッセージ処理は純粋関数なので Node でもテスト可能） ---------------- */

/**
 * post(message, transferList) を渡して使う。handle(message) に受信メッセージを渡す。
 * プロトコル: init / addBodies / call / step / dispose  →  ready / bodies / result / error
 */
export function createPhysicsHost(post) {
  let world = null;
  const CALLS = new Set(['setPosition', 'setVelocity', 'setMass', 'removeBody', 'setOptions', 'applyImpulse', 'clear']);
  return {
    get world() { return world; },
    handle(msg) {
      try {
        switch (msg.type) {
          case 'init': world = new PhysicsWorld(Object.assign({}, msg.options, { onContact: null, onWarning: w => post({ type: 'warning', message: w }) })); post({ type: 'ready' }); break;
          case 'addBodies': {
            if (!world) throw new Error('worker: init が先に必要です。');
            const d = msg.data, first = []; // d.* はTypedArray。球/箱は shape で判別
            for (let k = 0; k < msg.count; k++) {
              const j = k * 3, isBox = d.shape[k] === SHAPE_BOX;
              const id = world.addBody({ shape: isBox ? 'box' : 'sphere', radius: d.ext[j], halfExtents: [d.ext[j], d.ext[j + 1], d.ext[j + 2]], position: [d.pos[j], d.pos[j + 1], d.pos[j + 2]], velocity: [d.vel[j], d.vel[j + 1], d.vel[j + 2]], mass: d.invMass[k] > 0 ? 1 / d.invMass[k] : 0, static: d.invMass[k] === 0, restitution: d.rest[k], friction: d.fric[k] });
              first.push(id);
            }
            post({ type: 'bodies', ids: first, token: msg.token }); break;
          }
          case 'call': if (!world) throw new Error('worker: init が先に必要です。'); if (!CALLS.has(msg.method)) throw new Error('worker: 許可されていないメソッド ' + msg.method); world[msg.method](...msg.args); break;
          case 'step': {
            if (!world) throw new Error('worker: init が先に必要です。');
            const steps = world.advance(msg.dt);
            const n = world.count, buf = new Float32Array(n * 3); buf.set(world.pos.subarray(0, n * 3));
            post({ type: 'result', pos: buf, count: n, steps, stats: Object.assign({}, world.stats) }, [buf.buffer]); break;
          }
          case 'dispose': world = null; break;
          default: throw new Error('worker: 未知のメッセージ ' + msg.type);
        }
      } catch (e) { post({ type: 'error', message: String(e && e.message || e) }); }
    }
  };
}
