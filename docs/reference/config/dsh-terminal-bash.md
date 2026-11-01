# `@deepseek-ai/dsh-terminal-bash` の設定

`@deepseek-ai/dsh-terminal-bash` は対話シェル（ターミナル）を束ねるプラグインで、シェルの方言、初期の行数・桁数、スクロールバック、アイドル判定のしきい値などを設定します。設定対象は単一の `Config` インターフェイスで、原文の doc コメントは「公開プラグイン設定（Public plugin configuration.）」です。

- 注入先（inject）: `terminals` · `sandboxPolicy` · `subprocess` · `workingDirectory`
- 上流の型定義位置: `packages/terminal/terminal-bash/src/config.ts:10`

## 原文の型定義（`config-catalog.md` 抜粋）

```ts
/** Public plugin configuration. */
export interface Config {
  /** Backend registry type (default: `shell`). */
  backendType?: string
  /** Interactive shell dialect (default: `bash`); selects the argv/env/startup defaults. */
  shellDialect?: ShellDialect
  /** Interactive shell executable (default per dialect: `/bin/bash`, or the resolved pwsh). */
  shellPath?: string
  /** Shell arguments (default per dialect: bash `--noprofile --norc -i`, pwsh `-NoLogo -NoProfile`). */
  shellArgs?: string[]
  /** Terminal rows. */
  rows?: number
  /** Terminal columns. */
  cols?: number
  /** Maximum retained logical lines. */
  scrollbackLines?: number
  /** Maximum retained UTF-8 bytes. */
  scrollbackMaxBytes?: number
  /** Maximum bytes returned by one read or settled viewport. */
  maxReadBytes?: number
  /** Readiness polling interval. */
  pollIntervalMs?: number
  /** Delay before Linux exact syscall probes. */
  exactProbeAfterMs?: number
  /** Silence duration that yields `inferred_idle`. */
  idleSilenceMs?: number
  /**
   * Extra wait beyond `idleSilenceMs`, once a prompt marker was seen, for the shell to
   * regain the foreground before `inferred_idle` settles; at least one `pollIntervalMs`.
   */
  handoffGraceMs?: number
  /**
   * Extra wait beyond `idleSilenceMs` and `handoffGraceMs`, once a prompt marker was seen but
   * its printable tail has not arrived, before `inferred_idle` settles. The marker is written
   * by the shell's own prompt function and the tail by the same render, so a missing tail is a
   * delivery delay on a contended host rather than an absent prompt. Zero keeps the bound at
   * `idleSilenceMs + handoffGraceMs`; any other value covers at least one `pollIntervalMs`, so a
   * nonzero tolerance always contains a readiness poll.
   */
  promptTailGraceMs?: number
  /** Absolute bound for one send and the complete pwsh startup sequence. */
  timeoutMs?: number
  /** Grace before teardown escalates to `SIGKILL`. */
  disposeGraceMs?: number
}

/** One supported interactive shell dialect. */
export type ShellDialect = 'bash' | 'pwsh'
```

