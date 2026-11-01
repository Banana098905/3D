/*
 * CollisionWorld — 衝突判定ワールド（検出専用。位置を勝手に動かさない）。
 *
 * できること:
 *   - 形状: 球 / AABB / OBB / カプセル / 平面（+ レイ）。位置・回転・サイズを変更可能。
 *   - ブロードフェーズ: 空間ハッシュ / 動的AABBツリー / 総当たり（基準）。runtime で切り替え可。
 *   - ナローフェーズ: 接触点・法線（a→b）・貫通深度。
 *   - 接触状態の管理: 開始(collisionstart) / 継続(collisionstay) / 終了(collisionend)、Trigger 版(triggerenter/stay/exit)。
 *   - Collision Layer / Mask: 双方向（A.layer & B.mask かつ B.layer & A.mask）。
 *   - 連続衝突判定: continuous:true の球は、前ステップ位置から現在位置までの線分スイープで壁のすり抜けを検出。
 *   - クエリ: raycast / raycastAll / queryAABB / queryRadius / sweepSphere / testPair。
 *   - ハンドル（世代つき）で参照。削除済みハンドルは必ず無効になる。
 *
 * 使い方の流れ: addXxx() → 毎フレーム setPosition() 等で動かす → step() → events / queries。
 * step() はイベントを events（再利用される配列）に溜める。次の step() までの間だけ有効。
 */
import { HandleAllocator, HANDLE_INDEX_LIMIT } from '../handles.js';
import { now, MassiveEngineError } from '../util.js';
import { SHAPE_SPHERE, SHAPE_AABB, SHAPE_OBB, SHAPE_CAPSULE, SHAPE_PLANE, SHAPE_BY_NAME, SHAPE_NAMES, quatToAxes, computeAABB } from './shapes.js';
import { Contact, collide, rayShape, RayHit, sweepSphere as sweepSphereNP, pointDistance } from './narrowphase.js';
import { BruteForceBroadphase, SpatialHashBroadphase, TreeBroadphase } from './broadphase.js';
import { F_ENABLED, F_STATIC, F_TRIGGER, F_CONTINUOUS } from './flags.js';

export const EVENT_START = 'collisionstart', EVENT_STAY = 'collisionstay', EVENT_END = 'collisionend';
export const EVENT_TRIGGER_ENTER = 'triggerenter', EVENT_TRIGGER_STAY = 'triggerstay', EVENT_TRIGGER_EXIT = 'triggerexit';
const ALL = 0xffffffff;

class PairRecord {
  constructor() { this.key = 0; this.a = 0; this.b = 0; this.ha = 0; this.hb = 0; this.ua = null; this.ub = null; this.stamp = 0; this.isNew = false; this.trigger = false; this.contact = new Contact(); }
}
export class CollisionEvent {
  constructor() { this.type = ''; this.a = 0; this.b = 0; this.trigger = false; this.nx = 0; this.ny = 0; this.nz = 0; this.depth = 0; this.px = 0; this.py = 0; this.pz = 0; this.toi = -1; this.userA = null; this.userB = null; }
}

const DEFAULTS = { broadphase: 'hash', cellSize: 0, maxSpan: 512, fatMargin: 0.15, emitStay: true, onEvent: null, ccdClamp: false, checkDuplicates: false, onWarning: null };

export class CollisionWorld {
  constructor(options = {}) {
    for (const k of Object.keys(options)) if (!(k in DEFAULTS)) throw new RangeError('CollisionWorld: 未知のオプション ' + k);
    this.options = Object.assign({}, DEFAULTS, options);
    this.alloc = new HandleAllocator(64); this.capacity = 0;
    this.type = new Uint8Array(0); this.flags = new Uint8Array(0); this.layer = new Uint32Array(0); this.mask = new Uint32Array(0);
    this.pos = new Float64Array(0); this.prev = new Float64Array(0); this.rotm = new Float64Array(0); this.par = new Float64Array(0); this.aabb = new Float64Array(0); this.quat = new Float64Array(0);
    this.userData = []; this._ensure(64);
    this.S = this; // ナローフェーズ関数に渡す構造（type, pos, rotm, par を持つ）
    this.dyn = new Int32Array(0); this.nDyn = 0; this.stat = new Int32Array(0); this.nStat = 0; this.planes = []; this.cont = []; this._listsDirty = true;
    this.bp = null; this.bpKind = null; this._requestedKind = this.options.broadphase;
    this.pairs = new Map(); this._pairPool = []; this._newPairs = []; this._ended = []; this.stepId = 0; this.time = 0;
    this._contact = new Contact(); this._c2 = new Contact(); this._hit = new RayHit();
    this.events = []; this.eventCount = 0; this._evPool = []; this.onEvent = this.options.onEvent;
    this._cand = new Int32Array(1024); this._nCand = 0;
    this._pairCb = (i, j) => this._onPair(i, j);
    this.stats = { colliders: 0, active: 0, dynamic: 0, static: 0, planes: 0, broadphase: '', broadTests: 0, candidatePairs: 0, contacts: 0, newPairs: 0, endedPairs: 0, duplicatePairs: 0, ccdTests: 0, ccdHits: 0, events: 0, broadMs: 0, narrowMs: 0, ccdMs: 0, eventMs: 0, stepMs: 0 };
  }
  warn(m) { if (this.options.onWarning) this.options.onWarning(m); }
  _ensure(n) {
    if (n <= this.capacity) return; const cap = Math.max(n, this.capacity * 2, 64);
    const g = (A, k, C = Float64Array) => { const a = new C(cap * k); a.set(A); return a; };
    this.type = g(this.type, 1, Uint8Array); this.flags = g(this.flags, 1, Uint8Array); this.layer = g(this.layer, 1, Uint32Array); this.mask = g(this.mask, 1, Uint32Array);
    this.pos = g(this.pos, 3); this.prev = g(this.prev, 3); this.rotm = g(this.rotm, 9); this.par = g(this.par, 4); this.aabb = g(this.aabb, 6); this.quat = g(this.quat, 4);
    this.capacity = cap;
  }

