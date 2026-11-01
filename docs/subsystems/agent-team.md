# エージェントチーム（Agent Teams）

実験的な暗黙ルートTeamドメイン、モデルツール、ホストアダプタが共有する型を記録するページです（`packages/experimental/agent-team`）。アイデンティティ、メールボックス、タスク、共有チェックアウトの決定はAgent TeamsのAgent Noteが所有し、このページは永続形とクライアント可視形を記録します。操作・承認・回復・上限の実際の振る舞いはパッケージREADMEが所有します。

## 識別と名簿

| 概念 | 意味 |
| --- | --- |
| `TeamId` | root `SessionId` に独立したbrandを付けたもの |
| `TeamTaskId` | `task-<n>` として採番 |
| `TeamMessageId` | 歴史メールボックスの記録専用の旧ID。新規送信は対象inboxの `MessageId` を返す |
| `TeamMemberSnapshot` | メンバーのライフサイクル変化ごとに書込まれるdurable値全体 |

メンバーは `provisioning` から始まり、名簿上の終端相 `active` か `failed` のちょうど1つに到達します。名簿のrunning/inactive状態は別途導出されるものであり、このdurableレコードを書き換えることはありません。

| `TeamMemberSnapshot` のフィールド | 意味 |
| --- | --- |
| `id` / `name` / `description` | セッションidと不変の名前ラベル、説明 |
| `provider` / `context` | 使用プロバイダと、`fresh` / `fork` の文脈モード |
| `phase` / `error` | durableライフサイクル相と、`failed` 時の理由 |

## メッセージと歴史メールボックス

新規送信はinboxへの受諾か拒否を返します。対象は実際の送信セッションidをもつ既存 `agent-message` ソースに、送信者名の内容プレフィックスを付けて保存します。Teamに新規メッセージのoutboxや再送の重複排除はありません。すべてのメッセージはSteer配送を試み、実行中の対象は最も近いステップ境界で受け取り、非実行の対象は読込済みならturnを開始し、そうでなければcold-resumeします。配送方式はdurableレコードに保存されません（呼び出し側は別の方式を選べません）。

歴史的な `team-message` ソースは旧メッセージidと送信者帰属を保持し、クライアントはそれを件名とアイコンに使います。歴史のLeadログが再生できるように各mailbox型は読める状態で残りますが、Teamは保留レコードを配送しません。

## 共有タスクDAG

すべてのタスクイベントは完全なスナップショットを保存します。

| フィールド | 意味 |
| --- | --- |
| `id` / `revision` | タスクの同一性と、変異ごとに1増えるcompare-and-set値 |
| `subject` / `description` | タスクの表題と説明 |
| `status` | `pending`（未着手または解放済み）/ `in_progress`（所有者あり）/ `completed`（blocker全充足）/ `deleted`（保持されるtombstone） |
| `ownerId` | `in_progress` の所有セッション |
| `blockedBy` | 未削除のタスクを名指す依存辺。グラフは非循環でなければならない |
| `writeScopes` | 正規化済みの助言的なパスプレフィックス。ロックではない |

ビューはdurableスナップショットを変えずに所有者名、実行可能（ready）判定、write-scope重複の警告を加えます。

## Web投影

Leadセッションは `SessionProjectionMap.agentTeam` を通じて、durableの名簿行と未削除タスクのビューを発行します。`failure` は拒否された永続レコードを最後の有効状態の横に報告します。メンバーの活動はセッションstatusから、モデル名は各メンバーの `modelSelection` 投影から来ます。

## 使い方

`ctx.agentTeams`（`TeamService`）は正確な生のLeadセッションログに裏打ちされたサービスです。

| メソッド | 挙動 |
| --- | --- |
| `membership(agent)` | そのエージェントのroot・Team同一性・役割・モデル向きの名前を返すauthority credential |
| `listMembers(agent)` | Teamメンバーに見える名簿（Lead行とメイト行を生成順で） |
| `spawnTeammate(caller, request)` | Team Leadの、名前付きで継続可能な直接の子を1つ作る |
| `sendMessage(caller, request)` | ピアメッセージを対象inboxへ誘導。受諾は通常のAgent永続に従い、モデル処理は待たない |
| `createTask(caller, request)` | Leadログに所有者なしのpendingタスクを作る |
| `getTask(caller, id)` / `listTasks(caller)` | 1件（削除済tombstone含む）または数値生成順の未削除タスク一覧 |
| `updateTask(caller, request)` | 期待revisionを使った承認済みのcompare-and-set変異 |
| `waitForChange(caller, timeoutMs, signal)` | Teamドメインまたはメンバーstatusの次の変化を待つ。待機は10秒〜1時間で境界付け |
| `interrupt(caller, targetName)` | 保留inboxを消さずに生きているメイトのturnを中断 |
| `tryMembership(agent)` | throwせずに解決。非Teamのサブエージェントや古い同一性には `undefined` |

## 注意

- リプレイはrootセッションを名簿・タスクボード・歴史的に受渡済み（queued・delivered差分を引いた）メールボックスへ復元します。選択は `TeamId` 単位なので、通常のforkが継承したイベントは祖先のidを保ち、新しいrootの状態に入りません。
- セッションイベントの `seq` と `time` が順序と時刻の記録であり、Teamスナップshotsはそれを複製しません。
- 保留メールは呼び出し側へ公開されません。名簿とタスクの読み取りはビューとして届きます。
- この機能はexperimentalです。動作・承認・回復・上限はパッケージREADMEの契約を参照してください。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/agent-team.md
