# BLOCKCRAFT 統合ガイド（並行導入）

> **状況**: BLOCKCRAFT のファイルはまだ受け取っていないため、**実ゲームでの統合テストは未実施**です。ここには (1) すぐ使える部品、(2) 並行導入の手順、(3) あなたが実行できる検証チェックリストを書きます。ゲームのファイルを共有いただければ、同じ手順で実際に検証して結果を追記できます。

## 方針
既存の Three.js 描画は**置き換えません**。新エンジンを**別の canvas**で並行して動かし、同じブロックデータを描いて見比べ、問題がなければ段階的に切り替えます。不具合時はエンジンを `dispose()` するだけで元に戻ります。

## 使う部品
`VoxelWorld`（ブロックのチャンク・隠面除去メッシュ・時間分割再構築・DDA レイキャスト）。デモは `examples/voxel-demo.html`。

## 手順
1. `massive-engine.js` をゲームの HTML と同じ場所に置く。
2. ゲームに URL フラグ（例 `?engine=massive`）を追加。フラグがある時だけ以下を実行（無ければ従来どおり）。
3. 重ねて表示するための canvas を作る（既存の canvas の隣または上。操作は既存側が受けるので `pointer-events:none`）。
4. 下のアダプターを、ゲームのブロック取得／変更の関数に合わせて書き換える（**`getBlockId` などは仮の名前**です）。

```js
// ゲーム側の実際の関数名に置き換えること
function startMassiveMirror(game) {
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, { position:'fixed', right:'8px', bottom:'8px', width:'320px', height:'200px', pointerEvents:'none', zIndex:9999, border:'1px solid #888' });
  document.body.appendChild(canvas);
  const engine = MassiveEngine.create({ canvas, controls:false, background:0x88aaff });
  const vw = new MassiveEngine.VoxelWorld({ chunkSize:16, palette: game.blockColors /* [null, 0x…, …] */, parent: engine.scene, jobs: engine.jobs });
  // 既存のワールドを流し込む（大きい場合は jobs で分割）
  vw.generate([0,0,0],[game.sizeX, game.sizeY, game.sizeZ], (x,y,z) => game.getBlockId(x,y,z));
  // ゲーム側のブロック変更フックから呼ぶ
  game.onBlockChanged = (x,y,z,id) => vw.setBlock(x,y,z,id);
  // カメラ追従（ゲームのカメラ位置・向きを毎フレーム渡す）
  engine.addUpdate(() => { const p = game.camera.position; engine.camera.setPosition(p.x,p.y,p.z); engine.camera.lookAt(p.x + game.lookDir.x, p.y + game.lookDir.y, p.z + game.lookDir.z); });
  return { engine, vw, stop(){ engine.stop(); }, resume(){ engine.resume(); }, dispose(){ vw.dispose(); engine.dispose(); canvas.remove(); } };
}
```

## 検証チェックリスト（要求どおりの 8 項目）
| # | 項目 | 合格条件 |
|---|---|---|
| 1 | 起動 | `?engine=massive` で開いてコンソールにエラーなし、`engine.getStats().frames` が増える |
| 2 | 描画 | ミラー canvas にゲームと同じ地形が出る（目視、またはスクリーンショットを並べる） |
| 3 | カメラ | プレイヤーが動くとミラーの視点も追従する |
| 4 | ブロック追加/削除 | 置く・壊すと `vw.stats.dirty` が増え、約 0.5 秒以内に 0 に戻り、見た目が一致する |
| 5 | リサイズ | ウィンドウを変えてもミラーが崩れない（`canvas.width` が追従） |
| 6 | 停止 | 一時停止画面などで `stop()` → `getStats().frames` が止まる。`resume()` で再開 |
| 7 | ゲーム復帰 | フラグ無しで開き直す／`dispose()` 後にゲームが従来どおり動く |
| 8 | リソース解放 | `dispose()` 後に `create()` し直しても `getStats().geometries / textures / gpuBytes` が 0 から始まる。20 回繰り返して JS ヒープが増え続けない |

## 注意
- BLOCKCRAFT 側が Three.js で WebGL コンテキストを使うため、**別の canvas（別コンテキスト）**を使うこと。同じ canvas は共有できません。
- ブロック種類が 255 を超える場合は `VoxelWorld` のデータ型（Uint8）の拡張が必要です。
- 影・半透明ブロック（水など）は `transparentIds` を指定。透明ブロックの並べ替えはチャンク単位です。
- DEEPBOUND への方向転換（地下 1000 m）で世界が縦に深くなる場合は、`chunkSize` と Y 方向のチャンク数、初期生成を `engine.jobs` で分割する運用を推奨します。**これらの規模での性能は未測定**です。
