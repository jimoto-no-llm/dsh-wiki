# プラグイン管理の詳細仕様

`dsh plugin` は、プロファイルディレクトリに置かれた pnpm へ残りの引数を転送し、プロファイルのプラグインを管理します。構文とオプション表は [plugin](./plugin.md) に譲り、この記事では上流 CLI 関係資料に書かれた深い挙動 — 初期化、転送とヘルプの解釈、バンドルスタックの調整（reconcile）、ロックと環境、対話ビルド承認、再起動の境界 — を表で扱います。

## コマンドの位置づけと初期化

| 項目 | 内容 |
| --- | --- |
| コマンド構文 | `dsh plugin --profile ＼name］ ＼args...］` |
| サブコマンド判定 | `plugin` は `dsh` の直後のときだけプラグイン管理を選ぶ。プロファイル選択後は `plugin` も `web` も通常のアプリ引数。plugin という名のプロファイルを起動するときは `dsh --profile plugin` |
| `--profile` の位置 | 転送引数より前にあるものだけを読む。転送引数は先頭の未知トークンから始まるため、`--profile ＼name］` を最初に書く |
| 初期化 | プロファイルが無ければ初期化する。同梱プロファイル名（web・headless・sdk・sdk-minimal・acp）は同梱テンプレートから、それ以外の名前は `@deepseek-ai/dsh-base` 単体で初期化する |
| 転送先 | `add`・`remove`・`why`・`update` をはじめ pnpm の動詞はそのまま効く。pnpm は PATH 上に必要 |

## ヘルプと pnpm オプションの解釈規則

| 引数の並び | `-h`・`--help` の表示内容 |
| --- | --- |
| 転送引数が始まる前 | 転送側（`dsh plugin`）自身のヘルプ。終了コード 0 で終わる |
| pnpm コマンド（`add`・`remove` など）の後 | 以降の引数は pnpm へ逐語転送されるため、pnpm のヘルプに届く |
| pnpm コマンドの前に pnpm オプション（`--filter ＼selector］` や `-r` など）が並び、その後で `-h` | pnpm ではなく転送側のヘルプが出る。pnpm のヘルプへ届けるときは pnpm コマンドを先に置く |

## 相対パス指定の起点

| 指定 | 扱い |
| --- | --- |
| `.` や `../plugin`、その `file:`・`link:` 形式の相対パス | まず呼び出し元ディレクトリにアンカーされる。プラグインのチェックアウトからの `add .` は、プロファイルではなくそのチェックアウトを導入する |
| `github:...` 形式の Git 指定 | Git ホストからそのまま導入できる（例は後述） |

## 成功後のバンドルスタック調整（reconcile）

成功した pnpm 操作の後に毎回、`dsh.profile.bundles` がインストール済みの状態に照らして調整されます。

| 依存パッケージの状態 | 調整内容 |
| --- | --- |
| 依存が解決して到達するパッケージのマニフェストに `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }` の宣言がある | レイヤースタックに参加する。`update` がこの宣言を獲得した場合も、その調整で有効になる |
| バンドル宣言の無い依存 | プレーンな依存のまま。1度限りの（one-time）警告を出す |
| 依存から削除されたパッケージ | レイヤースタックから離脱する |

## ロック・環境・対話ビルド承認

| 項目 | 内容 |
| --- | --- |
| ロックと操作の共有 | Plugin Manager はパッケージ操作とプロファイル書き込みロックを `dsh plugin` と共有する |
| disabled バンドル | パッケージ更新（`update`）でも無効化（disabled）されたバンドル選択は保持される |
| 認証変数 | CLI のパッケージコマンドは認証変数（authentication variables）を継承する |
| 端末 | 端末ディスクリプタも継承する。**対話ビルド承認（interactive build approval）を含む** |
| サービス呼び出し | それとは別に、消毒（scrub）済み環境と収集した診断情報を保持する |

## 再起動の境界 — 何が「次の起動から」効くか

| 変更対象 | 実効タイミング |
| --- | --- |
| バンドル構成（Bundle membership） | 次の起動からのみ反映で、動作中のプロファイルは現在の起動時点のバンドル集合を保つ。そのため add・remove・update のあとはプロファイルを再起動する |
| プロファイル／ホームの cordis.patch.yml の通常編集 | ホットリロード経由で反映する（dsh-hmr 有効時） |
| プロファイルマニフェスト | dsh-hmr はプロファイルマニフェストと両方の patch ファイルを1本の serialized reload で監視し、全レイヤーを再合成する |

