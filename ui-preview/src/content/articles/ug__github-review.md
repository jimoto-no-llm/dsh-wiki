---
title: "GitHub Web フックからレビュー セッションを作る"
desc: "dsh web に実験的なオーバーレイを入れると、署名付きの GitHub エンドポイントが追加されます。設定したリポジトリの PR がドラフトから ready for revie"
cat: "ug"
catLabel: "移行"
chars: 3302
slug: "ug/github-review"
---

# GitHub Web フックからレビュー セッションを作る

`dsh web` に実験的なオーバーレイを入れると、署名付きの GitHub エンドポイントが追加されます。設定したリポジトリの PR がドラフトから ready for review に変わると、そのリポジトリの Web ワークスペース配下にタイトル付きのルート セッションを作り、読み取り専用のレビュー プロンプトで開始します。

## 前提条件

| 前提 | 内容 |
| --- | --- |
| ワークスペース | DSH が Web ワークスペースとして登録できるローカル チェックアウト |
| シークレット | 高エントロピーの GitHub Web フック シークレット（`DSH_GITHUB_WEBHOOK_SECRET` の credential 参照で渡す） |
| 公開経路 | 公開 URL をループバックのリスナーへ転送する TLS リバース プロキシまたはトンネル |
| Web フック購読 | Pull requests イベント、content type は `application/json` |

オーバーレイの既定値はワークスペースが起動ディレクトリ、リスナーが `127.0.0.1:3081` です。`DSH_GITHUB_REVIEW_WORKSPACE` と `DSH_GITHUB_WEBHOOK_PORT` で上書きできます。

## 起動までの手順

1. シークレットを生成し、再起動しても同じ値を保ちます。

```sh
export DSH_GITHUB_WEBHOOK_SECRET="$(openssl rand -hex 32)"
printf '%s\n' "$DSH_GITHUB_WEBHOOK_SECRET"
```

2. 実験的パッケージ2つを先に Web プロファイルへ入れます。プロファイルは peer を自動導入しないため、GitHub アダプタは Web フック ランタイムを明示的に要します。

```sh
dsh plugin --profile web add @deepseek-ai/dsh-webhook @deepseek-ai/dsh-webhook-github
export DSH_GITHUB_REVIEW_WORKSPACE=/path/to/deepseek-harness
dsh web --patch "$DSH_HOME/profiles/web/node_modules/@deepseek-ai/dsh-webhook-github/examples/github-review/cordis.yml"
```

3. 例の `cordis.yml` はプロファイルの導入ディレクトリ、例で言う `$DSH_HOME/profiles/web/node_modules/` 配下から読まれます。これはルール モジュールがプロファイルに導入済みの peer を解決するためで、プロファイル外の任意ディレクトリからルールを実行しないでください。カスタマイズするときは例の2ファイルを `$DSH_HOME/profiles/web/github-review/`（`$DSH_HOME` 未設定なら `~/.dsh`）へコピーし、設定を編集して `--patch` をそのコピーへ向けます。

4. 専用エンドポイントを公開します。本体の Web UI と `/api` はポート 3080 のまま残り、オーバーレイは独立 realm に 2 台目の WebServer を挿して `POST /github` だけを登録し、他のパスは `404` を返します。Caddy ならリスナーだけを公開できます。

```caddyfile
hooks.example.com {
  route {
    @github path /github
    reverse_proxy @github 127.0.0.1:3081
    respond 404
  }
}
```

5. GitHub 側の Web フックを設定します。

| 項目 | 値 |
| --- | --- |
| Payload URL | `https://hooks.example.com/github` |
| Content type | `application/json` |
| Secret | `DSH_GITHUB_WEBHOOK_SECRET` の値 |
| Events | `Pull requests` |
| Active | yes |

## ルールの挙動

受け付けは厳しく絞られています。

| 受け付け条件 | 値 |
| --- | --- |
| source | `primary-github` |
| repository | `deepseek-ai/deepseek-harness` |
| event | `pull_request` |
| action | `ready_for_review` |

ルールは正確な head SHA と選択された PR フィールドをレビュー プロンプトへ渡します。その JSON は「信頼できないメタデータ」として明示され、ファイル・ブランチ・PR・GitHub への変更は禁止します。セッション要求は `standard` エージェント プリセットと `read-only` 権限プリセットを選び、`workspacePath` は `WorkspaceRegistry.create()` で正規化されます。最初に一致した配信がワークスペースを無ければ作り、以後の配信はそれを再利用します。

HTTP 応答はエージェントの結果より意図的に弱いです。

| 応答 | 意味するもの |
| --- | --- |
| `202` | 署名と JSON を受領し、ルール呼び出しをメモリ上で予約した。ルールがマッチしたこと、セッションが作られたことは保証しない |

## プログラマブルな拡張

`run()` は普通の信頼できる JavaScript です。デプロイはエージェントの Session 要求を返す前に内部のポリシー サービスへ問い合わせられます。ルールはリポジトリごとに別のローカル パスへ写像することもでき、写像先が無ければ `null` を返してセッションを作りません。

## 注意

- Web フック ランタイムは配信や実行の状態を保存しません。同じ配信が繰り返されてもルールを実行し、別のセッションを作ることがあります。プロンプトをまだ受理していないルール呼び出しはクラッシュで失われます。プロンプト受理後は、通常のセッション ログ・永続化・ワークスペース・エージェントのライフサイクルが作業を引き受けます
- Web フック シークレットは入ってくる GitHub データの認証だけを担います。ルール コードや作られたエージェントに外向きの GitHub 権限は与えません。ルールやエージェントにその権限が必要なら、別途設定してください
- CLI は Web フック パッケージを導入せず、公式プラグインの一覧にも載せません。パッケージの導入とオーバーレイの適用は別々の手順です
- CLI リポジトリ側の例は `packages/experimental/webhook-github/examples/github-review/` 配下に置かれています

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/github-review.md
