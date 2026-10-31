import test from 'node:test';
import assert from 'node:assert/strict';
import { mat4, vec3, quat, Frustum } from '../../src/math.js';
import { Geometry } from '../../src/geometry.js';
import { Material } from '../../src/material.js';
import { Texture } from '../../src/texture.js';
import { Node, Scene, Group, Mesh, InstancedMesh, PerspectiveCamera, OrthographicCamera, AmbientLight, DirectionalLight, PointLight } from '../../src/node.js';
import { raycast, Ray, rayFromCamera } from '../../src/raycast.js';
import { serializeScene, deserializeScene } from '../../src/scene-io.js';

const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} !≈ ${b}`);

test('math: 逆行列・合成・lookAt・クォータニオン', () => {
  const m = mat4.compose(mat4.create(), [1, 2, 3], quat.fromEuler(quat.create(), 0.3, 0.5, -0.2), [2, 1, 0.5]);
  const inv = mat4.invert(mat4.create(), m), id = mat4.multiply(mat4.create(), m, inv);
  for (let i = 0; i < 16; i++) near(id[i], i % 5 === 0 ? 1 : 0, 1e-9);
  assert.equal(mat4.invert(mat4.create(), new Float64Array(16)), null);
  const q = quat.fromAxisAngle(quat.create(), 0, 1, 0, Math.PI / 2), p = vec3.transformDir(vec3.create(), [1, 0, 0], mat4.compose(mat4.create(), [0, 0, 0], q, [1, 1, 1]));
  near(p[0], 0); near(p[2], -1);
  const v = mat4.lookAt(mat4.create(), [0, 0, 5], [0, 0, 0], [0, 1, 0]); const o = vec3.transformMat4(vec3.create(), [0, 0, 0], v); near(o[2], -5);
  const deg = mat4.lookAt(mat4.create(), [0, 5, 0], [0, 0, 0], [0, 1, 0]); assert.ok(deg.every(Number.isFinite));   // up と視線が平行でも NaN にならない
});

test('Node: 親子のワールド行列・循環検出・static の更新抑制', () => {
  const s = new Scene(), a = new Node(), b = new Node(); s.add(a); a.add(b);
  a.setPosition(1, 2, 3); a.setScale(2); b.setPosition(1, 0, 0); s.updateMatrices();
  const w = b.getWorldPosition(); near(w[0], 3); near(w[1], 2); near(w[2], 3);
  assert.throws(() => b.add(a), /循環/); assert.throws(() => a.add(a), /自分自身/);
  const c = new Node(); c.static = true; s.add(c); c.setPosition(1, 0, 0); s.updateMatrices(); near(c._world[12], 1);
  c.position[0] = 9; s.updateMatrices(); near(c._world[12], 1);              // 直接代入では更新されない（static）
  c.markDirty(); s.updateMatrices(); near(c._world[12], 9);
  const d = new Node(); s.add(d); d.position[0] = 4; s.updateMatrices(); near(d._world[12], 4); // 非 static は直接代入でも更新
  a.remove(b); assert.equal(b.parent, null); assert.equal(a.children.length, 0);
});

test('Node.lookAt: -Z が対象を向く（親が移動していても）', () => {
  const s = new Scene(), g = new Group(), n = new Node(); s.add(g); g.add(n); g.setPosition(10, 0, 0); n.setPosition(0, 0, 0); s.updateMatrices();
  n.lookAt(10, 0, -5); s.updateMatrices();
  const f = vec3.transformDir(vec3.create(), [0, 0, -1], n._world); near(f[0], 0, 1e-9); near(f[2], -1, 1e-9);
});

test('Camera: 投影・ビュー、画面中心レイとフラスタム', () => {
  const cam = new PerspectiveCamera(60, 0.1, 100); cam.setPosition(0, 0, 10); cam.lookAt(0, 0, 0); cam.updateCamera(16 / 9);
  const ray = rayFromCamera(cam, 0, 0); near(ray.direction[2], -1, 1e-9); near(ray.origin[0], 0, 1e-6);
  const f = new Frustum().setFromMatrix(cam.viewProjection);
  assert.equal(f.intersectsSphere(0, 0, 0, 0.5), true); assert.equal(f.intersectsSphere(0, 0, 50, 1), false); assert.equal(f.intersectsSphere(0, 0, -200, 1), false);
  assert.equal(f.intersectsSphere(100, 0, 0, 1), false);
  assert.equal(f.intersectsAABB([-1, -1, -1], [1, 1, 1]), true); assert.equal(f.intersectsAABB([50, 50, 50], [51, 51, 51]), false);
  const o = new OrthographicCamera(10); o.setPosition(0, 0, 5); o.lookAt(0, 0, 0); o.updateCamera(2);
  const r2 = rayFromCamera(o, 0.5, 0.5); near(r2.origin[0], 5 * 1 /* 半幅=h*aspect=10 → 0.5*10 */, 1e-9 + 0); near(r2.direction[2], -1, 1e-9);
});

test('Geometry: 検証エラー・法線計算・境界・三角形の巻き方向', () => {
  assert.throws(() => new Geometry({ positions: [0, 0] }), TypeError);
  assert.throws(() => new Geometry({ positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 5] }), RangeError);
  assert.throws(() => new Geometry({ positions: [0, 0, 0, 1, 0, 0], uvs: [0, 0] }), RangeError);
  const tri = new Geometry({ positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2] }); near(tri.normals[2], 1);
  for (const [name, g] of Object.entries({ box: Geometry.box(2, 3, 4), sphere: Geometry.sphere(1), plane: Geometry.plane(2, 2, 3, 3), cyl: Geometry.cylinder(0.5, 0.3, 1, 12), cone: Geometry.cylinder(0, 0.5, 1, 12) })) {
    const p = g.positions, n = g.normals; let bad = 0;
    for (let t = 0; t < g.indices.length; t += 3) {
      const a = g.indices[t] * 3, b = g.indices[t + 1] * 3, c = g.indices[t + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx; if (Math.hypot(cx, cy, cz) < 1e-12) continue;
      if (cx * (n[a] + n[b] + n[c]) + cy * (n[a + 1] + n[b + 1] + n[c + 1]) + cz * (n[a + 2] + n[b + 2] + n[c + 2]) <= 0) bad++;
    }
    assert.equal(bad, 0, name + ' の外向き巻き方向');
    for (let i = 0; i < n.length; i += 3) near(Math.hypot(n[i], n[i + 1], n[i + 2]), 1, 1e-5);
  }
  const b = Geometry.box(2, 3, 4).bounds; assert.deepEqual(b.min, [-1, -1.5, -2]); near(b.radius, Math.hypot(1, 1.5, 2), 1e-6);
  assert.equal(Geometry.box().triangleCount, 12); assert.equal(Geometry.grid(4, 4).triangleCount, 0);
});

test('raycast: Mesh（回転・拡大縮小つき）と手前優先ソート', () => {
  const s = new Scene(); const m = new Mesh(Geometry.box(1, 1, 1), new Material()); m.setPosition(0, 0, -5); m.setScale(2); s.add(m);
  const far = new Mesh(Geometry.sphere(1), new Material()); far.setPosition(0, 0, -12); s.add(far); s.updateMatrices();
  const hits = raycast(s, new Ray([0, 0, 0], [0, 0, -1]));
  assert.equal(hits.length, 2); assert.equal(hits[0].object, m); near(hits[0].distance, 4, 1e-6); near(hits[0].normal[2], 1, 1e-6); near(hits[0].point[2], -4, 1e-6);
  assert.equal(hits[1].object, far); near(hits[1].distance, 11, 0.05);
  assert.equal(raycast(s, new Ray([5, 0, 0], [0, 0, -1])).length, 0);
  assert.equal(raycast(s, new Ray([0, 0, 0], [0, 0, -1]), { maxDistance: 5 }).length, 1);
  assert.equal(raycast(s, new Ray([0, 0, 0], [0, 0, -1]), { filter: o => o === far }).length, 1);
  m.visible = false; assert.equal(raycast(s, new Ray([0, 0, 0], [0, 0, -1])).length, 1);
  const r = new Mesh(Geometry.box(1, 1, 1), new Material()); r.setRotationEuler(0, Math.PI / 4, 0); r.setPosition(0, 0, -20); s.add(r); s.updateMatrices();
  const rh = raycast(s, new Ray([0, 0, 0], [0, 0, -1]), { filter: o => o === r }); near(rh[0].distance, 20 - Math.SQRT1_2, 1e-6);
});

test('InstancedMesh: 追加・swap削除・チャンク境界・レイキャストの instanceId', () => {
  const im = new InstancedMesh(Geometry.box(1, 1, 1), new Material(), { chunkSize: 64, count: 200 });
  assert.equal(im.chunkCount, 4); assert.ok(im.capacity >= 200);
  for (let i = 0; i < 200; i++) im.setPositionAt(i, i * 3, 0, -5);
  im.computeChunkBounds(0); near(im.chunks[0].min[0], -0.87, 0.02); assert.ok(im.chunks[0].max[0] > 63 * 3);
  im.setPositionAt(70, 1000, 0, 0); assert.equal(im.chunks[1].boundsDirty, true); assert.equal(im.chunks[0].boundsDirty, false);
  const s = new Scene(); s.add(im); s.updateMatrices();
  const hit = raycast(s, new Ray([30, 0, 0], [0, 0, -1])); assert.equal(hit[0].instanceId, 10); near(hit[0].distance, 4.5, 1e-6);
  const moved = im.removeInstance(10); assert.equal(moved, 199); assert.equal(im.count, 199); assert.equal(im.matrices[10 * 16 + 12], 199 * 3);
  assert.throws(() => im.setMatrixAt(500, new Float32Array(16)), RangeError); assert.throws(() => im.setPositionAt(-1, 0, 0, 0), RangeError);
  const id = im.addInstance(); assert.equal(id, 199); im.setCount(1000); assert.equal(im.count, 1000); assert.ok(im.capacity >= 1000);
  im.setCount(5); assert.equal(im.count, 5);
  const col = new InstancedMesh(Geometry.box(), new Material(), { count: 2 }); col.setColorAt(1, '#ff0000'); assert.equal(col.colors[4], 1); assert.equal(col.colors[5], 0);
  const lod = new InstancedMesh(Geometry.sphere(1, 24, 16), new Material(), { count: 1 }); lod.addLOD(Geometry.sphere(1, 8, 6), 50); lod.addLOD(Geometry.sphere(1, 4, 3), 20);
  assert.deepEqual(lod.lods.map(l => l.distance), [0, 20, 50]); assert.throws(() => lod.addLOD(Geometry.box(), -1), RangeError);
});

test('シーンJSON: 往復で構造・マテリアル・インスタンス・ライトが保たれる', () => {
  const s = new Scene(); s.background = [0.1, 0.2, 0.3];
  const tex = Texture.checker(16, 4, '#fff', '#000'), mat = new Material({ color: '#ff8800', map: tex, opacity: 0.5, specular: 0.4 });
  const g = new Group(); g.name = 'grp'; g.setPosition(1, 2, 3); g.userData = { tag: 'a', n: [1, 2] }; s.add(g);
  const m = new Mesh(Geometry.sphere(0.7, 12, 8), mat, { castShadow: true }); m.name = 'ball'; m.setPosition(0, 1, 0); g.add(m);
  const cust = new Geometry({ positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], colors: [1, 0, 0, 0, 1, 0, 0, 0, 1], indices: [0, 1, 2] }); s.add(new Mesh(cust, new Material({ vertexColors: true })));
  const im = new InstancedMesh(Geometry.box(), new Material(), { count: 3, chunkSize: 128, spin: true }); im.setPositionAt(2, 5, 6, 7); im.setColorAt(1, 0.1, 0.2, 0.3); im.addLOD(Geometry.box(2, 2, 2), 30); s.add(im);
  s.add(new AmbientLight('#112233', 0.4), new DirectionalLight('#fff', 0.7, { castShadow: true, shadow: { extent: 12 } }), new PointLight('#f00', 2, 9));
  const { json, warnings } = serializeScene(s); assert.deepEqual(warnings, []);
  const text = JSON.stringify(json), back = deserializeScene(text).root;
  assert.deepEqual(Array.from(back.background), [0.1, 0.2, 0.3]);
  const bg = back.find('grp'); assert.deepEqual(Array.from(bg.position), [1, 2, 3]); assert.deepEqual(bg.userData, { tag: 'a', n: [1, 2] });
  const bm = back.find('ball'); assert.equal(bm.castShadow, true); assert.equal(bm.geometry.params.type, 'sphere'); assert.equal(bm.geometry.params.widthSegments, 12);
  assert.deepEqual(bm.material.color.map(v => +v.toFixed(3)), [1, 0.533, 0]); assert.equal(bm.material.opacity, 0.5); assert.equal(bm.material.map.width, 16);
  const meshes = []; back.traverse(n => meshes.push(n)); const bc = meshes.find(n => n.type === 'Mesh' && n.geometry.colors); assert.equal(bc.geometry.vertexCount, 3); assert.equal(bc.material.vertexColors, true);
  const bi = meshes.find(n => n.type === 'InstancedMesh'); assert.equal(bi.count, 3); assert.equal(bi.matrices[2 * 16 + 12], 5); assert.equal(Math.round(bi.colors[5] * 10), 2); assert.equal(bi.spin, true); assert.equal(bi.lods.length, 2);
  assert.equal(meshes.filter(n => n.type === 'PointLight')[0].range, 9); assert.equal(meshes.find(n => n.type === 'DirectionalLight').shadow.extent, 12);
  assert.equal(JSON.stringify(serializeScene(back).json.assets.geometries), JSON.stringify(json.assets.geometries));   // 2回目も同一
});

test('シーンJSON: 不正入力は日本語メッセージの MassiveEngineError', () => {
  for (const bad of ['{not json', '{"format":"x"}', JSON.stringify({ format: 'massive-engine-scene', version: 99, root: {}, assets: {} }), JSON.stringify({ format: 'massive-engine-scene', version: 1, assets: { geometries: {}, materials: {}, textures: {} }, root: { type: 'Mesh', geometry: 'g9', material: 'm0', children: [] } }),
    JSON.stringify({ format: 'massive-engine-scene', version: 1, assets: { geometries: {}, materials: {}, textures: {} }, root: { type: 'Wat', children: [] } })]) {
    assert.throws(() => deserializeScene(bad), e => e.code === 'E_SCENE_FORMAT' && /シーンJSON/.test(e.message));
  }
});
