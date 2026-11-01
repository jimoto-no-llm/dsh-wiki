---
title: "拡張プラグインの形態ガイド"
desc: "Harness の拡張（ツールプラグイン／フックプラグイン／UIプラグイン／外部プロトコルドライバ）を書くときの参照パターンを確認する。"
cat: "develop"
catLabel: "開発ガイド"
chars: 5327
slug: "develop/extension-cookbook"
---

# 拡張プラグインの形態ガイド

## 目的

Harness の拡張（ツールプラグイン／フックプラグイン／UIプラグイン／外部プロトコルドライバ）を書くときの参照パターンを確認する。
ここにあるコード断片は import とヘルパー実装を省いており、コピーしてそのまま動く完全なコードではない点に注意する。
具体的な作成手順はパッケージチェックリスト（adding-a-package）、最初のツールチュートリアル、ツールリファレンス（adding-a-tool）、LLM アダプタガイド（adding-an-llm-adapter）、Session フォーマットバージョン チュートリアル（adding-a-session-format-version）の各記事を参照する。
システムと拡張ポイント（extension point）全体の対応はアーキテクチャドキュメントが正とする。

## 前提

- Cordis プラグインとして `export const name` と `apply(ctx)` を書けること。
- この記事で触れる内容はすべて「ドキュメント化された拡張ポイントのリスナー」で実現され、ループ自体を改変する行はない。

## 手順

### ツールプラグイン

ツールは `ctx.tools` に登録する。
`defineTool` を使った注釈付きの例（execute 引数の型、結果の構築、`run_in_background` パターン）は adding-a-tool.md が唯一の正とする。
生の JSON-Schema `ToolDefinition` も `ctx.tools.register()` に直接受け付けられる（MCP 由来のツールはこの形で届く）。`defineTool` は第一-party ツール向けの型付きヘルパーである。

### フックプラグイン（permission-gate の例）

この permission gate はフックプラグインの一例で、`tools/pre-execute` ゲートから型付きの decision を返してコールを許可・拒否する。sandbox・permission・plan-mode のプラグインもこの拡張ポイントを使える。フックプラグインは他の拡張ポイントも横取りでき、本質的に permission gate のためのものではない。
「ネイティブフック」は横取りポイント上の普通の Cordis プラグインで、外部プロトコルは不要である。

```ts
import type { Context } from '@deepseek-ai/cordis'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'

declare function isAllowed(exec: ToolExecution): Promise＼boolean］

export const name = 'permission-gate'

export function apply(ctx: Context) {
  ctx.on('tools/pre-execute', async (exec, next): Promise＼PreToolDecision］ => {
    if (!(await isAllowed(exec))) {
      return { kind: 'deny', reason: 'Denied by policy.' }
    }
    return next()
  })
}
```

この waterfall は並べ替え可能なポリシーの層である。
一期不変の最終拒否が要るときは `ctx.tools.guard()`、dispatch の一生を包むときは `tools/execute`（timeout／retry／metrics。置き換えられるのは `exec.signal` だけ）、結果の明示的変換は `tools/post-execute`、不変の最終結果を閉じた範囲で観測するときは `tools/result` を使う。選択ルールは adding-a-tool.md の "Execution policy and observation" を参照する。

### UI プラグイン

UI プラグインは、永続的な `session/event` 記録（Assistant の確定、turn／step の境界、ツールの活動）と、ライブのトークン表示のための過渡的な `agent/assistant-stream` フレームを組み合わせ、入力は `agent.followup()`／`agent.steer()` で返す。
内蔵 Web Client に business row を足すブラウザプラグインは、代わりに `ConversationNodeDefinition` と keyed Chat renderer を登録する。

