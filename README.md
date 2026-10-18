# GRASS STUDIO v1.6.7 — CUSTOM FORM BEHAVIOR

v1.6.6.2の表示切替・床色・CUSTOM GLB・配色・風・音・アコーディオンを継承。

## 追加機能
- FLOAT / ATTRACT / REPEL / SWARM
- BEHAVIOR STRENGTH / SPEED
- AUDIO SPREAD: マイク入力で集合体を拡散
- COLOR SYNC: 群体の動きと色彩を連動
- POINTER INTERACTION: 3Dビューのクリック・タッチを目標点に使用
- RESET BEHAVIOR
- JSON保存・読み込み: behaviorオブジェクトを追加

## ローカルで確認
Macのターミナルでこのフォルダに移動し、`python3 -m http.server 8016`。Chromeで http://localhost:8016/ を開きます。

1. CUSTOM GLB PARTICLESから任意のGLBを読み込む
2. VISIBILITY CONTROLからCUSTOM GLB ONLYを実行
3. CUSTOM FORM BEHAVIORでATTRACT, REPEL, SWARMを切替
4. 3Dビューをクリック・タッチして位置の変化を確認
5. MIC ONと音反応感度を有効にしてAUDIO SPREADを試す
6. SAVE JSON / LOAD JSON、EXPORT GLBを確認

注意: この版は力学ベースの衝突シミュレーションではなく、インスタンス変換を使った群体アニメーションです。GLBにはその時点の静止メッシュだけを出力し、挙動はJSONで保持します。CUSTOM GLBそのものはJSONへ埋め込まれません。実ブラウザでの動作は未検証です。
