import { mat4, vec3, Frustum } from './math.js';
import { MassiveEngineError, now } from './util.js';
import { vertexSource, fragmentSource, MAX_DIR, MAX_POINT } from './shaders.js';

const WRAP = g => ({ repeat: g.REPEAT, clamp: g.CLAMP_TO_EDGE, mirror: g.MIRRORED_REPEAT });
const _f32 = new Float32Array(16), _n9 = new Float32Array(9);
const _bmin = new Float64Array(3), _bmax = new Float64Array(3);
const _lv = mat4.create(), _lp = mat4.create(), _lvp = mat4.create(), _sm = mat4.create();
const _bias = new Float64Array([0.5, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0.5, 0, 0.5, 0.5, 0.5, 1]);

export class WebGL2Renderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas; this.opts = opts;
    const gl = canvas.getContext('webgl2', { antialias: opts.antialias !== false, alpha: false, powerPreference: opts.powerPreference || 'high-performance', stencil: false, preserveDrawingBuffer: !!opts.preserveDrawingBuffer });
    if (!gl) throw new MassiveEngineError('WebGL 2 を利用できません（ブラウザ/端末が非対応、またはキャンバスが別コンテキストで使用済み）。', 'E_WEBGL2_UNAVAILABLE');
    this.gl = gl; this.disposed = false; this.lost = false;
    this._resources = new Set(); this.frustum = new Frustum(); this._lists = { lights: [], meshes: [], instanced: [] };
    this._opaque = []; this._transp = []; this._frame = 0; this._pass = 0;
    this.stats = { drawCalls: 0, triangles: 0, instances: 0, visibleObjects: 0, culledObjects: 0, visibleChunks: 0, culledChunks: 0, shadowDrawCalls: 0, uploadMs: 0, uploadBytes: 0, vertices: 0, textureBytes: 0, visibilityCulled: 0, programs: 0, geometries: 0, textures: 0, gpuBytes: 0, shadows: false, gpuMs: null, gpuTimer: false };
    this._init();
  }
  _init() {
    const gl = this.gl;
    this.programs = new Map(); this._bytes = { geo: 0, tex: 0, inst: 0, shadow: 0 };
    this._st = { prog: null, vao: null, depthTest: null, depthWrite: null, blend: null, additive: false, cull: null, tex0: null, tex1: null };
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.vertexAttrib3f(1, 0, 1, 0); gl.vertexAttrib2f(2, 0, 0); gl.vertexAttrib3f(3, 1, 1, 1);
    this._white = null; this._shadow = null; this._shadowFailed = false; if (this.visibilityFilter === undefined) this.visibilityFilter = null;
    this._aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this._timer = ext ? { ext, pending: [], active: null } : null; this.stats.gpuTimer = !!ext; this.stats.gpuMs = null;
    this._dirL = new Float32Array(MAX_DIR * 3); this._dirC = new Float32Array(MAX_DIR * 3); this._ptP = new Float32Array(MAX_POINT * 3); this._ptC = new Float32Array(MAX_POINT * 4);
    this._ambient = new Float32Array(3); this._nDir = 0; this._nPt = 0;
  }
  /** コンテキスト消失時: すべてのGPUハンドルを無効化（CPU側データは保持）。 */
  handleContextLost() {
    this.lost = true;
    for (const r of this._resources) if (r._gpu) r._gpu.delete(this);
    this._resources.clear(); this.programs = new Map();
    if (this._timer) { this._timer.pending.length = 0; this._timer.active = null; }
  }
  /** 復帰後: 状態を再初期化。ジオメトリ/テクスチャ/プログラムは次の描画で自動再作成される。 */
  handleContextRestored() { this.lost = false; this._init(); }

  /* ---------- プログラム ---------- */
  _program(flags) {
    const key = Object.keys(flags).filter(k => flags[k]).sort().join('|');
    let p = this.programs.get(key);
    if (p) return p;
    const gl = this.gl, f = {}; for (const k of key.split('|')) if (k) f[k] = true;
    const compile = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s) || ''; gl.deleteShader(s); throw new MassiveEngineError('シェーダのコンパイルに失敗 [' + key + ']: ' + log, 'E_SHADER'); }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, vertexSource(f)), fs = compile(gl.FRAGMENT_SHADER, fragmentSource(f));
    const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { const log = gl.getProgramInfoLog(prog) || ''; gl.deleteProgram(prog); throw new MassiveEngineError('プログラムのリンクに失敗 [' + key + ']: ' + log, 'E_SHADER'); }
    p = { program: prog, locs: {}, pass: -1, key, flags: f };
    this.programs.set(key, p); this.stats.programs = this.programs.size; return p;
  }
  _loc(p, n) { let l = p.locs[n]; if (l === undefined) { l = this.gl.getUniformLocation(p.program, n); p.locs[n] = l; } return l; }
  _use(p) { if (this._st.prog !== p) { this.gl.useProgram(p.program); this._st.prog = p; } }
  _bindVAO(v) { if (this._st.vao !== v) { this.gl.bindVertexArray(v); this._st.vao = v; } }

  /* ---------- ジオメトリ ---------- */
  _buf(target, data, usage = this.gl.STATIC_DRAW) { const gl = this.gl, b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, usage); return b; }
  _geo(geo) {
    let g = geo._gpu.get(this);
    if (g && g.version === geo.version) return g;
    const gl = this.gl;
    if (g) this._releaseGeo(g);
    g = { version: geo.version, bytes: geo.byteSize, mode: geo.mode === 'lines' ? gl.LINES : gl.TRIANGLES, bufs: [], index: null, indexType: 0, count: geo.indexCount };
    const vao = g.vao = gl.createVertexArray(); gl.bindVertexArray(vao); this._st.vao = vao;
    const attr = (loc, data, size) => { if (!data) return; const b = this._buf(gl.ARRAY_BUFFER, data); g.bufs.push(b); g.attribBufs = g.attribBufs || {}; g.attribBufs[loc] = [b, size]; gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); };
    attr(0, geo.positions, 3); attr(1, geo.normals, 3); attr(2, geo.uvs, 2); attr(3, geo.colors, 3);
    if (geo.indices) { g.index = this._buf(gl.ELEMENT_ARRAY_BUFFER, geo.indices); g.indexType = geo.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT; }
    gl.bindVertexArray(null); this._st.vao = null;
    this._bytes.geo += g.bytes; geo._gpu.set(this, g); this._resources.add(geo); this.stats.geometries = this._countRes('geo');
    return g;
  }
  _releaseGeo(g) { const gl = this.gl; if (!gl.isContextLost()) { for (const b of g.bufs) gl.deleteBuffer(b); if (g.index) gl.deleteBuffer(g.index); gl.deleteVertexArray(g.vao); } this._bytes.geo -= g.bytes; }
  _freeGeometry(geo) { const g = geo._gpu.get(this); if (g) { this._releaseGeo(g); geo._gpu.delete(this); this._resources.delete(geo); if (this._st.vao === g.vao) this._st.vao = null; this.stats.geometries = this._countRes('geo'); } }
  _countRes(kind) { let n = 0; for (const r of this._resources) { if (kind === 'geo' && r.positions) n++; else if (kind === 'tex' && r.wrapS) n++; } return n; }

  /* ---------- テクスチャ ---------- */
  _whiteTex() {
    if (this._white) return this._white; const gl = this.gl, t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2); // 作成・アップロード専用ユニット（描画用ユニット 0/1 の状態を壊さない）
    gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this._st.tex0 = null; return (this._white = t);
  }
  _tex(tex) {
    if (!tex.ready) return this._whiteTex();
    let g = tex._gpu.get(this);
    if (g && g.version === tex.version) return g.handle;
    const gl = this.gl, W = WRAP(gl);
    if (!g) { g = { handle: gl.createTexture(), version: -1, bytes: 0 }; tex._gpu.set(this, g); this._resources.add(tex); }
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, g.handle);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, tex.flipY ? 1 : 0);
    const s = tex.source;
    if (s.data) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tex.width, tex.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, s.data instanceof Uint8Array ? s.data : new Uint8Array(s.data.buffer, s.data.byteOffset, s.data.length));
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, s);
    const mip = tex.minFilter === 'mipmap';
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : tex.minFilter === 'nearest' ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, tex.magFilter === 'nearest' ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, W[tex.wrapS] || gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, W[tex.wrapT] || gl.REPEAT);
    if (this._aniso && mip) gl.texParameterf(gl.TEXTURE_2D, this._aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, gl.getParameter(this._aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    this._bytes.tex += tex.byteSize - g.bytes; g.bytes = tex.byteSize; g.version = tex.version; this.stats.textures = this._countRes('tex');
    return g.handle;
  }
  _freeTexture(tex) { const g = tex._gpu.get(this); if (g) { if (!this.gl.isContextLost()) this.gl.deleteTexture(g.handle); this._bytes.tex -= g.bytes; tex._gpu.delete(this); this._resources.delete(tex); this.stats.textures = this._countRes('tex'); this._st.tex0 = null; } }
  _bindTex(unit, handle) { const k = unit ? 'tex1' : 'tex0'; if (this._st[k] !== handle) { const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, handle); this._st[k] = handle; } }

  /* ---------- インスタンスメッシュ ---------- */
  _inst(mesh) {
    let ig = mesh._gpu.get(this);
    if (!ig) { ig = { chunks: [] }; mesh._gpu.set(this, ig); this._resources.add(mesh); }
    return ig;
  }
  _chunkGpu(mesh, ig, c) {
    let cg = ig.chunks[c];
    if (!cg) {
      const gl = this.gl, usage = mesh.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW;
      cg = { matBuf: gl.createBuffer(), colBuf: gl.createBuffer(), vaos: [] };
      gl.bindBuffer(gl.ARRAY_BUFFER, cg.matBuf); gl.bufferData(gl.ARRAY_BUFFER, mesh.chunkSize * 64, usage);
      gl.bindBuffer(gl.ARRAY_BUFFER, cg.colBuf); gl.bufferData(gl.ARRAY_BUFFER, mesh.chunkSize * 16, usage);
      this._bytes.inst += mesh.chunkSize * 80; ig.chunks[c] = cg; mesh.chunks[c].uploadDirty = true; mesh.chunks[c].dLo = 0; mesh.chunks[c].dHi = mesh.chunkSize; // 新しいバッファは全体を転送
    }
    return cg;
  }
  _uploadChunk(mesh, c, cg) {
    const gl = this.gl, t0 = now(), ch = mesh.chunks[c], s = c * mesh.chunkSize, n = Math.min(mesh.chunkSize, mesh.count - s);
    // 変更のあった範囲 [lo, hi) だけを転送する（全体が変わったときは全体）
    const lo = Math.max(0, Math.min(ch.dLo, n)), hi = Math.min(n, Math.max(ch.dHi, lo)), cnt = hi - lo;
    if (cnt > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, cg.matBuf); gl.bufferSubData(gl.ARRAY_BUFFER, lo * 64, mesh.matrices, (s + lo) * 16, cnt * 16);
      gl.bindBuffer(gl.ARRAY_BUFFER, cg.colBuf); gl.bufferSubData(gl.ARRAY_BUFFER, lo * 16, mesh.colors, (s + lo) * 4, cnt * 4);
      this.stats.uploadBytes += cnt * 80;
    }
    ch.uploadDirty = false; ch.dLo = 0; ch.dHi = 0; this.stats.uploadMs += now() - t0;
  }
  _chunkVao(cg, level, g) {
    const gl = this.gl; let e = cg.vaos[level];
    if (e && e.geo === g) return e.vao;
    if (e) gl.deleteVertexArray(e.vao);
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    for (const loc in g.attribBufs) { const [b, size] = g.attribBufs[loc]; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(+loc); gl.vertexAttribPointer(+loc, size, gl.FLOAT, false, 0, 0); }
    if (g.index) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.index);
    gl.bindBuffer(gl.ARRAY_BUFFER, cg.matBuf);
    for (let k = 0; k < 4; k++) { gl.enableVertexAttribArray(4 + k); gl.vertexAttribPointer(4 + k, 4, gl.FLOAT, false, 64, k * 16); gl.vertexAttribDivisor(4 + k, 1); }
    gl.bindBuffer(gl.ARRAY_BUFFER, cg.colBuf); gl.enableVertexAttribArray(8); gl.vertexAttribPointer(8, 4, gl.FLOAT, false, 16, 0); gl.vertexAttribDivisor(8, 1);
    gl.bindVertexArray(null); this._st.vao = null;
    cg.vaos[level] = { vao, geo: g }; return vao;
  }
  _freeInstanced(mesh) {
    const ig = mesh._gpu.get(this); if (!ig) return; const gl = this.gl;
    if (!gl.isContextLost()) for (const cg of ig.chunks) if (cg) { gl.deleteBuffer(cg.matBuf); gl.deleteBuffer(cg.colBuf); for (const e of cg.vaos) if (e) gl.deleteVertexArray(e.vao); }
    for (const cg of ig.chunks) if (cg) this._bytes.inst -= mesh.chunkSize * 80;
    mesh._gpu.delete(this); this._resources.delete(mesh); this._st.vao = null;
  }

  /* ---------- シャドウマップ ---------- */
  _ensureShadow(size) {
    const gl = this.gl;
    if (this._shadow && this._shadow.size === size) return this._shadow;
    this._freeShadow();
    const tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tex, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!ok) { gl.deleteTexture(tex); gl.deleteFramebuffer(fbo); this._shadowFailed = true; return null; }
    this._bytes.shadow = size * size * 4;
    return (this._shadow = { tex, fbo, size });
  }
  _freeShadow() { const s = this._shadow; if (!s) return; if (!this.gl.isContextLost()) { this.gl.deleteTexture(s.tex); this.gl.deleteFramebuffer(s.fbo); } this._shadow = null; this._bytes.shadow = 0; this._st.tex1 = null; }
  get shadowSupported() { return !this._shadowFailed; }

  /* ---------- GPUタイマ ---------- */
  _timerBegin() {
    const t = this._timer; if (!t) return; const gl = this.gl;
    while (t.pending.length) { // 完了したものを回収
      const q = t.pending[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      t.pending.shift(); const disjoint = gl.getParameter(t.ext.GPU_DISJOINT_EXT);
      if (!disjoint) this.stats.gpuMs = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
      gl.deleteQuery(q);
    }
    if (t.pending.length < 3) { t.active = gl.createQuery(); gl.beginQuery(t.ext.TIME_ELAPSED_EXT, t.active); }
  }
  _timerEnd() { const t = this._timer; if (t && t.active) { this.gl.endQuery(t.ext.TIME_ELAPSED_EXT); t.pending.push(t.active); t.active = null; } }

  /* ---------- 描画 ---------- */
  _renderState(mat, transparent) {
    const gl = this.gl, st = this._st, dt = mat.depthTest, dw = mat.depthWrite, bl = transparent, cu = !mat.doubleSided;
    if (st.depthTest !== dt) { dt ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST); st.depthTest = dt; }
    if (st.depthWrite !== dw) { gl.depthMask(dw); st.depthWrite = dw; }
    if (st.blend !== bl) { bl ? gl.enable(gl.BLEND) : gl.disable(gl.BLEND); st.blend = bl; }
    if (bl) { const add = mat.blending === 'additive'; if (st.additive !== add) { add ? gl.blendFunc(gl.SRC_ALPHA, gl.ONE) : gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); st.additive = add; } }
    if (st.cull !== cu) { cu ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE); st.cull = cu; }
  }
  _flagsFor(mesh, geo, mat, instanced, shadowRecv) {
    return { INSTANCED: instanced, MAP: !!(mat.map), VCOLOR: !!(mat.vertexColors && geo.colors), UNLIT: mat.unlit || geo.mode === 'lines', ALPHATEST: mat.alphaTest > 0, SHADOW_RECV: !!(shadowRecv && mesh.receiveShadow && !mat.unlit) };
  }
  _setFrame(p, ctx) {
    if (p.pass === this._pass) return; p.pass = this._pass; const gl = this.gl, L = (n) => this._loc(p, n);
    gl.uniformMatrix4fv(L('u_viewProj'), false, ctx.vpF); gl.uniform1f(L('u_time'), ctx.time);
    if (p.flags.DEPTH_ONLY) return;
    gl.uniform3fv(L('u_ambient'), this._ambient); gl.uniform3f(L('u_cam'), ctx.cam[0], ctx.cam[1], ctx.cam[2]);
    gl.uniform1i(L('u_numDir'), this._nDir); gl.uniform3fv(L('u_dirDir'), this._dirL); gl.uniform3fv(L('u_dirColor'), this._dirC);
    gl.uniform1i(L('u_numPoint'), this._nPt); gl.uniform3fv(L('u_pointPos'), this._ptP); gl.uniform4fv(L('u_pointColor'), this._ptC);
    if (p.flags.SHADOW_RECV) {
      gl.uniformMatrix4fv(L('u_shadowMat'), false, ctx.shadowMatF); gl.uniform1f(L('u_normalBias'), ctx.normalBias); gl.uniform1f(L('u_shadowTexel'), 1 / ctx.shadowSize); gl.uniform1f(L('u_shadowBias'), ctx.shadowBias);
      gl.uniform1i(L('u_shadowMap'), 1); this._bindTex(1, this._shadow.tex);
    }
  }
  _setMaterial(p, mat, depth) {
    if (depth) return; const gl = this.gl, L = n => this._loc(p, n);
    gl.uniform3f(L('u_color'), mat.color[0], mat.color[1], mat.color[2]); gl.uniform1f(L('u_opacity'), mat.opacity);
    gl.uniform3f(L('u_emissive'), mat.emissive[0], mat.emissive[1], mat.emissive[2]);
    gl.uniform1f(L('u_specular'), mat.specular); gl.uniform1f(L('u_shininess'), mat.shininess); gl.uniform1f(L('u_alphaTest'), mat.alphaTest);
    if (mat.map) { gl.uniform1i(L('u_map'), 0); this._bindTex(0, this._tex(mat.map)); }
  }
  _drawMesh(mesh, ctx, depth) {
    const gl = this.gl, geo = mesh.geometry, mat = mesh.material, g = this._geo(geo);
    const flags = depth ? { DEPTH_ONLY: true } : this._flagsFor(mesh, geo, mat, false, ctx.shadowOn);
    const p = this._program(flags); this._use(p); this._setFrame(p, ctx);
    const w = mesh._world; for (let i = 0; i < 16; i++) _f32[i] = w[i];
    gl.uniformMatrix4fv(this._loc(p, 'u_model'), false, _f32);
    if (!depth) { mat4.normalMatrix(_n9, w); gl.uniformMatrix3fv(this._loc(p, 'u_normalMat'), false, _n9); }
    this._setMaterial(p, mat, depth);
    this._bindVAO(g.vao);
    if (g.index) gl.drawElements(g.mode, g.count, g.indexType, 0); else gl.drawArrays(g.mode, 0, g.count);
    if (depth) this.stats.shadowDrawCalls++; else { this.stats.drawCalls++; this.stats.triangles += geo.triangleCount; this.stats.vertices += geo.vertexCount; }
  }
  _drawInstanced(mesh, ctx, depth, lightSphere) {
    const gl = this.gl, mat = mesh.material, ig = this._inst(mesh), w = mesh._world;
    const flags = depth ? { DEPTH_ONLY: true, INSTANCED: true } : this._flagsFor(mesh, mesh.geometry, mat, true, ctx.shadowOn);
    const p = this._program(flags); this._use(p); this._setFrame(p, ctx);
    for (let i = 0; i < 16; i++) _f32[i] = w[i];
    gl.uniformMatrix4fv(this._loc(p, 'u_model'), false, _f32); gl.uniform1f(this._loc(p, 'u_spin'), mesh.spin ? mesh.spinSpeed : 0);
    this._setMaterial(p, mat, depth);
    const cam = ctx.cam, lods = mesh.lods, bias = ctx.lodBias || 1;
    for (let c = 0; c < mesh.chunkCount; c++) {
      const ch = mesh.chunks[c]; if (ch.boundsDirty) mesh.computeChunkBounds(c);
      const n = Math.min(mesh.chunkSize, mesh.count - c * mesh.chunkSize); if (n <= 0) continue;
      mat4.transformAABB(_bmin, _bmax, ch.min, ch.max, w);
      const cx = (_bmin[0] + _bmax[0]) / 2, cy = (_bmin[1] + _bmax[1]) / 2, cz = (_bmin[2] + _bmax[2]) / 2, rad = Math.hypot(_bmax[0] - _bmin[0], _bmax[1] - _bmin[1], _bmax[2] - _bmin[2]) / 2;
      if (mesh.frustumCulled) {
        const vis = depth ? (Math.hypot(cx - lightSphere[0], cy - lightSphere[1], cz - lightSphere[2]) < rad + lightSphere[3]) : this.frustum.intersectsAABB(_bmin, _bmax);
        if (!vis) { if (!depth) this.stats.culledChunks++; continue; }
      }
      const dist = Math.max(0, Math.hypot(cx - cam[0], cy - cam[1], cz - cam[2]) - rad);
      if (dist > mesh.maxDistance) { if (!depth) this.stats.culledChunks++; continue; }
      let level = 0; const eff = dist / bias; for (let l = 1; l < lods.length; l++) if (eff >= lods[l].distance) level = l;
      const lgeo = lods[level].geometry, g = this._geo(lgeo), cg = this._chunkGpu(mesh, ig, c);
      if (ch.uploadDirty) this._uploadChunk(mesh, c, cg);
      this._bindVAO(this._chunkVao(cg, level, g));
      if (g.index) gl.drawElementsInstanced(g.mode, g.count, g.indexType, 0, n); else gl.drawArraysInstanced(g.mode, 0, g.count, n);
      if (depth) this.stats.shadowDrawCalls++; else { this.stats.drawCalls++; this.stats.triangles += lgeo.triangleCount * n; this.stats.vertices += lgeo.vertexCount * n; this.stats.instances += n; this.stats.visibleChunks++; }
    }
  }

  /**
   * シーンを1フレーム描画する。
   * ctx: { time, shadows(bool), shadowMapSize, lodBias, shadowCenter:[x,y,z]|null }
   * 戻り値: false = コンテキスト消失中で描画していない
   */
  render(scene, camera, ctx = {}) {
    const gl = this.gl;
    if (this.disposed) throw new MassiveEngineError('レンダラは破棄済みです。', 'E_DISPOSED');
    if (this.lost || gl.isContextLost()) return false;
    const st = this.stats; st.drawCalls = 0; st.triangles = 0; st.instances = 0; st.visibleObjects = 0; st.culledObjects = 0; st.visibleChunks = 0; st.culledChunks = 0; st.shadowDrawCalls = 0; st.uploadMs = 0; st.uploadBytes = 0; st.vertices = 0; st.visibilityCulled = 0;
    this._frame++;
    scene.updateMatrices();
    const W = this.canvas.width, H = this.canvas.height;
    camera.updateCamera(W / Math.max(1, H));
    this.frustum.setFromMatrix(camera.viewProjection);
    const lists = scene.collect(this._lists), cam = [camera._world[12], camera._world[13], camera._world[14]];
    this._timerBegin();

    // ライト整理
    const amb = this._ambient; amb[0] = amb[1] = amb[2] = 0;
    const dirs = [], pts = []; let caster = null;
    for (const l of lists.lights) {
      if (l.type === 'AmbientLight') { amb[0] += l.color[0] * l.intensity; amb[1] += l.color[1] * l.intensity; amb[2] += l.color[2] * l.intensity; }
      else if (l.type === 'DirectionalLight') { dirs.push(l); if (l.castShadow && !caster) caster = l; }
      else if (l.type === 'PointLight') { l.updateWorldMatrix(); pts.push(l); }
    }
    if (caster) { dirs.splice(dirs.indexOf(caster), 1); dirs.unshift(caster); }
    this._nDir = Math.min(MAX_DIR, dirs.length);
    for (let i = 0; i < this._nDir; i++) {
      const d = dirs[i].direction, l = Math.hypot(d[0], d[1], d[2]) || 1, k = i * 3, c = dirs[i].color, it = dirs[i].intensity;
      this._dirL[k] = -d[0] / l; this._dirL[k + 1] = -d[1] / l; this._dirL[k + 2] = -d[2] / l; this._dirC[k] = c[0] * it; this._dirC[k + 1] = c[1] * it; this._dirC[k + 2] = c[2] * it;
    }
    if (pts.length > MAX_POINT) pts.sort((a, b) => Math.hypot(a._world[12] - cam[0], a._world[13] - cam[1], a._world[14] - cam[2]) - Math.hypot(b._world[12] - cam[0], b._world[13] - cam[1], b._world[14] - cam[2]));
    this._nPt = Math.min(MAX_POINT, pts.length);
    for (let i = 0; i < this._nPt; i++) { const l = pts[i], k = i * 3, c = l.color; this._ptP[k] = l._world[12]; this._ptP[k + 1] = l._world[13]; this._ptP[k + 2] = l._world[14]; this._ptC[i * 4] = c[0] * l.intensity; this._ptC[i * 4 + 1] = c[1] * l.intensity; this._ptC[i * 4 + 2] = c[2] * l.intensity; this._ptC[i * 4 + 3] = Math.max(0.001, l.range); }

    const base = { time: ctx.time || 0, cam, lodBias: ctx.lodBias || 1, vpF: new Float32Array(16), shadowOn: false };
    // 影パス
    const wantShadow = !!(ctx.shadows && caster && !this._shadowFailed);
    if (wantShadow) {
      const sh = caster.shadow, size = Math.min(sh.mapSize, ctx.shadowMapSize || sh.mapSize), S = this._ensureShadow(size);
      if (S) {
        const e = sh.extent, c = sh.target || ctx.shadowCenter || [cam[0] - camera._world[8] * e, cam[1] - camera._world[9] * e, cam[2] - camera._world[10] * e];
        const d = caster.direction, dl = Math.hypot(d[0], d[1], d[2]) || 1, L = [d[0] / dl, d[1] / dl, d[2] / dl];
        mat4.lookAt(_lv, [c[0] - L[0] * e * 2, c[1] - L[1] * e * 2, c[2] - L[2] * e * 2], c, Math.abs(L[1]) > 0.99 ? [1, 0, 0] : [0, 1, 0]);
        mat4.ortho(_lp, -e, e, -e, e, 0.01, e * 4.5); mat4.multiply(_lvp, _lp, _lv);
        const cw = vec3.transformMat4(new Float64Array(3), c, _lvp), tx = cw[0] * 0.5 * size, ty = cw[1] * 0.5 * size; // テクセルスナップ（揺れ防止）
        _lvp[12] += (Math.round(tx) - tx) / (0.5 * size); _lvp[13] += (Math.round(ty) - ty) / (0.5 * size);
        mat4.multiply(_sm, _bias, _lvp);
        const sctx = Object.assign({}, base, { vpF: Float32Array.from(_lvp) });
        gl.bindFramebuffer(gl.FRAMEBUFFER, S.fbo); gl.viewport(0, 0, size, size); gl.colorMask(false, false, false, false);
        gl.depthMask(true); this._st.depthWrite = true; gl.enable(gl.DEPTH_TEST); this._st.depthTest = true; gl.disable(gl.BLEND); this._st.blend = false; gl.enable(gl.CULL_FACE); this._st.cull = true;
        gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2, 4); gl.clear(gl.DEPTH_BUFFER_BIT); this._pass++;
        const sphere = [c[0], c[1], c[2], e * 1.75];
        for (const m of lists.meshes) {
          if (!m.castShadow || m.material.transparent || m.material.alphaTest > 0 || m.geometry.mode !== 'triangles') continue;
          m.updateWorldBounds(); const cx = (m.wmin[0] + m.wmax[0]) / 2, cy = (m.wmin[1] + m.wmax[1]) / 2, cz = (m.wmin[2] + m.wmax[2]) / 2, r = Math.hypot(m.wmax[0] - m.wmin[0], m.wmax[1] - m.wmin[1], m.wmax[2] - m.wmin[2]) / 2;
          if (Math.hypot(cx - sphere[0], cy - sphere[1], cz - sphere[2]) > r + sphere[3]) continue;
          this._drawMesh(m, sctx, true);
        }
        for (const m of lists.instanced) { if (m.castShadow && !m.material.transparent && m.geometry.mode === 'triangles') this._drawInstanced(m, sctx, true, sphere); }
        gl.disable(gl.POLYGON_OFFSET_FILL); gl.colorMask(true, true, true, true); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        Object.assign(base, { shadowOn: true, shadowMatF: Float32Array.from(_sm), shadowSize: size, shadowBias: sh.bias, normalBias: sh.normalBias });
      }
    }
    st.shadows = base.shadowOn;

    // 本パス
    gl.viewport(0, 0, W, H); this._pass++;
    base.vpF = Float32Array.from(camera.viewProjection);
    const bg = scene.background; gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.depthMask(true); this._st.depthWrite = true; gl.enable(gl.DEPTH_TEST); this._st.depthTest = true;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const opaque = this._opaque, transp = this._transp; opaque.length = 0; transp.length = 0;
    for (const m of lists.meshes) {
      if (m.frustumCulled) { m.updateWorldBounds(); if (!this.frustum.intersectsAABB(m.wmin, m.wmax)) { st.culledObjects++; continue; } }
      if (this.visibilityFilter && !this.visibilityFilter(m, camera)) { st.visibilityCulled++; continue; } // 追加の可視判定フック（オクルージョンカリング等を外部から接続できる）
      st.visibleObjects++;
      (m.material.transparent ? transp : opaque).push(m);
    }
    for (const m of lists.instanced) { st.visibleObjects++; (m.material.transparent ? transp : opaque).push(m); }
    for (const o of transp) { const w = o._world; o._sortKey = Math.hypot(w[12] - cam[0], w[13] - cam[1], w[14] - cam[2]); }
    opaque.sort((a, b) => ((a.renderOrder || 0) - (b.renderOrder || 0)) || (a.material.id - b.material.id) || (a.geometry.id - b.geometry.id));
    transp.sort((a, b) => ((a.renderOrder || 0) - (b.renderOrder || 0)) || (b._sortKey - a._sortKey));
    for (const o of opaque) { this._renderState(o.material, false); o.type === 'Mesh' ? this._drawMesh(o, base, false) : this._drawInstanced(o, base, false); }
    for (const o of transp) { this._renderState(o.material, true); o.type === 'Mesh' ? this._drawMesh(o, base, false) : this._drawInstanced(o, base, false); }
    this._bindVAO(null);
    this._timerEnd();
    st.textureBytes = this._bytes.tex; st.gpuBytes = this._bytes.geo + this._bytes.tex + this._bytes.inst + this._bytes.shadow + W * H * 8;
    return true;
  }

  /** 現在のフレームバッファから RGBA を読む（描画直後の同一タスク内で呼ぶ）。 */
  readPixels(x = 0, y = 0, w = this.canvas.width, h = this.canvas.height) {
    const out = new Uint8Array(w * h * 4); this.gl.readPixels(x, y, w, h, this.gl.RGBA, this.gl.UNSIGNED_BYTE, out); return out;
  }
  get gpuBytesBreakdown() { return Object.assign({}, this._bytes); }

  dispose() {
    if (this.disposed) return; this.disposed = true; const gl = this.gl;
    if (!gl.isContextLost()) {
      for (const r of Array.from(this._resources)) { if (r.positions) this._freeGeometry(r); else if (r.wrapS) this._freeTexture(r); else this._freeInstanced(r); }
      this._freeShadow(); if (this._white) gl.deleteTexture(this._white);
      for (const p of this.programs.values()) gl.deleteProgram(p.program);
      if (this._timer) for (const q of this._timer.pending) gl.deleteQuery(q);
    } else for (const r of this._resources) if (r._gpu) r._gpu.delete(this);
    this._resources.clear(); this.programs.clear();
  }
}
