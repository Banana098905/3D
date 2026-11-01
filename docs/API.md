# API リファレンス（MASSIVE ENGINE 1.0.0）

このページは `src/` の実装に合わせています。`<script>` で読み込むとグローバル `MassiveEngine`、ES モジュールでは名前付きエクスポートで同じものが使えます。

```js
// ES モジュール
import { create, Geometry, Material, InstancedMesh } from './dist/massive-engine.esm.js';
// 通常の script
const { create, Geometry } = MassiveEngine;
```

エラーは `MassiveEngineError`（`code` 付き）か標準の `TypeError` / `RangeError` です。主なコード: `E_DISPOSED`（破棄済み）, `E_CANVAS_IN_USE`（同じ canvas で 2 台目）, `E_WEBGL2_UNAVAILABLE`, `E_SHADER`, `E_SCENE_FORMAT`, `E_NO_PHYSICS`, `E_PHYSICS_EXISTS`, `E_WORKER_UNAVAILABLE`, `E_TEXTURE_LOAD`。

---
## 1. エンジンのライフサイクル

### `isSupported() → boolean`
WebGL 2 が使えるか。一時 canvas で判定するので、あなたの canvas を汚しません。

### `create(options) → Engine`（= `new Engine(options)`）
| オプション | 既定 | 説明 |
|---|---|---|
| `canvas` | 必須 | `<canvas>` 要素。**1 つの canvas に同時に 1 台**（2 台目は `E_CANVAS_IN_USE`）。別の canvas なら何台でも同居できます |
| `autoStart` | true | 作成後すぐループ開始 |
| `autoResize` | true | canvas の CSS サイズ変化・高 DPI に追従（ResizeObserver） |
| `pauseWhenHidden` | true | タブが非表示の間は停止し、表示に戻ると再開 |
| `antialias` / `maxPixelRatio` | true / 2 | |
| `quality` | 'high' | 'low' \| 'medium' \| 'high' \| 'ultra' |
| `renderScale`, `shadows` | 品質に従う | 個別上書き |
| `adaptiveQuality` | false | true か `{targetFps, minScale}`。フレーム時間に応じ解像度・影・LOD を段階的に下げる |
| `controls` | true | 軌道カメラ（ドラッグ回転／右ドラッグまたは Shift で移動／ホイール・ピンチでズーム）。`false` で無効、オブジェクトで `OrbitControls` に渡す設定 |
| `defaultLights` | **true** | 環境光＋方向光を自動追加。自分で光を組む場合は `false` |
| `background` | 暗い青 | 色（`0xRRGGBB` / `'#rrggbb'` / `[r,g,b]`） |
| `physics` | false | `true` か設定で `enablePhysics` を同時に呼ぶ |
| `preserveDrawingBuffer` | false | スクリーンショット用 |
| `maxFrameDt` | 0.05 | 1 フレームの最大時間(秒)。固まり防止 |
| `jobBudgetMs` | 3 | 時間分割ジョブに 1 フレームで使う上限(ms) |
| `onStats(stats)`, `onError(err)` | | 毎フレームの統計、エラー通知 |
| `count`, `gridCellSize`, `speed`, `cubeRotation` | | **互換モード**: `count` を指定すると試作版 2.0 と同じ粒子シーンを生成（[移行ガイド](MIGRATION.md)） |

### メソッド
| メソッド | 説明 |
|---|---|
| `start()` / `resume()` | ループ開始（多重呼び出しは無害） |
| `stop()` | ループ停止。GPU リソースは保持（`resume()` で再開） |
| `dispose()` | 完全破棄。リスナー・GPU リソース・Worker を解放。以降の操作は `E_DISPOSED`。二重呼び出しは無害 |
| `renderOnce()` | 1 フレームだけ描画して統計を更新（`stop()` 中のスクリーンショット等） |
| `capture() → Uint8Array` | 描画して RGBA ピクセルを返す（下から上の順） |
| `resize(force?)` | 手動リサイズ（通常は自動） |
| `getStats() → object` | 下記「統計」 |
| `isRunning` | 動作中か |

