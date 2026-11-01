/*
 * リソース管理: AssetManager（参照カウント・遅延生成）を拡張し、重複排除・読み込み中共有・各種ローダを足す。
 *
 *   const res = new ResourceManager();
 *   const tex = res.loadTexture(url);                     // 同じ URL は 1 つだけ（参照 +1）
 *   const geo = await res.loadOBJ(url);                   // OBJ → Geometry（URL でキャッシュ。同時要求は 1 回の fetch を共有）
 *   const mat = res.material({ color: 0xff0000 });        // 同じ設定は同じ Material を返す（ドローコール削減＝マテリアル共有）
 *   const sh  = await res.loadText(url);  const js = await res.loadJSON(url);  const buf = await res.loadArrayBuffer(url);
 *   res.stats() → 件数・推定バイト・重複排除ヒット数
 * 追加ユーティリティ: parseOBJ(text) / validateGeometry(geo) / mergeGeometries(list, transforms)（静的バッチング）
 */
import { AssetManager } from './assets.js';
import { Geometry } from './geometry.js';
import { Material } from './material.js';
import { MassiveEngineError } from './util.js';

/** Wavefront OBJ を Geometry 用データへ。v/vt/vn・負インデックス・n角形（扇状三角形化）に対応。法線が無ければ Geometry が計算する。 */
export function parseOBJ(text, { name = '' } = {}) {
  const V = [], T = [], N = [], pos = [], uv = [], nor = [], idx = [], map = new Map(); let hasUV = false, hasN = false;
  const lines = String(text).split(/\r?\n/);
  const ref = (s, len) => { const k = parseInt(s, 10); if (!Number.isFinite(k) || k === 0) throw new MassiveEngineError('OBJ: 不正な面インデックス: ' + s, 'E_OBJ'); return k > 0 ? k - 1 : len + k; };
  for (let li = 0; li < lines.length; li++) {
    const l = lines[li].trim(); if (!l || l[0] === '#') continue; const p = l.split(/\s+/);
    switch (p[0]) {
      case 'v': V.push(+p[1], +p[2], +p[3]); break;
      case 'vt': T.push(+p[1], +(p[2] || 0)); break;
      case 'vn': N.push(+p[1], +p[2], +p[3]); break;
      case 'f': {
        const face = [];
        for (let k = 1; k < p.length; k++) {
          const key = p[k]; let id = map.get(key);
          if (id === undefined) {
            const a = key.split('/'), vi = ref(a[0], V.length / 3);
            if (vi * 3 + 2 >= V.length) throw new MassiveEngineError('OBJ: 頂点番号が範囲外 (行 ' + (li + 1) + ')', 'E_OBJ');
            id = pos.length / 3; pos.push(V[vi * 3], V[vi * 3 + 1], V[vi * 3 + 2]);
            if (a[1]) { const ti = ref(a[1], T.length / 2); uv.push(T[ti * 2], T[ti * 2 + 1]); hasUV = true; } else uv.push(0, 0);
            if (a[2]) { const ni = ref(a[2], N.length / 3); nor.push(N[ni * 3], N[ni * 3 + 1], N[ni * 3 + 2]); hasN = true; } else nor.push(0, 0, 0);
            map.set(key, id);
          }
          face.push(id);
        }
        if (face.length < 3) throw new MassiveEngineError('OBJ: 面の頂点が 3 未満 (行 ' + (li + 1) + ')', 'E_OBJ');
        for (let k = 1; k + 1 < face.length; k++) idx.push(face[0], face[k], face[k + 1]);
        break;
      }
      default: break; // o/g/s/usemtl/mtllib 等は無視（未対応: マテリアル/グループ）
    }
  }
  if (!pos.length) throw new MassiveEngineError('OBJ: 面が見つかりません。', 'E_OBJ');
  return { name, positions: pos, indices: idx, uvs: hasUV ? uv : null, normals: hasN && !nor.some((v, i) => i % 3 === 0 && v === 0 && nor[i + 1] === 0 && nor[i + 2] === 0) ? nor : null };
}

/** ジオメトリの整合性検査。問題のリスト（空なら正常）を返す。 */
export function validateGeometry(g) {
  const errs = [], vc = g.positions.length / 3;
  for (let i = 0; i < g.positions.length; i++) if (!Number.isFinite(g.positions[i])) { errs.push('positions[' + i + '] が有限でない'); break; }
  if (g.indices) { for (let i = 0; i < g.indices.length; i++) if (g.indices[i] >= vc) { errs.push('indices[' + i + '] が範囲外'); break; } }
  if (g.mode === 'triangles' && g.indexCount % 3) errs.push('三角形数が整数でない');
  for (const [k, per] of [['normals', 3], ['uvs', 2], ['colors', 3]]) if (g[k] && g[k].length !== vc * per) errs.push(k + ' の長さが頂点数と不一致');
  return errs;
}

/**
 * 静的バッチング: 複数ジオメトリを（任意の 4x4 変換つきで）1 つへ結合する。結合後は 1 ドローコール。
 * 個別の移動・カリング・ピッキングはできなくなる（動かない背景向け）。
 * @param {Geometry[]} geos  @param {(Float32Array|number[])[]} [mats] 列優先 4x4 行列（省略は単位）
 */
