import { rng } from '../../src/util.js';
export function makeRand(seed) {
  const R = rng(seed), rr = (a, b) => a + (b - a) * R();
  const randQuat = () => { const u = [R(), R(), R()], a = Math.sqrt(1 - u[0]), b = Math.sqrt(u[0]); return [a * Math.sin(2 * Math.PI * u[1]), a * Math.cos(2 * Math.PI * u[1]), b * Math.sin(2 * Math.PI * u[2]), b * Math.cos(2 * Math.PI * u[2])]; };
  const axesOf = ([x, y, z, w]) => [[1 - 2 * (y * y + z * z), 2 * (x * y + w * z), 2 * (x * z - w * y)], [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)], [2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)]];
  /** 衝突体記述(desc)と GJK 用の参照形状(ref)の組を返す */
  const shape = (t, range = 2) => {
    const pos = [rr(-range, range), rr(-range, range), rr(-range, range)], q = randQuat();
    if (t === 'sphere') { const r = rr(0.3, 1.5); return { desc: { type: 'sphere', radius: r, position: pos }, ref: { type: 'sphere', c: pos, r } }; }
    if (t === 'aabb') { const h = [rr(0.2, 1.5), rr(0.2, 1.5), rr(0.2, 1.5)]; return { desc: { type: 'aabb', halfExtents: h, position: pos }, ref: { type: 'box', c: pos, h } }; }
    if (t === 'obb') { const h = [rr(0.2, 1.5), rr(0.2, 1.5), rr(0.2, 1.5)]; return { desc: { type: 'obb', halfExtents: h, position: pos, rotation: q }, ref: { type: 'box', c: pos, h, axes: axesOf(q) } }; }
    const r = rr(0.2, 0.9), hl = rr(0, 1.3); return { desc: { type: 'capsule', radius: r, halfLength: hl, position: pos, rotation: q }, ref: { type: 'capsule', c: pos, r, hl, axes: axesOf(q) } };
  };
  return { R, rr, randQuat, axesOf, shape };
}
