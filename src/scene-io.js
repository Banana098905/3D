import { MassiveEngineError, f32ToBase64, base64ToF32, base64ToBytes } from './util.js';
import { Geometry } from './geometry.js';
import { Material } from './material.js';
import { Texture } from './texture.js';
import { Node, Group, Scene, Mesh, InstancedMesh, AmbientLight, DirectionalLight, PointLight, PerspectiveCamera, OrthographicCamera } from './node.js';

export const SCENE_FORMAT = 'massive-engine-scene', SCENE_VERSION = 1;
const arr = a => Array.from(a);
const bad = (msg, path) => new MassiveEngineError('シーンJSONが不正です' + (path ? ' (' + path + ')' : '') + ': ' + msg, 'E_SCENE_FORMAT');

export function serializeScene(root, extra = {}) {
  const geos = new Map(), mats = new Map(), texs = new Map(), warnings = [];
  const out = { format: SCENE_FORMAT, version: SCENE_VERSION, assets: { geometries: {}, materials: {}, textures: {} }, root: null };
  const gid = g => {
    if (geos.has(g)) return geos.get(g); const id = 'g' + geos.size; geos.set(g, id);
    if (g.params) out.assets.geometries[id] = Object.assign({}, g.params);
    else {
      const j = { type: 'custom', mode: g.mode, positions: f32ToBase64(g.positions) };
      if (g.normals) j.normals = f32ToBase64(g.normals); if (g.uvs) j.uvs = f32ToBase64(g.uvs); if (g.colors) j.colors = f32ToBase64(g.colors);
      if (g.indices) { j.indexType = g.indices instanceof Uint32Array ? 'u32' : 'u16'; j.indices = f32ToBase64(g.indices); }
      out.assets.geometries[id] = j;
    }
    return id;
  };
  const tid = t => {
    if (texs.has(t)) return texs.get(t); const id = 't' + texs.size; texs.set(t, id);
    const base = { wrapS: t.wrapS, wrapT: t.wrapT, minFilter: t.minFilter, magFilter: t.magFilter, flipY: t.flipY };
    if (t.url) out.assets.textures[id] = Object.assign({ type: 'url', url: t.url }, base);
    else if (t.params && t.params.type === 'checker') out.assets.textures[id] = Object.assign({}, t.params, base);
    else if (t.source && t.source.data) out.assets.textures[id] = Object.assign({ type: 'data', width: t.width, height: t.height, data: f32ToBase64(new Uint8Array(t.source.data)) }, base);
    else if (t.source && typeof document !== 'undefined') {
      try { const c = document.createElement('canvas'); c.width = t.width; c.height = t.height; c.getContext('2d').drawImage(t.source, 0, 0); out.assets.textures[id] = Object.assign({ type: 'dataurl', url: c.toDataURL('image/png') }, base); }
      catch (e) { warnings.push('テクスチャ ' + (t.name || t.id) + ' を保存できませんでした: ' + e.message); out.assets.textures[id] = { type: 'solid', color: '#ffffff' }; }
    } else { warnings.push('テクスチャ ' + (t.name || t.id) + ' は保存できないため白で代替しました。'); out.assets.textures[id] = { type: 'solid', color: '#ffffff' }; }
    return id;
  };
  const mid = m => {
    if (mats.has(m)) return mats.get(m); const id = 'm' + mats.size; mats.set(m, id);
    out.assets.materials[id] = { name: m.name, color: arr(m.color), emissive: arr(m.emissive), opacity: m.opacity, transparent: m.transparent, map: m.map ? tid(m.map) : null, vertexColors: m.vertexColors, unlit: m.unlit, specular: m.specular, shininess: m.shininess, doubleSided: m.doubleSided, depthTest: m.depthTest, depthWrite: m.depthWrite, alphaTest: m.alphaTest };
    return id;
  };
  const node = n => {
    const j = { type: n.type, name: n.name, position: arr(n.position), quaternion: arr(n.quaternion), scale: arr(n.scale), visible: n.visible, static: n.static };
    try { if (n.userData && Object.keys(n.userData).length) j.userData = JSON.parse(JSON.stringify(n.userData)); } catch (e) { warnings.push('userData を保存できません: ' + n.name); }
    switch (n.type) {
      case 'Scene': j.background = arr(n.background); break;
      case 'Mesh': j.geometry = gid(n.geometry); j.material = mid(n.material); j.castShadow = n.castShadow; j.receiveShadow = n.receiveShadow; j.frustumCulled = n.frustumCulled; j.renderOrder = n.renderOrder; break;
      case 'InstancedMesh': j.geometry = gid(n.geometry); j.material = mid(n.material); j.castShadow = n.castShadow; j.receiveShadow = n.receiveShadow; j.frustumCulled = n.frustumCulled;
        j.instances = { count: n.count, chunkSize: n.chunkSize, dynamic: n.dynamic, spin: n.spin, spinSpeed: n.spinSpeed, maxDistance: Number.isFinite(n.maxDistance) ? n.maxDistance : null,
          matrices: f32ToBase64(n.matrices.subarray(0, n.count * 16)), colors: f32ToBase64(n.colors.subarray(0, n.count * 4)), lods: n.lods.slice(1).map(l => ({ geometry: gid(l.geometry), distance: l.distance })) }; break;
      case 'AmbientLight': j.color = arr(n.color); j.intensity = n.intensity; break;
      case 'DirectionalLight': j.color = arr(n.color); j.intensity = n.intensity; j.direction = arr(n.direction); j.castShadow = n.castShadow; j.shadow = Object.assign({}, n.shadow); break;
      case 'PointLight': j.color = arr(n.color); j.intensity = n.intensity; j.range = n.range; break;
      case 'PerspectiveCamera': j.fov = n.fov; j.near = n.near; j.far = n.far; break;
      case 'OrthographicCamera': j.height = n.height; j.near = n.near; j.far = n.far; break;
    }
    j.children = n.children.map(node);
    return j;
  };
  out.root = node(root);
  Object.assign(out, extra);
  return { json: out, warnings };
}

