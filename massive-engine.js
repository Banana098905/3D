/*! MASSIVE ENGINE v1.2.0 — dependency-free WebGL 2 3D engine. (c) project owner. License: not specified by the author. */
var MassiveEngine = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    AdaptiveQuality: () => AdaptiveQuality,
    AmbientLight: () => AmbientLight,
    AnimationClip: () => AnimationClip,
    Animator: () => Animator,
    AssetManager: () => AssetManager,
    AudioSystem: () => AudioSystem,
    BODY_DYNAMIC: () => BODY_DYNAMIC,
    BODY_KINEMATIC: () => BODY_KINEMATIC,
    BODY_STATIC: () => BODY_STATIC,
    BallSocketConstraint: () => BallSocketConstraint,
    BruteForceBroadphase: () => BruteForceBroadphase,
    COLLIDER_AABB: () => SHAPE_AABB,
    COLLIDER_CAPSULE: () => SHAPE_CAPSULE,
    COLLIDER_OBB: () => SHAPE_OBB,
    COLLIDER_PLANE: () => SHAPE_PLANE,
    COLLIDER_SPHERE: () => SHAPE_SPHERE2,
    Camera: () => Camera,
    CollisionWorld: () => CollisionWorld,
    Contact: () => Contact,
    DebugDraw: () => DebugDraw,
    DirectionalLight: () => DirectionalLight,
    DistanceConstraint: () => DistanceConstraint,
    DynamicTree: () => DynamicTree,
    EVENT_END: () => EVENT_END,
    EVENT_START: () => EVENT_START,
    EVENT_STAY: () => EVENT_STAY,
    EVENT_TRIGGER_ENTER: () => EVENT_TRIGGER_ENTER,
    EVENT_TRIGGER_EXIT: () => EVENT_TRIGGER_EXIT,
    EVENT_TRIGGER_STAY: () => EVENT_TRIGGER_STAY,
    Easing: () => Easing,
    Emitter: () => Emitter,
    Engine: () => Engine,
    FixedTimestep: () => FixedTimestep,
    Frustum: () => Frustum,
    Geometry: () => Geometry,
    Group: () => Group,
    HandleAllocator: () => HandleAllocator,
    HandlePool: () => HandlePool,
    InputManager: () => InputManager,
    InstancedMesh: () => InstancedMesh,
    Interpolator: () => Interpolator,
    JobQueue: () => JobQueue,
    Light: () => Light,
    MassiveEngineError: () => MassiveEngineError,
    Material: () => Material,
    Mesh: () => Mesh,
    Node: () => Node,
    OrbitControls: () => OrbitControls,
    OrthographicCamera: () => OrthographicCamera,
    ParticleField: () => ParticleField,
    ParticleSystem: () => ParticleSystem,
    PerspectiveCamera: () => PerspectiveCamera,
    PhysicsWorld: () => PhysicsWorld,
    PointLight: () => PointLight,
    Pool: () => Pool,
    Profiler: () => Profiler,
    QUALITY_PRESETS: () => QUALITY_PRESETS,
    Ray: () => Ray,
    RayHit: () => RayHit,
    ResourceManager: () => ResourceManager,
    RigidBodyWorld: () => RigidBodyWorld,
    RingStat: () => RingStat,
    SCENE_FORMAT: () => SCENE_FORMAT,
    SCENE_VERSION: () => SCENE_VERSION,
    SHAPE_BOX: () => SHAPE_BOX,
    SHAPE_SPHERE: () => SHAPE_SPHERE,
    Scene: () => Scene,
    SpatialHashBroadphase: () => SpatialHashBroadphase,
    StatWindow: () => StatWindow,
    Texture: () => Texture,
    Track: () => Track,
    TreeBroadphase: () => TreeBroadphase,
    VoxelWorld: () => VoxelWorld,
    collide: () => collide,
    computeLocalInertia: () => computeLocalInertia,
    create: () => create,
    createGridHelper: () => createGridHelper,
    default: () => index_default,
    deserializeScene: () => deserializeScene,
    generateManifold: () => generateManifold,
    isSupported: () => isSupported,
    mat4: () => mat4,
    mergeGeometries: () => mergeGeometries,
    parseOBJ: () => parseOBJ,
    pointDistance: () => pointDistance,
    quat: () => quat,
    rayFromCamera: () => rayFromCamera,
    rayShape: () => rayShape,
    raycast: () => raycast,
    serializeScene: () => serializeScene,
    sweepSphere: () => sweepSphere,
    validateGeometry: () => validateGeometry,
    vec3: () => vec3,
    version: () => VERSION
  });

  // src/util.js
  var _uid = 1;
  var uid = () => _uid++;
  var now = () => typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  var clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  var MassiveEngineError = class extends Error {
    constructor(message, code, cause) {
      super(message);
      this.name = "MassiveEngineError";
      this.code = code || "E_ENGINE";
      if (cause) this.cause = cause;
    }
  };
  var Emitter = class {
    constructor() {
      this._ev = /* @__PURE__ */ new Map();
      this._errorHandler = null;
    }
    on(type, fn) {
      if (typeof fn !== "function") throw new TypeError("listener must be a function");
      let a = this._ev.get(type);
      if (!a) this._ev.set(type, a = []);
      a.push(fn);
      return () => this.off(type, fn);
    }
    once(type, fn) {
      const off = this.on(type, (...args) => {
        off();
        fn(...args);
      });
      return off;
    }
    off(type, fn) {
      const a = this._ev.get(type);
      if (!a) return this;
      const i = a.indexOf(fn);
      if (i >= 0) a.splice(i, 1);
      return this;
    }
    hasListeners(type) {
      const a = this._ev.get(type);
      return !!(a && a.length);
    }
    emit(type, payload) {
      const a = this._ev.get(type);
      if (!a || !a.length) return false;
      for (const fn of a.slice()) {
        try {
          fn(payload);
        } catch (e) {
          if (type !== "error" && this._errorHandler) this._errorHandler(e, "listener:" + type);
          else if (typeof console !== "undefined") console.error("MassiveEngine listener error (" + type + "):", e);
        }
      }
      return true;
    }
    clearListeners() {
      this._ev.clear();
    }
  };
  var Pool = class {
    constructor(create2, reset, max = 4096) {
      this._create = create2;
      this._reset = reset || null;
      this._free = [];
      this.max = max;
      this.created = 0;
      this.reused = 0;
    }
    acquire() {
      if (this._free.length) {
        this.reused++;
        const o = this._free.pop();
        if (this._reset) this._reset(o);
        return o;
      }
      this.created++;
      return this._create();
    }
    release(o) {
      if (this._free.length < this.max) this._free.push(o);
    }
    get available() {
      return this._free.length;
    }
    clear() {
      this._free.length = 0;
    }
  };
  var JobQueue = class {
    constructor() {
      this._jobs = [];
      this.completed = 0;
      this.failed = 0;
      this.lastRunMs = 0;
    }
    get pending() {
      return this._jobs.length;
    }
    /** @returns {{cancel():void, done:Promise<void>}} */
    add(job, { priority = 0, name = "" } = {}) {
      let resolve, reject;
      const done = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      done.catch(() => {
      });
      const entry = { job, priority, name, iter: null, cancelled: false, resolve, reject };
      this._jobs.push(entry);
      this._jobs.sort((a, b) => b.priority - a.priority);
      return { cancel: () => {
        entry.cancelled = true;
      }, done };
    }
    run(budgetMs, onError) {
      const start = now();
      let ran = 0;
      while (this._jobs.length) {
        const e = this._jobs[0];
        if (e.cancelled) {
          this._jobs.shift();
          e.resolve();
          continue;
        }
        try {
          if (!e.iter) {
            const r = e.job();
            if (r && typeof r.next === "function") e.iter = r;
            else {
              this._jobs.shift();
              this.completed++;
              e.resolve(r);
              ran++;
              if (now() - start >= budgetMs) break;
              continue;
            }
          }
          const step = e.iter.next();
          if (step.done) {
            this._jobs.shift();
            this.completed++;
            e.resolve(step.value);
          }
        } catch (err) {
          this._jobs.shift();
          this.failed++;
          e.reject(err);
          if (onError) onError(err, "job:" + e.name);
        }
        ran++;
        if (now() - start >= budgetMs) break;
      }
      this.lastRunMs = now() - start;
      return ran;
    }
    clear() {
      for (const e of this._jobs) e.resolve();
      this._jobs.length = 0;
    }
  };
  var RingStat = class {
    constructor(size = 240) {
      this.size = size;
      this.buf = new Float64Array(size);
      this.n = 0;
      this.i = 0;
      this._tmp = new Float64Array(size);
    }
    push(v) {
      this.buf[this.i] = v;
      this.i = (this.i + 1) % this.size;
      if (this.n < this.size) this.n++;
    }
    clear() {
      this.n = 0;
      this.i = 0;
    }
    get last() {
      return this.n ? this.buf[(this.i - 1 + this.size) % this.size] : 0;
    }
    mean() {
      if (!this.n) return 0;
      let s = 0;
      for (let k = 0; k < this.n; k++) s += this.buf[k];
      return s / this.n;
    }
    max() {
      let m = 0;
      for (let k = 0; k < this.n; k++) if (this.buf[k] > m) m = this.buf[k];
      return m;
    }
    /** p: 0..1。最近傍順位法（n=100 の p=0.95 → 95番目の値）。 */
    percentile(p) {
      if (!this.n) return 0;
      const t = this._tmp.subarray(0, this.n);
      t.set(this.buf.subarray(0, this.n));
      t.sort();
      return t[Math.min(this.n - 1, Math.max(0, Math.ceil(this.n * p) - 1))];
    }
  };
  function f32ToBase64(arr2) {
    const bytes = new Uint8Array(arr2.buffer, arr2.byteOffset, arr2.byteLength);
    let s = "";
    const CH = 32768;
    for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  }
  function base64ToBytes(b64) {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  var base64ToF32 = (b64) => new Float32Array(base64ToBytes(b64).buffer);
  function parseColor(c, out = [1, 1, 1]) {
    if (Array.isArray(c) || ArrayBuffer.isView(c)) {
      out[0] = c[0];
      out[1] = c[1];
      out[2] = c[2];
      return out;
    }
    if (typeof c === "number") {
      out[0] = (c >> 16 & 255) / 255;
      out[1] = (c >> 8 & 255) / 255;
      out[2] = (c & 255) / 255;
      return out;
    }
    if (typeof c === "string") {
      let h = c.trim();
      if (h[0] === "#") h = h.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      if (/^[0-9a-fA-F]{6}$/.test(h)) {
        const n = parseInt(h, 16);
        return parseColor(n, out);
      }
    }
    throw new TypeError("Unsupported color: " + String(c));
  }
  function hsl(h, s, l, out = [0, 0, 0]) {
    const f = (n) => {
      const k = (n + h * 12) % 12;
      return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    };
    out[0] = f(0);
    out[1] = f(8);
    out[2] = f(4);
    return out;
  }
  function hashRandom(i, seed) {
    const v = Math.sin((i + 1) * 127.1 + (seed || 0) * 311.7) * 43758.5453123;
    return v - Math.floor(v);
  }

  // src/math.js
  var vec3 = {
    create: (x = 0, y = 0, z = 0) => new Float64Array([x, y, z]),
    set(o, x, y, z) {
      o[0] = x;
      o[1] = y;
      o[2] = z;
      return o;
    },
    copy(o, a) {
      o[0] = a[0];
      o[1] = a[1];
      o[2] = a[2];
      return o;
    },
    add(o, a, b) {
      o[0] = a[0] + b[0];
      o[1] = a[1] + b[1];
      o[2] = a[2] + b[2];
      return o;
    },
    sub(o, a, b) {
      o[0] = a[0] - b[0];
      o[1] = a[1] - b[1];
      o[2] = a[2] - b[2];
      return o;
    },
    scale(o, a, s) {
      o[0] = a[0] * s;
      o[1] = a[1] * s;
      o[2] = a[2] * s;
      return o;
    },
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross(o, a, b) {
      const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0];
      o[0] = x;
      o[1] = y;
      o[2] = z;
      return o;
    },
    length: (a) => Math.hypot(a[0], a[1], a[2]),
    distance: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
    normalize(o, a) {
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      o[0] = a[0] / l;
      o[1] = a[1] / l;
      o[2] = a[2] / l;
      return o;
    },
    transformMat4(o, a, m) {
      const x = a[0], y = a[1], z = a[2];
      const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
      o[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
      o[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
      o[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
      return o;
    },
    transformDir(o, a, m) {
      const x = a[0], y = a[1], z = a[2];
      o[0] = m[0] * x + m[4] * y + m[8] * z;
      o[1] = m[1] * x + m[5] * y + m[9] * z;
      o[2] = m[2] * x + m[6] * y + m[10] * z;
      return o;
    }
  };
  var quat = {
    create: () => new Float64Array([0, 0, 0, 1]),
    identity(o) {
      o[0] = 0;
      o[1] = 0;
      o[2] = 0;
      o[3] = 1;
      return o;
    },
    copy(o, a) {
      o[0] = a[0];
      o[1] = a[1];
      o[2] = a[2];
      o[3] = a[3];
      return o;
    },
    normalize(o, a) {
      const l = Math.hypot(a[0], a[1], a[2], a[3]) || 1;
      o[0] = a[0] / l;
      o[1] = a[1] / l;
      o[2] = a[2] / l;
      o[3] = a[3] / l;
      return o;
    },
    multiply(o, a, b) {
      const ax = a[0], ay = a[1], az = a[2], aw = a[3], bx = b[0], by = b[1], bz = b[2], bw = b[3];
      o[0] = ax * bw + aw * bx + ay * bz - az * by;
      o[1] = ay * bw + aw * by + az * bx - ax * bz;
      o[2] = az * bw + aw * bz + ax * by - ay * bx;
      o[3] = aw * bw - ax * bx - ay * by - az * bz;
      return o;
    },
    fromAxisAngle(o, ax, ay, az, angle) {
      const l = Math.hypot(ax, ay, az) || 1, s = Math.sin(angle / 2) / l;
      o[0] = ax * s;
      o[1] = ay * s;
      o[2] = az * s;
      o[3] = Math.cos(angle / 2);
      return o;
    },
    /** オイラー角 (ラジアン)、回転順は X→Y→Z（three.js の 'XYZ' と同じ） */
    fromEuler(o, x, y, z) {
      const c12 = Math.cos(x / 2), c2 = Math.cos(y / 2), c32 = Math.cos(z / 2), s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
      o[0] = s1 * c2 * c32 + c12 * s2 * s3;
      o[1] = c12 * s2 * c32 - s1 * c2 * s3;
      o[2] = c12 * c2 * s3 + s1 * s2 * c32;
      o[3] = c12 * c2 * c32 - s1 * s2 * s3;
      return o;
    },
    slerp(o, a, b, t) {
      let bx = b[0], by = b[1], bz = b[2], bw = b[3];
      let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
      if (cos < 0) {
        cos = -cos;
        bx = -bx;
        by = -by;
        bz = -bz;
        bw = -bw;
      }
      let s0, s1;
      if (1 - cos > 1e-6) {
        const om = Math.acos(cos), so = Math.sin(om);
        s0 = Math.sin((1 - t) * om) / so;
        s1 = Math.sin(t * om) / so;
      } else {
        s0 = 1 - t;
        s1 = t;
      }
      o[0] = s0 * a[0] + s1 * bx;
      o[1] = s0 * a[1] + s1 * by;
      o[2] = s0 * a[2] + s1 * bz;
      o[3] = s0 * a[3] + s1 * bw;
      return o;
    },
    /** 回転行列の基底 (列ベクトル x,y,z) から */
    fromBasis(o, xx, xy, xz, yx, yy, yz, zx, zy, zz) {
      const tr = xx + yy + zz;
      if (tr > 0) {
        const s = Math.sqrt(tr + 1) * 2;
        o[3] = s / 4;
        o[0] = (yz - zy) / s;
        o[1] = (zx - xz) / s;
        o[2] = (xy - yx) / s;
      } else if (xx > yy && xx > zz) {
        const s = Math.sqrt(1 + xx - yy - zz) * 2;
        o[3] = (yz - zy) / s;
        o[0] = s / 4;
        o[1] = (yx + xy) / s;
        o[2] = (zx + xz) / s;
      } else if (yy > zz) {
        const s = Math.sqrt(1 + yy - xx - zz) * 2;
        o[3] = (zx - xz) / s;
        o[0] = (yx + xy) / s;
        o[1] = s / 4;
        o[2] = (zy + yz) / s;
      } else {
        const s = Math.sqrt(1 + zz - xx - yy) * 2;
        o[3] = (xy - yx) / s;
        o[0] = (zx + xz) / s;
        o[1] = (zy + yz) / s;
        o[2] = s / 4;
      }
      return quat.normalize(o, o);
    }
  };
  var mat4 = {
    create() {
      const m = new Float64Array(16);
      m[0] = m[5] = m[10] = m[15] = 1;
      return m;
    },
    identity(o) {
      o.fill(0);
      o[0] = o[5] = o[10] = o[15] = 1;
      return o;
    },
    copy(o, a) {
      for (let i = 0; i < 16; i++) o[i] = a[i];
      return o;
    },
    multiply(o, a, b) {
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
      o[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      o[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      o[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      o[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      b0 = b[4];
      b1 = b[5];
      b2 = b[6];
      b3 = b[7];
      o[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      o[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      o[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      o[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      b0 = b[8];
      b1 = b[9];
      b2 = b[10];
      b3 = b[11];
      o[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      o[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      o[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      o[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      b0 = b[12];
      b1 = b[13];
      b2 = b[14];
      b3 = b[15];
      o[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      o[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      o[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      o[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      return o;
    },
    compose(o, p, q, s) {
      const x = q[0], y = q[1], z = q[2], w = q[3], x2 = x + x, y2 = y + y, z2 = z + z;
      const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
      const sx = s[0], sy = s[1], sz = s[2];
      o[0] = (1 - (yy + zz)) * sx;
      o[1] = (xy + wz) * sx;
      o[2] = (xz - wy) * sx;
      o[3] = 0;
      o[4] = (xy - wz) * sy;
      o[5] = (1 - (xx + zz)) * sy;
      o[6] = (yz + wx) * sy;
      o[7] = 0;
      o[8] = (xz + wy) * sz;
      o[9] = (yz - wx) * sz;
      o[10] = (1 - (xx + yy)) * sz;
      o[11] = 0;
      o[12] = p[0];
      o[13] = p[1];
      o[14] = p[2];
      o[15] = 1;
      return o;
    },
    /** 逆行列。特異行列の場合 null を返し out は変更しない。 */
    invert(o, a) {
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
      let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det || !isFinite(det)) return null;
      det = 1 / det;
      o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return o;
    },
    perspective(o, fovy, aspect, near, far) {
      const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
      o.fill(0);
      o[0] = f / aspect;
      o[5] = f;
      o[10] = (far + near) * nf;
      o[11] = -1;
      o[14] = 2 * far * near * nf;
      return o;
    },
    ortho(o, l, r, b, t, n, f) {
      const lr = 1 / (l - r), bt = 1 / (b - t), nf = 1 / (n - f);
      o.fill(0);
      o[0] = -2 * lr;
      o[5] = -2 * bt;
      o[10] = 2 * nf;
      o[12] = (l + r) * lr;
      o[13] = (t + b) * bt;
      o[14] = (f + n) * nf;
      o[15] = 1;
      return o;
    },
    lookAt(o, eye, target, up) {
      let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
      let len = Math.hypot(zx, zy, zz) || 1;
      zx /= len;
      zy /= len;
      zz /= len;
      let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
      len = Math.hypot(xx, xy, xz);
      if (len < 1e-9) {
        xx = 1;
        xy = 0;
        xz = 0;
        len = 1;
      }
      xx /= len;
      xy /= len;
      xz /= len;
      const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
      o[0] = xx;
      o[1] = yx;
      o[2] = zx;
      o[3] = 0;
      o[4] = xy;
      o[5] = yy;
      o[6] = zy;
      o[7] = 0;
      o[8] = xz;
      o[9] = yz;
      o[10] = zz;
      o[11] = 0;
      o[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
      o[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
      o[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
      o[15] = 1;
      return o;
    },
    /** 上位3x3の逆転置 (法線行列) を 9 要素の out に書く */
    normalMatrix(o, m) {
      const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
      const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g;
      let det = a * A + b * B + c * C;
      if (!det) {
        o[0] = 1;
        o[1] = 0;
        o[2] = 0;
        o[3] = 0;
        o[4] = 1;
        o[5] = 0;
        o[6] = 0;
        o[7] = 0;
        o[8] = 1;
        return o;
      }
      det = 1 / det;
      o[0] = A * det;
      o[3] = B * det;
      o[6] = C * det;
      o[1] = (c * h - b * i) * det;
      o[4] = (a * i - c * g) * det;
      o[7] = (b * g - a * h) * det;
      o[2] = (b * f - c * e) * det;
      o[5] = (c * d - a * f) * det;
      o[8] = (a * e - b * d) * det;
      return o;
    },
    /** ローカルAABBをmで変換したワールドAABB (中心+|M|*半径 法) */
    transformAABB(outMin, outMax, min, max, m) {
      const cx = (min[0] + max[0]) / 2, cy = (min[1] + max[1]) / 2, cz = (min[2] + max[2]) / 2;
      const ex = (max[0] - min[0]) / 2, ey = (max[1] - min[1]) / 2, ez = (max[2] - min[2]) / 2;
      const wx = m[0] * cx + m[4] * cy + m[8] * cz + m[12], wy = m[1] * cx + m[5] * cy + m[9] * cz + m[13], wz = m[2] * cx + m[6] * cy + m[10] * cz + m[14];
      const hx = Math.abs(m[0]) * ex + Math.abs(m[4]) * ey + Math.abs(m[8]) * ez;
      const hy = Math.abs(m[1]) * ex + Math.abs(m[5]) * ey + Math.abs(m[9]) * ez;
      const hz = Math.abs(m[2]) * ex + Math.abs(m[6]) * ey + Math.abs(m[10]) * ez;
      outMin[0] = wx - hx;
      outMin[1] = wy - hy;
      outMin[2] = wz - hz;
      outMax[0] = wx + hx;
      outMax[1] = wy + hy;
      outMax[2] = wz + hz;
    }
  };
  var Frustum = class {
    constructor() {
      this.planes = new Float64Array(24);
    }
    setFromMatrix(m) {
      const p = this.planes;
      const set = (i, a, b, c, d) => {
        const l = Math.hypot(a, b, c) || 1;
        p[i] = a / l;
        p[i + 1] = b / l;
        p[i + 2] = c / l;
        p[i + 3] = d / l;
      };
      set(0, m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]);
      set(4, m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]);
      set(8, m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]);
      set(12, m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]);
      set(16, m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]);
      set(20, m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]);
      return this;
    }
    intersectsSphere(cx, cy, cz, r) {
      const p = this.planes;
      for (let i = 0; i < 24; i += 4) if (p[i] * cx + p[i + 1] * cy + p[i + 2] * cz + p[i + 3] < -r) return false;
      return true;
    }
    intersectsAABB(min, max) {
      const p = this.planes;
      for (let i = 0; i < 24; i += 4) {
        const nx = p[i], ny = p[i + 1], nz = p[i + 2];
        const x = nx >= 0 ? max[0] : min[0], y = ny >= 0 ? max[1] : min[1], z = nz >= 0 ? max[2] : min[2];
        if (nx * x + ny * y + nz * z + p[i + 3] < 0) return false;
      }
      return true;
    }
  };

  // src/geometry.js
  var Geometry = class _Geometry {
    constructor(data = {}) {
      this.id = uid();
      this.name = data.name || "";
      this.mode = data.mode === "lines" ? "lines" : "triangles";
      this.positions = toF32(data.positions, "positions");
      if (!this.positions || this.positions.length < 3 || this.positions.length % 3) throw new TypeError("Geometry: positions \u306F 3 \u306E\u500D\u6570\u9577\u306E\u914D\u5217\u304C\u5FC5\u8981\u3067\u3059\u3002");
      const vc = this.positions.length / 3;
      this.uvs = data.uvs ? toF32(data.uvs, "uvs") : null;
      this.colors = data.colors ? toF32(data.colors, "colors") : null;
      this.normals = data.normals ? toF32(data.normals, "normals") : null;
      if (this.uvs && this.uvs.length !== vc * 2) throw new RangeError("Geometry: uvs \u306E\u9577\u3055\u304C\u9802\u70B9\u6570\xD72\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002");
      if (this.colors && this.colors.length !== vc * 3) throw new RangeError("Geometry: colors \u306E\u9577\u3055\u304C\u9802\u70B9\u6570\xD73\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002");
      if (this.normals && this.normals.length !== vc * 3) throw new RangeError("Geometry: normals \u306E\u9577\u3055\u304C\u9802\u70B9\u6570\xD73\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002");
      if (data.indices) {
        const ind = data.indices;
        this.indices = ind instanceof Uint16Array || ind instanceof Uint32Array ? ind : vc > 65535 ? Uint32Array.from(ind) : Uint16Array.from(ind);
        const per = this.mode === "lines" ? 2 : 3;
        if (this.indices.length % per) throw new RangeError("Geometry: indices \u306E\u9577\u3055\u304C " + per + " \u306E\u500D\u6570\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002");
        for (let i = 0; i < this.indices.length; i++) if (this.indices[i] >= vc) throw new RangeError("Geometry: indices[" + i + "] \u304C\u9802\u70B9\u6570 " + vc + " \u3092\u8D85\u3048\u3066\u3044\u307E\u3059\u3002");
      } else {
        this.indices = null;
        if (vc % (this.mode === "lines" ? 2 : 3)) throw new RangeError("Geometry: \u975E\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u63CF\u753B\u3067\u306F\u9802\u70B9\u6570\u304C " + (this.mode === "lines" ? 2 : 3) + " \u306E\u500D\u6570\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002");
      }
      if (!this.normals && this.mode === "triangles") this.computeNormals();
      this.params = data.params || null;
      this.version = 1;
      this._gpu = /* @__PURE__ */ new Map();
      this.bounds = { min: [0, 0, 0], max: [0, 0, 0], center: [0, 0, 0], radius: 0 };
      this.computeBounds();
    }
    get vertexCount() {
      return this.positions.length / 3;
    }
    get indexCount() {
      return this.indices ? this.indices.length : this.positions.length / 3;
    }
    get triangleCount() {
      return this.mode === "triangles" ? Math.floor(this.indexCount / 3) : 0;
    }
    computeBounds() {
      const p = this.positions;
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
      for (let i = 0; i < p.length; i += 3) {
        const x = p[i], y = p[i + 1], z = p[i + 2];
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (z < z0) z0 = z;
        if (z > z1) z1 = z;
      }
      const b = this.bounds;
      b.min = [x0, y0, z0];
      b.max = [x1, y1, z1];
      b.center = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
      let r2 = 0;
      for (let i = 0; i < p.length; i += 3) {
        const dx = p[i] - b.center[0], dy = p[i + 1] - b.center[1], dz = p[i + 2] - b.center[2];
        const d = dx * dx + dy * dy + dz * dz;
        if (d > r2) r2 = d;
      }
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
        for (const k of [a, b, c]) {
          n[k] += nx;
          n[k + 1] += ny;
          n[k + 2] += nz;
        }
      }
      for (let i = 0; i < n.length; i += 3) {
        const l = Math.hypot(n[i], n[i + 1], n[i + 2]);
        if (l > 0) {
          n[i] /= l;
          n[i + 1] /= l;
          n[i + 2] /= l;
        } else {
          n[i + 1] = 1;
        }
      }
      this.normals = n;
      return n;
    }
    /** 頂点データを書き換えた後に呼ぶ。次回描画時にGPUへ再アップロードされる。 */
    needsUpdate({ bounds = true } = {}) {
      this.version++;
      if (bounds) this.computeBounds();
      return this;
    }
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
        case "box":
          return _Geometry.box(p.width, p.height, p.depth);
        case "sphere":
          return _Geometry.sphere(p.radius, p.widthSegments, p.heightSegments);
        case "plane":
          return _Geometry.plane(p.width, p.depth, p.widthSegments, p.depthSegments);
        case "cylinder":
          return _Geometry.cylinder(p.radiusTop, p.radiusBottom, p.height, p.radialSegments, p.caps);
        case "grid":
          return _Geometry.grid(p.size, p.divisions);
        default:
          throw new MassiveEngineError("\u672A\u77E5\u306E\u30D7\u30EA\u30DF\u30C6\u30A3\u30D6: " + (p && p.type), "E_SCENE_FORMAT");
      }
    }
    static box(width = 1, height = 1, depth = 1) {
      const faces = [
        { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
        { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
        { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
        { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
        { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
        { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] }
      ];
      const pos = [], nor = [], uv = [], idx = [], s = [width, height, depth];
      const corners = [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]];
      faces.forEach((f, fi) => {
        for (const [cu, cv, tu, tv] of corners) {
          for (let k = 0; k < 3; k++) pos.push((f.n[k] * 0.5 + f.u[k] * 0.5 * cu + f.v[k] * 0.5 * cv) * s[k]);
          nor.push(f.n[0], f.n[1], f.n[2]);
          uv.push(tu, tv);
        }
        const o = fi * 4;
        idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
      });
      return new _Geometry({ positions: pos, normals: nor, uvs: uv, indices: idx, name: "box", params: { type: "box", width, height, depth } });
    }
    static sphere(radius = 0.5, widthSegments = 24, heightSegments = 16) {
      widthSegments = Math.max(3, Math.floor(widthSegments));
      heightSegments = Math.max(2, Math.floor(heightSegments));
      const pos = [], nor = [], uv = [], idx = [], grid = [];
      for (let y = 0; y <= heightSegments; y++) {
        const row = [], v = y / heightSegments, th = v * Math.PI;
        for (let x = 0; x <= widthSegments; x++) {
          const u = x / widthSegments, ph = u * Math.PI * 2;
          const nx = -Math.cos(ph) * Math.sin(th), ny = Math.cos(th), nz = Math.sin(ph) * Math.sin(th);
          pos.push(nx * radius, ny * radius, nz * radius);
          nor.push(nx, ny, nz);
          uv.push(u, 1 - v);
          row.push(pos.length / 3 - 1);
        }
        grid.push(row);
      }
      for (let y = 0; y < heightSegments; y++) for (let x = 0; x < widthSegments; x++) {
        const a = grid[y][x + 1], b = grid[y][x], c = grid[y + 1][x], d = grid[y + 1][x + 1];
        if (y !== 0) idx.push(a, b, d);
        if (y !== heightSegments - 1) idx.push(b, c, d);
      }
      return new _Geometry({ positions: pos, normals: nor, uvs: uv, indices: idx, name: "sphere", params: { type: "sphere", radius, widthSegments, heightSegments } });
    }
    /** XZ 平面上の板（法線 +Y）。 */
    static plane(width = 1, depth = 1, widthSegments = 1, depthSegments = 1) {
      widthSegments = Math.max(1, Math.floor(widthSegments));
      depthSegments = Math.max(1, Math.floor(depthSegments));
      const pos = [], nor = [], uv = [], idx = [];
      for (let iz = 0; iz <= depthSegments; iz++) for (let ix = 0; ix <= widthSegments; ix++) {
        pos.push((ix / widthSegments - 0.5) * width, 0, (iz / depthSegments - 0.5) * depth);
        nor.push(0, 1, 0);
        uv.push(ix / widthSegments, 1 - iz / depthSegments);
      }
      const w1 = widthSegments + 1;
      for (let iz = 0; iz < depthSegments; iz++) for (let ix = 0; ix < widthSegments; ix++) {
        const i00 = iz * w1 + ix, i10 = i00 + 1, i01 = i00 + w1, i11 = i01 + 1;
        idx.push(i00, i01, i11, i00, i11, i10);
      }
      return new _Geometry({ positions: pos, normals: nor, uvs: uv, indices: idx, name: "plane", params: { type: "plane", width, depth, widthSegments, depthSegments } });
    }
    static cylinder(radiusTop = 0.5, radiusBottom = 0.5, height = 1, radialSegments = 24, caps = true) {
      radialSegments = Math.max(3, Math.floor(radialSegments));
      const pos = [], nor = [], uv = [], idx = [], h2 = height / 2, slope = height ? (radiusBottom - radiusTop) / height : 0;
      for (let i = 0; i <= radialSegments; i++) {
        const u = i / radialSegments, th = u * Math.PI * 2, sx = Math.sin(th), cz = Math.cos(th);
        const l = Math.hypot(1, slope);
        pos.push(sx * radiusTop, h2, cz * radiusTop);
        nor.push(sx / l, slope / l, cz / l);
        uv.push(u, 1);
        pos.push(sx * radiusBottom, -h2, cz * radiusBottom);
        nor.push(sx / l, slope / l, cz / l);
        uv.push(u, 0);
      }
      for (let i = 0; i < radialSegments; i++) {
        const t = i * 2, b = t + 1, t2 = t + 2, b2 = t + 3;
        idx.push(t, b, t2, b, b2, t2);
      }
      const cap = (top) => {
        const r = top ? radiusTop : radiusBottom;
        if (!(r > 0)) return;
        const y = top ? h2 : -h2, ny = top ? 1 : -1, c = pos.length / 3;
        pos.push(0, y, 0);
        nor.push(0, ny, 0);
        uv.push(0.5, 0.5);
        for (let i = 0; i <= radialSegments; i++) {
          const th = i / radialSegments * Math.PI * 2;
          pos.push(Math.sin(th) * r, y, Math.cos(th) * r);
          nor.push(0, ny, 0);
          uv.push(0.5 + Math.sin(th) * 0.5, 0.5 + Math.cos(th) * 0.5);
        }
        for (let i = 0; i < radialSegments; i++) top ? idx.push(c, c + 1 + i, c + 2 + i) : idx.push(c, c + 2 + i, c + 1 + i);
      };
      if (caps) {
        cap(true);
        cap(false);
      }
      return new _Geometry({ positions: pos, normals: nor, uvs: uv, indices: idx, name: "cylinder", params: { type: "cylinder", radiusTop, radiusBottom, height, radialSegments, caps } });
    }
    /** XZ 平面のグリッド線 (mode:'lines')。 */
    static grid(size = 10, divisions = 10) {
      divisions = Math.max(1, Math.floor(divisions));
      const pos = [], h = size / 2;
      for (let i = 0; i <= divisions; i++) {
        const t = -h + i / divisions * size;
        pos.push(t, 0, -h, t, 0, h, -h, 0, t, h, 0, t);
      }
      return new _Geometry({ positions: pos, mode: "lines", name: "grid", params: { type: "grid", size, divisions } });
    }
  };
  function toF32(a, name) {
    if (!a) return null;
    if (a instanceof Float32Array) return a;
    if (Array.isArray(a) || ArrayBuffer.isView(a)) return Float32Array.from(a);
    throw new TypeError("Geometry: " + name + " \u306F\u914D\u5217\u307E\u305F\u306F TypedArray \u304C\u5FC5\u8981\u3067\u3059\u3002");
  }

  // src/material.js
  var Material = class _Material {
    constructor(o = {}) {
      this.id = uid();
      this.name = o.name || "";
      this.color = parseColor(o.color === void 0 ? 16777215 : o.color, [1, 1, 1]);
      this.emissive = parseColor(o.emissive === void 0 ? 0 : o.emissive, [0, 0, 0]);
      this.opacity = o.opacity === void 0 ? 1 : o.opacity;
      this.transparent = o.transparent === void 0 ? this.opacity < 1 : !!o.transparent;
      this.map = o.map || null;
      this.vertexColors = !!o.vertexColors;
      this.unlit = !!o.unlit;
      this.specular = o.specular === void 0 ? 0.15 : o.specular;
      this.shininess = o.shininess === void 0 ? 32 : o.shininess;
      this.doubleSided = !!o.doubleSided;
      this.depthTest = o.depthTest !== false;
      this.depthWrite = o.depthWrite === void 0 ? !this.transparent : !!o.depthWrite;
      this.alphaTest = o.alphaTest || 0;
      this.blending = o.blending === "additive" ? "additive" : "normal";
    }
    setColor(c) {
      parseColor(c, this.color);
      return this;
    }
    clone() {
      const m = new _Material(this);
      m.color = this.color.slice();
      m.emissive = this.emissive.slice();
      return m;
    }
    dispose() {
    }
  };

  // src/node.js
  var _tmpMin = new Float64Array(3);
  var _tmpMax = new Float64Array(3);
  var _inv = mat4.create();
  var _v = vec3.create();
  var Node = class _Node {
    constructor(name = "") {
      this.id = uid();
      this.name = name;
      this.type = "Node";
      this.parent = null;
      this.children = [];
      this.position = vec3.create();
      this.quaternion = quat.create();
      this.scale = new Float64Array([1, 1, 1]);
      this.visible = true;
      this.static = false;
      this.userData = {};
      this._local = mat4.create();
      this._world = mat4.create();
      this._prev = new Float64Array(10);
      this._prev[3 + 3] = NaN;
      this._dirty = true;
      this._subtreeDirty = true;
      this._worldVersion = 1;
    }
    add(...nodes) {
      for (const n of nodes) {
        if (!(n instanceof _Node)) throw new TypeError("Node.add: Node \u304C\u5FC5\u8981\u3067\u3059\u3002");
        if (n === this) throw new MassiveEngineError("Node.add: \u81EA\u5206\u81EA\u8EAB\u306F\u8FFD\u52A0\u3067\u304D\u307E\u305B\u3093\u3002", "E_SCENE");
        for (let p = this; p; p = p.parent) if (p === n) throw new MassiveEngineError("Node.add: \u5FAA\u74B0\u3059\u308B\u89AA\u5B50\u95A2\u4FC2\u306B\u306A\u308A\u307E\u3059\u3002", "E_SCENE");
        if (n.parent) n.parent._removeChild(n);
        n.parent = this;
        this.children.push(n);
        n.markDirty();
      }
      return this;
    }
    _removeChild(n) {
      const i = this.children.indexOf(n);
      if (i >= 0) {
        this.children.splice(i, 1);
        n.parent = null;
      }
    }
    remove(...nodes) {
      for (const n of nodes) if (n.parent === this) {
        this._removeChild(n);
        n.markDirty();
      }
      return this;
    }
    removeFromParent() {
      if (this.parent) this.parent.remove(this);
      return this;
    }
    markDirty() {
      this._dirty = true;
      for (let p = this.parent; p && !p._subtreeDirty; p = p.parent) p._subtreeDirty = true;
      this._subtreeDirty = true;
      return this;
    }
    setPosition(x, y, z) {
      this.position[0] = x;
      this.position[1] = y;
      this.position[2] = z;
      return this.markDirty();
    }
    setScale(x, y = x, z = x) {
      this.scale[0] = x;
      this.scale[1] = y;
      this.scale[2] = z;
      return this.markDirty();
    }
    setRotationEuler(x, y, z) {
      quat.fromEuler(this.quaternion, x, y, z);
      return this.markDirty();
    }
    setQuaternion(x, y, z, w) {
      this.quaternion[0] = x;
      this.quaternion[1] = y;
      this.quaternion[2] = z;
      this.quaternion[3] = w;
      quat.normalize(this.quaternion, this.quaternion);
      return this.markDirty();
    }
    /** ワールド座標の点を向く（-Z が target を向く。カメラと同じ規約）。親のワールド行列が最新である必要がある。 */
    lookAt(x, y, z, up = [0, 1, 0]) {
      if (Array.isArray(x) || ArrayBuffer.isView(x)) {
        up = y || up;
        z = x[2];
        y = x[1];
        x = x[0];
      }
      _v[0] = x;
      _v[1] = y;
      _v[2] = z;
      if (this.parent && mat4.invert(_inv, this.parent._world)) vec3.transformMat4(_v, _v, _inv);
      let zx = this.position[0] - _v[0], zy = this.position[1] - _v[1], zz = this.position[2] - _v[2];
      let l = Math.hypot(zx, zy, zz);
      if (l < 1e-12) return this;
      zx /= l;
      zy /= l;
      zz /= l;
      let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
      l = Math.hypot(xx, xy, xz);
      if (l < 1e-9) {
        xx = 1;
        xy = 0;
        xz = 0;
        l = 1;
      }
      xx /= l;
      xy /= l;
      xz /= l;
      const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
      quat.fromBasis(this.quaternion, xx, xy, xz, yx, yy, yz, zx, zy, zz);
      return this.markDirty();
    }
    _trsChanged() {
      const p = this._prev, a = this.position, q = this.quaternion, s = this.scale;
      if (p[0] === a[0] && p[1] === a[1] && p[2] === a[2] && p[3] === q[0] && p[4] === q[1] && p[5] === q[2] && p[6] === q[3] && p[7] === s[0] && p[8] === s[1] && p[9] === s[2]) return false;
      p[0] = a[0];
      p[1] = a[1];
      p[2] = a[2];
      p[3] = q[0];
      p[4] = q[1];
      p[5] = q[2];
      p[6] = q[3];
      p[7] = s[0];
      p[8] = s[1];
      p[9] = s[2];
      return true;
    }
    /** 子孫を含め行列を更新。戻り値: このノードのワールド行列が変化したか。 */
    updateMatrices(parentChanged = false) {
      if (this.static && !this._dirty && !this._subtreeDirty && !parentChanged) return false;
      let changed = parentChanged;
      if (this._dirty || !this.static) {
        if (this._trsChanged()) {
          mat4.compose(this._local, this.position, this.quaternion, this.scale);
          changed = true;
        } else if (this._dirty) changed = true;
      }
      if (changed) {
        if (this.parent) mat4.multiply(this._world, this.parent._world, this._local);
        else mat4.copy(this._world, this._local);
        this._worldVersion++;
      }
      this._dirty = false;
      this._subtreeDirty = false;
      const ch = this.children;
      for (let i = 0; i < ch.length; i++) ch[i].updateMatrices(changed);
      return changed;
    }
    /** このノードだけ、祖先から辿って最新のワールド行列を計算する（シーン更新前に位置を知りたいとき）。 */
    updateWorldMatrix() {
      if (this.parent) this.parent.updateWorldMatrix();
      mat4.compose(this._local, this.position, this.quaternion, this.scale);
      if (this.parent) mat4.multiply(this._world, this.parent._world, this._local);
      else mat4.copy(this._world, this._local);
      this._worldVersion++;
      return this._world;
    }
    get worldMatrix() {
      return this._world;
    }
    getWorldPosition(out = vec3.create()) {
      this.updateWorldMatrix();
      out[0] = this._world[12];
      out[1] = this._world[13];
      out[2] = this._world[14];
      return out;
    }
    traverse(fn) {
      fn(this);
      for (let i = 0; i < this.children.length; i++) this.children[i].traverse(fn);
      return this;
    }
    find(name) {
      let r = null;
      this.traverse((n) => {
        if (!r && n.name === name) r = n;
      });
      return r;
    }
    /** 子孫を含めてシーンから外す。GPUリソース(geometry/texture)は別途 disposeResources() か AssetManager で解放。 */
    dispose() {
      for (const c of this.children.slice()) c.dispose();
      this.removeFromParent();
    }
    disposeResources() {
    }
  };
  var Group = class extends Node {
    constructor(name) {
      super(name);
      this.type = "Group";
    }
  };
  var Scene = class extends Node {
    constructor() {
      super("Scene");
      this.type = "Scene";
      this.background = [0.025, 0.045, 0.075];
    }
    collect(out = { lights: [], meshes: [], instanced: [] }) {
      out.lights.length = 0;
      out.meshes.length = 0;
      out.instanced.length = 0;
      const walk = (n) => {
        if (!n.visible) return;
        switch (n.type) {
          case "Mesh":
            out.meshes.push(n);
            break;
          case "InstancedMesh":
            out.instanced.push(n);
            break;
          case "AmbientLight":
          case "DirectionalLight":
          case "PointLight":
            out.lights.push(n);
            break;
        }
        for (let i = 0; i < n.children.length; i++) walk(n.children[i]);
      };
      walk(this);
      return out;
    }
  };
  var Mesh = class extends Node {
    constructor(geometry, material, o = {}) {
      super(o.name || "");
      if (!(geometry instanceof Geometry)) throw new TypeError("Mesh: geometry \u306F Geometry \u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u304C\u5FC5\u8981\u3067\u3059\u3002");
      this.type = "Mesh";
      this.geometry = geometry;
      this.material = material || new Material();
      this.castShadow = !!o.castShadow;
      this.receiveShadow = !!o.receiveShadow;
      this.frustumCulled = o.frustumCulled !== false;
      this.renderOrder = o.renderOrder || 0;
      this.wmin = new Float64Array(3);
      this.wmax = new Float64Array(3);
      this._bv = 0;
      this._bgv = 0;
      this._bgid = 0;
      if (o.static) this.static = true;
    }
    updateWorldBounds() {
      if (this._bv !== this._worldVersion || this._bgv !== this.geometry.version || this._bgid !== this.geometry.id) {
        mat4.transformAABB(this.wmin, this.wmax, this.geometry.bounds.min, this.geometry.bounds.max, this._world);
        this._bv = this._worldVersion;
        this._bgv = this.geometry.version;
        this._bgid = this.geometry.id;
      }
    }
    disposeResources({ textures = true } = {}) {
      this.geometry.dispose();
      if (textures && this.material.map) this.material.map.dispose();
    }
  };
  var InstancedMesh = class extends Node {
    /**
     * 同一ジオメトリを大量に描画する。内部は chunkSize 個ごとのチャンクに分割され、
     * チャンク単位で ビュー・フラスタムカリング / LOD選択 / GPU転送 を行う。
     * 各インスタンス: 4x4行列(ローカル空間) + 色(rgb) + 位相(phase; spin アニメーション用)。
     */
    constructor(geometry, material, o = {}) {
      super(o.name || "");
      if (!(geometry instanceof Geometry)) throw new TypeError("InstancedMesh: geometry \u306F Geometry \u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u304C\u5FC5\u8981\u3067\u3059\u3002");
      this.type = "InstancedMesh";
      this.geometry = geometry;
      this.material = material || new Material();
      this.chunkSize = Math.max(64, Math.floor(o.chunkSize || 4096));
      this.dynamic = o.dynamic !== false;
      this.castShadow = !!o.castShadow;
      this.receiveShadow = !!o.receiveShadow;
      this.frustumCulled = o.frustumCulled !== false;
      this.spin = !!o.spin;
      this.spinSpeed = o.spinSpeed === void 0 ? 1 : o.spinSpeed;
      this.maxDistance = o.maxDistance || Infinity;
      this.preciseRaycast = o.preciseRaycast !== false;
      this.lods = [{ geometry, distance: 0 }];
      for (const l of o.lods || []) this.addLOD(l.geometry, l.distance);
      this.capacity = 0;
      this.count = 0;
      this.matrices = new Float32Array(0);
      this.colors = new Float32Array(0);
      this.chunks = [];
      this._gpu = /* @__PURE__ */ new Map();
      this._ensureCapacity(Math.max(1, o.capacity || o.count || 1));
      if (o.count) this.setCount(o.count);
    }
    addLOD(geometry, distance) {
      if (!(geometry instanceof Geometry)) throw new TypeError("addLOD: Geometry \u304C\u5FC5\u8981\u3067\u3059\u3002");
      if (!(distance > 0)) throw new RangeError("addLOD: distance \u306F\u6B63\u306E\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
      this.lods.push({ geometry, distance });
      this.lods.sort((a, b) => a.distance - b.distance);
      this._gpuReset();
      return this;
    }
    _gpuReset() {
      for (const r of Array.from(this._gpu.keys())) r._freeInstanced(this);
      this._gpu.clear();
    }
    get chunkCount() {
      return Math.ceil(this.count / this.chunkSize);
    }
    _ensureCapacity(n) {
      if (n <= this.capacity) return;
      let cap = Math.max(this.capacity * 2, n, 16);
      if (cap > this.chunkSize) cap = Math.ceil(cap / this.chunkSize) * this.chunkSize;
      const m = new Float32Array(cap * 16), c = new Float32Array(cap * 4);
      m.set(this.matrices);
      c.set(this.colors);
      this.matrices = m;
      this.colors = c;
      this.capacity = cap;
      const nch = Math.ceil(cap / this.chunkSize);
      while (this.chunks.length < nch) this.chunks.push({ boundsDirty: true, uploadDirty: true, dLo: 0, dHi: this.chunkSize, min: new Float64Array(3), max: new Float64Array(3), radius: 0, center: new Float64Array(3) });
    }
    setCount(n) {
      n = Math.max(0, Math.floor(n));
      if (!Number.isFinite(n)) throw new RangeError("setCount: \u6709\u9650\u306E\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
      this._ensureCapacity(n);
      for (let i = this.count; i < n; i++) {
        const o = i * 16;
        this.matrices.fill(0, o, o + 16);
        this.matrices[o] = this.matrices[o + 5] = this.matrices[o + 10] = this.matrices[o + 15] = 1;
        const c = i * 4;
        this.colors[c] = this.colors[c + 1] = this.colors[c + 2] = 1;
        this.colors[c + 3] = 0;
      }
      const old = this.count;
      this.count = n;
      this.markInstancesDirty(Math.min(old, n), Math.max(old, n));
      return this;
    }
    /** チャンク内の「GPU へ再転送が必要な範囲」[dLo, dHi) を広げる。範囲外の部分は転送しない（バッファ更新量の削減）。 */
    _dirtyRange(ch, lo, hi) {
      if (!ch.uploadDirty) {
        ch.dLo = lo;
        ch.dHi = hi;
      } else {
        if (lo < ch.dLo) ch.dLo = lo;
        if (hi > ch.dHi) ch.dHi = hi;
      }
      ch.uploadDirty = true;
    }
    _touch(i) {
      const c = i / this.chunkSize | 0, ch = this.chunks[c], l = i - c * this.chunkSize;
      ch.boundsDirty = true;
      this._dirtyRange(ch, l, l + 1);
    }
    /** matrices / colors を直接書き換えた範囲 [start,end) を通知する（チャンク境界の再計算とGPU再転送が行われる）。 */
    markInstancesDirty(start = 0, end = this.count) {
      if (end <= start) {
        end = start + 1;
      }
      const a = start / this.chunkSize | 0, b = Math.min(this.chunks.length - 1, Math.max(start, end - 1) / this.chunkSize | 0);
      for (let c = a; c <= b; c++) {
        const ch = this.chunks[c], cs = c * this.chunkSize;
        ch.boundsDirty = true;
        this._dirtyRange(ch, Math.max(start, cs) - cs, Math.min(Math.max(end, start + 1), cs + this.chunkSize) - cs);
      }
      return this;
    }
    _check(i) {
      if (!(i >= 0 && i < this.count) || i !== (i | 0)) throw new RangeError("InstancedMesh: \u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u756A\u53F7\u304C\u7BC4\u56F2\u5916\u3067\u3059: " + i + " (count=" + this.count + ")");
    }
    setMatrixAt(i, m) {
      this._check(i);
      const o = i * 16;
      for (let k = 0; k < 16; k++) this.matrices[o + k] = m[k];
      this._touch(i);
      return this;
    }
    getMatrixAt(i, out = new Float32Array(16)) {
      this._check(i);
      const o = i * 16;
      for (let k = 0; k < 16; k++) out[k] = this.matrices[o + k];
      return out;
    }
    setPositionAt(i, x, y, z) {
      if (!(i >= 0 && i < this.count)) throw new RangeError("InstancedMesh: \u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u756A\u53F7\u304C\u7BC4\u56F2\u5916\u3067\u3059: " + i);
      const o = i * 16;
      this.matrices[o + 12] = x;
      this.matrices[o + 13] = y;
      this.matrices[o + 14] = z;
      this._touch(i);
      return this;
    }
    setTRSAt(i, p, q, s) {
      this._check(i);
      const tmp = mat4.compose(_tmpM, p, q || [0, 0, 0, 1], s || [1, 1, 1]);
      return this.setMatrixAt(i, tmp);
    }
    setColorAt(i, r, g, b) {
      this._check(i);
      const o = i * 4;
      if (typeof r !== "number") {
        const c = parseColor(r);
        r = c[0];
        g = c[1];
        b = c[2];
      }
      this.colors[o] = r;
      this.colors[o + 1] = g;
      this.colors[o + 2] = b;
      this._touch(i);
      return this;
    }
    setPhaseAt(i, phase) {
      this._check(i);
      this.colors[i * 4 + 3] = phase;
      this._touch(i);
      return this;
    }
    addInstance(matrix) {
      const i = this.count;
      this.setCount(i + 1);
      if (matrix) this.setMatrixAt(i, matrix);
      return i;
    }
    /** swap-remove。最後のインスタンスが i に移動する（O(1)）。戻り値: 移動元の旧番号 (移動なしは -1)。 */
    removeInstance(i) {
      this._check(i);
      const last = this.count - 1;
      let moved = -1;
      if (i !== last) {
        this.matrices.copyWithin(i * 16, last * 16, last * 16 + 16);
        this.colors.copyWithin(i * 4, last * 4, last * 4 + 4);
        moved = last;
        this._touch(i);
      }
      this._touch(last);
      this.count = last;
      return moved;
    }
    /** チャンクのローカルAABB・バウンディング球を再計算（描画時に自動呼び出し）。 */
    computeChunkBounds(c) {
      const ch = this.chunks[c], s = c * this.chunkSize, e = Math.min(this.count, s + this.chunkSize), m = this.matrices;
      if (e <= s) {
        ch.radius = 0;
        ch.boundsDirty = false;
        return ch;
      }
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity, r2 = 0;
      for (let i = s; i < e; i++) {
        const o = i * 16, x = m[o + 12], y = m[o + 13], z = m[o + 14];
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (z < z0) z0 = z;
        if (z > z1) z1 = z;
        const a = m[o] * m[o] + m[o + 1] * m[o + 1] + m[o + 2] * m[o + 2], b = m[o + 4] * m[o + 4] + m[o + 5] * m[o + 5] + m[o + 6] * m[o + 6], d = m[o + 8] * m[o + 8] + m[o + 9] * m[o + 9] + m[o + 10] * m[o + 10];
        const mx = a > b ? a > d ? a : d : b > d ? b : d;
        if (mx > r2) r2 = mx;
      }
      const gr = this.geometry.bounds.radius, gc = this.geometry.bounds.center, ext = gr * Math.sqrt(r2) + Math.hypot(gc[0], gc[1], gc[2]) * Math.sqrt(r2);
      ch.min[0] = x0 - ext;
      ch.min[1] = y0 - ext;
      ch.min[2] = z0 - ext;
      ch.max[0] = x1 + ext;
      ch.max[1] = y1 + ext;
      ch.max[2] = z1 + ext;
      ch.center[0] = (x0 + x1) / 2;
      ch.center[1] = (y0 + y1) / 2;
      ch.center[2] = (z0 + z1) / 2;
      ch.radius = Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + ext;
      ch.boundsDirty = false;
      return ch;
    }
    get byteSize() {
      return this.capacity * 80;
    }
    dispose() {
      this._gpuReset();
      super.dispose();
    }
    disposeResources({ textures = true } = {}) {
      this._gpuReset();
      for (const l of this.lods) l.geometry.dispose();
      if (textures && this.material.map) this.material.map.dispose();
    }
  };
  var _tmpM = mat4.create();
  var Light = class extends Node {
    constructor(color = 16777215, intensity = 1) {
      super();
      this.color = parseColor(color, [1, 1, 1]);
      this.intensity = intensity;
    }
  };
  var AmbientLight = class extends Light {
    constructor(color, intensity = 0.35) {
      super(color, intensity);
      this.type = "AmbientLight";
    }
  };
  var DirectionalLight = class extends Light {
    /**
     * direction: 光が進む向き（ワールド座標）。castShadow: シャドウマップ有効（先頭の影つき方向光のみ）。
     * shadow.extent: 影を描く範囲の半径、shadow.target: 範囲の中心 (null = カメラの注視点)。
     */
    constructor(color, intensity = 0.85, o = {}) {
      super(color, intensity);
      this.type = "DirectionalLight";
      this.direction = Float64Array.from(o.direction || [-0.45, -0.85, -0.55]);
      this.castShadow = !!o.castShadow;
      this.shadow = Object.assign({ mapSize: 2048, extent: 30, bias: 6e-4, normalBias: 0.03, target: null }, o.shadow);
    }
  };
  var PointLight = class extends Light {
    constructor(color, intensity = 1, range = 20) {
      super(color, intensity);
      this.type = "PointLight";
      this.range = range;
    }
  };
  var Camera = class extends Node {
    constructor() {
      super("Camera");
      this.type = "Camera";
      this.near = 0.1;
      this.far = 2e3;
      this.projection = mat4.create();
      this.view = mat4.create();
      this.viewProjection = mat4.create();
      this.aspect = 1;
    }
    updateProjection() {
      throw new Error("abstract");
    }
    /** ワールド行列 → ビュー行列 → ビュー射影行列を更新 */
    updateCamera(aspect) {
      if (aspect) this.aspect = aspect;
      this.updateWorldMatrix();
      this.updateProjection();
      if (!mat4.invert(this.view, this._world)) mat4.identity(this.view);
      mat4.multiply(this.viewProjection, this.projection, this.view);
      return this;
    }
  };
  var PerspectiveCamera = class extends Camera {
    constructor(fovDeg = 50, near = 0.1, far = 2e3) {
      super();
      this.type = "PerspectiveCamera";
      this.fov = fovDeg;
      this.near = near;
      this.far = far;
    }
    updateProjection() {
      mat4.perspective(this.projection, this.fov * Math.PI / 180, this.aspect || 1, this.near, this.far);
    }
  };
  var OrthographicCamera = class extends Camera {
    /** height: ビューの縦のワールド単位長 */
    constructor(height = 10, near = -1e3, far = 1e3) {
      super();
      this.type = "OrthographicCamera";
      this.height = height;
      this.near = near;
      this.far = far;
    }
    updateProjection() {
      const h = this.height / 2, w = h * (this.aspect || 1);
      mat4.ortho(this.projection, -w, w, -h, h, this.near, this.far);
    }
  };
  function createGridHelper(size = 20, divisions = 20, color = "#3a5d82", opacity = 0.5) {
    const m = new Mesh(Geometry.grid(size, divisions), new Material({ color, unlit: true, opacity, transparent: opacity < 1, depthWrite: false }), { frustumCulled: false });
    m.name = "GridHelper";
    m.static = true;
    return m;
  }

  // src/controls.js
  var OrbitControls = class {
    constructor(camera, o = {}) {
      this.camera = camera;
      this.enabled = o.enabled !== false;
      this.target = Float64Array.from(o.target || [0, 0, 0]);
      this.distance = o.distance || 10;
      this.yaw = o.yaw === void 0 ? 0.68 : o.yaw;
      this.pitch = o.pitch === void 0 ? 0.5 : o.pitch;
      this.minDistance = o.minDistance || 0.3;
      this.maxDistance = o.maxDistance || 1e5;
      this.minPitch = o.minPitch === void 0 ? -1.5 : o.minPitch;
      this.maxPitch = o.maxPitch === void 0 ? 1.5 : o.maxPitch;
      this.rotateSpeed = o.rotateSpeed || 8e-3;
      this.zoomSpeed = o.zoomSpeed || 1e-3;
      this.panSpeed = o.panSpeed || 1;
      this._ptr = /* @__PURE__ */ new Map();
      this._canvas = null;
      this._h = {};
      this._pinch = 0;
      this.update();
    }
    update() {
      const c = this.camera, d = this.distance, cp = Math.cos(this.pitch);
      c.position[0] = this.target[0] + d * cp * Math.sin(this.yaw);
      c.position[1] = this.target[1] + d * Math.sin(this.pitch);
      c.position[2] = this.target[2] + d * cp * Math.cos(this.yaw);
      c.lookAt(this.target[0], this.target[1], this.target[2]);
      return this;
    }
    rotate(dx, dy) {
      this.yaw -= dx * this.rotateSpeed;
      this.pitch = clamp(this.pitch + dy * this.rotateSpeed, this.minPitch, this.maxPitch);
    }
    zoom(factor) {
      this.distance = clamp(this.distance * factor, this.minDistance, this.maxDistance);
    }
    pan(dx, dy) {
      const h = Math.max(1, this._canvas ? this._canvas.clientHeight : 600), fov = (this.camera.fov || 50) * Math.PI / 180;
      const k = 2 * this.distance * Math.tan(fov / 2) / h * this.panSpeed, cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), sp = Math.sin(this.pitch), cp = Math.cos(this.pitch);
      const rx = cy, rz = -sy, ux = -sp * sy, uy = cp, uz = -sp * cy;
      this.target[0] += (-dx * rx + dy * ux) * k;
      this.target[1] += dy * uy * k;
      this.target[2] += (-dx * rz + dy * uz) * k;
    }
    /** 視点を物体群に合わせる */
    frame(center, radius) {
      this.target.set(center);
      this.distance = clamp(radius * 2.4, this.minDistance, this.maxDistance);
      this.update();
    }
    attach(canvas) {
      this.detach();
      this._canvas = canvas;
      const h = this._h;
      h.down = (e) => {
        if (!this.enabled) return;
        this._ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button, shift: e.shiftKey });
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch (_) {
        }
        if (this._ptr.size === 2) this._pinch = this._pinchDist();
      };
      h.move = (e) => {
        const p = this._ptr.get(e.pointerId);
        if (!p || !this.enabled) return;
        const dx = e.clientX - p.x, dy = e.clientY - p.y;
        p.x = e.clientX;
        p.y = e.clientY;
        if (this._ptr.size >= 2) {
          const d = this._pinchDist();
          if (this._pinch > 0 && d > 0) this.zoom(this._pinch / d);
          this._pinch = d;
          this.pan(dx / 2, dy / 2);
        } else if (p.button === 2 || p.shift || p.button === 1) this.pan(dx, dy);
        else this.rotate(dx, dy);
        this.update();
      };
      h.up = (e) => {
        this._ptr.delete(e.pointerId);
        this._pinch = 0;
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch (_) {
        }
      };
      h.wheel = (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        this.zoom(Math.exp(e.deltaY * this.zoomSpeed));
        this.update();
      };
      h.ctx = (e) => {
        if (this.enabled) e.preventDefault();
      };
      canvas.addEventListener("pointerdown", h.down);
      canvas.addEventListener("pointermove", h.move);
      canvas.addEventListener("pointerup", h.up);
      canvas.addEventListener("pointercancel", h.up);
      canvas.addEventListener("wheel", h.wheel, { passive: false });
      canvas.addEventListener("contextmenu", h.ctx);
      return this;
    }
    _pinchDist() {
      const a = Array.from(this._ptr.values());
      return a.length < 2 ? 0 : Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
    }
    detach() {
      const c = this._canvas, h = this._h;
      if (!c) return;
      c.removeEventListener("pointerdown", h.down);
      c.removeEventListener("pointermove", h.move);
      c.removeEventListener("pointerup", h.up);
      c.removeEventListener("pointercancel", h.up);
      c.removeEventListener("wheel", h.wheel);
      c.removeEventListener("contextmenu", h.ctx);
      this._canvas = null;
      this._ptr.clear();
    }
    dispose() {
      this.detach();
    }
  };

  // src/shaders.js
  var MAX_DIR = 2;
  var MAX_POINT = 8;
  function vertexSource(f) {
    return `#version 300 es
precision highp float;
layout(location=0) in vec3 a_position;
layout(location=1) in vec3 a_normal;
layout(location=2) in vec2 a_uv;
layout(location=3) in vec3 a_color;
${f.INSTANCED ? `layout(location=4) in vec4 a_i0;
layout(location=5) in vec4 a_i1;
layout(location=6) in vec4 a_i2;
layout(location=7) in vec4 a_i3;
layout(location=8) in vec4 a_icolor;` : ""}
uniform mat4 u_viewProj;
uniform mat4 u_model;
uniform mat3 u_normalMat;
uniform float u_time;
uniform float u_spin;
${f.SHADOW_RECV ? "uniform mat4 u_shadowMat; uniform float u_normalBias; out vec4 v_shadow;" : ""}
${f.DEPTH_ONLY ? "" : "out vec3 v_normal; out vec3 v_world; out vec2 v_uv; out vec3 v_color;"}
void main(){
  vec3 lp = a_position;
  vec3 ln = a_normal;
${f.INSTANCED ? `  mat4 im = mat4(a_i0, a_i1, a_i2, a_i3);
  if (u_spin != 0.0) {
    float a = u_spin * (u_time * (0.25 + fract(a_icolor.w) * 0.5) + a_icolor.w);
    float c = cos(a), s = sin(a);
    mat3 r = mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c);
    lp = r * lp; ln = r * ln;
  }
  vec4 wp = u_model * (im * vec4(lp, 1.0));
  vec3 wn = mat3(u_model) * (mat3(im) * ln);` : `  vec4 wp = u_model * vec4(lp, 1.0);
  vec3 wn = u_normalMat * ln;`}
  gl_Position = u_viewProj * wp;
${f.DEPTH_ONLY ? "" : `  v_world = wp.xyz;
  v_normal = wn;
  v_uv = a_uv;
  v_color = ${f.INSTANCED ? f.VCOLOR ? "a_icolor.rgb * a_color" : "a_icolor.rgb" : f.VCOLOR ? "a_color" : "vec3(1.0)"};`}
${f.SHADOW_RECV ? "  v_shadow = u_shadowMat * vec4(wp.xyz + normalize(wn) * u_normalBias, 1.0);" : ""}
}`;
  }
  function fragmentSource(f) {
    if (f.DEPTH_ONLY) return `#version 300 es
precision highp float;
out vec4 outColor;
void main(){ outColor = vec4(1.0); }`;
    return `#version 300 es
precision highp float;
precision highp sampler2DShadow;
in vec3 v_normal; in vec3 v_world; in vec2 v_uv; in vec3 v_color;
out vec4 outColor;
uniform vec3 u_color; uniform float u_opacity; uniform vec3 u_emissive;
uniform float u_specular; uniform float u_shininess; uniform float u_alphaTest;
uniform vec3 u_ambient; uniform vec3 u_cam;
uniform int u_numDir; uniform vec3 u_dirDir[${MAX_DIR}]; uniform vec3 u_dirColor[${MAX_DIR}];
uniform int u_numPoint; uniform vec3 u_pointPos[${MAX_POINT}]; uniform vec4 u_pointColor[${MAX_POINT}];
${f.MAP ? "uniform sampler2D u_map;" : ""}
${f.SHADOW_RECV ? `uniform sampler2DShadow u_shadowMap; uniform float u_shadowTexel; uniform float u_shadowBias; in vec4 v_shadow;
float shadowFactor(){
  vec3 sc = v_shadow.xyz / v_shadow.w;
  if (sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 || sc.z > 1.0) return 1.0;
  float s = 0.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++)
    s += texture(u_shadowMap, vec3(sc.xy + vec2(float(x), float(y)) * u_shadowTexel, sc.z - u_shadowBias));
  return s / 9.0;
}` : ""}
void main(){
  vec4 base = vec4(u_color * v_color, 1.0);
${f.MAP ? "  base *= texture(u_map, v_uv);" : ""}
  float alpha = u_opacity * base.a;
${f.ALPHATEST ? "  if (alpha < u_alphaTest) discard;" : ""}
${f.UNLIT ? "  outColor = vec4(base.rgb + u_emissive, alpha);" : `  vec3 N = normalize(v_normal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(u_cam - v_world);
  vec3 light = u_ambient; vec3 spec = vec3(0.0);
  for (int i = 0; i < ${MAX_DIR}; i++) {
    if (i >= u_numDir) break;
    vec3 L = u_dirDir[i]; float nl = max(dot(N, L), 0.0);
    float sh = 1.0;
${f.SHADOW_RECV ? "    if (i == 0) sh = shadowFactor();" : ""}
    light += u_dirColor[i] * nl * sh;
    if (nl > 0.0) spec += u_dirColor[i] * sh * pow(max(dot(N, normalize(L + V)), 0.0), u_shininess);
  }
  for (int i = 0; i < ${MAX_POINT}; i++) {
    if (i >= u_numPoint) break;
    vec3 d = u_pointPos[i] - v_world; float dist = length(d); vec3 L = d / max(dist, 1e-4);
    float w = clamp(1.0 - (dist * dist) / (u_pointColor[i].w * u_pointColor[i].w), 0.0, 1.0);
    float att = w * w; float nl = max(dot(N, L), 0.0);
    light += u_pointColor[i].rgb * nl * att;
    if (nl > 0.0) spec += u_pointColor[i].rgb * att * pow(max(dot(N, normalize(L + V)), 0.0), u_shininess);
  }
  outColor = vec4(base.rgb * light + spec * u_specular + u_emissive, alpha);`}
}`;
  }

  // src/renderer.js
  var WRAP = (g) => ({ repeat: g.REPEAT, clamp: g.CLAMP_TO_EDGE, mirror: g.MIRRORED_REPEAT });
  var _f32 = new Float32Array(16);
  var _n9 = new Float32Array(9);
  var _bmin = new Float64Array(3);
  var _bmax = new Float64Array(3);
  var _lv = mat4.create();
  var _lp = mat4.create();
  var _lvp = mat4.create();
  var _sm = mat4.create();
  var _bias = new Float64Array([0.5, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0.5, 0, 0.5, 0.5, 0.5, 1]);
  var WebGL2Renderer = class {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.opts = opts;
      const gl = canvas.getContext("webgl2", { antialias: opts.antialias !== false, alpha: false, powerPreference: opts.powerPreference || "high-performance", stencil: false, preserveDrawingBuffer: !!opts.preserveDrawingBuffer });
      if (!gl) throw new MassiveEngineError("WebGL 2 \u3092\u5229\u7528\u3067\u304D\u307E\u305B\u3093\uFF08\u30D6\u30E9\u30A6\u30B6/\u7AEF\u672B\u304C\u975E\u5BFE\u5FDC\u3001\u307E\u305F\u306F\u30AD\u30E3\u30F3\u30D0\u30B9\u304C\u5225\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u3067\u4F7F\u7528\u6E08\u307F\uFF09\u3002", "E_WEBGL2_UNAVAILABLE");
      this.gl = gl;
      this.disposed = false;
      this.lost = false;
      this._resources = /* @__PURE__ */ new Set();
      this.frustum = new Frustum();
      this._lists = { lights: [], meshes: [], instanced: [] };
      this._opaque = [];
      this._transp = [];
      this._frame = 0;
      this._pass = 0;
      this.stats = { drawCalls: 0, triangles: 0, instances: 0, visibleObjects: 0, culledObjects: 0, visibleChunks: 0, culledChunks: 0, shadowDrawCalls: 0, uploadMs: 0, uploadBytes: 0, vertices: 0, textureBytes: 0, visibilityCulled: 0, programs: 0, geometries: 0, textures: 0, gpuBytes: 0, shadows: false, gpuMs: null, gpuTimer: false };
      this._init();
    }
    _init() {
      const gl = this.gl;
      this.programs = /* @__PURE__ */ new Map();
      this._bytes = { geo: 0, tex: 0, inst: 0, shadow: 0 };
      this._st = { prog: null, vao: null, depthTest: null, depthWrite: null, blend: null, additive: false, cull: null, tex0: null, tex1: null };
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.vertexAttrib3f(1, 0, 1, 0);
      gl.vertexAttrib2f(2, 0, 0);
      gl.vertexAttrib3f(3, 1, 1, 1);
      this._white = null;
      this._shadow = null;
      this._shadowFailed = false;
      if (this.visibilityFilter === void 0) this.visibilityFilter = null;
      this._aniso = gl.getExtension("EXT_texture_filter_anisotropic");
      const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
      this._timer = ext ? { ext, pending: [], active: null } : null;
      this.stats.gpuTimer = !!ext;
      this.stats.gpuMs = null;
      this._dirL = new Float32Array(MAX_DIR * 3);
      this._dirC = new Float32Array(MAX_DIR * 3);
      this._ptP = new Float32Array(MAX_POINT * 3);
      this._ptC = new Float32Array(MAX_POINT * 4);
      this._ambient = new Float32Array(3);
      this._nDir = 0;
      this._nPt = 0;
    }
    /** コンテキスト消失時: すべてのGPUハンドルを無効化（CPU側データは保持）。 */
    handleContextLost() {
      this.lost = true;
      for (const r of this._resources) if (r._gpu) r._gpu.delete(this);
      this._resources.clear();
      this.programs = /* @__PURE__ */ new Map();
      if (this._timer) {
        this._timer.pending.length = 0;
        this._timer.active = null;
      }
    }
    /** 復帰後: 状態を再初期化。ジオメトリ/テクスチャ/プログラムは次の描画で自動再作成される。 */
    handleContextRestored() {
      this.lost = false;
      this._init();
    }
    /* ---------- プログラム ---------- */
    _program(flags) {
      const key = Object.keys(flags).filter((k) => flags[k]).sort().join("|");
      let p = this.programs.get(key);
      if (p) return p;
      const gl = this.gl, f = {};
      for (const k of key.split("|")) if (k) f[k] = true;
      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          const log = gl.getShaderInfoLog(s) || "";
          gl.deleteShader(s);
          throw new MassiveEngineError("\u30B7\u30A7\u30FC\u30C0\u306E\u30B3\u30F3\u30D1\u30A4\u30EB\u306B\u5931\u6557 [" + key + "]: " + log, "E_SHADER");
        }
        return s;
      };
      const vs = compile(gl.VERTEX_SHADER, vertexSource(f)), fs = compile(gl.FRAGMENT_SHADER, fragmentSource(f));
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(prog) || "";
        gl.deleteProgram(prog);
        throw new MassiveEngineError("\u30D7\u30ED\u30B0\u30E9\u30E0\u306E\u30EA\u30F3\u30AF\u306B\u5931\u6557 [" + key + "]: " + log, "E_SHADER");
      }
      p = { program: prog, locs: {}, pass: -1, key, flags: f };
      this.programs.set(key, p);
      this.stats.programs = this.programs.size;
      return p;
    }
    _loc(p, n) {
      let l = p.locs[n];
      if (l === void 0) {
        l = this.gl.getUniformLocation(p.program, n);
        p.locs[n] = l;
      }
      return l;
    }
    _use(p) {
      if (this._st.prog !== p) {
        this.gl.useProgram(p.program);
        this._st.prog = p;
      }
    }
    _bindVAO(v) {
      if (this._st.vao !== v) {
        this.gl.bindVertexArray(v);
        this._st.vao = v;
      }
    }
    /* ---------- ジオメトリ ---------- */
    _buf(target, data, usage = this.gl.STATIC_DRAW) {
      const gl = this.gl, b = gl.createBuffer();
      gl.bindBuffer(target, b);
      gl.bufferData(target, data, usage);
      return b;
    }
    _geo(geo) {
      let g = geo._gpu.get(this);
      if (g && g.version === geo.version) return g;
      const gl = this.gl;
      if (g) this._releaseGeo(g);
      g = { version: geo.version, bytes: geo.byteSize, mode: geo.mode === "lines" ? gl.LINES : gl.TRIANGLES, bufs: [], index: null, indexType: 0, count: geo.indexCount };
      const vao = g.vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      this._st.vao = vao;
      const attr = (loc, data, size) => {
        if (!data) return;
        const b = this._buf(gl.ARRAY_BUFFER, data);
        g.bufs.push(b);
        g.attribBufs = g.attribBufs || {};
        g.attribBufs[loc] = [b, size];
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      };
      attr(0, geo.positions, 3);
      attr(1, geo.normals, 3);
      attr(2, geo.uvs, 2);
      attr(3, geo.colors, 3);
      if (geo.indices) {
        g.index = this._buf(gl.ELEMENT_ARRAY_BUFFER, geo.indices);
        g.indexType = geo.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
      }
      gl.bindVertexArray(null);
      this._st.vao = null;
      this._bytes.geo += g.bytes;
      geo._gpu.set(this, g);
      this._resources.add(geo);
      this.stats.geometries = this._countRes("geo");
      return g;
    }
    _releaseGeo(g) {
      const gl = this.gl;
      if (!gl.isContextLost()) {
        for (const b of g.bufs) gl.deleteBuffer(b);
        if (g.index) gl.deleteBuffer(g.index);
        gl.deleteVertexArray(g.vao);
      }
      this._bytes.geo -= g.bytes;
    }
    _freeGeometry(geo) {
      const g = geo._gpu.get(this);
      if (g) {
        this._releaseGeo(g);
        geo._gpu.delete(this);
        this._resources.delete(geo);
        if (this._st.vao === g.vao) this._st.vao = null;
        this.stats.geometries = this._countRes("geo");
      }
    }
    _countRes(kind) {
      let n = 0;
      for (const r of this._resources) {
        if (kind === "geo" && r.positions) n++;
        else if (kind === "tex" && r.wrapS) n++;
      }
      return n;
    }
    /* ---------- テクスチャ ---------- */
    _whiteTex() {
      if (this._white) return this._white;
      const gl = this.gl, t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      this._st.tex0 = null;
      return this._white = t;
    }
    _tex(tex) {
      if (!tex.ready) return this._whiteTex();
      let g = tex._gpu.get(this);
      if (g && g.version === tex.version) return g.handle;
      const gl = this.gl, W = WRAP(gl);
      if (!g) {
        g = { handle: gl.createTexture(), version: -1, bytes: 0 };
        tex._gpu.set(this, g);
        this._resources.add(tex);
      }
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, g.handle);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, tex.flipY ? 1 : 0);
      const s = tex.source;
      if (s.data) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tex.width, tex.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, s.data instanceof Uint8Array ? s.data : new Uint8Array(s.data.buffer, s.data.byteOffset, s.data.length));
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, s);
      const mip = tex.minFilter === "mipmap";
      if (mip) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : tex.minFilter === "nearest" ? gl.NEAREST : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, tex.magFilter === "nearest" ? gl.NEAREST : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, W[tex.wrapS] || gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, W[tex.wrapT] || gl.REPEAT);
      if (this._aniso && mip) gl.texParameterf(gl.TEXTURE_2D, this._aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, gl.getParameter(this._aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      this._bytes.tex += tex.byteSize - g.bytes;
      g.bytes = tex.byteSize;
      g.version = tex.version;
      this.stats.textures = this._countRes("tex");
      return g.handle;
    }
    _freeTexture(tex) {
      const g = tex._gpu.get(this);
      if (g) {
        if (!this.gl.isContextLost()) this.gl.deleteTexture(g.handle);
        this._bytes.tex -= g.bytes;
        tex._gpu.delete(this);
        this._resources.delete(tex);
        this.stats.textures = this._countRes("tex");
        this._st.tex0 = null;
      }
    }
    _bindTex(unit, handle) {
      const k = unit ? "tex1" : "tex0";
      if (this._st[k] !== handle) {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, handle);
        this._st[k] = handle;
      }
    }
    /* ---------- インスタンスメッシュ ---------- */
    _inst(mesh) {
      let ig = mesh._gpu.get(this);
      if (!ig) {
        ig = { chunks: [] };
        mesh._gpu.set(this, ig);
        this._resources.add(mesh);
      }
      return ig;
    }
    _chunkGpu(mesh, ig, c) {
      let cg = ig.chunks[c];
      if (!cg) {
        const gl = this.gl, usage = mesh.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW;
        cg = { matBuf: gl.createBuffer(), colBuf: gl.createBuffer(), vaos: [] };
        gl.bindBuffer(gl.ARRAY_BUFFER, cg.matBuf);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.chunkSize * 64, usage);
        gl.bindBuffer(gl.ARRAY_BUFFER, cg.colBuf);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.chunkSize * 16, usage);
        this._bytes.inst += mesh.chunkSize * 80;
        ig.chunks[c] = cg;
        mesh.chunks[c].uploadDirty = true;
        mesh.chunks[c].dLo = 0;
        mesh.chunks[c].dHi = mesh.chunkSize;
      }
      return cg;
    }
    _uploadChunk(mesh, c, cg) {
      const gl = this.gl, t0 = now(), ch = mesh.chunks[c], s = c * mesh.chunkSize, n = Math.min(mesh.chunkSize, mesh.count - s);
      const lo = Math.max(0, Math.min(ch.dLo, n)), hi = Math.min(n, Math.max(ch.dHi, lo)), cnt = hi - lo;
      if (cnt > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, cg.matBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, lo * 64, mesh.matrices, (s + lo) * 16, cnt * 16);
        gl.bindBuffer(gl.ARRAY_BUFFER, cg.colBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, lo * 16, mesh.colors, (s + lo) * 4, cnt * 4);
        this.stats.uploadBytes += cnt * 80;
      }
      ch.uploadDirty = false;
      ch.dLo = 0;
      ch.dHi = 0;
      this.stats.uploadMs += now() - t0;
    }
    _chunkVao(cg, level, g) {
      const gl = this.gl;
      let e = cg.vaos[level];
      if (e && e.geo === g) return e.vao;
      if (e) gl.deleteVertexArray(e.vao);
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      for (const loc in g.attribBufs) {
        const [b, size] = g.attribBufs[loc];
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.enableVertexAttribArray(+loc);
        gl.vertexAttribPointer(+loc, size, gl.FLOAT, false, 0, 0);
      }
      if (g.index) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.index);
      gl.bindBuffer(gl.ARRAY_BUFFER, cg.matBuf);
      for (let k = 0; k < 4; k++) {
        gl.enableVertexAttribArray(4 + k);
        gl.vertexAttribPointer(4 + k, 4, gl.FLOAT, false, 64, k * 16);
        gl.vertexAttribDivisor(4 + k, 1);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, cg.colBuf);
      gl.enableVertexAttribArray(8);
      gl.vertexAttribPointer(8, 4, gl.FLOAT, false, 16, 0);
      gl.vertexAttribDivisor(8, 1);
      gl.bindVertexArray(null);
      this._st.vao = null;
      cg.vaos[level] = { vao, geo: g };
      return vao;
    }
    _freeInstanced(mesh) {
      const ig = mesh._gpu.get(this);
      if (!ig) return;
      const gl = this.gl;
      if (!gl.isContextLost()) {
        for (const cg of ig.chunks) if (cg) {
          gl.deleteBuffer(cg.matBuf);
          gl.deleteBuffer(cg.colBuf);
          for (const e of cg.vaos) if (e) gl.deleteVertexArray(e.vao);
        }
      }
      for (const cg of ig.chunks) if (cg) this._bytes.inst -= mesh.chunkSize * 80;
      mesh._gpu.delete(this);
      this._resources.delete(mesh);
      this._st.vao = null;
    }
    /* ---------- シャドウマップ ---------- */
    _ensureShadow(size) {
      const gl = this.gl;
      if (this._shadow && this._shadow.size === size) return this._shadow;
      this._freeShadow();
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tex, 0);
      gl.drawBuffers([gl.NONE]);
      gl.readBuffer(gl.NONE);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (!ok) {
        gl.deleteTexture(tex);
        gl.deleteFramebuffer(fbo);
        this._shadowFailed = true;
        return null;
      }
      this._bytes.shadow = size * size * 4;
      return this._shadow = { tex, fbo, size };
    }
    _freeShadow() {
      const s = this._shadow;
      if (!s) return;
      if (!this.gl.isContextLost()) {
        this.gl.deleteTexture(s.tex);
        this.gl.deleteFramebuffer(s.fbo);
      }
      this._shadow = null;
      this._bytes.shadow = 0;
      this._st.tex1 = null;
    }
    get shadowSupported() {
      return !this._shadowFailed;
    }
    /* ---------- GPUタイマ ---------- */
    _timerBegin() {
      const t = this._timer;
      if (!t) return;
      const gl = this.gl;
      while (t.pending.length) {
        const q = t.pending[0];
        if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
        t.pending.shift();
        const disjoint = gl.getParameter(t.ext.GPU_DISJOINT_EXT);
        if (!disjoint) this.stats.gpuMs = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
        gl.deleteQuery(q);
      }
      if (t.pending.length < 3) {
        t.active = gl.createQuery();
        gl.beginQuery(t.ext.TIME_ELAPSED_EXT, t.active);
      }
    }
    _timerEnd() {
      const t = this._timer;
      if (t && t.active) {
        this.gl.endQuery(t.ext.TIME_ELAPSED_EXT);
        t.pending.push(t.active);
        t.active = null;
      }
    }
    /* ---------- 描画 ---------- */
    _renderState(mat, transparent) {
      const gl = this.gl, st = this._st, dt = mat.depthTest, dw = mat.depthWrite, bl = transparent, cu = !mat.doubleSided;
      if (st.depthTest !== dt) {
        dt ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);
        st.depthTest = dt;
      }
      if (st.depthWrite !== dw) {
        gl.depthMask(dw);
        st.depthWrite = dw;
      }
      if (st.blend !== bl) {
        bl ? gl.enable(gl.BLEND) : gl.disable(gl.BLEND);
        st.blend = bl;
      }
      if (bl) {
        const add2 = mat.blending === "additive";
        if (st.additive !== add2) {
          add2 ? gl.blendFunc(gl.SRC_ALPHA, gl.ONE) : gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          st.additive = add2;
        }
      }
      if (st.cull !== cu) {
        cu ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE);
        st.cull = cu;
      }
    }
    _flagsFor(mesh, geo, mat, instanced, shadowRecv) {
      return { INSTANCED: instanced, MAP: !!mat.map, VCOLOR: !!(mat.vertexColors && geo.colors), UNLIT: mat.unlit || geo.mode === "lines", ALPHATEST: mat.alphaTest > 0, SHADOW_RECV: !!(shadowRecv && mesh.receiveShadow && !mat.unlit) };
    }
    _setFrame(p, ctx) {
      if (p.pass === this._pass) return;
      p.pass = this._pass;
      const gl = this.gl, L = (n) => this._loc(p, n);
      gl.uniformMatrix4fv(L("u_viewProj"), false, ctx.vpF);
      gl.uniform1f(L("u_time"), ctx.time);
      if (p.flags.DEPTH_ONLY) return;
      gl.uniform3fv(L("u_ambient"), this._ambient);
      gl.uniform3f(L("u_cam"), ctx.cam[0], ctx.cam[1], ctx.cam[2]);
      gl.uniform1i(L("u_numDir"), this._nDir);
      gl.uniform3fv(L("u_dirDir"), this._dirL);
      gl.uniform3fv(L("u_dirColor"), this._dirC);
      gl.uniform1i(L("u_numPoint"), this._nPt);
      gl.uniform3fv(L("u_pointPos"), this._ptP);
      gl.uniform4fv(L("u_pointColor"), this._ptC);
      if (p.flags.SHADOW_RECV) {
        gl.uniformMatrix4fv(L("u_shadowMat"), false, ctx.shadowMatF);
        gl.uniform1f(L("u_normalBias"), ctx.normalBias);
        gl.uniform1f(L("u_shadowTexel"), 1 / ctx.shadowSize);
        gl.uniform1f(L("u_shadowBias"), ctx.shadowBias);
        gl.uniform1i(L("u_shadowMap"), 1);
        this._bindTex(1, this._shadow.tex);
      }
    }
    _setMaterial(p, mat, depth) {
      if (depth) return;
      const gl = this.gl, L = (n) => this._loc(p, n);
      gl.uniform3f(L("u_color"), mat.color[0], mat.color[1], mat.color[2]);
      gl.uniform1f(L("u_opacity"), mat.opacity);
      gl.uniform3f(L("u_emissive"), mat.emissive[0], mat.emissive[1], mat.emissive[2]);
      gl.uniform1f(L("u_specular"), mat.specular);
      gl.uniform1f(L("u_shininess"), mat.shininess);
      gl.uniform1f(L("u_alphaTest"), mat.alphaTest);
      if (mat.map) {
        gl.uniform1i(L("u_map"), 0);
        this._bindTex(0, this._tex(mat.map));
      }
    }
    _drawMesh(mesh, ctx, depth) {
      const gl = this.gl, geo = mesh.geometry, mat = mesh.material, g = this._geo(geo);
      const flags = depth ? { DEPTH_ONLY: true } : this._flagsFor(mesh, geo, mat, false, ctx.shadowOn);
      const p = this._program(flags);
      this._use(p);
      this._setFrame(p, ctx);
      const w = mesh._world;
      for (let i = 0; i < 16; i++) _f32[i] = w[i];
      gl.uniformMatrix4fv(this._loc(p, "u_model"), false, _f32);
      if (!depth) {
        mat4.normalMatrix(_n9, w);
        gl.uniformMatrix3fv(this._loc(p, "u_normalMat"), false, _n9);
      }
      this._setMaterial(p, mat, depth);
      this._bindVAO(g.vao);
      if (g.index) gl.drawElements(g.mode, g.count, g.indexType, 0);
      else gl.drawArrays(g.mode, 0, g.count);
      if (depth) this.stats.shadowDrawCalls++;
      else {
        this.stats.drawCalls++;
        this.stats.triangles += geo.triangleCount;
        this.stats.vertices += geo.vertexCount;
      }
    }
    _drawInstanced(mesh, ctx, depth, lightSphere) {
      const gl = this.gl, mat = mesh.material, ig = this._inst(mesh), w = mesh._world;
      const flags = depth ? { DEPTH_ONLY: true, INSTANCED: true } : this._flagsFor(mesh, mesh.geometry, mat, true, ctx.shadowOn);
      const p = this._program(flags);
      this._use(p);
      this._setFrame(p, ctx);
      for (let i = 0; i < 16; i++) _f32[i] = w[i];
      gl.uniformMatrix4fv(this._loc(p, "u_model"), false, _f32);
      gl.uniform1f(this._loc(p, "u_spin"), mesh.spin ? mesh.spinSpeed : 0);
      this._setMaterial(p, mat, depth);
      const cam = ctx.cam, lods = mesh.lods, bias = ctx.lodBias || 1;
      for (let c = 0; c < mesh.chunkCount; c++) {
        const ch = mesh.chunks[c];
        if (ch.boundsDirty) mesh.computeChunkBounds(c);
        const n = Math.min(mesh.chunkSize, mesh.count - c * mesh.chunkSize);
        if (n <= 0) continue;
        mat4.transformAABB(_bmin, _bmax, ch.min, ch.max, w);
        const cx = (_bmin[0] + _bmax[0]) / 2, cy = (_bmin[1] + _bmax[1]) / 2, cz = (_bmin[2] + _bmax[2]) / 2, rad = Math.hypot(_bmax[0] - _bmin[0], _bmax[1] - _bmin[1], _bmax[2] - _bmin[2]) / 2;
        if (mesh.frustumCulled) {
          const vis = depth ? Math.hypot(cx - lightSphere[0], cy - lightSphere[1], cz - lightSphere[2]) < rad + lightSphere[3] : this.frustum.intersectsAABB(_bmin, _bmax);
          if (!vis) {
            if (!depth) this.stats.culledChunks++;
            continue;
          }
        }
        const dist = Math.max(0, Math.hypot(cx - cam[0], cy - cam[1], cz - cam[2]) - rad);
        if (dist > mesh.maxDistance) {
          if (!depth) this.stats.culledChunks++;
          continue;
        }
        let level = 0;
        const eff = dist / bias;
        for (let l = 1; l < lods.length; l++) if (eff >= lods[l].distance) level = l;
        const lgeo = lods[level].geometry, g = this._geo(lgeo), cg = this._chunkGpu(mesh, ig, c);
        if (ch.uploadDirty) this._uploadChunk(mesh, c, cg);
        this._bindVAO(this._chunkVao(cg, level, g));
        if (g.index) gl.drawElementsInstanced(g.mode, g.count, g.indexType, 0, n);
        else gl.drawArraysInstanced(g.mode, 0, g.count, n);
        if (depth) this.stats.shadowDrawCalls++;
        else {
          this.stats.drawCalls++;
          this.stats.triangles += lgeo.triangleCount * n;
          this.stats.vertices += lgeo.vertexCount * n;
          this.stats.instances += n;
          this.stats.visibleChunks++;
        }
      }
    }
    /**
     * シーンを1フレーム描画する。
     * ctx: { time, shadows(bool), shadowMapSize, lodBias, shadowCenter:[x,y,z]|null }
     * 戻り値: false = コンテキスト消失中で描画していない
     */
    render(scene, camera, ctx = {}) {
      const gl = this.gl;
      if (this.disposed) throw new MassiveEngineError("\u30EC\u30F3\u30C0\u30E9\u306F\u7834\u68C4\u6E08\u307F\u3067\u3059\u3002", "E_DISPOSED");
      if (this.lost || gl.isContextLost()) return false;
      const st = this.stats;
      st.drawCalls = 0;
      st.triangles = 0;
      st.instances = 0;
      st.visibleObjects = 0;
      st.culledObjects = 0;
      st.visibleChunks = 0;
      st.culledChunks = 0;
      st.shadowDrawCalls = 0;
      st.uploadMs = 0;
      st.uploadBytes = 0;
      st.vertices = 0;
      st.visibilityCulled = 0;
      this._frame++;
      scene.updateMatrices();
      const W = this.canvas.width, H = this.canvas.height;
      camera.updateCamera(W / Math.max(1, H));
      this.frustum.setFromMatrix(camera.viewProjection);
      const lists = scene.collect(this._lists), cam = [camera._world[12], camera._world[13], camera._world[14]];
      this._timerBegin();
      const amb = this._ambient;
      amb[0] = amb[1] = amb[2] = 0;
      const dirs = [], pts = [];
      let caster = null;
      for (const l of lists.lights) {
        if (l.type === "AmbientLight") {
          amb[0] += l.color[0] * l.intensity;
          amb[1] += l.color[1] * l.intensity;
          amb[2] += l.color[2] * l.intensity;
        } else if (l.type === "DirectionalLight") {
          dirs.push(l);
          if (l.castShadow && !caster) caster = l;
        } else if (l.type === "PointLight") {
          l.updateWorldMatrix();
          pts.push(l);
        }
      }
      if (caster) {
        dirs.splice(dirs.indexOf(caster), 1);
        dirs.unshift(caster);
      }
      this._nDir = Math.min(MAX_DIR, dirs.length);
      for (let i = 0; i < this._nDir; i++) {
        const d = dirs[i].direction, l = Math.hypot(d[0], d[1], d[2]) || 1, k = i * 3, c = dirs[i].color, it = dirs[i].intensity;
        this._dirL[k] = -d[0] / l;
        this._dirL[k + 1] = -d[1] / l;
        this._dirL[k + 2] = -d[2] / l;
        this._dirC[k] = c[0] * it;
        this._dirC[k + 1] = c[1] * it;
        this._dirC[k + 2] = c[2] * it;
      }
      if (pts.length > MAX_POINT) pts.sort((a, b) => Math.hypot(a._world[12] - cam[0], a._world[13] - cam[1], a._world[14] - cam[2]) - Math.hypot(b._world[12] - cam[0], b._world[13] - cam[1], b._world[14] - cam[2]));
      this._nPt = Math.min(MAX_POINT, pts.length);
      for (let i = 0; i < this._nPt; i++) {
        const l = pts[i], k = i * 3, c = l.color;
        this._ptP[k] = l._world[12];
        this._ptP[k + 1] = l._world[13];
        this._ptP[k + 2] = l._world[14];
        this._ptC[i * 4] = c[0] * l.intensity;
        this._ptC[i * 4 + 1] = c[1] * l.intensity;
        this._ptC[i * 4 + 2] = c[2] * l.intensity;
        this._ptC[i * 4 + 3] = Math.max(1e-3, l.range);
      }
      const base = { time: ctx.time || 0, cam, lodBias: ctx.lodBias || 1, vpF: new Float32Array(16), shadowOn: false };
      const wantShadow = !!(ctx.shadows && caster && !this._shadowFailed);
      if (wantShadow) {
        const sh = caster.shadow, size = Math.min(sh.mapSize, ctx.shadowMapSize || sh.mapSize), S = this._ensureShadow(size);
        if (S) {
          const e = sh.extent, c = sh.target || ctx.shadowCenter || [cam[0] - camera._world[8] * e, cam[1] - camera._world[9] * e, cam[2] - camera._world[10] * e];
          const d = caster.direction, dl = Math.hypot(d[0], d[1], d[2]) || 1, L = [d[0] / dl, d[1] / dl, d[2] / dl];
          mat4.lookAt(_lv, [c[0] - L[0] * e * 2, c[1] - L[1] * e * 2, c[2] - L[2] * e * 2], c, Math.abs(L[1]) > 0.99 ? [1, 0, 0] : [0, 1, 0]);
          mat4.ortho(_lp, -e, e, -e, e, 0.01, e * 4.5);
          mat4.multiply(_lvp, _lp, _lv);
          const cw = vec3.transformMat4(new Float64Array(3), c, _lvp), tx = cw[0] * 0.5 * size, ty = cw[1] * 0.5 * size;
          _lvp[12] += (Math.round(tx) - tx) / (0.5 * size);
          _lvp[13] += (Math.round(ty) - ty) / (0.5 * size);
          mat4.multiply(_sm, _bias, _lvp);
          const sctx = Object.assign({}, base, { vpF: Float32Array.from(_lvp) });
          gl.bindFramebuffer(gl.FRAMEBUFFER, S.fbo);
          gl.viewport(0, 0, size, size);
          gl.colorMask(false, false, false, false);
          gl.depthMask(true);
          this._st.depthWrite = true;
          gl.enable(gl.DEPTH_TEST);
          this._st.depthTest = true;
          gl.disable(gl.BLEND);
          this._st.blend = false;
          gl.enable(gl.CULL_FACE);
          this._st.cull = true;
          gl.enable(gl.POLYGON_OFFSET_FILL);
          gl.polygonOffset(2, 4);
          gl.clear(gl.DEPTH_BUFFER_BIT);
          this._pass++;
          const sphere = [c[0], c[1], c[2], e * 1.75];
          for (const m of lists.meshes) {
            if (!m.castShadow || m.material.transparent || m.material.alphaTest > 0 || m.geometry.mode !== "triangles") continue;
            m.updateWorldBounds();
            const cx = (m.wmin[0] + m.wmax[0]) / 2, cy = (m.wmin[1] + m.wmax[1]) / 2, cz = (m.wmin[2] + m.wmax[2]) / 2, r = Math.hypot(m.wmax[0] - m.wmin[0], m.wmax[1] - m.wmin[1], m.wmax[2] - m.wmin[2]) / 2;
            if (Math.hypot(cx - sphere[0], cy - sphere[1], cz - sphere[2]) > r + sphere[3]) continue;
            this._drawMesh(m, sctx, true);
          }
          for (const m of lists.instanced) {
            if (m.castShadow && !m.material.transparent && m.geometry.mode === "triangles") this._drawInstanced(m, sctx, true, sphere);
          }
          gl.disable(gl.POLYGON_OFFSET_FILL);
          gl.colorMask(true, true, true, true);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          Object.assign(base, { shadowOn: true, shadowMatF: Float32Array.from(_sm), shadowSize: size, shadowBias: sh.bias, normalBias: sh.normalBias });
        }
      }
      st.shadows = base.shadowOn;
      gl.viewport(0, 0, W, H);
      this._pass++;
      base.vpF = Float32Array.from(camera.viewProjection);
      const bg = scene.background;
      gl.clearColor(bg[0], bg[1], bg[2], 1);
      gl.depthMask(true);
      this._st.depthWrite = true;
      gl.enable(gl.DEPTH_TEST);
      this._st.depthTest = true;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const opaque = this._opaque, transp = this._transp;
      opaque.length = 0;
      transp.length = 0;
      for (const m of lists.meshes) {
        if (m.frustumCulled) {
          m.updateWorldBounds();
          if (!this.frustum.intersectsAABB(m.wmin, m.wmax)) {
            st.culledObjects++;
            continue;
          }
        }
        if (this.visibilityFilter && !this.visibilityFilter(m, camera)) {
          st.visibilityCulled++;
          continue;
        }
        st.visibleObjects++;
        (m.material.transparent ? transp : opaque).push(m);
      }
      for (const m of lists.instanced) {
        st.visibleObjects++;
        (m.material.transparent ? transp : opaque).push(m);
      }
      for (const o of transp) {
        const w = o._world;
        o._sortKey = Math.hypot(w[12] - cam[0], w[13] - cam[1], w[14] - cam[2]);
      }
      opaque.sort((a, b) => (a.renderOrder || 0) - (b.renderOrder || 0) || a.material.id - b.material.id || a.geometry.id - b.geometry.id);
      transp.sort((a, b) => (a.renderOrder || 0) - (b.renderOrder || 0) || b._sortKey - a._sortKey);
      for (const o of opaque) {
        this._renderState(o.material, false);
        o.type === "Mesh" ? this._drawMesh(o, base, false) : this._drawInstanced(o, base, false);
      }
      for (const o of transp) {
        this._renderState(o.material, true);
        o.type === "Mesh" ? this._drawMesh(o, base, false) : this._drawInstanced(o, base, false);
      }
      this._bindVAO(null);
      this._timerEnd();
      st.textureBytes = this._bytes.tex;
      st.gpuBytes = this._bytes.geo + this._bytes.tex + this._bytes.inst + this._bytes.shadow + W * H * 8;
      return true;
    }
    /** 現在のフレームバッファから RGBA を読む（描画直後の同一タスク内で呼ぶ）。 */
    readPixels(x = 0, y = 0, w = this.canvas.width, h = this.canvas.height) {
      const out = new Uint8Array(w * h * 4);
      this.gl.readPixels(x, y, w, h, this.gl.RGBA, this.gl.UNSIGNED_BYTE, out);
      return out;
    }
    get gpuBytesBreakdown() {
      return Object.assign({}, this._bytes);
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      const gl = this.gl;
      if (!gl.isContextLost()) {
        for (const r of Array.from(this._resources)) {
          if (r.positions) this._freeGeometry(r);
          else if (r.wrapS) this._freeTexture(r);
          else this._freeInstanced(r);
        }
        this._freeShadow();
        if (this._white) gl.deleteTexture(this._white);
        for (const p of this.programs.values()) gl.deleteProgram(p.program);
        if (this._timer) for (const q of this._timer.pending) gl.deleteQuery(q);
      } else for (const r of this._resources) if (r._gpu) r._gpu.delete(this);
      this._resources.clear();
      this.programs.clear();
    }
  };

  // src/physics.js
  var SHAPE_SPHERE = 0;
  var SHAPE_BOX = 1;
  var UniformGrid = class {
    constructor() {
      this.nx = 1;
      this.ny = 1;
      this.nz = 1;
      this.cell = 1;
      this.inv = 1;
      this.ox = 0;
      this.oy = 0;
      this.oz = 0;
      this.planar = false;
      this.total = 1;
      this.counts = new Int32Array(1);
      this.starts = new Int32Array(2);
      this.cursor = new Int32Array(1);
      this.items = new Int32Array(0);
      this.cellOf = new Int32Array(0);
      this.active = new Int32Array(1);
      this.activeCount = 0;
      this.itemCount = 0;
    }
    configure(ox, oy, oz, cell, nx, ny, nz, planar) {
      this.ox = ox;
      this.oy = oy;
      this.oz = oz;
      this.cell = cell;
      this.inv = 1 / cell;
      this.nx = nx;
      this.ny = planar ? 1 : ny;
      this.nz = nz;
      this.planar = planar;
      this.total = this.nx * this.ny * this.nz;
      this.counts = new Int32Array(this.total);
      this.starts = new Int32Array(this.total + 1);
      this.cursor = new Int32Array(this.total);
      this.active = new Int32Array(this.total);
      this.activeCount = 0;
      this.itemCount = 0;
    }
    ensure(n) {
      if (this.items.length < n) {
        this.items = new Int32Array(n);
        this.cellOf = new Int32Array(n);
      }
    }
    cellIndex(x, y, z) {
      let cx = Math.floor((x - this.ox) * this.inv), cz = Math.floor((z - this.oz) * this.inv), cy = 0;
      if (cx < 0) cx = 0;
      else if (cx >= this.nx) cx = this.nx - 1;
      if (cz < 0) cz = 0;
      else if (cz >= this.nz) cz = this.nz - 1;
      if (!this.planar) {
        cy = Math.floor((y - this.oy) * this.inv);
        if (cy < 0) cy = 0;
        else if (cy >= this.ny) cy = this.ny - 1;
      }
      return (cy * this.nz + cz) * this.nx + cx;
    }
    rebuild(list, n, pos) {
      this.ensure(n);
      const counts = this.counts, cellOf = this.cellOf;
      counts.fill(0);
      this.activeCount = 0;
      this.itemCount = n;
      for (let k = 0; k < n; k++) {
        const j = list[k] * 3, c = this.cellIndex(pos[j], pos[j + 1], pos[j + 2]);
        cellOf[k] = c;
        counts[c]++;
      }
      let off = 0;
      const total = this.total, starts = this.starts, cursor = this.cursor, active = this.active;
      for (let c = 0; c < total; c++) {
        starts[c] = off;
        cursor[c] = off;
        if (counts[c] > 0) active[this.activeCount++] = c;
        off += counts[c];
      }
      starts[total] = off;
      const items = this.items;
      for (let k = 0; k < n; k++) items[cursor[cellOf[k]]++] = list[k];
    }
    /** AABB と重なるセルに属する物体を out に書き出し個数を返す（候補。厳密判定は呼び出し側）。 */
    query(minx, miny, minz, maxx, maxy, maxz, out) {
      const inv = this.inv;
      let n = 0;
      let x0 = Math.floor((minx - this.ox) * inv), x1 = Math.floor((maxx - this.ox) * inv), z0 = Math.floor((minz - this.oz) * inv), z1 = Math.floor((maxz - this.oz) * inv);
      let y0 = 0, y1 = 0;
      if (!this.planar) {
        y0 = Math.floor((miny - this.oy) * inv);
        y1 = Math.floor((maxy - this.oy) * inv);
        y0 = Math.max(0, y0);
        y1 = Math.min(this.ny - 1, y1);
      }
      x0 = Math.max(0, x0);
      x1 = Math.min(this.nx - 1, x1);
      z0 = Math.max(0, z0);
      z1 = Math.min(this.nz - 1, z1);
      if (Math.floor((minx - this.ox) * inv) < 0) x0 = 0;
      if (Math.floor((maxx - this.ox) * inv) >= this.nx) x1 = this.nx - 1;
      if (Math.floor((minz - this.oz) * inv) < 0) z0 = 0;
      if (Math.floor((maxz - this.oz) * inv) >= this.nz) z1 = this.nz - 1;
      for (let cy = y0; cy <= y1; cy++) for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
        const c = (cy * this.nz + cz) * this.nx + cx, s = this.starts[c], e = s + this.counts[c];
        for (let p = s; p < e; p++) out[n++] = this.items[p];
      }
      return n;
    }
  };
  var DEFAULTS = {
    gravity: [0, -9.8, 0],
    bounds: { min: [-50, -50, -50], max: [50, 50, 50] },
    walls: true,
    fixedTimeStep: 1 / 60,
    maxSubSteps: 4,
    stepBudgetMs: 0,
    maxCandidatePairs: 2e7,
    cellSize: 0,
    maxReach: 1,
    planar: false,
    iterations: 1,
    maxCells: 2097152,
    restitution: 0.2,
    friction: 0,
    boundsRestitution: 0.3,
    positionCorrection: 0.78,
    slop: 1e-3,
    damping: 0,
    maxSpeed: 100,
    precomputeNeighbors: true,
    timeScale: 1,
    onContact: null,
    onWarning: null,
    interpolate: false
    // true: 描画用の位置を「前ステップ」と「現在」の間で補間する（固定刻みと描画フレームのずれによるカクつきを減らす）
  };
  var PhysicsWorld = class _PhysicsWorld {
    constructor(options = {}) {
      const o = this.options = Object.assign({}, DEFAULTS, options);
      o.gravity = Array.from(o.gravity);
      o.bounds = { min: Array.from(o.bounds.min), max: Array.from(o.bounds.max) };
      for (let k = 0; k < 3; k++) if (!(o.bounds.max[k] > o.bounds.min[k])) throw new RangeError("PhysicsWorld: bounds.max \u306F bounds.min \u3088\u308A\u5927\u304D\u3044\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002");
      if (!(o.fixedTimeStep > 0)) throw new RangeError("PhysicsWorld: fixedTimeStep \u306F\u6B63\u306E\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
      this.capacity = 0;
      this.count = 0;
      this.aliveCount = 0;
      this.pos = new Float32Array(0);
      this.vel = new Float32Array(0);
      this.ext = new Float32Array(0);
      this.invMass = new Float32Array(0);
      this.rest = new Float32Array(0);
      this.fric = new Float32Array(0);
      this.shape = new Uint8Array(0);
      this.alive = new Uint8Array(0);
      this.free = [];
      this.bodyNode = [];
      this.instanceBindings = [];
      this._ensure(256);
      this.paused = false;
      this.alpha = 0;
      this.stepCount = 0;
      this.prevPos = null;
      this._interp = null;
      this.acc = 0;
      this.time = 0;
      this.droppedTime = 0;
      this.truncatedSteps = 0;
      this.invalidBodies = 0;
      this._listsDirty = true;
      this._staticDirty = true;
      this._built = false;
      this.dynGrid = new UniformGrid();
      this.statGrid = new UniformGrid();
      this.dynAll = new Int32Array(0);
      this.nDynAll = 0;
      this.dynSmall = new Int32Array(0);
      this.nDynSmall = 0;
      this.statSmall = new Int32Array(0);
      this.nStatSmall = 0;
      this.ovDyn = new Int32Array(0);
      this.nOvDyn = 0;
      this.ovStat = new Int32Array(0);
      this.nOvStat = 0;
      this.cell = 0;
      this.reach = 1;
      this.maxSmallHalf = 0;
      this._fwd = new Int32Array(0);
      this._fwdStarts = null;
      this._fwdCells = null;
      this._scratch = new Int32Array(0);
      this._cand = 0;
      this._overlaps = 0;
      this._truncated = false;
      this._mode = 0;
      this._pairs = null;
      this.stats = { bodies: 0, staticBodies: 0, oversizeBodies: 0, substeps: 0, stepMs: 0, integrateMs: 0, gridMs: 0, collisionMs: 0, candidatePairs: 0, overlaps: 0, activeCells: 0, cells: 0, cellSize: 0, droppedTime: 0, truncated: false };
    }
    _ensure(n) {
      if (n <= this.capacity) return;
      const cap = Math.max(n, this.capacity * 2);
      const g32 = (old, k) => {
        const a2 = new Float32Array(cap * k);
        a2.set(old);
        return a2;
      };
      this.pos = g32(this.pos, 3);
      this.vel = g32(this.vel, 3);
      this.ext = g32(this.ext, 3);
      this.invMass = g32(this.invMass, 1);
      this.rest = g32(this.rest, 1);
      this.fric = g32(this.fric, 1);
      const s = new Uint8Array(cap);
      s.set(this.shape);
      this.shape = s;
      const a = new Uint8Array(cap);
      a.set(this.alive);
      this.alive = a;
      this.capacity = cap;
    }
    reserve(n) {
      this._ensure(n);
      return this;
    }
    setOptions(o) {
      const keys = Object.keys(o);
      for (const k of keys) {
        if (!(k in DEFAULTS)) throw new RangeError("PhysicsWorld.setOptions: \u672A\u77E5\u306E\u30AA\u30D7\u30B7\u30E7\u30F3 " + k);
        this.options[k] = k === "gravity" ? Array.from(o[k]) : k === "bounds" ? { min: Array.from(o[k].min), max: Array.from(o[k].max) } : o[k];
      }
      if ("cellSize" in o || "bounds" in o || "planar" in o || "maxReach" in o || "maxCells" in o || "precomputeNeighbors" in o) this._listsDirty = true;
      if ("bounds" in o) this._staticDirty = true;
      return this;
    }
    _warn(msg) {
      if (this.options.onWarning) this.options.onWarning(msg);
    }
    /** 物体を追加し、インデックス(ID)を返す。shape: 'sphere'(radius) | 'box'(halfExtents)。mass<=0 か static:true で静的。 */
    addBody(d = {}) {
      const shape = d.shape === "box" ? SHAPE_BOX : SHAPE_SPHERE;
      let hx, hy, hz;
      if (shape === SHAPE_SPHERE) {
        const r = d.radius === void 0 ? 0.5 : d.radius;
        if (!(r > 0) || !isFinite(r)) throw new RangeError("addBody: radius \u306F\u6B63\u306E\u6709\u9650\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
        hx = hy = hz = r;
      } else {
        const h = d.halfExtents || (d.size ? [d.size[0] / 2, d.size[1] / 2, d.size[2] / 2] : [0.5, 0.5, 0.5]);
        hx = h[0];
        hy = h[1];
        hz = h[2];
        if (!(hx > 0 && hy > 0 && hz > 0) || !isFinite(hx + hy + hz)) throw new RangeError("addBody: halfExtents/size \u306F\u6B63\u306E\u6709\u9650\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
      }
      const p = d.position || [0, 0, 0], v = d.velocity || [0, 0, 0];
      if (!isFinite(p[0] + p[1] + p[2] + v[0] + v[1] + v[2])) throw new RangeError("addBody: position/velocity \u306F\u6709\u9650\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
      let id;
      if (this.free.length) id = this.free.pop();
      else {
        id = this.count++;
        this._ensure(this.count);
      }
      const i3 = id * 3;
      this.pos[i3] = p[0];
      this.pos[i3 + 1] = p[1];
      this.pos[i3 + 2] = p[2];
      this.vel[i3] = v[0];
      this.vel[i3 + 1] = v[1];
      this.vel[i3 + 2] = v[2];
      this.ext[i3] = hx;
      this.ext[i3 + 1] = hy;
      this.ext[i3 + 2] = hz;
      this.shape[id] = shape;
      this.alive[id] = 1;
      let mass = d.mass;
      if (mass === void 0) mass = shape === SHAPE_SPHERE ? 4 / 3 * Math.PI * hx * hx * hx : 8 * hx * hy * hz;
      this.invMass[id] = d.static || !(mass > 0) || !isFinite(mass) ? 0 : 1 / mass;
      this.rest[id] = d.restitution === void 0 ? this.options.restitution : d.restitution;
      this.fric[id] = d.friction === void 0 ? this.options.friction : d.friction;
      this.bodyNode[id] = d.node || null;
      if (this.prevPos && this.prevPos.length >= (id + 1) * 3) {
        this.prevPos[i3] = p[0];
        this.prevPos[i3 + 1] = p[1];
        this.prevPos[i3 + 2] = p[2];
      }
      this.aliveCount++;
      this._listsDirty = true;
      if (this.invMass[id] === 0) this._staticDirty = true;
      return id;
    }
    removeBody(i) {
      this._check(i);
      if (this.invMass[i] === 0) this._staticDirty = true;
      this.alive[i] = 0;
      this.free.push(i);
      this.bodyNode[i] = null;
      this.aliveCount--;
      this._listsDirty = true;
    }
    _check(i) {
      if (!(i >= 0 && i < this.count) || !this.alive[i]) throw new RangeError("PhysicsWorld: \u7121\u52B9\u306A\u7269\u4F53ID " + i);
    }
    isAlive(i) {
      return i >= 0 && i < this.count && this.alive[i] === 1;
    }
    setPosition(i, x, y, z) {
      this._check(i);
      const j = i * 3;
      this.pos[j] = x;
      this.pos[j + 1] = y;
      this.pos[j + 2] = z;
      if (this.prevPos && this.prevPos.length > j + 2) {
        this.prevPos[j] = x;
        this.prevPos[j + 1] = y;
        this.prevPos[j + 2] = z;
      }
      if (this.invMass[i] === 0) this._staticDirty = true;
      return this;
    }
    setVelocity(i, x, y, z) {
      this._check(i);
      const j = i * 3;
      this.vel[j] = x;
      this.vel[j + 1] = y;
      this.vel[j + 2] = z;
      return this;
    }
    getPosition(i, out = [0, 0, 0]) {
      this._check(i);
      const j = i * 3;
      out[0] = this.pos[j];
      out[1] = this.pos[j + 1];
      out[2] = this.pos[j + 2];
      return out;
    }
    getVelocity(i, out = [0, 0, 0]) {
      this._check(i);
      const j = i * 3;
      out[0] = this.vel[j];
      out[1] = this.vel[j + 1];
      out[2] = this.vel[j + 2];
      return out;
    }
    /** mass<=0 または Infinity で静的化 */
    setMass(i, mass) {
      this._check(i);
      const was = this.invMass[i] === 0;
      this.invMass[i] = mass > 0 && isFinite(mass) ? 1 / mass : 0;
      if (was || this.invMass[i] === 0) this._staticDirty = true;
      this._listsDirty = true;
      return this;
    }
    applyImpulse(i, x, y, z) {
      this._check(i);
      const im = this.invMass[i], j = i * 3;
      this.vel[j] += x * im;
      this.vel[j + 1] += y * im;
      this.vel[j + 2] += z * im;
      return this;
    }
    clear() {
      this.count = 0;
      this.aliveCount = 0;
      this.free.length = 0;
      this.bodyNode.length = 0;
      this.instanceBindings.length = 0;
      this.alive.fill(0);
      this.acc = 0;
      this._listsDirty = true;
      this._staticDirty = true;
      return this;
    }
    /* ---- 描画オブジェクトとの同期 ---- */
    bindNode(i, node) {
      this._check(i);
      this.bodyNode[i] = node;
      return this;
    }
    /** 物体 firstBody..+count-1 を InstancedMesh のインスタンス instanceStart.. に対応づける。 */
    bindInstanced(mesh, firstBody, count, instanceStart = 0) {
      this.instanceBindings.push({ mesh, firstBody, count, instanceStart });
      return this;
    }
    unbindInstanced(mesh) {
      this.instanceBindings = this.instanceBindings.filter((b) => b.mesh !== mesh);
    }
    /** 描画に使う位置配列。interpolate 有効時は前ステップと現在の間を alpha で補間した値（物理の状態そのものは変えない）。 */
    _renderPos() {
      if (!this.options.interpolate || !this.prevPos || !(this.alpha > 0)) return this.pos;
      const n = this.count * 3;
      if (!this._interp || this._interp.length < n) this._interp = new Float32Array(Math.max(n, this.pos.length));
      const a = this.alpha, p = this.pos, q = this.prevPos, o = this._interp;
      for (let k = 0; k < n; k++) o[k] = q[k] + (p[k] - q[k]) * a;
      return o;
    }
    syncTransforms() {
      const pos = this._renderPos();
      for (let i = 0; i < this.count; i++) {
        const n = this.bodyNode[i];
        if (n && this.alive[i]) {
          const j = i * 3;
          if (n.position[0] !== pos[j] || n.position[1] !== pos[j + 1] || n.position[2] !== pos[j + 2]) {
            n.position[0] = pos[j];
            n.position[1] = pos[j + 1];
            n.position[2] = pos[j + 2];
            n.markDirty();
          }
        }
      }
      for (const b of this.instanceBindings) {
        const m = b.mesh.matrices, n = Math.min(b.count, b.mesh.count - b.instanceStart);
        for (let k = 0; k < n; k++) {
          const j = (b.firstBody + k) * 3, o = (b.instanceStart + k) * 16;
          m[o + 12] = pos[j];
          m[o + 13] = pos[j + 1];
          m[o + 14] = pos[j + 2];
        }
        if (n > 0) b.mesh.markInstancesDirty(b.instanceStart, b.instanceStart + n);
      }
    }
    /* ---- ブロードフェーズの準備 ---- */
    _maxHalf(i) {
      const j = i * 3;
      return Math.max(this.ext[j], this.ext[j + 1], this.ext[j + 2]);
    }
    _rebuildLists() {
      const o = this.options, n = this.count, halves = [];
      for (let i = 0; i < n; i++) if (this.alive[i]) halves.push(this._maxHalf(i));
      let cell = o.cellSize;
      if (!(cell > 0)) {
        if (halves.length) {
          halves.sort((a, b2) => a - b2);
          cell = 2.2 * halves[Math.min(halves.length - 1, Math.floor(halves.length * 0.9))];
        } else cell = 1;
      }
      const b = o.bounds, size = [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
      const dims = (c) => [Math.max(1, Math.ceil(size[0] / c)), o.planar ? 1 : Math.max(1, Math.ceil(size[1] / c)), Math.max(1, Math.ceil(size[2] / c))];
      let d = dims(cell);
      while (d[0] * d[1] * d[2] > o.maxCells) {
        cell *= 1.25;
        d = dims(cell);
        this._warn("\u30BB\u30EB\u6570\u304C maxCells \u3092\u8D85\u3048\u308B\u305F\u3081\u30BB\u30EB\u5E45\u3092 " + cell.toFixed(3) + " \u306B\u62E1\u5927\u3057\u307E\u3057\u305F\u3002");
      }
      const smallLimit = cell * Math.max(1, o.maxReach) / 2;
      if (this.dynAll.length < n) {
        this.dynAll = new Int32Array(this.capacity);
        this.dynSmall = new Int32Array(this.capacity);
        this.statSmall = new Int32Array(this.capacity);
        this.ovDyn = new Int32Array(this.capacity);
        this.ovStat = new Int32Array(this.capacity);
        this._scratch = new Int32Array(this.capacity);
      }
      let nA = 0, nD = 0, nS = 0, nOD = 0, nOS = 0, maxSmall = 0;
      for (let i = 0; i < n; i++) {
        if (!this.alive[i]) continue;
        const h = this._maxHalf(i), st = this.invMass[i] === 0;
        if (!st) this.dynAll[nA++] = i;
        if (h <= smallLimit) {
          if (h > maxSmall) maxSmall = h;
          if (st) this.statSmall[nS++] = i;
          else this.dynSmall[nD++] = i;
        } else if (st) this.ovStat[nOS++] = i;
        else this.ovDyn[nOD++] = i;
      }
      if (nOD + nOS > 256 && !this._warnedOversize) {
        this._warnedOversize = true;
        this._warn("\u30BB\u30EB\u5E45(" + cell.toFixed(3) + ")\u306B\u5BFE\u3057\u3066\u5927\u304D\u3059\u304E\u308B\u7269\u4F53\u304C " + (nOD + nOS) + " \u500B\u3042\u308A\u3001\u3053\u308C\u3089\u306F\u7DCF\u5F53\u305F\u308A(O(k\xB2))\u3067\u51E6\u7406\u3055\u308C\u307E\u3059\u3002cellSize \u3092\u7269\u4F53\u76F4\u5F84\u4EE5\u4E0A\uFF08\u76EE\u5B89: \u534A\u5F84\u306E2.2\u500D\u4EE5\u4E0A\uFF09\u306B\u3059\u308B\u304B\u3001maxReach \u3092\u4E0A\u3052\u3066\u304F\u3060\u3055\u3044\u3002");
      }
      this.nDynAll = nA;
      this.nDynSmall = nD;
      this.nStatSmall = nS;
      this.nOvDyn = nOD;
      this.nOvStat = nOS;
      this.maxSmallHalf = maxSmall;
      this.reach = Math.max(1, Math.ceil(2 * maxSmall / cell - 1e-9));
      const gridChanged = cell !== this.cell || this.dynGrid.nx !== d[0] || this.dynGrid.nz !== d[2] || this.dynGrid.planar !== o.planar || this.dynGrid.ny !== (o.planar ? 1 : d[1]) || this.dynGrid.ox !== b.min[0];
      this.cell = cell;
      if (gridChanged) {
        this.dynGrid.configure(b.min[0], b.min[1], b.min[2], cell, d[0], d[1], d[2], o.planar);
        this.statGrid.configure(b.min[0], b.min[1], b.min[2], cell, d[0], d[1], d[2], o.planar);
        this._staticDirty = true;
        this._buildNeighbors();
      }
      this._rebuildFwdOffsets();
      this._listsDirty = false;
      this._built = true;
    }
    _rebuildFwdOffsets() {
      const R = this.reach, planar = this.options.planar, list = [];
      for (let dy = planar ? 0 : -R; dy <= (planar ? 0 : R); dy++) for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
        if (dy > 0 || dy === 0 && (dz > 0 || dz === 0 && dx > 0)) list.push(dx, dy, dz);
      }
      this._fwd = Int32Array.from(list);
      if (this._fwdReach !== R) {
        this._fwdReach = R;
        this._buildNeighbors();
      }
    }
    /** 事前計算した隣接セル表（試作で有効だった方式）。大きすぎる場合は作らず都度計算する。 */
    _buildNeighbors() {
      this._fwdStarts = null;
      this._fwdCells = null;
      if (!this.options.precomputeNeighbors || !this._fwd.length) return;
      const g = this.dynGrid, per = this._fwd.length / 3;
      if (g.total * per > 4e6) return;
      const nx = g.nx, ny = g.ny, nz = g.nz, fwd = this._fwd, starts = new Int32Array(g.total + 1);
      let cnt = 0;
      for (let pass = 0; pass < 2; pass++) {
        const cells = pass ? new Int32Array(cnt) : null;
        let c = 0, w = 0;
        for (let cy = 0; cy < ny; cy++) for (let cz = 0; cz < nz; cz++) for (let cx = 0; cx < nx; cx++, c++) {
          if (pass === 0) starts[c] = cnt;
          for (let k = 0; k < fwd.length; k += 3) {
            const x = cx + fwd[k], y = cy + fwd[k + 1], z = cz + fwd[k + 2];
            if (x < 0 || x >= nx || y < 0 || y >= ny || z < 0 || z >= nz) continue;
            if (pass) cells[w++] = (y * nz + z) * nx + x;
            else cnt++;
          }
        }
        if (pass === 0) starts[g.total] = cnt;
        else {
          this._fwdCells = cells;
          this._fwdStarts = starts;
        }
      }
    }
    /** グリッドを現在位置で構築する（積分は行わない）。テスト・デバッグ用に公開。 */
    prepareBroadphase() {
      if (this._listsDirty || !this._built) this._rebuildLists();
      if (this._staticDirty) {
        this.statGrid.rebuild(this.statSmall, this.nStatSmall, this.pos);
        this._staticDirty = false;
      }
      this.dynGrid.rebuild(this.dynSmall, this.nDynSmall, this.pos);
    }
    /* ---- ペア列挙 (fn(i,j) を候補ごとに呼ぶ) ---- */
    _enumerate(fn) {
      const dg = this.dynGrid, sg = this.statGrid, counts = dg.counts, starts = dg.starts, items = dg.items, budget = this.options.maxCandidatePairs;
      let checks = 0;
      const fwdS = this._fwdStarts, fwdC = this._fwdCells, fwd = this._fwd, nx = dg.nx, ny = dg.ny, nz = dg.nz, R = this.reach, planar = dg.planar;
      for (let ai = 0; ai < dg.activeCount; ai++) {
        const cell = dg.active[ai], s = starts[cell], e = s + counts[cell];
        for (let p = s; p < e; p++) {
          const i = items[p];
          for (let q = p + 1; q < e; q++) {
            checks++;
            fn(i, items[q]);
          }
        }
        if (fwdS) {
          for (let ni = fwdS[cell], ne = fwdS[cell + 1]; ni < ne; ni++) {
            const other = fwdC[ni], os = starts[other], oe = os + counts[other];
            if (os === oe) continue;
            for (let p = s; p < e; p++) {
              const i = items[p];
              for (let q = os; q < oe; q++) {
                checks++;
                fn(i, items[q]);
              }
            }
          }
        } else {
          const cx = cell % nx, t = cell / nx | 0, cz = t % nz, cy = t / nz | 0;
          for (let k = 0; k < fwd.length; k += 3) {
            const x = cx + fwd[k], y = cy + fwd[k + 1], z = cz + fwd[k + 2];
            if (x < 0 || x >= nx || y < 0 || y >= ny || z < 0 || z >= nz) continue;
            const other = (y * nz + z) * nx + x, os = starts[other], oe = os + counts[other];
            if (os === oe) continue;
            for (let p = s; p < e; p++) {
              const i = items[p];
              for (let q = os; q < oe; q++) {
                checks++;
                fn(i, items[q]);
              }
            }
          }
        }
        if (checks > budget) {
          this._truncated = true;
          this._cand = checks;
          return;
        }
      }
      if (sg.itemCount > 0) {
        const sc = sg.counts, ss = sg.starts, si = sg.items;
        for (let ai = 0; ai < dg.activeCount; ai++) {
          const cell = dg.active[ai], s = starts[cell], e = s + counts[cell];
          const cx = cell % nx, t = cell / nx | 0, cz = t % nz, cy = t / nz | 0;
          for (let dy = planar ? 0 : -R; dy <= (planar ? 0 : R); dy++) for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
            const x = cx + dx, y = cy + dy, z = cz + dz;
            if (x < 0 || x >= nx || y < 0 || y >= ny || z < 0 || z >= nz) continue;
            const other = (y * nz + z) * nx + x, os = ss[other], oe = os + sc[other];
            if (os === oe) continue;
            for (let p = s; p < e; p++) {
              const i = items[p];
              for (let q = os; q < oe; q++) {
                checks++;
                fn(i, si[q]);
              }
            }
          }
          if (checks > budget) {
            this._truncated = true;
            this._cand = checks;
            return;
          }
        }
      }
      const pos = this.pos, ext = this.ext, scratch = this._scratch, m = this.maxSmallHalf;
      for (let a = 0; a < this.nOvDyn; a++) {
        const i = this.ovDyn[a], j = i * 3;
        const x0 = pos[j] - ext[j] - m, y0 = pos[j + 1] - ext[j + 1] - m, z0 = pos[j + 2] - ext[j + 2] - m, x1 = pos[j] + ext[j] + m, y1 = pos[j + 1] + ext[j + 1] + m, z1 = pos[j + 2] + ext[j + 2] + m;
        let n = dg.query(x0, y0, z0, x1, y1, z1, scratch);
        for (let k = 0; k < n; k++) {
          checks++;
          fn(i, scratch[k]);
        }
        n = sg.query(x0, y0, z0, x1, y1, z1, scratch);
        for (let k = 0; k < n; k++) {
          checks++;
          fn(i, scratch[k]);
        }
        for (let b = a + 1; b < this.nOvDyn; b++) {
          checks++;
          fn(i, this.ovDyn[b]);
        }
        for (let b = 0; b < this.nOvStat; b++) {
          checks++;
          fn(i, this.ovStat[b]);
        }
        if (checks > budget) {
          this._truncated = true;
          this._cand = checks;
          return;
        }
      }
      for (let a = 0; a < this.nOvStat; a++) {
        const i = this.ovStat[a], j = i * 3;
        const n = dg.query(pos[j] - ext[j] - m, pos[j + 1] - ext[j + 1] - m, pos[j + 2] - ext[j + 2] - m, pos[j] + ext[j] + m, pos[j + 1] + ext[j + 1] + m, pos[j + 2] + ext[j + 2] + m, scratch);
        for (let k = 0; k < n; k++) {
          checks++;
          fn(i, scratch[k]);
        }
      }
      this._cand = checks;
    }
    /** テスト用: 現在位置での候補ペア (i<j 正規化) を配列で返す。重複や漏れの検証に使う。 */
    computeCandidatePairs() {
      this.prepareBroadphase();
      const out = [];
      this._truncated = false;
      this._enumerate((i, j) => out.push(i < j ? [i, j] : [j, i]));
      return out;
    }
    /** テスト用: 総当たりで本当に重なっている組 (少なくとも一方が動的)。 */
    bruteForceOverlaps() {
      const out = [];
      for (let i = 0; i < this.count; i++) {
        if (!this.alive[i]) continue;
        for (let j = i + 1; j < this.count; j++) {
          if (!this.alive[j]) continue;
          if (this.invMass[i] === 0 && this.invMass[j] === 0) continue;
          if (this._contact(i, j)) out.push([i, j]);
        }
      }
      return out;
    }
    /* ---- 狭域判定と応答 ---- */
    _contact(i, j) {
      const p = this.pos, e = this.ext, a = i * 3, b = j * 3, si = this.shape[i], sj = this.shape[j];
      if (si === SHAPE_SPHERE && sj === SHAPE_SPHERE) {
        const dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2], r2 = e[a] + e[b], d22 = dx * dx + dy * dy + dz * dz;
        if (d22 >= r2 * r2) return false;
        const d = Math.sqrt(d22);
        if (d < 1e-7) {
          const ang = (i * 2.399963229728653 + j * 0.017) % (Math.PI * 2);
          this._nx = Math.cos(ang);
          this._ny = 0;
          this._nz = Math.sin(ang);
          this._pen = r2;
        } else {
          this._nx = dx / d;
          this._ny = dy / d;
          this._nz = dz / d;
          this._pen = r2 - d;
        }
        return true;
      }
      if (si === SHAPE_BOX && sj === SHAPE_BOX) {
        const dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2];
        const ox = e[a] + e[b] - Math.abs(dx), oy = e[a + 1] + e[b + 1] - Math.abs(dy), oz = e[a + 2] + e[b + 2] - Math.abs(dz);
        if (ox <= 0 || oy <= 0 || oz <= 0) return false;
        this._nx = 0;
        this._ny = 0;
        this._nz = 0;
        if (ox <= oy && ox <= oz) {
          this._nx = dx < 0 ? -1 : 1;
          this._pen = ox;
        } else if (oy <= oz) {
          this._ny = dy < 0 ? -1 : 1;
          this._pen = oy;
        } else {
          this._nz = dz < 0 ? -1 : 1;
          this._pen = oz;
        }
        return true;
      }
      const sph = si === SHAPE_SPHERE ? a : b, box = si === SHAPE_SPHERE ? b : a, r = e[sph];
      const cx = p[sph], cy = p[sph + 1], cz = p[sph + 2];
      const qx = Math.max(p[box] - e[box], Math.min(cx, p[box] + e[box])), qy = Math.max(p[box + 1] - e[box + 1], Math.min(cy, p[box + 1] + e[box + 1])), qz = Math.max(p[box + 2] - e[box + 2], Math.min(cz, p[box + 2] + e[box + 2]));
      let vx = cx - qx, vy = cy - qy, vz = cz - qz;
      const d2 = vx * vx + vy * vy + vz * vz;
      let nx, ny, nz, pen;
      if (d2 > 0) {
        if (d2 >= r * r) return false;
        const d = Math.sqrt(d2);
        nx = vx / d;
        ny = vy / d;
        nz = vz / d;
        pen = r - d;
      } else {
        const dx = cx - p[box], dy = cy - p[box + 1], dz = cz - p[box + 2];
        const fx = e[box] - Math.abs(dx), fy = e[box + 1] - Math.abs(dy), fz = e[box + 2] - Math.abs(dz);
        nx = ny = nz = 0;
        if (fx <= fy && fx <= fz) {
          nx = dx < 0 ? -1 : 1;
          pen = r + fx;
        } else if (fy <= fz) {
          ny = dy < 0 ? -1 : 1;
          pen = r + fy;
        } else {
          nz = dz < 0 ? -1 : 1;
          pen = r + fz;
        }
      }
      if (si === SHAPE_SPHERE) {
        this._nx = -nx;
        this._ny = -ny;
        this._nz = -nz;
      } else {
        this._nx = nx;
        this._ny = ny;
        this._nz = nz;
      }
      this._pen = pen;
      return true;
    }
    _resolve(i, j) {
      if (!this._contact(i, j)) return;
      this._overlaps++;
      const o = this.options, nx = this._nx, ny = this._ny, nz = this._nz, pen = this._pen;
      const im = this.invMass, imi = im[i], imj = im[j], invSum = imi + imj;
      if (invSum === 0) return;
      const pos = this.pos, vel = this.vel, a = i * 3, b = j * 3;
      const corr = Math.max(0, pen - o.slop) * o.positionCorrection / invSum;
      if (imi > 0) {
        pos[a] -= nx * corr * imi;
        pos[a + 1] -= ny * corr * imi;
        pos[a + 2] -= nz * corr * imi;
      }
      if (imj > 0) {
        pos[b] += nx * corr * imj;
        pos[b + 1] += ny * corr * imj;
        pos[b + 2] += nz * corr * imj;
      }
      const rvx = vel[b] - vel[a], rvy = vel[b + 1] - vel[a + 1], rvz = vel[b + 2] - vel[a + 2], vn = rvx * nx + rvy * ny + rvz * nz;
      let jn = 0;
      if (vn < 0) {
        const e = Math.min(this.rest[i], this.rest[j]);
        jn = -(1 + e) * vn / invSum;
        vel[a] -= jn * imi * nx;
        vel[a + 1] -= jn * imi * ny;
        vel[a + 2] -= jn * imi * nz;
        vel[b] += jn * imj * nx;
        vel[b + 1] += jn * imj * ny;
        vel[b + 2] += jn * imj * nz;
        const mu = Math.sqrt(this.fric[i] * this.fric[j]);
        if (mu > 0) {
          const wx = vel[b] - vel[a], wy = vel[b + 1] - vel[a + 1], wz = vel[b + 2] - vel[a + 2], wn = wx * nx + wy * ny + wz * nz;
          const tx = wx - wn * nx, ty = wy - wn * ny, tz = wz - wn * nz, tl = Math.sqrt(tx * tx + ty * ty + tz * tz);
          if (tl > 1e-6) {
            const jt = Math.min(tl / invSum, mu * jn), ux = tx / tl, uy = ty / tl, uz = tz / tl;
            vel[a] += jt * imi * ux;
            vel[a + 1] += jt * imi * uy;
            vel[a + 2] += jt * imi * uz;
            vel[b] -= jt * imj * ux;
            vel[b + 1] -= jt * imj * uy;
            vel[b + 2] -= jt * imj * uz;
          }
        }
      }
      if (o.onContact) o.onContact(i, j, nx, ny, nz, pen);
    }
    /** 1ステップ(固定dt)を進める。通常は advance() を使う。 */
    step(dt) {
      const t0 = now(), o = this.options, pos = this.pos, vel = this.vel, ext = this.ext;
      if (o.interpolate) {
        if (!this.prevPos || this.prevPos.length < pos.length) this.prevPos = new Float32Array(pos.length);
        this.prevPos.set(pos);
      }
      if (this._listsDirty || !this._built) this._rebuildLists();
      const g = o.gravity, gx = g[0] * dt, gy = g[1] * dt, gz = g[2] * dt, damp = o.damping > 0 ? Math.exp(-o.damping * dt) : 1, maxS2 = o.maxSpeed * o.maxSpeed;
      const bmin = o.bounds.min, bmax = o.bounds.max, walls = o.walls, br = o.boundsRestitution;
      let invalid = 0;
      for (let k = 0; k < this.nDynAll; k++) {
        const i = this.dynAll[k], j = i * 3;
        let vx = (vel[j] + gx) * damp, vy = (vel[j + 1] + gy) * damp, vz = (vel[j + 2] + gz) * damp;
        const s2 = vx * vx + vy * vy + vz * vz;
        if (s2 > maxS2) {
          const f = o.maxSpeed / Math.sqrt(s2);
          vx *= f;
          vy *= f;
          vz *= f;
        }
        let x = pos[j] + vx * dt, y = pos[j + 1] + vy * dt, z = pos[j + 2] + vz * dt;
        if (!isFinite(x + y + z + vx + vy + vz)) {
          this.alive[i] = 0;
          this.free.push(i);
          this.aliveCount--;
          invalid++;
          continue;
        }
        if (walls) {
          let lo = bmin[0] + ext[j], hi = bmax[0] - ext[j];
          if (x < lo) {
            x = lo;
            if (vx < 0) vx = -vx * br;
          } else if (x > hi) {
            x = hi;
            if (vx > 0) vx = -vx * br;
          }
          lo = bmin[1] + ext[j + 1];
          hi = bmax[1] - ext[j + 1];
          if (y < lo) {
            y = lo;
            if (vy < 0) vy = -vy * br;
          } else if (y > hi) {
            y = hi;
            if (vy > 0) vy = -vy * br;
          }
          lo = bmin[2] + ext[j + 2];
          hi = bmax[2] - ext[j + 2];
          if (z < lo) {
            z = lo;
            if (vz < 0) vz = -vz * br;
          } else if (z > hi) {
            z = hi;
            if (vz > 0) vz = -vz * br;
          }
        }
        vel[j] = vx;
        vel[j + 1] = vy;
        vel[j + 2] = vz;
        pos[j] = x;
        pos[j + 1] = y;
        pos[j + 2] = z;
      }
      if (invalid) {
        this.invalidBodies += invalid;
        this._listsDirty = true;
        this._warn("\u975E\u6709\u9650\u5024\u306B\u306A\u3063\u305F\u7269\u4F53\u3092 " + invalid + " \u500B\u7121\u52B9\u5316\u3057\u307E\u3057\u305F\u3002");
        this._rebuildLists();
      }
      const t1 = now();
      if (this._staticDirty) {
        this.statGrid.rebuild(this.statSmall, this.nStatSmall, pos);
        this._staticDirty = false;
      }
      this.dynGrid.rebuild(this.dynSmall, this.nDynSmall, pos);
      const t2 = now();
      this._overlaps = 0;
      this._truncated = false;
      this._cand = 0;
      const resolve = this._resolveBound || (this._resolveBound = (i, j) => this._resolve(i, j));
      let cand = 0;
      for (let it = 0; it < Math.max(1, o.iterations); it++) {
        this._enumerate(resolve);
        cand = this._cand;
        if (this._truncated) break;
      }
      if (walls) {
        for (let k = 0; k < this.nDynAll; k++) {
          const i = this.dynAll[k];
          if (!this.alive[i]) continue;
          const j = i * 3;
          for (let a = 0; a < 3; a++) {
            const lo = bmin[a] + ext[j + a], hi = bmax[a] - ext[j + a];
            if (pos[j + a] < lo) pos[j + a] = lo;
            else if (pos[j + a] > hi) pos[j + a] = hi;
          }
        }
      }
      const t3 = now();
      if (this._truncated) {
        this.truncatedSteps++;
        this._warn("\u5019\u88DC\u30DA\u30A2\u6570\u304C maxCandidatePairs=" + o.maxCandidatePairs + " \u3092\u8D85\u3048\u305F\u305F\u3081\u3001\u3053\u306E\u30B9\u30C6\u30C3\u30D7\u306E\u885D\u7A81\u51E6\u7406\u3092\u6253\u3061\u5207\u308A\u307E\u3057\u305F\u3002");
      }
      const s = this.stats;
      s.integrateMs += t1 - t0;
      s.gridMs += t2 - t1;
      s.collisionMs += t3 - t2;
      s.stepMs += t3 - t0;
      s.candidatePairs = cand;
      s.overlaps = this._overlaps;
      s.activeCells = this.dynGrid.activeCount;
      s.truncated = this._truncated;
      this.time += dt;
      this.stepCount++;
      return s;
    }
    /** 実時間 dt (秒) を固定刻みに分割して進める。substep 数・時間予算で上限をかけ、超過分は破棄する。 */
    advance(dt) {
      const o = this.options, s = this.stats;
      s.integrateMs = 0;
      s.gridMs = 0;
      s.collisionMs = 0;
      s.stepMs = 0;
      s.substeps = 0;
      if (this.paused || !(dt > 0) || !isFinite(dt)) {
        this._fillStats();
        return 0;
      }
      this.acc += dt * o.timeScale;
      const fixed = o.fixedTimeStep, start = now();
      let steps = 0;
      while (this.acc >= fixed && steps < o.maxSubSteps) {
        this.step(fixed);
        this.acc -= fixed;
        steps++;
        if (o.stepBudgetMs > 0 && now() - start > o.stepBudgetMs) break;
      }
      if (this.acc >= fixed) {
        this.droppedTime += this.acc;
        this.acc = 0;
      }
      s.substeps = steps;
      this.alpha = this.acc / fixed;
      this._fillStats();
      return steps;
    }
    _fillStats() {
      const s = this.stats;
      s.bodies = this.aliveCount;
      s.oversizeBodies = this.nOvDyn + this.nOvStat;
      s.staticBodies = this.nStatSmall + this.nOvStat;
      s.cells = this.dynGrid.total;
      s.cellSize = this.cell;
      s.droppedTime = this.droppedTime;
    }
    /** 一時停止/再開。停止中は advance() が何も進めない（step() の直接呼び出しは可能）。 */
    pause() {
      this.paused = true;
      return this;
    }
    resume() {
      this.paused = false;
      return this;
    }
    /** 状態の指紋（位置・速度・生死のハッシュ, FNV-1a 32bit）。同じ初期条件と操作から同じ結果になるかの検証・リプレイ照合用。 */
    stateHash() {
      let h = 2166136261;
      const n = this.count;
      const feed = (u8) => {
        for (let k = 0; k < u8.length; k++) {
          h ^= u8[k];
          h = Math.imul(h, 16777619);
        }
      };
      feed(new Uint8Array(this.pos.buffer, this.pos.byteOffset, n * 12));
      feed(new Uint8Array(this.vel.buffer, this.vel.byteOffset, n * 12));
      feed(this.alive.subarray(0, n));
      return (h >>> 0).toString(16).padStart(8, "0");
    }
    /** O(N) のレイキャスト。最も近い物体 {index, distance, point, normal} を返す。 */
    raycast(origin, dir, maxDistance = Infinity) {
      const l = Math.hypot(dir[0], dir[1], dir[2]) || 1, d = [dir[0] / l, dir[1] / l, dir[2] / l];
      let best = null;
      for (let i = 0; i < this.count; i++) {
        if (!this.alive[i]) continue;
        const j = i * 3;
        let t = -1, n = null;
        if (this.shape[i] === SHAPE_SPHERE) {
          const ox = origin[0] - this.pos[j], oy = origin[1] - this.pos[j + 1], oz = origin[2] - this.pos[j + 2], r = this.ext[j];
          const b = ox * d[0] + oy * d[1] + oz * d[2], c = ox * ox + oy * oy + oz * oz - r * r, disc = b * b - c;
          if (disc >= 0) {
            const s = Math.sqrt(disc);
            t = -b - s;
            if (t < 0) t = -b + s;
            if (t >= 0) n = [(ox + d[0] * t) / r, (oy + d[1] * t) / r, (oz + d[2] * t) / r];
            else t = -1;
          }
        } else {
          let t0 = 0, t1 = Infinity, ax = -1, sg = 0;
          for (let k = 0; k < 3; k++) {
            const lo = this.pos[j + k] - this.ext[j + k], hi = this.pos[j + k] + this.ext[j + k];
            if (Math.abs(d[k]) < 1e-14) {
              if (origin[k] < lo || origin[k] > hi) {
                t1 = -1;
                break;
              }
              continue;
            }
            let a = (lo - origin[k]) / d[k], b = (hi - origin[k]) / d[k], s = -1;
            if (a > b) {
              const x = a;
              a = b;
              b = x;
              s = 1;
            }
            if (a > t0) {
              t0 = a;
              ax = k;
              sg = s;
            }
            if (b < t1) t1 = b;
            if (t0 > t1) {
              t1 = -1;
              break;
            }
          }
          if (t1 >= 0 && t0 <= t1) {
            t = t0;
            n = [0, 0, 0];
            if (ax >= 0) n[ax] = sg;
          }
        }
        if (t >= 0 && t <= maxDistance && (!best || t < best.distance)) best = { index: i, distance: t, point: [origin[0] + d[0] * t, origin[1] + d[1] * t, origin[2] + d[2] * t], normal: n };
      }
      return best;
    }
    toJSON() {
      const n = this.count;
      return {
        format: "massive-engine-physics",
        version: 1,
        options: Object.assign({}, this.options, { onContact: void 0, onWarning: void 0 }),
        count: n,
        pos: f32ToBase64(this.pos.subarray(0, n * 3)),
        vel: f32ToBase64(this.vel.subarray(0, n * 3)),
        ext: f32ToBase64(this.ext.subarray(0, n * 3)),
        invMass: f32ToBase64(this.invMass.subarray(0, n)),
        rest: f32ToBase64(this.rest.subarray(0, n)),
        fric: f32ToBase64(this.fric.subarray(0, n)),
        shape: Array.from(this.shape.subarray(0, n)),
        alive: Array.from(this.alive.subarray(0, n))
      };
    }
    static fromJSON(j) {
      if (!j || j.format !== "massive-engine-physics") throw new MassiveEngineError("\u7269\u7406JSON\u306E\u5F62\u5F0F\u304C\u4E0D\u6B63\u3067\u3059\u3002", "E_SCENE_FORMAT");
      if (j.version !== 1) throw new MassiveEngineError("\u672A\u5BFE\u5FDC\u306E\u7269\u7406JSON\u30D0\u30FC\u30B8\u30E7\u30F3: " + j.version, "E_SCENE_FORMAT");
      const w = new _PhysicsWorld(j.options), n = j.count;
      w._ensure(n);
      w.count = n;
      w.pos.set(base64ToF32(j.pos));
      w.vel.set(base64ToF32(j.vel));
      w.ext.set(base64ToF32(j.ext));
      w.invMass.set(base64ToF32(j.invMass));
      w.rest.set(base64ToF32(j.rest));
      w.fric.set(base64ToF32(j.fric));
      w.shape.set(j.shape);
      w.alive.set(j.alive);
      w.aliveCount = 0;
      for (let i = 0; i < n; i++) {
        if (w.alive[i]) w.aliveCount++;
        else w.free.push(i);
      }
      return w;
    }
  };

  // src/generated/worker-source.js
  var worker_source_default = '(()=>{var N=()=>typeof performance<"u"&&performance.now?performance.now():Date.now();var L=class extends Error{constructor(t,i,s){super(t),this.name="MassiveEngineError",this.code=i||"E_ENGINE",s&&(this.cause=s)}};function j(B){let t=new Uint8Array(B.buffer,B.byteOffset,B.byteLength),i="",s=32768;for(let e=0;e<t.length;e+=s)i+=String.fromCharCode.apply(null,t.subarray(e,e+s));return btoa(i)}function tt(B){let t=atob(B),i=new Uint8Array(t.length);for(let s=0;s<t.length;s++)i[s]=t.charCodeAt(s);return i}var q=B=>new Float32Array(tt(B).buffer);var R=0,U=1,W=class{constructor(){this.nx=1,this.ny=1,this.nz=1,this.cell=1,this.inv=1,this.ox=0,this.oy=0,this.oz=0,this.planar=!1,this.total=1,this.counts=new Int32Array(1),this.starts=new Int32Array(2),this.cursor=new Int32Array(1),this.items=new Int32Array(0),this.cellOf=new Int32Array(0),this.active=new Int32Array(1),this.activeCount=0,this.itemCount=0}configure(t,i,s,e,n,r,c,h){this.ox=t,this.oy=i,this.oz=s,this.cell=e,this.inv=1/e,this.nx=n,this.ny=h?1:r,this.nz=c,this.planar=h,this.total=this.nx*this.ny*this.nz,this.counts=new Int32Array(this.total),this.starts=new Int32Array(this.total+1),this.cursor=new Int32Array(this.total),this.active=new Int32Array(this.total),this.activeCount=0,this.itemCount=0}ensure(t){this.items.length<t&&(this.items=new Int32Array(t),this.cellOf=new Int32Array(t))}cellIndex(t,i,s){let e=Math.floor((t-this.ox)*this.inv),n=Math.floor((s-this.oz)*this.inv),r=0;return e<0?e=0:e>=this.nx&&(e=this.nx-1),n<0?n=0:n>=this.nz&&(n=this.nz-1),this.planar||(r=Math.floor((i-this.oy)*this.inv),r<0?r=0:r>=this.ny&&(r=this.ny-1)),(r*this.nz+n)*this.nx+e}rebuild(t,i,s){this.ensure(i);let e=this.counts,n=this.cellOf;e.fill(0),this.activeCount=0,this.itemCount=i;for(let l=0;l<i;l++){let a=t[l]*3,u=this.cellIndex(s[a],s[a+1],s[a+2]);n[l]=u,e[u]++}let r=0,c=this.total,h=this.starts,o=this.cursor,p=this.active;for(let l=0;l<c;l++)h[l]=r,o[l]=r,e[l]>0&&(p[this.activeCount++]=l),r+=e[l];h[c]=r;let m=this.items;for(let l=0;l<i;l++)m[o[n[l]]++]=t[l]}query(t,i,s,e,n,r,c){let h=this.inv,o=0,p=Math.floor((t-this.ox)*h),m=Math.floor((e-this.ox)*h),l=Math.floor((s-this.oz)*h),a=Math.floor((r-this.oz)*h),u=0,f=0;this.planar||(u=Math.floor((i-this.oy)*h),f=Math.floor((n-this.oy)*h),u=Math.max(0,u),f=Math.min(this.ny-1,f)),p=Math.max(0,p),m=Math.min(this.nx-1,m),l=Math.max(0,l),a=Math.min(this.nz-1,a),Math.floor((t-this.ox)*h)<0&&(p=0),Math.floor((e-this.ox)*h)>=this.nx&&(m=this.nx-1),Math.floor((s-this.oz)*h)<0&&(l=0),Math.floor((r-this.oz)*h)>=this.nz&&(a=this.nz-1);for(let S=u;S<=f;S++)for(let d=l;d<=a;d++)for(let w=p;w<=m;w++){let C=(S*this.nz+d)*this.nx+w,I=this.starts[C],z=I+this.counts[C];for(let D=I;D<z;D++)c[o++]=this.items[D]}return o}},Y={gravity:[0,-9.8,0],bounds:{min:[-50,-50,-50],max:[50,50,50]},walls:!0,fixedTimeStep:1/60,maxSubSteps:4,stepBudgetMs:0,maxCandidatePairs:2e7,cellSize:0,maxReach:1,planar:!1,iterations:1,maxCells:2097152,restitution:.2,friction:0,boundsRestitution:.3,positionCorrection:.78,slop:.001,damping:0,maxSpeed:100,precomputeNeighbors:!0,timeScale:1,onContact:null,onWarning:null,interpolate:!1},$=class B{constructor(t={}){let i=this.options=Object.assign({},Y,t);i.gravity=Array.from(i.gravity),i.bounds={min:Array.from(i.bounds.min),max:Array.from(i.bounds.max)};for(let s=0;s<3;s++)if(!(i.bounds.max[s]>i.bounds.min[s]))throw new RangeError("PhysicsWorld: bounds.max \\u306F bounds.min \\u3088\\u308A\\u5927\\u304D\\u3044\\u5FC5\\u8981\\u304C\\u3042\\u308A\\u307E\\u3059\\u3002");if(!(i.fixedTimeStep>0))throw new RangeError("PhysicsWorld: fixedTimeStep \\u306F\\u6B63\\u306E\\u6570\\u304C\\u5FC5\\u8981\\u3067\\u3059\\u3002");this.capacity=0,this.count=0,this.aliveCount=0,this.pos=new Float32Array(0),this.vel=new Float32Array(0),this.ext=new Float32Array(0),this.invMass=new Float32Array(0),this.rest=new Float32Array(0),this.fric=new Float32Array(0),this.shape=new Uint8Array(0),this.alive=new Uint8Array(0),this.free=[],this.bodyNode=[],this.instanceBindings=[],this._ensure(256),this.paused=!1,this.alpha=0,this.stepCount=0,this.prevPos=null,this._interp=null,this.acc=0,this.time=0,this.droppedTime=0,this.truncatedSteps=0,this.invalidBodies=0,this._listsDirty=!0,this._staticDirty=!0,this._built=!1,this.dynGrid=new W,this.statGrid=new W,this.dynAll=new Int32Array(0),this.nDynAll=0,this.dynSmall=new Int32Array(0),this.nDynSmall=0,this.statSmall=new Int32Array(0),this.nStatSmall=0,this.ovDyn=new Int32Array(0),this.nOvDyn=0,this.ovStat=new Int32Array(0),this.nOvStat=0,this.cell=0,this.reach=1,this.maxSmallHalf=0,this._fwd=new Int32Array(0),this._fwdStarts=null,this._fwdCells=null,this._scratch=new Int32Array(0),this._cand=0,this._overlaps=0,this._truncated=!1,this._mode=0,this._pairs=null,this.stats={bodies:0,staticBodies:0,oversizeBodies:0,substeps:0,stepMs:0,integrateMs:0,gridMs:0,collisionMs:0,candidatePairs:0,overlaps:0,activeCells:0,cells:0,cellSize:0,droppedTime:0,truncated:!1}}_ensure(t){if(t<=this.capacity)return;let i=Math.max(t,this.capacity*2),s=(r,c)=>{let h=new Float32Array(i*c);return h.set(r),h};this.pos=s(this.pos,3),this.vel=s(this.vel,3),this.ext=s(this.ext,3),this.invMass=s(this.invMass,1),this.rest=s(this.rest,1),this.fric=s(this.fric,1);let e=new Uint8Array(i);e.set(this.shape),this.shape=e;let n=new Uint8Array(i);n.set(this.alive),this.alive=n,this.capacity=i}reserve(t){return this._ensure(t),this}setOptions(t){let i=Object.keys(t);for(let s of i){if(!(s in Y))throw new RangeError("PhysicsWorld.setOptions: \\u672A\\u77E5\\u306E\\u30AA\\u30D7\\u30B7\\u30E7\\u30F3 "+s);this.options[s]=s==="gravity"?Array.from(t[s]):s==="bounds"?{min:Array.from(t[s].min),max:Array.from(t[s].max)}:t[s]}return("cellSize"in t||"bounds"in t||"planar"in t||"maxReach"in t||"maxCells"in t||"precomputeNeighbors"in t)&&(this._listsDirty=!0),"bounds"in t&&(this._staticDirty=!0),this}_warn(t){this.options.onWarning&&this.options.onWarning(t)}addBody(t={}){let i=t.shape==="box"?U:R,s,e,n;if(i===R){let m=t.radius===void 0?.5:t.radius;if(!(m>0)||!isFinite(m))throw new RangeError("addBody: radius \\u306F\\u6B63\\u306E\\u6709\\u9650\\u6570\\u304C\\u5FC5\\u8981\\u3067\\u3059\\u3002");s=e=n=m}else{let m=t.halfExtents||(t.size?[t.size[0]/2,t.size[1]/2,t.size[2]/2]:[.5,.5,.5]);if(s=m[0],e=m[1],n=m[2],!(s>0&&e>0&&n>0)||!isFinite(s+e+n))throw new RangeError("addBody: halfExtents/size \\u306F\\u6B63\\u306E\\u6709\\u9650\\u6570\\u304C\\u5FC5\\u8981\\u3067\\u3059\\u3002")}let r=t.position||[0,0,0],c=t.velocity||[0,0,0];if(!isFinite(r[0]+r[1]+r[2]+c[0]+c[1]+c[2]))throw new RangeError("addBody: position/velocity \\u306F\\u6709\\u9650\\u6570\\u304C\\u5FC5\\u8981\\u3067\\u3059\\u3002");let h;this.free.length?h=this.free.pop():(h=this.count++,this._ensure(this.count));let o=h*3;this.pos[o]=r[0],this.pos[o+1]=r[1],this.pos[o+2]=r[2],this.vel[o]=c[0],this.vel[o+1]=c[1],this.vel[o+2]=c[2],this.ext[o]=s,this.ext[o+1]=e,this.ext[o+2]=n,this.shape[h]=i,this.alive[h]=1;let p=t.mass;return p===void 0&&(p=i===R?4/3*Math.PI*s*s*s:8*s*e*n),this.invMass[h]=t.static||!(p>0)||!isFinite(p)?0:1/p,this.rest[h]=t.restitution===void 0?this.options.restitution:t.restitution,this.fric[h]=t.friction===void 0?this.options.friction:t.friction,this.bodyNode[h]=t.node||null,this.prevPos&&this.prevPos.length>=(h+1)*3&&(this.prevPos[o]=r[0],this.prevPos[o+1]=r[1],this.prevPos[o+2]=r[2]),this.aliveCount++,this._listsDirty=!0,this.invMass[h]===0&&(this._staticDirty=!0),h}removeBody(t){this._check(t),this.invMass[t]===0&&(this._staticDirty=!0),this.alive[t]=0,this.free.push(t),this.bodyNode[t]=null,this.aliveCount--,this._listsDirty=!0}_check(t){if(!(t>=0&&t<this.count)||!this.alive[t])throw new RangeError("PhysicsWorld: \\u7121\\u52B9\\u306A\\u7269\\u4F53ID "+t)}isAlive(t){return t>=0&&t<this.count&&this.alive[t]===1}setPosition(t,i,s,e){this._check(t);let n=t*3;return this.pos[n]=i,this.pos[n+1]=s,this.pos[n+2]=e,this.prevPos&&this.prevPos.length>n+2&&(this.prevPos[n]=i,this.prevPos[n+1]=s,this.prevPos[n+2]=e),this.invMass[t]===0&&(this._staticDirty=!0),this}setVelocity(t,i,s,e){this._check(t);let n=t*3;return this.vel[n]=i,this.vel[n+1]=s,this.vel[n+2]=e,this}getPosition(t,i=[0,0,0]){this._check(t);let s=t*3;return i[0]=this.pos[s],i[1]=this.pos[s+1],i[2]=this.pos[s+2],i}getVelocity(t,i=[0,0,0]){this._check(t);let s=t*3;return i[0]=this.vel[s],i[1]=this.vel[s+1],i[2]=this.vel[s+2],i}setMass(t,i){this._check(t);let s=this.invMass[t]===0;return this.invMass[t]=i>0&&isFinite(i)?1/i:0,(s||this.invMass[t]===0)&&(this._staticDirty=!0),this._listsDirty=!0,this}applyImpulse(t,i,s,e){this._check(t);let n=this.invMass[t],r=t*3;return this.vel[r]+=i*n,this.vel[r+1]+=s*n,this.vel[r+2]+=e*n,this}clear(){return this.count=0,this.aliveCount=0,this.free.length=0,this.bodyNode.length=0,this.instanceBindings.length=0,this.alive.fill(0),this.acc=0,this._listsDirty=!0,this._staticDirty=!0,this}bindNode(t,i){return this._check(t),this.bodyNode[t]=i,this}bindInstanced(t,i,s,e=0){return this.instanceBindings.push({mesh:t,firstBody:i,count:s,instanceStart:e}),this}unbindInstanced(t){this.instanceBindings=this.instanceBindings.filter(i=>i.mesh!==t)}_renderPos(){if(!this.options.interpolate||!this.prevPos||!(this.alpha>0))return this.pos;let t=this.count*3;(!this._interp||this._interp.length<t)&&(this._interp=new Float32Array(Math.max(t,this.pos.length)));let i=this.alpha,s=this.pos,e=this.prevPos,n=this._interp;for(let r=0;r<t;r++)n[r]=e[r]+(s[r]-e[r])*i;return n}syncTransforms(){let t=this._renderPos();for(let i=0;i<this.count;i++){let s=this.bodyNode[i];if(s&&this.alive[i]){let e=i*3;(s.position[0]!==t[e]||s.position[1]!==t[e+1]||s.position[2]!==t[e+2])&&(s.position[0]=t[e],s.position[1]=t[e+1],s.position[2]=t[e+2],s.markDirty())}}for(let i of this.instanceBindings){let s=i.mesh.matrices,e=Math.min(i.count,i.mesh.count-i.instanceStart);for(let n=0;n<e;n++){let r=(i.firstBody+n)*3,c=(i.instanceStart+n)*16;s[c+12]=t[r],s[c+13]=t[r+1],s[c+14]=t[r+2]}e>0&&i.mesh.markInstancesDirty(i.instanceStart,i.instanceStart+e)}}_maxHalf(t){let i=t*3;return Math.max(this.ext[i],this.ext[i+1],this.ext[i+2])}_rebuildLists(){let t=this.options,i=this.count,s=[];for(let d=0;d<i;d++)this.alive[d]&&s.push(this._maxHalf(d));let e=t.cellSize;e>0||(s.length?(s.sort((d,w)=>d-w),e=2.2*s[Math.min(s.length-1,Math.floor(s.length*.9))]):e=1);let n=t.bounds,r=[n.max[0]-n.min[0],n.max[1]-n.min[1],n.max[2]-n.min[2]],c=d=>[Math.max(1,Math.ceil(r[0]/d)),t.planar?1:Math.max(1,Math.ceil(r[1]/d)),Math.max(1,Math.ceil(r[2]/d))],h=c(e);for(;h[0]*h[1]*h[2]>t.maxCells;)e*=1.25,h=c(e),this._warn("\\u30BB\\u30EB\\u6570\\u304C maxCells \\u3092\\u8D85\\u3048\\u308B\\u305F\\u3081\\u30BB\\u30EB\\u5E45\\u3092 "+e.toFixed(3)+" \\u306B\\u62E1\\u5927\\u3057\\u307E\\u3057\\u305F\\u3002");let o=e*Math.max(1,t.maxReach)/2;this.dynAll.length<i&&(this.dynAll=new Int32Array(this.capacity),this.dynSmall=new Int32Array(this.capacity),this.statSmall=new Int32Array(this.capacity),this.ovDyn=new Int32Array(this.capacity),this.ovStat=new Int32Array(this.capacity),this._scratch=new Int32Array(this.capacity));let p=0,m=0,l=0,a=0,u=0,f=0;for(let d=0;d<i;d++){if(!this.alive[d])continue;let w=this._maxHalf(d),C=this.invMass[d]===0;C||(this.dynAll[p++]=d),w<=o?(w>f&&(f=w),C?this.statSmall[l++]=d:this.dynSmall[m++]=d):C?this.ovStat[u++]=d:this.ovDyn[a++]=d}a+u>256&&!this._warnedOversize&&(this._warnedOversize=!0,this._warn("\\u30BB\\u30EB\\u5E45("+e.toFixed(3)+")\\u306B\\u5BFE\\u3057\\u3066\\u5927\\u304D\\u3059\\u304E\\u308B\\u7269\\u4F53\\u304C "+(a+u)+" \\u500B\\u3042\\u308A\\u3001\\u3053\\u308C\\u3089\\u306F\\u7DCF\\u5F53\\u305F\\u308A(O(k\\xB2))\\u3067\\u51E6\\u7406\\u3055\\u308C\\u307E\\u3059\\u3002cellSize \\u3092\\u7269\\u4F53\\u76F4\\u5F84\\u4EE5\\u4E0A\\uFF08\\u76EE\\u5B89: \\u534A\\u5F84\\u306E2.2\\u500D\\u4EE5\\u4E0A\\uFF09\\u306B\\u3059\\u308B\\u304B\\u3001maxReach \\u3092\\u4E0A\\u3052\\u3066\\u304F\\u3060\\u3055\\u3044\\u3002")),this.nDynAll=p,this.nDynSmall=m,this.nStatSmall=l,this.nOvDyn=a,this.nOvStat=u,this.maxSmallHalf=f,this.reach=Math.max(1,Math.ceil(2*f/e-1e-9));let S=e!==this.cell||this.dynGrid.nx!==h[0]||this.dynGrid.nz!==h[2]||this.dynGrid.planar!==t.planar||this.dynGrid.ny!==(t.planar?1:h[1])||this.dynGrid.ox!==n.min[0];this.cell=e,S&&(this.dynGrid.configure(n.min[0],n.min[1],n.min[2],e,h[0],h[1],h[2],t.planar),this.statGrid.configure(n.min[0],n.min[1],n.min[2],e,h[0],h[1],h[2],t.planar),this._staticDirty=!0,this._buildNeighbors()),this._rebuildFwdOffsets(),this._listsDirty=!1,this._built=!0}_rebuildFwdOffsets(){let t=this.reach,i=this.options.planar,s=[];for(let e=i?0:-t;e<=(i?0:t);e++)for(let n=-t;n<=t;n++)for(let r=-t;r<=t;r++)(e>0||e===0&&(n>0||n===0&&r>0))&&s.push(r,e,n);this._fwd=Int32Array.from(s),this._fwdReach!==t&&(this._fwdReach=t,this._buildNeighbors())}_buildNeighbors(){if(this._fwdStarts=null,this._fwdCells=null,!this.options.precomputeNeighbors||!this._fwd.length)return;let t=this.dynGrid,i=this._fwd.length/3;if(t.total*i>4e6)return;let s=t.nx,e=t.ny,n=t.nz,r=this._fwd,c=new Int32Array(t.total+1),h=0;for(let o=0;o<2;o++){let p=o?new Int32Array(h):null,m=0,l=0;for(let a=0;a<e;a++)for(let u=0;u<n;u++)for(let f=0;f<s;f++,m++){o===0&&(c[m]=h);for(let S=0;S<r.length;S+=3){let d=f+r[S],w=a+r[S+1],C=u+r[S+2];d<0||d>=s||w<0||w>=e||C<0||C>=n||(o?p[l++]=(w*n+C)*s+d:h++)}}o===0?c[t.total]=h:(this._fwdCells=p,this._fwdStarts=c)}}prepareBroadphase(){(this._listsDirty||!this._built)&&this._rebuildLists(),this._staticDirty&&(this.statGrid.rebuild(this.statSmall,this.nStatSmall,this.pos),this._staticDirty=!1),this.dynGrid.rebuild(this.dynSmall,this.nDynSmall,this.pos)}_enumerate(t){let i=this.dynGrid,s=this.statGrid,e=i.counts,n=i.starts,r=i.items,c=this.options.maxCandidatePairs,h=0,o=this._fwdStarts,p=this._fwdCells,m=this._fwd,l=i.nx,a=i.ny,u=i.nz,f=this.reach,S=i.planar;for(let z=0;z<i.activeCount;z++){let D=i.active[z],v=n[D],A=v+e[D];for(let M=v;M<A;M++){let y=r[M];for(let x=M+1;x<A;x++)h++,t(y,r[x])}if(o)for(let M=o[D],y=o[D+1];M<y;M++){let x=p[M],g=n[x],b=g+e[x];if(g!==b)for(let k=v;k<A;k++){let _=r[k];for(let O=g;O<b;O++)h++,t(_,r[O])}}else{let M=D%l,y=D/l|0,x=y%u,g=y/u|0;for(let b=0;b<m.length;b+=3){let k=M+m[b],_=g+m[b+1],O=x+m[b+2];if(k<0||k>=l||_<0||_>=a||O<0||O>=u)continue;let F=(_*u+O)*l+k,P=n[F],E=P+e[F];if(P!==E)for(let T=v;T<A;T++){let H=r[T];for(let G=P;G<E;G++)h++,t(H,r[G])}}}if(h>c){this._truncated=!0,this._cand=h;return}}if(s.itemCount>0){let z=s.counts,D=s.starts,v=s.items;for(let A=0;A<i.activeCount;A++){let M=i.active[A],y=n[M],x=y+e[M],g=M%l,b=M/l|0,k=b%u,_=b/u|0;for(let O=S?0:-f;O<=(S?0:f);O++)for(let F=-f;F<=f;F++)for(let P=-f;P<=f;P++){let E=g+P,T=_+O,H=k+F;if(E<0||E>=l||T<0||T>=a||H<0||H>=u)continue;let G=(T*u+H)*l+E,V=D[G],K=V+z[G];if(V!==K)for(let J=y;J<x;J++){let Q=r[J];for(let X=V;X<K;X++)h++,t(Q,v[X])}}if(h>c){this._truncated=!0,this._cand=h;return}}}let d=this.pos,w=this.ext,C=this._scratch,I=this.maxSmallHalf;for(let z=0;z<this.nOvDyn;z++){let D=this.ovDyn[z],v=D*3,A=d[v]-w[v]-I,M=d[v+1]-w[v+1]-I,y=d[v+2]-w[v+2]-I,x=d[v]+w[v]+I,g=d[v+1]+w[v+1]+I,b=d[v+2]+w[v+2]+I,k=i.query(A,M,y,x,g,b,C);for(let _=0;_<k;_++)h++,t(D,C[_]);k=s.query(A,M,y,x,g,b,C);for(let _=0;_<k;_++)h++,t(D,C[_]);for(let _=z+1;_<this.nOvDyn;_++)h++,t(D,this.ovDyn[_]);for(let _=0;_<this.nOvStat;_++)h++,t(D,this.ovStat[_]);if(h>c){this._truncated=!0,this._cand=h;return}}for(let z=0;z<this.nOvStat;z++){let D=this.ovStat[z],v=D*3,A=i.query(d[v]-w[v]-I,d[v+1]-w[v+1]-I,d[v+2]-w[v+2]-I,d[v]+w[v]+I,d[v+1]+w[v+1]+I,d[v+2]+w[v+2]+I,C);for(let M=0;M<A;M++)h++,t(D,C[M])}this._cand=h}computeCandidatePairs(){this.prepareBroadphase();let t=[];return this._truncated=!1,this._enumerate((i,s)=>t.push(i<s?[i,s]:[s,i])),t}bruteForceOverlaps(){let t=[];for(let i=0;i<this.count;i++)if(this.alive[i])for(let s=i+1;s<this.count;s++)this.alive[s]&&(this.invMass[i]===0&&this.invMass[s]===0||this._contact(i,s)&&t.push([i,s]));return t}_contact(t,i){let s=this.pos,e=this.ext,n=t*3,r=i*3,c=this.shape[t],h=this.shape[i];if(c===R&&h===R){let y=s[r]-s[n],x=s[r+1]-s[n+1],g=s[r+2]-s[n+2],b=e[n]+e[r],k=y*y+x*x+g*g;if(k>=b*b)return!1;let _=Math.sqrt(k);if(_<1e-7){let O=(t*2.399963229728653+i*.017)%(Math.PI*2);this._nx=Math.cos(O),this._ny=0,this._nz=Math.sin(O),this._pen=b}else this._nx=y/_,this._ny=x/_,this._nz=g/_,this._pen=b-_;return!0}if(c===U&&h===U){let y=s[r]-s[n],x=s[r+1]-s[n+1],g=s[r+2]-s[n+2],b=e[n]+e[r]-Math.abs(y),k=e[n+1]+e[r+1]-Math.abs(x),_=e[n+2]+e[r+2]-Math.abs(g);return b<=0||k<=0||_<=0?!1:(this._nx=0,this._ny=0,this._nz=0,b<=k&&b<=_?(this._nx=y<0?-1:1,this._pen=b):k<=_?(this._ny=x<0?-1:1,this._pen=k):(this._nz=g<0?-1:1,this._pen=_),!0)}let o=c===R?n:r,p=c===R?r:n,m=e[o],l=s[o],a=s[o+1],u=s[o+2],f=Math.max(s[p]-e[p],Math.min(l,s[p]+e[p])),S=Math.max(s[p+1]-e[p+1],Math.min(a,s[p+1]+e[p+1])),d=Math.max(s[p+2]-e[p+2],Math.min(u,s[p+2]+e[p+2])),w=l-f,C=a-S,I=u-d,z=w*w+C*C+I*I,D,v,A,M;if(z>0){if(z>=m*m)return!1;let y=Math.sqrt(z);D=w/y,v=C/y,A=I/y,M=m-y}else{let y=l-s[p],x=a-s[p+1],g=u-s[p+2],b=e[p]-Math.abs(y),k=e[p+1]-Math.abs(x),_=e[p+2]-Math.abs(g);D=v=A=0,b<=k&&b<=_?(D=y<0?-1:1,M=m+b):k<=_?(v=x<0?-1:1,M=m+k):(A=g<0?-1:1,M=m+_)}return c===R?(this._nx=-D,this._ny=-v,this._nz=-A):(this._nx=D,this._ny=v,this._nz=A),this._pen=M,!0}_resolve(t,i){if(!this._contact(t,i))return;this._overlaps++;let s=this.options,e=this._nx,n=this._ny,r=this._nz,c=this._pen,h=this.invMass,o=h[t],p=h[i],m=o+p;if(m===0)return;let l=this.pos,a=this.vel,u=t*3,f=i*3,S=Math.max(0,c-s.slop)*s.positionCorrection/m;o>0&&(l[u]-=e*S*o,l[u+1]-=n*S*o,l[u+2]-=r*S*o),p>0&&(l[f]+=e*S*p,l[f+1]+=n*S*p,l[f+2]+=r*S*p);let d=a[f]-a[u],w=a[f+1]-a[u+1],C=a[f+2]-a[u+2],I=d*e+w*n+C*r,z=0;if(I<0){z=-(1+Math.min(this.rest[t],this.rest[i]))*I/m,a[u]-=z*o*e,a[u+1]-=z*o*n,a[u+2]-=z*o*r,a[f]+=z*p*e,a[f+1]+=z*p*n,a[f+2]+=z*p*r;let v=Math.sqrt(this.fric[t]*this.fric[i]);if(v>0){let A=a[f]-a[u],M=a[f+1]-a[u+1],y=a[f+2]-a[u+2],x=A*e+M*n+y*r,g=A-x*e,b=M-x*n,k=y-x*r,_=Math.sqrt(g*g+b*b+k*k);if(_>1e-6){let O=Math.min(_/m,v*z),F=g/_,P=b/_,E=k/_;a[u]+=O*o*F,a[u+1]+=O*o*P,a[u+2]+=O*o*E,a[f]-=O*p*F,a[f+1]-=O*p*P,a[f+2]-=O*p*E}}}s.onContact&&s.onContact(t,i,e,n,r,c)}step(t){let i=N(),s=this.options,e=this.pos,n=this.vel,r=this.ext;s.interpolate&&((!this.prevPos||this.prevPos.length<e.length)&&(this.prevPos=new Float32Array(e.length)),this.prevPos.set(e)),(this._listsDirty||!this._built)&&this._rebuildLists();let c=s.gravity,h=c[0]*t,o=c[1]*t,p=c[2]*t,m=s.damping>0?Math.exp(-s.damping*t):1,l=s.maxSpeed*s.maxSpeed,a=s.bounds.min,u=s.bounds.max,f=s.walls,S=s.boundsRestitution,d=0;for(let A=0;A<this.nDynAll;A++){let M=this.dynAll[A],y=M*3,x=(n[y]+h)*m,g=(n[y+1]+o)*m,b=(n[y+2]+p)*m,k=x*x+g*g+b*b;if(k>l){let P=s.maxSpeed/Math.sqrt(k);x*=P,g*=P,b*=P}let _=e[y]+x*t,O=e[y+1]+g*t,F=e[y+2]+b*t;if(!isFinite(_+O+F+x+g+b)){this.alive[M]=0,this.free.push(M),this.aliveCount--,d++;continue}if(f){let P=a[0]+r[y],E=u[0]-r[y];_<P?(_=P,x<0&&(x=-x*S)):_>E&&(_=E,x>0&&(x=-x*S)),P=a[1]+r[y+1],E=u[1]-r[y+1],O<P?(O=P,g<0&&(g=-g*S)):O>E&&(O=E,g>0&&(g=-g*S)),P=a[2]+r[y+2],E=u[2]-r[y+2],F<P?(F=P,b<0&&(b=-b*S)):F>E&&(F=E,b>0&&(b=-b*S))}n[y]=x,n[y+1]=g,n[y+2]=b,e[y]=_,e[y+1]=O,e[y+2]=F}d&&(this.invalidBodies+=d,this._listsDirty=!0,this._warn("\\u975E\\u6709\\u9650\\u5024\\u306B\\u306A\\u3063\\u305F\\u7269\\u4F53\\u3092 "+d+" \\u500B\\u7121\\u52B9\\u5316\\u3057\\u307E\\u3057\\u305F\\u3002"),this._rebuildLists());let w=N();this._staticDirty&&(this.statGrid.rebuild(this.statSmall,this.nStatSmall,e),this._staticDirty=!1),this.dynGrid.rebuild(this.dynSmall,this.nDynSmall,e);let C=N();this._overlaps=0,this._truncated=!1,this._cand=0;let I=this._resolveBound||(this._resolveBound=(A,M)=>this._resolve(A,M)),z=0;for(let A=0;A<Math.max(1,s.iterations)&&(this._enumerate(I),z=this._cand,!this._truncated);A++);if(f)for(let A=0;A<this.nDynAll;A++){let M=this.dynAll[A];if(!this.alive[M])continue;let y=M*3;for(let x=0;x<3;x++){let g=a[x]+r[y+x],b=u[x]-r[y+x];e[y+x]<g?e[y+x]=g:e[y+x]>b&&(e[y+x]=b)}}let D=N();this._truncated&&(this.truncatedSteps++,this._warn("\\u5019\\u88DC\\u30DA\\u30A2\\u6570\\u304C maxCandidatePairs="+s.maxCandidatePairs+" \\u3092\\u8D85\\u3048\\u305F\\u305F\\u3081\\u3001\\u3053\\u306E\\u30B9\\u30C6\\u30C3\\u30D7\\u306E\\u885D\\u7A81\\u51E6\\u7406\\u3092\\u6253\\u3061\\u5207\\u308A\\u307E\\u3057\\u305F\\u3002"));let v=this.stats;return v.integrateMs+=w-i,v.gridMs+=C-w,v.collisionMs+=D-C,v.stepMs+=D-i,v.candidatePairs=z,v.overlaps=this._overlaps,v.activeCells=this.dynGrid.activeCount,v.truncated=this._truncated,this.time+=t,this.stepCount++,v}advance(t){let i=this.options,s=this.stats;if(s.integrateMs=0,s.gridMs=0,s.collisionMs=0,s.stepMs=0,s.substeps=0,this.paused||!(t>0)||!isFinite(t))return this._fillStats(),0;this.acc+=t*i.timeScale;let e=i.fixedTimeStep,n=N(),r=0;for(;this.acc>=e&&r<i.maxSubSteps&&(this.step(e),this.acc-=e,r++,!(i.stepBudgetMs>0&&N()-n>i.stepBudgetMs)););return this.acc>=e&&(this.droppedTime+=this.acc,this.acc=0),s.substeps=r,this.alpha=this.acc/e,this._fillStats(),r}_fillStats(){let t=this.stats;t.bodies=this.aliveCount,t.oversizeBodies=this.nOvDyn+this.nOvStat,t.staticBodies=this.nStatSmall+this.nOvStat,t.cells=this.dynGrid.total,t.cellSize=this.cell,t.droppedTime=this.droppedTime}pause(){return this.paused=!0,this}resume(){return this.paused=!1,this}stateHash(){let t=2166136261,i=this.count,s=e=>{for(let n=0;n<e.length;n++)t^=e[n],t=Math.imul(t,16777619)};return s(new Uint8Array(this.pos.buffer,this.pos.byteOffset,i*12)),s(new Uint8Array(this.vel.buffer,this.vel.byteOffset,i*12)),s(this.alive.subarray(0,i)),(t>>>0).toString(16).padStart(8,"0")}raycast(t,i,s=1/0){let e=Math.hypot(i[0],i[1],i[2])||1,n=[i[0]/e,i[1]/e,i[2]/e],r=null;for(let c=0;c<this.count;c++){if(!this.alive[c])continue;let h=c*3,o=-1,p=null;if(this.shape[c]===R){let m=t[0]-this.pos[h],l=t[1]-this.pos[h+1],a=t[2]-this.pos[h+2],u=this.ext[h],f=m*n[0]+l*n[1]+a*n[2],S=m*m+l*l+a*a-u*u,d=f*f-S;if(d>=0){let w=Math.sqrt(d);o=-f-w,o<0&&(o=-f+w),o>=0?p=[(m+n[0]*o)/u,(l+n[1]*o)/u,(a+n[2]*o)/u]:o=-1}}else{let m=0,l=1/0,a=-1,u=0;for(let f=0;f<3;f++){let S=this.pos[h+f]-this.ext[h+f],d=this.pos[h+f]+this.ext[h+f];if(Math.abs(n[f])<1e-14){if(t[f]<S||t[f]>d){l=-1;break}continue}let w=(S-t[f])/n[f],C=(d-t[f])/n[f],I=-1;if(w>C){let z=w;w=C,C=z,I=1}if(w>m&&(m=w,a=f,u=I),C<l&&(l=C),m>l){l=-1;break}}l>=0&&m<=l&&(o=m,p=[0,0,0],a>=0&&(p[a]=u))}o>=0&&o<=s&&(!r||o<r.distance)&&(r={index:c,distance:o,point:[t[0]+n[0]*o,t[1]+n[1]*o,t[2]+n[2]*o],normal:p})}return r}toJSON(){let t=this.count;return{format:"massive-engine-physics",version:1,options:Object.assign({},this.options,{onContact:void 0,onWarning:void 0}),count:t,pos:j(this.pos.subarray(0,t*3)),vel:j(this.vel.subarray(0,t*3)),ext:j(this.ext.subarray(0,t*3)),invMass:j(this.invMass.subarray(0,t)),rest:j(this.rest.subarray(0,t)),fric:j(this.fric.subarray(0,t)),shape:Array.from(this.shape.subarray(0,t)),alive:Array.from(this.alive.subarray(0,t))}}static fromJSON(t){if(!t||t.format!=="massive-engine-physics")throw new L("\\u7269\\u7406JSON\\u306E\\u5F62\\u5F0F\\u304C\\u4E0D\\u6B63\\u3067\\u3059\\u3002","E_SCENE_FORMAT");if(t.version!==1)throw new L("\\u672A\\u5BFE\\u5FDC\\u306E\\u7269\\u7406JSON\\u30D0\\u30FC\\u30B8\\u30E7\\u30F3: "+t.version,"E_SCENE_FORMAT");let i=new B(t.options),s=t.count;i._ensure(s),i.count=s,i.pos.set(q(t.pos)),i.vel.set(q(t.vel)),i.ext.set(q(t.ext)),i.invMass.set(q(t.invMass)),i.rest.set(q(t.rest)),i.fric.set(q(t.fric)),i.shape.set(t.shape),i.alive.set(t.alive),i.aliveCount=0;for(let e=0;e<s;e++)i.alive[e]?i.aliveCount++:i.free.push(e);return i}};function Z(B){let t=null,i=new Set(["setPosition","setVelocity","setMass","removeBody","setOptions","applyImpulse","clear"]);return{get world(){return t},handle(s){try{switch(s.type){case"init":t=new $(Object.assign({},s.options,{onContact:null,onWarning:e=>B({type:"warning",message:e})})),B({type:"ready"});break;case"addBodies":{if(!t)throw new Error("worker: init \\u304C\\u5148\\u306B\\u5FC5\\u8981\\u3067\\u3059\\u3002");let e=s.data,n=[];for(let r=0;r<s.count;r++){let c=r*3,h=e.shape[r]===U,o=t.addBody({shape:h?"box":"sphere",radius:e.ext[c],halfExtents:[e.ext[c],e.ext[c+1],e.ext[c+2]],position:[e.pos[c],e.pos[c+1],e.pos[c+2]],velocity:[e.vel[c],e.vel[c+1],e.vel[c+2]],mass:e.invMass[r]>0?1/e.invMass[r]:0,static:e.invMass[r]===0,restitution:e.rest[r],friction:e.fric[r]});n.push(o)}B({type:"bodies",ids:n,token:s.token});break}case"call":if(!t)throw new Error("worker: init \\u304C\\u5148\\u306B\\u5FC5\\u8981\\u3067\\u3059\\u3002");if(!i.has(s.method))throw new Error("worker: \\u8A31\\u53EF\\u3055\\u308C\\u3066\\u3044\\u306A\\u3044\\u30E1\\u30BD\\u30C3\\u30C9 "+s.method);t[s.method](...s.args);break;case"step":{if(!t)throw new Error("worker: init \\u304C\\u5148\\u306B\\u5FC5\\u8981\\u3067\\u3059\\u3002");let e=t.advance(s.dt),n=t.count,r=new Float32Array(n*3);r.set(t.pos.subarray(0,n*3)),B({type:"result",pos:r,count:n,steps:e,stats:Object.assign({},t.stats)},[r.buffer]);break}case"dispose":t=null;break;default:throw new Error("worker: \\u672A\\u77E5\\u306E\\u30E1\\u30C3\\u30BB\\u30FC\\u30B8 "+s.type)}}catch(e){B({type:"error",message:String(e&&e.message||e)})}}}}var st=Z((B,t)=>self.postMessage(B,t||[]));self.onmessage=B=>st.handle(B.data);})();\n';

  // src/physics-worker-client.js
  var PhysicsWorkerClient = class {
    constructor(options = {}, { onError, onWarning } = {}) {
      if (typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") throw new MassiveEngineError("Web Worker \u304C\u5229\u7528\u3067\u304D\u306A\u3044\u74B0\u5883\u3067\u3059\u3002", "E_WORKER_UNAVAILABLE");
      const opts = Object.assign({}, options);
      delete opts.onContact;
      delete opts.onWarning;
      const url = URL.createObjectURL(new Blob([worker_source_default], { type: "text/javascript" }));
      this.worker = new Worker(url);
      this._url = url;
      this.count = 0;
      this.positions = new Float32Array(0);
      this.stats = {};
      this.steps = 0;
      this.disposed = false;
      this.isWorker = true;
      this.instanceBindings = [];
      this.bodyNode = [];
      this._busy = false;
      this._pending = 0;
      this._fresh = false;
      this._tokens = /* @__PURE__ */ new Map();
      this._token = 1;
      this._onError = onError || null;
      this._onWarning = onWarning || null;
      this.stepLatencyMs = 0;
      this._sentAt = 0;
      this.ready = new Promise((res, rej) => {
        this._ready = res;
        this._fail = rej;
      });
      this.worker.onmessage = (e) => this._message(e.data);
      this.worker.onerror = (e) => {
        const err = new MassiveEngineError("\u7269\u7406\u30EF\u30FC\u30AB\u30FC\u3067\u30A8\u30E9\u30FC: " + (e.message || "unknown"), "E_WORKER");
        this._fail(err);
        if (this._onError) this._onError(err);
      };
      this.worker.postMessage({ type: "init", options: opts });
    }
    _message(m) {
      switch (m.type) {
        case "ready":
          URL.revokeObjectURL(this._url);
          this._ready(this);
          break;
        case "bodies": {
          const r = this._tokens.get(m.token);
          if (r) {
            this._tokens.delete(m.token);
            r(m.ids);
          }
          break;
        }
        case "result":
          this.positions = m.pos;
          this.count = m.count;
          this.stats = m.stats;
          this.steps = m.steps;
          this._busy = false;
          this._fresh = true;
          this.stepLatencyMs = performance.now() - this._sentAt;
          break;
        case "warning":
          if (this._onWarning) this._onWarning(m.message);
          break;
        case "error": {
          const err = new MassiveEngineError("\u7269\u7406\u30EF\u30FC\u30AB\u30FC: " + m.message, "E_WORKER");
          this._busy = false;
          if (this._onError) this._onError(err);
          break;
        }
      }
    }
    /** data: {pos,vel,ext (Float32Array x3N), shape (Uint8Array), invMass,rest,fric (Float32Array xN)}。戻り値: Promise<物体ID配列> */
    addBodies(data, count) {
      const token = this._token++;
      return new Promise((res) => {
        this._tokens.set(token, res);
        this.worker.postMessage({ type: "addBodies", data, count, token });
      });
    }
    call(method, ...args) {
      this.worker.postMessage({ type: "call", method, args });
      return this;
    }
    setOptions(o) {
      return this.call("setOptions", o);
    }
    bindInstanced(mesh, firstBody, count, instanceStart = 0) {
      this.instanceBindings.push({ mesh, firstBody, count, instanceStart });
      return this;
    }
    unbindInstanced(mesh) {
      this.instanceBindings = this.instanceBindings.filter((b) => b.mesh !== mesh);
    }
    /** 毎フレーム呼ぶ: 最新結果を描画オブジェクトへ反映し、必要なら次のステップを要求 */
    update(dt) {
      if (this.disposed) return;
      if (this._fresh) {
        this._fresh = false;
        this._apply();
      }
      this._pending = Math.min(0.25, this._pending + dt);
      if (!this._busy && this._pending > 0) {
        this._busy = true;
        this._sentAt = performance.now();
        this.worker.postMessage({ type: "step", dt: this._pending });
        this._pending = 0;
      }
    }
    _apply() {
      const pos = this.positions;
      for (const b of this.instanceBindings) {
        const m = b.mesh.matrices, n = Math.min(b.count, b.mesh.count - b.instanceStart, this.count - b.firstBody);
        for (let k = 0; k < n; k++) {
          const j = (b.firstBody + k) * 3, o = (b.instanceStart + k) * 16;
          m[o + 12] = pos[j];
          m[o + 13] = pos[j + 1];
          m[o + 14] = pos[j + 2];
        }
        if (n > 0) b.mesh.markInstancesDirty(b.instanceStart, b.instanceStart + n);
      }
      for (let i = 0; i < this.bodyNode.length; i++) {
        const n = this.bodyNode[i];
        if (n && i < this.count) {
          n.position[0] = pos[i * 3];
          n.position[1] = pos[i * 3 + 1];
          n.position[2] = pos[i * 3 + 2];
          n.markDirty();
        }
      }
    }
    syncTransforms() {
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      try {
        this.worker.postMessage({ type: "dispose" });
      } catch (_) {
      }
      this.worker.terminate();
      try {
        URL.revokeObjectURL(this._url);
      } catch (_) {
      }
    }
  };

  // src/texture.js
  var Texture = class _Texture {
    constructor(source = null, options = {}) {
      this.id = uid();
      this.name = options.name || "";
      this.source = null;
      this.width = 0;
      this.height = 0;
      this.wrapS = options.wrapS || "repeat";
      this.wrapT = options.wrapT || "repeat";
      this.minFilter = options.minFilter || "mipmap";
      this.magFilter = options.magFilter || "linear";
      this.flipY = options.flipY !== false;
      this.version = 0;
      this.url = options.url || null;
      this.params = options.params || null;
      this.error = null;
      this.ready = false;
      this.loaded = Promise.resolve(this);
      this._gpu = /* @__PURE__ */ new Map();
      if (source) this.setSource(source);
    }
    setSource(source) {
      if (source && source.data) {
        if (!(source.data instanceof Uint8Array || source.data instanceof Uint8ClampedArray) || source.data.length !== source.width * source.height * 4) throw new RangeError("Texture: {data,width,height} \u306F RGBA8 (width*height*4 \u30D0\u30A4\u30C8) \u304C\u5FC5\u8981\u3067\u3059\u3002");
        this.width = source.width;
        this.height = source.height;
      } else if (source) {
        this.width = source.naturalWidth || source.videoWidth || source.width || 0;
        this.height = source.naturalHeight || source.videoHeight || source.height || 0;
        if (!this.width || !this.height) throw new RangeError("Texture: \u753B\u50CF\u30B5\u30A4\u30BA\u304C 0 \u3067\u3059\uFF08\u8AAD\u307F\u8FBC\u307F\u524D\u306E\u753B\u50CF\u3067\u306F Texture.fromURL \u3092\u4F7F\u7528\uFF09\u3002");
      }
      this.source = source;
      this.ready = !!source;
      this.version++;
      return this;
    }
    needsUpdate() {
      this.version++;
      return this;
    }
    get byteSize() {
      return this.width * this.height * 4 * (this.minFilter === "mipmap" ? 4 / 3 : 1);
    }
    dispose() {
      for (const r of Array.from(this._gpu.keys())) r._freeTexture(this);
      this._gpu.clear();
    }
    /** URL から非同期読み込み。返り値はすぐ使える（読み込み完了までは白）。完了は texture.loaded (Promise)。 */
    static fromURL(url, options = {}) {
      const tex = new _Texture(null, Object.assign({ url }, options));
      if (typeof Image === "undefined") {
        tex.error = new MassiveEngineError("Image \u304C\u5229\u7528\u3067\u304D\u306A\u3044\u74B0\u5883\u3067\u3059\u3002", "E_TEXTURE_LOAD");
        tex.loaded = Promise.reject(tex.error);
        tex.loaded.catch(() => {
        });
        return tex;
      }
      tex.loaded = new Promise((resolve, reject) => {
        const img = new Image();
        if (options.crossOrigin !== null) img.crossOrigin = options.crossOrigin || "anonymous";
        img.onload = () => {
          try {
            tex.setSource(img);
            resolve(tex);
          } catch (e) {
            tex.error = e;
            reject(e);
          }
        };
        img.onerror = () => {
          tex.error = new MassiveEngineError("\u30C6\u30AF\u30B9\u30C1\u30E3\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093: " + url, "E_TEXTURE_LOAD");
          reject(tex.error);
        };
        img.src = url;
      });
      tex.loaded.catch(() => {
      });
      return tex;
    }
    static fromCanvas(canvas, options) {
      return new _Texture(canvas, options);
    }
    static solid(color = "#ffffff", options) {
      const c = parseColor(color);
      const data = new Uint8Array([Math.round(c[0] * 255), Math.round(c[1] * 255), Math.round(c[2] * 255), 255]);
      return new _Texture({ data, width: 1, height: 1 }, Object.assign({ minFilter: "nearest", magFilter: "nearest" }, options));
    }
    /** 手続き型チェッカー。画像ファイル不要で動作確認できる。 */
    static checker(size = 64, cells = 8, colorA = "#ffffff", colorB = "#8890a0", options) {
      const a = parseColor(colorA), b = parseColor(colorB), data = new Uint8Array(size * size * 4), cs = size / cells;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const c = Math.floor(x / cs) + Math.floor(y / cs) & 1 ? b : a, i = (y * size + x) * 4;
        data[i] = c[0] * 255;
        data[i + 1] = c[1] * 255;
        data[i + 2] = c[2] * 255;
        data[i + 3] = 255;
      }
      return new _Texture({ data, width: size, height: size }, Object.assign({ name: "checker", params: { type: "checker", size, cells, colorA, colorB } }, options));
    }
  };

  // src/assets.js
  var AssetManager = class {
    constructor() {
      this._e = /* @__PURE__ */ new Map();
      this._factories = /* @__PURE__ */ new Map();
      this.disposed = false;
    }
    _kind(r) {
      return r && r.positions ? "geometry" : r && r.wrapS ? "texture" : r && r.color && r.opacity !== void 0 ? "material" : "other";
    }
    /** 登録（参照数 0 で開始）。同名は replace:true でのみ上書き可能。 */
    add(name, resource, { replace = false } = {}) {
      if (this.disposed) throw new MassiveEngineError("AssetManager \u306F\u7834\u68C4\u6E08\u307F\u3067\u3059\u3002", "E_DISPOSED");
      if (this._e.has(name) && !replace) throw new MassiveEngineError("\u540C\u540D\u306E\u30A2\u30BB\u30C3\u30C8\u304C\u65E2\u306B\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u3059: " + name, "E_ASSET_EXISTS");
      if (this._e.has(name) && replace) this.remove(name);
      this._e.set(name, { resource, refs: 0, kind: this._kind(resource) });
      return resource;
    }
    /** 使われた時に初めて生成される定義を登録する（遅延生成）。 */
    defer(name, factory) {
      if (typeof factory !== "function") throw new TypeError("factory \u306F\u95A2\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
      this._factories.set(name, factory);
      return this;
    }
    has(name) {
      return this._e.has(name) || this._factories.has(name);
    }
    get(name) {
      let e = this._e.get(name);
      if (!e && this._factories.has(name)) {
        this.add(name, this._factories.get(name)());
        this._factories.delete(name);
        e = this._e.get(name);
      }
      return e ? e.resource : null;
    }
    acquire(name) {
      const r = this.get(name);
      if (!r) throw new MassiveEngineError("\u672A\u767B\u9332\u306E\u30A2\u30BB\u30C3\u30C8: " + name, "E_ASSET_MISSING");
      this._e.get(name).refs++;
      return r;
    }
    /** 参照を1つ減らす。0 になれば GPU リソースを解放し、removeWhenUnused なら登録も外す。 */
    release(name, { removeWhenUnused = true } = {}) {
      const e = this._e.get(name);
      if (!e) return false;
      e.refs = Math.max(0, e.refs - 1);
      if (e.refs === 0) {
        if (e.resource.dispose) e.resource.dispose();
        if (removeWhenUnused) this._e.delete(name);
      }
      return true;
    }
    remove(name) {
      const e = this._e.get(name);
      if (!e) return false;
      if (e.resource.dispose) e.resource.dispose();
      this._e.delete(name);
      return true;
    }
    refs(name) {
      const e = this._e.get(name);
      return e ? e.refs : 0;
    }
    /** URL から画像テクスチャを読み込む（同じ URL はキャッシュ共有）。呼ぶたびに参照が +1 される。 */
    loadTexture(url, options) {
      const key = "texture:" + url;
      let e = this._e.get(key);
      if (!e) {
        this.add(key, Texture.fromURL(url, options));
        e = this._e.get(key);
      }
      e.refs++;
      return e.resource;
    }
    releaseTexture(url) {
      return this.release("texture:" + url);
    }
    async loadJSON(url) {
      const r = await fetch(url);
      if (!r.ok) throw new MassiveEngineError("\u8AAD\u307F\u8FBC\u307F\u5931\u6557 " + r.status + ": " + url, "E_ASSET_LOAD");
      return r.json();
    }
    /** 参照 0 のアセットを解放して返す個数 */
    disposeUnused() {
      let n = 0;
      for (const [k, e] of Array.from(this._e)) if (e.refs === 0) {
        if (e.resource.dispose) e.resource.dispose();
        this._e.delete(k);
        n++;
      }
      return n;
    }
    disposeAll() {
      for (const e of this._e.values()) if (e.resource.dispose) e.resource.dispose();
      this._e.clear();
      this._factories.clear();
    }
    stats() {
      const s = { count: this._e.size, deferred: this._factories.size, geometries: 0, textures: 0, materials: 0, estimatedBytes: 0 };
      for (const e of this._e.values()) {
        if (e.kind === "geometry") s.geometries++;
        else if (e.kind === "texture") s.textures++;
        else if (e.kind === "material") s.materials++;
        s.estimatedBytes += e.resource.byteSize || 0;
      }
      return s;
    }
    list() {
      return Array.from(this._e, ([name, e]) => ({ name, kind: e.kind, refs: e.refs }));
    }
    dispose() {
      this.disposeAll();
      this.disposed = true;
    }
  };

  // src/quality.js
  var QUALITY_PRESETS = {
    low: { renderScale: 0.6, shadows: false, shadowMapSize: 1024, lodBias: 2 },
    medium: { renderScale: 0.8, shadows: true, shadowMapSize: 1024, lodBias: 1.25 },
    high: { renderScale: 1, shadows: true, shadowMapSize: 2048, lodBias: 1 },
    ultra: { renderScale: 1, shadows: true, shadowMapSize: 4096, lodBias: 0.8 }
  };
  var ADAPTIVE_STEPS = [
    { scale: 1, shadow: 1, lod: 1 },
    { scale: 0.9, shadow: 1, lod: 1 },
    { scale: 0.8, shadow: 1, lod: 1 },
    { scale: 0.8, shadow: 0.5, lod: 1 },
    { scale: 0.7, shadow: 0.5, lod: 1.5 },
    { scale: 0.7, shadow: 0, lod: 1.5 },
    { scale: 0.6, shadow: 0, lod: 2 },
    { scale: 0.5, shadow: 0, lod: 3 }
  ];
  var AdaptiveQuality = class {
    constructor(o = {}) {
      this.enabled = o.enabled !== false;
      this.targetFps = o.targetFps || 60;
      this.minScale = o.minScale || 0.5;
      this.level = 0;
      this.maxLevel = ADAPTIVE_STEPS.length - 1;
      this.frames = new RingStat(30);
      this.cpu = new RingStat(30);
      this.gpu = new RingStat(30);
      this.lastChange = -1e9;
      this.upCooldown = o.upCooldownMs || 4e3;
      this._lastUp = -1e9;
      this._since = 0;
      this.changes = 0;
    }
    get step() {
      return ADAPTIVE_STEPS[this.level];
    }
    reset() {
      this.level = 0;
      this.frames.clear();
      this.cpu.clear();
      this.gpu.clear();
      this._since = 0;
    }
    /** @returns {boolean} レベルが変わったか */
    tick(frameMs, cpuMs, gpuMs, nowMs) {
      if (!this.enabled) return false;
      this.frames.push(frameMs);
      this.cpu.push(cpuMs);
      if (gpuMs != null) this.gpu.push(gpuMs);
      if (++this._since < 15 || this.frames.n < 30) return false;
      this._since = 0;
      const target = 1e3 / this.targetFps, avg = this.frames.mean();
      if (avg > target * 1.15 && this.level < this.maxLevel && nowMs - this.lastChange > 1e3) {
        if (nowMs - this._lastUp < 6e3) this.upCooldown = Math.min(3e4, this.upCooldown * 2);
        this.level++;
        this.lastChange = nowMs;
        this.changes++;
        this.frames.clear();
        return true;
      }
      const gpuOk = this.gpu.n === 0 || this.gpu.mean() < target * 0.7;
      if (avg < target * 1.08 && this.cpu.mean() < target * 0.6 && gpuOk && this.level > 0 && nowMs - this.lastChange > this.upCooldown) {
        this.level--;
        this.lastChange = nowMs;
        this._lastUp = nowMs;
        this.changes++;
        this.frames.clear();
        return true;
      }
      return false;
    }
  };

  // src/raycast.js
  var _inv2 = mat4.create();
  var _invI = mat4.create();
  var _o = new Float64Array(3);
  var _d = new Float64Array(3);
  var _o2 = new Float64Array(3);
  var _d2 = new Float64Array(3);
  var _bmin2 = new Float64Array(3);
  var _bmax2 = new Float64Array(3);
  var _tmpM2 = mat4.create();
  var Ray = class {
    constructor(origin = [0, 0, 0], direction = [0, 0, -1]) {
      this.origin = Float64Array.from(origin);
      this.direction = vec3.normalize(new Float64Array(3), direction);
    }
    at(t, out = new Float64Array(3)) {
      out[0] = this.origin[0] + this.direction[0] * t;
      out[1] = this.origin[1] + this.direction[1] * t;
      out[2] = this.origin[2] + this.direction[2] * t;
      return out;
    }
  };
  function rayFromCamera(camera, ndcX, ndcY) {
    const inv = mat4.invert(_invI, camera.viewProjection);
    if (!inv) throw new Error("rayFromCamera: \u30D3\u30E5\u30FC\u5C04\u5F71\u884C\u5217\u304C\u7279\u7570\u3067\u3059\u3002");
    const a = vec3.transformMat4(new Float64Array(3), [ndcX, ndcY, -1], inv), b = vec3.transformMat4(new Float64Array(3), [ndcX, ndcY, 1], inv);
    return new Ray(a, vec3.sub(new Float64Array(3), b, a));
  }
  function intersectAABB(o, d, min, max, tMax = Infinity) {
    let t0 = 0, t1 = tMax;
    for (let k = 0; k < 3; k++) {
      const dk = d[k];
      if (Math.abs(dk) < 1e-14) {
        if (o[k] < min[k] || o[k] > max[k]) return -1;
        continue;
      }
      const inv = 1 / dk;
      let a = (min[k] - o[k]) * inv, b = (max[k] - o[k]) * inv;
      if (a > b) {
        const t = a;
        a = b;
        b = t;
      }
      if (a > t0) t0 = a;
      if (b < t1) t1 = b;
      if (t0 > t1) return -1;
    }
    return t0;
  }
  function intersectTriangle(o, d, p, a, b, c) {
    const e1x = p[b] - p[a], e1y = p[b + 1] - p[a + 1], e1z = p[b + 2] - p[a + 2], e2x = p[c] - p[a], e2y = p[c + 1] - p[a + 1], e2z = p[c + 2] - p[a + 2];
    const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-14) return -1;
    const inv = 1 / det, tx = o[0] - p[a], ty = o[1] - p[a + 1], tz = o[2] - p[a + 2];
    const u = (tx * px + ty * py + tz * pz) * inv;
    if (u < 0 || u > 1) return -1;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
    const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
    if (v < 0 || u + v > 1) return -1;
    const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
    return t >= 0 ? t : -1;
  }
  function raycastGeometry(geo, o, d, tMax) {
    if (geo.mode !== "triangles") return null;
    const p = geo.positions, ind = geo.indices, n = ind ? ind.length / 3 : p.length / 9;
    let best = tMax, face = -1;
    for (let t = 0; t < n; t++) {
      const a2 = (ind ? ind[t * 3] : t * 3) * 3, b2 = (ind ? ind[t * 3 + 1] : t * 3 + 1) * 3, c2 = (ind ? ind[t * 3 + 2] : t * 3 + 2) * 3;
      const r = intersectTriangle(o, d, p, a2, b2, c2);
      if (r >= 0 && r < best) {
        best = r;
        face = t;
      }
    }
    if (face < 0) return null;
    const a = (ind ? ind[face * 3] : face * 3) * 3, b = (ind ? ind[face * 3 + 1] : face * 3 + 1) * 3, c = (ind ? ind[face * 3 + 2] : face * 3 + 2) * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    if (nx * d[0] + ny * d[1] + nz * d[2] > 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    return { t: best, face, nx, ny, nz };
  }
  function worldNormal(out, inv, nx, ny, nz) {
    const x = inv[0] * nx + inv[1] * ny + inv[2] * nz, y = inv[4] * nx + inv[5] * ny + inv[6] * nz, z = inv[8] * nx + inv[9] * ny + inv[10] * nz;
    const l = Math.hypot(x, y, z) || 1;
    out[0] = x / l;
    out[1] = y / l;
    out[2] = z / l;
    return out;
  }
  function raycast(scene, ray, opts = {}) {
    const hits = [], maxD = opts.maxDistance === void 0 ? Infinity : opts.maxDistance, filter = opts.filter || null;
    const o = ray.origin, d = ray.direction;
    const walk = (node) => {
      if (!node.visible) return;
      if ((node.type === "Mesh" || node.type === "InstancedMesh") && (!filter || filter(node))) {
        if (node.type === "Mesh") hitMesh(node);
        else hitInstanced(node);
      }
      for (let i = 0; i < node.children.length; i++) walk(node.children[i]);
    };
    const hitMesh = (m) => {
      if (m.geometry.mode !== "triangles") return;
      m.updateWorldBounds();
      if (intersectAABB(o, d, m.wmin, m.wmax, maxD) < 0) return;
      if (!mat4.invert(_inv2, m._world)) return;
      vec3.transformMat4(_o, o, _inv2);
      vec3.transformDir(_d, d, _inv2);
      const r = raycastGeometry(m.geometry, _o, _d, Infinity);
      if (!r) return;
      const point = [o[0] + d[0] * r.t, o[1] + d[1] * r.t, o[2] + d[2] * r.t];
      if (r.t > maxD) return;
      hits.push({ object: m, distance: r.t, point, normal: Array.from(worldNormal(new Float64Array(3), _inv2, r.nx, r.ny, r.nz)), faceIndex: r.face });
    };
    const hitInstanced = (m) => {
      if (!mat4.invert(_inv2, m._world)) return;
      vec3.transformMat4(_o, o, _inv2);
      vec3.transformDir(_d, d, _inv2);
      const gb = m.geometry.bounds, mat = m.matrices, cs = m.chunkSize;
      for (let c = 0; c < m.chunkCount; c++) {
        const ch = m.chunks[c];
        if (ch.boundsDirty) m.computeChunkBounds(c);
        if (intersectAABB(_o, _d, ch.min, ch.max) < 0) continue;
        const s = c * cs, e = Math.min(m.count, s + cs);
        for (let i = s; i < e; i++) {
          const base = i * 16;
          for (let k = 0; k < 16; k++) _tmpM2[k] = mat[base + k];
          mat4.transformAABB(_bmin2, _bmax2, gb.min, gb.max, _tmpM2);
          const tb = intersectAABB(_o, _d, _bmin2, _bmax2);
          if (tb < 0) continue;
          let t = tb, face = -1, nx = 0, ny = 1, nz = 0, inv2 = _tmpM2;
          if (m.preciseRaycast && m.geometry.mode === "triangles") {
            const im = mat4.invert(_invI, _tmpM2);
            if (!im) continue;
            vec3.transformMat4(_o2, _o, _invI);
            vec3.transformDir(_d2, _d, _invI);
            const r = raycastGeometry(m.geometry, _o2, _d2, Infinity);
            if (!r) continue;
            t = r.t;
            face = r.face;
            nx = r.nx;
            ny = r.ny;
            nz = r.nz;
            inv2 = _invI;
            const wn = worldNormal(new Float64Array(3), inv2, nx, ny, nz);
            worldNormal(wn, _inv2, wn[0], wn[1], wn[2]);
            nx = wn[0];
            ny = wn[1];
            nz = wn[2];
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

  // src/scene-io.js
  var SCENE_FORMAT = "massive-engine-scene";
  var SCENE_VERSION = 1;
  var arr = (a) => Array.from(a);
  var bad = (msg, path) => new MassiveEngineError("\u30B7\u30FC\u30F3JSON\u304C\u4E0D\u6B63\u3067\u3059" + (path ? " (" + path + ")" : "") + ": " + msg, "E_SCENE_FORMAT");
  function serializeScene(root, extra = {}) {
    const geos = /* @__PURE__ */ new Map(), mats = /* @__PURE__ */ new Map(), texs = /* @__PURE__ */ new Map(), warnings = [];
    const out = { format: SCENE_FORMAT, version: SCENE_VERSION, assets: { geometries: {}, materials: {}, textures: {} }, root: null };
    const gid = (g) => {
      if (geos.has(g)) return geos.get(g);
      const id = "g" + geos.size;
      geos.set(g, id);
      if (g.params) out.assets.geometries[id] = Object.assign({}, g.params);
      else {
        const j = { type: "custom", mode: g.mode, positions: f32ToBase64(g.positions) };
        if (g.normals) j.normals = f32ToBase64(g.normals);
        if (g.uvs) j.uvs = f32ToBase64(g.uvs);
        if (g.colors) j.colors = f32ToBase64(g.colors);
        if (g.indices) {
          j.indexType = g.indices instanceof Uint32Array ? "u32" : "u16";
          j.indices = f32ToBase64(g.indices);
        }
        out.assets.geometries[id] = j;
      }
      return id;
    };
    const tid = (t) => {
      if (texs.has(t)) return texs.get(t);
      const id = "t" + texs.size;
      texs.set(t, id);
      const base = { wrapS: t.wrapS, wrapT: t.wrapT, minFilter: t.minFilter, magFilter: t.magFilter, flipY: t.flipY };
      if (t.url) out.assets.textures[id] = Object.assign({ type: "url", url: t.url }, base);
      else if (t.params && t.params.type === "checker") out.assets.textures[id] = Object.assign({}, t.params, base);
      else if (t.source && t.source.data) out.assets.textures[id] = Object.assign({ type: "data", width: t.width, height: t.height, data: f32ToBase64(new Uint8Array(t.source.data)) }, base);
      else if (t.source && typeof document !== "undefined") {
        try {
          const c = document.createElement("canvas");
          c.width = t.width;
          c.height = t.height;
          c.getContext("2d").drawImage(t.source, 0, 0);
          out.assets.textures[id] = Object.assign({ type: "dataurl", url: c.toDataURL("image/png") }, base);
        } catch (e) {
          warnings.push("\u30C6\u30AF\u30B9\u30C1\u30E3 " + (t.name || t.id) + " \u3092\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F: " + e.message);
          out.assets.textures[id] = { type: "solid", color: "#ffffff" };
        }
      } else {
        warnings.push("\u30C6\u30AF\u30B9\u30C1\u30E3 " + (t.name || t.id) + " \u306F\u4FDD\u5B58\u3067\u304D\u306A\u3044\u305F\u3081\u767D\u3067\u4EE3\u66FF\u3057\u307E\u3057\u305F\u3002");
        out.assets.textures[id] = { type: "solid", color: "#ffffff" };
      }
      return id;
    };
    const mid = (m) => {
      if (mats.has(m)) return mats.get(m);
      const id = "m" + mats.size;
      mats.set(m, id);
      out.assets.materials[id] = { name: m.name, color: arr(m.color), emissive: arr(m.emissive), opacity: m.opacity, transparent: m.transparent, map: m.map ? tid(m.map) : null, vertexColors: m.vertexColors, unlit: m.unlit, specular: m.specular, shininess: m.shininess, doubleSided: m.doubleSided, depthTest: m.depthTest, depthWrite: m.depthWrite, alphaTest: m.alphaTest };
      return id;
    };
    const node = (n) => {
      const j = { type: n.type, name: n.name, position: arr(n.position), quaternion: arr(n.quaternion), scale: arr(n.scale), visible: n.visible, static: n.static };
      try {
        if (n.userData && Object.keys(n.userData).length) j.userData = JSON.parse(JSON.stringify(n.userData));
      } catch (e) {
        warnings.push("userData \u3092\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093: " + n.name);
      }
      switch (n.type) {
        case "Scene":
          j.background = arr(n.background);
          break;
        case "Mesh":
          j.geometry = gid(n.geometry);
          j.material = mid(n.material);
          j.castShadow = n.castShadow;
          j.receiveShadow = n.receiveShadow;
          j.frustumCulled = n.frustumCulled;
          j.renderOrder = n.renderOrder;
          break;
        case "InstancedMesh":
          j.geometry = gid(n.geometry);
          j.material = mid(n.material);
          j.castShadow = n.castShadow;
          j.receiveShadow = n.receiveShadow;
          j.frustumCulled = n.frustumCulled;
          j.instances = {
            count: n.count,
            chunkSize: n.chunkSize,
            dynamic: n.dynamic,
            spin: n.spin,
            spinSpeed: n.spinSpeed,
            maxDistance: Number.isFinite(n.maxDistance) ? n.maxDistance : null,
            matrices: f32ToBase64(n.matrices.subarray(0, n.count * 16)),
            colors: f32ToBase64(n.colors.subarray(0, n.count * 4)),
            lods: n.lods.slice(1).map((l) => ({ geometry: gid(l.geometry), distance: l.distance }))
          };
          break;
        case "AmbientLight":
          j.color = arr(n.color);
          j.intensity = n.intensity;
          break;
        case "DirectionalLight":
          j.color = arr(n.color);
          j.intensity = n.intensity;
          j.direction = arr(n.direction);
          j.castShadow = n.castShadow;
          j.shadow = Object.assign({}, n.shadow);
          break;
        case "PointLight":
          j.color = arr(n.color);
          j.intensity = n.intensity;
          j.range = n.range;
          break;
        case "PerspectiveCamera":
          j.fov = n.fov;
          j.near = n.near;
          j.far = n.far;
          break;
        case "OrthographicCamera":
          j.height = n.height;
          j.near = n.near;
          j.far = n.far;
          break;
      }
      j.children = n.children.map(node);
      return j;
    };
    out.root = node(root);
    Object.assign(out, extra);
    return { json: out, warnings };
  }
  function deserializeScene(json, { textureFactory } = {}) {
    if (typeof json === "string") {
      try {
        json = JSON.parse(json);
      } catch (e) {
        throw bad("JSON \u3068\u3057\u3066\u89E3\u6790\u3067\u304D\u307E\u305B\u3093: " + e.message);
      }
    }
    if (!json || json.format !== SCENE_FORMAT) throw bad("format \u304C " + SCENE_FORMAT + " \u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002");
    if (json.version !== SCENE_VERSION) throw bad("\u672A\u5BFE\u5FDC\u306E\u30D0\u30FC\u30B8\u30E7\u30F3 " + json.version + "\uFF08\u5BFE\u5FDC: " + SCENE_VERSION + "\uFF09\u3002");
    if (!json.root || !json.assets) throw bad("root / assets \u304C\u3042\u308A\u307E\u305B\u3093\u3002");
    const geos = {}, mats = {}, texs = {};
    const T = (id) => {
      if (texs[id]) return texs[id];
      const d = json.assets.textures[id];
      if (!d) throw bad("\u30C6\u30AF\u30B9\u30C1\u30E3 " + id + " \u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002", "assets.textures");
      const opt = { wrapS: d.wrapS, wrapT: d.wrapT, minFilter: d.minFilter, magFilter: d.magFilter, flipY: d.flipY };
      let t;
      if (textureFactory) t = textureFactory(d, opt);
      if (!t) switch (d.type) {
        case "url":
        case "dataurl":
          t = Texture.fromURL(d.url, opt);
          break;
        case "checker":
          t = Texture.checker(d.size, d.cells, d.colorA, d.colorB, opt);
          break;
        case "data":
          t = new Texture({ data: base64ToBytes(d.data), width: d.width, height: d.height }, opt);
          break;
        case "solid":
          t = Texture.solid(d.color, opt);
          break;
        default:
          throw bad("\u672A\u77E5\u306E\u30C6\u30AF\u30B9\u30C1\u30E3\u7A2E\u5225 " + d.type, "assets.textures." + id);
      }
      return texs[id] = t;
    };
    const G = (id) => {
      if (geos[id]) return geos[id];
      const d = json.assets.geometries[id];
      if (!d) throw bad("\u30B8\u30AA\u30E1\u30C8\u30EA " + id + " \u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002", "assets.geometries");
      if (d.type === "custom") {
        const data = { mode: d.mode, positions: base64ToF32(d.positions) };
        if (d.normals) data.normals = base64ToF32(d.normals);
        if (d.uvs) data.uvs = base64ToF32(d.uvs);
        if (d.colors) data.colors = base64ToF32(d.colors);
        if (d.indices) {
          const b = base64ToBytes(d.indices).buffer;
          data.indices = d.indexType === "u32" ? new Uint32Array(b) : new Uint16Array(b);
        }
        return geos[id] = new Geometry(data);
      }
      return geos[id] = Geometry.fromParams(d);
    };
    const M = (id) => {
      if (mats[id]) return mats[id];
      const d = json.assets.materials[id];
      if (!d) throw bad("\u30DE\u30C6\u30EA\u30A2\u30EB " + id + " \u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002", "assets.materials");
      return mats[id] = new Material(Object.assign({}, d, { map: d.map ? T(d.map) : null }));
    };
    const build = (j, path) => {
      if (!j || typeof j.type !== "string") throw bad("\u30CE\u30FC\u30C9\u7A2E\u5225\u304C\u3042\u308A\u307E\u305B\u3093\u3002", path);
      let n;
      switch (j.type) {
        case "Node":
          n = new Node();
          break;
        case "Group":
          n = new Group();
          break;
        case "Scene":
          n = new Scene();
          if (j.background) n.background = j.background.slice();
          break;
        case "Mesh":
          n = new Mesh(G(j.geometry), M(j.material), { castShadow: j.castShadow, receiveShadow: j.receiveShadow, frustumCulled: j.frustumCulled, renderOrder: j.renderOrder });
          break;
        case "InstancedMesh": {
          const i = j.instances;
          if (!i) throw bad("instances \u304C\u3042\u308A\u307E\u305B\u3093\u3002", path);
          n = new InstancedMesh(G(j.geometry), M(j.material), { capacity: i.count, chunkSize: i.chunkSize, dynamic: i.dynamic, spin: i.spin, spinSpeed: i.spinSpeed, maxDistance: i.maxDistance == null ? Infinity : i.maxDistance, castShadow: j.castShadow, receiveShadow: j.receiveShadow, frustumCulled: j.frustumCulled });
          n.setCount(i.count);
          const mm = base64ToF32(i.matrices), cc = base64ToF32(i.colors);
          if (mm.length !== i.count * 16 || cc.length !== i.count * 4) throw bad("\u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u30C7\u30FC\u30BF\u9577\u304C count \u3068\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", path);
          n.matrices.set(mm);
          n.colors.set(cc);
          n.markInstancesDirty(0, i.count);
          for (const l of i.lods || []) n.addLOD(G(l.geometry), l.distance);
          break;
        }
        case "AmbientLight":
          n = new AmbientLight(j.color, j.intensity);
          break;
        case "DirectionalLight":
          n = new DirectionalLight(j.color, j.intensity, { direction: j.direction, castShadow: j.castShadow, shadow: j.shadow });
          break;
        case "PointLight":
          n = new PointLight(j.color, j.intensity, j.range);
          break;
        case "PerspectiveCamera":
          n = new PerspectiveCamera(j.fov, j.near, j.far);
          break;
        case "OrthographicCamera":
          n = new OrthographicCamera(j.height, j.near, j.far);
          break;
        default:
          throw bad("\u672A\u77E5\u306E\u30CE\u30FC\u30C9\u7A2E\u5225 " + j.type, path);
      }
      n.name = j.name || "";
      if (j.position) n.position.set(j.position);
      if (j.quaternion) n.quaternion.set(j.quaternion);
      if (j.scale) n.scale.set(j.scale);
      n.visible = j.visible !== false;
      n.static = !!j.static;
      if (j.userData) n.userData = j.userData;
      n.markDirty();
      (j.children || []).forEach((c, k) => n.add(build(c, path + ".children[" + k + "]")));
      return n;
    };
    const root = build(json.root, "root");
    return { root, camera: json.camera || null, extra: json };
  }

  // src/presets.js
  var ParticleField = class {
    constructor(engine, o = {}) {
      this.engine = engine;
      this.count = 0;
      this.speed = 1;
      this.gridCellSize = Number.isFinite(o.gridCellSize) ? Math.max(0.3, Math.min(2, o.gridCellSize)) : 0.6;
      this.speed = Number.isFinite(o.speed) ? Math.max(0.1, Math.min(3, o.speed)) : 1;
      this.mesh = null;
      this.grid = null;
      this.spin = o.cubeRotation !== false;
      this.world = null;
      this.seed = 0;
      this.setCount(Number.isFinite(o.count) ? o.count : 2500);
    }
    _clear() {
      if (this.mesh) {
        this.mesh.disposeResources({ textures: false });
        this.mesh.removeFromParent();
        this.mesh = null;
      }
      if (this.grid) {
        this.grid.disposeResources();
        this.grid.removeFromParent();
        this.grid = null;
      }
    }
    setCount(requested) {
      const n = Number(requested);
      if (!Number.isFinite(n)) throw new TypeError("count must be a finite number.");
      const count = Math.max(100, Math.min(1e5, Math.round(n / 100) * 100)), cols = Math.ceil(Math.sqrt(count)), rows = Math.ceil(count / cols), sp = 0.62;
      const W = cols * sp, D = rows * sp;
      this._clear();
      this.count = count;
      const opts = { gravity: [0, 0, 0], bounds: { min: [-W / 2, -1, -D / 2], max: [W / 2, 1, D / 2] }, planar: true, cellSize: this.gridCellSize, restitution: 0.12, boundsRestitution: 1, positionCorrection: 0.78, slop: 1e-3, timeScale: this.speed, maxSpeed: 20, maxSubSteps: 3, friction: 0 };
      const eng = this.engine;
      eng.disablePhysics();
      this.world = eng.enablePhysics(opts, { worker: false });
      this.world.reserve(count);
      this.mesh = new InstancedMesh(Geometry.box(1, 1, 1), new Material({ specular: 0.1 }), { capacity: count, chunkSize: 4096, spin: this.spin, name: "particles" });
      this.mesh.setCount(count);
      const m = this.mesh.matrices, c = this.mesh.colors, rgb = [0, 0, 0];
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / cols), col = i % cols;
        const x = (col - (cols - 1) / 2) * sp + (hashRandom(i, 1) - 0.5) * 0.035, z = (row - (rows - 1) / 2) * sp + (hashRandom(i, 2) - 0.5) * 0.035;
        const ang = hashRandom(i, 3) * Math.PI * 2, v = 0.38 + hashRandom(i, 4) * 0.85, r = 0.22 + hashRandom(i, 5) * 0.06;
        this.world.addBody({ radius: r, mass: r * r, position: [x, 0, z], velocity: [Math.cos(ang) * v, 0, Math.sin(ang) * v] });
        hsl(i * 0.61803398875 % 1, 0.72, 0.58, rgb);
        const o = i * 16, s = r * 2;
        m[o] = m[o + 5] = m[o + 10] = s;
        m[o + 12] = x;
        m[o + 14] = z;
        c[i * 4] = rgb[0];
        c[i * 4 + 1] = rgb[1];
        c[i * 4 + 2] = rgb[2];
        c[i * 4 + 3] = hashRandom(i, 6) * Math.PI * 2;
      }
      this.mesh.markInstancesDirty(0, count);
      this.world.bindInstanced(this.mesh, 0, count);
      this.mesh.setPosition(0, 0, 0);
      this.grid = createGridHelper(Math.max(W, D), Math.max(1, Math.round(Math.max(W, D) / Math.max(1, Math.ceil(Math.max(W, D) / 80)))), "#336a8c", 0.4);
      this.grid.setPosition(0, -0.31, 0);
      eng.scene.add(this.grid, this.mesh);
      if (eng.controls) {
        eng.controls.minPitch = 0.1;
        eng.controls.maxPitch = 1.42;
        eng.controls.maxDistance = Math.max(W, D) * 4;
        eng.controls.target.set([0, 0, 0]);
        eng.controls.distance = Math.max(16, Math.max(W, D) * 1.15);
        eng.controls.yaw = 0.68;
        eng.controls.pitch = 0.78;
        eng.controls.update();
        eng.camera.far = Math.max(5e3, eng.controls.distance * 10);
      }
      return this;
    }
    reset() {
      return this.setCount(this.count);
    }
    setSpeed(v) {
      const s = Number(v);
      if (!Number.isFinite(s)) throw new TypeError("speed must be a finite number.");
      this.speed = Math.max(0.1, Math.min(3, s));
      this.world.setOptions({ timeScale: this.speed });
      return this;
    }
    setGridCellSize(v) {
      const w = Number(v);
      if (!Number.isFinite(w) || w < 0.3 || w > 2) throw new RangeError("gridCellSize must be between 0.3 and 2.0.");
      this.gridCellSize = w;
      this.world.setOptions({ cellSize: w });
      return this;
    }
    setSpin(on) {
      this.spin = !!on;
      if (this.mesh) this.mesh.spin = this.spin;
    }
    dispose() {
      this._clear();
    }
  };

  // src/handles.js
  var HANDLE_INDEX_BITS = 22;
  var HANDLE_INDEX_LIMIT = 1 << HANDLE_INDEX_BITS;
  var GEN_LIMIT = 1 << 30;
  var HandleAllocator = class {
    constructor(initialCapacity = 64) {
      this.capacity = 0;
      this.gens = new Uint32Array(0);
      this.state = new Uint8Array(0);
      this.freeStack = new Int32Array(0);
      this.freeTop = 0;
      this.nextFresh = 0;
      this.liveCount = 0;
      this.retired = 0;
      this._grow(Math.max(4, initialCapacity | 0));
    }
    _grow(n) {
      if (n <= this.capacity) return;
      if (n > HANDLE_INDEX_LIMIT) throw new RangeError("HandleAllocator: \u6700\u5927 " + HANDLE_INDEX_LIMIT + " \u500B\u307E\u3067\u3067\u3059\u3002");
      const cap = Math.min(HANDLE_INDEX_LIMIT, Math.max(n, this.capacity * 2));
      const g = new Uint32Array(cap);
      g.set(this.gens);
      this.gens = g;
      const s = new Uint8Array(cap);
      s.set(this.state);
      this.state = s;
      const f = new Int32Array(cap);
      f.set(this.freeStack.subarray(0, this.freeTop));
      this.freeStack = f;
      this.capacity = cap;
    }
    /** 新しいハンドルを返す。再利用されるスロットでは generation が進んでいる。 */
    alloc() {
      let idx;
      if (this.freeTop > 0) idx = this.freeStack[--this.freeTop];
      else {
        if (this.nextFresh >= this.capacity) this._grow(this.capacity + 1);
        idx = this.nextFresh++;
        this.gens[idx] = 1;
      }
      this.state[idx] = 1;
      this.liveCount++;
      return this.gens[idx] * HANDLE_INDEX_LIMIT + idx;
    }
    isValid(h) {
      if (!(h > 0)) return false;
      const idx = h % HANDLE_INDEX_LIMIT;
      return idx < this.nextFresh && this.state[idx] === 1 && this.gens[idx] * HANDLE_INDEX_LIMIT + idx === h;
    }
    /** 有効なら index、無効なら -1。 */
    indexOf(h) {
      return this.isValid(h) ? h % HANDLE_INDEX_LIMIT : -1;
    }
    handleAt(idx) {
      return idx >= 0 && idx < this.nextFresh && this.state[idx] === 1 ? this.gens[idx] * HANDLE_INDEX_LIMIT + idx : 0;
    }
    isIndexLive(idx) {
      return idx >= 0 && idx < this.nextFresh && this.state[idx] === 1;
    }
    /** @returns {boolean} 解放できたか（無効・二重解放は false） */
    free(h) {
      if (!this.isValid(h)) return false;
      const idx = h % HANDLE_INDEX_LIMIT;
      this.liveCount--;
      if (++this.gens[idx] >= GEN_LIMIT) {
        this.state[idx] = 2;
        this.retired++;
      } else {
        this.state[idx] = 0;
        this.freeStack[this.freeTop++] = idx;
      }
      return true;
    }
    /** 全ハンドルを無効化する。generation は進めるので、clear 前に発行したハンドルが後で有効になることはない。 */
    clear() {
      for (let i = 0; i < this.nextFresh; i++) if (this.state[i] === 1) {
        if (++this.gens[i] >= GEN_LIMIT) {
          this.state[i] = 2;
          this.retired++;
        } else {
          this.state[i] = 0;
          this.freeStack[this.freeTop++] = i;
        }
      }
      this.liveCount = 0;
    }
    get highWaterMark() {
      return this.nextFresh;
    }
  };
  var HandlePool = class {
    /**
     * @param {() => any} create  新規オブジェクトを作る関数
     * @param {(o:any) => void} [reset]  再利用時に呼ぶ初期化関数
     */
    constructor(create2, reset = null, { initialCapacity = 64, maxCapacity = HANDLE_INDEX_LIMIT } = {}) {
      if (typeof create2 !== "function") throw new TypeError("HandlePool: create \u306F\u95A2\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
      this._create = create2;
      this._reset = reset;
      this.maxCapacity = maxCapacity;
      this.alloc = new HandleAllocator(initialCapacity);
      this.items = [];
      this.active = new Uint8Array(this.alloc.capacity);
      this.created = 0;
      this.reused = 0;
    }
    get liveCount() {
      return this.alloc.liveCount;
    }
    get capacity() {
      return this.items.length;
    }
    acquire() {
      if (this.alloc.liveCount >= this.maxCapacity) throw new RangeError("HandlePool: maxCapacity(" + this.maxCapacity + ") \u3092\u8D85\u3048\u307E\u3057\u305F\u3002");
      const h = this.alloc.alloc(), idx = h % HANDLE_INDEX_LIMIT;
      if (this.active.length < this.alloc.capacity) {
        const a = new Uint8Array(this.alloc.capacity);
        a.set(this.active);
        this.active = a;
      }
      if (idx < this.items.length && this.items[idx] !== void 0) {
        this.reused++;
        if (this._reset) this._reset(this.items[idx]);
      } else {
        this.created++;
        this.items[idx] = this._create();
      }
      this.active[idx] = 1;
      return h;
    }
    /** n 個まとめて確保し、ハンドルを out（省略時は新しい配列）へ書く。 */
    acquireMany(n, out = []) {
      for (let i = 0; i < n; i++) out[i] = this.acquire();
      out.length = n;
      return out;
    }
    /** 無効なハンドルなら null（古い参照が別オブジェクトを指すことはない）。 */
    get(h) {
      const i = this.alloc.indexOf(h);
      return i < 0 ? null : this.items[i];
    }
    isValid(h) {
      return this.alloc.isValid(h);
    }
    release(h) {
      const i = this.alloc.indexOf(h);
      if (i < 0) return false;
      this.active[i] = 0;
      return this.alloc.free(h);
    }
    releaseMany(handles) {
      let n = 0;
      for (let i = 0; i < handles.length; i++) if (this.release(handles[i])) n++;
      return n;
    }
    setActive(h, on) {
      const i = this.alloc.indexOf(h);
      if (i < 0) return false;
      this.active[i] = on ? 1 : 0;
      return true;
    }
    setActiveMany(handles, on) {
      let n = 0;
      for (let i = 0; i < handles.length; i++) if (this.setActive(handles[i], on)) n++;
      return n;
    }
    isActive(h) {
      const i = this.alloc.indexOf(h);
      return i >= 0 && this.active[i] === 1;
    }
    /** fn(obj, handle)。使用中かつ active のものだけ。 */
    forEachActive(fn) {
      const a = this.alloc, n = a.nextFresh;
      for (let i = 0; i < n; i++) if (a.state[i] === 1 && this.active[i] === 1) fn(this.items[i], a.gens[i] * HANDLE_INDEX_LIMIT + i);
    }
    clear() {
      this.alloc.clear();
      this.active.fill(0);
    }
    stats() {
      return { live: this.alloc.liveCount, slots: this.items.length, created: this.created, reused: this.reused, retired: this.alloc.retired };
    }
  };

  // src/collision/shapes.js
  var SHAPE_SPHERE2 = 0;
  var SHAPE_AABB = 1;
  var SHAPE_OBB = 2;
  var SHAPE_CAPSULE = 3;
  var SHAPE_PLANE = 4;
  var SHAPE_NAMES = ["sphere", "aabb", "obb", "capsule", "plane"];
  var SHAPE_BY_NAME = { sphere: SHAPE_SPHERE2, aabb: SHAPE_AABB, box: SHAPE_AABB, obb: SHAPE_OBB, capsule: SHAPE_CAPSULE, plane: SHAPE_PLANE };
  function quatToAxes(x, y, z, w, out, o) {
    const l = Math.hypot(x, y, z, w);
    if (l < 1e-12) {
      x = 0;
      y = 0;
      z = 0;
      w = 1;
    } else if (Math.abs(l - 1) > 1e-12) {
      x /= l;
      y /= l;
      z /= l;
      w /= l;
    }
    const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
    out[o] = 1 - 2 * (yy + zz);
    out[o + 1] = 2 * (xy + wz);
    out[o + 2] = 2 * (xz - wy);
    out[o + 3] = 2 * (xy - wz);
    out[o + 4] = 1 - 2 * (xx + zz);
    out[o + 5] = 2 * (yz + wx);
    out[o + 6] = 2 * (xz + wy);
    out[o + 7] = 2 * (yz - wx);
    out[o + 8] = 1 - 2 * (xx + yy);
  }
  var HUGE = 1e30;
  function computeAABB(type, pos, pi, par, qi, rotm, ri, out, o) {
    const x = pos[pi], y = pos[pi + 1], z = pos[pi + 2];
    let ex, ey, ez;
    switch (type) {
      case SHAPE_SPHERE2:
        ex = ey = ez = par[qi];
        break;
      case SHAPE_AABB:
        ex = par[qi];
        ey = par[qi + 1];
        ez = par[qi + 2];
        break;
      case SHAPE_OBB: {
        const hx = par[qi], hy = par[qi + 1], hz = par[qi + 2];
        ex = Math.abs(rotm[ri]) * hx + Math.abs(rotm[ri + 3]) * hy + Math.abs(rotm[ri + 6]) * hz;
        ey = Math.abs(rotm[ri + 1]) * hx + Math.abs(rotm[ri + 4]) * hy + Math.abs(rotm[ri + 7]) * hz;
        ez = Math.abs(rotm[ri + 2]) * hx + Math.abs(rotm[ri + 5]) * hy + Math.abs(rotm[ri + 8]) * hz;
        break;
      }
      case SHAPE_CAPSULE: {
        const r = par[qi], h = par[qi + 1];
        ex = Math.abs(rotm[ri + 3]) * h + r;
        ey = Math.abs(rotm[ri + 4]) * h + r;
        ez = Math.abs(rotm[ri + 5]) * h + r;
        break;
      }
      default:
        out[o] = out[o + 1] = out[o + 2] = -HUGE;
        out[o + 3] = out[o + 4] = out[o + 5] = HUGE;
        return;
    }
    out[o] = x - ex;
    out[o + 1] = y - ey;
    out[o + 2] = z - ez;
    out[o + 3] = x + ex;
    out[o + 4] = y + ey;
    out[o + 5] = z + ez;
  }

  // src/collision/narrowphase.js
  var Contact = class {
    constructor() {
      this.nx = 0;
      this.ny = 0;
      this.nz = 0;
      this.depth = 0;
      this.px = 0;
      this.py = 0;
      this.pz = 0;
      this.toi = -1;
    }
    set(o) {
      this.nx = o.nx;
      this.ny = o.ny;
      this.nz = o.nz;
      this.depth = o.depth;
      this.px = o.px;
      this.py = o.py;
      this.pz = o.pz;
      this.toi = o.toi;
      return this;
    }
  };
  var EPS = 1e-12;
  function perp(ax, ay, az, out) {
    const bx = Math.abs(ax), by = Math.abs(ay), bz = Math.abs(az);
    let x, y, z;
    if (bx <= by && bx <= bz) {
      x = 0;
      y = -az;
      z = ay;
    } else if (by <= bz) {
      x = az;
      y = 0;
      z = -ax;
    } else {
      x = -ay;
      y = ax;
      z = 0;
    }
    const l = Math.hypot(x, y, z) || 1;
    out.x = x / l;
    out.y = y / l;
    out.z = z / l;
  }
  var _p = { x: 0, y: 0, z: 0 };
  function sphereSphere(S, a, b, c) {
    const P = S.pos, Q = S.par, i = a * 3, j = b * 3, dx = P[j] - P[i], dy = P[j + 1] - P[i + 1], dz = P[j + 2] - P[i + 2];
    const ra = Q[a * 4], rb = Q[b * 4], rr = ra + rb, d2 = dx * dx + dy * dy + dz * dz;
    if (!(d2 < rr * rr)) return false;
    const d = Math.sqrt(d2);
    if (d > EPS) {
      c.nx = dx / d;
      c.ny = dy / d;
      c.nz = dz / d;
    } else {
      c.nx = 1;
      c.ny = 0;
      c.nz = 0;
    }
    c.depth = rr - d;
    const k = ra - c.depth * 0.5;
    c.px = P[i] + c.nx * k;
    c.py = P[i + 1] + c.ny * k;
    c.pz = P[i + 2] + c.nz * k;
    return true;
  }
  function sphereBox(S, a, b, c) {
    const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, j = b * 3, o = b * 9, q = b * 4, r = Q[a * 4];
    const cx = P[i] - P[j], cy = P[i + 1] - P[j + 1], cz = P[i + 2] - P[j + 2];
    const lx = cx * R[o] + cy * R[o + 1] + cz * R[o + 2], ly = cx * R[o + 3] + cy * R[o + 4] + cz * R[o + 5], lz = cx * R[o + 6] + cy * R[o + 7] + cz * R[o + 8];
    const hx = Q[q], hy = Q[q + 1], hz = Q[q + 2];
    const qx = lx < -hx ? -hx : lx > hx ? hx : lx, qy = ly < -hy ? -hy : ly > hy ? hy : ly, qz = lz < -hz ? -hz : lz > hz ? hz : lz;
    const dx = lx - qx, dy = ly - qy, dz = lz - qz, d2 = dx * dx + dy * dy + dz * dz;
    let nlx, nly, nlz, depth, sx, sy, sz;
    if (d2 > 0) {
      if (!(d2 < r * r)) return false;
      const d = Math.sqrt(d2);
      nlx = dx / d;
      nly = dy / d;
      nlz = dz / d;
      depth = r - d;
      sx = qx;
      sy = qy;
      sz = qz;
    } else {
      const fx = hx - Math.abs(lx), fy = hy - Math.abs(ly), fz = hz - Math.abs(lz);
      nlx = nly = nlz = 0;
      sx = lx;
      sy = ly;
      sz = lz;
      if (fx <= fy && fx <= fz) {
        const s = lx < 0 ? -1 : 1;
        nlx = s;
        sx = s * hx;
        depth = r + fx;
      } else if (fy <= fz) {
        const s = ly < 0 ? -1 : 1;
        nly = s;
        sy = s * hy;
        depth = r + fy;
      } else {
        const s = lz < 0 ? -1 : 1;
        nlz = s;
        sz = s * hz;
        depth = r + fz;
      }
    }
    c.nx = -(nlx * R[o] + nly * R[o + 3] + nlz * R[o + 6]);
    c.ny = -(nlx * R[o + 1] + nly * R[o + 4] + nlz * R[o + 7]);
    c.nz = -(nlx * R[o + 2] + nly * R[o + 5] + nlz * R[o + 8]);
    c.depth = depth;
    c.px = P[j] + sx * R[o] + sy * R[o + 3] + sz * R[o + 6];
    c.py = P[j + 1] + sx * R[o + 1] + sy * R[o + 4] + sz * R[o + 7];
    c.pz = P[j + 2] + sx * R[o + 2] + sy * R[o + 5] + sz * R[o + 8];
    return true;
  }
  function sphereCapsule(S, a, b, c) {
    const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, j = b * 3, o = b * 9, rs = Q[a * 4], rc = Q[b * 4], h = Q[b * 4 + 1];
    const ux = R[o + 3], uy = R[o + 4], uz = R[o + 5], dx0 = P[i] - P[j], dy0 = P[i + 1] - P[j + 1], dz0 = P[i + 2] - P[j + 2];
    let t = dx0 * ux + dy0 * uy + dz0 * uz;
    t = t < -h ? -h : t > h ? h : t;
    const qx = P[j] + ux * t, qy = P[j + 1] + uy * t, qz = P[j + 2] + uz * t;
    const dx = P[i] - qx, dy = P[i + 1] - qy, dz = P[i + 2] - qz, rr = rs + rc, d2 = dx * dx + dy * dy + dz * dz;
    if (!(d2 < rr * rr)) return false;
    const d = Math.sqrt(d2);
    let nx, ny, nz;
    if (d > EPS) {
      nx = dx / d;
      ny = dy / d;
      nz = dz / d;
    } else {
      perp(ux, uy, uz, _p);
      nx = _p.x;
      ny = _p.y;
      nz = _p.z;
    }
    c.depth = rr - d;
    c.nx = -nx;
    c.ny = -ny;
    c.nz = -nz;
    const k = rc - c.depth * 0.5;
    c.px = qx + nx * k;
    c.py = qy + ny * k;
    c.pz = qz + nz * k;
    return true;
  }
  function spherePlane(S, a, b, c) {
    const P = S.pos, Q = S.par, i = a * 3, q = b * 4, r = Q[a * 4];
    const nx = Q[q], ny = Q[q + 1], nz = Q[q + 2], dist = nx * P[i] + ny * P[i + 1] + nz * P[i + 2] - Q[q + 3];
    if (!(dist < r)) return false;
    c.nx = -nx;
    c.ny = -ny;
    c.nz = -nz;
    c.depth = r - dist;
    c.px = P[i] - nx * dist;
    c.py = P[i + 1] - ny * dist;
    c.pz = P[i + 2] - nz * dist;
    return true;
  }
  function aabbAabb(S, a, b, c) {
    const P = S.pos, Q = S.par, i = a * 3, j = b * 3, qa = a * 4, qb = b * 4;
    const dx = P[j] - P[i], dy = P[j + 1] - P[i + 1], dz = P[j + 2] - P[i + 2];
    const ox = Q[qa] + Q[qb] - Math.abs(dx);
    if (!(ox > 0)) return false;
    const oy = Q[qa + 1] + Q[qb + 1] - Math.abs(dy);
    if (!(oy > 0)) return false;
    const oz = Q[qa + 2] + Q[qb + 2] - Math.abs(dz);
    if (!(oz > 0)) return false;
    c.nx = c.ny = c.nz = 0;
    if (ox <= oy && ox <= oz) {
      c.nx = dx < 0 ? -1 : 1;
      c.depth = ox;
    } else if (oy <= oz) {
      c.ny = dy < 0 ? -1 : 1;
      c.depth = oy;
    } else {
      c.nz = dz < 0 ? -1 : 1;
      c.depth = oz;
    }
    const x0 = Math.max(P[i] - Q[qa], P[j] - Q[qb]), x1 = Math.min(P[i] + Q[qa], P[j] + Q[qb]);
    const y0 = Math.max(P[i + 1] - Q[qa + 1], P[j + 1] - Q[qb + 1]), y1 = Math.min(P[i + 1] + Q[qa + 1], P[j + 1] + Q[qb + 1]);
    const z0 = Math.max(P[i + 2] - Q[qa + 2], P[j + 2] - Q[qb + 2]), z1 = Math.min(P[i + 2] + Q[qa + 2], P[j + 2] + Q[qb + 2]);
    c.px = (x0 + x1) / 2;
    c.py = (y0 + y1) / 2;
    c.pz = (z0 + z1) / 2;
    return true;
  }
  var _R = new Float64Array(9);
  var _AR = new Float64Array(9);
  function boxBox(S, a, b, c) {
    if (S.type[a] === SHAPE_AABB && S.type[b] === SHAPE_AABB) return aabbAabb(S, a, b, c);
    const P = S.pos, Q = S.par, M = S.rotm, i = a * 3, j = b * 3, oa = a * 9, ob = b * 9, qa = a * 4, qb = b * 4;
    const ea0 = Q[qa], ea1 = Q[qa + 1], ea2 = Q[qa + 2], eb0 = Q[qb], eb1 = Q[qb + 1], eb2 = Q[qb + 2];
    const tx = P[j] - P[i], ty = P[j + 1] - P[i + 1], tz = P[j + 2] - P[i + 2];
    for (let m = 0; m < 3; m++) for (let n = 0; n < 3; n++) {
      const v = M[oa + m * 3] * M[ob + n * 3] + M[oa + m * 3 + 1] * M[ob + n * 3 + 1] + M[oa + m * 3 + 2] * M[ob + n * 3 + 2];
      _R[m * 3 + n] = v;
      _AR[m * 3 + n] = Math.abs(v) + 1e-9;
    }
    const t0 = tx * M[oa] + ty * M[oa + 1] + tz * M[oa + 2], t1 = tx * M[oa + 3] + ty * M[oa + 4] + tz * M[oa + 5], t2 = tx * M[oa + 6] + ty * M[oa + 7] + tz * M[oa + 8];
    const ea = [ea0, ea1, ea2], eb = [eb0, eb1, eb2], t = [t0, t1, t2];
    let facePen = Infinity, faceAxis = -1, faceSign = 1, edgePen = Infinity, edgeI = -1, edgeJ = -1, edgeSign = 1;
    for (let m = 0; m < 3; m++) {
      const ra = ea[m], rb = eb0 * _AR[m * 3] + eb1 * _AR[m * 3 + 1] + eb2 * _AR[m * 3 + 2], d = Math.abs(t[m]), pen = ra + rb - d;
      if (!(pen > 0)) return false;
      if (pen < facePen) {
        facePen = pen;
        faceAxis = m;
        faceSign = t[m] < 0 ? -1 : 1;
      }
    }
    for (let n = 0; n < 3; n++) {
      const ra = ea0 * _AR[n] + ea1 * _AR[3 + n] + ea2 * _AR[6 + n], rb = eb[n], proj = t0 * _R[n] + t1 * _R[3 + n] + t2 * _R[6 + n], pen = ra + rb - Math.abs(proj);
      if (!(pen > 0)) return false;
      if (pen < facePen) {
        facePen = pen;
        faceAxis = 3 + n;
        faceSign = proj < 0 ? -1 : 1;
      }
    }
    for (let m = 0; m < 3; m++) for (let n = 0; n < 3; n++) {
      const m1 = (m + 1) % 3, m2 = (m + 2) % 3, n1 = (n + 1) % 3, n2 = (n + 2) % 3, r = _R[m * 3 + n];
      const len2 = 1 - r * r;
      if (len2 < 1e-6) continue;
      const len = Math.sqrt(len2);
      const ra = ea[m1] * _AR[m2 * 3 + n] + ea[m2] * _AR[m1 * 3 + n], rb = eb[n1] * _AR[m * 3 + n2] + eb[n2] * _AR[m * 3 + n1];
      const proj = t[m2] * _R[m1 * 3 + n] - t[m1] * _R[m2 * 3 + n], pen = (ra + rb - Math.abs(proj)) / len;
      if (!(pen > 0)) return false;
      if (pen < edgePen) {
        edgePen = pen;
        edgeI = m;
        edgeJ = n;
        edgeSign = proj < 0 ? -1 : 1;
      }
    }
    let nx, ny, nz, depth;
    if (edgeI >= 0 && edgePen < facePen * 0.95 - 1e-9) {
      const ax = M[oa + edgeI * 3], ay = M[oa + edgeI * 3 + 1], az = M[oa + edgeI * 3 + 2], bx = M[ob + edgeJ * 3], by = M[ob + edgeJ * 3 + 1], bz = M[ob + edgeJ * 3 + 2];
      nx = ay * bz - az * by;
      ny = az * bx - ax * bz;
      nz = ax * by - ay * bx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      if (nx * tx + ny * ty + nz * tz < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      depth = edgePen;
    } else {
      const m = faceAxis < 3 ? oa + faceAxis * 3 : ob + (faceAxis - 3) * 3;
      nx = M[m] * faceSign;
      ny = M[m + 1] * faceSign;
      nz = M[m + 2] * faceSign;
      depth = facePen;
    }
    let sax = P[i], say = P[i + 1], saz = P[i + 2], sbx = P[j], sby = P[j + 1], sbz = P[j + 2];
    for (let m = 0; m < 3; m++) {
      const dA = nx * M[oa + m * 3] + ny * M[oa + m * 3 + 1] + nz * M[oa + m * 3 + 2], sA = (dA < 0 ? -1 : 1) * ea[m];
      sax += sA * M[oa + m * 3];
      say += sA * M[oa + m * 3 + 1];
      saz += sA * M[oa + m * 3 + 2];
      const dB = nx * M[ob + m * 3] + ny * M[ob + m * 3 + 1] + nz * M[ob + m * 3 + 2], sB = (dB < 0 ? -1 : 1) * eb[m];
      sbx -= sB * M[ob + m * 3];
      sby -= sB * M[ob + m * 3 + 1];
      sbz -= sB * M[ob + m * 3 + 2];
    }
    c.nx = nx;
    c.ny = ny;
    c.nz = nz;
    c.depth = depth;
    c.px = (sax + sbx) / 2;
    c.py = (say + sby) / 2;
    c.pz = (saz + sbz) / 2;
    return true;
  }
  var _q = { x: 0, y: 0, z: 0 };
  function boxDist2(lx, ly, lz, hx, hy, hz) {
    const qx = lx < -hx ? -hx : lx > hx ? hx : lx, qy = ly < -hy ? -hy : ly > hy ? hy : ly, qz = lz < -hz ? -hz : lz > hz ? hz : lz;
    _q.x = qx;
    _q.y = qy;
    _q.z = qz;
    const dx = lx - qx, dy = ly - qy, dz = lz - qz;
    return dx * dx + dy * dy + dz * dz;
  }
  function boxCapsule(S, a, b, c) {
    const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, j = b * 3, oa = a * 9, ob = b * 9, qa = a * 4, qb = b * 4;
    const hx = Q[qa], hy = Q[qa + 1], hz = Q[qa + 2], rc = Q[qb], hl = Q[qb + 1];
    const ux = R[ob + 3], uy = R[ob + 4], uz = R[ob + 5];
    const toL = (wx, wy, wz, k) => {
      const dx = wx - P[i], dy = wy - P[i + 1], dz = wz - P[i + 2];
      return dx * R[oa + k * 3] + dy * R[oa + k * 3 + 1] + dz * R[oa + k * 3 + 2];
    };
    const p0x = P[j] - ux * hl, p0y = P[j + 1] - uy * hl, p0z = P[j + 2] - uz * hl, p1x = P[j] + ux * hl, p1y = P[j + 1] + uy * hl, p1z = P[j + 2] + uz * hl;
    const l0x = toL(p0x, p0y, p0z, 0), l0y = toL(p0x, p0y, p0z, 1), l0z = toL(p0x, p0y, p0z, 2);
    const dX = toL(p1x, p1y, p1z, 0) - l0x, dY = toL(p1x, p1y, p1z, 1) - l0y, dZ = toL(p1x, p1y, p1z, 2) - l0z;
    let s0 = 0, s1 = 1, hit = true;
    const slab = (l, d, h) => {
      if (Math.abs(d) < 1e-14) {
        if (Math.abs(l) > h) hit = false;
        return;
      }
      let ta = (-h - l) / d, tb = (h - l) / d;
      if (ta > tb) {
        const x = ta;
        ta = tb;
        tb = x;
      }
      if (ta > s0) s0 = ta;
      if (tb < s1) s1 = tb;
      if (s0 > s1) hit = false;
    };
    slab(l0x, dX, hx);
    if (hit) slab(l0y, dY, hy);
    if (hit) slab(l0z, dZ, hz);
    let nlx, nly, nlz, depth, sx, sy, sz;
    if (hit) {
      const lo = [l0x, l0y, l0z], dd = [dX, dY, dZ], hh = [hx, hy, hz];
      let best = Infinity, bk = 0, bs = 1, ex = 0;
      for (let k = 0; k < 3; k++) {
        const e0 = lo[k], e1 = lo[k] + dd[k], mn = e0 < e1 ? e0 : e1, mx = e0 < e1 ? e1 : e0;
        const up = hh[k] + rc - mn, dn = mx + rc + hh[k];
        if (up < best) {
          best = up;
          bk = k;
          bs = 1;
          ex = mn;
        }
        if (dn < best) {
          best = dn;
          bk = k;
          bs = -1;
          ex = mx;
        }
      }
      nlx = nly = nlz = 0;
      depth = best;
      const tEx = Math.abs(dd[bk]) < 1e-14 ? 0.5 : (ex - lo[bk]) / dd[bk];
      sx = l0x + dX * tEx;
      sy = l0y + dY * tEx;
      sz = l0z + dZ * tEx;
      if (bk === 0) {
        nlx = bs;
        sx = bs * hx;
      } else if (bk === 1) {
        nly = bs;
        sy = bs * hy;
      } else {
        nlz = bs;
        sz = bs * hz;
      }
    } else {
      let lo = 0, hi = 1;
      for (let it = 0; it < 56; it++) {
        const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
        const f1 = boxDist2(l0x + dX * m1, l0y + dY * m1, l0z + dZ * m1, hx, hy, hz), f2 = boxDist2(l0x + dX * m2, l0y + dY * m2, l0z + dZ * m2, hx, hy, hz);
        if (f1 < f2) hi = m2;
        else lo = m1;
      }
      const tb = (lo + hi) / 2;
      let best = tb, bf = boxDist2(l0x + dX * tb, l0y + dY * tb, l0z + dZ * tb, hx, hy, hz);
      for (const e of [0, 1]) {
        const f2 = boxDist2(l0x + dX * e, l0y + dY * e, l0z + dZ * e, hx, hy, hz);
        if (f2 < bf) {
          bf = f2;
          best = e;
        }
      }
      const f = boxDist2(l0x + dX * best, l0y + dY * best, l0z + dZ * best, hx, hy, hz);
      if (!(f < rc * rc)) return false;
      const d = Math.sqrt(f);
      sx = _q.x;
      sy = _q.y;
      sz = _q.z;
      nlx = (l0x + dX * best - sx) / d;
      nly = (l0y + dY * best - sy) / d;
      nlz = (l0z + dZ * best - sz) / d;
      depth = rc - d;
    }
    c.nx = nlx * R[oa] + nly * R[oa + 3] + nlz * R[oa + 6];
    c.ny = nlx * R[oa + 1] + nly * R[oa + 4] + nlz * R[oa + 7];
    c.nz = nlx * R[oa + 2] + nly * R[oa + 5] + nlz * R[oa + 8];
    c.depth = depth;
    c.px = P[i] + sx * R[oa] + sy * R[oa + 3] + sz * R[oa + 6];
    c.py = P[i + 1] + sx * R[oa + 1] + sy * R[oa + 4] + sz * R[oa + 7];
    c.pz = P[i + 2] + sx * R[oa + 2] + sy * R[oa + 5] + sz * R[oa + 8];
    return true;
  }
  function boxPlane(S, a, b, c) {
    const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, o = a * 9, q = a * 4, pq = b * 4;
    const nx = Q[pq], ny = Q[pq + 1], nz = Q[pq + 2];
    let dist = nx * P[i] + ny * P[i + 1] + nz * P[i + 2] - Q[pq + 3], vx = P[i], vy = P[i + 1], vz = P[i + 2];
    for (let m = 0; m < 3; m++) {
      const dn = nx * R[o + m * 3] + ny * R[o + m * 3 + 1] + nz * R[o + m * 3 + 2], h = Q[q + m], s = dn < 0 ? -1 : 1;
      dist -= Math.abs(dn) * h;
      vx -= s * h * R[o + m * 3];
      vy -= s * h * R[o + m * 3 + 1];
      vz -= s * h * R[o + m * 3 + 2];
    }
    if (!(dist < 0)) return false;
    c.nx = -nx;
    c.ny = -ny;
    c.nz = -nz;
    c.depth = -dist;
    c.px = vx;
    c.py = vy;
    c.pz = vz;
    return true;
  }
  var _cs = { s: 0, t: 0 };
  function closestSegSeg(p1x, p1y, p1z, q1x, q1y, q1z, p2x, p2y, p2z, q2x, q2y, q2z) {
    const d1x = q1x - p1x, d1y = q1y - p1y, d1z = q1z - p1z, d2x = q2x - p2x, d2y = q2y - p2y, d2z = q2z - p2z, rx = p1x - p2x, ry = p1y - p2y, rz = p1z - p2z;
    const a = d1x * d1x + d1y * d1y + d1z * d1z, e = d2x * d2x + d2y * d2y + d2z * d2z, f = d2x * rx + d2y * ry + d2z * rz;
    const cl = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
    let s, t;
    if (a <= EPS && e <= EPS) {
      s = 0;
      t = 0;
    } else if (a <= EPS) {
      s = 0;
      t = cl(f / e);
    } else {
      const cc = d1x * rx + d1y * ry + d1z * rz;
      if (e <= EPS) {
        t = 0;
        s = cl(-cc / a);
      } else {
        const b = d1x * d2x + d1y * d2y + d1z * d2z, denom = a * e - b * b;
        s = denom > 1e-14 * a * e ? cl((b * f - cc * e) / denom) : 0;
        t = (b * s + f) / e;
        if (t < 0) {
          t = 0;
          s = cl(-cc / a);
        } else if (t > 1) {
          t = 1;
          s = cl((b - cc) / a);
        }
      }
    }
    _cs.s = s;
    _cs.t = t;
  }
  function capsuleCapsule(S, a, b, c) {
    const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, j = b * 3, oa = a * 9, ob = b * 9, ra = Q[a * 4], rb = Q[b * 4], ha = Q[a * 4 + 1], hb = Q[b * 4 + 1];
    const aux = R[oa + 3], auy = R[oa + 4], auz = R[oa + 5], bux = R[ob + 3], buy = R[ob + 4], buz = R[ob + 5];
    closestSegSeg(
      P[i] - aux * ha,
      P[i + 1] - auy * ha,
      P[i + 2] - auz * ha,
      P[i] + aux * ha,
      P[i + 1] + auy * ha,
      P[i + 2] + auz * ha,
      P[j] - bux * hb,
      P[j + 1] - buy * hb,
      P[j + 2] - buz * hb,
      P[j] + bux * hb,
      P[j + 1] + buy * hb,
      P[j + 2] + buz * hb
    );
    const sa = (_cs.s * 2 - 1) * ha, sb = (_cs.t * 2 - 1) * hb;
    const c1x = P[i] + aux * sa, c1y = P[i + 1] + auy * sa, c1z = P[i + 2] + auz * sa, c2x = P[j] + bux * sb, c2y = P[j + 1] + buy * sb, c2z = P[j + 2] + buz * sb;
    const dx = c2x - c1x, dy = c2y - c1y, dz = c2z - c1z, rr = ra + rb, d2 = dx * dx + dy * dy + dz * dz;
    if (!(d2 < rr * rr)) return false;
    const d = Math.sqrt(d2);
    if (d > EPS) {
      c.nx = dx / d;
      c.ny = dy / d;
      c.nz = dz / d;
    } else {
      let nx = auy * buz - auz * buy, ny = auz * bux - aux * buz, nz = aux * buy - auy * bux;
      const l = Math.hypot(nx, ny, nz);
      if (l > 1e-9) {
        c.nx = nx / l;
        c.ny = ny / l;
        c.nz = nz / l;
      } else {
        perp(aux, auy, auz, _p);
        c.nx = _p.x;
        c.ny = _p.y;
        c.nz = _p.z;
      }
    }
    c.depth = rr - d;
    const k = ra - c.depth * 0.5;
    c.px = c1x + c.nx * k;
    c.py = c1y + c.ny * k;
    c.pz = c1z + c.nz * k;
    return true;
  }
  function capsulePlane(S, a, b, c) {
    const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, o = a * 9, pq = b * 4, rc = Q[a * 4], h = Q[a * 4 + 1];
    const nx = Q[pq], ny = Q[pq + 1], nz = Q[pq + 2], ux = R[o + 3], uy = R[o + 4], uz = R[o + 5];
    const dc = nx * P[i] + ny * P[i + 1] + nz * P[i + 2] - Q[pq + 3], da = (nx * ux + ny * uy + nz * uz) * h;
    const s = da > 0 ? -1 : 1, m = dc - Math.abs(da);
    if (!(m < rc)) return false;
    c.nx = -nx;
    c.ny = -ny;
    c.nz = -nz;
    c.depth = rc - m;
    const ex = P[i] + s * ux * h, ey = P[i + 1] + s * uy * h, ez = P[i + 2] + s * uz * h;
    c.px = ex - nx * m;
    c.py = ey - ny * m;
    c.pz = ez - nz * m;
    return true;
  }
  var none = () => false;
  var DISPATCH = [
    /* 球     */
    [sphereSphere, sphereBox, sphereBox, sphereCapsule, spherePlane],
    /* AABB   */
    [null, boxBox, boxBox, boxCapsule, boxPlane],
    /* OBB    */
    [null, null, boxBox, boxCapsule, boxPlane],
    /* カプセル */
    [null, null, null, capsuleCapsule, capsulePlane],
    /* 平面   */
    [null, null, null, null, none]
  ];
  function collide(S, a, b, c) {
    const ta = S.type[a], tb = S.type[b];
    if (ta <= tb) return DISPATCH[ta][tb](S, a, b, c);
    if (!DISPATCH[tb][ta](S, b, a, c)) return false;
    c.nx = -c.nx;
    c.ny = -c.ny;
    c.nz = -c.nz;
    return true;
  }
  function pointDistance(S, i, x, y, z, c) {
    const P = S.pos, Q = S.par, R = S.rotm, j = i * 3, o = i * 9, q = i * 4;
    switch (S.type[i]) {
      case SHAPE_SPHERE2: {
        const dx = x - P[j], dy = y - P[j + 1], dz = z - P[j + 2], d = Math.hypot(dx, dy, dz), r = Q[q];
        if (d > EPS) {
          c.nx = dx / d;
          c.ny = dy / d;
          c.nz = dz / d;
        } else {
          c.nx = 0;
          c.ny = 1;
          c.nz = 0;
        }
        c.px = P[j] + c.nx * r;
        c.py = P[j + 1] + c.ny * r;
        c.pz = P[j + 2] + c.nz * r;
        return d - r;
      }
      case SHAPE_AABB:
      case SHAPE_OBB: {
        const dx = x - P[j], dy = y - P[j + 1], dz = z - P[j + 2], hx = Q[q], hy = Q[q + 1], hz = Q[q + 2];
        const lx = dx * R[o] + dy * R[o + 1] + dz * R[o + 2], ly = dx * R[o + 3] + dy * R[o + 4] + dz * R[o + 5], lz = dx * R[o + 6] + dy * R[o + 7] + dz * R[o + 8];
        const d2 = boxDist2(lx, ly, lz, hx, hy, hz);
        let nlx, nly, nlz, dist, sx = _q.x, sy = _q.y, sz = _q.z;
        if (d2 > 0) {
          dist = Math.sqrt(d2);
          nlx = (lx - sx) / dist;
          nly = (ly - sy) / dist;
          nlz = (lz - sz) / dist;
        } else {
          const fx = hx - Math.abs(lx), fy = hy - Math.abs(ly), fz = hz - Math.abs(lz);
          nlx = nly = nlz = 0;
          sx = lx;
          sy = ly;
          sz = lz;
          if (fx <= fy && fx <= fz) {
            const s = lx < 0 ? -1 : 1;
            nlx = s;
            sx = s * hx;
            dist = -fx;
          } else if (fy <= fz) {
            const s = ly < 0 ? -1 : 1;
            nly = s;
            sy = s * hy;
            dist = -fy;
          } else {
            const s = lz < 0 ? -1 : 1;
            nlz = s;
            sz = s * hz;
            dist = -fz;
          }
        }
        c.nx = nlx * R[o] + nly * R[o + 3] + nlz * R[o + 6];
        c.ny = nlx * R[o + 1] + nly * R[o + 4] + nlz * R[o + 7];
        c.nz = nlx * R[o + 2] + nly * R[o + 5] + nlz * R[o + 8];
        c.px = P[j] + sx * R[o] + sy * R[o + 3] + sz * R[o + 6];
        c.py = P[j + 1] + sx * R[o + 1] + sy * R[o + 4] + sz * R[o + 7];
        c.pz = P[j + 2] + sx * R[o + 2] + sy * R[o + 5] + sz * R[o + 8];
        return dist;
      }
      case SHAPE_CAPSULE: {
        const ux = R[o + 3], uy = R[o + 4], uz = R[o + 5], h = Q[q + 1], r = Q[q], dx0 = x - P[j], dy0 = y - P[j + 1], dz0 = z - P[j + 2];
        let t = dx0 * ux + dy0 * uy + dz0 * uz;
        t = t < -h ? -h : t > h ? h : t;
        const cx = P[j] + ux * t, cy = P[j + 1] + uy * t, cz = P[j + 2] + uz * t, dx = x - cx, dy = y - cy, dz = z - cz, d = Math.hypot(dx, dy, dz);
        if (d > EPS) {
          c.nx = dx / d;
          c.ny = dy / d;
          c.nz = dz / d;
        } else {
          perp(ux, uy, uz, _p);
          c.nx = _p.x;
          c.ny = _p.y;
          c.nz = _p.z;
        }
        c.px = cx + c.nx * r;
        c.py = cy + c.ny * r;
        c.pz = cz + c.nz * r;
        return d - r;
      }
      default: {
        const nx = Q[q], ny = Q[q + 1], nz = Q[q + 2], d = nx * x + ny * y + nz * z - Q[q + 3];
        c.nx = nx;
        c.ny = ny;
        c.nz = nz;
        c.px = x - nx * d;
        c.py = y - ny * d;
        c.pz = z - nz * d;
        return d;
      }
    }
  }
  var RayHit = class {
    constructor() {
      this.t = 0;
      this.nx = 0;
      this.ny = 0;
      this.nz = 0;
      this.inside = false;
    }
  };
  function rayShape(S, i, ox, oy, oz, dx, dy, dz, tmax, h, inflate = 0) {
    const P = S.pos, Q = S.par, R = S.rotm, j = i * 3, o = i * 9, q = i * 4;
    h.inside = false;
    switch (S.type[i]) {
      case SHAPE_SPHERE2:
        return raySphere(P[j], P[j + 1], P[j + 2], Q[q] + inflate, ox, oy, oz, dx, dy, dz, tmax, h);
      case SHAPE_AABB:
      case SHAPE_OBB: {
        const rx = ox - P[j], ry = oy - P[j + 1], rz = oz - P[j + 2];
        const lox = rx * R[o] + ry * R[o + 1] + rz * R[o + 2], loy = rx * R[o + 3] + ry * R[o + 4] + rz * R[o + 5], loz = rx * R[o + 6] + ry * R[o + 7] + rz * R[o + 8];
        const ldx = dx * R[o] + dy * R[o + 1] + dz * R[o + 2], ldy = dx * R[o + 3] + dy * R[o + 4] + dz * R[o + 5], ldz = dx * R[o + 6] + dy * R[o + 7] + dz * R[o + 8];
        const lo = [lox, loy, loz], ld = [ldx, ldy, ldz];
        let t0 = 0, t1 = tmax, ax = -1, sg = 0;
        for (let k = 0; k < 3; k++) {
          const e = Q[q + k] + inflate;
          if (Math.abs(ld[k]) < 1e-14) {
            if (lo[k] < -e || lo[k] > e) return false;
            continue;
          }
          let a = (-e - lo[k]) / ld[k], b = (e - lo[k]) / ld[k], s = -1;
          if (a > b) {
            const x = a;
            a = b;
            b = x;
            s = 1;
          }
          if (a > t0) {
            t0 = a;
            ax = k;
            sg = s;
          }
          if (b < t1) t1 = b;
          if (t0 > t1) return false;
        }
        h.t = t0;
        if (ax < 0) {
          h.inside = true;
          h.nx = -dx;
          h.ny = -dy;
          h.nz = -dz;
          return true;
        }
        const nl = [0, 0, 0];
        nl[ax] = sg;
        h.nx = nl[0] * R[o] + nl[1] * R[o + 3] + nl[2] * R[o + 6];
        h.ny = nl[0] * R[o + 1] + nl[1] * R[o + 4] + nl[2] * R[o + 7];
        h.nz = nl[0] * R[o + 2] + nl[1] * R[o + 5] + nl[2] * R[o + 8];
        return true;
      }
      case SHAPE_CAPSULE:
        return rayCapsule(P[j], P[j + 1], P[j + 2], R[o + 3], R[o + 4], R[o + 5], Q[q + 1], Q[q] + inflate, ox, oy, oz, dx, dy, dz, tmax, h);
      default: {
        const nx = Q[q], ny = Q[q + 1], nz = Q[q + 2], off = Q[q + 3] + inflate, dist0 = nx * ox + ny * oy + nz * oz - off, den = nx * dx + ny * dy + nz * dz;
        if (dist0 <= 0) {
          h.t = 0;
          h.inside = true;
          h.nx = nx;
          h.ny = ny;
          h.nz = nz;
          return true;
        }
        if (den >= 0) return false;
        const t = -dist0 / den;
        if (t > tmax) return false;
        h.t = t;
        h.nx = nx;
        h.ny = ny;
        h.nz = nz;
        return true;
      }
    }
  }
  function raySphere(cx, cy, cz, r, ox, oy, oz, dx, dy, dz, tmax, h) {
    const mx = ox - cx, my = oy - cy, mz = oz - cz, b = mx * dx + my * dy + mz * dz, cc = mx * mx + my * my + mz * mz - r * r;
    if (cc <= 0) {
      h.t = 0;
      h.inside = true;
      h.nx = -dx;
      h.ny = -dy;
      h.nz = -dz;
      return true;
    }
    if (b > 0) return false;
    const disc = b * b - cc;
    if (disc < 0) return false;
    const t = -b - Math.sqrt(disc);
    if (t > tmax) return false;
    h.t = t;
    h.nx = (mx + dx * t) / r;
    h.ny = (my + dy * t) / r;
    h.nz = (mz + dz * t) / r;
    return true;
  }
  function rayCapsule(cx, cy, cz, ux, uy, uz, hl, r, ox, oy, oz, dx, dy, dz, tmax, h) {
    const mx = ox - cx, my = oy - cy, mz = oz - cz, oa = mx * ux + my * uy + mz * uz;
    const s0 = oa < -hl ? -hl : oa > hl ? hl : oa, ex = mx - ux * s0, ey = my - uy * s0, ez = mz - uz * s0;
    if (ex * ex + ey * ey + ez * ez <= r * r) {
      h.t = 0;
      h.inside = true;
      h.nx = -dx;
      h.ny = -dy;
      h.nz = -dz;
      return true;
    }
    let best = Infinity, bnx = 0, bny = 0, bnz = 0;
    const da = dx * ux + dy * uy + dz * uz, opx = mx - ux * oa, opy = my - uy * oa, opz = mz - uz * oa, dpx = dx - ux * da, dpy = dy - uy * da, dpz = dz - uz * da;
    const A = dpx * dpx + dpy * dpy + dpz * dpz, B = opx * dpx + opy * dpy + opz * dpz, C = opx * opx + opy * opy + opz * opz - r * r;
    if (A > 1e-14) {
      const disc = B * B - A * C;
      if (disc >= 0) {
        const t = (-B - Math.sqrt(disc)) / A;
        if (t >= 0 && t <= tmax) {
          const s = oa + da * t;
          if (s >= -hl && s <= hl) {
            best = t;
            bnx = (opx + dpx * t) / r;
            bny = (opy + dpy * t) / r;
            bnz = (opz + dpz * t) / r;
          }
        }
      }
    }
    for (const e of [-hl, hl]) {
      const sx = cx + ux * e, sy = cy + uy * e, sz = cz + uz * e, px = ox - sx, py = oy - sy, pz = oz - sz, b = px * dx + py * dy + pz * dz, cc = px * px + py * py + pz * pz - r * r;
      if (b > 0 && cc > 0) continue;
      const disc = b * b - cc;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t < 0 || t > tmax || t >= best) continue;
      const hx = px + dx * t, hy = py + dy * t, hz = pz + dz * t, side = (hx * ux + hy * uy + hz * uz) * (e < 0 ? -1 : 1);
      if (side >= 0) {
        best = t;
        bnx = hx / r;
        bny = hy / r;
        bnz = hz / r;
      }
    }
    if (best === Infinity) return false;
    h.t = best;
    h.nx = bnx;
    h.ny = bny;
    h.nz = bnz;
    return true;
  }
  var _hit = new RayHit();
  var _pc = new Contact();
  function sweepSphere(S, i, x, y, z, r, dx, dy, dz, c) {
    const len = Math.hypot(dx, dy, dz), type = S.type[i];
    if (len < 1e-12) {
      const d = pointDistance(S, i, x, y, z, _pc) - r;
      if (d > 0) return false;
      fillSweep(S, i, x, y, z, r, 0, c);
      return true;
    }
    const ux = dx / len, uy = dy / len, uz = dz / len;
    if (type !== SHAPE_AABB && type !== SHAPE_OBB) {
      if (!rayShape(S, i, x, y, z, ux, uy, uz, len, _hit, r)) return false;
      fillSweep(S, i, x, y, z, r, _hit.t / len, c, dx, dy, dz, _hit);
      return true;
    }
    const eps = 1e-7 * (1 + r);
    let t = 0;
    for (let it = 0; it < 64; it++) {
      const px = x + dx * t, py = y + dy * t, pz = z + dz * t, d = pointDistance(S, i, px, py, pz, _pc) - r;
      if (d <= eps) {
        fillSweep(S, i, x, y, z, r, t, c, dx, dy, dz);
        return true;
      }
      const slope = _pc.nx * dx + _pc.ny * dy + _pc.nz * dz;
      if (slope >= 0) return false;
      if (t >= 1) return false;
      t += d / -slope;
      if (t > 1) t = 1;
    }
    fillSweep(S, i, x, y, z, r, t, c, dx, dy, dz);
    return true;
  }
  function fillSweep(S, i, x, y, z, r, t, c, dx = 0, dy = 0, dz = 0) {
    const px = x + dx * t, py = y + dy * t, pz = z + dz * t, d = pointDistance(S, i, px, py, pz, _pc) - r;
    c.nx = _pc.nx;
    c.ny = _pc.ny;
    c.nz = _pc.nz;
    c.px = _pc.px;
    c.py = _pc.py;
    c.pz = _pc.pz;
    c.depth = d < 0 ? -d : 0;
    c.toi = t;
  }

  // src/collision/flags.js
  var F_ENABLED = 1;
  var F_STATIC = 2;
  var F_TRIGGER = 4;
  var F_CONTINUOUS = 8;

  // src/collision/broadphase.js
  var overlap = (A, i, j) => A[i * 6] <= A[j * 6 + 3] && A[i * 6 + 3] >= A[j * 6] && A[i * 6 + 1] <= A[j * 6 + 4] && A[i * 6 + 4] >= A[j * 6 + 1] && A[i * 6 + 2] <= A[j * 6 + 5] && A[i * 6 + 5] >= A[j * 6 + 2];
  function rayAABB(A, o, ox, oy, oz, ix, iy, iz, tmax) {
    let t0 = 0, t1 = tmax, a, b, t;
    a = (A[o] - ox) * ix;
    b = (A[o + 3] - ox) * ix;
    if (a > b) {
      t = a;
      a = b;
      b = t;
    }
    if (a > t0) t0 = a;
    if (b < t1) t1 = b;
    if (t0 > t1) return Infinity;
    a = (A[o + 1] - oy) * iy;
    b = (A[o + 4] - oy) * iy;
    if (a > b) {
      t = a;
      a = b;
      b = t;
    }
    if (a > t0) t0 = a;
    if (b < t1) t1 = b;
    if (t0 > t1) return Infinity;
    a = (A[o + 2] - oz) * iz;
    b = (A[o + 5] - oz) * iz;
    if (a > b) {
      t = a;
      a = b;
      b = t;
    }
    if (a > t0) t0 = a;
    if (b < t1) t1 = b;
    if (t0 > t1) return Infinity;
    return t0;
  }
  var NaNsafe = (v) => v !== v ? 0 : v;
  var BruteForceBroadphase = class {
    constructor(world) {
      this.W = world;
      this.dyn = new Int32Array(0);
      this.nDyn = 0;
      this.stat = new Int32Array(0);
      this.nStat = 0;
      this.stats = { tests: 0 };
      this.kind = "brute";
    }
    setLists(d, nd, s, ns) {
      this.dyn = d;
      this.nDyn = nd;
      this.stat = s;
      this.nStat = ns;
    }
    markStaticDirty() {
    }
    insert() {
    }
    remove() {
    }
    update() {
    }
    prepare() {
    }
    findPairs(cb) {
      const A = this.W.aabb, d = this.dyn, s = this.stat;
      let tests = 0;
      for (let a = 0; a < this.nDyn; a++) {
        const i = d[a];
        for (let b = a + 1; b < this.nDyn; b++) {
          tests++;
          if (overlap(A, i, d[b])) cb(i, d[b]);
        }
        for (let b = 0; b < this.nStat; b++) {
          tests++;
          if (overlap(A, i, s[b])) cb(i, s[b]);
        }
      }
      this.stats.tests = tests;
    }
    queryAABB(x0, y0, z0, x1, y1, z1, cb) {
      const A = this.W.aabb;
      const test = (i) => {
        const o = i * 6;
        this.stats.tests++;
        if (A[o] <= x1 && A[o + 3] >= x0 && A[o + 1] <= y1 && A[o + 4] >= y0 && A[o + 2] <= z1 && A[o + 5] >= z0) cb(i);
      };
      for (let a = 0; a < this.nDyn; a++) test(this.dyn[a]);
      for (let a = 0; a < this.nStat; a++) test(this.stat[a]);
    }
    raycast(ox, oy, oz, dx, dy, dz, tmax, fn) {
      for (let a = 0; a < this.nDyn; a++) tmax = fn(this.dyn[a], tmax);
      for (let a = 0; a < this.nStat; a++) tmax = fn(this.stat[a], tmax);
      return tmax;
    }
    debugCells() {
    }
  };
  var hash3 = (x, y, z) => Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791);
  var HashSet = class {
    constructor(bp) {
      this.bp = bp;
      this.n = 0;
      this.list = null;
      this.cap = 0;
      this.cr = new Int32Array(0);
      this.sm = new Int32Array(0);
      this.large = new Int32Array(0);
      this.nSmall = 0;
      this.nLarge = 0;
      this.size = 0;
      this.mask = 0;
      this.starts = new Int32Array(2);
      this.cursor = new Int32Array(1);
      this.items = new Int32Array(0);
      this.bstamp = new Int32Array(1);
      this.base = 0;
      this.bmin = [Infinity, Infinity, Infinity];
      this.bmax = [-Infinity, -Infinity, -Infinity];
      this.cellsUsed = 0;
    }
    build(list, n, cell, maxSpan) {
      const A = this.bp.W.aabb, inv = 1 / cell;
      this.list = list;
      this.n = n;
      this.cell = cell;
      this.inv = inv;
      this.maxSpan = maxSpan;
      if (this.cap < n) {
        this.cap = Math.max(n, this.cap * 2, 16);
        this.cr = new Int32Array(this.cap * 6);
        this.sm = new Int32Array(this.cap);
        this.large = new Int32Array(this.cap);
      }
      const cr = this.cr, sm = this.sm, large = this.large;
      let ns = 0, nl = 0, total = 0;
      let bx0 = Infinity, by0 = Infinity, bz0 = Infinity, bx1 = -Infinity, by1 = -Infinity, bz1 = -Infinity;
      for (let k = 0; k < n; k++) {
        const i = list[k], o = i * 6;
        const x0 = Math.floor(A[o] * inv), y0 = Math.floor(A[o + 1] * inv), z0 = Math.floor(A[o + 2] * inv), x1 = Math.floor(A[o + 3] * inv), y1 = Math.floor(A[o + 4] * inv), z1 = Math.floor(A[o + 5] * inv);
        if (A[o] < bx0) bx0 = A[o];
        if (A[o + 1] < by0) by0 = A[o + 1];
        if (A[o + 2] < bz0) bz0 = A[o + 2];
        if (A[o + 3] > bx1) bx1 = A[o + 3];
        if (A[o + 4] > by1) by1 = A[o + 4];
        if (A[o + 5] > bz1) bz1 = A[o + 5];
        const span = (x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1);
        if (!(span <= maxSpan)) {
          large[nl++] = i;
          continue;
        }
        const r = ns * 6;
        cr[r] = x0;
        cr[r + 1] = y0;
        cr[r + 2] = z0;
        cr[r + 3] = x1;
        cr[r + 4] = y1;
        cr[r + 5] = z1;
        sm[ns++] = i;
        total += span;
      }
      this.nSmall = ns;
      this.nLarge = nl;
      this.bmin = [bx0, by0, bz0];
      this.bmax = [bx1, by1, bz1];
      let size = 16;
      while (size < total * 2) size <<= 1;
      if (size !== this.size) {
        this.size = size;
        this.mask = size - 1;
        this.starts = new Int32Array(size + 1);
        this.cursor = new Int32Array(size);
        this.bstamp = new Int32Array(size);
        this.base = 0;
      }
      if (this.items.length < total) this.items = new Int32Array(Math.max(total, this.items.length * 2, 16));
      const starts = this.starts, mask = this.mask, bst = this.bstamp;
      starts.fill(0);
      if (this.base > 1073741823 - 2 * ns - 4) {
        bst.fill(0);
        this.base = 0;
      }
      const s1 = this.base;
      this.base += ns + 1;
      const s2 = this.base;
      this.base += ns + 1;
      for (let s = 0; s < ns; s++) {
        const r = s * 6, tag = s1 + s + 1;
        for (let z = cr[r + 2]; z <= cr[r + 5]; z++) for (let y = cr[r + 1]; y <= cr[r + 4]; y++) for (let x = cr[r]; x <= cr[r + 3]; x++) {
          const b = hash3(x, y, z) & mask;
          if (bst[b] === tag) continue;
          bst[b] = tag;
          starts[b + 1]++;
        }
      }
      let used = 0;
      for (let b = 0; b < size; b++) {
        if (starts[b + 1] > 0) used++;
        starts[b + 1] += starts[b];
      }
      this.cellsUsed = used;
      this.cursor.set(starts.subarray(0, size));
      const cursor = this.cursor, items = this.items;
      for (let s = 0; s < ns; s++) {
        const r = s * 6, tag = s2 + s + 1, i = sm[s];
        for (let z = cr[r + 2]; z <= cr[r + 5]; z++) for (let y = cr[r + 1]; y <= cr[r + 4]; y++) for (let x = cr[r]; x <= cr[r + 3]; x++) {
          const b = hash3(x, y, z) & mask;
          if (bst[b] === tag) continue;
          bst[b] = tag;
          items[cursor[b]++] = i;
        }
      }
    }
    /** 集合内の全ペア（AABB が重なるもの）を 1 回ずつ。 */
    pairs(cb) {
      const A = this.bp.W.aabb, starts = this.starts, items = this.items, mask = this.mask, inv = this.inv;
      let tests = 0;
      for (let b = 0; b < this.size; b++) {
        const s = starts[b], e = starts[b + 1];
        if (e - s < 2) continue;
        for (let p = s; p < e; p++) {
          const i = items[p], oi = i * 6, ix0 = A[oi], iy0 = A[oi + 1], iz0 = A[oi + 2], ix1 = A[oi + 3], iy1 = A[oi + 4], iz1 = A[oi + 5];
          for (let q = p + 1; q < e; q++) {
            const j = items[q], oj = j * 6;
            tests++;
            if (ix0 > A[oj + 3] || ix1 < A[oj] || iy0 > A[oj + 4] || iy1 < A[oj + 1] || iz0 > A[oj + 5] || iz1 < A[oj + 2]) continue;
            const rx = Math.floor((ix0 > A[oj] ? ix0 : A[oj]) * inv), ry = Math.floor((iy0 > A[oj + 1] ? iy0 : A[oj + 1]) * inv), rz = Math.floor((iz0 > A[oj + 2] ? iz0 : A[oj + 2]) * inv);
            if ((hash3(rx, ry, rz) & mask) !== b) continue;
            cb(i, j);
          }
        }
      }
      const sm = this.sm, large = this.large;
      for (let a = 0; a < this.nLarge; a++) {
        const L = large[a];
        for (let s = 0; s < this.nSmall; s++) {
          tests++;
          if (overlap(A, L, sm[s])) cb(L, sm[s]);
        }
        for (let b = a + 1; b < this.nLarge; b++) {
          tests++;
          if (overlap(A, L, large[b])) cb(L, large[b]);
        }
      }
      this.bp.stats.tests += tests;
    }
    query(x0, y0, z0, x1, y1, z1, cb) {
      const A = this.bp.W.aabb, inv = this.inv;
      let tests = 0;
      if (this.nSmall > 0) {
        const cx0 = Math.floor(x0 * inv), cy0 = Math.floor(y0 * inv), cz0 = Math.floor(z0 * inv), cx1 = Math.floor(x1 * inv), cy1 = Math.floor(y1 * inv), cz1 = Math.floor(z1 * inv);
        const span = (cx1 - cx0 + 1) * (cy1 - cy0 + 1) * (cz1 - cz0 + 1), sm = this.sm;
        if (span <= this.maxSpan) {
          const qs = this.bp._nextStamp(), qstamp = this.bp.qstamp, starts = this.starts, items = this.items, mask = this.mask;
          for (let z = cz0; z <= cz1; z++) for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) {
            const b = hash3(x, y, z) & mask;
            for (let p = starts[b], e = starts[b + 1]; p < e; p++) {
              const i = items[p];
              if (qstamp[i] === qs) continue;
              qstamp[i] = qs;
              tests++;
              const o = i * 6;
              if (A[o] <= x1 && A[o + 3] >= x0 && A[o + 1] <= y1 && A[o + 4] >= y0 && A[o + 2] <= z1 && A[o + 5] >= z0) cb(i);
            }
          }
        } else {
          for (let s = 0; s < this.nSmall; s++) {
            const i = sm[s], o = i * 6;
            tests++;
            if (A[o] <= x1 && A[o + 3] >= x0 && A[o + 1] <= y1 && A[o + 4] >= y0 && A[o + 2] <= z1 && A[o + 5] >= z0) cb(i);
          }
        }
      }
      for (let a = 0; a < this.nLarge; a++) {
        const i = this.large[a], o = i * 6;
        tests++;
        if (A[o] <= x1 && A[o + 3] >= x0 && A[o + 1] <= y1 && A[o + 4] >= y0 && A[o + 2] <= z1 && A[o + 5] >= z0) cb(i);
      }
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
        if (Math.abs(d3[k]) < 1e-14) {
          if (o3[k] < b0[k] || o3[k] > b1[k]) return tmax;
          continue;
        }
        let a = (b0[k] - o3[k]) / d3[k], b = (b1[k] - o3[k]) / d3[k];
        if (a > b) {
          const t = a;
          a = b;
          b = t;
        }
        if (a > t0) t0 = a;
        if (b < t1) t1 = b;
        if (t0 > t1) return tmax;
      }
      const px = ox + dx * t0, py = oy + dy * t0, pz = oz + dz * t0;
      let cx = Math.floor(px * inv), cy = Math.floor(py * inv), cz = Math.floor(pz * inv);
      const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
      let tmx = Math.abs(dx) < 1e-14 ? Infinity : ((dx > 0 ? (cx + 1) * cell : cx * cell) - ox) / dx;
      let tmy = Math.abs(dy) < 1e-14 ? Infinity : ((dy > 0 ? (cy + 1) * cell : cy * cell) - oy) / dy;
      let tmz = Math.abs(dz) < 1e-14 ? Infinity : ((dz > 0 ? (cz + 1) * cell : cz * cell) - oz) / dz;
      const tdx = Math.abs(dx) < 1e-14 ? Infinity : cell / Math.abs(dx), tdy = Math.abs(dy) < 1e-14 ? Infinity : cell / Math.abs(dy), tdz = Math.abs(dz) < 1e-14 ? Infinity : cell / Math.abs(dz);
      const maxSteps = Math.min(2e6, Math.ceil((b1[0] - b0[0] + b1[1] - b0[1] + b1[2] - b0[2]) * inv) + 8);
      const qs = this.bp._nextStamp(), qstamp = this.bp.qstamp, starts = this.starts, items = this.items, mask = this.mask;
      for (let step = 0; step < maxSteps; step++) {
        const b = hash3(cx, cy, cz) & mask;
        for (let p = starts[b], e = starts[b + 1]; p < e; p++) {
          const i = items[p];
          if (qstamp[i] === qs) continue;
          qstamp[i] = qs;
          tmax = fn(i, tmax);
        }
        const tn = tmx < tmy ? tmx < tmz ? tmx : tmz : tmy < tmz ? tmy : tmz;
        if (tn > tmax || tn > t1 + 1e-9) break;
        if (tmx <= tmy && tmx <= tmz) {
          cx += sx;
          tmx += tdx;
        } else if (tmy <= tmz) {
          cy += sy;
          tmy += tdy;
        } else {
          cz += sz;
          tmz += tdz;
        }
      }
      return tmax;
    }
  };
  var SpatialHashBroadphase = class {
    /** options: cellSize (0 = 自動: 動的物体の AABB 最大辺の中央値の 1.5〜2 倍), maxSpan (1 物体が占有してよい最大セル数。超えると巨大物体扱い) */
    constructor(world, options = {}) {
      this.W = world;
      this.kind = "hash";
      this.dyn = new Int32Array(0);
      this.nDyn = 0;
      this.stat = new Int32Array(0);
      this.nStat = 0;
      this.cellOption = options.cellSize || 0;
      this.maxSpan = options.maxSpan || 512;
      this.cell = 1;
      this._staticDirty = true;
      this._listsDirty = true;
      this.dynSet = new HashSet(this);
      this.statSet = new HashSet(this);
      this.stats = { tests: 0, cellSize: 1, largeDyn: 0, largeStatic: 0, buckets: 0 };
      this.qstamp = new Int32Array(0);
      this._qs = 0;
    }
    _nextStamp() {
      const need = this.W.capacity;
      if (this.qstamp.length < need) {
        const s = new Int32Array(need);
        s.set(this.qstamp);
        this.qstamp = s;
      }
      if (++this._qs > 2147483632) {
        this.qstamp.fill(0);
        this._qs = 1;
      }
      return this._qs;
    }
    setLists(d, nd, s, ns) {
      this.dyn = d;
      this.nDyn = nd;
      this.stat = s;
      this.nStat = ns;
      this._listsDirty = true;
      this._staticDirty = true;
    }
    markStaticDirty() {
      this._staticDirty = true;
    }
    insert() {
    }
    remove() {
    }
    update() {
    }
    _autoCell() {
      const A = this.W.aabb, list = this.nDyn > 0 ? this.dyn : this.stat, n = this.nDyn > 0 ? this.nDyn : this.nStat;
      if (n === 0) return 1;
      const step = Math.max(1, Math.floor(n / 4096)), a = [];
      for (let k = 0; k < n; k += step) {
        const o = list[k] * 6;
        const e = Math.max(A[o + 3] - A[o], A[o + 4] - A[o + 1], A[o + 5] - A[o + 2]);
        if (e > 0 && e < 1e20) a.push(e);
      }
      if (!a.length) return 1;
      a.sort((x, y) => x - y);
      return Math.max(1e-6, a[a.length >> 1] * 1.5);
    }
    prepare() {
      if (this._listsDirty) {
        this.cell = this.cellOption > 0 ? this.cellOption : this._autoCell();
        this._listsDirty = false;
        this._staticDirty = true;
      }
      this.stats.cellSize = this.cell;
      if (this._staticDirty) {
        this.statSet.build(this.stat, this.nStat, this.cell, this.maxSpan);
        this._staticDirty = false;
      }
      this.dynSet.build(this.dyn, this.nDyn, this.cell, this.maxSpan);
      this.stats.largeDyn = this.dynSet.nLarge;
      this.stats.largeStatic = this.statSet.nLarge;
      this.stats.buckets = this.dynSet.cellsUsed;
    }
    findPairs(cb) {
      this.stats.tests = 0;
      this.dynSet.pairs(cb);
      const A = this.W.aabb, dyn = this.dyn;
      if (this.nStat > 0) for (let k = 0; k < this.nDyn; k++) {
        const i = dyn[k], o = i * 6;
        this.statSet.query(A[o], A[o + 1], A[o + 2], A[o + 3], A[o + 4], A[o + 5], (j) => cb(i, j));
      }
    }
    queryAABB(x0, y0, z0, x1, y1, z1, cb) {
      this.dynSet.query(x0, y0, z0, x1, y1, z1, cb);
      this.statSet.query(x0, y0, z0, x1, y1, z1, cb);
    }
    raycast(ox, oy, oz, dx, dy, dz, tmax, fn) {
      tmax = this.dynSet.ray(ox, oy, oz, dx, dy, dz, tmax, fn);
      return this.statSet.ray(ox, oy, oz, dx, dy, dz, tmax, fn);
    }
    /** デバッグ描画用: 使用中セルの座標を cb(cx,cy,cz,cellSize,isStatic) で列挙（重複なし）。 */
    debugCells(cb) {
      const A = this.W.aabb, inv = 1 / this.cell, seen = /* @__PURE__ */ new Set();
      for (const [set, list, n, st] of [[this.dynSet, this.dyn, this.nDyn, false], [this.statSet, this.stat, this.nStat, true]]) {
        for (let k = 0; k < n; k++) {
          const o = list[k] * 6, x0 = Math.floor(A[o] * inv), y0 = Math.floor(A[o + 1] * inv), z0 = Math.floor(A[o + 2] * inv), x1 = Math.floor(A[o + 3] * inv), y1 = Math.floor(A[o + 4] * inv), z1 = Math.floor(A[o + 5] * inv);
          if ((x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1) > this.maxSpan) continue;
          for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            const key = x + "," + y + "," + z + (st ? "s" : "d");
            if (!seen.has(key)) {
              seen.add(key);
              cb(x, y, z, this.cell, st);
            }
          }
        }
      }
    }
  };
  var DynamicTree = class {
    constructor(cap = 64) {
      this.cap = 0;
      this.box = new Float64Array(0);
      this.parent = new Int32Array(0);
      this.c1 = new Int32Array(0);
      this.c2 = new Int32Array(0);
      this.height = new Int32Array(0);
      this.obj = new Int32Array(0);
      this.root = -1;
      this.freeList = -1;
      this.count = 0;
      this.stack = new Int32Array(256);
      this._grow(Math.max(16, cap));
    }
    _grow(n) {
      const old = this.cap, cap = Math.max(n, old * 2), bx = new Float64Array(cap * 6);
      bx.set(this.box);
      this.box = bx;
      const g = (a) => {
        const b = new Int32Array(cap);
        b.set(a);
        return b;
      };
      this.parent = g(this.parent);
      this.c1 = g(this.c1);
      this.c2 = g(this.c2);
      this.height = g(this.height);
      this.obj = g(this.obj);
      for (let i = old; i < cap; i++) {
        this.parent[i] = i + 1 < cap ? i + 1 : this.freeList;
        this.height[i] = -1;
        this.obj[i] = -1;
      }
      this.freeList = old;
      this.cap = cap;
    }
    _alloc() {
      if (this.freeList < 0) this._grow(this.cap + 1);
      const n = this.freeList;
      this.freeList = this.parent[n];
      this.parent[n] = -1;
      this.c1[n] = -1;
      this.c2[n] = -1;
      this.height[n] = 0;
      this.obj[n] = -1;
      this.count++;
      return n;
    }
    _free(n) {
      this.parent[n] = this.freeList;
      this.height[n] = -1;
      this.freeList = n;
      this.count--;
    }
    _sa(n) {
      const b = this.box, o = n * 6, x = b[o + 3] - b[o], y = b[o + 4] - b[o + 1], z = b[o + 5] - b[o + 2];
      return 2 * (x * y + y * z + z * x);
    }
    _saUnion(a, b2) {
      const b = this.box, o = a * 6, p = b2 * 6, x = Math.max(b[o + 3], b[p + 3]) - Math.min(b[o], b[p]), y = Math.max(b[o + 4], b[p + 4]) - Math.min(b[o + 1], b[p + 1]), z = Math.max(b[o + 5], b[p + 5]) - Math.min(b[o + 2], b[p + 2]);
      return 2 * (x * y + y * z + z * x);
    }
    _union(dst, a, c) {
      const b = this.box, d = dst * 6, o = a * 6, p = c * 6;
      for (let k = 0; k < 3; k++) {
        b[d + k] = Math.min(b[o + k], b[p + k]);
        b[d + 3 + k] = Math.max(b[o + 3 + k], b[p + 3 + k]);
      }
    }
    /** 葉を作り、fat AABB (minx..maxz) で挿入。戻り値は節点番号。 */
    createLeaf(objIndex, x0, y0, z0, x1, y1, z1) {
      const n = this._alloc(), b = this.box, o = n * 6;
      b[o] = x0;
      b[o + 1] = y0;
      b[o + 2] = z0;
      b[o + 3] = x1;
      b[o + 4] = y1;
      b[o + 5] = z1;
      this.obj[n] = objIndex;
      this._insertLeaf(n);
      return n;
    }
    destroyLeaf(n) {
      this._removeLeaf(n);
      this._free(n);
    }
    moveLeaf(n, x0, y0, z0, x1, y1, z1) {
      this._removeLeaf(n);
      const b = this.box, o = n * 6;
      b[o] = x0;
      b[o + 1] = y0;
      b[o + 2] = z0;
      b[o + 3] = x1;
      b[o + 4] = y1;
      b[o + 5] = z1;
      this._insertLeaf(n);
    }
    _insertLeaf(leaf) {
      if (this.root < 0) {
        this.root = leaf;
        this.parent[leaf] = -1;
        return;
      }
      const np = this._alloc();
      const c12 = this.c1, c2 = this.c2;
      let idx = this.root;
      while (c12[idx] >= 0) {
        const a = c12[idx], b = c2[idx], area = this._sa(idx), combined = this._saUnion(idx, leaf), cost = 2 * combined, inh = 2 * (combined - area);
        const cost1 = c12[a] < 0 ? this._saUnion(a, leaf) + inh : this._saUnion(a, leaf) - this._sa(a) + inh;
        const cost2 = c12[b] < 0 ? this._saUnion(b, leaf) + inh : this._saUnion(b, leaf) - this._sa(b) + inh;
        if (cost < cost1 && cost < cost2) break;
        idx = cost1 < cost2 ? a : b;
      }
      const sib = idx, oldP = this.parent[sib];
      this.parent[np] = oldP;
      this._union(np, leaf, sib);
      this.height[np] = this.height[sib] + 1;
      if (oldP >= 0) {
        if (c12[oldP] === sib) c12[oldP] = np;
        else c2[oldP] = np;
      } else this.root = np;
      c12[np] = sib;
      c2[np] = leaf;
      this.parent[sib] = np;
      this.parent[leaf] = np;
      for (let i = this.parent[leaf]; i >= 0; i = this.parent[i]) {
        i = this._balance(i);
        const l = c12[i], r = c2[i];
        this.height[i] = 1 + Math.max(this.height[l], this.height[r]);
        this._union(i, l, r);
      }
    }
    _removeLeaf(leaf) {
      if (leaf === this.root) {
        this.root = -1;
        return;
      }
      const p = this.parent[leaf], gp = this.parent[p], c12 = this.c1, c2 = this.c2, sib = c12[p] === leaf ? c2[p] : c12[p];
      if (gp >= 0) {
        if (c12[gp] === p) c12[gp] = sib;
        else c2[gp] = sib;
        this.parent[sib] = gp;
        this._free(p);
        for (let i = gp; i >= 0; i = this.parent[i]) {
          i = this._balance(i);
          const l = c12[i], r = c2[i];
          this._union(i, l, r);
          this.height[i] = 1 + Math.max(this.height[l], this.height[r]);
        }
      } else {
        this.root = sib;
        this.parent[sib] = -1;
        this._free(p);
      }
    }
    _replaceInParent(A, N) {
      const p = this.parent[N];
      if (p >= 0) {
        if (this.c1[p] === A) this.c1[p] = N;
        else this.c2[p] = N;
      } else this.root = N;
    }
    _balance(A) {
      const c12 = this.c1, c2 = this.c2, par = this.parent, h = this.height;
      if (c12[A] < 0 || h[A] < 2) return A;
      const B = c12[A], C = c2[A], bal = h[C] - h[B];
      if (bal > 1) {
        const F = c12[C], G = c2[C];
        c12[C] = A;
        par[C] = par[A];
        par[A] = C;
        this._replaceInParent(A, C);
        if (h[F] > h[G]) {
          c2[C] = F;
          c2[A] = G;
          par[G] = A;
          this._union(A, B, G);
          this._union(C, A, F);
          h[A] = 1 + Math.max(h[B], h[G]);
          h[C] = 1 + Math.max(h[A], h[F]);
        } else {
          c2[C] = G;
          c2[A] = F;
          par[F] = A;
          this._union(A, B, F);
          this._union(C, A, G);
          h[A] = 1 + Math.max(h[B], h[F]);
          h[C] = 1 + Math.max(h[A], h[G]);
        }
        return C;
      }
      if (bal < -1) {
        const D = c12[B], E = c2[B];
        c12[B] = A;
        par[B] = par[A];
        par[A] = B;
        this._replaceInParent(A, B);
        if (h[D] > h[E]) {
          c2[B] = D;
          c12[A] = E;
          par[E] = A;
          this._union(A, C, E);
          this._union(B, A, D);
          h[A] = 1 + Math.max(h[C], h[E]);
          h[B] = 1 + Math.max(h[A], h[D]);
        } else {
          c2[B] = E;
          c12[A] = D;
          par[D] = A;
          this._union(A, C, D);
          this._union(B, A, E);
          h[A] = 1 + Math.max(h[C], h[D]);
          h[B] = 1 + Math.max(h[A], h[E]);
        }
        return B;
      }
      return A;
    }
    /** 構造検証（テスト用）: 親子リンク・高さ・包含を確認して問題の配列を返す。 */
    validate() {
      const prob = [], b = this.box;
      if (this.root < 0) return prob;
      const walk = (n) => {
        if (this.c1[n] < 0) {
          if (this.obj[n] < 0) prob.push("\u8449\u306B obj \u306A\u3057 " + n);
          return 0;
        }
        const l = this.c1[n], r = this.c2[n];
        if (this.parent[l] !== n || this.parent[r] !== n) prob.push("\u89AA\u30EA\u30F3\u30AF\u4E0D\u6574\u5408 " + n);
        for (const ch of [l, r]) for (let k = 0; k < 3; k++) if (b[n * 6 + k] > b[ch * 6 + k] + 1e-9 || b[n * 6 + 3 + k] < b[ch * 6 + 3 + k] - 1e-9) prob.push("AABB \u304C\u5B50\u3092\u542B\u307E\u306A\u3044 " + n);
        const hh = 1 + Math.max(walk(l), walk(r));
        if (hh !== this.height[n]) prob.push("\u9AD8\u3055\u4E0D\u6574\u5408 " + n);
        if (Math.abs(this.height[l] - this.height[r]) > 1) prob.push("\u4E0D\u5747\u8861 " + n);
        return hh;
      };
      if (this.parent[this.root] !== -1) prob.push("\u6839\u306E\u89AA\u304C -1 \u3067\u306A\u3044");
      walk(this.root);
      return prob;
    }
    query(x0, y0, z0, x1, y1, z1, cb) {
      if (this.root < 0) return;
      let sp = 0, st = this.stack;
      st[sp++] = this.root;
      const b = this.box, c12 = this.c1, c2 = this.c2;
      while (sp > 0) {
        const n = st[--sp], o = n * 6;
        if (b[o] > x1 || b[o + 3] < x0 || b[o + 1] > y1 || b[o + 4] < y0 || b[o + 2] > z1 || b[o + 5] < z0) continue;
        if (c12[n] < 0) cb(this.obj[n], n);
        else {
          if (sp + 2 > st.length) {
            const s2 = new Int32Array(st.length * 2);
            s2.set(st);
            this.stack = st = s2;
          }
          st[sp++] = c12[n];
          st[sp++] = c2[n];
        }
      }
    }
    ray(ox, oy, oz, dx, dy, dz, tmax, fn) {
      if (this.root < 0) return tmax;
      const ix = dx !== 0 ? 1 / dx : Infinity, iy = dy !== 0 ? 1 / dy : Infinity, iz = dz !== 0 ? 1 / dz : Infinity;
      const jx = isFinite(ix) ? ix : 1e300, jy = isFinite(iy) ? iy : 1e300, jz = isFinite(iz) ? iz : 1e300;
      let sp = 0, st = this.stack;
      st[sp++] = this.root;
      const b = this.box, c12 = this.c1, c2 = this.c2;
      while (sp > 0) {
        const n = st[--sp];
        if (rayAABB(b, n * 6, ox, oy, oz, NaNsafe(jx), NaNsafe(jy), NaNsafe(jz), tmax) === Infinity) continue;
        if (c12[n] < 0) tmax = fn(this.obj[n], tmax);
        else {
          if (sp + 2 > st.length) {
            const s2 = new Int32Array(st.length * 2);
            s2.set(st);
            this.stack = st = s2;
          }
          st[sp++] = c12[n];
          st[sp++] = c2[n];
        }
      }
      return tmax;
    }
  };
  var TreeBroadphase = class {
    /** options: fatMargin (葉の AABB を各方向へ広げる量。大きいほど再挿入が減り、候補が増える。既定 0.15) */
    constructor(world, options = {}) {
      this.W = world;
      this.kind = "tree";
      this.margin = options.fatMargin === void 0 ? 0.15 : options.fatMargin;
      this.tree = new DynamicTree(64);
      this.leaf = new Int32Array(0);
      this.dyn = new Int32Array(0);
      this.nDyn = 0;
      this.stat = new Int32Array(0);
      this.nStat = 0;
      this.stats = { tests: 0, reinserts: 0, height: 0 };
    }
    _ensure() {
      const n = this.W.capacity;
      if (this.leaf.length < n) {
        const l = new Int32Array(n).fill(-1);
        l.set(this.leaf);
        this.leaf = l;
      }
    }
    setLists(d, nd, s, ns) {
      this.dyn = d;
      this.nDyn = nd;
      this.stat = s;
      this.nStat = ns;
    }
    markStaticDirty() {
    }
    prepare() {
    }
    insert(i) {
      this._ensure();
      const A = this.W.aabb, o = i * 6, m = this.margin;
      if (this.leaf[i] >= 0) return;
      this.leaf[i] = this.tree.createLeaf(i, A[o] - m, A[o + 1] - m, A[o + 2] - m, A[o + 3] + m, A[o + 4] + m, A[o + 5] + m);
    }
    remove(i) {
      this._ensure();
      const n = this.leaf[i];
      if (n >= 0) {
        this.tree.destroyLeaf(n);
        this.leaf[i] = -1;
      }
    }
    update(i) {
      this._ensure();
      const n = this.leaf[i];
      if (n < 0) {
        this.insert(i);
        return;
      }
      const A = this.W.aabb, o = i * 6, b = this.tree.box, p = n * 6;
      if (A[o] >= b[p] && A[o + 1] >= b[p + 1] && A[o + 2] >= b[p + 2] && A[o + 3] <= b[p + 3] && A[o + 4] <= b[p + 4] && A[o + 5] <= b[p + 5]) return;
      const m = this.margin;
      this.tree.moveLeaf(n, A[o] - m, A[o + 1] - m, A[o + 2] - m, A[o + 3] + m, A[o + 4] + m, A[o + 5] + m);
      this.stats.reinserts++;
    }
    findPairs(cb) {
      const A = this.W.aabb, F = this.W.flags, dyn = this.dyn, tree = this.tree;
      let tests = 0;
      this.stats.height = tree.root < 0 ? 0 : tree.height[tree.root];
      if (tree.root < 0) {
        this.stats.tests = 0;
        return;
      }
      const bx = tree.box, c12 = tree.c1, c2 = tree.c2, obj = tree.obj;
      let st = tree.stack;
      for (let k = 0; k < this.nDyn; k++) {
        const i = dyn[k], o = i * 6, x0 = A[o], y0 = A[o + 1], z0 = A[o + 2], x1 = A[o + 3], y1 = A[o + 4], z1 = A[o + 5];
        let sp = 0;
        st[sp++] = tree.root;
        while (sp > 0) {
          const n = st[--sp], q = n * 6;
          if (bx[q] > x1 || bx[q + 3] < x0 || bx[q + 1] > y1 || bx[q + 4] < y0 || bx[q + 2] > z1 || bx[q + 5] < z0) continue;
          const l = c12[n];
          if (l < 0) {
            const j = obj[n];
            if (j === i) continue;
            if (!(F[j] & F_STATIC) && j < i) continue;
            tests++;
            const p = j * 6;
            if (A[p] <= x1 && A[p + 3] >= x0 && A[p + 1] <= y1 && A[p + 4] >= y0 && A[p + 2] <= z1 && A[p + 5] >= z0) cb(i, j);
          } else {
            if (sp + 2 > st.length) {
              const s2 = new Int32Array(st.length * 2);
              s2.set(st);
              tree.stack = st = s2;
            }
            st[sp++] = l;
            st[sp++] = c2[n];
          }
        }
      }
      this.stats.tests = tests;
    }
    queryAABB(x0, y0, z0, x1, y1, z1, cb) {
      const A = this.W.aabb;
      let tests = 0;
      this.tree.query(x0, y0, z0, x1, y1, z1, (i) => {
        tests++;
        const o = i * 6;
        if (A[o] <= x1 && A[o + 3] >= x0 && A[o + 1] <= y1 && A[o + 4] >= y0 && A[o + 2] <= z1 && A[o + 5] >= z0) cb(i);
      });
      this.stats.tests += tests;
    }
    raycast(ox, oy, oz, dx, dy, dz, tmax, fn) {
      return this.tree.ray(ox, oy, oz, dx, dy, dz, tmax, fn);
    }
    debugCells(cb) {
      const t = this.tree, b = t.box;
      const walk = (n, depth) => {
        if (n < 0) return;
        cb(b[n * 6], b[n * 6 + 1], b[n * 6 + 2], b[n * 6 + 3], b[n * 6 + 4], b[n * 6 + 5], depth, t.c1[n] < 0);
        if (t.c1[n] >= 0) {
          walk(t.c1[n], depth + 1);
          walk(t.c2[n], depth + 1);
        }
      };
      walk(t.root, 0);
    }
  };

  // src/collision/world.js
  var EVENT_START = "collisionstart";
  var EVENT_STAY = "collisionstay";
  var EVENT_END = "collisionend";
  var EVENT_TRIGGER_ENTER = "triggerenter";
  var EVENT_TRIGGER_STAY = "triggerstay";
  var EVENT_TRIGGER_EXIT = "triggerexit";
  var ALL = 4294967295;
  var PairRecord = class {
    constructor() {
      this.key = 0;
      this.a = 0;
      this.b = 0;
      this.ha = 0;
      this.hb = 0;
      this.ua = null;
      this.ub = null;
      this.stamp = 0;
      this.isNew = false;
      this.trigger = false;
      this.contact = new Contact();
    }
  };
  var CollisionEvent = class {
    constructor() {
      this.type = "";
      this.a = 0;
      this.b = 0;
      this.trigger = false;
      this.nx = 0;
      this.ny = 0;
      this.nz = 0;
      this.depth = 0;
      this.px = 0;
      this.py = 0;
      this.pz = 0;
      this.toi = -1;
      this.userA = null;
      this.userB = null;
    }
  };
  var DEFAULTS2 = { broadphase: "hash", cellSize: 0, maxSpan: 512, fatMargin: 0.15, emitStay: true, onEvent: null, ccdClamp: false, checkDuplicates: false, onWarning: null };
  var CollisionWorld = class {
    constructor(options = {}) {
      for (const k of Object.keys(options)) if (!(k in DEFAULTS2)) throw new RangeError("CollisionWorld: \u672A\u77E5\u306E\u30AA\u30D7\u30B7\u30E7\u30F3 " + k);
      this.options = Object.assign({}, DEFAULTS2, options);
      this.alloc = new HandleAllocator(64);
      this.capacity = 0;
      this.type = new Uint8Array(0);
      this.flags = new Uint8Array(0);
      this.layer = new Uint32Array(0);
      this.mask = new Uint32Array(0);
      this.pos = new Float64Array(0);
      this.prev = new Float64Array(0);
      this.rotm = new Float64Array(0);
      this.par = new Float64Array(0);
      this.aabb = new Float64Array(0);
      this.quat = new Float64Array(0);
      this.userData = [];
      this._ensure(64);
      this.S = this;
      this.dyn = new Int32Array(0);
      this.nDyn = 0;
      this.stat = new Int32Array(0);
      this.nStat = 0;
      this.planes = [];
      this.cont = [];
      this._listsDirty = true;
      this.bp = null;
      this.bpKind = null;
      this._requestedKind = this.options.broadphase;
      this.pairs = /* @__PURE__ */ new Map();
      this._pairPool = [];
      this._newPairs = [];
      this._ended = [];
      this.stepId = 0;
      this.time = 0;
      this._contact = new Contact();
      this._c2 = new Contact();
      this._hit = new RayHit();
      this.events = [];
      this.eventCount = 0;
      this._evPool = [];
      this.onEvent = this.options.onEvent;
      this._cand = new Int32Array(1024);
      this._nCand = 0;
      this._pairCb = (i, j) => this._onPair(i, j);
      this.stats = { colliders: 0, active: 0, dynamic: 0, static: 0, planes: 0, broadphase: "", broadTests: 0, candidatePairs: 0, contacts: 0, newPairs: 0, endedPairs: 0, duplicatePairs: 0, ccdTests: 0, ccdHits: 0, events: 0, broadMs: 0, narrowMs: 0, ccdMs: 0, eventMs: 0, stepMs: 0 };
    }
    warn(m) {
      if (this.options.onWarning) this.options.onWarning(m);
    }
    _ensure(n) {
      if (n <= this.capacity) return;
      const cap = Math.max(n, this.capacity * 2, 64);
      const g = (A, k, C = Float64Array) => {
        const a = new C(cap * k);
        a.set(A);
        return a;
      };
      this.type = g(this.type, 1, Uint8Array);
      this.flags = g(this.flags, 1, Uint8Array);
      this.layer = g(this.layer, 1, Uint32Array);
      this.mask = g(this.mask, 1, Uint32Array);
      this.pos = g(this.pos, 3);
      this.prev = g(this.prev, 3);
      this.rotm = g(this.rotm, 9);
      this.par = g(this.par, 4);
      this.aabb = g(this.aabb, 6);
      this.quat = g(this.quat, 4);
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
      if (!d || typeof d !== "object") throw new TypeError("CollisionWorld.add: \u8A18\u8FF0\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u304C\u5FC5\u8981\u3067\u3059\u3002");
      const type = typeof d.type === "number" ? d.type : SHAPE_BY_NAME[d.type];
      if (type === void 0) throw new RangeError("CollisionWorld.add: \u672A\u77E5\u306E type: " + d.type);
      const par = [0, 0, 0, 0], fin = (v, n) => {
        if (!(typeof v === "number" && isFinite(v))) throw new RangeError("CollisionWorld.add: " + n + " \u306F\u6709\u9650\u306E\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
        return v;
      };
      const pos = d.position || [0, 0, 0];
      fin(pos[0] + pos[1] + pos[2], "position");
      switch (type) {
        case SHAPE_SPHERE2:
          par[0] = d.radius === void 0 ? 0.5 : d.radius;
          if (!(par[0] > 0) || !isFinite(par[0])) throw new RangeError("CollisionWorld.add: radius \u306F\u6B63\u306E\u6709\u9650\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
          break;
        case SHAPE_AABB:
        case SHAPE_OBB: {
          const h2 = d.halfExtents || (d.size ? [d.size[0] / 2, d.size[1] / 2, d.size[2] / 2] : [0.5, 0.5, 0.5]);
          par[0] = h2[0];
          par[1] = h2[1];
          par[2] = h2[2];
          if (!(par[0] > 0 && par[1] > 0 && par[2] > 0) || !isFinite(par[0] + par[1] + par[2])) throw new RangeError("CollisionWorld.add: halfExtents/size \u306F\u6B63\u306E\u6709\u9650\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
          break;
        }
        case SHAPE_CAPSULE: {
          par[0] = d.radius === void 0 ? 0.5 : d.radius;
          par[1] = d.halfLength !== void 0 ? d.halfLength : d.height !== void 0 ? d.height / 2 - par[0] : 0.5;
          if (!(par[0] > 0) || !(par[1] >= 0) || !isFinite(par[0] + par[1])) throw new RangeError("CollisionWorld.add: capsule \u306E radius > 0, halfLength >= 0\uFF08height >= 2*radius\uFF09\u304C\u5FC5\u8981\u3067\u3059\u3002");
          break;
        }
        default: {
          const n = d.normal || [0, 1, 0], l = Math.hypot(n[0], n[1], n[2]);
          if (!(l > 0) || !isFinite(l)) throw new RangeError("CollisionWorld.add: plane.normal \u306F 0 \u3067\u306A\u3044\u6709\u9650\u30D9\u30AF\u30C8\u30EB\u304C\u5FC5\u8981\u3067\u3059\u3002");
          par[0] = n[0] / l;
          par[1] = n[1] / l;
          par[2] = n[2] / l;
          par[3] = d.offset !== void 0 ? d.offset / 1 : d.position ? par[0] * pos[0] + par[1] * pos[1] + par[2] * pos[2] : 0;
          fin(par[3], "plane.offset");
        }
      }
      if (d.continuous && type !== SHAPE_SPHERE2) throw new MassiveEngineError("continuous \u306F\u7403(sphere)\u306E\u885D\u7A81\u4F53\u3067\u306E\u307F\u4F7F\u3048\u307E\u3059\u3002", "E_CCD_SHAPE");
      const h = this.alloc.alloc(), i = h % HANDLE_INDEX_LIMIT;
      this._ensure(this.alloc.capacity);
      this.type[i] = type;
      this.par.set(par, i * 4);
      this.pos[i * 3] = pos[0];
      this.pos[i * 3 + 1] = pos[1];
      this.pos[i * 3 + 2] = pos[2];
      this.prev.set(this.pos.subarray(i * 3, i * 3 + 3), i * 3);
      const q = d.rotation || [0, 0, 0, 1];
      this.quat[i * 4] = q[0];
      this.quat[i * 4 + 1] = q[1];
      this.quat[i * 4 + 2] = q[2];
      this.quat[i * 4 + 3] = q[3];
      if (type === SHAPE_AABB || type === SHAPE_PLANE) {
        const o = i * 9;
        this.rotm.fill(0, o, o + 9);
        this.rotm[o] = this.rotm[o + 4] = this.rotm[o + 8] = 1;
      } else quatToAxes(q[0], q[1], q[2], q[3], this.rotm, i * 9);
      this.layer[i] = d.layer === void 0 ? 1 : d.layer >>> 0;
      this.mask[i] = d.mask === void 0 ? ALL : d.mask >>> 0;
      this.flags[i] = (d.enabled === false ? 0 : F_ENABLED) | (d.static || type === SHAPE_PLANE ? F_STATIC : 0) | (d.trigger ? F_TRIGGER : 0) | (d.continuous ? F_CONTINUOUS : 0);
      this.userData[i] = d.userData === void 0 ? null : d.userData;
      this._refreshAABB(i);
      this._listsDirty = true;
      if (this.bp && type !== SHAPE_PLANE && this.flags[i] & F_ENABLED) this.bp.insert(i);
      return h;
    }
    addSphere(o = {}) {
      return this.add(Object.assign({}, o, { type: "sphere" }));
    }
    addAABB(o = {}) {
      return this.add(Object.assign({}, o, { type: "aabb" }));
    }
    addOBB(o = {}) {
      return this.add(Object.assign({}, o, { type: "obb" }));
    }
    addCapsule(o = {}) {
      return this.add(Object.assign({}, o, { type: "capsule" }));
    }
    addPlane(o = {}) {
      return this.add(Object.assign({}, o, { type: "plane" }));
    }
    /** 一括登録。ハンドルの配列を返す。途中で不正な記述があれば、それまでに追加した分は削除して例外を投げる（全か無か）。 */
    addMany(list) {
      const hs = [];
      try {
        for (let k = 0; k < list.length; k++) hs.push(this.add(list[k]));
      } catch (e) {
        for (const h of hs) this.remove(h);
        throw e;
      }
      return hs;
    }
    remove(h) {
      const i = this.alloc.indexOf(h);
      if (i < 0) return false;
      if (this.bp && this.type[i] !== SHAPE_PLANE && this.flags[i] & F_ENABLED) this.bp.remove(i);
      this.flags[i] = 0;
      this.userData[i] = null;
      this.alloc.free(h);
      this._listsDirty = true;
      this._moved = true;
      return true;
    }
    removeMany(handles) {
      let n = 0;
      for (let k = 0; k < handles.length; k++) if (this.remove(handles[k])) n++;
      return n;
    }
    isValid(h) {
      return this.alloc.isValid(h);
    }
    get count() {
      return this.alloc.liveCount;
    }
    clear() {
      this.alloc.clear();
      this.flags.fill(0);
      this.userData.length = 0;
      this.pairs.clear();
      this.planes.length = 0;
      this.cont.length = 0;
      this.nDyn = 0;
      this.nStat = 0;
      this._listsDirty = true;
      if (this.bp) this._buildBroadphase(this.bpKind);
    }
    _idx(h) {
      const i = this.alloc.indexOf(h);
      if (i < 0) throw new RangeError("CollisionWorld: \u7121\u52B9\u307E\u305F\u306F\u524A\u9664\u6E08\u307F\u306E\u30CF\u30F3\u30C9\u30EB: " + h);
      return i;
    }
    /* ------------------------------------------------------------ 変更 */
    _refreshAABB(i) {
      this._moved = true;
      computeAABB(this.type[i], this.pos, i * 3, this.par, i * 4, this.rotm, i * 9, this.aabb, i * 6);
      if (this.flags[i] & F_CONTINUOUS) {
        const A = this.aabb, o = i * 6, p = this.prev, j = i * 3, r = this.par[i * 4];
        for (let k = 0; k < 3; k++) {
          const q = p[j + k];
          if (q - r < A[o + k]) A[o + k] = q - r;
          if (q + r > A[o + 3 + k]) A[o + 3 + k] = q + r;
        }
      }
    }
    _touched(i) {
      if (this.type[i] === SHAPE_PLANE) return;
      if (this.flags[i] & F_STATIC) {
        if (this.bp) this.bp.markStaticDirty();
      }
      if (this.bp && this.flags[i] & F_ENABLED) this.bp.update(i);
    }
    /** 位置（と任意で回転）を設定。連続衝突の衝突体は前ステップ位置からの線分で判定される。 */
    setPosition(h, x, y, z) {
      const i = this._idx(h), j = i * 3;
      this.pos[j] = x;
      this.pos[j + 1] = y;
      this.pos[j + 2] = z;
      this._refreshAABB(i);
      this._touched(i);
      return this;
    }
    /** 瞬間移動: 前位置も同時に更新し、スイープ（すり抜け判定）を行わない。 */
    teleport(h, x, y, z) {
      const i = this._idx(h), j = i * 3;
      this.pos[j] = this.prev[j] = x;
      this.pos[j + 1] = this.prev[j + 1] = y;
      this.pos[j + 2] = this.prev[j + 2] = z;
      this._refreshAABB(i);
      this._touched(i);
      return this;
    }
    setRotation(h, x, y, z, w) {
      const i = this._idx(h);
      const t = this.type[i];
      if (t === SHAPE_PLANE) throw new MassiveEngineError("\u5E73\u9762\u306E\u56DE\u8EE2\u306F normal/offset \u3067\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002", "E_PLANE_ROT");
      this.quat[i * 4] = x;
      this.quat[i * 4 + 1] = y;
      this.quat[i * 4 + 2] = z;
      this.quat[i * 4 + 3] = w;
      if (t !== SHAPE_AABB) {
        quatToAxes(x, y, z, w, this.rotm, i * 9);
        this._refreshAABB(i);
        this._touched(i);
      }
      return this;
    }
    setTransform(h, x, y, z, qx, qy, qz, qw) {
      this.setPosition(h, x, y, z);
      if (qw !== void 0) this.setRotation(h, qx, qy, qz, qw);
      return this;
    }
    /** サイズ変更: 球 (r) / 箱 (hx,hy,hz) / カプセル (radius, halfLength) / 平面 (nx,ny,nz,d) */
    setSize(h, a, b, c, d) {
      const i = this._idx(h), q = i * 4, t = this.type[i], p = this.par;
      if (t === SHAPE_SPHERE2) {
        if (!(a > 0)) throw new RangeError("radius \u306F\u6B63\u306E\u6570");
        p[q] = a;
      } else if (t === SHAPE_AABB || t === SHAPE_OBB) {
        if (!(a > 0 && b > 0 && c > 0)) throw new RangeError("halfExtents \u306F\u6B63\u306E\u6570");
        p[q] = a;
        p[q + 1] = b;
        p[q + 2] = c;
      } else if (t === SHAPE_CAPSULE) {
        if (!(a > 0 && b >= 0)) throw new RangeError("radius>0, halfLength>=0");
        p[q] = a;
        p[q + 1] = b;
      } else {
        const l = Math.hypot(a, b, c);
        if (!(l > 0)) throw new RangeError("normal \u306F 0 \u3067\u306A\u3044");
        p[q] = a / l;
        p[q + 1] = b / l;
        p[q + 2] = c / l;
        p[q + 3] = d;
        return this;
      }
      this._refreshAABB(i);
      this._touched(i);
      return this;
    }
    setFilter(h, layer, mask = ALL) {
      const i = this._idx(h);
      this.layer[i] = layer >>> 0;
      this.mask[i] = mask >>> 0;
      return this;
    }
    setEnabled(h, on) {
      const i = this._idx(h), was = !!(this.flags[i] & F_ENABLED);
      if (was === !!on) return this;
      if (on) this.flags[i] |= F_ENABLED;
      else this.flags[i] &= ~F_ENABLED;
      this._listsDirty = true;
      if (this.bp && this.type[i] !== SHAPE_PLANE) {
        if (on) {
          this._refreshAABB(i);
          this.bp.insert(i);
        } else this.bp.remove(i);
      }
      return this;
    }
    setEnabledMany(handles, on) {
      for (let k = 0; k < handles.length; k++) if (this.alloc.isValid(handles[k])) this.setEnabled(handles[k], on);
      return this;
    }
    setTrigger(h, on) {
      const i = this._idx(h);
      if (on) this.flags[i] |= F_TRIGGER;
      else this.flags[i] &= ~F_TRIGGER;
      return this;
    }
    setStatic(h, on) {
      const i = this._idx(h);
      if (this.type[i] === SHAPE_PLANE) return this;
      const was = !!(this.flags[i] & F_STATIC);
      if (was === !!on) return this;
      if (on) this.flags[i] |= F_STATIC;
      else this.flags[i] &= ~F_STATIC;
      this._listsDirty = true;
      return this;
    }
    /** 一括で位置を設定。xyz は [x0,y0,z0,x1,...]。 */
    setPositionsMany(handles, xyz) {
      for (let k = 0; k < handles.length; k++) this.setPosition(handles[k], xyz[k * 3], xyz[k * 3 + 1], xyz[k * 3 + 2]);
      return this;
    }
    setUserData(h, v) {
      this.userData[this._idx(h)] = v;
      return this;
    }
    getUserData(h) {
      const i = this.alloc.indexOf(h);
      return i < 0 ? void 0 : this.userData[i];
    }
    getPosition(h, out = [0, 0, 0]) {
      const j = this._idx(h) * 3;
      out[0] = this.pos[j];
      out[1] = this.pos[j + 1];
      out[2] = this.pos[j + 2];
      return out;
    }
    getAABB(h, out = new Float64Array(6)) {
      const o = this._idx(h) * 6;
      for (let k = 0; k < 6; k++) out[k] = this.aabb[o + k];
      return out;
    }
    getShapeType(h) {
      return SHAPE_NAMES[this.type[this._idx(h)]];
    }
    isTrigger(h) {
      return !!(this.flags[this._idx(h)] & F_TRIGGER);
    }
    /* ------------------------------------------------------------ ブロードフェーズ管理 */
    _buildBroadphase(kind) {
      const o = this.options;
      this.bp = kind === "tree" ? new TreeBroadphase(this, { fatMargin: o.fatMargin }) : kind === "brute" ? new BruteForceBroadphase(this) : new SpatialHashBroadphase(this, { cellSize: o.cellSize, maxSpan: o.maxSpan });
      this.bpKind = kind;
      this._listsDirty = true;
      if (kind === "tree") {
        for (let i = 0; i < this.alloc.highWaterMark; i++) if (this.alloc.isIndexLive(i) && this.type[i] !== SHAPE_PLANE && this.flags[i] & F_ENABLED) {
          this._refreshAABB(i);
          this.bp.insert(i);
        }
      }
    }
    /** 'hash' | 'tree' | 'brute' | 'auto'。auto は大きさのばらつきと数から選ぶ（呼び出し時点の内容で 1 回だけ決める）。 */
    setBroadphase(kind) {
      if (kind === "auto") kind = this._pickAuto();
      if (kind !== "hash" && kind !== "tree" && kind !== "brute") throw new RangeError("setBroadphase: 'hash' | 'tree' | 'brute' | 'auto'");
      this._requestedKind = kind;
      this._buildBroadphase(kind);
      return this;
    }
    _pickAuto() {
      const ext = [];
      for (let i = 0; i < this.alloc.highWaterMark; i++) if (this.alloc.isIndexLive(i) && this.type[i] !== SHAPE_PLANE && this.flags[i] & F_ENABLED) {
        const o = i * 6;
        ext.push(Math.max(this.aabb[o + 3] - this.aabb[o], this.aabb[o + 4] - this.aabb[o + 1], this.aabb[o + 5] - this.aabb[o + 2]));
      }
      if (ext.length < 24) return "brute";
      ext.sort((a, b) => a - b);
      const med = ext[ext.length >> 1], p98 = ext[Math.floor(ext.length * 0.98)];
      return p98 / Math.max(med, 1e-12) > 6 ? "tree" : "hash";
    }
    _rebuildLists() {
      const n = this.alloc.highWaterMark;
      if (this.dyn.length < n) {
        this.dyn = new Int32Array(this.capacity);
        this.stat = new Int32Array(this.capacity);
      }
      let nd = 0, ns = 0;
      this.planes.length = 0;
      this.cont.length = 0;
      const F = this.flags;
      for (let i = 0; i < n; i++) {
        if (!this.alloc.isIndexLive(i) || !(F[i] & F_ENABLED)) continue;
        if (this.type[i] === SHAPE_PLANE) {
          this.planes.push(i);
          continue;
        }
        if (F[i] & F_STATIC) this.stat[ns++] = i;
        else this.dyn[nd++] = i;
        if (F[i] & F_CONTINUOUS) this.cont.push(i);
      }
      this.nDyn = nd;
      this.nStat = ns;
      this.bp.setLists(this.dyn, nd, this.stat, ns);
      this._listsDirty = false;
      this._moved = true;
    }
    _ensureReady() {
      if (!this.bp) {
        const k = this._requestedKind === "auto" ? this._pickAuto() : this._requestedKind;
        this._buildBroadphase(k);
      }
      if (this._listsDirty) this._rebuildLists();
      if (this._moved) {
        this.bp.prepare();
        this._moved = false;
      }
    }
    /* ------------------------------------------------------------ ステップ */
    _getRec() {
      return this._pairPool.pop() || new PairRecord();
    }
    _evt(type, rec) {
      let e = this._evPool[this.eventCount];
      if (!e) e = this._evPool[this.eventCount] = new CollisionEvent();
      this.events[this.eventCount++] = e;
      const c = rec.contact;
      e.type = type;
      e.a = rec.ha;
      e.b = rec.hb;
      e.trigger = rec.trigger;
      e.nx = c.nx;
      e.ny = c.ny;
      e.nz = c.nz;
      e.depth = c.depth;
      e.px = c.px;
      e.py = c.py;
      e.pz = c.pz;
      e.toi = c.toi;
      e.userA = rec.ua;
      e.userB = rec.ub;
      if (this.onEvent) this.onEvent(e);
      return e;
    }
    _filterOK(i, j) {
      return (this.layer[i] & this.mask[j]) !== 0 && (this.layer[j] & this.mask[i]) !== 0;
    }
    /** 接触を記録（既存ペアは更新、無ければ新規）。 */
    _record(a, b, c, bumpStat) {
      const key = a * HANDLE_INDEX_LIMIT + b;
      let rec = this.pairs.get(key);
      const ha = this.alloc.handleAt(a), hb = this.alloc.handleAt(b);
      if (rec && (rec.ha !== ha || rec.hb !== hb)) {
        this._endRecord(rec);
        rec = void 0;
      }
      if (rec) {
        if (rec.stamp === this.stepId) return false;
        rec.contact.set(c);
        rec.stamp = this.stepId;
        rec.isNew = false;
        return true;
      }
      rec = this._getRec();
      rec.key = key;
      rec.a = a;
      rec.b = b;
      rec.ha = ha;
      rec.hb = hb;
      rec.ua = this.userData[a];
      rec.ub = this.userData[b];
      rec.stamp = this.stepId;
      rec.isNew = true;
      rec.trigger = !!((this.flags[a] | this.flags[b]) & F_TRIGGER);
      rec.contact.set(c);
      this.pairs.set(key, rec);
      this._newPairs.push(rec);
      return true;
    }
    _endRecord(rec) {
      this._ended.push(rec);
      this.pairs.delete(rec.key);
    }
    // 呼び出し側がすぐ新しい記録を同じキーで登録する
    /** ブロードフェーズからのコールバック: フィルタを通ったペアを候補バッファへ（ナローフェーズは後でまとめて実行して時間を分けて計測する）。 */
    _onPair(i, j) {
      if (!this._filterOK(i, j)) return;
      let n = this._nCand;
      if (n + 2 > this._cand.length) {
        const c = new Int32Array(this._cand.length * 2);
        c.set(this._cand);
        this._cand = c;
      }
      if (i < j) {
        this._cand[n] = i;
        this._cand[n + 1] = j;
      } else {
        this._cand[n] = j;
        this._cand[n + 1] = i;
      }
      this._nCand = n + 2;
    }
    _narrowPass() {
      const cand = this._cand, n = this._nCand, c = this._contact;
      c.toi = -1;
      for (let k = 0; k < n; k += 2) {
        const a = cand[k], b = cand[k + 1];
        c.toi = -1;
        if (collide(this, a, b, c)) this._record(a, b, c);
      }
      this.stats.candidatePairs = n >> 1;
    }
    /** 1 ステップ分の衝突判定を行い、イベントを events に溜める。 */
    step() {
      const t0 = now(), st = this.stats;
      this._ensureReady();
      this.stepId++;
      this.eventCount = 0;
      this._newPairs.length = 0;
      this._ended.length = 0;
      st.candidatePairs = 0;
      st.ccdTests = 0;
      st.ccdHits = 0;
      st.duplicatePairs = 0;
      this._nCand = 0;
      const bp = this.bp;
      bp.stats.tests = 0;
      if (this._moved) {
        bp.prepare();
        this._moved = false;
      }
      bp.findPairs(this._pairCb);
      st.broadTests = bp.stats.tests;
      if (this.planes.length) this._planePass();
      const t1 = now();
      this._narrowPass();
      const t2 = now();
      if (this.cont.length) this._ccdPass();
      const t3 = now();
      this._finishPairs();
      for (let k = 0; k < this.cont.length; k++) {
        const i = this.cont[k], j = i * 3;
        this.prev[j] = this.pos[j];
        this.prev[j + 1] = this.pos[j + 1];
        this.prev[j + 2] = this.pos[j + 2];
        this._refreshAABB(i);
        if (this.bp) this.bp.update(i);
      }
      this.events.length = this.eventCount;
      const t4 = now();
      this.time++;
      st.colliders = this.alloc.liveCount;
      st.dynamic = this.nDyn;
      st.static = this.nStat;
      st.planes = this.planes.length;
      st.active = this.nDyn + this.nStat + this.planes.length;
      st.broadphase = this.bpKind;
      st.contacts = this.pairs.size;
      st.events = this.eventCount;
      st.broadMs = t1 - t0;
      st.narrowMs = t2 - t1;
      st.ccdMs = t3 - t2;
      st.eventMs = t4 - t3;
      st.stepMs = t4 - t0;
      return st;
    }
    _planePass() {
      const A = this.aabb;
      let tests = 0;
      for (const p of this.planes) {
        const q = p * 4, nx = this.par[q], ny = this.par[q + 1], nz = this.par[q + 2], d = this.par[q + 3];
        const scan = (list, n) => {
          for (let k = 0; k < n; k++) {
            const i = list[k], o = i * 6;
            tests++;
            const mx = nx >= 0 ? A[o] : A[o + 3], my = ny >= 0 ? A[o + 1] : A[o + 4], mz = nz >= 0 ? A[o + 2] : A[o + 5];
            if (nx * mx + ny * my + nz * mz - d >= 0) continue;
            this._onPair(p, i);
          }
        };
        scan(this.dyn, this.nDyn);
      }
      this.stats.broadTests += tests;
    }
    _ccdPass() {
      const st = this.stats, A = this.aabb, c = this._c2;
      for (let k = 0; k < this.cont.length; k++) {
        const i = this.cont[k], j = i * 3, r = this.par[i * 4], x = this.prev[j], y = this.prev[j + 1], z = this.prev[j + 2], dx = this.pos[j] - x, dy = this.pos[j + 1] - y, dz = this.pos[j + 2] - z;
        if (dx * dx + dy * dy + dz * dz < 1e-18) continue;
        let bestT = Infinity, bestC = null;
        const test = (t) => {
          if (t === i || !(this.flags[t] & F_ENABLED) || !this._filterOK(i, t)) return;
          st.ccdTests++;
          if (!sweepSphere(this, t, x, y, z, r, dx, dy, dz, c)) return;
          st.ccdHits++;
          const a = i < t ? i : t, b = i < t ? t : i;
          const cc = this._contact;
          cc.set(c);
          if (a === i) {
            cc.nx = -c.nx;
            cc.ny = -c.ny;
            cc.nz = -c.nz;
          }
          cc.toi = c.toi;
          this._record(a, b, cc);
          if (c.toi < bestT) {
            bestT = c.toi;
            bestC = { nx: c.nx, ny: c.ny, nz: c.nz, depth: c.depth };
          }
        };
        this.bp.queryAABB(A[i * 6], A[i * 6 + 1], A[i * 6 + 2], A[i * 6 + 3], A[i * 6 + 4], A[i * 6 + 5], test);
        for (const p of this.planes) test(p);
        if (this.options.ccdClamp && bestC) {
          const t = bestT, nx = dx * t, ny = dy * t, nz = dz * t;
          this.pos[j] = x + nx;
          this.pos[j + 1] = y + ny;
          this.pos[j + 2] = z + nz;
        }
      }
    }
    _finishPairs() {
      const st = this.stats, F = this.flags, emitStay = this.options.emitStay;
      let dup = 0;
      for (const rec of this.pairs.values()) {
        if (rec.stamp !== this.stepId) this._ended.push(rec);
      }
      for (const rec of this._ended) if (this.pairs.get(rec.key) === rec) this.pairs.delete(rec.key);
      this._ended.sort((p, q) => p.key - q.key);
      for (const rec of this._ended) {
        rec.contact.toi = -1;
        this._evt(rec.trigger ? EVENT_TRIGGER_EXIT : EVENT_END, rec);
      }
      this._newPairs.sort((p, q) => p.key - q.key);
      if (this.options.checkDuplicates) {
        const seen = /* @__PURE__ */ new Set();
        for (const r of this._newPairs) {
          if (seen.has(r.key)) dup++;
          seen.add(r.key);
        }
      }
      for (const rec of this._newPairs) this._evt(rec.trigger ? EVENT_TRIGGER_ENTER : EVENT_START, rec);
      if (emitStay) {
        for (const rec of this.pairs.values()) if (!rec.isNew) this._evt(rec.trigger ? EVENT_TRIGGER_STAY : EVENT_STAY, rec);
      }
      for (const rec of this._newPairs) rec.isNew = false;
      st.newPairs = this._newPairs.length;
      st.endedPairs = this._ended.length;
      st.duplicatePairs = dup;
      for (const rec of this._ended) {
        rec.ua = rec.ub = null;
        this._pairPool.push(rec);
      }
    }
    /** 現在の接触（このステップ終了時点で触れているペア）を fn(handleA, handleB, contact, isTrigger) で列挙。 */
    forEachContact(fn) {
      for (const rec of this.pairs.values()) fn(rec.ha, rec.hb, rec.contact, rec.trigger);
    }
    /** 指定衝突体が触れている相手のハンドルを out に追加して返す。 */
    getTouching(h, out = []) {
      const i = this.alloc.indexOf(h);
      if (i < 0) return out;
      for (const rec of this.pairs.values()) {
        if (rec.a === i) out.push(rec.hb);
        else if (rec.b === i) out.push(rec.ha);
      }
      return out;
    }
    /* ------------------------------------------------------------ クエリ */
    /** 2 つの衝突体が今の位置で交差しているか（フィルタ無視）。接触があれば Contact（a→b）を、無ければ null。 */
    testPair(ha, hb, out = new Contact()) {
      const a = this._idx(ha), b = this._idx(hb);
      out.toi = -1;
      return collide(this, a, b, out) ? out : null;
    }
    _qOK(i, mask, triggers) {
      const f = this.flags[i];
      return f & F_ENABLED && (triggers || !(f & F_TRIGGER)) && (this.layer[i] & mask) !== 0;
    }
    /**
     * レイキャスト。最も近い命中を { handle, t, nx,ny,nz, px,py,pz, inside, userData } で返す（なければ null）。
     * dir は正規化されていなくてよい。mask は衝突体の layer と AND を取る。triggers:true で Trigger も対象。
     * 始点が形状内部なら t=0, inside=true。
     */
    raycast(ox, oy, oz, dx, dy, dz, maxDistance = Infinity, mask = ALL, triggers = false, out = {}) {
      this._ensureReady();
      const l = Math.hypot(dx, dy, dz);
      if (!(l > 0)) return null;
      dx /= l;
      dy /= l;
      dz /= l;
      let best = -1, bt = maxDistance;
      const h = this._hit;
      let bnx = 0, bny = 0, bnz = 0, bin = false;
      const fn = (i, tmax) => {
        if (!this._qOK(i, mask, triggers)) return tmax;
        if (rayShape(this, i, ox, oy, oz, dx, dy, dz, tmax, h) && h.t <= tmax && (best < 0 || h.t < bt || h.t === bt && i < best)) {
          best = i;
          bt = h.t;
          bnx = h.nx;
          bny = h.ny;
          bnz = h.nz;
          bin = h.inside;
          return h.t;
        }
        return tmax;
      };
      const tm = this.bp.raycast(ox, oy, oz, dx, dy, dz, maxDistance, fn);
      void tm;
      for (const p of this.planes) fn(p, bt);
      if (best < 0) return null;
      out.handle = this.alloc.handleAt(best);
      out.t = bt;
      out.nx = bnx;
      out.ny = bny;
      out.nz = bnz;
      out.px = ox + dx * bt;
      out.py = oy + dy * bt;
      out.pz = oz + dz * bt;
      out.inside = bin;
      out.userData = this.userData[best];
      return out;
    }
    /** レイ上のすべての命中（距離昇順）。maxHits で打ち切り。 */
    raycastAll(ox, oy, oz, dx, dy, dz, maxDistance = Infinity, mask = ALL, triggers = false, maxHits = 1024) {
      this._ensureReady();
      const l = Math.hypot(dx, dy, dz);
      if (!(l > 0)) return [];
      dx /= l;
      dy /= l;
      dz /= l;
      const hits = [], h = new RayHit();
      const fn = (i, tmax) => {
        if (this._qOK(i, mask, triggers) && rayShape(this, i, ox, oy, oz, dx, dy, dz, maxDistance, h) && h.t <= maxDistance) hits.push({ handle: this.alloc.handleAt(i), t: h.t, nx: h.nx, ny: h.ny, nz: h.nz, px: ox + dx * h.t, py: oy + dy * h.t, pz: oz + dz * h.t, inside: h.inside, userData: this.userData[i] });
        return tmax;
      };
      this.bp.raycast(ox, oy, oz, dx, dy, dz, maxDistance, fn);
      for (const p of this.planes) fn(p, maxDistance);
      hits.sort((p, q) => p.t - q.t || p.handle - q.handle);
      if (hits.length > maxHits) hits.length = maxHits;
      return hits;
    }
    /** AABB と重なる衝突体（AABB レベル。厳密な形状判定ではない）のハンドルを out に追加。 */
    queryAABB(x0, y0, z0, x1, y1, z1, mask = ALL, triggers = true, out = []) {
      this._ensureReady();
      this.bp.queryAABB(x0, y0, z0, x1, y1, z1, (i) => {
        if (this._qOK(i, mask, triggers)) out.push(this.alloc.handleAt(i));
      });
      return out;
    }
    /** 中心 (x,y,z)・半径 r の球と厳密に重なる衝突体を { handle, distance } で返す（距離昇順＝近傍検索）。distance は表面間距離（負なら貫入）。 */
    queryRadius(x, y, z, r, mask = ALL, triggers = true, out = []) {
      this._ensureReady();
      const c = this._c2, tmp = [];
      this.bp.queryAABB(x - r, y - r, z - r, x + r, y + r, z + r, (i) => {
        if (!this._qOK(i, mask, triggers)) return;
        const d = pointDistance(this, i, x, y, z, c);
        if (d < r) tmp.push({ handle: this.alloc.handleAt(i), distance: d });
      });
      for (const p of this.planes) if (this._qOK(p, mask, triggers)) {
        const d = pointDistance(this, p, x, y, z, c);
        if (d < r) tmp.push({ handle: this.alloc.handleAt(p), distance: d });
      }
      tmp.sort((a, b) => a.distance - b.distance || a.handle - b.handle);
      for (const t of tmp) out.push(t);
      return out;
    }
    /**
     * 半径 r の球を (x,y,z) から変位 (dx,dy,dz) だけ動かしたとき最初に触れる衝突体。{ handle, toi(0..1), nx,ny,nz(形状→球), px,py,pz, depth } or null。
     * キャラクターの移動や弾の事前判定に使える。
     */
    sweepSphere(x, y, z, r, dx, dy, dz, mask = ALL, triggers = false, out = {}) {
      this._ensureReady();
      const c = this._c2;
      let best = -1, bt = Infinity;
      const A = [Math.min(x, x + dx) - r, Math.min(y, y + dy) - r, Math.min(z, z + dz) - r, Math.max(x, x + dx) + r, Math.max(y, y + dy) + r, Math.max(z, z + dz) + r];
      const test = (i) => {
        if (!this._qOK(i, mask, triggers)) return;
        if (sweepSphere(this, i, x, y, z, r, dx, dy, dz, c) && (c.toi < bt || c.toi === bt && i < best)) {
          bt = c.toi;
          best = i;
          out.nx = c.nx;
          out.ny = c.ny;
          out.nz = c.nz;
          out.px = c.px;
          out.py = c.py;
          out.pz = c.pz;
          out.depth = c.depth;
        }
      };
      this.bp.queryAABB(A[0], A[1], A[2], A[3], A[4], A[5], test);
      for (const p of this.planes) test(p);
      if (best < 0) return null;
      out.handle = this.alloc.handleAt(best);
      out.toi = bt;
      out.userData = this.userData[best];
      return out;
    }
    /* ------------------------------------------------------------ 検証・デバッグ補助 */
    /** 現在位置での真の交差ペアを総当たりで求める（テスト基準。フィルタ適用・Trigger含む・静的どうし除外）。 */
    bruteForcePairs() {
      const out = [], n = this.alloc.highWaterMark, c = new Contact();
      for (let i = 0; i < n; i++) {
        if (!this.alloc.isIndexLive(i) || !(this.flags[i] & F_ENABLED)) continue;
        for (let j = i + 1; j < n; j++) {
          if (!this.alloc.isIndexLive(j) || !(this.flags[j] & F_ENABLED)) continue;
          if (this.flags[i] & F_STATIC && this.flags[j] & F_STATIC) continue;
          if (!this._filterOK(i, j)) continue;
          if (collide(this, i, j, c)) out.push([i, j]);
        }
      }
      return out;
    }
    /** 現在の接触ペアを [indexA, indexB] の配列で（昇順）返す。 */
    contactPairs() {
      const out = [];
      for (const r of this.pairs.values()) out.push([r.a, r.b]);
      out.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      return out;
    }
    /** デバッグ描画用: 各衝突体を fn(handle, typeName, pos, rotm, par, flags, aabb) で列挙。 */
    forEachShape(fn) {
      for (let i = 0; i < this.alloc.highWaterMark; i++) if (this.alloc.isIndexLive(i)) fn(this.alloc.handleAt(i), SHAPE_NAMES[this.type[i]], this.pos.subarray(i * 3, i * 3 + 3), this.rotm.subarray(i * 9, i * 9 + 9), this.par.subarray(i * 4, i * 4 + 4), this.flags[i], this.aabb.subarray(i * 6, i * 6 + 6));
    }
    dispose() {
      this.pairs.clear();
      this.events.length = 0;
      this.bp = null;
      this.alloc.clear();
      this.userData.length = 0;
      this.onEvent = null;
    }
  };

  // src/timestep.js
  var FixedTimestep = class {
    constructor({ fixedDt = 1 / 60, maxSubSteps = 5, maxFrameDt = 0.25, timeScale = 1, paused = false } = {}) {
      if (!(fixedDt > 0)) throw new RangeError("FixedTimestep: fixedDt \u306F\u6B63\u306E\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
      this.fixedDt = fixedDt;
      this.maxSubSteps = Math.max(1, maxSubSteps | 0);
      this.maxFrameDt = maxFrameDt;
      this.timeScale = timeScale;
      this.paused = paused;
      this.acc = 0;
      this.steps = 0;
      this.droppedTime = 0;
      this.lastSubSteps = 0;
      this.clampedFrames = 0;
    }
    get simTime() {
      return this.steps * this.fixedDt;
    }
    get alpha() {
      return this.acc / this.fixedDt;
    }
    pause() {
      this.paused = true;
      return this;
    }
    resume() {
      this.paused = false;
      return this;
    }
    setTimeScale(v) {
      if (!(v >= 0) || !isFinite(v)) throw new RangeError("timeScale \u306F 0 \u4EE5\u4E0A\u306E\u6709\u9650\u6570");
      this.timeScale = v;
      return this;
    }
    /** 一時停止中に 1 ステップだけ進める（デバッグ用コマ送り）。 */
    stepOnce(stepFn) {
      stepFn(this.fixedDt, this.steps++);
      return this;
    }
    update(realDt, stepFn) {
      this.lastSubSteps = 0;
      if (this.paused || !(realDt > 0) || !isFinite(realDt)) return 0;
      if (realDt > this.maxFrameDt) {
        realDt = this.maxFrameDt;
        this.clampedFrames++;
      }
      this.acc += realDt * this.timeScale;
      const f = this.fixedDt;
      let n = 0;
      while (this.acc >= f && n < this.maxSubSteps) {
        stepFn(f, this.steps++);
        this.acc -= f;
        n++;
      }
      if (this.acc >= f) {
        this.droppedTime += this.acc - this.acc % f;
        this.acc %= f;
      }
      this.lastSubSteps = n;
      return n;
    }
    reset() {
      this.acc = 0;
      this.steps = 0;
      this.droppedTime = 0;
      this.lastSubSteps = 0;
      return this;
    }
  };
  var Interpolator = class {
    constructor(count, { rotations = false } = {}) {
      this.count = count;
      this.prev = new Float32Array(count * 3);
      this.curr = new Float32Array(count * 3);
      this.primed = false;
      this.rotations = rotations;
      if (rotations) {
        this.prevQ = new Float32Array(count * 4);
        this.currQ = new Float32Array(count * 4);
      }
    }
    capture(pos, quat2 = null) {
      this.prev.set(this.primed ? this.curr : pos.subarray(0, this.count * 3));
      this.curr.set(pos.subarray(0, this.count * 3));
      if (this.rotations && quat2) {
        this.prevQ.set(this.primed ? this.currQ : quat2.subarray(0, this.count * 4));
        this.currQ.set(quat2.subarray(0, this.count * 4));
      }
      this.primed = true;
      return this;
    }
    lerp(out, alpha) {
      const a = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha, p = this.prev, c = this.curr, n = this.count * 3;
      for (let k = 0; k < n; k++) out[k] = p[k] + (c[k] - p[k]) * a;
      return out;
    }
    slerp(out, alpha) {
      if (!this.rotations) throw new Error("Interpolator: rotations:true \u3067\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
      const a = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha, p = this.prevQ, c = this.currQ;
      for (let i = 0; i < this.count; i++) {
        const o = i * 4;
        let bx = c[o], by = c[o + 1], bz = c[o + 2], bw = c[o + 3], d = p[o] * bx + p[o + 1] * by + p[o + 2] * bz + p[o + 3] * bw;
        if (d < 0) {
          d = -d;
          bx = -bx;
          by = -by;
          bz = -bz;
          bw = -bw;
        }
        let s0, s1;
        if (1 - d > 1e-6) {
          const om = Math.acos(d > 1 ? 1 : d), so = Math.sin(om);
          s0 = Math.sin((1 - a) * om) / so;
          s1 = Math.sin(a * om) / so;
        } else {
          s0 = 1 - a;
          s1 = a;
        }
        const x = s0 * p[o] + s1 * bx, y = s0 * p[o + 1] + s1 * by, z = s0 * p[o + 2] + s1 * bz, w = s0 * p[o + 3] + s1 * bw, l = Math.hypot(x, y, z, w) || 1;
        out[o] = x / l;
        out[o + 1] = y / l;
        out[o + 2] = z / l;
        out[o + 3] = w / l;
      }
      return out;
    }
  };

  // src/profiler.js
  var StatWindow = class {
    constructor(size = 240) {
      this.size = size;
      this.buf = new Float64Array(size);
      this.n = 0;
      this.i = 0;
      this._sorted = new Float64Array(size);
      this._dirty = true;
      this.total = 0;
    }
    push(v) {
      this.buf[this.i] = v;
      this.i = (this.i + 1) % this.size;
      if (this.n < this.size) this.n++;
      this._dirty = true;
      this.total++;
    }
    clear() {
      this.n = 0;
      this.i = 0;
      this._dirty = true;
    }
    get last() {
      return this.n ? this.buf[(this.i - 1 + this.size) % this.size] : 0;
    }
    mean() {
      if (!this.n) return 0;
      let s = 0;
      for (let k = 0; k < this.n; k++) s += this.buf[k];
      return s / this.n;
    }
    max() {
      let m = -Infinity;
      for (let k = 0; k < this.n; k++) if (this.buf[k] > m) m = this.buf[k];
      return this.n ? m : 0;
    }
    min() {
      let m = Infinity;
      for (let k = 0; k < this.n; k++) if (this.buf[k] < m) m = this.buf[k];
      return this.n ? m : 0;
    }
    _sort() {
      if (this._dirty) {
        const t = this._sorted.subarray(0, this.n);
        t.set(this.buf.subarray(0, this.n));
        t.sort();
        this._dirty = false;
      }
      return this._sorted.subarray(0, this.n);
    }
    /** p: 0..1。最近傍順位法（n=100, p=0.95 → 95 番目の値）。 */
    percentile(p) {
      if (!this.n) return 0;
      const t = this._sort();
      return t[Math.min(this.n - 1, Math.max(0, Math.ceil(this.n * p) - 1))];
    }
    median() {
      return this.percentile(0.5);
    }
    summary() {
      return { count: this.n, last: this.last, mean: this.mean(), median: this.median(), p95: this.percentile(0.95), p99: this.percentile(0.99), max: this.max(), min: this.min() };
    }
  };
  var Profiler = class {
    constructor({ windowSize = 240, enabled = true, historyFrames = 0 } = {}) {
      this.windowSize = windowSize;
      this.enabled = enabled;
      this.metrics = /* @__PURE__ */ new Map();
      this.frames = 0;
      this.historyFrames = historyFrames;
      this.history = [];
    }
    _m(name, kind, unit) {
      let m = this.metrics.get(name);
      if (!m) {
        m = { name, kind, unit: unit === void 0 ? kind === "time" ? "ms" : "" : unit, win: new StatWindow(this.windowSize), acc: 0, touched: false, t0: 0, open: false, supported: true, reason: "" };
        this.metrics.set(name, m);
      }
      return m;
    }
    begin(name) {
      if (!this.enabled) return;
      const m = this._m(name, "time");
      m.t0 = now();
      m.open = true;
    }
    end(name) {
      if (!this.enabled) return 0;
      const m = this.metrics.get(name);
      if (!m || !m.open) return 0;
      const d = now() - m.t0;
      m.open = false;
      m.acc += d;
      m.touched = true;
      return d;
    }
    /** fn の実行時間を name へ記録して戻り値を返す。 */
    scope(name, fn) {
      this.begin(name);
      try {
        return fn();
      } finally {
        this.end(name);
      }
    }
    /** 値をフレーム内で合算して記録（時間 ms にもカウントにも使える）。 */
    record(name, value, { unit, kind = "sum" } = {}) {
      if (!this.enabled) return;
      const m = this._m(name, kind === "sum" ? "count" : kind, unit);
      m.acc += value;
      m.touched = true;
    }
    /** 合算しない値（最後の値を採用）。 */
    gauge(name, value, { unit } = {}) {
      if (!this.enabled) return;
      const m = this._m(name, "gauge", unit);
      m.acc = value;
      m.touched = true;
    }
    /** 取得できない指標。snapshot で supported:false / 値 null として現れる。 */
    unsupported(name, reason = "") {
      const m = this._m(name, "time");
      m.supported = false;
      m.reason = reason;
    }
    /** フレーム終了: 今フレームで触れた指標を窓へ push して初期化。 */
    endFrame() {
      if (!this.enabled) return;
      this.frames++;
      for (const m of this.metrics.values()) if (m.supported && m.touched) {
        m.win.push(m.acc);
        m.touched = false;
        if (m.kind !== "gauge") m.acc = 0;
      }
      if (this.historyFrames > 0) {
        const row = { frame: this.frames };
        for (const m of this.metrics.values()) if (m.supported) row[m.name] = m.win.last;
        this.history.push(row);
        if (this.history.length > this.historyFrames) this.history.shift();
      }
    }
    reset() {
      for (const m of this.metrics.values()) {
        m.win.clear();
        m.acc = 0;
        m.touched = false;
      }
      this.frames = 0;
      this.history.length = 0;
    }
    get(name) {
      const m = this.metrics.get(name);
      return m ? m.supported ? m.win.summary() : null : void 0;
    }
    /** FPS（フレーム時間 'frame' の平均から）。 */
    get fps() {
      const m = this.metrics.get("frame");
      const mean = m ? m.win.mean() : 0;
      return mean > 0 ? 1e3 / mean : 0;
    }
    snapshot() {
      const out = {};
      for (const m of this.metrics.values()) out[m.name] = m.supported ? Object.assign({ unit: m.unit, supported: true }, m.win.summary()) : { unit: m.unit, supported: false, reason: m.reason, count: 0, last: null, mean: null, median: null, p95: null, p99: null, max: null, min: null };
      return out;
    }
    /** 集計値の CSV（1 指標 1 行）。 */
    toCSV() {
      const rows = ["metric,unit,supported,count,last,mean,median,p95,p99,max,min"], f = (v) => v === null ? "" : Math.round(v * 1e4) / 1e4;
      for (const [k, s] of Object.entries(this.snapshot())) rows.push([k, s.unit, s.supported, s.count, f(s.last), f(s.mean), f(s.median), f(s.p95), f(s.p99), f(s.max), f(s.min)].join(","));
      return rows.join("\n") + "\n";
    }
    /** historyFrames > 0 のとき、フレームごとの値の CSV。 */
    historyCSV() {
      const keys = [];
      for (const r of this.history) for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k);
      return [keys.join(","), ...this.history.map((r) => keys.map((k) => r[k] === void 0 ? "" : Math.round(r[k] * 1e4) / 1e4).join(","))].join("\n") + "\n";
    }
    /** 2 つの snapshot() を比較: 各指標の before/after の中央値・P95 と変化率（after/before）。 */
    static compare(before, after) {
      const out = {};
      for (const k of Object.keys(after)) {
        const a = before[k], b = after[k];
        if (!a || !b || !a.supported || !b.supported) continue;
        const r = (x, y) => x > 0 ? y / x : null;
        out[k] = { unit: b.unit, medianBefore: a.median, medianAfter: b.median, medianRatio: r(a.median, b.median), p95Before: a.p95, p95After: b.p95, p95Ratio: r(a.p95, b.p95) };
      }
      return out;
    }
  };

  // src/input.js
  var InputManager = class {
    constructor({ element = null, keyTarget = null, gamepads = true, deadzone = 0.15, preventContextMenu = false } = {}) {
      this.element = element;
      this.keyTarget = keyTarget || (typeof window !== "undefined" ? window : null);
      this.keys = /* @__PURE__ */ new Set();
      this.keysPressed = /* @__PURE__ */ new Set();
      this.keysReleased = /* @__PURE__ */ new Set();
      this.mouse = { x: 0, y: 0, dx: 0, dy: 0, wheel: 0, buttons: 0, pressed: 0, released: 0 };
      this.touches = /* @__PURE__ */ new Map();
      this.pad = { connected: false, buttons: [], axes: [], buttonsPressed: [], id: "" };
      this._prevPadButtons = [];
      this.deadzone = deadzone;
      this.gamepads = gamepads;
      this.actions = /* @__PURE__ */ new Map();
      this.axes = /* @__PURE__ */ new Map();
      this._off = [];
      this.disposed = false;
      this._preventContextMenu = preventContextMenu;
      this._bind();
    }
    _on(t, type, fn, opt) {
      if (!t || !t.addEventListener) return;
      t.addEventListener(type, fn, opt);
      this._off.push(() => t.removeEventListener(type, fn, opt));
    }
    _pos(e) {
      const el = this.element;
      let x = e.clientX || 0, y = e.clientY || 0;
      if (el && el.getBoundingClientRect) {
        const r = el.getBoundingClientRect();
        x -= r.left;
        y -= r.top;
      }
      return [x, y];
    }
    _bind() {
      const kt = this.keyTarget, el = this.element;
      this._on(kt, "keydown", (e) => {
        if (!this.keys.has(e.code)) this.keysPressed.add(e.code);
        this.keys.add(e.code);
      });
      this._on(kt, "keyup", (e) => {
        this.keys.delete(e.code);
        this.keysReleased.add(e.code);
      });
      this._on(kt, "blur", () => {
        this.keys.clear();
        this.mouse.buttons = 0;
        this.touches.clear();
      });
      this._on(el, "pointerdown", (e) => {
        const [x, y] = this._pos(e);
        if (e.pointerType === "touch") this.touches.set(e.pointerId, { x, y, startX: x, startY: y, type: "touch" });
        else {
          this.mouse.buttons |= 1 << (e.button | 0);
          this.mouse.pressed |= 1 << (e.button | 0);
        }
        this.mouse.x = x;
        this.mouse.y = y;
      });
      this._on(el, "pointermove", (e) => {
        const [x, y] = this._pos(e);
        if (e.pointerType === "touch") {
          const t = this.touches.get(e.pointerId);
          if (t) {
            t.x = x;
            t.y = y;
          }
        } else {
          this.mouse.dx += e.movementX !== void 0 ? e.movementX : x - this.mouse.x;
          this.mouse.dy += e.movementY !== void 0 ? e.movementY : y - this.mouse.y;
        }
        this.mouse.x = x;
        this.mouse.y = y;
      });
      const up = (e) => {
        if (e.pointerType === "touch") this.touches.delete(e.pointerId);
        else {
          this.mouse.buttons &= ~(1 << (e.button | 0));
          this.mouse.released |= 1 << (e.button | 0);
        }
      };
      this._on(el, "pointerup", up);
      this._on(el, "pointercancel", up);
      this._on(el, "wheel", (e) => {
        this.mouse.wheel += e.deltaY || 0;
      });
      if (this._preventContextMenu) this._on(el, "contextmenu", (e) => e.preventDefault && e.preventDefault());
    }
    /* ---- 状態 ---- */
    isKeyDown(code) {
      return this.keys.has(code);
    }
    wasKeyPressed(code) {
      return this.keysPressed.has(code);
    }
    wasKeyReleased(code) {
      return this.keysReleased.has(code);
    }
    isMouseDown(b = 0) {
      return (this.mouse.buttons >> b & 1) === 1;
    }
    wasMousePressed(b = 0) {
      return (this.mouse.pressed >> b & 1) === 1;
    }
    wasMouseReleased(b = 0) {
      return (this.mouse.released >> b & 1) === 1;
    }
    get touchCount() {
      return this.touches.size;
    }
    /** ゲームパッドを読む（毎フレーム 1 回）。API が無い環境では何もしない。 */
    poll() {
      if (!this.gamepads || typeof navigator === "undefined" || !navigator.getGamepads) return this;
      let gp = null;
      const list = navigator.getGamepads();
      for (let i = 0; i < list.length; i++) if (list[i] && list[i].connected) {
        gp = list[i];
        break;
      }
      const p = this.pad;
      if (!gp) {
        p.connected = false;
        p.buttons.length = 0;
        p.axes.length = 0;
        p.buttonsPressed.length = 0;
        this._prevPadButtons.length = 0;
        return this;
      }
      p.connected = true;
      p.id = gp.id;
      p.axes.length = gp.axes.length;
      p.buttons.length = gp.buttons.length;
      p.buttonsPressed.length = gp.buttons.length;
      for (let i = 0; i < gp.axes.length; i++) p.axes[i] = Math.abs(gp.axes[i]) < this.deadzone ? 0 : gp.axes[i];
      for (let i = 0; i < gp.buttons.length; i++) {
        const d = gp.buttons[i].pressed;
        p.buttonsPressed[i] = d && !this._prevPadButtons[i];
        p.buttons[i] = d;
        this._prevPadButtons[i] = d;
      }
      return this;
    }
    /** フレーム末尾で呼ぶ: そのフレームだけ真の pressed/released と、マウス差分を消す。 */
    endFrame() {
      this.keysPressed.clear();
      this.keysReleased.clear();
      this.mouse.dx = this.mouse.dy = this.mouse.wheel = 0;
      this.mouse.pressed = this.mouse.released = 0;
      return this;
    }
    /* ---- アクション ---- */
    bindAction(name, sources) {
      this.actions.set(name, Array.isArray(sources) ? sources.slice() : [sources]);
      return this;
    }
    unbindAction(name) {
      return this.actions.delete(name);
    }
    _src(s, mode) {
      const p = s.split(":");
      switch (p[0]) {
        case "key":
          return mode === "down" ? this.keys.has(p[1]) : mode === "pressed" ? this.keysPressed.has(p[1]) : this.keysReleased.has(p[1]);
        case "mouse": {
          const b = +p[1] | 0;
          return mode === "down" ? this.isMouseDown(b) : mode === "pressed" ? this.wasMousePressed(b) : this.wasMouseReleased(b);
        }
        case "pad": {
          const b = +p[2] | 0;
          return mode === "down" ? !!this.pad.buttons[b] : mode === "pressed" ? !!this.pad.buttonsPressed[b] : false;
        }
        case "touch":
          return mode === "down" && this.touches.size > 0;
        default:
          throw new RangeError("\u672A\u77E5\u306E\u5165\u529B\u30BD\u30FC\u30B9: " + s);
      }
    }
    _act(name, mode) {
      const a = this.actions.get(name);
      if (!a) return false;
      for (let i = 0; i < a.length; i++) if (this._src(a[i], mode)) return true;
      return false;
    }
    actionDown(name) {
      return this._act(name, "down");
    }
    actionPressed(name) {
      return this._act(name, "pressed");
    }
    actionReleased(name) {
      return this._act(name, "released");
    }
    bindAxis(name, def) {
      this.axes.set(name, def);
      return this;
    }
    /** -1..1。キーの負/正 とゲームパッド軸のうち絶対値が大きい方。 */
    axis(name) {
      const d = this.axes.get(name);
      if (!d) return 0;
      let v = 0;
      for (const s of d.negative || []) if (this._src(s, "down")) {
        v -= 1;
        break;
      }
      for (const s of d.positive || []) if (this._src(s, "down")) {
        v += 1;
        break;
      }
      if (d.pad !== void 0) {
        const a = this.pad.axes[d.pad] || 0;
        if (Math.abs(a) > Math.abs(v)) v = a;
      }
      return v < -1 ? -1 : v > 1 ? 1 : v;
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      for (const f of this._off) f();
      this._off.length = 0;
      this.keys.clear();
      this.touches.clear();
    }
  };

  // src/audio.js
  var AudioSystem = class {
    constructor({ contextFactory = null, maxVoices = 64 } = {}) {
      this.ctx = null;
      this.supported = false;
      this.buffers = /* @__PURE__ */ new Map();
      this._loading = /* @__PURE__ */ new Map();
      this.maxVoices = maxVoices;
      this.voices = /* @__PURE__ */ new Set();
      this.music = null;
      this.volumes = { master: 1, sfx: 1, music: 1 };
      this.stolen = 0;
      this.played = 0;
      this.dropped = 0;
      try {
        const make = contextFactory || (typeof AudioContext !== "undefined" ? () => new AudioContext() : typeof webkitAudioContext !== "undefined" ? () => new webkitAudioContext() : null);
        if (make) {
          this.ctx = make();
          this.supported = true;
          this._buildGraph();
        }
      } catch (_) {
        this.ctx = null;
        this.supported = false;
      }
    }
    _buildGraph() {
      const c = this.ctx;
      this.master = c.createGain();
      this.sfxBus = c.createGain();
      this.musicBus = c.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.master.connect(c.destination);
    }
    /** ブラウザの自動再生制限の解除（ユーザー操作のイベントハンドラ内で呼ぶ）。 */
    unlock() {
      if (this.ctx && this.ctx.state === "suspended" && !this._paused) return this.ctx.resume();
      return Promise.resolve();
    }
    setVolume(bus, v) {
      if (!(bus in this.volumes)) throw new RangeError("bus \u306F master / sfx / music");
      v = Math.max(0, +v || 0);
      this.volumes[bus] = v;
      if (this.ctx) {
        const g = bus === "master" ? this.master : bus === "sfx" ? this.sfxBus : this.musicBus;
        g.gain.value = v;
      }
      return this;
    }
    /** 取得済みバッファを登録する（decodeAudioData 済み）。 */
    add(name, buffer) {
      this.buffers.set(name, buffer);
      return this;
    }
    load(name, url) {
      if (this.buffers.has(name)) return Promise.resolve(this.buffers.get(name));
      if (this._loading.has(name)) return this._loading.get(name);
      if (!this.supported) return Promise.resolve(null);
      const p = fetch(url).then((r) => {
        if (!r.ok) throw new Error("\u97F3\u58F0\u306E\u8AAD\u307F\u8FBC\u307F\u5931\u6557 " + r.status + ": " + url);
        return r.arrayBuffer();
      }).then((ab) => this.ctx.decodeAudioData(ab)).then((buf) => {
        this.buffers.set(name, buf);
        this._loading.delete(name);
        return buf;
      }).catch((e) => {
        this._loading.delete(name);
        throw e;
      });
      this._loading.set(name, p);
      return p;
    }
    has(name) {
      return this.buffers.has(name);
    }
    _start(name, o, bus) {
      if (!this.supported) return null;
      const buf = this.buffers.get(name);
      if (!buf) return null;
      if (this.voices.size >= this.maxVoices) {
        const oldest = this.voices.values().next().value;
        this._stopVoice(oldest);
        this.stolen++;
      }
      const c = this.ctx, src = c.createBufferSource();
      src.buffer = buf;
      src.loop = !!o.loop;
      if (o.rate) src.playbackRate.value = o.rate;
      const g = c.createGain();
      g.gain.value = o.volume === void 0 ? 1 : o.volume;
      let node = g, panner = null;
      src.connect(g);
      if (o.position && c.createPanner) {
        panner = c.createPanner();
        panner.panningModel = "HRTF";
        panner.distanceModel = "inverse";
        panner.refDistance = o.refDistance || 1;
        panner.maxDistance = o.maxDistance || 100;
        panner.rolloffFactor = o.rolloff === void 0 ? 1 : o.rolloff;
        this._setPos(panner, o.position);
        g.connect(panner);
        node = panner;
      }
      node.connect(bus);
      const v = { src, gain: g, panner, name };
      this.voices.add(v);
      src.onended = () => {
        this.voices.delete(v);
      };
      src.start(0, o.offset || 0);
      this.played++;
      return v;
    }
    _setPos(p, pos) {
      if (p.positionX) {
        p.positionX.value = pos[0];
        p.positionY.value = pos[1];
        p.positionZ.value = pos[2];
      } else if (p.setPosition) p.setPosition(pos[0], pos[1], pos[2]);
    }
    _stopVoice(v) {
      try {
        v.src.stop();
      } catch (_) {
      }
      v.src.onended = null;
      this.voices.delete(v);
    }
    play(name, o = {}) {
      return this._start(name, o, this.sfxBus);
    }
    stop(voice) {
      if (voice) this._stopVoice(voice);
      return this;
    }
    playMusic(name, { loop = true, volume = 1, fade = 0 } = {}) {
      if (!this.supported) return null;
      this.stopMusic(0);
      const v = this._start(name, { loop, volume: fade > 0 ? 0 : volume }, this.musicBus);
      if (!v) return null;
      this.music = v;
      if (fade > 0) {
        const t = this.ctx.currentTime;
        v.gain.gain.setValueAtTime(0, t);
        v.gain.gain.linearRampToValueAtTime(volume, t + fade);
      }
      return v;
    }
    stopMusic(fade = 0) {
      const v = this.music;
      if (!v) return this;
      this.music = null;
      if (fade > 0 && this.supported) {
        const t = this.ctx.currentTime;
        v.gain.gain.setValueAtTime(v.gain.gain.value, t);
        v.gain.gain.linearRampToValueAtTime(0, t + fade);
        try {
          v.src.stop(t + fade);
        } catch (_) {
        }
      } else this._stopVoice(v);
      return this;
    }
    setPosition(voice, pos) {
      if (voice && voice.panner) this._setPos(voice.panner, pos);
      return this;
    }
    setListener(pos, fwd = [0, 0, -1], up = [0, 1, 0]) {
      if (!this.supported) return this;
      const l = this.ctx.listener;
      if (l.positionX) {
        l.positionX.value = pos[0];
        l.positionY.value = pos[1];
        l.positionZ.value = pos[2];
        l.forwardX.value = fwd[0];
        l.forwardY.value = fwd[1];
        l.forwardZ.value = fwd[2];
        l.upX.value = up[0];
        l.upY.value = up[1];
        l.upZ.value = up[2];
      } else {
        if (l.setPosition) l.setPosition(pos[0], pos[1], pos[2]);
        if (l.setOrientation) l.setOrientation(fwd[0], fwd[1], fwd[2], up[0], up[1], up[2]);
      }
      return this;
    }
    /** 全体を一時停止（ゲームのポーズ）。再生位置は保たれる。 */
    pause() {
      this._paused = true;
      return this.ctx && this.ctx.suspend ? this.ctx.suspend() : Promise.resolve();
    }
    resume() {
      this._paused = false;
      return this.ctx && this.ctx.resume ? this.ctx.resume() : Promise.resolve();
    }
    get paused() {
      return !!this._paused;
    }
    stats() {
      return { supported: this.supported, voices: this.voices.size, buffers: this.buffers.size, played: this.played, stolen: this.stolen, state: this.ctx ? this.ctx.state : "unsupported" };
    }
    dispose() {
      for (const v of Array.from(this.voices)) this._stopVoice(v);
      this.music = null;
      if (this.ctx && this.ctx.close) this.ctx.close().catch(() => {
      });
      this.ctx = null;
      this.supported = false;
      this.buffers.clear();
    }
  };

  // src/resources.js
  function parseOBJ(text, { name = "" } = {}) {
    const V = [], T = [], N = [], pos = [], uv = [], nor = [], idx = [], map = /* @__PURE__ */ new Map();
    let hasUV = false, hasN = false;
    const lines = String(text).split(/\r?\n/);
    const ref = (s, len) => {
      const k = parseInt(s, 10);
      if (!Number.isFinite(k) || k === 0) throw new MassiveEngineError("OBJ: \u4E0D\u6B63\u306A\u9762\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9: " + s, "E_OBJ");
      return k > 0 ? k - 1 : len + k;
    };
    for (let li = 0; li < lines.length; li++) {
      const l = lines[li].trim();
      if (!l || l[0] === "#") continue;
      const p = l.split(/\s+/);
      switch (p[0]) {
        case "v":
          V.push(+p[1], +p[2], +p[3]);
          break;
        case "vt":
          T.push(+p[1], +(p[2] || 0));
          break;
        case "vn":
          N.push(+p[1], +p[2], +p[3]);
          break;
        case "f": {
          const face = [];
          for (let k = 1; k < p.length; k++) {
            const key = p[k];
            let id = map.get(key);
            if (id === void 0) {
              const a = key.split("/"), vi = ref(a[0], V.length / 3);
              if (vi * 3 + 2 >= V.length) throw new MassiveEngineError("OBJ: \u9802\u70B9\u756A\u53F7\u304C\u7BC4\u56F2\u5916 (\u884C " + (li + 1) + ")", "E_OBJ");
              id = pos.length / 3;
              pos.push(V[vi * 3], V[vi * 3 + 1], V[vi * 3 + 2]);
              if (a[1]) {
                const ti = ref(a[1], T.length / 2);
                uv.push(T[ti * 2], T[ti * 2 + 1]);
                hasUV = true;
              } else uv.push(0, 0);
              if (a[2]) {
                const ni = ref(a[2], N.length / 3);
                nor.push(N[ni * 3], N[ni * 3 + 1], N[ni * 3 + 2]);
                hasN = true;
              } else nor.push(0, 0, 0);
              map.set(key, id);
            }
            face.push(id);
          }
          if (face.length < 3) throw new MassiveEngineError("OBJ: \u9762\u306E\u9802\u70B9\u304C 3 \u672A\u6E80 (\u884C " + (li + 1) + ")", "E_OBJ");
          for (let k = 1; k + 1 < face.length; k++) idx.push(face[0], face[k], face[k + 1]);
          break;
        }
        default:
          break;
      }
    }
    if (!pos.length) throw new MassiveEngineError("OBJ: \u9762\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002", "E_OBJ");
    return { name, positions: pos, indices: idx, uvs: hasUV ? uv : null, normals: hasN && !nor.some((v, i) => i % 3 === 0 && v === 0 && nor[i + 1] === 0 && nor[i + 2] === 0) ? nor : null };
  }
  function validateGeometry(g) {
    const errs = [], vc = g.positions.length / 3;
    for (let i = 0; i < g.positions.length; i++) if (!Number.isFinite(g.positions[i])) {
      errs.push("positions[" + i + "] \u304C\u6709\u9650\u3067\u306A\u3044");
      break;
    }
    if (g.indices) {
      for (let i = 0; i < g.indices.length; i++) if (g.indices[i] >= vc) {
        errs.push("indices[" + i + "] \u304C\u7BC4\u56F2\u5916");
        break;
      }
    }
    if (g.mode === "triangles" && g.indexCount % 3) errs.push("\u4E09\u89D2\u5F62\u6570\u304C\u6574\u6570\u3067\u306A\u3044");
    for (const [k, per] of [["normals", 3], ["uvs", 2], ["colors", 3]]) if (g[k] && g[k].length !== vc * per) errs.push(k + " \u306E\u9577\u3055\u304C\u9802\u70B9\u6570\u3068\u4E0D\u4E00\u81F4");
    return errs;
  }
  function mergeGeometries(geos, mats = null) {
    let vc = 0, ic = 0;
    for (const g of geos) {
      if (g.mode !== "triangles") throw new MassiveEngineError("mergeGeometries: triangles \u306E\u307F\u5BFE\u5FDC", "E_MERGE");
      vc += g.vertexCount;
      ic += g.triangleCount * 3;
    }
    const P = new Float32Array(vc * 3), Nn = new Float32Array(vc * 3), U = new Float32Array(vc * 2), I = vc > 65535 ? new Uint32Array(ic) : new Uint16Array(ic);
    let vo = 0, io = 0;
    geos.forEach((g, gi) => {
      const m = mats && mats[gi], n = g.vertexCount;
      for (let i = 0; i < n; i++) {
        const x = g.positions[i * 3], y = g.positions[i * 3 + 1], z = g.positions[i * 3 + 2], nx = g.normals[i * 3], ny = g.normals[i * 3 + 1], nz = g.normals[i * 3 + 2], o = (vo + i) * 3;
        if (m) {
          P[o] = m[0] * x + m[4] * y + m[8] * z + m[12];
          P[o + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
          P[o + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
          const ax = m[0] * nx + m[4] * ny + m[8] * nz, ay = m[1] * nx + m[5] * ny + m[9] * nz, az = m[2] * nx + m[6] * ny + m[10] * nz, l = Math.hypot(ax, ay, az) || 1;
          Nn[o] = ax / l;
          Nn[o + 1] = ay / l;
          Nn[o + 2] = az / l;
        } else {
          P[o] = x;
          P[o + 1] = y;
          P[o + 2] = z;
          Nn[o] = nx;
          Nn[o + 1] = ny;
          Nn[o + 2] = nz;
        }
        if (g.uvs) {
          U[(vo + i) * 2] = g.uvs[i * 2];
          U[(vo + i) * 2 + 1] = g.uvs[i * 2 + 1];
        }
      }
      const cnt = g.triangleCount * 3;
      for (let k = 0; k < cnt; k++) I[io + k] = (g.indices ? g.indices[k] : k) + vo;
      vo += n;
      io += cnt;
    });
    return new Geometry({ positions: P, normals: Nn, uvs: U, indices: I });
  }
  var matKey = (o) => JSON.stringify([o.color === void 0 ? 16777215 : o.color, o.emissive || 0, o.opacity === void 0 ? 1 : o.opacity, o.transparent, o.unlit, o.specular, o.shininess, o.doubleSided, o.blending, o.vertexColors, o.depthWrite, o.alphaTest, o.map ? o.map.id : null]);
  var ResourceManager = class extends AssetManager {
    constructor() {
      super();
      this._inflight = /* @__PURE__ */ new Map();
      this._bytes = /* @__PURE__ */ new Map();
      this._mats = /* @__PURE__ */ new Map();
      this.dedupeHits = 0;
      this.fetches = 0;
    }
    _once(key, fn) {
      const c = this._inflight.get(key);
      if (c) {
        this.dedupeHits++;
        return c;
      }
      const p = fn().finally(() => this._inflight.delete(key));
      this._inflight.set(key, p);
      return p;
    }
    async _fetch(url, kind) {
      this.fetches++;
      const r = await fetch(url);
      if (!r.ok) throw new MassiveEngineError("\u8AAD\u307F\u8FBC\u307F\u5931\u6557 " + r.status + ": " + url, "E_ASSET_LOAD");
      return kind === "text" ? r.text() : kind === "json" ? r.json() : r.arrayBuffer();
    }
    loadText(url) {
      return this._once("text:" + url, () => this._fetch(url, "text"));
    }
    loadJSON(url) {
      return this._once("json:" + url, () => this._fetch(url, "json"));
    }
    loadArrayBuffer(url) {
      return this._once("buf:" + url, () => this._fetch(url, "buf"));
    }
    /** シェーダ等のソース文字列（用途は呼び出し側。エンジンのシェーダ差し替え機能は未実装）。 */
    loadShaderSource(url) {
      return this.loadText(url);
    }
    /** OBJ → Geometry。キャッシュされ、呼ぶたびに参照 +1。 */
    async loadOBJ(url) {
      const key = "geometry:" + url, e = this._e.get(key);
      if (e) {
        e.refs++;
        this.dedupeHits++;
        return e.resource;
      }
      const g = await this._once(key, async () => {
        const t = await this.loadText(url);
        return new Geometry(Object.assign(parseOBJ(t, { name: url })));
      });
      const e2 = this._e.get(key);
      if (e2) {
        e2.refs++;
        return e2.resource;
      }
      this.add(key, g);
      this._e.get(key).refs++;
      return g;
    }
    releaseOBJ(url) {
      return this.release("geometry:" + url);
    }
    /** 同じ設定の Material を共有する（マテリアルが同じ = 描画状態切り替えとバッチが減る）。 */
    material(o = {}) {
      const k = matKey(o);
      let m = this._mats.get(k);
      if (m) {
        this.dedupeHits++;
        return m;
      }
      m = new Material(o);
      this._mats.set(k, m);
      return m;
    }
    stats() {
      const s = super.stats();
      s.sharedMaterials = this._mats.size;
      s.dedupeHits = this.dedupeHits;
      s.fetches = this.fetches;
      s.inflight = this._inflight.size;
      return s;
    }
    disposeAll() {
      super.disposeAll();
      this._mats.clear();
    }
  };

  // src/debug.js
  var COLORS = { shape: "#4ade80", trigger: "#facc15", static: "#60a5fa", contact: "#f87171", ray: "#e879f9", cell: "rgba(148,163,184,.5)" };
  var DebugDraw = class {
    constructor({ canvas = null, camera = null, overlay = null, maxLines = 2e5 } = {}) {
      this.enabled = false;
      this.camera = camera;
      this.maxLines = maxLines;
      this.target = canvas;
      this.overlay = overlay;
      this.ctx = null;
      this.lines = new Float32Array(1024 * 6);
      this.lineColors = [];
      this.n = 0;
      this.texts = [];
      this.dropped = 0;
      this.lastLines = 0;
      this._ownOverlay = false;
      if (!overlay && canvas && typeof document !== "undefined" && canvas.parentElement) {
        const o = document.createElement("canvas");
        o.style.cssText = "position:absolute;pointer-events:none;left:0;top:0;width:100%;height:100%";
        o.setAttribute("data-massive-debug", "1");
        const par = canvas.parentElement;
        if (par.style && !par.style.position) par.style.position = "relative";
        par.appendChild(o);
        this.overlay = o;
        this._ownOverlay = true;
      }
      if (this.overlay && this.overlay.getContext) this.ctx = this.overlay.getContext("2d");
    }
    /* ---- プリミティブ ---- */
    line(ax, ay, az, bx, by, bz, color = "#fff") {
      if (!this.enabled) return this;
      if (this.n >= this.maxLines) {
        this.dropped++;
        return this;
      }
      if ((this.n + 1) * 6 > this.lines.length) {
        const a = new Float32Array(this.lines.length * 2);
        a.set(this.lines);
        this.lines = a;
      }
      const o = this.n * 6;
      this.lines[o] = ax;
      this.lines[o + 1] = ay;
      this.lines[o + 2] = az;
      this.lines[o + 3] = bx;
      this.lines[o + 4] = by;
      this.lines[o + 5] = bz;
      this.lineColors[this.n++] = color;
      return this;
    }
    point(x, y, z, size = 0.1, color = "#fff") {
      return this.line(x - size, y, z, x + size, y, z, color).line(x, y - size, z, x, y + size, z, color).line(x, y, z - size, x, y, z + size, color);
    }
    aabb(min, max, color = COLORS.shape) {
      if (!this.enabled) return this;
      const [x0, y0, z0] = min, [x1, y1, z1] = max;
      this.line(x0, y0, z0, x1, y0, z0, color).line(x1, y0, z0, x1, y0, z1, color).line(x1, y0, z1, x0, y0, z1, color).line(x0, y0, z1, x0, y0, z0, color);
      this.line(x0, y1, z0, x1, y1, z0, color).line(x1, y1, z0, x1, y1, z1, color).line(x1, y1, z1, x0, y1, z1, color).line(x0, y1, z1, x0, y1, z0, color);
      return this.line(x0, y0, z0, x0, y1, z0, color).line(x1, y0, z0, x1, y1, z0, color).line(x1, y0, z1, x1, y1, z1, color).line(x0, y0, z1, x0, y1, z1, color);
    }
    circle(cx, cy, cz, r, axis, color = COLORS.shape, seg = 24) {
      if (!this.enabled) return this;
      let px, py, pz;
      for (let i = 0; i <= seg; i++) {
        const a = i / seg * 6.283185307, c = Math.cos(a) * r, s = Math.sin(a) * r;
        const x = cx + (axis === 0 ? 0 : c), y = cy + (axis === 0 ? c : axis === 1 ? 0 : s), z = cz + (axis === 0 ? s : axis === 1 ? s : 0);
        if (i) this.line(px, py, pz, x, y, z, color);
        px = x;
        py = y;
        pz = z;
      }
      return this;
    }
    sphere(x, y, z, r, color = COLORS.shape) {
      return this.circle(x, y, z, r, 0, color).circle(x, y, z, r, 1, color).circle(x, y, z, r, 2, color);
    }
    ray(o, d, len = 10, color = COLORS.ray) {
      const l = Math.hypot(d[0], d[1], d[2]) || 1;
      return this.line(o[0], o[1], o[2], o[0] + d[0] / l * len, o[1] + d[1] / l * len, o[2] + d[2] / l * len, color);
    }
    text(x, y, z, str, color = "#fff") {
      if (this.enabled) this.texts.push({ x, y, z, str: String(str), color });
      return this;
    }
    /** OBB（中心・半径3軸・回転行列 rotm[0..8]=3本の軸ベクトル）の 12 辺。 */
    obb(c, h, R, color = COLORS.shape) {
      const v = [];
      for (let i = 0; i < 8; i++) {
        const sx = i & 1 ? 1 : -1, sy = i & 2 ? 1 : -1, sz = i & 4 ? 1 : -1;
        v.push([c[0] + R[0] * h[0] * sx + R[3] * h[1] * sy + R[6] * h[2] * sz, c[1] + R[1] * h[0] * sx + R[4] * h[1] * sy + R[7] * h[2] * sz, c[2] + R[2] * h[0] * sx + R[5] * h[1] * sy + R[8] * h[2] * sz]);
      }
      for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) if (!(i & bit)) {
        const j = i | bit;
        this.line(v[i][0], v[i][1], v[i][2], v[j][0], v[j][1], v[j][2], color);
      }
      return this;
    }
    capsule(c, radius, halfLen, R, color = COLORS.shape) {
      if (!this.enabled) return this;
      const ax = [R[3], R[4], R[5]];
      const a = [c[0] - ax[0] * halfLen, c[1] - ax[1] * halfLen, c[2] - ax[2] * halfLen], b = [c[0] + ax[0] * halfLen, c[1] + ax[1] * halfLen, c[2] + ax[2] * halfLen];
      this.sphere(a[0], a[1], a[2], radius, color).sphere(b[0], b[1], b[2], radius, color);
      for (const d of [[R[0], R[1], R[2]], [R[6], R[7], R[8]]]) for (const sg of [1, -1]) this.line(a[0] + d[0] * radius * sg, a[1] + d[1] * radius * sg, a[2] + d[2] * radius * sg, b[0] + d[0] * radius * sg, b[1] + d[1] * radius * sg, b[2] + d[2] * radius * sg, color);
      return this;
    }
    /** CollisionWorld の形・接触・ID を描く（形ごとに: 球/AABB/回転OBB/カプセル/平面(原点付近の格子)）。 */
    collisionWorld(w, { shapes = true, contacts = true, ids = false, planeExtent = 10 } = {}) {
      if (!this.enabled) return this;
      if (shapes) w.forEachShape((h, type, pos, R, par, flags, box) => {
        const col = flags & 4 ? COLORS.trigger : flags & 2 ? COLORS.static : COLORS.shape;
        if (type === "sphere") this.sphere(pos[0], pos[1], pos[2], par[0], col);
        else if (type === "aabb") this.aabb([pos[0] - par[0], pos[1] - par[1], pos[2] - par[2]], [pos[0] + par[0], pos[1] + par[1], pos[2] + par[2]], col);
        else if (type === "obb") this.obb(pos, par, R, col);
        else if (type === "capsule") this.capsule(pos, par[0], par[1], R, col);
        else if (type === "plane") {
          const n = [par[0], par[1], par[2]], d = par[3], o = [n[0] * d, n[1] * d, n[2] * d], t = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
          let ux = n[1] * t[2] - n[2] * t[1], uy = n[2] * t[0] - n[0] * t[2], uz = n[0] * t[1] - n[1] * t[0];
          const l = Math.hypot(ux, uy, uz);
          ux /= l;
          uy /= l;
          uz /= l;
          const vx = n[1] * uz - n[2] * uy, vy = n[2] * ux - n[0] * uz, vz = n[0] * uy - n[1] * ux, E = planeExtent;
          for (let k = -4; k <= 4; k++) {
            const f = k / 4 * E;
            this.line(o[0] + ux * f - vx * E, o[1] + uy * f - vy * E, o[2] + uz * f - vz * E, o[0] + ux * f + vx * E, o[1] + uy * f + vy * E, o[2] + uz * f + vz * E, col);
            this.line(o[0] + vx * f - ux * E, o[1] + vy * f - uy * E, o[2] + vz * f - uz * E, o[0] + vx * f + ux * E, o[1] + vy * f + uy * E, o[2] + vz * f + uz * E, col);
          }
        }
        if (ids && type !== "plane") this.text(pos[0], pos[1], pos[2], h, col);
      });
      if (contacts) w.forEachContact((ha, hb, c) => {
        this.point(c.px, c.py, c.pz, 0.1, COLORS.contact);
        this.line(c.px, c.py, c.pz, c.px + c.nx * 0.5, c.py + c.ny * 0.5, c.pz + c.nz * 0.5, COLORS.contact);
      });
      return this;
    }
    /**
     * 1.2: RigidBodyWorld の可視化（既定 OFF = this.enabled=false の間は何も積まない）。
     * opts: shapes, aabb, contacts(点), normals, depth(貫通深度の線), velocity, angularVelocity, centerOfMass, inertia(主慣性の等価箱), sleeping(色分け), scale
     */
    rigidBodyWorld(w, o = {}) {
      if (!this.enabled) return this;
      const { shapes = true, aabb = false, contacts = true, normals = true, depth = true, velocity = false, angularVelocity = false, centerOfMass = false, inertia = false, scale = 0.2, planeExtent = 10 } = o;
      const C = { active: "#4ade80", asleep: "#64748b", stat: "#60a5fa", kin: "#facc15", sensor: "#e879f9", vel: "#38bdf8", ang: "#fb923c", com: "#ffffff", inertia: "#a78bfa", aabb: "rgba(148,163,184,.7)" };
      const T = [0, 0, 0], R9 = new Float64Array(9);
      for (let i = 0; i < w.count; i++) {
        if (!w.live[i]) continue;
        const j = i * 3, bt = w.btype[i], asleep = w.sleepState[i] === 1, q = i * 4, r = i * 9;
        const col = w.extra[i] & 1 ? C.sensor : bt === 0 ? C.stat : bt === 2 ? C.kin : asleep ? C.asleep : C.active;
        const pos = [w.pos[j], w.pos[j + 1], w.pos[j + 2]], R = w.rotm.subarray(r, r + 9), par = w.par.subarray(q, q + 4), t = w.type[i];
        if (shapes) {
          if (t === 0) this.sphere(pos[0], pos[1], pos[2], par[0], col);
          else if (t === 1 || t === 2) this.obb(pos, [par[0], par[1], par[2]], R, col);
          else if (t === 3) this.capsule(pos, par[0], par[1], R, col);
          else if (t === 4) {
            const n = [par[0], par[1], par[2]], d = par[3], oo = [n[0] * d, n[1] * d, n[2] * d], tt = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
            let ux = n[1] * tt[2] - n[2] * tt[1], uy = n[2] * tt[0] - n[0] * tt[2], uz = n[0] * tt[1] - n[1] * tt[0];
            const l = Math.hypot(ux, uy, uz);
            ux /= l;
            uy /= l;
            uz /= l;
            const vx = n[1] * uz - n[2] * uy, vy = n[2] * ux - n[0] * uz, vz = n[0] * uy - n[1] * ux, E = planeExtent;
            for (let k = -4; k <= 4; k++) {
              const f = k / 4 * E;
              this.line(oo[0] + ux * f - vx * E, oo[1] + uy * f - vy * E, oo[2] + uz * f - vz * E, oo[0] + ux * f + vx * E, oo[1] + uy * f + vy * E, oo[2] + uz * f + vz * E, col);
              this.line(oo[0] + vx * f - ux * E, oo[1] + vy * f - uy * E, oo[2] + vz * f - uz * E, oo[0] + vx * f + ux * E, oo[1] + vy * f + uy * E, oo[2] + vz * f + uz * E, col);
            }
          }
        }
        if (t === 4) continue;
        if (aabb) {
          const a = w.aabb, k = i * 6;
          this.aabb([a[k], a[k + 1], a[k + 2]], [a[k + 3], a[k + 4], a[k + 5]], C.aabb);
        }
        if (centerOfMass) this.point(pos[0], pos[1], pos[2], 0.08, C.com);
        if (bt === 0) continue;
        if (velocity) this.line(pos[0], pos[1], pos[2], pos[0] + w.vel[j] * scale, pos[1] + w.vel[j + 1] * scale, pos[2] + w.vel[j + 2] * scale, C.vel);
        if (angularVelocity) this.line(pos[0], pos[1], pos[2], pos[0] + w.ang[j] * scale, pos[1] + w.ang[j + 1] * scale, pos[2] + w.ang[j + 2] * scale, C.ang);
        if (inertia && bt === 1 && !w.lockRot[i]) {
          const m = w.mass[i], Ix = 1 / w.invI[j], Iy = 1 / w.invI[j + 1], Iz = 1 / w.invI[j + 2], h = (a, b, c) => Math.sqrt(Math.max(0, 1.5 * (b + c - a) / m));
          this.obb(pos, [h(Ix, Iy, Iz), h(Iy, Ix, Iz), h(Iz, Ix, Iy)], R, C.inertia);
          void T;
          void R9;
        }
      }
      if (contacts || normals || depth) w.forEachContact((ha, hb, c) => {
        for (let p = 0; p < c.count; p++) {
          const pt = c.points[p];
          const col = c.sensor ? C.sensor : "#f87171";
          if (contacts) this.point(pt.x, pt.y, pt.z, 0.05, col);
          if (normals) this.line(pt.x, pt.y, pt.z, pt.x + c.nx * 0.3, pt.y + c.ny * 0.3, pt.z + c.nz * 0.3, "#fca5a5");
          if (depth && pt.depth > 0) this.line(pt.x, pt.y, pt.z, pt.x - c.nx * pt.depth, pt.y - c.ny * pt.depth, pt.z - c.nz * pt.depth, "#ef4444");
        }
      });
      return this;
    }
    /** 3D → 画面。カメラ背後は null。 */
    project(x, y, z, out = [0, 0]) {
      const m = this.camera.viewProjection, w = m[3] * x + m[7] * y + m[11] * z + m[15];
      if (w <= 1e-6) return null;
      out[0] = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / w * 0.5 + 0.5) * this._w;
      out[1] = (1 - ((m[1] * x + m[5] * y + m[9] * z + m[13]) / w * 0.5 + 0.5)) * this._h;
      return out;
    }
    /** 積んだ線を描いて空にする。enabled=false なら何もせず、積んだ内容も捨てる。 */
    flush() {
      const n = this.n;
      this.lastLines = n;
      const ctx = this.ctx, ov = this.overlay;
      if (!this.enabled || !ctx || !this.camera) {
        this.n = 0;
        this.texts.length = 0;
        if (ctx && ov && this._cleared !== true) {
          ctx.clearRect(0, 0, ov.width, ov.height);
          this._cleared = true;
        }
        return n;
      }
      this._cleared = false;
      const t = this.target || ov;
      if (ov && t) {
        const w = t.width || ov.width, h = t.height || ov.height;
        if (ov.width !== w) ov.width = w;
        if (ov.height !== h) ov.height = h;
      }
      this._w = ov.width;
      this._h = ov.height;
      ctx.clearRect(0, 0, this._w, this._h);
      ctx.lineWidth = Math.max(1, this._w / 800);
      const L = this.lines, m = this.camera.viewProjection;
      let cur = null;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const c = this.lineColors[i];
        if (c !== cur) {
          ctx.stroke();
          ctx.beginPath();
          ctx.strokeStyle = c;
          cur = c;
        }
        const o = i * 6;
        let ax = L[o], ay = L[o + 1], az = L[o + 2], bx = L[o + 3], by = L[o + 4], bz = L[o + 5];
        let wa = m[3] * ax + m[7] * ay + m[11] * az + m[15], wb = m[3] * bx + m[7] * by + m[11] * bz + m[15];
        const e = 1e-4;
        if (wa <= e && wb <= e) continue;
        if (wa <= e) {
          const k = (e - wa) / (wb - wa);
          ax += (bx - ax) * k;
          ay += (by - ay) * k;
          az += (bz - az) * k;
        } else if (wb <= e) {
          const k = (e - wb) / (wa - wb);
          bx += (ax - bx) * k;
          by += (ay - by) * k;
          bz += (az - bz) * k;
        }
        const pa = this.project(ax, ay, az), x0 = pa[0], y0 = pa[1], pb = this.project(bx, by, bz);
        if (!pb) continue;
        ctx.moveTo(x0, y0);
        ctx.lineTo(pb[0], pb[1]);
      }
      ctx.stroke();
      if (this.texts.length) {
        ctx.font = Math.max(10, this._w / 90) + "px monospace";
        for (const tx of this.texts) {
          const p = this.project(tx.x, tx.y, tx.z);
          if (p) {
            ctx.fillStyle = tx.color;
            ctx.fillText(tx.str, p[0] + 4, p[1] - 4);
          }
        }
      }
      this.n = 0;
      this.texts.length = 0;
      this.lineColors.length = 0;
      return n;
    }
    dispose() {
      if (this._ownOverlay && this.overlay && this.overlay.parentElement) this.overlay.parentElement.removeChild(this.overlay);
      this.overlay = null;
      this.ctx = null;
    }
  };

  // src/rigid/manifold.js
  var MAX_MANIFOLD_POINTS = 4;
  var CAP = 16;
  var EPS2 = 1e-9;
  var ContactOut = class {
    constructor() {
      this.nx = 0;
      this.ny = 1;
      this.nz = 0;
      this.count = 0;
      this.p = new Float64Array(CAP * 3);
      this.depth = new Float64Array(CAP);
      this.id = new Int32Array(CAP);
    }
  };
  function add(o, x, y, z, depth, id) {
    const k = o.count++, j = k * 3;
    o.p[j] = x;
    o.p[j + 1] = y;
    o.p[j + 2] = z;
    o.depth[k] = depth;
    o.id[k] = id;
  }
  function setN(o, x, y, z) {
    o.nx = x;
    o.ny = y;
    o.nz = z;
  }
  function perp2(ax, ay, az, out) {
    const bx = Math.abs(ax), by = Math.abs(ay), bz = Math.abs(az);
    let x, y, z;
    if (bx <= by && bx <= bz) {
      x = 0;
      y = -az;
      z = ay;
    } else if (by <= bz) {
      x = az;
      y = 0;
      z = -ax;
    } else {
      x = -ay;
      y = ax;
      z = 0;
    }
    const l = Math.hypot(x, y, z) || 1;
    out[0] = x / l;
    out[1] = y / l;
    out[2] = z / l;
  }
  var _v2 = new Float64Array(3);
  function reduce(o) {
    const n = o.count;
    if (n <= MAX_MANIFOLD_POINTS) return;
    const P = o.p, D = o.depth, I = o.id;
    let i0 = 0;
    for (let k = 1; k < n; k++) if (D[k] > D[i0]) i0 = k;
    let i1 = -1, best = -1;
    for (let k = 0; k < n; k++) {
      if (k === i0) continue;
      const dx = P[k * 3] - P[i0 * 3], dy = P[k * 3 + 1] - P[i0 * 3 + 1], dz = P[k * 3 + 2] - P[i0 * 3 + 2], d = dx * dx + dy * dy + dz * dz;
      if (d > best) {
        best = d;
        i1 = k;
      }
    }
    const ex = P[i1 * 3] - P[i0 * 3], ey = P[i1 * 3 + 1] - P[i0 * 3 + 1], ez = P[i1 * 3 + 2] - P[i0 * 3 + 2];
    let i2 = -1, i3 = -1, a2 = -1, a3 = -1, sgn2 = 1;
    const nx = o.nx, ny = o.ny, nz = o.nz;
    for (let k = 0; k < n; k++) {
      if (k === i0 || k === i1) continue;
      const dx = P[k * 3] - P[i0 * 3], dy = P[k * 3 + 1] - P[i0 * 3 + 1], dz = P[k * 3 + 2] - P[i0 * 3 + 2];
      const cx = ey * dz - ez * dy, cy = ez * dx - ex * dz, cz = ex * dy - ey * dx, a = cx * nx + cy * ny + cz * nz;
      if (Math.abs(a) > a2) {
        a2 = Math.abs(a);
        i2 = k;
        sgn2 = a >= 0 ? 1 : -1;
      }
    }
    for (let k = 0; k < n; k++) {
      if (k === i0 || k === i1 || k === i2) continue;
      const dx = P[k * 3] - P[i0 * 3], dy = P[k * 3 + 1] - P[i0 * 3 + 1], dz = P[k * 3 + 2] - P[i0 * 3 + 2];
      const cx = ey * dz - ez * dy, cy = ez * dx - ex * dz, cz = ex * dy - ey * dx, a = (cx * nx + cy * ny + cz * nz) * -sgn2;
      if (a > a3) {
        a3 = a;
        i3 = k;
      }
    }
    const sel = [i0, i1, i2];
    if (i3 >= 0) sel.push(i3);
    else {
      for (let k = 0; k < n; k++) if (!sel.includes(k)) {
        sel.push(k);
        break;
      }
    }
    const tp = new Float64Array(12), td = new Float64Array(4), ti = new Int32Array(4);
    for (let s = 0; s < 4; s++) {
      const k = sel[s];
      tp[s * 3] = P[k * 3];
      tp[s * 3 + 1] = P[k * 3 + 1];
      tp[s * 3 + 2] = P[k * 3 + 2];
      td[s] = D[k];
      ti[s] = I[k];
    }
    for (let s = 0; s < 4; s++) {
      P[s * 3] = tp[s * 3];
      P[s * 3 + 1] = tp[s * 3 + 1];
      P[s * 3 + 2] = tp[s * 3 + 2];
      D[s] = td[s];
      I[s] = ti[s];
    }
    o.count = 4;
  }
  function sphereSphere2(S, a, b, o, m) {
    const P = S.pos, Q = S.par, i = a * 3, j = b * 3, dx = P[j] - P[i], dy = P[j + 1] - P[i + 1], dz = P[j + 2] - P[i + 2];
    const ra = Q[a * 4], rb = Q[b * 4], rr = ra + rb + m, d2 = dx * dx + dy * dy + dz * dz;
    if (!(d2 < rr * rr)) return;
    const d = Math.sqrt(d2);
    let nx = 1, ny = 0, nz = 0;
    if (d > EPS2) {
      nx = dx / d;
      ny = dy / d;
      nz = dz / d;
    }
    const depth = ra + rb - d;
    setN(o, nx, ny, nz);
    const k = ra - depth * 0.5;
    add(o, P[i] + nx * k, P[i + 1] + ny * k, P[i + 2] + nz * k, depth, 0);
  }
  function sphereBoxLocal(lx, ly, lz, hx, hy, hz, r, m, res) {
    const qx = lx < -hx ? -hx : lx > hx ? hx : lx, qy = ly < -hy ? -hy : ly > hy ? hy : ly, qz = lz < -hz ? -hz : lz > hz ? hz : lz;
    const dx = lx - qx, dy = ly - qy, dz = lz - qz, d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > 0) {
      const lim = r + m;
      if (!(d2 < lim * lim)) return false;
      const d = Math.sqrt(d2);
      res[0] = dx / d;
      res[1] = dy / d;
      res[2] = dz / d;
      res[3] = r - d;
      res[4] = qx;
      res[5] = qy;
      res[6] = qz;
      return true;
    }
    const fx = hx - Math.abs(lx), fy = hy - Math.abs(ly), fz = hz - Math.abs(lz);
    res[0] = res[1] = res[2] = 0;
    res[4] = lx;
    res[5] = ly;
    res[6] = lz;
    if (fx <= fy && fx <= fz) {
      const s = lx < 0 ? -1 : 1;
      res[0] = s;
      res[4] = s * hx;
      res[3] = r + fx;
    } else if (fy <= fz) {
      const s = ly < 0 ? -1 : 1;
      res[1] = s;
      res[5] = s * hy;
      res[3] = r + fy;
    } else {
      const s = lz < 0 ? -1 : 1;
      res[2] = s;
      res[6] = s * hz;
      res[3] = r + fz;
    }
    return true;
  }
  var _res = new Float64Array(8);
  function sphereBox2(S, a, b, o, m) {
    const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, j = b * 3, rb = b * 9, q = b * 4, r = Q[a * 4];
    const cx = P[i] - P[j], cy = P[i + 1] - P[j + 1], cz = P[i + 2] - P[j + 2];
    const lx = cx * R[rb] + cy * R[rb + 1] + cz * R[rb + 2], ly = cx * R[rb + 3] + cy * R[rb + 4] + cz * R[rb + 5], lz = cx * R[rb + 6] + cy * R[rb + 7] + cz * R[rb + 8];
    if (!sphereBoxLocal(lx, ly, lz, Q[q], Q[q + 1], Q[q + 2], r, m, _res)) return;
    const nlx = _res[0], nly = _res[1], nlz = _res[2], depth = _res[3];
    const bnx = nlx * R[rb] + nly * R[rb + 3] + nlz * R[rb + 6], bny = nlx * R[rb + 1] + nly * R[rb + 4] + nlz * R[rb + 7], bnz = nlx * R[rb + 2] + nly * R[rb + 5] + nlz * R[rb + 8];
    const sx = _res[4], sy = _res[5], sz = _res[6];
    const wx = P[j] + sx * R[rb] + sy * R[rb + 3] + sz * R[rb + 6], wy = P[j + 1] + sx * R[rb + 1] + sy * R[rb + 4] + sz * R[rb + 7], wz = P[j + 2] + sx * R[rb + 2] + sy * R[rb + 5] + sz * R[rb + 8];
    setN(o, -bnx, -bny, -bnz);
    add(o, wx - bnx * depth * 0.5, wy - bny * depth * 0.5, wz - bnz * depth * 0.5, depth, 0);
  }
  function sphereCapsule2(S, a, b, o, m) {
    const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, j = b * 3, rb = b * 9, rs = Q[a * 4], rc = Q[b * 4], hl = Q[b * 4 + 1];
    const ux = R[rb + 3], uy = R[rb + 4], uz = R[rb + 5], px = P[i] - P[j], py = P[i + 1] - P[j + 1], pz = P[i + 2] - P[j + 2];
    let t = px * ux + py * uy + pz * uz;
    t = t < -hl ? -hl : t > hl ? hl : t;
    const qx = P[j] + ux * t, qy = P[j + 1] + uy * t, qz = P[j + 2] + uz * t, dx = qx - P[i], dy = qy - P[i + 1], dz = qz - P[i + 2], d2 = dx * dx + dy * dy + dz * dz, lim = rs + rc + m;
    if (!(d2 < lim * lim)) return;
    const d = Math.sqrt(d2);
    let nx, ny, nz;
    if (d > EPS2) {
      nx = dx / d;
      ny = dy / d;
      nz = dz / d;
    } else {
      perp2(ux, uy, uz, _v2);
      nx = _v2[0];
      ny = _v2[1];
      nz = _v2[2];
    }
    const depth = rs + rc - d;
    setN(o, nx, ny, nz);
    const k = rs - depth * 0.5;
    add(o, P[i] + nx * k, P[i + 1] + ny * k, P[i + 2] + nz * k, depth, 0);
  }
  function spherePlane2(S, a, b, o, m) {
    const P = S.pos, Q = S.par, i = a * 3, q = b * 4, nx = Q[q], ny = Q[q + 1], nz = Q[q + 2], r = Q[a * 4];
    const dist = nx * P[i] + ny * P[i + 1] + nz * P[i + 2] - Q[q + 3];
    if (!(dist < r + m)) return;
    setN(o, -nx, -ny, -nz);
    const k = (r + dist) * 0.5;
    add(o, P[i] - nx * k, P[i + 1] - ny * k, P[i + 2] - nz * k, r - dist, 0);
  }
  var _vx = new Float64Array(8);
  var _vy = new Float64Array(8);
  var _vz = new Float64Array(8);
  function boxPlane2(S, a, b, o, m) {
    const P = S.pos, Q = S.par, R = S.rotm, i = a * 3, ra = a * 9, qa = a * 4, q = b * 4, nx = Q[q], ny = Q[q + 1], nz = Q[q + 2], off = Q[q + 3];
    const hx = Q[qa], hy = Q[qa + 1], hz = Q[qa + 2];
    const cd = nx * P[i] + ny * P[i + 1] + nz * P[i + 2] - off;
    const pr = hx * Math.abs(nx * R[ra] + ny * R[ra + 1] + nz * R[ra + 2]) + hy * Math.abs(nx * R[ra + 3] + ny * R[ra + 4] + nz * R[ra + 5]) + hz * Math.abs(nx * R[ra + 6] + ny * R[ra + 7] + nz * R[ra + 8]);
    if (!(cd - pr < m)) return;
    setN(o, -nx, -ny, -nz);
    for (let v = 0; v < 8; v++) {
      const sx = v & 1 ? hx : -hx, sy = v & 2 ? hy : -hy, sz = v & 4 ? hz : -hz;
      const wx = P[i] + sx * R[ra] + sy * R[ra + 3] + sz * R[ra + 6], wy = P[i + 1] + sx * R[ra + 1] + sy * R[ra + 4] + sz * R[ra + 7], wz = P[i + 2] + sx * R[ra + 2] + sy * R[ra + 5] + sz * R[ra + 8];
      const dist = nx * wx + ny * wy + nz * wz - off;
      if (dist < m) add(o, wx - nx * dist * 0.5, wy - ny * dist * 0.5, wz - nz * dist * 0.5, -dist, v);
    }
    reduce(o);
  }
  var _C = new Float64Array(9);
  var _aC = new Float64Array(9);
  var _tA = new Float64Array(3);
  var _tB = new Float64Array(3);
  var _poly0 = new Float64Array(16 * 3);
  var _poly1 = new Float64Array(16 * 3);
  var _pid0 = new Int32Array(16);
  var _pid1 = new Int32Array(16);
  var _L = new Float64Array(3);
  function clipPoly(inP, inI, nIn, outP, outI, ax, ay, az, cx, cy, cz, h, sgn, planeTag) {
    let nOut = 0;
    for (let k = 0; k < nIn; k++) {
      const k2 = (k + 1) % nIn, j1 = k * 3, j2 = k2 * 3;
      const d1 = h - sgn * ((inP[j1] - cx) * ax + (inP[j1 + 1] - cy) * ay + (inP[j1 + 2] - cz) * az);
      const d2 = h - sgn * ((inP[j2] - cx) * ax + (inP[j2 + 1] - cy) * ay + (inP[j2 + 2] - cz) * az);
      if (d1 >= 0) {
        const o = nOut * 3;
        outP[o] = inP[j1];
        outP[o + 1] = inP[j1 + 1];
        outP[o + 2] = inP[j1 + 2];
        outI[nOut++] = inI[k];
      }
      if (d1 >= 0 !== d2 >= 0) {
        const t = d1 / (d1 - d2), o = nOut * 3;
        outP[o] = inP[j1] + (inP[j2] - inP[j1]) * t;
        outP[o + 1] = inP[j1 + 1] + (inP[j2 + 1] - inP[j1 + 1]) * t;
        outP[o + 2] = inP[j1 + 2] + (inP[j2 + 2] - inP[j1 + 2]) * t;
        outI[nOut++] = 4 + (inI[k] * 7 + inI[k2] * 3 + planeTag * 11 & 127);
        if (nOut >= 15) return nOut;
      }
    }
    return nOut;
  }
  function boxBox2(S, a, b, o, m) {
    const P = S.pos, R = S.rotm, Q = S.par, pa = a * 3, pb = b * 3, ra = a * 9, rb = b * 9, qa = a * 4, qb = b * 4;
    const ah0 = Q[qa], ah1 = Q[qa + 1], ah2 = Q[qa + 2], bh0 = Q[qb], bh1 = Q[qb + 1], bh2 = Q[qb + 2];
    const tx = P[pb] - P[pa], ty = P[pb + 1] - P[pa + 1], tz = P[pb + 2] - P[pa + 2];
    const C = _C, aC = _aC;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const c = R[ra + i * 3] * R[rb + j * 3] + R[ra + i * 3 + 1] * R[rb + j * 3 + 1] + R[ra + i * 3 + 2] * R[rb + j * 3 + 2];
      C[i * 3 + j] = c;
      aC[i * 3 + j] = Math.abs(c) + 1e-7;
    }
    for (let i = 0; i < 3; i++) {
      _tA[i] = tx * R[ra + i * 3] + ty * R[ra + i * 3 + 1] + tz * R[ra + i * 3 + 2];
      _tB[i] = tx * R[rb + i * 3] + ty * R[rb + i * 3 + 1] + tz * R[rb + i * 3 + 2];
    }
    let sepA = -Infinity, ia = 0;
    const aH = [ah0, ah1, ah2], bH = [bh0, bh1, bh2];
    for (let i = 0; i < 3; i++) {
      const s = Math.abs(_tA[i]) - (aH[i] + aC[i * 3] * bh0 + aC[i * 3 + 1] * bh1 + aC[i * 3 + 2] * bh2);
      if (s > m) return;
      if (s > sepA) {
        sepA = s;
        ia = i;
      }
    }
    let sepB = -Infinity, ib = 0;
    for (let j = 0; j < 3; j++) {
      const s = Math.abs(_tB[j]) - (bH[j] + aC[j] * ah0 + aC[3 + j] * ah1 + aC[6 + j] * ah2);
      if (s > m) return;
      if (s > sepB) {
        sepB = s;
        ib = j;
      }
    }
    let sepE = -Infinity, ei = 0, ej = 0;
    const L = _L;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const ix = R[ra + i * 3], iy = R[ra + i * 3 + 1], iz = R[ra + i * 3 + 2], jx = R[rb + j * 3], jy = R[rb + j * 3 + 1], jz = R[rb + j * 3 + 2];
      let lx = iy * jz - iz * jy, ly = iz * jx - ix * jz, lz = ix * jy - iy * jx;
      const ll = Math.sqrt(lx * lx + ly * ly + lz * lz);
      if (ll < 1e-4) continue;
      lx /= ll;
      ly /= ll;
      lz /= ll;
      const rA = ah0 * Math.abs(R[ra] * lx + R[ra + 1] * ly + R[ra + 2] * lz) + ah1 * Math.abs(R[ra + 3] * lx + R[ra + 4] * ly + R[ra + 5] * lz) + ah2 * Math.abs(R[ra + 6] * lx + R[ra + 7] * ly + R[ra + 8] * lz);
      const rB = bh0 * Math.abs(R[rb] * lx + R[rb + 1] * ly + R[rb + 2] * lz) + bh1 * Math.abs(R[rb + 3] * lx + R[rb + 4] * ly + R[rb + 5] * lz) + bh2 * Math.abs(R[rb + 6] * lx + R[rb + 7] * ly + R[rb + 8] * lz);
      const s = Math.abs(tx * lx + ty * ly + tz * lz) - rA - rB;
      if (s > m) return;
      if (s > sepE) {
        sepE = s;
        ei = i;
        ej = j;
      }
    }
    const REL = 0.95, ABS = 0.01;
    let refB = sepB > REL * sepA + ABS;
    const sepF = refB ? sepB : sepA;
    if (sepE > REL * sepF + ABS) {
      edgeContact(S, a, b, o, ei, ej, sepE, tx, ty, tz);
      return;
    }
    const rP = refB ? pb : pa, rR = refB ? rb : ra, rH = refB ? bH : aH, iP = refB ? pa : pb, iR = refB ? ra : rb, iH = refB ? aH : bH;
    const axis = refB ? ib : ia, dirSign = refB ? -1 : 1;
    const tAxis = refB ? _tB[axis] : _tA[axis];
    const sg = tAxis * dirSign >= 0 ? 1 : -1;
    const Nx = sg * R[rR + axis * 3], Ny = sg * R[rR + axis * 3 + 1], Nz = sg * R[rR + axis * 3 + 2];
    let jj = 0, bestAbs = -1, dd = 0;
    for (let j = 0; j < 3; j++) {
      const d = Nx * R[iR + j * 3] + Ny * R[iR + j * 3 + 1] + Nz * R[iR + j * 3 + 2];
      if (Math.abs(d) > bestAbs) {
        bestAbs = Math.abs(d);
        jj = j;
        dd = d;
      }
    }
    const isg = dd > 0 ? -1 : 1;
    const u = (jj + 1) % 3, v = (jj + 2) % 3;
    const icx = P[iP] + isg * iH[jj] * R[iR + jj * 3], icy = P[iP + 1] + isg * iH[jj] * R[iR + jj * 3 + 1], icz = P[iP + 2] + isg * iH[jj] * R[iR + jj * 3 + 2];
    const ux = R[iR + u * 3] * iH[u], uy = R[iR + u * 3 + 1] * iH[u], uz = R[iR + u * 3 + 2] * iH[u], vx = R[iR + v * 3] * iH[v], vy = R[iR + v * 3 + 1] * iH[v], vz = R[iR + v * 3 + 2] * iH[v];
    const inc = _poly0;
    const incFace = jj * 2 + (isg > 0 ? 0 : 1), refFace = axis * 2 + (sg > 0 ? 0 : 1);
    const su = [1, -1, -1, 1], sv = [1, 1, -1, -1];
    for (let k = 0; k < 4; k++) {
      inc[k * 3] = icx + su[k] * ux + sv[k] * vx;
      inc[k * 3 + 1] = icy + su[k] * uy + sv[k] * vy;
      inc[k * 3 + 2] = icz + su[k] * uz + sv[k] * vz;
      _pid0[k] = k;
    }
    const ru = (axis + 1) % 3, rv = (axis + 2) % 3, rcx = P[rP], rcy = P[rP + 1], rcz = P[rP + 2];
    let n = 4, curP = _poly0, curI = _pid0, nxtP = _poly1, nxtI = _pid1;
    const planes = [[ru, 1], [ru, -1], [rv, 1], [rv, -1]];
    for (let pidx = 0; pidx < 4 && n > 0; pidx++) {
      const ax = planes[pidx][0], sgn = planes[pidx][1];
      n = clipPoly(curP, curI, n, nxtP, nxtI, R[rR + ax * 3], R[rR + ax * 3 + 1], R[rR + ax * 3 + 2], rcx, rcy, rcz, rH[ax], sgn, pidx);
      let tp = curP;
      curP = nxtP;
      nxtP = tp;
      let ti = curI;
      curI = nxtI;
      nxtI = ti;
    }
    if (n === 0) return;
    const nsx = refB ? -Nx : Nx, nsy = refB ? -Ny : Ny, nsz = refB ? -Nz : Nz;
    setN(o, nsx, nsy, nsz);
    const idBase = (refB ? 1 : 0) << 14 | refFace << 10 | incFace << 7;
    for (let k = 0; k < n; k++) {
      const x = curP[k * 3], y = curP[k * 3 + 1], z = curP[k * 3 + 2];
      const sep = Nx * (x - rcx) + Ny * (y - rcy) + Nz * (z - rcz) - rH[axis];
      if (sep > m) continue;
      add(o, x - Nx * sep * 0.5, y - Ny * sep * 0.5, z - Nz * sep * 0.5, -sep, idBase | curI[k] & 127);
    }
    reduce(o);
  }
  function edgeContact(S, a, b, o, ei, ej, sep, tx, ty, tz) {
    const P = S.pos, R = S.rotm, Q = S.par, pa = a * 3, pb = b * 3, ra = a * 9, rb = b * 9, qa = a * 4, qb = b * 4;
    const aix = R[ra + ei * 3], aiy = R[ra + ei * 3 + 1], aiz = R[ra + ei * 3 + 2], bjx = R[rb + ej * 3], bjy = R[rb + ej * 3 + 1], bjz = R[rb + ej * 3 + 2];
    let lx = aiy * bjz - aiz * bjy, ly = aiz * bjx - aix * bjz, lz = aix * bjy - aiy * bjx;
    const ll = Math.hypot(lx, ly, lz) || 1;
    lx /= ll;
    ly /= ll;
    lz /= ll;
    if (lx * tx + ly * ty + lz * tz < 0) {
      lx = -lx;
      ly = -ly;
      lz = -lz;
    }
    let cax = P[pa], cay = P[pa + 1], caz = P[pa + 2], cbx = P[pb], cby = P[pb + 1], cbz = P[pb + 2];
    for (let k = 0; k < 3; k++) {
      if (k !== ei) {
        const d = lx * R[ra + k * 3] + ly * R[ra + k * 3 + 1] + lz * R[ra + k * 3 + 2], s2 = d > 0 ? 1 : -1, h = Q[qa + k];
        cax += s2 * h * R[ra + k * 3];
        cay += s2 * h * R[ra + k * 3 + 1];
        caz += s2 * h * R[ra + k * 3 + 2];
      }
      if (k !== ej) {
        const d = lx * R[rb + k * 3] + ly * R[rb + k * 3 + 1] + lz * R[rb + k * 3 + 2], s2 = d > 0 ? -1 : 1, h = Q[qb + k];
        cbx += s2 * h * R[rb + k * 3];
        cby += s2 * h * R[rb + k * 3 + 1];
        cbz += s2 * h * R[rb + k * 3 + 2];
      }
    }
    const rx = cax - cbx, ry = cay - cby, rz = caz - cbz, bb = aix * bjx + aiy * bjy + aiz * bjz, c = aix * rx + aiy * ry + aiz * rz, f = bjx * rx + bjy * ry + bjz * rz, den = 1 - bb * bb;
    const s = den > 1e-9 ? (bb * f - c) / den : 0, t = bb * s + f;
    const qax = cax + aix * s, qay = cay + aiy * s, qaz = caz + aiz * s, qbx = cbx + bjx * t, qby = cby + bjy * t, qbz = cbz + bjz * t;
    setN(o, lx, ly, lz);
    add(o, (qax + qbx) * 0.5, (qay + qby) * 0.5, (qaz + qbz) * 0.5, -sep, 32768 | ei * 3 + ej);
  }
  var _ts = new Float64Array(12);
  function segBoxClosest(lcx, lcy, lcz, lux, luy, luz, hl, hx, hy, hz, res) {
    const c = [lcx, lcy, lcz], u = [lux, luy, luz], h = [hx, hy, hz];
    let n = 0;
    _ts[n++] = -hl;
    _ts[n++] = hl;
    for (let k = 0; k < 3; k++) if (Math.abs(u[k]) > 1e-12) for (const s of [-1, 1]) {
      const t = (s * h[k] - c[k]) / u[k];
      if (t > -hl && t < hl) _ts[n++] = t;
    }
    const arr2 = Array.from(_ts.subarray(0, n)).sort((p, q) => p - q);
    let bestD2 = Infinity, bestT = 0;
    for (let i = 0; i + 1 < arr2.length; i++) {
      const t0 = arr2[i], t1 = arr2[i + 1], tm = (t0 + t1) * 0.5;
      let num = 0, den = 0;
      for (let k = 0; k < 3; k++) {
        const l = c[k] + u[k] * tm;
        if (l > h[k]) {
          num += u[k] * (c[k] - h[k]);
          den += u[k] * u[k];
        } else if (l < -h[k]) {
          num += u[k] * (c[k] + h[k]);
          den += u[k] * u[k];
        }
      }
      let t = den > 1e-18 ? -num / den : tm;
      t = t < t0 ? t0 : t > t1 ? t1 : t;
      let d2 = 0;
      for (let k = 0; k < 3; k++) {
        const l = c[k] + u[k] * t, e = Math.abs(l) - h[k];
        if (e > 0) d2 += e * e;
      }
      if (d2 < bestD2 - 1e-15) {
        bestD2 = d2;
        bestT = t;
      }
    }
    if (arr2.length === 1) bestT = arr2[0];
    res[0] = bestT;
    res[1] = bestD2;
    if (bestD2 === 0) {
      let bd = -1, bt = bestT;
      for (let i = 0; i < arr2.length; i++) {
        const t = arr2[i];
        let dep = Infinity;
        for (let k = 0; k < 3; k++) {
          const e = h[k] - Math.abs(c[k] + u[k] * t);
          if (e < dep) dep = e;
        }
        if (dep > bd) {
          bd = dep;
          bt = t;
        }
      }
      res[0] = bt;
    }
  }
  var _sb = new Float64Array(2);
  var _res2 = new Float64Array(8);
  function boxCapsule2(S, a, b, o, m) {
    const P = S.pos, Q = S.par, R = S.rotm, ia = a * 3, ib = b * 3, ra = a * 9, rb = b * 9, qa = a * 4, r = Q[b * 4], hl = Q[b * 4 + 1];
    const hx = Q[qa], hy = Q[qa + 1], hz = Q[qa + 2], ux = R[rb + 3], uy = R[rb + 4], uz = R[rb + 5];
    const cx = P[ib] - P[ia], cy = P[ib + 1] - P[ia + 1], cz = P[ib + 2] - P[ia + 2];
    const lcx = cx * R[ra] + cy * R[ra + 1] + cz * R[ra + 2], lcy = cx * R[ra + 3] + cy * R[ra + 4] + cz * R[ra + 5], lcz = cx * R[ra + 6] + cy * R[ra + 7] + cz * R[ra + 8];
    const lux = ux * R[ra] + uy * R[ra + 1] + uz * R[ra + 2], luy = ux * R[ra + 3] + uy * R[ra + 4] + uz * R[ra + 5], luz = ux * R[ra + 6] + uy * R[ra + 7] + uz * R[ra + 8];
    segBoxClosest(lcx, lcy, lcz, lux, luy, luz, hl, hx, hy, hz, _sb);
    const t1 = _sb[0];
    const emit = (t, id, first) => {
      if (!sphereBoxLocal(lcx + lux * t, lcy + luy * t, lcz + luz * t, hx, hy, hz, r, m, _res2)) return false;
      const nlx = _res2[0], nly = _res2[1], nlz = _res2[2], depth = _res2[3];
      const bnx = nlx * R[ra] + nly * R[ra + 3] + nlz * R[ra + 6], bny = nlx * R[ra + 1] + nly * R[ra + 4] + nlz * R[ra + 7], bnz = nlx * R[ra + 2] + nly * R[ra + 5] + nlz * R[ra + 8];
      if (first) setN(o, bnx, bny, bnz);
      else if (bnx * o.nx + bny * o.ny + bnz * o.nz < 0.9) return false;
      const sx = _res2[4], sy = _res2[5], sz = _res2[6];
      const wx = P[ia] + sx * R[ra] + sy * R[ra + 3] + sz * R[ra + 6], wy = P[ia + 1] + sx * R[ra + 1] + sy * R[ra + 4] + sz * R[ra + 7], wz = P[ia + 2] + sx * R[ra + 2] + sy * R[ra + 5] + sz * R[ra + 8];
      add(o, wx - bnx * depth * 0.5, wy - bny * depth * 0.5, wz - bnz * depth * 0.5, depth, id);
      return true;
    };
    if (!emit(t1, 0, true)) return;
    const t2 = t1 >= 0 ? -hl : hl;
    if (Math.abs(t2 - t1) > 1e-6) emit(t2, 1, false);
  }
  function capsuleCapsule2(S, a, b, o, m) {
    const P = S.pos, Q = S.par, R = S.rotm, ia = a * 3, ib = b * 3, ra = a * 9, rb = b * 9, r1 = Q[a * 4], h1 = Q[a * 4 + 1], r2 = Q[b * 4], h2 = Q[b * 4 + 1];
    const u1x = R[ra + 3], u1y = R[ra + 4], u1z = R[ra + 5], u2x = R[rb + 3], u2y = R[rb + 4], u2z = R[rb + 5];
    const rx = P[ia] - P[ib], ry = P[ia + 1] - P[ib + 1], rz = P[ia + 2] - P[ib + 2];
    const bb = u1x * u2x + u1y * u2y + u1z * u2z, c = u1x * rx + u1y * ry + u1z * rz, f = u2x * rx + u2y * ry + u2z * rz, den = 1 - bb * bb, lim = r1 + r2 + m;
    const cl = (v, h) => v < -h ? -h : v > h ? h : v;
    if (den < 1e-6) {
      const sgn = bb >= 0 ? 1 : -1, off = -c;
      const p1 = off + sgn * -h2, p2 = off + sgn * h2, lo = Math.max(-h1, Math.min(p1, p2)), hi = Math.min(h1, Math.max(p1, p2));
      if (lo <= hi) {
        let any = false;
        for (let k2 = 0; k2 < 2; k2++) {
          const s2 = k2 === 0 ? lo : hi, t2 = cl((s2 + c) / (bb || 1), h2);
          const ax2 = P[ia] + u1x * s2, ay2 = P[ia + 1] + u1y * s2, az2 = P[ia + 2] + u1z * s2, bx2 = P[ib] + u2x * t2, by2 = P[ib + 1] + u2y * t2, bz2 = P[ib + 2] + u2z * t2;
          const dx2 = bx2 - ax2, dy2 = by2 - ay2, dz2 = bz2 - az2, d22 = dx2 * dx2 + dy2 * dy2 + dz2 * dz2;
          if (!(d22 < lim * lim)) continue;
          const d3 = Math.sqrt(d22);
          let nx2, ny2, nz2;
          if (d3 > EPS2) {
            nx2 = dx2 / d3;
            ny2 = dy2 / d3;
            nz2 = dz2 / d3;
          } else {
            perp2(u1x, u1y, u1z, _v2);
            nx2 = _v2[0];
            ny2 = _v2[1];
            nz2 = _v2[2];
          }
          if (!any) setN(o, nx2, ny2, nz2);
          else if (nx2 * o.nx + ny2 * o.ny + nz2 * o.nz < 0.9) continue;
          any = true;
          const depth2 = r1 + r2 - d3, kk = r1 - depth2 * 0.5;
          add(o, ax2 + o.nx * kk, ay2 + o.ny * kk, az2 + o.nz * kk, depth2, k2);
        }
        if (any) return;
      }
    }
    let s = den > 1e-9 ? cl((bb * f - c) / den, h1) : 0, t = cl(bb * s + f, h2);
    s = cl(bb * t - c, h1);
    const ax = P[ia] + u1x * s, ay = P[ia + 1] + u1y * s, az = P[ia + 2] + u1z * s, bx = P[ib] + u2x * t, by = P[ib + 1] + u2y * t, bz = P[ib + 2] + u2z * t;
    const dx = bx - ax, dy = by - ay, dz = bz - az, d2 = dx * dx + dy * dy + dz * dz;
    if (!(d2 < lim * lim)) return;
    const d = Math.sqrt(d2);
    let nx, ny, nz;
    if (d > EPS2) {
      nx = dx / d;
      ny = dy / d;
      nz = dz / d;
    } else {
      nx = u1y * u2z - u1z * u2y;
      ny = u1z * u2x - u1x * u2z;
      nz = u1x * u2y - u1y * u2x;
      const l = Math.hypot(nx, ny, nz);
      if (l > 1e-9) {
        nx /= l;
        ny /= l;
        nz /= l;
      } else {
        perp2(u1x, u1y, u1z, _v2);
        nx = _v2[0];
        ny = _v2[1];
        nz = _v2[2];
      }
    }
    setN(o, nx, ny, nz);
    const depth = r1 + r2 - d, k = r1 - depth * 0.5;
    add(o, ax + nx * k, ay + ny * k, az + nz * k, depth, 0);
  }
  function capsulePlane2(S, a, b, o, m) {
    const P = S.pos, Q = S.par, R = S.rotm, ia = a * 3, ra = a * 9, q = b * 4, nx = Q[q], ny = Q[q + 1], nz = Q[q + 2], off = Q[q + 3], r = Q[a * 4], hl = Q[a * 4 + 1];
    setN(o, -nx, -ny, -nz);
    for (let k = 0; k < 2; k++) {
      const s = k === 0 ? -hl : hl, ex = P[ia] + R[ra + 3] * s, ey = P[ia + 1] + R[ra + 4] * s, ez = P[ia + 2] + R[ra + 5] * s, dist = nx * ex + ny * ey + nz * ez - off;
      if (dist < r + m) {
        const kk = (r + dist) * 0.5;
        add(o, ex - nx * kk, ey - ny * kk, ez - nz * kk, r - dist, k);
      }
    }
  }
  var NONE = null;
  var TABLE = [
    /* 球     */
    [sphereSphere2, sphereBox2, sphereBox2, sphereCapsule2, spherePlane2],
    /* AABB   */
    [NONE, boxBox2, boxBox2, boxCapsule2, boxPlane2],
    /* OBB    */
    [NONE, NONE, boxBox2, boxCapsule2, boxPlane2],
    /* カプセル */
    [NONE, NONE, NONE, capsuleCapsule2, capsulePlane2],
    /* 平面   */
    [NONE, NONE, NONE, NONE, NONE]
  ];
  function isPairSupported(ta, tb) {
    const lo = ta <= tb ? ta : tb, hi = ta <= tb ? tb : ta;
    return !!TABLE[lo][hi];
  }
  function generateManifold(S, a, b, o, margin) {
    o.count = 0;
    const ta = S.type[a], tb = S.type[b];
    if (ta <= tb) {
      const f2 = TABLE[ta][tb];
      if (!f2) return false;
      f2(S, a, b, o, margin);
      return o.count > 0;
    }
    const f = TABLE[tb][ta];
    if (!f) return false;
    f(S, b, a, o, margin);
    if (o.count === 0) return false;
    o.nx = -o.nx;
    o.ny = -o.ny;
    o.nz = -o.nz;
    return true;
  }

  // src/rigid/inertia.js
  function shapeVolume(type, par, qi = 0) {
    switch (type) {
      case SHAPE_SPHERE2:
        return 4 / 3 * Math.PI * par[qi] ** 3;
      case SHAPE_AABB:
      case SHAPE_OBB:
        return 8 * par[qi] * par[qi + 1] * par[qi + 2];
      case SHAPE_CAPSULE: {
        const r = par[qi], h = par[qi + 1];
        return Math.PI * r * r * 2 * h + 4 / 3 * Math.PI * r * r * r;
      }
      default:
        return 0;
    }
  }
  function computeLocalInertia(type, par, qi, mass, out) {
    switch (type) {
      case SHAPE_SPHERE2: {
        const r = par[qi], i = 0.4 * mass * r * r;
        out[0] = out[1] = out[2] = i;
        break;
      }
      case SHAPE_AABB:
      case SHAPE_OBB: {
        const hx = par[qi], hy = par[qi + 1], hz = par[qi + 2], k = mass / 3;
        out[0] = k * (hy * hy + hz * hz);
        out[1] = k * (hx * hx + hz * hz);
        out[2] = k * (hx * hx + hy * hy);
        break;
      }
      case SHAPE_CAPSULE: {
        const r = par[qi], hl = par[qi + 1], L = 2 * hl, vc = Math.PI * r * r * L, vs = 4 / 3 * Math.PI * r * r * r;
        const mc = mass * vc / (vc + vs), ms = mass - mc;
        out[1] = mc * r * r / 2 + ms * 0.4 * r * r;
        const d = hl + 3 * r / 8, ix = mc * (r * r / 4 + L * L / 12) + ms * (83 / 320 * r * r + d * d);
        out[0] = out[2] = ix;
        break;
      }
      default:
        out[0] = out[1] = out[2] = Infinity;
    }
    return out;
  }
  function worldInvInertia(R, r, ix, iy, iz, out, o) {
    const a0 = R[r], a1 = R[r + 1], a2 = R[r + 2], b0 = R[r + 3], b1 = R[r + 4], b2 = R[r + 5], c0 = R[r + 6], c12 = R[r + 7], c2 = R[r + 8];
    out[o] = ix * a0 * a0 + iy * b0 * b0 + iz * c0 * c0;
    out[o + 1] = out[o + 3] = ix * a0 * a1 + iy * b0 * b1 + iz * c0 * c12;
    out[o + 2] = out[o + 6] = ix * a0 * a2 + iy * b0 * b2 + iz * c0 * c2;
    out[o + 4] = ix * a1 * a1 + iy * b1 * b1 + iz * c12 * c12;
    out[o + 5] = out[o + 7] = ix * a1 * a2 + iy * b1 * b2 + iz * c12 * c2;
    out[o + 8] = ix * a2 * a2 + iy * b2 * b2 + iz * c2 * c2;
    return out;
  }

  // src/rigid/world.js
  var BODY_STATIC = 0;
  var BODY_DYNAMIC = 1;
  var BODY_KINEMATIC = 2;
  var TYPE_BY_NAME = { static: BODY_STATIC, dynamic: BODY_DYNAMIC, kinematic: BODY_KINEMATIC };
  var SHAPE_BY_NAME2 = { sphere: SHAPE_SPHERE2, box: SHAPE_OBB, obb: SHAPE_OBB, aabb: SHAPE_OBB, capsule: SHAPE_CAPSULE, plane: SHAPE_PLANE };
  var FL_SENSOR = 1;
  var MF_SENSOR = 1;
  var COMBINE = {
    sqrt: (a, b) => Math.sqrt(a * b),
    min: (a, b) => a < b ? a : b,
    max: (a, b) => a > b ? a : b,
    avg: (a, b) => (a + b) * 0.5,
    mul: (a, b) => a * b
  };
  var RIGID_DEFAULTS = {
    gravity: [0, -9.81, 0],
    fixedTimeStep: 1 / 60,
    maxSubSteps: 8,
    maxFrameDt: 0.25,
    stepBudgetMs: 0,
    timeScale: 1,
    solverIterations: 10,
    positionIterations: 3,
    restitutionThreshold: 1,
    contactMargin: 0.02,
    linearSlop: 5e-3,
    positionCorrection: 0.2,
    maxPushSpeed: 5,
    warmStarting: true,
    gyroscopic: true,
    contactAngularDamping: 1,
    enableSleeping: true,
    sleepLinearThreshold: 0.05,
    sleepAngularThreshold: 0.05,
    sleepTime: 0.5,
    ccd: true,
    ccdThreshold: 0.5,
    maxLinearSpeed: 500,
    maxAngularSpeed: 200,
    frictionCombine: "sqrt",
    restitutionCombine: "max",
    broadphase: "auto",
    cellSize: 0,
    bruteForceThreshold: 24,
    treeFatMargin: 0.1,
    interpolate: false,
    autoUnbindRemovedNodes: true,
    onWarning: null,
    onContactBegin: null,
    onContactEnd: null
  };
  var ManifoldSet = class {
    constructor() {
      this.n = 0;
      this.cap = 0;
      this._alloc(64);
    }
    _alloc(cap) {
      const g = (old, k, T) => {
        const a = new T(cap * k);
        if (old) a.set(old.subarray(0, Math.min(old.length, a.length)));
        return a;
      };
      const o = this;
      o.a = g(o.a, 1, Int32Array);
      o.b = g(o.b, 1, Int32Array);
      o.ga = g(o.ga, 1, Uint32Array);
      o.gb = g(o.gb, 1, Uint32Array);
      o.nrm = g(o.nrm, 3, Float64Array);
      o.t1 = g(o.t1, 3, Float64Array);
      o.t2 = g(o.t2, 3, Float64Array);
      o.cnt = g(o.cnt, 1, Uint8Array);
      o.fl = g(o.fl, 1, Uint8Array);
      o.matched = g(o.matched, 1, Uint8Array);
      o.fs = g(o.fs, 1, Float64Array);
      o.fk = g(o.fk, 1, Float64Array);
      o.rest = g(o.rest, 1, Float64Array);
      const P = cap * 4;
      const h = (old, k, T) => {
        const a = new T(P * k);
        if (old) a.set(old.subarray(0, Math.min(old.length, a.length)));
        return a;
      };
      o.p = h(o.p, 3, Float64Array);
      o.depth = h(o.depth, 1, Float64Array);
      o.id = h(o.id, 1, Int32Array);
      o.la = h(o.la, 3, Float64Array);
      o.ni = h(o.ni, 1, Float64Array);
      o.ti1 = h(o.ti1, 1, Float64Array);
      o.ti2 = h(o.ti2, 1, Float64Array);
      o.pi = h(o.pi, 1, Float64Array);
      o.maxNi = h(o.maxNi, 1, Float64Array);
      o.rA = h(o.rA, 3, Float64Array);
      o.rB = h(o.rB, 3, Float64Array);
      o.nm = h(o.nm, 1, Float64Array);
      o.t1m = h(o.t1m, 1, Float64Array);
      o.t2m = h(o.t2m, 1, Float64Array);
      o.relv = h(o.relv, 1, Float64Array);
      this.cap = cap;
    }
    ensure(n) {
      if (n > this.cap) this._alloc(Math.max(n, this.cap * 2));
    }
  };
  var PairTable = class {
    constructor() {
      this.size = 0;
      this.ka = new Int32Array(0);
      this.kb = new Int32Array(0);
      this.val = new Int32Array(0);
    }
    reset(n) {
      let s = 16;
      while (s < n * 2 + 2) s <<= 1;
      if (s !== this.size) {
        this.size = s;
        this.ka = new Int32Array(s);
        this.kb = new Int32Array(s);
        this.val = new Int32Array(s);
      }
      this.val.fill(-1);
    }
    _h(a, b) {
      return (Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) & this.size - 1;
    }
    put(a, b, v) {
      let h = this._h(a, b);
      const m = this.size - 1;
      while (this.val[h] >= 0) h = h + 1 & m;
      this.ka[h] = a;
      this.kb[h] = b;
      this.val[h] = v;
    }
    get(a, b) {
      let h = this._h(a, b);
      const m = this.size - 1;
      while (this.val[h] >= 0) {
        if (this.ka[h] === a && this.kb[h] === b) return this.val[h];
        h = h + 1 & m;
      }
      return -1;
    }
  };
  var _out = new ContactOut();
  var _hit2 = new RayHit();
  var _cc = new Contact();
  var _tmp3 = new Float64Array(3);
  function perp3(ax, ay, az, out) {
    const bx = Math.abs(ax), by = Math.abs(ay), bz = Math.abs(az);
    let x, y, z;
    if (bx <= by && bx <= bz) {
      x = 0;
      y = -az;
      z = ay;
    } else if (by <= bz) {
      x = az;
      y = 0;
      z = -ax;
    } else {
      x = -ay;
      y = ax;
      z = 0;
    }
    const l = Math.hypot(x, y, z) || 1;
    out[0] = x / l;
    out[1] = y / l;
    out[2] = z / l;
  }
  var RigidBodyWorld = class {
    /** @param {object} options RIGID_DEFAULTS を参照 */
    constructor(options = {}) {
      for (const k of Object.keys(options)) if (!(k in RIGID_DEFAULTS)) throw new RangeError("RigidBodyWorld: \u672A\u77E5\u306E\u30AA\u30D7\u30B7\u30E7\u30F3 " + k);
      const o = this.options = Object.assign({}, RIGID_DEFAULTS, options);
      o.gravity = Array.from(o.gravity);
      if (!(o.fixedTimeStep > 0)) throw new RangeError("RigidBodyWorld: fixedTimeStep \u306F\u6B63\u306E\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
      if (!COMBINE[o.frictionCombine] || !COMBINE[o.restitutionCombine]) throw new RangeError("RigidBodyWorld: frictionCombine/restitutionCombine \u306F " + Object.keys(COMBINE).join("/") + " \u306E\u3044\u305A\u308C\u304B\u3002");
      this.alloc = new HandleAllocator(64);
      this.capacity = 0;
      this.count = 0;
      this.userData = [];
      this.node = [];
      this.nodeAttached = new Uint8Array(0);
      this._grow(256);
      this.timestep = new FixedTimestep({ fixedDt: o.fixedTimeStep, maxSubSteps: o.maxSubSteps, maxFrameDt: o.maxFrameDt, timeScale: o.timeScale });
      this.awake = new Int32Array(256);
      this.nAwake = 0;
      this.statList = new Int32Array(256);
      this.nStat = 0;
      this.planes = new Int32Array(16);
      this.nPlanes = 0;
      this._listsDirty = true;
      this.bp = null;
      this._bpKind = "";
      this._cell = 0;
      this._cellN = 0;
      this.cur = new ManifoldSet();
      this.prev = new ManifoldSet();
      this.ptab = new PairTable();
      this.pairBuf = new Int32Array(2048);
      this.nPairs = 0;
      this.constraints = [];
      this.corr = new Int32Array(256);
      this.nCorr = 0;
      this._onPair = (i, j) => {
        this._rawPairs++;
        if (this.nPairs * 2 + 2 > this.pairBuf.length) {
          const p = new Int32Array(this.pairBuf.length * 2);
          p.set(this.pairBuf);
          this.pairBuf = p;
        }
        this.pairBuf[this.nPairs * 2] = i;
        this.pairBuf[this.nPairs * 2 + 1] = j;
        this.nPairs++;
      };
      this._q4 = [0, 0, 0, 1];
      this._ccdScale = null;
      this._ccdHits = [];
      this._pseudo = false;
      this._extraDropped = 0;
      this._warnedDrop = 0;
      this._rawPairs = 0;
      this._warned = /* @__PURE__ */ new Set();
      this._begin = [];
      this._ended = [];
      this.alpha = 0;
      this.stepCount = 0;
      this.time = 0;
      this.droppedTime = 0;
      this.paused = false;
      this.disposed = false;
      this._plannedSteps = 1;
      this.stats = { bodies: 0, activeBodies: 0, sleepingBodies: 0, staticBodies: 0, kinematicBodies: 0, candidatePairs: 0, contactPairs: 0, contactPoints: 0, solverIterations: 0, positionIterations: 0, solverMs: 0, broadphaseMs: 0, narrowphaseMs: 0, integrationMs: 0, ccdCount: 0, ccdMs: 0, maxPenetration: 0, correctedContacts: 0, droppedTime: 0, stepMs: 0, substeps: 0, truncatedSteps: 0, unsupportedPairs: 0, broadphase: "", unboundNodes: 0 };
    }
    /* ================================================================== 記憶域 */
    _grow(n) {
      if (n <= this.capacity) return;
      const cap = Math.max(n, this.capacity * 2, 64), self = this;
      const g = (old, k, T) => {
        const a = new T(cap * k);
        if (old) a.set(old);
        return a;
      };
      self.type = g(self.type, 1, Uint8Array);
      self.flags = g(self.flags, 1, Uint8Array);
      self.btype = g(self.btype, 1, Uint8Array);
      self.sleepState = g(self.sleepState, 1, Uint8Array);
      self.kinNode = g(self.kinNode, 1, Uint8Array);
      self.touch = g(self.touch, 1, Int32Array);
      self.synced = g(self.synced, 1, Uint8Array);
      self.extra = g(self.extra, 1, Uint8Array);
      self.ccdMode = g(self.ccdMode, 1, Uint8Array);
      self.allowSleep = g(self.allowSleep, 1, Uint8Array);
      self.lockRot = g(self.lockRot, 1, Uint8Array);
      self.live = g(self.live, 1, Uint8Array);
      self.group = g(self.group, 1, Uint32Array);
      self.mask = g(self.mask, 1, Uint32Array);
      self.gen = g(self.gen, 1, Uint32Array);
      self.islandNext = g(self.islandNext, 1, Int32Array);
      self.isl = g(self.isl, 1, Int32Array);
      self.islFirst = g(self.islFirst, 1, Int32Array);
      self.islLast = g(self.islLast, 1, Int32Array);
      self.pos = g(self.pos, 3, Float64Array);
      self.quat = g(self.quat, 4, Float64Array);
      self.rotm = g(self.rotm, 9, Float64Array);
      self.par = g(self.par, 4, Float64Array);
      self.aabb = g(self.aabb, 6, Float64Array);
      self.prevPos = g(self.prevPos, 3, Float64Array);
      self.prevQuat = g(self.prevQuat, 4, Float64Array);
      self.vel = g(self.vel, 3, Float64Array);
      self.ang = g(self.ang, 3, Float64Array);
      self.force = g(self.force, 3, Float64Array);
      self.torque = g(self.torque, 3, Float64Array);
      self.vp = g(self.vp, 3, Float64Array);
      self.wp = g(self.wp, 3, Float64Array);
      self.invMass = g(self.invMass, 1, Float64Array);
      self.mass = g(self.mass, 1, Float64Array);
      self.invI = g(self.invI, 3, Float64Array);
      self.iw = g(self.iw, 9, Float64Array);
      self.rest = g(self.rest, 1, Float64Array);
      self.fs = g(self.fs, 1, Float64Array);
      self.fk = g(self.fk, 1, Float64Array);
      self.ld = g(self.ld, 1, Float64Array);
      self.ad = g(self.ad, 1, Float64Array);
      self.gs = g(self.gs, 1, Float64Array);
      self.sleepT = g(self.sleepT, 1, Float64Array);
      self.cr = g(self.cr, 1, Float64Array);
      self.minT = g(self.minT, 1, Float64Array);
      const na = new Uint8Array(cap);
      if (self.nodeAttached) na.set(self.nodeAttached);
      self.nodeAttached = na;
      self.capacity = cap;
    }
    reserve(n) {
      this._grow(n);
      return this;
    }
    _warn(msg, key) {
      if (key) {
        if (this._warned.has(key)) return;
        this._warned.add(key);
      }
      if (this.options.onWarning) this.options.onWarning(msg);
    }
    _idx(h) {
      const i = this.alloc.indexOf(h);
      return i;
    }
    /** ハンドルが有効か（削除済み・世代違い・0 は false）。 */
    isValid(h) {
      return this.alloc.isValid(h);
    }
    isAlive(h) {
      return this.alloc.isValid(h);
    }
    get bodyCount() {
      return this.alloc.liveCount;
    }
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
      if (this.disposed) throw new MassiveEngineError("RigidBodyWorld \u306F dispose \u6E08\u307F\u3067\u3059\u3002", "E_DISPOSED");
      const btype = d.type === void 0 ? BODY_DYNAMIC : TYPE_BY_NAME[d.type];
      if (btype === void 0) throw new RangeError("addBody: type \u306F static/dynamic/kinematic \u306E\u3044\u305A\u308C\u304B\u3002");
      const shape = SHAPE_BY_NAME2[d.shape === void 0 ? "sphere" : d.shape];
      if (shape === void 0) throw new RangeError("addBody: \u672A\u77E5\u306E shape " + d.shape + "\uFF08sphere/box/obb/aabb/capsule/plane\uFF09");
      if (shape === SHAPE_PLANE && btype !== BODY_STATIC) throw new RangeError("addBody: \u5E73\u9762\u306F static \u306E\u307F\u4F7F\u3048\u307E\u3059\u3002");
      const par = [0, 0, 0, 0], fin = (...v2) => v2.every((x) => typeof x === "number" && isFinite(x));
      if (shape === SHAPE_SPHERE2) {
        const r = d.radius === void 0 ? 0.5 : d.radius;
        if (!(r > 0) || !isFinite(r)) throw new RangeError("addBody: radius \u306F\u6B63\u306E\u6709\u9650\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
        par[0] = r;
      } else if (shape === SHAPE_OBB) {
        const h2 = d.halfExtents || (d.size ? [d.size[0] / 2, d.size[1] / 2, d.size[2] / 2] : [0.5, 0.5, 0.5]);
        if (!(h2[0] > 0 && h2[1] > 0 && h2[2] > 0) || !fin(h2[0], h2[1], h2[2])) throw new RangeError("addBody: halfExtents/size \u306F\u6B63\u306E\u6709\u9650\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
        par[0] = h2[0];
        par[1] = h2[1];
        par[2] = h2[2];
      } else if (shape === SHAPE_CAPSULE) {
        const r = d.radius === void 0 ? 0.3 : d.radius, hl = d.halfLength === void 0 ? 0.5 : d.halfLength;
        if (!(r > 0 && hl >= 0) || !fin(r, hl)) throw new RangeError("addBody: radius>0, halfLength>=0 \u304C\u5FC5\u8981\u3067\u3059\u3002");
        par[0] = r;
        par[1] = hl;
      } else {
        const n = d.normal || [0, 1, 0], l = Math.hypot(n[0], n[1], n[2]);
        if (!(l > 0) || !fin(n[0], n[1], n[2])) throw new RangeError("addBody: \u5E73\u9762\u306E normal \u304C\u4E0D\u6B63\u3067\u3059\u3002");
        par[0] = n[0] / l;
        par[1] = n[1] / l;
        par[2] = n[2] / l;
        par[3] = d.offset === void 0 ? d.position ? par[0] * d.position[0] + par[1] * d.position[1] + par[2] * d.position[2] : 0 : d.offset;
      }
      const p = d.position || [0, 0, 0], q = d.orientation || [0, 0, 0, 1], v = d.velocity || d.linearVelocity || [0, 0, 0], w = d.angularVelocity || [0, 0, 0];
      if (!fin(p[0], p[1], p[2], q[0], q[1], q[2], q[3], v[0], v[1], v[2], w[0], w[1], w[2])) throw new RangeError("addBody: position/orientation/velocity \u306F\u6709\u9650\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
      const ql = Math.hypot(q[0], q[1], q[2], q[3]);
      if (!(ql > 1e-12)) throw new RangeError("addBody: orientation \u306E\u9577\u3055\u304C 0 \u3067\u3059\u3002");
      if (this.alloc.liveCount >= HANDLE_INDEX_LIMIT - 1) throw new RangeError("addBody: \u4E0A\u9650\u306B\u9054\u3057\u307E\u3057\u305F\u3002");
      const h = this.alloc.alloc(), i = h % HANDLE_INDEX_LIMIT;
      this._grow(i + 1);
      if (i >= this.count) this.count = i + 1;
      this.live[i] = 1;
      this.gen[i] = Math.floor(h / HANDLE_INDEX_LIMIT);
      this.type[i] = shape;
      this.btype[i] = btype;
      this.par[i * 4] = par[0];
      this.par[i * 4 + 1] = par[1];
      this.par[i * 4 + 2] = par[2];
      this.par[i * 4 + 3] = par[3];
      if (shape === SHAPE_PLANE) {
        this.pos[i * 3] = par[0] * par[3];
        this.pos[i * 3 + 1] = par[1] * par[3];
        this.pos[i * 3 + 2] = par[2] * par[3];
      } else {
        this.pos[i * 3] = p[0];
        this.pos[i * 3 + 1] = p[1];
        this.pos[i * 3 + 2] = p[2];
      }
      this.quat[i * 4] = q[0] / ql;
      this.quat[i * 4 + 1] = q[1] / ql;
      this.quat[i * 4 + 2] = q[2] / ql;
      this.quat[i * 4 + 3] = q[3] / ql;
      this.vel.fill(0, i * 3, i * 3 + 3);
      this.ang.fill(0, i * 3, i * 3 + 3);
      this.force.fill(0, i * 3, i * 3 + 3);
      this.torque.fill(0, i * 3, i * 3 + 3);
      if (btype !== BODY_STATIC) {
        this.vel[i * 3] = v[0];
        this.vel[i * 3 + 1] = v[1];
        this.vel[i * 3 + 2] = v[2];
        this.ang[i * 3] = w[0];
        this.ang[i * 3 + 1] = w[1];
        this.ang[i * 3 + 2] = w[2];
      }
      const dm = this.options;
      this.rest[i] = d.restitution === void 0 ? 0 : d.restitution;
      const f0 = d.friction === void 0 ? 0.5 : d.friction;
      this.fs[i] = d.staticFriction === void 0 ? f0 : d.staticFriction;
      this.fk[i] = d.dynamicFriction === void 0 ? f0 : d.dynamicFriction;
      if (!(this.rest[i] >= 0) || !(this.fs[i] >= 0) || !(this.fk[i] >= 0)) throw new RangeError("addBody: restitution/friction \u306F 0 \u4EE5\u4E0A\u3002");
      this.ld[i] = d.linearDamping === void 0 ? 0 : d.linearDamping;
      this.ad[i] = d.angularDamping === void 0 ? 0.01 : d.angularDamping;
      this.gs[i] = d.gravityScale === void 0 ? 1 : d.gravityScale;
      this.group[i] = d.group === void 0 ? 1 : d.group >>> 0;
      this.mask[i] = d.mask === void 0 ? 4294967295 : d.mask >>> 0;
      this.extra[i] = d.sensor ? FL_SENSOR : 0;
      this.lockRot[i] = d.lockRotation || d.lightweight ? 1 : 0;
      this.allowSleep[i] = d.allowSleep === false ? 0 : 1;
      this.ccdMode[i] = d.ccd === true ? 1 : d.ccd === false ? 2 : 0;
      this.sleepState[i] = 0;
      this.kinNode[i] = 0;
      this.touch[i] = -1;
      this.sleepT[i] = 0;
      this.islandNext[i] = -1;
      this.userData[i] = d.userData === void 0 ? null : d.userData;
      this.node[i] = null;
      this.nodeAttached[i] = 0;
      this.cr[i] = shape === SHAPE_SPHERE2 || shape === SHAPE_CAPSULE ? par[0] : shape === SHAPE_OBB ? Math.min(par[0], par[1], par[2]) : 0;
      this._setMassProps(i, d.mass, d.density === void 0 ? 1 : d.density);
      this._refresh(i);
      this.prevPos[i * 3] = this.pos[i * 3];
      this.prevPos[i * 3 + 1] = this.pos[i * 3 + 1];
      this.prevPos[i * 3 + 2] = this.pos[i * 3 + 2];
      for (let k = 0; k < 4; k++) this.prevQuat[i * 4 + k] = this.quat[i * 4 + k];
      this._syncFlags(i);
      this._listsDirty = true;
      if (d.node) this.bindNode(h, d.node);
      return h;
    }
    /** 複数まとめて追加（ハンドルの配列を返す）。 */
    addBodies(defs) {
      const out = new Array(defs.length);
      for (let k = 0; k < defs.length; k++) out[k] = this.addBody(defs[k]);
      return out;
    }
    _setMassProps(i, mass, density) {
      const t = this.btype[i], type = this.type[i];
      if (t !== BODY_DYNAMIC) {
        this.invMass[i] = 0;
        this.mass[i] = t === BODY_STATIC ? 0 : mass > 0 ? mass : 0;
        this.invI[i * 3] = this.invI[i * 3 + 1] = this.invI[i * 3 + 2] = 0;
        return;
      }
      let m = mass;
      if (m === void 0 || m === null) m = density * shapeVolume(type, this.par, i * 4);
      if (!(m > 0) || !isFinite(m)) throw new RangeError('addBody/setMass: mass \u306F\u6B63\u306E\u6709\u9650\u6570\u304C\u5FC5\u8981\u3067\u3059\uFF08\u9759\u7684\u306B\u3059\u308B\u306B\u306F type:"static"\uFF09\u3002');
      this.mass[i] = m;
      this.invMass[i] = 1 / m;
      if (this.lockRot[i]) {
        this.invI[i * 3] = this.invI[i * 3 + 1] = this.invI[i * 3 + 2] = 0;
        return;
      }
      computeLocalInertia(type, this.par, i * 4, m, _tmp3);
      this.invI[i * 3] = 1 / _tmp3[0];
      this.invI[i * 3 + 1] = 1 / _tmp3[1];
      this.invI[i * 3 + 2] = 1 / _tmp3[2];
    }
    _syncFlags(i) {
      this.flags[i] = F_ENABLED | (this.btype[i] === BODY_STATIC || this.sleepState[i] === 1 ? F_STATIC : 0);
    }
    /** 姿勢行列・ワールド慣性・AABB を現在の pos/quat から更新。 */
    _refresh(i) {
      const o = i * 4, q = this.quat;
      quatToAxes(q[o], q[o + 1], q[o + 2], q[o + 3], this.rotm, i * 9);
      if (this.btype[i] === BODY_DYNAMIC) worldInvInertia(this.rotm, i * 9, this.invI[i * 3], this.invI[i * 3 + 1], this.invI[i * 3 + 2], this.iw, i * 9);
      else this.iw.fill(0, i * 9, i * 9 + 9);
      computeAABB(this.type[i], this.pos, i * 3, this.par, i * 4, this.rotm, i * 9, this.aabb, i * 6);
      if (this.type[i] !== SHAPE_PLANE) {
        const m = this.options.contactMargin, a = this.aabb, k = i * 6;
        a[k] -= m;
        a[k + 1] -= m;
        a[k + 2] -= m;
        a[k + 3] += m;
        a[k + 4] += m;
        a[k + 5] += m;
      }
    }
    removeBody(h) {
      const i = this._idx(h);
      if (i < 0) return false;
      this._wakeIsland(i);
      this.unbindNode(h);
      for (let c = this.constraints.length - 1; c >= 0; c--) if (this.constraints[c].a === h || this.constraints[c].b === h) this.constraints.splice(c, 1);
      if (this.bp && this.bp.remove) this.bp.remove(i);
      this.live[i] = 0;
      this.flags[i] = 0;
      this.userData[i] = null;
      this.alloc.free(h);
      this._listsDirty = true;
      return true;
    }
    removeBodies(handles) {
      let n = 0;
      for (let k = 0; k < handles.length; k++) if (this.removeBody(handles[k])) n++;
      return n;
    }
    /** すべての剛体・拘束を削除（発行済みハンドルはすべて無効になる）。 */
    clear() {
      for (let i = 0; i < this.count; i++) if (this.live[i]) {
        this.live[i] = 0;
        this.flags[i] = 0;
        this.userData[i] = null;
        this.node[i] = null;
      }
      this.alloc.clear();
      this.count = 0;
      this.constraints.length = 0;
      this.cur.n = 0;
      this.prev.n = 0;
      this.timestep.reset();
      this.alpha = 0;
      this.bp = null;
      this._bpKind = "";
      this._cell = 0;
      this._listsDirty = true;
      this.nAwake = 0;
      this.nStat = 0;
      this.nPlanes = 0;
      return this;
    }
    dispose() {
      if (this.disposed) return;
      this.clear();
      this.disposed = true;
      this.options.onContactBegin = null;
      this.options.onContactEnd = null;
    }
    /* ================================================================== 状態の取得・設定（無効ハンドルは安全に false / null） */
    getPosition(h, out = [0, 0, 0]) {
      const i = this._idx(h);
      if (i < 0) return null;
      out[0] = this.pos[i * 3];
      out[1] = this.pos[i * 3 + 1];
      out[2] = this.pos[i * 3 + 2];
      return out;
    }
    getOrientation(h, out = [0, 0, 0, 1]) {
      const i = this._idx(h);
      if (i < 0) return null;
      for (let k = 0; k < 4; k++) out[k] = this.quat[i * 4 + k];
      return out;
    }
    getLinearVelocity(h, out = [0, 0, 0]) {
      const i = this._idx(h);
      if (i < 0) return null;
      out[0] = this.vel[i * 3];
      out[1] = this.vel[i * 3 + 1];
      out[2] = this.vel[i * 3 + 2];
      return out;
    }
    getAngularVelocity(h, out = [0, 0, 0]) {
      const i = this._idx(h);
      if (i < 0) return null;
      out[0] = this.ang[i * 3];
      out[1] = this.ang[i * 3 + 1];
      out[2] = this.ang[i * 3 + 2];
      return out;
    }
    getMass(h) {
      const i = this._idx(h);
      return i < 0 ? null : this.mass[i];
    }
    /** ローカル主慣性モーメント [Ix,Iy,Iz]（動的以外は Infinity）。 */
    getInertia(h, out = [0, 0, 0]) {
      const i = this._idx(h);
      if (i < 0) return null;
      for (let k = 0; k < 3; k++) out[k] = this.invI[i * 3 + k] > 0 ? 1 / this.invI[i * 3 + k] : Infinity;
      return out;
    }
    /** ワールド空間の逆慣性テンソル（行優先 9 要素）。次の step() 開始時点の姿勢で計算し直す。 */
    getInverseInertiaWorld(h, out = new Float64Array(9)) {
      const i = this._idx(h);
      if (i < 0) return null;
      this._refresh(i);
      for (let k = 0; k < 9; k++) out[k] = this.iw[i * 9 + k];
      return out;
    }
    /** ワールド空間の慣性テンソル（行優先 9 要素）= R·diag(I)·Rᵀ。動的以外は null。 */
    getInertiaWorld(h, out = new Float64Array(9)) {
      const i = this._idx(h);
      if (i < 0 || this.btype[i] !== BODY_DYNAMIC || this.lockRot[i]) return null;
      const R = this.rotm, r = i * 9;
      quatToAxes(this.quat[i * 4], this.quat[i * 4 + 1], this.quat[i * 4 + 2], this.quat[i * 4 + 3], R, r);
      const I = [1 / this.invI[i * 3], 1 / this.invI[i * 3 + 1], 1 / this.invI[i * 3 + 2]];
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) out[a * 3 + b] = I[0] * R[r + a] * R[r + b] + I[1] * R[r + 3 + a] * R[r + 3 + b] + I[2] * R[r + 6 + a] * R[r + 6 + b];
      return out;
    }
    getType(h) {
      const i = this._idx(h);
      return i < 0 ? null : ["static", "dynamic", "kinematic"][this.btype[i]];
    }
    getUserData(h) {
      const i = this._idx(h);
      return i < 0 ? void 0 : this.userData[i];
    }
    setUserData(h, v) {
      const i = this._idx(h);
      if (i < 0) return false;
      this.userData[i] = v;
      return true;
    }
    isSleeping(h) {
      const i = this._idx(h);
      return i >= 0 && this.sleepState[i] === 1;
    }
    /** 位置の直接指定（テレポート: 補間の前状態も揃える）。 */
    setPosition(h, x, y, z) {
      const i = this._idx(h);
      if (i < 0) return false;
      if (!isFinite(x + y + z)) throw new RangeError("setPosition: \u6709\u9650\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
      this._wakeIsland(i);
      const j = i * 3;
      this.pos[j] = x;
      this.pos[j + 1] = y;
      this.pos[j + 2] = z;
      this.prevPos[j] = x;
      this.prevPos[j + 1] = y;
      this.prevPos[j + 2] = z;
      if (this.type[i] === SHAPE_PLANE) return true;
      this._refresh(i);
      this._markStaticMoved(i);
      return true;
    }
    setOrientation(h, x, y, z, w) {
      const i = this._idx(h);
      if (i < 0) return false;
      const l = Math.hypot(x, y, z, w);
      if (!(l > 1e-12) || !isFinite(l)) throw new RangeError("setOrientation: \u9577\u3055\u304C 0 \u3067\u306A\u3044\u6709\u9650\u306A\u30AF\u30A9\u30FC\u30BF\u30CB\u30AA\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002");
      this._wakeIsland(i);
      const o = i * 4;
      this.quat[o] = x / l;
      this.quat[o + 1] = y / l;
      this.quat[o + 2] = z / l;
      this.quat[o + 3] = w / l;
      for (let k = 0; k < 4; k++) this.prevQuat[o + k] = this.quat[o + k];
      this._refresh(i);
      this._markStaticMoved(i);
      return true;
    }
    _markStaticMoved(i) {
      if (this.btype[i] === BODY_STATIC && this.bp) {
        if (this.bp.markStaticDirty) this.bp.markStaticDirty();
        if (this.bp.update) this.bp.update(i);
      }
    }
    setLinearVelocity(h, x, y, z) {
      const i = this._idx(h);
      if (i < 0 || this.btype[i] === BODY_STATIC) return false;
      if (!isFinite(x + y + z)) throw new RangeError("setLinearVelocity: \u6709\u9650\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
      this._wakeIsland(i);
      this.vel[i * 3] = x;
      this.vel[i * 3 + 1] = y;
      this.vel[i * 3 + 2] = z;
      return true;
    }
    setAngularVelocity(h, x, y, z) {
      const i = this._idx(h);
      if (i < 0 || this.btype[i] === BODY_STATIC) return false;
      if (!isFinite(x + y + z)) throw new RangeError("setAngularVelocity: \u6709\u9650\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
      this._wakeIsland(i);
      this.ang[i * 3] = x;
      this.ang[i * 3 + 1] = y;
      this.ang[i * 3 + 2] = z;
      return true;
    }
    setMass(h, mass) {
      const i = this._idx(h);
      if (i < 0) return false;
      if (this.btype[i] !== BODY_DYNAMIC) return false;
      this._wakeIsland(i);
      this._setMassProps(i, mass, 1);
      this._refresh(i);
      return true;
    }
    setMaterial(h, m = {}) {
      const i = this._idx(h);
      if (i < 0) return false;
      if (m.restitution !== void 0) this.rest[i] = m.restitution;
      if (m.friction !== void 0) {
        this.fs[i] = m.friction;
        this.fk[i] = m.friction;
      }
      if (m.staticFriction !== void 0) this.fs[i] = m.staticFriction;
      if (m.dynamicFriction !== void 0) this.fk[i] = m.dynamicFriction;
      if (m.linearDamping !== void 0) this.ld[i] = m.linearDamping;
      if (m.angularDamping !== void 0) this.ad[i] = m.angularDamping;
      if (m.gravityScale !== void 0) this.gs[i] = m.gravityScale;
      return true;
    }
    setCollisionFilter(h, group, mask) {
      const i = this._idx(h);
      if (i < 0) return false;
      this.group[i] = group >>> 0;
      this.mask[i] = mask >>> 0;
      return true;
    }
    /** 種別の変更 (static/dynamic/kinematic)。dynamic にするときは質量を mass で指定（省略時は密度 1）。 */
    setType(h, type, mass) {
      const i = this._idx(h);
      if (i < 0) return false;
      const t = TYPE_BY_NAME[type];
      if (t === void 0) throw new RangeError("setType: static/dynamic/kinematic");
      if (this.type[i] === SHAPE_PLANE && t !== BODY_STATIC) throw new RangeError("setType: \u5E73\u9762\u306F static \u306E\u307F\u3002");
      this._wakeIsland(i);
      this.btype[i] = t;
      if (t === BODY_STATIC) {
        this.vel.fill(0, i * 3, i * 3 + 3);
        this.ang.fill(0, i * 3, i * 3 + 3);
      }
      this._setMassProps(i, mass, 1);
      this._refresh(i);
      this._syncFlags(i);
      this._listsDirty = true;
      if (this.bp && this.bp.markStaticDirty) this.bp.markStaticDirty();
      return true;
    }
    /** kinematic ボディを「次の plannedSteps ステップで目標へ到達する速度」にする（Node を動かす代わりに直接指定）。 */
    setKinematicTarget(h, x, y, z, qx = null, qy = 0, qz = 0, qw = 1, seconds = this.options.fixedTimeStep) {
      const i = this._idx(h);
      if (i < 0 || this.btype[i] !== BODY_KINEMATIC) return false;
      const inv = 1 / seconds;
      this.vel[i * 3] = (x - this.pos[i * 3]) * inv;
      this.vel[i * 3 + 1] = (y - this.pos[i * 3 + 1]) * inv;
      this.vel[i * 3 + 2] = (z - this.pos[i * 3 + 2]) * inv;
      if (qx !== null) this._angularVelocityTo(i, qx, qy, qz, qw, inv);
      return true;
    }
    _angularVelocityTo(i, qx, qy, qz, qw, inv) {
      const o = i * 4, q = this.quat, cx = -q[o], cy = -q[o + 1], cz = -q[o + 2], cw = q[o + 3];
      let dx = qw * cx + qx * cw + qy * cz - qz * cy, dy = qw * cy + qy * cw + qz * cx - qx * cz, dz = qw * cz + qz * cw + qx * cy - qy * cx, dw = qw * cw - qx * cx - qy * cy - qz * cz;
      if (dw < 0) {
        dx = -dx;
        dy = -dy;
        dz = -dz;
        dw = -dw;
      }
      const s = Math.hypot(dx, dy, dz);
      if (s < 1e-12) {
        this.ang[i * 3] = this.ang[i * 3 + 1] = this.ang[i * 3 + 2] = 0;
        return;
      }
      const angle = 2 * Math.atan2(s, dw), k = angle * inv / s;
      this.ang[i * 3] = dx * k;
      this.ang[i * 3 + 1] = dy * k;
      this.ang[i * 3 + 2] = dz * k;
    }
    /* ---- 力・インパルス（力とトルクは「次の 1 ステップ」にだけ作用し、ステップ後にクリアされる） ---- */
    applyForce(h, fx, fy, fz) {
      const i = this._idx(h);
      if (i < 0 || this.btype[i] !== BODY_DYNAMIC) return false;
      this._wakeIsland(i);
      const j = i * 3;
      this.force[j] += fx;
      this.force[j + 1] += fy;
      this.force[j + 2] += fz;
      return true;
    }
    applyTorque(h, tx, ty, tz) {
      const i = this._idx(h);
      if (i < 0 || this.btype[i] !== BODY_DYNAMIC) return false;
      this._wakeIsland(i);
      const j = i * 3;
      this.torque[j] += tx;
      this.torque[j + 1] += ty;
      this.torque[j + 2] += tz;
      return true;
    }
    /** ワールド座標の点 (px,py,pz) に力を加える（重心からずれていればトルクも生じる）。 */
    applyForceAtPoint(h, fx, fy, fz, px, py, pz) {
      const i = this._idx(h);
      if (i < 0 || this.btype[i] !== BODY_DYNAMIC) return false;
      this._wakeIsland(i);
      const j = i * 3;
      this.force[j] += fx;
      this.force[j + 1] += fy;
      this.force[j + 2] += fz;
      const rx = px - this.pos[j], ry = py - this.pos[j + 1], rz = pz - this.pos[j + 2];
      this.torque[j] += ry * fz - rz * fy;
      this.torque[j + 1] += rz * fx - rx * fz;
      this.torque[j + 2] += rx * fy - ry * fx;
      return true;
    }
    /** 重心へ瞬間的な力積 (N·s) を加える（速度が impulse/mass だけ変わる）。 */
    applyImpulse(h, ix, iy, iz) {
      const i = this._idx(h);
      if (i < 0 || this.btype[i] !== BODY_DYNAMIC) return false;
      this._wakeIsland(i);
      const im = this.invMass[i], j = i * 3;
      this.vel[j] += ix * im;
      this.vel[j + 1] += iy * im;
      this.vel[j + 2] += iz * im;
      return true;
    }
    /** ワールド座標の点に力積を加える（速度と角速度が変わる）。 */
    applyImpulseAtPoint(h, ix, iy, iz, px, py, pz) {
      const i = this._idx(h);
      if (i < 0 || this.btype[i] !== BODY_DYNAMIC) return false;
      this._wakeIsland(i);
      const j = i * 3, im = this.invMass[i];
      this.vel[j] += ix * im;
      this.vel[j + 1] += iy * im;
      this.vel[j + 2] += iz * im;
      this._refresh(i);
      const rx = px - this.pos[j], ry = py - this.pos[j + 1], rz = pz - this.pos[j + 2], tx = ry * iz - rz * iy, ty = rz * ix - rx * iz, tz = rx * iy - ry * ix, W = this.iw, k = i * 9;
      this.ang[j] += W[k] * tx + W[k + 1] * ty + W[k + 2] * tz;
      this.ang[j + 1] += W[k + 3] * tx + W[k + 4] * ty + W[k + 5] * tz;
      this.ang[j + 2] += W[k + 6] * tx + W[k + 7] * ty + W[k + 8] * tz;
      return true;
    }
    applyAngularImpulse(h, ax, ay, az) {
      const i = this._idx(h);
      if (i < 0 || this.btype[i] !== BODY_DYNAMIC) return false;
      this._wakeIsland(i);
      this._refresh(i);
      const W = this.iw, k = i * 9, j = i * 3;
      this.ang[j] += W[k] * ax + W[k + 1] * ay + W[k + 2] * az;
      this.ang[j + 1] += W[k + 3] * ax + W[k + 4] * ay + W[k + 5] * az;
      this.ang[j + 2] += W[k + 6] * ax + W[k + 7] * ay + W[k + 8] * az;
      return true;
    }
    /* ================================================================== スリープ */
    wakeUp(h) {
      const i = this._idx(h);
      if (i < 0) return false;
      this._wakeIsland(i);
      this.sleepT[i] = 0;
      return true;
    }
    /** 強制的にスリープ（接触している動的物体は同じ島として一緒に眠らせず、この 1 体だけ眠る）。 */
    sleep(h) {
      const i = this._idx(h);
      if (i < 0 || this.btype[i] !== BODY_DYNAMIC) return false;
      if (this.sleepState[i] === 1) return true;
      this._sleepOne(i);
      this.islandNext[i] = i;
      this._listsDirty = true;
      return true;
    }
    _sleepOne(i) {
      this.sleepState[i] = 1;
      this.vel.fill(0, i * 3, i * 3 + 3);
      this.ang.fill(0, i * 3, i * 3 + 3);
      for (let k = 0; k < 3; k++) this.prevPos[i * 3 + k] = this.pos[i * 3 + k];
      for (let k = 0; k < 4; k++) this.prevQuat[i * 4 + k] = this.quat[i * 4 + k];
      this._syncFlags(i);
    }
    _wakeIsland(i) {
      if (this.sleepState[i] === 0) return;
      let k = i, guard = 0;
      do {
        this.sleepState[k] = 0;
        this.sleepT[k] = 0;
        this._syncFlags(k);
        const nx = this.islandNext[k];
        this.islandNext[k] = -1;
        if (this.nAwake < this.awake.length) this.awake[this.nAwake++] = k;
        k = nx;
      } while (k >= 0 && k !== i && ++guard < 1e7);
      this._listsDirty = true;
    }
    /* ================================================================== Node 結合 */
    /** Node を結合。dynamic: 物理 → Node(位置・回転)へ反映。kinematic: Node の変更を物理が追従。static: 何もしない。 */
    bindNode(h, node) {
      const i = this._idx(h);
      if (i < 0) return false;
      if (!node || !node.position || !node.quaternion) throw new TypeError("bindNode: position/quaternion \u3092\u6301\u3064 Node \u304C\u5FC5\u8981\u3067\u3059\u3002");
      this.node[i] = node;
      this.nodeAttached[i] = node.parent ? 1 : 0;
      return true;
    }
    unbindNode(h) {
      const i = this._idx(h);
      if (i < 0) return false;
      this.node[i] = null;
      this.nodeAttached[i] = 0;
      return true;
    }
    getNode(h) {
      const i = this._idx(h);
      return i < 0 ? null : this.node[i];
    }
    /** 補間後（描画用）の位置。物理の内部状態は変更しない。 */
    getRenderPosition(h, out = [0, 0, 0]) {
      const i = this._idx(h);
      if (i < 0) return null;
      const a = this.options.interpolate ? this.alpha : 1, j = i * 3;
      out[0] = this.prevPos[j] + (this.pos[j] - this.prevPos[j]) * a;
      out[1] = this.prevPos[j + 1] + (this.pos[j + 1] - this.prevPos[j + 1]) * a;
      out[2] = this.prevPos[j + 2] + (this.pos[j + 2] - this.prevPos[j + 2]) * a;
      return out;
    }
    /** 補間後（描画用）の姿勢（球面線形補間・最短経路）。 */
    getRenderOrientation(h, out = [0, 0, 0, 1]) {
      const i = this._idx(h);
      if (i < 0) return null;
      const a = this.options.interpolate ? this.alpha : 1, o = i * 4, P = this.prevQuat, Q = this.quat;
      let bx = Q[o], by = Q[o + 1], bz = Q[o + 2], bw = Q[o + 3], d = P[o] * bx + P[o + 1] * by + P[o + 2] * bz + P[o + 3] * bw, s0, s1;
      if (d < 0) {
        d = -d;
        bx = -bx;
        by = -by;
        bz = -bz;
        bw = -bw;
      }
      if (1 - d > 1e-6) {
        const om = Math.acos(d > 1 ? 1 : d), so = Math.sin(om);
        s0 = Math.sin((1 - a) * om) / so;
        s1 = Math.sin(a * om) / so;
      } else {
        s0 = 1 - a;
        s1 = a;
      }
      const x = s0 * P[o] + s1 * bx, y = s0 * P[o + 1] + s1 * by, z = s0 * P[o + 2] + s1 * bz, w = s0 * P[o + 3] + s1 * bw, l = Math.hypot(x, y, z, w) || 1;
      out[0] = x / l;
      out[1] = y / l;
      out[2] = z / l;
      out[3] = w / l;
      return out;
    }
    /** 物理 → Node へ反映（dynamic）。結合した Node が削除（親から外された）されていたら自動で解除する。 */
    syncTransforms() {
      const interp = this.options.interpolate, a = interp ? this.alpha : 1, auto = this.options.autoUnbindRemovedNodes;
      for (let i = 0; i < this.count; i++) {
        const n = this.node[i];
        if (!n || !this.live[i]) continue;
        if (auto && (this.nodeAttached[i] && !n.parent || n.disposed === true || n._disposed === true)) {
          this.node[i] = null;
          this.nodeAttached[i] = 0;
          this.stats.unboundNodes++;
          continue;
        }
        if (this.btype[i] !== BODY_DYNAMIC) continue;
        const asleep = this.sleepState[i] === 1;
        if (asleep && this.synced[i] === 1) continue;
        const j = i * 3, o = i * 4, P = this.prevPos, Q = this.quat;
        const x = P[j] + (this.pos[j] - P[j]) * a, y = P[j + 1] + (this.pos[j + 1] - P[j + 1]) * a, z = P[j + 2] + (this.pos[j + 2] - P[j + 2]) * a;
        const np = n.position, nq = n.quaternion;
        let changed = false;
        if (np[0] !== x || np[1] !== y || np[2] !== z) {
          np[0] = x;
          np[1] = y;
          np[2] = z;
          changed = true;
        }
        let qx, qy, qz, qw;
        if (a >= 1 || !interp) {
          qx = Q[o];
          qy = Q[o + 1];
          qz = Q[o + 2];
          qw = Q[o + 3];
        } else {
          const r = this.getRenderOrientation(this._handleOf(i), this._q4);
          qx = r[0];
          qy = r[1];
          qz = r[2];
          qw = r[3];
        }
        if (nq[0] !== qx || nq[1] !== qy || nq[2] !== qz || nq[3] !== qw) {
          nq[0] = qx;
          nq[1] = qy;
          nq[2] = qz;
          nq[3] = qw;
          changed = true;
        }
        if (changed && n.markDirty) n.markDirty();
        this.synced[i] = asleep ? 1 : 0;
      }
      return this;
    }
    _handleOf(i) {
      return this.alloc.handleAt(i);
    }
    /** kinematic ボディに結合された Node の姿勢を、plannedSteps ステップで到達する速度へ変換する。 */
    _pullKinematicNodes(steps) {
      const sec = Math.max(1, steps) * this.options.fixedTimeStep, inv = 1 / sec;
      for (let i = 0; i < this.count; i++) {
        const n = this.node[i];
        if (!n || !this.live[i] || this.btype[i] !== BODY_KINEMATIC) continue;
        const np = n.position, nq = n.quaternion, j = i * 3, o = i * 4;
        if (!isFinite(np[0] + np[1] + np[2] + nq[0] + nq[1] + nq[2] + nq[3])) continue;
        const dx = np[0] - this.pos[j], dy = np[1] - this.pos[j + 1], dz = np[2] - this.pos[j + 2];
        const dq = Math.abs(nq[0] - this.quat[o]) + Math.abs(nq[1] - this.quat[o + 1]) + Math.abs(nq[2] - this.quat[o + 2]) + Math.abs(nq[3] - this.quat[o + 3]);
        if (dx * dx + dy * dy + dz * dz < 1e-18 && dq < 1e-12) {
          if (this.kinNode[i]) {
            this.kinNode[i] = 0;
            this.vel.fill(0, j, j + 3);
            this.ang.fill(0, j, j + 3);
          }
          continue;
        }
        this.kinNode[i] = 1;
        this._wakeNear(i);
        this.vel[j] = dx * inv;
        this.vel[j + 1] = dy * inv;
        this.vel[j + 2] = dz * inv;
        const l = Math.hypot(nq[0], nq[1], nq[2], nq[3]) || 1;
        this._angularVelocityTo(i, nq[0] / l, nq[1] / l, nq[2] / l, nq[3] / l, inv);
      }
    }
    _wakeNear() {
    }
    /* ================================================================== 拘束（拡張基盤） */
    /** 拘束を追加。拘束は prepare(world,dt) / warmStart(world) / solveVelocity(world,dt) / solvePosition(world,dt) を持つオブジェクト。 */
    addConstraint(c) {
      if (!c || typeof c.prepare !== "function" || typeof c.solveVelocity !== "function") throw new TypeError("addConstraint: prepare/solveVelocity \u3092\u6301\u3064\u62D8\u675F\u304C\u5FC5\u8981\u3067\u3059\u3002");
      this.constraints.push(c);
      return c;
    }
    removeConstraint(c) {
      const k = this.constraints.indexOf(c);
      if (k >= 0) {
        this.constraints.splice(k, 1);
        return true;
      }
      return false;
    }
    /* ================================================================== 時間管理 */
    pause() {
      this.paused = true;
      this.timestep.pause();
      return this;
    }
    resume() {
      this.paused = false;
      this.timestep.resume();
      return this;
    }
    setTimeScale(v) {
      this.timestep.setTimeScale(v);
      this.options.timeScale = v;
      return this;
    }
    /** 実時間 dt（秒）を固定刻みへ分割して進める。最大サブステップ数・時間予算で上限をかけ、超過分は破棄して droppedTime に記録する。戻り値は実行ステップ数。 */
    advance(dt) {
      const s = this.stats;
      s.integrationMs = 0;
      s.broadphaseMs = 0;
      s.narrowphaseMs = 0;
      s.solverMs = 0;
      s.ccdMs = 0;
      s.stepMs = 0;
      s.ccdCount = 0;
      s.substeps = 0;
      if (this.disposed || this.paused || !(dt > 0) || !isFinite(dt)) {
        this._fillStats();
        return 0;
      }
      const ts = this.timestep, f = ts.fixedDt, budget = this.options.stepBudgetMs, start = now();
      let extraDrop = 0;
      this._plannedSteps = Math.max(1, Math.min(ts.maxSubSteps, Math.floor((ts.acc + Math.min(dt, ts.maxFrameDt) * ts.timeScale) / f + 1e-9)));
      this._pullKinematicNodes(this._plannedSteps);
      if (dt > ts.maxFrameDt) extraDrop += (dt - ts.maxFrameDt) * ts.timeScale;
      const n = ts.update(dt, (fdt) => {
        this.step(fdt);
        if (budget > 0 && now() - start > budget && ts.acc - f >= f) {
          const rest = ts.acc - f, whole = rest - rest % f;
          extraDrop += whole;
          ts.acc = f + rest % f;
          s.truncatedSteps++;
          this._warn("\u6642\u9593\u4E88\u7B97 stepBudgetMs=" + budget + "ms \u3092\u8D85\u3048\u305F\u305F\u3081\u3001\u6B8B\u308A\u306E\u30B9\u30C6\u30C3\u30D7\u3092\u7834\u68C4\u3057\u307E\u3057\u305F\u3002", "budget");
        }
      });
      this._extraDropped += extraDrop;
      this.droppedTime = ts.droppedTime + this._extraDropped;
      s.substeps = n;
      this.alpha = ts.acc / f;
      this._fillStats();
      if (n > 0 && ts.droppedTime > this._warnedDrop) {
        this._warnedDrop = ts.droppedTime;
        this._warn("\u6700\u5927\u30B5\u30D6\u30B9\u30C6\u30C3\u30D7\u6570 " + ts.maxSubSteps + " \u3092\u8D85\u3048\u305F\u305F\u3081\u3001\u30B7\u30DF\u30E5\u30EC\u30FC\u30B7\u30E7\u30F3\u6642\u9593 " + ts.droppedTime.toFixed(3) + " \u79D2\u5206\u3092\u7834\u68C4\u3057\u307E\u3057\u305F\u3002", "drop" + Math.floor(ts.droppedTime));
      }
      return n;
    }
    _fillStats() {
      const s = this.stats;
      let act = 0, sl = 0, st = 0, ki = 0, tot = 0;
      for (let i = 0; i < this.count; i++) {
        if (!this.live[i]) continue;
        tot++;
        const t = this.btype[i];
        if (t === BODY_STATIC) st++;
        else if (t === BODY_KINEMATIC) {
          ki++;
          act++;
        } else if (this.sleepState[i]) sl++;
        else act++;
      }
      s.bodies = tot;
      s.activeBodies = act;
      s.sleepingBodies = sl;
      s.staticBodies = st;
      s.kinematicBodies = ki;
      s.droppedTime = this.droppedTime;
      s.broadphase = this._bpKind;
    }
    getStats() {
      this._fillStats();
      return Object.assign({}, this.stats);
    }
    /* ================================================================== ブロードフェーズ */
    _rebuildLists() {
      const n = this.count;
      if (this.awake.length < this.capacity) {
        this.awake = new Int32Array(this.capacity);
        this.statList = new Int32Array(this.capacity);
      }
      let nA = 0, nS = 0, nP = 0, nDyn = 0;
      for (let i = 0; i < n; i++) {
        if (!this.live[i]) continue;
        if (this.type[i] === SHAPE_PLANE) {
          if (nP >= this.planes.length) {
            const p = new Int32Array(this.planes.length * 2);
            p.set(this.planes);
            this.planes = p;
          }
          this.planes[nP++] = i;
          continue;
        }
        if (this.btype[i] === BODY_STATIC || this.sleepState[i] === 1) this.statList[nS++] = i;
        else this.awake[nA++] = i;
        if (this.btype[i] !== BODY_STATIC) nDyn++;
      }
      this.nAwake = nA;
      this.nStat = nS;
      this.nPlanes = nP;
      const o = this.options;
      let kind = o.broadphase;
      if (kind === "auto") kind = nA + nS <= o.bruteForceThreshold ? "brute" : "hash";
      if (kind !== this._bpKind || !this.bp) {
        this._bpKind = kind;
        if (kind === "brute") this.bp = new BruteForceBroadphase(this);
        else if (kind === "tree") this.bp = new TreeBroadphase(this, { fatMargin: o.treeFatMargin });
        else if (kind === "hash") this.bp = new SpatialHashBroadphase(this, { cellSize: o.cellSize > 0 ? o.cellSize : 0 });
        else throw new RangeError("RigidBodyWorld: broadphase \u306F auto/hash/tree/brute \u306E\u3044\u305A\u308C\u304B\u3002");
        this._cell = 0;
      }
      if (kind === "hash" && !(o.cellSize > 0)) {
        if (!this._cell || nDyn > this._cellN * 2 || nDyn * 2 < this._cellN) {
          this.bp._listsDirty = true;
          this.bp.cellOption = 0;
          this.bp.setLists(this.awake, nA, this.statList, nS);
          this.bp._autoCell && (this._cell = this.bp._autoCell());
          this._cellN = nDyn;
        }
        this.bp.cellOption = this._cell || 0;
      }
      if (kind === "tree") {
        for (let k = 0; k < nA; k++) this.bp.insert(this.awake[k]);
        for (let k = 0; k < nS; k++) this.bp.insert(this.statList[k]);
      }
      this.bp.setLists(this.awake, nA, this.statList, nS);
      this._listsDirty = false;
    }
    /* ================================================================== 1 ステップ */
    /** 固定刻み dt で 1 ステップ進める（通常は advance() を使う。一時停止中でも直接呼べる）。 */
    step(dt) {
      if (this.disposed) return this.stats;
      if (!(dt > 0) || !isFinite(dt)) throw new RangeError("step: dt \u306F\u6B63\u306E\u6709\u9650\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
      const o = this.options, s = this.stats, t0 = now();
      if (this._listsDirty) this._rebuildLists();
      this._integrateVelocities(dt);
      const t1 = now();
      const bp = this.bp;
      bp.prepare();
      this.nPairs = 0;
      this._rawPairs = 0;
      bp.findPairs(this._onPair);
      const t2 = now();
      this._narrowphase(dt);
      const t3 = now();
      this._solve(dt);
      const t4 = now();
      this._ccd(dt);
      const t5 = now();
      this._integratePositions(dt);
      if (o.enableSleeping) this._updateSleeping(dt);
      this._finishStep();
      const t6 = now();
      s.integrationMs += t1 - t0 + (t6 - t5);
      s.broadphaseMs += t2 - t1;
      s.narrowphaseMs += t3 - t2;
      s.solverMs += t4 - t3;
      s.ccdMs += t5 - t4;
      s.stepMs += t6 - t0;
      this.time += dt;
      this.stepCount++;
      return s;
    }
    _integrateVelocities(dt) {
      const o = this.options, g = o.gravity, gx = g[0], gy = g[1], gz = g[2], vel = this.vel, ang = this.ang, force = this.force, torque = this.torque, im = this.invMass, iw = this.iw;
      const maxL2 = o.maxLinearSpeed * o.maxLinearSpeed, maxA2 = o.maxAngularSpeed * o.maxAngularSpeed, gyro = o.gyroscopic, awake = this.awake;
      const cad = o.contactAngularDamping, stamp = this.stepCount, cs = this.cur, touch = this.touch;
      if (cad > 0) {
        for (let m = 0; m < cs.n; m++) if (!(cs.fl[m] & MF_SENSOR)) {
          touch[cs.a[m]] = stamp;
          touch[cs.b[m]] = stamp;
        }
      }
      for (let k = 0; k < this.nAwake; k++) {
        const i = awake[k], j = i * 3, q = i * 4;
        for (let c = 0; c < 3; c++) this.prevPos[j + c] = this.pos[j + c];
        for (let c = 0; c < 4; c++) this.prevQuat[q + c] = this.quat[q + c];
        if (this.btype[i] !== BODY_DYNAMIC) continue;
        const inv = im[i], gs = this.gs[i];
        let vx = vel[j] + (gx * gs + force[j] * inv) * dt, vy = vel[j + 1] + (gy * gs + force[j + 1] * inv) * dt, vz = vel[j + 2] + (gz * gs + force[j + 2] * inv) * dt;
        const ld = this.ld[i];
        if (ld > 0) {
          const f = 1 / (1 + ld * dt);
          vx *= f;
          vy *= f;
          vz *= f;
        }
        const s2 = vx * vx + vy * vy + vz * vz;
        if (s2 > maxL2) {
          const f = o.maxLinearSpeed / Math.sqrt(s2);
          vx *= f;
          vy *= f;
          vz *= f;
        }
        vel[j] = vx;
        vel[j + 1] = vy;
        vel[j + 2] = vz;
        if (this.invI[j] === 0 && this.invI[j + 1] === 0 && this.invI[j + 2] === 0) {
          ang[j] = ang[j + 1] = ang[j + 2] = 0;
          continue;
        }
        const w = i * 9, tx = torque[j], ty = torque[j + 1], tz = torque[j + 2];
        let wx = ang[j] + (iw[w] * tx + iw[w + 1] * ty + iw[w + 2] * tz) * dt, wy = ang[j + 1] + (iw[w + 3] * tx + iw[w + 4] * ty + iw[w + 5] * tz) * dt, wz = ang[j + 2] + (iw[w + 6] * tx + iw[w + 7] * ty + iw[w + 8] * tz) * dt;
        ang[j] = wx;
        ang[j + 1] = wy;
        ang[j + 2] = wz;
        if (gyro) this._gyro(i, dt);
        const ad = this.ad[i] + (touch[i] === stamp ? cad : 0);
        if (ad > 0) {
          const f = 1 / (1 + ad * dt);
          ang[j] *= f;
          ang[j + 1] *= f;
          ang[j + 2] *= f;
        }
        const a2 = ang[j] * ang[j] + ang[j + 1] * ang[j + 1] + ang[j + 2] * ang[j + 2];
        if (a2 > maxA2) {
          const f = o.maxAngularSpeed / Math.sqrt(a2);
          ang[j] *= f;
          ang[j + 1] *= f;
          ang[j + 2] *= f;
        }
      }
    }
    /** ジャイロ項（慣性が非等方な物体の自由回転）: 剛体座標系で陰的オイラーを Newton 1 回で解く（Catto 2015）。 */
    _gyro(i, h) {
      const j = i * 3, R = this.rotm, r = i * 9, ang = this.ang, ix = this.invI[j], iy = this.invI[j + 1], iz = this.invI[j + 2];
      const Ix = 1 / ix, Iy = 1 / iy, Iz = 1 / iz;
      const mx = Math.max(Ix, Iy, Iz), mn = Math.min(Ix, Iy, Iz);
      if (mx - mn < 1e-9 * mx) return;
      const wx = ang[j], wy = ang[j + 1], wz = ang[j + 2];
      const ax = R[r] * wx + R[r + 1] * wy + R[r + 2] * wz, ay = R[r + 3] * wx + R[r + 4] * wy + R[r + 5] * wz, az = R[r + 6] * wx + R[r + 7] * wy + R[r + 8] * wz;
      const Lx = Ix * ax, Ly = Iy * ay, Lz = Iz * az;
      const fx = h * (ay * Lz - az * Ly), fy = h * (az * Lx - ax * Lz), fz = h * (ax * Ly - ay * Lx);
      const J00 = Ix + h * (0 - 0), J01 = h * (-az * Iy + Lz), J02 = h * (ay * Iz - Ly);
      const J10 = h * (az * Ix - Lz), J11 = Iy, J12 = h * (-ax * Iz + Lx);
      const J20 = h * (-ay * Ix + Ly), J21 = h * (ax * Iy - Lx), J22 = Iz;
      const det = J00 * (J11 * J22 - J12 * J21) - J01 * (J10 * J22 - J12 * J20) + J02 * (J10 * J21 - J11 * J20);
      if (Math.abs(det) < 1e-300) return;
      const id = 1 / det;
      const dx = ((J11 * J22 - J12 * J21) * fx + (J02 * J21 - J01 * J22) * fy + (J01 * J12 - J02 * J11) * fz) * id;
      const dy = ((J12 * J20 - J10 * J22) * fx + (J00 * J22 - J02 * J20) * fy + (J02 * J10 - J00 * J12) * fz) * id;
      const dz = ((J10 * J21 - J11 * J20) * fx + (J01 * J20 - J00 * J21) * fy + (J00 * J11 - J01 * J10) * fz) * id;
      const bx = ax - dx, by = ay - dy, bz = az - dz;
      ang[j] = R[r] * bx + R[r + 3] * by + R[r + 6] * bz;
      ang[j + 1] = R[r + 1] * bx + R[r + 4] * by + R[r + 7] * bz;
      ang[j + 2] = R[r + 2] * bx + R[r + 5] * by + R[r + 8] * bz;
    }
    /* ================================================================== ナローフェーズ（マニフォールド生成・前フレームとの対応付け） */
    _narrowphase(dt) {
      const o = this.options, margin = o.contactMargin, cur = this.prev, prev = this.cur;
      this.cur = cur;
      this.prev = prev;
      cur.n = 0;
      prev.matched.fill(0, 0, prev.n);
      const pt = this.ptab;
      pt.reset(prev.n);
      for (let m = 0; m < prev.n; m++) pt.put(prev.a[m], prev.b[m], m);
      this._begin.length = 0;
      this._ended.length = 0;
      this._unsupported = 0;
      const pb = this.pairBuf, np = this.nPairs;
      for (let k = 0; k < np; k++) this._pair(pb[k * 2], pb[k * 2 + 1], margin);
      if (this.nPlanes > 0) {
        for (let a = 0; a < this.nAwake; a++) {
          const i = this.awake[a], A = this.aabb;
          const io = i * 6;
          for (let p = 0; p < this.nPlanes; p++) {
            const pl = this.planes[p], q = pl * 4, nx = this.par[q], ny = this.par[q + 1], nz = this.par[q + 2], off = this.par[q + 3];
            const cx = (A[io] + A[io + 3]) * 0.5, cy = (A[io + 1] + A[io + 4]) * 0.5, cz = (A[io + 2] + A[io + 5]) * 0.5, ex = (A[io + 3] - A[io]) * 0.5, ey = (A[io + 4] - A[io + 1]) * 0.5, ez = (A[io + 5] - A[io + 2]) * 0.5;
            if (nx * cx + ny * cy + nz * cz - off > Math.abs(nx) * ex + Math.abs(ny) * ey + Math.abs(nz) * ez) continue;
            this._rawPairs++;
            this._pair(i, pl, margin);
          }
        }
      }
      if (o.onContactEnd || true) {
        for (let m = 0; m < prev.n; m++) if (!prev.matched[m]) {
          const a = prev.a[m], b = prev.b[m];
          if (this.live[a] && this.live[b] && this.gen[a] === prev.ga[m] && this.gen[b] === prev.gb[m] && !this.sleepState[a] && !this.sleepState[b]) this._ended.push(a, b, prev.fl[m] & MF_SENSOR);
        }
      }
      this.stats.candidatePairs = this._rawPairs;
      this.stats.contactPairs = cur.n;
      this.stats.unsupportedPairs = this._unsupported;
      let pts = 0;
      for (let m = 0; m < cur.n; m++) pts += cur.cnt[m];
      this.stats.contactPoints = pts;
    }
    _pair(i, j, margin) {
      if (i === j) return;
      const bt = this.btype, ti = bt[i], tj = bt[j], ex = this.extra;
      const si = this.sleepState[i], sj = this.sleepState[j];
      const sens = (ex[i] | ex[j]) & FL_SENSOR;
      if (ex[i] & ex[j] & FL_SENSOR) return;
      if (ti !== BODY_DYNAMIC && tj !== BODY_DYNAMIC) {
        if (!sens || ti === BODY_STATIC && tj === BODY_STATIC) return;
      }
      if ((this.group[i] & this.mask[j]) === 0 || (this.group[j] & this.mask[i]) === 0) return;
      if (si && sj) return;
      if (!sens && ti !== BODY_DYNAMIC && tj !== BODY_DYNAMIC) return;
      const lo = i < j ? i : j, hi = i < j ? j : i;
      if (!isPairSupported(this.type[lo], this.type[hi])) {
        if (!(this.type[lo] === SHAPE_PLANE && this.type[hi] === SHAPE_PLANE)) {
          this._unsupported++;
          this._warn("\u672A\u5BFE\u5FDC\u306E\u5F62\u72B6\u306E\u7D44\u307F\u5408\u308F\u305B: " + this.type[lo] + "\xD7" + this.type[hi], "unsup" + this.type[lo] + "," + this.type[hi]);
        }
        return;
      }
      const out = _out;
      if (!generateManifold(this, lo, hi, out, margin)) return;
      if (!sens) {
        if (si && (tj === BODY_DYNAMIC || this._moving(j))) this._wakeIsland(i);
        if (sj && (ti === BODY_DYNAMIC || this._moving(i))) this._wakeIsland(j);
      }
      if (!sens && (this.sleepState[i] || this.sleepState[j])) return;
      const cur = this.cur, m = cur.n++;
      cur.ensure(cur.n);
      cur.a[m] = lo;
      cur.b[m] = hi;
      cur.ga[m] = this.gen[lo];
      cur.gb[m] = this.gen[hi];
      cur.fl[m] = sens ? MF_SENSOR : 0;
      cur.matched[m] = 0;
      const nx = out.nx, ny = out.ny, nz = out.nz;
      cur.nrm[m * 3] = nx;
      cur.nrm[m * 3 + 1] = ny;
      cur.nrm[m * 3 + 2] = nz;
      const t1 = _tmp3;
      perp3(nx, ny, nz, t1);
      cur.t1[m * 3] = t1[0];
      cur.t1[m * 3 + 1] = t1[1];
      cur.t1[m * 3 + 2] = t1[2];
      cur.t2[m * 3] = ny * t1[2] - nz * t1[1];
      cur.t2[m * 3 + 1] = nz * t1[0] - nx * t1[2];
      cur.t2[m * 3 + 2] = nx * t1[1] - ny * t1[0];
      const o = this.options, fc = COMBINE[o.frictionCombine], rc = COMBINE[o.restitutionCombine];
      cur.fs[m] = fc(this.fs[lo], this.fs[hi]);
      cur.fk[m] = Math.min(fc(this.fk[lo], this.fk[hi]), cur.fs[m]);
      cur.rest[m] = rc(this.rest[lo], this.rest[hi]);
      const cnt = out.count;
      cur.cnt[m] = cnt;
      const pm = this.ptab.get(lo, hi), prev = this.prev;
      let ok = pm >= 0 && prev.ga[pm] === this.gen[lo] && prev.gb[pm] === this.gen[hi];
      if (ok) prev.matched[pm] = 1;
      else if (!sens || true) this._begin.push(lo, hi, sens ? 1 : 0);
      const R = this.rotm, ra = lo * 9, P = this.pos, warm = o.warmStarting && ok && !sens;
      for (let p = 0; p < cnt; p++) {
        const k = m * 4 + p, x = out.p[p * 3], y = out.p[p * 3 + 1], z = out.p[p * 3 + 2];
        cur.p[k * 3] = x;
        cur.p[k * 3 + 1] = y;
        cur.p[k * 3 + 2] = z;
        cur.depth[k] = out.depth[p];
        cur.id[k] = out.id[p];
        const dx = x - P[lo * 3], dy = y - P[lo * 3 + 1], dz = z - P[lo * 3 + 2];
        const lx = dx * R[ra] + dy * R[ra + 1] + dz * R[ra + 2], ly = dx * R[ra + 3] + dy * R[ra + 4] + dz * R[ra + 5], lz = dx * R[ra + 6] + dy * R[ra + 7] + dz * R[ra + 8];
        cur.la[k * 3] = lx;
        cur.la[k * 3 + 1] = ly;
        cur.la[k * 3 + 2] = lz;
        cur.ni[k] = 0;
        cur.ti1[k] = 0;
        cur.ti2[k] = 0;
        cur.pi[k] = 0;
        cur.maxNi[k] = 0;
        if (!warm) continue;
        const pc = prev.cnt[pm];
        let q = -1;
        for (let c = 0; c < pc; c++) if (prev.id[pm * 4 + c] === out.id[p]) {
          q = c;
          break;
        }
        if (q < 0) {
          let bd = 4e-4;
          for (let c = 0; c < pc; c++) {
            const kk = (pm * 4 + c) * 3, ddx = prev.la[kk] - lx, ddy = prev.la[kk + 1] - ly, ddz = prev.la[kk + 2] - lz, d2 = ddx * ddx + ddy * ddy + ddz * ddz;
            if (d2 < bd) {
              bd = d2;
              q = c;
            }
          }
        }
        if (q < 0) continue;
        const kq = pm * 4 + q;
        cur.ni[k] = prev.ni[kq];
        const wx = prev.ti1[kq] * prev.t1[pm * 3] + prev.ti2[kq] * prev.t2[pm * 3], wy = prev.ti1[kq] * prev.t1[pm * 3 + 1] + prev.ti2[kq] * prev.t2[pm * 3 + 1], wz = prev.ti1[kq] * prev.t1[pm * 3 + 2] + prev.ti2[kq] * prev.t2[pm * 3 + 2];
        cur.ti1[k] = wx * cur.t1[m * 3] + wy * cur.t1[m * 3 + 1] + wz * cur.t1[m * 3 + 2];
        cur.ti2[k] = wx * cur.t2[m * 3] + wy * cur.t2[m * 3 + 1] + wz * cur.t2[m * 3 + 2];
      }
    }
    _moving(i) {
      const v = this.vel, j = i * 3;
      return v[j] * v[j] + v[j + 1] * v[j + 1] + v[j + 2] * v[j + 2] > 1e-6 || this.ang[j] * this.ang[j] + this.ang[j + 1] * this.ang[j + 1] + this.ang[j + 2] * this.ang[j + 2] > 1e-6;
    }
    /* ================================================================== ソルバー */
    _solve(dt) {
      const o = this.options, cs = this.cur, n = cs.n, vel = this.vel, ang = this.ang, im = this.invMass, iw = this.iw, pos = this.pos;
      const nrm = cs.nrm, T1 = cs.t1, T2 = cs.t2;
      let maxPen = 0;
      this.nCorr = 0;
      for (let m = 0; m < n; m++) {
        if (cs.fl[m] & MF_SENSOR) continue;
        const a = cs.a[m], b = cs.b[m], ja = a * 3, jb = b * 3, wa = a * 9, wb = b * 9, imA = im[a], imB = im[b];
        const nx = nrm[m * 3], ny = nrm[m * 3 + 1], nz = nrm[m * 3 + 2], t1x = T1[m * 3], t1y = T1[m * 3 + 1], t1z = T1[m * 3 + 2], t2x = T2[m * 3], t2y = T2[m * 3 + 1], t2z = T2[m * 3 + 2];
        for (let p = 0; p < cs.cnt[m]; p++) {
          const k = m * 4 + p, k3 = k * 3, px = cs.p[k3], py = cs.p[k3 + 1], pz = cs.p[k3 + 2];
          const rax = px - pos[ja], ray = py - pos[ja + 1], raz = pz - pos[ja + 2], rbx = px - pos[jb], rby = py - pos[jb + 1], rbz = pz - pos[jb + 2];
          cs.rA[k3] = rax;
          cs.rA[k3 + 1] = ray;
          cs.rA[k3 + 2] = raz;
          cs.rB[k3] = rbx;
          cs.rB[k3 + 1] = rby;
          cs.rB[k3 + 2] = rbz;
          cs.nm[k] = 1 / (imA + imB + angK(iw, wa, ray * nz - raz * ny, raz * nx - rax * nz, rax * ny - ray * nx) + angK(iw, wb, rby * nz - rbz * ny, rbz * nx - rbx * nz, rbx * ny - rby * nx) || 1);
          cs.t1m[k] = 1 / (imA + imB + angK(iw, wa, ray * t1z - raz * t1y, raz * t1x - rax * t1z, rax * t1y - ray * t1x) + angK(iw, wb, rby * t1z - rbz * t1y, rbz * t1x - rbx * t1z, rbx * t1y - rby * t1x) || 1);
          cs.t2m[k] = 1 / (imA + imB + angK(iw, wa, ray * t2z - raz * t2y, raz * t2x - rax * t2z, rax * t2y - ray * t2x) + angK(iw, wb, rby * t2z - rbz * t2y, rbz * t2x - rbx * t2z, rbx * t2y - rby * t2x) || 1);
          const dvx = vel[jb] + ang[jb + 1] * rbz - ang[jb + 2] * rby - vel[ja] - (ang[ja + 1] * raz - ang[ja + 2] * ray), dvy = vel[jb + 1] + ang[jb + 2] * rbx - ang[jb] * rbz - vel[ja + 1] - (ang[ja + 2] * rax - ang[ja] * raz), dvz = vel[jb + 2] + ang[jb] * rby - ang[jb + 1] * rbx - vel[ja + 2] - (ang[ja] * ray - ang[ja + 1] * rax);
          cs.relv[k] = dvx * nx + dvy * ny + dvz * nz;
          const d = cs.depth[k];
          if (d > maxPen) maxPen = d;
          if (d > o.linearSlop) {
            if (this.nCorr >= this.corr.length) {
              const c = new Int32Array(this.corr.length * 2);
              c.set(this.corr);
              this.corr = c;
            }
            this.corr[this.nCorr++] = k;
          }
        }
        if (o.warmStarting) {
          for (let p = 0; p < cs.cnt[m]; p++) {
            const k = m * 4 + p, ni = cs.ni[k], t1i = cs.ti1[k], t2i = cs.ti2[k];
            if (ni === 0 && t1i === 0 && t2i === 0) continue;
            applyImpulse(vel, ang, im, iw, a, b, ja, jb, wa, wb, cs.rA, cs.rB, k * 3, nx * ni + t1x * t1i + t2x * t2i, ny * ni + t1y * t1i + t2y * t2i, nz * ni + t1z * t1i + t2z * t2i);
          }
        }
      }
      for (const c of this.constraints) {
        c.prepare(this, dt);
        if (o.warmStarting && c.warmStart) c.warmStart(this);
      }
      this.stats.maxPenetration = maxPen;
      this.stats.correctedContacts = this.nCorr;
      const iters = Math.max(1, o.solverIterations | 0);
      for (let it = 0; it < iters; it++) {
        const fwd = (it & 1) === 0;
        for (let mm = 0; mm < n; mm++) {
          const m = fwd ? mm : n - 1 - mm;
          if (cs.fl[m] & MF_SENSOR) continue;
          this._solveManifold(m, dt, fwd);
        }
        for (const c of this.constraints) c.solveVelocity(this, dt);
      }
      const thr = o.restitutionThreshold;
      for (let m = 0; m < n; m++) {
        if (cs.fl[m] & MF_SENSOR || !(cs.rest[m] > 0)) continue;
        const a = cs.a[m], b = cs.b[m], ja = a * 3, jb = b * 3, wa = a * 9, wb = b * 9, nx = nrm[m * 3], ny = nrm[m * 3 + 1], nz = nrm[m * 3 + 2], e = cs.rest[m];
        for (let p = 0; p < cs.cnt[m]; p++) {
          const k = m * 4 + p, k3 = k * 3, rv = cs.relv[k];
          if (rv > -thr || cs.maxNi[k] === 0) continue;
          const rax = cs.rA[k3], ray = cs.rA[k3 + 1], raz = cs.rA[k3 + 2], rbx = cs.rB[k3], rby = cs.rB[k3 + 1], rbz = cs.rB[k3 + 2];
          const dvx = vel[jb] + ang[jb + 1] * rbz - ang[jb + 2] * rby - vel[ja] - (ang[ja + 1] * raz - ang[ja + 2] * ray), dvy = vel[jb + 1] + ang[jb + 2] * rbx - ang[jb] * rbz - vel[ja + 1] - (ang[ja + 2] * rax - ang[ja] * raz), dvz = vel[jb + 2] + ang[jb] * rby - ang[jb + 1] * rbx - vel[ja + 2] - (ang[ja] * ray - ang[ja + 1] * rax);
          const vn = dvx * nx + dvy * ny + dvz * nz;
          let l = -cs.nm[k] * (vn + e * rv);
          const nn = Math.max(cs.ni[k] + l, 0);
          l = nn - cs.ni[k];
          cs.ni[k] = nn;
          applyImpulse(vel, ang, im, iw, a, b, ja, jb, wa, wb, cs.rA, cs.rB, k3, nx * l, ny * l, nz * l);
        }
      }
      this.stats.solverIterations = iters;
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
        let dvx = vel[jb] + ang[jb + 1] * rbz - ang[jb + 2] * rby - vel[ja] - (ang[ja + 1] * raz - ang[ja + 2] * ray), dvy = vel[jb + 1] + ang[jb + 2] * rbx - ang[jb] * rbz - vel[ja + 1] - (ang[ja + 2] * rax - ang[ja] * raz), dvz = vel[jb + 2] + ang[jb] * rby - ang[jb + 1] * rbx - vel[ja + 2] - (ang[ja] * ray - ang[ja + 1] * rax);
        const ni = cs.ni[k];
        let n1 = cs.ti1[k] - cs.t1m[k] * (dvx * t1x + dvy * t1y + dvz * t1z), n2 = cs.ti2[k] - cs.t2m[k] * (dvx * t2x + dvy * t2y + dvz * t2z);
        const mag = Math.sqrt(n1 * n1 + n2 * n2);
        if (mag > fs * ni) {
          const lim = fk * ni;
          if (mag > 1e-18) {
            const s = lim / mag;
            n1 *= s;
            n2 *= s;
          } else {
            n1 = 0;
            n2 = 0;
          }
        }
        const d1 = n1 - cs.ti1[k], d2 = n2 - cs.ti2[k];
        cs.ti1[k] = n1;
        cs.ti2[k] = n2;
        if (d1 !== 0 || d2 !== 0) applyImpulse(vel, ang, im, iw, a, b, ja, jb, wa, wb, cs.rA, cs.rB, k3, t1x * d1 + t2x * d2, t1y * d1 + t2y * d2, t1z * d1 + t2z * d2);
        dvx = vel[jb] + ang[jb + 1] * rbz - ang[jb + 2] * rby - vel[ja] - (ang[ja + 1] * raz - ang[ja + 2] * ray);
        dvy = vel[jb + 1] + ang[jb + 2] * rbx - ang[jb] * rbz - vel[ja + 1] - (ang[ja + 2] * rax - ang[ja] * raz);
        dvz = vel[jb + 2] + ang[jb] * rby - ang[jb + 1] * rbx - vel[ja + 2] - (ang[ja] * ray - ang[ja + 1] * rax);
        const vn = dvx * nx + dvy * ny + dvz * nz, depth = cs.depth[k], spec = depth < 0 ? -depth * invDt : 0;
        let l = -cs.nm[k] * (vn + spec);
        const nn = Math.max(ni + l, 0);
        l = nn - ni;
        cs.ni[k] = nn;
        if (nn > cs.maxNi[k]) cs.maxNi[k] = nn;
        if (l !== 0) applyImpulse(vel, ang, im, iw, a, b, ja, jb, wa, wb, cs.rA, cs.rB, k3, nx * l, ny * l, nz * l);
      }
    }
    _solvePositions(dt) {
      const o = this.options, cs = this.cur, nC = this.nCorr, its = Math.max(0, o.positionIterations | 0);
      this.stats.positionIterations = nC ? its : 0;
      this._pseudo = nC > 0 && its > 0;
      if (!this._pseudo) return;
      const vp = this.vp, wp = this.wp, im = this.invMass, iw = this.iw, awake = this.awake;
      for (let k = 0; k < this.nAwake; k++) {
        const j = awake[k] * 3;
        vp[j] = vp[j + 1] = vp[j + 2] = 0;
        wp[j] = wp[j + 1] = wp[j + 2] = 0;
      }
      const erp = o.positionCorrection / dt, slop = o.linearSlop, maxPush = o.maxPushSpeed, corr = this.corr, nrm = cs.nrm;
      for (let it = 0; it < its; it++) {
        for (let c = 0; c < nC; c++) {
          const k = corr[c], m = k / 4 | 0, a = cs.a[m], b = cs.b[m], ja = a * 3, jb = b * 3, wa = a * 9, wb = b * 9, k3 = k * 3;
          const nx = nrm[m * 3], ny = nrm[m * 3 + 1], nz = nrm[m * 3 + 2], rax = cs.rA[k3], ray = cs.rA[k3 + 1], raz = cs.rA[k3 + 2], rbx = cs.rB[k3], rby = cs.rB[k3 + 1], rbz = cs.rB[k3 + 2];
          const dvx = vp[jb] + wp[jb + 1] * rbz - wp[jb + 2] * rby - vp[ja] - (wp[ja + 1] * raz - wp[ja + 2] * ray), dvy = vp[jb + 1] + wp[jb + 2] * rbx - wp[jb] * rbz - vp[ja + 1] - (wp[ja + 2] * rax - wp[ja] * raz), dvz = vp[jb + 2] + wp[jb] * rby - wp[jb + 1] * rbx - vp[ja + 2] - (wp[ja] * ray - wp[ja + 1] * rax);
          let bias = erp * (cs.depth[k] - slop);
          if (bias > maxPush) bias = maxPush;
          let l = cs.nm[k] * (bias - (dvx * nx + dvy * ny + dvz * nz));
          const nn = Math.max(cs.pi[k] + l, 0);
          l = nn - cs.pi[k];
          cs.pi[k] = nn;
          applyImpulse(vp, wp, im, iw, a, b, ja, jb, wa, wb, cs.rA, cs.rB, k3, nx * l, ny * l, nz * l);
        }
      }
    }
    _positionConstraints(dt) {
      for (const c of this.constraints) if (c.solvePosition) c.solvePosition(this, dt);
    }
    /* ================================================================== CCD（連続衝突判定） */
    /**
     * 高速な物体は「中心の球(コア半径)」を今ステップの変位で動かし、最初に触れる時刻 TOI を求めて、その位置で止める。
     *  - 球: 静的・動的・kinematic・平面に対して厳密（sweepSphere）。相手の運動は相対変位として扱い、相手の回転は無視。
     *  - 箱・カプセル: コア半径（箱=最小半辺, カプセル=半径）の球で近似（コア球のすり抜けを防ぐ補助。角・端のすり抜けは防げない）。
     *  - 止めた物体は次ステップで通常の接触（推測的接触）として解かれる。止めた分の移動時間は失われる（時間分割はしない）。
     */
    _ccd(dt) {
      const o = this.options, s = this.stats;
      s.ccdCount = 0;
      this._ccdScale = null;
      if (!o.ccd) return;
      const vel = this.vel, awake = this.awake, pos = this.pos, thr = o.ccdThreshold, vp = this._pseudo ? this.vp : this._zero3(), pseudoOn = this._pseudo;
      let list = null, nl = 0;
      for (let a = 0; a < this.nAwake; a++) {
        const i = awake[a];
        if (this.btype[i] !== BODY_DYNAMIC || this.ccdMode[i] === 2 || this.extra[i] & FL_SENSOR) continue;
        const j = i * 3, r = this.cr[i];
        if (!(r > 0)) continue;
        const pv = pseudoOn ? 1 : 0, dx = (vel[j] + vp[j] * pv) * dt, dy = (vel[j + 1] + vp[j + 1] * pv) * dt, dz = (vel[j + 2] + vp[j + 2] * pv) * dt, d2 = dx * dx + dy * dy + dz * dz, lim = (this.ccdMode[i] === 1 ? 0.25 : 1) * thr * r;
        if (d2 > lim * lim) {
          if (!list) list = this._ccdList || (this._ccdList = []);
          list[nl++] = i;
        }
      }
      if (!nl) return;
      if (!this._ccdScale || this._ccdScale.length < this.capacity) this._ccdScale = new Float64Array(this.capacity).fill(1);
      const sc = this._ccdScale, bp = this.bp, c = _cc;
      for (let q = 0; q < nl; q++) {
        const i = list[q], j = i * 3, r = this.cr[i], pv = pseudoOn ? 1 : 0;
        const dx = (vel[j] + vp[j] * pv) * dt, dy = (vel[j + 1] + vp[j + 1] * pv) * dt, dz = (vel[j + 2] + vp[j + 2] * pv) * dt, A = this.aabb, io = i * 6;
        let best = 1, hitAny = false;
        const test = (jj) => {
          if (jj === i || this.extra[jj] & FL_SENSOR) return;
          if ((this.group[i] & this.mask[jj]) === 0 || (this.group[jj] & this.mask[i]) === 0) return;
          let rdx = dx, rdy = dy, rdz = dz;
          if (this.btype[jj] !== BODY_STATIC && !this.sleepState[jj]) {
            const k = jj * 3;
            rdx -= (vel[k] + vp[k] * pv) * dt;
            rdy -= (vel[k + 1] + vp[k + 1] * pv) * dt;
            rdz -= (vel[k + 2] + vp[k + 2] * pv) * dt;
          }
          if (sweepSphere(this, jj, pos[j], pos[j + 1], pos[j + 2], r, rdx, rdy, rdz, c) && c.toi > 1e-6 && c.toi < best) {
            best = c.toi;
            hitAny = true;
          }
        };
        const x0 = Math.min(A[io], A[io] + dx), y0 = Math.min(A[io + 1], A[io + 1] + dy), z0 = Math.min(A[io + 2], A[io + 2] + dz), x1 = Math.max(A[io + 3], A[io + 3] + dx), y1 = Math.max(A[io + 4], A[io + 4] + dy), z1 = Math.max(A[io + 5], A[io + 5] + dz);
        bp.queryAABB(x0, y0, z0, x1, y1, z1, test);
        for (let p = 0; p < this.nPlanes; p++) test(this.planes[p]);
        if (hitAny) {
          sc[i] = best;
          this._ccdHits.push(i);
          s.ccdCount++;
        }
      }
    }
    _zero3() {
      return this._z3 && this._z3.length >= this.capacity * 3 ? this._z3 : this._z3 = new Float64Array(this.capacity * 3);
    }
    /* ================================================================== 位置の積分 */
    _integratePositions(dt) {
      const pos = this.pos, quat2 = this.quat, vel = this.vel, ang = this.ang, vp = this.vp, wp = this.wp, awake = this.awake, sc = this._ccdScale, usedPseudo = this._pseudo, hasCcd = this._ccdHits.length > 0, tree = this._bpKind === "tree" ? this.bp : null;
      for (let k = 0; k < this.nAwake; k++) {
        const i = awake[k], j = i * 3, o = i * 4;
        let vx = vel[j], vy = vel[j + 1], vz = vel[j + 2], wx = ang[j], wy = ang[j + 1], wz = ang[j + 2];
        if (usedPseudo && this.btype[i] === BODY_DYNAMIC) {
          vx += vp[j];
          vy += vp[j + 1];
          vz += vp[j + 2];
          wx += wp[j];
          wy += wp[j + 1];
          wz += wp[j + 2];
        }
        const scale = hasCcd ? sc[i] : 1;
        pos[j] += vx * dt * scale;
        pos[j + 1] += vy * dt * scale;
        pos[j + 2] += vz * dt * scale;
        const wl = Math.sqrt(wx * wx + wy * wy + wz * wz);
        if (wl > 1e-12 && !this.lockRot[i]) {
          const half = wl * dt * 0.5, sn = Math.sin(half) / wl, dqx = wx * sn, dqy = wy * sn, dqz = wz * sn, dqw = Math.cos(half);
          const qx = quat2[o], qy = quat2[o + 1], qz = quat2[o + 2], qw = quat2[o + 3];
          const nx = dqw * qx + dqx * qw + dqy * qz - dqz * qy, ny = dqw * qy + dqy * qw + dqz * qx - dqx * qz, nz = dqw * qz + dqz * qw + dqx * qy - dqy * qx, nw = dqw * qw - dqx * qx - dqy * qy - dqz * qz;
          const l = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz + nw * nw);
          quat2[o] = nx * l;
          quat2[o + 1] = ny * l;
          quat2[o + 2] = nz * l;
          quat2[o + 3] = nw * l;
        }
        if (!isFinite(pos[j] + pos[j + 1] + pos[j + 2] + quat2[o] + quat2[o + 3])) this._invalidate(i);
        this._refresh(i);
        if (tree) tree.update(i);
      }
      if (hasCcd) {
        for (const i of this._ccdHits) sc[i] = 1;
        this._ccdHits.length = 0;
      }
      this._pseudo = false;
    }
    _invalidate(i) {
      this._warn("\u975E\u6709\u9650\u5024\u306B\u306A\u3063\u305F\u525B\u4F53\u3092\u7121\u52B9\u5316\uFF08\u30B9\u30EA\u30FC\u30D7\u5316\u3057\u3066\u901F\u5EA6\u30BC\u30ED\uFF09: body index " + i, "nan" + i);
      for (let c = 0; c < 3; c++) {
        this.pos[i * 3 + c] = this.prevPos[i * 3 + c];
        this.vel[i * 3 + c] = 0;
        this.ang[i * 3 + c] = 0;
      }
      for (let c = 0; c < 4; c++) this.quat[i * 4 + c] = this.prevQuat[i * 4 + c];
      this.btype[i] = BODY_STATIC;
      this._syncFlags(i);
      this._listsDirty = true;
      this.stats.invalidBodies = (this.stats.invalidBodies || 0) + 1;
    }
    /* ================================================================== スリープ判定（接触でつながった島単位） */
    _updateSleeping(dt) {
      const o = this.options, awake = this.awake, n = this.nAwake, lin2 = o.sleepLinearThreshold * o.sleepLinearThreshold, ang2 = o.sleepAngularThreshold * o.sleepAngularThreshold, isl = this.isl, minT = this.minT;
      let any = false;
      for (let k = 0; k < n; k++) {
        const i = awake[k];
        isl[i] = i;
        if (this.btype[i] !== BODY_DYNAMIC) continue;
        const j = i * 3;
        const v2 = this.vel[j] * this.vel[j] + this.vel[j + 1] * this.vel[j + 1] + this.vel[j + 2] * this.vel[j + 2], w2 = this.ang[j] * this.ang[j] + this.ang[j + 1] * this.ang[j + 1] + this.ang[j + 2] * this.ang[j + 2];
        if (v2 < lin2 && w2 < ang2 && this.allowSleep[i] && !(this.extra[i] & FL_SENSOR)) {
          this.sleepT[i] += dt;
          any = true;
        } else this.sleepT[i] = 0;
      }
      if (!any) return;
      const cs = this.cur, find = (x) => {
        while (isl[x] !== x) {
          isl[x] = isl[isl[x]];
          x = isl[x];
        }
        return x;
      };
      for (let m = 0; m < cs.n; m++) {
        const a = cs.a[m], b = cs.b[m];
        if (cs.fl[m] & MF_SENSOR) continue;
        const da = this.btype[a] === BODY_DYNAMIC && !this.sleepState[a], db = this.btype[b] === BODY_DYNAMIC && !this.sleepState[b];
        if (da && db) {
          const ra = find(a), rb = find(b);
          if (ra !== rb) isl[ra < rb ? rb : ra] = ra < rb ? ra : rb;
        } else if (da && this.btype[b] === BODY_KINEMATIC && this._moving(b)) this.sleepT[a] = 0;
        else if (db && this.btype[a] === BODY_KINEMATIC && this._moving(a)) this.sleepT[b] = 0;
      }
      for (let k = 0; k < n; k++) {
        const i = awake[k];
        if (this.btype[i] === BODY_DYNAMIC) minT[i] = Infinity;
      }
      for (const c of this.constraints) {
        const ia = this._idx(c.a), ib = this._idx(c.b);
        if (ia >= 0 && ib >= 0 && this.btype[ia] === BODY_DYNAMIC && this.btype[ib] === BODY_DYNAMIC) {
          const ra = find(ia), rb = find(ib);
          if (ra !== rb) isl[ra < rb ? rb : ra] = ra < rb ? ra : rb;
        }
      }
      for (let k = 0; k < n; k++) {
        const i = awake[k];
        if (this.btype[i] !== BODY_DYNAMIC) continue;
        const r = find(i);
        if (this.sleepT[i] < minT[r]) minT[r] = this.sleepT[i];
      }
      const first = this.islFirst, last = this.islLast;
      let slept = false;
      for (let k = 0; k < n; k++) {
        const i = awake[k];
        if (this.btype[i] === BODY_DYNAMIC) {
          first[i] = -1;
          last[i] = -1;
        }
      }
      for (let k = 0; k < n; k++) {
        const i = awake[k];
        if (this.btype[i] !== BODY_DYNAMIC) continue;
        const r = find(i);
        if (!(minT[r] >= o.sleepTime)) continue;
        if (first[r] < 0) {
          first[r] = last[r] = i;
          this.islandNext[i] = i;
        } else {
          this.islandNext[last[r]] = i;
          this.islandNext[i] = first[r];
          last[r] = i;
        }
        this._sleepOne(i);
        slept = true;
      }
      if (slept) this._listsDirty = true;
    }
    /* ================================================================== 後処理（イベント・力のクリア） */
    _finishStep() {
      const force = this.force, torque = this.torque;
      for (let k = 0; k < this.nAwake; k++) {
        const j = this.awake[k] * 3;
        force[j] = force[j + 1] = force[j + 2] = 0;
        torque[j] = torque[j + 1] = torque[j + 2] = 0;
      }
      const o = this.options;
      if (o.onContactBegin && this._begin.length) for (let k = 0; k < this._begin.length; k += 3) {
        const a = this._begin[k], b = this._begin[k + 1];
        if (this.live[a] && this.live[b]) o.onContactBegin(this._handleOf(a), this._handleOf(b), this._begin[k + 2] === 1);
      }
      if (o.onContactEnd && this._ended.length) for (let k = 0; k < this._ended.length; k += 3) {
        const a = this._ended[k], b = this._ended[k + 1];
        if (this.live[a] && this.live[b]) o.onContactEnd(this._handleOf(a), this._handleOf(b), this._ended[k + 2] === 1);
      }
    }
    /* ================================================================== クエリ */
    /** AABB と重なる物体のハンドルを fn(handle) で列挙（ブロードフェーズの AABB は contactMargin 分太い）。 */
    queryAABB(x0, y0, z0, x1, y1, z1, fn) {
      if (this._listsDirty) this._rebuildLists();
      this.bp.prepare();
      this.bp.queryAABB(x0, y0, z0, x1, y1, z1, (i) => fn(this._handleOf(i)));
    }
    /** レイキャスト。最初に当たった {handle, distance, point, normal} または null。 */
    raycast(origin, dir, maxDistance = Infinity) {
      if (this._listsDirty) this._rebuildLists();
      this.bp.prepare();
      const l = Math.hypot(dir[0], dir[1], dir[2]) || 1, dx = dir[0] / l, dy = dir[1] / l, dz = dir[2] / l;
      let best = null, tmax = maxDistance;
      const fn = (i, t) => {
        if (!rayShape(this, i, origin[0], origin[1], origin[2], dx, dy, dz, t, _hit2, 0)) return t;
        if (_hit2.t <= t && (!best || _hit2.t < best.distance)) {
          best = { handle: this._handleOf(i), distance: _hit2.t, point: [origin[0] + dx * _hit2.t, origin[1] + dy * _hit2.t, origin[2] + dz * _hit2.t], normal: [_hit2.nx, _hit2.ny, _hit2.nz] };
          return _hit2.t;
        }
        return t;
      };
      tmax = this.bp.raycast(origin[0], origin[1], origin[2], dx, dy, dz, tmax, fn);
      for (let p = 0; p < this.nPlanes; p++) tmax = fn(this.planes[p], tmax);
      return best;
    }
    /** デバッグ・検証用: fn(handle, index) を全ボディに。 */
    forEachBody(fn) {
      for (let i = 0; i < this.count; i++) if (this.live[i]) fn(this._handleOf(i), i);
    }
    /** 現在のマニフォールドを列挙: fn(handleA, handleB, info)。info は再利用されるオブジェクト（保持しないこと）。 */
    forEachContact(fn) {
      const cs = this.cur, info = this._info || (this._info = { nx: 0, ny: 0, nz: 0, count: 0, sensor: false, points: [] });
      for (let m = 0; m < cs.n; m++) {
        info.nx = cs.nrm[m * 3];
        info.ny = cs.nrm[m * 3 + 1];
        info.nz = cs.nrm[m * 3 + 2];
        info.count = cs.cnt[m];
        info.sensor = !!(cs.fl[m] & MF_SENSOR);
        for (let p = 0; p < 4; p++) {
          const k = m * 4 + p;
          const pt = info.points[p] || (info.points[p] = { x: 0, y: 0, z: 0, depth: 0, normalImpulse: 0, id: 0 });
          if (p < info.count) {
            pt.x = cs.p[k * 3];
            pt.y = cs.p[k * 3 + 1];
            pt.z = cs.p[k * 3 + 2];
            pt.depth = cs.depth[k];
            pt.normalImpulse = cs.ni[k];
            pt.id = cs.id[k];
          }
        }
        fn(this._handleOf(cs.a[m]), this._handleOf(cs.b[m]), info);
      }
    }
    /** 状態の指紋（FNV-1a 32bit）: 位置・姿勢・速度・角速度・スリープ状態。同一エンジン・同一入力で同一値になるかの検証用（異なる JS エンジン間の一致は保証しない）。 */
    stateHash() {
      let h = 2166136261;
      const n = this.count;
      const feed = (u8) => {
        for (let k = 0; k < u8.length; k++) {
          h ^= u8[k];
          h = Math.imul(h, 16777619);
        }
      };
      const f64 = (a, k) => feed(new Uint8Array(a.buffer, a.byteOffset, n * k * 8));
      f64(this.pos, 3);
      f64(this.quat, 4);
      f64(this.vel, 3);
      f64(this.ang, 3);
      feed(this.live.subarray(0, n));
      feed(this.sleepState.subarray(0, n));
      return (h >>> 0).toString(16).padStart(8, "0");
    }
  };
  function angK(iw, o, x, y, z) {
    const ax = iw[o] * x + iw[o + 1] * y + iw[o + 2] * z, ay = iw[o + 3] * x + iw[o + 4] * y + iw[o + 5] * z, az = iw[o + 6] * x + iw[o + 7] * y + iw[o + 8] * z;
    return x * ax + y * ay + z * az;
  }
  function applyImpulse(vel, ang, im, iw, a, b, ja, jb, wa, wb, rarr, rbarr, k3, px, py, pz) {
    const imA = im[a], imB = im[b];
    if (imA > 0) {
      vel[ja] -= px * imA;
      vel[ja + 1] -= py * imA;
      vel[ja + 2] -= pz * imA;
    }
    if (imB > 0) {
      vel[jb] += px * imB;
      vel[jb + 1] += py * imB;
      vel[jb + 2] += pz * imB;
    }
    if (iw[wa] !== 0 || iw[wa + 4] !== 0 || iw[wa + 8] !== 0) {
      const rx = rarr[k3], ry = rarr[k3 + 1], rz = rarr[k3 + 2], tx = ry * pz - rz * py, ty = rz * px - rx * pz, tz = rx * py - ry * px;
      ang[ja] -= iw[wa] * tx + iw[wa + 1] * ty + iw[wa + 2] * tz;
      ang[ja + 1] -= iw[wa + 3] * tx + iw[wa + 4] * ty + iw[wa + 5] * tz;
      ang[ja + 2] -= iw[wa + 6] * tx + iw[wa + 7] * ty + iw[wa + 8] * tz;
    }
    if (iw[wb] !== 0 || iw[wb + 4] !== 0 || iw[wb + 8] !== 0) {
      const rx = rbarr[k3], ry = rbarr[k3 + 1], rz = rbarr[k3 + 2], tx = ry * pz - rz * py, ty = rz * px - rx * pz, tz = rx * py - ry * px;
      ang[jb] += iw[wb] * tx + iw[wb + 1] * ty + iw[wb + 2] * tz;
      ang[jb + 1] += iw[wb + 3] * tx + iw[wb + 4] * ty + iw[wb + 5] * tz;
      ang[jb + 2] += iw[wb + 6] * tx + iw[wb + 7] * ty + iw[wb + 8] * tz;
    }
  }

  // src/engine.js
  var VERSION = "1.2.0";
  var LIVE = /* @__PURE__ */ new WeakMap();
  var EASE = { linear: (t) => t, easeIn: (t) => t * t, easeOut: (t) => 1 - (1 - t) * (1 - t), easeInOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 };
  function isSupported() {
    try {
      if (typeof document === "undefined") return false;
      const c = document.createElement("canvas"), gl = c.getContext("webgl2");
      if (!gl) return false;
      const e = gl.getExtension("WEBGL_lose_context");
      if (e) e.loseContext();
      return true;
    } catch (_) {
      return false;
    }
  }
  var Engine = class extends Emitter {
    /**
     * @param {object} options
     *  canvas (必須)  autoStart(true)  autoResize(true)  pauseWhenHidden(true)  antialias(true)  maxPixelRatio(2)
     *  quality('high'|'low'|'medium'|'ultra')  renderScale  shadows(bool)  adaptiveQuality(bool|{targetFps,minScale})
     *  controls(true|false|{...})  defaultLights(true)  background  physics(false|{...})  keyboard(true)
     *  maxFrameDt(0.05)  jobBudgetMs(3)  onStats  onError
     *  互換: count / gridCellSize / speed / cubeRotation を指定すると試作版と同じ粒子シーンを自動生成する。
     */
    constructor(options) {
      super();
      const tStart = now();
      const o = this.options = Object.assign({}, options);
      const canvas = o.canvas;
      if (!canvas || typeof canvas.getContext !== "function" || String(canvas.tagName).toLowerCase() !== "canvas") throw new TypeError("MassiveEngine requires options.canvas to be an HTML canvas element.");
      const prior = LIVE.get(canvas);
      if (prior && !prior.disposed) throw new MassiveEngineError("\u3053\u306E\u30AD\u30E3\u30F3\u30D0\u30B9\u306F\u5225\u306E MassiveEngine \u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u304C\u4F7F\u7528\u4E2D\u3067\u3059\u3002\u5148\u306B dispose() \u3059\u308B\u304B\u3001\u5225\u306E\u30AD\u30E3\u30F3\u30D0\u30B9\u3092\u4F7F\u3063\u3066\u304F\u3060\u3055\u3044\u3002", "E_CANVAS_IN_USE");
      this.canvas = canvas;
      this.disposed = false;
      this.running = false;
      this._contextLost = false;
      this._resumeAfterHidden = false;
      this._resumeAfterLost = false;
      this._errorHandler = (e, src) => this._reportError(e, src);
      this._onStats = typeof o.onStats === "function" ? o.onStats : null;
      if (typeof o.onError === "function") this.on("error", o.onError);
      this.renderer = new WebGL2Renderer(canvas, { antialias: o.antialias !== false, powerPreference: o.powerPreference, preserveDrawingBuffer: !!o.preserveDrawingBuffer });
      LIVE.set(canvas, this);
      this.gl = this.renderer.gl;
      this.scene = new Scene();
      if (o.background) this.setBackground(o.background);
      this.camera = new PerspectiveCamera(o.fov || 50, 0.1, 5e3);
      this.camera.setPosition(8, 6, 10);
      this.controls = null;
      if (o.controls !== false) {
        this.controls = new OrbitControls(this.camera, Object.assign({ distance: 14, yaw: 0.68, pitch: 0.45 }, typeof o.controls === "object" ? o.controls : {}));
        this.controls.attach(canvas);
      } else this.camera.lookAt(0, 0, 0);
      this.assets = new AssetManager();
      this.jobs = new JobQueue();
      this.physics = null;
      this.particleField = null;
      this.rigid = null;
      this.collision = null;
      this.collisionStep = null;
      this.profiler = null;
      this.inputManager = null;
      this.audio = null;
      this.debug = null;
      this._resources = null;
      this._animators = [];
      this._systems = [];
      this._updates = [];
      this._tweens = [];
      this._time = 0;
      this._lastStamp = 0;
      this._raf = 0;
      this.input = { keys: /* @__PURE__ */ new Set(), pointer: { x: 0, y: 0, down: false }, isKeyDown: (c) => this.input.keys.has(c) };
      this._maxPixelRatio = o.maxPixelRatio === void 0 ? 2 : o.maxPixelRatio;
      const preset = QUALITY_PRESETS[o.quality || "high"];
      if (!preset) throw new RangeError("quality \u306F " + Object.keys(QUALITY_PRESETS).join(" / ") + " \u306E\u3044\u305A\u308C\u304B\u3002");
      this.quality = Object.assign({}, preset);
      this.qualityName = o.quality || "high";
      if (o.renderScale !== void 0) this.quality.renderScale = clamp(o.renderScale, 0.25, 2);
      if (o.shadows !== void 0) this.quality.shadows = !!o.shadows;
      if (o.lodBias !== void 0) this.quality.lodBias = o.lodBias;
      this.adaptive = new AdaptiveQuality(typeof o.adaptiveQuality === "object" ? o.adaptiveQuality : { enabled: !!o.adaptiveQuality });
      this.adaptive.enabled = !!o.adaptiveQuality;
      this._maxFrameDt = o.maxFrameDt || 0.05;
      this._jobBudget = o.jobBudgetMs === void 0 ? 3 : o.jobBudgetMs;
      this._pauseWhenHidden = o.pauseWhenHidden !== false;
      this._frameStat = new RingStat(240);
      this._cpuStat = new RingStat(240);
      this._updStat = new RingStat(240);
      this._rndStat = new RingStat(240);
      this._fpsFrames = 0;
      this._fpsStart = 0;
      this._fps = 0;
      this._frameMs = 0;
      this._cpuMs = 0;
      this._updateMs = 0;
      this._renderMs = 0;
      this._frameCount = 0;
      this._initMs = 0;
      this.stats = {};
      if (o.defaultLights !== false) this.addDefaultLights();
      this._bind();
      this.resize();
      if (o.physics) this.enablePhysics(o.physics === true ? {} : o.physics);
      if (Number.isFinite(o.count)) {
        this.particleField = new ParticleField(this, o);
        this.addDefaultLights();
      }
      this._initMs = now() - tStart;
      if (o.autoStart !== false) this.start();
    }
    /* ---------------- イベント配線 ---------------- */
    _bind() {
      const c = this.canvas, o = this.options, h = this._h = {};
      h.resize = () => this.resize();
      if (o.autoResize !== false) {
        if (typeof ResizeObserver !== "undefined") {
          this._ro = new ResizeObserver(h.resize);
          this._ro.observe(c);
        } else window.addEventListener("resize", h.resize);
      }
      h.vis = () => {
        if (!this._pauseWhenHidden || this.disposed) return;
        if (document.hidden) {
          this._resumeAfterHidden = this.running;
          this._halt();
        } else if (this._resumeAfterHidden && !this._contextLost) {
          this._resumeAfterHidden = false;
          this.start();
        }
      };
      document.addEventListener("visibilitychange", h.vis);
      h.lost = (e) => {
        e.preventDefault();
        this._contextLost = true;
        this._resumeAfterLost = this.running || this._resumeAfterLost;
        this._halt();
        this.renderer.handleContextLost();
        this.emit("contextlost", {});
        this.emit("error", new MassiveEngineError("WebGL \u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u304C\u5931\u308F\u308C\u307E\u3057\u305F\u3002\u5FA9\u5E30\u3059\u308B\u3068\u81EA\u52D5\u3067\u518D\u958B\u3057\u307E\u3059\u3002", "E_CONTEXT_LOST"));
      };
      h.restored = () => {
        try {
          this.renderer.handleContextRestored();
          this._contextLost = false;
          this.resize();
          this.emit("contextrestored", {});
          if (this._resumeAfterLost) {
            this._resumeAfterLost = false;
            this.start();
          }
        } catch (e) {
          this._reportError(e, "contextrestored");
        }
      };
      c.addEventListener("webglcontextlost", h.lost, false);
      c.addEventListener("webglcontextrestored", h.restored, false);
      const payload = (type, e) => {
        const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        return { type, x, y, ndc: [x / Math.max(1, r.width) * 2 - 1, -(y / Math.max(1, r.height) * 2 - 1)], button: e.button, buttons: e.buttons, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, pointerId: e.pointerId, pointerType: e.pointerType, originalEvent: e };
      };
      let down = null;
      h.pd = (e) => {
        const p = payload("pointerdown", e);
        this.input.pointer.down = true;
        this.input.pointer.x = p.x;
        this.input.pointer.y = p.y;
        down = { x: e.clientX, y: e.clientY, t: now(), button: e.button, id: e.pointerId };
        this.emit("pointerdown", p);
      };
      h.pm = (e) => {
        const p = payload("pointermove", e);
        this.input.pointer.x = p.x;
        this.input.pointer.y = p.y;
        this.emit("pointermove", p);
      };
      h.pu = (e) => {
        const p = payload("pointerup", e);
        this.input.pointer.down = false;
        this.emit("pointerup", p);
        if (down && down.id === e.pointerId && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5 && now() - down.t < 600) this.emit("click", Object.assign(payload("click", e), { button: down.button }));
        down = null;
      };
      h.wh = (e) => this.emit("wheel", payload("wheel", e));
      c.addEventListener("pointerdown", h.pd);
      c.addEventListener("pointermove", h.pm);
      c.addEventListener("pointerup", h.pu);
      c.addEventListener("pointercancel", h.pu);
      c.addEventListener("wheel", h.wh, { passive: true });
      if (o.keyboard !== false) {
        const skip = (e) => {
          const t = e.target, n = t && t.tagName;
          return n === "INPUT" || n === "TEXTAREA" || n === "SELECT" || t && t.isContentEditable;
        };
        h.kd = (e) => {
          if (skip(e)) return;
          this.input.keys.add(e.code);
          this.emit("keydown", { type: "keydown", code: e.code, key: e.key, originalEvent: e });
        };
        h.ku = (e) => {
          this.input.keys.delete(e.code);
          this.emit("keyup", { type: "keyup", code: e.code, key: e.key, originalEvent: e });
        };
        h.blur = () => this.input.keys.clear();
        window.addEventListener("keydown", h.kd);
        window.addEventListener("keyup", h.ku);
        window.addEventListener("blur", h.blur);
      }
    }
    _unbind() {
      const c = this.canvas, h = this._h;
      if (this._ro) {
        this._ro.disconnect();
        this._ro = null;
      }
      window.removeEventListener("resize", h.resize);
      document.removeEventListener("visibilitychange", h.vis);
      c.removeEventListener("webglcontextlost", h.lost, false);
      c.removeEventListener("webglcontextrestored", h.restored, false);
      c.removeEventListener("pointerdown", h.pd);
      c.removeEventListener("pointermove", h.pm);
      c.removeEventListener("pointerup", h.pu);
      c.removeEventListener("pointercancel", h.pu);
      c.removeEventListener("wheel", h.wh);
      if (h.kd) {
        window.removeEventListener("keydown", h.kd);
        window.removeEventListener("keyup", h.ku);
        window.removeEventListener("blur", h.blur);
      }
    }
    _reportError(e, source) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (source && !err.source) err.source = source;
      if (!this.emit("error", err) && typeof console !== "undefined") console.error("MassiveEngine error" + (source ? " [" + source + "]" : "") + ":", err);
    }
    _assertAlive() {
      if (this.disposed) throw new MassiveEngineError("MassiveEngine \u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u306F\u7834\u68C4\u6E08\u307F\u3067\u3059\u3002", "E_DISPOSED");
    }
    /* ---------------- ライフサイクル ---------------- */
    get isRunning() {
      return this.running;
    }
    start() {
      this._assertAlive();
      if (this._contextLost) throw new MassiveEngineError("WebGL \u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u304C\u5229\u7528\u3067\u304D\u307E\u305B\u3093\u3002\u5FA9\u5E30\u3092\u5F85\u3064\u304B\u3001dispose() \u3057\u3066\u518D\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002", "E_CONTEXT_LOST");
      if (this.running) return this;
      if (this._pauseWhenHidden && typeof document !== "undefined" && document.hidden) {
        this._resumeAfterHidden = true;
        return this;
      }
      this.running = true;
      this._lastStamp = 0;
      this._fpsStart = now();
      this._fpsFrames = 0;
      this._raf = requestAnimationFrame((t) => this._tick(t));
      this.emit("start", {});
      return this;
    }
    resume() {
      return this.start();
    }
    _halt() {
      this.running = false;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
    stop() {
      if (this.disposed) return this;
      const was = this.running;
      this._resumeAfterHidden = false;
      this._resumeAfterLost = false;
      this._halt();
      if (was) this.emit("stop", {});
      return this;
    }
    dispose() {
      if (this.disposed) return;
      this.stop();
      this.disposed = true;
      this.emit("dispose", {});
      this._unbind();
      if (this.controls) this.controls.dispose();
      if (this.particleField) this.particleField.dispose();
      if (this.physics) this.physics.dispose ? this.physics.dispose() : 0;
      this.physics = null;
      if (this.rigid) {
        this.rigid.dispose();
        this.rigid = null;
      }
      if (this.collision) {
        this.collision.dispose();
        this.collision = null;
      }
      if (this.inputManager) this.inputManager.dispose();
      if (this.audio) this.audio.dispose();
      if (this.debug) {
        this.debug.dispose();
        this.debug = null;
      }
      if (this._resources) this._resources.dispose();
      this._animators.length = 0;
      this._systems.length = 0;
      this.assets.dispose();
      this.jobs.clear();
      this._updates.length = 0;
      this._tweens.length = 0;
      this.renderer.dispose();
      if (LIVE.get(this.canvas) === this) LIVE.delete(this.canvas);
      this.clearListeners();
      this._onStats = null;
    }
    /* ---------------- ループ ---------------- */
    _tick(stamp) {
      if (!this.running || this.disposed || this._contextLost) return;
      const t0 = now();
      let fatal = false;
      try {
        const ts = Number.isFinite(stamp) ? stamp : t0, raw = this._lastStamp ? Math.max(0, (ts - this._lastStamp) / 1e3) : 1 / 60;
        const dt = Math.min(raw, this._maxFrameDt);
        this._lastStamp = ts;
        this._frameMs = raw * 1e3;
        this._fpsFrames++;
        if (ts - this._fpsStart >= 500) {
          this._fps = this._fpsFrames * 1e3 / (ts - this._fpsStart);
          this._fpsFrames = 0;
          this._fpsStart = ts;
        }
        this._step(dt);
        const tu = now();
        this._updateMs = tu - t0;
        try {
          this._renderFrame();
        } catch (e) {
          fatal = true;
          throw e;
        }
        const t1 = now();
        this._renderMs = t1 - tu;
        this._cpuMs = t1 - t0;
        this._frameCount++;
        if (this._frameCount > 2) {
          this._frameStat.push(this._frameMs);
          this._cpuStat.push(this._cpuMs);
          this._updStat.push(this._updateMs);
          this._rndStat.push(this._renderMs);
        }
        if (this.adaptive.enabled && this._frameCount > 10 && this.adaptive.tick(this._frameMs, this._cpuMs, this.renderer.stats.gpuMs, t1)) {
          this._applyAdaptive();
        }
        if (this.profiler) this._profileFrame(t0, tu, t1);
        this._publishStats();
        if (this._onStats) {
          try {
            this._onStats(this.stats);
          } catch (e) {
            this._reportError(new Error("onStats callback failed: " + (e && e.message ? e.message : e)), "onStats");
          }
        }
      } catch (e) {
        if (fatal || !this.running) {
          this._halt();
          this._reportError(e, "render");
          return;
        }
        this._reportError(e, "update");
      }
      if (this.running && !this.disposed && !this._contextLost) this._raf = requestAnimationFrame((t) => this._tick(t));
    }
    _step(dt) {
      this._time += dt;
      if (this._jobBudget > 0 && this.jobs.pending) this.jobs.run(this._jobBudget, (e, s) => this._reportError(e, s));
      for (const fn of this._updates.slice()) {
        try {
          fn(dt, this._time);
        } catch (err) {
          this._reportError(err, "update-callback");
        }
      }
      this._runTweens(dt);
      if (this.physics) {
        if (this.physics.isWorker) this.physics.update(dt);
        else {
          this.physics.advance(dt);
          this.physics.syncTransforms();
        }
      }
      if (this.rigid) {
        const r = this.rigid, p = this.profiler;
        if (p) p.begin("rigid");
        r.advance(dt);
        r.syncTransforms();
        if (p) {
          p.end("rigid");
          const s = r.stats;
          p.gauge("rigidBodies", s.bodies);
          p.gauge("rigidActive", s.activeBodies);
          p.gauge("rigidContacts", s.contactPoints);
          p.gauge("rigidSolverMs", s.solverMs, { unit: "ms" });
        }
      }
      if (this.collision) this._stepCollision(dt);
      if (this._animators.length) for (const a of this._animators) a.update(dt);
      if (this._systems.length) for (const sys of this._systems) sys.update(dt);
      this.emit("update", { dt, time: this._time });
    }
    _stepCollision(dt) {
      const prof = this.profiler;
      if (prof) prof.begin("collision");
      this.collisionStep.update(dt, (fdt) => this.collision.step(fdt));
      if (prof) {
        prof.end("collision");
        const s = this.collision.stats;
        prof.gauge("collisionPairs", s.candidatePairs || 0);
        prof.gauge("collisionContacts", s.contacts || 0);
      }
    }
    _profileFrame(t0, tu, t1) {
      const p = this.profiler, r = this.renderer.stats;
      p.record("frame", this._frameMs, { unit: "ms", kind: "time" });
      p.record("cpu", t1 - t0, { unit: "ms", kind: "time" });
      p.record("update", tu - t0, { unit: "ms", kind: "time" });
      p.record("render", t1 - tu, { unit: "ms", kind: "time" });
      if (r.gpuTimer) p.record("gpu", r.gpuMs, { unit: "ms", kind: "time" });
      else p.unsupported("gpu", "EXT_disjoint_timer_query_webgl2 \u304C\u4F7F\u3048\u306A\u3044\u74B0\u5883\u306E\u305F\u3081 GPU \u6642\u9593\u306F\u8A08\u6E2C\u3067\u304D\u307E\u305B\u3093");
      p.gauge("drawCalls", r.drawCalls);
      p.gauge("triangles", r.triangles);
      p.gauge("instances", r.instances);
      p.gauge("uploadBytes", r.uploadBytes);
      if (this.physics && this.physics.stats) p.gauge("physicsStepMs", this.physics.stats.stepMs || 0, { unit: "ms" });
      const heap = typeof performance !== "undefined" && performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null;
      if (heap !== null) p.gauge("jsHeapMB", heap, { unit: "MB" });
      else p.unsupported("jsHeapMB", "performance.memory \u304C\u4F7F\u3048\u306A\u3044\u74B0\u5883");
      p.endFrame();
    }
    _shadowsOn() {
      const s = ADAPTIVE_STEPS[this.adaptive.enabled ? this.adaptive.level : 0];
      return this.quality.shadows && s.shadow > 0 && this.renderer.shadowSupported;
    }
    _renderFrame() {
      this.resize();
      this.emit("beforeRender", {});
      const st = ADAPTIVE_STEPS[this.adaptive.enabled ? this.adaptive.level : 0];
      const ctx = { time: this._time, shadows: this._shadowsOn(), shadowMapSize: Math.max(256, Math.round(this.quality.shadowMapSize * (st.shadow || 1))), lodBias: this.quality.lodBias * st.lod, shadowCenter: this.controls ? Array.from(this.controls.target) : null };
      this.renderer.render(this.scene, this.camera, ctx);
      this.emit("afterRender", {});
    }
    /** 1フレームだけ手動で描画する（stop 中のスクリーンショット等）。 */
    renderOnce() {
      this._assertAlive();
      if (this._contextLost) return false;
      this._renderFrame();
      this._publishStats();
      return true;
    }
    /** 描画して RGBA ピクセルを返す（検証・サムネイル用）。 */
    capture() {
      this.renderOnce();
      return this.renderer.readPixels();
    }
    _applyAdaptive() {
      this.resize(true);
      this.emit("quality", { level: this.adaptive.level, step: this.adaptive.step });
    }
    resize(force) {
      if (this.disposed || this._contextLost) return false;
      const c = this.canvas, st = ADAPTIVE_STEPS[this.adaptive.enabled ? this.adaptive.level : 0];
      const scale = Math.max(this.adaptive.minScale || 0.25, this.quality.renderScale * st.scale);
      const dpr = Math.min(typeof window !== "undefined" && window.devicePixelRatio || 1, this._maxPixelRatio) * scale;
      const cssW = c.clientWidth || c.parentElement && c.parentElement.clientWidth || c.width || 300, cssH = c.clientHeight || c.parentElement && c.parentElement.clientHeight || c.height || 150;
      const gl = this.gl, maxDim = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 4096;
      const w = Math.min(maxDim, Math.max(1, Math.floor(cssW * dpr))), h = Math.min(maxDim, Math.max(1, Math.floor(cssH * dpr)));
      if (force || c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
        gl.viewport(0, 0, w, h);
        this.emit("resize", { width: w, height: h, cssWidth: cssW, cssHeight: cssH, pixelRatio: dpr });
        return true;
      }
      return false;
    }
    /* ---------------- 統計 ---------------- */
    _publishStats() {
      const r = this.renderer.stats, p = this.physics ? this.physics.stats || {} : {};
      const jsHeap = typeof performance !== "undefined" && performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null;
      this.stats = {
        // 試作版互換キー
        count: this.particleField ? this.particleField.count : p.bodies || 0,
        fps: this._fps,
        frameMs: this._frameMs,
        stepMs: p.stepMs || 0,
        integrateMs: p.integrateMs || 0,
        gridMs: p.gridMs || 0,
        collisionMs: p.collisionMs || 0,
        candidatePairs: p.candidatePairs || 0,
        overlaps: p.overlaps || 0,
        activeCells: p.activeCells || 0,
        uploadMs: r.uploadMs,
        // 追加
        cpuMs: this._cpuMs,
        updateMs: this._updateMs,
        renderMs: this._renderMs,
        frameP95Ms: this._frameStat.percentile(0.95),
        cpuP95Ms: this._cpuStat.percentile(0.95),
        frameMaxMs: this._frameStat.max(),
        gpuMs: r.gpuMs,
        gpuTimerSupported: r.gpuTimer,
        drawCalls: r.drawCalls,
        shadowDrawCalls: r.shadowDrawCalls,
        triangles: r.triangles,
        instances: r.instances,
        visibleObjects: r.visibleObjects,
        culledObjects: r.culledObjects,
        visibleChunks: r.visibleChunks,
        culledChunks: r.culledChunks,
        shadows: r.shadows,
        programs: r.programs,
        geometries: r.geometries,
        textures: r.textures,
        gpuBytes: r.gpuBytes,
        jsHeapMB: jsHeap,
        rigidBodies: this.rigid ? this.rigid.stats.bodies : 0,
        rigidStepMs: this.rigid ? this.rigid.stats.stepMs : 0,
        bodies: p.bodies || 0,
        physicsSubsteps: p.substeps || 0,
        physicsDroppedTime: p.droppedTime || 0,
        physicsOnWorker: !!(this.physics && this.physics.isWorker),
        renderScale: this.quality.renderScale * ADAPTIVE_STEPS[this.adaptive.enabled ? this.adaptive.level : 0].scale,
        qualityLevel: this.adaptive.level,
        canvasWidth: this.canvas.width,
        canvasHeight: this.canvas.height,
        initMs: this._initMs,
        frames: this._frameCount,
        jobsPending: this.jobs.pending,
        uploadBytes: r.uploadBytes,
        vertices: r.vertices,
        textureBytes: r.textureBytes,
        visibilityCulled: r.visibilityCulled
      };
    }
    getStats() {
      if (!this.stats || !("fps" in this.stats)) this._publishStats();
      return Object.assign({}, this.stats);
    }
    /* ---------------- シーン操作 ---------------- */
    add(...nodes) {
      this._assertAlive();
      this.scene.add(...nodes);
      return this;
    }
    remove(...nodes) {
      this._assertAlive();
      this.scene.remove(...nodes);
      return this;
    }
    setBackground(c) {
      parseColor(c, this.scene.background);
      return this;
    }
    addDefaultLights() {
      if (this._defaultLights) return this;
      this._defaultLights = [new AmbientLight(16777215, 0.35), new DirectionalLight(16777215, 0.85, { direction: [-0.45, -0.85, -0.55] })];
      this.scene.add(...this._defaultLights);
      return this;
    }
    _mesh(geo, o) {
      this._assertAlive();
      const m = new Mesh(geo, o.material || new Material({ color: o.color === void 0 ? 13421772 : o.color, map: o.map || null, opacity: o.opacity === void 0 ? 1 : o.opacity, unlit: o.unlit }), { castShadow: o.castShadow, receiveShadow: o.receiveShadow, name: o.name });
      if (o.position) m.setPosition(o.position[0], o.position[1], o.position[2]);
      if (o.scale !== void 0) typeof o.scale === "number" ? m.setScale(o.scale) : m.setScale(o.scale[0], o.scale[1], o.scale[2]);
      if (o.rotation) m.setRotationEuler(o.rotation[0], o.rotation[1], o.rotation[2]);
      this.scene.add(m);
      return m;
    }
    addBox(o = {}) {
      const s = o.size || [1, 1, 1];
      return this._mesh(Geometry.box(s[0], s[1], s[2]), o);
    }
    addSphere(o = {}) {
      return this._mesh(Geometry.sphere(o.radius === void 0 ? 0.5 : o.radius, o.segments || 24, Math.max(2, Math.round((o.segments || 24) * 2 / 3))), o);
    }
    addPlane(o = {}) {
      return this._mesh(Geometry.plane(o.width || 10, o.depth || 10, o.segments || 1, o.segments || 1), Object.assign({ receiveShadow: true }, o));
    }
    addCylinder(o = {}) {
      return this._mesh(Geometry.cylinder(o.radiusTop === void 0 ? 0.5 : o.radiusTop, o.radiusBottom === void 0 ? 0.5 : o.radiusBottom, o.height || 1, o.segments || 24), o);
    }
    addGrid(size = 20, divisions = 20) {
      const g = createGridHelper(size, divisions);
      this.scene.add(g);
      return g;
    }
    /* ---------------- 更新・アニメーション ---------------- */
    /** 毎フレーム fn(dt, time) を呼ぶ。戻り値の関数で解除。 */
    addUpdate(fn) {
      this._assertAlive();
      if (typeof fn !== "function") throw new TypeError("addUpdate: \u95A2\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
      this._updates.push(fn);
      return () => {
        const i = this._updates.indexOf(fn);
        if (i >= 0) this._updates.splice(i, 1);
      };
    }
    /** 時間ベースのアニメーション。onUpdate(t0to1, easedT)。戻り値 { cancel(), finished: Promise } */
    animate({ duration = 1, delay = 0, easing = "linear", loop = false, onUpdate, onComplete } = {}) {
      this._assertAlive();
      const ease = typeof easing === "function" ? easing : EASE[easing] || EASE.linear;
      let resolve;
      const finished = new Promise((r) => {
        resolve = r;
      });
      const tw = { t: -delay, duration: Math.max(1e-6, duration), ease, loop, onUpdate, onComplete, done: false, resolve, runs: 0 };
      this._tweens.push(tw);
      return { cancel: () => {
        tw.done = true;
        resolve(false);
      }, finished };
    }
    /** target[prop] (数値 または 数値配列) を to へ補間する。ノードの位置等に使える。 */
    tween(target, to, duration = 1, opts = {}) {
      const from = {};
      for (const k of Object.keys(to)) from[k] = typeof target[k] === "number" ? target[k] : Array.from(target[k]);
      return this.animate(Object.assign({}, opts, { duration, onUpdate: (t, e) => {
        for (const k of Object.keys(to)) {
          if (typeof to[k] === "number") target[k] = from[k] + (to[k] - from[k]) * e;
          else for (let i = 0; i < to[k].length; i++) target[k][i] = from[k][i] + (to[k][i] - from[k][i]) * e;
        }
        if (target.markDirty) target.markDirty();
      } }));
    }
    _runTweens(dt) {
      for (const tw of this._tweens.slice()) {
        if (tw.done) continue;
        tw.t += dt;
        if (tw.t < 0) continue;
        let u = tw.t / tw.duration;
        const end = u >= 1;
        if (end && tw.loop && (tw.loop === true || ++tw.runs < tw.loop)) {
          tw.t = 0;
          u = 0;
        } else if (end) u = 1;
        try {
          if (tw.onUpdate) tw.onUpdate(u, tw.ease(u));
          if (end && !(tw.loop && (tw.loop === true || tw.runs < tw.loop))) {
            tw.done = true;
            if (tw.onComplete) tw.onComplete();
            tw.resolve(true);
          }
        } catch (e) {
          tw.done = true;
          tw.resolve(false);
          this._reportError(e, "animate");
        }
      }
      this._tweens = this._tweens.filter((t) => !t.done);
    }
    /* ---------------- ピッキング ---------------- */
    /** 画面座標 (クライアントpx) からのレイ */
    screenRay(clientX, clientY) {
      const r = this.canvas.getBoundingClientRect();
      this.camera.updateCamera(this.canvas.width / Math.max(1, this.canvas.height));
      return rayFromCamera(this.camera, (clientX - r.left) / Math.max(1, r.width) * 2 - 1, -((clientY - r.top) / Math.max(1, r.height) * 2 - 1));
    }
    /** raycast(ray, opts) もしくは raycast(clientX, clientY, opts)。距離昇順のヒット配列。 */
    raycast(a, b, c) {
      this._assertAlive();
      this.scene.updateMatrices();
      if (typeof a === "number") return raycast(this.scene, this.screenRay(a, b), c || {});
      return raycast(this.scene, a, b || {});
    }
    pick(clientX, clientY, opts) {
      const h = this.raycast(clientX, clientY, Object.assign({ limit: 1 }, opts));
      return h.length ? h[0] : null;
    }
    /* ---------------- 設定 ---------------- */
    setQuality(q) {
      this._assertAlive();
      if (typeof q === "string") {
        if (!QUALITY_PRESETS[q]) throw new RangeError("\u672A\u77E5\u306E\u54C1\u8CEA\u30D7\u30EA\u30BB\u30C3\u30C8: " + q);
        Object.assign(this.quality, QUALITY_PRESETS[q]);
        this.qualityName = q;
      } else if (q && typeof q === "object") {
        for (const k of Object.keys(q)) {
          if (!(k in this.quality)) throw new RangeError("\u672A\u77E5\u306E\u54C1\u8CEA\u9805\u76EE: " + k);
          this.quality[k] = q[k];
        }
        this.qualityName = "custom";
      } else throw new TypeError("setQuality: \u6587\u5B57\u5217\u304B\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u304C\u5FC5\u8981\u3067\u3059\u3002");
      this.quality.renderScale = clamp(this.quality.renderScale, 0.25, 2);
      this.resize(true);
      this.emit("quality", { level: this.adaptive.level, quality: Object.assign({}, this.quality) });
      return this;
    }
    getQuality() {
      return Object.assign({ name: this.qualityName, adaptiveLevel: this.adaptive.level, adaptiveEnabled: this.adaptive.enabled }, this.quality);
    }
    /** 実行時の設定変更。未知のキーは RangeError。 */
    setOptions(o = {}) {
      this._assertAlive();
      for (const k of Object.keys(o)) {
        switch (k) {
          case "quality":
            this.setQuality(o[k]);
            break;
          case "renderScale":
          case "shadows":
          case "lodBias":
          case "shadowMapSize":
            this.setQuality({ [k]: k === "shadows" ? !!o[k] : o[k] });
            break;
          case "adaptiveQuality": {
            const v = o[k];
            this.adaptive.enabled = typeof v === "object" ? v.enabled !== false : !!v;
            if (typeof v === "object") {
              if (v.targetFps) this.adaptive.targetFps = v.targetFps;
              if (v.minScale) this.adaptive.minScale = v.minScale;
            }
            if (!this.adaptive.enabled) {
              this.adaptive.reset();
              this.resize(true);
            }
            break;
          }
          case "background":
            this.setBackground(o[k]);
            break;
          case "maxPixelRatio":
            this._maxPixelRatio = o[k];
            this.resize(true);
            break;
          case "pauseWhenHidden":
            this._pauseWhenHidden = !!o[k];
            break;
          case "maxFrameDt":
            this._maxFrameDt = o[k];
            break;
          case "jobBudgetMs":
            this._jobBudget = o[k];
            break;
          case "physics":
            if (!this.physics) throw new MassiveEngineError("\u7269\u7406\u304C\u6709\u52B9\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002enablePhysics() \u3092\u5148\u306B\u547C\u3093\u3067\u304F\u3060\u3055\u3044\u3002", "E_NO_PHYSICS");
            this.physics.setOptions(o[k]);
            break;
          default:
            throw new RangeError("setOptions: \u672A\u77E5\u306E\u8A2D\u5B9A " + k);
        }
      }
      return this;
    }
    /* ---------------- 物理 ---------------- */
    /** 物理ワールドを有効化。{worker:true} で Web Worker 上で実行（Worker 非対応ならメインスレッドへフォールバック）。 */
    enablePhysics(options = {}, { worker = false } = {}) {
      this._assertAlive();
      if (this.physics) throw new MassiveEngineError("\u7269\u7406\u306F\u65E2\u306B\u6709\u52B9\u3067\u3059\u3002disablePhysics() \u3092\u5148\u306B\u547C\u3093\u3067\u304F\u3060\u3055\u3044\u3002", "E_PHYSICS_EXISTS");
      const useWorker = worker || options.worker;
      const o = Object.assign({}, options);
      delete o.worker;
      if (useWorker) {
        try {
          this.physics = new PhysicsWorkerClient(o, { onError: (e) => this._reportError(e, "physics-worker"), onWarning: (m) => this._reportError(new Error(m), "physics-warning") });
          return this.physics;
        } catch (e) {
          this._reportError(new MassiveEngineError("\u7269\u7406\u30EF\u30FC\u30AB\u30FC\u3092\u8D77\u52D5\u3067\u304D\u306A\u3044\u305F\u3081\u30E1\u30A4\u30F3\u30B9\u30EC\u30C3\u30C9\u3067\u5B9F\u884C\u3057\u307E\u3059: " + e.message, "E_WORKER_UNAVAILABLE", e), "physics");
        }
      }
      o.onWarning = o.onWarning || ((m) => this.emit("warning", { message: m }));
      this.physics = new PhysicsWorld(o);
      return this.physics;
    }
    /** 1.2: 3D 剛体物理（RigidBodyWorld）。既存の enablePhysics() とは独立に併用できる。固定タイムステップ・Node 同期は自動。 */
    enableRigidBodyPhysics(options = {}) {
      this._assertAlive();
      if (this.rigid) throw new MassiveEngineError("\u525B\u4F53\u7269\u7406\u306F\u65E2\u306B\u6709\u52B9\u3067\u3059\u3002disableRigidBodyPhysics() \u3092\u5148\u306B\u547C\u3093\u3067\u304F\u3060\u3055\u3044\u3002", "E_RIGID_EXISTS");
      const o = Object.assign({}, options);
      o.onWarning = o.onWarning || ((m) => this.emit("warning", { message: m }));
      this.rigid = new RigidBodyWorld(o);
      return this.rigid;
    }
    disableRigidBodyPhysics() {
      if (this.rigid) {
        this.rigid.dispose();
        this.rigid = null;
      }
      return this;
    }
    disablePhysics() {
      if (this.physics) {
        if (this.physics.dispose) this.physics.dispose();
        this.physics = null;
      }
      return this;
    }
    /* ---------------- 1.1 追加機能（opt-in） ---------------- */
    /** 衝突判定ワールド（CollisionWorld）を有効化し、固定タイムステップで自動的に step する。 */
    enableCollision(options = {}) {
      this._assertAlive();
      if (this.collision) throw new MassiveEngineError("\u885D\u7A81\u30EF\u30FC\u30EB\u30C9\u306F\u65E2\u306B\u6709\u52B9\u3067\u3059\u3002", "E_COLLISION_EXISTS");
      const o = Object.assign({}, options), ts = { fixedDt: o.fixedDt, maxSubSteps: o.maxSubSteps, timeScale: o.timeScale };
      delete o.fixedDt;
      delete o.maxSubSteps;
      delete o.timeScale;
      for (const k of Object.keys(ts)) if (ts[k] === void 0) delete ts[k];
      o.onWarning = o.onWarning || ((m) => this.emit("warning", { message: m }));
      this.collision = new CollisionWorld(o);
      this.collisionStep = new FixedTimestep(ts);
      return this.collision;
    }
    disableCollision() {
      if (this.collision) {
        this.collision.dispose();
        this.collision = null;
        this.collisionStep = null;
      }
      return this;
    }
    /** プロファイラを有効化（CPU/更新/描画/GPU(非対応なら unsupported)/ドローコール等を集計）。 */
    enableProfiler(options = {}) {
      this._assertAlive();
      if (!this.profiler) this.profiler = new Profiler(options);
      this.profiler.enabled = true;
      return this.profiler;
    }
    disableProfiler() {
      if (this.profiler) this.profiler.enabled = false;
      return this;
    }
    enableInput(options = {}) {
      this._assertAlive();
      if (!this.inputManager) this.inputManager = new InputManager(Object.assign({ element: this.canvas }, options));
      return this.inputManager;
    }
    enableAudio(options = {}) {
      this._assertAlive();
      if (!this.audio) this.audio = new AudioSystem(options);
      return this.audio;
    }
    /** デバッグ描画（別の 2D オーバーレイ canvas。既定 OFF: debug.enabled = true で表示）。 */
    enableDebugDraw(options = {}) {
      this._assertAlive();
      if (!this.debug) {
        this.debug = new DebugDraw(Object.assign({ canvas: this.canvas, camera: this.camera }, options));
        this.on("afterRender", () => {
          if (this.debug) this.debug.flush();
        });
      }
      return this.debug;
    }
    /** リソースマネージャ（this.assets 互換 + 重複排除・OBJ・マテリアル共有）。初回アクセスで作られる。 */
    get resources() {
      if (!this._resources) this._resources = new ResourceManager();
      return this._resources;
    }
    addAnimator(a) {
      this._animators.push(a);
      return () => {
        const i = this._animators.indexOf(a);
        if (i >= 0) this._animators.splice(i, 1);
      };
    }
    /** update(dt) を持つ任意のシステム（ParticleSystem 等）を毎フレーム更新対象に登録する。 */
    addSystem(sys) {
      if (!sys || typeof sys.update !== "function") throw new TypeError("addSystem: update(dt) \u3092\u6301\u3064\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u304C\u5FC5\u8981\u3067\u3059\u3002");
      this._systems.push(sys);
      return () => {
        const i = this._systems.indexOf(sys);
        if (i >= 0) this._systems.splice(i, 1);
      };
    }
    /* ---------------- シーンの保存・読込 ---------------- */
    saveScene() {
      this._assertAlive();
      const cam = this.camera, c = this.controls;
      const { json, warnings } = serializeScene(this.scene, { camera: { fov: cam.fov, near: cam.near, far: cam.far, position: Array.from(cam.position), controls: c ? { target: Array.from(c.target), distance: c.distance, yaw: c.yaw, pitch: c.pitch } : null } });
      json.engineVersion = VERSION;
      this.lastSaveWarnings = warnings;
      return json;
    }
    saveSceneString(space) {
      return JSON.stringify(this.saveScene(), null, space);
    }
    /** JSON(オブジェクト/文字列)から読み込み。replace(既定 true)なら既存シーンの内容を破棄して置き換える。 */
    loadScene(json, { replace = true, restoreCamera = true } = {}) {
      this._assertAlive();
      const { root, camera } = deserializeScene(json);
      if (replace) {
        for (const ch of this.scene.children.slice()) {
          ch.traverse((n) => {
            if (n.disposeResources) n.disposeResources();
          });
          ch.removeFromParent();
        }
        this._defaultLights = null;
      }
      if (root.background) this.scene.background = root.background;
      for (const ch of root.children.slice()) this.scene.add(ch);
      if (restoreCamera && camera) {
        this.camera.fov = camera.fov;
        this.camera.near = camera.near;
        this.camera.far = camera.far;
        if (this.controls && camera.controls) {
          this.controls.target.set(camera.controls.target);
          this.controls.distance = camera.controls.distance;
          this.controls.yaw = camera.controls.yaw;
          this.controls.pitch = camera.controls.pitch;
          this.controls.update();
        } else this.camera.position.set(camera.position);
      }
      return this;
    }
    /* ---------------- 試作版 API 互換 ---------------- */
    _pf(name) {
      this._assertAlive();
      if (!this.particleField) throw new MassiveEngineError(name + "() \u306F create({count}) \u306E\u4E92\u63DB\u30E2\u30FC\u30C9\u3067\u306E\u307F\u4F7F\u3048\u307E\u3059\u3002", "E_NOT_PARTICLE_MODE");
      return this.particleField;
    }
    setCount(n) {
      this._pf("setCount").setCount(n);
      return this;
    }
    setSpeed(v) {
      this._pf("setSpeed").setSpeed(v);
      return this;
    }
    setGridCellSize(v) {
      this._pf("setGridCellSize").setGridCellSize(v);
      return this;
    }
    reset() {
      this._pf("reset").reset();
      return this;
    }
    get count() {
      return this.particleField ? this.particleField.count : 0;
    }
    get gridCellSize() {
      return this.particleField ? this.particleField.gridCellSize : 0.6;
    }
    get cubeRotation() {
      return this.particleField ? this.particleField.spin : true;
    }
    set cubeRotation(v) {
      if (this.particleField) this.particleField.setSpin(v);
    }
  };

  // src/voxel.js
  var FACES = [
    { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], shade: 0.8 },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], shade: 0.8 },
    { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], shade: 1 },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], shade: 0.5 },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], shade: 0.68 },
    { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], shade: 0.68 }
  ];
  var CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  var fl = Math.floor;
  var VoxelWorld = class {
    constructor(o = {}) {
      this.chunkSize = o.chunkSize || 16;
      if (this.chunkSize < 2 || this.chunkSize > 64) throw new RangeError("VoxelWorld: chunkSize \u306F 2\u301C64\u3002");
      this.palette = (o.palette || []).map((c) => c ? parseColor(c, [1, 1, 1]) : null);
      this.transparent = new Set(o.transparentIds || []);
      this.material = o.material || new Material({ vertexColors: true, specular: 0.05 });
      this.root = new Group(o.name || "VoxelWorld");
      this.parent = o.parent || null;
      if (this.parent) this.parent.add(this.root);
      this.jobs = o.jobs || null;
      this.chunks = /* @__PURE__ */ new Map();
      this.castShadow = o.castShadow !== false;
      this.receiveShadow = o.receiveShadow !== false;
      this.stats = { chunks: 0, meshedChunks: 0, faces: 0, triangles: 0, dirty: 0, rebuilds: 0, lastRebuildMs: 0 };
      this.disposed = false;
    }
    _key(cx, cy, cz) {
      return cx + "," + cy + "," + cz;
    }
    _chunk(cx, cy, cz, create2) {
      const k = this._key(cx, cy, cz);
      let c = this.chunks.get(k);
      if (!c && create2) {
        const cs = this.chunkSize;
        c = { cx, cy, cz, data: new Uint8Array(cs * cs * cs), count: 0, mesh: null, version: 0, queued: false, dirty: false };
        this.chunks.set(k, c);
        this.stats.chunks = this.chunks.size;
      }
      return c || null;
    }
    getBlock(x, y, z) {
      const cs = this.chunkSize, c = this._chunk(fl(x / cs), fl(y / cs), fl(z / cs), false);
      if (!c) return 0;
      return c.data[((y - c.cy * cs) * cs + (z - c.cz * cs)) * cs + (x - c.cx * cs)];
    }
    /** ブロックを設定。範囲 0..255。変更されたチャンク（境界なら隣も）が再構築対象になる。戻り値: 変更があったか */
    setBlock(x, y, z, id) {
      if (this.disposed) throw new MassiveEngineError("VoxelWorld \u306F\u7834\u68C4\u6E08\u307F\u3067\u3059\u3002", "E_DISPOSED");
      if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) throw new TypeError("setBlock: \u5EA7\u6A19\u306F\u6574\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002");
      if (!(id >= 0 && id <= 255) || id !== (id | 0)) throw new RangeError("setBlock: id \u306F 0\u301C255 \u306E\u6574\u6570\u3002");
      const cs = this.chunkSize, c = this._chunk(fl(x / cs), fl(y / cs), fl(z / cs), id !== 0);
      if (!c) return false;
      const lx = x - c.cx * cs, ly = y - c.cy * cs, lz = z - c.cz * cs, i = (ly * cs + lz) * cs + lx, old = c.data[i];
      if (old === id) return false;
      c.data[i] = id;
      c.count += (id !== 0 ? 1 : 0) - (old !== 0 ? 1 : 0);
      this._markDirty(c);
      if (lx === 0) this._markNeighbor(c.cx - 1, c.cy, c.cz);
      if (lx === cs - 1) this._markNeighbor(c.cx + 1, c.cy, c.cz);
      if (ly === 0) this._markNeighbor(c.cx, c.cy - 1, c.cz);
      if (ly === cs - 1) this._markNeighbor(c.cx, c.cy + 1, c.cz);
      if (lz === 0) this._markNeighbor(c.cx, c.cy, c.cz - 1);
      if (lz === cs - 1) this._markNeighbor(c.cx, c.cy, c.cz + 1);
      return true;
    }
    _markNeighbor(cx, cy, cz) {
      const n = this._chunk(cx, cy, cz, false);
      if (n) this._markDirty(n);
    }
    _markDirty(c) {
      c.version++;
      if (!c.dirty) {
        c.dirty = true;
        this.stats.dirty++;
      }
      if (this.jobs && !c.queued) {
        c.queued = true;
        this.jobs.add(() => this._rebuildJob(c), { name: "voxel-chunk" });
      }
    }
    /** fn(x,y,z) -> id で範囲を一括生成（個別の再構築予約を避ける）。 */
    generate(min, max, fn) {
      const saved = this.jobs;
      this.jobs = null;
      for (let x = min[0]; x < max[0]; x++) for (let z = min[2]; z < max[2]; z++) for (let y = min[1]; y < max[1]; y++) {
        const id = fn(x, y, z);
        if (id) this.setBlock(x, y, z, id);
      }
      this.jobs = saved;
      for (const c of this.chunks.values()) if (c.dirty && this.jobs && !c.queued) {
        c.queued = true;
        this.jobs.add(() => this._rebuildJob(c), { name: "voxel-chunk" });
      }
    }
    *_rebuildJob(c) {
      c.queued = false;
      const v = c.version;
      const gen = this._mesh(c);
      for (; ; ) {
        const r = gen.next();
        if (r.done) {
          if (c.version === v) this._apply(c, r.value);
          else if (!c.queued) {
            c.queued = true;
            this.jobs.add(() => this._rebuildJob(c), { name: "voxel-chunk" });
          }
          return;
        }
        yield;
        if (c.version !== v) return;
      }
    }
    /** 同期で全ダーティチャンクを再構築 */
    flush() {
      for (const c of this.chunks.values()) if (c.dirty) this.rebuildChunk(c);
      return this;
    }
    rebuildChunk(c) {
      const g = this._mesh(c);
      let r;
      do {
        r = g.next();
      } while (!r.done);
      this._apply(c, r.value);
    }
    *_mesh(c) {
      const cs = this.chunkSize, pos = [], nor = [], col = [], idx = [], ox = c.cx * cs, oy = c.cy * cs, oz = c.cz * cs;
      let faces = 0;
      if (c.count > 0) for (let y = 0; y < cs; y++) {
        for (let z = 0; z < cs; z++) for (let x = 0; x < cs; x++) {
          const id = c.data[(y * cs + z) * cs + x];
          if (!id) continue;
          const base = this.palette[id] || [0.8, 0.8, 0.8], wx = ox + x, wy = oy + y, wz = oz + z;
          const hv = 0.94 + 0.12 * (((wx * 73856093 ^ wy * 19349663 ^ wz * 83492791) >>> 0) % 100) / 100;
          for (const f of FACES) {
            const nid = this.getBlock(wx + f.n[0], wy + f.n[1], wz + f.n[2]);
            if (nid !== 0 && !(this.transparent.has(nid) && nid !== id)) continue;
            const o = pos.length / 3, sh = f.shade * hv;
            for (const [cu, cv] of CORNERS) {
              pos.push(x + 0.5 + f.n[0] * 0.5 + f.u[0] * 0.5 * cu + f.v[0] * 0.5 * cv, y + 0.5 + f.n[1] * 0.5 + f.u[1] * 0.5 * cu + f.v[1] * 0.5 * cv, z + 0.5 + f.n[2] * 0.5 + f.u[2] * 0.5 * cu + f.v[2] * 0.5 * cv);
              nor.push(f.n[0], f.n[1], f.n[2]);
              col.push(base[0] * sh, base[1] * sh, base[2] * sh);
            }
            idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
            faces++;
          }
        }
        yield;
      }
      return { pos, nor, col, idx, faces };
    }
    _apply(c, r) {
      const old = c.mesh ? c.mesh.geometry.triangleCount / 2 : 0;
      if (r.faces === 0) {
        if (c.mesh) {
          c.mesh.geometry.dispose();
          this.root.remove(c.mesh);
          c.mesh = null;
          this.stats.meshedChunks--;
        }
      } else {
        const geo = new Geometry({ positions: r.pos, normals: r.nor, colors: r.col, indices: r.idx, name: "voxel-chunk" });
        if (c.mesh) {
          c.mesh.geometry.dispose();
          c.mesh.geometry = geo;
        } else {
          const m = new Mesh(geo, this.material, { castShadow: this.castShadow, receiveShadow: this.receiveShadow, static: true, name: "voxel-chunk" });
          const cs = this.chunkSize;
          m.setPosition(c.cx * cs, c.cy * cs, c.cz * cs);
          m.userData.chunk = [c.cx, c.cy, c.cz];
          this.root.add(m);
          c.mesh = m;
          this.stats.meshedChunks++;
        }
      }
      this.stats.faces += r.faces - old;
      this.stats.triangles = this.stats.faces * 2;
      this.stats.rebuilds++;
      if (c.dirty) {
        c.dirty = false;
        this.stats.dirty--;
      }
    }
    /** DDA によるボクセルレイキャスト（描画に依存しない）。{x,y,z,id,normal,distance,point} または null */
    raycast(origin, dir, maxDistance = 64) {
      const l = Math.hypot(dir[0], dir[1], dir[2]);
      if (!(l > 0)) return null;
      const d = [dir[0] / l, dir[1] / l, dir[2] / l];
      let x = fl(origin[0]), y = fl(origin[1]), z = fl(origin[2]);
      const step = [d[0] > 0 ? 1 : -1, d[1] > 0 ? 1 : -1, d[2] > 0 ? 1 : -1];
      const tDelta = d.map((v) => v === 0 ? Infinity : Math.abs(1 / v));
      const next = (k, p) => d[k] === 0 ? Infinity : (d[k] > 0 ? fl(p) + 1 - p : p - fl(p)) * tDelta[k];
      let tMax = [next(0, origin[0]), next(1, origin[1]), next(2, origin[2])], t = 0, normal = [0, 0, 0];
      for (let i = 0; i < 4096; i++) {
        const id = this.getBlock(x, y, z);
        if (id !== 0) return { x, y, z, id, normal, distance: t, point: [origin[0] + d[0] * t, origin[1] + d[1] * t, origin[2] + d[2] * t] };
        const k = tMax[0] < tMax[1] ? tMax[0] < tMax[2] ? 0 : 2 : tMax[1] < tMax[2] ? 1 : 2;
        t = tMax[k];
        if (t > maxDistance) return null;
        tMax[k] += tDelta[k];
        normal = [0, 0, 0];
        normal[k] = -step[k];
        if (k === 0) x += step[0];
        else if (k === 1) y += step[1];
        else z += step[2];
      }
      return null;
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      for (const c of this.chunks.values()) {
        if (c.mesh) c.mesh.geometry.dispose();
      }
      this.chunks.clear();
      this.root.removeFromParent();
      this.stats.chunks = 0;
      this.stats.meshedChunks = 0;
    }
  };

  // src/animation.js
  var c1 = 1.70158;
  var c3 = c1 + 1;
  var c4 = 2 * Math.PI / 3;
  var bounceOut = (x) => {
    const n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  };
  var Easing = {
    linear: (t) => t,
    easeIn: (t) => t * t,
    easeOut: (t) => 1 - (1 - t) * (1 - t),
    easeInOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    cubicIn: (t) => t * t * t,
    cubicOut: (t) => 1 - Math.pow(1 - t, 3),
    cubicInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    sineIn: (t) => 1 - Math.cos(t * Math.PI / 2),
    sineOut: (t) => Math.sin(t * Math.PI / 2),
    sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    expoOut: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    backOut: (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
    bounceOut,
    elasticOut: (t) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1,
    step: (t) => t < 1 ? 0 : 1
  };
  var getEase = (e) => typeof e === "function" ? e : e === void 0 ? Easing.linear : Easing[e] || (() => {
    throw new MassiveEngineError("\u672A\u77E5\u306E easing: " + e, "E_ANIM");
  })();
  var COMP = { position: 3, scale: 3, rotation: 4 };
  var Track = class {
    constructor(path, keys) {
      this.path = path;
      this.comps = COMP[path] || 0;
      if (!Array.isArray(keys) || keys.length === 0) throw new MassiveEngineError("Track: keys \u304C\u7A7A\u3067\u3059\u3002", "E_ANIM");
      const k = keys.slice().sort((a, b) => a.time - b.time);
      if (!this.comps) this.comps = Array.isArray(k[0].value) ? k[0].value.length : 1;
      this.times = new Float64Array(k.length);
      this.values = new Float64Array(k.length * this.comps);
      this.eases = [];
      k.forEach((key, i) => {
        const v = Array.isArray(key.value) || ArrayBuffer.isView(key.value) ? key.value : [key.value];
        if (v.length !== this.comps) throw new MassiveEngineError(`Track(${path}): value \u306F ${this.comps} \u8981\u7D20\u304C\u5FC5\u8981\u3067\u3059\u3002`, "E_ANIM");
        if (!(key.time >= 0) || !isFinite(key.time)) throw new MassiveEngineError("Track: time \u306F 0 \u4EE5\u4E0A\u306E\u6709\u9650\u6570\u3002", "E_ANIM");
        this.times[i] = key.time;
        for (let c = 0; c < this.comps; c++) this.values[i * this.comps + c] = v[c];
        this.eases.push(getEase(key.easing));
      });
      this.end = this.times[k.length - 1];
    }
    /** 時刻 t の値を out（長さ comps）へ。範囲外は端の値。 */
    sample(t, out) {
      const n = this.times.length, C = this.comps, T = this.times, V = this.values;
      if (n === 1 || t <= T[0]) {
        for (let c = 0; c < C; c++) out[c] = V[c];
        return out;
      }
      if (t >= T[n - 1]) {
        for (let c = 0; c < C; c++) out[c] = V[(n - 1) * C + c];
        return out;
      }
      let lo = 0, hi = n - 1;
      while (hi - lo > 1) {
        const m = lo + hi >> 1;
        if (T[m] <= t) lo = m;
        else hi = m;
      }
      const u = this.eases[lo]((t - T[lo]) / (T[hi] - T[lo])), a = lo * C, b = hi * C;
      if (this.path === "rotation") {
        let bx = V[b], by = V[b + 1], bz = V[b + 2], bw = V[b + 3], d = V[a] * bx + V[a + 1] * by + V[a + 2] * bz + V[a + 3] * bw;
        if (d < 0) {
          d = -d;
          bx = -bx;
          by = -by;
          bz = -bz;
          bw = -bw;
        }
        let s0, s1;
        if (1 - d > 1e-6) {
          const om = Math.acos(d > 1 ? 1 : d), so = Math.sin(om);
          s0 = Math.sin((1 - u) * om) / so;
          s1 = Math.sin(u * om) / so;
        } else {
          s0 = 1 - u;
          s1 = u;
        }
        const x = s0 * V[a] + s1 * bx, y = s0 * V[a + 1] + s1 * by, z = s0 * V[a + 2] + s1 * bz, w = s0 * V[a + 3] + s1 * bw, l = Math.hypot(x, y, z, w) || 1;
        out[0] = x / l;
        out[1] = y / l;
        out[2] = z / l;
        out[3] = w / l;
        return out;
      }
      for (let c = 0; c < C; c++) out[c] = V[a + c] + (V[b + c] - V[a + c]) * u;
      return out;
    }
  };
  var AnimationClip = class {
    /** o: { duration(省略時は最後のキー時刻), loop:'repeat'|'once'|'pingpong', tracks:[{path, keys}], events:[{time,name,data}] } */
    constructor(name, o = {}) {
      this.name = name;
      this.loop = o.loop || "repeat";
      if (!["repeat", "once", "pingpong"].includes(this.loop)) throw new MassiveEngineError("loop \u306F 'repeat' | 'once' | 'pingpong'", "E_ANIM");
      this.tracks = (o.tracks || []).map((t) => t instanceof Track ? t : new Track(t.path, t.keys));
      this.duration = o.duration !== void 0 ? o.duration : this.tracks.reduce((m, t) => Math.max(m, t.end), 0);
      if (!(this.duration > 0)) throw new MassiveEngineError("AnimationClip: duration \u306F\u6B63\u306E\u6570\u304C\u5FC5\u8981\u3067\u3059\u3002", "E_ANIM");
      this.events = (o.events || []).map((e) => ({ time: e.time, name: e.name, data: e.data })).sort((a, b) => a.time - b.time);
    }
  };
  var _tmp = new Float64Array(4);
  var Animator = class extends Emitter {
    /** target: Node（position/quaternion/scale と markDirty を持つもの）。null なら values のみ更新。 */
    constructor(target = null) {
      super();
      this.target = target;
      this.clips = /* @__PURE__ */ new Map();
      this.states = /* @__PURE__ */ new Map();
      this.active = [];
      this.values = {};
      this.paused = false;
      this.speed = 1;
      this.currentState = null;
      this._acc = /* @__PURE__ */ new Map();
    }
    addClip(clip) {
      this.clips.set(clip.name, clip);
      return this;
    }
    /** 状態を定義（名前 → クリップ + 再生設定）。 */
    addState(name, clipName, { speed = 1, loop } = {}) {
      if (!this.clips.has(clipName)) throw new MassiveEngineError("\u672A\u767B\u9332\u306E\u30AF\u30EA\u30C3\u30D7: " + clipName, "E_ANIM");
      this.states.set(name, { clip: clipName, speed, loop });
      return this;
    }
    /** 状態へ遷移（fade 秒でクロスフェード）。 */
    go(stateName, { fade = 0.2 } = {}) {
      const s = this.states.get(stateName);
      if (!s) throw new MassiveEngineError("\u672A\u5B9A\u7FA9\u306E\u72B6\u614B: " + stateName, "E_ANIM");
      if (this.currentState === stateName) return this;
      this.currentState = stateName;
      return this.play(s.clip, { fade, speed: s.speed, loop: s.loop, exclusive: true });
    }
    play(clipName, { fade = 0, speed = 1, loop, weight = 1, startTime = 0, exclusive = true } = {}) {
      const clip = this.clips.get(clipName);
      if (!clip) throw new MassiveEngineError("\u672A\u767B\u9332\u306E\u30AF\u30EA\u30C3\u30D7: " + clipName, "E_ANIM");
      if (exclusive) for (const a of this.active) {
        a.fadeOut = fade > 0 ? 1 / fade : Infinity;
      }
      const ex = this.active.find((a) => a.clip === clip && a.fadeOut === 0);
      if (ex) {
        ex.speed = speed;
        return this;
      }
      this.active.push({ clip, time: startTime, dir: 1, speed, loop: loop || clip.loop, weight: fade > 0 ? 0 : weight, target: weight, fadeIn: fade > 0 ? 1 / fade : Infinity, fadeOut: 0, done: false });
      return this;
    }
    stop(clipName) {
      if (!clipName) {
        this.active.length = 0;
        return this;
      }
      this.active = this.active.filter((a) => a.clip.name !== clipName);
      return this;
    }
    pause() {
      this.paused = true;
      return this;
    }
    resume() {
      this.paused = false;
      return this;
    }
    isPlaying(clipName) {
      return this.active.some((a) => a.clip.name === clipName && !a.done);
    }
    getTime(clipName) {
      const a = this.active.find((x) => x.clip.name === clipName);
      return a ? a.time : 0;
    }
    _advance(a, dt) {
      const clip = a.clip, D = clip.duration, prev = a.time;
      let t = prev + dt * a.speed * this.speed * a.dir, wrapped = 0;
      if (a.loop === "repeat") {
        if (t >= D) {
          wrapped = Math.floor(t / D);
          t -= wrapped * D;
        } else if (t < 0) {
          wrapped = -Math.ceil(-t / D);
          t = (t % D + D) % D;
        }
      } else if (a.loop === "once") {
        if (t >= D) {
          t = D;
          a.done = true;
        } else if (t < 0) {
          t = 0;
          a.done = true;
        }
      } else {
        if (t >= D) {
          t = 2 * D - t;
          a.dir = -1;
        } else if (t < 0) {
          t = -t;
          a.dir = 1;
        }
      }
      if (clip.events.length && dt * a.speed * this.speed * a.dir >= 0 && a.loop !== "pingpong") {
        for (const e of clip.events) {
          const hit = wrapped > 0 ? e.time > prev || e.time <= t || wrapped > 1 : e.time > prev && e.time <= t;
          if (hit) this.emit("event", { name: e.name, data: e.data, clip: clip.name, time: e.time });
        }
      } else if (clip.events.length && a.loop === "pingpong") {
        const lo = Math.min(prev, t), hi = Math.max(prev, t);
        for (const e of clip.events) if (e.time > lo && e.time <= hi) this.emit("event", { name: e.name, data: e.data, clip: clip.name, time: e.time });
      }
      if (wrapped !== 0) this.emit("loop", { clip: clip.name, count: Math.abs(wrapped) });
      a.time = t;
      if (a.done) this.emit("finished", { clip: clip.name });
    }
    update(dt) {
      if (this.paused || !(dt > 0)) return this;
      for (const a of this.active) {
        this._advance(a, dt);
        if (a.fadeOut > 0) a.weight = Math.max(0, a.weight - dt * a.fadeOut);
        else if (a.weight < a.target) a.weight = Math.min(a.target, a.weight + dt * a.fadeIn);
      }
      this.active = this.active.filter((a) => !(a.fadeOut > 0 && a.weight <= 0) && !(a.done && a.loop === "once" && a.fadeOut === 0 && false));
      this._apply();
      return this;
    }
    _apply() {
      const acc = this._acc;
      acc.clear();
      for (const a of this.active) {
        const w = a.weight;
        if (!(w > 0)) continue;
        for (const tr of a.clip.tracks) {
          let e = acc.get(tr.path);
          if (!e) {
            e = { w: 0, v: new Float64Array(tr.comps) };
            acc.set(tr.path, e);
          }
          tr.sample(a.time, _tmp);
          if (tr.path === "rotation" && e.w > 0 && e.v[0] * _tmp[0] + e.v[1] * _tmp[1] + e.v[2] * _tmp[2] + e.v[3] * _tmp[3] < 0) for (let c = 0; c < 4; c++) e.v[c] -= w * _tmp[c];
          else for (let c = 0; c < tr.comps; c++) e.v[c] += w * _tmp[c];
          e.w += w;
        }
      }
      const T = this.target;
      for (const [path, e] of acc) {
        const v = e.v, inv = e.w > 0 ? 1 / e.w : 0;
        for (let c = 0; c < v.length; c++) v[c] *= inv;
        if (path === "rotation") {
          const l = Math.hypot(v[0], v[1], v[2], v[3]) || 1;
          if (T) T.setQuaternion(v[0] / l, v[1] / l, v[2] / l, v[3] / l);
        } else if (path === "position") {
          if (T) T.setPosition(v[0], v[1], v[2]);
        } else if (path === "scale") {
          if (T) T.setScale(v[0], v[1], v[2]);
        } else if (path.startsWith("value:")) this.values[path.slice(6)] = v.length === 1 ? v[0] : Array.from(v);
      }
    }
  };

  // src/particles.js
  var ParticleSystem = class {
    constructor(o = {}) {
      const cap = this.capacity = Math.max(1, o.capacity | 0 || 1e3);
      this.gravity = o.gravity === void 0 ? [0, 0, 0] : o.gravity;
      this.drag = o.drag || 0;
      this.baseSize = o.size === void 0 ? 0.1 : o.size;
      this.baseColor = parseColor(o.color === void 0 ? 16777215 : o.color, [1, 1, 1]);
      this.glow = !!o.glow;
      this.sizeOverLife = o.sizeOverLife || "shrink";
      this.count = 0;
      this.overflow = 0;
      this.spawned = 0;
      this.died = 0;
      this.px = new Float32Array(cap);
      this.py = new Float32Array(cap);
      this.pz = new Float32Array(cap);
      this.vx = new Float32Array(cap);
      this.vy = new Float32Array(cap);
      this.vz = new Float32Array(cap);
      this.life = new Float32Array(cap);
      this.maxLife = new Float32Array(cap);
      this.size = new Float32Array(cap);
      this.cr = new Float32Array(cap);
      this.cg = new Float32Array(cap);
      this.cb = new Float32Array(cap);
      this._seed = (o.seed === void 0 ? 12345 : o.seed) >>> 0 || 1;
      const geo = o.geometry || Geometry.sphere(0.5, 6, 4);
      this.material = o.material || new Material({ color: 16777215, unlit: true, transparent: this.glow, opacity: 1, depthWrite: !this.glow, blending: this.glow ? "additive" : "normal" });
      this.mesh = new InstancedMesh(geo, this.material, { capacity: cap, count: 0, frustumCulled: false, dynamic: true, spin: false });
      this.mesh.name = "ParticleSystem";
    }
    _rand() {
      let s = this._seed;
      s ^= s << 13;
      s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      this._seed = s || 1;
      return s / 4294967296;
    }
    /** 粒子を count 個発生させる。返り値は実際に発生できた数。 */
    emit(e = {}) {
      const n = Math.max(0, (e.count === void 0 ? 1 : e.count) | 0), x = e.x || 0, y = e.y || 0, z = e.z || 0;
      const speed = e.speed === void 0 ? 1 : e.speed, spread = e.spread === void 0 ? 1 : e.spread, life = e.life === void 0 ? 1 : e.life, lifeJitter = e.lifeJitter === void 0 ? 0.3 : e.lifeJitter;
      const dir = e.direction || [0, 1, 0], size = e.size === void 0 ? this.baseSize : e.size, col = e.color ? parseColor(e.color, [1, 1, 1]) : this.baseColor, radius = e.radius || 0;
      let made = 0;
      for (let k = 0; k < n; k++) {
        if (this.count >= this.capacity) {
          this.overflow += n - k;
          break;
        }
        const i = this.count++;
        const u = this._rand() * 2 - 1, th = this._rand() * 6.283185307, r = Math.sqrt(1 - u * u), sx = r * Math.cos(th), sy = u, sz = r * Math.sin(th);
        let dx = dir[0] + sx * spread, dy = dir[1] + sy * spread, dz = dir[2] + sz * spread;
        const l = Math.hypot(dx, dy, dz) || 1;
        const sp = speed * (0.6 + 0.8 * this._rand());
        this.vx[i] = dx / l * sp;
        this.vy[i] = dy / l * sp;
        this.vz[i] = dz / l * sp;
        this.px[i] = x + (radius ? sx * radius * this._rand() : 0);
        this.py[i] = y + (radius ? sy * radius * this._rand() : 0);
        this.pz[i] = z + (radius ? sz * radius * this._rand() : 0);
        const lf = life * (1 - lifeJitter + lifeJitter * 2 * this._rand());
        this.life[i] = this.maxLife[i] = Math.max(1e-4, lf);
        this.size[i] = size;
        this.cr[i] = col[0];
        this.cg[i] = col[1];
        this.cb[i] = col[2];
        made++;
      }
      this.spawned += made;
      return made;
    }
    /** 全粒子を 1 回のループで進め、行列/色を InstancedMesh へ書き込む。 */
    update(dt) {
      const g = this.gravity, gx = g[0] * dt, gy = g[1] * dt, gz = g[2] * dt, damp = this.drag > 0 ? Math.max(0, 1 - this.drag * dt) : 1;
      const { px, py, pz, vx, vy, vz, life, maxLife, size, cr, cg, cb } = this;
      const M = this.mesh.matrices, C = this.mesh.colors, glow = this.glow, mode = this.sizeOverLife;
      let n = this.count;
      for (let i = 0; i < n; ) {
        const L = life[i] - dt;
        if (L <= 0) {
          const t2 = --n;
          this.died++;
          if (i !== t2) {
            px[i] = px[t2];
            py[i] = py[t2];
            pz[i] = pz[t2];
            vx[i] = vx[t2];
            vy[i] = vy[t2];
            vz[i] = vz[t2];
            life[i] = life[t2];
            maxLife[i] = maxLife[t2];
            size[i] = size[t2];
            cr[i] = cr[t2];
            cg[i] = cg[t2];
            cb[i] = cb[t2];
          }
          continue;
        }
        life[i] = L;
        vx[i] = (vx[i] + gx) * damp;
        vy[i] = (vy[i] + gy) * damp;
        vz[i] = (vz[i] + gz) * damp;
        const x = px[i] += vx[i] * dt, y = py[i] += vy[i] * dt, z = pz[i] += vz[i] * dt;
        const t = L / maxLife[i];
        const s = size[i] * (mode === "shrink" ? glow ? 0.5 + 0.5 * t : t : mode === "grow" ? 1.5 - 0.5 * t : 1);
        const o = i * 16;
        M[o] = s;
        M[o + 1] = 0;
        M[o + 2] = 0;
        M[o + 3] = 0;
        M[o + 4] = 0;
        M[o + 5] = s;
        M[o + 6] = 0;
        M[o + 7] = 0;
        M[o + 8] = 0;
        M[o + 9] = 0;
        M[o + 10] = s;
        M[o + 11] = 0;
        M[o + 12] = x;
        M[o + 13] = y;
        M[o + 14] = z;
        M[o + 15] = 1;
        const f = glow ? t : 1, c = i * 4;
        C[c] = cr[i] * f;
        C[c + 1] = cg[i] * f;
        C[c + 2] = cb[i] * f;
        C[c + 3] = 0;
        i++;
      }
      const old = this.mesh.count;
      this.count = n;
      if (n > old) this.mesh.count = n, this.mesh.markInstancesDirty(0, n);
      else {
        this.mesh.count = n;
        this.mesh.markInstancesDirty(0, Math.max(n, 1));
      }
      return n;
    }
    clear() {
      this.count = 0;
      this.mesh.count = 0;
      this.mesh.markInstancesDirty(0, 1);
      return this;
    }
    stats() {
      return { alive: this.count, capacity: this.capacity, spawned: this.spawned, died: this.died, overflow: this.overflow };
    }
    dispose() {
      this.mesh.count = 0;
      if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
    }
  };

  // src/rigid/constraints.js
  var _r = new Float64Array(6);
  function setup(world, c) {
    const a = world.alloc.indexOf(c.a), b = world.alloc.indexOf(c.b);
    c.ia = a;
    c.ib = b;
    if (a < 0 || b < 0) return false;
    const R = world.rotm, P = world.pos;
    for (const [s, i, la, out] of [["A", a, c.la, 0], ["B", b, c.lb, 3]]) {
      const r = i * 9;
      _r[out] = R[r] * la[0] + R[r + 3] * la[1] + R[r + 6] * la[2];
      _r[out + 1] = R[r + 1] * la[0] + R[r + 4] * la[1] + R[r + 7] * la[2];
      _r[out + 2] = R[r + 2] * la[0] + R[r + 5] * la[1] + R[r + 8] * la[2];
      void s;
    }
    c.rA = [_r[0], _r[1], _r[2]];
    c.rB = [_r[3], _r[4], _r[5]];
    c.pa = [P[a * 3] + c.rA[0], P[a * 3 + 1] + c.rA[1], P[a * 3 + 2] + c.rA[2]];
    c.pb = [P[b * 3] + c.rB[0], P[b * 3 + 1] + c.rB[1], P[b * 3 + 2] + c.rB[2]];
    return true;
  }
  function relVel(world, c, out) {
    const v = world.vel, w = world.ang, a = c.ia * 3, b = c.ib * 3, [rax, ray, raz] = c.rA, [rbx, rby, rbz] = c.rB;
    out[0] = v[b] + w[b + 1] * rbz - w[b + 2] * rby - v[a] - (w[a + 1] * raz - w[a + 2] * ray);
    out[1] = v[b + 1] + w[b + 2] * rbx - w[b] * rbz - v[a + 1] - (w[a + 2] * rax - w[a] * raz);
    out[2] = v[b + 2] + w[b] * rby - w[b + 1] * rbx - v[a + 2] - (w[a] * ray - w[a + 1] * rax);
  }
  var RA = new Float64Array(3);
  var RB = new Float64Array(3);
  function applyImpulseArr(world, c, x, y, z) {
    RA.set(c.rA);
    RB.set(c.rB);
    applyImpulse(world.vel, world.ang, world.invMass, world.iw, c.ia, c.ib, c.ia * 3, c.ib * 3, c.ia * 9, c.ib * 9, RA, RB, 0, x, y, z);
  }
  var _v3 = [0, 0, 0];
  var DistanceConstraint = class {
    /** @param {{a:number,b:number,anchorA?:number[],anchorB?:number[],length?:number,beta?:number}} o  anchor はローカル座標 */
    constructor(o) {
      this.a = o.a;
      this.b = o.b;
      this.la = o.anchorA || [0, 0, 0];
      this.lb = o.anchorB || [0, 0, 0];
      this.length = o.length;
      this.beta = o.beta === void 0 ? 0.2 : o.beta;
      this.lambda = 0;
    }
    prepare(world, dt) {
      if (!setup(world, this)) return;
      const d = [this.pb[0] - this.pa[0], this.pb[1] - this.pa[1], this.pb[2] - this.pa[2]], len = Math.hypot(d[0], d[1], d[2]) || 1e-9;
      if (this.length === void 0) this.length = len;
      this.n = [d[0] / len, d[1] / len, d[2] / len];
      this.C = len - this.length;
      const n = this.n, [rax, ray, raz] = this.rA, [rbx, rby, rbz] = this.rB;
      const k = world.invMass[this.ia] + world.invMass[this.ib] + angK(world.iw, this.ia * 9, ray * n[2] - raz * n[1], raz * n[0] - rax * n[2], rax * n[1] - ray * n[0]) + angK(world.iw, this.ib * 9, rby * n[2] - rbz * n[1], rbz * n[0] - rbx * n[2], rbx * n[1] - rby * n[0]);
      this.m = k > 0 ? 1 / k : 0;
      this.bias = this.beta * this.C / dt;
      this.lambda = 0;
    }
    solveVelocity(world) {
      if (this.ia < 0 || this.ib < 0) return;
      relVel(world, this, _v3);
      const n = this.n, l = -this.m * (_v3[0] * n[0] + _v3[1] * n[1] + _v3[2] * n[2] + this.bias);
      this.lambda += l;
      applyImpulseArr(world, this, n[0] * l, n[1] * l, n[2] * l);
    }
  };
  var BallSocketConstraint = class {
    constructor(o) {
      this.a = o.a;
      this.b = o.b;
      this.la = o.anchorA || [0, 0, 0];
      this.lb = o.anchorB || [0, 0, 0];
      this.beta = o.beta === void 0 ? 0.2 : o.beta;
    }
    prepare(world, dt) {
      if (!setup(world, this)) return;
      const [ax, ay, az] = this.rA, [bx, by, bz] = this.rB, im = world.invMass[this.ia] + world.invMass[this.ib], A = world.iw, ia = this.ia * 9, ib = this.ib * 9;
      const sk = (x, y, z) => [0, -z, y, z, 0, -x, -y, x, 0], mul = (p, q) => {
        const o = new Array(9);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = p[r * 3] * q[c] + p[r * 3 + 1] * q[3 + c] + p[r * 3 + 2] * q[6 + c];
        return o;
      };
      const SA = sk(ax, ay, az), SB = sk(bx, by, bz), IA = Array.from(A.subarray(ia, ia + 9)), IB = Array.from(A.subarray(ib, ib + 9)), T1 = mul(mul(SA, IA), SA), T2 = mul(mul(SB, IB), SB);
      const K = new Array(9);
      for (let i = 0; i < 9; i++) K[i] = (i % 4 === 0 ? im : 0) - T1[i] - T2[i];
      const det = K[0] * (K[4] * K[8] - K[5] * K[7]) - K[1] * (K[3] * K[8] - K[5] * K[6]) + K[2] * (K[3] * K[7] - K[4] * K[6]);
      const id = Math.abs(det) > 1e-300 ? 1 / det : 0;
      this.Ki = [(K[4] * K[8] - K[5] * K[7]) * id, (K[2] * K[7] - K[1] * K[8]) * id, (K[1] * K[5] - K[2] * K[4]) * id, (K[5] * K[6] - K[3] * K[8]) * id, (K[0] * K[8] - K[2] * K[6]) * id, (K[2] * K[3] - K[0] * K[5]) * id, (K[3] * K[7] - K[4] * K[6]) * id, (K[1] * K[6] - K[0] * K[7]) * id, (K[0] * K[4] - K[1] * K[3]) * id];
      this.bias = [this.beta * (this.pb[0] - this.pa[0]) / dt, this.beta * (this.pb[1] - this.pa[1]) / dt, this.beta * (this.pb[2] - this.pa[2]) / dt];
    }
    solveVelocity(world) {
      if (this.ia < 0 || this.ib < 0 || !this.Ki) return;
      relVel(world, this, _v3);
      const x = _v3[0] + this.bias[0], y = _v3[1] + this.bias[1], z = _v3[2] + this.bias[2], K = this.Ki;
      applyImpulseArr(world, this, -(K[0] * x + K[1] * y + K[2] * z), -(K[3] * x + K[4] * y + K[5] * z), -(K[6] * x + K[7] * y + K[8] * z));
    }
  };

  // src/index.js
  var EXTRA = { CollisionWorld, EVENT_START, EVENT_STAY, EVENT_END, EVENT_TRIGGER_ENTER, EVENT_TRIGGER_STAY, EVENT_TRIGGER_EXIT, COLLIDER_SPHERE: SHAPE_SPHERE2, COLLIDER_AABB: SHAPE_AABB, COLLIDER_OBB: SHAPE_OBB, COLLIDER_CAPSULE: SHAPE_CAPSULE, COLLIDER_PLANE: SHAPE_PLANE, Contact, RayHit, collide, rayShape, sweepSphere, pointDistance, BruteForceBroadphase, SpatialHashBroadphase, TreeBroadphase, DynamicTree, HandleAllocator, HandlePool, FixedTimestep, Interpolator, Profiler, StatWindow, Easing, Track, AnimationClip, Animator, ParticleSystem, InputManager, AudioSystem, ResourceManager, parseOBJ, validateGeometry, mergeGeometries, DebugDraw, RigidBodyWorld, BODY_STATIC, BODY_DYNAMIC, BODY_KINEMATIC, generateManifold, DistanceConstraint, BallSocketConstraint, computeLocalInertia };
  var create = (options) => new Engine(options);
  var API = Object.freeze({
    create,
    Engine,
    isSupported,
    version: VERSION,
    MassiveEngineError,
    Pool,
    JobQueue,
    Emitter,
    mat4,
    quat,
    vec3,
    Geometry,
    Texture,
    Material,
    Node,
    Group,
    Scene,
    Mesh,
    InstancedMesh,
    AmbientLight,
    DirectionalLight,
    PointLight,
    PerspectiveCamera,
    OrthographicCamera,
    createGridHelper,
    OrbitControls,
    PhysicsWorld,
    AssetManager,
    QUALITY_PRESETS,
    Ray,
    raycast,
    rayFromCamera,
    serializeScene,
    deserializeScene,
    VoxelWorld,
    ParticleField,
    ...EXTRA
  });
  var index_default = API;
  return __toCommonJS(index_exports);
})();
