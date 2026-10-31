import { mat4, vec3 } from './math.js';

const _inv = mat4.create(), _invI = mat4.create(), _o = new Float64Array(3), _d = new Float64Array(3), _o2 = new Float64Array(3), _d2 = new Float64Array(3);
const _bmin = new Float64Array(3), _bmax = new Float64Array(3), _tmpM = mat4.create();

export class Ray {
  constructor(origin = [0, 0, 0], direction = [0, 0, -1]) { this.origin = Float64Array.from(origin); this.direction = vec3.normalize(new Float64Array(3), direction); }
  at(t, out = new Float64Array(3)) { out[0] = this.origin[0] + this.direction[0] * t; out[1] = this.origin[1] + this.direction[1] * t; out[2] = this.origin[2] + this.direction[2] * t; return out; }
}

/** カメラとNDC座標 (-1..1, 上が+1) からワールド空間のレイを作る。 */
export function rayFromCamera(camera, ndcX, ndcY) {
  const inv = mat4.invert(_invI, camera.viewProjection);
  if (!inv) throw new Error('rayFromCamera: ビュー射影行列が特異です。');
  const a = vec3.transformMat4(new Float64Array(3), [ndcX, ndcY, -1], inv), b = vec3.transformMat4(new Float64Array(3), [ndcX, ndcY, 1], inv);
  return new Ray(a, vec3.sub(new Float64Array(3), b, a));
}

/** スラブ法。命中した入口パラメータ t (原点が内部なら 0)、外れなら -1。 */
export function intersectAABB(o, d, min, max, tMax = Infinity) {
  let t0 = 0, t1 = tMax;
  for (let k = 0; k < 3; k++) {
    const dk = d[k];
    if (Math.abs(dk) < 1e-14) { if (o[k] < min[k] || o[k] > max[k]) return -1; continue; }
    const inv = 1 / dk; let a = (min[k] - o[k]) * inv, b = (max[k] - o[k]) * inv;
    if (a > b) { const t = a; a = b; b = t; }
    if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) return -1;
  }
  return t0;
}

/** Möller–Trumbore（両面）。命中なら t、外れなら -1。 */
export function intersectTriangle(o, d, p, a, b, c) {
  const e1x = p[b] - p[a], e1y = p[b + 1] - p[a + 1], e1z = p[b + 2] - p[a + 2], e2x = p[c] - p[a], e2y = p[c + 1] - p[a + 1], e2z = p[c + 2] - p[a + 2];
  const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
  const det = e1x * px + e1y * py + e1z * pz;
  if (Math.abs(det) < 1e-14) return -1;
  const inv = 1 / det, tx = o[0] - p[a], ty = o[1] - p[a + 1], tz = o[2] - p[a + 2];
  const u = (tx * px + ty * py + tz * pz) * inv; if (u < 0 || u > 1) return -1;
  const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
  const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv; if (v < 0 || u + v > 1) return -1;
  const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
  return t >= 0 ? t : -1;
}

/** ジオメトリの三角形を総当たり。ローカル空間レイで最も近い {t, face, nx,ny,nz} を返す (なければ null)。 */
function raycastGeometry(geo, o, d, tMax) {
  if (geo.mode !== 'triangles') return null;
  const p = geo.positions, ind = geo.indices, n = ind ? ind.length / 3 : p.length / 9;
  let best = tMax, face = -1;
  for (let t = 0; t < n; t++) {
    const a = (ind ? ind[t * 3] : t * 3) * 3, b = (ind ? ind[t * 3 + 1] : t * 3 + 1) * 3, c = (ind ? ind[t * 3 + 2] : t * 3 + 2) * 3;
    const r = intersectTriangle(o, d, p, a, b, c);
    if (r >= 0 && r < best) { best = r; face = t; }
  }
  if (face < 0) return null;
  const a = (ind ? ind[face * 3] : face * 3) * 3, b = (ind ? ind[face * 3 + 1] : face * 3 + 1) * 3, c = (ind ? ind[face * 3 + 2] : face * 3 + 2) * 3;
  const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
  nx /= l; ny /= l; nz /= l;
  if (nx * d[0] + ny * d[1] + nz * d[2] > 0) { nx = -nx; ny = -ny; nz = -nz; } // レイに向く側
  return { t: best, face, nx, ny, nz };
}

