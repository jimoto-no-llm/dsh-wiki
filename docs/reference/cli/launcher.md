# DSH CLI ランチャー（`dsh`）

`dsh` コマンドは DSH でサポートされる唯一のアプリケーションランチャーです。プロファイルとは、「プラグインバンドルのパッチレイヤーを宣言された順序で積み、その上にユーザー自身の上書きを重ねた、順序付きの層のスタック」です。SDK と ACP は独立した公開バイナリではなく、プロファイルとして提供されます。

このページはランチャー本体の文法とオプションを扱います。サブモードの詳細は各専用ページを参照してください。

- [headless](/reference/cli/headless.md) — タスクを1つ実行して終了
- [web](/reference/cli/web.md) — ブラウザ UI
- [sdk-acp](/reference/cli/sdk-acp.md) — SDK / ACP サーバー
- [plugin](/reference/cli/plugin.md) — プラグイン管理
- [rescue-dump](/reference/cli/rescue-dump.md) — プロファイルの再作成と設定ダンプ
- [behaviors](/reference/cli/behaviors.md) — 終了コードなど共通のふるまい

## 文法

```text
Usage: dsh [--profile] ＼name］ [options] [app-args...]
       dsh plugin --profile ＼name］ ＼pnpm-args...］
```

ランチャー (`dsh --help`) のヘルプは、本体説明として次の内容を出力します。

```text
dsh: boot a DeepSeek Harness profile — an ordered stack of plugin-bundle patch
layers under your own overrides.
```

訳: DSH プロファイルを起動します。プロファイルは、あなた自身の上書きの下に積まれた、プラグインバンドルのパッチレイヤーの順序付きスタックです。

## 引数

| 引数 | 説明 |
| --- | --- |
| `args` | 起動したプロファイルのアプリ（app）に渡す引数。詳細は `dsh --profile ＼name］ --help` で確認できます |

## オプション

ヘルプに列挙されたランチャーのオプションの全量です。

| オプション | 説明 |
| --- | --- |
| `-V, --version` | バージョン番号を出力します |
| `--profile ＼name］` | `$DSH_HOME/profiles` 配下の指定したプロファイルを起動します |
| `--from-default-profile ＼name］` | カスタムプロファイルを、同梱プロファイルテンプレートの新しいコピーで置き換えます |
| `--patch ＼path］` | プロファイルレイヤーの後に適用する、追加のパッチリストオーバーレイ。繰り返し指定できます |
| `--dump-config` | 合成（compose）後のプロファイルツリーを出力して終了します |
| `--dump-config-schema` | マウントせずに、プロファイルエントリとパッチの JSON Schema を出力します |
| `--dump-default-config` | ユーザーレイヤーと `--patch` オーバーレイを含まないプロファイルツリーを出力して終了します |

## 実行例

ヘルプに記載された実行例は次のとおりです。

```text
dsh web                                   boot the web profile (same as: dsh --profile web)
dsh rescue --from-default-profile web
                                          recreate rescue from the shipped web template, then boot it
dsh headless "run the tests"              answer one task, print the result, and exit
dsh tui --patch ./extra.yml               boot a custom profile with one extra overlay
dsh tui --resume ＼session］                arguments after the launcher flags reach the app
dsh web --help                            the web app's own flags and help
dsh plugin --profile tui add ＼package］    install a plugin into the tui profile
```

## エントリーモード

| コマンド | 目的 |
| --- | --- |
| `dsh ＼name］` / `dsh --profile ＼name］` | `$DSH_HOME/profiles/＼name］` の指定プロファイルを起動します |
| `dsh --profile ＼name］ --from-default-profile ＼template］` | カスタムプロファイルを同梱テンプレートの新しいコピーで置き換えてから起動します |
| `dsh --profile acp` | ACP stdio で自動化クライアントにサービスを提供し、切断まで続けます |
| `dsh --profile headless "job"` | 新しい永続化セッションを1つ実行し、最終回答を出力して終了します |
| `dsh --profile sdk` | JSON-RPC stdio で SDK クライアントにサービスを提供し、シャットダウンまたは切断まで続けます |
| `dsh --profile sdk-minimal` | スタンドアロンの最小エージェントツリーで SDK クライアントにサービスを提供します |
| `dsh web` | Web プロファイルを起動します |
| `dsh plugin --profile ＼name］ <pnpm args>` | プロファイルディレクトリ内で pnpm に引数を転送し、プロファイルのプラグインを管理します |

## アプリ引数の受け渡し

ランチャーは自分自身のフラグだけを解析し、残りを起動したプロファイルへ渡します。ランチャーが認識できなかった最初のトークンから、アプリの引数が始まります。引数を受け取ったアプリ側では、注入された app プラグインが共有イミュータブルスナップショット（`dsh-cmdline`）を解析できます。

```sh
dsh --profile web --port 8080       # --port belongs to the web app
dsh --profile tui --resume ＼id］     # example, assuming the tui profile is installed; --resume belongs to the terminal app
dsh --profile headless "run the tests"
dsh --profile web --help            # the web app's flags, not the launcher's
dsh --help                          # the launcher's own help
```

`dsh web --help` のように `--help` を渡した場合も、それはアプリ自身のヘルプの表示になります。ランチャー自身のヘルプは `dsh --help` です。

## プロファイルの初期化

- 起動時のカレントディレクトリが、既定のワークスペースルートになります。
- `web`・`headless`・`sdk`・`sdk-minimal`・`acp` の各プロファイルは、初回使用時に同梱テンプレートから自動初期化されます。
- その他の（同梱でない）名前のプロファイルは、`--from-default-profile` で作成・リセットするか、`dsh plugin` 経由で初期化します。
- `desktop` という名前は Electron 所有のプロファイル向けに予約されており、CLI はこの名前への起動と設定ダンプを拒否します。

## 出典

本文は上流ドキュメントの該当記述の翻訳です。オプション名・使用例・原文の説明文はそのまま保存しています。

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cli-help.md
- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md
