# `@deepseek-ai/dsh-goal` の設定

`@deepseek-ai/dsh-goal` は、ゴール（goal）機能の「作成時デフォルト」を供給するプラグインです。設定対象は単一の `Config` インターフェイスで、原文の doc コメントは **「ゴール作成のためのデプロイ時デフォルト（Deployment defaults for goal creation.）」** です。

- 注入先（inject）: `agents` · `sessionProjections`
- 上流の型定義位置: `packages/goal/goal/src/index.ts:168`

## 原文の型定義（`config-catalog.md` 抜粋）

```ts
/** Deployment defaults for goal creation. */
export interface Config {
  /** Total rounds used when a create request omits its own cap. */
  defaultMaxGoalRounds?: number
}
```

## 全設定フィールド

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `defaultMaxGoalRounds` | `number`（省略可） | create 要求が自身の上限（cap）を省略したときに使われる、合計ラウンド数。 |

1フィールドだけの設定です。表の「型」列は原文（`defaultMaxGoalRounds?: number`）どおりで、省略可能な `number` 型です。

## 注釈

原文の doc コメントの全文とその訳です。

- 原文（インターフェイス全体）: `/** Deployment defaults for goal creation. */`
  - 訳: 「ゴール作成のためのデプロイ時デフォルト」。つまり、この設定はゴールを作成する API のデフォルト値を定めるもので、実行中の既存ゴールの上限を書き換えるものではありません。
- 原文（`defaultMaxGoalRounds`）: `/** Total rounds used when a create request omits its own cap. */`
  - 訳: 「create 要求が自身の上限（cap）を省略した場合に使われる合計ラウンド数」。
- 読み取りどおりの挙動（原文から示唆される範囲）:
  - ゴール作成リクエスト側で上限（`maxGoalRounds` 相当）を明示した場合は、そちらが使われます。
  - この設定が着るのは「リクエストが上限を書いていない」場合だけです。
- `Config` インターフェイスには上記以外のフィールドは存在しません。ゴール周りのその他のふるまい（ツール側の挙動）は `@deepseek-ai/dsh-tool-goal` が担っており、設定は別カタログセクションに分かれています。

## 設定例

プロファイルの `cordis.patch.yml` に挿入する行（row）として設定します。

```yaml
- id: goal
  name: '@deepseek-ai/dsh-goal'
  config:
    defaultMaxGoalRounds: 30
```

この設定を置かない（`config` を与えない）場合、このプラグインはゴール作成リクエストが上限を省略したときに独自の既定ラウンド数を持ちません。

## 関連ページ

- [goal サブシステム](/subsystems/goal.md)
- [CLI の共通挙動](/reference/cli/behaviors.md)（`cordis.patch.yml` のレイヤー合成順序と、行（row）の指定方法）

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-goal
- 元の型定義: `packages/goal/goal/src/index.ts`（`config-catalog.md` 生成時点）
