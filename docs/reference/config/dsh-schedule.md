# `@deepseek-ai/dsh-schedule` の設定

`@deepseek-ai/dsh-schedule` は Host Schedule ドメイン（リマインダー・定期タスク）の実装プラグインです。設定の doc コメントは **「Host Schedule ドメインの設定（Configuration for the Host Schedule domain.）」** です。配信履歴の保持条件と、配信ごとに新しいセッションを立ち上げるタスクの最短配信間隔をこの3フィールドで制御します。

- 注入先（inject）: `agents` · `sessions` · `storageDomain` · `sessionPersistence`
- 上流の型定義位置: `packages/schedule/schedule/src/index.ts:80`

## 原文の型定義（`config-catalog.md` 抜粋）

```ts
/** Configuration for the Host Schedule domain. */
export interface Config {
  /**
   * Delivery-history window retained per task, in days; omission defaults to 30.
   * Pruning happens when an acknowledgment is appended, and `lastDelivery` is always retained.
   */
  deliveryHistoryDays?: number
  /**
   * Retained delivery records per task; omission defaults to 200. The older of this
   * cap and the window wins, and the newest records survive.
   */
  deliveryHistoryRecords?: number
  /**
   * Shortest spacing, in seconds, from the occurrence of one delivery to the next delivery of one task whose target
   * creates a Session at every delivery; omission defaults to 60. Timed and manual deliveries both wait for it.
   */
  newSessionIntervalSeconds?: number
}
```

## 全設定フィールド

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `deliveryHistoryDays` | `number`（省略可） | タスクごとに保持する配信履歴ウィンドウ（日数）。省略時のデフォルトは 30。枝刈り（Pruning）は acknowledgment（受領確認）が追記されるタイミングで発生し、`lastDelivery` は常に保持される。 |
| `deliveryHistoryRecords` | `number`（省略可） | タスクごとに保持する配信レコード数。省略時のデフォルトは 200。このレコード上限と上記のウィンドウのうち The older of this cap and the window wins（上限とウィンドウのうち古いほうが勝つ）となり、新しいレコードが生き残る。 |
| `newSessionIntervalSeconds` | `number`（省略可） | 1回の配信の発生から次の配信までの最短間隔（秒）。ただし、対象が「配信のたびにセッション（Session）を作るタスク」である場合に限る。省略時のデフォルトは 60。Timed（予定起因）でも manual（手動）でも、どちらの配信もこの待ち時間に従う。 |

## 注釈

原文の doc コメントの全文とその訳です。

- `deliveryHistoryDays`:
  - 原文: 「タスクごとの配信履歴保持ウィンドウ（日数）。省略はデフォルト 30。枝刈りは acknowledgment が追記されるときに起こり、`lastDelivery` は常に保持される」。
- `deliveryHistoryRecords`:
  - 原文: 「タスクごとの保持レコード数。省略はデフォルト 200。この上限（cap）とウィンドウ（window）のうち The older of this cap and the window wins ＝ より厳しい（古い側に切る）ほうが採用され、最新のレコードが生き残る（newest records survive）」。
  - つまりレコード数上限と日数ウィンドウの2条件のうち「より強く切る」側が採用されます。
- `newSessionIntervalSeconds`:
  - 原文: 「1回の配信の発生から、毎配信でセッションを作るターゲットを持つ同一タスクの次の配信までの最短隔（秒）。省略はデフォルト 60。Timed と manual の配信の両方がこの待ちに入る」。
  - ここでいう「セッションを作るターゲット」とは、配信のたびに新しいセッション（Session）を生成する種類のタスクのことです。単一セッションに継続集約される種類のタスクには適用されません。

## 設定例

```yaml
- id: schedule
  name: '@deepseek-ai/dsh-schedule'
  config:
    deliveryHistoryDays: 30        # 既定値
    deliveryHistoryRecords: 200    # 既定値
    newSessionIntervalSeconds: 60  # 既定値
```

## 関連ページ

- [CLI の共通挙動](/reference/cli/behaviors.md)（`cordis.patch.yml` のレイヤー合成）

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-schedule
- 元の型定義: `packages/schedule/schedule/src/index.ts`（`config-catalog.md` 生成時点）
