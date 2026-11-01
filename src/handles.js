/*
 * 世代(generation)付きハンドルと、それを使ったオブジェクトプール。
 *
 * 目的: 「削除したオブジェクトのIDを持ち続けているコード」が、同じスロットに再利用された
 *       別のオブジェクトを誤って操作する事故を防ぐ。
 *
 * ハンドル = generation * 2^22 + index （数値 1 個。index は 0〜4,194,303、generation は 1 から）。
 *   - handle === 0 は常に無効。
 *   - スロットが解放されるたびに generation が +1 されるので、古いハンドルは isValid() で必ず false になる。
 *   - generation は 2^30 まで。到達したスロットは「退役」させ、二度と再利用しない（古いハンドルとの衝突を完全に防ぐ）。
 */

export const HANDLE_INDEX_BITS = 22;
export const HANDLE_INDEX_LIMIT = 1 << HANDLE_INDEX_BITS; // 4,194,304
const GEN_LIMIT = 1 << 30;

/** ハンドルから index を取り出す（無効かどうかは検証しない。検証は isValid）。 */
export const handleIndex = h => h % HANDLE_INDEX_LIMIT;
export const handleGeneration = h => Math.floor(h / HANDLE_INDEX_LIMIT);

export class HandleAllocator {
  constructor(initialCapacity = 64) {
    this.capacity = 0; this.gens = new Uint32Array(0); this.state = new Uint8Array(0); // state: 0=空き 1=使用中 2=退役
    this.freeStack = new Int32Array(0); this.freeTop = 0; this.nextFresh = 0; this.liveCount = 0; this.retired = 0;
    this._grow(Math.max(4, initialCapacity | 0));
  }
  _grow(n) {
    if (n <= this.capacity) return;
    if (n > HANDLE_INDEX_LIMIT) throw new RangeError('HandleAllocator: 最大 ' + HANDLE_INDEX_LIMIT + ' 個までです。');
    const cap = Math.min(HANDLE_INDEX_LIMIT, Math.max(n, this.capacity * 2));
    const g = new Uint32Array(cap); g.set(this.gens); this.gens = g;
    const s = new Uint8Array(cap); s.set(this.state); this.state = s;
    const f = new Int32Array(cap); f.set(this.freeStack.subarray(0, this.freeTop)); this.freeStack = f;
    this.capacity = cap;
  }
  /** 新しいハンドルを返す。再利用されるスロットでは generation が進んでいる。 */
  alloc() {
    let idx;
    if (this.freeTop > 0) idx = this.freeStack[--this.freeTop];
    else { if (this.nextFresh >= this.capacity) this._grow(this.capacity + 1); idx = this.nextFresh++; this.gens[idx] = 1; }
    this.state[idx] = 1; this.liveCount++;
    return this.gens[idx] * HANDLE_INDEX_LIMIT + idx;
  }
  isValid(h) {
    if (!(h > 0)) return false;
    const idx = h % HANDLE_INDEX_LIMIT;
    return idx < this.nextFresh && this.state[idx] === 1 && this.gens[idx] * HANDLE_INDEX_LIMIT + idx === h;
  }
  /** 有効なら index、無効なら -1。 */
  indexOf(h) { return this.isValid(h) ? h % HANDLE_INDEX_LIMIT : -1; }
  handleAt(idx) { return (idx >= 0 && idx < this.nextFresh && this.state[idx] === 1) ? this.gens[idx] * HANDLE_INDEX_LIMIT + idx : 0; }
  isIndexLive(idx) { return idx >= 0 && idx < this.nextFresh && this.state[idx] === 1; }
  /** @returns {boolean} 解放できたか（無効・二重解放は false） */
  free(h) {
    if (!this.isValid(h)) return false;
    const idx = h % HANDLE_INDEX_LIMIT;
    this.liveCount--;
    if (++this.gens[idx] >= GEN_LIMIT) { this.state[idx] = 2; this.retired++; } // 退役: 再利用しない
    else { this.state[idx] = 0; this.freeStack[this.freeTop++] = idx; }
    return true;
  }
  /** 全ハンドルを無効化する。generation は進めるので、clear 前に発行したハンドルが後で有効になることはない。 */
  clear() {
    for (let i = 0; i < this.nextFresh; i++) if (this.state[i] === 1) {
      if (++this.gens[i] >= GEN_LIMIT) { this.state[i] = 2; this.retired++; } else { this.state[i] = 0; this.freeStack[this.freeTop++] = i; }
    }
    this.liveCount = 0;
  }
  get highWaterMark() { return this.nextFresh; }
}

