# バージョンアップと互換性

v0.2.2-alpha.2アップグレードガイドのうち、Schedule管理APIとSDK runコマンド入力の扱い方（手順と注意）を紹介します。

## Schedule: ホスト全体の1つの管理API

Schedule管理はすべてのホストタスクをidで扱います。ネイティブAPIとRemote APIは1つのサービスを共有し、以前のセッション結合の `delete`・`update` メソッドは削除済みです。ネイティブの作成は型付きの `timing` を受け、カタログ結果は `kind` で After・At・Every・Daily・Weekly・Cron・RRULE を判別します。

- 保存形式は従来の `schedule` ドメインのまま、version 2を書き出し、version 1を読み取りは起動時の書き込みなしで行います。実路線、封筒、配置は保持され、SQLiteの物理スキーマはversion 1のままです。
- 注意: まずストアをバックアップしてください。最初の成功するv2書き込みがユニットをv2へ印付け、v1バイナリはそれを開けません。ダウングレードはバックアップからの復元が要ります。編集や配信は現在行を別の移行コマンドなしで保存します。

## Schedule: 移行の手順

1. ネイティブ呼び出しは `create({ title, prompt, timing, target? }, actorSessionId?, signal?)` と `edit(request, actorSessionId?, signal?)`。Remote呼び出しは `schedule/create`・`schedule/edit` に `request` 引数を使います。Cronセレクタは `{ kind: "cron", cron: { expression, time_zone } }`、RRULEは `{ kind: "rrule", rrule }` に包みます。モデルツール引数は引き続きRRULEを見せます。
2. 削除は `edit({ id, action: "delete" })`、更新は `edit({ id, action: "update", patch, expectedUpdatedAt? })` に置き換えます。時刻編集は `patch.timing`。読んだリビジョンを渡すか、不在なら `null`。競合の `schedule_conflict` は再読取で対応します。
3. `list({ active?, limit?, offset? })` はホスト全体を `{ items, shown, total, limit, offset }` で返し、`catalog()` は全タスク、`view`・`history`・`run` は所有セッションを必要としません。再利用できる配信先は `target`、各受領の配信先は `targetSessionId` から読みます。
4. 型はパッケージルートか `/client` が輸出する非接頭辞型（`ScheduleRecord`・`ScheduleTiming`・`ScheduleCatalogEntry`）を使い、時刻項目を読む前に `kind` で窄めます。`paused`・`ended` は `inactive` の代わりに扱い、作成/変更日時は不在の可能性に備えられます。ルートヘルパの `scheduleView`・`decodeScheduleChange`・`foldScheduleEvents`・`SCHEDULE_CHANGE_VERSION` は削除済みです。
5. 自動化タスクページに既存のCron・カレンダータスクが見え、メタ編集が時刻と履歴を保つことを確認します。過去セッションログのリマインダーはこの変更の外で、明示的な再作成がなお必要です。

## SDK: runがネイティブコマンドを受け入れる

Python・TypeScriptの `run()` は文字列とコンテンツブロック配列を受け取り、常に `RunResult` を返します。ネイティブコマンドは定義の識別と実効登録名で認識され、 `final_response`/`finalResponse` には最終アシスタントテキストが入ります。注意点: コンテンツブロック配列のネイティブルーティングの迂回は無くなり、認識されるコマンドはテキストブロック1つ+必要ならエンコード済み画像を要します。空配列と空白の入力はセッション生成前に拒否されます。

移行では、プロンプトでの `result.final_response` アクセスを保ち、失敗の確認は `finish_reason`/`finishReason` で確認します。リテラルな順番待ち入力は `client.session_prompt()`（Python）や `client.prompt()`（TypeScript）を使います。画像には画像対応モデルと `run([text_block, image_block])` の形を使い、`run()` 呼び出し前に空入力を濾します。カスタム `session/query` クライアントは `{ sessionId, contentBlocks }` を送り、送信前に通知を購読します。

## 出典

- [docs/upgrade-guide/v0.2.2-alpha.2/schedule-remote-host-tasks/guide.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/upgrade-guide/v0.2.2-alpha.2/schedule-remote-host-tasks/guide.md)
- [docs/upgrade-guide/v0.2.2-alpha.2/sdk-run-commands/guide.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/upgrade-guide/v0.2.2-alpha.2/sdk-run-commands/guide.md)
