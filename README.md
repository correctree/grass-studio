# GRASS STUDIO v1.5.1 — GEOMETRY EDITOR

Blenderなしで4m×4m芝生メッシュをブラウザ内で再生成するWebアプリです。

## GitHub Pages
ZIP展開後、`GRASS_STUDIO_v1_5_1_GEOMETRY` 内の `index.html` と `main.js` をGitHubリポジトリの**直下**にアップロードし、Settings → Pages → Deploy from a branch / main / (root) で公開します。v1.5のバックアップを取ってから差し替えてください。

## 編集
- 葉の長さ・幅・曲率・個体差・実メッシュ密度（形状変更で再生成）
- 色相・彩度・明るさ・粗さ
- 風の強さ・速さ（GLBには入りません）
- タイル数 1～9（GLBには1タイルのみ出力）
- SAVE JSON / LOAD JSON / RESET
- EXPORT GLB : 4m×4mの静止した芝のメッシュと地面。WebXRやThree.jsにロード可能なglTF Binaryを生成します。

## 重要な制約
- 本バージョンのメッシュはWeb上で生成します。従来のv1.4のGLBは必要ありません。
- メッシュの境界は周期的にクリップされますが、タイル間での風の継ぎ目・端末間差を完全には保証しません。
- 風シェーダー、天候、インタラクションはGLBに保存されません。保存したJSON設定を再現するには受信側の実装が必要です。
- 葉の密度やタイル数を極端に上げるとスマートフォンで動作が重くなる場合があります。
- JSモジュールをCDNからロードするため初回接続はネット環境が必要です。
- この環境ではJavaScript構文検証を実施しました。Chrome・Safari、GLB書き出しの実機確認は未完了です。

## 利用方法
GitHub Pagesに公開するか、Macのターミナルでこのフォルダ内で `python3 -m http.server 8005` を実行して `http://localhost:8005/` を開いてください。
