/*
 * ブロードフェーズ。衝突体の AABB から「重なっているかもしれないペア」を絞り込む。
 * 3 方式を同じインターフェースで提供し、用途に応じて選ぶ:
 *
 *   BruteForceBroadphase   O(N²) 総当たり。正しさの基準実装（テスト用）と、ごく少数の衝突体向け。
 *   SpatialHashBroadphase  一様グリッド + ハッシュ。大きさが似ている大量の動的物体に強い。毎ステップ再構築（カウントソート、確保なし）。
 *   TreeBroadphase         動的 AABB ツリー（Box2D 型・太らせた AABB・回転バランス）。大きさがばらばら/静的が多い/レイキャスト多用に強い。
 *
 * 共通メソッド（world.aabb を単一の真実とする）:
 *   setLists(dyn, nDyn, stat, nStat)   動的/静的の構成が変わったとき
 *   markStaticDirty()                  静的物体が動いた/増減したとき
 *   insert(i) / remove(i) / update(i)  個別通知（ツリー用。ハッシュ/総当たりでは何もしない）
 *   prepare()                          ステップ前の準備（ハッシュの再構築）
 *   findPairs(cb)                      cb(i, j): AABB が実際に重なる全ペアを 1 回ずつ（静的どうしは除く）
 *   queryAABB(x0,y0,z0,x1,y1,z1, cb)   cb(i): AABB が重なる衝突体
 *   raycast(ox,oy,oz,dx,dy,dz,tmax,fn) fn(i, tmax) → 更新後の tmax を返す（候補ごと）
 *   stats.tests                        実行した AABB 判定の回数（ブロードフェーズの効率の指標）
 */
import { F_STATIC } from './flags.js';

const overlap = (A, i, j) => A[i * 6] <= A[j * 6 + 3] && A[i * 6 + 3] >= A[j * 6] && A[i * 6 + 1] <= A[j * 6 + 4] && A[i * 6 + 4] >= A[j * 6 + 1] && A[i * 6 + 2] <= A[j * 6 + 5] && A[i * 6 + 5] >= A[j * 6 + 2];

/** レイと AABB のスラブ判定。交差すれば入射距離（始点内部は 0）、しなければ Infinity。 */
export function rayAABB(A, o, ox, oy, oz, ix, iy, iz, tmax) {
  // ix,iy,iz は 1/dir（0 除算は ±Infinity になり、スラブ判定として正しく動く）
  let t0 = 0, t1 = tmax, a, b, t;
  a = (A[o] - ox) * ix; b = (A[o + 3] - ox) * ix; if (a > b) { t = a; a = b; b = t; } if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) return Infinity;
  a = (A[o + 1] - oy) * iy; b = (A[o + 4] - oy) * iy; if (a > b) { t = a; a = b; b = t; } if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) return Infinity;
  a = (A[o + 2] - oz) * iz; b = (A[o + 5] - oz) * iz; if (a > b) { t = a; a = b; b = t; } if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) return Infinity;
  return t0;
}
const NaNsafe = v => (v !== v ? 0 : v);

/* ====================================================================== 総当たり（基準実装） */
export class BruteForceBroadphase {
  constructor(world) {
    this.W = world; this.dyn = new Int32Array(0); this.nDyn = 0; this.stat = new Int32Array(0); this.nStat = 0; this.stats = { tests: 0 }; this.kind = 'brute';
  }
  setLists(d, nd, s, ns) { this.dyn = d; this.nDyn = nd; this.stat = s; this.nStat = ns; }
  markStaticDirty() { } insert() { } remove() { } update() { } prepare() { }
  findPairs(cb) {
    const A = this.W.aabb, d = this.dyn, s = this.stat; let tests = 0;
    for (let a = 0; a < this.nDyn; a++) {
      const i = d[a];
      for (let b = a + 1; b < this.nDyn; b++) { tests++; if (overlap(A, i, d[b])) cb(i, d[b]); }
      for (let b = 0; b < this.nStat; b++) { tests++; if (overlap(A, i, s[b])) cb(i, s[b]); }
    }
    this.stats.tests = tests;
  }
  queryAABB(x0, y0, z0, x1, y1, z1, cb) {
    const A = this.W.aabb;
    const test = i => { const o = i * 6; this.stats.tests++; if (A[o] <= x1 && A[o + 3] >= x0 && A[o + 1] <= y1 && A[o + 4] >= y0 && A[o + 2] <= z1 && A[o + 5] >= z0) cb(i); };
    for (let a = 0; a < this.nDyn; a++) test(this.dyn[a]); for (let a = 0; a < this.nStat; a++) test(this.stat[a]);
  }
  raycast(ox, oy, oz, dx, dy, dz, tmax, fn) {
    for (let a = 0; a < this.nDyn; a++) tmax = fn(this.dyn[a], tmax); for (let a = 0; a < this.nStat; a++) tmax = fn(this.stat[a], tmax); return tmax;
  }
  debugCells() { }
}

