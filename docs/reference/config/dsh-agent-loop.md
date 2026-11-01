# `@deepseek-ai/dsh-agent-loop` の設定

`@deepseek-ai/dsh-agent-loop` はエージェントループ本体のプラグインで、1ステップあたりの並列ツール呼び出し上限と、プラグイン起動時に作成・再開するエージェント（`agents`）を設定します。トップレベルの doc コメントは「エージェントループプラグインの設定（Agent-loop plugin configuration.）」です。

- 注入先（inject）: `agents` · `sessions` · `llm` · `tools` · `systemPrompt` · `sessionProjections`
- 型の参照先: `AgentOptions` · `SessionId`（→ 原文カタログ内の `subsystems/core.md`）· `Volatile`（`@deepseek-ai/cosmokit`）
- 上流の型定義位置: `packages/core/agent-loop/src/index.ts:253`

## 原文の型定義（`config-catalog.md` 抜粋）

```ts
/** Agent-loop plugin configuration. */
export interface Config {
  /**
   * Maximum parallel-safe calls in flight per agent step. `1` is serial;
   * omission defaults to {@link DEFAULT_MAX_PARALLEL_TOOL_CALLS}.
   */
  maxParallelToolCalls: Volatile＼number］
  /** Agents created or resumed at plugin startup; a resumed agent records its configured route as the Session's model selection. */
  agents: (AgentOptions & {
    /** Stable config label used in logs and as the fresh combined-id prefix. */
    id: string
    /** Optional stable identity; remounts resume its materialized history, while first use creates it fresh. */
    sessionId?: SessionId
    /** Optional workspace for a fresh session. */
    cwd?: string
    /** Persisted session to resume instead of creating a fresh session. */
    resumeSessionId?: SessionId
  })[]
}
```

## 全設定フィールド

### Config（トップレベル）

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `maxParallelToolCalls` | `Volatile＼number］`（省略時は既定値） | エージェントの1ステップで、同時に飛行中（in flight）にしてよい並列安全な呼び出しの最大数。`1` は直列。省略時は `DEFAULT_MAX_PARALLEL_TOOL_CALLS`。 |
| `agents` | `(AgentOptions & { id: string; ... })[]` | プラグイン起動時に作成または再開するエージェント。再開したエージェントは、設定されたルートをそのセッションのモデル選択として記録する。 |

### agents 配列の各要素

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `id` | `string`（必須） | ログで使われ、新規セッションの combined-id の接頭辞にもなる、安定した設定ラベル。 |
| `sessionId` | `SessionId`（省略可） | 任意の安定識別子。再マウント（remount）ではマテリアライズ済みの履歴を再開し、初回使用時は新規に作る。 |
| `cwd` | `string`（省略可） | 新規セッション用のワークスペース。 |
| `resumeSessionId` | `SessionId`（省略可） | 新規セッションを作る代わりに再開する、永続化済みのセッション。 |

## 注釈

- 原文（`maxParallelToolCalls`）: "Maximum parallel-safe calls in flight per agent step. `1` is serial; omission defaults to {@link DEFAULT_MAX_PARALLEL_TOOL_CALLS}."
  - 訳: 「エージェントの1ステップで飛行中にしてよい並列安全な呼び出しの最大数。`1` は直列。省略時は {@link DEFAULT_MAX_PARALLEL_TOOL_CALLS}」。
  - TS の型上は `?` の無い必須表記ですが、doc コメントのとおり実行時には省略でき、その場合は既定の定数 `DEFAULT_MAX_PARALLEL_TOOL_CALLS` が使われます。その値そのものはこのセクションの型定義には書かれていません。
- 原文（`agents`）: "Agents created or resumed at plugin startup; a resumed agent records its configured route as the Session's model selection."
  - 訳: 「プラグイン起動時に作成または再開されるエージェント。再開したエージェントは、そのセッションのモデル選択として設定されたルートを記録する」。
- 安定識別子まわりの読み取り: `sessionId` を明示した場合、プラグインの再マウントのときに同じ `sessionId` に紐づくマテリアライズ済みの履歴が再開されます。新規に履歴が作られるのは「初回使用時」だけです。
- `resumeSessionId` は「新規セッションを作る代わりに、永続化済みのセッションを再開する」ための指定です。
- `AgentOptions` と `SessionId` の定義内容は、原文カタログではコアのサブシステム文書（`subsystems/core.md`）へのリンクで示されており、このセクション内では展開されていません。`agents` の各要素は `AgentOptions` に上記4フィールドを追加した合同型です。

## 設定例

プロファイルの `cordis.patch.yml` に挿入する行（row）として設定します。

```yaml
- id: agent-loop
  name: '@deepseek-ai/dsh-agent-loop'
  config:
    maxParallelToolCalls: 1   # 直列運用にする（原文の `1` is serial に対応）
    agents:
      - id: main
        cwd: ~/project        # 新規セッションのワークスペース
      - id: assist
        resumeSessionId: sess-0189-main   # 永続化済みセッションを再開
```

`agents` の残りのフィールド（モデル選択など）は `AgentOptions` 側に属します。例では `DEFAULT_MAX_PARALLEL_TOOL_CALLS` の値が型定義に明示されないため、直列を意味する `1` を明示しています。

## 関連ページ

- [agent-lifecycle](/deep/agent-lifecycle.md)
- [CLI の共通挙動](/reference/cli/behaviors.md)（`cordis.patch.yml` のレイヤー合成順序と、行（row）の指定方法）

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-agent-loop
- 元の型定義: `packages/core/agent-loop/src/index.ts`（`config-catalog.md` 生成時点）
