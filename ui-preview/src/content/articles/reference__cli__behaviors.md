---
title: "CLI の共通挙動（終了コード・レイヤー・初期化）"
desc: "このページは、dsh CLI のサブモード（headless / web / sdk / plugin など）に共通するふるまいをまとめます。出典は上流の CLI ヘルプと CLI"
cat: "cli"
catLabel: "CLI リファレンス"
chars: 2266
slug: "reference/cli/behaviors"
---

# CLI の共通挙動（終了コード・レイヤー・初期化）

このページは、`dsh` CLI のサブモード（headless / web / sdk / plugin など）に共通するふるまいをまとめます。出典は上流の CLI ヘルプと CLI README です。

## ワークスペースルート

起動したディレクトリ（コマンドを実行したカレントディレクトリ）が、既定のワークスペースルートになります。

## プロファイルの自動初期化

- `web`・`headless`・`sdk`・`sdk-minimal`・`acp` の5つのプロファイルは、初回使用時に同梱テンプレートから自動初期化されます。
- その他の名前のプロファイルは、`--from-default-profile` で作成・リセットするか、`dsh plugin` 経由で初期化します。
- `desktop` という名前は Electron 所有のプロファイル向けに予約されており、CLI はこの名前への起動（boot）と設定ダンプ（config-dump）を拒否します。
- npm フローの CLI は `desktop` プロファイルへのプラグイン管理要求も拒否します（Desktop インストール版コマンドのみ管理可）。

## プロファイルディレクトリの内容

プロファイルディレクトリには次が置かれます。

- `package.json` — ツリー外プラグインの依存関係と、順序付き `bundles` リストを持つプロファイルマニフェスト `dsh.profile`
- `cordis.patch.yml` — ユーザー自身のパッチレイヤー

## レイヤーの合成順序

プロファイルツリーは、空のルートの上に次の順で合成されます。

1. `dsh.profile.bundles` の順序で、各バンドルのパッチ
2. プロファイルの `cordis.patch.yml`、続いてホームレベルの `$DSH_HOME/cordis.patch.yml`
3. `--patch` オーバーレイ

`dsh.profile.bundles` に列挙されたバンドルは、まず dsh インストール側のパッケージで解決され、次にプロファイル自身の `node_modules`（pnpm がツリー外プラグインをインストールする場所）で解決されます。

## 終了コード

次のケースでは非ゼロで終了します。

- 無効なコマンド（invalid commands）
- 他のモードのオプション（options from another mode）の指定
- 致命的な設定または起動の失敗（fatal configuration or boot failures）

## バージョン互換性

インストール時とプロファイル起動時には、宣言された `engines.dsh` の範囲（存在しない場合は DSH peer ranges）が、`dsh --version` が表示する同一のランタイムバージョンに対して強制されます。互換性のないプラグインには、明示的に承認された完全一致バージョンの免除（exact-version exemption）が必要です。`version-exemptions`・`allow-version`・`revoke-version`・永続化・リスクの詳細は、上流のプラグインマネージャー互換性リファレンスにあります。

## 設定の HMR

YAML で有効化すると、`dsh-hmr` が下記を監視し、単一の直列化されたリロードを通じて全レイヤーを再合成します。

- プロファイルマニフェスト
- プロファイル側とホーム側の両方のパッチ（patch）ファイル

HMR 無効時は、変更は再起動時に適用されます。ウォッチャー登録の途中に到着した編集も、それ以降の編集と同じ非致命的なリロード報告を使います。

## ソースからの実行

本番実行にはビルド済みのパッケージとフロントエンドアーティファクトが必要です。リポジトリのルートから `pnpm run build` を先に実行し、その後 `pnpm dsh ＼args...］` で TypeScript エントリを起動して全引数を転送します。モジュール解決の契約（module-resolution contract）は上流の source-execution リファレンスが担っています。

## ヘルプ文書の生成

`docs/cli-help.md` は `scripts/gen-cli-help.ts` による生成物です（編集不可）。`pnpm run gen-cli-help` で再生成し、`pnpm run verify-cli-help` で新鮮さを確認します。ヘルプ出力は元の言語（英語）を保持します。

## 出典

本文は上流ドキュメントの該当記述の翻訳です。

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cli-help.md
- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md
