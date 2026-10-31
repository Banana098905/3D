import { uid, parseColor, MassiveEngineError } from './util.js';
import { mat4, quat, vec3 } from './math.js';
import { Geometry } from './geometry.js';
import { Material } from './material.js';

const _tmpMin = new Float64Array(3), _tmpMax = new Float64Array(3);
const _inv = mat4.create();
const _v = vec3.create();

/**
 * シーングラフのノード。位置・回転(クォータニオン)・拡大縮小と親子関係。
 * - static = true のノードは markDirty() / setter 呼び出しがない限り行列を再計算しない。
 * - static = false のノードは毎フレームTRSを比較し、変化があれば再計算する（position[0]=… の直接代入でも反映される）。
 */
export class Node {
  constructor(name = '') {
    this.id = uid(); this.name = name; this.type = 'Node';
    this.parent = null; this.children = [];
    this.position = vec3.create(); this.quaternion = quat.create(); this.scale = new Float64Array([1, 1, 1]);
    this.visible = true; this.static = false; this.userData = {};
    this._local = mat4.create(); this._world = mat4.create();
    this._prev = new Float64Array(10); this._prev[3 + 3] = NaN; // 初回は必ず「変化あり」
    this._dirty = true; this._subtreeDirty = true; this._worldVersion = 1;
  }
  add(...nodes) {
    for (const n of nodes) {
      if (!(n instanceof Node)) throw new TypeError('Node.add: Node が必要です。');
      if (n === this) throw new MassiveEngineError('Node.add: 自分自身は追加できません。', 'E_SCENE');
      for (let p = this; p; p = p.parent) if (p === n) throw new MassiveEngineError('Node.add: 循環する親子関係になります。', 'E_SCENE');
      if (n.parent) n.parent._removeChild(n);
      n.parent = this; this.children.push(n); n.markDirty();
    }
    return this;
  }
  _removeChild(n) { const i = this.children.indexOf(n); if (i >= 0) { this.children.splice(i, 1); n.parent = null; } }
  remove(...nodes) { for (const n of nodes) if (n.parent === this) { this._removeChild(n); n.markDirty(); } return this; }
  removeFromParent() { if (this.parent) this.parent.remove(this); return this; }
  markDirty() {
    this._dirty = true;
    for (let p = this.parent; p && !p._subtreeDirty; p = p.parent) p._subtreeDirty = true;
    this._subtreeDirty = true;
    return this;
  }
  setPosition(x, y, z) { this.position[0] = x; this.position[1] = y; this.position[2] = z; return this.markDirty(); }
  setScale(x, y = x, z = x) { this.scale[0] = x; this.scale[1] = y; this.scale[2] = z; return this.markDirty(); }
  setRotationEuler(x, y, z) { quat.fromEuler(this.quaternion, x, y, z); return this.markDirty(); }
  setQuaternion(x, y, z, w) { this.quaternion[0] = x; this.quaternion[1] = y; this.quaternion[2] = z; this.quaternion[3] = w; quat.normalize(this.quaternion, this.quaternion); return this.markDirty(); }
  /** ワールド座標の点を向く（-Z が target を向く。カメラと同じ規約）。親のワールド行列が最新である必要がある。 */
  lookAt(x, y, z, up = [0, 1, 0]) {
    if (Array.isArray(x) || ArrayBuffer.isView(x)) { up = y || up; z = x[2]; y = x[1]; x = x[0]; }
    _v[0] = x; _v[1] = y; _v[2] = z;
    if (this.parent && mat4.invert(_inv, this.parent._world)) vec3.transformMat4(_v, _v, _inv);
    let zx = this.position[0] - _v[0], zy = this.position[1] - _v[1], zz = this.position[2] - _v[2];
    let l = Math.hypot(zx, zy, zz); if (l < 1e-12) return this; zx /= l; zy /= l; zz /= l;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz); if (l < 1e-9) { xx = 1; xy = 0; xz = 0; l = 1; } xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    quat.fromBasis(this.quaternion, xx, xy, xz, yx, yy, yz, zx, zy, zz);
    return this.markDirty();
  }
  _trsChanged() {
    const p = this._prev, a = this.position, q = this.quaternion, s = this.scale;
    if (p[0] === a[0] && p[1] === a[1] && p[2] === a[2] && p[3] === q[0] && p[4] === q[1] && p[5] === q[2] && p[6] === q[3] && p[7] === s[0] && p[8] === s[1] && p[9] === s[2]) return false;
    p[0] = a[0]; p[1] = a[1]; p[2] = a[2]; p[3] = q[0]; p[4] = q[1]; p[5] = q[2]; p[6] = q[3]; p[7] = s[0]; p[8] = s[1]; p[9] = s[2];
    return true;
  }
  /** 子孫を含め行列を更新。戻り値: このノードのワールド行列が変化したか。 */
  updateMatrices(parentChanged = false) {
    if (this.static && !this._dirty && !this._subtreeDirty && !parentChanged) return false;
    let changed = parentChanged;
    if (this._dirty || !this.static) {
      if (this._trsChanged()) { mat4.compose(this._local, this.position, this.quaternion, this.scale); changed = true; }
      else if (this._dirty) changed = true;
    }
    if (changed) {
      if (this.parent) mat4.multiply(this._world, this.parent._world, this._local); else mat4.copy(this._world, this._local);
      this._worldVersion++;
    }
    this._dirty = false; this._subtreeDirty = false;
    const ch = this.children;
    for (let i = 0; i < ch.length; i++) ch[i].updateMatrices(changed);
    return changed;
  }
  /** このノードだけ、祖先から辿って最新のワールド行列を計算する（シーン更新前に位置を知りたいとき）。 */
  updateWorldMatrix() {
    if (this.parent) this.parent.updateWorldMatrix();
    mat4.compose(this._local, this.position, this.quaternion, this.scale);
    if (this.parent) mat4.multiply(this._world, this.parent._world, this._local); else mat4.copy(this._world, this._local);
    this._worldVersion++;
    return this._world;
  }
  get worldMatrix() { return this._world; }
  getWorldPosition(out = vec3.create()) { this.updateWorldMatrix(); out[0] = this._world[12]; out[1] = this._world[13]; out[2] = this._world[14]; return out; }
  traverse(fn) { fn(this); for (let i = 0; i < this.children.length; i++) this.children[i].traverse(fn); return this; }
  find(name) { let r = null; this.traverse(n => { if (!r && n.name === name) r = n; }); return r; }
  /** 子孫を含めてシーンから外す。GPUリソース(geometry/texture)は別途 disposeResources() か AssetManager で解放。 */
  dispose() { for (const c of this.children.slice()) c.dispose(); this.removeFromParent(); }
  disposeResources() { }
}

