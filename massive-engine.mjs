/* MASSIVE ENGINE Prototype 2.0
 * Small embeddable WebGL 2 particle/collision core.
 * No third-party runtime dependencies. This is an experimental prototype, not a production engine.
 */
'use strict';

  const VERTEX_SHADER = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 a_position;
  layout(location=1) in vec3 a_normal;
  layout(location=2) in vec3 a_instancePosition;
  layout(location=3) in vec3 a_color;
  layout(location=4) in float a_scale;
  layout(location=5) in float a_phase;
  uniform mat4 u_viewProjection;
  uniform float u_time;
  uniform float u_rotate;
  out vec3 v_color;
  out vec3 v_normal;
  void main(){
    float a = u_rotate * (u_time * (0.25 + fract(a_phase) * 0.5) + a_phase);
    float c = cos(a), s = sin(a);
    mat3 rotY = mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c);
    vec3 local = rotY * (a_position * a_scale);
    vec3 world = local + a_instancePosition;
    gl_Position = u_viewProjection * vec4(world, 1.0);
    v_color = a_color;
    v_normal = normalize(rotY * a_normal);
  }`;

  const FRAGMENT_SHADER = `#version 300 es
  precision highp float;
  in vec3 v_color;
  in vec3 v_normal;
  out vec4 outColor;
  void main(){
    vec3 lightDir = normalize(vec3(-0.45, 0.85, 0.55));
    float diffuse = max(dot(normalize(v_normal), lightDir), 0.0);
    float light = 0.30 + diffuse * 0.70;
    outColor = vec4(v_color * light, 1.0);
  }`;

  const GRID_VERTEX_SHADER = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 a_position;
  uniform mat4 u_viewProjection;
  void main(){ gl_Position = u_viewProjection * vec4(a_position, 1.0); }`;
  const GRID_FRAGMENT_SHADER = `#version 300 es
  precision highp float;
  out vec4 outColor;
  void main(){ outColor = vec4(0.20, 0.36, 0.51, 0.34); }`;

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'Unknown shader error';
      gl.deleteShader(shader);
      throw new Error('WebGL shader compilation failed: ' + message);
    }
    return shader;
  }
  function createProgram(gl, vertexSource, fragmentSource) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || 'Unknown program link error';
      gl.deleteProgram(program);
      throw new Error('WebGL program link failed: ' + message);
    }
    return program;
  }
  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far), out = new Float32Array(16);
    out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1;
    out[14] = 2 * far * near * nf; return out;
  }
  function lookAt(eye, center, up) {
    let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
    let len = Math.hypot(zx, zy, zz) || 1; zx /= len; zy /= len; zz /= len;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz) || 1; xx /= len; xy /= len; xz /= len;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]), -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]), 1]);
  }
  function multiply(a, b) {
    const out = new Float32Array(16);
    for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) {
      out[col * 4 + row] = a[row] * b[col * 4] + a[4 + row] * b[col * 4 + 1] + a[8 + row] * b[col * 4 + 2] + a[12 + row] * b[col * 4 + 3];
    }
    return out;
  }
  function hashRandom(i, seed) {
    const v = Math.sin((i + 1) * 127.1 + (seed || 0) * 311.7) * 43758.5453123;
    return v - Math.floor(v);
  }
  function hsl(h, s, l) {
    const f = n => { const k = (n + h * 12) % 12; return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))); };
    return [f(0), f(8), f(4)];
  }

  class MassiveEngine {
    constructor(options) {
      const opts = options || {};
      if (!opts.canvas || typeof opts.canvas.getContext !== 'function' || String(opts.canvas.tagName).toLowerCase() !== 'canvas') {
        throw new TypeError('MassiveEngine requires options.canvas to be an HTML canvas element.');
      }
      this.canvas = opts.canvas;
      this.count = 0;
      this.gridCellSize = Number.isFinite(opts.gridCellSize) ? Math.max(0.3, Math.min(2, opts.gridCellSize)) : 0.60;
      this.speed = Number.isFinite(opts.speed) ? Math.max(0.1, Math.min(3, opts.speed)) : 1;
      this.cubeRotation = opts.cubeRotation !== false;
      this.running = false;
      this.disposed = false;
      this._contextLost = false;
      this._pauseWhenHidden = opts.pauseWhenHidden !== false;
      this._resumeAfterVisibility = false;
      this._autoResize = opts.autoResize !== false;
      this._raf = 0;
      this._lastStamp = 0;
      this._animTime = 0;
      this._fpsFrames = 0;
      this._fpsStart = 0;
      this._fps = 0;
      this._frameMs = 0;
      this._onStats = typeof opts.onStats === 'function' ? opts.onStats : null;
      this._onError = typeof opts.onError === 'function' ? opts.onError : null;
      this._drag = null;
      this._yaw = 0.68;
      this._pitch = 0.78;
      this._cameraDistance = 40;
      this.stats = { count: 0, fps: 0, frameMs: 0, stepMs: 0, integrateMs: 0, gridMs: 0, collisionMs: 0, candidatePairs: 0, overlaps: 0, activeCells: 0, uploadMs: 0 };

      const gl = this.canvas.getContext('webgl2', { antialias: opts.antialias !== false, alpha: false, powerPreference: 'high-performance' });
      if (!gl) throw new Error('WebGL 2 is not available in this browser/device.');
      this.gl = gl;
      try {
        this._program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
        this._gridProgram = createProgram(gl, GRID_VERTEX_SHADER, GRID_FRAGMENT_SHADER);
        this._loc = {
          vp: gl.getUniformLocation(this._program, 'u_viewProjection'), time: gl.getUniformLocation(this._program, 'u_time'), rotate: gl.getUniformLocation(this._program, 'u_rotate'),
          gridVp: gl.getUniformLocation(this._gridProgram, 'u_viewProjection')
        };
        this._createGeometry();
      } catch (error) {
        if (this._program) gl.deleteProgram(this._program);
        if (this._gridProgram) gl.deleteProgram(this._gridProgram);
        throw error;
      }
      this._boundResize = () => this.resize();
      this._boundPointerDown = e => { this._drag = { x: e.clientX, y: e.clientY }; try { this.canvas.setPointerCapture?.(e.pointerId); } catch (_) {} };
      this._boundPointerMove = e => { if (!this._drag) return; const dx = e.clientX - this._drag.x, dy = e.clientY - this._drag.y; this._drag = { x: e.clientX, y: e.clientY }; this._yaw -= dx * 0.008; this._pitch = Math.max(0.10, Math.min(1.42, this._pitch + dy * 0.008)); };
      this._boundPointerEnd = () => { this._drag = null; };
      this._boundWheel = e => { e.preventDefault(); this._cameraDistance = Math.max(3, Math.min(Math.max(this.worldW || 10, this.worldD || 10) * 4, this._cameraDistance * Math.exp(e.deltaY * 0.001))); };
      this._boundVisibility = () => {
        if (!this._pauseWhenHidden || this.disposed) return;
        if (document.hidden) {
          this._resumeAfterVisibility = this.running;
          this._haltLoop();
        } else if (this._resumeAfterVisibility && !this._contextLost) {
          this._resumeAfterVisibility = false;
          this.start();
        }
      };
      this._boundContextLost = e => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        this._contextLost = true;
        this._haltLoop();
        this._notifyError(new Error('WebGL context was lost. Dispose this instance and create a new Engine after the canvas context is restored.'));
      };
      this._boundContextRestored = () => {
        this._contextLost = true;
        this._notifyError(new Error('WebGL context restored; this prototype does not recreate GPU resources automatically. Dispose this instance and create a new Engine instance.'));
      };
      if (this._autoResize && typeof ResizeObserver !== 'undefined') {
        this._resizeObserver = new ResizeObserver(() => this.resize());
        this._resizeObserver.observe(this.canvas);
      } else if (this._autoResize) {
        window.addEventListener('resize', this._boundResize);
      }
      if (this._pauseWhenHidden) document.addEventListener('visibilitychange', this._boundVisibility);
      this.canvas.addEventListener('webglcontextlost', this._boundContextLost, false);
      this.canvas.addEventListener('webglcontextrestored', this._boundContextRestored, false);
      this.canvas.addEventListener('pointerdown', this._boundPointerDown);
      this.canvas.addEventListener('pointermove', this._boundPointerMove);
      this.canvas.addEventListener('pointerup', this._boundPointerEnd);
      this.canvas.addEventListener('pointercancel', this._boundPointerEnd);
      this.canvas.addEventListener('wheel', this._boundWheel, { passive: false });
      this.resize();
      this.setCount(Number.isFinite(opts.count) ? opts.count : 2500);
      this.stats.count = this.count;
      if (opts.autoStart !== false) this.start();
    }

    _createGeometry() {
      const gl = this.gl;
      const faces = [
        { n:[0,0,1],v:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]] },
        { n:[0,0,-1],v:[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]] },
        { n:[1,0,0],v:[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,-.5,.5],[.5,.5,-.5],[.5,.5,.5]] },
        { n:[-1,0,0],v:[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,-.5,-.5],[-.5,.5,.5],[-.5,.5,-.5]] },
        { n:[0,1,0],v:[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]] },
        { n:[0,-1,0],v:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]] }
      ];
      const data = [];
      for (const face of faces) for (const p of face.v) data.push(...p, ...face.n);
      this._vao = gl.createVertexArray(); gl.bindVertexArray(this._vao);
      this._cubeBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this._cubeBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
      this._positionBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer); gl.bufferData(gl.ARRAY_BUFFER, 0, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(2, 1);
      this._staticBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this._staticBuffer); gl.bufferData(gl.ARRAY_BUFFER, 0, gl.STATIC_DRAW);
      const stride = 5 * 4;
      for (const [index, size, offset] of [[3, 3, 0], [4, 1, 12], [5, 1, 16]]) { gl.enableVertexAttribArray(index); gl.vertexAttribPointer(index, size, gl.FLOAT, false, stride, offset); gl.vertexAttribDivisor(index, 1); }
      gl.bindVertexArray(null);
      this._gridVao = gl.createVertexArray(); gl.bindVertexArray(this._gridVao);
      this._gridBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBuffer); gl.bufferData(gl.ARRAY_BUFFER, 0, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.clearColor(0.025, 0.045, 0.075, 1);
    }

    setCount(requested) {
      this._assertAlive();
      const requestedNumber = Number(requested);
      if (!Number.isFinite(requestedNumber)) throw new TypeError('count must be a finite number.');
      const count = Math.max(100, Math.min(100000, Math.round(requestedNumber / 100) * 100));
      this.count = count;
      const cols = Math.ceil(Math.sqrt(count)), rows = Math.ceil(count / cols), spacing = 0.62;
      this.worldW = cols * spacing; this.worldD = rows * spacing; this.worldHalfX = this.worldW / 2; this.worldHalfZ = this.worldD / 2;
      this.positions = new Float32Array(count * 3); this.velocities = new Float32Array(count * 2); this.radii = new Float32Array(count); this.masses = new Float32Array(count); this.staticData = new Float32Array(count * 5);
      this._initBodies(cols, spacing);
      this._configureGrid();
      this._buildFloorGrid();
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer); gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this._staticBuffer); gl.bufferData(gl.ARRAY_BUFFER, this.staticData, gl.STATIC_DRAW);
      this._cameraDistance = Math.max(16, Math.max(this.worldW, this.worldD) * 1.15); this._yaw = 0.68; this._pitch = 0.78;
      this.stats.count = count;
    }

    _initBodies(cols, spacing) {
      for (let i = 0; i < this.count; i++) {
        const row = Math.floor(i / cols), col = i % cols, j = i * 3, k = i * 2, s = i * 5;
        this.positions[j] = (col - (cols - 1) / 2) * spacing + (hashRandom(i, 1) - 0.5) * 0.035;
        this.positions[j + 1] = 0;
        this.positions[j + 2] = (row - (Math.ceil(this.count / cols) - 1) / 2) * spacing + (hashRandom(i, 2) - 0.5) * 0.035;
        const angle = hashRandom(i, 3) * Math.PI * 2, velocity = 0.38 + hashRandom(i, 4) * 0.85;
        this.velocities[k] = Math.cos(angle) * velocity; this.velocities[k + 1] = Math.sin(angle) * velocity;
        this.radii[i] = 0.22 + hashRandom(i, 5) * 0.06; this.masses[i] = this.radii[i] * this.radii[i];
        const rgb = hsl((i * 0.61803398875) % 1, 0.72, 0.58);
        this.staticData[s] = rgb[0]; this.staticData[s + 1] = rgb[1]; this.staticData[s + 2] = rgb[2]; this.staticData[s + 3] = this.radii[i] * 2; this.staticData[s + 4] = hashRandom(i, 6) * Math.PI * 2;
      }
    }

    _configureGrid() {
      const size = this.gridCellSize;
      this.gridReach = Math.max(1, Math.ceil(0.56 / size));
      this.gridCols = Math.max(1, Math.ceil(this.worldW / size)); this.gridRows = Math.max(1, Math.ceil(this.worldD / size));
      const total = this.gridCols * this.gridRows;
      this.cellCounts = new Int32Array(total); this.cellStarts = new Int32Array(total + 1); this.cellCursor = new Int32Array(total);
      this.cellItems = new Int32Array(this.count); this.cellOf = new Int32Array(this.count); this.activeCells = new Int32Array(total); this.activeCellCount = 0;
      this.forwardStarts = new Int32Array(total + 1); let n = 0;
      for (let cell = 0; cell < total; cell++) {
        this.forwardStarts[cell] = n; const cx = cell % this.gridCols, cz = Math.floor(cell / this.gridCols);
        for (let dz = -this.gridReach; dz <= this.gridReach; dz++) for (let dx = -this.gridReach; dx <= this.gridReach; dx++) {
          if (dz < 0 || (dz === 0 && dx <= 0)) continue;
          const nx = cx + dx, nz = cz + dz; if (nx >= 0 && nx < this.gridCols && nz >= 0 && nz < this.gridRows) n++;
        }
      }
      this.forwardStarts[total] = n; this.forwardCells = new Int32Array(n); let cursor = 0;
      for (let cell = 0; cell < total; cell++) {
        const cx = cell % this.gridCols, cz = Math.floor(cell / this.gridCols);
        for (let dz = -this.gridReach; dz <= this.gridReach; dz++) for (let dx = -this.gridReach; dx <= this.gridReach; dx++) {
          if (dz < 0 || (dz === 0 && dx <= 0)) continue;
          const nx = cx + dx, nz = cz + dz; if (nx >= 0 && nx < this.gridCols && nz >= 0 && nz < this.gridRows) this.forwardCells[cursor++] = nz * this.gridCols + nx;
        }
      }
    }

    _buildFloorGrid() {
      const coords = [], step = Math.max(1, Math.ceil(Math.max(this.worldW, this.worldD) / 80));
      for (let x = -Math.ceil(this.worldHalfX / step) * step; x <= this.worldHalfX + 0.001; x += step) coords.push(x, -0.31, -this.worldHalfZ, x, -0.31, this.worldHalfZ);
      for (let z = -Math.ceil(this.worldHalfZ / step) * step; z <= this.worldHalfZ + 0.001; z += step) coords.push(-this.worldHalfX, -0.31, z, this.worldHalfX, -0.31, z);
      this.gridVertexCount = coords.length / 3;
      const gl = this.gl; gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);
    }

    _buildGrid() {
      this.cellCounts.fill(0); this.activeCellCount = 0;
      for (let i = 0; i < this.count; i++) {
        const x = this.positions[i * 3], z = this.positions[i * 3 + 2];
        let cx = Math.floor((x + this.worldHalfX) / this.gridCellSize), cz = Math.floor((z + this.worldHalfZ) / this.gridCellSize);
        cx = Math.max(0, Math.min(this.gridCols - 1, cx)); cz = Math.max(0, Math.min(this.gridRows - 1, cz));
        this.cellOf[i] = cz * this.gridCols + cx; this.cellCounts[this.cellOf[i]]++;
      }
      let offset = 0;
      for (let cell = 0; cell < this.cellCounts.length; cell++) {
        this.cellStarts[cell] = offset; this.cellCursor[cell] = offset;
        if (this.cellCounts[cell] > 0) this.activeCells[this.activeCellCount++] = cell;
        offset += this.cellCounts[cell];
      }
      this.cellStarts[this.cellCounts.length] = offset;
      for (let i = 0; i < this.count; i++) this.cellItems[this.cellCursor[this.cellOf[i]]++] = i;
    }

    _handleWalls(i) {
      const px = i * 3, vi = i * 2, r = this.radii[i]; let x = this.positions[px], z = this.positions[px + 2];
      const maxX = this.worldHalfX - r, maxZ = this.worldHalfZ - r;
      if (x < -maxX) { x = -maxX; this.velocities[vi] = Math.abs(this.velocities[vi]); } else if (x > maxX) { x = maxX; this.velocities[vi] = -Math.abs(this.velocities[vi]); }
      if (z < -maxZ) { z = -maxZ; this.velocities[vi + 1] = Math.abs(this.velocities[vi + 1]); } else if (z > maxZ) { z = maxZ; this.velocities[vi + 1] = -Math.abs(this.velocities[vi + 1]); }
      this.positions[px] = x; this.positions[px + 2] = z;
    }

    _resolvePair(i, j) {
      const ia = i * 3, ja = j * 3, iv = i * 2, jv = j * 2;
      let dx = this.positions[ja] - this.positions[ia], dz = this.positions[ja + 2] - this.positions[ia + 2];
      const minDist = this.radii[i] + this.radii[j], distSq = dx * dx + dz * dz;
      if (distSq >= minDist * minDist) return false;
      this._overlaps++;
      let dist = Math.sqrt(distSq);
      if (dist < 1e-7) { const a = (i * 2.399963229728653 + j * 0.017) % (Math.PI * 2); dx = Math.cos(a) * 1e-4; dz = Math.sin(a) * 1e-4; dist = 1e-4; }
      const nx = dx / dist, nz = dz / dist;
      const invMi = 1 / this.masses[i], invMj = 1 / this.masses[j], invSum = invMi + invMj;
      const overlap = minDist - dist, correction = Math.max(0, overlap - 0.001) * 0.78 / invSum;
      this.positions[ia] -= nx * correction * invMi; this.positions[ia + 2] -= nz * correction * invMi;
      this.positions[ja] += nx * correction * invMj; this.positions[ja + 2] += nz * correction * invMj;
      const rvx = this.velocities[jv] - this.velocities[iv], rvz = this.velocities[jv + 1] - this.velocities[iv + 1], along = rvx * nx + rvz * nz;
      if (along < 0) { const impulse = -1.12 * along / invSum; this.velocities[iv] -= impulse * invMi * nx; this.velocities[iv + 1] -= impulse * invMi * nz; this.velocities[jv] += impulse * invMj * nx; this.velocities[jv + 1] += impulse * invMj * nz; }
      return true;
    }

    step(dt) {
      this._assertAlive();
      const stepStart = performance.now(), safeDt = Math.min(0.033, Math.max(0, dt)) * this.speed;
      let t = performance.now();
      for (let i = 0; i < this.count; i++) { const j = i * 3, k = i * 2; this.positions[j] += this.velocities[k] * safeDt; this.positions[j + 2] += this.velocities[k + 1] * safeDt; this._handleWalls(i); }
      const integrateMs = performance.now() - t;
      t = performance.now(); this._buildGrid(); const gridMs = performance.now() - t;
      t = performance.now(); let checks = 0; this._overlaps = 0;
      for (let ai = 0; ai < this.activeCellCount; ai++) {
        const cell = this.activeCells[ai], start = this.cellStarts[cell], end = start + this.cellCounts[cell];
        for (let p = start; p < end; p++) {
          const i = this.cellItems[p];
          for (let q = p + 1; q < end; q++) { checks++; this._resolvePair(i, this.cellItems[q]); }
        }
        const ns = this.forwardStarts[cell], ne = this.forwardStarts[cell + 1];
        for (let ni = ns; ni < ne; ni++) {
          const other = this.forwardCells[ni], os = this.cellStarts[other], oe = os + this.cellCounts[other];
          if (os === oe) continue;
          for (let p = start; p < end; p++) { const i = this.cellItems[p]; for (let q = os; q < oe; q++) { checks++; this._resolvePair(i, this.cellItems[q]); } }
        }
      }
      for (let i = 0; i < this.count; i++) this._handleWalls(i);
      const collisionMs = performance.now() - t, stepMs = performance.now() - stepStart;
      this.stats = { count: this.count, fps: this._fps, frameMs: this._frameMs, stepMs, integrateMs, gridMs, collisionMs, candidatePairs: checks, overlaps: this._overlaps, activeCells: this.activeCellCount };
      return this.stats;
    }

    start() {
      this._assertAlive();
      if (this._contextLost) throw new Error('WebGL context is unavailable. Dispose and recreate the engine after the context has been restored.');
      if (this.running) return this;
      if (this._pauseWhenHidden && document.hidden) { this._resumeAfterVisibility = true; return this; }
      this.running = true; this._lastStamp = 0; this._fpsStart = performance.now(); this._fpsFrames = 0;
      this._raf = requestAnimationFrame(t => this._tick(t)); return this;
    }
    _haltLoop() {
      this.running = false;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
    stop() { if (this.disposed) return this; this._resumeAfterVisibility = false; this._haltLoop(); return this; }
    reset() { this._assertAlive(); this.setCount(this.count); return this; }
    setSpeed(value) {
      this._assertAlive(); const speed = Number(value);
      if (!Number.isFinite(speed)) throw new TypeError('speed must be a finite number.');
      this.speed = Math.max(0.1, Math.min(3, speed)); return this;
    }
    setGridCellSize(value) { this._assertAlive(); const width = Number(value); if (!Number.isFinite(width) || width < 0.3 || width > 2) throw new RangeError('gridCellSize must be between 0.3 and 2.0.'); this.gridCellSize = width; this._configureGrid(); return this; }
    getStats() { return Object.assign({}, this.stats); }
    resize() {
      if (this.disposed || this._contextLost) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssWidth = this.canvas.clientWidth || this.canvas.parentElement?.clientWidth || 1;
      const cssHeight = this.canvas.clientHeight || this.canvas.parentElement?.clientHeight || 1;
      const w = Math.max(1, Math.floor(cssWidth * dpr)), h = Math.max(1, Math.floor(cssHeight * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
      this.gl.viewport(0, 0, w, h);
    }

    _notifyError(error) {
      if (!this._onError) return;
      try { this._onError(error); } catch (callbackError) { console.error('MassiveEngine onError callback failed:', callbackError); }
    }

    _tick(stamp) {
      if (!this.running || this.disposed || this._contextLost) return;
      try {
        const now = Number.isFinite(stamp) ? stamp : performance.now();
        const rawDt = this._lastStamp ? Math.max(0, (now - this._lastStamp) / 1000) : 1 / 60;
        const dt = Math.min(rawDt, 0.033);
        this._lastStamp = now; this._frameMs = rawDt * 1000; this._fpsFrames++;
        if (now - this._fpsStart >= 500) { this._fps = this._fpsFrames * 1000 / (now - this._fpsStart); this._fpsFrames = 0; this._fpsStart = now; }
        this.step(dt); this._animTime += dt; this._render();
        if (this._onStats) {
          try { this._onStats(this.getStats()); }
          catch (callbackError) { this._notifyError(new Error('onStats callback failed: ' + (callbackError && callbackError.message ? callbackError.message : callbackError))); }
        }
      } catch (error) {
        this._haltLoop();
        this._notifyError(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      if (this.running && !this.disposed && !this._contextLost) this._raf = requestAnimationFrame(t => this._tick(t));
    }
    _render() {
      this.resize(); const gl = this.gl;
      const ex = this._cameraDistance * Math.cos(this._pitch) * Math.sin(this._yaw), ey = this._cameraDistance * Math.sin(this._pitch), ez = this._cameraDistance * Math.cos(this._pitch) * Math.cos(this._yaw);
      const vp = multiply(perspective(Math.PI / 4, this.canvas.width / this.canvas.height, 0.1, Math.max(5000, this._cameraDistance * 10)), lookAt([ex, ey, ez], [0, 0, 0], [0, 1, 0]));
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this._gridProgram); gl.uniformMatrix4fv(this._loc.gridVp, false, vp); gl.bindVertexArray(this._gridVao); gl.drawArrays(gl.LINES, 0, this.gridVertexCount); gl.bindVertexArray(null);
      const uploadStart = performance.now(); gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.positions); this.stats.uploadMs = performance.now() - uploadStart;
      gl.useProgram(this._program); gl.uniformMatrix4fv(this._loc.vp, false, vp); gl.uniform1f(this._loc.time, this._animTime); gl.uniform1f(this._loc.rotate, this.cubeRotation ? 1 : 0); gl.bindVertexArray(this._vao); gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, this.count); gl.bindVertexArray(null);
    }
    _assertAlive() { if (this.disposed) throw new Error('MassiveEngine instance has been disposed.'); }
    dispose() {
      if (this.disposed) return;
      this.stop(); this.disposed = true;
      if (this._resizeObserver) { this._resizeObserver.disconnect(); this._resizeObserver = null; }
      window.removeEventListener('resize', this._boundResize);
      if (this._pauseWhenHidden) document.removeEventListener('visibilitychange', this._boundVisibility);
      this.canvas.removeEventListener('webglcontextlost', this._boundContextLost, false);
      this.canvas.removeEventListener('webglcontextrestored', this._boundContextRestored, false);
      this.canvas.removeEventListener('pointerdown', this._boundPointerDown); this.canvas.removeEventListener('pointermove', this._boundPointerMove);
      this.canvas.removeEventListener('pointerup', this._boundPointerEnd); this.canvas.removeEventListener('pointercancel', this._boundPointerEnd); this.canvas.removeEventListener('wheel', this._boundWheel);
      const gl = this.gl;
      if (!this._contextLost && !gl.isContextLost()) {
        for (const r of [this._cubeBuffer, this._positionBuffer, this._staticBuffer, this._gridBuffer]) if (r) gl.deleteBuffer(r);
        for (const r of [this._vao, this._gridVao]) if (r) gl.deleteVertexArray(r);
        for (const r of [this._program, this._gridProgram]) if (r) gl.deleteProgram(r);
      }
      this._onStats = null; this._onError = null;
    }
  }

  function isCanvasSupported(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function' || String(canvas.tagName).toLowerCase() !== 'canvas') return false;
    try { return !!canvas.getContext('webgl2'); } catch (_) { return false; }
  }

const MassiveEngineAPI = Object.freeze({
  Engine: MassiveEngine,
  create: options => new MassiveEngine(options),
  isSupported: isCanvasSupported,
  version: '2.0.0-prototype'
});

export const Engine = MassiveEngine;
export const create = options => new MassiveEngine(options);
export const isSupported = isCanvasSupported;
export const version = '2.0.0-prototype';
export default MassiveEngineAPI;
