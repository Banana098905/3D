import { Engine, isSupported, VERSION } from './engine.js';
import { MassiveEngineError, Pool, JobQueue, Emitter, RingStat } from './util.js';
import { mat4, quat, vec3, Frustum } from './math.js';
import { Geometry } from './geometry.js';
import { Texture } from './texture.js';
import { Material } from './material.js';
import { Node, Group, Scene, Mesh, InstancedMesh, Light, AmbientLight, DirectionalLight, PointLight, Camera, PerspectiveCamera, OrthographicCamera, createGridHelper } from './node.js';
import { OrbitControls } from './controls.js';
import { PhysicsWorld, SHAPE_SPHERE, SHAPE_BOX } from './physics.js';
import { AssetManager } from './assets.js';
import { AdaptiveQuality, QUALITY_PRESETS } from './quality.js';
import { Ray, raycast, rayFromCamera } from './raycast.js';
import { serializeScene, deserializeScene, SCENE_FORMAT, SCENE_VERSION } from './scene-io.js';
import { VoxelWorld } from './voxel.js';
import { ParticleField } from './presets.js';

export const create = options => new Engine(options);
export {
  Engine, isSupported, VERSION as version, MassiveEngineError, Pool, JobQueue, Emitter, RingStat, mat4, quat, vec3, Frustum, Geometry, Texture, Material,
  Node, Group, Scene, Mesh, InstancedMesh, Light, AmbientLight, DirectionalLight, PointLight, Camera, PerspectiveCamera, OrthographicCamera, createGridHelper,
  OrbitControls, PhysicsWorld, SHAPE_SPHERE, SHAPE_BOX, AssetManager, AdaptiveQuality, QUALITY_PRESETS, Ray, raycast, rayFromCamera,
  serializeScene, deserializeScene, SCENE_FORMAT, SCENE_VERSION, VoxelWorld, ParticleField
};
const API = Object.freeze({
  create, Engine, isSupported, version: VERSION, MassiveEngineError, Pool, JobQueue, Emitter, mat4, quat, vec3, Geometry, Texture, Material,
  Node, Group, Scene, Mesh, InstancedMesh, AmbientLight, DirectionalLight, PointLight, PerspectiveCamera, OrthographicCamera, createGridHelper,
  OrbitControls, PhysicsWorld, AssetManager, QUALITY_PRESETS, Ray, raycast, rayFromCamera, serializeScene, deserializeScene, VoxelWorld, ParticleField
});
export default API;