export class Group extends Node { constructor(name) { super(name); this.type = 'Group'; } }

export class Scene extends Node {
  constructor() { super('Scene'); this.type = 'Scene'; this.background = [0.025, 0.045, 0.075]; }
  collect(out = { lights: [], meshes: [], instanced: [] }) {
    out.lights.length = 0; out.meshes.length = 0; out.instanced.length = 0;
    const walk = n => {
      if (!n.visible) return;
      switch (n.type) {
        case 'Mesh': out.meshes.push(n); break;
        case 'InstancedMesh': out.instanced.push(n); break;
        case 'AmbientLight': case 'DirectionalLight': case 'PointLight': out.lights.push(n); break;
      }
      for (let i = 0; i < n.children.length; i++) walk(n.children[i]);
    };
    walk(this);
    return out;
  }
}

export class Mesh extends Node {
  constructor(geometry, material, o = {}) {
    super(o.name || '');
    if (!(geometry instanceof Geometry)) throw new TypeError('Mesh: geometry は Geometry インスタンスが必要です。');
    this.type = 'Mesh'; this.geometry = geometry; this.material = material || new Material();
    this.castShadow = !!o.castShadow; this.receiveShadow = !!o.receiveShadow; this.frustumCulled = o.frustumCulled !== false; this.renderOrder = o.renderOrder || 0;
    this.wmin = new Float64Array(3); this.wmax = new Float64Array(3); this._bv = 0; this._bgv = 0; this._bgid = 0;
    if (o.static) this.static = true;
  }
  updateWorldBounds() {
    if (this._bv !== this._worldVersion || this._bgv !== this.geometry.version || this._bgid !== this.geometry.id) {
      mat4.transformAABB(this.wmin, this.wmax, this.geometry.bounds.min, this.geometry.bounds.max, this._world);
      this._bv = this._worldVersion; this._bgv = this.geometry.version; this._bgid = this.geometry.id;
    }
  }
  disposeResources({ textures = true } = {}) { this.geometry.dispose(); if (textures && this.material.map) this.material.map.dispose(); }
}

