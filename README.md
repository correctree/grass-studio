# GRASS STUDIO v1.6.2 — SHAPE & MATERIAL

既存のv1.6.1を基に、REALISTIC / CREATIVE切替、LEAF PROFILE・TIP ROUND・TWIST・CLUSTER、透明度・発光・色階調・風による色変化を追加。

## 実行
Macで本フォルダを開き `python3 -m http.server 8008` を実行、http://localhost:8008/ へアクセス。

## GitHub
既存 grass-studio の develop ブランチに index.html/main.js/README.md をアップロード。検証後にmainに反映、Release v1.6.2。

## 保存
SAVE JSON: すべての編集パラメータを保存。EXPORT GLB: 4mタイルの静的メッシュと基本材質を保存。
GLBには動的な風・音・独自シェーダー効果は入りません。GLBの見た目はWebプレビューと一致しないことがあります。

## 制約
- ブラウザWebGL実動作は未検証。
- 葉先の丸みは近似的な先端幅変更であり、精緻な円形キャップではありません。
- 葉は平面メッシュで、厚みはまだありません。
- 高透明度・高タイル数は表示負荷を増やすことがあります。
- 外部CDNからThree.jsを読み込むためネット接続が必要です。
