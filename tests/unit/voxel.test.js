import test from 'node:test';
import assert from 'node:assert/strict';
import { VoxelWorld } from '../../src/voxel.js';
import { JobQueue, rng } from '../../src/util.js';

const mk = o => new VoxelWorld(Object.assign({ chunkSize: 8, palette: [null, '#888', '#4a4', '#a64'] }, o));

test('単一ブロックは6面、隣接2個は10面、除去で元に戻る', () => {
  const v = mk(); v.setBlock(1, 1, 1, 1); v.flush(); assert.equal(v.stats.faces, 6); assert.equal(v.stats.triangles, 12);
  v.setBlock(2, 1, 1, 1); v.flush(); assert.equal(v.stats.faces, 10);
  v.setBlock(2, 1, 1, 0); v.flush(); assert.equal(v.stats.faces, 6);
  v.setBlock(1, 1, 1, 0); v.flush(); assert.equal(v.stats.faces, 0); assert.equal(v.stats.meshedChunks, 0); assert.equal(v.root.children.length, 0);
});

test('チャンク境界: 負座標・隣接チャンクの面が隠れ、境界の編集で隣も再構築される', () => {
  const v = mk(); v.setBlock(7, 0, 0, 1); v.setBlock(8, 0, 0, 1); v.flush(); assert.equal(v.stats.faces, 10); assert.equal(v.chunks.size, 2);
  v.setBlock(-1, -1, -1, 2); v.flush(); assert.equal(v.getBlock(-1, -1, -1), 2); assert.equal(v.getBlock(0, 0, 0), 0); assert.equal(v.chunks.size, 3);
  v.setBlock(8, 0, 0, 0); assert.equal(v.chunks.get('0,0,0').dirty, true, '境界編集で隣接チャンクもダーティ'); v.flush(); assert.equal(v.stats.faces, 12);
  assert.equal(v.stats.dirty, 0);
});

test('入力検証と変更なしの判定', () => {
  const v = mk(); assert.throws(() => v.setBlock(0.5, 0, 0, 1), TypeError); assert.throws(() => v.setBlock(0, 0, 0, 300), RangeError); assert.throws(() => new VoxelWorld({ chunkSize: 1 }), RangeError);
  assert.equal(v.setBlock(0, 0, 0, 0), false); assert.equal(v.setBlock(0, 0, 0, 1), true); assert.equal(v.setBlock(0, 0, 0, 1), false);
  v.dispose(); assert.throws(() => v.setBlock(0, 0, 0, 1), /破棄済み/); v.dispose();
});

test('メッシュ: 頂点色=パレット色×面の明るさ、法線は外向き、インデックスは範囲内', () => {
  const v = mk(); v.setBlock(0, 0, 0, 2); v.flush(); const g = v.chunks.get('0,0,0').mesh.geometry;
  assert.equal(g.vertexCount, 24); assert.equal(g.indices.length, 36);
  const top = []; for (let i = 0; i < g.vertexCount; i++) if (g.normals[i * 3 + 1] === 1) top.push(g.colors[i * 3 + 1]);
  const bottom = []; for (let i = 0; i < g.vertexCount; i++) if (g.normals[i * 3 + 1] === -1) bottom.push(g.colors[i * 3 + 1]);
  assert.ok(top[0] > bottom[0] * 1.5);
  for (let t = 0; t < 36; t += 3) { const a = g.indices[t] * 3, b = g.indices[t + 1] * 3, c = g.indices[t + 2] * 3, p = g.positions;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; assert.ok(nx * g.normals[a] + ny * g.normals[a + 1] + nz * g.normals[a + 2] > 0); }
});

test('透明ブロックは隣接面を隠さない', () => {
  const v = mk({ transparentIds: [3] }); v.setBlock(0, 0, 0, 1); v.setBlock(1, 0, 0, 3); v.flush();
  assert.equal(v.stats.faces, 6 + 5, '不透明ブロックは6面すべて見える（隣が透明）。透明ブロックは不透明に接する面だけ隠れて5面');
});

