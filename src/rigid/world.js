/*
 * RigidBodyWorld — MASSIVE ENGINE 1.2 の 3D 剛体物理（既存の PhysicsWorld とは独立。PhysicsWorld は変更していない）。
 *
 * 実装範囲（詳細は docs/RIGID_BODY.md）
 *   形状      : 球 / 箱(OBB・AABB) / カプセル / 平面(静的のみ)
 *   運動      : 位置 + クォータニオン姿勢、速度・角速度、力・トルク・インパルス、ワールド空間の逆慣性テンソル、ジャイロ項(陰解法 1 ステップ)
 *   接触      : ブロードフェーズ(CollisionWorld と同じ SpatialHash/Tree/総当たり) → マニフォールド(最大4点・特徴ID) → 逐次インパルス
 *   ソルバー  : 法線 + 摩擦(静止/動摩擦, 2 接線) の累積インパルス、ウォームスタート、反発(しきい値付き)、推測的接触、スプリットインパルス位置補正
 *   その他    : 3 種の剛体(static/dynamic/kinematic) + コリジョンのみ(sensor), スリープ(島単位), CCD(TOI で停止), Node 同期(Slerp 補間), 統計
 *   拡張基盤  : 拘束(constraint)フック（距離・ボールソケットは実験的。ヒンジ・固定は未実装）
 *
 * 座標系・規約: 右手系 / SI 単位 / クォータニオンは (x,y,z,w)。法線は a→b。
 * 内部状態は Float64Array の Structure of Arrays（毎ステップのオブジェクト生成なし）。
 */
import { HandleAllocator, HANDLE_INDEX_LIMIT } from '../handles.js';
import { FixedTimestep } from '../timestep.js';
import { now, MassiveEngineError } from '../util.js';
import { SHAPE_SPHERE, SHAPE_AABB, SHAPE_OBB, SHAPE_CAPSULE, SHAPE_PLANE, quatToAxes, computeAABB, HUGE } from '../collision/shapes.js';
import { BruteForceBroadphase, SpatialHashBroadphase, TreeBroadphase } from '../collision/broadphase.js';
import { F_ENABLED, F_STATIC } from '../collision/flags.js';
import { sweepSphere, Contact, rayShape, RayHit } from '../collision/narrowphase.js';
import { generateManifold, ContactOut, isPairSupported } from './manifold.js';
import { computeLocalInertia, shapeVolume, worldInvInertia } from './inertia.js';

export const BODY_STATIC = 0, BODY_DYNAMIC = 1, BODY_KINEMATIC = 2;
const TYPE_BY_NAME = { static: BODY_STATIC, dynamic: BODY_DYNAMIC, kinematic: BODY_KINEMATIC };
const SHAPE_BY_NAME = { sphere: SHAPE_SPHERE, box: SHAPE_OBB, obb: SHAPE_OBB, aabb: SHAPE_OBB, capsule: SHAPE_CAPSULE, plane: SHAPE_PLANE };
const FL_SENSOR = 1, MF_SENSOR = 1;
const COMBINE = {
  sqrt: (a, b) => Math.sqrt(a * b), min: (a, b) => (a < b ? a : b), max: (a, b) => (a > b ? a : b), avg: (a, b) => (a + b) * 0.5, mul: (a, b) => a * b
};

export const RIGID_DEFAULTS = {
  gravity: [0, -9.81, 0],
  fixedTimeStep: 1 / 60, maxSubSteps: 8, maxFrameDt: 0.25, stepBudgetMs: 0, timeScale: 1,
  solverIterations: 10, positionIterations: 3,
  restitutionThreshold: 1.0, contactMargin: 0.02, linearSlop: 0.005, positionCorrection: 0.2, maxPushSpeed: 5,
  warmStarting: true, gyroscopic: true,
  contactAngularDamping: 1.0, enableSleeping: true, sleepLinearThreshold: 0.05, sleepAngularThreshold: 0.05, sleepTime: 0.5,
  ccd: true, ccdThreshold: 0.5,
  maxLinearSpeed: 500, maxAngularSpeed: 200,
  frictionCombine: 'sqrt', restitutionCombine: 'max',
  broadphase: 'auto', cellSize: 0, bruteForceThreshold: 24, treeFatMargin: 0.1,
  interpolate: false, autoUnbindRemovedNodes: true,
  onWarning: null, onContactBegin: null, onContactEnd: null
};

/* ------------------------------------------------------------------ マニフォールド保管（SoA, 再利用） */
class ManifoldSet {
  constructor() { this.n = 0; this.cap = 0; this._alloc(64); }
  _alloc(cap) {
    const g = (old, k, T) => { const a = new T(cap * k); if (old) a.set(old.subarray(0, Math.min(old.length, a.length))); return a; };
    const o = this;
    o.a = g(o.a, 1, Int32Array); o.b = g(o.b, 1, Int32Array); o.ga = g(o.ga, 1, Uint32Array); o.gb = g(o.gb, 1, Uint32Array);
    o.nrm = g(o.nrm, 3, Float64Array); o.t1 = g(o.t1, 3, Float64Array); o.t2 = g(o.t2, 3, Float64Array); o.cnt = g(o.cnt, 1, Uint8Array); o.fl = g(o.fl, 1, Uint8Array); o.matched = g(o.matched, 1, Uint8Array);
    o.fs = g(o.fs, 1, Float64Array); o.fk = g(o.fk, 1, Float64Array); o.rest = g(o.rest, 1, Float64Array);
    const P = cap * 4;
    const h = (old, k, T) => { const a = new T(P * k); if (old) a.set(old.subarray(0, Math.min(old.length, a.length))); return a; };
    o.p = h(o.p, 3, Float64Array); o.depth = h(o.depth, 1, Float64Array); o.id = h(o.id, 1, Int32Array); o.la = h(o.la, 3, Float64Array);
    o.ni = h(o.ni, 1, Float64Array); o.ti1 = h(o.ti1, 1, Float64Array); o.ti2 = h(o.ti2, 1, Float64Array); o.pi = h(o.pi, 1, Float64Array); o.maxNi = h(o.maxNi, 1, Float64Array);
    o.rA = h(o.rA, 3, Float64Array); o.rB = h(o.rB, 3, Float64Array); o.nm = h(o.nm, 1, Float64Array); o.t1m = h(o.t1m, 1, Float64Array); o.t2m = h(o.t2m, 1, Float64Array); o.relv = h(o.relv, 1, Float64Array);
    this.cap = cap;
  }
  ensure(n) { if (n > this.cap) this._alloc(Math.max(n, this.cap * 2)); }
}

/** 2 つの物体番号（小,大）から前ステップのマニフォールド番号を引く開放アドレス法のハッシュ表。 */
class PairTable {
  constructor() { this.size = 0; this.ka = new Int32Array(0); this.kb = new Int32Array(0); this.val = new Int32Array(0); }
  reset(n) {
    let s = 16; while (s < n * 2 + 2) s <<= 1;
    if (s !== this.size) { this.size = s; this.ka = new Int32Array(s); this.kb = new Int32Array(s); this.val = new Int32Array(s); }
    this.val.fill(-1);
  }
  _h(a, b) { return (Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) & (this.size - 1); }
  put(a, b, v) { let h = this._h(a, b); const m = this.size - 1; while (this.val[h] >= 0) h = (h + 1) & m; this.ka[h] = a; this.kb[h] = b; this.val[h] = v; }
  get(a, b) { let h = this._h(a, b); const m = this.size - 1; while (this.val[h] >= 0) { if (this.ka[h] === a && this.kb[h] === b) return this.val[h]; h = (h + 1) & m; } return -1; }
}

const _out = new ContactOut(), _hit = new RayHit(), _cc = new Contact(), _tmp3 = new Float64Array(3);
function perp3(ax, ay, az, out) { const bx = Math.abs(ax), by = Math.abs(ay), bz = Math.abs(az); let x, y, z; if (bx <= by && bx <= bz) { x = 0; y = -az; z = ay; } else if (by <= bz) { x = az; y = 0; z = -ax; } else { x = -ay; y = ax; z = 0; } const l = Math.hypot(x, y, z) || 1; out[0] = x / l; out[1] = y / l; out[2] = z / l; }

export class RigidBodyWorld {
  /** @param {object} options RIGID_DEFAULTS を参照 */
  constructor(options = {}) {
    for (const k of Object.keys(options)) if (!(k in RIGID_DEFAULTS)) throw new RangeError('RigidBodyWorld: 未知のオプション ' + k);
    const o = this.options = Object.assign({}, RIGID_DEFAULTS, options); o.gravity = Array.from(o.gravity);
    if (!(o.fixedTimeStep > 0)) throw new RangeError('RigidBodyWorld: fixedTimeStep は正の数が必要です。');
    if (!COMBINE[o.frictionCombine] || !COMBINE[o.restitutionCombine]) throw new RangeError('RigidBodyWorld: frictionCombine/restitutionCombine は ' + Object.keys(COMBINE).join('/') + ' のいずれか。');
    this.alloc = new HandleAllocator(64); this.capacity = 0; this.count = 0;
    this.userData = []; this.node = []; this.nodeAttached = new Uint8Array(0);
    this._grow(256);
    this.timestep = new FixedTimestep({ fixedDt: o.fixedTimeStep, maxSubSteps: o.maxSubSteps, maxFrameDt: o.maxFrameDt, timeScale: o.timeScale });
    this.awake = new Int32Array(256); this.nAwake = 0; this.statList = new Int32Array(256); this.nStat = 0; this.planes = new Int32Array(16); this.nPlanes = 0;
    this._listsDirty = true; this.bp = null; this._bpKind = ''; this._cell = 0; this._cellN = 0;
    this.cur = new ManifoldSet(); this.prev = new ManifoldSet(); this.ptab = new PairTable();
    this.pairBuf = new Int32Array(2048); this.nPairs = 0; this.constraints = [];
    this.corr = new Int32Array(256); this.nCorr = 0;
    this._onPair = (i, j) => { this._rawPairs++; if (this.nPairs * 2 + 2 > this.pairBuf.length) { const p = new Int32Array(this.pairBuf.length * 2); p.set(this.pairBuf); this.pairBuf = p; } this.pairBuf[this.nPairs * 2] = i; this.pairBuf[this.nPairs * 2 + 1] = j; this.nPairs++; };
    this._q4 = [0, 0, 0, 1]; this._ccdScale = null; this._ccdHits = []; this._pseudo = false; this._extraDropped = 0; this._warnedDrop = 0;
    this._rawPairs = 0; this._warned = new Set(); this._begin = []; this._ended = [];
    this.alpha = 0; this.stepCount = 0; this.time = 0; this.droppedTime = 0; this.paused = false; this.disposed = false; this._plannedSteps = 1;
    this.stats = { bodies: 0, activeBodies: 0, sleepingBodies: 0, staticBodies: 0, kinematicBodies: 0, candidatePairs: 0, contactPairs: 0, contactPoints: 0, solverIterations: 0, positionIterations: 0, solverMs: 0, broadphaseMs: 0, narrowphaseMs: 0, integrationMs: 0, ccdCount: 0, ccdMs: 0, maxPenetration: 0, correctedContacts: 0, droppedTime: 0, stepMs: 0, substeps: 0, truncatedSteps: 0, unsupportedPairs: 0, broadphase: '', unboundNodes: 0 };
  }

