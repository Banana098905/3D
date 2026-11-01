import { uid, parseColor } from './util.js';

/**
 * マテリアル。Blinn-Phong 風の単純な照明モデル。
 * unlit: true にすると照明を無視して color(+emissive) をそのまま出力する。
 */
export class Material {
  constructor(o = {}) {
    this.id = uid();
    this.name = o.name || '';
    this.color = parseColor(o.color === undefined ? 0xffffff : o.color, [1, 1, 1]);
    this.emissive = parseColor(o.emissive === undefined ? 0x000000 : o.emissive, [0, 0, 0]);
    this.opacity = o.opacity === undefined ? 1 : o.opacity;
    this.transparent = o.transparent === undefined ? this.opacity < 1 : !!o.transparent;
    this.map = o.map || null;
    this.vertexColors = !!o.vertexColors;
    this.unlit = !!o.unlit;
    this.specular = o.specular === undefined ? 0.15 : o.specular;
    this.shininess = o.shininess === undefined ? 32 : o.shininess;
    this.doubleSided = !!o.doubleSided;
    this.depthTest = o.depthTest !== false;
    this.depthWrite = o.depthWrite === undefined ? !this.transparent : !!o.depthWrite;
    this.alphaTest = o.alphaTest || 0;
    /** 'normal' | 'additive'（透明描画のときの合成方法。additive は光の粒・発光エフェクト向け） */
    this.blending = o.blending === 'additive' ? 'additive' : 'normal';
  }
  setColor(c) { parseColor(c, this.color); return this; }
  clone() { const m = new Material(this); m.color = this.color.slice(); m.emissive = this.emissive.slice(); return m; }
  dispose() { /* マテリアル自体はGPUリソースを持たない。テクスチャは別途 dispose。 */ }
}
