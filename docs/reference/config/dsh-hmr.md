# `@deepseek-ai/dsh-hmr` の設定

`@deepseek-ai/dsh-hmr` はプロファイル設定のホットリロード（HMR）を担う起動系プラグインです。設定の doc コメントは「モジュールのルートとウォッチャーのタイミング、Chokidar のデプロイオプション（Module roots and watcher timing, with Chokidar deployment options.）」です。

- 上流の型定義位置: `packages/boot/hmr/src/index.ts:56`
- 型の参照先: `ChokidarOptions`（`chokidar` パッケージ）
- このセクションは `inject` 宣言を持ちません。型は `ChokidarOptions` を継承した `HmrConfig` です。

## 全設定フィールド

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `base` | `string`（省略可） | 所有コンテキストの基底 URL を基準に解決されるディレクトリ。 |
| `root` | `string[]`（必須） | モジュールウォッチのルート一覧。空リストにすると、明示的な設定ウォッチのみが残る。 |
| `debounce` | `number`（必須） | モジュール変更をまとめる（ Debounce する）ミリ秒。 |
| `ignored` | `string[]`（必須） | モジュールウォッチから除外する glob パターン。 |
| （継承分） | `ChokidarOptions` の全フィールド | Chokidar 自身のデプロイオプション。 |

## 注釈

原文の doc コメントの全文とその訳です。

- 型全体（`HmrConfig extends ChokidarOptions`）:
  - 原文: `/** Module roots and watcher timing, with Chokidar deployment options. */`
  - 訳: 「モジュールの監視ルートとウォッチャーのタイミングに加え、Chokidar のデプロイオプションを含む」。
- `base`: 「所有するコンテキストの基底 URL を基準に解決されるディレクトリ」。つまり相対指定の解決起点です。
- `root`: 「モジュール監視のルート一覧。空リストでは明示的な configuration ウォッチ（設定ファイルの監視）のみに縮退する」。既定プロファイルでは `root: []` が指定され、「プロファイル設定のリロードはデフォルトで有効、モジュールルートはオプトイン」という動作になっています。
- `debounce`: 変更イベントをまとめる間隔（ミリ秒）。
- `ignored`: ウォッチから除外する glob。
- Chokidar の継承分フィールド（`persistent`、`depth`、`usePolling` など）は `chokidar` のオリジナルの意味を引き継ぎます。このページでは列挙しません。

## 設定例

既定プロファイルでは下記のように `root: []` で挿入されます（baseバンドルの実例からの引用）。

```yaml
- id: hmr
  name: '@deepseek-ai/dsh-hmr'
  disabled: !!js "!ctx.get('profileContext')"
  config:
    root: []
```

モジュール監視をオプトインする例:

```yaml
- id: hmr
  name: '@deepseek-ai/dsh-hmr'
  config:
    base: .
    root:
      - ~/.dsh/plugins
    debounce: 100
    ignored:
      - '**/node_modules/**'
```

## 関連ページ

- [CLI の共通挙動](/reference/cli/behaviors.md)（`cordis.patch.yml` のホットリロード経由の反映）

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-hmr
- 元の型定義: `packages/boot/hmr/src/index.ts`（`config-catalog.md` 生成時点）