export class InstancedMesh extends Node {
  /**
   * 同一ジオメトリを大量に描画する。内部は chunkSize 個ごとのチャンクに分割され、
   * チャンク単位で ビュー・フラスタムカリング / LOD選択 / GPU転送 を行う。
   * 各インスタンス: 4x4行列(ローカル空間) + 色(rgb) + 位相(phase; spin アニメーション用)。
   */
  constructor(geometry, material, o = {}) {
    super(o.name || '');
    if (!(geometry instanceof Geometry)) throw new TypeError('InstancedMesh: geometry は Geometry インスタンスが必要です。');
    this.type = 'InstancedMesh'; this.geometry = geometry; this.material = material || new Material();
    this.chunkSize = Math.max(64, Math.floor(o.chunkSize || 4096));
    this.dynamic = o.dynamic !== false;
    this.castShadow = !!o.castShadow; this.receiveShadow = !!o.receiveShadow; this.frustumCulled = o.frustumCulled !== false;
    this.spin = !!o.spin; this.spinSpeed = o.spinSpeed === undefined ? 1 : o.spinSpeed;
    this.maxDistance = o.maxDistance || Infinity; this.preciseRaycast = o.preciseRaycast !== false;
    this.lods = [{ geometry, distance: 0 }];
    for (const l of (o.lods || [])) this.addLOD(l.geometry, l.distance);
    this.capacity = 0; this.count = 0; this.matrices = new Float32Array(0); this.colors = new Float32Array(0);
    this.chunks = []; this._gpu = new Map();
    this._ensureCapacity(Math.max(1, o.capacity || o.count || 1));
    if (o.count) this.setCount(o.count);
  }
  addLOD(geometry, distance) {
    if (!(geometry instanceof Geometry)) throw new TypeError('addLOD: Geometry が必要です。');
    if (!(distance > 0)) throw new RangeError('addLOD: distance は正の数が必要です。');
    this.lods.push({ geometry, distance }); this.lods.sort((a, b) => a.distance - b.distance);
    this._gpuReset(); return this;
  }
  _gpuReset() { for (const r of Array.from(this._gpu.keys())) r._freeInstanced(this); this._gpu.clear(); }
  get chunkCount() { return Math.ceil(this.count / this.chunkSize); }
  _ensureCapacity(n) {
    if (n <= this.capacity) return;
    let cap = Math.max(this.capacity * 2, n, 16);
    if (cap > this.chunkSize) cap = Math.ceil(cap / this.chunkSize) * this.chunkSize;
    const m = new Float32Array(cap * 16), c = new Float32Array(cap * 4);
    m.set(this.matrices); c.set(this.colors);
    this.matrices = m; this.colors = c; this.capacity = cap;
    const nch = Math.ceil(cap / this.chunkSize);
    while (this.chunks.length < nch) this.chunks.push({ boundsDirty: true, uploadDirty: true, min: new Float64Array(3), max: new Float64Array(3), radius: 0, center: new Float64Array(3) });
  }
  setCount(n) {
    n = Math.max(0, Math.floor(n));
    if (!Number.isFinite(n)) throw new RangeError('setCount: 有限の数が必要です。');
    this._ensureCapacity(n);
    for (let i = this.count; i < n; i++) { const o = i * 16; this.matrices.fill(0, o, o + 16); this.matrices[o] = this.matrices[o + 5] = this.matrices[o + 10] = this.matrices[o + 15] = 1; const c = i * 4; this.colors[c] = this.colors[c + 1] = this.colors[c + 2] = 1; this.colors[c + 3] = 0; }
    const old = this.count; this.count = n;
    this.markInstancesDirty(Math.min(old, n), Math.max(old, n));
    return this;
  }
  _touch(i) { const ch = this.chunks[(i / this.chunkSize) | 0]; ch.boundsDirty = true; ch.uploadDirty = true; }
  /** matrices / colors を直接書き換えた範囲 [start,end) を通知する（チャンク境界の再計算とGPU再転送が行われる）。 */
  markInstancesDirty(start = 0, end = this.count) {
    if (end <= start) { end = start + 1; }
    const a = (start / this.chunkSize) | 0, b = Math.min(this.chunks.length - 1, ((Math.max(start, end - 1)) / this.chunkSize) | 0);
    for (let c = a; c <= b; c++) { this.chunks[c].boundsDirty = true; this.chunks[c].uploadDirty = true; }
    return this;
  }
  _check(i) { if (!(i >= 0 && i < this.count) || i !== (i | 0)) throw new RangeError('InstancedMesh: インスタンス番号が範囲外です: ' + i + ' (count=' + this.count + ')'); }
  setMatrixAt(i, m) { this._check(i); const o = i * 16; for (let k = 0; k < 16; k++) this.matrices[o + k] = m[k]; this._touch(i); return this; }
  getMatrixAt(i, out = new Float32Array(16)) { this._check(i); const o = i * 16; for (let k = 0; k < 16; k++) out[k] = this.matrices[o + k]; return out; }
  setPositionAt(i, x, y, z) { if (!(i >= 0 && i < this.count)) throw new RangeError('InstancedMesh: インスタンス番号が範囲外です: ' + i); const o = i * 16; this.matrices[o + 12] = x; this.matrices[o + 13] = y; this.matrices[o + 14] = z; this._touch(i); return this; }
  setTRSAt(i, p, q, s) { this._check(i); const tmp = mat4.compose(_tmpM, p, q || [0, 0, 0, 1], s || [1, 1, 1]); return this.setMatrixAt(i, tmp); }
  setColorAt(i, r, g, b) { this._check(i); const o = i * 4; if (typeof r !== 'number') { const c = parseColor(r); r = c[0]; g = c[1]; b = c[2]; } this.colors[o] = r; this.colors[o + 1] = g; this.colors[o + 2] = b; this._touch(i); return this; }
  setPhaseAt(i, phase) { this._check(i); this.colors[i * 4 + 3] = phase; this._touch(i); return this; }
  addInstance(matrix) {
    const i = this.count; this.setCount(i + 1);
    if (matrix) this.setMatrixAt(i, matrix);
    return i;
  }
  /** swap-remove。最後のインスタンスが i に移動する（O(1)）。戻り値: 移動元の旧番号 (移動なしは -1)。 */
  removeInstance(i) {
    this._check(i); const last = this.count - 1; let moved = -1;
    if (i !== last) { this.matrices.copyWithin(i * 16, last * 16, last * 16 + 16); this.colors.copyWithin(i * 4, last * 4, last * 4 + 4); moved = last; this._touch(i); }
    this._touch(last); this.count = last; return moved;
  }
  /** チャンクのローカルAABB・バウンディング球を再計算（描画時に自動呼び出し）。 */
  computeChunkBounds(c) {
    const ch = this.chunks[c], s = c * this.chunkSize, e = Math.min(this.count, s + this.chunkSize), m = this.matrices;
    if (e <= s) { ch.radius = 0; ch.boundsDirty = false; return ch; }
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity, r2 = 0;
    for (let i = s; i < e; i++) {
      const o = i * 16, x = m[o + 12], y = m[o + 13], z = m[o + 14];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
      const a = m[o] * m[o] + m[o + 1] * m[o + 1] + m[o + 2] * m[o + 2], b = m[o + 4] * m[o + 4] + m[o + 5] * m[o + 5] + m[o + 6] * m[o + 6], d = m[o + 8] * m[o + 8] + m[o + 9] * m[o + 9] + m[o + 10] * m[o + 10];
      const mx = a > b ? (a > d ? a : d) : (b > d ? b : d); if (mx > r2) r2 = mx;
    }
    const gr = this.geometry.bounds.radius, gc = this.geometry.bounds.center, ext = gr * Math.sqrt(r2) + Math.hypot(gc[0], gc[1], gc[2]) * Math.sqrt(r2);
    ch.min[0] = x0 - ext; ch.min[1] = y0 - ext; ch.min[2] = z0 - ext; ch.max[0] = x1 + ext; ch.max[1] = y1 + ext; ch.max[2] = z1 + ext;
    ch.center[0] = (x0 + x1) / 2; ch.center[1] = (y0 + y1) / 2; ch.center[2] = (z0 + z1) / 2;
    ch.radius = Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + ext;
    ch.boundsDirty = false; return ch;
  }
  get byteSize() { return this.capacity * 80; }
  dispose() { this._gpuReset(); super.dispose(); }
  disposeResources({ textures = true } = {}) { this._gpuReset(); for (const l of this.lods) l.geometry.dispose(); if (textures && this.material.map) this.material.map.dispose(); }
}
const _tmpM = mat4.create();