**停止と破棄の使い分け**: ページ内で一時的に止めるだけなら `stop()`。ページ遷移・タブ閉鎖前・別シーンに差し替える時は `dispose()`。破棄後は同じ canvas に新しく `create()` できます（50 回の繰り返しで GPU リソースが残らないことをテスト済み）。

### イベント（`engine.on(name, fn)` / `off` / `once`）
`start`, `stop`, `dispose`, `update({dt,time})`, `beforeRender`, `afterRender`, `resize`, `contextlost`, `contextrestored`, `quality`, `warning`, `error`, `pointerdown`, `pointermove`, `pointerup`, `click`, `wheel`, `keydown`, `keyup`。
`error` に購読者がいない場合は `console.error` に出ます。`onStats` は専用コールバックで、イベントではありません。

### 入力
`engine.input.keys`（押下中の `code` の Set）, `engine.input.isKeyDown('KeyW')`, `engine.input.pointer {x,y,down}`。

---
## 2. シーンとノード
`engine.scene`（背景色は `engine.setBackground(c)`）、`engine.camera`（既定は `PerspectiveCamera`。差し替え可: `engine.camera = new OrthographicCamera(高さ, near, far)`）。

### ノード共通（`Node`, `Group`, `Mesh`, `InstancedMesh`, ライト, カメラ）
`add(...children)`, `remove(...)`, `removeFromParent()`, `setPosition(x,y,z)`, `setScale(s | x,y,z)`, `setRotationEuler(x,y,z)`, `setQuaternion(...)`, `lookAt(x,y,z)`（-Z が前方）, `markDirty()`, `visible`, `static`。

- 位置・回転・スケールは `position` / `quaternion` / `scale`（TypedArray）。**`position.set(x,y,z)` は TypedArray の `set` と別物で誤動作するので、必ず `setPosition()` か添字代入 + `markDirty()` を使ってください。**
- 親子: 子のワールド行列は親の変更に追従します。
- `static = true` のノードは `markDirty()` するまで行列を再計算しません（静的/動的の分離）。静的サブツリーの内側を直接書き換えても検知されません。

### 簡易追加（Engine）
`addBox({size:[w,h,d], color, position, scale, rotation, map, opacity, unlit, castShadow, receiveShadow, material, name})`、`addSphere({radius, segments,…})`、`addPlane({width, depth, segments,…})`（XZ 平面・法線 +Y・既定で影を受ける）、`addCylinder({radiusTop, radiusBottom, height, segments,…})`、`addGrid(size, divisions)`、`addDefaultLights()`、`add(...)`, `remove(...)`。いずれも `Mesh` を返します。

### `Geometry`
`new Geometry({positions, indices?, normals?, uvs?, colors?, mode:'triangles'|'lines'})`。頂点数・インデックス範囲・長さを検証して不正なら例外。`computeNormals()`, `computeBounds()`, `needsUpdate()`（CPU 側を書き換えたら呼ぶ）, `dispose()`。静的生成: `Geometry.box(w,h,d)`, `sphere(r, wSeg, hSeg)`, `plane(w, d, wSeg, hSeg)`, `cylinder(rTop, rBottom, h, seg)`, `grid(...)`。CPU 側にデータを保持するのでコンテキスト喪失後も再生成されます。

### `Material`
`new Material({color, emissive, opacity, transparent, map, vertexColors, unlit, specular(0.15), shininess(32), doubleSided, depthTest, depthWrite, alphaTest})`。`opacity < 1` で自動的に透明扱い（後ろから前へソート、深度書き込みなし）。`setColor(c)`。

### `Texture`
`new Texture({data,width,height})`（RGBA8）/ 画像・canvas、`Texture.fromURL(url, opts)`（`tex.loaded` が Promise）、`Texture.checker(size, cells, colorA, colorB)`、`Texture.solid(color)`。`dispose()`。

