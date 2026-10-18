# GRASS STUDIO v1.6.5 — PALETTE & SOLID FORM

既存のv1.6.4.1を基にした検証版です。`grass-studio`の`develop`へアップロードする前にMacで動作確認してください。

## 追加機能
- DUOTONE: カスタムCOLOR A/B、TRITONE: カスタムCOLOR A/B/C（色選択フィールド）
- 全体HUE / SATURATION / BRIGHTNESS、PALETTE SHIFT / CONTRAST / FLOW
- 平面造形GRASS/BUBBLE/WAVE/ZIGZAG/SPIRALを維持
- 立体BUBBLE 3D / SPIKE 3D / CRYSTAL 3D / ORB CLUSTER 3D
- SOLID COUNT、SOLID SCALE、SOLID MOTIONの調整
- 風、音反応、編集JSON保存・読込、静的GLBの出力

立体は低ポリゴン形状をまとめたメッシュとして生成します。外部GLBの読み込みによる任意形状のパーティクル化やGPU InstancedMesh方式は未実装です。

## Macで動作確認
```
cd /path/to/GRASS_STUDIO_v1_6_5_PALETTE_SOLID_FORM
python3 -m http.server 8012
```
ブラウザで http://localhost:8012/ を開きます。

## 確認順序
1. 初期GRASS表示、既存の風・造形・音
2. FORM MODE: BUBBLE 3D / SPIKE 3D / CRYSTAL 3D / ORB CLUSTER 3D
3. PALETTE MODE: DUOTONE (A/B) / TRITONE (A/B/C)、HUE・彩度・明るさ
4. 立体数・サイズ・動き
5. SAVE/LOAD JSON と EXPORT GLB、Blender再読込

## 書き出し仕様
GLBは4mタイル1枚の静止メッシュ・基本材質を出力。風や音による時間変化、色の流れはJSONで保存します。別XR環境で再生するには専用ランタイムが必要です。
