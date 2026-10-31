import workerSource from './generated/worker-source.js';
import { MassiveEngineError } from './util.js';

/**
 * 物理計算を Web Worker で行うクライアント。メインスレッドは位置配列を受け取って描画に反映する。
 * 1フレーム遅れで結果が反映される（レイテンシと引き換えにメインスレッドの負荷を下げる）。
 * 前のステップが終わっていなければ新しい要求は送らず、経過時間だけ蓄積する（キューの肥大を防ぐ）。
 */
export class PhysicsWorkerClient {
  constructor(options = {}, { onError, onWarning } = {}) {
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') throw new MassiveEngineError('Web Worker が利用できない環境です。', 'E_WORKER_UNAVAILABLE');
    const opts = Object.assign({}, options); delete opts.onContact; delete opts.onWarning;
    const url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
    this.worker = new Worker(url); this._url = url;
    this.count = 0; this.positions = new Float32Array(0); this.stats = {}; this.steps = 0; this.disposed = false; this.isWorker = true;
    this.instanceBindings = []; this.bodyNode = []; this._busy = false; this._pending = 0; this._fresh = false; this._tokens = new Map(); this._token = 1;
    this._onError = onError || null; this._onWarning = onWarning || null; this.stepLatencyMs = 0; this._sentAt = 0;
    this.ready = new Promise((res, rej) => { this._ready = res; this._fail = rej; });
    this.worker.onmessage = e => this._message(e.data);
    this.worker.onerror = e => { const err = new MassiveEngineError('物理ワーカーでエラー: ' + (e.message || 'unknown'), 'E_WORKER'); this._fail(err); if (this._onError) this._onError(err); };
    this.worker.postMessage({ type: 'init', options: opts });
  }
  _message(m) {
    switch (m.type) {
      case 'ready': URL.revokeObjectURL(this._url); this._ready(this); break;
      case 'bodies': { const r = this._tokens.get(m.token); if (r) { this._tokens.delete(m.token); r(m.ids); } break; }
      case 'result': this.positions = m.pos; this.count = m.count; this.stats = m.stats; this.steps = m.steps; this._busy = false; this._fresh = true; this.stepLatencyMs = performance.now() - this._sentAt; break;
      case 'warning': if (this._onWarning) this._onWarning(m.message); break;
      case 'error': { const err = new MassiveEngineError('物理ワーカー: ' + m.message, 'E_WORKER'); this._busy = false; if (this._onError) this._onError(err); break; }
    }
  }
  /** data: {pos,vel,ext (Float32Array x3N), shape (Uint8Array), invMass,rest,fric (Float32Array xN)}。戻り値: Promise<物体ID配列> */
  addBodies(data, count) {
    const token = this._token++;
    return new Promise(res => { this._tokens.set(token, res); this.worker.postMessage({ type: 'addBodies', data, count, token }); });
  }
  call(method, ...args) { this.worker.postMessage({ type: 'call', method, args }); return this; }
  setOptions(o) { return this.call('setOptions', o); }
  bindInstanced(mesh, firstBody, count, instanceStart = 0) { this.instanceBindings.push({ mesh, firstBody, count, instanceStart }); return this; }
  unbindInstanced(mesh) { this.instanceBindings = this.instanceBindings.filter(b => b.mesh !== mesh); }
  /** 毎フレーム呼ぶ: 最新結果を描画オブジェクトへ反映し、必要なら次のステップを要求 */
  update(dt) {
    if (this.disposed) return;
    if (this._fresh) { this._fresh = false; this._apply(); }
    this._pending = Math.min(0.25, this._pending + dt);
    if (!this._busy && this._pending > 0) { this._busy = true; this._sentAt = performance.now(); this.worker.postMessage({ type: 'step', dt: this._pending }); this._pending = 0; }
  }
  _apply() {
    const pos = this.positions;
    for (const b of this.instanceBindings) {
      const m = b.mesh.matrices, n = Math.min(b.count, b.mesh.count - b.instanceStart, this.count - b.firstBody);
      for (let k = 0; k < n; k++) { const j = (b.firstBody + k) * 3, o = (b.instanceStart + k) * 16; m[o + 12] = pos[j]; m[o + 13] = pos[j + 1]; m[o + 14] = pos[j + 2]; }
      if (n > 0) b.mesh.markInstancesDirty(b.instanceStart, b.instanceStart + n);
    }
    for (let i = 0; i < this.bodyNode.length; i++) { const n = this.bodyNode[i]; if (n && i < this.count) { n.position[0] = pos[i * 3]; n.position[1] = pos[i * 3 + 1]; n.position[2] = pos[i * 3 + 2]; n.markDirty(); } }
  }
  syncTransforms() { }
  dispose() { if (this.disposed) return; this.disposed = true; try { this.worker.postMessage({ type: 'dispose' }); } catch (_) { } this.worker.terminate(); try { URL.revokeObjectURL(this._url); } catch (_) { } }
}
