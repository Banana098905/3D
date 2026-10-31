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
