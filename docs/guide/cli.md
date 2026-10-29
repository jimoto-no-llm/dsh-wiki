# CLI リファレンス

`dsh` は唯一の公式ランチャーで、プロファイルを起動して残りの引数をアプリに渡します。ヘルプ原文は上流の docs/cli-help.md にあります。

## 基本文法

```text
Usage: dsh [--profile] <name> [options] [app-args...]
       dsh plugin --profile <name> <pnpm-args...>
```

- `<name>` は `$DSH_HOME/profiles` 以下のプロファイル名です
- `[options]` はランチャー自身のオプションです
- `[app-args...]` は、起動したプロファイルのアプリへ渡されます

## ランチャーのオプション

| オプション | 意味 |
| --- | --- |
| `-V, --version` | バージョン番号を表示します |
| `-h, --help` | ランチャーのヘルプを表示します（`dsh --help`） |
| `--profile <name>` | 起動するプロファイルを指定します |
| `--from-default-profile <name>` | カスタムプロファイルを同梱テンプレートの新規コピーに置き換えて起動します |
| `--patch <path>` | プロファイル層の後に重ねる追加パッチを指定します（複数指定可） |
| `--dump-config` | 合成後のプロファイルツリーを表示して終了します |
| `--dump-config-schema` | エントリとパッチの JSON Schema を表示します（マウントしません） |
| `--dump-default-config` | ユーザー層と `--patch` を除いたプロファイルツリーを表示します |

## アプリ引数の渡し方

ランチャーは自分のフラグだけを解釈し、認識しなくなった最初のトークン以降をすべてアプリに渡します。つまり、`--port` のようなアプリ側のフラグもそのまま書けます。

```sh
dsh --profile web --port 8080       # --port は web アプリの引数
dsh --profile web --host 10.0.0.7   # バインド先アドレスも web アプリの引数
dsh --profile tui --resume <id>     # --resume はターミナルアプリの引数（tui が入っている場合）
dsh --profile web --help            # web アプリのフラグのヘルプ
dsh --help                          # ランチャー自身のヘルプ
```

Web UI を別ポートで配信する例は `dsh --profile web --port 8080` です。

## 主な起動パターン

| 指定 | 動き |
| --- | --- |
| `dsh <name>` / `dsh --profile <name>` | プロファイルを起動します |
| `dsh plugin --profile <name> <pnpm args>` | プロファイルのプラグインを pnpm 経由で管理します |
| `dsh --profile acp` | ACP の stdio でクライアントに応答します |
| `dsh --profile headless [task...]` | タスクを1件実行して終了します |
| `dsh --profile sdk` / `sdk-minimal` | SDK クライアントへ JSON-RPC で応答します |
| `dsh web` | Web プロファイルを起動します |

`headless` の代表的な使い方は次のとおりです。

```sh
dsh --profile headless "run the tests"          # 回答を標準出力へ
echo "run the tests" | dsh --profile headless   # タスクを標準入力から
dsh --profile headless --json "run the tests"   # 実行イベントを JSON で出力
```

## ヘルプの見方

| 入力 | 表示される内容 |
| --- | --- |
| `dsh --help` | ランチャーの文法とオプション |
| `dsh web --help` / `dsh --profile web --help` | Web アプリ自身のフラグ（`--host`, `--port`, `--public-url` など） |
| `dsh plugin --help` | プラグイン管理サブコマンドのヘルプ |
| `dsh headless --help` ほか各モード | そのモード固有のオプション（`--json`, `--session-id` など） |

## 終了コード

無効なコマンド、別モードのオプション、致命的な設定・起動の失敗は、いずれもゼロ以外で終了します。

## 出典

- [deepseek-ai/deepseek-harness: docs/cli-help.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cli-help.md)
- [deepseek-ai/deepseek-harness: apps/cli/README.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md)
