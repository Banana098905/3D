import { RingStat } from './util.js';

export const QUALITY_PRESETS = {
  low: { renderScale: 0.6, shadows: false, shadowMapSize: 1024, lodBias: 2 },
  medium: { renderScale: 0.8, shadows: true, shadowMapSize: 1024, lodBias: 1.25 },
  high: { renderScale: 1, shadows: true, shadowMapSize: 2048, lodBias: 1 },
  ultra: { renderScale: 1, shadows: true, shadowMapSize: 4096, lodBias: 0.8 }
};

/** 品質を下げる段階（level 0 = 設定そのまま）。scale は renderScale への倍率、shadow は影解像度の倍率(0=影なし)。 */
export const ADAPTIVE_STEPS = [
  { scale: 1, shadow: 1, lod: 1 }, { scale: 0.9, shadow: 1, lod: 1 }, { scale: 0.8, shadow: 1, lod: 1 }, { scale: 0.8, shadow: 0.5, lod: 1 },
  { scale: 0.7, shadow: 0.5, lod: 1.5 }, { scale: 0.7, shadow: 0, lod: 1.5 }, { scale: 0.6, shadow: 0, lod: 2 }, { scale: 0.5, shadow: 0, lod: 3 }
];

/**
 * フレーム時間に応じて動的解像度・影品質・LOD距離を調整する。
 * 注意: ブラウザのフレーム間隔は垂直同期の上限(例 60Hz→16.7ms)で頭打ちになる。
 * 品質を戻す判断には CPU 時間（と取得できれば GPU 時間）の余裕を使うため、GPU 負荷は完全には検知できない。
 */
export class AdaptiveQuality {
  constructor(o = {}) {
    this.enabled = o.enabled !== false; this.targetFps = o.targetFps || 60; this.minScale = o.minScale || 0.5;
    this.level = 0; this.maxLevel = ADAPTIVE_STEPS.length - 1; this.frames = new RingStat(30); this.cpu = new RingStat(30); this.gpu = new RingStat(30);
    this.lastChange = -1e9; this.upCooldown = o.upCooldownMs || 4000; this._lastUp = -1e9; this._since = 0; this.changes = 0;
  }
  get step() { return ADAPTIVE_STEPS[this.level]; }
  reset() { this.level = 0; this.frames.clear(); this.cpu.clear(); this.gpu.clear(); this._since = 0; }
  /** @returns {boolean} レベルが変わったか */
  tick(frameMs, cpuMs, gpuMs, nowMs) {
    if (!this.enabled) return false;
    this.frames.push(frameMs); this.cpu.push(cpuMs); if (gpuMs != null) this.gpu.push(gpuMs);
    if (++this._since < 15 || this.frames.n < 30) return false; this._since = 0;
    const target = 1000 / this.targetFps, avg = this.frames.mean();
    if (avg > target * 1.15 && this.level < this.maxLevel && nowMs - this.lastChange > 1000) {
      if (nowMs - this._lastUp < 6000) this.upCooldown = Math.min(30000, this.upCooldown * 2); // 上げ下げの振動を抑える
      this.level++; this.lastChange = nowMs; this.changes++; this.frames.clear(); return true;
    }
    const gpuOk = this.gpu.n === 0 || this.gpu.mean() < target * 0.7;
    if (avg < target * 1.08 && this.cpu.mean() < target * 0.6 && gpuOk && this.level > 0 && nowMs - this.lastChange > this.upCooldown) {
      this.level--; this.lastChange = nowMs; this._lastUp = nowMs; this.changes++; this.frames.clear(); return true;
    }
    return false;
  }
}
