# サードパーティ ライセンス表記

MakerChip Figure Studio本体(コード、部品メッシュ、線画)は[MIT License](LICENSE)です。公開サイトには以下のソフトウェアが含まれます。各コンポーネントはそれぞれのライセンスに従って再配布しています。

## ブラウザに読み込まれるもの

| コンポーネント | ライセンス | 著作権 |
| --- | --- | --- |
| [three.js](https://github.com/mrdoob/three.js) | MIT | Copyright © 2010-2025 three.js authors |
| [Manifold](https://github.com/elalish/manifold)(manifold-3d、WebAssembly) | Apache-2.0 | The Manifold Authors |
| [fflate](https://github.com/101arrowz/fflate) | MIT | Copyright (c) 2026 Arjun Barrett |
| [Phosphor Icons](https://github.com/phosphor-icons/core)(@phosphor-icons/core) | MIT | Copyright (c) 2023 Phosphor Icons |

各ライセンスの全文は、`app/node_modules/<パッケージ名>/LICENSE`(`npm ci`後)または上記リポジトリにあります。公開サイトでは、three.jsのライセンスを`assets/vendor/LICENSE-three.txt`として同梱しています。

## ビルド・テストのみで使うもの(配布物に含まれない)

Vite(MIT)、Playwright(Apache-2.0)。

MakerChipは[makerchip.app](https://makerchip.app/)で紹介されているメイカー向けトークンの名称です。本プロジェクトはMakerChipに合わせたフィギュアのジェネレーターであり、makerchip.appの運営者とは関係ありません。
