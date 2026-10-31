import { MassiveEngineError } from './util.js';
import { Texture } from './texture.js';

/**
 * アセット管理: 名前登録・参照カウント・遅延生成・URL読み込みキャッシュ・一括解放。
 * 参照カウントが 0 になったアセットは GPU リソースを解放し（既定で）登録も外す。
 */
export class AssetManager {
  constructor() { this._e = new Map(); this._factories = new Map(); this.disposed = false; }
  _kind(r) { return r && r.positions ? 'geometry' : r && r.wrapS ? 'texture' : r && r.color && r.opacity !== undefined ? 'material' : 'other'; }
  /** 登録（参照数 0 で開始）。同名は replace:true でのみ上書き可能。 */
  add(name, resource, { replace = false } = {}) {
    if (this.disposed) throw new MassiveEngineError('AssetManager は破棄済みです。', 'E_DISPOSED');
    if (this._e.has(name) && !replace) throw new MassiveEngineError('同名のアセットが既に登録されています: ' + name, 'E_ASSET_EXISTS');
    if (this._e.has(name) && replace) this.remove(name);
    this._e.set(name, { resource, refs: 0, kind: this._kind(resource) }); return resource;
  }
  /** 使われた時に初めて生成される定義を登録する（遅延生成）。 */
  defer(name, factory) { if (typeof factory !== 'function') throw new TypeError('factory は関数が必要です。'); this._factories.set(name, factory); return this; }
  has(name) { return this._e.has(name) || this._factories.has(name); }
  get(name) {
    let e = this._e.get(name);
    if (!e && this._factories.has(name)) { this.add(name, this._factories.get(name)()); this._factories.delete(name); e = this._e.get(name); }
    return e ? e.resource : null;
  }
  acquire(name) { const r = this.get(name); if (!r) throw new MassiveEngineError('未登録のアセット: ' + name, 'E_ASSET_MISSING'); this._e.get(name).refs++; return r; }
  /** 参照を1つ減らす。0 になれば GPU リソースを解放し、removeWhenUnused なら登録も外す。 */
  release(name, { removeWhenUnused = true } = {}) {
    const e = this._e.get(name); if (!e) return false;
    e.refs = Math.max(0, e.refs - 1);
    if (e.refs === 0) { if (e.resource.dispose) e.resource.dispose(); if (removeWhenUnused) this._e.delete(name); }
    return true;
  }
  remove(name) { const e = this._e.get(name); if (!e) return false; if (e.resource.dispose) e.resource.dispose(); this._e.delete(name); return true; }
  refs(name) { const e = this._e.get(name); return e ? e.refs : 0; }
  /** URL から画像テクスチャを読み込む（同じ URL はキャッシュ共有）。呼ぶたびに参照が +1 される。 */
  loadTexture(url, options) {
    const key = 'texture:' + url; let e = this._e.get(key);
    if (!e) { this.add(key, Texture.fromURL(url, options)); e = this._e.get(key); }
    e.refs++; return e.resource;
  }
  releaseTexture(url) { return this.release('texture:' + url); }
  async loadJSON(url) { const r = await fetch(url); if (!r.ok) throw new MassiveEngineError('読み込み失敗 ' + r.status + ': ' + url, 'E_ASSET_LOAD'); return r.json(); }
  /** 参照 0 のアセットを解放して返す個数 */
  disposeUnused() { let n = 0; for (const [k, e] of Array.from(this._e)) if (e.refs === 0) { if (e.resource.dispose) e.resource.dispose(); this._e.delete(k); n++; } return n; }
  disposeAll() { for (const e of this._e.values()) if (e.resource.dispose) e.resource.dispose(); this._e.clear(); this._factories.clear(); }
  stats() {
    const s = { count: this._e.size, deferred: this._factories.size, geometries: 0, textures: 0, materials: 0, estimatedBytes: 0 };
    for (const e of this._e.values()) { if (e.kind === 'geometry') s.geometries++; else if (e.kind === 'texture') s.textures++; else if (e.kind === 'material') s.materials++; s.estimatedBytes += e.resource.byteSize || 0; }
    return s;
  }
  list() { return Array.from(this._e, ([name, e]) => ({ name, kind: e.kind, refs: e.refs })); }
  dispose() { this.disposeAll(); this.disposed = true; }
}
