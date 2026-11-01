---
title: "プロファイルの再作成と設定ダンプ（rescue / dump）"
desc: "ランチャーは、プロファイルの作り直し（rescue）と、起動せずに設定を確認するためのダンプ系オプションを持ちます。ここに列挙するオプションはすべてランチャー本体のオプションで、d"
cat: "cli"
catLabel: "CLI リファレンス"
chars: 2373
slug: "reference/cli/rescue-dump"
---

# プロファイルの再作成と設定ダンプ（rescue / dump）

ランチャーは、プロファイルの作り直し（rescue）と、起動せずに設定を確認するためのダンプ系オプションを持ちます。ここに列挙するオプションはすべてランチャー本体のオプションで、`dsh --help` に説明が付いています。

## 再作成（`--from-default-profile`）

| オプション | 説明 |
| --- | --- |
| `--from-default-profile ＼name］` | カスタムプロファイルを、同梱プロファイルテンプレートの新しいコピーで置き換えます |

ヘルプに記載された実行例です。

```text
dsh rescue --from-default-profile web
                                          recreate rescue from the shipped web template, then boot it
```

訳: 同梱の `web` テンプレートから `rescue`（例としてのカスタムプロファイル名）を作り直し、その後起動します。

## ダンプ系オプション

| オプション | 説明 |
| --- | --- |
| `--dump-config` | 合成（compose）後のプロファイルツリーを出力して終了します |
| `--dump-config-schema` | マウントせずに、プロファイルエントリとパッチの JSON Schema を出力します |
| `--dump-default-config` | ユーザーレイヤーと `--patch` オーバーレイを含まないプロファイルツリーを出力して終了します |

ひとつのプロファイルツリーは、空のルートの上に次の順で合成されます（出典・詳細は [behaviors](/reference/cli/behaviors.md)）。

- `dsh.profile.bundles` の順序で、各バンドルのパッチ
- その後でプロファイルの `cordis.patch.yml`、続いてホームレベルの `$DSH_HOME/cordis.patch.yml`
- さらに `--patch` オーバーレイ

したがって `--dump-default-config` はバンドルレイヤーまでの素の状態、`--dump-config` はユーザー上書きと `--patch` 込みの最終状態の確認に使えます。起動は行われず、コマンドは出力後に終了します。

## `--dump-config-schema` の扱い

`--dump-config-schema` は設定値の代わりに、合成済みツリーが宣言したプラグインスキーマを読み込み、エントリとパッチの JSON Schema を出力します。

上流の CLI ドキュメントは、信頼できないプラグインを含むツリーを検査する前に、schema-dump の安全性とスコープ（"schema-dump safety and scope"）を参照するよう求めています（上流では `apps/cli/reference/README.md` の `config-schema-dump` セクションの位置づけ）。このスナップショットには同ファイルが同梱されていないため、その本文は本Wikiでは扱っていません。

## 使い分け

上流の CLI README は、起動せずに合成済みツリーを確認する手段として `--dump-default-config` と `--dump-config` を案内しています。`--dump-config-schema` は設定値ではなくスキーマを出力するため、プロファイルに入れたプラグインが何を設定できるかの確認に使います。

| 目的 | 使うオプション |
| --- | --- |
| バンドルレイヤーまでの素のツリー確認 | `--dump-default-config` |
| ユーザー上書き・`--patch` 込みの最終ツリー確認 | `--dump-config` |
| プラグインが宣言する設定の形状確認（エントリとパッチの JSON Schema） | `--dump-config-schema` |

## 関連する制限

- `desktop` という名前は Electron 所有のプロファイル向けに予約されており、CLI はこの名前への起動と設定ダンプの両方を拒否します。
- `--from-default-profile` による置き換えはカスタムプロファイル向けの操作です。`web`・`headless`・`sdk`・`sdk-minimal`・`acp` は初回使用時に自動初期化されます。
- ダンプ系オプションの一覧は [launcher](/reference/cli/launcher.md) のオプション表にも含まれます。

## 出典

本文は上流ドキュメントの該当記述の翻訳です。オプション名・使用例・原文の説明文はそのまま保存しています。

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cli-help.md
- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md
