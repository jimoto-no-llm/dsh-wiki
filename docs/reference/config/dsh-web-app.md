# `@deepseek-ai/dsh-web-app` の設定（`dsh-web` シームを含む）

Web GUI 周辺の設定は2段に分かれます。

- `@deepseek-ai/dsh-web` — web シーム（検索・取得プロバイダの選択を固定するランタイム設定）。
- `@deepseek-ai/dsh-web-app` — web アプリバンドルの起動時動作（ブラウザを開くか、URL を印字するか等）。

両方をこのページにまとめて列挙します。

## `@deepseek-ai/dsh-web`（web シーム）

- 型の参照先: `Volatile`（`@deepseek-ai/cordis`）
- 上流の型定義位置: `packages/web/web/src/index.ts:57`
- 型: `WebRuntimeConfig`

doc コメントの訳: 「web シームの設定。`searchProvider` / `fetchProvider` はどのプロバイダが各能力で勝つかを固定する。どちらも任意で（登録済みの有用なプロバイダが恰も1つだけなら自動選択する）。各操作は現在の値を読むため、設定変更はサービスを再マウントしなくても次の検索／取得に適用される。環境変数のような運用側の上書きも、隠れた優先順位チェーンを新設せず、これと同じフィールドへ流し込むべき」。

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `searchProvider` | `Volatile<string \| undefined>` | 探索（search）プロバイダの明示指定。省略（undefined）＝有用なプロバイダが恰も1つだけなら自動選択。 |
| `fetchProvider` | `Volatile<string \| undefined>` | 取得（fetch）プロバイダの明示指定。省略＝自動選択。 |

## `@deepseek-ai/dsh-web-app`

- 注入先（inject）: `webServer`
- 上流の型定義位置: `packages/bundle/web-app/src/index.ts:55`

doc コメントの訳: 「プラグイン設定: 合成されたデプロイ設定に加えて、呼び出しごとのコマンドライン値」。

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `openBrowser` | `boolean` | Loader ツリーが確定したあとデフォルトブラウザへの引き渡しを許可する。SSH からの起動では抑止される。 |
| `printUrl` | `boolean` | アクティベーション時に URL 行を印字する。非対話レイヤーはこれを off にできる。 |
| `surfaceContext` | `boolean` | この GUI を名指す `DSH_WEB_URL` bash 変数の登録を行う。ユーザが GUI 内にいない場合、周回型（one-shot）の非対話レイヤーはこれを off にできる。 |
| `publicUrl` | `string`（省略可） | 印字・開かれる URL、`DSH_WEB_URL`、`webApp.getAdvertisedUrl()` に告知する正規の HTTP(S) ルートで、スラッシュ `/` 終端に正規化される。ルーティングや認証は設定しない。不在または YAML の `null` ではバインドアドレスの URL を告知する。 |

## 注釈

- `publicUrl` は「広告（advertise）」専用で、ルーティングや認証の効果を持たないこと、不在時はバインドアドレスベースの URL になることが原文に明記されています。
- `openBrowser` は SSH 起動では抑止、`printUrl` / `surfaceContext` は非対話レイヤーが外せる、と、どこで効かなくなるかも doc コメントが述べています。
- `dsh-web` の2フィールドは `Volatile` 佩戴で、実行時の変更がそのまま次の検索・取得に効きます（再マウント不要）。

## 設定例

```yaml
- id: web-app
  name: '@deepseek-ai/dsh-web-app'
  config:
    openBrowser: true
    printUrl: true
    surfaceContext: true
    publicUrl: https://app.example/ui/   # 末尾 '/' に正規化される
```

`dsh-web` シームでプロバイダを固定する例（登録済みプロバイダ id を指定）:

```yaml
- id: web
  name: '@deepseek-ai/dsh-web'
  config:
    searchProvider: deepseek
    fetchProvider: deepseek
```

## 関連ページ

- [web CLI リファレンス](/reference/cli/web.md)
- プロバイダ側の設定は config-catalog の各 web-search 系セクション（`dsh-web-search-deepseek` / `dsh-web-search-exa` / `dsh-web-search-perplexity` / `dsh-web-fetch-http`）を参照。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-web-app
- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-web
- 元の型定義: `packages/web/web/src/index.ts` · `packages/bundle/web-app/src/index.ts`（`config-catalog.md` 生成時点）
