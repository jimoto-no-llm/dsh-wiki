# 同一セッションのゴール

1つのエージェントに「この目的を達成するまで継続すべきか」という方針を持たせるための、イベントソース化されたゴールサービスの語彙です。永続化と活性化の決定はgoalパッケージが所有し、このページは型と変種を記録します。セッションログの `goal/change` イベントを唯一の裏付けとするため、Hostの再起動をまたいでもstateの一貫性が保たれます。

## 識別とライフサイクル

`GoalRef` は目標の同一性と、まさにその改良版を指すための改訂番号を組み合わせた compare-and-set 識別子です。受理された永続的変更は毎回改良番号を増やします。

| 概念 | 意味 |
| --- | --- |
| `GoalId` | 目標の安定した識別（branded id） |
| `revision` | 正の改訂番号。永続的都度のacceptで増える |
| `phase` | 永続的な継続相（`active` / `paused` / `blocked` / `complete`） |
| `goal/change` | 完全なスナップショット（clearを除く）を永続イベントとして書込 |
| `activation` | プロセス局所の「継続の可否」。永続化されない |

永続的な `phase` が「目的がどうなったか」に答えるのに対し、活性化（activation）はプロセス内の継続コンシューマがもう1ラウンド開始してよいかどうかという別の質問に答えます。

- ポーズと完了は永続ライフサイクルの変化です。活性化 Owner の uninstall やdriver unloaded のときは、永続phaseを変えないまま自動継続の権限だけを取り消す `disarm` が用意されています。
- 対象が `complete` のときは `create` で新しい目標に置き換えられますが、それ以外の現在相では処理の前に clear か resume が必要です。

## blocked の理由

`blocked` は「問題で止まった」唯一の永続状態です。理由はポリシー側の `GoalBlockReason` が、ルーティング用の安定した小文字kebab-caseコードと、人間・モデル向けの自由記述説明を持ちます。目的の説明は `objective` フィールドの文字列で1つだけです。

## 変更 API

| 操作 | 挙動 |
| --- | --- |
| `create` | 目標を作成して活性化する。省略されたラウンド上限はサービスの配置設定で解決 |
| `edit` | objectiveと/またはround上限を部分置換。少なくとも1フィールド必須 |
| `pause` |活性相を paused にして活性化を外す |
| `resume` | stopped 相を活性化に戻す（またはセッション開始後の再arming）。ラウンド残量がある限り有効 |
| `complete` | `complete` でない現在の目標を完了として印付けし、外す |
| `block` | 現在のactive な目標を blocked にする。コードつきの理由を永続 |
| `clear` | 現在の目標を取り下げる。tombstoneが残る |
| `disarm` | phaseやrevisionを変えずに自動継続の権限だけを落とす |

この操作表のモデル向きの呼び出し（create/edit/pause/resume/complete/clear）には `@Remote` が付き、UIや外部から遠隔境界経由でも行えます。

## 進行の細胞（ラウンド）

継続を認める仕組みでは、各 user-message turn に正の連番ラウンドと現在のrevisionが付加されます。この認可された `user/message` イベントだけが `roundsStarted` を進めます。リプレイでは、非正ラウンド・欠け・最新でないrevision・停止相・上限超過を拒否します。

- 上限（`maxGoalRounds`）は、省略すると配置設定の値で埋める以外は自由に指定できます。
- 継続するたびに改訂と実行ラウンドが進むため、ホスト再起動のあとも、どこまで進んだところかが会話ログさえ読めば完全に再構成できます。

## スナップショットと通知の関連

| 構造 | 意味 |
| --- | --- |
| `GoalSnapshot` | すべてのnon-clearなgoal変異が書込む完全な永続状態（objective/phase/blockedReason/maxGoalRounds を含む） |
| `GoalView` | スナップショットに派生値（roundsStarted、作成・更新時刻、活性化）を加えた現在の投影 |
| `GoalChanged` | 1変異あたりの通知。accepted操作と正確なrevisionを運び、clearはgoal本体を省く |
| `GoalActivationChanged` | 活性化のみの変化通知。UIの実況用 |


## 注意

- すべての変異は永続的な `goal/change` イベントへの書込みです。厳格な畳み込みと保存された投影は、このイベント列からのみライフサイクルを復元します。他のメッセージ系のstateは物標に入りません。
- 通知 `goal/changed` は、対応する永続イベントが確定した後に発火します。リスナーの失敗は 1個単位で隔離され、後続のリスナーを飢えさせません。
- 活性化の変化は永続phaseの変化とは別に `goal/activation-changed` としてクライアントに伝えられます。UIの実況表示はこちらを読みます。
- 五走着（blocked）まで進めたら、あと一歩で捨てられる進行も `block` の理由コードでルーティングされるため戻りやすくなっています。モデル消費の詳細はパッケージREADMEを参照してください。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/goal.md