```ts
import type { Context } from '@deepseek-ai/cordis'
import { brandString } from '@deepseek-ai/dsh-brand'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session'

declare function render(text: string): void
declare function onUserInput(handler: (text: string) => void): void

export const name = 'my-ui'
export const inject = ['agents']

export function apply(ctx: Context) {
  ctx.on('agent/assistant-stream', ({ frame }) => {
    if (frame.type === 'chunk' && frame.chunk.type === 'text-delta') {
      render(frame.chunk.text)
    }
  })
  onUserInput(text => ctx.agents.get(brandString＼SessionId］('client-session'))?.followup(createUserMessage({
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  })))
}
```

### 外部プロトコルドライバ

プロトコルドライバ（protocol driver）は wire peer を `ctx.agents` に適合させ、UI でもオートメーションクライアントでも提供できる。stdio ドライバは stdout を所有し、ファクトリ経由で Agent を作成・再開し、プロトコルの要求を `followup()` か `cancel()` へ写像する。
低レベルの prompt 要求は永続的な enqueue 受領証（enqueue receipt）を返し、`MessageId` と `turn/end` を突き合わせても結果は取れない。Agent 全体の状態は別途配信する。オートメーション method は受領証から次の idle までの明示的に所有した区間を待って要約できるが、UI は通常、開いたままのイベントストリームを観渆し続ける。後片付けは `AgentHandle.dispose()` で停正状態まで進める。
オートメーション専用の具体例は `packages/acp/acp`（Agent Client Protocol JSON-RPC stdio）。exact な method・イベント順序・lifecycle 契約はその README が規定する。

### 実行可能な配線（Runnable wirings）

出荷アプリケーションは `packages/bundle/*/cordis.patch.yml` で profile 層を提供し、製品の `dsh` launcher は named profile を介して Web・ACP・SDK・one-shot headless 実行を担う。ユーザー向けの任意オーバーレイは `apps/cli/config/examples/`、profile の integration テストは `apps/cli/tests/profiles/`、パッケージ固有の Loader 構成はそのパッケージのテストに置く。

### 機能 → 機構マップ

すべての製品機能は、ドキュメント化された拡張ポイントのリスナーへ写像できる（microkernel 主張の検証可能な形）。どの行もループを改変しない。
`system-prompt/assemble` は専門家向けの協調的全組み立て変換であり、返された assembly が authoritative なので、リスナー作者は active な PTC モードと structured-output プロトコルの寄与を保持する責を持つ。表示・探索・実行で揃えたいツール絞り込みは `ctx.tools.restrict()` を推奨。

| 製品機能 | プラグイン機構 |
|---|---|
| Hook system（user + project level） | `agent/created`・`agent/pre-step`・`tools/pre-execute`・`tools/post-execute`・`agent/turn-stopping` のリスナー。waterfall は型付き decision を返し、`agent/turn-stopping` は別 step へ steer できる。`dsh-hooks-claude-code`／`dsh-hooks-codex` bridge が hook 設定ファイルをこれらの拡張ポイントへ写像する |
| `/goal` | `ctx.goals` が永続状態を所有し、`dsh-goal-round-driver` が public `Agent` を通じて同セッション ラウンドをスケジュールする。人間／モデルの制御は別の command／tool producer が露出する |
| `/loop` | `turn/end` session event で `followup()` して次回反復するか、force-continue する |
| Dynamic workflow | `ctx.workflowEngine` ＋ PTC workflow engine ＋ `workflow` ツール。structured な in-process 子は scoped prompt／tool 登録・monotonic tool guard・最終 `tools/result` commit（外側の `run_code` を含む）・structured-output 実行の monotonic `concludeTurn()` marker で出力を強制する |

## 注意

- コード断片は省略ありの参照用であり、そのまま貼っても完全には動かない。
- permission gate の例は「フックプラグインの形の一例」であって、フックプラグインを permission gate と同一視しないこと。
- 例にある宣言関数（`isAllowed`・`render`・`onUserInput` など）は読者の環境で用意する部分を示すプレースホルダである。

## 出典

UPSTREAM: <https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/extension-cookbook.md>

- 位置: `docs/cookbook/extension-cookbook.md`（英語本文）
- 本記事は原文の節構成・コード・原則を意訳した日本語版で、内容の追加・省略にあたっては原文に拠った。
