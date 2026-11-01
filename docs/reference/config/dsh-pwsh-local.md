# `@deepseek-ai/dsh-pwsh-local` の設定

`@deepseek-ai/dsh-pwsh-local` はローカルの PowerShell（pwsh）実行体（executor）で、シェルコマンド実行のための capability `subprocess` を供給します。設定対象は単一の `Config` インターフェイスで、原文の doc コメントは「稼働中のコマンド予算を持つ、検証済みのプラグイン設定（Validated plugin configuration with live command budgets.）」です。

- 注入先（inject）: `subprocess`
- 型の参照先: `Volatile`（`@deepseek-ai/cordis`）
- 上流の型定義位置: `packages/shell/pwsh-local/src/index.ts:58`

## 原文の型定義（`config-catalog.md` 抜粋）

```ts
/** Validated plugin configuration with live command budgets. */
export interface Config {
  /** Default working directory for commands (default: process.cwd()). */
  cwd: Volatile<string | undefined>
  /** Default foreground timeout in milliseconds. */
  timeoutMs: Volatile＼number］
  /** Upper bound for per-call timeout overrides. */
  maxTimeoutMs: Volatile＼number］
  /** Per-stream in-memory output cap; overflow spills to a temp file. */
  maxOutputBytes: Volatile＼number］
  /** Per-stream spill-file cap; larger streams retain only their in-memory tail. */
  maxSpillBytes: Volatile＼number］
  /** Grace period for kill escalation and inherited pipes; at most `MAX_TIMER_DELAY_MS`. */
  graceMs: Volatile＼number］
  /**
   * Explicit pwsh executable. When omitted, well-known Windows install
   * locations and PATH entries are probed in order (PowerShell 7 install,
   * PATH entries such as the Microsoft Store install, then Windows
   * PowerShell 5.1), falling back to a bare `pwsh` resolved through PATH.
   */
  pwshPath: Volatile<string | undefined>
}
```

## 全設定フィールド

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `cwd` | `Volatile<string \| undefined>` | コマンドの既定作業ディレクトリ。既定値は `process.cwd()`。 |
| `timeoutMs` | `Volatile＼number］` | フォアグラウンド実行の既定タイムアウト（ミリ秒）。 |
| `maxTimeoutMs` | `Volatile＼number］` | 呼び出しごとのタイムアウト上書きに課す上限。 |
| `maxOutputBytes` | `Volatile＼number］` | 1ストリームあたりのインメモリ出力の上限。超過分は一時ファイルへスピル（spill）する。 |
| `maxSpillBytes` | `Volatile＼number］` | 1ストリームあたりのスピルファイルの上限。それ以上のストリームはインメモリの末尾（tail）だけを保持する。 |
| `graceMs` | `Volatile＼number］` | kill の段階的エスカレーションと継承パイプのための猶予。上限は定数 `MAX_TIMER_DELAY_MS`。 |
| `pwshPath` | `Volatile<string \| undefined>` | 明示的な pwsh 実行体。省略したときの探索順序は下記の注釈のとおり。 |

## 注釈

- 原文（`pwshPath`）の全訳: 「明示的な pwsh 実行体。省略した場合、よく知られた Windows のインストール先と `PATH` のエントリが順番に調べられる（PowerShell 7 のインストール先、Microsoft Store によるインストールのような `PATH` エントリ、その後に Windows PowerShell 5.1）」。いずれも見つからなければ、`PATH` で解決される裸の `pwsh` にフォールバックします。
- 上記6フィールド（`cwd`〜`graceMs`）: 原文は `dsh-bash-local` と同一の文面（"Validated plugin configuration with live command budgets." と各 doc コメント）を使っています。出力のスピルの2段階、単位（ミリ秒・バイト）、`Volatile` 参照型である点も同様です。
- `pwshPath` 以外のフィールドで既定値が述べられているのは `cwd`（`process.cwd()`）だけです。
- 砂箱（sandbox）モードの既定はこの設定には入りません。原文カタログの `dsh-pwsh-sandbox` セクションは、それが `@deepseek-ai/dsh-sandbox-policy` とランナー選択側にあると述べています。

## 設定例

プロファイルの `cordis.patch.yml` に挿入する行（row）として設定します。

```yaml
- id: pwsh-local
  name: '@deepseek-ai/dsh-pwsh-local'
  config:
    cwd: ~/project
    pwshPath: /usr/bin/pwsh    # 探索まかせにしない場合
    timeoutMs: 120000
```

`pwshPath` を省略した場合は上記の探索順序で pwsh 実行体が解決されます。数値は例です。

## 関連ページ

- [tools サブシステム](/subsystems/tools.md)
- [sandbox サブシステム](/subsystems/sandbox.md)

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-pwsh-local
- 元の型定義: `packages/shell/pwsh-local/src/index.ts`（`config-catalog.md` 生成時点）
