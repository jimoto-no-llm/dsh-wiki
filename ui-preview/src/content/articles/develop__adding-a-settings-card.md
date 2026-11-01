---
title: "ライブ設定フォーム（settings card）追加ガイド"
desc: "プラグインの Config schema でライブフィールド（Volatile）を宣言し、製品所有の settings card から編集できるようにする。export された C"
cat: "develop"
catLabel: "開発ガイド"
chars: 3818
slug: "develop/adding-a-settings-card"
---

# ライブ設定フォーム（settings card）追加ガイド

## 目的

プラグインの Config schema でライブフィールド（Volatile）を宣言し、製品所有の settings card から編集できるようにする。export された `Config` interface は、各 `Volatile＼T］` reference を含む、プラグインが受け取る値を記述する。

## 前提

- `@deepseek-ai/cordis` の `Context`／`Volatile` と、`@deepseek-ai/schemastery`（z）を使えること。
- base bundle は settings と config-editor を mount 済み。カスタム profile では同じ services を mount する前に、そのパッケージの README を確認する。

## 手順

### 1. ライブフィールドを宣言する

```ts
import type { Context, Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

export interface Config {
  endpoint: Volatile<string | undefined>
  retries: Volatile＼number］
}

export const Config = z.object({
  endpoint: z.string().volatile(),
  retries: z.number().step(1).min(0).default(3).volatile(),
})

export function apply(ctx: Context, config: Config): void {
  ctx.on('loader/volatile-update', () => {
    ctx.logger.info('Retry limit: %d', config.retries.get())
  })
}
```

操作を開始するときに `.get()` を読む。一貫した snapshot が要る要求は値を一度だけ取得する。cross-field の Config 検証には `.check()` を使い、これは persistence 前に Host で走り、serialized form schema からは落とされる。

### 2. プラグインを構成する

各 instance に一意な profile entry id を与える。`role('secret')` は値を form の応答から隠す。credentials domain が管理する値には credential reference を使う。平凡なフィールドは settings schema の外に置く。

### 3. 編集を検証する

Plugins でフィールドを変えて保存する。profile patch・次の消費者操作・plugin instance の同一性変わらず・restart 後の復元を確認する。不正値は拒否し、ファイルにもライブ値にも変化がないことを確認する。

カスタムの plugin page には、Plugins page の owner から `form.state` と `form.mutate(operations, expectedRevision)` が渡る。Host が完全な Config を validate し、ConfigEditor と volatile HMR で編集を適用する。既存 card の例は plugin settings パッケージ（`ui-settings-plugins`）にある。

### 4. 他プラグインのページに寄与する

自分が所有しない bundle・row・公式 plugin について言いたいことがあるプラグインは、`plugins.detail.actions`（ページ先頭の control）、`plugins.detail.badge`（タイトル横の tag）、`plugins.detail.section`（ページ本文下の section）に登録する。各 entry はページの `subject`（`{ kind: 'bundle', pkg }`・`{ kind: 'row', pkg, row }`・`{ kind: 'item', id }`）とともに描画され、関与しない subject には null を返す:

```tsx
ctx.slots.inject('plugins.detail.badge', () => ctx.slots.register({
  name: 'plugins.detail.badge',
  id: 'acme-update',
  locale: 'acmeUpdate',
}, ({ t, subject }) => subject.kind === 'bundle' && hasUpdate(subject.pkg) ? <Tag tone="info">{t('update')}</Tag> : null))
```

### 5. ブラウザ側半分の置き場所

browser 半分は client module system が提供する。module system は `dsh.client` を宣言するパッケージの有効な Loader entry を走查し、それぞれの build 済み `./client` export を serve する。ただし attach 先は、bare package name を specifier にもつ Loader row である。subpath export から mount された row は半分を絶対に持たない。1 パッケージを複数 row に分割する bundle は半分を root row に保ち、その row が無効化されると登録された全ページが消える。他の row より page を長命させたい sub-plugin は、独立したパッケージとして出荷する。

build 済み `./client` ファイルは client module system の lazy-CJS factory 形式（パッケージ名を登録する 1 script ＋ page の module loader を持つ `factory(require)`）でなければならない。これを出力する `clientBundle` tsdown preset は `packages/client/tsdown.client.ts` にあり publish されていないため、リポジトリ外のパッケージは自力でその build を再現する。

```jsonc
{
  "exports": {
    ".": { "types": "./lib/types/index.d.ts", "default": "./lib/index.js" },
    "./client": { "types": "./lib/types/client/index.d.ts", "default": "./lib/client.js" }
  },
  "dsh": { "client": { "platform": "web", "inject": ["@deepseek-ai/dsh-client-ui-settings"] } }
}
```

built-in namespace 用の companion package は、同じ browser 半分を Host 側 `apply` が空の client-only パッケージとして持ち、web composition の plugin roster（`packages/bundle/web-app/cordis.patch.yml`）に列挙し、`ctx.configForms.whileServed` 経由で `plugins.item` に登録する。

## 注意

- 一貫 snapshot が必要な処理の中で操作の途中に `get()` を読み直さない（値が途中で変わる）。
- 基本 bundle が mount する settings／config-editor を、確認なしに別 profile へ複製 mount しない。
- client 半分の有効範囲は root row と結び付く。subpath row に期待してページを作らないこと。

## 出典

UPSTREAM: <https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-settings-card.md>
