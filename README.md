# MASSIVE ENGINE 1.0

外部ライブラリ（Three.js 等）に依存しない、WebGL 2 ベースの汎用 Web 3D エンジンです。
`<script>` タグ 1 本、または ES モジュールとして既存ページへ埋め込めます。試作版 2.0（粒子シミュレーション）の API は互換モードで引き続き使えます。

> **最初に読んでください（正直な到達点）**
> - 実ブラウザテストは **Chromium + ソフトウェア描画（SwiftShader）** でのみ実施しました。Firefox / Safari / 実 GPU / スマートフォンでは**未検証**です。手順は [docs/TESTING.md](docs/TESTING.md) の「あなたの環境で確認する」にあります。
> - **BLOCKCRAFT のファイルは受け取っていないため、実ゲームとの統合テストは未実施**です。代わりに並行導入のための部品（`VoxelWorld`）と手順書 [docs/BLOCKCRAFT統合ガイド.md](docs/BLOCKCRAFT統合ガイド.md) を用意しました。
> - 物理は「球と軸平行箱（回転なし）」の簡易エンジンです。フルの剛体物理エンジンではありません（[docs/LIMITATIONS.md](docs/LIMITATIONS.md)）。
> - WebGPU は未実装です。
> - **ライセンスは未設定**です（`package.json` は `UNLICENSED`）。公開する場合は所有者が選んで `LICENSE` を追加してください。

## 30 秒で動かす

```html
<canvas id="c" style="width:100%;height:60vh"></canvas>
<script src="massive-engine.js"></script>
<script>
  const engine = MassiveEngine.create({ canvas: document.getElementById('c') });
  engine.addPlane({ width: 20, depth: 20, color: 0x88aa88, receiveShadow: true });
  engine.addBox({ size: [2, 2, 2], position: [0, 1, 0], color: 0xff7755, castShadow: true });
  // マウスドラッグで回転・ホイールでズーム（既定で有効）
</script>
```

ローカルで確認するには（`file://` では動きません。HTTP サーバーが必要です）:

```
node tools/serve.mjs 8080      # → http://localhost:8080/
```

## 同梱物

| パス | 内容 |
|---|---|
| `src/` | エンジンのソース（ES モジュール、依存なし） |
| `dist/massive-engine.js` / `.min.js` | 通常の `<script>` 用（グローバル `MassiveEngine`） |
| `dist/massive-engine.esm.js` / `.esm.min.js` | ES モジュール用 |
| `massive-engine.js`, `massive-engine.mjs`（ルート） | 試作版と同じ URL で差し替えられるコピー |
| `index.html` | 試作版互換の粒子デモ（10 秒ベンチ付き） |
| `examples/basic-scene.html` | 基本 3D デモ（メッシュ・テクスチャ・光・影・透明・インスタンス・ピッキング・シーン JSON・品質） |
| `examples/physics-demo.html` | 衝突・物理デモ（メインスレッド／Worker 切替） |
| `examples/resource-demo.html` | リソース管理デモ（参照カウント・stop/dispose/再生成・コンテキスト喪失） |
| `examples/voxel-demo.html` | ブロック追加/削除（BLOCKCRAFT 型の統合部品デモ） |
| `examples/embed-example.html` | HTML 埋め込み（エンジン 2 台同居） |
| `examples/module-example.html` | ES モジュール利用例 |
| `examples/external-site-example.html` | 別サイトから GitHub Pages 上のエンジンを読む雛形 |
| `bench/index.html` | ブラウザ用ベンチマーク／候補ペア正当性チェック（エンジン本体と独立） |
| `bench/physics-bench.mjs` | Node 用の物理ベンチマーク |
| `tests/unit/` | 単体テスト（66 件） |
| `tests/browser/run.mjs` | 実ブラウザテスト（28 件） |
| `docs/` | API・機能一覧・制限・テスト・公開手順・移行・BLOCKCRAFT 統合 |

## ビルドとテスト

```
npm install            # esbuild（ビルド専用の開発依存）。テスト実行には playwright も必要
npm run build          # dist/ とルートのコピーを再生成
npm test               # 単体テスト 66 件（ブラウザ不要）
npm run test:browser   # Chromium で 28 件（playwright が必要）
npm run bench:physics  # Node で物理ベンチ
```

## ドキュメント

- [API リファレンス](docs/API.md)
- [実装済み／未実装の機能一覧](docs/FEATURES.md)
- [既知の制限と対応ブラウザ](docs/LIMITATIONS.md)
- [テスト手順と結果](docs/TESTING.md)
- [公開手順（GitHub Pages）](docs/DEPLOY.md)
- [試作版 2.0 からの移行](docs/MIGRATION.md)
- [BLOCKCRAFT 統合ガイド](docs/BLOCKCRAFT統合ガイド.md)
- [サードパーティ・ライセンス](THIRD_PARTY.md)