### `Mesh(geometry, material, {castShadow, receiveShadow, name})`
### `InstancedMesh(geometry, material, {chunkSize=4096, dynamic, castShadow, receiveShadow, spin, maxDistance, frustumCulled, preciseRaycast})`
大量の同一メッシュ用。`setCount(n)`, `setPositionAt(i,x,y,z)`, `setMatrixAt(i,m)`, `setTRSAt(i,p,q,s)`, `setColorAt(i,r,g,b)`, `addInstance(matrix)`, `removeInstance(i)`（末尾と入れ替え）, `markInstancesDirty()`, `addLOD(geometry, distance)`。内部は `chunkSize` ごとのチャンクで、チャンク単位にカメラカリング・LOD 選択・GPU 転送を行います。変更したチャンクだけ転送されます。

### ライト
`AmbientLight(color, intensity)`、`DirectionalLight(color, intensity, {direction:[x,y,z], castShadow, shadow:{mapSize, extent, bias, normalBias, target}})`、`PointLight(color, intensity, range)`。方向光は 2 灯まで、点光源は 8 灯まで（超過分は近い順で採用）。影は**先頭の影つき方向光 1 灯**のみ。
**影の範囲**: `shadow.target`（既定は軌道カメラの注視点。`controls:false` の場合はカメラ前方 `extent` 先）を中心に半径 `extent`。コントロールを使わないときは `shadow.target` を明示してください。

### カメラ
`PerspectiveCamera(fovDeg, near, far)`, `OrthographicCamera(height, near, far)`。`OrbitControls` は `engine.controls`（`target`, `distance`, `yaw`, `pitch`, `update()`, `frame(center, radius)`）。

---
## 3. 描画品質・パフォーマンス
- `setQuality('low'|'medium'|'high'|'ultra' | {renderScale, shadows, shadowMapSize, lodBias})` / `getQuality()`。
- `setOptions({quality, renderScale, shadows, lodBias, shadowMapSize, adaptiveQuality, background, maxPixelRatio, pauseWhenHidden, maxFrameDt, jobBudgetMs, physics})`。未知のキーは `RangeError`。
- `adaptiveQuality`: 8 段階（解像度 1.0→0.5、影の縮小→無効、LOD 距離拡大）。低下は素早く、回復は 4 秒のクールダウン付き。`quality` イベントで通知。
- `engine.jobs`: 時間予算つきジョブキュー。`engine.jobs.add(function*(){ …; yield; … })` で重い処理をフレームに分割できます。
- `engine.assets`（`AssetManager`）: `add(name, resource)`, `defer(name, factory)`（初回 `get` で生成）, `acquire/release`（参照カウント、0 で破棄）, `loadTexture(url)`（URL キャッシュ・戻り値は即座に返り `.loaded` を待つ）, `releaseTexture(url)`, `disposeUnused()`, `stats()`。

### 統計 `getStats()`
| キー | 意味 |
|---|---|
| `fps`, `frameMs`, `frameP95Ms`, `frameMaxMs` | 平均 FPS、直近フレーム間隔、P95、最大（**vsync に制限される**） |
| `cpuMs`, `cpuP95Ms`, `updateMs`, `renderMs` | 1 フレームの CPU 処理時間（更新＋描画命令発行。**GPU 完了待ちは含まない**） |
| `gpuMs`, `gpuTimerSupported` | GPU 時間。`EXT_disjoint_timer_query_webgl2` が使えて値が得られた時のみ数値、それ以外は `null`。CPU 時間やフレーム間隔とは別物 |
| `drawCalls`, `shadowDrawCalls`, `triangles`, `instances`, `visibleObjects`, `culledObjects`, `visibleChunks`, `culledChunks` | 描画統計 |
| `programs`, `geometries`, `textures`, `gpuBytes` | GPU リソース数と概算バイト数（エンジンが管理している分のみ） |
| `bodies`, `candidatePairs`, `overlaps`, `stepMs`, `integrateMs`, `gridMs`, `collisionMs`, `physicsSubsteps`, `physicsDroppedTime`, `physicsOnWorker` | 物理 |
| `jsHeapMB` | `performance.memory` がある環境（Chromium 系）のみ。無ければ `null` |
| `initMs`, `frames`, `canvasWidth/Height`, `renderScale`, `qualityLevel`, `jobsPending`, `uploadMs` | その他 |

