# `@deepseek-ai/dsh-plugin-manager` の設定

`@deepseek-ai/dsh-plugin-manager` は、pnpm ベースのプラグインマネージャとして、パッケージの診断・レジストリルックアップ・接続チェックを行うプラグインです。設定の doc コメントは「診断・ルックアップ・接続チェックのための pnpm 実行体、レジストリ、および制限（The pnpm executable, registries, and limits for diagnostics, lookups and connection checks.）」です。

- 注入先（inject）: `loader` · `profileContext`
- 型の参照先: `NpmFileSource`（上流カタログは [subsystems/boot.md](/reference/subsystems/boot.md) にある文書を参照）
- 上流の型定義位置: `packages/boot/plugin-manager/src/index.ts:54`

## 全設定フィールド

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `pnpmCommand` | `string`（省略可） | pnpm の実行コマンド名またはパス。`dsh plugin` コマンドと同じく `PATH` を通じて解決される。 |
| `outputBytes` | `number`（省略可） | パッケージ操作の診断ログとして保持する最大バイト数。 |
| `lockWaitMs` | `number`（省略可） | 別プロセスが持っている profile パッケージ操作のロックを待つ最長時間。 |
| `inspectTimeoutMs` | `number`（省略可） | inspection（検査）で 1回のレジストリルックアップに課す上限（ミリ秒）。 |
| `githubConnectionTimeoutMs` | `number`（省略可） | GitHub リポジトリへの接続チェックの最長時間（ミリ秒）。 |
| `gitTransportTimeoutMs` | `number`（省略可） | 自前ホストの Git リポジトリへの SSH / HTTPS プローブそれぞれの最長時間（ミリ秒）。 |
| `idleTimeoutMs` | `number`（省略可） | 1回のキャプチャしたパッケージ実行（captured package run）が何も出力しない最大時間。超えるとマネージャがその実行を終了させる（ミリ秒）。 |
| `registry` | `http(s) URL`（省略可） | 最初に叩くレジストリ。省略した場合は pnpm 自身の設定が指定するレジストリ。 |
| `fallbackRegistries` | `http(s) URL[]`（省略可） | 直前のレジストリに到達できない・パッケージのコピーが無い場合に順に変えるレジストリ。 |
| `versionListLimit` | `number`（省略可） | バージョン一覧が読む、インストール済みより新しい上位 N 件。 |
| `versionLookupConcurrency` | `number`（省略可） | バージョン一覧が 1回で同時に走らせる単一バージョンのレジストリルックアップ数。 |
| `detailMaxBytes` | `number`（省略可） | バンドルの詳細文書（bundle detail document）と、それに付随する 1つのロケールファイルの読み出しバイトの上限。 |
| `detailImageMaxBytes` | `number`（省略可） | バンドル詳細文書に付随して配信する 1つの画像のバイト上限。 |
| `detailFetchTimeoutMs` | `number`（省略可） | 提供されるバンドルの詳細文書を npm ファイル CDN から 1回取得してくる際の期限。 |
| `detailNpmFileSources` | `NpmFileSource[]`（省略可） | 提供されるバンドルを読み出す npm ファイル CDN の順序。読み出し側の `npmFileSources` が優先させた CDN を最も前に持ってくる。 |

## 注釈

- レジストリの優先順:
  - まず `registry`（未指定なら pnpm 自身の設定）。
  - 失敗・不在のときは `fallbackRegistries` を順に試す。ただし、この集合にも `registry` にも含まれないレジストリが要求された場合は、そのレジストリだけを単独で問い合わせます。
  - pnpm 自身の設定が名指すレジストリが npm 公式でも `fallbackRegistries` の一つでもない場合は、そちらも単独で問い合わせます。
- タイムアウト系フィールドは全てミリ秒単位です。
- このプラグインのフィールドは「pnpm の実行環境と外部アクセスの上限」にフォーカスします。包の依存解決そのものは `loader` 側の仕事です。

## 設定例

```yaml
- id: plugin-manager
  name: '@deepseek-ai/dsh-plugin-manager'
  config:
    pnpmCommand: pnpm
    registry: https://registry.npmjs.org/
    fallbackRegistries:
      - https://registry.npmmirror.com/
    idleTimeoutMs: 60000
    detailNpmFileSources:
      - jsdelivr
```

## 関連ページ

- [plugin CLI リファレンス](/reference/cli/plugin.md)
- [plugin 詳細リファレンス](/reference/cli/plugin-detail.md)

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-plugin-manager
- 元の型定義: `packages/boot/plugin-manager/src/index.ts`（`config-catalog.md` 生成時点）
