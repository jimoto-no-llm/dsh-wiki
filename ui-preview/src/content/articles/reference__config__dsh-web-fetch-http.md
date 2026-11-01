---
title: "`@deepseek-ai/dsh-web-fetch-http` の設定"
desc: "@deepseek-ai/dsh-web-fetch-http は HTTP fetch を担う web プロバイダのプラグインで、トランスポートとサイズの上限、送信する User"
cat: "config"
catLabel: "設定の詳細"
chars: 2449
slug: "reference/config/dsh-web-fetch-http"
---

# `@deepseek-ai/dsh-web-fetch-http` の設定

`@deepseek-ai/dsh-web-fetch-http` は HTTP fetch を担う `web` プロバイダのプラグインで、トランスポートとサイズの上限、送信する `User-Agent` を設定します。設定対象は単一の `Config` インターフェイスで、原文の doc コメントは「プラグイン設定: プロバイダのトランスポートとサイズ上限、およびその `User-Agent`（全部に既定値あり）（Plugin config: the provider's transport and size limits plus its `User-Agent` (all defaulted).）」です。

- 注入先（inject）: `web`
- 上流の型定義位置: `packages/web/web-fetch-http/src/index.ts:32`

## 原文の型定義（`config-catalog.md` 抜粋）

```ts
/** Plugin config: the provider's transport and size limits plus its `User-Agent` (all defaulted). */
export interface Config {
  /** Maximum response body size in bytes. */
  maxResponseBytes?: number
  /** Maximum decoded body length in characters. */
  maxBodyChars?: number
  /** Default fetch timeout in milliseconds, within Node's timer range. */
  timeoutMs?: number
  /** Maximum number of same-origin redirect hops to follow. */
  maxRedirects?: number
  /** `User-Agent` header sent on every request. */
  userAgent?: string
}
```

## 全設定フィールド

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `maxResponseBytes` | `number`（省略可） | レスポンスボディの最大バイト数。 |
| `maxBodyChars` | `number`（省略可） | デコード後のボディ長の最大文字数。 |
| `timeoutMs` | `number`（省略可） | fetch の既定タイムアウト（ミリ秒）。Node のタイマー範囲に収める。 |
| `maxRedirects` | `number`（省略可） | 辿る同一オリジン（same-origin）のリダイレクトホップの最大数。 |
| `userAgent` | `string`（省略可） | すべてのリクエストで送る `User-Agent` ヘッダ。 |

## 注釈

- 冒頭 doc コメントは「all defaulted（全部に既定値あり）」とだけ述べ、具体的な既定値の数値はこのセクションの型定義には書かれていません。
- 単位はフィールドごとに分かれています: `maxResponseBytes` はバイト、`maxBodyChars` は「デコード後」の文字数、`timeoutMs` はミリ秒です。
- `maxRedirects` が数えるのは「同一オリジン（same-origin）」のリダイレクトホップです。それ以外のリダイレクトの扱いがどうなるかは、このセクションからは読み取れません。
- `timeoutMs` の doc コメントは「Node のタイマー範囲（within Node's timer range）に収める」ことを含みます。極端に大きすぎる（タイマー側の上限を超える）値はここでは想定外です。
- `userAgent` は送信側の身元を決めるフィールドです。原文が既定値の中身をこのセクションに書いていないため、明示したい場合に設定します。

## 設定例

プロファイルの `cordis.patch.yml` に挿入する行（row）として設定します。

```yaml
- id: web-fetch-http
  name: '@deepseek-ai/dsh-web-fetch-http'
  config:
    maxResponseBytes: 10000000
    timeoutMs: 30000
    maxRedirects: 5
    userAgent: dsh-wiki-example/1.0   # すべてのリクエストで送る UA
```

`maxBodyChars` を省略すれば既定に任されます（all defaulted の趣旨）。数値は例です。

## 関連ページ

- [tools サブシステム](/subsystems/tools.md)

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-web-fetch-http
- 元の型定義: `packages/web/web-fetch-http/src/index.ts`（`config-catalog.md` 生成時点）
