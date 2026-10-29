# プロファイル

プロファイルは「同梱バンドルのパッチ層を順に重ねた構成」で、DSH の起動単位です。どのモードで起動するか、どのプラグインを入れるかはプロファイルごとに決まります。

## 保存場所と構成要素

プロファイルは `$DSH_HOME/profiles/<name>` に1つずつ作られます。`$DSH_HOME` は環境変数で指定し、未設定なら `~/.dsh` です。

| ファイル | 内容 |
| --- | --- |
| `package.json` | プロファイル外プラグインの依存と、プロファイルマニフェスト `dsh.profile`（バンドルの順序リスト `bundles`） |
| `cordis.patch.yml` | 利用者自身のパッチ層（ユーザー レイヤー） |
| `compatibility.json` | バージョン互換性の例外（許可した組み合わせ） |

同梱の5モード（`web` / `headless` / `sdk` / `sdk-minimal` / `acp`）は、初回に同梱テンプレートから自動で初期化されます。それ以外の名前は `--from-default-profile` で作成するか、`dsh plugin` の初期化で用意します。

## 起動方法

プロファイル名は `dsh` の直後に置くか、`--profile` で指定します。どちらも同じ意味です。

```sh
dsh web
dsh --profile web
dsh --profile headless "run the tests"
```

## 起動モード一覧

| コマンド | モード | 用途 |
| --- | --- | --- |
| `dsh web` | web | ブラウザの Web UI を配信します（既定ポート 3080） |
| `dsh --profile headless "job"` | headless | タスクを1件実行して回答を標準出力に出し、終了します |
| `dsh --profile sdk` | sdk | SDK クライアントへ stdio の JSON-RPC で応答します |
| `dsh --profile sdk-minimal` | sdk-minimal | 最小構成のエージェントツリーで SDK 応答をします |
| `dsh --profile acp` | acp | 自動化クライアントへ ACP（Agent Client Protocol）の stdio で応答します |
| `dsh --profile desktop` | desktop | 予約名です。Electron が所有するプロファイルで、CLI は起動と設定ダンプを拒否します |

SDK と ACP は独立したコマンドではなく、あくまでプロファイルです。

## `desktop` は予約名

`desktop` は Desktop 版が所有するプロファイル名のため、CLI からは起動・設定ダンプのリクエストが拒否されます。npm 版の CLI はプラグイン管理のリクエストも拒否し、Desktop が同梱したコマンドだけが初期化済みの Desktop プロファイルを管理できます。

## 同梱テンプレートから作り直す

`--from-default-profile` は、カスタマイズ済みのプロファイルを同梱テンプレートの新規コピーで置き換えてから起動します。壊れたプロファイルの復旧にも使いますが、既存の内容は置き換えられます。

```sh
dsh rescue --from-default-profile web
```

上記は `rescue` という名前のプロファイルを `web` テンプレートで作り直して起動する例です。

## 合成される順序

プロファイルの設定ツリーは、空のルートに次の順で重なります。

1. `dsh.profile.bundles` に並んだ各バンドルのパッチ
2. プロファイルの `cordis.patch.yml`
3. 全プロファイル共通の `$DSH_HOME/cordis.patch.yml`
4. 起動時に渡した `--patch` オーバーレイ

起動せずに結果を確かめるには `--dump-config`（合成後の全体）、`--dump-default-config`（ユーザー層と `--patch` を除く）、`--dump-config-schema`（JSON Schema）を使います。

## 出典

- [deepseek-ai/deepseek-harness: apps/cli/README.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md)
- [deepseek-ai/deepseek-harness: docs/cli-help.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cli-help.md)
- [deepseek-ai/deepseek-harness: README.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md)
