---
title: "rescope の仕組み"
desc: "Cordisフレームワークとその基盤ライブラリは vendor/ の下にvendoredされ、@deepseek-ai スコープで公開されます。すべてのハーネスパッケージがフレーム"
cat: "deep"
catLabel: "深掘り"
chars: 3942
slug: "deep/rescope"
---

# rescope の仕組み

Cordisフレームワークとその基盤ライブラリは vendor/ の下にvendoredされ、@deepseek-ai スコープで公開されます。すべてのハーネスパッケージがフレームワークをpeer dependencyとして宣言するため、ハーネスの公開はこの層を伴って行われ、上流の名前のままだとレジストリで名前を占有してしまうからです。このページは名前の対応表であり、決定とその帰結はrescope Agent Note、上流commitは vendor/README.md が保持します。

## 名前の対応表

| ディレクトリ | 上流の名前 | 公開名 | 上流バージョン | 役割 |
| --- | --- | --- | --- | --- |
| `vendor/cordis/` | `cordis` | `@deepseek-ai/cordis` | 4.0.0-rc.11 | フレームワーク核：Context・Service・Fiber・イベント |
| `vendor/cosmokit/` | `cosmokit` | `@deepseek-ai/cosmokit` | 1.8.1 | フレームワークとSchemasteryが基にする共有ユーティリティ |
| `vendor/schemastery/` | `schemastery` | `@deepseek-ai/schemastery` | 3.18.0 | プラグインの Config の背後にある設定スキーマ |
| `vendor/loader/` | `@cordisjs/plugin-loader` | `@deepseek-ai/cordis-plugin-loader` | 1.0.0-rc.5 | cordis.yml の読み込み、プラグイン解決、repository cache |
| `vendor/include/` | `@cordisjs/plugin-include` | `@deepseek-ai/cordis-plugin-include` | 1.0.4 | 設定includeとpatch overlay |
| `vendor/group/` | `@cordisjs/plugin-group` | `@deepseek-ai/cordis-plugin-group` | 1.0.0 | ネストされたプラグインgroup |
| `vendor/timer/` | `@cordisjs/plugin-timer` | `@deepseek-ai/cordis-plugin-timer` | 1.1.4 | ctx 上のdisposal-awareタイマー |
| `vendor/hmr/` | `@cordisjs/plugin-hmr` | `@deepseek-ai/cordis-plugin-hmr` | 1.0.15 | プラグインと設定のホットモジュールリプレース |
| `vendor/logger-console/` | `@cordisjs/plugin-logger-console` | `@deepseek-ai/cordis-plugin-logger-console` | 1.0.0 | コンソールlogger exporter |

サブパスのexportはパスを保ちます。例えば plugin-loader/repository は cordis-plugin-loader/repository になります。

## 改名が触れないもの

- **ディレクトリ名と上流ソースバージョン。** `vendor/hmr/` は同じディレクトリのままです。表が記録するのは固定ソースsnapshotの上流バージョンで、vendoredな package.json 自身の version フィールドは、リリース時に進められ再syncで上流バージョンへ戻る、ハーネス側のmanifestバージョンです。
- **依存のバージョン範囲。** 改名は依存キーを変えるだけで範囲を変えません。workspaceのマニフェストは workspace: プロトコルを使います。
- **Loaderの `cordis:` builtin接頭辞。** cordis:include と cordis:group はパッケージ名ではなくプロトコル接頭辞です。
- **`cordis.yml` の設定family。** `*.cordis.yml`・`*.cordis.snapshot.yml`・`cordis.patch.yml` を含みます。
- **自分の名前にこの語を含むハーネスパッケージ。** `@deepseek-ai/dsh-tool-cordis` など。
- **上流の実行時識別子。** Schemasteryの `Symbol.for('schemastery')` とその vendor: メタデータフィールドなど。
- **製品識別子。** GENERIC_SKIPS に入るファイルは、list対象の上流名について、preset id・イベント名・directory group名・localeや入力ソースのkeyを保ちます。ソースのimport・export・モジュール宣言・JSDoc import型はJS・TSのフェンス内を含めてどちらの方向にも変わり、YAMLプラグインの name: 値も変わります。その他の名称の文字列使用は保持され、他のライブラリ名は引き続き検査対象です。
- **rewriteのfixture。** scripts/rescope-vendor.spec.ts と scripts/gen-third-party-notices.spec.ts は、両方のパッケージ表記をtest dataとして保ちます。
- **docs/の外のprose。** 各 vendor のREADME・パッケージREADME・Agent Noteは書かれた時の名前を保ちます。そこで裸のcordisはPython SDKのoption名やagent-preset idかもしれません。docs/の中では、proseとMarkdownフェンスは上記の監査対象識別子を除いてtoken規則に従います。

## コードで変えるべき箇所

| 箇所 | 変更前 | 変更後 |
| --- | --- | --- |
| モジュールimport | `import { Context } from 'cordis'` | `import { Context } from '@deepseek-ai/cordis'` |
| 型付きイベントマージ | `declare module 'cordis'` | `declare module '@deepseek-ai/cordis'` |
| package.jsonの依存キー | `"@cordisjs/plugin-hmr": "^1.0.15"` | `"@deepseek-ai/cordis-plugin-hmr": "^1.0.15"` |
| cordis.ymlのプラグインエントリ | `name: '@cordisjs/plugin-include'` | `name: '@deepseek-ai/cordis-plugin-include'` |

## 適用・検査・反転

`scripts/rescope-vendor.ts` が上の対応表を所有し、rename変換を実行します。手動でrenameする参照は1つもありません。

```sh
pnpm run rescope-vendor            # 何が変わるかを報告
pnpm run rescope-vendor --apply    # 参照を全部書き換える
pnpm run rescope-vendor:check      # 変換後の状態を検証する（hygieneゲートで走る）
pnpm run rescope-vendor --apply --reverse   # 上流名へ戻す
```

上流のsyncの後で再適用し、コマンドが表示する再生成に続けます。lockfileのための pnpm install、third-party noticesの生成、触れた二言語ペアのための verify-translation-pairing --write です。

## 注意

renameの必要は、harnessパッケージがフレームワークをpeer dependencyとして宣言するたびに、その層が伴って公開される性質から来ています。対応表を一意に所有するスクリプト経由でのみ実施し、手動renameや部分renameをしないでください。適用後は表示された再生成を残らず実行し、hygieneゲートの rescope-vendor:check を緑のまま保ちます。docs/内のproseはtoken規則に従うため、docs/で名前を触るときは適用範囲と監査対象識別子の例外を確認してください。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/rescope.md