  /* ================================================================== 記憶域 */
  _grow(n) {
    if (n <= this.capacity) return;
    const cap = Math.max(n, this.capacity * 2, 64), self = this;
    const g = (old, k, T) => { const a = new T(cap * k); if (old) a.set(old); return a; };
    self.type = g(self.type, 1, Uint8Array); self.flags = g(self.flags, 1, Uint8Array); self.btype = g(self.btype, 1, Uint8Array); self.sleepState = g(self.sleepState, 1, Uint8Array); self.kinNode = g(self.kinNode, 1, Uint8Array); self.touch = g(self.touch, 1, Int32Array);
    self.synced = g(self.synced, 1, Uint8Array); self.extra = g(self.extra, 1, Uint8Array); self.ccdMode = g(self.ccdMode, 1, Uint8Array); self.allowSleep = g(self.allowSleep, 1, Uint8Array); self.lockRot = g(self.lockRot, 1, Uint8Array); self.live = g(self.live, 1, Uint8Array);
    self.group = g(self.group, 1, Uint32Array); self.mask = g(self.mask, 1, Uint32Array); self.gen = g(self.gen, 1, Uint32Array); self.islandNext = g(self.islandNext, 1, Int32Array); self.isl = g(self.isl, 1, Int32Array); self.islFirst = g(self.islFirst, 1, Int32Array); self.islLast = g(self.islLast, 1, Int32Array);
    self.pos = g(self.pos, 3, Float64Array); self.quat = g(self.quat, 4, Float64Array); self.rotm = g(self.rotm, 9, Float64Array); self.par = g(self.par, 4, Float64Array); self.aabb = g(self.aabb, 6, Float64Array);
    self.prevPos = g(self.prevPos, 3, Float64Array); self.prevQuat = g(self.prevQuat, 4, Float64Array); self.vel = g(self.vel, 3, Float64Array); self.ang = g(self.ang, 3, Float64Array);
    self.force = g(self.force, 3, Float64Array); self.torque = g(self.torque, 3, Float64Array); self.vp = g(self.vp, 3, Float64Array); self.wp = g(self.wp, 3, Float64Array);
    self.invMass = g(self.invMass, 1, Float64Array); self.mass = g(self.mass, 1, Float64Array); self.invI = g(self.invI, 3, Float64Array); self.iw = g(self.iw, 9, Float64Array);
    self.rest = g(self.rest, 1, Float64Array); self.fs = g(self.fs, 1, Float64Array); self.fk = g(self.fk, 1, Float64Array); self.ld = g(self.ld, 1, Float64Array); self.ad = g(self.ad, 1, Float64Array); self.gs = g(self.gs, 1, Float64Array);
    self.sleepT = g(self.sleepT, 1, Float64Array); self.cr = g(self.cr, 1, Float64Array); self.minT = g(self.minT, 1, Float64Array);
    const na = new Uint8Array(cap); if (self.nodeAttached) na.set(self.nodeAttached); self.nodeAttached = na;
    self.capacity = cap;
  }
  reserve(n) { this._grow(n); return this; }
  _warn(msg, key) { if (key) { if (this._warned.has(key)) return; this._warned.add(key); } if (this.options.onWarning) this.options.onWarning(msg); }
  _idx(h) { const i = this.alloc.indexOf(h); return i; }
  /** ハンドルが有効か（削除済み・世代違い・0 は false）。 */
  isValid(h) { return this.alloc.isValid(h); }
  isAlive(h) { return this.alloc.isValid(h); }
  get bodyCount() { return this.alloc.liveCount; }

  /* ================================================================== 追加・削除 */
  /**
   * 剛体を追加してハンドルを返す。
   *  type: 'static'|'dynamic'|'kinematic'（既定 dynamic） shape: 'sphere'|'box'|'obb'|'aabb'|'capsule'|'plane'
   *  radius / halfExtents / size / halfLength / normal+offset  position / orientation([x,y,z,w]) / velocity / angularVelocity
   *  mass | density(既定 1) restitution friction | staticFriction/dynamicFriction linearDamping angularDamping gravityScale
   *  group(カテゴリ bit) mask(衝突相手のカテゴリ bit) sensor(コリジョンのみ・応答なし) lockRotation(回転しない軽量ボディ)
   *  ccd(true|false|未指定=自動) allowSleep(既定 true) userData node
   */
  addBody(d = {}) {
    if (this.disposed) throw new MassiveEngineError('RigidBodyWorld は dispose 済みです。', 'E_DISPOSED');
    const btype = d.type === undefined ? BODY_DYNAMIC : TYPE_BY_NAME[d.type];
    if (btype === undefined) throw new RangeError('addBody: type は static/dynamic/kinematic のいずれか。');
    const shape = SHAPE_BY_NAME[d.shape === undefined ? 'sphere' : d.shape];
    if (shape === undefined) throw new RangeError('addBody: 未知の shape ' + d.shape + '（sphere/box/obb/aabb/capsule/plane）');
    if (shape === SHAPE_PLANE && btype !== BODY_STATIC) throw new RangeError('addBody: 平面は static のみ使えます。');
    const par = [0, 0, 0, 0], fin = (...v) => v.every(x => typeof x === 'number' && isFinite(x));
    if (shape === SHAPE_SPHERE) { const r = d.radius === undefined ? 0.5 : d.radius; if (!(r > 0) || !isFinite(r)) throw new RangeError('addBody: radius は正の有限数が必要です。'); par[0] = r; }
    else if (shape === SHAPE_OBB) { const h = d.halfExtents || (d.size ? [d.size[0] / 2, d.size[1] / 2, d.size[2] / 2] : [0.5, 0.5, 0.5]); if (!(h[0] > 0 && h[1] > 0 && h[2] > 0) || !fin(h[0], h[1], h[2])) throw new RangeError('addBody: halfExtents/size は正の有限数が必要です。'); par[0] = h[0]; par[1] = h[1]; par[2] = h[2]; }
    else if (shape === SHAPE_CAPSULE) { const r = d.radius === undefined ? 0.3 : d.radius, hl = d.halfLength === undefined ? 0.5 : d.halfLength; if (!(r > 0 && hl >= 0) || !fin(r, hl)) throw new RangeError('addBody: radius>0, halfLength>=0 が必要です。'); par[0] = r; par[1] = hl; }
    else { const n = d.normal || [0, 1, 0], l = Math.hypot(n[0], n[1], n[2]); if (!(l > 0) || !fin(n[0], n[1], n[2])) throw new RangeError('addBody: 平面の normal が不正です。'); par[0] = n[0] / l; par[1] = n[1] / l; par[2] = n[2] / l; par[3] = d.offset === undefined ? (d.position ? par[0] * d.position[0] + par[1] * d.position[1] + par[2] * d.position[2] : 0) : d.offset; }
    const p = d.position || [0, 0, 0], q = d.orientation || [0, 0, 0, 1], v = d.velocity || d.linearVelocity || [0, 0, 0], w = d.angularVelocity || [0, 0, 0];
    if (!fin(p[0], p[1], p[2], q[0], q[1], q[2], q[3], v[0], v[1], v[2], w[0], w[1], w[2])) throw new RangeError('addBody: position/orientation/velocity は有限数が必要です。');
    const ql = Math.hypot(q[0], q[1], q[2], q[3]); if (!(ql > 1e-12)) throw new RangeError('addBody: orientation の長さが 0 です。');
    if (this.alloc.liveCount >= HANDLE_INDEX_LIMIT - 1) throw new RangeError('addBody: 上限に達しました。');
    const h = this.alloc.alloc(), i = h % HANDLE_INDEX_LIMIT; this._grow(i + 1); if (i >= this.count) this.count = i + 1;
    this.live[i] = 1; this.gen[i] = Math.floor(h / HANDLE_INDEX_LIMIT);
    this.type[i] = shape; this.btype[i] = btype; this.par[i * 4] = par[0]; this.par[i * 4 + 1] = par[1]; this.par[i * 4 + 2] = par[2]; this.par[i * 4 + 3] = par[3];
    if (shape === SHAPE_PLANE) { this.pos[i * 3] = par[0] * par[3]; this.pos[i * 3 + 1] = par[1] * par[3]; this.pos[i * 3 + 2] = par[2] * par[3]; }
    else { this.pos[i * 3] = p[0]; this.pos[i * 3 + 1] = p[1]; this.pos[i * 3 + 2] = p[2]; }
    this.quat[i * 4] = q[0] / ql; this.quat[i * 4 + 1] = q[1] / ql; this.quat[i * 4 + 2] = q[2] / ql; this.quat[i * 4 + 3] = q[3] / ql;
    this.vel.fill(0, i * 3, i * 3 + 3); this.ang.fill(0, i * 3, i * 3 + 3); this.force.fill(0, i * 3, i * 3 + 3); this.torque.fill(0, i * 3, i * 3 + 3);
    if (btype !== BODY_STATIC) { this.vel[i * 3] = v[0]; this.vel[i * 3 + 1] = v[1]; this.vel[i * 3 + 2] = v[2]; this.ang[i * 3] = w[0]; this.ang[i * 3 + 1] = w[1]; this.ang[i * 3 + 2] = w[2]; }
    const dm = this.options;
    this.rest[i] = d.restitution === undefined ? 0 : d.restitution;
    const f0 = d.friction === undefined ? 0.5 : d.friction; this.fs[i] = d.staticFriction === undefined ? f0 : d.staticFriction; this.fk[i] = d.dynamicFriction === undefined ? f0 : d.dynamicFriction;
    if (!(this.rest[i] >= 0) || !(this.fs[i] >= 0) || !(this.fk[i] >= 0)) throw new RangeError('addBody: restitution/friction は 0 以上。');
    this.ld[i] = d.linearDamping === undefined ? 0 : d.linearDamping; this.ad[i] = d.angularDamping === undefined ? 0.01 : d.angularDamping; this.gs[i] = d.gravityScale === undefined ? 1 : d.gravityScale;
    this.group[i] = d.group === undefined ? 1 : d.group >>> 0; this.mask[i] = d.mask === undefined ? 0xffffffff : d.mask >>> 0;
    this.extra[i] = d.sensor ? FL_SENSOR : 0; this.lockRot[i] = (d.lockRotation || d.lightweight) ? 1 : 0; this.allowSleep[i] = d.allowSleep === false ? 0 : 1;
    this.ccdMode[i] = d.ccd === true ? 1 : d.ccd === false ? 2 : 0; this.sleepState[i] = 0; this.kinNode[i] = 0; this.touch[i] = -1; this.sleepT[i] = 0; this.islandNext[i] = -1;
    this.userData[i] = d.userData === undefined ? null : d.userData; this.node[i] = null; this.nodeAttached[i] = 0;
    this.cr[i] = shape === SHAPE_SPHERE || shape === SHAPE_CAPSULE ? par[0] : shape === SHAPE_OBB ? Math.min(par[0], par[1], par[2]) : 0;
    this._setMassProps(i, d.mass, d.density === undefined ? 1 : d.density);
    this._refresh(i);
    this.prevPos[i * 3] = this.pos[i * 3]; this.prevPos[i * 3 + 1] = this.pos[i * 3 + 1]; this.prevPos[i * 3 + 2] = this.pos[i * 3 + 2]; for (let k = 0; k < 4; k++) this.prevQuat[i * 4 + k] = this.quat[i * 4 + k];
    this._syncFlags(i); this._listsDirty = true;
    if (d.node) this.bindNode(h, d.node);
    return h;
  }
  /** 複数まとめて追加（ハンドルの配列を返す）。 */
  addBodies(defs) { const out = new Array(defs.length); for (let k = 0; k < defs.length; k++) out[k] = this.addBody(defs[k]); return out; }

  _setMassProps(i, mass, density) {
    const t = this.btype[i], type = this.type[i];
    if (t !== BODY_DYNAMIC) { this.invMass[i] = 0; this.mass[i] = t === BODY_STATIC ? 0 : (mass > 0 ? mass : 0); this.invI[i * 3] = this.invI[i * 3 + 1] = this.invI[i * 3 + 2] = 0; return; }
    let m = mass; if (m === undefined || m === null) m = density * shapeVolume(type, this.par, i * 4);
    if (!(m > 0) || !isFinite(m)) throw new RangeError('addBody/setMass: mass は正の有限数が必要です（静的にするには type:"static"）。');
    this.mass[i] = m; this.invMass[i] = 1 / m;
    if (this.lockRot[i]) { this.invI[i * 3] = this.invI[i * 3 + 1] = this.invI[i * 3 + 2] = 0; return; }
    computeLocalInertia(type, this.par, i * 4, m, _tmp3);
    this.invI[i * 3] = 1 / _tmp3[0]; this.invI[i * 3 + 1] = 1 / _tmp3[1]; this.invI[i * 3 + 2] = 1 / _tmp3[2];
  }
  _syncFlags(i) { this.flags[i] = F_ENABLED | ((this.btype[i] === BODY_STATIC || this.sleepState[i] === 1) ? F_STATIC : 0); }
  /** 姿勢行列・ワールド慣性・AABB を現在の pos/quat から更新。 */
  _refresh(i) {
    const o = i * 4, q = this.quat;
    quatToAxes(q[o], q[o + 1], q[o + 2], q[o + 3], this.rotm, i * 9);
    if (this.btype[i] === BODY_DYNAMIC) worldInvInertia(this.rotm, i * 9, this.invI[i * 3], this.invI[i * 3 + 1], this.invI[i * 3 + 2], this.iw, i * 9); else this.iw.fill(0, i * 9, i * 9 + 9);
    computeAABB(this.type[i], this.pos, i * 3, this.par, i * 4, this.rotm, i * 9, this.aabb, i * 6);
    if (this.type[i] !== SHAPE_PLANE) { const m = this.options.contactMargin, a = this.aabb, k = i * 6; a[k] -= m; a[k + 1] -= m; a[k + 2] -= m; a[k + 3] += m; a[k + 4] += m; a[k + 5] += m; }
  }
  removeBody(h) {
    const i = this._idx(h); if (i < 0) return false;
    this._wakeIsland(i); this.unbindNode(h);
    for (let c = this.constraints.length - 1; c >= 0; c--) if (this.constraints[c].a === h || this.constraints[c].b === h) this.constraints.splice(c, 1);
    if (this.bp && this.bp.remove) this.bp.remove(i);
    this.live[i] = 0; this.flags[i] = 0; this.userData[i] = null; this.alloc.free(h); this._listsDirty = true; return true;
  }
  removeBodies(handles) { let n = 0; for (let k = 0; k < handles.length; k++) if (this.removeBody(handles[k])) n++; return n; }
  /** すべての剛体・拘束を削除（発行済みハンドルはすべて無効になる）。 */
  clear() {
    for (let i = 0; i < this.count; i++) if (this.live[i]) { this.live[i] = 0; this.flags[i] = 0; this.userData[i] = null; this.node[i] = null; }
    this.alloc.clear(); this.count = 0; this.constraints.length = 0; this.cur.n = 0; this.prev.n = 0; this.timestep.reset(); this.alpha = 0;
    this.bp = null; this._bpKind = ''; this._cell = 0; this._listsDirty = true; this.nAwake = 0; this.nStat = 0; this.nPlanes = 0; return this;
  }
  dispose() { if (this.disposed) return; this.clear(); this.disposed = true; this.options.onContactBegin = null; this.options.onContactEnd = null; }