export function mergeGeometries(geos, mats = null) {
  let vc = 0, ic = 0; for (const g of geos) { if (g.mode !== 'triangles') throw new MassiveEngineError('mergeGeometries: triangles のみ対応', 'E_MERGE'); vc += g.vertexCount; ic += g.triangleCount * 3; }
  const P = new Float32Array(vc * 3), Nn = new Float32Array(vc * 3), U = new Float32Array(vc * 2), I = vc > 65535 ? new Uint32Array(ic) : new Uint16Array(ic); let vo = 0, io = 0;
  geos.forEach((g, gi) => {
    const m = mats && mats[gi], n = g.vertexCount;
    for (let i = 0; i < n; i++) {
      const x = g.positions[i * 3], y = g.positions[i * 3 + 1], z = g.positions[i * 3 + 2], nx = g.normals[i * 3], ny = g.normals[i * 3 + 1], nz = g.normals[i * 3 + 2], o = (vo + i) * 3;
      if (m) { // 法線は回転・一様スケール前提で同じ行列の 3x3 部分を使い正規化
        P[o] = m[0] * x + m[4] * y + m[8] * z + m[12]; P[o + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]; P[o + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
        const ax = m[0] * nx + m[4] * ny + m[8] * nz, ay = m[1] * nx + m[5] * ny + m[9] * nz, az = m[2] * nx + m[6] * ny + m[10] * nz, l = Math.hypot(ax, ay, az) || 1; Nn[o] = ax / l; Nn[o + 1] = ay / l; Nn[o + 2] = az / l;
      } else { P[o] = x; P[o + 1] = y; P[o + 2] = z; Nn[o] = nx; Nn[o + 1] = ny; Nn[o + 2] = nz; }
      if (g.uvs) { U[(vo + i) * 2] = g.uvs[i * 2]; U[(vo + i) * 2 + 1] = g.uvs[i * 2 + 1]; }
    }
    const cnt = g.triangleCount * 3; for (let k = 0; k < cnt; k++) I[io + k] = (g.indices ? g.indices[k] : k) + vo;
    vo += n; io += cnt;
  });
  return new Geometry({ positions: P, normals: Nn, uvs: U, indices: I });
}

const matKey = o => JSON.stringify([o.color === undefined ? 0xffffff : o.color, o.emissive || 0, o.opacity === undefined ? 1 : o.opacity, o.transparent, o.unlit, o.specular, o.shininess, o.doubleSided, o.blending, o.vertexColors, o.depthWrite, o.alphaTest, o.map ? o.map.id : null]);

export class ResourceManager extends AssetManager {
  constructor() { super(); this._inflight = new Map(); this._bytes = new Map(); this._mats = new Map(); this.dedupeHits = 0; this.fetches = 0; }
  _once(key, fn) { // 読み込み中の同じ要求は同じ Promise を返す
    const c = this._inflight.get(key); if (c) { this.dedupeHits++; return c; }
    const p = fn().finally(() => this._inflight.delete(key)); this._inflight.set(key, p); return p;
  }
  async _fetch(url, kind) { this.fetches++; const r = await fetch(url); if (!r.ok) throw new MassiveEngineError('読み込み失敗 ' + r.status + ': ' + url, 'E_ASSET_LOAD'); return kind === 'text' ? r.text() : kind === 'json' ? r.json() : r.arrayBuffer(); }
  loadText(url) { return this._once('text:' + url, () => this._fetch(url, 'text')); }
  loadJSON(url) { return this._once('json:' + url, () => this._fetch(url, 'json')); }
  loadArrayBuffer(url) { return this._once('buf:' + url, () => this._fetch(url, 'buf')); }
  /** シェーダ等のソース文字列（用途は呼び出し側。エンジンのシェーダ差し替え機能は未実装）。 */
  loadShaderSource(url) { return this.loadText(url); }
  /** OBJ → Geometry。キャッシュされ、呼ぶたびに参照 +1。 */
  async loadOBJ(url) {
    const key = 'geometry:' + url, e = this._e.get(key); if (e) { e.refs++; this.dedupeHits++; return e.resource; }
    const g = await this._once(key, async () => { const t = await this.loadText(url); return new Geometry(Object.assign(parseOBJ(t, { name: url }))); });
    const e2 = this._e.get(key); if (e2) { e2.refs++; return e2.resource; }
    this.add(key, g); this._e.get(key).refs++; return g;
  }
  releaseOBJ(url) { return this.release('geometry:' + url); }
  /** 同じ設定の Material を共有する（マテリアルが同じ = 描画状態切り替えとバッチが減る）。 */
  material(o = {}) {
    const k = matKey(o); let m = this._mats.get(k);
    if (m) { this.dedupeHits++; return m; }
    m = new Material(o); this._mats.set(k, m); return m;
  }
  stats() {
    const s = super.stats(); s.sharedMaterials = this._mats.size; s.dedupeHits = this.dedupeHits; s.fetches = this.fetches; s.inflight = this._inflight.size; return s;
  }
  disposeAll() { super.disposeAll(); this._mats.clear(); }
}