  /* ------------------------------------------------------------ 生成・削除 */
  /**
   * 衝突体を追加してハンドルを返す。
   * d: { type:'sphere'|'aabb'|'obb'|'capsule'|'plane', position, rotation([x,y,z,w]), radius, halfExtents|size, halfLength|height, normal, offset,
   *      layer(既定 1), mask(既定 全部), trigger, static, continuous(球のみ), enabled, userData }
   * 平面は常に静的。AABB は rotation を無視する。capsule の height は全長（半球込み）で、halfLength = height/2 - radius。
   */
  add(d) {
    if (!d || typeof d !== 'object') throw new TypeError('CollisionWorld.add: 記述オブジェクトが必要です。');
    const type = typeof d.type === 'number' ? d.type : SHAPE_BY_NAME[d.type]; if (type === undefined) throw new RangeError('CollisionWorld.add: 未知の type: ' + d.type);
    const par = [0, 0, 0, 0], fin = (v, n) => { if (!(typeof v === 'number' && isFinite(v))) throw new RangeError('CollisionWorld.add: ' + n + ' は有限の数が必要です。'); return v; };
    const pos = d.position || [0, 0, 0]; fin(pos[0] + pos[1] + pos[2], 'position');
    switch (type) {
      case SHAPE_SPHERE: par[0] = d.radius === undefined ? 0.5 : d.radius; if (!(par[0] > 0) || !isFinite(par[0])) throw new RangeError('CollisionWorld.add: radius は正の有限数が必要です。'); break;
      case SHAPE_AABB: case SHAPE_OBB: { const h = d.halfExtents || (d.size ? [d.size[0] / 2, d.size[1] / 2, d.size[2] / 2] : [0.5, 0.5, 0.5]); par[0] = h[0]; par[1] = h[1]; par[2] = h[2]; if (!(par[0] > 0 && par[1] > 0 && par[2] > 0) || !isFinite(par[0] + par[1] + par[2])) throw new RangeError('CollisionWorld.add: halfExtents/size は正の有限数が必要です。'); break; }
      case SHAPE_CAPSULE: {
        par[0] = d.radius === undefined ? 0.5 : d.radius; par[1] = d.halfLength !== undefined ? d.halfLength : (d.height !== undefined ? d.height / 2 - par[0] : 0.5);
        if (!(par[0] > 0) || !(par[1] >= 0) || !isFinite(par[0] + par[1])) throw new RangeError('CollisionWorld.add: capsule の radius > 0, halfLength >= 0（height >= 2*radius）が必要です。'); break;
      }
      default: {
        const n = d.normal || [0, 1, 0], l = Math.hypot(n[0], n[1], n[2]); if (!(l > 0) || !isFinite(l)) throw new RangeError('CollisionWorld.add: plane.normal は 0 でない有限ベクトルが必要です。');
        par[0] = n[0] / l; par[1] = n[1] / l; par[2] = n[2] / l;
        par[3] = d.offset !== undefined ? d.offset / 1 : (d.position ? par[0] * pos[0] + par[1] * pos[1] + par[2] * pos[2] : 0); fin(par[3], 'plane.offset');
      }
    }
    if (d.continuous && type !== SHAPE_SPHERE) throw new MassiveEngineError('continuous は球(sphere)の衝突体でのみ使えます。', 'E_CCD_SHAPE');
    const h = this.alloc.alloc(), i = h % HANDLE_INDEX_LIMIT; this._ensure(this.alloc.capacity);
    this.type[i] = type; this.par.set(par, i * 4); this.pos[i * 3] = pos[0]; this.pos[i * 3 + 1] = pos[1]; this.pos[i * 3 + 2] = pos[2]; this.prev.set(this.pos.subarray(i * 3, i * 3 + 3), i * 3);
    const q = d.rotation || [0, 0, 0, 1]; this.quat[i * 4] = q[0]; this.quat[i * 4 + 1] = q[1]; this.quat[i * 4 + 2] = q[2]; this.quat[i * 4 + 3] = q[3];
    if (type === SHAPE_AABB || type === SHAPE_PLANE) { const o = i * 9; this.rotm.fill(0, o, o + 9); this.rotm[o] = this.rotm[o + 4] = this.rotm[o + 8] = 1; } else quatToAxes(q[0], q[1], q[2], q[3], this.rotm, i * 9);
    this.layer[i] = d.layer === undefined ? 1 : d.layer >>> 0; this.mask[i] = d.mask === undefined ? ALL : d.mask >>> 0;
    this.flags[i] = (d.enabled === false ? 0 : F_ENABLED) | ((d.static || type === SHAPE_PLANE) ? F_STATIC : 0) | (d.trigger ? F_TRIGGER : 0) | (d.continuous ? F_CONTINUOUS : 0);
    this.userData[i] = d.userData === undefined ? null : d.userData;
    this._refreshAABB(i); this._listsDirty = true;
    if (this.bp && type !== SHAPE_PLANE && (this.flags[i] & F_ENABLED)) this.bp.insert(i);
    return h;
  }
  addSphere(o = {}) { return this.add(Object.assign({}, o, { type: 'sphere' })); }
  addAABB(o = {}) { return this.add(Object.assign({}, o, { type: 'aabb' })); }
  addOBB(o = {}) { return this.add(Object.assign({}, o, { type: 'obb' })); }
  addCapsule(o = {}) { return this.add(Object.assign({}, o, { type: 'capsule' })); }
  addPlane(o = {}) { return this.add(Object.assign({}, o, { type: 'plane' })); }
  /** 一括登録。ハンドルの配列を返す。途中で不正な記述があれば、それまでに追加した分は削除して例外を投げる（全か無か）。 */
  addMany(list) { const hs = []; try { for (let k = 0; k < list.length; k++) hs.push(this.add(list[k])); } catch (e) { for (const h of hs) this.remove(h); throw e; } return hs; }
  remove(h) {
    const i = this.alloc.indexOf(h); if (i < 0) return false;
    if (this.bp && this.type[i] !== SHAPE_PLANE && (this.flags[i] & F_ENABLED)) this.bp.remove(i);
    this.flags[i] = 0; this.userData[i] = null; this.alloc.free(h); this._listsDirty = true; this._moved = true; return true; // 進行中のペアは次の step() で終了イベントになる
  }
  removeMany(handles) { let n = 0; for (let k = 0; k < handles.length; k++) if (this.remove(handles[k])) n++; return n; }
  isValid(h) { return this.alloc.isValid(h); }
  get count() { return this.alloc.liveCount; }
  clear() {
    this.alloc.clear(); this.flags.fill(0); this.userData.length = 0; this.pairs.clear(); this.planes.length = 0; this.cont.length = 0; this.nDyn = 0; this.nStat = 0; this._listsDirty = true;
    if (this.bp) this._buildBroadphase(this.bpKind);
  }
  _idx(h) { const i = this.alloc.indexOf(h); if (i < 0) throw new RangeError('CollisionWorld: 無効または削除済みのハンドル: ' + h); return i; }

