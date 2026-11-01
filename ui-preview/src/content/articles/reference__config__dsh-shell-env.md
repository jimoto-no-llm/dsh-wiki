---
title: "`@deepseek-ai/dsh-shell-env` の設定"
desc: "@deepseek-ai/dsh-shell-env は、シェル環境に面する既定値を供給するプラグインです。設定対象は単一の Config インターフェイスで、原文の doc コメ"
cat: "config"
catLabel: "設定の詳細"
chars: 2346
slug: "reference/config/dsh-shell-env"
---

# `@deepseek-ai/dsh-shell-env` の設定

`@deepseek-ai/dsh-shell-env` は、シェル環境に面する既定値を供給するプラグインです。設定対象は単一の `Config` インターフェイスで、原文の doc コメントは「プラグイン設定（全て省略可 — ビルトインのファクトは既定値が無くても解決する）（Plugin config (all optional — the built-in facts resolve without defaults).）」です。

- 注入先（inject）: 原文カタログのこの項目には `inject` の行が付いていません
- 上流の型定義位置: `packages/shell/shell-env/src/index.ts:30`

## 原文の型定義（`config-catalog.md` 抜粋）

```ts
/** Plugin config (all optional — the built-in facts resolve without defaults). */
export interface Config {
  /** DeepSeek Harness home directory exposed as `DSH_HOME`; defaults to `$DSH_HOME` or `~/.dsh`. */
  dshHome?: string
}
```

## 全設定フィールド

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `dshHome` | `string`（省略可） | `DSH_HOME` として外部に公開される DeepSeek Harness のホームディレクトリ。既定値は `$DSH_HOME`、それが無ければ `~/.dsh`。 |

1フィールドだけの設定です。表の「型」列は原文（`dshHome?: string`）どおりで、省略可能な `string` 型です。

## 注釈

- 原文（`dshHome`）: "DeepSeek Harness home directory exposed as `DSH_HOME`; defaults to `$DSH_HOME` or `~/.dsh`."
  - 訳: 「`DSH_HOME` として公開される DeepSeek Harness のホームディレクトリ。既定値は `$DSH_HOME` または `~/.dsh`」。
  - 既定値の読み方: まず環境変数 `$DSH_HOME` の値が引き継がれ、それが無い場合に `~/.dsh` に落ちます。設定面の `dshHome` は、この2段の既定を差し替えて「実際に使うホームディレクトリ」を1箇所で決めるためのものです。
  - 設定側で値を与えた場合は、その値が `DSH_HOME` の中身として公開されます（表の「意味」列のとおり）。
- 原文（インターフェイス全体）: "Plugin config (all optional — the built-in facts resolve without defaults)."
  - 訳: 「プラグイン設定（全て省略可 — ビルトインのファクトは既定値が無くても解決する）」。この設定を一切与えなくても、プラグインはビルトインの既定で組み上がります。
- `Config` インターフェイスには上記以外のフィールドは存在しません。
- 参照の範囲: 原文のこのセクションは `DSH_HOME` 変数としての公開だけを述べ、どの面がその値を読むかまでは展開していません。設定しない値が環境変数 `$DSH_HOME` と整合する前提（既定値の第一段が `$DSH_HOME`）だけが書かれています。
- 原文カタログの項目には `inject` の行が無いため、このページでは「注入先の記載なし」のまま扱います。記載の有無以上の挙動（どの capability に効くか）は、このセクションからは読み取れません。

## 設定例

プロファイルの `cordis.patch.yml` に挿入する行（row）として設定します。

```yaml
- id: shell-env
  name: '@deepseek-ai/dsh-shell-env'
  config:
    dshHome: /srv/dsh/home   # ホームディレクトリを明示する場合
```

この設定を省略した場合は `$DSH_HOME`（無ければ `~/.dsh`）が使われます。

なお `dshHome` が置き換えるのは `DSH_HOME` として公開される値で、このセクションは `DSH_HOME` 以外の環境変数の名前を挙げていません。

## 関連ページ

- [boot サブシステム](/subsystems/boot.md)
- [CLI の共通挙動](/reference/cli/behaviors.md)

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-shell-env
- 元の型定義: `packages/shell/shell-env/src/index.ts`（`config-catalog.md` 生成時点）
