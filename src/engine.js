import { Emitter, JobQueue, RingStat, MassiveEngineError, now, clamp, parseColor } from './util.js';
import { vec3 } from './math.js';
import { Geometry } from './geometry.js';
import { Material } from './material.js';
import { Scene, Mesh, PerspectiveCamera, AmbientLight, DirectionalLight, createGridHelper } from './node.js';
import { OrbitControls } from './controls.js';
import { WebGL2Renderer } from './renderer.js';
import { PhysicsWorld } from './physics.js';
import { PhysicsWorkerClient } from './physics-worker-client.js';
import { AssetManager } from './assets.js';
import { AdaptiveQuality, ADAPTIVE_STEPS, QUALITY_PRESETS } from './quality.js';
import { raycast, rayFromCamera } from './raycast.js';
import { serializeScene, deserializeScene } from './scene-io.js';
import { ParticleField } from './presets.js';
import { CollisionWorld } from './collision/index.js';
import { FixedTimestep } from './timestep.js';
import { Profiler } from './profiler.js';
import { InputManager } from './input.js';
import { AudioSystem } from './audio.js';
import { ResourceManager } from './resources.js';
import { DebugDraw } from './debug.js';
import { RigidBodyWorld } from './rigid/world.js';

export const VERSION = '1.2.0';
const LIVE = new WeakMap(); // canvas -> 使用中のエンジン（同一キャンバスの二重利用を防ぐ）
const EASE = { linear: t => t, easeIn: t => t * t, easeOut: t => 1 - (1 - t) * (1 - t), easeInOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 };

/** WebGL 2 が使えるか。キャンバスを汚さないよう一時キャンバスで判定する。 */
export function isSupported() {
  try {
    if (typeof document === 'undefined') return false;
    const c = document.createElement('canvas'), gl = c.getContext('webgl2');
    if (!gl) return false;
    const e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); return true;
  } catch (_) { return false; }
}

