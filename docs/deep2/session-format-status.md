# Session 形式バージョンとリリース状態（session-format-status.md 深掘り）

## 導入

上流の docs/session-format-status.md は、Session 形式の「checkout の writer」「受理済み
互換基盤」「最新の公開済み形式」の3つを区別するための参照文書です。他の文書はここへ
リンクすることで数値の重複記載を避けています。

## 真実の源は3つ

- **Checkout writer**: packages/core/session/src/types.ts の SESSION_FORMAT_VERSION が、
  コード上唯一の手で維持される writer 番号です。scripts/gen-session-format-catalog.ts がここから
  codec 順序を導出し、隣接移行が届くことを検査します。パッケージバージョン、codec の
  export 名、fixture ファイル名、projection-cache のバージョンは writer の権威ではありません。
- **Latest released format**: 記録中の latestReleasedVersion が公開済み Session 形式を示します。
  evidenceTag はその値を持つ tagged writer を持つ公開リリースを指し、その形式を持つ最初の
  リリースである必要はありません。日英の文面は同じ記録に対して検査されます。
- **Release status**: writer 定数と検証済みリリース記録を比較します。等しければ writer の形式は
  出荷済みです。writer が大きければまだ公開記録がない。ただし、「より大きいバージョンは未公開」と宣言する前に、
  先行する公開リリースが記録を進めていないことを確認します。
  リリース済み boolean という別変数は管理されません。

alpha・beta・rc の公開は Session 形式の出荷義務を生みます。GitHub の prerelease フラグは
永続されたユーザーデータを使い捨てにしません。記録の欠落は非公開の証拠にはなりません。

## 記録の現状

- **Finalization record**: latestFinalizedVersion は 4。v4 には
  persistence-changes/finalized/v4.json の checkpoint という受理済み互換基盤があります。
  reader 互換ルールを満たして review が記録されれば、スキーマ変更は v4 のまま残れます。
  バージョン上げにはより大きい writer バージョンと固有の header 遷移が必要で、受理済みの
  3→4 遷移の再利用はできません。受理済みの machine 記録と after スキーマは immutable です。
  finalization は将来の v4 追加すべてを凍結するわけではなく、公開の主張もしない。
- **Release record**: latestReleasedVersion は 4、evidenceTag は dsh-v0.2.0-rc.2 で、
  証跡は公開タグ dsh-v0.2.0-rc.2 とその tagged writer packages/core/session/src/types.ts です。

## 記録の更新ルール

- フォーマット上げを実装したら、コード定数と隣接カタログを同時に更新します。公開前に
  この release record を進めてはいけません。
- 公開を確認したら、記録と evidence tag と tagged writer パスを同じ二言語更新の中で進めます。
  同じ形式を運ぶ後続リリースでは記録を変更する必要はありません。開発トランクで
  記録を下げることは決してありません。
- scripts/doc-standard.spec.ts が記録の構造、日英等価、evidence-tag と writer-path の整合、
  記録が writer を超えないことを検査します。GitHub 照会や最新性の証明は含まれません。

## 表現の作法

通常挙動には「current format」「next adjacent version」と言い、固定の移行入出力、wire スキーマ、
歴史的証跡とそのテストには明示的な数字を使います。cookbook/adding-a-session-format-version.md は
最新の finalized または released 形式を N、その後継を N+1 と書きます。

## 注意

- 本wikiでは docs/develop/adding-a-session-format-version.md が実装手順の詳細を扱います。
- 本文書は「状態の決定権」であり、移行の実装詳細は出典の関連文書群にあります。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/session-format-status.md