/* ====================================================================== 空間ハッシュ */
const hash3 = (x, y, z) => Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791);

/** 1 つの集合（動的または静的）をハッシュグリッドで保持する。 */
class HashSet {
  constructor(bp) {
    this.bp = bp; this.n = 0; this.list = null; this.cap = 0; this.cr = new Int32Array(0); this.sm = new Int32Array(0); this.large = new Int32Array(0); this.nSmall = 0; this.nLarge = 0;
    this.size = 0; this.mask = 0; this.starts = new Int32Array(2); this.cursor = new Int32Array(1); this.items = new Int32Array(0); this.bstamp = new Int32Array(1); this.base = 0;
    this.bmin = [Infinity, Infinity, Infinity]; this.bmax = [-Infinity, -Infinity, -Infinity]; this.cellsUsed = 0;
  }
  build(list, n, cell, maxSpan) {
    const A = this.bp.W.aabb, inv = 1 / cell; this.list = list; this.n = n; this.cell = cell; this.inv = inv; this.maxSpan = maxSpan;
    if (this.cap < n) { this.cap = Math.max(n, this.cap * 2, 16); this.cr = new Int32Array(this.cap * 6); this.sm = new Int32Array(this.cap); this.large = new Int32Array(this.cap); }
    const cr = this.cr, sm = this.sm, large = this.large; let ns = 0, nl = 0, total = 0;
    let bx0 = Infinity, by0 = Infinity, bz0 = Infinity, bx1 = -Infinity, by1 = -Infinity, bz1 = -Infinity;
    for (let k = 0; k < n; k++) {
      const i = list[k], o = i * 6;
      const x0 = Math.floor(A[o] * inv), y0 = Math.floor(A[o + 1] * inv), z0 = Math.floor(A[o + 2] * inv), x1 = Math.floor(A[o + 3] * inv), y1 = Math.floor(A[o + 4] * inv), z1 = Math.floor(A[o + 5] * inv);
      if (A[o] < bx0) bx0 = A[o]; if (A[o + 1] < by0) by0 = A[o + 1]; if (A[o + 2] < bz0) bz0 = A[o + 2]; if (A[o + 3] > bx1) bx1 = A[o + 3]; if (A[o + 4] > by1) by1 = A[o + 4]; if (A[o + 5] > bz1) bz1 = A[o + 5];
      const span = (x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1);
      if (!(span <= maxSpan)) { large[nl++] = i; continue; } // 巨大（またはNaN）: グリッドに入れず別扱い
      const r = ns * 6; cr[r] = x0; cr[r + 1] = y0; cr[r + 2] = z0; cr[r + 3] = x1; cr[r + 4] = y1; cr[r + 5] = z1; sm[ns++] = i; total += span;
    }
    this.nSmall = ns; this.nLarge = nl; this.bmin = [bx0, by0, bz0]; this.bmax = [bx1, by1, bz1];
    let size = 16; while (size < total * 2) size <<= 1;
    if (size !== this.size) { this.size = size; this.mask = size - 1; this.starts = new Int32Array(size + 1); this.cursor = new Int32Array(size); this.bstamp = new Int32Array(size); this.base = 0; }
    if (this.items.length < total) this.items = new Int32Array(Math.max(total, this.items.length * 2, 16));
    const starts = this.starts, mask = this.mask, bst = this.bstamp; starts.fill(0);
    if (this.base > 0x3fffffff - 2 * ns - 4) { bst.fill(0); this.base = 0; }
    const s1 = this.base; this.base += ns + 1; const s2 = this.base; this.base += ns + 1;
    // パス1: バケットごとの個数（同一物体の複数セルが同じバケットに落ちる場合は 1 回だけ数える）
    for (let s = 0; s < ns; s++) {
      const r = s * 6, tag = s1 + s + 1;
      for (let z = cr[r + 2]; z <= cr[r + 5]; z++) for (let y = cr[r + 1]; y <= cr[r + 4]; y++) for (let x = cr[r]; x <= cr[r + 3]; x++) {
        const b = hash3(x, y, z) & mask; if (bst[b] === tag) continue; bst[b] = tag; starts[b + 1]++;
      }
    }
    let used = 0; for (let b = 0; b < size; b++) { if (starts[b + 1] > 0) used++; starts[b + 1] += starts[b]; } this.cellsUsed = used;
    this.cursor.set(starts.subarray(0, size)); const cursor = this.cursor, items = this.items;
    for (let s = 0; s < ns; s++) {
      const r = s * 6, tag = s2 + s + 1, i = sm[s];
      for (let z = cr[r + 2]; z <= cr[r + 5]; z++) for (let y = cr[r + 1]; y <= cr[r + 4]; y++) for (let x = cr[r]; x <= cr[r + 3]; x++) {
        const b = hash3(x, y, z) & mask; if (bst[b] === tag) continue; bst[b] = tag; items[cursor[b]++] = i;
      }
    }
  }
  /** 集合内の全ペア（AABB が重なるもの）を 1 回ずつ。 */
  pairs(cb) {
    const A = this.bp.W.aabb, starts = this.starts, items = this.items, mask = this.mask, inv = this.inv; let tests = 0;
    for (let b = 0; b < this.size; b++) {
      const s = starts[b], e = starts[b + 1]; if (e - s < 2) continue;
      for (let p = s; p < e; p++) {
        const i = items[p], oi = i * 6, ix0 = A[oi], iy0 = A[oi + 1], iz0 = A[oi + 2], ix1 = A[oi + 3], iy1 = A[oi + 4], iz1 = A[oi + 5];
        for (let q = p + 1; q < e; q++) {
          const j = items[q], oj = j * 6; tests++;
          if (ix0 > A[oj + 3] || ix1 < A[oj] || iy0 > A[oj + 4] || iy1 < A[oj + 1] || iz0 > A[oj + 5] || iz1 < A[oj + 2]) continue;
          // 重複排除: 両者の重なり領域の最小角を含むセルのバケットでのみ報告する
          const rx = Math.floor((ix0 > A[oj] ? ix0 : A[oj]) * inv), ry = Math.floor((iy0 > A[oj + 1] ? iy0 : A[oj + 1]) * inv), rz = Math.floor((iz0 > A[oj + 2] ? iz0 : A[oj + 2]) * inv);
          if ((hash3(rx, ry, rz) & mask) !== b) continue;
          cb(i, j);
        }
      }
    }
    // 巨大物体: 小物体すべて + 後続の巨大物体と総当たり
    const sm = this.sm, large = this.large;
    for (let a = 0; a < this.nLarge; a++) {
      const L = large[a];
      for (let s = 0; s < this.nSmall; s++) { tests++; if (overlap(A, L, sm[s])) cb(L, sm[s]); }
      for (let b = a + 1; b < this.nLarge; b++) { tests++; if (overlap(A, L, large[b])) cb(L, large[b]); }
    }
    this.bp.stats.tests += tests;
  }
  query(x0, y0, z0, x1, y1, z1, cb) {
    const A = this.bp.W.aabb, inv = this.inv; let tests = 0;
    if (this.nSmall > 0) {
      const cx0 = Math.floor(x0 * inv), cy0 = Math.floor(y0 * inv), cz0 = Math.floor(z0 * inv), cx1 = Math.floor(x1 * inv), cy1 = Math.floor(y1 * inv), cz1 = Math.floor(z1 * inv);
      const span = (cx1 - cx0 + 1) * (cy1 - cy0 + 1) * (cz1 - cz0 + 1), sm = this.sm;
      if (span <= this.maxSpan) {
        const qs = this.bp._nextStamp(), qstamp = this.bp.qstamp, starts = this.starts, items = this.items, mask = this.mask;
        for (let z = cz0; z <= cz1; z++) for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) {
          const b = hash3(x, y, z) & mask;
          for (let p = starts[b], e = starts[b + 1]; p < e; p++) {
            const i = items[p]; if (qstamp[i] === qs) continue; qstamp[i] = qs; tests++; const o = i * 6;
            if (A[o] <= x1 && A[o + 3] >= x0 && A[o + 1] <= y1 && A[o + 4] >= y0 && A[o + 2] <= z1 && A[o + 5] >= z0) cb(i);
          }
        }
      } else {
        for (let s = 0; s < this.nSmall; s++) { const i = sm[s], o = i * 6; tests++; if (A[o] <= x1 && A[o + 3] >= x0 && A[o + 1] <= y1 && A[o + 4] >= y0 && A[o + 2] <= z1 && A[o + 5] >= z0) cb(i); }
      }
    }
    for (let a = 0; a < this.nLarge; a++) { const i = this.large[a], o = i * 6; tests++; if (A[o] <= x1 && A[o + 3] >= x0 && A[o + 1] <= y1 && A[o + 4] >= y0 && A[o + 2] <= z1 && A[o + 5] >= z0) cb(i); }
    this.bp.stats.tests += tests;
  }
  /** 3D-DDA (Amanatides–Woo) でレイが通るセルだけを走査する。 */
  ray(ox, oy, oz, dx, dy, dz, tmax, fn) {
    for (let a = 0; a < this.nLarge; a++) tmax = fn(this.large[a], tmax);
    if (this.nSmall === 0) return tmax;
    const inv = this.inv, cell = this.cell, b0 = this.bmin, b1 = this.bmax;
    let t0 = 0, t1 = tmax;
    const o3 = [ox, oy, oz], d3 = [dx, dy, dz];
    for (let k = 0; k < 3; k++) {
      if (Math.abs(d3[k]) < 1e-14) { if (o3[k] < b0[k] || o3[k] > b1[k]) return tmax; continue; }
      let a = (b0[k] - o3[k]) / d3[k], b = (b1[k] - o3[k]) / d3[k]; if (a > b) { const t = a; a = b; b = t; }
      if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) return tmax;
    }
    const px = ox + dx * t0, py = oy + dy * t0, pz = oz + dz * t0;
    let cx = Math.floor(px * inv), cy = Math.floor(py * inv), cz = Math.floor(pz * inv);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    let tmx = Math.abs(dx) < 1e-14 ? Infinity : ((dx > 0 ? (cx + 1) * cell : cx * cell) - ox) / dx;
    let tmy = Math.abs(dy) < 1e-14 ? Infinity : ((dy > 0 ? (cy + 1) * cell : cy * cell) - oy) / dy;
    let tmz = Math.abs(dz) < 1e-14 ? Infinity : ((dz > 0 ? (cz + 1) * cell : cz * cell) - oz) / dz;
    const tdx = Math.abs(dx) < 1e-14 ? Infinity : cell / Math.abs(dx), tdy = Math.abs(dy) < 1e-14 ? Infinity : cell / Math.abs(dy), tdz = Math.abs(dz) < 1e-14 ? Infinity : cell / Math.abs(dz);
    const maxSteps = Math.min(2000000, Math.ceil((b1[0] - b0[0] + b1[1] - b0[1] + b1[2] - b0[2]) * inv) + 8);
    const qs = this.bp._nextStamp(), qstamp = this.bp.qstamp, starts = this.starts, items = this.items, mask = this.mask;
    for (let step = 0; step < maxSteps; step++) {
      const b = hash3(cx, cy, cz) & mask;
      for (let p = starts[b], e = starts[b + 1]; p < e; p++) { const i = items[p]; if (qstamp[i] === qs) continue; qstamp[i] = qs; tmax = fn(i, tmax); }
      const tn = tmx < tmy ? (tmx < tmz ? tmx : tmz) : (tmy < tmz ? tmy : tmz);
      if (tn > tmax || tn > t1 + 1e-9) break;
      if (tmx <= tmy && tmx <= tmz) { cx += sx; tmx += tdx; } else if (tmy <= tmz) { cy += sy; tmy += tdy; } else { cz += sz; tmz += tdz; }
    }
    return tmax;
  }
}

