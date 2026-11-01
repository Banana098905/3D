# 試作版 2.0 からの移行

**そのまま動きます（互換モード）。** 試作版の `massive-engine.js` を新しいファイルに置き換えるだけで、`MassiveEngine.create({canvas, count, gridCellSize})` と `new MassiveEngine.Engine({...})` は同じ粒子シーンを生成します。

## 互換が保たれるもの
`create`, `Engine`, `start/stop/dispose`, `setCount/setSpeed/setGridCellSize/reset`, `count`, `gridCellSize`, `cubeRotation`, `getStats()` の旧キー（`fps, frameMs, stepMs, candidatePairs, overlaps, uploadMs, count`）、`onStats`、`isSupported()`。ルートの `massive-engine.js` / `.mjs` は試作版と同じ URL 用です。

## 変わったこと（要確認）
| 項目 | 試作版 | 1.0 |
|---|---|---|
| 物理ステップ | 可変 | **固定タイムステップ**（1/60、最大 4 サブステップ）。遅い端末では時間を捨てて固まりを防ぎます |
| `isSupported` | canvas を渡す形 | 引数なし（一時 canvas で判定） |
| コンテキスト復元 | 手動 | **自動で再作成して再開** |
| 破棄後の操作 | 不定 | `E_DISPOSED` を投げる |
| 同じ canvas に 2 台目 | 不定 | `E_CANVAS_IN_USE` を投げる（先に `dispose()`） |
| `start()` | | 同じ（`resume()` は別名） |
| `count` を省略 | — | 空のシーン（互換粒子は生成されない）。`setCount` などは `count` 指定時のみ有効で、それ以外は例外 |
| タブが非表示 | （試作版の挙動は未確認） | 既定で停止し、表示に戻ると自動再開（`pauseWhenHidden:false` で無効化） |
| 物理 | 粒子専用 | 汎用 `PhysicsWorld`（粒子プリセットは新物理上で再現: 平面グリッド、反発 0.12 等）。**ステップ結果の数値は試作版と完全一致しません** |

## 新 API への移行例
```js
// 旧
const engine = MassiveEngine.create({ canvas, count: 5000 });
// 新（粒子ではなく自分のシーンを作る）
const engine = MassiveEngine.create({ canvas });
const world = engine.enablePhysics({ planar: true, gravity:[0,0,0] });
```
試作版で測定していた設定（セル幅 0.60、アクティブセルのみ走査、隣接オフセット事前計算）は、新物理でも既定動作として維持しています（自動セル幅が 0.60 を再現）。


---
# 1.0 → 1.1

**破壊的変更はありません。** 1.0 のコードはそのまま動きます（既存の単体 66 件・ブラウザ 28 件のテストは変更なしで PASS）。追加はすべて opt-in です。

| 追加 | 使い方 |
|---|---|
| 衝突ワールド | `const w = engine.enableCollision({fixedDt:1/60})` → `w.addSphere({position, radius, layer, mask, trigger, continuous})`、`w.onEvent = e => ...` |
| プロファイラ | `engine.enableProfiler()` → `engine.profiler.snapshot()` / `.toCSV()` |
| 入力 | `engine.enableInput()`（`engine.input`（1.0 の簡易版）はそのまま残り、新機能は `engine.inputManager`） |
| 音声 / デバッグ描画 / リソース | `engine.enableAudio()` / `engine.enableDebugDraw()` / `engine.resources`（`engine.assets` はそのまま） |
| アニメ・パーティクル | `engine.addAnimator(anim)`, `engine.addSystem(particleSystem)` |
| 物理の補間・停止・ハッシュ | `enablePhysics({interpolate:true})`, `physics.pause()`, `physics.stateHash()` |
| マテリアル | `new Material({blending:'additive'})`（既定 `'normal'`） |
| 統計 | `getStats()` に `uploadBytes, vertices, textureBytes, visibilityCulled` を追加（既存キーは不変） |

挙動が変わる点: `InstancedMesh` のチャンク更新が「変更範囲だけの転送」になりました（見た目は同じ。画像一致をテスト済み）。`InstancedMesh.chunks[i]` に内部フィールド `dLo/dHi` が増えました（直接触っていなければ影響なし）。
`massive-engine.js` / `.mjs`（ルート）と `dist/` は 1.1.0 に更新されています。


# 1.1 → 1.2
破壊的変更はありません。既存の `PhysicsWorld` / `CollisionWorld` は無変更で、`Engine` の既定動作も変わりません。
- 剛体が必要なら `engine.enableRigidBodyPhysics(options)`（opt-in）。粒子のように大量の球を軽く動かすだけなら従来の `PhysicsWorld` のほうが数倍〜十数倍速い（docs/RIGID_BODY.md の比較表）。
- `PhysicsWorld`→`RigidBodyWorld` の対応: `addBody({radius,...})`→`addBody({shape:'sphere',radius,...})`、境界は `bounds` ではなく static 平面/箱で作る、`mass` は必須でなく `density` から計算可。
- 力・トルクは毎ステップクリアされる。ハンドルは世代付き（削除済みは null/false）。
- `massive-engine.js` / `.mjs` と `dist/` は 1.2.0 に更新。