/* ライト */
export class Light extends Node {
  constructor(color = 0xffffff, intensity = 1) { super(); this.color = parseColor(color, [1, 1, 1]); this.intensity = intensity; }
}
export class AmbientLight extends Light { constructor(color, intensity = 0.35) { super(color, intensity); this.type = 'AmbientLight'; } }
export class DirectionalLight extends Light {
  /**
   * direction: 光が進む向き（ワールド座標）。castShadow: シャドウマップ有効（先頭の影つき方向光のみ）。
   * shadow.extent: 影を描く範囲の半径、shadow.target: 範囲の中心 (null = カメラの注視点)。
   */
  constructor(color, intensity = 0.85, o = {}) {
    super(color, intensity); this.type = 'DirectionalLight';
    this.direction = Float64Array.from(o.direction || [-0.45, -0.85, -0.55]);
    this.castShadow = !!o.castShadow;
    this.shadow = Object.assign({ mapSize: 2048, extent: 30, bias: 0.0006, normalBias: 0.03, target: null }, o.shadow);
  }
}
export class PointLight extends Light {
  constructor(color, intensity = 1, range = 20) { super(color, intensity); this.type = 'PointLight'; this.range = range; }
}

/* カメラ */
export class Camera extends Node {
  constructor() {
    super('Camera'); this.type = 'Camera';
    this.near = 0.1; this.far = 2000; this.projection = mat4.create(); this.view = mat4.create(); this.viewProjection = mat4.create(); this.aspect = 1;
  }
  updateProjection() { throw new Error('abstract'); }
  /** ワールド行列 → ビュー行列 → ビュー射影行列を更新 */
  updateCamera(aspect) {
    if (aspect) this.aspect = aspect;
    this.updateWorldMatrix(); this.updateProjection();
    if (!mat4.invert(this.view, this._world)) mat4.identity(this.view);
    mat4.multiply(this.viewProjection, this.projection, this.view);
    return this;
  }
}
export class PerspectiveCamera extends Camera {
  constructor(fovDeg = 50, near = 0.1, far = 2000) { super(); this.type = 'PerspectiveCamera'; this.fov = fovDeg; this.near = near; this.far = far; }
  updateProjection() { mat4.perspective(this.projection, this.fov * Math.PI / 180, this.aspect || 1, this.near, this.far); }
}
export class OrthographicCamera extends Camera {
  /** height: ビューの縦のワールド単位長 */
  constructor(height = 10, near = -1000, far = 1000) { super(); this.type = 'OrthographicCamera'; this.height = height; this.near = near; this.far = far; }
  updateProjection() { const h = this.height / 2, w = h * (this.aspect || 1); mat4.ortho(this.projection, -w, w, -h, h, this.near, this.far); }
}

/** XZ平面のグリッド線 (半透明・照明なし)。 */
export function createGridHelper(size = 20, divisions = 20, color = '#3a5d82', opacity = 0.5) {
  const m = new Mesh(Geometry.grid(size, divisions), new Material({ color, unlit: true, opacity, transparent: opacity < 1, depthWrite: false }), { frustumCulled: false });
  m.name = 'GridHelper'; m.static = true; return m;
}