export class SpatialHashBroadphase {
  /** options: cellSize (0 = 自動: 動的物体の AABB 最大辺の中央値の 1.5〜2 倍), maxSpan (1 物体が占有してよい最大セル数。超えると巨大物体扱い) */
  constructor(world, options = {}) {
    this.W = world; this.kind = 'hash'; this.dyn = new Int32Array(0); this.nDyn = 0; this.stat = new Int32Array(0); this.nStat = 0;
    this.cellOption = options.cellSize || 0; this.maxSpan = options.maxSpan || 512; this.cell = 1; this._staticDirty = true; this._listsDirty = true;
    this.dynSet = new HashSet(this); this.statSet = new HashSet(this); this.stats = { tests: 0, cellSize: 1, largeDyn: 0, largeStatic: 0, buckets: 0 };
    this.qstamp = new Int32Array(0); this._qs = 0;
  }
  _nextStamp() { const need = this.W.capacity; if (this.qstamp.length < need) { const s = new Int32Array(need); s.set(this.qstamp); this.qstamp = s; } if (++this._qs > 0x7ffffff0) { this.qstamp.fill(0); this._qs = 1; } return this._qs; }
  setLists(d, nd, s, ns) { this.dyn = d; this.nDyn = nd; this.stat = s; this.nStat = ns; this._listsDirty = true; this._staticDirty = true; }
  markStaticDirty() { this._staticDirty = true; }
  insert() { } remove() { } update() { }
  _autoCell() {
    // 動的物体（無ければ静的）の AABB 最大辺の中央値 ×1.5。サンプルは最大 4096 個。
    const A = this.W.aabb, list = this.nDyn > 0 ? this.dyn : this.stat, n = this.nDyn > 0 ? this.nDyn : this.nStat; if (n === 0) return 1;
    const step = Math.max(1, Math.floor(n / 4096)), a = []; for (let k = 0; k < n; k += step) { const o = list[k] * 6; const e = Math.max(A[o + 3] - A[o], A[o + 4] - A[o + 1], A[o + 5] - A[o + 2]); if (e > 0 && e < 1e20) a.push(e); }
    if (!a.length) return 1; a.sort((x, y) => x - y); return Math.max(1e-6, a[a.length >> 1] * 1.5);
  }
  prepare() {
    if (this._listsDirty) { this.cell = this.cellOption > 0 ? this.cellOption : this._autoCell(); this._listsDirty = false; this._staticDirty = true; }
    this.stats.cellSize = this.cell;
    if (this._staticDirty) { this.statSet.build(this.stat, this.nStat, this.cell, this.maxSpan); this._staticDirty = false; }
    this.dynSet.build(this.dyn, this.nDyn, this.cell, this.maxSpan);
    this.stats.largeDyn = this.dynSet.nLarge; this.stats.largeStatic = this.statSet.nLarge; this.stats.buckets = this.dynSet.cellsUsed;
  }
  findPairs(cb) {
    this.stats.tests = 0; this.dynSet.pairs(cb);
    const A = this.W.aabb, dyn = this.dyn;
    if (this.nStat > 0) for (let k = 0; k < this.nDyn; k++) { const i = dyn[k], o = i * 6; this.statSet.query(A[o], A[o + 1], A[o + 2], A[o + 3], A[o + 4], A[o + 5], j => cb(i, j)); }
  }
  queryAABB(x0, y0, z0, x1, y1, z1, cb) { this.dynSet.query(x0, y0, z0, x1, y1, z1, cb); this.statSet.query(x0, y0, z0, x1, y1, z1, cb); }
  raycast(ox, oy, oz, dx, dy, dz, tmax, fn) { tmax = this.dynSet.ray(ox, oy, oz, dx, dy, dz, tmax, fn); return this.statSet.ray(ox, oy, oz, dx, dy, dz, tmax, fn); }
  /** デバッグ描画用: 使用中セルの座標を cb(cx,cy,cz,cellSize,isStatic) で列挙（重複なし）。 */
  debugCells(cb) {
    const A = this.W.aabb, inv = 1 / this.cell, seen = new Set();
    for (const [set, list, n, st] of [[this.dynSet, this.dyn, this.nDyn, false], [this.statSet, this.stat, this.nStat, true]]) {
      for (let k = 0; k < n; k++) {
        const o = list[k] * 6, x0 = Math.floor(A[o] * inv), y0 = Math.floor(A[o + 1] * inv), z0 = Math.floor(A[o + 2] * inv), x1 = Math.floor(A[o + 3] * inv), y1 = Math.floor(A[o + 4] * inv), z1 = Math.floor(A[o + 5] * inv);
        if ((x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1) > this.maxSpan) continue;
        for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const key = x + ',' + y + ',' + z + (st ? 's' : 'd'); if (!seen.has(key)) { seen.add(key); cb(x, y, z, this.cell, st); } }
      }
    }
  }
}

