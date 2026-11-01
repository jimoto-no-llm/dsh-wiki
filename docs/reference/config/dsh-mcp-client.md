# `@deepseek-ai/dsh-mcp-client` の設定

`@deepseek-ai/dsh-mcp-client` は MCP（Model Context Protocol）サーバへの接続プラグインです。設定は stdio 接続と Streamable HTTP (SSE) 接続の2つ型のユニオンで、doc コメントは「1つの stdio または Streamable HTTP MCP サーバの設定（Configuration for one stdio or Streamable HTTP MCP server.）」です。

- 注入先（inject）: `tools`
- 上流の型定義位置: `packages/mcp/mcp-client/src/index.ts:104`
- 設定型: `Config = StdioConfig | StreamableHttpConfig`

## 全設定フィールド

### 共通フィールド（両方の型が持つ）

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `serverName` | `string`（必須） | このサーバのツール名に付ける安定なローカルネームスペース（`mcp__＼serverName］__＼rawName］`）。`[A-Za-z0-9_-]{1,32}` に一致させ、生きている mcp-client インスタンス間で一意。 |
| `toolCallTimeoutMs` | `number`（必須） | ツール呼び出し・リソースリクエストそれぞれのタイムアウト（ミリ秒）。 |
| `failOnStartupError` | `boolean`（必須） | 初回接続またはツリー同期が失敗したときにプラグインの起動を失敗させる。 |
| `maxInstructionBytes` | `number`（省略可） | サーバが付けてくる instructions（説明文）の UTF-8 バイト上限。デフォルトは 32768。 |
| `reconnect` | `ReconnectConfig`（省略可） | 接続が切れたあとの自動再接続ポリシー。省略すればデフォルト構成。 |

### StdioConfig 独自

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `transport` | `'stdio'`（必須） | 子プロセス stdio トランスポートを選択する定数。 |
| `command` | `string`（必須） | サーバを起動する実行ファイル。 |
| `args` | `string[]`（必須） | そのまま渡される引数。シェル展開（shell interpolation）はしない。 |
| `env` | `object`（必須） | 追加の環境変数。スクラブ済（scrubbed）の継承環境にマージされる。 |
| `cwd` | `string`（必須） | 子プロセスのワーキングディレクトリ。 |

### StreamableHttpConfig 独自

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `transport` | `'streamable-http'`（必須） | Streamable HTTP トランスポートを選択する定数。 |
| `url` | `string`（必須） | MCP エンドポイントの URL。 |
| `headers` | `object`（必須） | MCP リクエストに付ける追加ヘッダ。 |

### ReconnectConfig（再接続ポリシー）

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `enabled` | `boolean`（省略可） | 接続が切れたあとに自動再接続するか（デフォルト `true`）。 |
| `initialDelayMs` | `number`（省略可） | 最初の再接続待ち（ミリ秒）。連続した失敗のたびに倍になる（デフォルト 500）。 |
| `maxDelayMs` | `number`（省略可） | バックオフの上限（ミリ秒）。この値と、設定した再試行予算がリセットされる稼働時間（uptime）とを同一の数値が兼ねる（デフォルト 30000）。 |
| `maxAttempts` | `number`（省略可） | 1回の断線（outage）あたりの連続失敗回数。これを超えたら諦める（デフォルト 10）。 |

## 注釈

- `serverName` に対する厳密な一致条件は `[A-Za-z0-9_-]{1,32}` で、「生きている mcp-client インスタンス全体で一意」が要求されます。
- `failOnStartupError` が `true` のときは「初回接続またはツール同期の失敗でプラグインのアクティベーション自体を失敗させる」。逆に `false` は起動は通す設定です。
- `maxInstructionBytes` のデフォルト値 32768 は原文どおりの既定です。

## 設定例

stdio 接続の例:

```yaml
- id: mcp-sample-stdio
  name: '@deepseek-ai/dsh-mcp-client'
  config:
    transport: stdio
    serverName: filesystem
    command: npx
    args:
      - -y
      - '@modelcontextprotocol/server-filesystem'
      - /workspace
    env:
      NO_COLOR: '1'
    cwd: /home/me
    toolCallTimeoutMs: 60000
    failOnStartupError: true
    reconnect:
      initialDelayMs: 500
      maxDelayMs: 30000
      maxAttempts: 10
```

Streamable HTTP 接続の例:

```yaml
- id: mcp-sample-http
  name: '@deepseek-ai/dsh-mcp-client'
  config:
    transport: streamable-http
    serverName: github
    url: https://api.githubcopilot.com/mcp/
    headers: {}
    toolCallTimeoutMs: 120000
    failOnStartupError: true
```

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-mcp-client
- 元の型定義: `packages/mcp/mcp-client/src/index.ts`（`config-catalog.md` 生成時点）
