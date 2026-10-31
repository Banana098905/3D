import { clamp } from './util.js';

/** オービットカメラ操作: 左ドラッグ=回転 / 右ドラッグ・Shift+左=平行移動 / ホイール=ズーム / 2本指=ピンチとパン */
export class OrbitControls {
  constructor(camera, o = {}) {
    this.camera = camera; this.enabled = o.enabled !== false;
    this.target = Float64Array.from(o.target || [0, 0, 0]); this.distance = o.distance || 10; this.yaw = o.yaw === undefined ? 0.68 : o.yaw; this.pitch = o.pitch === undefined ? 0.5 : o.pitch;
    this.minDistance = o.minDistance || 0.3; this.maxDistance = o.maxDistance || 1e5; this.minPitch = o.minPitch === undefined ? -1.5 : o.minPitch; this.maxPitch = o.maxPitch === undefined ? 1.5 : o.maxPitch;
    this.rotateSpeed = o.rotateSpeed || 0.008; this.zoomSpeed = o.zoomSpeed || 0.001; this.panSpeed = o.panSpeed || 1;
    this._ptr = new Map(); this._canvas = null; this._h = {}; this._pinch = 0;
    this.update();
  }
  update() {
    const c = this.camera, d = this.distance, cp = Math.cos(this.pitch);
    c.position[0] = this.target[0] + d * cp * Math.sin(this.yaw); c.position[1] = this.target[1] + d * Math.sin(this.pitch); c.position[2] = this.target[2] + d * cp * Math.cos(this.yaw);
    c.lookAt(this.target[0], this.target[1], this.target[2]); return this;
  }
  rotate(dx, dy) { this.yaw -= dx * this.rotateSpeed; this.pitch = clamp(this.pitch + dy * this.rotateSpeed, this.minPitch, this.maxPitch); }
  zoom(factor) { this.distance = clamp(this.distance * factor, this.minDistance, this.maxDistance); }
  pan(dx, dy) {
    const h = Math.max(1, this._canvas ? this._canvas.clientHeight : 600), fov = (this.camera.fov || 50) * Math.PI / 180;
    const k = 2 * this.distance * Math.tan(fov / 2) / h * this.panSpeed, cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), sp = Math.sin(this.pitch), cp = Math.cos(this.pitch);
    const rx = cy, rz = -sy, ux = -sp * sy, uy = cp, uz = -sp * cy;
    this.target[0] += (-dx * rx + dy * ux) * k; this.target[1] += dy * uy * k; this.target[2] += (-dx * rz + dy * uz) * k;
  }
  /** 視点を物体群に合わせる */
  frame(center, radius) { this.target.set(center); this.distance = clamp(radius * 2.4, this.minDistance, this.maxDistance); this.update(); }
  attach(canvas) {
    this.detach(); this._canvas = canvas; const h = this._h;
    h.down = e => {
      if (!this.enabled) return; this._ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button, shift: e.shiftKey });
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { }
      if (this._ptr.size === 2) this._pinch = this._pinchDist();
    };
    h.move = e => {
      const p = this._ptr.get(e.pointerId); if (!p || !this.enabled) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (this._ptr.size >= 2) { const d = this._pinchDist(); if (this._pinch > 0 && d > 0) this.zoom(this._pinch / d); this._pinch = d; this.pan(dx / 2, dy / 2); }
      else if (p.button === 2 || p.shift || p.button === 1) this.pan(dx, dy); else this.rotate(dx, dy);
      this.update();
    };
    h.up = e => { this._ptr.delete(e.pointerId); this._pinch = 0; try { canvas.releasePointerCapture(e.pointerId); } catch (_) { } };
    h.wheel = e => { if (!this.enabled) return; e.preventDefault(); this.zoom(Math.exp(e.deltaY * this.zoomSpeed)); this.update(); };
    h.ctx = e => { if (this.enabled) e.preventDefault(); };
    canvas.addEventListener('pointerdown', h.down); canvas.addEventListener('pointermove', h.move); canvas.addEventListener('pointerup', h.up); canvas.addEventListener('pointercancel', h.up);
    canvas.addEventListener('wheel', h.wheel, { passive: false }); canvas.addEventListener('contextmenu', h.ctx);
    return this;
  }
  _pinchDist() { const a = Array.from(this._ptr.values()); return a.length < 2 ? 0 : Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
  detach() {
    const c = this._canvas, h = this._h; if (!c) return;
    c.removeEventListener('pointerdown', h.down); c.removeEventListener('pointermove', h.move); c.removeEventListener('pointerup', h.up); c.removeEventListener('pointercancel', h.up);
    c.removeEventListener('wheel', h.wheel); c.removeEventListener('contextmenu', h.ctx); this._canvas = null; this._ptr.clear();
  }
  dispose() { this.detach(); }
}
