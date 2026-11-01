---
title: "`@deepseek-ai/dsh-subagent` の設定"
desc: "@deepseek-ai/dsh-subagent は、続行可能（continuable）なサブエージェントの容量を定めるホスト側の設定プラグインです。設定対象は単一の Confi"
cat: "config"
catLabel: "設定の詳細"
chars: 2191
slug: "reference/config/dsh-subagent"
---

# `@deepseek-ai/dsh-subagent` の設定

`@deepseek-ai/dsh-subagent` は、続行可能（continuable）なサブエージェントの容量を定めるホスト側の設定プラグインです。設定対象は単一の `Config` インターフェイスで、原文の doc コメントは「続行可能なサブエージェント容量のためのホスト設定（Host configuration for continuable subagent capacity.）」です。

- 注入先（inject）: `workingDirectory` · `sessionProjections`
- 型の参照先: `Volatile`（`@deepseek-ai/cordis`）
- 上流の型定義位置: `packages/subagent/subagent/src/index.ts:186`

## 原文の型定義（`config-catalog.md` 抜粋）

```ts
/** Host configuration for continuable subagent capacity. */
export interface Config {
  /** Maximum live children sharing uninterrupted continuable parent links; defaults to 8. */
  maxActiveSubagents: Volatile＼number］
  /** Default delegation depth for tools without an explicit limit; defaults to 1. */
  maxDepth: Volatile＼number］
}
```

## 全設定フィールド

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `maxActiveSubagents` | `Volatile＼number］`（省略時は 8） | 途切れない続行可能な親リンクを共有する、稼働中の子エージェントの最大数。 |
| `maxDepth` | `Volatile＼number］`（省略時は 1） | 明示的な上限を持たないツールに対する、委任（delegation）深度の既定値。 |

厳密には原文では2フィールドとも `Volatile＼number］` とだけ宣言されていますが、doc コメントのとおり実行時には省略でき、省略時の値は上表のとおりです。

## 注釈

- 原文（`maxActiveSubagents`）: "Maximum live children sharing uninterrupted continuable parent links; defaults to 8."
  - 訳: 「途切れることの無い続行可能な親リンクを共有する、稼働中の子の最大数。既定は 8」。
- 原文（`maxDepth`）: "Default delegation depth for tools without an explicit limit; defaults to 1."
  - 訳: 「明示的な上限を持たないツールのための既定の委任深度。既定は 1」。
- 読み取りどおりの挙動:
  - `maxActiveSubagents` は「同時に動かしてよい子の数」の上限を1つの値で絞ります。「途切れない親リンクの共有」を条件に述べる語りである点は原文どおりです。
  - `maxDepth` は、ツールが自ら上限を宣言していないときに適用される既定深度です。明示的な上限を持つツールにはその宣言が使われます（doc コメントの範囲の読み取り）。
- 既定値（8 と 1）は doc コメントが名指ししています。2つとも省略可で、省略しても既定に沿った動きになります。

## 設定例

プロファイルの `cordis.patch.yml` に挿入する行（row）として設定します。

```yaml
- id: subagent
  name: '@deepseek-ai/dsh-subagent'
  config:
    maxActiveSubagents: 8    # 既定値どおり
    maxDepth: 1              # 既定値どおり（深さ1の一段委任）
```

子エージェントの更なる入れ子を許したいときは `maxDepth` を上げます。

## 関連ページ

- [subagent サブシステム](/subsystems/subagent.md)

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-subagent
- 元の型定義: `packages/subagent/subagent/src/index.ts`（`config-catalog.md` 生成時点）