function worldNormal(out, inv, nx, ny, nz) {
  const x = inv[0] * nx + inv[1] * ny + inv[2] * nz, y = inv[4] * nx + inv[5] * ny + inv[6] * nz, z = inv[8] * nx + inv[9] * ny + inv[10] * nz;
  const l = Math.hypot(x, y, z) || 1; out[0] = x / l; out[1] = y / l; out[2] = z / l; return out;
}

/**
 * シーン内の Mesh / InstancedMesh に対するレイキャスト。
 * 戻り値: 距離昇順の配列 [{object, distance, point:[x,y,z], normal:[x,y,z], faceIndex, instanceId?}]
 * 計算量: 候補のAABB判定 + 命中候補の三角形総当たり。巨大な静的メッシュでは重くなり得る。
 */
export function raycast(scene, ray, opts = {}) {
  const hits = [], maxD = opts.maxDistance === undefined ? Infinity : opts.maxDistance, filter = opts.filter || null;
  const o = ray.origin, d = ray.direction;
  const walk = node => {
    if (!node.visible) return;
    if ((node.type === 'Mesh' || node.type === 'InstancedMesh') && (!filter || filter(node))) {
      if (node.type === 'Mesh') hitMesh(node); else hitInstanced(node);
    }
    for (let i = 0; i < node.children.length; i++) walk(node.children[i]);
  };
  const hitMesh = m => {
    if (m.geometry.mode !== 'triangles') return;
    m.updateWorldBounds();
    if (intersectAABB(o, d, m.wmin, m.wmax, maxD) < 0) return;
    if (!mat4.invert(_inv, m._world)) return;
    vec3.transformMat4(_o, o, _inv); vec3.transformDir(_d, d, _inv);
    const r = raycastGeometry(m.geometry, _o, _d, Infinity);
    if (!r) return;
    const point = [o[0] + d[0] * r.t, o[1] + d[1] * r.t, o[2] + d[2] * r.t];
    if (r.t > maxD) return;
    hits.push({ object: m, distance: r.t, point, normal: Array.from(worldNormal(new Float64Array(3), _inv, r.nx, r.ny, r.nz)), faceIndex: r.face });
  };
  const hitInstanced = m => {
    if (!mat4.invert(_inv, m._world)) return;
    vec3.transformMat4(_o, o, _inv); vec3.transformDir(_d, d, _inv);
    const gb = m.geometry.bounds, mat = m.matrices, cs = m.chunkSize;
    for (let c = 0; c < m.chunkCount; c++) {
      const ch = m.chunks[c]; if (ch.boundsDirty) m.computeChunkBounds(c);
      if (intersectAABB(_o, _d, ch.min, ch.max) < 0) continue;
      const s = c * cs, e = Math.min(m.count, s + cs);
      for (let i = s; i < e; i++) {
        const base = i * 16; for (let k = 0; k < 16; k++) _tmpM[k] = mat[base + k];
        mat4.transformAABB(_bmin, _bmax, gb.min, gb.max, _tmpM);
        const tb = intersectAABB(_o, _d, _bmin, _bmax);
        if (tb < 0) continue;
        let t = tb, face = -1, nx = 0, ny = 1, nz = 0, inv2 = _tmpM;
        if (m.preciseRaycast && m.geometry.mode === 'triangles') {
          const im = mat4.invert(_invI, _tmpM); if (!im) continue;
          vec3.transformMat4(_o2, _o, _invI); vec3.transformDir(_d2, _d, _invI);
          const r = raycastGeometry(m.geometry, _o2, _d2, Infinity);
          if (!r) continue;
          t = r.t; face = r.face; nx = r.nx; ny = r.ny; nz = r.nz; inv2 = _invI;
          // インスタンス逆行列 → ノード逆行列の順に法線を変換
          const wn = worldNormal(new Float64Array(3), inv2, nx, ny, nz); worldNormal(wn, _inv, wn[0], wn[1], wn[2]);
          nx = wn[0]; ny = wn[1]; nz = wn[2];
        }
        if (t > maxD) continue;
        const point = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
        hits.push({ object: m, distance: t, point, normal: [nx, ny, nz], faceIndex: face, instanceId: i });
      }
    }
  };
  walk(scene);
  hits.sort((a, b) => a.distance - b.distance);
  return opts.limit ? hits.slice(0, opts.limit) : hits;
}