---
## 4. 当たり判定・ピッキング
- `engine.screenRay(clientX, clientY) → Ray`
- `engine.raycast(clientX, clientY, {maxDistance, filter, limit})` / `engine.raycast(ray, opts)` → ヒット配列（距離昇順）。要素: `{object, distance, point, normal, instanceId?}`
- `engine.pick(clientX, clientY, opts)` → 最も近い 1 件 or `null`
- 判定は境界ボックス＋三角形（`preciseRaycast`）。

## 5. アニメーション・更新
- `engine.addUpdate(fn(dt, time))` → 登録解除関数。コールバック内の例外は `error` で通知され、ループは継続します。
- `engine.animate({duration, delay, easing:'linear'|'easeIn'|'easeOut'|'easeInOut'|fn, loop, onUpdate(t,e), onComplete})` → `{cancel(), finished: Promise}`
- `engine.tween(target, {prop: value | [配列]}, duration, opts)`（例: `engine.tween(mesh, {position:[0,5,0]}, 1)`。数値配列は要素ごとに補間し、`markDirty()` を自動で呼びます）

## 6. 物理（`PhysicsWorld`）
簡易 3D 物理: **球と軸平行箱（回転なし）**。固定タイムステップ、空間グリッドの広域探索、位置補正＋インパルス応答（反発・クーロン摩擦）。

```js
const world = engine.enablePhysics({ gravity:[0,-9.8,0], bounds:{min:[-20,0,-20], max:[20,40,20]}, restitution:0.2 });
const first = world.addBody({ radius:0.5, position:[0,10,0] });   // 球。箱は {shape:'box', halfExtents:[1,1,1]}
world.addBody({ shape:'box', halfExtents:[5,0.5,5], position:[0,0,0], mass:0 }); // mass:0 → 静的
world.bindNode(first, mesh);                                // 物体 ID に Mesh/Node を結び付けて位置を同期
world.bindInstanced(instancedMesh, firstBodyId, count);     // 連続した ID 範囲を InstancedMesh へ同期
```
主なオプション（`enablePhysics(options, {worker})`）: `gravity`, `bounds`（壁と広域探索の範囲）, `walls`, `fixedTimeStep(1/60)`, `maxSubSteps(4)`, `stepBudgetMs`（>0 で超過時に打ち切り）, `maxCandidatePairs`, `cellSize`（0=自動: 上位10%の半径の 2.2 倍）, `maxReach`, `planar`（y を無視する平面モード）, `iterations`, `maxCells`, `restitution`, `friction`, `boundsRestitution`, `positionCorrection`, `slop`, `damping`, `maxSpeed`, `onContact(i,j,nx,ny,nz,depth)`, `onWarning`。
メソッド: `addBody, removeBody, setMass, setPosition, setVelocity, applyImpulse, bindNode, bindInstanced, step(dt), raycast(origin,dir,maxDist), toJSON/fromJSON, clear, setOptions`。
- **Worker**: `enablePhysics(opts, {worker:true})`。Blob Worker が使えない環境（厳しい CSP など）では `error` を通知してメインスレッドへフォールバックします。Worker 版は**1 フレーム遅延**があり、`addBodies(data, count)` は Promise で ID を返す SoA 形式です（`examples/physics-demo.html` 参照）。
- NaN/Infinity になった物体は無効化されて警告されます。毎ステップの計算量上限は `maxSubSteps`・`stepBudgetMs`・`maxCandidatePairs` で制限されます。
- **セル幅に注意**: `cellSize` を物体の直径より小さくすると「大きすぎる物体」として総当たり処理になり急激に遅くなります（警告が出ます）。通常は自動（0）のままにしてください。

