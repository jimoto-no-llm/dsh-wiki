---
title: "セッションとデータの保存"
desc: "セッションの形式バージョンと、イベントの生成・受信（プロデューサ/コンシューマ）の仕組みを、チェックアウトとリリースそれぞれの立場に沿って整理します。"
cat: "guide"
catLabel: "DSH を使う"
chars: 2256
slug: "guide/sessions"
---

# セッションとデータの保存

セッションの形式バージョンと、イベントの生成・受信（プロデューサ/コンシューマ）の仕組みを、チェックアウトとリリースそれぞれの立場に沿って整理します。

## セッション形式のバージョン

- コード側の唯一の手動管理値は `packages/core/session/src/types.ts` の `SESSION_FORMAT_VERSION` です。これが書き込み側（checkout writer）の番号の正であり、パッケージの版やコーデックのexport名、fixtureのファイル名は権威ではありません。
- 公開済みの最新形式は、あと示すリリースレコードの `latestReleasedVersion` が示します。`evidenceTag` はその値を持つタグ付きリリースの例であり、その形式を掲げた最初のタグである必要はありません。
- 書き込み定数がレコードと等しければ、その形式は出荷済み。定数が大きければ公開記録はまだ存在せず、独自のファイナライズレコードが互換ベースラインを示します。開発トランクでレコードを下げてはいけません。
- alpha・beta・release candidate の公開は、セッション形式の互換義務を確立します。GitHubのprereleaseフラグがあっても、書き込まれた利用者のデータは破棄可能にはなりません。

## ファイナライズとリリースの記録

- ファイナライズレコードは `latestFinalizedVersion: 4`。V4にはチェックポイントで受諾済みの互換ベースラインがあり、読み手互換ルールを満たす限りスキーマ変更はV4のまま残せます。版アップには高い書き込み側の番号と独自の遷移が必要で、受諾済み3→4の遷移を流用できません。
- リリースレコードは `latestReleasedVersion: 4`、`evidenceTag: dsh-v0.2.0-rc.2`。書き込み定数をリリース時に合わせて検証し、公開時だけレコードを進めます。
- 版を上げるときはコード定数と隣接カタログを同時に更新し、公開前にはレコードを進めません。`scripts/doc-standard.spec.ts` がレコード構造・日英の一致・証拠タグとwriterパスの整合・記載リリースがcheckout writerを超えないことを検査します。

セッション形式はimmutableな世代と隣接変換で管理され、履歴スキーマは「persistence-changes」以下の形式参照にすべてあります。一般の説明では「current format」「next adjacent version」を用い、固定の移行入出力やwireスキーマにのみ明示番号を残します。

## イベントの生成と受信

パッケージ間のイベントは多対多のため、どのパッケージが送り、どのパッケージが聴くかをマトリクス表で表します。受信側とイベント名の型は、意図的に `ctx.emit` を経由しない配信点（サブエージェントのライフサイクルの包含など）も込みでカバーしています。

- 主な配信モードは `emit`（片面配信）、`serial`/`parallel`（逐次/並行）、`waterfall`（値を受け渡す連鎖）です。
- 例: `tools/execute`・`tools/pre-execute`・`tools/post-execute` は waterfall で、hooksやcheckpointポリシー、spillポリシーなどが受信者に名を連ねます。
- `session/flush` は parallel で、`session-persistence-jsonl` と `session-telemetry` が受け取ります。セッションデータのファイルへの書き出しは、このJSONL永続化パッケージが担っています。
- ワークスペースとジョブ・スケジュール・サブエージェントの連携は、`workspace/session-activity`（waterfall）と `workspace/session-stop`（parallel）が結合します。
- アプリ側リスナーはパッケージ行列の外です。Desktopホストは `plugin-manager/operation` を `installOperationDiagnostics` で購読し、範囲を絞った記録をシェルへ転送します。

生成物によっては `agent/request` や `connection/reset` のように、ハーネス外または未宣言のイベント文字列がパッケージソース内に残る点も注意してください。

## 出典

- [docs/session-format-status.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/session-format-status.md)
- [docs/event-producer-consumer.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/event-producer-consumer.md)
