---
title: "`@deepseek-ai/dsh-compaction-tool-result-pruner` の設定"
desc: "@deepseek-ai/dsh-compaction-tool-result-pruner は、決定論的（deterministic）なツール結果の刈り込み（pruning）を担"
cat: "config"
catLabel: "設定の詳細"
chars: 2681
slug: "reference/config/dsh-compaction-tool-result-pruner"
---

# `@deepseek-ai/dsh-compaction-tool-result-pruner` の設定

`@deepseek-ai/dsh-compaction-tool-result-pruner` は、決定論的（deterministic）なツール結果の刈り込み（pruning）を担う compaction 側のプラグインです。設定対象の型は `ToolResultPruneConfig` 1つで、原文の doc コメントは「決定論的なツール結果刈り込みのための文字予算ポリシー（Character-budget policy for deterministic tool-result pruning.）」です。

- 注入先（inject）: `tokenMeter`
- 上流の型定義位置: `packages/compaction/compaction-tool-result-pruner/src/types.ts:5`

## 原文の型定義（`config-catalog.md` 抜粋）

```ts
/** Character-budget policy for deterministic tool-result pruning. */
export interface ToolResultPruneConfig {
  /** Prune when total text exceeds this many Unicode code points. Defaults to `8192`. */
  thresholdChars?: number
  /** Maximum leading Unicode code points retained. Defaults to `4096`. */
  headChars?: number
  /** Maximum trailing Unicode code points retained. Defaults to `1024`. */
  tailChars?: number
}
```

## 全設定フィールド

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `thresholdChars` | `number`（省略可、既定 8192） | 合計テキストがこの Unicode コードポイント数を超えたときに刈り込みます。 |
| `headChars` | `number`（省略可、既定 4096） | 保持される先頭側の Unicode コードポイントの上限。 |
| `tailChars` | `number`（省略可、既定 1024） | 保持される末尾側の Unicode コードポイントの上限。 |

3フィールドだけの設定で、既定値は全て型定義の doc コメントが名指ししています（`8192` / `4096` / `1024`）。

## 注釈

- 原文（`thresholdChars`）: "Prune when total text exceeds this many Unicode code points. Defaults to `8192`."
  - 訳: 「合計テキストがこの Unicode コードポイント数を超えたときに刈り込む。既定値は `8192`」。
- 原文（`headChars`）: "Maximum leading Unicode code points retained. Defaults to `4096`."
  - 訳: 「保持される先頭側の Unicode コードポイントの上限。既定値は `4096`」。
- 原文（`tailChars`）: "Maximum trailing Unicode code points retained. Defaults to `1024`."
  - 訳: 「保持される末尾側の Unicode コードポイントの上限。既定値は `1024`」。
- 単位は「文字」ではなく **Unicode コードポイント** と原文が明記しています。見た目の文字数（grapheme）とは一致しない組み合わせがありえます。
- 刈り込みの挙動: 原文は「発火条件（`thresholdChars`）」「保持される先頭（`headChars`）」「保持される末尾（`tailChars`）」の3点を述べます。中間部分の扱いの詳細はこのセクションでは展開されていません。
- 設定型の名前は `Config` ではなく `ToolResultPruneConfig` です。原文カタログのこのセクションでは、この1型が設定面のすべてです。

## 設定例

プロファイルの `cordis.patch.yml` に挿入する行（row）として設定します。

```yaml
- id: compaction-tool-result-pruner
  name: '@deepseek-ai/dsh-compaction-tool-result-pruner'
  config:
    thresholdChars: 8192   # 既定値どおり
    headChars: 4096
    tailChars: 1024
```

より強い圧縮を望むときは3つの数値を減らし、長いツール出力をさらに残したいときは大きくします。

## 関連ページ

- [compaction サブシステム](/subsystems/compaction.md)
- [`@deepseek-ai/dsh-compaction-basic` の設定](/reference/config/dsh-compaction-basic.md)

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-compaction-tool-result-pruner
- 元の型定義: `packages/compaction/compaction-tool-result-pruner/src/types.ts`（`config-catalog.md` 生成時点）