  /* ================================================================== 状態の取得・設定（無効ハンドルは安全に false / null） */
  getPosition(h, out = [0, 0, 0]) { const i = this._idx(h); if (i < 0) return null; out[0] = this.pos[i * 3]; out[1] = this.pos[i * 3 + 1]; out[2] = this.pos[i * 3 + 2]; return out; }
  getOrientation(h, out = [0, 0, 0, 1]) { const i = this._idx(h); if (i < 0) return null; for (let k = 0; k < 4; k++) out[k] = this.quat[i * 4 + k]; return out; }
  getLinearVelocity(h, out = [0, 0, 0]) { const i = this._idx(h); if (i < 0) return null; out[0] = this.vel[i * 3]; out[1] = this.vel[i * 3 + 1]; out[2] = this.vel[i * 3 + 2]; return out; }
  getAngularVelocity(h, out = [0, 0, 0]) { const i = this._idx(h); if (i < 0) return null; out[0] = this.ang[i * 3]; out[1] = this.ang[i * 3 + 1]; out[2] = this.ang[i * 3 + 2]; return out; }
  getMass(h) { const i = this._idx(h); return i < 0 ? null : this.mass[i]; }
  /** ローカル主慣性モーメント [Ix,Iy,Iz]（動的以外は Infinity）。 */
  getInertia(h, out = [0, 0, 0]) { const i = this._idx(h); if (i < 0) return null; for (let k = 0; k < 3; k++) out[k] = this.invI[i * 3 + k] > 0 ? 1 / this.invI[i * 3 + k] : Infinity; return out; }
  /** ワールド空間の逆慣性テンソル（行優先 9 要素）。次の step() 開始時点の姿勢で計算し直す。 */
  getInverseInertiaWorld(h, out = new Float64Array(9)) { const i = this._idx(h); if (i < 0) return null; this._refresh(i); for (let k = 0; k < 9; k++) out[k] = this.iw[i * 9 + k]; return out; }
  /** ワールド空間の慣性テンソル（行優先 9 要素）= R·diag(I)·Rᵀ。動的以外は null。 */
  getInertiaWorld(h, out = new Float64Array(9)) {
    const i = this._idx(h); if (i < 0 || this.btype[i] !== BODY_DYNAMIC || this.lockRot[i]) return null; const R = this.rotm, r = i * 9;
    quatToAxes(this.quat[i * 4], this.quat[i * 4 + 1], this.quat[i * 4 + 2], this.quat[i * 4 + 3], R, r);
    const I = [1 / this.invI[i * 3], 1 / this.invI[i * 3 + 1], 1 / this.invI[i * 3 + 2]];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) out[a * 3 + b] = I[0] * R[r + a] * R[r + b] + I[1] * R[r + 3 + a] * R[r + 3 + b] + I[2] * R[r + 6 + a] * R[r + 6 + b];
    return out;
  }
  getType(h) { const i = this._idx(h); return i < 0 ? null : ['static', 'dynamic', 'kinematic'][this.btype[i]]; }
  getUserData(h) { const i = this._idx(h); return i < 0 ? undefined : this.userData[i]; }
  setUserData(h, v) { const i = this._idx(h); if (i < 0) return false; this.userData[i] = v; return true; }
  isSleeping(h) { const i = this._idx(h); return i >= 0 && this.sleepState[i] === 1; }
  /** 位置の直接指定（テレポート: 補間の前状態も揃える）。 */
  setPosition(h, x, y, z) {
    const i = this._idx(h); if (i < 0) return false; if (!isFinite(x + y + z)) throw new RangeError('setPosition: 有限数が必要です。');
    this._wakeIsland(i); const j = i * 3; this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z; this.prevPos[j] = x; this.prevPos[j + 1] = y; this.prevPos[j + 2] = z;
    if (this.type[i] === SHAPE_PLANE) return true; this._refresh(i); this._markStaticMoved(i); return true;
  }
  setOrientation(h, x, y, z, w) {
    const i = this._idx(h); if (i < 0) return false; const l = Math.hypot(x, y, z, w); if (!(l > 1e-12) || !isFinite(l)) throw new RangeError('setOrientation: 長さが 0 でない有限なクォータニオンが必要です。');
    this._wakeIsland(i); const o = i * 4; this.quat[o] = x / l; this.quat[o + 1] = y / l; this.quat[o + 2] = z / l; this.quat[o + 3] = w / l; for (let k = 0; k < 4; k++) this.prevQuat[o + k] = this.quat[o + k];
    this._refresh(i); this._markStaticMoved(i); return true;
  }
  _markStaticMoved(i) { if (this.btype[i] === BODY_STATIC && this.bp) { if (this.bp.markStaticDirty) this.bp.markStaticDirty(); if (this.bp.update) this.bp.update(i); } }
  setLinearVelocity(h, x, y, z) { const i = this._idx(h); if (i < 0 || this.btype[i] === BODY_STATIC) return false; if (!isFinite(x + y + z)) throw new RangeError('setLinearVelocity: 有限数が必要です。'); this._wakeIsland(i); this.vel[i * 3] = x; this.vel[i * 3 + 1] = y; this.vel[i * 3 + 2] = z; return true; }
  setAngularVelocity(h, x, y, z) { const i = this._idx(h); if (i < 0 || this.btype[i] === BODY_STATIC) return false; if (!isFinite(x + y + z)) throw new RangeError('setAngularVelocity: 有限数が必要です。'); this._wakeIsland(i); this.ang[i * 3] = x; this.ang[i * 3 + 1] = y; this.ang[i * 3 + 2] = z; return true; }
  setMass(h, mass) { const i = this._idx(h); if (i < 0) return false; if (this.btype[i] !== BODY_DYNAMIC) return false; this._wakeIsland(i); this._setMassProps(i, mass, 1); this._refresh(i); return true; }
  setMaterial(h, m = {}) {
    const i = this._idx(h); if (i < 0) return false;
    if (m.restitution !== undefined) this.rest[i] = m.restitution; if (m.friction !== undefined) { this.fs[i] = m.friction; this.fk[i] = m.friction; }
    if (m.staticFriction !== undefined) this.fs[i] = m.staticFriction; if (m.dynamicFriction !== undefined) this.fk[i] = m.dynamicFriction;
    if (m.linearDamping !== undefined) this.ld[i] = m.linearDamping; if (m.angularDamping !== undefined) this.ad[i] = m.angularDamping; if (m.gravityScale !== undefined) this.gs[i] = m.gravityScale; return true;
  }
  setCollisionFilter(h, group, mask) { const i = this._idx(h); if (i < 0) return false; this.group[i] = group >>> 0; this.mask[i] = mask >>> 0; return true; }
  /** 種別の変更 (static/dynamic/kinematic)。dynamic にするときは質量を mass で指定（省略時は密度 1）。 */
  setType(h, type, mass) {
    const i = this._idx(h); if (i < 0) return false; const t = TYPE_BY_NAME[type]; if (t === undefined) throw new RangeError('setType: static/dynamic/kinematic');
    if (this.type[i] === SHAPE_PLANE && t !== BODY_STATIC) throw new RangeError('setType: 平面は static のみ。');
    this._wakeIsland(i); this.btype[i] = t; if (t === BODY_STATIC) { this.vel.fill(0, i * 3, i * 3 + 3); this.ang.fill(0, i * 3, i * 3 + 3); }
    this._setMassProps(i, mass, 1); this._refresh(i); this._syncFlags(i); this._listsDirty = true; if (this.bp && this.bp.markStaticDirty) this.bp.markStaticDirty(); return true;
  }
  /** kinematic ボディを「次の plannedSteps ステップで目標へ到達する速度」にする（Node を動かす代わりに直接指定）。 */
  setKinematicTarget(h, x, y, z, qx = null, qy = 0, qz = 0, qw = 1, seconds = this.options.fixedTimeStep) {
    const i = this._idx(h); if (i < 0 || this.btype[i] !== BODY_KINEMATIC) return false; const inv = 1 / seconds;
    this.vel[i * 3] = (x - this.pos[i * 3]) * inv; this.vel[i * 3 + 1] = (y - this.pos[i * 3 + 1]) * inv; this.vel[i * 3 + 2] = (z - this.pos[i * 3 + 2]) * inv;
    if (qx !== null) this._angularVelocityTo(i, qx, qy, qz, qw, inv); return true;
  }
  _angularVelocityTo(i, qx, qy, qz, qw, inv) { // 現在姿勢 → 目標姿勢 の最短回転を角速度へ
    const o = i * 4, q = this.quat, cx = -q[o], cy = -q[o + 1], cz = -q[o + 2], cw = q[o + 3]; // 現在の共役
    let dx = qw * cx + qx * cw + qy * cz - qz * cy, dy = qw * cy + qy * cw + qz * cx - qx * cz, dz = qw * cz + qz * cw + qx * cy - qy * cx, dw = qw * cw - qx * cx - qy * cy - qz * cz;
    // 目標 * 現在^-1 = ワールド空間での差分回転
    if (dw < 0) { dx = -dx; dy = -dy; dz = -dz; dw = -dw; }
    const s = Math.hypot(dx, dy, dz); if (s < 1e-12) { this.ang[i * 3] = this.ang[i * 3 + 1] = this.ang[i * 3 + 2] = 0; return; }
    const angle = 2 * Math.atan2(s, dw), k = angle * inv / s; this.ang[i * 3] = dx * k; this.ang[i * 3 + 1] = dy * k; this.ang[i * 3 + 2] = dz * k;
  }

  /* ---- 力・インパルス（力とトルクは「次の 1 ステップ」にだけ作用し、ステップ後にクリアされる） ---- */
  applyForce(h, fx, fy, fz) { const i = this._idx(h); if (i < 0 || this.btype[i] !== BODY_DYNAMIC) return false; this._wakeIsland(i); const j = i * 3; this.force[j] += fx; this.force[j + 1] += fy; this.force[j + 2] += fz; return true; }
  applyTorque(h, tx, ty, tz) { const i = this._idx(h); if (i < 0 || this.btype[i] !== BODY_DYNAMIC) return false; this._wakeIsland(i); const j = i * 3; this.torque[j] += tx; this.torque[j + 1] += ty; this.torque[j + 2] += tz; return true; }
  /** ワールド座標の点 (px,py,pz) に力を加える（重心からずれていればトルクも生じる）。 */
  applyForceAtPoint(h, fx, fy, fz, px, py, pz) {
    const i = this._idx(h); if (i < 0 || this.btype[i] !== BODY_DYNAMIC) return false; this._wakeIsland(i); const j = i * 3;
    this.force[j] += fx; this.force[j + 1] += fy; this.force[j + 2] += fz;
    const rx = px - this.pos[j], ry = py - this.pos[j + 1], rz = pz - this.pos[j + 2];
    this.torque[j] += ry * fz - rz * fy; this.torque[j + 1] += rz * fx - rx * fz; this.torque[j + 2] += rx * fy - ry * fx; return true;
  }
  /** 重心へ瞬間的な力積 (N·s) を加える（速度が impulse/mass だけ変わる）。 */
  applyImpulse(h, ix, iy, iz) { const i = this._idx(h); if (i < 0 || this.btype[i] !== BODY_DYNAMIC) return false; this._wakeIsland(i); const im = this.invMass[i], j = i * 3; this.vel[j] += ix * im; this.vel[j + 1] += iy * im; this.vel[j + 2] += iz * im; return true; }
  /** ワールド座標の点に力積を加える（速度と角速度が変わる）。 */
  applyImpulseAtPoint(h, ix, iy, iz, px, py, pz) {
    const i = this._idx(h); if (i < 0 || this.btype[i] !== BODY_DYNAMIC) return false; this._wakeIsland(i); const j = i * 3, im = this.invMass[i];
    this.vel[j] += ix * im; this.vel[j + 1] += iy * im; this.vel[j + 2] += iz * im;
    this._refresh(i); const rx = px - this.pos[j], ry = py - this.pos[j + 1], rz = pz - this.pos[j + 2], tx = ry * iz - rz * iy, ty = rz * ix - rx * iz, tz = rx * iy - ry * ix, W = this.iw, k = i * 9;
    this.ang[j] += W[k] * tx + W[k + 1] * ty + W[k + 2] * tz; this.ang[j + 1] += W[k + 3] * tx + W[k + 4] * ty + W[k + 5] * tz; this.ang[j + 2] += W[k + 6] * tx + W[k + 7] * ty + W[k + 8] * tz; return true;
  }
  applyAngularImpulse(h, ax, ay, az) { const i = this._idx(h); if (i < 0 || this.btype[i] !== BODY_DYNAMIC) return false; this._wakeIsland(i); this._refresh(i); const W = this.iw, k = i * 9, j = i * 3; this.ang[j] += W[k] * ax + W[k + 1] * ay + W[k + 2] * az; this.ang[j + 1] += W[k + 3] * ax + W[k + 4] * ay + W[k + 5] * az; this.ang[j + 2] += W[k + 6] * ax + W[k + 7] * ay + W[k + 8] * az; return true; }

  /* ================================================================== スリープ */
  wakeUp(h) { const i = this._idx(h); if (i < 0) return false; this._wakeIsland(i); this.sleepT[i] = 0; return true; }
  /** 強制的にスリープ（接触している動的物体は同じ島として一緒に眠らせず、この 1 体だけ眠る）。 */
  sleep(h) {
    const i = this._idx(h); if (i < 0 || this.btype[i] !== BODY_DYNAMIC) return false; if (this.sleepState[i] === 1) return true;
    this._sleepOne(i); this.islandNext[i] = i; this._listsDirty = true; return true;
  }
  _sleepOne(i) { this.sleepState[i] = 1; this.vel.fill(0, i * 3, i * 3 + 3); this.ang.fill(0, i * 3, i * 3 + 3); for (let k = 0; k < 3; k++) this.prevPos[i * 3 + k] = this.pos[i * 3 + k]; for (let k = 0; k < 4; k++) this.prevQuat[i * 4 + k] = this.quat[i * 4 + k]; this._syncFlags(i); }
  _wakeIsland(i) {
    if (this.sleepState[i] === 0) return; let k = i, guard = 0;
    do { this.sleepState[k] = 0; this.sleepT[k] = 0; this._syncFlags(k); const nx = this.islandNext[k]; this.islandNext[k] = -1; if (this.nAwake < this.awake.length) this.awake[this.nAwake++] = k; k = nx; } while (k >= 0 && k !== i && ++guard < 1e7);
    this._listsDirty = true;
  }

  /* ================================================================== Node 結合 */
  /** Node を結合。dynamic: 物理 → Node(位置・回転)へ反映。kinematic: Node の変更を物理が追従。static: 何もしない。 */
  bindNode(h, node) {
    const i = this._idx(h); if (i < 0) return false; if (!node || !node.position || !node.quaternion) throw new TypeError('bindNode: position/quaternion を持つ Node が必要です。');
    this.node[i] = node; this.nodeAttached[i] = node.parent ? 1 : 0; return true;
  }
  unbindNode(h) { const i = this._idx(h); if (i < 0) return false; this.node[i] = null; this.nodeAttached[i] = 0; return true; }
  getNode(h) { const i = this._idx(h); return i < 0 ? null : this.node[i]; }
  /** 補間後（描画用）の位置。物理の内部状態は変更しない。 */
  getRenderPosition(h, out = [0, 0, 0]) {
    const i = this._idx(h); if (i < 0) return null; const a = this.options.interpolate ? this.alpha : 1, j = i * 3;
    out[0] = this.prevPos[j] + (this.pos[j] - this.prevPos[j]) * a; out[1] = this.prevPos[j + 1] + (this.pos[j + 1] - this.prevPos[j + 1]) * a; out[2] = this.prevPos[j + 2] + (this.pos[j + 2] - this.prevPos[j + 2]) * a; return out;
  }
  /** 補間後（描画用）の姿勢（球面線形補間・最短経路）。 */
  getRenderOrientation(h, out = [0, 0, 0, 1]) {
    const i = this._idx(h); if (i < 0) return null; const a = this.options.interpolate ? this.alpha : 1, o = i * 4, P = this.prevQuat, Q = this.quat;
    let bx = Q[o], by = Q[o + 1], bz = Q[o + 2], bw = Q[o + 3], d = P[o] * bx + P[o + 1] * by + P[o + 2] * bz + P[o + 3] * bw, s0, s1;
    if (d < 0) { d = -d; bx = -bx; by = -by; bz = -bz; bw = -bw; }
    if (1 - d > 1e-6) { const om = Math.acos(d > 1 ? 1 : d), so = Math.sin(om); s0 = Math.sin((1 - a) * om) / so; s1 = Math.sin(a * om) / so; } else { s0 = 1 - a; s1 = a; }
    const x = s0 * P[o] + s1 * bx, y = s0 * P[o + 1] + s1 * by, z = s0 * P[o + 2] + s1 * bz, w = s0 * P[o + 3] + s1 * bw, l = Math.hypot(x, y, z, w) || 1;
    out[0] = x / l; out[1] = y / l; out[2] = z / l; out[3] = w / l; return out;
  }
  /** 物理 → Node へ反映（dynamic）。結合した Node が削除（親から外された）されていたら自動で解除する。 */
  syncTransforms() {
    const interp = this.options.interpolate, a = interp ? this.alpha : 1, auto = this.options.autoUnbindRemovedNodes;
    for (let i = 0; i < this.count; i++) {
      const n = this.node[i]; if (!n || !this.live[i]) continue;
      if (auto && ((this.nodeAttached[i] && !n.parent) || n.disposed === true || n._disposed === true)) { this.node[i] = null; this.nodeAttached[i] = 0; this.stats.unboundNodes++; continue; }
      if (this.btype[i] !== BODY_DYNAMIC) continue;
      const asleep = this.sleepState[i] === 1; if (asleep && this.synced[i] === 1) continue; // 眠っている物体は最後に 1 回書けば十分
      const j = i * 3, o = i * 4, P = this.prevPos, Q = this.quat;
      const x = P[j] + (this.pos[j] - P[j]) * a, y = P[j + 1] + (this.pos[j + 1] - P[j + 1]) * a, z = P[j + 2] + (this.pos[j + 2] - P[j + 2]) * a;
      const np = n.position, nq = n.quaternion; let changed = false;
      if (np[0] !== x || np[1] !== y || np[2] !== z) { np[0] = x; np[1] = y; np[2] = z; changed = true; }
      let qx, qy, qz, qw;
      if (a >= 1 || !interp) { qx = Q[o]; qy = Q[o + 1]; qz = Q[o + 2]; qw = Q[o + 3]; } else { const r = this.getRenderOrientation(this._handleOf(i), this._q4); qx = r[0]; qy = r[1]; qz = r[2]; qw = r[3]; }
      if (nq[0] !== qx || nq[1] !== qy || nq[2] !== qz || nq[3] !== qw) { nq[0] = qx; nq[1] = qy; nq[2] = qz; nq[3] = qw; changed = true; }
      if (changed && n.markDirty) n.markDirty();
      this.synced[i] = asleep ? 1 : 0;
    }
    return this;
  }
  _handleOf(i) { return this.alloc.handleAt(i); }
  /** kinematic ボディに結合された Node の姿勢を、plannedSteps ステップで到達する速度へ変換する。 */
  _pullKinematicNodes(steps) {
    const sec = Math.max(1, steps) * this.options.fixedTimeStep, inv = 1 / sec;
    for (let i = 0; i < this.count; i++) {
      const n = this.node[i]; if (!n || !this.live[i] || this.btype[i] !== BODY_KINEMATIC) continue; const np = n.position, nq = n.quaternion, j = i * 3, o = i * 4;
      if (!isFinite(np[0] + np[1] + np[2] + nq[0] + nq[1] + nq[2] + nq[3])) continue;
      const dx = np[0] - this.pos[j], dy = np[1] - this.pos[j + 1], dz = np[2] - this.pos[j + 2];
      const dq = Math.abs(nq[0] - this.quat[o]) + Math.abs(nq[1] - this.quat[o + 1]) + Math.abs(nq[2] - this.quat[o + 2]) + Math.abs(nq[3] - this.quat[o + 3]);
      if (dx * dx + dy * dy + dz * dz < 1e-18 && dq < 1e-12) { // Node が動いていない: Node 由来の速度だけ止め、ユーザー設定の速度は尊重
        if (this.kinNode[i]) { this.kinNode[i] = 0; this.vel.fill(0, j, j + 3); this.ang.fill(0, j, j + 3); }
        continue;
      }
      this.kinNode[i] = 1; this._wakeNear(i); this.vel[j] = dx * inv; this.vel[j + 1] = dy * inv; this.vel[j + 2] = dz * inv; const l = Math.hypot(nq[0], nq[1], nq[2], nq[3]) || 1; this._angularVelocityTo(i, nq[0] / l, nq[1] / l, nq[2] / l, nq[3] / l, inv);
    }
  }
  _wakeNear() { /* 動く kinematic に接触したスリープ物体は接触生成時に起こす */ }

  /* ================================================================== 拘束（拡張基盤） */
  /** 拘束を追加。拘束は prepare(world,dt) / warmStart(world) / solveVelocity(world,dt) / solvePosition(world,dt) を持つオブジェクト。 */
  addConstraint(c) { if (!c || typeof c.prepare !== 'function' || typeof c.solveVelocity !== 'function') throw new TypeError('addConstraint: prepare/solveVelocity を持つ拘束が必要です。'); this.constraints.push(c); return c; }
  removeConstraint(c) { const k = this.constraints.indexOf(c); if (k >= 0) { this.constraints.splice(k, 1); return true; } return false; }

  /* ================================================================== 時間管理 */
  pause() { this.paused = true; this.timestep.pause(); return this; }
  resume() { this.paused = false; this.timestep.resume(); return this; }
  setTimeScale(v) { this.timestep.setTimeScale(v); this.options.timeScale = v; return this; }
  /** 実時間 dt（秒）を固定刻みへ分割して進める。最大サブステップ数・時間予算で上限をかけ、超過分は破棄して droppedTime に記録する。戻り値は実行ステップ数。 */
  advance(dt) {
    const s = this.stats; s.integrationMs = 0; s.broadphaseMs = 0; s.narrowphaseMs = 0; s.solverMs = 0; s.ccdMs = 0; s.stepMs = 0; s.ccdCount = 0; s.substeps = 0;
    if (this.disposed || this.paused || !(dt > 0) || !isFinite(dt)) { this._fillStats(); return 0; }
    const ts = this.timestep, f = ts.fixedDt, budget = this.options.stepBudgetMs, start = now(); let extraDrop = 0;
    this._plannedSteps = Math.max(1, Math.min(ts.maxSubSteps, Math.floor((ts.acc + Math.min(dt, ts.maxFrameDt) * ts.timeScale) / f + 1e-9)));
    this._pullKinematicNodes(this._plannedSteps);
    if (dt > ts.maxFrameDt) extraDrop += (dt - ts.maxFrameDt) * ts.timeScale;
    const n = ts.update(dt, fdt => {
      this.step(fdt);
      if (budget > 0 && now() - start > budget && ts.acc - f >= f) { const rest = ts.acc - f, whole = rest - (rest % f); extraDrop += whole; ts.acc = f + (rest % f); s.truncatedSteps++; this._warn('時間予算 stepBudgetMs=' + budget + 'ms を超えたため、残りのステップを破棄しました。', 'budget'); }
    });
    this._extraDropped += extraDrop; this.droppedTime = ts.droppedTime + this._extraDropped;
    s.substeps = n; this.alpha = ts.acc / f; this._fillStats();
    if (n > 0 && ts.droppedTime > this._warnedDrop) { this._warnedDrop = ts.droppedTime; this._warn('最大サブステップ数 ' + ts.maxSubSteps + ' を超えたため、シミュレーション時間 ' + ts.droppedTime.toFixed(3) + ' 秒分を破棄しました。', 'drop' + Math.floor(ts.droppedTime)); }
    return n;
  }
  _fillStats() {
    const s = this.stats; let act = 0, sl = 0, st = 0, ki = 0, tot = 0;
    for (let i = 0; i < this.count; i++) { if (!this.live[i]) continue; tot++; const t = this.btype[i]; if (t === BODY_STATIC) st++; else if (t === BODY_KINEMATIC) { ki++; act++; } else if (this.sleepState[i]) sl++; else act++; }
    s.bodies = tot; s.activeBodies = act; s.sleepingBodies = sl; s.staticBodies = st; s.kinematicBodies = ki; s.droppedTime = this.droppedTime; s.broadphase = this._bpKind;
  }
  getStats() { this._fillStats(); return Object.assign({}, this.stats); }

  /* ================================================================== ブロードフェーズ */
  _rebuildLists() {
    const n = this.count; if (this.awake.length < this.capacity) { this.awake = new Int32Array(this.capacity); this.statList = new Int32Array(this.capacity); }
    let nA = 0, nS = 0, nP = 0, nDyn = 0;
    for (let i = 0; i < n; i++) {
      if (!this.live[i]) continue;
      if (this.type[i] === SHAPE_PLANE) { if (nP >= this.planes.length) { const p = new Int32Array(this.planes.length * 2); p.set(this.planes); this.planes = p; } this.planes[nP++] = i; continue; }
      if (this.btype[i] === BODY_STATIC || this.sleepState[i] === 1) this.statList[nS++] = i; else this.awake[nA++] = i;
      if (this.btype[i] !== BODY_STATIC) nDyn++;
    }
    this.nAwake = nA; this.nStat = nS; this.nPlanes = nP;
    const o = this.options; let kind = o.broadphase; if (kind === 'auto') kind = (nA + nS) <= o.bruteForceThreshold ? 'brute' : 'hash';
    if (kind !== this._bpKind || !this.bp) {
      this._bpKind = kind;
      if (kind === 'brute') this.bp = new BruteForceBroadphase(this); else if (kind === 'tree') this.bp = new TreeBroadphase(this, { fatMargin: o.treeFatMargin }); else if (kind === 'hash') this.bp = new SpatialHashBroadphase(this, { cellSize: o.cellSize > 0 ? o.cellSize : 0 });
      else throw new RangeError('RigidBodyWorld: broadphase は auto/hash/tree/brute のいずれか。');
      this._cell = 0;
    }
    if (kind === 'hash' && !(o.cellSize > 0)) { // セル幅は動的物体数が 2 倍/半分になるまで固定（スリープ入れ替えのたびに静的グリッドを作り直さない）
      if (!this._cell || nDyn > this._cellN * 2 || nDyn * 2 < this._cellN) { this.bp._listsDirty = true; this.bp.cellOption = 0; this.bp.setLists(this.awake, nA, this.statList, nS); this.bp._autoCell && (this._cell = this.bp._autoCell()); this._cellN = nDyn; }
      this.bp.cellOption = this._cell || 0;
    }
    if (kind === 'tree') { for (let k = 0; k < nA; k++) this.bp.insert(this.awake[k]); for (let k = 0; k < nS; k++) this.bp.insert(this.statList[k]); }
    this.bp.setLists(this.awake, nA, this.statList, nS); this._listsDirty = false;
  }

  /* ================================================================== 1 ステップ */
  /** 固定刻み dt で 1 ステップ進める（通常は advance() を使う。一時停止中でも直接呼べる）。 */
  step(dt) {
    if (this.disposed) return this.stats; if (!(dt > 0) || !isFinite(dt)) throw new RangeError('step: dt は正の有限数が必要です。');
    const o = this.options, s = this.stats, t0 = now();
    if (this._listsDirty) this._rebuildLists();
    this._integrateVelocities(dt); const t1 = now();
    const bp = this.bp; bp.prepare(); this.nPairs = 0; this._rawPairs = 0; bp.findPairs(this._onPair);
    const t2 = now();
    this._narrowphase(dt); const t3 = now();
    this._solve(dt); const t4 = now();
    this._ccd(dt); const t5 = now();
    this._integratePositions(dt);
    if (o.enableSleeping) this._updateSleeping(dt);
    this._finishStep();
    const t6 = now();
    s.integrationMs += (t1 - t0) + (t6 - t5); s.broadphaseMs += t2 - t1; s.narrowphaseMs += t3 - t2; s.solverMs += t4 - t3; s.ccdMs += t5 - t4; s.stepMs += t6 - t0;
    this.time += dt; this.stepCount++; return s;
  }

  _integrateVelocities(dt) {
    const o = this.options, g = o.gravity, gx = g[0], gy = g[1], gz = g[2], vel = this.vel, ang = this.ang, force = this.force, torque = this.torque, im = this.invMass, iw = this.iw;
    const maxL2 = o.maxLinearSpeed * o.maxLinearSpeed, maxA2 = o.maxAngularSpeed * o.maxAngularSpeed, gyro = o.gyroscopic, awake = this.awake;
    const cad = o.contactAngularDamping, stamp = this.stepCount, cs = this.cur, touch = this.touch; // 直前ステップで接触していた物体だけに接触時角減衰（転がり/ねじり抵抗の近似）
    if (cad > 0) for (let m = 0; m < cs.n; m++) if (!(cs.fl[m] & MF_SENSOR)) { touch[cs.a[m]] = stamp; touch[cs.b[m]] = stamp; }
    for (let k = 0; k < this.nAwake; k++) {
      const i = awake[k], j = i * 3, q = i * 4;
      for (let c = 0; c < 3; c++) this.prevPos[j + c] = this.pos[j + c]; for (let c = 0; c < 4; c++) this.prevQuat[q + c] = this.quat[q + c];
      if (this.btype[i] !== BODY_DYNAMIC) continue;
      const inv = im[i], gs = this.gs[i];
      let vx = vel[j] + (gx * gs + force[j] * inv) * dt, vy = vel[j + 1] + (gy * gs + force[j + 1] * inv) * dt, vz = vel[j + 2] + (gz * gs + force[j + 2] * inv) * dt;
      const ld = this.ld[i]; if (ld > 0) { const f = 1 / (1 + ld * dt); vx *= f; vy *= f; vz *= f; }
      const s2 = vx * vx + vy * vy + vz * vz; if (s2 > maxL2) { const f = o.maxLinearSpeed / Math.sqrt(s2); vx *= f; vy *= f; vz *= f; }
      vel[j] = vx; vel[j + 1] = vy; vel[j + 2] = vz;
      if (this.invI[j] === 0 && this.invI[j + 1] === 0 && this.invI[j + 2] === 0) { ang[j] = ang[j + 1] = ang[j + 2] = 0; continue; }
      const w = i * 9, tx = torque[j], ty = torque[j + 1], tz = torque[j + 2];
      let wx = ang[j] + (iw[w] * tx + iw[w + 1] * ty + iw[w + 2] * tz) * dt, wy = ang[j + 1] + (iw[w + 3] * tx + iw[w + 4] * ty + iw[w + 5] * tz) * dt, wz = ang[j + 2] + (iw[w + 6] * tx + iw[w + 7] * ty + iw[w + 8] * tz) * dt;
      ang[j] = wx; ang[j + 1] = wy; ang[j + 2] = wz;
      if (gyro) this._gyro(i, dt);
      const ad = this.ad[i] + (touch[i] === stamp ? cad : 0); if (ad > 0) { const f = 1 / (1 + ad * dt); ang[j] *= f; ang[j + 1] *= f; ang[j + 2] *= f; }
      const a2 = ang[j] * ang[j] + ang[j + 1] * ang[j + 1] + ang[j + 2] * ang[j + 2]; if (a2 > maxA2) { const f = o.maxAngularSpeed / Math.sqrt(a2); ang[j] *= f; ang[j + 1] *= f; ang[j + 2] *= f; }
    }
  }
  /** ジャイロ項（慣性が非等方な物体の自由回転）: 剛体座標系で陰的オイラーを Newton 1 回で解く（Catto 2015）。 */
  _gyro(i, h) {
    const j = i * 3, R = this.rotm, r = i * 9, ang = this.ang, ix = this.invI[j], iy = this.invI[j + 1], iz = this.invI[j + 2];
    const Ix = 1 / ix, Iy = 1 / iy, Iz = 1 / iz; const mx = Math.max(Ix, Iy, Iz), mn = Math.min(Ix, Iy, Iz); if (mx - mn < 1e-9 * mx) return; // 等方（球・立方体）は不要
    const wx = ang[j], wy = ang[j + 1], wz = ang[j + 2];
    const ax = R[r] * wx + R[r + 1] * wy + R[r + 2] * wz, ay = R[r + 3] * wx + R[r + 4] * wy + R[r + 5] * wz, az = R[r + 6] * wx + R[r + 7] * wy + R[r + 8] * wz;
    const Lx = Ix * ax, Ly = Iy * ay, Lz = Iz * az;
    const fx = h * (ay * Lz - az * Ly), fy = h * (az * Lx - ax * Lz), fz = h * (ax * Ly - ay * Lx);
    // J = I + h (skew(w) I - skew(I w))
    const J00 = Ix + h * (0 - 0), J01 = h * (-az * Iy + Lz), J02 = h * (ay * Iz - Ly);
    const J10 = h * (az * Ix - Lz), J11 = Iy, J12 = h * (-ax * Iz + Lx);
    const J20 = h * (-ay * Ix + Ly), J21 = h * (ax * Iy - Lx), J22 = Iz;
    const det = J00 * (J11 * J22 - J12 * J21) - J01 * (J10 * J22 - J12 * J20) + J02 * (J10 * J21 - J11 * J20); if (Math.abs(det) < 1e-300) return;
    const id = 1 / det;
    const dx = ((J11 * J22 - J12 * J21) * fx + (J02 * J21 - J01 * J22) * fy + (J01 * J12 - J02 * J11) * fz) * id;
    const dy = ((J12 * J20 - J10 * J22) * fx + (J00 * J22 - J02 * J20) * fy + (J02 * J10 - J00 * J12) * fz) * id;
    const dz = ((J10 * J21 - J11 * J20) * fx + (J01 * J20 - J00 * J21) * fy + (J00 * J11 - J01 * J10) * fz) * id;
    const bx = ax - dx, by = ay - dy, bz = az - dz;
    ang[j] = R[r] * bx + R[r + 3] * by + R[r + 6] * bz; ang[j + 1] = R[r + 1] * bx + R[r + 4] * by + R[r + 7] * bz; ang[j + 2] = R[r + 2] * bx + R[r + 5] * by + R[r + 8] * bz;
  }

  /* ================================================================== ナローフェーズ（マニフォールド生成・前フレームとの対応付け） */
  _narrowphase(dt) {
    const o = this.options, margin = o.contactMargin, cur = this.prev, prev = this.cur; // swap: 直前の cur が prev になる
    this.cur = cur; this.prev = prev; cur.n = 0; prev.matched.fill(0, 0, prev.n);
    const pt = this.ptab; pt.reset(prev.n); for (let m = 0; m < prev.n; m++) pt.put(prev.a[m], prev.b[m], m);
    this._begin.length = 0; this._ended.length = 0; this._unsupported = 0;
    const pb = this.pairBuf, np = this.nPairs;
    for (let k = 0; k < np; k++) this._pair(pb[k * 2], pb[k * 2 + 1], margin);
    // 平面（ブロードフェーズ外・静的のみ）× 動く物体
    if (this.nPlanes > 0) {
      for (let a = 0; a < this.nAwake; a++) {
        const i = this.awake[a], A = this.aabb; const io = i * 6;
        for (let p = 0; p < this.nPlanes; p++) {
          const pl = this.planes[p], q = pl * 4, nx = this.par[q], ny = this.par[q + 1], nz = this.par[q + 2], off = this.par[q + 3];
          const cx = (A[io] + A[io + 3]) * 0.5, cy = (A[io + 1] + A[io + 4]) * 0.5, cz = (A[io + 2] + A[io + 5]) * 0.5, ex = (A[io + 3] - A[io]) * 0.5, ey = (A[io + 4] - A[io + 1]) * 0.5, ez = (A[io + 5] - A[io + 2]) * 0.5;
          if (nx * cx + ny * cy + nz * cz - off > Math.abs(nx) * ex + Math.abs(ny) * ey + Math.abs(nz) * ez) continue;
          this._rawPairs++; this._pair(i, pl, margin);
        }
      }
    }
    // 終了イベント
    if (o.onContactEnd || true) for (let m = 0; m < prev.n; m++) if (!prev.matched[m]) { const a = prev.a[m], b = prev.b[m]; if (this.live[a] && this.live[b] && this.gen[a] === prev.ga[m] && this.gen[b] === prev.gb[m] && !this.sleepState[a] && !this.sleepState[b]) this._ended.push(a, b, prev.fl[m] & MF_SENSOR); }
    this.stats.candidatePairs = this._rawPairs; this.stats.contactPairs = cur.n; this.stats.unsupportedPairs = this._unsupported;
    let pts = 0; for (let m = 0; m < cur.n; m++) pts += cur.cnt[m]; this.stats.contactPoints = pts;
  }

  _pair(i, j, margin) {
    if (i === j) return;
    const bt = this.btype, ti = bt[i], tj = bt[j], ex = this.extra; const si = this.sleepState[i], sj = this.sleepState[j];
    const sens = (ex[i] | ex[j]) & FL_SENSOR; if (ex[i] & ex[j] & FL_SENSOR) return;
    if (ti !== BODY_DYNAMIC && tj !== BODY_DYNAMIC) { if (!sens || (ti === BODY_STATIC && tj === BODY_STATIC)) return; }
    if ((this.group[i] & this.mask[j]) === 0 || (this.group[j] & this.mask[i]) === 0) return;
    if (si && sj) return;
    if (!sens && ti !== BODY_DYNAMIC && tj !== BODY_DYNAMIC) return;
    const lo = i < j ? i : j, hi = i < j ? j : i;
    if (!isPairSupported(this.type[lo], this.type[hi])) { if (!(this.type[lo] === SHAPE_PLANE && this.type[hi] === SHAPE_PLANE)) { this._unsupported++; this._warn('未対応の形状の組み合わせ: ' + this.type[lo] + '×' + this.type[hi], 'unsup' + this.type[lo] + ',' + this.type[hi]); } return; }
    const out = _out; if (!generateManifold(this, lo, hi, out, margin)) return;
    // スリープ中の物体は、動いている相手との接触で島ごと起こす（センサーでは起こさない）
    if (!sens) {
      if (si && (tj === BODY_DYNAMIC || this._moving(j))) this._wakeIsland(i); if (sj && (ti === BODY_DYNAMIC || this._moving(i))) this._wakeIsland(j);
    }
    if (!sens && (this.sleepState[i] || this.sleepState[j])) return;
    const cur = this.cur, m = cur.n++; cur.ensure(cur.n);
    cur.a[m] = lo; cur.b[m] = hi; cur.ga[m] = this.gen[lo]; cur.gb[m] = this.gen[hi]; cur.fl[m] = sens ? MF_SENSOR : 0; cur.matched[m] = 0;
    const nx = out.nx, ny = out.ny, nz = out.nz; cur.nrm[m * 3] = nx; cur.nrm[m * 3 + 1] = ny; cur.nrm[m * 3 + 2] = nz;
    const t1 = _tmp3; perp3(nx, ny, nz, t1); cur.t1[m * 3] = t1[0]; cur.t1[m * 3 + 1] = t1[1]; cur.t1[m * 3 + 2] = t1[2];
    cur.t2[m * 3] = ny * t1[2] - nz * t1[1]; cur.t2[m * 3 + 1] = nz * t1[0] - nx * t1[2]; cur.t2[m * 3 + 2] = nx * t1[1] - ny * t1[0];
    const o = this.options, fc = COMBINE[o.frictionCombine], rc = COMBINE[o.restitutionCombine];
    cur.fs[m] = fc(this.fs[lo], this.fs[hi]); cur.fk[m] = Math.min(fc(this.fk[lo], this.fk[hi]), cur.fs[m]); cur.rest[m] = rc(this.rest[lo], this.rest[hi]);
    const cnt = out.count; cur.cnt[m] = cnt;
    // 前ステップとの対応付け
    const pm = this.ptab.get(lo, hi), prev = this.prev; let ok = pm >= 0 && prev.ga[pm] === this.gen[lo] && prev.gb[pm] === this.gen[hi];
    if (ok) prev.matched[pm] = 1; else if (!sens || true) this._begin.push(lo, hi, sens ? 1 : 0);
    const R = this.rotm, ra = lo * 9, P = this.pos, warm = o.warmStarting && ok && !sens;
    for (let p = 0; p < cnt; p++) {
      const k = m * 4 + p, x = out.p[p * 3], y = out.p[p * 3 + 1], z = out.p[p * 3 + 2];
      cur.p[k * 3] = x; cur.p[k * 3 + 1] = y; cur.p[k * 3 + 2] = z; cur.depth[k] = out.depth[p]; cur.id[k] = out.id[p];
      const dx = x - P[lo * 3], dy = y - P[lo * 3 + 1], dz = z - P[lo * 3 + 2];
      const lx = dx * R[ra] + dy * R[ra + 1] + dz * R[ra + 2], ly = dx * R[ra + 3] + dy * R[ra + 4] + dz * R[ra + 5], lz = dx * R[ra + 6] + dy * R[ra + 7] + dz * R[ra + 8];
      cur.la[k * 3] = lx; cur.la[k * 3 + 1] = ly; cur.la[k * 3 + 2] = lz; cur.ni[k] = 0; cur.ti1[k] = 0; cur.ti2[k] = 0; cur.pi[k] = 0; cur.maxNi[k] = 0;
      if (!warm) continue;
      const pc = prev.cnt[pm]; let q = -1;
      for (let c = 0; c < pc; c++) if (prev.id[pm * 4 + c] === out.id[p]) { q = c; break; }
      if (q < 0) { let bd = 0.0004; for (let c = 0; c < pc; c++) { const kk = (pm * 4 + c) * 3, ddx = prev.la[kk] - lx, ddy = prev.la[kk + 1] - ly, ddz = prev.la[kk + 2] - lz, d2 = ddx * ddx + ddy * ddy + ddz * ddz; if (d2 < bd) { bd = d2; q = c; } } }
      if (q < 0) continue;
      const kq = pm * 4 + q; cur.ni[k] = prev.ni[kq];
      const wx = prev.ti1[kq] * prev.t1[pm * 3] + prev.ti2[kq] * prev.t2[pm * 3], wy = prev.ti1[kq] * prev.t1[pm * 3 + 1] + prev.ti2[kq] * prev.t2[pm * 3 + 1], wz = prev.ti1[kq] * prev.t1[pm * 3 + 2] + prev.ti2[kq] * prev.t2[pm * 3 + 2];
      cur.ti1[k] = wx * cur.t1[m * 3] + wy * cur.t1[m * 3 + 1] + wz * cur.t1[m * 3 + 2]; cur.ti2[k] = wx * cur.t2[m * 3] + wy * cur.t2[m * 3 + 1] + wz * cur.t2[m * 3 + 2];
    }
  }
  _moving(i) { const v = this.vel, j = i * 3; return v[j] * v[j] + v[j + 1] * v[j + 1] + v[j + 2] * v[j + 2] > 1e-6 || this.ang[j] * this.ang[j] + this.ang[j + 1] * this.ang[j + 1] + this.ang[j + 2] * this.ang[j + 2] > 1e-6; }

  /* ================================================================== ソルバー */
  _solve(dt) {
    const o = this.options, cs = this.cur, n = cs.n, vel = this.vel, ang = this.ang, im = this.invMass, iw = this.iw, pos = this.pos;
    const nrm = cs.nrm, T1 = cs.t1, T2 = cs.t2;
    let maxPen = 0; this.nCorr = 0;
    // ---- 準備: 腕・有効質量・推測的バイアス・相対速度（反発用）
    for (let m = 0; m < n; m++) {
      if (cs.fl[m] & MF_SENSOR) continue;
      const a = cs.a[m], b = cs.b[m], ja = a * 3, jb = b * 3, wa = a * 9, wb = b * 9, imA = im[a], imB = im[b];
      const nx = nrm[m * 3], ny = nrm[m * 3 + 1], nz = nrm[m * 3 + 2], t1x = T1[m * 3], t1y = T1[m * 3 + 1], t1z = T1[m * 3 + 2], t2x = T2[m * 3], t2y = T2[m * 3 + 1], t2z = T2[m * 3 + 2];
      for (let p = 0; p < cs.cnt[m]; p++) {
        const k = m * 4 + p, k3 = k * 3, px = cs.p[k3], py = cs.p[k3 + 1], pz = cs.p[k3 + 2];
        const rax = px - pos[ja], ray = py - pos[ja + 1], raz = pz - pos[ja + 2], rbx = px - pos[jb], rby = py - pos[jb + 1], rbz = pz - pos[jb + 2];
        cs.rA[k3] = rax; cs.rA[k3 + 1] = ray; cs.rA[k3 + 2] = raz; cs.rB[k3] = rbx; cs.rB[k3 + 1] = rby; cs.rB[k3 + 2] = rbz;
        cs.nm[k] = 1 / (imA + imB + angK(iw, wa, ray * nz - raz * ny, raz * nx - rax * nz, rax * ny - ray * nx) + angK(iw, wb, rby * nz - rbz * ny, rbz * nx - rbx * nz, rbx * ny - rby * nx) || 1);
        cs.t1m[k] = 1 / (imA + imB + angK(iw, wa, ray * t1z - raz * t1y, raz * t1x - rax * t1z, rax * t1y - ray * t1x) + angK(iw, wb, rby * t1z - rbz * t1y, rbz * t1x - rbx * t1z, rbx * t1y - rby * t1x) || 1);
        cs.t2m[k] = 1 / (imA + imB + angK(iw, wa, ray * t2z - raz * t2y, raz * t2x - rax * t2z, rax * t2y - ray * t2x) + angK(iw, wb, rby * t2z - rbz * t2y, rbz * t2x - rbx * t2z, rbx * t2y - rby * t2x) || 1);
        const dvx = vel[jb] + ang[jb + 1] * rbz - ang[jb + 2] * rby - vel[ja] - (ang[ja + 1] * raz - ang[ja + 2] * ray), dvy = vel[jb + 1] + ang[jb + 2] * rbx - ang[jb] * rbz - vel[ja + 1] - (ang[ja + 2] * rax - ang[ja] * raz), dvz = vel[jb + 2] + ang[jb] * rby - ang[jb + 1] * rbx - vel[ja + 2] - (ang[ja] * ray - ang[ja + 1] * rax);
        cs.relv[k] = dvx * nx + dvy * ny + dvz * nz;
        const d = cs.depth[k]; if (d > maxPen) maxPen = d;
        if (d > o.linearSlop) { if (this.nCorr >= this.corr.length) { const c = new Int32Array(this.corr.length * 2); c.set(this.corr); this.corr = c; } this.corr[this.nCorr++] = k; }
      }
      // ウォームスタート
      if (o.warmStarting) {
        for (let p = 0; p < cs.cnt[m]; p++) {
          const k = m * 4 + p, ni = cs.ni[k], t1i = cs.ti1[k], t2i = cs.ti2[k]; if (ni === 0 && t1i === 0 && t2i === 0) continue;
          applyImpulse(vel, ang, im, iw, a, b, ja, jb, wa, wb, cs.rA, cs.rB, k * 3, nx * ni + t1x * t1i + t2x * t2i, ny * ni + t1y * t1i + t2y * t2i, nz * ni + t1z * t1i + t2z * t2i);
        }
      }
    }
    for (const c of this.constraints) { c.prepare(this, dt); if (o.warmStarting && c.warmStart) c.warmStart(this); }
    this.stats.maxPenetration = maxPen; this.stats.correctedContacts = this.nCorr;
    // ---- 速度反復（摩擦 → 法線。反復ごとに走査方向を反転して偏りを減らす）
    const iters = Math.max(1, o.solverIterations | 0);
    for (let it = 0; it < iters; it++) {
      const fwd = (it & 1) === 0;
      for (let mm = 0; mm < n; mm++) {
        const m = fwd ? mm : n - 1 - mm; if (cs.fl[m] & MF_SENSOR) continue;
        this._solveManifold(m, dt, fwd);
      }
      for (const c of this.constraints) c.solveVelocity(this, dt);
    }
    // ---- 反発（解いた後に 1 回: 事前の接近速度が しきい値を超え、かつ実際に押し合った接触のみ）
    const thr = o.restitutionThreshold;
    for (let m = 0; m < n; m++) {
      if ((cs.fl[m] & MF_SENSOR) || !(cs.rest[m] > 0)) continue;
      const a = cs.a[m], b = cs.b[m], ja = a * 3, jb = b * 3, wa = a * 9, wb = b * 9, nx = nrm[m * 3], ny = nrm[m * 3 + 1], nz = nrm[m * 3 + 2], e = cs.rest[m];
      for (let p = 0; p < cs.cnt[m]; p++) {
        const k = m * 4 + p, k3 = k * 3, rv = cs.relv[k]; if (rv > -thr || cs.maxNi[k] === 0) continue;
        const rax = cs.rA[k3], ray = cs.rA[k3 + 1], raz = cs.rA[k3 + 2], rbx = cs.rB[k3], rby = cs.rB[k3 + 1], rbz = cs.rB[k3 + 2];
        const dvx = vel[jb] + ang[jb + 1] * rbz - ang[jb + 2] * rby - vel[ja] - (ang[ja + 1] * raz - ang[ja + 2] * ray), dvy = vel[jb + 1] + ang[jb + 2] * rbx - ang[jb] * rbz - vel[ja + 1] - (ang[ja + 2] * rax - ang[ja] * raz), dvz = vel[jb + 2] + ang[jb] * rby - ang[jb + 1] * rbx - vel[ja + 2] - (ang[ja] * ray - ang[ja + 1] * rax);
        const vn = dvx * nx + dvy * ny + dvz * nz; let l = -cs.nm[k] * (vn + e * rv); const nn = Math.max(cs.ni[k] + l, 0); l = nn - cs.ni[k]; cs.ni[k] = nn;
        applyImpulse(vel, ang, im, iw, a, b, ja, jb, wa, wb, cs.rA, cs.rB, k3, nx * l, ny * l, nz * l);
      }
    }
    this.stats.solverIterations = iters;
    // ---- 位置補正（スプリットインパルス: 擬似速度。実速度にエネルギーを足さない）
    this._solvePositions(dt);
    this._positionConstraints(dt);
  }
  _solveManifold(m, dt, fwd) {
    const o = this.options, cs = this.cur, vel = this.vel, ang = this.ang, im = this.invMass, iw = this.iw, nrm = cs.nrm;
    const a = cs.a[m], b = cs.b[m], ja = a * 3, jb = b * 3, wa = a * 9, wb = b * 9, cnt = cs.cnt[m];
    const nx = nrm[m * 3], ny = nrm[m * 3 + 1], nz = nrm[m * 3 + 2], t1x = cs.t1[m * 3], t1y = cs.t1[m * 3 + 1], t1z = cs.t1[m * 3 + 2], t2x = cs.t2[m * 3], t2y = cs.t2[m * 3 + 1], t2z = cs.t2[m * 3 + 2];
    const fs = cs.fs[m], fk = cs.fk[m], invDt = 1 / dt;
    for (let pp = 0; pp < cnt; pp++) {
      const p = fwd ? pp : cnt - 1 - pp, k = m * 4 + p, k3 = k * 3;
      const rax = cs.rA[k3], ray = cs.rA[k3 + 1], raz = cs.rA[k3 + 2], rbx = cs.rB[k3], rby = cs.rB[k3 + 1], rbz = cs.rB[k3 + 2];
      // 摩擦: 静止摩擦の円錐内なら固着、超えたら動摩擦の大きさへ切り詰める
      let dvx = vel[jb] + ang[jb + 1] * rbz - ang[jb + 2] * rby - vel[ja] - (ang[ja + 1] * raz - ang[ja + 2] * ray), dvy = vel[jb + 1] + ang[jb + 2] * rbx - ang[jb] * rbz - vel[ja + 1] - (ang[ja + 2] * rax - ang[ja] * raz), dvz = vel[jb + 2] + ang[jb] * rby - ang[jb + 1] * rbx - vel[ja + 2] - (ang[ja] * ray - ang[ja + 1] * rax);
      const ni = cs.ni[k];
      let n1 = cs.ti1[k] - cs.t1m[k] * (dvx * t1x + dvy * t1y + dvz * t1z), n2 = cs.ti2[k] - cs.t2m[k] * (dvx * t2x + dvy * t2y + dvz * t2z);
      const mag = Math.sqrt(n1 * n1 + n2 * n2);
      if (mag > fs * ni) { const lim = fk * ni; if (mag > 1e-18) { const s = lim / mag; n1 *= s; n2 *= s; } else { n1 = 0; n2 = 0; } }
      const d1 = n1 - cs.ti1[k], d2 = n2 - cs.ti2[k]; cs.ti1[k] = n1; cs.ti2[k] = n2;
      if (d1 !== 0 || d2 !== 0) applyImpulse(vel, ang, im, iw, a, b, ja, jb, wa, wb, cs.rA, cs.rB, k3, t1x * d1 + t2x * d2, t1y * d1 + t2y * d2, t1z * d1 + t2z * d2);
      // 法線（離れている接触は「次のステップで届く速度まで」だけ近づくのを許す = 推測的接触）
      dvx = vel[jb] + ang[jb + 1] * rbz - ang[jb + 2] * rby - vel[ja] - (ang[ja + 1] * raz - ang[ja + 2] * ray); dvy = vel[jb + 1] + ang[jb + 2] * rbx - ang[jb] * rbz - vel[ja + 1] - (ang[ja + 2] * rax - ang[ja] * raz); dvz = vel[jb + 2] + ang[jb] * rby - ang[jb + 1] * rbx - vel[ja + 2] - (ang[ja] * ray - ang[ja + 1] * rax);
      const vn = dvx * nx + dvy * ny + dvz * nz, depth = cs.depth[k], spec = depth < 0 ? -depth * invDt : 0;
      let l = -cs.nm[k] * (vn + spec); const nn = Math.max(ni + l, 0); l = nn - ni; cs.ni[k] = nn; if (nn > cs.maxNi[k]) cs.maxNi[k] = nn;
      if (l !== 0) applyImpulse(vel, ang, im, iw, a, b, ja, jb, wa, wb, cs.rA, cs.rB, k3, nx * l, ny * l, nz * l);
    }
  }
  _solvePositions(dt) {
    const o = this.options, cs = this.cur, nC = this.nCorr, its = Math.max(0, o.positionIterations | 0); this.stats.positionIterations = nC ? its : 0;
    this._pseudo = nC > 0 && its > 0; if (!this._pseudo) return;
    const vp = this.vp, wp = this.wp, im = this.invMass, iw = this.iw, awake = this.awake;
    for (let k = 0; k < this.nAwake; k++) { const j = awake[k] * 3; vp[j] = vp[j + 1] = vp[j + 2] = 0; wp[j] = wp[j + 1] = wp[j + 2] = 0; }
    const erp = o.positionCorrection / dt, slop = o.linearSlop, maxPush = o.maxPushSpeed, corr = this.corr, nrm = cs.nrm;
    for (let it = 0; it < its; it++) {
      for (let c = 0; c < nC; c++) {
        const k = corr[c], m = (k / 4) | 0, a = cs.a[m], b = cs.b[m], ja = a * 3, jb = b * 3, wa = a * 9, wb = b * 9, k3 = k * 3;
        const nx = nrm[m * 3], ny = nrm[m * 3 + 1], nz = nrm[m * 3 + 2], rax = cs.rA[k3], ray = cs.rA[k3 + 1], raz = cs.rA[k3 + 2], rbx = cs.rB[k3], rby = cs.rB[k3 + 1], rbz = cs.rB[k3 + 2];
        const dvx = vp[jb] + wp[jb + 1] * rbz - wp[jb + 2] * rby - vp[ja] - (wp[ja + 1] * raz - wp[ja + 2] * ray), dvy = vp[jb + 1] + wp[jb + 2] * rbx - wp[jb] * rbz - vp[ja + 1] - (wp[ja + 2] * rax - wp[ja] * raz), dvz = vp[jb + 2] + wp[jb] * rby - wp[jb + 1] * rbx - vp[ja + 2] - (wp[ja] * ray - wp[ja + 1] * rax);
        let bias = erp * (cs.depth[k] - slop); if (bias > maxPush) bias = maxPush;
        let l = cs.nm[k] * (bias - (dvx * nx + dvy * ny + dvz * nz)); const nn = Math.max(cs.pi[k] + l, 0); l = nn - cs.pi[k]; cs.pi[k] = nn;
        applyImpulse(vp, wp, im, iw, a, b, ja, jb, wa, wb, cs.rA, cs.rB, k3, nx * l, ny * l, nz * l);
      }
    }
  }
  _positionConstraints(dt) { for (const c of this.constraints) if (c.solvePosition) c.solvePosition(this, dt); }

  /* ================================================================== CCD（連続衝突判定） */
  /**
   * 高速な物体は「中心の球(コア半径)」を今ステップの変位で動かし、最初に触れる時刻 TOI を求めて、その位置で止める。
   *  - 球: 静的・動的・kinematic・平面に対して厳密（sweepSphere）。相手の運動は相対変位として扱い、相手の回転は無視。
   *  - 箱・カプセル: コア半径（箱=最小半辺, カプセル=半径）の球で近似（コア球のすり抜けを防ぐ補助。角・端のすり抜けは防げない）。
   *  - 止めた物体は次ステップで通常の接触（推測的接触）として解かれる。止めた分の移動時間は失われる（時間分割はしない）。
   */
  _ccd(dt) {
    const o = this.options, s = this.stats; s.ccdCount = 0; this._ccdScale = null;
    if (!o.ccd) return; const vel = this.vel, awake = this.awake, pos = this.pos, thr = o.ccdThreshold, vp = this._pseudo ? this.vp : this._zero3(), pseudoOn = this._pseudo;
    let list = null, nl = 0;
    for (let a = 0; a < this.nAwake; a++) {
      const i = awake[a]; if (this.btype[i] !== BODY_DYNAMIC || this.ccdMode[i] === 2 || (this.extra[i] & FL_SENSOR)) continue;
      const j = i * 3, r = this.cr[i]; if (!(r > 0)) continue;
      const pv = pseudoOn ? 1 : 0, dx = (vel[j] + vp[j] * pv) * dt, dy = (vel[j + 1] + vp[j + 1] * pv) * dt, dz = (vel[j + 2] + vp[j + 2] * pv) * dt, d2 = dx * dx + dy * dy + dz * dz, lim = (this.ccdMode[i] === 1 ? 0.25 : 1) * thr * r;
      if (d2 > lim * lim) { if (!list) list = this._ccdList || (this._ccdList = []); list[nl++] = i; }
    }
    if (!nl) return;
    if (!this._ccdScale || this._ccdScale.length < this.capacity) this._ccdScale = new Float64Array(this.capacity).fill(1);
    const sc = this._ccdScale, bp = this.bp, c = _cc;
    for (let q = 0; q < nl; q++) {
      const i = list[q], j = i * 3, r = this.cr[i], pv = pseudoOn ? 1 : 0;
      const dx = (vel[j] + vp[j] * pv) * dt, dy = (vel[j + 1] + vp[j + 1] * pv) * dt, dz = (vel[j + 2] + vp[j + 2] * pv) * dt, A = this.aabb, io = i * 6;
      let best = 1, hitAny = false;
      const test = jj => {
        if (jj === i || (this.extra[jj] & FL_SENSOR)) return; if ((this.group[i] & this.mask[jj]) === 0 || (this.group[jj] & this.mask[i]) === 0) return;
        let rdx = dx, rdy = dy, rdz = dz;
        if (this.btype[jj] !== BODY_STATIC && !this.sleepState[jj]) { const k = jj * 3; rdx -= (vel[k] + vp[k] * pv) * dt; rdy -= (vel[k + 1] + vp[k + 1] * pv) * dt; rdz -= (vel[k + 2] + vp[k + 2] * pv) * dt; }
        if (sweepSphere(this, jj, pos[j], pos[j + 1], pos[j + 2], r, rdx, rdy, rdz, c) && c.toi > 1e-6 && c.toi < best) { best = c.toi; hitAny = true; }
      };
      const x0 = Math.min(A[io], A[io] + dx), y0 = Math.min(A[io + 1], A[io + 1] + dy), z0 = Math.min(A[io + 2], A[io + 2] + dz), x1 = Math.max(A[io + 3], A[io + 3] + dx), y1 = Math.max(A[io + 4], A[io + 4] + dy), z1 = Math.max(A[io + 5], A[io + 5] + dz);
      bp.queryAABB(x0, y0, z0, x1, y1, z1, test);
      for (let p = 0; p < this.nPlanes; p++) test(this.planes[p]);
      if (hitAny) { sc[i] = best; this._ccdHits.push(i); s.ccdCount++; }
    }
  }
  _zero3() { return this._z3 && this._z3.length >= this.capacity * 3 ? this._z3 : (this._z3 = new Float64Array(this.capacity * 3)); }

  /* ================================================================== 位置の積分 */
  _integratePositions(dt) {
    const pos = this.pos, quat = this.quat, vel = this.vel, ang = this.ang, vp = this.vp, wp = this.wp, awake = this.awake, sc = this._ccdScale, usedPseudo = this._pseudo, hasCcd = this._ccdHits.length > 0, tree = this._bpKind === 'tree' ? this.bp : null;
    for (let k = 0; k < this.nAwake; k++) {
      const i = awake[k], j = i * 3, o = i * 4; let vx = vel[j], vy = vel[j + 1], vz = vel[j + 2], wx = ang[j], wy = ang[j + 1], wz = ang[j + 2];
      if (usedPseudo && this.btype[i] === BODY_DYNAMIC) { vx += vp[j]; vy += vp[j + 1]; vz += vp[j + 2]; wx += wp[j]; wy += wp[j + 1]; wz += wp[j + 2]; }
      const scale = hasCcd ? sc[i] : 1;
      pos[j] += vx * dt * scale; pos[j + 1] += vy * dt * scale; pos[j + 2] += vz * dt * scale;
      const wl = Math.sqrt(wx * wx + wy * wy + wz * wz);
      if (wl > 1e-12 && !this.lockRot[i]) {
        const half = wl * dt * 0.5, sn = Math.sin(half) / wl, dqx = wx * sn, dqy = wy * sn, dqz = wz * sn, dqw = Math.cos(half);
        const qx = quat[o], qy = quat[o + 1], qz = quat[o + 2], qw = quat[o + 3];
        const nx = dqw * qx + dqx * qw + dqy * qz - dqz * qy, ny = dqw * qy + dqy * qw + dqz * qx - dqx * qz, nz = dqw * qz + dqz * qw + dqx * qy - dqy * qx, nw = dqw * qw - dqx * qx - dqy * qy - dqz * qz;
        const l = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz + nw * nw); quat[o] = nx * l; quat[o + 1] = ny * l; quat[o + 2] = nz * l; quat[o + 3] = nw * l;
      }
      if (!isFinite(pos[j] + pos[j + 1] + pos[j + 2] + quat[o] + quat[o + 3])) this._invalidate(i);
      this._refresh(i); if (tree) tree.update(i);
    }
    if (hasCcd) { for (const i of this._ccdHits) sc[i] = 1; this._ccdHits.length = 0; }
    this._pseudo = false;
  }
  _invalidate(i) { this._warn('非有限値になった剛体を無効化（スリープ化して速度ゼロ）: body index ' + i, 'nan' + i); for (let c = 0; c < 3; c++) { this.pos[i * 3 + c] = this.prevPos[i * 3 + c]; this.vel[i * 3 + c] = 0; this.ang[i * 3 + c] = 0; } for (let c = 0; c < 4; c++) this.quat[i * 4 + c] = this.prevQuat[i * 4 + c]; this.btype[i] = BODY_STATIC; this._syncFlags(i); this._listsDirty = true; this.stats.invalidBodies = (this.stats.invalidBodies || 0) + 1; }

  /* ================================================================== スリープ判定（接触でつながった島単位） */
  _updateSleeping(dt) {
    const o = this.options, awake = this.awake, n = this.nAwake, lin2 = o.sleepLinearThreshold * o.sleepLinearThreshold, ang2 = o.sleepAngularThreshold * o.sleepAngularThreshold, isl = this.isl, minT = this.minT;
    let any = false;
    for (let k = 0; k < n; k++) {
      const i = awake[k]; isl[i] = i; if (this.btype[i] !== BODY_DYNAMIC) continue; const j = i * 3;
      const v2 = this.vel[j] * this.vel[j] + this.vel[j + 1] * this.vel[j + 1] + this.vel[j + 2] * this.vel[j + 2], w2 = this.ang[j] * this.ang[j] + this.ang[j + 1] * this.ang[j + 1] + this.ang[j + 2] * this.ang[j + 2];
      if (v2 < lin2 && w2 < ang2 && this.allowSleep[i] && !(this.extra[i] & FL_SENSOR)) { this.sleepT[i] += dt; any = true; } else this.sleepT[i] = 0;
    }
    if (!any) return;
    const cs = this.cur, find = x => { while (isl[x] !== x) { isl[x] = isl[isl[x]]; x = isl[x]; } return x; };
    for (let m = 0; m < cs.n; m++) {
      const a = cs.a[m], b = cs.b[m]; if (cs.fl[m] & MF_SENSOR) continue;
      const da = this.btype[a] === BODY_DYNAMIC && !this.sleepState[a], db = this.btype[b] === BODY_DYNAMIC && !this.sleepState[b];
      if (da && db) { const ra = find(a), rb = find(b); if (ra !== rb) isl[ra < rb ? rb : ra] = ra < rb ? ra : rb; }
      else if (da && this.btype[b] === BODY_KINEMATIC && this._moving(b)) this.sleepT[a] = 0; else if (db && this.btype[a] === BODY_KINEMATIC && this._moving(a)) this.sleepT[b] = 0;
    }
    for (let k = 0; k < n; k++) { const i = awake[k]; if (this.btype[i] === BODY_DYNAMIC) minT[i] = Infinity; }
    for (const c of this.constraints) { const ia = this._idx(c.a), ib = this._idx(c.b); if (ia >= 0 && ib >= 0 && this.btype[ia] === BODY_DYNAMIC && this.btype[ib] === BODY_DYNAMIC) { const ra = find(ia), rb = find(ib); if (ra !== rb) isl[ra < rb ? rb : ra] = ra < rb ? ra : rb; } }
    for (let k = 0; k < n; k++) { const i = awake[k]; if (this.btype[i] !== BODY_DYNAMIC) continue; const r = find(i); if (this.sleepT[i] < minT[r]) minT[r] = this.sleepT[i]; }
    // 眠らせる島: 全員が sleepTime 以上静止
    const first = this.islFirst, last = this.islLast; let slept = false;
    for (let k = 0; k < n; k++) { const i = awake[k]; if (this.btype[i] === BODY_DYNAMIC) { first[i] = -1; last[i] = -1; } }
    for (let k = 0; k < n; k++) {
      const i = awake[k]; if (this.btype[i] !== BODY_DYNAMIC) continue; const r = find(i); if (!(minT[r] >= o.sleepTime)) continue;
      if (first[r] < 0) { first[r] = last[r] = i; this.islandNext[i] = i; } else { this.islandNext[last[r]] = i; this.islandNext[i] = first[r]; last[r] = i; }
      this._sleepOne(i); slept = true;
    }
    if (slept) this._listsDirty = true;
  }

  /* ================================================================== 後処理（イベント・力のクリア） */
  _finishStep() {
    const force = this.force, torque = this.torque;
    for (let k = 0; k < this.nAwake; k++) { const j = this.awake[k] * 3; force[j] = force[j + 1] = force[j + 2] = 0; torque[j] = torque[j + 1] = torque[j + 2] = 0; }
    const o = this.options;
    if (o.onContactBegin && this._begin.length) for (let k = 0; k < this._begin.length; k += 3) { const a = this._begin[k], b = this._begin[k + 1]; if (this.live[a] && this.live[b]) o.onContactBegin(this._handleOf(a), this._handleOf(b), this._begin[k + 2] === 1); }
    if (o.onContactEnd && this._ended.length) for (let k = 0; k < this._ended.length; k += 3) { const a = this._ended[k], b = this._ended[k + 1]; if (this.live[a] && this.live[b]) o.onContactEnd(this._handleOf(a), this._handleOf(b), this._ended[k + 2] === 1); }
  }

  /* ================================================================== クエリ */
  /** AABB と重なる物体のハンドルを fn(handle) で列挙（ブロードフェーズの AABB は contactMargin 分太い）。 */
  queryAABB(x0, y0, z0, x1, y1, z1, fn) {
    if (this._listsDirty) this._rebuildLists(); this.bp.prepare();
    this.bp.queryAABB(x0, y0, z0, x1, y1, z1, i => fn(this._handleOf(i)));
  }
  /** レイキャスト。最初に当たった {handle, distance, point, normal} または null。 */
  raycast(origin, dir, maxDistance = Infinity) {
    if (this._listsDirty) this._rebuildLists(); this.bp.prepare();
    const l = Math.hypot(dir[0], dir[1], dir[2]) || 1, dx = dir[0] / l, dy = dir[1] / l, dz = dir[2] / l; let best = null, tmax = maxDistance;
    const fn = (i, t) => { if (!rayShape(this, i, origin[0], origin[1], origin[2], dx, dy, dz, t, _hit, 0)) return t; if (_hit.t <= t && (!best || _hit.t < best.distance)) { best = { handle: this._handleOf(i), distance: _hit.t, point: [origin[0] + dx * _hit.t, origin[1] + dy * _hit.t, origin[2] + dz * _hit.t], normal: [_hit.nx, _hit.ny, _hit.nz] }; return _hit.t; } return t; };
    tmax = this.bp.raycast(origin[0], origin[1], origin[2], dx, dy, dz, tmax, fn);
    for (let p = 0; p < this.nPlanes; p++) tmax = fn(this.planes[p], tmax);
    return best;
  }
  /** デバッグ・検証用: fn(handle, index) を全ボディに。 */
  forEachBody(fn) { for (let i = 0; i < this.count; i++) if (this.live[i]) fn(this._handleOf(i), i); }
  /** 現在のマニフォールドを列挙: fn(handleA, handleB, info)。info は再利用されるオブジェクト（保持しないこと）。 */
  forEachContact(fn) {
    const cs = this.cur, info = this._info || (this._info = { nx: 0, ny: 0, nz: 0, count: 0, sensor: false, points: [] });
    for (let m = 0; m < cs.n; m++) {
      info.nx = cs.nrm[m * 3]; info.ny = cs.nrm[m * 3 + 1]; info.nz = cs.nrm[m * 3 + 2]; info.count = cs.cnt[m]; info.sensor = !!(cs.fl[m] & MF_SENSOR);
      for (let p = 0; p < 4; p++) { const k = m * 4 + p; const pt = info.points[p] || (info.points[p] = { x: 0, y: 0, z: 0, depth: 0, normalImpulse: 0, id: 0 }); if (p < info.count) { pt.x = cs.p[k * 3]; pt.y = cs.p[k * 3 + 1]; pt.z = cs.p[k * 3 + 2]; pt.depth = cs.depth[k]; pt.normalImpulse = cs.ni[k]; pt.id = cs.id[k]; } }
      fn(this._handleOf(cs.a[m]), this._handleOf(cs.b[m]), info);
    }
  }
  /** 状態の指紋（FNV-1a 32bit）: 位置・姿勢・速度・角速度・スリープ状態。同一エンジン・同一入力で同一値になるかの検証用（異なる JS エンジン間の一致は保証しない）。 */
  stateHash() {
    let h = 0x811c9dc5; const n = this.count;
    const feed = u8 => { for (let k = 0; k < u8.length; k++) { h ^= u8[k]; h = Math.imul(h, 0x01000193); } };
    const f64 = (a, k) => feed(new Uint8Array(a.buffer, a.byteOffset, n * k * 8));
    f64(this.pos, 3); f64(this.quat, 4); f64(this.vel, 3); f64(this.ang, 3); feed(this.live.subarray(0, n)); feed(this.sleepState.subarray(0, n));
    return (h >>> 0).toString(16).padStart(8, '0');
  }
}

