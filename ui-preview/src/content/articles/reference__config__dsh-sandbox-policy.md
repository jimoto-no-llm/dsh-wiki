---
title: "`@deepseek-ai/dsh-sandbox-policy` の設定"
desc: "@deepseek-ai/dsh-sandbox-policy は、デプロイメントのファイル砂箱（sandbox）の既定ポリシーを供給するプラグインです。設定対象は3フィールドの "
cat: "config"
catLabel: "設定の詳細"
chars: 3590
slug: "reference/config/dsh-sandbox-policy"
---

# `@deepseek-ai/dsh-sandbox-policy` の設定

`@deepseek-ai/dsh-sandbox-policy` は、デプロイメントのファイル砂箱（sandbox）の既定ポリシーを供給するプラグインです。設定対象は3フィールドの `Config` インターフェイスで、原文の冒頭の doc コメント（全訳）は「プラグイン設定: デプロイメントの砂箱の既定。全て省略可能 — `Config` が既定値を供給します（`mode: 'read-only'` がフェイルセーフの既定。ワークスペース書き込み可のエージェントを望むデプロイは明示的にオプトインします）。ランナーの選択はここには無く（それは `ctx.sandbox` プロバイダの設定です）、ファミリごとのノブも無い。ここが唯一の共有ポリシーの置き場所です」です。

- 注入先（inject）: `sessionProjections`
- 型の参照先: `SandboxMode`（→ 原文カタログ内の `subsystems/sandbox.md`）
- 上流の型定義位置: `packages/sandbox/sandbox-policy/src/index.ts:94`

## 原文の型定義（`config-catalog.md` 抜粋）

```ts
/**
 * Plugin config: the deployment's sandbox default. All optional — `Config`
 * supplies the defaults (`mode: 'read-only'` is the fail-safe default; a
 * deployment that wants a workspace-writable agent opts in explicitly). The
 * runner choice is NOT here (it is the `ctx.sandbox` provider's config), nor
 * is any per-family knob: this is the one shared policy home.
 */
export interface Config {
  /** File-sandbox mode a session starts from (default: `read-only`). */
  mode?: SandboxMode
  /**
   * Absolute fallback root for agentless calls and sessions without a cwd (default:
   * `process.cwd()`). Normal agent calls use their session cwd instead.
   */
  workspaceRoot?: string
  /**
   * Extra physical absolute directories that `workspace-write` may also write under
   * (default: none). The supervisor names them explicitly; there is no
   * automatic repository or gitfile discovery. Entries are execution-world
   * paths: this service validates absoluteness and detaches the list, while
   * the enforcing host rejects missing, non-directory, or symlinked paths. They grant nothing under
   * `read-only`.
   */
  additionalWritableRoots?: string[]
}
```

## 全設定フィールド

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `mode` | `SandboxMode`（省略可） | セッションが起点とするファイル砂箱のモード。既定値は `read-only`。 |
| `workspaceRoot` | `string`（省略可） | エージェントを持たない呼び出し（agentless calls）と cwd を持たないセッションのための絶対フォールバックルート。既定値は `process.cwd()`。通常のエージェント呼び出しは、代わりにセッション cwd を使う。 |
| `additionalWritableRoots` | `string[]`（省略可） | `workspace-write` が追加で書き込んでよい物理的な絶対ディレクトリ。既定値は無し。 |

## 注釈

- 原文（`additionalWritableRoots`）の全訳: 「追加で、`workspace-write` の下で書き込んでもよい物理的な絶対ディレクトリ（既定は無し）。supervisor が明示的に名指します。リポジトリや gitfile の自動発見はありません。エントリは実行世界（execution-world）のパスであり、このサービスは絶対性を検証しリストを切り離して（detach）保持します。強制する側のホストは、存在しない・ディレクトリでない・シンボリックリンクのパスを拒否します。`read-only` の下では何も許可しません」。
- 検証の2段構造の読み取り: `additionalWritableRoots` については、ポリシーを供給する側（このプラグイン）で絶対性の検証とリストの切り離しが行われ、実際に強制を効かせるホスト側で「存在・ディレクトリ性・シンボリックリンクでない」ことの拒否が行われる、と原文は役割を分けて述べています。
- `SandboxMode` の値と位置づけは [sandbox サブシステム](/subsystems/sandbox.md)（「モードと提示の完結度」の表）が解説しています。この設定面ではモードをここで差し替える既定を置くだけです。
- 原文が明言する「ここには無い」もの: ランナーの選択（`ctx.sandbox` プロバイダ側）、ファミリごとのノブ。このプラグインは共有ポリシーの既定の受け皿です。
- オプトインの位置づけ: 既定の `mode` は `read-only`（フェイルセーフ）です。`workspace-write` 等への緩めは、原文の言い方で「明示的にオプトインする」ものです。

## 設定例

プロファイルの `cordis.patch.yml` に挿入する行（row）として設定します。

```yaml
- id: sandbox-policy
  name: '@deepseek-ai/dsh-sandbox-policy'
  config:
    mode: read-only            # 既定値（フェイルセーフのまま）
    # mode: workspace-write    # 明示的にオプトインする場合（原文の趣旨どおり）
    additionalWritableRoots:
      - /srv/shared            # 実行世界の物理パスを明示
```

`workspaceRoot` を明示しないときは上表の既定（`process.cwd()`）が使われます。通常のエージェント呼び出しはセッション cwd を使うため、あえて設定を書く場面は限られます。

## 関連ページ

- [sandbox サブシステム](/subsystems/sandbox.md)

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-sandbox-policy
- 元の型定義: `packages/sandbox/sandbox-policy/src/index.ts`（`config-catalog.md` 生成時点）
