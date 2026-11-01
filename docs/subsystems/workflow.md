# ワークフロー

モデルが書いた編成（orchestration）スクリプトを実行してサブエージェントを起動できる継ぎ目（seam）です。サブエージェントと同じく **1つの任意能力** であってループの一部ではなく、bashと同じように1つのコンテキストには1つのエンジン実装だけが `ctx.workflowEngine` として載ります（第2のエンジンは並存ではなく置き換え）。VMの実行は `dsh-workflow-ptc` が呼び出し元セッションのファイルポリシーの下で共有のNode PTC実行ランタイムを使い、モデル向きの消費者は `dsh-tool-workflow` と、オプトインの `dsh-tool-ralph` です。

## 開始要求と識別ブロック

| フィールド | 意味 |
| --- | --- |
| `script` | 平文JSスクリプト本体（トップレベルawait可。`return <json値>` で終わる） |
| `meta` | ワークフローの識別ブロック。純粋なJSONデータ（`name`・`description` 必須、`whenToUse`・`phases` 任意） |
| `args` | スクリプトへ `args` グローバルとしてそのまま渡す任意入力 |
| `subagentProvider` | この実行に限って選べる子プロバイダの上書き |
| `maxTotalAgents` | 実行ごとの子の総数上限 |
| `parent` | 必須。スクリプトが起動する全ての子が帰属するエージェント |
| `signal` | 中止したときに実行を止める |

`meta` と `args` は縫い目の契約により純粋なJSONデータです。エンジンは本体を評価せずに `meta` をスキーマ検証し、実行前に不正なら大声で拒否します。スクリプトが `subagentProvider`・上限（maxTotalAgents）のポリシーを観測・置換することはできません。

## 結果と実行中ラン

| 概念 | 取決め |
| --- | --- |
| `WorkflowResult.value` | スクリプトの戻り値（host領域のJSONデータ。undefinedならnull）。`completed` でのみ意味を持つ |
| `stopReason` | 閉じたunion: `completed` / `cancelled` / `error`。非completedなら末尾に `error` が付く |
| `agentsStarted` | 実行額を通じて受理された `agent()` 呼び出しの数（正常経路ではスクリプト側の数） |
| `WorkflowRun.result` | 決して reject しない promise。スクリプト失敗は `error` で解決する |
| `cancel` | 実行とその子を取り消す。PTCエンジンは経過期限を持たず、取消時に即座に管理プロセスを中止する |
| `dispose` | 全経路で必須の片付け。スクリプトと子の静穏化を待つ |

失敗規律として、スクリプト内の誤用（bad引数、未知のagent()オプション、structured-output部分集合外のschema、上限超過、seamの開始失敗、取消）は `WorkflowError` に `fatal: true` を付けて投げます。`parallel()` / `pipeline()` は致命的エラーを再スローし、項目をnullに写像しません。並行項目の `null` は子実行の失敗と普通のスクリプトエラーだけに許されます。

## Cordis サービス

`ctx.workflowEngine` は抽象seamで、無効な要求は発行前に投げられ、実行中ランは holder 所有です。`WorkflowRun` は `id`・`meta`（本体実行前に検証済み）・`result`・`cancel`・`dispose` を提供します。 lifecycleリスナーの失敗は包含され、`workflow/end` は解決時にちょうど1回発火します。

実行エンジン側の細かい挙動（phaseの入力形式や `log()` の filming）は、実装を担う `dsh-workflow-ptc` とセマンティクスを所有するパッケージREADMEに委ねられます。このページが扱うのはseamの約束だけです。


## イベントと永続記録

`workflow/*` イベント（`workflow/start`・`workflow/phase`・`workflow/log`・`workflow/agent-start`・`workflow/agent-end`・`workflow/end`）は観察専用で、生の `WorkflowRun` ではなく識別情報＋metaのデータスナップショットを運びます。`workflow/end` は結果値を敢えて省くので、購読者が値への可変エイリアスを得ることもありません。各emitはリスナーごとに隔離され、リスナーはpayloadの複製を受け取ります。

- `phase()` 呼び出しは観察者対象の進捗語彙で、実行構造を意味しません。`meta.phases` と照合するだけです。
- `dsh-tool-workflow` は属した親セッションに表示事実を書き込みます。まず実行を受理したあと `tool-workflow/run-start`、子の開始・終了を `runId + seq` で対にし、結果が解決して片付けが静穏化した後だけ `tool-workflow/run-end` を書きます。ネストした送信側呼び出しは記録しません。
- 記録プロトコルは「1実行につき1開始・正で一意なメンバーseq・対になったメンバー終了・開いたメンバーのまま実行終り」「実行終りの更新は禁止」を要求します。メンバー終了の欠落やログ末尾での実行終りは、合法な割り込みの証拠になります。
- `dsh-client-ui-workflow-run` は4イベントをNodeエンジンで畳み込み、run-startの直後に1つの `workflow-run` チャットノードを打ちます。フェーズグループは実際のメンバー開始から作られ、省略フェーズと空文字列の区別も保持します。

## 注意

- エンジンは1コンテキストに1つ。サービスの二重読み込みはcordisの標準duplicate-service挙動で失敗します。
- `agentsStarted` は終了経路では取り消し・プロセス失敗時にhost観測の数に降格します（取り消されたスクリプト内で待ちに入った呼び出しは推定できないため）。補欠（スクリプト側の数に含まれる）を含めて計算されます。
- `workflow/end` は結果を解決するときに本当に1回だけ発火します。ライフタイクルリスナーの失敗は内容化されます。
- このseamは任意能力なので、ループの必須語彙ではなく、サービス定義と実行エンジン・ツールの組合せで成り立ちます。

## スクリプトができること

| ヘルパー | 意味 |
| --- | --- |
| `agent(...)` | 子エージェントの起動。親は start request の `parent` に帰属する |
| `parallel()` / `pipeline()` | 子の並列実行と段差実行のコンビネータ。致命的エラーは再スロー、子の失敗は項目をnullに |
| `phase(title)` | 進捗語彙の宣言。観察者の進捗グループに使われ、実行構造は変わらない |
| `log(message)` | 記述（narration）の1行を `workflow/log` として出す |


## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/workflow.md