/* ====================================================================== 動的 AABB ツリー */
export class DynamicTree {
  constructor(cap = 64) {
    this.cap = 0; this.box = new Float64Array(0); this.parent = new Int32Array(0); this.c1 = new Int32Array(0); this.c2 = new Int32Array(0); this.height = new Int32Array(0); this.obj = new Int32Array(0);
    this.root = -1; this.freeList = -1; this.count = 0; this.stack = new Int32Array(256); this._grow(Math.max(16, cap));
  }
  _grow(n) {
    const old = this.cap, cap = Math.max(n, old * 2), bx = new Float64Array(cap * 6); bx.set(this.box); this.box = bx;
    const g = (a) => { const b = new Int32Array(cap); b.set(a); return b; };
    this.parent = g(this.parent); this.c1 = g(this.c1); this.c2 = g(this.c2); this.height = g(this.height); this.obj = g(this.obj);
    for (let i = old; i < cap; i++) { this.parent[i] = i + 1 < cap ? i + 1 : this.freeList; this.height[i] = -1; this.obj[i] = -1; } // 空きリスト
    this.freeList = old; this.cap = cap;
  }
  _alloc() { if (this.freeList < 0) this._grow(this.cap + 1); const n = this.freeList; this.freeList = this.parent[n]; this.parent[n] = -1; this.c1[n] = -1; this.c2[n] = -1; this.height[n] = 0; this.obj[n] = -1; this.count++; return n; }
  _free(n) { this.parent[n] = this.freeList; this.height[n] = -1; this.freeList = n; this.count--; }
  _sa(n) { const b = this.box, o = n * 6, x = b[o + 3] - b[o], y = b[o + 4] - b[o + 1], z = b[o + 5] - b[o + 2]; return 2 * (x * y + y * z + z * x); }
  _saUnion(a, b2) {
    const b = this.box, o = a * 6, p = b2 * 6, x = Math.max(b[o + 3], b[p + 3]) - Math.min(b[o], b[p]), y = Math.max(b[o + 4], b[p + 4]) - Math.min(b[o + 1], b[p + 1]), z = Math.max(b[o + 5], b[p + 5]) - Math.min(b[o + 2], b[p + 2]);
    return 2 * (x * y + y * z + z * x);
  }
  _union(dst, a, c) { const b = this.box, d = dst * 6, o = a * 6, p = c * 6; for (let k = 0; k < 3; k++) { b[d + k] = Math.min(b[o + k], b[p + k]); b[d + 3 + k] = Math.max(b[o + 3 + k], b[p + 3 + k]); } }
  /** 葉を作り、fat AABB (minx..maxz) で挿入。戻り値は節点番号。 */
  createLeaf(objIndex, x0, y0, z0, x1, y1, z1) {
    const n = this._alloc(), b = this.box, o = n * 6; b[o] = x0; b[o + 1] = y0; b[o + 2] = z0; b[o + 3] = x1; b[o + 4] = y1; b[o + 5] = z1; this.obj[n] = objIndex; this._insertLeaf(n); return n;
  }
  destroyLeaf(n) { this._removeLeaf(n); this._free(n); }
  moveLeaf(n, x0, y0, z0, x1, y1, z1) { this._removeLeaf(n); const b = this.box, o = n * 6; b[o] = x0; b[o + 1] = y0; b[o + 2] = z0; b[o + 3] = x1; b[o + 4] = y1; b[o + 5] = z1; this._insertLeaf(n); }
  _insertLeaf(leaf) {
    if (this.root < 0) { this.root = leaf; this.parent[leaf] = -1; return; }
    const np = this._alloc(); // 配列の再確保が起きうるので、c1/c2 を取り出す前に確保する
    const c1 = this.c1, c2 = this.c2; let idx = this.root;
    while (c1[idx] >= 0) { // 最良の兄弟を探索（表面積ヒューリスティック）
      const a = c1[idx], b = c2[idx], area = this._sa(idx), combined = this._saUnion(idx, leaf), cost = 2 * combined, inh = 2 * (combined - area);
      const cost1 = c1[a] < 0 ? this._saUnion(a, leaf) + inh : (this._saUnion(a, leaf) - this._sa(a)) + inh;
      const cost2 = c1[b] < 0 ? this._saUnion(b, leaf) + inh : (this._saUnion(b, leaf) - this._sa(b)) + inh;
      if (cost < cost1 && cost < cost2) break;
      idx = cost1 < cost2 ? a : b;
    }
    const sib = idx, oldP = this.parent[sib];
    this.parent[np] = oldP; this._union(np, leaf, sib); this.height[np] = this.height[sib] + 1;
    if (oldP >= 0) { if (c1[oldP] === sib) c1[oldP] = np; else c2[oldP] = np; } else this.root = np;
    c1[np] = sib; c2[np] = leaf; this.parent[sib] = np; this.parent[leaf] = np;
    for (let i = this.parent[leaf]; i >= 0; i = this.parent[i]) { i = this._balance(i); const l = c1[i], r = c2[i]; this.height[i] = 1 + Math.max(this.height[l], this.height[r]); this._union(i, l, r); }
  }
  _removeLeaf(leaf) {
    if (leaf === this.root) { this.root = -1; return; }
    const p = this.parent[leaf], gp = this.parent[p], c1 = this.c1, c2 = this.c2, sib = c1[p] === leaf ? c2[p] : c1[p];
    if (gp >= 0) {
      if (c1[gp] === p) c1[gp] = sib; else c2[gp] = sib; this.parent[sib] = gp; this._free(p);
      for (let i = gp; i >= 0; i = this.parent[i]) { i = this._balance(i); const l = c1[i], r = c2[i]; this._union(i, l, r); this.height[i] = 1 + Math.max(this.height[l], this.height[r]); }
    } else { this.root = sib; this.parent[sib] = -1; this._free(p); }
  }
  _replaceInParent(A, N) { const p = this.parent[N]; if (p >= 0) { if (this.c1[p] === A) this.c1[p] = N; else this.c2[p] = N; } else this.root = N; }
  _balance(A) {
    const c1 = this.c1, c2 = this.c2, par = this.parent, h = this.height;
    if (c1[A] < 0 || h[A] < 2) return A;
    const B = c1[A], C = c2[A], bal = h[C] - h[B];
    if (bal > 1) { // C を持ち上げる
      const F = c1[C], G = c2[C];
      c1[C] = A; par[C] = par[A]; par[A] = C; this._replaceInParent(A, C);
      if (h[F] > h[G]) { c2[C] = F; c2[A] = G; par[G] = A; this._union(A, B, G); this._union(C, A, F); h[A] = 1 + Math.max(h[B], h[G]); h[C] = 1 + Math.max(h[A], h[F]); }
      else { c2[C] = G; c2[A] = F; par[F] = A; this._union(A, B, F); this._union(C, A, G); h[A] = 1 + Math.max(h[B], h[F]); h[C] = 1 + Math.max(h[A], h[G]); }
      return C;
    }
    if (bal < -1) { // B を持ち上げる
      const D = c1[B], E = c2[B];
      c1[B] = A; par[B] = par[A]; par[A] = B; this._replaceInParent(A, B);
      if (h[D] > h[E]) { c2[B] = D; c1[A] = E; par[E] = A; this._union(A, C, E); this._union(B, A, D); h[A] = 1 + Math.max(h[C], h[E]); h[B] = 1 + Math.max(h[A], h[D]); }
      else { c2[B] = E; c1[A] = D; par[D] = A; this._union(A, C, D); this._union(B, A, E); h[A] = 1 + Math.max(h[C], h[D]); h[B] = 1 + Math.max(h[A], h[E]); }
      return B;
    }
    return A;
  }
  /** 構造検証（テスト用）: 親子リンク・高さ・包含を確認して問題の配列を返す。 */
  validate() {
    const prob = [], b = this.box; if (this.root < 0) return prob;
    const walk = n => {
      if (this.c1[n] < 0) { if (this.obj[n] < 0) prob.push('葉に obj なし ' + n); return 0; }
      const l = this.c1[n], r = this.c2[n];
      if (this.parent[l] !== n || this.parent[r] !== n) prob.push('親リンク不整合 ' + n);
      for (const ch of [l, r]) for (let k = 0; k < 3; k++) if (b[n * 6 + k] > b[ch * 6 + k] + 1e-9 || b[n * 6 + 3 + k] < b[ch * 6 + 3 + k] - 1e-9) prob.push('AABB が子を含まない ' + n);
      const hh = 1 + Math.max(walk(l), walk(r)); if (hh !== this.height[n]) prob.push('高さ不整合 ' + n); if (Math.abs(this.height[l] - this.height[r]) > 1) prob.push('不均衡 ' + n); return hh;
    };
    if (this.parent[this.root] !== -1) prob.push('根の親が -1 でない'); walk(this.root); return prob;
  }
  query(x0, y0, z0, x1, y1, z1, cb) {
    if (this.root < 0) return; let sp = 0, st = this.stack; st[sp++] = this.root; const b = this.box, c1 = this.c1, c2 = this.c2;
    while (sp > 0) {
      const n = st[--sp], o = n * 6;
      if (b[o] > x1 || b[o + 3] < x0 || b[o + 1] > y1 || b[o + 4] < y0 || b[o + 2] > z1 || b[o + 5] < z0) continue;
      if (c1[n] < 0) cb(this.obj[n], n);
      else { if (sp + 2 > st.length) { const s2 = new Int32Array(st.length * 2); s2.set(st); this.stack = st = s2; } st[sp++] = c1[n]; st[sp++] = c2[n]; }
    }
  }
  ray(ox, oy, oz, dx, dy, dz, tmax, fn) {
    if (this.root < 0) return tmax; const ix = dx !== 0 ? 1 / dx : Infinity, iy = dy !== 0 ? 1 / dy : Infinity, iz = dz !== 0 ? 1 / dz : Infinity;
    // 0 除算: 方向成分 0 のとき (min-o)*Infinity が NaN になり得る → スラブ判定を安全側に倒すため極小値に置換
    const jx = isFinite(ix) ? ix : 1e300, jy = isFinite(iy) ? iy : 1e300, jz = isFinite(iz) ? iz : 1e300;
    let sp = 0, st = this.stack; st[sp++] = this.root; const b = this.box, c1 = this.c1, c2 = this.c2;
    while (sp > 0) {
      const n = st[--sp]; if (rayAABB(b, n * 6, ox, oy, oz, NaNsafe(jx), NaNsafe(jy), NaNsafe(jz), tmax) === Infinity) continue;
      if (c1[n] < 0) tmax = fn(this.obj[n], tmax);
      else { if (sp + 2 > st.length) { const s2 = new Int32Array(st.length * 2); s2.set(st); this.stack = st = s2; } st[sp++] = c1[n]; st[sp++] = c2[n]; }
    }
    return tmax;
  }
}

