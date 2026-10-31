import { uid, parseColor, MassiveEngineError } from './util.js';

/**
 * テクスチャ。source は HTMLImageElement / HTMLCanvasElement / ImageBitmap / {data:Uint8Array(RGBA), width, height}。
 * CPU側の source を保持するため、コンテキスト消失後も再アップロードできる。
 */
export class Texture {
  constructor(source = null, options = {}) {
    this.id = uid();
    this.name = options.name || '';
    this.source = null;
    this.width = 0; this.height = 0;
    this.wrapS = options.wrapS || 'repeat';
    this.wrapT = options.wrapT || 'repeat';
    this.minFilter = options.minFilter || 'mipmap'; // 'nearest' | 'linear' | 'mipmap'
    this.magFilter = options.magFilter || 'linear'; // 'nearest' | 'linear'
    this.flipY = options.flipY !== false;
    this.version = 0;
    this.url = options.url || null;
    this.params = options.params || null; // 手続き型テクスチャの生成条件（シーンJSON用）
    this.error = null;
    this.ready = false;
    this.loaded = Promise.resolve(this);
    this._gpu = new Map();
    if (source) this.setSource(source);
  }
  setSource(source) {
    if (source && source.data) {
      if (!(source.data instanceof Uint8Array || source.data instanceof Uint8ClampedArray) || source.data.length !== source.width * source.height * 4) throw new RangeError('Texture: {data,width,height} は RGBA8 (width*height*4 バイト) が必要です。');
      this.width = source.width; this.height = source.height;
    } else if (source) {
      this.width = source.naturalWidth || source.videoWidth || source.width || 0; this.height = source.naturalHeight || source.videoHeight || source.height || 0;
      if (!this.width || !this.height) throw new RangeError('Texture: 画像サイズが 0 です（読み込み前の画像では Texture.fromURL を使用）。');
    }
    this.source = source; this.ready = !!source; this.version++;
    return this;
  }
  needsUpdate() { this.version++; return this; }
  get byteSize() { return this.width * this.height * 4 * (this.minFilter === 'mipmap' ? 4 / 3 : 1); }
  dispose() { for (const r of Array.from(this._gpu.keys())) r._freeTexture(this); this._gpu.clear(); }

  /** URL から非同期読み込み。返り値はすぐ使える（読み込み完了までは白）。完了は texture.loaded (Promise)。 */
  static fromURL(url, options = {}) {
    const tex = new Texture(null, Object.assign({ url }, options));
    if (typeof Image === 'undefined') { tex.error = new MassiveEngineError('Image が利用できない環境です。', 'E_TEXTURE_LOAD'); tex.loaded = Promise.reject(tex.error); tex.loaded.catch(() => {}); return tex; }
    tex.loaded = new Promise((resolve, reject) => {
      const img = new Image();
      if (options.crossOrigin !== null) img.crossOrigin = options.crossOrigin || 'anonymous';
      img.onload = () => { try { tex.setSource(img); resolve(tex); } catch (e) { tex.error = e; reject(e); } };
      img.onerror = () => { tex.error = new MassiveEngineError('テクスチャを読み込めません: ' + url, 'E_TEXTURE_LOAD'); reject(tex.error); };
      img.src = url;
    });
    tex.loaded.catch(() => {});
    return tex;
  }
  static fromCanvas(canvas, options) { return new Texture(canvas, options); }
  static solid(color = '#ffffff', options) {
    const c = parseColor(color); const data = new Uint8Array([Math.round(c[0] * 255), Math.round(c[1] * 255), Math.round(c[2] * 255), 255]);
    return new Texture({ data, width: 1, height: 1 }, Object.assign({ minFilter: 'nearest', magFilter: 'nearest' }, options));
  }
  /** 手続き型チェッカー。画像ファイル不要で動作確認できる。 */
  static checker(size = 64, cells = 8, colorA = '#ffffff', colorB = '#8890a0', options) {
    const a = parseColor(colorA), b = parseColor(colorB), data = new Uint8Array(size * size * 4), cs = size / cells;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const c = ((Math.floor(x / cs) + Math.floor(y / cs)) & 1) ? b : a, i = (y * size + x) * 4;
      data[i] = c[0] * 255; data[i + 1] = c[1] * 255; data[i + 2] = c[2] * 255; data[i + 3] = 255;
    }
    return new Texture({ data, width: size, height: size }, Object.assign({ name: 'checker', params: { type: 'checker', size, cells, colorA, colorB } }, options));
  }
}
