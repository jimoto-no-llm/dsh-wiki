---
title: "`@deepseek-ai/dsh-bash-local` の設定"
desc: "@deepseek-ai/dsh-bash-local はローカルの bash 実行体（executor）で、シェルコマンド実行のための capability subprocess"
cat: "config"
catLabel: "設定の詳細"
chars: 3068
slug: "reference/config/dsh-bash-local"
---

# `@deepseek-ai/dsh-bash-local` の設定

`@deepseek-ai/dsh-bash-local` はローカルの bash 実行体（executor）で、シェルコマンド実行のための capability `subprocess` を供給します。設定対象は単一の `Config` インターフェイスで、原文の doc コメントは「稼働中のコマンド予算を持つ、検証済みのプラグイン設定（Validated plugin configuration with live command budgets.）」です。

- 注入先（inject）: `subprocess`
- 型の参照先: `Volatile`（`@deepseek-ai/cordis`）
- 上流の型定義位置: `packages/shell/bash-local/src/index.ts:41`

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

## 注釈

- 原文（`cwd`）: "Default working directory for commands (default: process.cwd())."
  - 訳: 「コマンドの既定作業ディレクトリ（既定値: `process.cwd()`）」。
- 出力の2段階の読み取り: ストリームはまずメモリに置かれ、`maxOutputBytes` を超えると一時ファイルへスピルします。スピル先のファイル自体にも `maxSpillBytes` の上限が付き、これを超える大きさのストリームは、メモリに残る「末尾（tail）」だけを保持します。
- 単位: `timeoutMs` / `maxTimeoutMs` / `graceMs` はミリ秒、`maxOutputBytes` / `maxSpillBytes` はバイトです。
- 6つのフィールドはいずれも `Volatile`（`@deepseek-ai/cordis` 参照型）で宣言され、TS の型上は省略可能マーカが付いていません。既定値が doc コメントで述べられているのは `cwd`（`process.cwd()`）だけです。
- 砂箱（sandbox）モードの既定やフォールバックルートはこの設定には入りません。原文カタログの `dsh-bash-sandbox` セクションは、それが `ctx.sandboxPolicy`（`@deepseek-ai/dsh-sandbox-policy`）とランナー選択（`ctx.sandbox` プロバイダの設定）側にあると明記しています。

## 設定例

プロファイルの `cordis.patch.yml` に挿入する行（row）として設定します。

```yaml
- id: bash-local
  name: '@deepseek-ai/dsh-bash-local'
  config:
    cwd: ~/project
    timeoutMs: 120000
    maxTimeoutMs: 600000
    maxOutputBytes: 32768
    maxSpillBytes: 1048576
    graceMs: 1000
```

数値は例です。原文のこのセクションで既定値が述べられているのは `cwd`（`process.cwd()`）だけで、他のフィールドは省略すればプラグイン側の既定に任せられます。

## 関連ページ

- [tools サブシステム](/subsystems/tools.md)
- [sandbox サブシステム](/subsystems/sandbox.md)

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-bash-local
- 元の型定義: `packages/shell/bash-local/src/index.ts`（`config-catalog.md` 生成時点）
