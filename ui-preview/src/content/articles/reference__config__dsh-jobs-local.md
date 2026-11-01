---
title: "`@deepseek-ai/dsh-jobs-local` の設定"
desc: "@deepseek-ai/dsh-jobs-local はプロセス内（process-local）のジョブレジストリ実装です。設定の doc コメントは 「プロセスローカルなジョブ"
cat: "config"
catLabel: "設定の詳細"
chars: 2754
slug: "reference/config/dsh-jobs-local"
---

# `@deepseek-ai/dsh-jobs-local` の設定

`@deepseek-ai/dsh-jobs-local` はプロセス内（process-local）のジョブレジストリ実装です。設定の doc コメントは **「プロセスローカルなジョブレジストリの設定（Configuration for the process-local job registry.）」** です。同時実行ジョブ数の上限と、出力リングバッファ（ring）の保持バイト数、pull ソースのポーリング間隔をこの4フィールドで制御します。

- 上流の型定義位置: `packages/jobs/jobs-local/src/index.ts:46`
- このセクションは `inject` 宣言を持ちません。

## 原文の型定義（`config-catalog.md` 抜粋）

```ts
/** Configuration for the process-local job registry. */
export interface Config {
  /**
   * Maximum `running` plus `stopping` jobs per exact owner or in the shared unowned bucket;
   * omission defaults to 10.
   */
  maxConcurrentJobsPerOwner?: number
  /** Live ring retention per job in UTF-8 bytes; omission defaults to 262144. */
  retainBytes?: number
  /**
   * Ring retention kept after a job settles, in UTF-8 bytes; omission defaults to 16384.
   * Settlement keeps every byte the model cursor has not consumed on top of
   * this cap; the first terminal model read then trims to it.
   */
  settledRetainBytes?: number
  /** Poll interval for a job's pull sources, in milliseconds; omission defaults to 150. */
  pumpPollMs?: number
}
```

## 全設定フィールド

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `maxConcurrentJobsPerOwner` | `number`（省略可） | 厳密一致オーナーごと、または共有の未所有（unowned）バケットで許される `running` + `stopping` ジョブ合計数の最大。省略時のデフォルトは 10。 |
| `retainBytes` | `number`（省略可） | ジョブごとのライブリング保持量を UTF-8 バイトで指定。省略時のデフォルトは 262144。 |
| `settledRetainBytes` | `number`（省略可） | ジョブ確定後（settled）にリングに残す UTF-8 バイト。省略時のデフォルトは 16384。 |
| `pumpPollMs` | `number`（省略可） | ジョブの pull ソースを pump する間隔（ミリ秒）。省略時のデフォルトは 150。 |

## 注釈

原文の doc コメントの全文とその訳です。

- `maxConcurrentJobsPerOwner`:
  - 原文: 「厳密（exact）オーナーごと、またはオーナーを持たない共有バケットで、`running` + `stopping` 合計の最大。省略はデフォルト 10」。
  - カウントには `running` だけでなく `stopping`（停止処理中）も含まれます。停止途中のジョブもスロットを消費します。
- `retainBytes`:
  - 原文: 「ジョブごとのライブリング保持量（UTF-8 バイト）。省略はデフォルト 262144」。ジョブ実行中に保持する出力リングのサイズです。
- `settledRetainBytes`:
  - 原文: 「確定後（ settled）にリングに残す保持量（UTF-8 バイト）。省略はデフォルト 16384。確定（Settlement）は、モデルカーソルがまだ消費していないバイトはすべてこの上限の上（追加）に残す。最初の終端読み出し（terminal model read）でこの上限まで刈り込まれる」。
  - つまり確定直後は「モデルが未読の分」をこの上限に加えて保持し、モデル側が初めて読みに出たときにこの上限へ刈り込まれます。
- `pumpPollMs`:
  - 原文: 「ジョブの pull ソースに対するポーリング間隔（ミリ秒）。省略はデフォルト 150」。

## 設定例

```yaml
- id: jobs-local
  name: '@deepseek-ai/dsh-jobs-local'
  config:
    maxConcurrentJobsPerOwner: 10   # 既定値
    retainBytes: 262144             # 既定値（256 KiB）
    settledRetainBytes: 16384       # 既定値（16 KiB）
    pumpPollMs: 150                 # 既定値
```

## 関連ページ

- [jobs サブシステム](/subsystems/jobs.md)

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-jobs-local
- 元の型定義: `packages/jobs/jobs-local/src/index.ts`（`config-catalog.md` 生成時点）