/* ------------------------------------------------------------------ ソルバー用の小関数 */
/** w·(Iw⁻¹ w): 角度方向の有効質量への寄与。 */
export function angK(iw, o, x, y, z) {
  const ax = iw[o] * x + iw[o + 1] * y + iw[o + 2] * z, ay = iw[o + 3] * x + iw[o + 4] * y + iw[o + 5] * z, az = iw[o + 6] * x + iw[o + 7] * y + iw[o + 8] * z; return x * ax + y * ay + z * az;
}
/** 接触点に力積 P を a には -P, b には +P で適用（線形 + 角速度）。 */
export function applyImpulse(vel, ang, im, iw, a, b, ja, jb, wa, wb, rarr, rbarr, k3, px, py, pz) {
  const imA = im[a], imB = im[b];
  if (imA > 0) { vel[ja] -= px * imA; vel[ja + 1] -= py * imA; vel[ja + 2] -= pz * imA; }
  if (imB > 0) { vel[jb] += px * imB; vel[jb + 1] += py * imB; vel[jb + 2] += pz * imB; }
  // 角運動量: a: -(rA × P), b: +(rB × P)
  if (iw[wa] !== 0 || iw[wa + 4] !== 0 || iw[wa + 8] !== 0) { const rx = rarr[k3], ry = rarr[k3 + 1], rz = rarr[k3 + 2], tx = ry * pz - rz * py, ty = rz * px - rx * pz, tz = rx * py - ry * px; ang[ja] -= iw[wa] * tx + iw[wa + 1] * ty + iw[wa + 2] * tz; ang[ja + 1] -= iw[wa + 3] * tx + iw[wa + 4] * ty + iw[wa + 5] * tz; ang[ja + 2] -= iw[wa + 6] * tx + iw[wa + 7] * ty + iw[wa + 8] * tz; }
  if (iw[wb] !== 0 || iw[wb + 4] !== 0 || iw[wb + 8] !== 0) { const rx = rbarr[k3], ry = rbarr[k3 + 1], rz = rbarr[k3 + 2], tx = ry * pz - rz * py, ty = rz * px - rx * pz, tz = rx * py - ry * px; ang[jb] += iw[wb] * tx + iw[wb + 1] * ty + iw[wb + 2] * tz; ang[jb + 1] += iw[wb + 3] * tx + iw[wb + 4] * ty + iw[wb + 5] * tz; ang[jb + 2] += iw[wb + 6] * tx + iw[wb + 7] * ty + iw[wb + 8] * tz; }
}
