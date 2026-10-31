# セットアップと公開手順

## 1. ローカルで動かす
```
cd massive-engine-1.0
node tools/serve.mjs 8080         # 依存なしの静的サーバー（Node 18 以上）
```
ブラウザで `http://localhost:8080/` を開きます。`index.html` が試作版互換のデモ、上部のナビから他のデモに移れます。

## 2. 自分のページに埋め込む（ビルド不要）
`massive-engine.js`（または `dist/massive-engine.min.js`）を自分のサイトへ置き、`<script src="…">` で読み込みます。例は `examples/embed-example.html`。ES モジュールなら `dist/massive-engine.esm.js`（`examples/module-example.html`）。

## 3. GitHub Pages で公開する
1. GitHub で新しいリポジトリを作成（例: `massive-engine`）。
2. このフォルダの中身（`.nojekyll` を含む）をリポジトリ直下にアップロード、または `git push`。
   - `node_modules/` は不要です。`dist/` とルートの `massive-engine.js` は**ビルド済みを同梱済み**です。
3. リポジトリの **Settings → Pages → Build and deployment** で Source を `Deploy from a branch`、Branch を `main` / `/ (root)` にして Save。
4. 数分後に `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開されます。`index.html` がトップです。
5. 公開後の確認: トップが表示され、各デモが動くこと（ブラウザの開発者ツールのコンソールにエラーがないこと）。
- `.nojekyll` は GitHub Pages が `_` で始まるファイル等を無視しないための空ファイルです。
- 別サイトから読み込む場合は `examples/external-site-example.html` を参照（`YOUR-USERNAME` / `YOUR-REPOSITORY` を必ず置換してから公開してください）。**他人のページから読み込むときは、バージョン固定のためにタグ（例 `v1.0.0`）付きのコピーを使うことを推奨します。**

## 4. 再ビルド
```
npm install
npm run build
```
`src/` を変更したら必ず再ビルドし、`dist/` とルートの `massive-engine.js` / `massive-engine.mjs` を一緒に更新してください。
