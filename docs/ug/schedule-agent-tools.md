# Schedule ツールが RRULE と実行先で全 Host タスクを管理する（v0.2.2-alpha.2）

Schedule のモデル向けツールが `schedule_create`・`schedule_list`・`schedule_view`・`schedule_edit` の4本構成に変わります。旧 `schedule_update` と `schedule_delete` は削除されます。

## 旧構成

`@deepseek-ai/dsh-tool-schedule` は以前、`schedule_create`・`schedule_list`・`schedule_update`・`schedule_delete` を登録していました。

- 扱いは呼び出した Session 自身のリマインダーだけでした
- `schedule_create` は `after_seconds`・`at`・`every_seconds`・`daily`・`weekly`・`cron` のどれか1つのタイミング指定を受け付けていました

## 新構成

| ツール | 新しい挙動 |
| --- | --- |
| `schedule_create` | `title`・`prompt`・`rrule`（`DTSTART` 行1つと `RRULE` 行1つ）・`target`（`this_session`・`new_once`・`new`）。タイミング指定は受け付けない |
| `schedule_list` | 実効中・一時停止・終了のタスクを `{ items, shown, total, limit, offset }` の1ページで返す（以前は実効リマインダーの配列） |
| `schedule_view` | id で1つのタスクを読む |
| `schedule_edit` | `action: "update"` が `schedule_update` を置き換え、`rrule`・`target` の変更や一時停止・再開も扱う。`action: "delete"` が `schedule_delete` を置き換える |

- 各ツールは、呼び出した Session 自身のタスクだけでなく id による任意の Host タスクを読み・変え・削除します
- 委任されたサブエージェントからの呼び出しは `subagent_session` を返します。メッセージは `A delegated subagent cannot use scheduled tasks.` です
- 既存のリマインダーはタイミングと配信を保ちます
- 記録済み Session のレコードは以前の呼び出しと結果を保ち、Web のトランスクリプトも以前と同様に描画します

## 影響を受けるところ

- `schedule_update`・`schedule_delete` またはタイミング指定をモデルに促すプロンプト・スキル・スクリプト
- Session ごとに自分のリマインダーだけが見えるのを当てにしたデプロイ
- TypeScript では、`scheduleView` を `@deepseek-ai/dsh-schedule` のルート入口から import するコード、および `ScheduleView`・`ScheduleState`・`ScheduleDeliveryMode`・`ScheduleCreateValue`・`ScheduleListValue`・`ScheduleDeleteRequest`・`ScheduleDeleteValue`・`ScheduleTimingChange`・`ScheduleUpdateContent`・`ScheduleUpdateMiss`・`ScheduleUpdateRequest`・`ScheduleUpdateResult`・`ScheduleUpdateValue` をルートまたは `/client` 入口から import するコード

## 移行の手順

1. プロンプト・スキル・スクリプトでは、`schedule_update`・`schedule_delete` を `schedule_edit` に、タイミング指定を RRULE に、作成時に必須の `target` を置き換えます。例として `daily: { time: "09:00:00", time_zone: "Asia/Shanghai" }` は `rrule: "DTSTART;TZID=Asia/Shanghai:20261013T090000\nRRULE:FREQ=DAILY"` に成ります。配信を呼び出し元の Session に留めたいなら `target: "this_session"` を使います
2. プリセットのエージェントに他の Session のタスクを扱ってほしくないなら、そのプリセットから `@deepseek-ai/dsh-tool-schedule` の行を取り除きます
3. TypeScript では、書込みに `ScheduleCreateRequest`・`ScheduleTiming`・`SchedulePatch`・`ScheduleEditRequest` を、読み取りと編集に `ScheduleViewResult`・`ScheduleListResult`・`ScheduleEditResult` を使います。`ScheduleService` の `view`・ページ付き `list`・`edit` を `scheduleView`・`update`・`delete` の代わりに呼びます。`ScheduleDeleteResult`・`ScheduleDeleteChange`・`ScheduleDeleteInactiveResult` はルートと `/client` から引き続き輸出されますが、上で挙げた旧型は輸出されません（Schedule サービス README がこれらの API を説明します）
4. カスタム構成では、このコンシューマを差し込む前に `tools` と `systemPrompt` の両方を用意します。登録は `schedule` を待つようになります。`tool:schedule` 節が共有の許可指示を供給します。`complete: true` のプロンプト上書きはその指示を自身に含めなければなりません
5. 変更した各プリセットの下で Session を開き、ツール一覧に4本のツール名が見えることを確認します。タスクを委任し、子の Schedule ツール呼び出しが `subagent_session` を返すことを確認します（子のツール一覧にも4本の名前が見えます）

## 注意

- 4本のツールはどれも、呼び出した Session 自身のタスクに限りません。エージェントのプリセット配布にあたっては、ツール群の内容を改めて見直してください

## 関連する変更

- 保存形式や API の側の変更（型の削除や精度）は「Schedule はホスト全体の1つの管理 API を使う（v0.2.2-alpha.2）」ページにまとめてあります

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/upgrade-guide/v0.2.2-alpha.2/schedule-agent-tools/guide.md
