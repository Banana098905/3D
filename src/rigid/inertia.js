/*
 * 剛体の質量・慣性の計算（一様密度）。形状座標系 = 剛体座標系（重心オフセットは非対応）。
 *
 * 慣性テンソルは主軸が剛体のローカル軸に一致する対角行列 diag(Ix, Iy, Iz) として扱う（球・箱・カプセル(軸=ローカルY) はすべて厳密にそうなる）。
 *   球      I = 2/5 m r²                       （厳密）
 *   箱      Ix = m/3 (hy² + hz²) ほか           （厳密）
 *   カプセル 円柱 + 2 半球（体積比で質量を配分）。半球の重心まわりの慣性 83/320 m r² と平行軸の定理を使うため厳密（一様密度）。
 * ワールド空間の逆慣性テンソルは  Iw⁻¹ = R · diag(1/Ix, 1/Iy, 1/Iz) · Rᵀ。
 */
import { SHAPE_SPHERE, SHAPE_OBB, SHAPE_AABB, SHAPE_CAPSULE } from '../collision/shapes.js';

/** 形状の体積（平面は無限なので 0 を返す）。par は [r] / [hx,hy,hz] / [r, halfLength]。 */
export function shapeVolume(type, par, qi = 0) {
  switch (type) {
    case SHAPE_SPHERE: return (4 / 3) * Math.PI * par[qi] ** 3;
    case SHAPE_AABB: case SHAPE_OBB: return 8 * par[qi] * par[qi + 1] * par[qi + 2];
    case SHAPE_CAPSULE: { const r = par[qi], h = par[qi + 1]; return Math.PI * r * r * 2 * h + (4 / 3) * Math.PI * r * r * r; }
    default: return 0;
  }
}

/** 質量 mass の一様密度物体の主慣性モーメント (Ix,Iy,Iz) を out[0..2] に書く。 */
export function computeLocalInertia(type, par, qi, mass, out) {
  switch (type) {
    case SHAPE_SPHERE: { const r = par[qi], i = 0.4 * mass * r * r; out[0] = out[1] = out[2] = i; break; }
    case SHAPE_AABB: case SHAPE_OBB: {
      const hx = par[qi], hy = par[qi + 1], hz = par[qi + 2], k = mass / 3;
      out[0] = k * (hy * hy + hz * hz); out[1] = k * (hx * hx + hz * hz); out[2] = k * (hx * hx + hy * hy); break;
    }
    case SHAPE_CAPSULE: {
      const r = par[qi], hl = par[qi + 1], L = 2 * hl, vc = Math.PI * r * r * L, vs = (4 / 3) * Math.PI * r * r * r;
      const mc = mass * vc / (vc + vs), ms = mass - mc;
      out[1] = mc * r * r / 2 + ms * 0.4 * r * r;
      const d = hl + 3 * r / 8, ix = mc * (r * r / 4 + L * L / 12) + ms * (83 / 320 * r * r + d * d);
      out[0] = out[2] = ix; break;
    }
    default: out[0] = out[1] = out[2] = Infinity;
  }
  return out;
}

/** R（列 = ローカル X,Y,Z 軸のワールド表現, 9 要素）と対角の逆慣性 (ix,iy,iz) から、ワールドの逆慣性テンソル（対称 3x3, 行優先 9 要素）を o に書く。 */
export function worldInvInertia(R, r, ix, iy, iz, out, o) {
  const a0 = R[r], a1 = R[r + 1], a2 = R[r + 2], b0 = R[r + 3], b1 = R[r + 4], b2 = R[r + 5], c0 = R[r + 6], c1 = R[r + 7], c2 = R[r + 8];
  out[o] = ix * a0 * a0 + iy * b0 * b0 + iz * c0 * c0;
  out[o + 1] = out[o + 3] = ix * a0 * a1 + iy * b0 * b1 + iz * c0 * c1;
  out[o + 2] = out[o + 6] = ix * a0 * a2 + iy * b0 * b2 + iz * c0 * c2;
  out[o + 4] = ix * a1 * a1 + iy * b1 * b1 + iz * c1 * c1;
  out[o + 5] = out[o + 7] = ix * a1 * a2 + iy * b1 * b2 + iz * c1 * c2;
  out[o + 8] = ix * a2 * a2 + iy * b2 * b2 + iz * c2 * c2;
  return out;
}
