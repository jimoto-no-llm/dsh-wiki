# プラグイン管理

DSH は「すべてがプラグイン」な構成で、プロファイルは同梱バンドルのパッチ層を順に重ねたものです。プラグインの追加・削除は、CLI の `dsh plugin`、Web の Plugins ページ、エージェントの `plugin_manager` ツールの3経路で行えます。

## `dsh plugin` コマンド

書式は次のとおりで、残りの引数はそのまま pnpm に渡され、プロファイルディレクトリで実行されます。

```sh
dsh plugin --profile <name> <pnpm-args...>
```

代表的な例は次です。

```sh
dsh plugin --profile tui add <package>     # プラグインを追加
dsh plugin --profile tui remove <package>  # プラグインを削除
dsh plugin --profile tui why <package>     # なぜ入っているか確認
```

- 対象プロファイルは初回使用時に初期化されます
- `pnpm` はこの管理コマンドのときだけ必要で、通常の起動には要りません
- ロックと書式は Web 側のプラグイン管理と同じ仕組みを使い、並行実行からファイルを守ります

## Web とツールからの管理

Web UI のサイドバーには **Plugins** ページがあり、バンドルの有効化・無効化・追加・削除を画面から行えます。設定（Settings）側のプラグイン一覧は参照専用です。エージェントからは `plugin_manager` ツールで同じ操作ができ、Creator モードでのみ既定で有効です。ツールの実行には `danger-full-access` か、その呼び出しごとの承認が要ります。

## `cordis.patch.yml`（ユーザー レイヤー）

プロファイル編集はすべて `$DSH_HOME/profiles/<name>/cordis.patch.yml` に記録されます。

- トグル操作は、既存のオーバーレイの `disabled` を書き換え、なければ追記します
- バンドルと残りのパッチが既に望みどおりの状態なら、差分は書き込まれません
- 無効化は依存を残したまま選択だけを外し、有効化はバンドルを末尾に追加します（優先順位が変わる場合があります）
- 全プロファイル共通の `$DSH_HOME/cordis.patch.yml` も、プロファイル層より後（上書き側）に適用されます

## HMR（`dsh-hmr`）

`dsh-hmr` を YAML で有効化していると、プロファイルマニフェストと、プロファイル・ホーム両方のパッチファイルを監視し、変更を直ちに合成し直します。有効化していない設定変更は、再起動するまで反映されません。

監視の調整は `@deepseek-ai/dsh-hmr` の設定で行います。

| フィールド | 意味 |
| --- | --- |
| `root` | 監視するモジュールルート（空なら明示的な設定監視のみ） |
| `debounce` | モジュール変更をまとめる待機時間（ミリ秒） |
| `ignored` | 監視から除外する glob |
| `base` | 所有コンテキストの base URL に対する基準ディレクトリ |

## バージョン互換性

- インストール時と起動時、`package.json` の `engines.dsh` 範囲（なければ DSH ピア依存の範囲）が、`dsh --version` の実行時バージョンに対して検証されます
- 不一致のプラグインは、明示的に承認した「厳密なバージョンの組み合わせ」だけ例外として通ります
- 例外はプロファイル直下の `compatibility.json` に、`パッケージ名@バージョン` → DSH 実行バージョンのリストとして保存されます。依存も選択もパッチ層も変更しません
- プラグイン更新でも DSH 更新でも、許可は引き継がれません。例外は依存スクリプトの実行も許可しません

CLI では次の3つで管理します。

```sh
dsh plugin --profile <profile> version-exemptions
dsh plugin --profile <profile> allow-version <package@version> --dsh-version <runtime> --accept-risk
dsh plugin --profile <profile> revoke-version <package@version> --dsh-version <runtime>
```

`allow-version` は保存前にリスク警告を表示します。互換性エラー（`incompatible-version`）が出たとき、CLI はそのまま実行できる `allow-version` のコマンドを表示します。例外を使うと、非互換プラグインによるクラッシュやデータ破損のリスクを自分で負うことになります。

## 出典

- [deepseek-ai/deepseek-harness: packages/boot/plugin-manager/README.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/plugin-manager/README.md#version-compatibility-and-exemptions)
- [deepseek-ai/deepseek-harness: apps/cli/README.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md)
- [deepseek-ai/deepseek-harness: docs/cli-help.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cli-help.md)
- [deepseek-ai/deepseek-harness: docs/config-catalog.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md)
