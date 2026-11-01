/*
 * アニメーション: キーフレーム・イージング・クリップ・状態（クロスフェード）・イベント。
 *
 *   const clip = new AnimationClip('bob', { duration: 2, loop: 'repeat', tracks: [
 *     { path: 'position', keys: [{ time: 0, value: [0,0,0] }, { time: 1, value: [0,1,0], easing: 'easeInOut' }, { time: 2, value: [0,0,0] }] },
 *     { path: 'rotation', keys: [{ time: 0, value: [0,0,0,1] }, { time: 2, value: [0,0.7071,0,0.7071] }] }     // クォータニオン(x,y,z,w) は球面補間
 *   ], events: [{ time: 1, name: 'peak' }] });
 *   const anim = new Animator(node); anim.addClip(clip); anim.play('bob'); anim.on('event', e => ...);
 *   毎フレーム anim.update(dt)  （engine.addAnimator(anim) なら自動）
 *
 * path: 'position' | 'scale'（3 要素）、'rotation'（4 要素・クォータニオン）、'value:<名前>'（任意個数の数値。animator.values[名前] に出る）。
 * easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'cubicIn/Out/InOut' | 'sineIn/Out/InOut' | 'expoOut' | 'backOut' | 'bounceOut' | 'elasticOut' | 'step' | 関数(0..1→0..1)。
 *         各キーの easing は「そのキーから次のキーまでの区間」に適用される。
 */
import { Emitter, MassiveEngineError } from './util.js';

const c1 = 1.70158, c3 = c1 + 1, c4 = (2 * Math.PI) / 3;
const bounceOut = x => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
export const Easing = {
  linear: t => t, easeIn: t => t * t, easeOut: t => 1 - (1 - t) * (1 - t), easeInOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  cubicIn: t => t * t * t, cubicOut: t => 1 - Math.pow(1 - t, 3), cubicInOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  sineIn: t => 1 - Math.cos(t * Math.PI / 2), sineOut: t => Math.sin(t * Math.PI / 2), sineInOut: t => -(Math.cos(Math.PI * t) - 1) / 2,
  expoOut: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t), backOut: t => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
  bounceOut, elasticOut: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1, step: t => (t < 1 ? 0 : 1)
};
const getEase = e => (typeof e === 'function' ? e : e === undefined ? Easing.linear : (Easing[e] || (() => { throw new MassiveEngineError('未知の easing: ' + e, 'E_ANIM'); })()));
const COMP = { position: 3, scale: 3, rotation: 4 };

export class Track {
  constructor(path, keys) {
    this.path = path; this.comps = COMP[path] || 0;
    if (!Array.isArray(keys) || keys.length === 0) throw new MassiveEngineError('Track: keys が空です。', 'E_ANIM');
    const k = keys.slice().sort((a, b) => a.time - b.time); if (!this.comps) this.comps = (Array.isArray(k[0].value) ? k[0].value.length : 1);
    this.times = new Float64Array(k.length); this.values = new Float64Array(k.length * this.comps); this.eases = [];
    k.forEach((key, i) => {
      const v = Array.isArray(key.value) || ArrayBuffer.isView(key.value) ? key.value : [key.value];
      if (v.length !== this.comps) throw new MassiveEngineError(`Track(${path}): value は ${this.comps} 要素が必要です。`, 'E_ANIM');
      if (!(key.time >= 0) || !isFinite(key.time)) throw new MassiveEngineError('Track: time は 0 以上の有限数。', 'E_ANIM');
      this.times[i] = key.time; for (let c = 0; c < this.comps; c++) this.values[i * this.comps + c] = v[c]; this.eases.push(getEase(key.easing));
    });
    this.end = this.times[k.length - 1];
  }
  /** 時刻 t の値を out（長さ comps）へ。範囲外は端の値。 */
  sample(t, out) {
    const n = this.times.length, C = this.comps, T = this.times, V = this.values;
    if (n === 1 || t <= T[0]) { for (let c = 0; c < C; c++) out[c] = V[c]; return out; }
    if (t >= T[n - 1]) { for (let c = 0; c < C; c++) out[c] = V[(n - 1) * C + c]; return out; }
    let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
    const u = this.eases[lo]((t - T[lo]) / (T[hi] - T[lo])), a = lo * C, b = hi * C;
    if (this.path === 'rotation') { // 最短経路の球面補間
      let bx = V[b], by = V[b + 1], bz = V[b + 2], bw = V[b + 3], d = V[a] * bx + V[a + 1] * by + V[a + 2] * bz + V[a + 3] * bw; if (d < 0) { d = -d; bx = -bx; by = -by; bz = -bz; bw = -bw; }
      let s0, s1; if (1 - d > 1e-6) { const om = Math.acos(d > 1 ? 1 : d), so = Math.sin(om); s0 = Math.sin((1 - u) * om) / so; s1 = Math.sin(u * om) / so; } else { s0 = 1 - u; s1 = u; }
      const x = s0 * V[a] + s1 * bx, y = s0 * V[a + 1] + s1 * by, z = s0 * V[a + 2] + s1 * bz, w = s0 * V[a + 3] + s1 * bw, l = Math.hypot(x, y, z, w) || 1; out[0] = x / l; out[1] = y / l; out[2] = z / l; out[3] = w / l; return out;
    }
    for (let c = 0; c < C; c++) out[c] = V[a + c] + (V[b + c] - V[a + c]) * u; return out;
  }
}