## 7. シーン JSON
- `engine.saveScene() → object` / `engine.saveSceneString(space)`: 形式 `massive-engine-scene` version 1。ノード階層、変換、メッシュ、マテリアル、テクスチャ（データ/生成されたもの）、ライト、インスタンス、カメラ、背景。
- `engine.loadScene(jsonOrString, {replace=true, restoreCamera=true})`。形式が不正なら `E_SCENE_FORMAT`（日本語メッセージ）。
- **含まれないもの**: 物理状態（`world.toJSON()` を別途保存）、URL 由来で復元できないテクスチャ（白に置換して警告 `engine.lastSaveWarnings`）、更新コールバック、イベント購読。

## 8. ボクセル（BLOCKCRAFT 型）
`new VoxelWorld({chunkSize=16, palette:[null, 0x44aa44, …], transparentIds, parent: engine.scene, jobs: engine.jobs})`。ブロック ID 0 は空気。
`setBlock(x,y,z,id)`, `getBlock`, `generate(min,max,(x,y,z)=>id)`, `flush()`（同期で全再構築）, `raycast(origin, dir, maxDist) → {x,y,z,face,…}`（DDA）, `stats`, `dispose()`。隠面除去メッシュをチャンク単位で生成し、変更したチャンクだけをジョブで時間分割して再構築します。

## 9. 旧 API（試作版 2.0 互換）
`create({canvas, count, gridCellSize})` と `setCount / setSpeed / setGridCellSize / reset / count / gridCellSize / cubeRotation / getStats()` の旧キー（`fps, frameMs, stepMs, candidatePairs, overlaps, uploadMs, count`）。詳細は [MIGRATION.md](MIGRATION.md)。


---
# 1.1 追加 API（すべて opt-in。詳細な挙動は src/ の先頭コメントも参照）

## `CollisionWorld`（`engine.enableCollision(opts)` で作成、または単体で `new CollisionWorld(opts)`）
オプション: `broadphase:'hash'|'tree'|'brute'|'auto'`, `cellSize`, `maxSpan`, `fatMargin`, `emitStay`, `onEvent`, `ccdClamp`, `checkDuplicates`, `onWarning`。
```js
const w = new CollisionWorld({ broadphase: 'hash' });
const a = w.addSphere({ position:[0,0,0], radius:1, layer:1, mask:0xffffffff, userData:{} });
const b = w.addAABB({ position:[3,0,0], halfExtents:[1,1,1], static:true });
w.addOBB({ position, halfExtents, rotation:[x,y,z,w] }); w.addCapsule({ position, radius, halfLength | height, rotation });
w.addPlane({ normal:[0,1,0], offset:0 }); w.addMany([...descs]);
w.onEvent = e => { /* e.type（EVENT_START 等の文字列定数）, e.a / e.b（ハンドル）, e.trigger, 接触: e.nx,ny,nz（a→b）, e.depth, e.px,py,pz, e.toi（CCD 時）, e.userA / e.userB。
                        e は step ごとに再利用されるオブジェクトです（次の step まで有効）。保持したい場合は値をコピーしてください */ };
w.setPosition(a, x,y,z);  w.teleport(a, x,y,z);  // teleport は CCD 掃引をしない
w.setRotation / setTransform / setSize / setFilter(h, layer, mask) / setEnabled / setTrigger / setStatic / remove / removeMany
const stats = w.step();   // { stepMs, broadMs, narrowMs, ccdMs, broadTests, candidatePairs, contacts, newPairs, endedPairs, ccdHits, ... }
w.raycast(ox,oy,oz, dx,dy,dz, maxDistance, mask, triggers, out) / raycastAll(..., maxHits) / queryAABB(x0,y0,z0,x1,y1,z1, mask, triggers, out) / queryRadius(x,y,z,r, mask, triggers, out) / sweepSphere(x,y,z,r, dx,dy,dz, mask, triggers, out) / testPair(ha, hb)
w.getTouching(h) / forEachContact(fn) / forEachShape(fn) / setBroadphase('tree') / dispose()
```
- ハンドルは世代付きの数値。削除後に再利用されたスロットでも、古いハンドルは必ず無効（`isValid` が false、操作は例外）。
- `continuous:true`（球のみ）で、`step()` 時に前回位置→今回位置を掃引して貫通を検出します。
- イベント順序は広域方式に依存せず決定的です。

