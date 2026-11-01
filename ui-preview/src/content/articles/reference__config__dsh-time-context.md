---
title: "`@deepseek-ai/dsh-time-context` の設定"
desc: "@deepseek-ai/dsh-time-context は、リクエスト（ターン）準備時の時刻の表示と、コンテキストへの永続的な注入のスケジュールを司るプラグインです。設定対象は"
cat: "config"
catLabel: "設定の詳細"
chars: 2679
slug: "reference/config/dsh-time-context"
---

# `@deepseek-ai/dsh-time-context` の設定

`@deepseek-ai/dsh-time-context` は、リクエスト（ターン）準備時の時刻の表示と、コンテキストへの永続的な注入のスケジュールを司るプラグインです。設定対象は単一の `Config` インターフェイスで、原文の doc コメントは「リクエスト準備のための時計の書式付けと注入（append）のスケジュール。不正な値はプラグインのロードに失敗する（Request-preparation clock formatting and append scheduling. Invalid values fail plugin load.）」です。

- 注入先（inject）: `agents` · `sessionProjections`
- 上流の型定義位置: `packages/context/time-context/src/index.ts:52`

## 原文の型定義（`config-catalog.md` 抜粋）

```ts
/** Request-preparation clock formatting and append scheduling. Invalid values fail plugin load. */
export interface Config {
  /** Fallback display zone when the open turn has no unique browser zone. Omit to use the process zone. */
  timeZone?: string
  /** Minimum milliseconds between durable injections in one session. Defaults to 600000 (10 minutes); 0 injects at every eligible step. */
  refreshIntervalMs?: number
}
```

## 全設定フィールド

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `timeZone` | `string`（省略可） | 開かれているターンに一意なブラウザゾーンが無いときのフォールバック表示ゾーン。省略した場合はプロセスのゾーンを使う。 |
| `refreshIntervalMs` | `number`（省略可） | 1つのセッション内での、永続的な注入（durable injection）と注入の間の最短時間（ミリ秒）。既定値は 600000（10分）。`0` だと適格（eligible）なステップごとに注入する。 |

2フィールドだけの設定です。表の「型」列は原文（`timeZone?: string` / `refreshIntervalMs?: number`）どおりで、どちらも省略可能です。

## 注釈

- 原文（`timeZone`）: "Fallback display zone when the open turn has no unique browser zone. Omit to use the process zone."
  - 訳: 「開かれているターンが一意なブラウザゾーンを持たないときのフォールバック表示ゾーン。省略してプロセスゾーンを使う」。
  - 実際の要求では、要求元ブラウザのタイムゾーンが分からないターン（たとえばヘッドな状態）があります。その場合にこの値が表示側のフォールバックとして名指されるゾーンになり、設定自体が無いときはプロセスのゾーンに落ちます。
  - ゾーン名はタイムゾーンの識別子（たとえば `Asia/Tokyo` の形）で設定します。
- 原文（`refreshIntervalMs`）: "Minimum milliseconds between durable injections in one session. Defaults to 600000 (10 minutes); 0 injects at every eligible step."
  - 訳: 「1つのセッション内の永続的な注入と注入の間の最短ミリ秒。既定値は 600000（10分）。`0` は適格なステップごとに注入する」。
  - 「永続的な注入（durable injection）」の含意: コンテキストに残り続ける形の注入であり、隔離された表示のみではないことを、フィールド名と doc コメントの対比から読み取れます。
- 不正な値の取り扱い（冒頭 doc コメント）: 値の検証はロード時の失敗で実装され、無効なゾーン名などはプラグインのロード自体を失敗させます。省略は失敗になりません（両フィールドとも省略可）。

## 設定例

プロファイルの `cordis.patch.yml` に挿入する行（row）として設定します。

```yaml
- id: time-context
  name: '@deepseek-ai/dsh-time-context'
  config:
    timeZone: Asia/Tokyo        # ブラウザゾーンが取れないターンのフォールバック
    refreshIntervalMs: 600000   # 既定値と同じ 10 分間隔
```

既定（600000）をそのまま使うなら、`refreshIntervalMs` は書かない方が意図が明確です。

## 関連ページ

- [sessions ガイド](/guide/sessions.md)
- [CLI の共通挙動](/reference/cli/behaviors.md)

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-time-context
- 元の型定義: `packages/context/time-context/src/index.ts`（`config-catalog.md` 生成時点）