export class AnimationClip {
  /** o: { duration(省略時は最後のキー時刻), loop:'repeat'|'once'|'pingpong', tracks:[{path, keys}], events:[{time,name,data}] } */
  constructor(name, o = {}) {
    this.name = name; this.loop = o.loop || 'repeat'; if (!['repeat', 'once', 'pingpong'].includes(this.loop)) throw new MassiveEngineError("loop は 'repeat' | 'once' | 'pingpong'", 'E_ANIM');
    this.tracks = (o.tracks || []).map(t => t instanceof Track ? t : new Track(t.path, t.keys));
    this.duration = o.duration !== undefined ? o.duration : this.tracks.reduce((m, t) => Math.max(m, t.end), 0);
    if (!(this.duration > 0)) throw new MassiveEngineError('AnimationClip: duration は正の数が必要です。', 'E_ANIM');
    this.events = (o.events || []).map(e => ({ time: e.time, name: e.name, data: e.data })).sort((a, b) => a.time - b.time);
  }
}

const _tmp = new Float64Array(4);
export class Animator extends Emitter {
  /** target: Node（position/quaternion/scale と markDirty を持つもの）。null なら values のみ更新。 */
  constructor(target = null) {
    super(); this.target = target; this.clips = new Map(); this.states = new Map(); this.active = []; this.values = {}; this.paused = false; this.speed = 1; this.currentState = null;
    this._acc = new Map();
  }
  addClip(clip) { this.clips.set(clip.name, clip); return this; }
  /** 状態を定義（名前 → クリップ + 再生設定）。 */
  addState(name, clipName, { speed = 1, loop } = {}) { if (!this.clips.has(clipName)) throw new MassiveEngineError('未登録のクリップ: ' + clipName, 'E_ANIM'); this.states.set(name, { clip: clipName, speed, loop }); return this; }
  /** 状態へ遷移（fade 秒でクロスフェード）。 */
  go(stateName, { fade = 0.2 } = {}) { const s = this.states.get(stateName); if (!s) throw new MassiveEngineError('未定義の状態: ' + stateName, 'E_ANIM'); if (this.currentState === stateName) return this; this.currentState = stateName; return this.play(s.clip, { fade, speed: s.speed, loop: s.loop, exclusive: true }); }
  play(clipName, { fade = 0, speed = 1, loop, weight = 1, startTime = 0, exclusive = true } = {}) {
    const clip = this.clips.get(clipName); if (!clip) throw new MassiveEngineError('未登録のクリップ: ' + clipName, 'E_ANIM');
    if (exclusive) for (const a of this.active) { a.fadeOut = fade > 0 ? 1 / fade : Infinity; }
    const ex = this.active.find(a => a.clip === clip && a.fadeOut === 0); if (ex) { ex.speed = speed; return this; }
    this.active.push({ clip, time: startTime, dir: 1, speed, loop: loop || clip.loop, weight: fade > 0 ? 0 : weight, target: weight, fadeIn: fade > 0 ? 1 / fade : Infinity, fadeOut: 0, done: false });
    return this;
  }
  stop(clipName) { if (!clipName) { this.active.length = 0; return this; } this.active = this.active.filter(a => a.clip.name !== clipName); return this; }
  pause() { this.paused = true; return this; } resume() { this.paused = false; return this; }
  isPlaying(clipName) { return this.active.some(a => a.clip.name === clipName && !a.done); }
  getTime(clipName) { const a = this.active.find(x => x.clip.name === clipName); return a ? a.time : 0; }
  _advance(a, dt) {
    const clip = a.clip, D = clip.duration, prev = a.time; let t = prev + dt * a.speed * this.speed * a.dir, wrapped = 0;
    if (a.loop === 'repeat') { if (t >= D) { wrapped = Math.floor(t / D); t -= wrapped * D; } else if (t < 0) { wrapped = -Math.ceil(-t / D); t = ((t % D) + D) % D; } }
    else if (a.loop === 'once') { if (t >= D) { t = D; a.done = true; } else if (t < 0) { t = 0; a.done = true; } }
    else { if (t >= D) { t = 2 * D - t; a.dir = -1; } else if (t < 0) { t = -t; a.dir = 1; } }
    // イベント: (prev, t] を通過した（ループなら末尾→先頭をまたぐ）ものを発火
    if (clip.events.length && dt * a.speed * this.speed * a.dir >= 0 && a.loop !== 'pingpong') {
      for (const e of clip.events) { const hit = wrapped > 0 ? (e.time > prev || e.time <= t || wrapped > 1) : (e.time > prev && e.time <= t); if (hit) this.emit('event', { name: e.name, data: e.data, clip: clip.name, time: e.time }); }
    } else if (clip.events.length && a.loop === 'pingpong') { const lo = Math.min(prev, t), hi = Math.max(prev, t); for (const e of clip.events) if (e.time > lo && e.time <= hi) this.emit('event', { name: e.name, data: e.data, clip: clip.name, time: e.time }); }
    if (wrapped !== 0) this.emit('loop', { clip: clip.name, count: Math.abs(wrapped) });
    a.time = t; if (a.done) this.emit('finished', { clip: clip.name });
  }
  update(dt) {
    if (this.paused || !(dt > 0)) return this;
    for (const a of this.active) {
      this._advance(a, dt);
      if (a.fadeOut > 0) a.weight = Math.max(0, a.weight - dt * a.fadeOut); else if (a.weight < a.target) a.weight = Math.min(a.target, a.weight + dt * a.fadeIn);
    }
    this.active = this.active.filter(a => !(a.fadeOut > 0 && a.weight <= 0) && !(a.done && a.loop === 'once' && a.fadeOut === 0 && false));
    this._apply(); return this;
  }
  _apply() {
    const acc = this._acc; acc.clear();
    for (const a of this.active) {
      const w = a.weight; if (!(w > 0)) continue;
      for (const tr of a.clip.tracks) {
        let e = acc.get(tr.path); if (!e) { e = { w: 0, v: new Float64Array(tr.comps) }; acc.set(tr.path, e); }
        tr.sample(a.time, _tmp);
        if (tr.path === 'rotation' && e.w > 0 && (e.v[0] * _tmp[0] + e.v[1] * _tmp[1] + e.v[2] * _tmp[2] + e.v[3] * _tmp[3]) < 0) for (let c = 0; c < 4; c++) e.v[c] -= w * _tmp[c]; else for (let c = 0; c < tr.comps; c++) e.v[c] += w * _tmp[c];
        e.w += w;
      }
    }
    const T = this.target;
    for (const [path, e] of acc) {
      const v = e.v, inv = e.w > 0 ? 1 / e.w : 0; for (let c = 0; c < v.length; c++) v[c] *= inv;
      if (path === 'rotation') { const l = Math.hypot(v[0], v[1], v[2], v[3]) || 1; if (T) T.setQuaternion(v[0] / l, v[1] / l, v[2] / l, v[3] / l); }
      else if (path === 'position') { if (T) T.setPosition(v[0], v[1], v[2]); }
      else if (path === 'scale') { if (T) T.setScale(v[0], v[1], v[2]); }
      else if (path.startsWith('value:')) this.values[path.slice(6)] = v.length === 1 ? v[0] : Array.from(v);
    }
  }
}