## 時間
`new FixedTimestep({fixedDt, maxSubSteps, maxFrameDt, timeScale})`: `update(realDt, stepFn)`, `pause()/resume()/stepOnce(fn)/setTimeScale()/reset()`, `alpha`, `simTime`, `droppedTime`。
`new Interpolator(count, {rotations})`: `capture(pos, quat)`, `lerp(out, alpha)`, `slerp(out, alpha)`。

## プロファイラ
`engine.enableProfiler()` → `engine.profiler`: `begin/end/scope`, `record`, `gauge`, `unsupported(name, reason)`, `endFrame()`, `snapshot()`, `toCSV()`, `historyCSV()`, `Profiler.compare(before, after)`。
自動で集計: `frame, cpu, update, render, gpu, drawCalls, triangles, instances, uploadBytes, collision*, jsHeapMB`。`gpu`/`jsHeapMB` が測れない環境では `supported:false`・値 `null`。

## アニメーション
`new AnimationClip(name, {loop:'repeat'|'once'|'pingpong', tracks:[{path:'position'|'rotation'|'scale'|'value:名前', keys:[{time, value, easing}]}], events:[{time,name}]})`、
`new Animator(node)`: `addClip, play(clip,{fade,speed,loop}), stop, addState, go(state,{fade}), pause/resume, update(dt)`。イベント `'event'` `'loop'` `'finished'`。`engine.addAnimator(a)` で自動更新。

## パーティクル
`new ParticleSystem({capacity, glow, gravity, drag, size, color, sizeOverLife, seed, geometry, material})`: `emit({x,y,z,count,speed,spread,direction,life,size,color,radius})`, `update(dt)`, `stats()`, `clear()`。`engine.add(ps.mesh); engine.addSystem(ps)`。

## 入力 / 音声 / リソース / デバッグ
- `InputManager`: `bindAction(name, ['key:Space','mouse:0','pad:button:0','touch'])`, `actionDown/Pressed/Released`, `bindAxis(name,{negative,positive,pad})`, `axis(name)`, `poll()`（毎フレーム先頭）, `endFrame()`（末尾）, `touches`, `mouse`, `pad`。
- `AudioSystem`: `unlock()`, `load(name,url)`, `play(name,{volume,position,loop,rate})`, `playMusic/stopMusic`, `setVolume('master'|'sfx'|'music', v)`, `setListener`, `pause()/resume()`。AudioContext が無い環境では安全な no-op。
- `ResourceManager`（`AssetManager` の拡張）: `loadOBJ/loadText/loadJSON/loadArrayBuffer`, `material(opts)`（同設定は共有）, `stats()`。`parseOBJ`, `validateGeometry`, `mergeGeometries(geos, mats)`。
- `DebugDraw`（`engine.enableDebugDraw()`）: `enabled=false` が既定。`line/point/aabb/sphere/obb/capsule/ray/text/collisionWorld(w)`、`flush()`（Engine 経由なら描画後に自動）。

## 描画の追加
`Material({blending:'additive'})`、`engine.renderer.visibilityFilter = (mesh, camera) => boolean`（false で描画から除外。オクルージョン判定を外部から接続する口）、`InstancedMesh.markInstancesDirty(start,end)`（直接書き換えた範囲だけ転送）。

