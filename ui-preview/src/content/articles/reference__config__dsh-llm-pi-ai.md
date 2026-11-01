---
title: "`@deepseek-ai/dsh-llm-pi-ai` の設定"
desc: "@deepseek-ai/dsh-llm-pi-ai は pi-ai ベースの LLM アダプタで、このインスタンスが所有するプロバイダルート（provider routes）を設"
cat: "config"
catLabel: "設定の詳細"
chars: 8386
slug: "reference/config/dsh-llm-pi-ai"
---

# `@deepseek-ai/dsh-llm-pi-ai` の設定

`@deepseek-ai/dsh-llm-pi-ai` は pi-ai ベースの LLM アダプタで、このインスタンスが所有するプロバイダルート（provider routes）を設定します。トップレベルの doc コメントは「プラグイン設定: このインスタンスが所有するプロバイダルート（Plugin configuration: the provider routes this instance owns.）」です。

- 注入先（inject）: `llm`
- 型の参照先: `Api` · `CacheRetention` · `Model` · `ModelThinkingLevel` · `OpenAICompletionsCompat` · `RetryPolicyConfig` · `ThinkingBudgets` · `Transport`（`@earendil-works/pi-ai` と LLM 本体）· `Volatile`（`@deepseek-ai/cordis`）
- 上流の型定義位置: `packages/llm/llm-pi-ai/src/config.ts:222`

## 全設定フィールド

### Config（トップレベル）

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `providers` | `Volatile<Record<string, PiAiProviderProfile>>` | pi-ai プロバイダルート。辞書のキーがルート名になる。空の辞書（または省略）は「休止中（dormant）の設定駆動姿勢」で、ルート無しでマウントし、設定セクションが profile を供給した瞬間に登録される。 |

### PiAiProviderProfile（1ルートの設定）

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `apiKeyEnv` | `string`（省略可） | 資格情報（credential）参照。リクエストごとに `ctx.credentials` から解決される環境変数名。 |
| `displayName` | `string`（省略可） | 設定表面上で表示する名前。デフォルトはルートのキー。 |
| `api` | `string`（省略可） | このルートのモデルが話すワイヤープロトコル。省略はインストール済みカタログの各モデルのプロトコルを引き継ぐ（カタログに無いルートは必須）。 |
| `baseURL` | `string`（省略可） | このルートのエンドポイント。デフォルトはインストール済みカタログのエンドポイント。 |
| `models` | `PiAiModelProfile[]`（省略可） | このルートのモデルカタログ。省略はインストール済みカタログをそのまま提供し、明示したリストは置き換えになる。各エントリの未指定フィールドは、同一 id のインストール済みモデルからデフォルトされる。 |
| `modelOverrides` | `object`（省略可） | インストール済みカタログの個別モデルを id ぶんだけ作り直す。`models` リストのないカタログルートでのみ有意味。 |
| `compat` | `PiAiCompatProfile`（省略可） | ルートのモデル既定を与える pi-ai ワイヤ互換スイッチ。各モデルの `compat` がフィールドごとに勝つ。ルート上のどのモデルも読めないスイッチは棄却される。 |
| `defaultContextWindow` | `number`（省略可） | ルートに列挙されたモデルのうち、どの層も容量を決めていないものへの既定コンテキスト容量（デフォルト 1,000,000）。小さいモデルを提供するゲートウェイではここで訂正する。 |
| `defaultMaxTokens` | `number`（省略可） | 容量が決まっていないモデルへの既定出力能力（デフォルト 128,000）。モデルのサイズを決めるもので、単独ではリクエスト上限にならない。 |
| `defaultInput` | `PiAiModality[]`（省略可） | 宣言されないモデルへの既定リクエストモダリティ（デフォルト `[text]`）。e.g. ゲートウェイが提供する画像モデルを `[text, image]` と1箇所で宣言する。空リストにはできない。 |
| `headers` | `object`（省略可） | プロバイダへのリクエストヘッダ。profile 解決時に Fetch に対して検証され、Harness 属性が予約名に勝る。 |
| `reasoning` | `ModelThinkingLevel`（省略可） | プロバイダ中立の pi-ai 推論レベル。 |
| `thinkingBudgets` | `ThinkingBudgets`（省略可） | 対応する推論プロバイダが使うトークン予算。 |
| `cacheRetention` | `CacheRetention`（省略可） | プロンプトキャッシュの保持の好み。 |
| `transport` | `Transport`（省略可） | ストリーミング transport の好み。 |
| `timeoutMs` | `number`（省略可） | HTTP／プロバイダ SDK タイムアウト（ミリ秒）。 |
| `websocketConnectTimeoutMs` | `number`（省略可） | WebSocket 接続タイムアウト（ミリ秒）。 |
| `streamIdleTimeoutMs` | `number`（省略可） | 1回のストリーム読みが稼働する最大の接続アイドル時間。 |
| `maxRequestImageBytes` | `number`（省略可） | リクエストあたりの base64 エンコード画像ペイロードの最大値。超えるとき、最も古い画像をテキストプレースホルダへ置換してリクエストを完了させる。 |
| `requestImagePixelBudget` | `number`（省略可） | 各デターミニスティック（deterministic）inline リクエスト版のための総ピクセル予算。 |
| `requestImageMaxBytes` | `number`（省略可） | 各デターミニスティック inline リクエスト版のエンコード済みバイト目標。どの品質も収まらなければ、低品質のどれかを出力する。 |
| `retryPolicy` | `RetryPolicyConfig`（省略可） | プロバイダ所有のリクエスト再試行ポリシー。省略時は normal モードの5回再試行。 |