  /* ------------------------------------------------------------ 変更 */
  _refreshAABB(i) {
    this._moved = true;
    computeAABB(this.type[i], this.pos, i * 3, this.par, i * 4, this.rotm, i * 9, this.aabb, i * 6);
    if (this.flags[i] & F_CONTINUOUS) { // 連続衝突: 前位置から現在位置までの掃引 AABB
      const A = this.aabb, o = i * 6, p = this.prev, j = i * 3, r = this.par[i * 4];
      for (let k = 0; k < 3; k++) { const q = p[j + k]; if (q - r < A[o + k]) A[o + k] = q - r; if (q + r > A[o + 3 + k]) A[o + 3 + k] = q + r; }
    }
  }
  _touched(i) {
    if (this.type[i] === SHAPE_PLANE) return;
    if (this.flags[i] & F_STATIC) { if (this.bp) this.bp.markStaticDirty(); }
    if (this.bp && (this.flags[i] & F_ENABLED)) this.bp.update(i);
  }
  /** 位置（と任意で回転）を設定。連続衝突の衝突体は前ステップ位置からの線分で判定される。 */
  setPosition(h, x, y, z) { const i = this._idx(h), j = i * 3; this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z; this._refreshAABB(i); this._touched(i); return this; }
  /** 瞬間移動: 前位置も同時に更新し、スイープ（すり抜け判定）を行わない。 */
  teleport(h, x, y, z) { const i = this._idx(h), j = i * 3; this.pos[j] = this.prev[j] = x; this.pos[j + 1] = this.prev[j + 1] = y; this.pos[j + 2] = this.prev[j + 2] = z; this._refreshAABB(i); this._touched(i); return this; }
  setRotation(h, x, y, z, w) {
    const i = this._idx(h); const t = this.type[i]; if (t === SHAPE_PLANE) throw new MassiveEngineError('平面の回転は normal/offset で指定してください。', 'E_PLANE_ROT');
    this.quat[i * 4] = x; this.quat[i * 4 + 1] = y; this.quat[i * 4 + 2] = z; this.quat[i * 4 + 3] = w;
    if (t !== SHAPE_AABB) { quatToAxes(x, y, z, w, this.rotm, i * 9); this._refreshAABB(i); this._touched(i); } return this;
  }
  setTransform(h, x, y, z, qx, qy, qz, qw) { this.setPosition(h, x, y, z); if (qw !== undefined) this.setRotation(h, qx, qy, qz, qw); return this; }
  /** サイズ変更: 球 (r) / 箱 (hx,hy,hz) / カプセル (radius, halfLength) / 平面 (nx,ny,nz,d) */
  setSize(h, a, b, c, d) {
    const i = this._idx(h), q = i * 4, t = this.type[i], p = this.par;
    if (t === SHAPE_SPHERE) { if (!(a > 0)) throw new RangeError('radius は正の数'); p[q] = a; }
    else if (t === SHAPE_AABB || t === SHAPE_OBB) { if (!(a > 0 && b > 0 && c > 0)) throw new RangeError('halfExtents は正の数'); p[q] = a; p[q + 1] = b; p[q + 2] = c; }
    else if (t === SHAPE_CAPSULE) { if (!(a > 0 && b >= 0)) throw new RangeError('radius>0, halfLength>=0'); p[q] = a; p[q + 1] = b; }
    else { const l = Math.hypot(a, b, c); if (!(l > 0)) throw new RangeError('normal は 0 でない'); p[q] = a / l; p[q + 1] = b / l; p[q + 2] = c / l; p[q + 3] = d; return this; }
    this._refreshAABB(i); this._touched(i); return this;
  }
  setFilter(h, layer, mask = ALL) { const i = this._idx(h); this.layer[i] = layer >>> 0; this.mask[i] = mask >>> 0; return this; }
  setEnabled(h, on) {
    const i = this._idx(h), was = !!(this.flags[i] & F_ENABLED); if (was === !!on) return this;
    if (on) this.flags[i] |= F_ENABLED; else this.flags[i] &= ~F_ENABLED; this._listsDirty = true;
    if (this.bp && this.type[i] !== SHAPE_PLANE) { if (on) { this._refreshAABB(i); this.bp.insert(i); } else this.bp.remove(i); } return this;
  }
  setEnabledMany(handles, on) { for (let k = 0; k < handles.length; k++) if (this.alloc.isValid(handles[k])) this.setEnabled(handles[k], on); return this; }
  setTrigger(h, on) { const i = this._idx(h); if (on) this.flags[i] |= F_TRIGGER; else this.flags[i] &= ~F_TRIGGER; return this; }
  setStatic(h, on) {
    const i = this._idx(h); if (this.type[i] === SHAPE_PLANE) return this; const was = !!(this.flags[i] & F_STATIC); if (was === !!on) return this;
    if (on) this.flags[i] |= F_STATIC; else this.flags[i] &= ~F_STATIC; this._listsDirty = true; return this;
  }
  /** 一括で位置を設定。xyz は [x0,y0,z0,x1,...]。 */
  setPositionsMany(handles, xyz) { for (let k = 0; k < handles.length; k++) this.setPosition(handles[k], xyz[k * 3], xyz[k * 3 + 1], xyz[k * 3 + 2]); return this; }
  setUserData(h, v) { this.userData[this._idx(h)] = v; return this; }
  getUserData(h) { const i = this.alloc.indexOf(h); return i < 0 ? undefined : this.userData[i]; }
  getPosition(h, out = [0, 0, 0]) { const j = this._idx(h) * 3; out[0] = this.pos[j]; out[1] = this.pos[j + 1]; out[2] = this.pos[j + 2]; return out; }
  getAABB(h, out = new Float64Array(6)) { const o = this._idx(h) * 6; for (let k = 0; k < 6; k++) out[k] = this.aabb[o + k]; return out; }
  getShapeType(h) { return SHAPE_NAMES[this.type[this._idx(h)]]; }
  isTrigger(h) { return !!(this.flags[this._idx(h)] & F_TRIGGER); }

