# GRASS STUDIO v1.6.8.3 — SMOOTH BODY INTERACTION

v1.6.8.2のローカルMediaPipeによる手の認識成功版を基に、以下を改善しました。

- HAND SMOOTHING: 手座標の指数平滑化
- MOTION SMOOTHING: 造形群のフレーム時間に応じた追従補間
- PINCH HYSTERESIS: しきい値を0.43（ピンチ開始）/0.72（解除）に分けてチラつきを軽減
- HAND LOST GRACE: 350msの認識欠落を許容
- INFERENCE LIMIT: 認識を約15fps上限に抑え、画面描画への影響を軽減
- JSONに追加の滑らかさ設定を保存

## 初回セットアップ
新規の展開フォルダでは `bash setup-mediapipe.sh` が必要です。既存のv1.6.8.2で用意したvendor/mediapipeの実体ファイルをこのフォルダへコピーしても利用できます。

## 起動
`python3 -m http.server 8020` を実行し、http://localhost:8020/ を開きます。

## 注意
GLB描画負荷が高い場合はCUSTOM GLB COUNTを100〜200に下げてください。今回はブラウザ上での実機検証はできていません。GitHubへの反映は成功確認後に行ってください。