### PiAiModelProfile（`models` の各エントリ）

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `id` | `string`（必須） | プロバイダへ送るモデル id。 |
| `name` | `string`（省略可） | セレクタ表示名。デフォルトはカタログ名、次いで id。 |
| `contextWindow` | `number`（省略可） | リクエスト+レスポンス合算の最大コンテキスト（トークン）。 |
| `maxTokens` | `number`（省略可） | 最大出力トークン。明示した場合はこのモデルのリクエスト既定にもなる。継承値は能力（capability）にとどまり、リクエスト既定にはならない。 |
| `input` | `PiAiModality[]`（省略可） | このモデルが受けるリクエストモダリティ。なし（または空）はカタログのモダリティ、次いでルートの `defaultInput` を引き継ぐ。画像を宣言することが、手で宣言するビジョン（画像入力）モデルを有効にする方法。 |
| `reasoningEfforts` | `false \| PiAiReasoningEfforts`（省略可） | 選択可能な推論努力。`false` は非推論モデルの宣言。省略はカタログの能力を引き継ぐ（手で宣言したモデルは推論しない）。 |
| `compat` | `PiAiCompatProfile`（省略可） | このモデルのワイヤ互換スイッチ。ルートの値をフィールドごとに勝り、プロトコルが取れないものは棄却される。 |

### PiAiCompatProfile（ワイヤ互換スイッチ）

ルートに置くと「ルートのモデルの既定」、モデルに置くと「ルートをフィールドごとに勝る」が原則です。原文の注記: 推論しないなら「supported, send nothing」の絡みで `off` は空の値も認める。型は全て `boolean`（省略可）で、適格なプロトコルは原文で各フィールドに併記されています。

