# 設定

DSH の設定は、プロファイルごとのパッチ層と credential ファイルに分かれます。まず置き場所を押さえ、必要な項目は生成済みの設定カタログで確認できます。

## 設定ファイルの置き場所

`$DSH_HOME` は環境変数で指定し、未設定なら `~/.dsh` です。

| 場所 | 保存されるもの |
| --- | --- |
| `$DSH_HOME/.credentials.yaml` | API キーなどの認証情報（書き込み専用。設定側は参照だけ保持） |
| `$DSH_HOME/cordis.patch.yml` | 全プロファイル共通のユーザー レイヤー |
| `$DSH_HOME/profiles/<name>/cordis.patch.yml` | プロファイル固有のユーザー レイヤー |
| `$DSH_HOME/profiles/<name>/package.json` | プラグイン依存と `dsh.profile.bundles`（バンドルの選択と順序） |
| `$DSH_HOME/profiles/<name>/compatibility.json` | バージョン互換性の例外 |
| `$DSH_HOME/AGENTS.md` | ユーザー全体に効く指示ファイル（agent-instructions が読み込み） |
| `--patch <path>` | 起動ごとに渡す追加オーバーレイ |

## 合成の順序

設定ツリーは、空のルートに次の順で合成されます。

1. `dsh.profile.bundles` の各バンドルのパッチ
2. `$DSH_HOME/profiles/<name>/cordis.patch.yml`
3. `$DSH_HOME/cordis.patch.yml`
4. `--patch` オーバーレイ

後ろの層ほど優先します。詳しくは[プロファイル](./profiles.md)を見てください。

## 合成結果を確かめる

起動せずに結果を確認できます。

```sh
dsh --profile web --dump-config            # 合成後の全体
dsh --profile web --dump-default-config    # ユーザー層と --patch を除く
dsh --profile web --dump-config-schema     # エントリとパッチの JSON Schema
```

`--dump-config-schema` は、マウントせずに設定スキーマだけを出力します。信頼できないプラグインを扱うときは、[CLI 行動リファレンスの schema-dump 節](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/reference/README.md#config-schema-dump)を先に読んでください。

## 設定カタログの概観

個々の設定項目は [docs/config-catalog.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md) にまとまっています。このファイルはソースから生成され、次を確認できます。

- パッケージごとの `config:` ブロックで指定できる全フィールド（JSDoc つきの型宣言そのまま）
- `inject`（そのプラグインが要求するサービス）、`refs`（型の参照先）、`source`（宣言元ファイル）
- モデルに公開されるツールの入力スキーマは[ツールカタログ](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/tool-catalog.md)、実装の解説は[サブシステム各ページ](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/README.md)が持ちます

たとえばプロバイダ周りを設定する `dsh-llm-pi-ai` は、[カタログの該当セクション](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-llm-pi-ai)、MCP クライアントは [`dsh-mcp-client` のセクション](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-mcp-client)が該当します。

## Web UI から編集する

**Settings → Models** の画面は、同じ `cordis.patch.yml` に書き込みます。**Open configuration file**（Settings のヘッダー）でファイルを開けるのは、ブラウザとサーバが同じマシンのときです。アダプタは次のリクエストで再読み込みするため、再起動は不要です。

## 出典

- [deepseek-ai/deepseek-harness: docs/config-catalog.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md)
- [deepseek-ai/deepseek-harness: docs/user/guide/providers.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/providers.md)
- [deepseek-ai/deepseek-harness: docs/user/guide/mcp-memory.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/mcp-memory.md)
- [deepseek-ai/deepseek-harness: apps/cli/README.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md)
- [deepseek-ai/deepseek-harness: docs/upgrade-guide/v0.2.1-alpha.1/instruction-home-override/guide.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/upgrade-guide/v0.2.1-alpha.1/instruction-home-override/guide.md)
