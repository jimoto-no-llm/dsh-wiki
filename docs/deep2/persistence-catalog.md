# Session Persistence Event Catalog（persistence-catalog.md 深掘り）

## 導入

上流の docs/persistence-catalog.md は9000行規模の生成カタログで、リポジトリが宣言する
永続対象 Session イベントの全件を「ソース宣言＋解決済み型」で記載します。実験パッケージの
plugin:* レコードは別ファイルの experimental-persistence-catalog.md に分離されています。

## エンベロープの構造

冒頭の説明は次の点を押さえます。

- エンベロープは type / seq / time / data に加え、任意の ignorable、条件付きで
  surfaceOp と sourceEventSeqs を持ちます。
- **surface** イベントはモデル履歴を作るイベント、**log-only** イベントは履歴に含まれないイベントです。
- 在庫（inventory）は本リポジトリの宣言に限られます。外部プラグインの型は独自の宣言が必要で、カタログ外です。

## 型指紋（fingerprint）

一覧表の各 root には SHA-256 が付き、persistence-schema.json には到達可能な正規化型全件と
指紋があります。root の指紋は参照型を含んだ値です。

- **影響しないもの**: コメント、ソース位置、エイリアス名、消えた brand、readonly 属性、
  フィールド・union・intersection の無害な並び替え。カタログのテキストやソース位置だけ変わって
  指紋不変という差分はあり得ます。
- **影響するもの**: タプルの順序、プロパティ名、値の型、optionality。

## 履歴と変更記録

- persistence-changes/historical-formats/README.md が Session 形式 0 から checkout writer までの
  全世代の参照を置き、persistence-changes/README.md が遷移の承認記録を保持します。
- 変更の分類と記録の流れは cookbook/reviewing-persistence-type-changes.md です。
  本wikiでは docs/develop/reviewing-persistence-type-changes.md が対応します。
- persistence-changes/2026-09-11-initial.md は baseline 記録で、ソース上の完全な型棚卸しを
  以後の遷移の起点としてこの tree 内に保存したものです。
- チェックの対象は宣言された型の構造です。opaque な payload の中身や、型変更を伴わない挙動変更は範囲外です。

## 生成と検証

`pnpm run gen-persistence-catalog` が両言語のカタログ、ペアリング記録、known-event モジュール、
機械スキーマ在庫を再生成し、`pnpm run verify-persistence-catalog` が生成物全体を検証します。
宣言部分（declaration fences）はソースの JSDoc と型参照を保持し、解決済み定義は参照を辿った
構造を展開します。

## 注意

- 一覧表は root 名（SessionHeader、JsonlHeaderLine、SessionEventEnvelope、event:* など）で
  並ぶため、目的のイベント名で絞り込む読み方が効率的です。
- event:* の値は「どのイベントが永続されるか」の決定参照であり、session の replay・storage の
  実装詳細は subsystems/session.md と subsystems/persistence.md に当たってください。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/persistence-catalog.md
