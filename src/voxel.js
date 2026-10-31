import { Geometry } from './geometry.js';
import { Material } from './material.js';
import { Mesh, Group } from './node.js';
import { parseColor, MassiveEngineError } from './util.js';

const FACES = [
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], shade: 0.8 }, { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], shade: 0.8 },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], shade: 1.0 }, { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], shade: 0.5 },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], shade: 0.68 }, { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], shade: 0.68 }
];
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const fl = Math.floor;

/**
 * ボクセル（ブロック）ワールド: チャンク分割 + 隠面除去メッシュ生成 + チャンク単位の再構築。
 * BLOCKCRAFT 型ゲームの「地形チャンク」を MASSIVE ENGINE で描画するための部品。
 * block id 0 = 空気。palette[id] = 色。transparent な id は隣接面を隠さない。
 */
export class VoxelWorld {
  constructor(o = {}) {
    this.chunkSize = o.chunkSize || 16;
    if (this.chunkSize < 2 || this.chunkSize > 64) throw new RangeError('VoxelWorld: chunkSize は 2〜64。');
    this.palette = (o.palette || []).map(c => c ? parseColor(c, [1, 1, 1]) : null);
    this.transparent = new Set(o.transparentIds || []);
    this.material = o.material || new Material({ vertexColors: true, specular: 0.05 });
    this.root = new Group(o.name || 'VoxelWorld'); this.parent = o.parent || null; if (this.parent) this.parent.add(this.root);
    this.jobs = o.jobs || null; this.chunks = new Map(); this.castShadow = o.castShadow !== false; this.receiveShadow = o.receiveShadow !== false;
    this.stats = { chunks: 0, meshedChunks: 0, faces: 0, triangles: 0, dirty: 0, rebuilds: 0, lastRebuildMs: 0 };
    this.disposed = false;
  }
  _key(cx, cy, cz) { return cx + ',' + cy + ',' + cz; }
  _chunk(cx, cy, cz, create) {
    const k = this._key(cx, cy, cz); let c = this.chunks.get(k);
    if (!c && create) { const cs = this.chunkSize; c = { cx, cy, cz, data: new Uint8Array(cs * cs * cs), count: 0, mesh: null, version: 0, queued: false, dirty: false }; this.chunks.set(k, c); this.stats.chunks = this.chunks.size; }
    return c || null;
  }
  getBlock(x, y, z) {
    const cs = this.chunkSize, c = this._chunk(fl(x / cs), fl(y / cs), fl(z / cs), false); if (!c) return 0;
    return c.data[((y - c.cy * cs) * cs + (z - c.cz * cs)) * cs + (x - c.cx * cs)];
  }
  /** ブロックを設定。範囲 0..255。変更されたチャンク（境界なら隣も）が再構築対象になる。戻り値: 変更があったか */
  setBlock(x, y, z, id) {
    if (this.disposed) throw new MassiveEngineError('VoxelWorld は破棄済みです。', 'E_DISPOSED');
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) throw new TypeError('setBlock: 座標は整数が必要です。');
    if (!(id >= 0 && id <= 255) || id !== (id | 0)) throw new RangeError('setBlock: id は 0〜255 の整数。');
    const cs = this.chunkSize, c = this._chunk(fl(x / cs), fl(y / cs), fl(z / cs), id !== 0); if (!c) return false;
    const lx = x - c.cx * cs, ly = y - c.cy * cs, lz = z - c.cz * cs, i = (ly * cs + lz) * cs + lx, old = c.data[i];
    if (old === id) return false;
    c.data[i] = id; c.count += (id !== 0 ? 1 : 0) - (old !== 0 ? 1 : 0);
    this._markDirty(c);
    if (lx === 0) this._markNeighbor(c.cx - 1, c.cy, c.cz); if (lx === cs - 1) this._markNeighbor(c.cx + 1, c.cy, c.cz);
    if (ly === 0) this._markNeighbor(c.cx, c.cy - 1, c.cz); if (ly === cs - 1) this._markNeighbor(c.cx, c.cy + 1, c.cz);
    if (lz === 0) this._markNeighbor(c.cx, c.cy, c.cz - 1); if (lz === cs - 1) this._markNeighbor(c.cx, c.cy, c.cz + 1);
    return true;
  }
  _markNeighbor(cx, cy, cz) { const n = this._chunk(cx, cy, cz, false); if (n) this._markDirty(n); }
  _markDirty(c) {
    c.version++; if (!c.dirty) { c.dirty = true; this.stats.dirty++; }
    if (this.jobs && !c.queued) { c.queued = true; this.jobs.add(() => this._rebuildJob(c), { name: 'voxel-chunk' }); }
  }
  /** fn(x,y,z) -> id で範囲を一括生成（個別の再構築予約を避ける）。 */
  generate(min, max, fn) {
    const saved = this.jobs; this.jobs = null;
    for (let x = min[0]; x < max[0]; x++) for (let z = min[2]; z < max[2]; z++) for (let y = min[1]; y < max[1]; y++) { const id = fn(x, y, z); if (id) this.setBlock(x, y, z, id); }
    this.jobs = saved;
    for (const c of this.chunks.values()) if (c.dirty && this.jobs && !c.queued) { c.queued = true; this.jobs.add(() => this._rebuildJob(c), { name: 'voxel-chunk' }); }
  }
  *_rebuildJob(c) {
    c.queued = false; const v = c.version; const gen = this._mesh(c);
    for (;;) { const r = gen.next(); if (r.done) { if (c.version === v) this._apply(c, r.value); else if (!c.queued) { c.queued = true; this.jobs.add(() => this._rebuildJob(c), { name: 'voxel-chunk' }); } return; } yield; if (c.version !== v) return; }
  }
  /** 同期で全ダーティチャンクを再構築 */
  flush() { for (const c of this.chunks.values()) if (c.dirty) this.rebuildChunk(c); return this; }
  rebuildChunk(c) { const g = this._mesh(c); let r; do { r = g.next(); } while (!r.done); this._apply(c, r.value); }
  *_mesh(c) {
    const cs = this.chunkSize, pos = [], nor = [], col = [], idx = [], ox = c.cx * cs, oy = c.cy * cs, oz = c.cz * cs;
    let faces = 0;
    if (c.count > 0) for (let y = 0; y < cs; y++) {
      for (let z = 0; z < cs; z++) for (let x = 0; x < cs; x++) {
        const id = c.data[(y * cs + z) * cs + x]; if (!id) continue;
        const base = this.palette[id] || [0.8, 0.8, 0.8], wx = ox + x, wy = oy + y, wz = oz + z;
        const hv = 0.94 + 0.12 * ((((wx * 73856093) ^ (wy * 19349663) ^ (wz * 83492791)) >>> 0) % 100) / 100;
        for (const f of FACES) {
          const nid = this.getBlock(wx + f.n[0], wy + f.n[1], wz + f.n[2]);
          if (nid !== 0 && !(this.transparent.has(nid) && nid !== id)) continue;
          const o = pos.length / 3, sh = f.shade * hv;
          for (const [cu, cv] of CORNERS) {
            pos.push(x + 0.5 + f.n[0] * 0.5 + f.u[0] * 0.5 * cu + f.v[0] * 0.5 * cv, y + 0.5 + f.n[1] * 0.5 + f.u[1] * 0.5 * cu + f.v[1] * 0.5 * cv, z + 0.5 + f.n[2] * 0.5 + f.u[2] * 0.5 * cu + f.v[2] * 0.5 * cv);
            nor.push(f.n[0], f.n[1], f.n[2]); col.push(base[0] * sh, base[1] * sh, base[2] * sh);
          }
          idx.push(o, o + 1, o + 2, o, o + 2, o + 3); faces++;
        }
      }
      yield;
    }
    return { pos, nor, col, idx, faces };
  }
  _apply(c, r) {
    const old = c.mesh ? c.mesh.geometry.triangleCount / 2 : 0;
    if (r.faces === 0) {
      if (c.mesh) { c.mesh.geometry.dispose(); this.root.remove(c.mesh); c.mesh = null; this.stats.meshedChunks--; }
    } else {
      const geo = new Geometry({ positions: r.pos, normals: r.nor, colors: r.col, indices: r.idx, name: 'voxel-chunk' });
      if (c.mesh) { c.mesh.geometry.dispose(); c.mesh.geometry = geo; }
      else {
        const m = new Mesh(geo, this.material, { castShadow: this.castShadow, receiveShadow: this.receiveShadow, static: true, name: 'voxel-chunk' });
        const cs = this.chunkSize; m.setPosition(c.cx * cs, c.cy * cs, c.cz * cs); m.userData.chunk = [c.cx, c.cy, c.cz]; this.root.add(m); c.mesh = m; this.stats.meshedChunks++;
      }
    }
    this.stats.faces += r.faces - old; this.stats.triangles = this.stats.faces * 2; this.stats.rebuilds++;
    if (c.dirty) { c.dirty = false; this.stats.dirty--; }
  }
  /** DDA によるボクセルレイキャスト（描画に依存しない）。{x,y,z,id,normal,distance,point} または null */
  raycast(origin, dir, maxDistance = 64) {
    const l = Math.hypot(dir[0], dir[1], dir[2]); if (!(l > 0)) return null;
    const d = [dir[0] / l, dir[1] / l, dir[2] / l]; let x = fl(origin[0]), y = fl(origin[1]), z = fl(origin[2]);
    const step = [d[0] > 0 ? 1 : -1, d[1] > 0 ? 1 : -1, d[2] > 0 ? 1 : -1];
    const tDelta = d.map(v => v === 0 ? Infinity : Math.abs(1 / v));
    const next = (k, p) => d[k] === 0 ? Infinity : ((d[k] > 0 ? fl(p) + 1 - p : p - fl(p)) * tDelta[k]);
    let tMax = [next(0, origin[0]), next(1, origin[1]), next(2, origin[2])], t = 0, normal = [0, 0, 0];
    for (let i = 0; i < 4096; i++) {
      const id = this.getBlock(x, y, z);
      if (id !== 0) return { x, y, z, id, normal, distance: t, point: [origin[0] + d[0] * t, origin[1] + d[1] * t, origin[2] + d[2] * t] };
      const k = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2);
      t = tMax[k]; if (t > maxDistance) return null;
      tMax[k] += tDelta[k]; normal = [0, 0, 0]; normal[k] = -step[k];
      if (k === 0) x += step[0]; else if (k === 1) y += step[1]; else z += step[2];
    }
    return null;
  }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    for (const c of this.chunks.values()) { if (c.mesh) c.mesh.geometry.dispose(); }
    this.chunks.clear(); this.root.removeFromParent(); this.stats.chunks = 0; this.stats.meshedChunks = 0;
  }
}