  /* ------------------------------------------------------------ ブロードフェーズ管理 */
  _buildBroadphase(kind) {
    const o = this.options;
    this.bp = kind === 'tree' ? new TreeBroadphase(this, { fatMargin: o.fatMargin }) : kind === 'brute' ? new BruteForceBroadphase(this) : new SpatialHashBroadphase(this, { cellSize: o.cellSize, maxSpan: o.maxSpan });
    this.bpKind = kind; this._listsDirty = true;
    if (kind === 'tree') for (let i = 0; i < this.alloc.highWaterMark; i++) if (this.alloc.isIndexLive(i) && this.type[i] !== SHAPE_PLANE && (this.flags[i] & F_ENABLED)) { this._refreshAABB(i); this.bp.insert(i); }
  }
  /** 'hash' | 'tree' | 'brute' | 'auto'。auto は大きさのばらつきと数から選ぶ（呼び出し時点の内容で 1 回だけ決める）。 */
  setBroadphase(kind) {
    if (kind === 'auto') kind = this._pickAuto();
    if (kind !== 'hash' && kind !== 'tree' && kind !== 'brute') throw new RangeError("setBroadphase: 'hash' | 'tree' | 'brute' | 'auto'");
    this._requestedKind = kind; this._buildBroadphase(kind); return this;
  }
  _pickAuto() {
    const ext = []; for (let i = 0; i < this.alloc.highWaterMark; i++) if (this.alloc.isIndexLive(i) && this.type[i] !== SHAPE_PLANE && (this.flags[i] & F_ENABLED)) { const o = i * 6; ext.push(Math.max(this.aabb[o + 3] - this.aabb[o], this.aabb[o + 4] - this.aabb[o + 1], this.aabb[o + 5] - this.aabb[o + 2])); }
    if (ext.length < 24) return 'brute'; ext.sort((a, b) => a - b); const med = ext[ext.length >> 1], p98 = ext[Math.floor(ext.length * 0.98)];
    return p98 / Math.max(med, 1e-12) > 6 ? 'tree' : 'hash';
  }
  _rebuildLists() {
    const n = this.alloc.highWaterMark; if (this.dyn.length < n) { this.dyn = new Int32Array(this.capacity); this.stat = new Int32Array(this.capacity); }
    let nd = 0, ns = 0; this.planes.length = 0; this.cont.length = 0; const F = this.flags;
    for (let i = 0; i < n; i++) {
      if (!this.alloc.isIndexLive(i) || !(F[i] & F_ENABLED)) continue;
      if (this.type[i] === SHAPE_PLANE) { this.planes.push(i); continue; }
      if (F[i] & F_STATIC) this.stat[ns++] = i; else this.dyn[nd++] = i;
      if (F[i] & F_CONTINUOUS) this.cont.push(i);
    }
    this.nDyn = nd; this.nStat = ns; this.bp.setLists(this.dyn, nd, this.stat, ns); this._listsDirty = false; this._moved = true;
  }
  _ensureReady() {
    if (!this.bp) { const k = this._requestedKind === 'auto' ? this._pickAuto() : this._requestedKind; this._buildBroadphase(k); }
    if (this._listsDirty) this._rebuildLists();
    if (this._moved) { this.bp.prepare(); this._moved = false; } // ハッシュは位置が変わったら再構築が必要（ツリーは何もしない）
  }