export class Engine extends Emitter {
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
    if (!canvas || typeof canvas.getContext !== 'function' || String(canvas.tagName).toLowerCase() !== 'canvas') throw new TypeError('MassiveEngine requires options.canvas to be an HTML canvas element.');
    const prior = LIVE.get(canvas);
    if (prior && !prior.disposed) throw new MassiveEngineError('このキャンバスは別の MassiveEngine インスタンスが使用中です。先に dispose() するか、別のキャンバスを使ってください。', 'E_CANVAS_IN_USE');
    this.canvas = canvas; this.disposed = false; this.running = false; this._contextLost = false; this._resumeAfterHidden = false; this._resumeAfterLost = false;
    this._errorHandler = (e, src) => this._reportError(e, src);
    this._onStats = typeof o.onStats === 'function' ? o.onStats : null;
    if (typeof o.onError === 'function') this.on('error', o.onError);
    this.renderer = new WebGL2Renderer(canvas, { antialias: o.antialias !== false, powerPreference: o.powerPreference, preserveDrawingBuffer: !!o.preserveDrawingBuffer });
    LIVE.set(canvas, this);
    this.gl = this.renderer.gl;
    this.scene = new Scene(); if (o.background) this.setBackground(o.background);
    this.camera = new PerspectiveCamera(o.fov || 50, 0.1, 5000); this.camera.setPosition(8, 6, 10);
    this.controls = null;
    if (o.controls !== false) { this.controls = new OrbitControls(this.camera, Object.assign({ distance: 14, yaw: 0.68, pitch: 0.45 }, typeof o.controls === 'object' ? o.controls : {})); this.controls.attach(canvas); }
    else this.camera.lookAt(0, 0, 0);
    this.assets = new AssetManager(); this.jobs = new JobQueue(); this.physics = null; this.particleField = null;
    // 1.1 追加（すべて opt-in。有効化するまで既存の挙動・コストは変わらない）
    this.rigid = null; this.collision = null; this.collisionStep = null; this.profiler = null; this.inputManager = null; this.audio = null; this.debug = null; this._resources = null; this._animators = []; this._systems = [];
    this._updates = []; this._tweens = []; this._time = 0; this._lastStamp = 0; this._raf = 0;
    this.input = { keys: new Set(), pointer: { x: 0, y: 0, down: false }, isKeyDown: c => this.input.keys.has(c) };
    // 品質
    this._maxPixelRatio = o.maxPixelRatio === undefined ? 2 : o.maxPixelRatio;
    const preset = QUALITY_PRESETS[o.quality || 'high']; if (!preset) throw new RangeError('quality は ' + Object.keys(QUALITY_PRESETS).join(' / ') + ' のいずれか。');
    this.quality = Object.assign({}, preset); this.qualityName = o.quality || 'high';
    if (o.renderScale !== undefined) this.quality.renderScale = clamp(o.renderScale, 0.25, 2);
    if (o.shadows !== undefined) this.quality.shadows = !!o.shadows;
    if (o.lodBias !== undefined) this.quality.lodBias = o.lodBias;
    this.adaptive = new AdaptiveQuality(typeof o.adaptiveQuality === 'object' ? o.adaptiveQuality : { enabled: !!o.adaptiveQuality });
    this.adaptive.enabled = !!o.adaptiveQuality;
    // 統計
    this._maxFrameDt = o.maxFrameDt || 0.05; this._jobBudget = o.jobBudgetMs === undefined ? 3 : o.jobBudgetMs; this._pauseWhenHidden = o.pauseWhenHidden !== false;
    this._frameStat = new RingStat(240); this._cpuStat = new RingStat(240); this._updStat = new RingStat(240); this._rndStat = new RingStat(240);
    this._fpsFrames = 0; this._fpsStart = 0; this._fps = 0; this._frameMs = 0; this._cpuMs = 0; this._updateMs = 0; this._renderMs = 0; this._frameCount = 0; this._initMs = 0;
    this.stats = {};
    if (o.defaultLights !== false) this.addDefaultLights();
    this._bind();
    this.resize();
    if (o.physics) this.enablePhysics(o.physics === true ? {} : o.physics);
    if (Number.isFinite(o.count)) { this.particleField = new ParticleField(this, o); this.addDefaultLights(); }
    this._initMs = now() - tStart;
    if (o.autoStart !== false) this.start();
  }

  /* ---------------- イベント配線 ---------------- */
  _bind() {
    const c = this.canvas, o = this.options, h = this._h = {};
    h.resize = () => this.resize();
    if (o.autoResize !== false) {
      if (typeof ResizeObserver !== 'undefined') { this._ro = new ResizeObserver(h.resize); this._ro.observe(c); } else window.addEventListener('resize', h.resize);
    }
    h.vis = () => {
      if (!this._pauseWhenHidden || this.disposed) return;
      if (document.hidden) { this._resumeAfterHidden = this.running; this._halt(); }
      else if (this._resumeAfterHidden && !this._contextLost) { this._resumeAfterHidden = false; this.start(); }
    };
    document.addEventListener('visibilitychange', h.vis);
    h.lost = e => {
      e.preventDefault(); this._contextLost = true; this._resumeAfterLost = this.running || this._resumeAfterLost; this._halt();
      this.renderer.handleContextLost();
      this.emit('contextlost', {}); this.emit('error', new MassiveEngineError('WebGL コンテキストが失われました。復帰すると自動で再開します。', 'E_CONTEXT_LOST'));
    };
    h.restored = () => {
      try { this.renderer.handleContextRestored(); this._contextLost = false; this.resize(); this.emit('contextrestored', {}); if (this._resumeAfterLost) { this._resumeAfterLost = false; this.start(); } }
      catch (e) { this._reportError(e, 'contextrestored'); }
    };
    c.addEventListener('webglcontextlost', h.lost, false); c.addEventListener('webglcontextrestored', h.restored, false);
    const payload = (type, e) => { const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; return { type, x, y, ndc: [x / Math.max(1, r.width) * 2 - 1, -(y / Math.max(1, r.height) * 2 - 1)], button: e.button, buttons: e.buttons, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, pointerId: e.pointerId, pointerType: e.pointerType, originalEvent: e }; };
    let down = null;
    h.pd = e => { const p = payload('pointerdown', e); this.input.pointer.down = true; this.input.pointer.x = p.x; this.input.pointer.y = p.y; down = { x: e.clientX, y: e.clientY, t: now(), button: e.button, id: e.pointerId }; this.emit('pointerdown', p); };
    h.pm = e => { const p = payload('pointermove', e); this.input.pointer.x = p.x; this.input.pointer.y = p.y; this.emit('pointermove', p); };
    h.pu = e => { const p = payload('pointerup', e); this.input.pointer.down = false; this.emit('pointerup', p); if (down && down.id === e.pointerId && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5 && now() - down.t < 600) this.emit('click', Object.assign(payload('click', e), { button: down.button })); down = null; };
    h.wh = e => this.emit('wheel', payload('wheel', e));
    c.addEventListener('pointerdown', h.pd); c.addEventListener('pointermove', h.pm); c.addEventListener('pointerup', h.pu); c.addEventListener('pointercancel', h.pu); c.addEventListener('wheel', h.wh, { passive: true });
    if (o.keyboard !== false) {
      const skip = e => { const t = e.target, n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT' || (t && t.isContentEditable); };
      h.kd = e => { if (skip(e)) return; this.input.keys.add(e.code); this.emit('keydown', { type: 'keydown', code: e.code, key: e.key, originalEvent: e }); };
      h.ku = e => { this.input.keys.delete(e.code); this.emit('keyup', { type: 'keyup', code: e.code, key: e.key, originalEvent: e }); };
      h.blur = () => this.input.keys.clear();
      window.addEventListener('keydown', h.kd); window.addEventListener('keyup', h.ku); window.addEventListener('blur', h.blur);
    }
  }
  _unbind() {
    const c = this.canvas, h = this._h; if (this._ro) { this._ro.disconnect(); this._ro = null; }
    window.removeEventListener('resize', h.resize); document.removeEventListener('visibilitychange', h.vis);
    c.removeEventListener('webglcontextlost', h.lost, false); c.removeEventListener('webglcontextrestored', h.restored, false);
    c.removeEventListener('pointerdown', h.pd); c.removeEventListener('pointermove', h.pm); c.removeEventListener('pointerup', h.pu); c.removeEventListener('pointercancel', h.pu); c.removeEventListener('wheel', h.wh);
    if (h.kd) { window.removeEventListener('keydown', h.kd); window.removeEventListener('keyup', h.ku); window.removeEventListener('blur', h.blur); }
  }
  _reportError(e, source) {
    const err = e instanceof Error ? e : new Error(String(e)); if (source && !err.source) err.source = source;
    if (!this.emit('error', err) && typeof console !== 'undefined') console.error('MassiveEngine error' + (source ? ' [' + source + ']' : '') + ':', err);
  }
  _assertAlive() { if (this.disposed) throw new MassiveEngineError('MassiveEngine インスタンスは破棄済みです。', 'E_DISPOSED'); }

  /* ---------------- ライフサイクル ---------------- */
  get isRunning() { return this.running; }
  start() {
    this._assertAlive();
    if (this._contextLost) throw new MassiveEngineError('WebGL コンテキストが利用できません。復帰を待つか、dispose() して再作成してください。', 'E_CONTEXT_LOST');
    if (this.running) return this;
    if (this._pauseWhenHidden && typeof document !== 'undefined' && document.hidden) { this._resumeAfterHidden = true; return this; }
    this.running = true; this._lastStamp = 0; this._fpsStart = now(); this._fpsFrames = 0;
    this._raf = requestAnimationFrame(t => this._tick(t)); this.emit('start', {}); return this;
  }
  resume() { return this.start(); }
  _halt() { this.running = false; if (this._raf) cancelAnimationFrame(this._raf); this._raf = 0; }
  stop() { if (this.disposed) return this; const was = this.running; this._resumeAfterHidden = false; this._resumeAfterLost = false; this._halt(); if (was) this.emit('stop', {}); return this; }
  dispose() {
    if (this.disposed) return;
    this.stop(); this.disposed = true; this.emit('dispose', {});
    this._unbind(); if (this.controls) this.controls.dispose();
    if (this.particleField) this.particleField.dispose();
    if (this.physics) this.physics.dispose ? this.physics.dispose() : 0;
    this.physics = null; if (this.rigid) { this.rigid.dispose(); this.rigid = null; } if (this.collision) { this.collision.dispose(); this.collision = null; } if (this.inputManager) this.inputManager.dispose(); if (this.audio) this.audio.dispose(); if (this.debug) { this.debug.dispose(); this.debug = null; } if (this._resources) this._resources.dispose(); this._animators.length = 0; this._systems.length = 0;
    this.assets.dispose(); this.jobs.clear(); this._updates.length = 0; this._tweens.length = 0;
    this.renderer.dispose(); if (LIVE.get(this.canvas) === this) LIVE.delete(this.canvas);
    this.clearListeners(); this._onStats = null;
  }

  /* ---------------- ループ ---------------- */
  _tick(stamp) {
    if (!this.running || this.disposed || this._contextLost) return;
    const t0 = now(); let fatal = false;
    try {
      const ts = Number.isFinite(stamp) ? stamp : t0, raw = this._lastStamp ? Math.max(0, (ts - this._lastStamp) / 1000) : 1 / 60;
      const dt = Math.min(raw, this._maxFrameDt); this._lastStamp = ts; this._frameMs = raw * 1000; this._fpsFrames++;
      if (ts - this._fpsStart >= 500) { this._fps = this._fpsFrames * 1000 / (ts - this._fpsStart); this._fpsFrames = 0; this._fpsStart = ts; }
      this._step(dt);
      const tu = now(); this._updateMs = tu - t0;
      try { this._renderFrame(); } catch (e) { fatal = true; throw e; }
      const t1 = now(); this._renderMs = t1 - tu; this._cpuMs = t1 - t0; this._frameCount++;
      if (this._frameCount > 2) { this._frameStat.push(this._frameMs); this._cpuStat.push(this._cpuMs); this._updStat.push(this._updateMs); this._rndStat.push(this._renderMs); }
      if (this.adaptive.enabled && this._frameCount > 10 && this.adaptive.tick(this._frameMs, this._cpuMs, this.renderer.stats.gpuMs, t1)) { this._applyAdaptive(); }
      if (this.profiler) this._profileFrame(t0, tu, t1);
      this._publishStats();
      if (this._onStats) { try { this._onStats(this.stats); } catch (e) { this._reportError(new Error('onStats callback failed: ' + (e && e.message ? e.message : e)), 'onStats'); } }
    } catch (e) {
      if (fatal || !this.running) { this._halt(); this._reportError(e, 'render'); return; }
      this._reportError(e, 'update');
    }
    if (this.running && !this.disposed && !this._contextLost) this._raf = requestAnimationFrame(t => this._tick(t));
  }
  _step(dt) {
    this._time += dt;
    if (this._jobBudget > 0 && this.jobs.pending) this.jobs.run(this._jobBudget, (e, s) => this._reportError(e, s));
    for (const fn of this._updates.slice()) { try { fn(dt, this._time); } catch (err) { this._reportError(err, 'update-callback'); } }
    this._runTweens(dt);
    if (this.physics) {
      if (this.physics.isWorker) this.physics.update(dt); else { this.physics.advance(dt); this.physics.syncTransforms(); }
    }
    if (this.rigid) { const r = this.rigid, p = this.profiler; if (p) p.begin('rigid'); r.advance(dt); r.syncTransforms(); if (p) { p.end('rigid'); const s = r.stats; p.gauge('rigidBodies', s.bodies); p.gauge('rigidActive', s.activeBodies); p.gauge('rigidContacts', s.contactPoints); p.gauge('rigidSolverMs', s.solverMs, { unit: 'ms' }); } }
    if (this.collision) this._stepCollision(dt);
    if (this._animators.length) for (const a of this._animators) a.update(dt);
    if (this._systems.length) for (const sys of this._systems) sys.update(dt);
    this.emit('update', { dt, time: this._time });
  }
  _stepCollision(dt) {
    const prof = this.profiler; if (prof) prof.begin('collision');
    this.collisionStep.update(dt, fdt => this.collision.step(fdt));
    if (prof) { prof.end('collision'); const s = this.collision.stats; prof.gauge('collisionPairs', s.candidatePairs || 0); prof.gauge('collisionContacts', s.contacts || 0); }
  }
  _profileFrame(t0, tu, t1) {
    const p = this.profiler, r = this.renderer.stats; p.record('frame', this._frameMs, { unit: 'ms', kind: 'time' }); p.record('cpu', t1 - t0, { unit: 'ms', kind: 'time' });
    p.record('update', tu - t0, { unit: 'ms', kind: 'time' }); p.record('render', t1 - tu, { unit: 'ms', kind: 'time' });
    if (r.gpuTimer) p.record('gpu', r.gpuMs, { unit: 'ms', kind: 'time' }); else p.unsupported('gpu', 'EXT_disjoint_timer_query_webgl2 が使えない環境のため GPU 時間は計測できません');
    p.gauge('drawCalls', r.drawCalls); p.gauge('triangles', r.triangles); p.gauge('instances', r.instances); p.gauge('uploadBytes', r.uploadBytes);
    if (this.physics && this.physics.stats) p.gauge('physicsStepMs', this.physics.stats.stepMs || 0, { unit: 'ms' });
    const heap = (typeof performance !== 'undefined' && performance.memory) ? performance.memory.usedJSHeapSize / 1048576 : null;
    if (heap !== null) p.gauge('jsHeapMB', heap, { unit: 'MB' }); else p.unsupported('jsHeapMB', 'performance.memory が使えない環境');
    p.endFrame();
  }
  _shadowsOn() { const s = ADAPTIVE_STEPS[this.adaptive.enabled ? this.adaptive.level : 0]; return this.quality.shadows && s.shadow > 0 && this.renderer.shadowSupported; }
  _renderFrame() {
    this.resize(); this.emit('beforeRender', {});
    const st = ADAPTIVE_STEPS[this.adaptive.enabled ? this.adaptive.level : 0];
    const ctx = { time: this._time, shadows: this._shadowsOn(), shadowMapSize: Math.max(256, Math.round(this.quality.shadowMapSize * (st.shadow || 1))), lodBias: this.quality.lodBias * st.lod, shadowCenter: this.controls ? Array.from(this.controls.target) : null };
    this.renderer.render(this.scene, this.camera, ctx); this.emit('afterRender', {});
  }
  /** 1フレームだけ手動で描画する（stop 中のスクリーンショット等）。 */
  renderOnce() { this._assertAlive(); if (this._contextLost) return false; this._renderFrame(); this._publishStats(); return true; }
  /** 描画して RGBA ピクセルを返す（検証・サムネイル用）。 */
  capture() { this.renderOnce(); return this.renderer.readPixels(); }
  _applyAdaptive() { this.resize(true); this.emit('quality', { level: this.adaptive.level, step: this.adaptive.step }); }

  resize(force) {
    if (this.disposed || this._contextLost) return false;
    const c = this.canvas, st = ADAPTIVE_STEPS[this.adaptive.enabled ? this.adaptive.level : 0];
    const scale = Math.max(this.adaptive.minScale || 0.25, this.quality.renderScale * st.scale);
    const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, this._maxPixelRatio) * scale;
    const cssW = c.clientWidth || (c.parentElement && c.parentElement.clientWidth) || c.width || 300, cssH = c.clientHeight || (c.parentElement && c.parentElement.clientHeight) || c.height || 150;
    const gl = this.gl, maxDim = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 4096;
    const w = Math.min(maxDim, Math.max(1, Math.floor(cssW * dpr))), h = Math.min(maxDim, Math.max(1, Math.floor(cssH * dpr)));
    if (force || c.width !== w || c.height !== h) { c.width = w; c.height = h; gl.viewport(0, 0, w, h); this.emit('resize', { width: w, height: h, cssWidth: cssW, cssHeight: cssH, pixelRatio: dpr }); return true; }
    return false;
  }

  /* ---------------- 統計 ---------------- */
  _publishStats() {
    const r = this.renderer.stats, p = this.physics ? (this.physics.stats || {}) : {};
    const jsHeap = (typeof performance !== 'undefined' && performance.memory) ? performance.memory.usedJSHeapSize / 1048576 : null;
    this.stats = {
      // 試作版互換キー
      count: this.particleField ? this.particleField.count : (p.bodies || 0), fps: this._fps, frameMs: this._frameMs, stepMs: p.stepMs || 0, integrateMs: p.integrateMs || 0, gridMs: p.gridMs || 0, collisionMs: p.collisionMs || 0,
      candidatePairs: p.candidatePairs || 0, overlaps: p.overlaps || 0, activeCells: p.activeCells || 0, uploadMs: r.uploadMs,
      // 追加
      cpuMs: this._cpuMs, updateMs: this._updateMs, renderMs: this._renderMs, frameP95Ms: this._frameStat.percentile(0.95), cpuP95Ms: this._cpuStat.percentile(0.95), frameMaxMs: this._frameStat.max(),
      gpuMs: r.gpuMs, gpuTimerSupported: r.gpuTimer, drawCalls: r.drawCalls, shadowDrawCalls: r.shadowDrawCalls, triangles: r.triangles, instances: r.instances, visibleObjects: r.visibleObjects, culledObjects: r.culledObjects,
      visibleChunks: r.visibleChunks, culledChunks: r.culledChunks, shadows: r.shadows, programs: r.programs, geometries: r.geometries, textures: r.textures, gpuBytes: r.gpuBytes, jsHeapMB: jsHeap,
      rigidBodies: this.rigid ? this.rigid.stats.bodies : 0, rigidStepMs: this.rigid ? this.rigid.stats.stepMs : 0,
      bodies: p.bodies || 0, physicsSubsteps: p.substeps || 0, physicsDroppedTime: p.droppedTime || 0, physicsOnWorker: !!(this.physics && this.physics.isWorker),
      renderScale: this.quality.renderScale * ADAPTIVE_STEPS[this.adaptive.enabled ? this.adaptive.level : 0].scale, qualityLevel: this.adaptive.level, canvasWidth: this.canvas.width, canvasHeight: this.canvas.height,
      initMs: this._initMs, frames: this._frameCount, jobsPending: this.jobs.pending,
      uploadBytes: r.uploadBytes, vertices: r.vertices, textureBytes: r.textureBytes, visibilityCulled: r.visibilityCulled
    };
  }
  getStats() { if (!this.stats || !('fps' in this.stats)) this._publishStats(); return Object.assign({}, this.stats); }

  /* ---------------- シーン操作 ---------------- */
  add(...nodes) { this._assertAlive(); this.scene.add(...nodes); return this; }
  remove(...nodes) { this._assertAlive(); this.scene.remove(...nodes); return this; }
  setBackground(c) { parseColor(c, this.scene.background); return this; }
  addDefaultLights() {
    if (this._defaultLights) return this;
    this._defaultLights = [new AmbientLight(0xffffff, 0.35), new DirectionalLight(0xffffff, 0.85, { direction: [-0.45, -0.85, -0.55] })];
    this.scene.add(...this._defaultLights); return this;
  }
  _mesh(geo, o) {
    this._assertAlive();
    const m = new Mesh(geo, o.material || new Material({ color: o.color === undefined ? 0xcccccc : o.color, map: o.map || null, opacity: o.opacity === undefined ? 1 : o.opacity, unlit: o.unlit }), { castShadow: o.castShadow, receiveShadow: o.receiveShadow, name: o.name });
    if (o.position) m.setPosition(o.position[0], o.position[1], o.position[2]); if (o.scale !== undefined) typeof o.scale === 'number' ? m.setScale(o.scale) : m.setScale(o.scale[0], o.scale[1], o.scale[2]);
    if (o.rotation) m.setRotationEuler(o.rotation[0], o.rotation[1], o.rotation[2]); this.scene.add(m); return m;
  }
  addBox(o = {}) { const s = o.size || [1, 1, 1]; return this._mesh(Geometry.box(s[0], s[1], s[2]), o); }
  addSphere(o = {}) { return this._mesh(Geometry.sphere(o.radius === undefined ? 0.5 : o.radius, o.segments || 24, Math.max(2, Math.round((o.segments || 24) * 2 / 3))), o); }
  addPlane(o = {}) { return this._mesh(Geometry.plane(o.width || 10, o.depth || 10, o.segments || 1, o.segments || 1), Object.assign({ receiveShadow: true }, o)); }
  addCylinder(o = {}) { return this._mesh(Geometry.cylinder(o.radiusTop === undefined ? 0.5 : o.radiusTop, o.radiusBottom === undefined ? 0.5 : o.radiusBottom, o.height || 1, o.segments || 24), o); }
  addGrid(size = 20, divisions = 20) { const g = createGridHelper(size, divisions); this.scene.add(g); return g; }

  /* ---------------- 更新・アニメーション ---------------- */
  /** 毎フレーム fn(dt, time) を呼ぶ。戻り値の関数で解除。 */
  addUpdate(fn) { this._assertAlive(); if (typeof fn !== 'function') throw new TypeError('addUpdate: 関数が必要です。'); this._updates.push(fn); return () => { const i = this._updates.indexOf(fn); if (i >= 0) this._updates.splice(i, 1); }; }
  /** 時間ベースのアニメーション。onUpdate(t0to1, easedT)。戻り値 { cancel(), finished: Promise } */
  animate({ duration = 1, delay = 0, easing = 'linear', loop = false, onUpdate, onComplete } = {}) {
    this._assertAlive(); const ease = typeof easing === 'function' ? easing : (EASE[easing] || EASE.linear);
    let resolve; const finished = new Promise(r => { resolve = r; });
    const tw = { t: -delay, duration: Math.max(1e-6, duration), ease, loop, onUpdate, onComplete, done: false, resolve, runs: 0 };
    this._tweens.push(tw); return { cancel: () => { tw.done = true; resolve(false); }, finished };
  }
  /** target[prop] (数値 または 数値配列) を to へ補間する。ノードの位置等に使える。 */
  tween(target, to, duration = 1, opts = {}) {
    const from = {}; for (const k of Object.keys(to)) from[k] = typeof target[k] === 'number' ? target[k] : Array.from(target[k]);
    return this.animate(Object.assign({}, opts, { duration, onUpdate: (t, e) => {
      for (const k of Object.keys(to)) { if (typeof to[k] === 'number') target[k] = from[k] + (to[k] - from[k]) * e; else for (let i = 0; i < to[k].length; i++) target[k][i] = from[k][i] + (to[k][i] - from[k][i]) * e; }
      if (target.markDirty) target.markDirty();
    } }));
  }
  _runTweens(dt) {
    for (const tw of this._tweens.slice()) {
      if (tw.done) continue; tw.t += dt; if (tw.t < 0) continue;
      let u = tw.t / tw.duration; const end = u >= 1;
      if (end && tw.loop && (tw.loop === true || ++tw.runs < tw.loop)) { tw.t = 0; u = 0; } else if (end) u = 1;
      try { if (tw.onUpdate) tw.onUpdate(u, tw.ease(u)); if (end && !(tw.loop && (tw.loop === true || tw.runs < tw.loop))) { tw.done = true; if (tw.onComplete) tw.onComplete(); tw.resolve(true); } } catch (e) { tw.done = true; tw.resolve(false); this._reportError(e, 'animate'); }
    }
    this._tweens = this._tweens.filter(t => !t.done);
  }

  /* ---------------- ピッキング ---------------- */
  /** 画面座標 (クライアントpx) からのレイ */
  screenRay(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect(); this.camera.updateCamera(this.canvas.width / Math.max(1, this.canvas.height));
    return rayFromCamera(this.camera, (clientX - r.left) / Math.max(1, r.width) * 2 - 1, -((clientY - r.top) / Math.max(1, r.height) * 2 - 1));
  }
  /** raycast(ray, opts) もしくは raycast(clientX, clientY, opts)。距離昇順のヒット配列。 */
  raycast(a, b, c) {
    this._assertAlive(); this.scene.updateMatrices();
    if (typeof a === 'number') return raycast(this.scene, this.screenRay(a, b), c || {});
    return raycast(this.scene, a, b || {});
  }
  pick(clientX, clientY, opts) { const h = this.raycast(clientX, clientY, Object.assign({ limit: 1 }, opts)); return h.length ? h[0] : null; }

  /* ---------------- 設定 ---------------- */
  setQuality(q) {
    this._assertAlive();
    if (typeof q === 'string') { if (!QUALITY_PRESETS[q]) throw new RangeError('未知の品質プリセット: ' + q); Object.assign(this.quality, QUALITY_PRESETS[q]); this.qualityName = q; }
    else if (q && typeof q === 'object') { for (const k of Object.keys(q)) { if (!(k in this.quality)) throw new RangeError('未知の品質項目: ' + k); this.quality[k] = q[k]; } this.qualityName = 'custom'; }
    else throw new TypeError('setQuality: 文字列かオブジェクトが必要です。');
    this.quality.renderScale = clamp(this.quality.renderScale, 0.25, 2); this.resize(true); this.emit('quality', { level: this.adaptive.level, quality: Object.assign({}, this.quality) }); return this;
  }
  getQuality() { return Object.assign({ name: this.qualityName, adaptiveLevel: this.adaptive.level, adaptiveEnabled: this.adaptive.enabled }, this.quality); }
  /** 実行時の設定変更。未知のキーは RangeError。 */
  setOptions(o = {}) {
    this._assertAlive();
    for (const k of Object.keys(o)) {
      switch (k) {
        case 'quality': this.setQuality(o[k]); break;
        case 'renderScale': case 'shadows': case 'lodBias': case 'shadowMapSize': this.setQuality({ [k]: k === 'shadows' ? !!o[k] : o[k] }); break;
        case 'adaptiveQuality': { const v = o[k]; this.adaptive.enabled = typeof v === 'object' ? v.enabled !== false : !!v; if (typeof v === 'object') { if (v.targetFps) this.adaptive.targetFps = v.targetFps; if (v.minScale) this.adaptive.minScale = v.minScale; } if (!this.adaptive.enabled) { this.adaptive.reset(); this.resize(true); } break; }
        case 'background': this.setBackground(o[k]); break;
        case 'maxPixelRatio': this._maxPixelRatio = o[k]; this.resize(true); break;
        case 'pauseWhenHidden': this._pauseWhenHidden = !!o[k]; break;
        case 'maxFrameDt': this._maxFrameDt = o[k]; break;
        case 'jobBudgetMs': this._jobBudget = o[k]; break;
        case 'physics': if (!this.physics) throw new MassiveEngineError('物理が有効ではありません。enablePhysics() を先に呼んでください。', 'E_NO_PHYSICS'); this.physics.setOptions(o[k]); break;
        default: throw new RangeError('setOptions: 未知の設定 ' + k);
      }
    }
    return this;
  }

  /* ---------------- 物理 ---------------- */
  /** 物理ワールドを有効化。{worker:true} で Web Worker 上で実行（Worker 非対応ならメインスレッドへフォールバック）。 */
  enablePhysics(options = {}, { worker = false } = {}) {
    this._assertAlive(); if (this.physics) throw new MassiveEngineError('物理は既に有効です。disablePhysics() を先に呼んでください。', 'E_PHYSICS_EXISTS');
    const useWorker = worker || options.worker; const o = Object.assign({}, options); delete o.worker;
    if (useWorker) {
      try { this.physics = new PhysicsWorkerClient(o, { onError: e => this._reportError(e, 'physics-worker'), onWarning: m => this._reportError(new Error(m), 'physics-warning') }); return this.physics; }
      catch (e) { this._reportError(new MassiveEngineError('物理ワーカーを起動できないためメインスレッドで実行します: ' + e.message, 'E_WORKER_UNAVAILABLE', e), 'physics'); }
    }
    o.onWarning = o.onWarning || (m => this.emit('warning', { message: m }));
    this.physics = new PhysicsWorld(o); return this.physics;
  }
  /** 1.2: 3D 剛体物理（RigidBodyWorld）。既存の enablePhysics() とは独立に併用できる。固定タイムステップ・Node 同期は自動。 */
  enableRigidBodyPhysics(options = {}) {
    this._assertAlive(); if (this.rigid) throw new MassiveEngineError('剛体物理は既に有効です。disableRigidBodyPhysics() を先に呼んでください。', 'E_RIGID_EXISTS');
    const o = Object.assign({}, options); o.onWarning = o.onWarning || (m => this.emit('warning', { message: m }));
    this.rigid = new RigidBodyWorld(o); return this.rigid;
  }
  disableRigidBodyPhysics() { if (this.rigid) { this.rigid.dispose(); this.rigid = null; } return this; }
  disablePhysics() { if (this.physics) { if (this.physics.dispose) this.physics.dispose(); this.physics = null; } return this; }

  /* ---------------- 1.1 追加機能（opt-in） ---------------- */
  /** 衝突判定ワールド（CollisionWorld）を有効化し、固定タイムステップで自動的に step する。 */
  enableCollision(options = {}) {
    this._assertAlive(); if (this.collision) throw new MassiveEngineError('衝突ワールドは既に有効です。', 'E_COLLISION_EXISTS');
    const o = Object.assign({}, options), ts = { fixedDt: o.fixedDt, maxSubSteps: o.maxSubSteps, timeScale: o.timeScale }; delete o.fixedDt; delete o.maxSubSteps; delete o.timeScale;
    for (const k of Object.keys(ts)) if (ts[k] === undefined) delete ts[k];
    o.onWarning = o.onWarning || (m => this.emit('warning', { message: m }));
    this.collision = new CollisionWorld(o); this.collisionStep = new FixedTimestep(ts); return this.collision;
  }
  disableCollision() { if (this.collision) { this.collision.dispose(); this.collision = null; this.collisionStep = null; } return this; }
  /** プロファイラを有効化（CPU/更新/描画/GPU(非対応なら unsupported)/ドローコール等を集計）。 */
  enableProfiler(options = {}) { this._assertAlive(); if (!this.profiler) this.profiler = new Profiler(options); this.profiler.enabled = true; return this.profiler; }
  disableProfiler() { if (this.profiler) this.profiler.enabled = false; return this; }
  enableInput(options = {}) { this._assertAlive(); if (!this.inputManager) this.inputManager = new InputManager(Object.assign({ element: this.canvas }, options)); return this.inputManager; }
  enableAudio(options = {}) { this._assertAlive(); if (!this.audio) this.audio = new AudioSystem(options); return this.audio; }
  /** デバッグ描画（別の 2D オーバーレイ canvas。既定 OFF: debug.enabled = true で表示）。 */
  enableDebugDraw(options = {}) { this._assertAlive(); if (!this.debug) { this.debug = new DebugDraw(Object.assign({ canvas: this.canvas, camera: this.camera }, options)); this.on('afterRender', () => { if (this.debug) this.debug.flush(); }); } return this.debug; }
  /** リソースマネージャ（this.assets 互換 + 重複排除・OBJ・マテリアル共有）。初回アクセスで作られる。 */
  get resources() { if (!this._resources) this._resources = new ResourceManager(); return this._resources; }
  addAnimator(a) { this._animators.push(a); return () => { const i = this._animators.indexOf(a); if (i >= 0) this._animators.splice(i, 1); }; }
  /** update(dt) を持つ任意のシステム（ParticleSystem 等）を毎フレーム更新対象に登録する。 */
  addSystem(sys) { if (!sys || typeof sys.update !== 'function') throw new TypeError('addSystem: update(dt) を持つオブジェクトが必要です。'); this._systems.push(sys); return () => { const i = this._systems.indexOf(sys); if (i >= 0) this._systems.splice(i, 1); }; }

  /* ---------------- シーンの保存・読込 ---------------- */
  saveScene() {
    this._assertAlive(); const cam = this.camera, c = this.controls;
    const { json, warnings } = serializeScene(this.scene, { camera: { fov: cam.fov, near: cam.near, far: cam.far, position: Array.from(cam.position), controls: c ? { target: Array.from(c.target), distance: c.distance, yaw: c.yaw, pitch: c.pitch } : null } });
    json.engineVersion = VERSION; this.lastSaveWarnings = warnings; return json;
  }
  saveSceneString(space) { return JSON.stringify(this.saveScene(), null, space); }
  /** JSON(オブジェクト/文字列)から読み込み。replace(既定 true)なら既存シーンの内容を破棄して置き換える。 */
  loadScene(json, { replace = true, restoreCamera = true } = {}) {
    this._assertAlive(); const { root, camera } = deserializeScene(json);
    if (replace) { for (const ch of this.scene.children.slice()) { ch.traverse(n => { if (n.disposeResources) n.disposeResources(); }); ch.removeFromParent(); } this._defaultLights = null; }
    if (root.background) this.scene.background = root.background;
    for (const ch of root.children.slice()) this.scene.add(ch);
    if (restoreCamera && camera) {
      this.camera.fov = camera.fov; this.camera.near = camera.near; this.camera.far = camera.far;
      if (this.controls && camera.controls) { this.controls.target.set(camera.controls.target); this.controls.distance = camera.controls.distance; this.controls.yaw = camera.controls.yaw; this.controls.pitch = camera.controls.pitch; this.controls.update(); } else this.camera.position.set(camera.position);
    }
    return this;
  }

  /* ---------------- 試作版 API 互換 ---------------- */
  _pf(name) { this._assertAlive(); if (!this.particleField) throw new MassiveEngineError(name + '() は create({count}) の互換モードでのみ使えます。', 'E_NOT_PARTICLE_MODE'); return this.particleField; }
  setCount(n) { this._pf('setCount').setCount(n); return this; }
  setSpeed(v) { this._pf('setSpeed').setSpeed(v); return this; }
  setGridCellSize(v) { this._pf('setGridCellSize').setGridCellSize(v); return this; }
  reset() { this._pf('reset').reset(); return this; }
  get count() { return this.particleField ? this.particleField.count : 0; }
  get gridCellSize() { return this.particleField ? this.particleField.gridCellSize : 0.6; }
  get cubeRotation() { return this.particleField ? this.particleField.spin : true; }
  set cubeRotation(v) { if (this.particleField) this.particleField.setSpin(v); }
}