| フィールド | 適格プロトコル | 意味 |
| --- | --- | --- |
| `supportsStore` | `openai-completions` | エンドポイントが `store` を受け取るか。 |
| `supportsDeveloperRole` | `openai-completions` · 3 Responses 協定 | エンドポイントが（推論モデルだけに送られる）システムプロンプトの `developer` ロールを受け取るか。`false` は `system` のまま。 |
| `supportsReasoningEffort` | `openai-completions` | エンドポイントが `reasoning_effort` を受け取るか。 |
| `supportsUsageInStreaming` | `openai-completions` | エンドポイントが `stream_options: {include_usage: true}` を受け取るか。 |
| `supportsFinishReason` | `openai-completions` | ストリームが `finish_reason` を含むか。`false` は pi-ai がストリーム終端の理由を推論する。 |
| `maxTokensField` | `openai-completions` | エンドポイントが読む出力能力フィールドの名前。 |
| `requiresToolResultName` | `openai-completions` | ツール結果が `name` を持たなければならないか。 |
| `requiresAssistantAfterToolResult` | `openai-completions` | ツール結果の後のユーザメッセージが間にアシスタント（assistant）メッセージを挟む必要があるか。 |
| `requiresThinkingAsText` | `openai-completions` | 思考ブロックが `＼thinking］` 区切り文字でテキストとして流れる必要があるか。 |
| `requiresReasoningContentOnAssistantMessages` | `openai-completions` | 再生したアシスタントメッセージが（推論が有効のとき）空の `reasoning_content` を必要とするか。 |
| `thinkingFormat` | `openai-completions` | エンドポイントが期待する推論パラメータの形式。 |
| `chatTemplateKwargs` | `openai-completions` | `chat_template_kwargs` として送る kwargs。pi-ai は2つの `chat-template` thinking 形式のときだけ読む。フォームの強制がない。 |
| `chatTemplateArgs` | `openai-completions` | `baseten` thinking 形式のとき `chat_template_args` として送る引数。 |
| `supportsThinkingTokenBudget` | `openai-completions` | `thinkingTokenBudgetField: "thinking_token_budget"` に対する別名。明示したフィールドが勝つ。 |
| `thinkingTokenBudgetField` | `openai-completions` | `thinkingBudgets` からの推論予算を運ぶリクエストフィールド。設定しない限り省略される。 |
| `vllmPriority` | `number`（省略可） | vLLM スケジューラの `priority`。低いほど早く走る。サーバが優先スケジューリングを有効にする必要がある。 |
| `supportsMaxOutputTokens` | `openai-responses` | `openai-responses` が `max_output_tokens` を受け取るか。`false` は省略する。 |
| `supportsStrictMode` | `openai-completions` · 3 Responses 協定 · `bedrock-converse-stream` | エンドポイントがツール定義の `strict` を受け取るか。 |
| `cacheControlFormat` | `openai-completions` | プロンプトキャッシュマーカーの規約。 |
| `supportsLongCacheRetention` | `openai-completions` · 3 Responses 協定 · `anthropic-messages` | エンドポイントが長いプロンプトキャッシュ保持を受け取るか。 |
| `supportsEagerToolInputStreaming` | `anthropic-messages` | エンドポイントがツール1つごとの `eager_input_streaming` を受け取るか。 |
| `supportsCacheControlOnTools` | `anthropic-messages` | エンドポイントがツール定義に `cache_control` を受け取るか。 |
| `supportsTemperature` | `anthropic-messages` | エンドポイントが `temperature` リクエストフィールドを受け取るか。 |
| `forceAdaptiveThinking` | `anthropic-messages` | モデル id によらずアダプティブ（adaptive）思考を強制するか。 |
| `allowEmptySignature` | `anthropic-messages` |思考をテキストへ変換せず空の思考シグネチャを再生するか。 |
| `supportsStrictTools` | `anthropic-messages` | エンドポイントが Anthropic 厳密ツールスキーマを受け取るか。 |

「3 Responses 協定」と表記した箇所は、原文中の "the three Responses protocols" で、`openai-responses` · `azure-openai-responses` · `openai-codex-responses` を指します（共有 compat 型のため、1つに設定できるスイッチは3つ全てに設定できる）。

## 注釈

- `providers` のキーがルート名: 「プロバイダ辞書のキーがそのものズバリルート」です。
- `PiAiModelOverride` は `PiAiModelProfile` から `id` を除いた型（`Omit<PiAiModelProfile, 'id'>`）で、`modelOverrides` 辞書の値になります。原文の doc コメントは「`models` リストと異なり、カタログの残りはそのまま提供され続ける。これが『モデルを1つだけ訂正して他の37個はそのまま』という3行の編集を実現する」と述べています。
- `PiAiReasoningEfforts` は `Partial<Record<ModelThinkingLevel, string | null>>` の型です。各キーがモデルの提供するレベル（セレクタにも表示）で、値は dispatch が送るワイヤの綴り。`off` だけは空の値も許します（＝supported, send nothing。多くのプロバイダでは「考えない」ことがパラメータの欠如そのものだから）。その他の宣言レベルは必ずワイヤ値を名指し、辞書に無いレベルは提供されません。
- compat 各スイッチの必要性について原文は「pi-ai はプロバイダ id と baseURL からこれらを推測するが、プライベートゲートウェイの URL は何も語らない。認識できないエンドポイントには OpenAI 本家と同じ回答をするため、多くの OpenAI 互換ゲートウェイには間違い。だから各フィールドは誰にも推論できないものとしてデプロイが明示できなければならない」と説明しています。

## 設定例

```yaml
- id: llm-pi-ai
  name: '@deepseek-ai/dsh-llm-pi-ai'
  config:
    providers:
      groq:
        api: openai-completions
        baseURL: https://api.groq.com/openai/v1
        apiKeyEnv: GROQ_API_KEY
        defaultContextWindow: 1000000
        defaultMaxTokens: 128000
        defaultInput: [text]
        timeoutMs: 60000
        # retryPolicy を省略した場合は normal モードで 5 回の再試行
        compat:
          supportsReasoningEffort: true
        models:
          - id: llama3-70b
            name: Llama 3 70B
            input: [text]
            reasoningEfforts: false   # 非推論モデルの宣言
```

## 関連ページ

- [token-meter サブシステム](/subsystems/token-meter.md)

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-llm-pi-ai
- 元の型定義: `packages/llm/llm-pi-ai/src/config.ts`（`config-catalog.md` 生成時点）
