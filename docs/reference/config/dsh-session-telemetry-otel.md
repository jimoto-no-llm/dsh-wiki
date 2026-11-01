# `@deepseek-ai/dsh-session-telemetry-otel` の設定

`@deepseek-ai/dsh-session-telemetry-otel` は、OpenTelemetry（OTEL）経由でセッションログを共有するプラグインです。設定対象は「共有ポリシー、SDK トランスポートの設定、バイト数・件数のキュー設定、および全体のシャットダウン上限」で、原文の冒頭 doc コメントは「アップロード側のモードはロード時にエンドポイントとシャットダウンの期限を検証し、`DISABLED` はどちらも読みません（Uploading modes validate their endpoint and shutdown deadline at plugin load; `DISABLED` reads neither.）」を含みます。

- 注入先（inject）: `sessions` · `otel`
- 型の参照先: `LogExporterOptions` · `SessionLogProcessorOptions`（上流の `packages/telemetry/otel/src/index.ts`）
- 上流の型定義位置: `packages/session/session-telemetry-otel/src/index.ts:85`

## 原文の型定義（`config-catalog.md` 抜粋）

```ts
/**
 * Plugin configuration: sharing policy, SDK transport options, byte/count queue
 * settings, and an overall shutdown bound. Uploading modes validate their endpoint
 * and shutdown deadline at plugin load; `DISABLED` reads neither.
 */
export interface Config {
  /** Defaults to `FEEDBACK_ONLY`: capture session history only when feedback is explicitly submitted. */
  mode?: SessionTelemetryMode
  /**
   * Explicit SDK HTTP transport settings, including optional routing headers.
   * Ambient credentials are not inherited. URL is required while uploading.
   * Exporter self-observability metering is not supported.
   */
  exporter?: Omit<LogExporterOptions, 'url'> & {
    /** Full logs endpoint (e.g. `https://collector.example.com/v1/logs`). Required outside `DISABLED`; validated at load. */
    url?: string
  }
  /**
   * Count, queue, cadence, and per-request watchdog settings for the byte-bounded
   * processor. A watchdog warning never releases an unsettled transport slot.
   * SDK processor self-observability metering is not supported.
   */
  processor?: SessionLogProcessorOptions
  /** Maximum time spent awaiting the SDK provider's complete shutdown path. */
  shutdownTimeoutMillis?: number
  /** Uncompressed OTLP request byte limit, at most 4,000,000. */
  maxRequestBytes?: number
}

/** Session-sharing policy selected by {@link Config.mode}. */
export enum SessionTelemetryMode {
  FEEDBACK_ONLY = 'FEEDBACK_ONLY',
  DISABLED = 'DISABLED',
}
```

## 全設定フィールド

### Config（トップレベル）

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `mode` | `SessionTelemetryMode`（省略可、既定 `FEEDBACK_ONLY`） | セッション履歴の記録（共有）ポリシー。選べる値は `SessionTelemetryMode`。 |
| `exporter` | `Omit<LogExporterOptions, 'url'> & { url?: string }`（省略可） | 明示的な SDK の HTTP トランスポート設定。任意のルーティングヘッダを含む。環境由来の資格情報（ambient credentials）は引き継がない。アップロード時には URL が必要。エクスポータ自身の自己観測メータリングは非対応。 |
| `exporter.url` | `string`（省略可） | ログの完全なエンドポイント（例: `https://collector.example.com/v1/logs`）。`DISABLED` 以外では必須。ロード時に検証される。 |
| `processor` | `SessionLogProcessorOptions`（省略可） | バイト上限付きプロセッサの「件数・キュー・周期・リクエストごとのウォッチドッグ」設定。ウォッチドッグの警告は未解決（unsettled）のトランスポートスロットを決して解放しない。SDK プロセッサ自身の自己観測メータリングは非対応。 |
| `shutdownTimeoutMillis` | `number`（省略可） | SDK プロバイダの完了（complete）したシャットダウン経路を待つ最大時間。 |
| `maxRequestBytes` | `number`（省略可） | 圧縮前の OTLP リクエストのバイト上限。最大 4,000,000。 |

### SessionTelemetryMode

| 値 | 意味 |
| --- | --- |
| `FEEDBACK_ONLY` | フィードバックが明示的に提出されたときにだけセッション履歴を記録する。 |
| `DISABLED` | 共有しない。エンドポイントの URL もシャットダウンの期限も読まれない。 |

## 注釈

- 原文（`mode`）: "Defaults to `FEEDBACK_ONLY`: capture session history only when feedback is explicitly submitted."
  - 訳: 「既定値は `FEEDBACK_ONLY`。フィードバックが明示的に提出されたときにだけセッション履歴を記録する」。
- 原文（`exporter.url`）: "Full logs endpoint (e.g. `https://collector.example.com/v1/logs`). Required outside `DISABLED`; validated at load."
  - 訳: 「ログの完全なエンドポイント（例: `https://collector.example.com/v1/logs`）。`DISABLED` 以外では必須。ロード時に検証される」。
- 原文（`shutdownTimeoutMillis`）: "Maximum time spent awaiting the SDK provider's complete shutdown path."
  - 訳: 「SDK プロバイダの完了したシャットダウン経路を待って費やす最大時間」。
- 原文（`maxRequestBytes`）: "Uncompressed OTLP request byte limit, at most 4,000,000."
  - 訳: 「圧縮前の OTLP リクエストのバイト上限。最大 4,000,000」。上限の数値 4,000,000 は原文が言い切っています。
- `mode` を `DISABLED` にした場合、`exporter`（URL の添付）と `shutdownTimeoutMillis` はどちらも省略できます。冒頭 doc コメントの「`DISABLED` はどちらも読まない」によります。
- 警告の取り扱いの読み取り: ウォッチドッグの警告が出ても、未解決（unsettled）のトランスポートスロットは解放されません。`processor` の doc コメントの言い分どおりです。
- 自己観測（self-observability）メータリングは、exporter 側と SDK processor 側のどちらも非対応と原文が述べています。

## 設定例

プロファイルの `cordis.patch.yml` に挿入する行（row）として設定します。

```yaml
- id: session-telemetry-otel
  name: '@deepseek-ai/dsh-session-telemetry-otel'
  config:
    mode: FEEDBACK_ONLY            # 既定値そのまま
    exporter:
      url: https://collector.example.com/v1/logs   # DISABLED 以外では必須
    maxRequestBytes: 4000000       # 原文が上限とする 4,000,000
```

`mode` を `DISABLED` にすると上記の `exporter` は読まれず、転送先の設定を書かずにこのプラグインを済ませることになります（同じく冒頭 doc コメントの読み取り）。

## 関連ページ

- [feedback サブシステム](/subsystems/feedback.md)
- [conversation サブシステム](/subsystems/conversation.md)

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-session-telemetry-otel
- 元の型定義: `packages/session/session-telemetry-otel/src/index.ts`（`config-catalog.md` 生成時点）
