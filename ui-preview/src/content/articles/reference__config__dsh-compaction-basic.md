---
title: "`@deepseek-ai/dsh-compaction-basic` の設定"
desc: "@deepseek-ai/dsh-compaction-basic はベーシックなコンパクション（要約・圧縮）プラグインの実装です。設定の doc コメントは「省略可能なモデルごと"
cat: "config"
catLabel: "設定の詳細"
chars: 3247
slug: "reference/config/dsh-compaction-basic"
---

# `@deepseek-ai/dsh-compaction-basic` の設定

`@deepseek-ai/dsh-compaction-basic` はベーシックなコンパクション（要約・圧縮）プラグインの実装です。設定の doc コメントは「省略可能なモデルごとのポリシーテーブルを伴う、Basic コンパクションの設定（Basic compaction configuration with an optional exact-target policy table.）」です。

- 注入先（inject）: `llm` · `tokenMeter` · `sessions`
- 上流の型定義位置: `packages/compaction/compaction-basic/src/types.ts:46`
- 設定型: `BasicCompactionConfig extends CompactionPolicyConfig`

## 全設定フィールド

### BasicCompactionConfig

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `modelPolicies` | `ModelCompactPolicyConfig[]`（省略可） | プロバイダ・モデルを厳密一致（exact）で上書きするポリシーテーブル。同一ターゲットが重複するとプラグインのロードに失敗する。 |
| `auto` | `boolean`（省略可） | ステップ境界（step-boundary）の圧迫検知と、コンテキスト溢れ（overflow）からの復帰リスナーを自動的に有効にする。デフォルトは `true`。 |

この型は `CompactionPolicyConfig` を継承するため、下記の共通ポリシーフィールドも全て設定できます。

### CompactionPolicyConfig（デフォルトポリシーと共通フィールド）

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `thresholdRatio` | `number`（省略可） | 圧迫（ Pressure）検知に使うコンテキストウィンドウの割合。コンテキストウィンドウから出力予約分と `headroomTokens` を引いた値を上限としてさらに上限がかかる。デフォルトは `0.8`。 |
| `headroomTokens` | `number`（省略可） | ルーティングされた出力予約分に加えて設ける追加の余裕ヘッドルーム。非負整数、デフォルトは `65536`。 |
| `retainRatio` | `number`（省略可） | 圧縮後も保持する直近コンテキストの割合。コンテキストウィンドウから出力予約分を引いた値に対する比率。デフォルトは `0.16`。 |
| `retainTokens` | `number`（省略可） | 保持する直近コンテキストを絶対トークン数で指定。`retainRatio` と相互排他。 |
| `summarizationProvider` | `string`（省略可） | 要約を担うプロバイダ。`summarizationModel` と同時に設定するか、会話のターゲットを継承する。 |
| `summarizationModel` | `string`（省略可） | 要約を担うモデル。`summarizationProvider` と同時に設定するか、会話のターゲットを継承する。 |
| `maxTokens` | `number`（省略可） | 要約時の生成トークン上限。デフォルトは解決済の `headroomTokens`。明示する場合は正の値が必須。 |
| `compactionRetries` | `number`（省略可） | 1回目の圧縮後もしきい値（threshold）を超えて圧迫が残っていた場合の追加試行回数。デフォルトは `1`。 |
| `maxOverflowRetries` | `number`（省略可） | キャノニカル（canonical）コンテキスト溢れ後の最大再試行。`0` で復帰を無効化。デフォルトは `1`。 |

### ModelCompactPolicyConfig（厳密ターゲット用の上書き）

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `provider` | `string`（必須） | マッチ対象の登録済プロバイダルート。 |
| `model` | `string`（必須） | `provider` 内で厳密に一致させるルーティング上のモデル id。 |
| （継承分） | `CompactionPolicyConfig` 共通 | 上表の共通ポリシーフィールド全部を上書き値として持てる。 |

## 注釈

- 「デフォルトポリシー」はテーブルを持たない仕様（ `BasicCompactionConfig` 自身）で、テーブルは「特定の provider/model 組み合わせだけを厳密一致で上書きする」場合に使うものです。
- `modelPolicies` 内で同一の (provider, model) が重複する場合、「duplicate targets fail plugin load(重複ターゲットはプラグインロードを失敗させる)」と原文で明示されています。
- `thresholdRatio` 系の比率は全部「コンテキストウィンドウから（出力予約分 ± `headroomTokens`）を引いた」値を基準にします。

## 設定例

```yaml
- id: compaction
  name: '@deepseek-ai/dsh-compaction-basic'
  config:
    auto: true                       # 既定値
    thresholdRatio: 0.8              # 既定値
    headroomTokens: 65536            # 既定値
    retainRatio: 0.16                # retainTokens と相互排他
    compactionRetries: 1             # 既定値
    maxOverflowRetries: 1            # 既定値
    modelPolicies:                   # 特定モデルだけ係数を変える例
      - provider: deepseek
        model: deepseek-reasoner
        thresholdRatio: 0.85
        retainTokens: 12000          # retainRatio との排他に注意
```

## 関連ページ

- [compaction サブシステム](/subsystems/compaction.md)

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-compaction-basic
- 元の型定義: `packages/compaction/compaction-basic/src/types.ts`（`config-catalog.md` 生成時点）
