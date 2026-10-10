# MakerChip Figure Studio — app

Studio本体。静的サイトとしてビルドし、公開サイトでは`/app/`に置きます。three.jsとManifold(WebAssembly)をブラウザ内で実行し、サーバーや外部CDNは使いません。

## コマンド

```sh
npm ci
npm run dev            # 開発サーバー http://127.0.0.1:5173
npm test               # 形状・設定・3MF・CLIのテスト(Node)
npm run test:browser   # ブラウザテスト(Playwright。既定URLは開発サーバー)
npm run build          # dist/ へビルド
```

ブラウザテストのURLは`TEST_URL`、Chromeの場所は`CHROME_PATH`で切り替えます。Chromeがない場合は`npx playwright install chromium`。開発サーバーの起動直後はViteの依存最適化でページが再読込され、最初のテストが失敗することがあります。その場合は再実行してください。

`npm run build`は`public/`のうち、Studioが読む`assets/outfits-v11/`と`assets/illustrations/registered-v2/`だけを`dist/`へコピーします(`vite.config.js`の`PUBLIC_ASSETS`)。

## コマンドラインで生成

```sh
node scripts/generate.mjs --config settings.json --out ./my-figure
```

Studioで保存した設定JSONから、部品ZIP・色付き3MF・設定・形状集計JSONを出力します。`--config`を省略すると初期設定を使います。既存のディレクトリには書き込まず停止します。

## 設定と接続

設定JSONは`schemaVersion: 5`。不正な設定を読み込んでも現在の設定は変わりません。生成中や入力エラー中は書き出せません。

| 接続 | 入力の意味 | 初期値(暫定) |
| --- | --- | ---: |
| 首の六角ピン | 六角穴の対辺へ片側量の2倍を加算 | 0 mm |
| 腰 | 穴の幅・奥行へ片側量の2倍を加算 | 0.075 mm |
| 左足 / 右足 | 穴径へ片側量の2倍を加算、左右独立 | 各0.075 mm |

頭部のねじ・チップの嵌合寸法は固定です。出力はmm、各部品は造形向きで底面をZ=0に置いています。スライサーへ100%で読み込み、プリント設定はお使いの環境に合わせて見直してください。

## 紹介ページからのリンク

`/app/#upper=<id>&lower=<id>&shoes=<id>&colors=<上着>,<ボトムス>,<靴>,<頭>`(色は#なしの6桁)で、その組み合わせを開きます。読み込み後にURLから消し、ブラウザへ保存します。ヘッダーの「00 はじめに」は`../`へ戻ります(`VITE_HOME_URL`で変更可)。

## 構成

- `src/config.js`: 衣装、部品、接続、プリセット、設定の検証
- `src/outfit-engine.js` / `scripts/outfit-stock-interface.mjs`: 接続部の加工
- `src/worker.js`: 部品の読込と形状演算(Worker)
- `src/export.js` / `src/export-worker.js`: STL、ZIP、色付き3MF
- `src/viewer.js`: 3D表示、カメラ、部位のタップ選択
- `src/illustrations.js`: 着せ替え用の線画
- `src/main.js` / `src/style.css`: 画面
- `public/assets/outfits-v11/`: 20衣装の部品メッシュと頭部
- `public/assets/illustrations/registered-v2/`: 線画

旧版の部品セット(v1/v2/v9/v10)を指定した設定は、このリポジトリには該当資産がないため生成できません。Studioで読み込むと現行版へ移行します。
