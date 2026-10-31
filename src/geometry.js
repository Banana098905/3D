import { uid, MassiveEngineError } from './util.js';

/**
 * ジオメトリ（頂点バッファ + インデックス）。CPU側にデータを保持するため、
 * WebGLコンテキスト消失後も再アップロードできる。
 * mode: 'triangles' | 'lines'
 */
export class Geometry {
  constructor(data = {}) {
    this.id = uid();
    this.name = data.name || '';
    this.mode = data.mode === 'lines' ? 'lines' : 'triangles';
    this.positions = toF32(data.positions, 'positions');
    if (!this.positions || this.positions.length < 3 || this.positions.length % 3) throw new TypeError('Geometry: positions は 3 の倍数長の配列が必要です。');
    const vc = this.positions.length / 3;
    this.uvs = data.uvs ? toF32(data.uvs, 'uvs') : null;
    this.colors = data.colors ? toF32(data.colors, 'colors') : null;
    this.normals = data.normals ? toF32(data.normals, 'normals') : null;
    if (this.uvs && this.uvs.length !== vc * 2) throw new RangeError('Geometry: uvs の長さが頂点数×2と一致しません。');
    if (this.colors && this.colors.length !== vc * 3) throw new RangeError('Geometry: colors の長さが頂点数×3と一致しません。');
    if (this.normals && this.normals.length !== vc * 3) throw new RangeError('Geometry: normals の長さが頂点数×3と一致しません。');
    if (data.indices) {
      const ind = data.indices;
      this.indices = (ind instanceof Uint16Array || ind instanceof Uint32Array) ? ind : (vc > 65535 ? Uint32Array.from(ind) : Uint16Array.from(ind));
      const per = this.mode === 'lines' ? 2 : 3;
      if (this.indices.length % per) throw new RangeError('Geometry: indices の長さが ' + per + ' の倍数ではありません。');
      for (let i = 0; i < this.indices.length; i++) if (this.indices[i] >= vc) throw new RangeError('Geometry: indices[' + i + '] が頂点数 ' + vc + ' を超えています。');
    } else {
      this.indices = null;
      if (vc % (this.mode === 'lines' ? 2 : 3)) throw new RangeError('Geometry: 非インデックス描画では頂点数が ' + (this.mode === 'lines' ? 2 : 3) + ' の倍数である必要があります。');
    }
    if (!this.normals && this.mode === 'triangles') this.computeNormals();
    this.params = data.params || null; // プリミティブ生成パラメータ（シーンJSONで使用）
    this.version = 1;
    this._gpu = new Map();
    this.bounds = { min: [0, 0, 0], max: [0, 0, 0], center: [0, 0, 0], radius: 0 };
    this.computeBounds();
  }
  get vertexCount() { return this.positions.length / 3; }
  get indexCount() { return this.indices ? this.indices.length : this.positions.length / 3; }
  get triangleCount() { return this.mode === 'triangles' ? Math.floor(this.indexCount / 3) : 0; }
  computeBounds() {
    const p = this.positions; let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], y = p[i + 1], z = p[i + 2];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    const b = this.bounds; b.min = [x0, y0, z0]; b.max = [x1, y1, z1];
    b.center = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    let r2 = 0;
    for (let i = 0; i < p.length; i += 3) { const dx = p[i] - b.center[0], dy = p[i + 1] - b.center[1], dz = p[i + 2] - b.center[2]; const d = dx * dx + dy * dy + dz * dz; if (d > r2) r2 = d; }
    b.radius = Math.sqrt(r2);
    return b;
  }
  /** 頂点を共有するメッシュ向けの面積加重スムース法線 */
  computeNormals() {
    const p = this.positions, n = new Float32Array(p.length), ind = this.indices;
    const tri = ind ? ind.length / 3 : p.length / 9;
    for (let t = 0; t < tri; t++) {
      const a = (ind ? ind[t * 3] : t * 3) * 3, b = (ind ? ind[t * 3 + 1] : t * 3 + 1) * 3, c = (ind ? ind[t * 3 + 2] : t * 3 + 2) * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const k of [a, b, c]) { n[k] += nx; n[k + 1] += ny; n[k + 2] += nz; }
    }
    for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i], n[i + 1], n[i + 2]); if (l > 0) { n[i] /= l; n[i + 1] /= l; n[i + 2] /= l; } else { n[i + 1] = 1; } }
    this.normals = n;
    return n;
  }
  /** 頂点データを書き換えた後に呼ぶ。次回描画時にGPUへ再アップロードされる。 */
  needsUpdate({ bounds = true } = {}) { this.version++; if (bounds) this.computeBounds(); return this; }
  /** 使用中のすべてのエンジン上のGPUバッファを解放（再度描画に使えば自動で再作成される）。 */
  dispose() {
    for (const r of Array.from(this._gpu.keys())) r._freeGeometry(this);
    this._gpu.clear();
  }
  get byteSize() {
    return this.positions.byteLength + (this.normals ? this.normals.byteLength : 0) + (this.uvs ? this.uvs.byteLength : 0) + (this.colors ? this.colors.byteLength : 0) + (this.indices ? this.indices.byteLength : 0);
  }

  static fromParams(p) {
    switch (p && p.type) {
      case 'box': return Geometry.box(p.width, p.height, p.depth);
      case 'sphere': return Geometry.sphere(p.radius, p.widthSegments, p.heightSegments);
      case 'plane': return Geometry.plane(p.width, p.depth, p.widthSegments, p.depthSegments);
      case 'cylinder': return Geometry.cylinder(p.radiusTop, p.radiusBottom, p.height, p.radialSegments, p.caps);
      case 'grid': return Geometry.grid(p.size, p.divisions);
      default: throw new MassiveEngineError('未知のプリミティブ: ' + (p && p.type), 'E_SCENE_FORMAT');
    }
  }

  static box(width = 1, height = 1, depth = 1) {
    const faces = [
      { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] }, { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
      { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] }, { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
      { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] }
    ];
    const pos = [], nor = [], uv = [], idx = [], s = [width, height, depth];
    const corners = [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]];
    faces.forEach((f, fi) => {
      for (const [cu, cv, tu, tv] of corners) {
        for (let k = 0; k < 3; k++) pos.push((f.n[k] * 0.5 + f.u[k] * 0.5 * cu + f.v[k] * 0.5 * cv) * s[k]);
        nor.push(f.n[0], f.n[1], f.n[2]); uv.push(tu, tv);
      }
      const o = fi * 4; idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    });
    return new Geometry({ positions: pos, normals: nor, uvs: uv, indices: idx, name: 'box', params: { type: 'box', width, height, depth } });
  }

  static sphere(radius = 0.5, widthSegments = 24, heightSegments = 16) {
    widthSegments = Math.max(3, Math.floor(widthSegments)); heightSegments = Math.max(2, Math.floor(heightSegments));
    const pos = [], nor = [], uv = [], idx = [], grid = [];
    for (let y = 0; y <= heightSegments; y++) {
      const row = [], v = y / heightSegments, th = v * Math.PI;
      for (let x = 0; x <= widthSegments; x++) {
        const u = x / widthSegments, ph = u * Math.PI * 2;
        const nx = -Math.cos(ph) * Math.sin(th), ny = Math.cos(th), nz = Math.sin(ph) * Math.sin(th);
        pos.push(nx * radius, ny * radius, nz * radius); nor.push(nx, ny, nz); uv.push(u, 1 - v);
        row.push(pos.length / 3 - 1);
      }
      grid.push(row);
    }
    for (let y = 0; y < heightSegments; y++) for (let x = 0; x < widthSegments; x++) {
      const a = grid[y][x + 1], b = grid[y][x], c = grid[y + 1][x], d = grid[y + 1][x + 1];
      if (y !== 0) idx.push(a, b, d);
      if (y !== heightSegments - 1) idx.push(b, c, d);
    }
    return new Geometry({ positions: pos, normals: nor, uvs: uv, indices: idx, name: 'sphere', params: { type: 'sphere', radius, widthSegments, heightSegments } });
  }

  /** XZ 平面上の板（法線 +Y）。 */
  static plane(width = 1, depth = 1, widthSegments = 1, depthSegments = 1) {
    widthSegments = Math.max(1, Math.floor(widthSegments)); depthSegments = Math.max(1, Math.floor(depthSegments));
    const pos = [], nor = [], uv = [], idx = [];
    for (let iz = 0; iz <= depthSegments; iz++) for (let ix = 0; ix <= widthSegments; ix++) {
      pos.push((ix / widthSegments - 0.5) * width, 0, (iz / depthSegments - 0.5) * depth); nor.push(0, 1, 0); uv.push(ix / widthSegments, 1 - iz / depthSegments);
    }
    const w1 = widthSegments + 1;
    for (let iz = 0; iz < depthSegments; iz++) for (let ix = 0; ix < widthSegments; ix++) {
      const i00 = iz * w1 + ix, i10 = i00 + 1, i01 = i00 + w1, i11 = i01 + 1;
      idx.push(i00, i01, i11, i00, i11, i10);
    }
    return new Geometry({ positions: pos, normals: nor, uvs: uv, indices: idx, name: 'plane', params: { type: 'plane', width, depth, widthSegments, depthSegments } });
  }

  static cylinder(radiusTop = 0.5, radiusBottom = 0.5, height = 1, radialSegments = 24, caps = true) {
    radialSegments = Math.max(3, Math.floor(radialSegments));
    const pos = [], nor = [], uv = [], idx = [], h2 = height / 2, slope = height ? (radiusBottom - radiusTop) / height : 0;
    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments, th = u * Math.PI * 2, sx = Math.sin(th), cz = Math.cos(th);
      const l = Math.hypot(1, slope);
      pos.push(sx * radiusTop, h2, cz * radiusTop); nor.push(sx / l, slope / l, cz / l); uv.push(u, 1);
      pos.push(sx * radiusBottom, -h2, cz * radiusBottom); nor.push(sx / l, slope / l, cz / l); uv.push(u, 0);
    }
    for (let i = 0; i < radialSegments; i++) { const t = i * 2, b = t + 1, t2 = t + 2, b2 = t + 3; idx.push(t, b, t2, b, b2, t2); }
    const cap = (top) => {
      const r = top ? radiusTop : radiusBottom; if (!(r > 0)) return;
      const y = top ? h2 : -h2, ny = top ? 1 : -1, c = pos.length / 3;
      pos.push(0, y, 0); nor.push(0, ny, 0); uv.push(0.5, 0.5);
      for (let i = 0; i <= radialSegments; i++) { const th = i / radialSegments * Math.PI * 2; pos.push(Math.sin(th) * r, y, Math.cos(th) * r); nor.push(0, ny, 0); uv.push(0.5 + Math.sin(th) * 0.5, 0.5 + Math.cos(th) * 0.5); }
      for (let i = 0; i < radialSegments; i++) top ? idx.push(c, c + 1 + i, c + 2 + i) : idx.push(c, c + 2 + i, c + 1 + i);
    };
    if (caps) { cap(true); cap(false); }
    return new Geometry({ positions: pos, normals: nor, uvs: uv, indices: idx, name: 'cylinder', params: { type: 'cylinder', radiusTop, radiusBottom, height, radialSegments, caps } });
  }

  /** XZ 平面のグリッド線 (mode:'lines')。 */
  static grid(size = 10, divisions = 10) {
    divisions = Math.max(1, Math.floor(divisions));
    const pos = [], h = size / 2;
    for (let i = 0; i <= divisions; i++) { const t = -h + (i / divisions) * size; pos.push(t, 0, -h, t, 0, h, -h, 0, t, h, 0, t); }
    return new Geometry({ positions: pos, mode: 'lines', name: 'grid', params: { type: 'grid', size, divisions } });
  }
}

function toF32(a, name) {
  if (!a) return null;
  if (a instanceof Float32Array) return a;
  if (Array.isArray(a) || ArrayBuffer.isView(a)) return Float32Array.from(a);
  throw new TypeError('Geometry: ' + name + ' は配列または TypedArray が必要です。');
}