export class TreeBroadphase {
  /** options: fatMargin (葉の AABB を各方向へ広げる量。大きいほど再挿入が減り、候補が増える。既定 0.15) */
  constructor(world, options = {}) {
    this.W = world; this.kind = 'tree'; this.margin = options.fatMargin === undefined ? 0.15 : options.fatMargin;
    this.tree = new DynamicTree(64); this.leaf = new Int32Array(0); this.dyn = new Int32Array(0); this.nDyn = 0; this.stat = new Int32Array(0); this.nStat = 0;
    this.stats = { tests: 0, reinserts: 0, height: 0 };
  }
  _ensure() { const n = this.W.capacity; if (this.leaf.length < n) { const l = new Int32Array(n).fill(-1); l.set(this.leaf); this.leaf = l; } }
  setLists(d, nd, s, ns) { this.dyn = d; this.nDyn = nd; this.stat = s; this.nStat = ns; }
  markStaticDirty() { }
  prepare() { }
  insert(i) {
    this._ensure(); const A = this.W.aabb, o = i * 6, m = this.margin;
    if (this.leaf[i] >= 0) return;
    this.leaf[i] = this.tree.createLeaf(i, A[o] - m, A[o + 1] - m, A[o + 2] - m, A[o + 3] + m, A[o + 4] + m, A[o + 5] + m);
  }
  remove(i) { this._ensure(); const n = this.leaf[i]; if (n >= 0) { this.tree.destroyLeaf(n); this.leaf[i] = -1; } }
  update(i) {
    this._ensure(); const n = this.leaf[i]; if (n < 0) { this.insert(i); return; }
    const A = this.W.aabb, o = i * 6, b = this.tree.box, p = n * 6;
    if (A[o] >= b[p] && A[o + 1] >= b[p + 1] && A[o + 2] >= b[p + 2] && A[o + 3] <= b[p + 3] && A[o + 4] <= b[p + 4] && A[o + 5] <= b[p + 5]) return; // まだ太らせた箱の中
    const m = this.margin; this.tree.moveLeaf(n, A[o] - m, A[o + 1] - m, A[o + 2] - m, A[o + 3] + m, A[o + 4] + m, A[o + 5] + m); this.stats.reinserts++;
  }
  findPairs(cb) {
    // コールバック/クロージャを作らず、ツリー走査をここに展開（毎ステップ数万回呼ばれるため）
    const A = this.W.aabb, F = this.W.flags, dyn = this.dyn, tree = this.tree; let tests = 0; this.stats.height = tree.root < 0 ? 0 : tree.height[tree.root];
    if (tree.root < 0) { this.stats.tests = 0; return; }
    const bx = tree.box, c1 = tree.c1, c2 = tree.c2, obj = tree.obj; let st = tree.stack;
    for (let k = 0; k < this.nDyn; k++) {
      const i = dyn[k], o = i * 6, x0 = A[o], y0 = A[o + 1], z0 = A[o + 2], x1 = A[o + 3], y1 = A[o + 4], z1 = A[o + 5];
      let sp = 0; st[sp++] = tree.root;
      while (sp > 0) {
        const n = st[--sp], q = n * 6;
        if (bx[q] > x1 || bx[q + 3] < x0 || bx[q + 1] > y1 || bx[q + 4] < y0 || bx[q + 2] > z1 || bx[q + 5] < z0) continue;
        const l = c1[n];
        if (l < 0) {
          const j = obj[n]; if (j === i) continue; if (!(F[j] & F_STATIC) && j < i) continue; // 動的どうしは小さい番号側からのみ報告
          tests++; const p = j * 6;
          if (A[p] <= x1 && A[p + 3] >= x0 && A[p + 1] <= y1 && A[p + 4] >= y0 && A[p + 2] <= z1 && A[p + 5] >= z0) cb(i, j);
        } else { if (sp + 2 > st.length) { const s2 = new Int32Array(st.length * 2); s2.set(st); tree.stack = st = s2; } st[sp++] = l; st[sp++] = c2[n]; }
      }
    }
    this.stats.tests = tests;
  }
  queryAABB(x0, y0, z0, x1, y1, z1, cb) {
    const A = this.W.aabb; let tests = 0;
    this.tree.query(x0, y0, z0, x1, y1, z1, i => { tests++; const o = i * 6; if (A[o] <= x1 && A[o + 3] >= x0 && A[o + 1] <= y1 && A[o + 4] >= y0 && A[o + 2] <= z1 && A[o + 5] >= z0) cb(i); });
    this.stats.tests += tests;
  }
  raycast(ox, oy, oz, dx, dy, dz, tmax, fn) { return this.tree.ray(ox, oy, oz, dx, dy, dz, tmax, fn); }
  debugCells(cb) { const t = this.tree, b = t.box; const walk = (n, depth) => { if (n < 0) return; cb(b[n * 6], b[n * 6 + 1], b[n * 6 + 2], b[n * 6 + 3], b[n * 6 + 4], b[n * 6 + 5], depth, t.c1[n] < 0); if (t.c1[n] >= 0) { walk(t.c1[n], depth + 1); walk(t.c2[n], depth + 1); } }; walk(t.root, 0); }
}