export function deserializeScene(json, { textureFactory } = {}) {
  if (typeof json === 'string') { try { json = JSON.parse(json); } catch (e) { throw bad('JSON として解析できません: ' + e.message); } }
  if (!json || json.format !== SCENE_FORMAT) throw bad('format が ' + SCENE_FORMAT + ' ではありません。');
  if (json.version !== SCENE_VERSION) throw bad('未対応のバージョン ' + json.version + '（対応: ' + SCENE_VERSION + '）。');
  if (!json.root || !json.assets) throw bad('root / assets がありません。');
  const geos = {}, mats = {}, texs = {};
  const T = (id) => {
    if (texs[id]) return texs[id]; const d = json.assets.textures[id]; if (!d) throw bad('テクスチャ ' + id + ' が見つかりません。', 'assets.textures');
    const opt = { wrapS: d.wrapS, wrapT: d.wrapT, minFilter: d.minFilter, magFilter: d.magFilter, flipY: d.flipY }; let t;
    if (textureFactory) t = textureFactory(d, opt);
    if (!t) switch (d.type) {
      case 'url': case 'dataurl': t = Texture.fromURL(d.url, opt); break;
      case 'checker': t = Texture.checker(d.size, d.cells, d.colorA, d.colorB, opt); break;
      case 'data': t = new Texture({ data: base64ToBytes(d.data), width: d.width, height: d.height }, opt); break;
      case 'solid': t = Texture.solid(d.color, opt); break;
      default: throw bad('未知のテクスチャ種別 ' + d.type, 'assets.textures.' + id);
    }
    return (texs[id] = t);
  };
  const G = id => {
    if (geos[id]) return geos[id]; const d = json.assets.geometries[id]; if (!d) throw bad('ジオメトリ ' + id + ' が見つかりません。', 'assets.geometries');
    if (d.type === 'custom') {
      const data = { mode: d.mode, positions: base64ToF32(d.positions) };
      if (d.normals) data.normals = base64ToF32(d.normals); if (d.uvs) data.uvs = base64ToF32(d.uvs); if (d.colors) data.colors = base64ToF32(d.colors);
      if (d.indices) { const b = base64ToBytes(d.indices).buffer; data.indices = d.indexType === 'u32' ? new Uint32Array(b) : new Uint16Array(b); }
      return (geos[id] = new Geometry(data));
    }
    return (geos[id] = Geometry.fromParams(d));
  };
  const M = id => {
    if (mats[id]) return mats[id]; const d = json.assets.materials[id]; if (!d) throw bad('マテリアル ' + id + ' が見つかりません。', 'assets.materials');
    return (mats[id] = new Material(Object.assign({}, d, { map: d.map ? T(d.map) : null })));
  };
  const build = (j, path) => {
    if (!j || typeof j.type !== 'string') throw bad('ノード種別がありません。', path);
    let n;
    switch (j.type) {
      case 'Node': n = new Node(); break; case 'Group': n = new Group(); break; case 'Scene': n = new Scene(); if (j.background) n.background = j.background.slice(); break;
      case 'Mesh': n = new Mesh(G(j.geometry), M(j.material), { castShadow: j.castShadow, receiveShadow: j.receiveShadow, frustumCulled: j.frustumCulled, renderOrder: j.renderOrder }); break;
      case 'InstancedMesh': {
        const i = j.instances; if (!i) throw bad('instances がありません。', path);
        n = new InstancedMesh(G(j.geometry), M(j.material), { capacity: i.count, chunkSize: i.chunkSize, dynamic: i.dynamic, spin: i.spin, spinSpeed: i.spinSpeed, maxDistance: i.maxDistance == null ? Infinity : i.maxDistance, castShadow: j.castShadow, receiveShadow: j.receiveShadow, frustumCulled: j.frustumCulled });
        n.setCount(i.count); const mm = base64ToF32(i.matrices), cc = base64ToF32(i.colors);
        if (mm.length !== i.count * 16 || cc.length !== i.count * 4) throw bad('インスタンスデータ長が count と一致しません。', path);
        n.matrices.set(mm); n.colors.set(cc); n.markInstancesDirty(0, i.count);
        for (const l of (i.lods || [])) n.addLOD(G(l.geometry), l.distance); break;
      }
      case 'AmbientLight': n = new AmbientLight(j.color, j.intensity); break;
      case 'DirectionalLight': n = new DirectionalLight(j.color, j.intensity, { direction: j.direction, castShadow: j.castShadow, shadow: j.shadow }); break;
      case 'PointLight': n = new PointLight(j.color, j.intensity, j.range); break;
      case 'PerspectiveCamera': n = new PerspectiveCamera(j.fov, j.near, j.far); break;
      case 'OrthographicCamera': n = new OrthographicCamera(j.height, j.near, j.far); break;
      default: throw bad('未知のノード種別 ' + j.type, path);
    }
    n.name = j.name || ''; if (j.position) n.position.set(j.position); if (j.quaternion) n.quaternion.set(j.quaternion); if (j.scale) n.scale.set(j.scale);
    n.visible = j.visible !== false; n.static = !!j.static; if (j.userData) n.userData = j.userData; n.markDirty();
    (j.children || []).forEach((c, k) => n.add(build(c, path + '.children[' + k + ']')));
    return n;
  };
  const root = build(json.root, 'root');
  return { root, camera: json.camera || null, extra: json };
}
