---
title: "プランモード"
desc: "プランモードは dsh-plan-mode が所有するエージェントごとの記録（logged）された協調状態です（ctx.planMode / PlanModeController）"
cat: "subsystems"
catLabel: "サブシステム"
chars: 3810
slug: "subsystems/plan"
---

# プランモード

プランモードは `dsh-plan-mode` が所有するエージェントごとの記録（logged）された協調状態です（`ctx.planMode` / `PlanModeController`）。活性中は、配置が所有するガイダンスsectionが各モデル要求へ入ります。プランモードは **ソフトガイダンス** です。サンドボックスモードとapprovalポリシーは制限を独立に強制し、plan状態を読むことも書くこともしないため、配置はこれらを別々に構成します。パッケージは任意であり、エージェントループはこれに依存しません。`plan:policy` プロンプトsectionを寄与し、`exit_plan_mode` ツールと `/plan` コマンドを登録します。

## 記録状態と回復

`plan/mode`（`{ active: boolean }`）はログ専用の全体値差換えセッションイベントです。durableでreplay可能であり、モデルtranscriptには入りません。`plan` ユニットは確定モード・コマンド確定・直近の要求headerに記録されたモードを折りたたみます。`ctx.planMode` はレジストリを要求し、活性化中に `plan` と `turnBoundary` の登録を待った後に保持handle経由で読みます。クライアントは `{ active, pending }` だけを受け取り、resume・fork・compactionは両方をログから回復します。完全なイベント宣言はpersistence log event catalogにあります。

## pending選択とpre-step追記

セッションイベントはすべてturnで囲まれるため、ユーザーの選択は、次の受入済みのturn内pre-stepが要求導出の前に追記するまでpendingのままです。選択は継続を強制しないため、turnの最終pre-step後の選択は後のturnで追記されます。

- `set(agent, active)` がpending選択を記録する（目標がloggedまたは既にpendingの状態と等しければno-op）。
- `get(agent)` は現在のstepを組み立てるlogged状態と、追記待ちの選択を返す。
- 実行中の唯一の追記点は前置きされる `agent/pre-step` リスナーで、turn 1 step 1や要求回復リトライを含む提案された全要求stepを観察し、下流リスナーが受理した後で追記する。
- prompt受付はturnより前に起こるため、promptでの選択はそれが始めるturnの最初の受入済みturn内pre-stepが追記する。
- 追記失敗はturnを塞がず、選択は次の受入済みturn内pre-stepへpendingのまま。
- 追記済みユーザー選択は1つのプラグイン提供 `user/message` 通知も記録するが、直近のlogged要求headerが別状態を説明したときだけ。モデルは文脈が変わったときだけ知らされ、冗長にはなりません。
- turn最終pre-step後の選択はプロセス局所であり、別の受入済みturn内pre-stepの前にプロセスが終了すると失われます（READMEの既知制限）。

## 設定

`PlanModeConfig` は `section: string` を1つだけ持ち、活性中に `plan:policy` として描かれるガイダンス文です。missing・空・非文字列の `section` と未知のキーは無視されず、プラグイン読込時に失敗します。活性中はsectionの全文がsystem-promptの順序50として描かれ、非活性はテキストを寄与しません。

## exitツールと `/plan` コマンド

- `exit_plan_mode` はprogressiveな公開を持ちます。選択plan状態がactiveな最初のstepから受付され、Sessionの残りで受付され続けます。最初のプランモード開始が要求ツール宣言へ加わり、以降の遷移はplanガイダンスだけを変えます。nativeとPTC実行は同じ受付済み集合を使います。開始前の呼び出しは `UNKNOWN_TOOL`、プランモード未確定での呼び出しは失敗します。
- プランモード中は `#` 見出しで始まる完全なmarkdownプランを要求し、user-questionsシームを通じて審査に提示します。承認は `{ approved: true }` を返し、静かな（ナレーション無しの）pending exitを記録し、次の受入済みturn内pre-stepで追記されます。そのためガイダンスはアシスタントの現在のツールバッチの残りで活性のままとなり、ツール結果自体が遷移を報告します。
- keep-planning（計画を続ける選択）はユーザーのフィードバックを載せた失敗呼び出しなので、モデルは改訂して再度提示します。
- 却下された審査は `{ approved: false }` を返しturnを終えるため、プランモードはユーザーの次メッセージまで活性のままです。相互作用チャネルの欠落と審査中のservice reloadも、静かにplanモードを外すのではなく呼び出しを失敗させます。

`ctx.commands` が合成されると `/plan [off|message]` が登録されます。素の `/plan` はプランモードを選択します。他の非空メッセージは選択した上で `agent.steer()` を通じて文面を次stepの普通のloggedユーザーメッセージへ送ります。正確な引数 `off` は非活性を選択し、可視化前のpending開始も取り消します。

## 例

```ts
const view = ctx.planMode.get(agent)
// => { active: false, pending: true } のような値
const ret = ctx.planMode.set(agent, true)
// 開turn中 => 'queued'	
// turn間 => 'committed'
```

`/plan` をモデル側から `agent.steer()` で流す例（コマンド側の動き）:

```ts
await agent.steer('/plan off')  // 非活性選択 + pending開始の取消
```

## 使い方

`ctx.planMode`（`PlanModeController`）はlogged plan状態を所有し、step開始時に選択状態を適用・ナレーションし、`plan:policy` sectionと `/plan` コマンドと条件付きexitツールを持ちます。

| メソッド | 挙動 |
| --- | --- |
| `get(agent)` | logged状態と、pendingがあればそれを返す |
| `set(agent, active)` | 状態を選択する。turn間なら直ちに追記する（次のpromptまでturn内pre-stepが走らないため。開turnのfoldがidle信号）。開turn中は次の受入済みturn内pre-stepまでpending |
| `set` の戻り値 | `committed`（今logged）/ `queued`（次の受入済みturn内pre-step待ち）/ `cancelled`（逆向きのpending選択を掃除した）/ `noop`（既にその状態） |

現在またはpending状態の反正選択はno-opです。projection readerが準備できていない間のagent prompt組み立ては失敗するため、呼び出し側はプラグイン活性化を待ってからagentを走らせなければなりません。

## 注意

- plan状態はモデルtranscriptに入らないログです。モデル可視の振る舞いは `plan:policy` sectionと、遷移時に届く文面通知だけです。
- exitの承認はモデル側の自己判断ではなく、ユーザー審査（user-questions）経由です。承認済みexitの追記もpre-step時点であり、審査の結果はツール結果として当該batchに届きます。
- prompt受付（admission）が `plan/mode` を追記できないため、prompt時点の `/plan` は次のturn内pre-stepで追加されます。
- サンドボックスとapprovalはplan状態を読み書きしません。配置は3つを独立に構成します。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/plan.md
