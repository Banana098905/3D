/*! MASSIVE ENGINE v1.0.0 — dependency-free WebGL 2 3D engine. (c) project owner. License: not specified by the author. */
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
    AssetManager: () => AssetManager,
    Camera: () => Camera,
    DirectionalLight: () => DirectionalLight,
    Emitter: () => Emitter,
    Engine: () => Engine,
    Frustum: () => Frustum,
    Geometry: () => Geometry,
    Group: () => Group,
    InstancedMesh: () => InstancedMesh,
    JobQueue: () => JobQueue,
    Light: () => Light,
    MassiveEngineError: () => MassiveEngineError,
    Material: () => Material,
    Mesh: () => Mesh,
    Node: () => Node,
    OrbitControls: () => OrbitControls,
    OrthographicCamera: () => OrthographicCamera,
    ParticleField: () => ParticleField,
    PerspectiveCamera: () => PerspectiveCamera,
    PhysicsWorld: () => PhysicsWorld,
    PointLight: () => PointLight,
    Pool: () => Pool,
    QUALITY_PRESETS: () => QUALITY_PRESETS,
    Ray: () => Ray,
    RingStat: () => RingStat,
    SCENE_FORMAT: () => SCENE_FORMAT,
    SCENE_VERSION: () => SCENE_VERSION,
    SHAPE_BOX: () => SHAPE_BOX,
    SHAPE_SPHERE: () => SHAPE_SPHERE,
    Scene: () => Scene,
    Texture: () => Texture,
    VoxelWorld: () => VoxelWorld,
    create: () => create,
    createGridHelper: () => createGridHelper,
    default: () => index_default,
    deserializeScene: () => deserializeScene,
    isSupported: () => isSupported,
    mat4: () => mat4,
    quat: () => quat,
    rayFromCamera: () => rayFromCamera,
    raycast: () => raycast,
    serializeScene: () => serializeScene,
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
      const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2), s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
      o[0] = s1 * c2 * c3 + c1 * s2 * s3;
      o[1] = c1 * s2 * c3 - s1 * c2 * s3;
      o[2] = c1 * c2 * s3 + s1 * s2 * c3;
      o[3] = c1 * c2 * c3 - s1 * s2 * s3;
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
      while (this.chunks.length < nch) this.chunks.push({ boundsDirty: true, uploadDirty: true, min: new Float64Array(3), max: new Float64Array(3), radius: 0, center: new Float64Array(3) });
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
    _touch(i) {
      const ch = this.chunks[i / this.chunkSize | 0];
      ch.boundsDirty = true;
      ch.uploadDirty = true;
    }
    /** matrices / colors を直接書き換えた範囲 [start,end) を通知する（チャンク境界の再計算とGPU再転送が行われる）。 */
    markInstancesDirty(start = 0, end = this.count) {
      if (end <= start) {
        end = start + 1;
      }
      const a = start / this.chunkSize | 0, b = Math.min(this.chunks.length - 1, Math.max(start, end - 1) / this.chunkSize | 0);
      for (let c = a; c <= b; c++) {
        this.chunks[c].boundsDirty = true;
        this.chunks[c].uploadDirty = true;
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
      this.stats = { drawCalls: 0, triangles: 0, instances: 0, visibleObjects: 0, culledObjects: 0, visibleChunks: 0, culledChunks: 0, shadowDrawCalls: 0, uploadMs: 0, programs: 0, geometries: 0, textures: 0, gpuBytes: 0, shadows: false, gpuMs: null, gpuTimer: false };
      this._init();
    }
    _init() {
      const gl = this.gl;
      this.programs = /* @__PURE__ */ new Map();
      this._bytes = { geo: 0, tex: 0, inst: 0, shadow: 0 };
      this._st = { prog: null, vao: null, depthTest: null, depthWrite: null, blend: null, cull: null, tex0: null, tex1: null };
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
      }
      return cg;
    }
    _uploadChunk(mesh, c, cg) {
      const gl = this.gl, t0 = now(), s = c * mesh.chunkSize, n = Math.min(mesh.chunkSize, mesh.count - s);
      gl.bindBuffer(gl.ARRAY_BUFFER, cg.matBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.matrices, s * 16, n * 16);
      gl.bindBuffer(gl.ARRAY_BUFFER, cg.colBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.colors, s * 4, n * 4);
      mesh.chunks[c].uploadDirty = false;
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
    onWarning: null
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
    syncTransforms() {
      const pos = this.pos;
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
      if (!(dt > 0) || !isFinite(dt)) {
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
  var worker_source_default = '(()=>{var P=()=>typeof performance<"u"&&performance.now?performance.now():Date.now();var L=class extends Error{constructor(t,i,s){super(t),this.name="MassiveEngineError",this.code=i||"E_ENGINE",s&&(this.cause=s)}};function j(E){let t=new Uint8Array(E.buffer,E.byteOffset,E.byteLength),i="",s=32768;for(let e=0;e<t.length;e+=s)i+=String.fromCharCode.apply(null,t.subarray(e,e+s));return btoa(i)}function tt(E){let t=atob(E),i=new Uint8Array(t.length);for(let s=0;s<t.length;s++)i[s]=t.charCodeAt(s);return i}var q=E=>new Float32Array(tt(E).buffer);var T=0,U=1,W=class{constructor(){this.nx=1,this.ny=1,this.nz=1,this.cell=1,this.inv=1,this.ox=0,this.oy=0,this.oz=0,this.planar=!1,this.total=1,this.counts=new Int32Array(1),this.starts=new Int32Array(2),this.cursor=new Int32Array(1),this.items=new Int32Array(0),this.cellOf=new Int32Array(0),this.active=new Int32Array(1),this.activeCount=0,this.itemCount=0}configure(t,i,s,e,n,r,c,h){this.ox=t,this.oy=i,this.oz=s,this.cell=e,this.inv=1/e,this.nx=n,this.ny=h?1:r,this.nz=c,this.planar=h,this.total=this.nx*this.ny*this.nz,this.counts=new Int32Array(this.total),this.starts=new Int32Array(this.total+1),this.cursor=new Int32Array(this.total),this.active=new Int32Array(this.total),this.activeCount=0,this.itemCount=0}ensure(t){this.items.length<t&&(this.items=new Int32Array(t),this.cellOf=new Int32Array(t))}cellIndex(t,i,s){let e=Math.floor((t-this.ox)*this.inv),n=Math.floor((s-this.oz)*this.inv),r=0;return e<0?e=0:e>=this.nx&&(e=this.nx-1),n<0?n=0:n>=this.nz&&(n=this.nz-1),this.planar||(r=Math.floor((i-this.oy)*this.inv),r<0?r=0:r>=this.ny&&(r=this.ny-1)),(r*this.nz+n)*this.nx+e}rebuild(t,i,s){this.ensure(i);let e=this.counts,n=this.cellOf;e.fill(0),this.activeCount=0,this.itemCount=i;for(let l=0;l<i;l++){let a=t[l]*3,u=this.cellIndex(s[a],s[a+1],s[a+2]);n[l]=u,e[u]++}let r=0,c=this.total,h=this.starts,o=this.cursor,d=this.active;for(let l=0;l<c;l++)h[l]=r,o[l]=r,e[l]>0&&(d[this.activeCount++]=l),r+=e[l];h[c]=r;let m=this.items;for(let l=0;l<i;l++)m[o[n[l]]++]=t[l]}query(t,i,s,e,n,r,c){let h=this.inv,o=0,d=Math.floor((t-this.ox)*h),m=Math.floor((e-this.ox)*h),l=Math.floor((s-this.oz)*h),a=Math.floor((r-this.oz)*h),u=0,f=0;this.planar||(u=Math.floor((i-this.oy)*h),f=Math.floor((n-this.oy)*h),u=Math.max(0,u),f=Math.min(this.ny-1,f)),d=Math.max(0,d),m=Math.min(this.nx-1,m),l=Math.max(0,l),a=Math.min(this.nz-1,a),Math.floor((t-this.ox)*h)<0&&(d=0),Math.floor((e-this.ox)*h)>=this.nx&&(m=this.nx-1),Math.floor((s-this.oz)*h)<0&&(l=0),Math.floor((r-this.oz)*h)>=this.nz&&(a=this.nz-1);for(let S=u;S<=f;S++)for(let p=l;p<=a;p++)for(let w=d;w<=m;w++){let C=(S*this.nz+p)*this.nx+w,O=this.starts[C],A=O+this.counts[C];for(let D=O;D<A;D++)c[o++]=this.items[D]}return o}},Y={gravity:[0,-9.8,0],bounds:{min:[-50,-50,-50],max:[50,50,50]},walls:!0,fixedTimeStep:1/60,maxSubSteps:4,stepBudgetMs:0,maxCandidatePairs:2e7,cellSize:0,maxReach:1,planar:!1,iterations:1,maxCells:2097152,restitution:.2,friction:0,boundsRestitution:.3,positionCorrection:.78,slop:.001,damping:0,maxSpeed:100,precomputeNeighbors:!0,timeScale:1,onContact:null,onWarning:null},$=class E{constructor(t={}){let i=this.options=Object.assign({},Y,t);i.gravity=Array.from(i.gravity),i.bounds={min:Array.from(i.bounds.min),max:Array.from(i.bounds.max)};for(let s=0;s<3;s++)if(!(i.bounds.max[s]>i.bounds.min[s]))throw new RangeError("PhysicsWorld: bounds.max \\u306F bounds.min \\u3088\\u308A\\u5927\\u304D\\u3044\\u5FC5\\u8981\\u304C\\u3042\\u308A\\u307E\\u3059\\u3002");if(!(i.fixedTimeStep>0))throw new RangeError("PhysicsWorld: fixedTimeStep \\u306F\\u6B63\\u306E\\u6570\\u304C\\u5FC5\\u8981\\u3067\\u3059\\u3002");this.capacity=0,this.count=0,this.aliveCount=0,this.pos=new Float32Array(0),this.vel=new Float32Array(0),this.ext=new Float32Array(0),this.invMass=new Float32Array(0),this.rest=new Float32Array(0),this.fric=new Float32Array(0),this.shape=new Uint8Array(0),this.alive=new Uint8Array(0),this.free=[],this.bodyNode=[],this.instanceBindings=[],this._ensure(256),this.acc=0,this.time=0,this.droppedTime=0,this.truncatedSteps=0,this.invalidBodies=0,this._listsDirty=!0,this._staticDirty=!0,this._built=!1,this.dynGrid=new W,this.statGrid=new W,this.dynAll=new Int32Array(0),this.nDynAll=0,this.dynSmall=new Int32Array(0),this.nDynSmall=0,this.statSmall=new Int32Array(0),this.nStatSmall=0,this.ovDyn=new Int32Array(0),this.nOvDyn=0,this.ovStat=new Int32Array(0),this.nOvStat=0,this.cell=0,this.reach=1,this.maxSmallHalf=0,this._fwd=new Int32Array(0),this._fwdStarts=null,this._fwdCells=null,this._scratch=new Int32Array(0),this._cand=0,this._overlaps=0,this._truncated=!1,this._mode=0,this._pairs=null,this.stats={bodies:0,staticBodies:0,oversizeBodies:0,substeps:0,stepMs:0,integrateMs:0,gridMs:0,collisionMs:0,candidatePairs:0,overlaps:0,activeCells:0,cells:0,cellSize:0,droppedTime:0,truncated:!1}}_ensure(t){if(t<=this.capacity)return;let i=Math.max(t,this.capacity*2),s=(r,c)=>{let h=new Float32Array(i*c);return h.set(r),h};this.pos=s(this.pos,3),this.vel=s(this.vel,3),this.ext=s(this.ext,3),this.invMass=s(this.invMass,1),this.rest=s(this.rest,1),this.fric=s(this.fric,1);let e=new Uint8Array(i);e.set(this.shape),this.shape=e;let n=new Uint8Array(i);n.set(this.alive),this.alive=n,this.capacity=i}reserve(t){return this._ensure(t),this}setOptions(t){let i=Object.keys(t);for(let s of i){if(!(s in Y))throw new RangeError("PhysicsWorld.setOptions: \\u672A\\u77E5\\u306E\\u30AA\\u30D7\\u30B7\\u30E7\\u30F3 "+s);this.options[s]=s==="gravity"?Array.from(t[s]):s==="bounds"?{min:Array.from(t[s].min),max:Array.from(t[s].max)}:t[s]}return("cellSize"in t||"bounds"in t||"planar"in t||"maxReach"in t||"maxCells"in t||"precomputeNeighbors"in t)&&(this._listsDirty=!0),"bounds"in t&&(this._staticDirty=!0),this}_warn(t){this.options.onWarning&&this.options.onWarning(t)}addBody(t={}){let i=t.shape==="box"?U:T,s,e,n;if(i===T){let m=t.radius===void 0?.5:t.radius;if(!(m>0)||!isFinite(m))throw new RangeError("addBody: radius \\u306F\\u6B63\\u306E\\u6709\\u9650\\u6570\\u304C\\u5FC5\\u8981\\u3067\\u3059\\u3002");s=e=n=m}else{let m=t.halfExtents||(t.size?[t.size[0]/2,t.size[1]/2,t.size[2]/2]:[.5,.5,.5]);if(s=m[0],e=m[1],n=m[2],!(s>0&&e>0&&n>0)||!isFinite(s+e+n))throw new RangeError("addBody: halfExtents/size \\u306F\\u6B63\\u306E\\u6709\\u9650\\u6570\\u304C\\u5FC5\\u8981\\u3067\\u3059\\u3002")}let r=t.position||[0,0,0],c=t.velocity||[0,0,0];if(!isFinite(r[0]+r[1]+r[2]+c[0]+c[1]+c[2]))throw new RangeError("addBody: position/velocity \\u306F\\u6709\\u9650\\u6570\\u304C\\u5FC5\\u8981\\u3067\\u3059\\u3002");let h;this.free.length?h=this.free.pop():(h=this.count++,this._ensure(this.count));let o=h*3;this.pos[o]=r[0],this.pos[o+1]=r[1],this.pos[o+2]=r[2],this.vel[o]=c[0],this.vel[o+1]=c[1],this.vel[o+2]=c[2],this.ext[o]=s,this.ext[o+1]=e,this.ext[o+2]=n,this.shape[h]=i,this.alive[h]=1;let d=t.mass;return d===void 0&&(d=i===T?4/3*Math.PI*s*s*s:8*s*e*n),this.invMass[h]=t.static||!(d>0)||!isFinite(d)?0:1/d,this.rest[h]=t.restitution===void 0?this.options.restitution:t.restitution,this.fric[h]=t.friction===void 0?this.options.friction:t.friction,this.bodyNode[h]=t.node||null,this.aliveCount++,this._listsDirty=!0,this.invMass[h]===0&&(this._staticDirty=!0),h}removeBody(t){this._check(t),this.invMass[t]===0&&(this._staticDirty=!0),this.alive[t]=0,this.free.push(t),this.bodyNode[t]=null,this.aliveCount--,this._listsDirty=!0}_check(t){if(!(t>=0&&t<this.count)||!this.alive[t])throw new RangeError("PhysicsWorld: \\u7121\\u52B9\\u306A\\u7269\\u4F53ID "+t)}isAlive(t){return t>=0&&t<this.count&&this.alive[t]===1}setPosition(t,i,s,e){this._check(t);let n=t*3;return this.pos[n]=i,this.pos[n+1]=s,this.pos[n+2]=e,this.invMass[t]===0&&(this._staticDirty=!0),this}setVelocity(t,i,s,e){this._check(t);let n=t*3;return this.vel[n]=i,this.vel[n+1]=s,this.vel[n+2]=e,this}getPosition(t,i=[0,0,0]){this._check(t);let s=t*3;return i[0]=this.pos[s],i[1]=this.pos[s+1],i[2]=this.pos[s+2],i}getVelocity(t,i=[0,0,0]){this._check(t);let s=t*3;return i[0]=this.vel[s],i[1]=this.vel[s+1],i[2]=this.vel[s+2],i}setMass(t,i){this._check(t);let s=this.invMass[t]===0;return this.invMass[t]=i>0&&isFinite(i)?1/i:0,(s||this.invMass[t]===0)&&(this._staticDirty=!0),this._listsDirty=!0,this}applyImpulse(t,i,s,e){this._check(t);let n=this.invMass[t],r=t*3;return this.vel[r]+=i*n,this.vel[r+1]+=s*n,this.vel[r+2]+=e*n,this}clear(){return this.count=0,this.aliveCount=0,this.free.length=0,this.bodyNode.length=0,this.instanceBindings.length=0,this.alive.fill(0),this.acc=0,this._listsDirty=!0,this._staticDirty=!0,this}bindNode(t,i){return this._check(t),this.bodyNode[t]=i,this}bindInstanced(t,i,s,e=0){return this.instanceBindings.push({mesh:t,firstBody:i,count:s,instanceStart:e}),this}unbindInstanced(t){this.instanceBindings=this.instanceBindings.filter(i=>i.mesh!==t)}syncTransforms(){let t=this.pos;for(let i=0;i<this.count;i++){let s=this.bodyNode[i];if(s&&this.alive[i]){let e=i*3;(s.position[0]!==t[e]||s.position[1]!==t[e+1]||s.position[2]!==t[e+2])&&(s.position[0]=t[e],s.position[1]=t[e+1],s.position[2]=t[e+2],s.markDirty())}}for(let i of this.instanceBindings){let s=i.mesh.matrices,e=Math.min(i.count,i.mesh.count-i.instanceStart);for(let n=0;n<e;n++){let r=(i.firstBody+n)*3,c=(i.instanceStart+n)*16;s[c+12]=t[r],s[c+13]=t[r+1],s[c+14]=t[r+2]}e>0&&i.mesh.markInstancesDirty(i.instanceStart,i.instanceStart+e)}}_maxHalf(t){let i=t*3;return Math.max(this.ext[i],this.ext[i+1],this.ext[i+2])}_rebuildLists(){let t=this.options,i=this.count,s=[];for(let p=0;p<i;p++)this.alive[p]&&s.push(this._maxHalf(p));let e=t.cellSize;e>0||(s.length?(s.sort((p,w)=>p-w),e=2.2*s[Math.min(s.length-1,Math.floor(s.length*.9))]):e=1);let n=t.bounds,r=[n.max[0]-n.min[0],n.max[1]-n.min[1],n.max[2]-n.min[2]],c=p=>[Math.max(1,Math.ceil(r[0]/p)),t.planar?1:Math.max(1,Math.ceil(r[1]/p)),Math.max(1,Math.ceil(r[2]/p))],h=c(e);for(;h[0]*h[1]*h[2]>t.maxCells;)e*=1.25,h=c(e),this._warn("\\u30BB\\u30EB\\u6570\\u304C maxCells \\u3092\\u8D85\\u3048\\u308B\\u305F\\u3081\\u30BB\\u30EB\\u5E45\\u3092 "+e.toFixed(3)+" \\u306B\\u62E1\\u5927\\u3057\\u307E\\u3057\\u305F\\u3002");let o=e*Math.max(1,t.maxReach)/2;this.dynAll.length<i&&(this.dynAll=new Int32Array(this.capacity),this.dynSmall=new Int32Array(this.capacity),this.statSmall=new Int32Array(this.capacity),this.ovDyn=new Int32Array(this.capacity),this.ovStat=new Int32Array(this.capacity),this._scratch=new Int32Array(this.capacity));let d=0,m=0,l=0,a=0,u=0,f=0;for(let p=0;p<i;p++){if(!this.alive[p])continue;let w=this._maxHalf(p),C=this.invMass[p]===0;C||(this.dynAll[d++]=p),w<=o?(w>f&&(f=w),C?this.statSmall[l++]=p:this.dynSmall[m++]=p):C?this.ovStat[u++]=p:this.ovDyn[a++]=p}a+u>256&&!this._warnedOversize&&(this._warnedOversize=!0,this._warn("\\u30BB\\u30EB\\u5E45("+e.toFixed(3)+")\\u306B\\u5BFE\\u3057\\u3066\\u5927\\u304D\\u3059\\u304E\\u308B\\u7269\\u4F53\\u304C "+(a+u)+" \\u500B\\u3042\\u308A\\u3001\\u3053\\u308C\\u3089\\u306F\\u7DCF\\u5F53\\u305F\\u308A(O(k\\xB2))\\u3067\\u51E6\\u7406\\u3055\\u308C\\u307E\\u3059\\u3002cellSize \\u3092\\u7269\\u4F53\\u76F4\\u5F84\\u4EE5\\u4E0A\\uFF08\\u76EE\\u5B89: \\u534A\\u5F84\\u306E2.2\\u500D\\u4EE5\\u4E0A\\uFF09\\u306B\\u3059\\u308B\\u304B\\u3001maxReach \\u3092\\u4E0A\\u3052\\u3066\\u304F\\u3060\\u3055\\u3044\\u3002")),this.nDynAll=d,this.nDynSmall=m,this.nStatSmall=l,this.nOvDyn=a,this.nOvStat=u,this.maxSmallHalf=f,this.reach=Math.max(1,Math.ceil(2*f/e-1e-9));let S=e!==this.cell||this.dynGrid.nx!==h[0]||this.dynGrid.nz!==h[2]||this.dynGrid.planar!==t.planar||this.dynGrid.ny!==(t.planar?1:h[1])||this.dynGrid.ox!==n.min[0];this.cell=e,S&&(this.dynGrid.configure(n.min[0],n.min[1],n.min[2],e,h[0],h[1],h[2],t.planar),this.statGrid.configure(n.min[0],n.min[1],n.min[2],e,h[0],h[1],h[2],t.planar),this._staticDirty=!0,this._buildNeighbors()),this._rebuildFwdOffsets(),this._listsDirty=!1,this._built=!0}_rebuildFwdOffsets(){let t=this.reach,i=this.options.planar,s=[];for(let e=i?0:-t;e<=(i?0:t);e++)for(let n=-t;n<=t;n++)for(let r=-t;r<=t;r++)(e>0||e===0&&(n>0||n===0&&r>0))&&s.push(r,e,n);this._fwd=Int32Array.from(s),this._fwdReach!==t&&(this._fwdReach=t,this._buildNeighbors())}_buildNeighbors(){if(this._fwdStarts=null,this._fwdCells=null,!this.options.precomputeNeighbors||!this._fwd.length)return;let t=this.dynGrid,i=this._fwd.length/3;if(t.total*i>4e6)return;let s=t.nx,e=t.ny,n=t.nz,r=this._fwd,c=new Int32Array(t.total+1),h=0;for(let o=0;o<2;o++){let d=o?new Int32Array(h):null,m=0,l=0;for(let a=0;a<e;a++)for(let u=0;u<n;u++)for(let f=0;f<s;f++,m++){o===0&&(c[m]=h);for(let S=0;S<r.length;S+=3){let p=f+r[S],w=a+r[S+1],C=u+r[S+2];p<0||p>=s||w<0||w>=e||C<0||C>=n||(o?d[l++]=(w*n+C)*s+p:h++)}}o===0?c[t.total]=h:(this._fwdCells=d,this._fwdStarts=c)}}prepareBroadphase(){(this._listsDirty||!this._built)&&this._rebuildLists(),this._staticDirty&&(this.statGrid.rebuild(this.statSmall,this.nStatSmall,this.pos),this._staticDirty=!1),this.dynGrid.rebuild(this.dynSmall,this.nDynSmall,this.pos)}_enumerate(t){let i=this.dynGrid,s=this.statGrid,e=i.counts,n=i.starts,r=i.items,c=this.options.maxCandidatePairs,h=0,o=this._fwdStarts,d=this._fwdCells,m=this._fwd,l=i.nx,a=i.ny,u=i.nz,f=this.reach,S=i.planar;for(let A=0;A<i.activeCount;A++){let D=i.active[A],x=n[D],z=x+e[D];for(let M=x;M<z;M++){let y=r[M];for(let v=M+1;v<z;v++)h++,t(y,r[v])}if(o)for(let M=o[D],y=o[D+1];M<y;M++){let v=d[M],g=n[v],b=g+e[v];if(g!==b)for(let k=x;k<z;k++){let _=r[k];for(let I=g;I<b;I++)h++,t(_,r[I])}}else{let M=D%l,y=D/l|0,v=y%u,g=y/u|0;for(let b=0;b<m.length;b+=3){let k=M+m[b],_=g+m[b+1],I=v+m[b+2];if(k<0||k>=l||_<0||_>=a||I<0||I>=u)continue;let R=(_*u+I)*l+k,B=n[R],F=B+e[R];if(B!==F)for(let N=x;N<z;N++){let H=r[N];for(let G=B;G<F;G++)h++,t(H,r[G])}}}if(h>c){this._truncated=!0,this._cand=h;return}}if(s.itemCount>0){let A=s.counts,D=s.starts,x=s.items;for(let z=0;z<i.activeCount;z++){let M=i.active[z],y=n[M],v=y+e[M],g=M%l,b=M/l|0,k=b%u,_=b/u|0;for(let I=S?0:-f;I<=(S?0:f);I++)for(let R=-f;R<=f;R++)for(let B=-f;B<=f;B++){let F=g+B,N=_+I,H=k+R;if(F<0||F>=l||N<0||N>=a||H<0||H>=u)continue;let G=(N*u+H)*l+F,V=D[G],K=V+A[G];if(V!==K)for(let J=y;J<v;J++){let Q=r[J];for(let X=V;X<K;X++)h++,t(Q,x[X])}}if(h>c){this._truncated=!0,this._cand=h;return}}}let p=this.pos,w=this.ext,C=this._scratch,O=this.maxSmallHalf;for(let A=0;A<this.nOvDyn;A++){let D=this.ovDyn[A],x=D*3,z=p[x]-w[x]-O,M=p[x+1]-w[x+1]-O,y=p[x+2]-w[x+2]-O,v=p[x]+w[x]+O,g=p[x+1]+w[x+1]+O,b=p[x+2]+w[x+2]+O,k=i.query(z,M,y,v,g,b,C);for(let _=0;_<k;_++)h++,t(D,C[_]);k=s.query(z,M,y,v,g,b,C);for(let _=0;_<k;_++)h++,t(D,C[_]);for(let _=A+1;_<this.nOvDyn;_++)h++,t(D,this.ovDyn[_]);for(let _=0;_<this.nOvStat;_++)h++,t(D,this.ovStat[_]);if(h>c){this._truncated=!0,this._cand=h;return}}for(let A=0;A<this.nOvStat;A++){let D=this.ovStat[A],x=D*3,z=i.query(p[x]-w[x]-O,p[x+1]-w[x+1]-O,p[x+2]-w[x+2]-O,p[x]+w[x]+O,p[x+1]+w[x+1]+O,p[x+2]+w[x+2]+O,C);for(let M=0;M<z;M++)h++,t(D,C[M])}this._cand=h}computeCandidatePairs(){this.prepareBroadphase();let t=[];return this._truncated=!1,this._enumerate((i,s)=>t.push(i<s?[i,s]:[s,i])),t}bruteForceOverlaps(){let t=[];for(let i=0;i<this.count;i++)if(this.alive[i])for(let s=i+1;s<this.count;s++)this.alive[s]&&(this.invMass[i]===0&&this.invMass[s]===0||this._contact(i,s)&&t.push([i,s]));return t}_contact(t,i){let s=this.pos,e=this.ext,n=t*3,r=i*3,c=this.shape[t],h=this.shape[i];if(c===T&&h===T){let y=s[r]-s[n],v=s[r+1]-s[n+1],g=s[r+2]-s[n+2],b=e[n]+e[r],k=y*y+v*v+g*g;if(k>=b*b)return!1;let _=Math.sqrt(k);if(_<1e-7){let I=(t*2.399963229728653+i*.017)%(Math.PI*2);this._nx=Math.cos(I),this._ny=0,this._nz=Math.sin(I),this._pen=b}else this._nx=y/_,this._ny=v/_,this._nz=g/_,this._pen=b-_;return!0}if(c===U&&h===U){let y=s[r]-s[n],v=s[r+1]-s[n+1],g=s[r+2]-s[n+2],b=e[n]+e[r]-Math.abs(y),k=e[n+1]+e[r+1]-Math.abs(v),_=e[n+2]+e[r+2]-Math.abs(g);return b<=0||k<=0||_<=0?!1:(this._nx=0,this._ny=0,this._nz=0,b<=k&&b<=_?(this._nx=y<0?-1:1,this._pen=b):k<=_?(this._ny=v<0?-1:1,this._pen=k):(this._nz=g<0?-1:1,this._pen=_),!0)}let o=c===T?n:r,d=c===T?r:n,m=e[o],l=s[o],a=s[o+1],u=s[o+2],f=Math.max(s[d]-e[d],Math.min(l,s[d]+e[d])),S=Math.max(s[d+1]-e[d+1],Math.min(a,s[d+1]+e[d+1])),p=Math.max(s[d+2]-e[d+2],Math.min(u,s[d+2]+e[d+2])),w=l-f,C=a-S,O=u-p,A=w*w+C*C+O*O,D,x,z,M;if(A>0){if(A>=m*m)return!1;let y=Math.sqrt(A);D=w/y,x=C/y,z=O/y,M=m-y}else{let y=l-s[d],v=a-s[d+1],g=u-s[d+2],b=e[d]-Math.abs(y),k=e[d+1]-Math.abs(v),_=e[d+2]-Math.abs(g);D=x=z=0,b<=k&&b<=_?(D=y<0?-1:1,M=m+b):k<=_?(x=v<0?-1:1,M=m+k):(z=g<0?-1:1,M=m+_)}return c===T?(this._nx=-D,this._ny=-x,this._nz=-z):(this._nx=D,this._ny=x,this._nz=z),this._pen=M,!0}_resolve(t,i){if(!this._contact(t,i))return;this._overlaps++;let s=this.options,e=this._nx,n=this._ny,r=this._nz,c=this._pen,h=this.invMass,o=h[t],d=h[i],m=o+d;if(m===0)return;let l=this.pos,a=this.vel,u=t*3,f=i*3,S=Math.max(0,c-s.slop)*s.positionCorrection/m;o>0&&(l[u]-=e*S*o,l[u+1]-=n*S*o,l[u+2]-=r*S*o),d>0&&(l[f]+=e*S*d,l[f+1]+=n*S*d,l[f+2]+=r*S*d);let p=a[f]-a[u],w=a[f+1]-a[u+1],C=a[f+2]-a[u+2],O=p*e+w*n+C*r,A=0;if(O<0){A=-(1+Math.min(this.rest[t],this.rest[i]))*O/m,a[u]-=A*o*e,a[u+1]-=A*o*n,a[u+2]-=A*o*r,a[f]+=A*d*e,a[f+1]+=A*d*n,a[f+2]+=A*d*r;let x=Math.sqrt(this.fric[t]*this.fric[i]);if(x>0){let z=a[f]-a[u],M=a[f+1]-a[u+1],y=a[f+2]-a[u+2],v=z*e+M*n+y*r,g=z-v*e,b=M-v*n,k=y-v*r,_=Math.sqrt(g*g+b*b+k*k);if(_>1e-6){let I=Math.min(_/m,x*A),R=g/_,B=b/_,F=k/_;a[u]+=I*o*R,a[u+1]+=I*o*B,a[u+2]+=I*o*F,a[f]-=I*d*R,a[f+1]-=I*d*B,a[f+2]-=I*d*F}}}s.onContact&&s.onContact(t,i,e,n,r,c)}step(t){let i=P(),s=this.options,e=this.pos,n=this.vel,r=this.ext;(this._listsDirty||!this._built)&&this._rebuildLists();let c=s.gravity,h=c[0]*t,o=c[1]*t,d=c[2]*t,m=s.damping>0?Math.exp(-s.damping*t):1,l=s.maxSpeed*s.maxSpeed,a=s.bounds.min,u=s.bounds.max,f=s.walls,S=s.boundsRestitution,p=0;for(let z=0;z<this.nDynAll;z++){let M=this.dynAll[z],y=M*3,v=(n[y]+h)*m,g=(n[y+1]+o)*m,b=(n[y+2]+d)*m,k=v*v+g*g+b*b;if(k>l){let B=s.maxSpeed/Math.sqrt(k);v*=B,g*=B,b*=B}let _=e[y]+v*t,I=e[y+1]+g*t,R=e[y+2]+b*t;if(!isFinite(_+I+R+v+g+b)){this.alive[M]=0,this.free.push(M),this.aliveCount--,p++;continue}if(f){let B=a[0]+r[y],F=u[0]-r[y];_<B?(_=B,v<0&&(v=-v*S)):_>F&&(_=F,v>0&&(v=-v*S)),B=a[1]+r[y+1],F=u[1]-r[y+1],I<B?(I=B,g<0&&(g=-g*S)):I>F&&(I=F,g>0&&(g=-g*S)),B=a[2]+r[y+2],F=u[2]-r[y+2],R<B?(R=B,b<0&&(b=-b*S)):R>F&&(R=F,b>0&&(b=-b*S))}n[y]=v,n[y+1]=g,n[y+2]=b,e[y]=_,e[y+1]=I,e[y+2]=R}p&&(this.invalidBodies+=p,this._listsDirty=!0,this._warn("\\u975E\\u6709\\u9650\\u5024\\u306B\\u306A\\u3063\\u305F\\u7269\\u4F53\\u3092 "+p+" \\u500B\\u7121\\u52B9\\u5316\\u3057\\u307E\\u3057\\u305F\\u3002"),this._rebuildLists());let w=P();this._staticDirty&&(this.statGrid.rebuild(this.statSmall,this.nStatSmall,e),this._staticDirty=!1),this.dynGrid.rebuild(this.dynSmall,this.nDynSmall,e);let C=P();this._overlaps=0,this._truncated=!1,this._cand=0;let O=this._resolveBound||(this._resolveBound=(z,M)=>this._resolve(z,M)),A=0;for(let z=0;z<Math.max(1,s.iterations)&&(this._enumerate(O),A=this._cand,!this._truncated);z++);if(f)for(let z=0;z<this.nDynAll;z++){let M=this.dynAll[z];if(!this.alive[M])continue;let y=M*3;for(let v=0;v<3;v++){let g=a[v]+r[y+v],b=u[v]-r[y+v];e[y+v]<g?e[y+v]=g:e[y+v]>b&&(e[y+v]=b)}}let D=P();this._truncated&&(this.truncatedSteps++,this._warn("\\u5019\\u88DC\\u30DA\\u30A2\\u6570\\u304C maxCandidatePairs="+s.maxCandidatePairs+" \\u3092\\u8D85\\u3048\\u305F\\u305F\\u3081\\u3001\\u3053\\u306E\\u30B9\\u30C6\\u30C3\\u30D7\\u306E\\u885D\\u7A81\\u51E6\\u7406\\u3092\\u6253\\u3061\\u5207\\u308A\\u307E\\u3057\\u305F\\u3002"));let x=this.stats;return x.integrateMs+=w-i,x.gridMs+=C-w,x.collisionMs+=D-C,x.stepMs+=D-i,x.candidatePairs=A,x.overlaps=this._overlaps,x.activeCells=this.dynGrid.activeCount,x.truncated=this._truncated,this.time+=t,x}advance(t){let i=this.options,s=this.stats;if(s.integrateMs=0,s.gridMs=0,s.collisionMs=0,s.stepMs=0,s.substeps=0,!(t>0)||!isFinite(t))return this._fillStats(),0;this.acc+=t*i.timeScale;let e=i.fixedTimeStep,n=P(),r=0;for(;this.acc>=e&&r<i.maxSubSteps&&(this.step(e),this.acc-=e,r++,!(i.stepBudgetMs>0&&P()-n>i.stepBudgetMs)););return this.acc>=e&&(this.droppedTime+=this.acc,this.acc=0),s.substeps=r,this._fillStats(),r}_fillStats(){let t=this.stats;t.bodies=this.aliveCount,t.oversizeBodies=this.nOvDyn+this.nOvStat,t.staticBodies=this.nStatSmall+this.nOvStat,t.cells=this.dynGrid.total,t.cellSize=this.cell,t.droppedTime=this.droppedTime}raycast(t,i,s=1/0){let e=Math.hypot(i[0],i[1],i[2])||1,n=[i[0]/e,i[1]/e,i[2]/e],r=null;for(let c=0;c<this.count;c++){if(!this.alive[c])continue;let h=c*3,o=-1,d=null;if(this.shape[c]===T){let m=t[0]-this.pos[h],l=t[1]-this.pos[h+1],a=t[2]-this.pos[h+2],u=this.ext[h],f=m*n[0]+l*n[1]+a*n[2],S=m*m+l*l+a*a-u*u,p=f*f-S;if(p>=0){let w=Math.sqrt(p);o=-f-w,o<0&&(o=-f+w),o>=0?d=[(m+n[0]*o)/u,(l+n[1]*o)/u,(a+n[2]*o)/u]:o=-1}}else{let m=0,l=1/0,a=-1,u=0;for(let f=0;f<3;f++){let S=this.pos[h+f]-this.ext[h+f],p=this.pos[h+f]+this.ext[h+f];if(Math.abs(n[f])<1e-14){if(t[f]<S||t[f]>p){l=-1;break}continue}let w=(S-t[f])/n[f],C=(p-t[f])/n[f],O=-1;if(w>C){let A=w;w=C,C=A,O=1}if(w>m&&(m=w,a=f,u=O),C<l&&(l=C),m>l){l=-1;break}}l>=0&&m<=l&&(o=m,d=[0,0,0],a>=0&&(d[a]=u))}o>=0&&o<=s&&(!r||o<r.distance)&&(r={index:c,distance:o,point:[t[0]+n[0]*o,t[1]+n[1]*o,t[2]+n[2]*o],normal:d})}return r}toJSON(){let t=this.count;return{format:"massive-engine-physics",version:1,options:Object.assign({},this.options,{onContact:void 0,onWarning:void 0}),count:t,pos:j(this.pos.subarray(0,t*3)),vel:j(this.vel.subarray(0,t*3)),ext:j(this.ext.subarray(0,t*3)),invMass:j(this.invMass.subarray(0,t)),rest:j(this.rest.subarray(0,t)),fric:j(this.fric.subarray(0,t)),shape:Array.from(this.shape.subarray(0,t)),alive:Array.from(this.alive.subarray(0,t))}}static fromJSON(t){if(!t||t.format!=="massive-engine-physics")throw new L("\\u7269\\u7406JSON\\u306E\\u5F62\\u5F0F\\u304C\\u4E0D\\u6B63\\u3067\\u3059\\u3002","E_SCENE_FORMAT");if(t.version!==1)throw new L("\\u672A\\u5BFE\\u5FDC\\u306E\\u7269\\u7406JSON\\u30D0\\u30FC\\u30B8\\u30E7\\u30F3: "+t.version,"E_SCENE_FORMAT");let i=new E(t.options),s=t.count;i._ensure(s),i.count=s,i.pos.set(q(t.pos)),i.vel.set(q(t.vel)),i.ext.set(q(t.ext)),i.invMass.set(q(t.invMass)),i.rest.set(q(t.rest)),i.fric.set(q(t.fric)),i.shape.set(t.shape),i.alive.set(t.alive),i.aliveCount=0;for(let e=0;e<s;e++)i.alive[e]?i.aliveCount++:i.free.push(e);return i}};function Z(E){let t=null,i=new Set(["setPosition","setVelocity","setMass","removeBody","setOptions","applyImpulse","clear"]);return{get world(){return t},handle(s){try{switch(s.type){case"init":t=new $(Object.assign({},s.options,{onContact:null,onWarning:e=>E({type:"warning",message:e})})),E({type:"ready"});break;case"addBodies":{if(!t)throw new Error("worker: init \\u304C\\u5148\\u306B\\u5FC5\\u8981\\u3067\\u3059\\u3002");let e=s.data,n=[];for(let r=0;r<s.count;r++){let c=r*3,h=e.shape[r]===U,o=t.addBody({shape:h?"box":"sphere",radius:e.ext[c],halfExtents:[e.ext[c],e.ext[c+1],e.ext[c+2]],position:[e.pos[c],e.pos[c+1],e.pos[c+2]],velocity:[e.vel[c],e.vel[c+1],e.vel[c+2]],mass:e.invMass[r]>0?1/e.invMass[r]:0,static:e.invMass[r]===0,restitution:e.rest[r],friction:e.fric[r]});n.push(o)}E({type:"bodies",ids:n,token:s.token});break}case"call":if(!t)throw new Error("worker: init \\u304C\\u5148\\u306B\\u5FC5\\u8981\\u3067\\u3059\\u3002");if(!i.has(s.method))throw new Error("worker: \\u8A31\\u53EF\\u3055\\u308C\\u3066\\u3044\\u306A\\u3044\\u30E1\\u30BD\\u30C3\\u30C9 "+s.method);t[s.method](...s.args);break;case"step":{if(!t)throw new Error("worker: init \\u304C\\u5148\\u306B\\u5FC5\\u8981\\u3067\\u3059\\u3002");let e=t.advance(s.dt),n=t.count,r=new Float32Array(n*3);r.set(t.pos.subarray(0,n*3)),E({type:"result",pos:r,count:n,steps:e,stats:Object.assign({},t.stats)},[r.buffer]);break}case"dispose":t=null;break;default:throw new Error("worker: \\u672A\\u77E5\\u306E\\u30E1\\u30C3\\u30BB\\u30FC\\u30B8 "+s.type)}}catch(e){E({type:"error",message:String(e&&e.message||e)})}}}}var st=Z((E,t)=>self.postMessage(E,t||[]));self.onmessage=E=>st.handle(E.data);})();\n';

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

  // src/engine.js
  var VERSION = "1.0.0";
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
      this.emit("update", { dt, time: this._time });
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
        jobsPending: this.jobs.pending
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
    disablePhysics() {
      if (this.physics) {
        if (this.physics.dispose) this.physics.dispose();
        this.physics = null;
      }
      return this;
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

  // src/index.js
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
    ParticleField
  });
  var index_default = API;
  return __toCommonJS(index_exports);
})();
