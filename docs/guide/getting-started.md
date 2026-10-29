# はじめに

DSH（DeepSeek Harness）は、DeepSeek AI が開発するオープンソースのエージェントハーネスです。「すべてがプラグイン」な構成で、Cordis というフレームワークの上に成り立ちます。コマンドは `dsh` で、代表的な入口がブラウザの Web UI です。

::: info このサイトは非公式です
本ページはコミュニティ作成の日本語Wikiであり、DeepSeek / DeepSeek Harness の公式ドキュメントではありません。公式情報は [github.com/deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) を参照してください。また、DSH は開発者プレビュー（developer preview）段階で、互換性を壊す変更が入ります。
:::

## 起動する

Node.js を入れたうえで、次を実行します。

```sh
npx @deepseek-ai/dsh web
```

- 既定で `http://127.0.0.1:3080` に Web UI を配信します
- ローカル起動なら既定のブラウザで開き、SSH 経由なら URL の表示のみです
- `--no-open` を付けるとブラウザを開かず、サーバだけ起動します

起動オプションは [CLI リファレンス](./cli.md)にまとめています。ソースから起動する手順は上流 README の Run 節を見てください。

## 初回セットアップ

初回は次の3段階です。

### 1. モデルを設定する

**Settings → Models** を開き、[DeepSeek API キー](https://platform.deepseek.com/)を入力して保存します。保存した時点でモデル経路が使えるようになり、サーバの再起動は不要です。他社プロバイダや OpenAI 互換エンドポイントの追加も同じ画面で行えます（[Web UI](./web.md)参照）。

### 2. ワークスペースを選ぶ

**Choose workspace** を開き、`dsh` を起動したプロジェクトディレクトリを追加して選択します。ワークスペースが未選択のあいだは入力欄が使えないため、この操作が先に必要です。

### 3. タスクを実行する

新しいセッションを開始し、次のような指示を送ります。

> このリポジトリを要約して、主要なパッケージを挙げてください。

エージェントはワークスペースの読み書き、コマンド実行、作業の委譲、計画の管理ができます。許可ポリシー（permission policy）に従って必要な操作は、実行前に確認が表示されます。

## 次に読む

- [プロファイル](./profiles.md) — 起動モードと設定の単位
- [CLI リファレンス](./cli.md) — 起動文法とオプション
- [Web UI](./web.md) — 画面の使い方
- [設定](./config.md) — 設定ファイルの場所

## 出典

- [deepseek-ai/deepseek-harness: README.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md)
- [deepseek-ai/deepseek-harness: docs/user/guide/index.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/index.md)
- [deepseek-ai/deepseek-harness: docs/user/guide/providers.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/providers.md)