test('DDA レイキャスト: 命中ブロック・面法線・距離・ミス・最大距離', () => {
  const v = mk(); v.setBlock(5, 0, 0, 1); v.setBlock(-3, 2, 4, 2);
  let h = v.raycast([0.5, 0.5, 0.5], [1, 0, 0]); assert.deepEqual([h.x, h.y, h.z, h.id], [5, 0, 0, 1]); assert.deepEqual(h.normal, [-1, 0, 0]); assert.ok(Math.abs(h.distance - 4.5) < 1e-9);
  h = v.raycast([-2.5, 2.5, 10], [0, 0, -1]); assert.deepEqual([h.x, h.y, h.z], [-3, 2, 4]); assert.deepEqual(h.normal, [0, 0, 1]);
  h = v.raycast([-2.5, 9, 4.5], [0, -1, 0]); assert.deepEqual(h.normal, [0, 1, 0]);
  assert.equal(v.raycast([0.5, 0.5, 0.5], [-1, 0, 0]), null); assert.equal(v.raycast([0.5, 0.5, 0.5], [1, 0, 0], 3), null); assert.equal(v.raycast([0, 0, 0], [0, 0, 0]), null);
  h = v.raycast([5.5, 0.5, 0.5], [1, 0, 0]); assert.equal(h.distance, 0, '内部から開始');
});

test('DDA は微小ステップ走査の結果と一致する（ランダム地形×ランダムレイ）', () => {
  const v = mk({ chunkSize: 16 }), r = rng(5);
  for (let x = -12; x < 12; x++) for (let z = -12; z < 12; z++) { const h = Math.floor(2 + 3 * Math.sin(x * 0.4) * Math.cos(z * 0.3) + r() * 2); for (let y = -4; y < h; y++) v.setBlock(x, y, z, 1 + (y & 1)); }
  let checked = 0, hits = 0;
  for (let k = 0; k < 400; k++) {
    const o = [(r() - 0.5) * 20, 8 + r() * 4, (r() - 0.5) * 20], d = [(r() - 0.5) * 2, -0.2 - r(), (r() - 0.5) * 2], l = Math.hypot(...d), dd = d.map(c => c / l);
    const dda = v.raycast(o, dd, 40); let ref = null;
    for (let t = 0; t < 40; t += 0.002) { const p = [o[0] + dd[0] * t, o[1] + dd[1] * t, o[2] + dd[2] * t]; if (v.getBlock(Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2])) !== 0) { ref = { t, b: [Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2])] }; break; } }
    checked++; if (!ref) { assert.equal(dda, null); continue; } hits++;
    assert.ok(dda, '参照は命中、DDA はミス'); assert.deepEqual([dda.x, dda.y, dda.z], ref.b); assert.ok(Math.abs(dda.distance - ref.t) < 0.01);
  }
  assert.ok(hits > 100, 'ヒット数 ' + hits + '/' + checked);
});

test('JobQueue 連携: 予算を細切れにして完了し、再構築中の編集後も最終結果が整合する', () => {
  const jobs = new JobQueue(), v = mk({ jobs, chunkSize: 16 });
  v.generate([0, 0, 0], [16, 16, 16], (x, y) => (y < 8 ? 1 : 0)); assert.ok(jobs.pending >= 1);
  let frames = 0; v.setBlock(3, 12, 3, 2); while (jobs.pending && frames < 1000) { jobs.run(0, e => { throw e; }); frames++; if (frames === 3) v.setBlock(5, 8, 5, 1); }
  assert.ok(frames > 5, '複数フレームに分割された: ' + frames); assert.equal(v.stats.dirty, 0);
  const sync = mk({ chunkSize: 16 }); sync.generate([0, 0, 0], [16, 16, 16], (x, y) => (y < 8 ? 1 : 0)); sync.setBlock(3, 12, 3, 2); sync.setBlock(5, 8, 5, 1); sync.flush();
  assert.equal(v.stats.faces, sync.stats.faces);
});

test('大規模生成でもチャンク数・面数が妥当（隠面除去の効果）', () => {
  const v = mk({ chunkSize: 16 }); v.generate([-32, 0, -32], [32, 8, 32], () => 1); v.flush();
  assert.equal(v.stats.faces, 64 * 64 * 2 + 4 * 64 * 8, '上面+下面+側面のみ'); assert.equal(v.chunks.size, 4 * 4 * 1);
});
