---
title: "永続ランイベントと読み取り専用リカバリ"
desc: "セッション台帳がネイティブCLIセッションを名前付け、その脇の run-history.jsonl が制御要求、ネイティブ承認、所有ルートプロセス観察を記録します。どちらのファイル"
cat: "rdsh-dw"
catLabel: "rustdsh 調査"
chars: 3974
slug: "rdsh/dw/run-recovery"
---

# 永続ランイベントと読み取り専用リカバリ

セッション台帳がネイティブCLIセッションを名前付け、その脇の `run-history.jsonl` が制御要求、ネイティブ承認、所有ルートプロセス観察を記録します。どちらのファイルもネイティブ対話を写さず、エージェントループも処理しません。既存のダッシュボードタスク状態と6個のMCPツールは変更されません。

## 正確なrunを検査する

```sh
node dashboard/cli.mjs session-ledger start --project /workspace/project \
  --executable /absolute/path/to/original-dsh
node dashboard/cli.mjs run-history list --project /workspace/project
node dashboard/cli.mjs run-history inspect --project /workspace/project \
  --run-id run_00000000-0000-0000-0000-000000000000
node dashboard/cli.mjs run-history events --project /workspace/project \
  --run-id run_00000000-0000-0000-0000-000000000000
```

session-ledgerが返す実際の `run_id` を使います。読み取りはこのプロジェクトが記録したプロセスIDだけを観察し、prompt、シグナル、承認、再起動要求を送ることはありません。CLIのstart/resumeライフサイクルは、対応確認後に所有するACPプロセスを停止します。残存するネイティブセッションIDは明示要求で後に再開できます。

run一覧は既定10件・最大20件、イベントページは既定100件です。次ページは `next_cursor` を `--cursor` に、任意で `--limit` も渡します。inspectは最新100コマンドと20件の拒否transitionを含み、ページングのeventsはcommitted履歴の全部を保持します。ジャーナルは16 MiBか20,000イベントで新規書き込みを停止します。旧コマンドIDを黙って落としません。

## stateの意味

| State | 最後に記録された意味 |
| --- | --- |
| `queued` | 依頼が保持されている。attachmentは未開始 |
| `starting` | 明示的なattachment試行が記録された |
| `running` | 現在のクライアントがネイティブprompt要求を継続中 |
| `waiting-human` | CLIがattachmentまたはprompt結果を承認し、入力待ち |
| `waiting-resource` | 上位層がresource待ちを記録。リースは捏造しない |
| `disconnected` | 所有ルートプロセスが終了した、または記録識別子が無い |
| `stopping` | 所有停止が要求された。exitは未確認 |
| `succeeded` / `failed` | 上位層が明示的にend結果を記録した |
| `unknown` | ネイティブ状態や処理結果が確認できない |

`recorded_state` は歴史です。inspectは新鮮なOSプロセス観察と実効 `state` を別に報告します。生きている一致PIDは、モデルが進行していることやセッションがidleであることを確立しません。クライアント再起動後は、生プロセスでも該当理由付きで `unknown` になります。既知のプロセスexitは、タスクやネイティブ対話の完了を意味しません。attachment、prompt応答、プロセスexitはタスクを `succeeded` にしません。承認と証拠ゲートは関心事が別です。

`ui_connection` は呼び出し側が添える別観察で、CLI検査では既定 `unknown` です。ブラウザ切断はランtransitionにはなりません。本変更はブラウザのrun制御UIを追加せず、スマホ物理テストも主張しません。不正transitionは拒否され、理由とイベントIDはジャーナルに残ります。

## 要求、応答、不確実性

start/resume/send/interrupt/stopは一意な `command_id` を受ける。intent/dispach記録は制御上一刻の転送前にflushします。実際のネイティブ応答は別の `ack_id` を受けます。重複コマンドIDはジャーナルから再度ディスパッチできません。committedイベントの再読は、ジャーナルはネイティブCLIも変えません。

ACPのキャンセルは相関応答IDの無いnotificationです。送ると `notification_sent` を記録しackはありません。後のcanceled prompt結果は、全cancel要求への承認を捏造ではなく別観察として記録される事実です。通常のprompt結果はネイティブ結果の受領を確認するもので、続放instructionsの意味適用をそこから推定しません。

dispatch後・承認前のクラッシュは、外部効果が適用済みのままを残すことがあります。リカバリは`unknown`を保持し、自動リトライはしません。任意のCLI副作用のexactly-once保証ではありません。新鮮なresume要求は、前のルートプロセスが生きているか検証不能の間attachを拒否し、そのrunが2件目のattachに暗黙で引き継がれることを防ぎます。

## プロセス識別と保存限界

Windows観察はPIDと[Process.StartTime](https://learn.microsoft.com/dotnet/api/system.diagnostics.process.starttime)で、ローカル機のfingerprintで範囲付けされます。registry要求は読み取り専用で、fingerprint hashだけがジャーナルに出ます。不在観察にもスコープが付き、別ホストでPIDが不在でも旧runの終了の証拠にはなりません。Linuxは kernel [/proc/PID/stat starttime](https://man7.org/linux/man-pages/man5/proc_pid_stat.5.html) を使います。boot/PID namespaceスコープつきです。同スコープ内のbirth token変化はPID再利用を識別します。他ホスト、他boot、他namespaceは検証不能と見なされ、PID制御を承認しません。権限不足やOS識別の未対応queryは`unknown`を保ちます。生クライアントは自身のchildのexitを自分で確認できます。観察されるのは所有ルートだけです。子孫の追跡と停止は別機能で、本ジャーナルは子孫全員のexitを主張しません。

イベントはスキーマ、プロジェクトID、単調増加シーケンス、イベントID、チェックサムチェーンを持ちます。単一writerが排他lockを持ち、独立writerが古いprojectionを上書きできません。改行完結かつ妥当化されたイベントが回復可能なprefixです。変異の返却前に `fsync` でflushします。crash fixtureはプロセス終了を試すもので、蓄電/電源ロスは試しません。チェックサムは破損検出であり、authorization keyではありません。

化けた最終フレームはcommitted prefixを保ち、状態不確実を示し、これ以上の書き込みを阻止します。先端不正の完全フレーム、外部プロジェクトID、未知スキーマは、ファイルを置き換えず拒否します。writer lockの生き残りは読み取り専用検査を許し、観察されたownerを表示します。自動で奪われません。Tail/lock修復とスキーマ移行は明示futureメンテ作業で、runtimeは起動時に不確実データをtruncateしません。

ジャーナル書き込み失敗時は、新profile/promptを阻止します。既に所有したchildのcleanupは継続します。停止結果は、確認済みプロセスexitと未確認の履歴永続を区別します。ジャーナルはIDと有界な制御メタデータのみで、環境値・クレデンシャル・コマンドライン・prompt本文・ネイティブ出力・peerエラー文案を含みません。

## 実務上の注意

- state表は「最後に記録された意味」なので、実況読みは `inspect` で。ラン一覧や履歴だけを読んで判断しないでください。
- クラッシュ後の効果の有無は手作業での照合になります。状態表示だけで成功と断定する使い方は、デザイン上できないようになっています。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/RUN-RECOVERY.md
