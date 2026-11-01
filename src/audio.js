/*
 * 音声: WebAudio による効果音(SFX)・BGM・音量・3D 定位・一時停止。
 *
 *   const audio = new AudioSystem();                 // AudioContext は最初のユーザー操作後に audio.unlock()
 *   await audio.load('hit', 'sfx/hit.ogg');          // 同じ名前/URL は二重ロードしない（in-flight 共有）
 *   audio.play('hit', { volume: .8, position: [x,y,z] });   // 3D: PannerNode（距離減衰）
 *   audio.playMusic('bgm', { loop: true, fade: 1 });
 *   audio.setVolume('master' | 'sfx' | 'music', 0.5);  audio.pause() / resume()   // context.suspend / resume
 *   audio.setListener(position, forward, up);
 * 環境（ブラウザ以外）では AudioContext が無いので supported:false となり、全メソッドは安全な no-op（例外を出さない）。
 * テスト用に contextFactory で偽の AudioContext を注入できる。
 */
export class AudioSystem {
  constructor({ contextFactory = null, maxVoices = 64 } = {}) {
    this.ctx = null; this.supported = false; this.buffers = new Map(); this._loading = new Map(); this.maxVoices = maxVoices;
    this.voices = new Set(); this.music = null; this.volumes = { master: 1, sfx: 1, music: 1 }; this.stolen = 0; this.played = 0; this.dropped = 0;
    try {
      const make = contextFactory || (typeof AudioContext !== 'undefined' ? () => new AudioContext() : (typeof webkitAudioContext !== 'undefined' ? () => new webkitAudioContext() : null));
      if (make) { this.ctx = make(); this.supported = true; this._buildGraph(); }
    } catch (_) { this.ctx = null; this.supported = false; }
  }
  _buildGraph() {
    const c = this.ctx; this.master = c.createGain(); this.sfxBus = c.createGain(); this.musicBus = c.createGain();
    this.sfxBus.connect(this.master); this.musicBus.connect(this.master); this.master.connect(c.destination);
  }
  /** ブラウザの自動再生制限の解除（ユーザー操作のイベントハンドラ内で呼ぶ）。 */
  unlock() { if (this.ctx && this.ctx.state === 'suspended' && !this._paused) return this.ctx.resume(); return Promise.resolve(); }
  setVolume(bus, v) {
    if (!(bus in this.volumes)) throw new RangeError('bus は master / sfx / music'); v = Math.max(0, +v || 0); this.volumes[bus] = v;
    if (this.ctx) { const g = bus === 'master' ? this.master : bus === 'sfx' ? this.sfxBus : this.musicBus; g.gain.value = v; }
    return this;
  }
  /** 取得済みバッファを登録する（decodeAudioData 済み）。 */
  add(name, buffer) { this.buffers.set(name, buffer); return this; }
  load(name, url) {
    if (this.buffers.has(name)) return Promise.resolve(this.buffers.get(name));
    if (this._loading.has(name)) return this._loading.get(name);
    if (!this.supported) return Promise.resolve(null);
    const p = fetch(url).then(r => { if (!r.ok) throw new Error('音声の読み込み失敗 ' + r.status + ': ' + url); return r.arrayBuffer(); })
      .then(ab => this.ctx.decodeAudioData(ab)).then(buf => { this.buffers.set(name, buf); this._loading.delete(name); return buf; })
      .catch(e => { this._loading.delete(name); throw e; });
    this._loading.set(name, p); return p;
  }
  has(name) { return this.buffers.has(name); }
  _start(name, o, bus) {
    if (!this.supported) return null; const buf = this.buffers.get(name); if (!buf) return null;
    if (this.voices.size >= this.maxVoices) { // 同時発音上限: 最古の声を止める
      const oldest = this.voices.values().next().value; this._stopVoice(oldest); this.stolen++;
    }
    const c = this.ctx, src = c.createBufferSource(); src.buffer = buf; src.loop = !!o.loop; if (o.rate) src.playbackRate.value = o.rate;
    const g = c.createGain(); g.gain.value = o.volume === undefined ? 1 : o.volume; let node = g, panner = null;
    src.connect(g);
    if (o.position && c.createPanner) {
      panner = c.createPanner(); panner.panningModel = 'HRTF'; panner.distanceModel = 'inverse'; panner.refDistance = o.refDistance || 1; panner.maxDistance = o.maxDistance || 100; panner.rolloffFactor = o.rolloff === undefined ? 1 : o.rolloff;
      this._setPos(panner, o.position); g.connect(panner); node = panner;
    }
    node.connect(bus);
    const v = { src, gain: g, panner, name }; this.voices.add(v);
    src.onended = () => { this.voices.delete(v); };
    src.start(0, o.offset || 0); this.played++; return v;
  }
  _setPos(p, pos) { if (p.positionX) { p.positionX.value = pos[0]; p.positionY.value = pos[1]; p.positionZ.value = pos[2]; } else if (p.setPosition) p.setPosition(pos[0], pos[1], pos[2]); }
  _stopVoice(v) { try { v.src.stop(); } catch (_) {} v.src.onended = null; this.voices.delete(v); }
  play(name, o = {}) { return this._start(name, o, this.sfxBus); }
  stop(voice) { if (voice) this._stopVoice(voice); return this; }
  playMusic(name, { loop = true, volume = 1, fade = 0 } = {}) {
    if (!this.supported) return null; this.stopMusic(0);
    const v = this._start(name, { loop, volume: fade > 0 ? 0 : volume }, this.musicBus); if (!v) return null; this.music = v;
    if (fade > 0) { const t = this.ctx.currentTime; v.gain.gain.setValueAtTime(0, t); v.gain.gain.linearRampToValueAtTime(volume, t + fade); }
    return v;
  }
  stopMusic(fade = 0) {
    const v = this.music; if (!v) return this; this.music = null;
    if (fade > 0 && this.supported) { const t = this.ctx.currentTime; v.gain.gain.setValueAtTime(v.gain.gain.value, t); v.gain.gain.linearRampToValueAtTime(0, t + fade); try { v.src.stop(t + fade); } catch (_) {} }
    else this._stopVoice(v);
    return this;
  }
  setPosition(voice, pos) { if (voice && voice.panner) this._setPos(voice.panner, pos); return this; }
  setListener(pos, fwd = [0, 0, -1], up = [0, 1, 0]) {
    if (!this.supported) return this; const l = this.ctx.listener;
    if (l.positionX) { l.positionX.value = pos[0]; l.positionY.value = pos[1]; l.positionZ.value = pos[2]; l.forwardX.value = fwd[0]; l.forwardY.value = fwd[1]; l.forwardZ.value = fwd[2]; l.upX.value = up[0]; l.upY.value = up[1]; l.upZ.value = up[2]; }
    else { if (l.setPosition) l.setPosition(pos[0], pos[1], pos[2]); if (l.setOrientation) l.setOrientation(fwd[0], fwd[1], fwd[2], up[0], up[1], up[2]); }
    return this;
  }
  /** 全体を一時停止（ゲームのポーズ）。再生位置は保たれる。 */
  pause() { this._paused = true; return this.ctx && this.ctx.suspend ? this.ctx.suspend() : Promise.resolve(); }
  resume() { this._paused = false; return this.ctx && this.ctx.resume ? this.ctx.resume() : Promise.resolve(); }
  get paused() { return !!this._paused; }
  stats() { return { supported: this.supported, voices: this.voices.size, buffers: this.buffers.size, played: this.played, stolen: this.stolen, state: this.ctx ? this.ctx.state : 'unsupported' }; }
  dispose() { for (const v of Array.from(this.voices)) this._stopVoice(v); this.music = null; if (this.ctx && this.ctx.close) this.ctx.close().catch(() => {}); this.ctx = null; this.supported = false; this.buffers.clear(); }
}