  /* ------------------------------------------------------------ ステップ */
  _getRec() { return this._pairPool.pop() || new PairRecord(); }
  _evt(type, rec) {
    let e = this._evPool[this.eventCount]; if (!e) e = this._evPool[this.eventCount] = new CollisionEvent(); this.events[this.eventCount++] = e;
    const c = rec.contact; e.type = type; e.a = rec.ha; e.b = rec.hb; e.trigger = rec.trigger; e.nx = c.nx; e.ny = c.ny; e.nz = c.nz; e.depth = c.depth; e.px = c.px; e.py = c.py; e.pz = c.pz; e.toi = c.toi; e.userA = rec.ua; e.userB = rec.ub;
    if (this.onEvent) this.onEvent(e); return e;
  }
  _filterOK(i, j) { return (this.layer[i] & this.mask[j]) !== 0 && (this.layer[j] & this.mask[i]) !== 0; }
  /** 接触を記録（既存ペアは更新、無ければ新規）。 */
  _record(a, b, c, bumpStat) {
    const key = a * HANDLE_INDEX_LIMIT + b; let rec = this.pairs.get(key); const ha = this.alloc.handleAt(a), hb = this.alloc.handleAt(b);
    if (rec && (rec.ha !== ha || rec.hb !== hb)) { this._endRecord(rec); rec = undefined; } // 添字が再利用された別の衝突体
    if (rec) { if (rec.stamp === this.stepId) return false; rec.contact.set(c); rec.stamp = this.stepId; rec.isNew = false; return true; }
    rec = this._getRec(); rec.key = key; rec.a = a; rec.b = b; rec.ha = ha; rec.hb = hb; rec.ua = this.userData[a]; rec.ub = this.userData[b]; rec.stamp = this.stepId; rec.isNew = true;
    rec.trigger = !!((this.flags[a] | this.flags[b]) & F_TRIGGER); rec.contact.set(c); this.pairs.set(key, rec); this._newPairs.push(rec); return true;
  }
  _endRecord(rec) { this._ended.push(rec); this.pairs.delete(rec.key); } // 呼び出し側がすぐ新しい記録を同じキーで登録する
  /** ブロードフェーズからのコールバック: フィルタを通ったペアを候補バッファへ（ナローフェーズは後でまとめて実行して時間を分けて計測する）。 */
  _onPair(i, j) {
    if (!this._filterOK(i, j)) return;
    let n = this._nCand; if (n + 2 > this._cand.length) { const c = new Int32Array(this._cand.length * 2); c.set(this._cand); this._cand = c; }
    if (i < j) { this._cand[n] = i; this._cand[n + 1] = j; } else { this._cand[n] = j; this._cand[n + 1] = i; } this._nCand = n + 2;
  }
  _narrowPass() {
    const cand = this._cand, n = this._nCand, c = this._contact; c.toi = -1;
    for (let k = 0; k < n; k += 2) { const a = cand[k], b = cand[k + 1]; c.toi = -1; if (collide(this, a, b, c)) this._record(a, b, c); }
    this.stats.candidatePairs = n >> 1;
  }
  /** 1 ステップ分の衝突判定を行い、イベントを events に溜める。 */
  step() {
    const t0 = now(), st = this.stats; this._ensureReady(); this.stepId++; this.eventCount = 0; this._newPairs.length = 0; this._ended.length = 0;
    st.candidatePairs = 0; st.ccdTests = 0; st.ccdHits = 0; st.duplicatePairs = 0; this._nCand = 0;
    const bp = this.bp; bp.stats.tests = 0;
    if (this._moved) { bp.prepare(); this._moved = false; } // _ensureReady で準備済みなら再構築しない
    bp.findPairs(this._pairCb); st.broadTests = bp.stats.tests;
    // 平面（無限）: 動的な衝突体と判定（AABB で粗く除外してから候補へ）
    if (this.planes.length) this._planePass();
    const t1 = now();
    this._narrowPass();
    const t2 = now();
    if (this.cont.length) this._ccdPass(); const t3 = now();
    this._finishPairs();
    // 連続衝突の衝突体: 次のステップのため prev を現在位置へ、AABB を元に戻す
    for (let k = 0; k < this.cont.length; k++) { const i = this.cont[k], j = i * 3; this.prev[j] = this.pos[j]; this.prev[j + 1] = this.pos[j + 1]; this.prev[j + 2] = this.pos[j + 2]; this._refreshAABB(i); if (this.bp) this.bp.update(i); }
    this.events.length = this.eventCount; const t4 = now(); this.time++;
    st.colliders = this.alloc.liveCount; st.dynamic = this.nDyn; st.static = this.nStat; st.planes = this.planes.length; st.active = this.nDyn + this.nStat + this.planes.length; st.broadphase = this.bpKind;
    st.contacts = this.pairs.size; st.events = this.eventCount; st.broadMs = t1 - t0; st.narrowMs = t2 - t1; st.ccdMs = t3 - t2; st.eventMs = t4 - t3; st.stepMs = t4 - t0;
    return st;
  }
  _planePass() {
    const A = this.aabb; let tests = 0;
    for (const p of this.planes) {
      const q = p * 4, nx = this.par[q], ny = this.par[q + 1], nz = this.par[q + 2], d = this.par[q + 3];
      const scan = (list, n) => {
        for (let k = 0; k < n; k++) {
          const i = list[k], o = i * 6; tests++;
          // AABB の平面に最も近い頂点の符号付き距離 ≥ 0 なら接触しえない
          const mx = nx >= 0 ? A[o] : A[o + 3], my = ny >= 0 ? A[o + 1] : A[o + 4], mz = nz >= 0 ? A[o + 2] : A[o + 5];
          if (nx * mx + ny * my + nz * mz - d >= 0) continue;
          this._onPair(p, i);
        }
      };
      scan(this.dyn, this.nDyn); // 平面は静的なので、静的どうしは対象外
    }
    this.stats.broadTests += tests;
  }
  _ccdPass() {
    const st = this.stats, A = this.aabb, c = this._c2; 
    for (let k = 0; k < this.cont.length; k++) {
      const i = this.cont[k], j = i * 3, r = this.par[i * 4], x = this.prev[j], y = this.prev[j + 1], z = this.prev[j + 2], dx = this.pos[j] - x, dy = this.pos[j + 1] - y, dz = this.pos[j + 2] - z;
      if (dx * dx + dy * dy + dz * dz < 1e-18) continue; let bestT = Infinity, bestC = null;
      const test = t => {
        if (t === i || !(this.flags[t] & F_ENABLED) || !this._filterOK(i, t)) return; st.ccdTests++;
        if (!sweepSphereNP(this, t, x, y, z, r, dx, dy, dz, c)) return; st.ccdHits++;
        const a = i < t ? i : t, b = i < t ? t : i;
        // 法線は「形状→球」。ペア規約（a→b）に合わせる: a が球(i)なら反転して「球→形状」にする
        const cc = this._contact; cc.set(c); if (a === i) { cc.nx = -c.nx; cc.ny = -c.ny; cc.nz = -c.nz; } cc.toi = c.toi;
        this._record(a, b, cc);
        if (c.toi < bestT) { bestT = c.toi; bestC = { nx: c.nx, ny: c.ny, nz: c.nz, depth: c.depth }; }
      };
      this.bp.queryAABB(A[i * 6], A[i * 6 + 1], A[i * 6 + 2], A[i * 6 + 3], A[i * 6 + 4], A[i * 6 + 5], test);
      for (const p of this.planes) test(p);
      if (this.options.ccdClamp && bestC) { // すり抜けを防ぐ: 最初の接触位置まで戻す（球の表面が接する位置）
        const t = bestT, nx = dx * t, ny = dy * t, nz = dz * t;
        this.pos[j] = x + nx; this.pos[j + 1] = y + ny; this.pos[j + 2] = z + nz;
      }
    }
  }
  _finishPairs() {
    const st = this.stats, F = this.flags, emitStay = this.options.emitStay; let dup = 0;
    // 終了: このステップで更新されなかった・どちらかが無効になったペア
    for (const rec of this.pairs.values()) {
      if (rec.stamp !== this.stepId) this._ended.push(rec);
    }
    for (const rec of this._ended) if (this.pairs.get(rec.key) === rec) this.pairs.delete(rec.key); // 同じキーで新しい記録に置き換わっている場合は消さない
    this._ended.sort((p, q) => p.key - q.key);
    for (const rec of this._ended) { rec.contact.toi = -1; this._evt(rec.trigger ? EVENT_TRIGGER_EXIT : EVENT_END, rec); }
    // 開始（キー順で並べて、ブロードフェーズの種類に依らず同じ順序で出す）
    this._newPairs.sort((p, q) => p.key - q.key);
    if (this.options.checkDuplicates) { const seen = new Set(); for (const r of this._newPairs) { if (seen.has(r.key)) dup++; seen.add(r.key); } }
    for (const rec of this._newPairs) this._evt(rec.trigger ? EVENT_TRIGGER_ENTER : EVENT_START, rec);
    if (emitStay) for (const rec of this.pairs.values()) if (!rec.isNew) this._evt(rec.trigger ? EVENT_TRIGGER_STAY : EVENT_STAY, rec);
    for (const rec of this._newPairs) rec.isNew = false;
    st.newPairs = this._newPairs.length; st.endedPairs = this._ended.length; st.duplicatePairs = dup;
    for (const rec of this._ended) { rec.ua = rec.ub = null; this._pairPool.push(rec); }
  }

