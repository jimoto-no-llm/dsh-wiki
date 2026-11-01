# rdsh とデスクトップ

`rdsh` と DeepSeek Harness Desktop（Electron）アプリの連携方法を説明します。

## アプリの性質

Desktop アプリは、dsh Web アプリケーション全体を内包した Electron シェルで、macOS と Windows x64 向けに native 出荷されます。CLI と `$DSH_HOME`（セッション・設定・資格情報・ワークスペース）を共有しますが、実行パッケージ・プラグイン起動・ロックファイルは予約済みプロファイル `$DSH_HOME/profiles/desktop` に分かれており、独自の Node/Electron ランタイムとコマンド（`resources/runtime/cli/bin/dsh`）を同梱します。npm の `dsh` CLI はこのプロファイルを管理できず、`rdsh --profile desktop` も「Electron アプリ専用」として既定で exit 2 になります。rdsh が desktop プロファイルを起動したり直接書き換えたりすることはありません。

## 連携コマンド

```sh
rdsh desktop status                 # アプリ・コマンドランタイム・プロファイル・プラグインの状態（読み取り専用）
rdsh desktop install --plugins-dir .   # rdsh-settings と rdsh-mobile-ui（スマホ幅レイアウト）を組み込み
rdsh desktop install --plugins-dir . --compute   # 常駐 compute bridge（rdsh-compute）も追加
rdsh desktop verify                 # プロファイルに rdsh プラグインがなければ 0 以外で終了
```

導入手順は「1回アプリを起動して終了」「プラグイン attach」「アプリ再起動後に verify」です。実際の追加はアプリ自身のコマンド（`dsh plugin --profile desktop add ＼package］`）で行われ、共有プロファイルの書き込みロック・バージョン互換チェック・バンドル起動はアプリのプラグインマネージャと共有されます。

プロファイルインストーラーでも同様に使えます：

```sh
PROFILE=desktop ./plugins/install.sh   # 推奨パッケージを転送して導入（rdsh がなければ手動手順を表示）
./install.sh --desktop                 # インストール時に rdsh プラグインを組み込み
```

アプリ内の Plugins 画面からは、コマンドなしで同じパッケージ（レジストリ名・git URL・rustdsh チェックアウトの絶対パス）をインストールできます。

## プラグインがもたらす機能

| プラグイン | アプリ内の効果 | ゲート |
| --- | --- | --- |
| `rdsh-settings` | 設定画面の rdsh セクション、Discord Rich Presence、context-engine スイッチ | 既定 |
| `rdsh-mobile-ui` | スマホ幅の Web レイアウト（チャット全幅・セッション一覧のワンタップ表示） | 既定 |
| `rdsh-compute` | トークン見積り・prune の常駐 compute worker | `rdsh features on compute`（既定 off） |

compute bridge は純粋な文字列処理のみ、入力上限 1 MiB、タイムアウト 5 秒、エラー時は JavaScript 実装へフォールバックします。

## 安全上のルールと注意

- `status` / `verify` は読み取り専用。変更するのは `install` だけで、直接は何も書かずアプリ自身のコマンドへ転送します。
- Electron ランタイムや署名チェーンは置き換えないため、アプリ内の処理委譲はオプトインかつフェイルオープンの compute bridge に限定されます。
- プラグイン組み込みの前にアプリを終了し、完了後に再起動します。`install` は `SingletonLock` を検知すると警告します（ヒントであり保証ではありません）。
- compute bridge はテキストとオプションだけを運び、資格情報の送信は行いません。

## 検証状況

標準外のインストール場所では `DSH_DESKTOP_APP_DIR`、転送先コマンドの指定には `DSH_DESKTOP_CLI`（検出より優先）、rustdsh チェックアウトの場所には `RDSH_PLUGINS_DIR`、プラグインが使う rdsh 実行ファイルには `RDSH_BIN` を使えます。

この文書の検証は Linux ホスト上の単体テスト・stub コマンドによる統合テストにとどまり、実 Desktop アプリでの総合実行（macOS・Windows x64 向け出荷のため）は未検証と明記されています。

## 出典

- <https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/DESKTOP-INTEGRATION.md>
- <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
