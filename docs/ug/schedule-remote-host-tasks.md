# Schedule はホスト全体の1つの管理 API を使う（v0.2.2-alpha.2）

Schedule の管理が id で任意の Host タスクを扱うようになり、ネイティブ API と Remote API が1つのサービスを共有します。

- 以前の Session 結合の `delete`・`update` メソッドは削除されました
- ネイティブの作成は型付きの `timing` を受け取ります
- カタログの結果は `kind` で After・At・Every・Daily・Weekly・Cron・RRULE を判別します

## 保存形式と移行のタイミング

既存の `schedule` ドメインは version 2 を書き出し、起動時の書込みなしで version 1 を読み取ります。ルート・封筒・レイアウトは保持されます。

| 項目 | 挙動 |
| --- | --- |
| 読み書き | version 2 を書き出し、version 1 を読み取る。起動時の書込みは無し |
| SQLite の物理スキーマ | version 1 のまま |
| 編集・配信 | 現在の行を保存する。別の移行コマンドは不要 |
| 最初に成功した v2 書込み | ユニットに v2 の印を付ける。v1 のバイナリはそれを開けない |

保存形式・アップグレードのタイミング・コストの詳細は、上流の Schedule プラグイン README が持ちます。

## 移行の手順

1. ネイティブの呼び出しは `create({ title, prompt, timing, target? }, actorSessionId?, signal?)` と `edit(request, actorSessionId?, signal?)` を使います。Remote の呼び出しは `schedule/create`・`schedule/edit` に `request` 引数を使います。Cron セレクタは `{ kind: "cron", cron: { expression, time_zone } }` に、RRULE は `{ kind: "rrule", rrule }` に包みます。モデル ツールの引数は引き続き RRULE を見せます
2. Session 結合の削除は `edit({ id, action: "delete" })` に、更新は `edit({ id, action: "update", patch, expectedUpdatedAt? })` に置き換えます。タイミングの編集は `patch.timing` を使います。読んだリビジョンを渡すか、不在なら `null` を渡し、`schedule_conflict` は再読み取りで対応します
3. `list({ active?, limit?, offset? })` はホスト全体にわたって `{ items, shown, total, limit, offset }` を返します。`catalog()` は全タスクを返します。`view({ id })`・`history({ id, limit, before? })`・`run({ id })` は所有 Session を要りません。再利用できる配信先は `target` から、受領各件の配信先は `targetSessionId` から読みます
4. パッケージ ルートか `/client` が輸出する接頭辞なしの型（`ScheduleRecord`・`ScheduleTiming`・`ScheduleCatalogEntry`）を使い、タイミングの項目を読む前に `kind` で窄めます。`inactive` の代わりに `paused`・`ended` を扱い、作成・変更のタイムスタンプ不在を受け込みます。ルート ヘルパの `scheduleView`・`decodeScheduleChange`・`foldScheduleEvents`・`SCHEDULE_CHANGE_VERSION` は削除済みです。過去のイベント型は凍結されたデータ宣言として残ります。削除された型と置き換えの一覧はモデル向けツール側のアップグレード ガイドがあります
5. 自動化タスク ページで既存の Cron・カレンダー タスクが見え、メタデータの編集がタイミングと履歴を保つことを確認します。過去の Session ログ リマインダーはこの Host タスクの変更の外側で、明示的な再作成が引き続き必要です

## 注意

- アップグレードの前にストアをバックアップしてください
- 最初に成功した v2 書込みがユニットに v2 の印を付けると、v1 のバイナリはそれを開けません
- ダウングレードはバックアップからの復元を要します

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/upgrade-guide/v0.2.2-alpha.2/schedule-remote-host-tasks/guide.md
