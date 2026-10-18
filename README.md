# GRASS STUDIO v1.6.3 — DYNAMIC EXPRESSION

v1.6.2 SHAPE & MATERIAL EDITORを基に、風と音で芝の葉先の曲がり・上下変位が変化する機能と色彩パルスを追加した開発版です。

## 起動

1. この3ファイル（index.html、main.js、README.md）を同じフォルダに配置。
2. ターミナルでそのフォルダへ移動して `python3 -m http.server 8009` を実行。
3. Chromeで `http://localhost:8009/` を開いて動作確認。

GitHub Pagesでは既存の `grass-studio` リポジトリの `develop` ブランチにファイルを差し替えてください。動作確認後に main にマージしてください。

## 新機能

- DYNAMIC BEND: 葉の先端ほど大きい湾曲変化
- AUDIO MORPH: マイク音量による変形（MIC ON と音感度の設定が必要）
- MORPH FREQUENCY: 変形周期
- COLOR PULSE: 変形と色彩の連動

元のv1.6.2が持つ造形編集、材質編集、STOCHASTIC WIND、マイク入力、JSON保存・読み込み、静的GLB書き出しを引き継ぎます。

## 検証ポイント

- [ ] 芝生が表示される
- [ ] 葉の長さ・幅・密度・ねじれ等が変更できる
- [ ] 風向・風速のランダム変化が動く
- [ ] DYNAMIC BENDを0と1.5にした時、葉の変形に違いがある
- [ ] MIC ONしてAUDIO MORPHを上げたとき変形が増える
- [ ] COLOR PULSEを変えた時に色の変化が見える
- [ ] JSON保存・読み込みができる
- [ ] GLBのエクスポートとBlenderへの再インポートができる

## エクスポート制限

EXPORT GLBはメッシュの静的形状・基本材質のみを保存します。動的な葉の変形、風、音反応、色彩パルスは現在のThree.js実行時シェーダーに依存します。設定はJSONで保存できますが、他のXRアプリで同じ表現を再生するには対応ランタイムの実装が必要です。

## 確認状況

JavaScript構文・HTML内のコントロール参照を静的に確認済み。実ブラウザ/GPUでの描画動作は未検証です。
