# GRASS STUDIO v1.5 EDITOR

v1.4.4 (動作確認済み) を基にしたWebエディター初版。

## 主な機能
- 風の強さと速さ（継続）
- 芝の長さ（GPU頂点変形：0.45～2.3倍）
- 芝の表示密度（COLOR_0に記録された葉の乱数による間引き、0.1～1.0）
- 芝の色相、彩度、明るさ、粗さ
- 4mタイルの複数表示
- `SAVE JSON` / `LOAD JSON`：設定の往復

## 制限事項
- 編集はブラウザ上の表示です。GLBそのものを書き換えません。
- JSONは NATURE STUDIO の暫定形式です。別のWebAR / XR環境では対応する読込処理が必要です。
- 長さの変化はシェーダーによる高さ方向の伸縮で、葉の幅は一定です。
- 密度の調整は葉を表示上間引くだけで、GPU上の頂点数は減りません。
- GLBにはTwo-sided grass material等を含んでいます。動作・表示速度は利用環境依存です。
- WebGLシェーダーの全端末検証は未実施。既存v1.4.4は別フォルダで保存推奨。

## GitHub Pages
展開した4ファイルを `grass-studio` などの**新しいリポジトリ**のルートに配置。
Settings → Pages → Deploy from a branch / main / root を選ぶ。
既存 `grass-wind` 公開版は上書きしないでください。

## ローカル確認
このフォルダをターミナルで `cd` してから `python3 -m http.server 8015`。
`http://localhost:8015/` を開きます。