## 全設定フィールド

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `backendType` | `string`（省略可） | バックエンドの登録型。既定値は `shell`。 |
| `shellDialect` | `ShellDialect`（`'bash' \| 'pwsh'`、省略可） | 対話シェルの方言。既定値は `bash`。argv・環境・起動（startup）の既定を選び直す。 |
| `shellPath` | `string`（省略可） | 対話シェルの実行体。方言ごとの既定値: bash は `/bin/bash`、pwsh は解決済みの pwsh。 |
| `shellArgs` | `string[]`（省略可） | シェルへの引数。方言ごとの既定値: bash は `--noprofile --norc -i`、pwsh は `-NoLogo -NoProfile`。 |
| `rows` | `number`（省略可） | ターミナルの行数。 |
| `cols` | `number`（省略可） | ターミナルの桁数。 |
| `scrollbackLines` | `number`（省略可） | 保持される論理行の最大数。 |
| `scrollbackMaxBytes` | `number`（省略可） | 保持される UTF-8 バイトの最大数。 |
| `maxReadBytes` | `number`（省略可） | 1回の read または確定した viewport が返すバイトの最大値。 |
| `pollIntervalMs` | `number`（省略可） | 準備完了（readiness）ポーリングの間隔。 |
| `exactProbeAfterMs` | `number`（省略可） | Linux で正確な syscall プローブを始めるまでの遅延。 |
| `idleSilenceMs` | `number`（省略可） | `inferred_idle` に至らせる沈黙の長さ。 |
| `handoffGraceMs` | `number`（省略可） | プロンプトマーカーを観測した後、`inferred_idle` が確定する前にシェルがフォアグラウンドを取り戻すのを `idleSilenceMs` からの上積みで待つ時間。少なくとも 1 回分の `pollIntervalMs`。 |
| `promptTailGraceMs` | `number`（省略可） | プロンプトマーカーを観測したのにその印字末尾（printable tail）が届いていないとき、`inferred_idle` が確定する前に `idleSilenceMs` と `handoffGraceMs` からの上積みで待つ時間。 |
| `timeoutMs` | `number`（省略可） | 1回の送信と pwsh 起動シーケンス全部に対する絶対上限。 |
| `disposeGraceMs` | `number`（省略可） | テアダウン（teardown）が `SIGKILL` にエスカレートするまでの猶予。 |

補足: `ShellDialect` は「対応している対話シェルの方言を1つ表す型」で、原文は `export type ShellDialect = 'bash' | 'pwsh'` と定義します。

## 注釈

- 既定値が原文に明記されているのは `backendType` / `shellDialect` / `shellPath` / `shellArgs`（方言ごとの既定を含む）だけです。その他のフィールドに数値の既定は書かれていません。
- アイドル判定の3つの待ち時間の関係（doc コメントの読み取り）:
  - 基礎は沈黙の長さ `idleSilenceMs` です。
  - プロンプトマーカーが観測された場合は、フォアグラウンド復帰待ちの `handoffGraceMs` が上積みされます。
  - さらにマーカーの印字末尾が届いていない場合は `promptTailGraceMs` が上積みされます。
- 原文（`promptTailGraceMs` 末尾の文）の訳: 「マーカーはシェル自身のプロンプト関数が書き、末尾は同一のレンダリング（render）が書きます。それゆえ末尾が欠けているのは、プロンプトが無いことではなく、競合（contended）しているホストでの配信遅延です」。`0` は上限を `idleSilenceMs + handoffGraceMs` に保ち、その他の値は少なくとも 1 回分の `pollIntervalMs` を含む、すなわち非ゼロの tolerance は必ず readiness poll を含みます。
- `timeoutMs` は「1回の送信」と「pwsh の起動シーケンス全体」の両方に効く絶対上限と原文が言い切っています。
- 単位: 上積みや間隔の名を持つフィールド（`pollIntervalMs` / `exactProbeAfterMs` / `idleSilenceMs` / `handoffGraceMs` / `promptTailGraceMs` / `timeoutMs` / `disposeGraceMs`）は全て具体的な時間で、フィールド名の `Ms` からミリ秒単位です。

## 設定例

プロファイルの `cordis.patch.yml` に挿入する行（row）として設定します。

```yaml
- id: terminal-bash
  name: '@deepseek-ai/dsh-terminal-bash'
  config:
    shellDialect: bash        # bash | pwsh
    rows: 40
    cols: 120
    scrollbackLines: 5000
    idleSilenceMs: 3000
    handoffGraceMs: 1000
```

bash 以外（pwsh）に変える場合は `shellDialect` と、必要なら `shellPath` / `shellArgs` の方言ごとの既定が変わる点に注意します（上表のとおり）。

## 関連ページ

- [tools サブシステム](/subsystems/tools.md)
- [sandbox サブシステム](/subsystems/sandbox.md)

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-terminal-bash
- 元の型定義: `packages/terminal/terminal-bash/src/config.ts`（`config-catalog.md` 生成時点）
