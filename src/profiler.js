/*
 * プロファイラ: 区間の時間・カウンタ・GPU 時間を、移動窓で集計する（平均・中央値・P95・P99・最大）。
 *
 *   profiler.begin('physics'); ...; profiler.end('physics');   // 同じフレームで複数回呼ぶと合算される
 *   profiler.record('drawCalls', n, { unit: '' });             // 値を直接記録（フレーム内で合算）
 *   profiler.gauge('bodies', n);                               // 合算せず最後の値を採用
 *   profiler.unsupported('gpuMs', 'EXT_disjoint_timer_query_webgl2 が使えない');  // 取得できない指標（値を捏造しない）
 *   profiler.endFrame();                                        // フレーム終了。集計窓へ流し込む
 *   profiler.snapshot() / toCSV() / Profiler.compare(a, b)
 * 取得できない指標は snapshot で supported:false, 値は null になり、CPU の値と混ざらない。
 */
import { now } from './util.js';

export class StatWindow {
  constructor(size = 240) { this.size = size; this.buf = new Float64Array(size); this.n = 0; this.i = 0; this._sorted = new Float64Array(size); this._dirty = true; this.total = 0; }
  push(v) { this.buf[this.i] = v; this.i = (this.i + 1) % this.size; if (this.n < this.size) this.n++; this._dirty = true; this.total++; }
  clear() { this.n = 0; this.i = 0; this._dirty = true; }
  get last() { return this.n ? this.buf[(this.i - 1 + this.size) % this.size] : 0; }
  mean() { if (!this.n) return 0; let s = 0; for (let k = 0; k < this.n; k++) s += this.buf[k]; return s / this.n; }
  max() { let m = -Infinity; for (let k = 0; k < this.n; k++) if (this.buf[k] > m) m = this.buf[k]; return this.n ? m : 0; }
  min() { let m = Infinity; for (let k = 0; k < this.n; k++) if (this.buf[k] < m) m = this.buf[k]; return this.n ? m : 0; }
  _sort() { if (this._dirty) { const t = this._sorted.subarray(0, this.n); t.set(this.buf.subarray(0, this.n)); t.sort(); this._dirty = false; } return this._sorted.subarray(0, this.n); }
  /** p: 0..1。最近傍順位法（n=100, p=0.95 → 95 番目の値）。 */
  percentile(p) { if (!this.n) return 0; const t = this._sort(); return t[Math.min(this.n - 1, Math.max(0, Math.ceil(this.n * p) - 1))]; }
  median() { return this.percentile(0.5); }
  summary() { return { count: this.n, last: this.last, mean: this.mean(), median: this.median(), p95: this.percentile(0.95), p99: this.percentile(0.99), max: this.max(), min: this.min() }; }
}

export class Profiler {
  constructor({ windowSize = 240, enabled = true, historyFrames = 0 } = {}) {
    this.windowSize = windowSize; this.enabled = enabled; this.metrics = new Map(); this.frames = 0; this.historyFrames = historyFrames; this.history = [];
  }
  _m(name, kind, unit) {
    let m = this.metrics.get(name);
    if (!m) { m = { name, kind, unit: unit === undefined ? (kind === 'time' ? 'ms' : '') : unit, win: new StatWindow(this.windowSize), acc: 0, touched: false, t0: 0, open: false, supported: true, reason: '' }; this.metrics.set(name, m); }
    return m;
  }
  begin(name) { if (!this.enabled) return; const m = this._m(name, 'time'); m.t0 = now(); m.open = true; }
  end(name) { if (!this.enabled) return 0; const m = this.metrics.get(name); if (!m || !m.open) return 0; const d = now() - m.t0; m.open = false; m.acc += d; m.touched = true; return d; }
  /** fn の実行時間を name へ記録して戻り値を返す。 */
  scope(name, fn) { this.begin(name); try { return fn(); } finally { this.end(name); } }
  /** 値をフレーム内で合算して記録（時間 ms にもカウントにも使える）。 */
  record(name, value, { unit, kind = 'sum' } = {}) { if (!this.enabled) return; const m = this._m(name, kind === 'sum' ? 'count' : kind, unit); m.acc += value; m.touched = true; }
  /** 合算しない値（最後の値を採用）。 */
  gauge(name, value, { unit } = {}) { if (!this.enabled) return; const m = this._m(name, 'gauge', unit); m.acc = value; m.touched = true; }
  /** 取得できない指標。snapshot で supported:false / 値 null として現れる。 */
  unsupported(name, reason = '') { const m = this._m(name, 'time'); m.supported = false; m.reason = reason; }
  /** フレーム終了: 今フレームで触れた指標を窓へ push して初期化。 */
  endFrame() {
    if (!this.enabled) return; this.frames++;
    for (const m of this.metrics.values()) if (m.supported && m.touched) { m.win.push(m.acc); m.touched = false; if (m.kind !== 'gauge') m.acc = 0; }
    if (this.historyFrames > 0) { const row = { frame: this.frames }; for (const m of this.metrics.values()) if (m.supported) row[m.name] = m.win.last; this.history.push(row); if (this.history.length > this.historyFrames) this.history.shift(); }
  }
  reset() { for (const m of this.metrics.values()) { m.win.clear(); m.acc = 0; m.touched = false; } this.frames = 0; this.history.length = 0; }
  get(name) { const m = this.metrics.get(name); return m ? (m.supported ? m.win.summary() : null) : undefined; }
  /** FPS（フレーム時間 'frame' の平均から）。 */
  get fps() { const m = this.metrics.get('frame'); const mean = m ? m.win.mean() : 0; return mean > 0 ? 1000 / mean : 0; }
  snapshot() {
    const out = {};
    for (const m of this.metrics.values()) out[m.name] = m.supported ? Object.assign({ unit: m.unit, supported: true }, m.win.summary()) : { unit: m.unit, supported: false, reason: m.reason, count: 0, last: null, mean: null, median: null, p95: null, p99: null, max: null, min: null };
    return out;
  }
  /** 集計値の CSV（1 指標 1 行）。 */
  toCSV() {
    const rows = ['metric,unit,supported,count,last,mean,median,p95,p99,max,min'], f = v => v === null ? '' : (Math.round(v * 10000) / 10000);
    for (const [k, s] of Object.entries(this.snapshot())) rows.push([k, s.unit, s.supported, s.count, f(s.last), f(s.mean), f(s.median), f(s.p95), f(s.p99), f(s.max), f(s.min)].join(','));
    return rows.join('\n') + '\n';
  }
  /** historyFrames > 0 のとき、フレームごとの値の CSV。 */
  historyCSV() {
    const keys = []; for (const r of this.history) for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k);
    return [keys.join(','), ...this.history.map(r => keys.map(k => r[k] === undefined ? '' : Math.round(r[k] * 10000) / 10000).join(','))].join('\n') + '\n';
  }
  /** 2 つの snapshot() を比較: 各指標の before/after の中央値・P95 と変化率（after/before）。 */
  static compare(before, after) {
    const out = {};
    for (const k of Object.keys(after)) {
      const a = before[k], b = after[k]; if (!a || !b || !a.supported || !b.supported) continue;
      const r = (x, y) => (x > 0 ? y / x : null);
      out[k] = { unit: b.unit, medianBefore: a.median, medianAfter: b.median, medianRatio: r(a.median, b.median), p95Before: a.p95, p95After: b.p95, p95Ratio: r(a.p95, b.p95) };
    }
    return out;
  }
}