## `RigidBodyWorld`（1.2、`engine.enableRigidBodyPhysics(opts)` または `new RigidBodyWorld(opts)`）
詳細は [RIGID_BODY.md](RIGID_BODY.md)。未知のオプション名は `RangeError`。
- **オプション（既定）**: `gravity [0,-9.81,0]`, `fixedTimeStep 1/60`, `maxSubSteps 8`, `maxFrameDt 0.25`, `stepBudgetMs 0`(無効), `solverIterations 10`, `positionIterations 3`, `restitutionThreshold 1`, `contactMargin 0.02`, `linearSlop 0.005`, `positionCorrection 0.2`, `maxPushSpeed 5`, `warmStarting true`, `gyroscopic true`, `contactAngularDamping 1.0`, `enableSleeping true`, `sleepLinearThreshold 0.05`, `sleepAngularThreshold 0.05`, `sleepTime 0.5`, `ccd true`, `ccdThreshold 0.5`, `maxLinearSpeed 500`, `maxAngularSpeed 200`, `broadphase 'auto'|'hash'|'tree'|'brute'`, `bruteForceThreshold 24`, `interpolate false`, `autoUnbindRemovedNodes true`, `onWarning`, `onContactBegin(a,b,sensor)`, `onContactEnd(a,b,sensor)`。
- **生成/削除**: `addBody(desc)`（`type 'static'|'dynamic'|'kinematic'`, `shape 'sphere'|'box'|'obb'|'capsule'|'plane'`, `radius`, `halfExtents`, `halfLength`, `normal`+`offset`, `position`, `orientation[x,y,z,w]`, `velocity`, `angularVelocity`, `mass|density`, `restitution`, `friction|staticFriction|dynamicFriction`, `linearDamping`, `angularDamping`, `gravityScale`, `group`, `mask`, `sensor`, `lockRotation`, `ccd`, `allowSleep`, `userData`, `node`）→ ハンドル。`addBodies([...])`, `removeBody(h)`, `removeBodies([...])`, `clear()`, `dispose()`。不正値は `RangeError`、無効ハンドルは false/null。
- **取得**: `getPosition/Orientation/LinearVelocity/AngularVelocity/Mass/Inertia/InertiaWorld/InverseInertiaWorld/Type/UserData(h)`, `isSleeping(h)`, `isValid(h)`, `bodyCount`, `stateHash()`, `getStats()`。
- **設定**: `setPosition(h,x,y,z)`, `setOrientation(h,x,y,z,w)`, `setLinearVelocity`, `setAngularVelocity`, `setMass(h,m)`, `setMaterial(h,{...})`, `setCollisionFilter`, `setType(h,type,mass?)`, `setKinematicTarget(h,x,y,z,qx,qy,qz,qw,seconds)`。
- **力**: `applyForce(h,fx,fy,fz)`, `applyTorque`, `applyForceAtPoint(h,fx,fy,fz,px,py,pz)`, `applyImpulse`, `applyImpulseAtPoint(h,ix,iy,iz,px,py,pz)`, `applyAngularImpulse`（力・トルクは毎ステップクリア）。
- **スリープ**: `wakeUp(h)`, `sleep(h)`。
- **時間**: `advance(realDt)`→実行ステップ数, `step(fixedDt)`, `pause()`, `resume()`, `setTimeScale(s)`, `alpha`, `stepCount`。
- **Node**: `bindNode(h,node)`, `unbindNode(h)`, `getNode(h)`, `syncTransforms()`, `getRenderPosition(h)`, `getRenderOrientation(h)`（補間・状態を変えない）。
- **拘束**: `addConstraint(c)`, `removeConstraint(c)`（`DistanceConstraint`/`BallSocketConstraint`、実験的）。
- **クエリ**: `raycast(origin, dir, maxDist)`, `queryAABB(minx,miny,minz,maxx,maxy,maxz,cb)`, `forEachBody`, `forEachContact`。
- **統計**: `bodies, activeBodies, sleepingBodies, staticBodies, kinematicBodies, candidatePairs, contactPairs, contactPoints, solverIterations, positionIterations, solverMs, broadphaseMs, narrowphaseMs, integrationMs, ccdCount, ccdMs, maxPenetration, droppedTime, stepMs, substeps, truncatedSteps, unsupportedPairs, unboundNodes`（CPU 時間のみ）。
- **デバッグ描画**: `DebugDraw.rigidBodyWorld(w, {enabled:true, ...})`（既定 OFF）。