  /** 現在の接触（このステップ終了時点で触れているペア）を fn(handleA, handleB, contact, isTrigger) で列挙。 */
  forEachContact(fn) { for (const rec of this.pairs.values()) fn(rec.ha, rec.hb, rec.contact, rec.trigger); }
  /** 指定衝突体が触れている相手のハンドルを out に追加して返す。 */
  getTouching(h, out = []) { const i = this.alloc.indexOf(h); if (i < 0) return out; for (const rec of this.pairs.values()) { if (rec.a === i) out.push(rec.hb); else if (rec.b === i) out.push(rec.ha); } return out; }

  /* ------------------------------------------------------------ クエリ */
  /** 2 つの衝突体が今の位置で交差しているか（フィルタ無視）。接触があれば Contact（a→b）を、無ければ null。 */
  testPair(ha, hb, out = new Contact()) {
    const a = this._idx(ha), b = this._idx(hb); out.toi = -1;
    return collide(this, a, b, out) ? out : null;
  }
  _qOK(i, mask, triggers) { const f = this.flags[i]; return (f & F_ENABLED) && (triggers || !(f & F_TRIGGER)) && (this.layer[i] & mask) !== 0; }
  /**
   * レイキャスト。最も近い命中を { handle, t, nx,ny,nz, px,py,pz, inside, userData } で返す（なければ null）。
   * dir は正規化されていなくてよい。mask は衝突体の layer と AND を取る。triggers:true で Trigger も対象。
   * 始点が形状内部なら t=0, inside=true。
   */
  raycast(ox, oy, oz, dx, dy, dz, maxDistance = Infinity, mask = ALL, triggers = false, out = {}) {
    this._ensureReady(); const l = Math.hypot(dx, dy, dz); if (!(l > 0)) return null; dx /= l; dy /= l; dz /= l;
    let best = -1, bt = maxDistance; const h = this._hit; let bnx = 0, bny = 0, bnz = 0, bin = false;
    const fn = (i, tmax) => {
      if (!this._qOK(i, mask, triggers)) return tmax;
      if (rayShape(this, i, ox, oy, oz, dx, dy, dz, tmax, h) && h.t <= tmax && (best < 0 || h.t < bt || (h.t === bt && i < best))) { best = i; bt = h.t; bnx = h.nx; bny = h.ny; bnz = h.nz; bin = h.inside; return h.t; }
      return tmax;
    };
    const tm = this.bp.raycast(ox, oy, oz, dx, dy, dz, maxDistance, fn); void tm;
    for (const p of this.planes) fn(p, bt);
    if (best < 0) return null;
    out.handle = this.alloc.handleAt(best); out.t = bt; out.nx = bnx; out.ny = bny; out.nz = bnz; out.px = ox + dx * bt; out.py = oy + dy * bt; out.pz = oz + dz * bt; out.inside = bin; out.userData = this.userData[best]; return out;
  }
  /** レイ上のすべての命中（距離昇順）。maxHits で打ち切り。 */
  raycastAll(ox, oy, oz, dx, dy, dz, maxDistance = Infinity, mask = ALL, triggers = false, maxHits = 1024) {
    this._ensureReady(); const l = Math.hypot(dx, dy, dz); if (!(l > 0)) return []; dx /= l; dy /= l; dz /= l;
    const hits = [], h = new RayHit();
    const fn = (i, tmax) => { if (this._qOK(i, mask, triggers) && rayShape(this, i, ox, oy, oz, dx, dy, dz, maxDistance, h) && h.t <= maxDistance) hits.push({ handle: this.alloc.handleAt(i), t: h.t, nx: h.nx, ny: h.ny, nz: h.nz, px: ox + dx * h.t, py: oy + dy * h.t, pz: oz + dz * h.t, inside: h.inside, userData: this.userData[i] }); return tmax; };
    this.bp.raycast(ox, oy, oz, dx, dy, dz, maxDistance, fn); for (const p of this.planes) fn(p, maxDistance);
    hits.sort((p, q) => p.t - q.t || p.handle - q.handle); if (hits.length > maxHits) hits.length = maxHits; return hits;
  }
  /** AABB と重なる衝突体（AABB レベル。厳密な形状判定ではない）のハンドルを out に追加。 */
  queryAABB(x0, y0, z0, x1, y1, z1, mask = ALL, triggers = true, out = []) {
    this._ensureReady(); this.bp.queryAABB(x0, y0, z0, x1, y1, z1, i => { if (this._qOK(i, mask, triggers)) out.push(this.alloc.handleAt(i)); });
    return out;
  }
  /** 中心 (x,y,z)・半径 r の球と厳密に重なる衝突体を { handle, distance } で返す（距離昇順＝近傍検索）。distance は表面間距離（負なら貫入）。 */
  queryRadius(x, y, z, r, mask = ALL, triggers = true, out = []) {
    this._ensureReady(); const c = this._c2, tmp = [];
    this.bp.queryAABB(x - r, y - r, z - r, x + r, y + r, z + r, i => { if (!this._qOK(i, mask, triggers)) return; const d = pointDistance(this, i, x, y, z, c); if (d < r) tmp.push({ handle: this.alloc.handleAt(i), distance: d }); });
    for (const p of this.planes) if (this._qOK(p, mask, triggers)) { const d = pointDistance(this, p, x, y, z, c); if (d < r) tmp.push({ handle: this.alloc.handleAt(p), distance: d }); }
    tmp.sort((a, b) => a.distance - b.distance || a.handle - b.handle); for (const t of tmp) out.push(t); return out;
  }
  /**
   * 半径 r の球を (x,y,z) から変位 (dx,dy,dz) だけ動かしたとき最初に触れる衝突体。{ handle, toi(0..1), nx,ny,nz(形状→球), px,py,pz, depth } or null。
   * キャラクターの移動や弾の事前判定に使える。
   */
  sweepSphere(x, y, z, r, dx, dy, dz, mask = ALL, triggers = false, out = {}) {
    this._ensureReady(); const c = this._c2; let best = -1, bt = Infinity;
    const A = [Math.min(x, x + dx) - r, Math.min(y, y + dy) - r, Math.min(z, z + dz) - r, Math.max(x, x + dx) + r, Math.max(y, y + dy) + r, Math.max(z, z + dz) + r];
    const test = i => { if (!this._qOK(i, mask, triggers)) return; if (sweepSphereNP(this, i, x, y, z, r, dx, dy, dz, c) && (c.toi < bt || (c.toi === bt && i < best))) { bt = c.toi; best = i; out.nx = c.nx; out.ny = c.ny; out.nz = c.nz; out.px = c.px; out.py = c.py; out.pz = c.pz; out.depth = c.depth; } };
    this.bp.queryAABB(A[0], A[1], A[2], A[3], A[4], A[5], test); for (const p of this.planes) test(p);
    if (best < 0) return null; out.handle = this.alloc.handleAt(best); out.toi = bt; out.userData = this.userData[best]; return out;
  }

