# Plugin feature preview 追加ガイド

## 目的

bundle の detail ドキュメント（**Plugins** ページで description の下に表示される文書）に、任意の feature preview 画像を 1 枚入れる。公式 bundle 向けに描くときに本ガイドに従う。detail ドキュメント自体は `meta.detail` で宣言する（adding-a-package.md の plugin display metadata 参照）。

## 前提

- bundle パッケージの `docs/` に `DETAIL.md`／`DETAIL.zh.md`（`meta.detail`）があること。
- 画像が要らない判断も許されること（必須ではない）。

## 手順

### 1. 画像が役立つか決める

1 つの具体的な結果か、認識可能な capability を見せる。description で足りるなら画像は省いてよい（画像は必須ではない）。必須の手順は画像ではなく、bundle の description や図外の設定に置く。

### 2. 固定サイズの SVG を 1 枚描く

| 項目 | 要件 |
|---|---|
| 枚数 | bundle あたり 0 枚か 1 枚の feature image。英語と中国語のファイルはその画像の代替であり、gallery / carousel ではない。 |
| 形式 | SVG: `width="640" height="300" viewBox="0 0 640 300"`（32:15）。 |
| 言語 | 英語と中国語の両ファイルを出す。heading・注釈・例を翻訳し、公式 brand asset と名称はそのまま残す。 |
| 構成 | main の例 1 つ、任意で close-up 1 つ。重要な内容は canvas 端から約 32 unit 内側に置き、ページの実寸で文字を見直す。 |
| 字体 | 適切な font で lettering を outline（path）化する。browser の font 置換に頼らない。 |
| テーマ | light と dark の両方で比較する。1 枚で両方を賄う。dark 背景で消える transparent の dark 文字を避ける。 |

SVG は自己完結: font・remote リソース・script・handler・animation・stylesheet・`text`・`foreignObject` なし。`image` 要素は、変更なしの公式 PNG/JPEG/WebP brand asset を base64 data URL として埋め込んでよい。小さな plugin icon は geometry のみ。ページは `<img>` で描画する。各ファイルは小さく保つ。plugin-manager の `detailImageMaxBytes`（既定 5 MiB）を超える画像は Host が拒否する。

### 3. detail ドキュメントにする

`docs/preview.svg` と `docs/preview.zh.svg` を bundle パッケージ内の `docs/DETAIL.md`・`docs/DETAIL.zh.md` の隣に保存し、各ドキュメントを画像 1 行だけにする:

```markdown
![Example feature preview](preview.svg)
```

中国語ドキュメントは中国語 alternative text で `preview.zh.svg` を参照する。例は badge skill と voice input bundle の detail ドキュメント。voice transcript は説明用の sample 内容であり、録音結果ではない。bundle の動作と使い方は、振舞いの粒度で `meta.description`（画像の上に表示される）に書く。

### 4. ページ挙動

| 項目 | 現在挙動 |
|---|---|
| 位置 | detail ドキュメントの最初。detail ドキュメントは bundle ページの最初の section で、description と status notice の下。 |
| 表示 | detail ドキュメントの幅以内、高さ上限付き scroll 領域内で描画。 |
| 言語 | UI 言語のドキュメントが自言語ファイルを参照。 |
| 利用可能性 | activation 前から表示。一覧と component row は小 icon のまま。 |

### 5. 検証と review

`scripts/plugin-preview-assets.spec.ts` が bundle の `docs` 内の全 preview pair をチェックする: 固定 canvas、script・stylesheet・text 要素・extern 参照の不在、1 MiB pair 上限、中身が異なる英中 2 ファイル。activation 前に本物の plugin detail を英中の両言語で開き、画像の読み込み・配置・light/dark 可読性・390 px で横 overflow がないことを確認する。視覚品質と英中の等価な意味は review が保有する。PR 証拠は record-browser-gif skill に従う。最終 clean commit から録画し、示した flow を正確に label する。

## 注意

- 英語版と中国語版は同じ画像を別ファイルで示す関係であり、複数画像の割当には使えない。
- transcript などの sample 内容は説明例であり、実行結果として断定しない。

## 出典

UPSTREAM: <https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-plugin-preview.md>
