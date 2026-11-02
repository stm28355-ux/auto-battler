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
4. 変更をコミットして `main` に push すると、数分で GitHub Pages に反映される

| フォルダ | 内容 |
|---|---|
| `src/data/` | ボード・駒・遺物・種族・プリセットチームの定義 |
| `src/core/` | コスト計算・チーム検証・前線判定など（DOMに依存しない） |
| `src/engine/` | 戦闘エンジン（`runBattle` / `createBattle`。DOMに依存しない） |
| `src/ui/` | 画面描画 |
| `test/` | テスト（`node --test`） |
| `tools/` | 開発用スクリプト |

```bash
git add .
git commit -m "変更内容"
git push
```