  /* ------------------------------------------------------------ 検証・デバッグ補助 */
  /** 現在位置での真の交差ペアを総当たりで求める（テスト基準。フィルタ適用・Trigger含む・静的どうし除外）。 */
  bruteForcePairs() {
    const out = [], n = this.alloc.highWaterMark, c = new Contact();
    for (let i = 0; i < n; i++) {
      if (!this.alloc.isIndexLive(i) || !(this.flags[i] & F_ENABLED)) continue;
      for (let j = i + 1; j < n; j++) {
        if (!this.alloc.isIndexLive(j) || !(this.flags[j] & F_ENABLED)) continue;
        if ((this.flags[i] & F_STATIC) && (this.flags[j] & F_STATIC)) continue; if (!this._filterOK(i, j)) continue;
        if (collide(this, i, j, c)) out.push([i, j]);
      }
    }
    return out;
  }
  /** 現在の接触ペアを [indexA, indexB] の配列で（昇順）返す。 */
  contactPairs() { const out = []; for (const r of this.pairs.values()) out.push([r.a, r.b]); out.sort((p, q) => p[0] - q[0] || p[1] - q[1]); return out; }
  /** デバッグ描画用: 各衝突体を fn(handle, typeName, pos, rotm, par, flags, aabb) で列挙。 */
  forEachShape(fn) {
    for (let i = 0; i < this.alloc.highWaterMark; i++) if (this.alloc.isIndexLive(i)) fn(this.alloc.handleAt(i), SHAPE_NAMES[this.type[i]], this.pos.subarray(i * 3, i * 3 + 3), this.rotm.subarray(i * 9, i * 9 + 9), this.par.subarray(i * 4, i * 4 + 4), this.flags[i], this.aabb.subarray(i * 6, i * 6 + 6));
  }
  dispose() { this.pairs.clear(); this.events.length = 0; this.bp = null; this.alloc.clear(); this.userData.length = 0; this.onEvent = null; }
}
