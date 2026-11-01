/*
 * デバッグ描画: 通常の 3D 描画とは別の 2D オーバーレイ canvas に線を描く。既定は OFF（enabled=false の間はコストほぼ 0）。
 *
 *   const dbg = new DebugDraw({ canvas: engine.canvas, camera: engine.camera });   // canvas の上に透明な canvas を重ねる
 *   dbg.enabled = true;
 *   // 毎フレーム: 線を積む → flush
 *   dbg.aabb(min, max, '#0f0'); dbg.sphere(x,y,z,r); dbg.ray(origin, dir, len); dbg.point(x,y,z); dbg.text(x,y,z,'id 12');
 *   dbg.collisionWorld(world, { shapes:true, contacts:true, cells:false });
 *   dbg.flush();
 * 3D→2D は camera.viewProjection で投影（近クリップ面で線分を切る）。エンジンの描画パス・GPU バッファには一切触れない。
 * 未実装: 深度テスト（オーバーレイなので物体の裏側も見える）、カリング統計の可視化。
 */
const COLORS = { shape: '#4ade80', trigger: '#facc15', static: '#60a5fa', contact: '#f87171', ray: '#e879f9', cell: 'rgba(148,163,184,.5)' };

export class DebugDraw {
  constructor({ canvas = null, camera = null, overlay = null, maxLines = 200000 } = {}) {
    this.enabled = false; this.camera = camera; this.maxLines = maxLines; this.target = canvas; this.overlay = overlay; this.ctx = null;
    this.lines = new Float32Array(1024 * 6); this.lineColors = []; this.n = 0; this.texts = []; this.dropped = 0; this.lastLines = 0; this._ownOverlay = false;
    if (!overlay && canvas && typeof document !== 'undefined' && canvas.parentElement) {
      const o = document.createElement('canvas'); o.style.cssText = 'position:absolute;pointer-events:none;left:0;top:0;width:100%;height:100%'; o.setAttribute('data-massive-debug', '1');
      const par = canvas.parentElement; if (par.style && !par.style.position) par.style.position = 'relative'; par.appendChild(o); this.overlay = o; this._ownOverlay = true;
    }
    if (this.overlay && this.overlay.getContext) this.ctx = this.overlay.getContext('2d');
  }
  /* ---- プリミティブ ---- */
  line(ax, ay, az, bx, by, bz, color = '#fff') {
    if (!this.enabled) return this;
    if (this.n >= this.maxLines) { this.dropped++; return this; }
    if ((this.n + 1) * 6 > this.lines.length) { const a = new Float32Array(this.lines.length * 2); a.set(this.lines); this.lines = a; }
    const o = this.n * 6; this.lines[o] = ax; this.lines[o + 1] = ay; this.lines[o + 2] = az; this.lines[o + 3] = bx; this.lines[o + 4] = by; this.lines[o + 5] = bz; this.lineColors[this.n++] = color; return this;
  }
  point(x, y, z, size = 0.1, color = '#fff') { return this.line(x - size, y, z, x + size, y, z, color).line(x, y - size, z, x, y + size, z, color).line(x, y, z - size, x, y, z + size, color); }
  aabb(min, max, color = COLORS.shape) {
    if (!this.enabled) return this; const [x0, y0, z0] = min, [x1, y1, z1] = max;
    this.line(x0, y0, z0, x1, y0, z0, color).line(x1, y0, z0, x1, y0, z1, color).line(x1, y0, z1, x0, y0, z1, color).line(x0, y0, z1, x0, y0, z0, color);
    this.line(x0, y1, z0, x1, y1, z0, color).line(x1, y1, z0, x1, y1, z1, color).line(x1, y1, z1, x0, y1, z1, color).line(x0, y1, z1, x0, y1, z0, color);
    return this.line(x0, y0, z0, x0, y1, z0, color).line(x1, y0, z0, x1, y1, z0, color).line(x1, y0, z1, x1, y1, z1, color).line(x0, y0, z1, x0, y1, z1, color);
  }
  circle(cx, cy, cz, r, axis, color = COLORS.shape, seg = 24) {
    if (!this.enabled) return this; let px, py, pz;
    for (let i = 0; i <= seg; i++) {
      const a = i / seg * 6.283185307, c = Math.cos(a) * r, s = Math.sin(a) * r;
      const x = cx + (axis === 0 ? 0 : c), y = cy + (axis === 0 ? c : axis === 1 ? 0 : s), z = cz + (axis === 0 ? s : axis === 1 ? s : 0);
      if (i) this.line(px, py, pz, x, y, z, color); px = x; py = y; pz = z;
    } return this;
  }
  sphere(x, y, z, r, color = COLORS.shape) { return this.circle(x, y, z, r, 0, color).circle(x, y, z, r, 1, color).circle(x, y, z, r, 2, color); }
  ray(o, d, len = 10, color = COLORS.ray) { const l = Math.hypot(d[0], d[1], d[2]) || 1; return this.line(o[0], o[1], o[2], o[0] + d[0] / l * len, o[1] + d[1] / l * len, o[2] + d[2] / l * len, color); }
  text(x, y, z, str, color = '#fff') { if (this.enabled) this.texts.push({ x, y, z, str: String(str), color }); return this; }
  /** OBB（中心・半径3軸・回転行列 rotm[0..8]=3本の軸ベクトル）の 12 辺。 */
  obb(c, h, R, color = COLORS.shape) {
    const v = []; for (let i = 0; i < 8; i++) { const sx = i & 1 ? 1 : -1, sy = i & 2 ? 1 : -1, sz = i & 4 ? 1 : -1;
      v.push([c[0] + R[0] * h[0] * sx + R[3] * h[1] * sy + R[6] * h[2] * sz, c[1] + R[1] * h[0] * sx + R[4] * h[1] * sy + R[7] * h[2] * sz, c[2] + R[2] * h[0] * sx + R[5] * h[1] * sy + R[8] * h[2] * sz]); }
    for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) if (!(i & bit)) { const j = i | bit; this.line(v[i][0], v[i][1], v[i][2], v[j][0], v[j][1], v[j][2], color); }
    return this;
  }
  capsule(c, radius, halfLen, R, color = COLORS.shape) {
    if (!this.enabled) return this; const ax = [R[3], R[4], R[5]];
    const a = [c[0] - ax[0] * halfLen, c[1] - ax[1] * halfLen, c[2] - ax[2] * halfLen], b = [c[0] + ax[0] * halfLen, c[1] + ax[1] * halfLen, c[2] + ax[2] * halfLen];
    this.sphere(a[0], a[1], a[2], radius, color).sphere(b[0], b[1], b[2], radius, color);
    for (const d of [[R[0], R[1], R[2]], [R[6], R[7], R[8]]]) for (const sg of [1, -1]) this.line(a[0] + d[0] * radius * sg, a[1] + d[1] * radius * sg, a[2] + d[2] * radius * sg, b[0] + d[0] * radius * sg, b[1] + d[1] * radius * sg, b[2] + d[2] * radius * sg, color);
    return this;
  }
  /** CollisionWorld の形・接触・ID を描く（形ごとに: 球/AABB/回転OBB/カプセル/平面(原点付近の格子)）。 */
  collisionWorld(w, { shapes = true, contacts = true, ids = false, planeExtent = 10 } = {}) {
    if (!this.enabled) return this;
    if (shapes) w.forEachShape((h, type, pos, R, par, flags, box) => {
      const col = (flags & 4) ? COLORS.trigger : (flags & 2) ? COLORS.static : COLORS.shape;
      if (type === 'sphere') this.sphere(pos[0], pos[1], pos[2], par[0], col);
      else if (type === 'aabb') this.aabb([pos[0] - par[0], pos[1] - par[1], pos[2] - par[2]], [pos[0] + par[0], pos[1] + par[1], pos[2] + par[2]], col);
      else if (type === 'obb') this.obb(pos, par, R, col);
      else if (type === 'capsule') this.capsule(pos, par[0], par[1], R, col);
      else if (type === 'plane') {
        const n = [par[0], par[1], par[2]], d = par[3], o = [n[0] * d, n[1] * d, n[2] * d], t = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
        let ux = n[1] * t[2] - n[2] * t[1], uy = n[2] * t[0] - n[0] * t[2], uz = n[0] * t[1] - n[1] * t[0]; const l = Math.hypot(ux, uy, uz); ux /= l; uy /= l; uz /= l;
        const vx = n[1] * uz - n[2] * uy, vy = n[2] * ux - n[0] * uz, vz = n[0] * uy - n[1] * ux, E = planeExtent;
        for (let k = -4; k <= 4; k++) { const f = k / 4 * E;
          this.line(o[0] + ux * f - vx * E, o[1] + uy * f - vy * E, o[2] + uz * f - vz * E, o[0] + ux * f + vx * E, o[1] + uy * f + vy * E, o[2] + uz * f + vz * E, col);
          this.line(o[0] + vx * f - ux * E, o[1] + vy * f - uy * E, o[2] + vz * f - uz * E, o[0] + vx * f + ux * E, o[1] + vy * f + uy * E, o[2] + vz * f + uz * E, col); }
      }
      if (ids && type !== 'plane') this.text(pos[0], pos[1], pos[2], h, col);
    });
    if (contacts) w.forEachContact((ha, hb, c) => { this.point(c.px, c.py, c.pz, 0.1, COLORS.contact); this.line(c.px, c.py, c.pz, c.px + c.nx * 0.5, c.py + c.ny * 0.5, c.pz + c.nz * 0.5, COLORS.contact); });
    return this;
  }
  /**
   * 1.2: RigidBodyWorld の可視化（既定 OFF = this.enabled=false の間は何も積まない）。
   * opts: shapes, aabb, contacts(点), normals, depth(貫通深度の線), velocity, angularVelocity, centerOfMass, inertia(主慣性の等価箱), sleeping(色分け), scale
   */
  rigidBodyWorld(w, o = {}) {
    if (!this.enabled) return this;
    const { shapes = true, aabb = false, contacts = true, normals = true, depth = true, velocity = false, angularVelocity = false, centerOfMass = false, inertia = false, scale = 0.2, planeExtent = 10 } = o;
    const C = { active: '#4ade80', asleep: '#64748b', stat: '#60a5fa', kin: '#facc15', sensor: '#e879f9', vel: '#38bdf8', ang: '#fb923c', com: '#ffffff', inertia: '#a78bfa', aabb: 'rgba(148,163,184,.7)' };
    const T = [0, 0, 0], R9 = new Float64Array(9);
    for (let i = 0; i < w.count; i++) {
      if (!w.live[i]) continue; const j = i * 3, bt = w.btype[i], asleep = w.sleepState[i] === 1, q = i * 4, r = i * 9;
      const col = (w.extra[i] & 1) ? C.sensor : bt === 0 ? C.stat : bt === 2 ? C.kin : asleep ? C.asleep : C.active;
      const pos = [w.pos[j], w.pos[j + 1], w.pos[j + 2]], R = w.rotm.subarray(r, r + 9), par = w.par.subarray(q, q + 4), t = w.type[i];
      if (shapes) {
        if (t === 0) this.sphere(pos[0], pos[1], pos[2], par[0], col);
        else if (t === 1 || t === 2) this.obb(pos, [par[0], par[1], par[2]], R, col);
        else if (t === 3) this.capsule(pos, par[0], par[1], R, col);
        else if (t === 4) { const n = [par[0], par[1], par[2]], d = par[3], oo = [n[0] * d, n[1] * d, n[2] * d], tt = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; let ux = n[1] * tt[2] - n[2] * tt[1], uy = n[2] * tt[0] - n[0] * tt[2], uz = n[0] * tt[1] - n[1] * tt[0]; const l = Math.hypot(ux, uy, uz); ux /= l; uy /= l; uz /= l; const vx = n[1] * uz - n[2] * uy, vy = n[2] * ux - n[0] * uz, vz = n[0] * uy - n[1] * ux, E = planeExtent; for (let k = -4; k <= 4; k++) { const f = k / 4 * E; this.line(oo[0] + ux * f - vx * E, oo[1] + uy * f - vy * E, oo[2] + uz * f - vz * E, oo[0] + ux * f + vx * E, oo[1] + uy * f + vy * E, oo[2] + uz * f + vz * E, col); this.line(oo[0] + vx * f - ux * E, oo[1] + vy * f - uy * E, oo[2] + vz * f - uz * E, oo[0] + vx * f + ux * E, oo[1] + vy * f + uy * E, oo[2] + vz * f + uz * E, col); } }
      }
      if (t === 4) continue;
      if (aabb) { const a = w.aabb, k = i * 6; this.aabb([a[k], a[k + 1], a[k + 2]], [a[k + 3], a[k + 4], a[k + 5]], C.aabb); }
      if (centerOfMass) this.point(pos[0], pos[1], pos[2], 0.08, C.com);
      if (bt === 0) continue;
      if (velocity) this.line(pos[0], pos[1], pos[2], pos[0] + w.vel[j] * scale, pos[1] + w.vel[j + 1] * scale, pos[2] + w.vel[j + 2] * scale, C.vel);
      if (angularVelocity) this.line(pos[0], pos[1], pos[2], pos[0] + w.ang[j] * scale, pos[1] + w.ang[j + 1] * scale, pos[2] + w.ang[j + 2] * scale, C.ang);
      if (inertia && bt === 1 && !w.lockRot[i]) { // 主慣性から等価な一様箱の半サイズ: hx = sqrt(3/2 (Iy+Iz-Ix)/m) ほか
        const m = w.mass[i], Ix = 1 / w.invI[j], Iy = 1 / w.invI[j + 1], Iz = 1 / w.invI[j + 2], h = (a, b, c) => Math.sqrt(Math.max(0, 1.5 * (b + c - a) / m));
        this.obb(pos, [h(Ix, Iy, Iz), h(Iy, Ix, Iz), h(Iz, Ix, Iy)], R, C.inertia); void T; void R9;
      }
    }
    if (contacts || normals || depth) w.forEachContact((ha, hb, c) => {
      for (let p = 0; p < c.count; p++) { const pt = c.points[p]; const col = c.sensor ? C.sensor : '#f87171';
        if (contacts) this.point(pt.x, pt.y, pt.z, 0.05, col);
        if (normals) this.line(pt.x, pt.y, pt.z, pt.x + c.nx * 0.3, pt.y + c.ny * 0.3, pt.z + c.nz * 0.3, '#fca5a5');
        if (depth && pt.depth > 0) this.line(pt.x, pt.y, pt.z, pt.x - c.nx * pt.depth, pt.y - c.ny * pt.depth, pt.z - c.nz * pt.depth, '#ef4444'); }
    });
    return this;
  }
  /** 3D → 画面。カメラ背後は null。 */
  project(x, y, z, out = [0, 0]) {
    const m = this.camera.viewProjection, w = m[3] * x + m[7] * y + m[11] * z + m[15]; if (w <= 1e-6) return null;
    out[0] = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / w * 0.5 + 0.5) * this._w; out[1] = (1 - ((m[1] * x + m[5] * y + m[9] * z + m[13]) / w * 0.5 + 0.5)) * this._h; return out;
  }
  /** 積んだ線を描いて空にする。enabled=false なら何もせず、積んだ内容も捨てる。 */
  flush() {
    const n = this.n; this.lastLines = n; const ctx = this.ctx, ov = this.overlay;
    if (!this.enabled || !ctx || !this.camera) { this.n = 0; this.texts.length = 0; if (ctx && ov && this._cleared !== true) { ctx.clearRect(0, 0, ov.width, ov.height); this._cleared = true; } return n; }
    this._cleared = false;
    const t = this.target || ov; if (ov && t) { const w = t.width || ov.width, h = t.height || ov.height; if (ov.width !== w) ov.width = w; if (ov.height !== h) ov.height = h; }
    this._w = ov.width; this._h = ov.height; ctx.clearRect(0, 0, this._w, this._h); ctx.lineWidth = Math.max(1, this._w / 800);
    const L = this.lines, m = this.camera.viewProjection; let cur = null; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const c = this.lineColors[i]; if (c !== cur) { ctx.stroke(); ctx.beginPath(); ctx.strokeStyle = c; cur = c; }
      const o = i * 6; let ax = L[o], ay = L[o + 1], az = L[o + 2], bx = L[o + 3], by = L[o + 4], bz = L[o + 5];
      let wa = m[3] * ax + m[7] * ay + m[11] * az + m[15], wb = m[3] * bx + m[7] * by + m[11] * bz + m[15]; const e = 1e-4;
      if (wa <= e && wb <= e) continue; // 両端がカメラ背後
      if (wa <= e) { const k = (e - wa) / (wb - wa); ax += (bx - ax) * k; ay += (by - ay) * k; az += (bz - az) * k; }
      else if (wb <= e) { const k = (e - wb) / (wa - wb); bx += (ax - bx) * k; by += (ay - by) * k; bz += (az - bz) * k; }
      const pa = this.project(ax, ay, az), x0 = pa[0], y0 = pa[1], pb = this.project(bx, by, bz); if (!pb) continue;
      ctx.moveTo(x0, y0); ctx.lineTo(pb[0], pb[1]);
    }
    ctx.stroke();
    if (this.texts.length) { ctx.font = Math.max(10, this._w / 90) + 'px monospace'; for (const tx of this.texts) { const p = this.project(tx.x, tx.y, tx.z); if (p) { ctx.fillStyle = tx.color; ctx.fillText(tx.str, p[0] + 4, p[1] - 4); } } }
    this.n = 0; this.texts.length = 0; this.lineColors.length = 0; return n;
  }
  dispose() { if (this._ownOverlay && this.overlay && this.overlay.parentElement) this.overlay.parentElement.removeChild(this.overlay); this.overlay = null; this.ctx = null; }
}
