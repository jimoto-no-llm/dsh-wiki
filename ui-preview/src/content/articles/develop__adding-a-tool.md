---
title: "ツール実装リファレンス"
desc: "モデル向けツール（model-facing tool）が満たすべき契約を確認する。順序立てた最初の一本は \"Build a tool\" チュートリアル、本番水準の 3 パッケージ構"
cat: "develop"
catLabel: "開発ガイド"
chars: 5362
slug: "develop/adding-a-tool"
---

# ツール実装リファレンス

## 目的

モデル向けツール（model-facing tool）が満たすべき契約を確認する。順序立てた最初の一本は "Build a tool" チュートリアル、本番水準の 3 パッケージ構成の例は `packages/shell/tool-bash` を参照する。

## 前提

- Cordis プラグインとして `ctx.tools` に登録する。
- 型付きヘルパー `defineTool`（`@deepseek-ai/dsh-tools`）を使う。生の JSON-Schema を直接登録する場合は入力バリデーションを自分で担うことになる。

## 手順

### 最小の形

```ts
import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'my-tool'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'read_file',
    description: 'Read a file from disk.',          // what the model sees
    parameters: {
      path: { type: 'string', required: true, description: 'Absolute path' },
      limit: { type: 'number' },                     // optional by default
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      // args is TYPED from the schema: { path: string; limit?: number }
      // exec carries immutable identity + token; signal is the operational field
      return readFile(args.path, { encoding: 'utf8', signal: exec.signal })
    },
  }))
}
```

登録はエフェクトベースで、プラグイン fiber を dispose するとツールも unregister される。schema は system-prompt の组装に自動で流れ込む。

### execute() 契約のルール

1. **args は自動バリデーションされる。** `defineTool` は `execute` 実行前に、モデル生成の `arguments` を統一 `ParameterSchemaSpec` で検証する（型・必須キー・リテラル制約・exact-one union・ネスト値）。DSL が表現できない制約（非空文字、正数、cross-field ルールなど）は自分でチェックする。
2. **登録は readonly 定義を借用する。** 登録後に schema を改変したり callback を差し替えたりしない。ホットスワップは所有エフェクトを dispose してから再登録する。callback クロージャ内の可変状態は普通のプラグイン状態のままでよい。
3. **実行 identity は保護される。** registry は `arguments` を detached lossless JSON として具体化し、policy 開始前に freeze し、opaque な `exec.token` を割り当てる。`callId`・`name`・`arguments`・`agent`・`token`・必須の caller 所有 `signal`・任意の `parent` token は dispatch 中不変。`args` は readonly 入力として扱う。可変ビューを受け取れるのは around-dispatch wrapper だけで、`exec.signal` の差し替え/revert はできるが除去はできない。
4. **1 つの canonical JSON 値を宣言して返す。** `output.schema` は `ValueSchemaSpec` で、object・array・scalar・null のルートを持てる。`execute` は推論された値だけを返し、registry が lossless JSON で snapshot・検証・freeze して `output.render(args, value)` に渡す。
5. **throw や不正値は `isError` になる。** throw はインフラ障害のため。ドメイン上の成功（非ゼロ exit など）は canonical 値の中で表現する。
6. **`exec.signal` を尊重する。** 発火したら in-flight の処理をキャンセルする。
7. **`presentationMeta`（任意）で durable card data を投影する。** 再生可能な JSON を canonical 値から導出し、core が `tool/result` に永続して `presentResult` へ渡す。
8. **非同期通知は `exec.agent` を使う。** `agent.inject({ content, source: { kind: 'my-plugin' } })` は次のモデル要求から見える永続 context だが wake-up ではない。`kind` は `MessageSourceMap` で宣言し、session format V4 は廃止済み `{ kind: 'plugin', plugin: '＼name］' }` wrapper を拒否する。 disposed agent は try/catch で守る。

### 長時間処理

`run_in_background` を producer 設定でゲートし、`ctx.jobs.start({ kind, label, owner: exec.agent, run })` で登録する。成功した background 分岐は `{ kind: 'background', jobId }` のような型付き canonical handle を返す。PTC モードが人間向け prose をパースして id を復元してはならない。id が publish されたら、`exec.signal` ではなく task 専用の cancellation signal を使う（`job_kill`・owner disposal・service teardown がその lifetime を所有する）。foreground の処理は `exec.signal` と結合したまま。

### 実行ポリシーと観測

デプロイポリシーをツール本体に組み込まない。`tools/pre-execute` で拡張可能な allow/deny/ask ポリシー、`ctx.tools.guard()` で後から解消できない monotonic 拒否、`tools/execute` で deadline・retry・metrics を含む dispatch wrap、`tools/post-execute` で表示内容・返り値の置換やブロック、`tools/result` で正規化後の不変結果の観測、と使い分ける。sandboxing はツールの executor 実装内で行うこともできる。各拡張ポイントの入力・順序・返り値・failure 動作は `dsh-tools` README が規定する。

### PTC モードは自動で届く

PTC モードでは、見えている登録済みツールは追加統合なしで `await tools.＼name］(args)` として使える。生成された `ToolArgsMap`／`ToolOutputMap` は同じ schema から正確な引数型と canonical 返り値型を導出し、コールは通常の実行パイプラインに再入する。成功したコールは policy 後の最終 canonical JSON 値に resolve し、失敗は実際の `ToolCallError` で reject する（プログラムが読めるのは `name`・`toolName`・人間向け `message` だけ）。`output.schema` は有用な programmatic API として設計し、人間向けの説明は `output.render` に置く。中間値は execution-local で永続されず prompt truncation もされない。

### UI カード

`output.render` はモデル向け content を返し、**UI カード**は pure な presentation projection と任意の `presentCall`／`presentResult` で宣言する別関心事である。両 method は `card` タグ付きの render intent を返す（`generic`／`terminal`／`diff`）。ハードルール:

- **純粋性。** ライブストリーミングと session-log の REPLAY 両方で走るため、`args`（＋結果）の pure 関数であること。I/O・session 状態の読み取り・clock/random は禁止。old content や working directory を `presentCall` 内で読みたくなったら、それは durable な result metadata か adapter に属する。
- **UI 専用の整形はモデルの結果に入れない。** fenced `\`\`\`console` ブロック や diff、相対化した path は canonical 値や Native content に入れない。
- **`defineTool` は表示経路を soft validate する。** 壊れたログ引数では throw でなく generic fallback を返し、再生を壊さない。

Web Client は `presentCall`／`presentResult` を直接消費せず、`page`／`follow` は生の `tool/call`・`tool/result` イベント（persist された `result.meta` 含む）を運ぶ。Client プラグインは `tool.call.toolview` keyed slot に wire ツール名を登録し、wire 値をローカルで検証する。

### 検証

リポジトリの testing ポリシーと、担当パッケージのテストドキュメントに従う。出荷対象のモデル可視・UI 可視の変更には、その位置で指定される assembled coverage が要る。

## 注意

- `execute` から content block を返さない。canonical 値だけを返し、呼び出し側に prose をパースさせない。
- `schemas()` は明示的なモデル向け projection だけを具体化する。schema をその場で改変できると期待しないこと。
- 背景起動が pre-aborted なときは、成功 schema を満たす task が存在しないため失敗になる（仕様通り）。

## 出典

UPSTREAM: <https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-tool.md>