/**
 * ハンドルでアクセスするオブジェクトプール。
 * - acquire() は解放済みスロットのオブジェクトを再利用する（reset で初期化）。確保は「ピーク同時数」まで。
 * - 一括操作: acquireMany / releaseMany / setActiveMany / forEachActive
 * - active=false のオブジェクトは forEachActive から外れる（削除せず一時停止したいとき）。
 */
export class HandlePool {
  /**
   * @param {() => any} create  新規オブジェクトを作る関数
   * @param {(o:any) => void} [reset]  再利用時に呼ぶ初期化関数
   */
  constructor(create, reset = null, { initialCapacity = 64, maxCapacity = HANDLE_INDEX_LIMIT } = {}) {
    if (typeof create !== 'function') throw new TypeError('HandlePool: create は関数が必要です。');
    this._create = create; this._reset = reset; this.maxCapacity = maxCapacity;
    this.alloc = new HandleAllocator(initialCapacity);
    this.items = []; this.active = new Uint8Array(this.alloc.capacity); this.created = 0; this.reused = 0;
  }
  get liveCount() { return this.alloc.liveCount; }
  get capacity() { return this.items.length; }
  acquire() {
    if (this.alloc.liveCount >= this.maxCapacity) throw new RangeError('HandlePool: maxCapacity(' + this.maxCapacity + ') を超えました。');
    const h = this.alloc.alloc(), idx = h % HANDLE_INDEX_LIMIT;
    if (this.active.length < this.alloc.capacity) { const a = new Uint8Array(this.alloc.capacity); a.set(this.active); this.active = a; }
    if (idx < this.items.length && this.items[idx] !== undefined) { this.reused++; if (this._reset) this._reset(this.items[idx]); }
    else { this.created++; this.items[idx] = this._create(); }
    this.active[idx] = 1; return h;
  }
  /** n 個まとめて確保し、ハンドルを out（省略時は新しい配列）へ書く。 */
  acquireMany(n, out = []) { for (let i = 0; i < n; i++) out[i] = this.acquire(); out.length = n; return out; }
  /** 無効なハンドルなら null（古い参照が別オブジェクトを指すことはない）。 */
  get(h) { const i = this.alloc.indexOf(h); return i < 0 ? null : this.items[i]; }
  isValid(h) { return this.alloc.isValid(h); }
  release(h) { const i = this.alloc.indexOf(h); if (i < 0) return false; this.active[i] = 0; return this.alloc.free(h); }
  releaseMany(handles) { let n = 0; for (let i = 0; i < handles.length; i++) if (this.release(handles[i])) n++; return n; }
  setActive(h, on) { const i = this.alloc.indexOf(h); if (i < 0) return false; this.active[i] = on ? 1 : 0; return true; }
  setActiveMany(handles, on) { let n = 0; for (let i = 0; i < handles.length; i++) if (this.setActive(handles[i], on)) n++; return n; }
  isActive(h) { const i = this.alloc.indexOf(h); return i >= 0 && this.active[i] === 1; }
  /** fn(obj, handle)。使用中かつ active のものだけ。 */
  forEachActive(fn) {
    const a = this.alloc, n = a.nextFresh;
    for (let i = 0; i < n; i++) if (a.state[i] === 1 && this.active[i] === 1) fn(this.items[i], a.gens[i] * HANDLE_INDEX_LIMIT + i);
  }
  clear() { this.alloc.clear(); this.active.fill(0); }
  stats() { return { live: this.alloc.liveCount, slots: this.items.length, created: this.created, reused: this.reused, retired: this.alloc.retired }; }
}
