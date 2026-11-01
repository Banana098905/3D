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
import { CollisionWorld, EVENT_START, EVENT_STAY, EVENT_END, EVENT_TRIGGER_ENTER, EVENT_TRIGGER_STAY, EVENT_TRIGGER_EXIT, COLLIDER_SPHERE, COLLIDER_AABB, COLLIDER_OBB, COLLIDER_CAPSULE, COLLIDER_PLANE, Contact, RayHit, collide, rayShape, sweepSphere, pointDistance, BruteForceBroadphase, SpatialHashBroadphase, TreeBroadphase, DynamicTree } from './collision/index.js';
import { HandleAllocator, HandlePool } from './handles.js';
import { FixedTimestep, Interpolator } from './timestep.js';
import { Profiler, StatWindow } from './profiler.js';
import { Easing, Track, AnimationClip, Animator } from './animation.js';
import { ParticleSystem } from './particles.js';
import { InputManager } from './input.js';
import { AudioSystem } from './audio.js';
import { ResourceManager, parseOBJ, validateGeometry, mergeGeometries } from './resources.js';
import { DebugDraw } from './debug.js';
import { RigidBodyWorld, BODY_STATIC, BODY_DYNAMIC, BODY_KINEMATIC, generateManifold, DistanceConstraint, BallSocketConstraint, computeLocalInertia } from './rigid/index.js';
const EXTRA = { CollisionWorld, EVENT_START, EVENT_STAY, EVENT_END, EVENT_TRIGGER_ENTER, EVENT_TRIGGER_STAY, EVENT_TRIGGER_EXIT, COLLIDER_SPHERE, COLLIDER_AABB, COLLIDER_OBB, COLLIDER_CAPSULE, COLLIDER_PLANE, Contact, RayHit, collide, rayShape, sweepSphere, pointDistance, BruteForceBroadphase, SpatialHashBroadphase, TreeBroadphase, DynamicTree, HandleAllocator, HandlePool, FixedTimestep, Interpolator, Profiler, StatWindow, Easing, Track, AnimationClip, Animator, ParticleSystem, InputManager, AudioSystem, ResourceManager, parseOBJ, validateGeometry, mergeGeometries, DebugDraw, RigidBodyWorld, BODY_STATIC, BODY_DYNAMIC, BODY_KINEMATIC, generateManifold, DistanceConstraint, BallSocketConstraint, computeLocalInertia };

export const create = options => new Engine(options);
export {
  Engine, isSupported, VERSION as version, MassiveEngineError, Pool, JobQueue, Emitter, RingStat, mat4, quat, vec3, Frustum, Geometry, Texture, Material,
  Node, Group, Scene, Mesh, InstancedMesh, Light, AmbientLight, DirectionalLight, PointLight, Camera, PerspectiveCamera, OrthographicCamera, createGridHelper,
  OrbitControls, PhysicsWorld, SHAPE_SPHERE, SHAPE_BOX, AssetManager, AdaptiveQuality, QUALITY_PRESETS, Ray, raycast, rayFromCamera,
  serializeScene, deserializeScene, SCENE_FORMAT, SCENE_VERSION, VoxelWorld, ParticleField
};
export { CollisionWorld, EVENT_START, EVENT_STAY, EVENT_END, EVENT_TRIGGER_ENTER, EVENT_TRIGGER_STAY, EVENT_TRIGGER_EXIT, COLLIDER_SPHERE, COLLIDER_AABB, COLLIDER_OBB, COLLIDER_CAPSULE, COLLIDER_PLANE, Contact, RayHit, collide, rayShape, sweepSphere, pointDistance, BruteForceBroadphase, SpatialHashBroadphase, TreeBroadphase, DynamicTree, HandleAllocator, HandlePool, FixedTimestep, Interpolator, Profiler, StatWindow, Easing, Track, AnimationClip, Animator, ParticleSystem, InputManager, AudioSystem, ResourceManager, parseOBJ, validateGeometry, mergeGeometries, DebugDraw, RigidBodyWorld, BODY_STATIC, BODY_DYNAMIC, BODY_KINEMATIC, generateManifold, DistanceConstraint, BallSocketConstraint, computeLocalInertia };
const API = Object.freeze({
  create, Engine, isSupported, version: VERSION, MassiveEngineError, Pool, JobQueue, Emitter, mat4, quat, vec3, Geometry, Texture, Material,
  Node, Group, Scene, Mesh, InstancedMesh, AmbientLight, DirectionalLight, PointLight, PerspectiveCamera, OrthographicCamera, createGridHelper,
  OrbitControls, PhysicsWorld, AssetManager, QUALITY_PRESETS, Ray, raycast, rayFromCamera, serializeScene, deserializeScene, VoxelWorld, ParticleField, ...EXTRA
});
export default API;
