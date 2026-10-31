/* 共通ユーティリティ: イベント、プール、ジョブキュー、統計、Base64 */

let _uid = 1;
export const uid = () => _uid++;
export const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class MassiveEngineError extends Error {
  constructor(message, code, cause) {
    super(message);
    this.name = 'MassiveEngineError';
    this.code = code || 'E_ENGINE';
    if (cause) this.cause = cause;
  }
}

/** 軽量イベントエミッタ。リスナーの例外は握りつぶさず errorHandler へ渡す。 */
export class Emitter {
  constructor() { this._ev = new Map(); this._errorHandler = null; }
  on(type, fn) {
    if (typeof fn !== 'function') throw new TypeError('listener must be a function');
    let a = this._ev.get(type);
    if (!a) this._ev.set(type, (a = []));
    a.push(fn);
    return () => this.off(type, fn);
  }
  once(type, fn) {
    const off = this.on(type, (...args) => { off(); fn(...args); });
    return off;
  }
  off(type, fn) {
    const a = this._ev.get(type);
    if (!a) return this;
    const i = a.indexOf(fn);
    if (i >= 0) a.splice(i, 1);
    return this;
  }
  hasListeners(type) { const a = this._ev.get(type); return !!(a && a.length); }
  emit(type, payload) {
    const a = this._ev.get(type);
    if (!a || !a.length) return false;
    for (const fn of a.slice()) {
      try { fn(payload); } catch (e) {
        if (type !== 'error' && this._errorHandler) this._errorHandler(e, 'listener:' + type);
        else if (typeof console !== 'undefined') console.error('MassiveEngine listener error (' + type + '):', e);
      }
    }
    return true;
  }
  clearListeners() { this._ev.clear(); }
}

/** 汎用オブジェクトプール。create() で生成、reset() で再利用前に初期化。 */
export class Pool {
  constructor(create, reset, max = 4096) {
    this._create = create; this._reset = reset || null; this._free = []; this.max = max;
    this.created = 0; this.reused = 0;
  }
  acquire() {
    if (this._free.length) { this.reused++; const o = this._free.pop(); if (this._reset) this._reset(o); return o; }
    this.created++;
    return this._create();
  }
  release(o) { if (this._free.length < this.max) this._free.push(o); }
  get available() { return this._free.length; }
  clear() { this._free.length = 0; }
}

/**
 * 時間予算つきジョブキュー。フレーム内で budgetMs を超えない範囲でジョブを進める。
 * ジョブは関数（1回実行）またはジェネレータ関数（yield のたびに中断可能）。
 */
export class JobQueue {
  constructor() { this._jobs = []; this.completed = 0; this.failed = 0; this.lastRunMs = 0; }
  get pending() { return this._jobs.length; }
  /** @returns {{cancel():void, done:Promise<void>}} */
  add(job, { priority = 0, name = '' } = {}) {
    let resolve, reject;
    const done = new Promise((res, rej) => { resolve = res; reject = rej; });
    done.catch(() => {});
    const entry = { job, priority, name, iter: null, cancelled: false, resolve, reject };
    this._jobs.push(entry);
    this._jobs.sort((a, b) => b.priority - a.priority);
    return { cancel: () => { entry.cancelled = true; }, done };
  }
  run(budgetMs, onError) {
    const start = now();
    let ran = 0;
    while (this._jobs.length) {
      const e = this._jobs[0];
      if (e.cancelled) { this._jobs.shift(); e.resolve(); continue; }
      try {
        if (!e.iter) {
          const r = e.job();
          if (r && typeof r.next === 'function') e.iter = r;
          else { this._jobs.shift(); this.completed++; e.resolve(r); ran++; if (now() - start >= budgetMs) break; continue; }
        }
        const step = e.iter.next();
        if (step.done) { this._jobs.shift(); this.completed++; e.resolve(step.value); }
      } catch (err) {
        this._jobs.shift(); this.failed++; e.reject(err);
        if (onError) onError(err, 'job:' + e.name);
      }
      ran++;
      if (now() - start >= budgetMs) break;
    }
    this.lastRunMs = now() - start;
    return ran;
  }
  clear() { for (const e of this._jobs) e.resolve(); this._jobs.length = 0; }
}

/** 直近 N サンプルを保持し、平均・パーセンタイルを返すリングバッファ。 */
export class RingStat {
  constructor(size = 240) { this.size = size; this.buf = new Float64Array(size); this.n = 0; this.i = 0; this._tmp = new Float64Array(size); }
  push(v) { this.buf[this.i] = v; this.i = (this.i + 1) % this.size; if (this.n < this.size) this.n++; }
  clear() { this.n = 0; this.i = 0; }
  get last() { return this.n ? this.buf[(this.i - 1 + this.size) % this.size] : 0; }
  mean() { if (!this.n) return 0; let s = 0; for (let k = 0; k < this.n; k++) s += this.buf[k]; return s / this.n; }
  max() { let m = 0; for (let k = 0; k < this.n; k++) if (this.buf[k] > m) m = this.buf[k]; return m; }
  /** p: 0..1。最近傍順位法（n=100 の p=0.95 → 95番目の値）。 */
  percentile(p) {
    if (!this.n) return 0;
    const t = this._tmp.subarray(0, this.n);
    t.set(this.buf.subarray(0, this.n));
    t.sort();
    return t[Math.min(this.n - 1, Math.max(0, Math.ceil(this.n * p) - 1))];
  }
}

export function percentileOf(values, p) {
  if (!values.length) return 0;
  const s = Float64Array.from(values).sort();
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(s.length * p) - 1))];
}

/* Base64 (ブラウザ・Node 両対応) */
export function f32ToBase64(arr) {
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  let s = ''; const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(s);
}
export function base64ToBytes(b64) {
  const s = atob(b64); const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
export const base64ToF32 = b64 => new Float32Array(base64ToBytes(b64).buffer);
export const base64ToU32 = b64 => new Uint32Array(base64ToBytes(b64).buffer);
export const u32ToBase64 = arr => f32ToBase64(arr);

export function parseColor(c, out = [1, 1, 1]) {
  if (Array.isArray(c) || ArrayBuffer.isView(c)) { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return out; }
  if (typeof c === 'number') { out[0] = ((c >> 16) & 255) / 255; out[1] = ((c >> 8) & 255) / 255; out[2] = (c & 255) / 255; return out; }
  if (typeof c === 'string') {
    let h = c.trim();
    if (h[0] === '#') h = h.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (/^[0-9a-fA-F]{6}$/.test(h)) { const n = parseInt(h, 16); return parseColor(n, out); }
  }
  throw new TypeError('Unsupported color: ' + String(c));
}

export function hsl(h, s, l, out = [0, 0, 0]) {
  const f = n => { const k = (n + h * 12) % 12; return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))); };
  out[0] = f(0); out[1] = f(8); out[2] = f(4); return out;
}

/** 決定論的な擬似乱数 (mulberry32) */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hashRandom(i, seed) {
  const v = Math.sin((i + 1) * 127.1 + (seed || 0) * 311.7) * 43758.5453123;
  return v - Math.floor(v);
}
