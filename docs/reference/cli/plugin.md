# CLI plugin（`dsh plugin`）

`dsh plugin` は、プロファイルのプラグインを管理するサブコマンドです。残りの引数を、プロファイルディレクトリ内で pnpm にそのまま転送します。

## 文法

```text
Usage: dsh plugin [options] [args...]
```

ヘルプの説明文:

```text
manage a profile's plugins by forwarding the remaining arguments to pnpm in the
profile directory
```

訳: プロファイルディレクトリ内で残りの引数を pnpm に転送し、プロファイルのプラグインを管理します。

## 引数

| 引数 | 説明 |
| --- | --- |
| `args` | pnpm の引数。そのまま転送されます（`add ＼pkg］`、`remove ＼pkg］`、`why ＼pkg］` など） |

## オプション

ヘルプに列挙されたオプションの全量です。

| オプション | 説明 |
| --- | --- |
| `--profile ＼name］` | プラグインを管理する対象のプロファイル（初回使用時に初期化されます） |
| `-h, --help` | このヘルプを表示します |

## 実行例

ランチャーのヘルプに記載された実行例です。

```text
dsh plugin --profile tui add ＼package］    install a plugin into the tui profile
```

### 対象プロファイルの中身

管理対象のプロファイルディレクトリには次が置かれます。

- `package.json` — ツリー外プラグインの依存関係と、順序付き `bundles` リストを持つプロファイルマニフェスト `dsh.profile`
- `cordis.patch.yml` — ユーザー自身のパッチレイヤー

pnpm がインストールしたツリー外プラグインは、プロファイル自身の `node_modules` に置かれます。全体のレイヤー合成順序は [behaviors](/reference/cli/behaviors.md) を参照してください。
## ふるまいの要点

- `web`・`headless`・`sdk`・`sdk-minimal`・`acp` 以外のベースに紐づくプロファイルは、`dsh plugin` 経由でも初期化できます。
- プラグイン管理は Plugin Manager とパッケージ操作とプロファイルの書き込みロックを共有します。パッケージ更新は、無効化されたバンドル選択を保持します。
- CLI のパッケージコマンドは、認証変数と端末ディスクリプタ（対話的なビルド承認を含む）を継承します。サービス呼び出しは、消毒（スクラブ）済みの環境と取り込まれた診断情報を保持します。
- `desktop` プロファイルへのプラグイン管理要求は、npm CLI では拒否されます。Desktop インストール版のコマンドは、そのインストール固有のランタイムを使って、初期化済み Desktop プロファイルを管理できます。
- ランチャーとプロファイル全体の構成は [launcher](/reference/cli/launcher.md)、共通のふるまいは [behaviors](/reference/cli/behaviors.md) を参照してください。

## 出典

本文は上流ドキュメントの該当記述の翻訳です。オプション名・使用例・原文の説明文はそのまま保存しています。

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cli-help.md
- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md
