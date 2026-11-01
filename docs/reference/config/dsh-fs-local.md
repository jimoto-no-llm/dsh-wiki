# `@deepseek-ai/dsh-fs-local` の設定

`@deepseek-ai/dsh-fs-local` はローカルファイルシステムバックエンドの実装プラグインです。設定対象の doc コメントは **「ローカルファイルシステムバックエンドの設定（Configuration for the local filesystem backend.）」** です。相対パスの基準ディレクトリと、overwrite（上書き）差分の基礎データに対するバイト上限の2フィールドだけです。

- 上流の型定義位置: `packages/fs/fs-local/src/index.ts:51`
- このセクションは `inject` 宣言を持ちません。

## 原文の型定義（`config-catalog.md` 抜粋）

```ts
/** Configuration for the local filesystem backend. */
export interface Config {
  /** Base directory for relative paths. Defaults to `process.cwd()`. */
  cwd?: string
  /**
   * Exclusive UTF-8 byte limit on each overwrite-diff side, capped by the
   * runtime's safe allocation/decode maximum. Defaults to 10 MiB.
   */
  diffBasisMaxBytes?: number
}
```

## 全設定フィールド

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `cwd` | `string`（省略可） | 相対パスの基準ディレクトリ。デフォルトは `process.cwd()`。 |
| `diffBasisMaxBytes` | `number`（省略可） | overwrite-diff の各側（before / after）に対する排他的な UTF-8 バイト上限。ランタイムの安全な確保・デコード最大値がその上から上限としてかかる。デフォルトは 10 MiB。 |

## 注釈

原文の doc コメントの全文とその訳です。

- `cwd`:
  - 原文: `/** Base directory for relative paths. Defaults to `process.cwd()`. */`
  - 訳: 「相対パスの基準ディレクトリ。デフォルトは `process.cwd()`」。
  - 設定しない場合は、プロセスのカレントディレクトリ（CLI 起動ディレクトリ）が基準になります。
- `diffBasisMaxBytes`:
  - 原文は「overwrite-diff の各側 each side に対する排他的な（exclusive）UTF-8 バイト上限、ランタイムの安全な確保／デコード最大値がその上からかかる。デフォルト 10 MiB」。
  - 「各側（each side）」＝差分の before 側・after 側それぞれに独立して適用される上限です。
  - 排他的（exclusive）上限との記述は、原文どおりの語彙をそのまま残しています。

## サンドボックスとの関係

`@deepseek-ai/dsh-fs-sandbox` はこの `Config` をそのまま受け取る `LocalConfig` 型として再掲しています。原文の注釈は「サンドボックスのデフォルト（mode と `workspace-write` フォールバックルート）はここには無い。それらは `ctx.sandboxPolicy` が、強制（enforcing）能力を呼び出す各セッションで毎回解決する」というものです。したがって、`dsh-fs-sandbox` を使う場合もこのページの2フィールドがそのまま使われ、サンドボックスモードは sandbox-policy 側に属します。

## 設定例

```yaml
- id: fs-local
  name: '@deepseek-ai/dsh-fs-local'
  config:
    cwd: /home/me/workspace
    diffBasisMaxBytes: 10485760   # 10 MiB（既定値）を明示した例
```

## 関連ページ

- [sandbox サブシステム](/subsystems/sandbox.md)
- [CLI の共通挙動](/reference/cli/behaviors.md)

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-fs-local
- 元の型定義: `packages/fs/fs-local/src/index.ts`（`config-catalog.md` 生成時点）
