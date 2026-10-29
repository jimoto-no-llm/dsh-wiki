# Web UI

Web UI は `dsh web` が配信するブラウザ版の操作画面です。サーバが起動して以降の手順をまとめます。

## 起動

```sh
npx @deepseek-ai/dsh web
dsh web --no-open        # ブラウザを開かず起動
dsh web --port 8080      # 別ポートで配信
```

起動時に URL が表示され、ローカル起動なら既定のブラウザで開きます。既定ポートは 3080 です。起動方法の詳細は[はじめに](./getting-started.md)と[CLI リファレンス](./cli.md)を見てください。

## Settings → Models で API キーを登録する

**Settings → Models** を開きます。

- **DeepSeek** カードには API キー欄が1つあり、入力して保存するだけです
- **Add model provider** で、同梱プロバイダ（`anthropic`, `openai`, `moonshotai` など）のキーを追加できます
- **Custom model API** では、リレーや社内ゲートウェイなど同梱にない接続先を Provider ID・Base URL・API プロトコル（`openai-completions` / `openai-responses` / `anthropic-messages`）・モデル一覧で登録します

キーは書き込み専用で、保存後に画面へ渡るのは秘匿化された表示だけです。値は `$DSH_HOME/.credentials.yaml` に保存され、設定側は参照だけを保持します。モデルの変更は次のリクエストから反映され、サーバの再起動は不要です。

## Choose workspace で作業ディレクトリを選ぶ

**Choose workspace** を開き、`dsh` を起動したプロジェクトディレクトリを追加して選択します。ワークスペースが選ばれるまで入力欄は使えません。

## セッションを開始する

ワークスペースを選択したら、新しいセッションを開始して指示を送れます。

> このリポジトリを要約して、主要なパッケージを挙げてください。

エージェントはファイルの読み書き、コマンド実行、作業の委譲、計画の管理を行います。有効な許可ポリシーで承認が必要な操作は、実行前に確認ダイアログが表示されます。

## 逆方向プロキシで公開する

`dsh --profile web` は既定でループバックのみに配信するため、他のマシンからは直接届きません。公開側（ホスト名・TLS・パス接頭辞）は逆方向プロキシ（reverse proxy）が持ち、DSH 側には公開 URL を伝えます。

```sh
dsh --profile web --public-url https://app.example/ui/ --trusted-host app.example
```

- `--public-url` は、印刷・起動時 URL、`DSH_WEB_URL`、エージェントのランタイムコンテキストに表示するアドレスを指定します（信頼は付与しません）
- `--trusted-host` は、`/api` のブラウザ信頼フェンスが受け付ける権威（host または host:port）を追加します。指定しないと API 呼び出しが 403 になります
- プロキシ側では、ブラウザ向けの `Host` を書き換えずに転送し、マウント接頭辞を剥がし、WebSocket のアップグレードヘッダと Cookie の範囲を扱います
- `--tls-cert` / `--tls-key` を渡せば、リスナー側で TLS を終端できます

`--public-url` と信頼設定は、待ち受けポートそのものを保護するものではありません。ポートは信頼できるプロキシやネットワークに限定してください。

## 出典

- [deepseek-ai/deepseek-harness: docs/user/guide/index.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/index.md)
- [deepseek-ai/deepseek-harness: docs/user/guide/providers.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/providers.md)
- [deepseek-ai/deepseek-harness: docs/user/guide/public-deployments.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/public-deployments.md)
- [deepseek-ai/deepseek-harness: docs/cli-help.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cli-help.md)
