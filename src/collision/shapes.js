/*
 * 衝突形状の定義。CollisionWorld は形状をオブジェクトではなく Structure-of-Arrays で保持する（大量の衝突体でもGCが発生しない）。
 *
 * 形状ごとの par[4] の意味:
 *   SPHERE : [radius]
 *   AABB   : [hx, hy, hz]            回転しない箱（半径方向の半サイズ）。ワールド軸に平行。
 *   OBB    : [hx, hy, hz]            回転する箱。rotation クォータニオンで向きを指定。
 *   CAPSULE: [radius, halfLength]    軸はローカル Y。halfLength は円筒部分の半分の長さ（半球は含まない）。
 *   PLANE  : [nx, ny, nz, d]         n·x = d。n 側が「外」、反対側が「中身（ソリッド）」。無限平面。
 *
 * rotm[9]: 回転行列の列ベクトル（ローカル X, Y, Z 軸のワールド表現）を [ax.x ax.y ax.z, ay.x ay.y ay.z, az.x az.y az.z] の順に保持。
 */
export const SHAPE_SPHERE = 0, SHAPE_AABB = 1, SHAPE_OBB = 2, SHAPE_CAPSULE = 3, SHAPE_PLANE = 4;
export const SHAPE_NAMES = ['sphere', 'aabb', 'obb', 'capsule', 'plane'];
export const SHAPE_BY_NAME = { sphere: SHAPE_SPHERE, aabb: SHAPE_AABB, box: SHAPE_AABB, obb: SHAPE_OBB, capsule: SHAPE_CAPSULE, plane: SHAPE_PLANE };

/** クォータニオン (x,y,z,w) → 回転行列の列ベクトル 9 要素を out[o..o+8] へ。正規化されていなくても単位化して使う。 */
export function quatToAxes(x, y, z, w, out, o) {
  const l = Math.hypot(x, y, z, w);
  if (l < 1e-12) { x = 0; y = 0; z = 0; w = 1; } else if (Math.abs(l - 1) > 1e-12) { x /= l; y /= l; z /= l; w /= l; }
  const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  out[o] = 1 - 2 * (yy + zz); out[o + 1] = 2 * (xy + wz); out[o + 2] = 2 * (xz - wy);
  out[o + 3] = 2 * (xy - wz); out[o + 4] = 1 - 2 * (xx + zz); out[o + 5] = 2 * (yz + wx);
  out[o + 6] = 2 * (xz + wy); out[o + 7] = 2 * (yz - wx); out[o + 8] = 1 - 2 * (xx + yy);
}

export const HUGE = 1e30;

/**
 * 形状のワールド AABB を out[o..o+5] = [minx,miny,minz,maxx,maxy,maxz] に書く。
 * 平面は無限なので ±HUGE（ブロードフェーズには入れず別扱い）。
 */
export function computeAABB(type, pos, pi, par, qi, rotm, ri, out, o) {
  const x = pos[pi], y = pos[pi + 1], z = pos[pi + 2];
  let ex, ey, ez;
  switch (type) {
    case SHAPE_SPHERE: ex = ey = ez = par[qi]; break;
    case SHAPE_AABB: ex = par[qi]; ey = par[qi + 1]; ez = par[qi + 2]; break;
    case SHAPE_OBB: {
      const hx = par[qi], hy = par[qi + 1], hz = par[qi + 2];
      ex = Math.abs(rotm[ri]) * hx + Math.abs(rotm[ri + 3]) * hy + Math.abs(rotm[ri + 6]) * hz;
      ey = Math.abs(rotm[ri + 1]) * hx + Math.abs(rotm[ri + 4]) * hy + Math.abs(rotm[ri + 7]) * hz;
      ez = Math.abs(rotm[ri + 2]) * hx + Math.abs(rotm[ri + 5]) * hy + Math.abs(rotm[ri + 8]) * hz; break;
    }
    case SHAPE_CAPSULE: {
      const r = par[qi], h = par[qi + 1];
      ex = Math.abs(rotm[ri + 3]) * h + r; ey = Math.abs(rotm[ri + 4]) * h + r; ez = Math.abs(rotm[ri + 5]) * h + r; break;
    }
    default: out[o] = out[o + 1] = out[o + 2] = -HUGE; out[o + 3] = out[o + 4] = out[o + 5] = HUGE; return;
  }
  out[o] = x - ex; out[o + 1] = y - ey; out[o + 2] = z - ez; out[o + 3] = x + ex; out[o + 4] = y + ey; out[o + 5] = z + ez;
}
