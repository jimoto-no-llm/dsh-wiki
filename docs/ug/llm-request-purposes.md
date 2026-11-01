# 補助 LLM 要求の purpose を宣言する（v0.2.2-alpha.2）

補助的な LLM 要求の `purpose` が、共有の固定 union から「プロデューサ所有の型宣言」に変わります。宣言結合（declaration merge）で目的のキーを広げる方式です。

## 変更の内容

`GenerateOptions.purpose` は、`@deepseek-ai/dsh-llm` の `types` 入口が輸出する宣言結合可能な `LlmRequestPurposeMap` から派生するようになります。

| 項目 | 変更後 |
| --- | --- |
| `GenerateOptions.purpose` | `LlmRequestPurposeMap`（`@deepseek-ai/dsh-llm/types`）から派生する |
| `compaction`・`session-title` | 共有パッケージはこれらを宣言しなくなる |
| 実行時の purpose 文字列 | 既存の意味は変わらない |
| 補助要求を作るプラグイン | プロデューサの宣言を読み込むか、自前の purpose を宣言する必要がある |

共有パッケージは `compaction` や `session-title` を宣言しなくなるため、補助要求を組み立てるプラグインはプロデューサ側の宣言を読み込むか、自らの purpose を宣言します。

## 移行の手順

1. 圧縮を直接要求するなら `@deepseek-ai/dsh-compaction-basic` を import します
2. タイトル要求なら `@deepseek-ai/dsh-session-title-llm` を import します
3. 宣言だけが必要なときは、両方とも type-only の import で構いません
4. プラグインが自分の purpose を持つときは、プラグインの公開型入口から `LlmRequestPurposeMap` を増強し、purpose のキーを `true` に写像します

```ts
import type {} from '@deepseek-ai/dsh-llm/types'

declare module '@deepseek-ai/dsh-llm/types' {
  interface LlmRequestPurposeMap {
    'my-plugin-purpose': true
  }
}
```

5. プラグインを新しいパッケージ宣言でコンパイルします
6. 宣言した purpose が要求に受け付けられることを確認します
7. 未宣言のキーが拒否されることを確認します

## 注意

- 共有パッケージ内の `compaction`・`session-title` 宣言には依存できなくなりました
- これらの要求は必ずプロデューサ パッケージの import か、自前の宣言を通します
- 実行時の purpose 文字列の意味は変わらず動きます。壊れやすいのは、固定 union を前提にしたプラグイン側の型コンパイルです

## 確認事項

- `compaction` を使うコードが `@deepseek-ai/dsh-compaction-basic` の宣言を引き込んでいることを確認します
- title を使うコードが `@deepseek-ai/dsh-session-title-llm` の宣言を引き込んでいることを確認します
- 未宣言の purpose キーが型エラーで弾かれることを確認します

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/upgrade-guide/v0.2.2-alpha.2/llm-request-purpose-declarations/guide.md
