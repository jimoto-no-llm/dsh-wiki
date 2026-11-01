# `@deepseek-ai/dsh-web-search-deepseek` の設定

`@deepseek-ai/dsh-web-search-deepseek` は、DeepSeek の API と `web_search` サーバツールを用いた Web 検索プロバイダのプラグインです。Anthropic 互換フォーマットでのリクエスト面を設定します。設定対象は単一の `Config` インターフェイスで、原文の doc コメントは「プラグイン設定（全て省略可 — `apply` が環境変数と定数の既定を埋める）（Plugin config (all optional — `apply` fills env-var and constant defaults).）」です。

- 注入先（inject）: `web`
- 型の参照先: `Volatile`（`@deepseek-ai/cordis`）
- 上流の型定義位置: `packages/web/web-search-deepseek/src/index.ts:51`

## 原文の型定義（`config-catalog.md` 抜粋）

```ts
/** Plugin config (all optional — `apply` fills env-var and constant defaults). */
export interface Config {
  /** Literal DeepSeek API key; prefer {@link apiKeyEnv} so no secret enters configuration files. */
  apiKey: Volatile<string | undefined>
  /** Credential reference resolved for each search; defaults to `DEEPSEEK_API_KEY`. */
  apiKeyEnv: Volatile＼string］
  /** Anthropic-compatible endpoint base; `/messages` is appended. */
  baseURL: Volatile<string | undefined>
  /** Anthropic-format model name. Defaults to `deepseek-v4-flash`. */
  model: Volatile＼string］
  /** `anthropic-version` header value. Defaults to `2023-06-01`. */
  apiVersion: Volatile＼string］
  /** Upper bound on generated tokens for the Messages request. Defaults to 4096. */
  maxTokens: Volatile＼number］
  /** Maximum `web_search` server-tool uses per request. Defaults to 5. */
  maxUses: Volatile＼number］
}
```

## 全設定フィールド

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `apiKey` | `Volatile<string \| undefined>` | 直接書いたリテラルの DeepSeek API キー。秘密情報が設定ファイルに入るのを避けるため `apiKeyEnv` の方を好む、と原文が述べます。 |
| `apiKeyEnv` | `Volatile＼string］`（省略時は `DEEPSEEK_API_KEY`） | 検索ごとに解決される資格情報（credential）参照。 |
| `baseURL` | `Volatile<string \| undefined>` | Anthropic 互換のエンドポイントのベース。末尾に `/messages` が付け足される。 |
| `model` | `Volatile＼string］`（省略時は `deepseek-v4-flash`） | Anthropic 形式のモデル名。 |
| `apiVersion` | `Volatile＼string］`（省略時は `2023-06-01`） | `anthropic-version` ヘッダの値。 |
| `maxTokens` | `Volatile＼number］`（省略時は 4096） | Messages リクエストの生成トークンの上限。 |
| `maxUses` | `Volatile＼number］`（省略時は 5） | 1リクエストあたりの `web_search` サーバツール使用の最大数。 |

## 注釈

- 原文（`apiKey`）: "Literal DeepSeek API key; prefer {@link apiKeyEnv} so no secret enters configuration files."
  - 訳: 「リテラルの DeepSeek API キー。秘密情報が設定ファイルに入らないように、{@link apiKeyEnv} を好みなさい」。
  - したがって設定ファイルに書く場合の推奨は、キーそのものではなく環境変数名を指す `apiKeyEnv` です。
- 原文（`apiKeyEnv`）: "Credential reference resolved for each search; defaults to `DEEPSEEK_API_KEY`." → 訳: 「検索ごとに解決される資格情報参照。既定値は `DEEPSEEK_API_KEY`」。
- 原文（`baseURL`）: "Anthropic-compatible endpoint base; `/messages` is appended." → 訳: 「Anthropic 互換のエンドポイントのベース。`/messages` が付け足される」。
- 既定値を名指すフィールドは5つ（`apiKeyEnv` / `model` / `apiVersion` / `maxTokens` / `maxUses`）で、冒頭 doc コメントは「`apply` が環境変数と定数の既定を埋める」と述べます。`apiKey` と `baseURL` に既定値の記述はありません。
- TS の型上は `apiKey` に `undefined` を含み、`baseURL` も同様に `string | undefined` です。

## 設定例

プロファイルの `cordis.patch.yml` に挿入する行（row）として設定します。

```yaml
- id: web-search-deepseek
  name: '@deepseek-ai/dsh-web-search-deepseek'
  config:
    # API キーは環境変数参照で済ませる（apiKeyEnv を好む、という原文の推奨形）
    apiKeyEnv: DEEPSEEK_API_KEY
    maxUses: 3      # 既定値 5 から絞る例
```

`model` / `apiVersion` / `maxTokens` 以降は省略すれば既定値（`deepseek-v4-flash` / `2023-06-01` / 4096）に任されます。

## 関連ページ

- [DeepSeek LLM API のワイヤ拡張](/deep/deepseek-llm-api-wire-extensions.md)
- [tools サブシステム](/subsystems/tools.md)

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-web-search-deepseek
- 元の型定義: `packages/web/web-search-deepseek/src/index.ts`（`config-catalog.md` 生成時点）
