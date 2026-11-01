# CLI sdk・sdk-minimal・acp

DSH では SDK と ACP は独立した公開バイナリではなく、プロファイルとして提供されます。どちらも stdio ベースのサーバーとして動作し、クライアントの切断まで（SDK はシャットダウンまで）続けます。

- [sdk](#dsh-sdk) — SDK クライアント向け JSON-RPC サーバー
- [sdk-minimal](#dsh-sdk-minimal) — スタンドアロンの最小エージェントツリーで動く SDK サーバー
- [acp](#dsh-acp) — 自動化クライアント向け Agent Client Protocol サーバー

Python 向け実行ランタイムの wheel パッケージは、この同じ `dsh` コマンドを同梱します。SDK の既定は `sdk` プロファイルで、最小構成のサンプルは `sdk-minimal` を選択します。


## `dsh sdk`

同じヘルプが `dsh sdk --help` と `dsh --profile sdk --help` のどちらでも表示されます。

```text
Usage: dsh --profile sdk [options]

Serve DeepSeek Harness SDK clients over stdio JSON-RPC.

Options:
  -h, --help  show this help

Example:
  dsh --profile sdk     serve one SDK runtime until its client disconnects
```

訳: stdio JSON-RPC で DeepSeek Harness SDK クライアントにサービスを提供します。例は「1つの SDK ランタイムを、クライアントが切断するまで提供する」です。


## `dsh sdk-minimal`

同じヘルプが `dsh sdk-minimal --help` と `dsh --profile sdk-minimal --help` のどちらでも表示されます。

```text
Usage: dsh --profile sdk-minimal [options]

Serve DeepSeek Harness SDK clients over stdio JSON-RPC.

Options:
  -h, --help  show this help

Example:
  dsh --profile sdk-minimal     serve one SDK runtime until its client disconnects
```

`sdk` との差分そのものはヘルプ上に現れませんが、ランチャーのヘルプでは `sdk-minimal` は「スタンドアロンの最小エージェントツリー」と説明されています。


## `dsh acp`

同じヘルプが `dsh acp --help` と `dsh --profile acp --help` のどちらでも表示されます。

```text
Usage: dsh --profile acp [options]

Serve automation clients over Agent Client Protocol stdio.

Options:
  -h, --help  show this help

Example:
  dsh --profile acp     serve ACP until the client disconnects
```

訳: Agent Client Protocol（ACP）の stdio で自動化クライアントにサービスを提供します。例は「クライアントが切断するまで ACP を提供する」です。

## ふるまいの要点

- `sdk`・`sdk-minimal`・`acp` の各プロファイルは、初回使用時に同梱テンプレートから自動初期化されます（[behaviors](/reference/cli/behaviors.md)）。
- `sdk` は JSON-RPC stdio で SDK クライアントにサービスを提供し、シャットダウンまたは切断まで続きます（[launcher](/reference/cli/launcher.md) のエントリーモード表）。
- 起動時のカレントディレクトリが既定のワークスペースルートになります（[behaviors](/reference/cli/behaviors.md)）。

## 出典

本文は上流ドキュメントの該当記述の翻訳です。オプション名・使用例・原文の説明文はそのまま保存しています。

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cli-help.md
- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md
