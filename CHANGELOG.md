# 変更履歴

## 1.2.0
- 追加: `RigidBodyWorld`（3D 剛体）。static/dynamic/kinematic/sensor/軽量(lockRotation)、クォータニオン・角速度・トルク・慣性（球/箱/カプセル）、多点接触マニフォールド（特徴ID・累積インパルス・ウォームスタート）、逐次インパルス+スプリットインパルス、静/動摩擦、反発しきい値、島単位スリープ、芯球 CCD（部分実装）、固定刻み（時間予算・破棄時間）、Node 同期+Slerp 補間、デバッグ描画（既定 OFF）、統計
- 追加: 拘束の基盤（`addConstraint`）と実験的な `DistanceConstraint` / `BallSocketConstraint`（**Hinge/Fixed は未実装**）
- 追加: `engine.enableRigidBodyPhysics(options)` / `disableRigidBodyPhysics()`、`DebugDraw.rigidBodyWorld`
- 追加: `docs/RIGID_BODY.md`、`bench/rigid-bench.mjs`、`bench/rigid-broadphase-threshold.mjs`
- テスト: 単体 134 → 194（剛体 60 件追加）。既存 134 件は変更なしで全通過
- 既存の `PhysicsWorld` / `CollisionWorld` は無変更。破壊的変更なし
- 既知: 転がり/ねじり摩擦は未実装（接触時角減衰 `contactAngularDamping` で近似）、カプセル×箱は近似、10k 動的体は 60fps に収まらない（docs/RIGID_BODY.md）

## 1.1.0
- 追加: `CollisionWorld`（球/AABB/OBB/カプセル/平面/レイ、空間ハッシュ・動的ツリー・総当たり、開始/継続/終了/トリガー、レイヤー、球の CCD、空間クエリ）
- 追加: 世代付きハンドル `HandleAllocator` / `HandlePool`、`FixedTimestep` / `Interpolator`
- 追加: `Profiler`（平均/中央値/P95/P99/最大、CSV、GPU 非対応の明示）、`DebugDraw`（別オーバーレイ・既定 OFF）
- 追加: アニメーション（キーフレーム・イージング・クリップ・状態・イベント）、`ParticleSystem`（プール・発光）
- 追加: `InputManager`（キーボード/マウス/タッチ/ゲームパッド/アクション）、`AudioSystem`、`ResourceManager`（重複排除・OBJ・マテリアル共有）、`mergeGeometries`
- 改善: InstancedMesh の GPU 転送を変更範囲のみに（1% 更新で転送量 1/100）
- 追加: `Material.blending:'additive'`、`renderer.visibilityFilter`、統計 `uploadBytes/vertices/textureBytes/visibilityCulled`
- 追加: `PhysicsWorld` の `interpolate` / `pause()` / `resume()` / `stateHash()`（既定は従来どおり）
- 追加: Engine の opt-in API（`enableCollision` `enableProfiler` `enableInput` `enableAudio` `enableDebugDraw` `resources` `addAnimator` `addSystem`）
- テスト: 単体 66 → 134、ブラウザ 28 → 34
- 破壊的変更なし

## 1.0.0
初版（試作版 2.0 からの汎用化）。
