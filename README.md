# GRASS STUDIO v1.6.1 — STOCHASTIC WIND

GitHub Pages / Three.js 0.170.0。既存 v1.6.0 の機能（形状編集、GLB静止メッシュ出力、マイク入力、JSON保存）を引き継ぎ、シード付きの時間変動する風を追加。

## New controls
- DIRECTION VARIATION: 基準風向からの最大角度 ±0–180°
- SPEED VARIATION: 基準風速の倍率の偏差 ±0–100%
- CHANGE INTERVAL: 変動ノードの間隔 1–30秒
- SMOOTHNESS: 隣接ノードの補間の滑らかさ 0–100%
- WIND SEED: 同条件で再現可能な乱数パターン
- NEW SEED: 別のパターンを選択
- RESTART WIND: 経過時間を0へ戻す
- ライブ表示: 風向・風速倍率・経過秒数

## Run locally
ターミナルで、このファイルのあるフォルダに移動し、`python3 -m http.server 8007`、ブラウザで http://localhost:8007/ を開く。

## GitHub Pages
既存 correctree/grass-studio の develop ブランチに `index.html`, `main.js`, `README.md` をアップロード。動作確認後に Pull Request → main。新しいリポジトリ不要。

## Data export
SAVE JSON: 旧v1.6プリセットとの互換性あり。追加の風変動パラメータと windSeed を記録。
EXPORT GLB: 芝の静止メッシュと色のみ。風・マイク反応等をGLB単体へ埋め込むものではない。XR再生側へはJSONと風ランタイムを持ち込む必要がある。

## Notes
- ランダム変動は Math.imul のシード付きハッシュと周期間の補間で計算。
- SEED、風向、変化間隔が同じで、経過秒数が同じなら同じ変動値（マイク除く）。
- GLB生成・JSON再読み込み・風の動作は各自のブラウザで確認してください。JavaScript構文を検査済みですがブラウザ実機検証は未実施です。