この起動時境界はバンドルの「構成要素（membership）」に適用されます。バンドルが次回の起動で読み込むときのふるまいは次の通りです。

| 起動時の振る舞い | 内容 |
| --- | --- |
| Host provider 登録 | 次回の起動で導入済みの各バンドルは、休止状態（dormant）の Host provider だけを登録する |
| subagent ツール行 | コピーした Preset は、新しい Agent のために対応するツール行を別途有効化する必要がある |
| 細目 | 実行形式・認証・ペイロード・失敗の詳細は、各プロバイダーの README が管理する。既定の依存クロージャは base Bundle の参照が管理する |

## Git でホストされたプラグインとビルド承認

ソース付きの Git ホスト型プラグインは導入時に `prepare` スクリプトでビルドされます。pnpm 10 以上は消費者側が許可するまでビルド（prepare）実行を妨げるため、操作は次の流れになります。

| 段階 | 挙動 |
| --- | --- |
| 1回目の `add` | 失敗する。pnpm の `allowBuilds` ヒント（プロファイルの `pnpm-workspace.yaml` への dsh からの指し示しを添えて）が出る |
| 許可 | 出力に印字された鍵（key）をプロファイルの `pnpm-workspace.yaml` に写す |
| 再実行 | `add` をやり直す。ビルドが通る |
| 例外 | ビルド済み tarball やローカルチェックアウトの導入には許可（allowance）が不要 |

前節の通り、対話ビルド承認を含む端末ディスクリプタはパッケージコマンドへ継承されます。

## subagent バンドルのコマンド例

Codex と Claude Code の subagent プロバイダーは独立した任意バンドルで、片方ずつ・同時に両方・独立して削除まで自由です。

```sh
dsh plugin --profile ＼name］ add @deepseek-ai/dsh-subagent-codex
dsh plugin --profile ＼name］ add @deepseek-ai/dsh-subagent-claude-code
dsh plugin --profile ＼name］ add @deepseek-ai/dsh-subagent-codex @deepseek-ai/dsh-subagent-claude-code
dsh plugin --profile ＼name］ remove @deepseek-ai/dsh-subagent-codex
dsh plugin --profile ＼name］ remove @deepseek-ai/dsh-subagent-claude-code
```

## Git 指定の実行例

```sh
dsh plugin --profile tui add github:deepseek-harness/turtle-ui
dsh plugin --profile tui remove turtle-ui
dsh --profile tui
```

## `desktop` とバージョン互換

| 項目 | 内容 |
| --- | --- |
| npm CLI | `desktop` という名前（Electron 所有のプロファイル）へのプラグイン管理要求を拒否する。起動と設定ダンプの拒否と合わせて [rescue-dump](./rescue-dump.md) にもある |
| Desktop インストール版 | Desktop の carrier は、初期化済み Desktop プロファイルへのプラグイン操作を有効にする。導入パッケージ固有の環境はプラグインのパッケージ操作にのみ効く |
| バージョン検査 | 導入時とプロファイル起動時に、宣言された `engines.dsh` の範囲（無い場合は DSH peer 範囲）を `dsh --version` と同じランタイム版で検査する。互換の無いプラグインは、明示的に承認した正確な版の免除（exemption）を要求する |

免除申請の細粒度（`version-exemptions`・`allow-version`・`revoke-version`・保存とリスクなど）は、プラグインマネージャーの互換性参照が管理します。

## `dsh-mcp-client` の扱い

CLI はパッチレイヤーから使える依存パッケージとして `@deepseek-ai/dsh-mcp-client` を同梱します。ただし既定で有効になる MCP サーバーは無く、各サーバーコマンドはエージェントサンドボックスの外で動く信頼済み実行コードだからです。

## 関連ドキュメント

- 構文・オプション表は [plugin](./plugin.md)。バンドルのレイヤー合成順序は [behaviors](./behaviors.md)、起動は [launcher](./launcher.md)

## 出典

本文は上流ドキュメントの該当記述の翻訳です。オプション名・コマンド例・原文の説明文はそのまま保存しています。

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/reference/README.md
- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md
