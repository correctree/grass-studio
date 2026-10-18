# GRASS STUDIO v1.6.6.2 — VISIBILITY CONTROL
v1.6.6.1からの小修正。UIに独立した VISIBILITY CONTROL セクションを追加。
SHOW DEFAULT FORM、SHOW CUSTOM GLB、SHOW GROUND、CUSTOM GLB ONLY、SHOW ALL。
SAVE/LOAD JSONに表示設定を保存し、静的GLB書き出しにも表示状態を反映。
元のGLBインポート・色編集・風・音・アコーディオン機能は保持。

## ローカルテスト
フォルダ内で `python3 -m http.server 8015` を実行し、
`http://localhost:8015/` を開いてください。

## 注意
動的な風・音・浮遊は静的GLBに焼き込みません。JSONの再読み込み時に独自GLBの再指定が必要です。
ブラウザでの実機動作は未検証です。
