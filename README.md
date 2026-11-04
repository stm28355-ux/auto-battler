# Auto Battler

静的HTML/JavaScriptで動くブラウザゲーム。

## 遊ぶ

GitHub Pages で公開中: https://stm28355-ux.github.io/auto-battler/

## 開発

仕様は [docs/spec.md](docs/spec.md)、進捗は GitHub の Issues / Milestones で管理する。

1. VS Code でこのフォルダを開く（推奨拡張機能のインストールを求められたら許可）
2. `index.html` を右クリック →「Open with Live Server」でブラウザ確認（保存すると自動リロード）
   - Live Server を使わない場合は `npm run serve` → http://localhost:5173/
   - ESモジュールを使っているため、`index.html` をダブルクリックで開くと動かない
3. `npm test` でテスト（Node.js が必要）
   - バランスの確認は `node tools/balance.js`（ランダムなチーム）と `node tools/meta.js`（上位の型の総当たり。チームは `tools/meta-teams/<環境ID>/`）、`node tools/search.js`（ゼロから強いチームを探す）。使い方と数値は [docs/spec.md](docs/spec.md) §11、調整用の値は `src/data/balance.js`
   - 対戦環境（バージョン）の仕組みと、新しいバージョンの切り方は [docs/spec.md](docs/spec.md) §12（`node tools/snapshot-env.js`）
4. 変更をコミットして `main` に push すると、数分で GitHub Pages に反映される

| フォルダ | 内容 |
|---|---|
| `src/data/` | ボード・駒・遺物・種族・プリセットチームの定義（最新の環境）。`environments/` に固定した過去の環境、`environment.js` が切り替え |
| `src/story/` | ストーリーモードのシナリオ（`script.js`）と進行状況（`progress.js`） |
| `src/rogue/` | ローグライトモードの決まりごと（`config.js`）・報酬・敵・引継ぎ・挑戦の進行 |
| `src/core/` | コスト計算・チーム検証・前線判定など（DOMに依存しない） |
| `src/engine/` | 戦闘エンジン（`runBattle` / `createBattle`。DOMに依存しない） |
| `src/storage/` | チーム・自作駒の保存（localStorage）とJSON入出力・検証（手編集したJSONも想定して厳しく検査する） |
| `src/ui/` | 画面（`home.js` ホーム、`rules.js` ルール、`story.js` ストーリー、`rogue.js` ローグライト、`pieceEditor.js` 駒作成タブ、`teamEditor.js` チーム編成タブ、`battleScreen.js` 対戦タブ、`dataView.js` 図鑑（データ一覧）タブ、`boardView.js` 盤面SVG） |
| `test/` | テスト（`node --test`） |
| `tools/` | 開発用スクリプト（`serve.mjs` 開発サーバー、`balance.js` バランス調整ツール、`meta.js` 上位チームの総当たり、`search.js` 強いチーム探し、`story.js` ストーリーの難易度、`rogue.js` ローグライトの難易度、`snapshot-env.js` 環境の固定） |

```bash
git add .
git commit -m "変更内容"
git push
```
