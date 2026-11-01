/*
 * 入力管理: キーボード / マウス / ポインタ / タッチ / ゲームパッド と、アクションマッピング。
 *
 *   const input = new InputManager({ element: canvas, keyTarget: window });
 *   input.bindAction('jump', ['key:Space', 'pad:button:0', 'mouse:0']);
 *   input.bindAxis('moveX', { negative: ['key:KeyA','key:ArrowLeft'], positive: ['key:KeyD','key:ArrowRight'], pad: 0 }); // pad: ゲームパッド軸番号
 *   // 毎フレームの先頭で input.poll()（ゲームパッド取得）、末尾で input.endFrame()（pressed/released を消す）
 *   if (input.actionPressed('jump')) ...;  const mx = input.axis('moveX');
 *
 * 入力ソース記法: 'key:<KeyboardEvent.code>' | 'mouse:<button番号>' | 'pad:button:<番号>' | 'touch'（1 本以上の指が触れている）
 * 対象は addEventListener を持つ任意のオブジェクト（テストでは EventTarget の偽物を使える）。
 */
export class InputManager {
  constructor({ element = null, keyTarget = null, gamepads = true, deadzone = 0.15, preventContextMenu = false } = {}) {
    this.element = element; this.keyTarget = keyTarget || (typeof window !== 'undefined' ? window : null);
    this.keys = new Set(); this.keysPressed = new Set(); this.keysReleased = new Set();
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, wheel: 0, buttons: 0, pressed: 0, released: 0 };
    this.touches = new Map(); // pointerId -> {x,y,startX,startY,type}
    this.pad = { connected: false, buttons: [], axes: [], buttonsPressed: [], id: '' };
    this._prevPadButtons = []; this.deadzone = deadzone; this.gamepads = gamepads; this.actions = new Map(); this.axes = new Map();
    this._off = []; this.disposed = false; this._preventContextMenu = preventContextMenu;
    this._bind();
  }
  _on(t, type, fn, opt) { if (!t || !t.addEventListener) return; t.addEventListener(type, fn, opt); this._off.push(() => t.removeEventListener(type, fn, opt)); }
  _pos(e) { const el = this.element; let x = e.clientX || 0, y = e.clientY || 0; if (el && el.getBoundingClientRect) { const r = el.getBoundingClientRect(); x -= r.left; y -= r.top; } return [x, y]; }
  _bind() {
    const kt = this.keyTarget, el = this.element;
    this._on(kt, 'keydown', e => { if (!this.keys.has(e.code)) this.keysPressed.add(e.code); this.keys.add(e.code); });
    this._on(kt, 'keyup', e => { this.keys.delete(e.code); this.keysReleased.add(e.code); });
    this._on(kt, 'blur', () => { this.keys.clear(); this.mouse.buttons = 0; this.touches.clear(); }); // フォーカス喪失で押しっぱなしを防ぐ
    this._on(el, 'pointerdown', e => {
      const [x, y] = this._pos(e);
      if (e.pointerType === 'touch') this.touches.set(e.pointerId, { x, y, startX: x, startY: y, type: 'touch' });
      else { this.mouse.buttons |= 1 << (e.button | 0); this.mouse.pressed |= 1 << (e.button | 0); }
      this.mouse.x = x; this.mouse.y = y;
    });
    this._on(el, 'pointermove', e => {
      const [x, y] = this._pos(e);
      if (e.pointerType === 'touch') { const t = this.touches.get(e.pointerId); if (t) { t.x = x; t.y = y; } }
      else { this.mouse.dx += e.movementX !== undefined ? e.movementX : x - this.mouse.x; this.mouse.dy += e.movementY !== undefined ? e.movementY : y - this.mouse.y; }
      this.mouse.x = x; this.mouse.y = y;
    });
    const up = e => { if (e.pointerType === 'touch') this.touches.delete(e.pointerId); else { this.mouse.buttons &= ~(1 << (e.button | 0)); this.mouse.released |= 1 << (e.button | 0); } };
    this._on(el, 'pointerup', up); this._on(el, 'pointercancel', up);
    this._on(el, 'wheel', e => { this.mouse.wheel += e.deltaY || 0; });
    if (this._preventContextMenu) this._on(el, 'contextmenu', e => e.preventDefault && e.preventDefault());
  }
  /* ---- 状態 ---- */
  isKeyDown(code) { return this.keys.has(code); }
  wasKeyPressed(code) { return this.keysPressed.has(code); }
  wasKeyReleased(code) { return this.keysReleased.has(code); }
  isMouseDown(b = 0) { return (this.mouse.buttons >> b & 1) === 1; }
  wasMousePressed(b = 0) { return (this.mouse.pressed >> b & 1) === 1; }
  wasMouseReleased(b = 0) { return (this.mouse.released >> b & 1) === 1; }
  get touchCount() { return this.touches.size; }
  /** ゲームパッドを読む（毎フレーム 1 回）。API が無い環境では何もしない。 */
  poll() {
    if (!this.gamepads || typeof navigator === 'undefined' || !navigator.getGamepads) return this;
    let gp = null; const list = navigator.getGamepads(); for (let i = 0; i < list.length; i++) if (list[i] && list[i].connected) { gp = list[i]; break; }
    const p = this.pad;
    if (!gp) { p.connected = false; p.buttons.length = 0; p.axes.length = 0; p.buttonsPressed.length = 0; this._prevPadButtons.length = 0; return this; }
    p.connected = true; p.id = gp.id; p.axes.length = gp.axes.length; p.buttons.length = gp.buttons.length; p.buttonsPressed.length = gp.buttons.length;
    for (let i = 0; i < gp.axes.length; i++) p.axes[i] = Math.abs(gp.axes[i]) < this.deadzone ? 0 : gp.axes[i];
    for (let i = 0; i < gp.buttons.length; i++) { const d = gp.buttons[i].pressed; p.buttonsPressed[i] = d && !this._prevPadButtons[i]; p.buttons[i] = d; this._prevPadButtons[i] = d; }
    return this;
  }
  /** フレーム末尾で呼ぶ: そのフレームだけ真の pressed/released と、マウス差分を消す。 */
  endFrame() { this.keysPressed.clear(); this.keysReleased.clear(); this.mouse.dx = this.mouse.dy = this.mouse.wheel = 0; this.mouse.pressed = this.mouse.released = 0; return this; }
  /* ---- アクション ---- */
  bindAction(name, sources) { this.actions.set(name, Array.isArray(sources) ? sources.slice() : [sources]); return this; }
  unbindAction(name) { return this.actions.delete(name); }
  _src(s, mode) { // mode: 'down' | 'pressed' | 'released'
    const p = s.split(':');
    switch (p[0]) {
      case 'key': return mode === 'down' ? this.keys.has(p[1]) : mode === 'pressed' ? this.keysPressed.has(p[1]) : this.keysReleased.has(p[1]);
      case 'mouse': { const b = +p[1] | 0; return mode === 'down' ? this.isMouseDown(b) : mode === 'pressed' ? this.wasMousePressed(b) : this.wasMouseReleased(b); }
      case 'pad': { const b = +p[2] | 0; return mode === 'down' ? !!this.pad.buttons[b] : mode === 'pressed' ? !!this.pad.buttonsPressed[b] : false; }
      case 'touch': return mode === 'down' && this.touches.size > 0;
      default: throw new RangeError('未知の入力ソース: ' + s);
    }
  }
  _act(name, mode) { const a = this.actions.get(name); if (!a) return false; for (let i = 0; i < a.length; i++) if (this._src(a[i], mode)) return true; return false; }
  actionDown(name) { return this._act(name, 'down'); }
  actionPressed(name) { return this._act(name, 'pressed'); }
  actionReleased(name) { return this._act(name, 'released'); }
  bindAxis(name, def) { this.axes.set(name, def); return this; }
  /** -1..1。キーの負/正 とゲームパッド軸のうち絶対値が大きい方。 */
  axis(name) {
    const d = this.axes.get(name); if (!d) return 0;
    let v = 0; for (const s of d.negative || []) if (this._src(s, 'down')) { v -= 1; break; }
    for (const s of d.positive || []) if (this._src(s, 'down')) { v += 1; break; }
    if (d.pad !== undefined) { const a = this.pad.axes[d.pad] || 0; if (Math.abs(a) > Math.abs(v)) v = a; }
    return v < -1 ? -1 : v > 1 ? 1 : v;
  }
  dispose() { if (this.disposed) return; this.disposed = true; for (const f of this._off) f(); this._off.length = 0; this.keys.clear(); this.touches.clear(); }
}
