---
title: "設定スキーマダンプの安全作法"
desc: "--dump-config-schema は、起動せずにプロファイルが宣言するプラグイン設定の JSON Schema を出力するダンプモードです。この記事はダンプ表面のオプション"
cat: "cli"
catLabel: "CLI リファレンス"
chars: 5785
slug: "reference/cli/schema-dump"
---

# 設定スキーマダンプの安全作法

`--dump-config-schema` は、起動せずにプロファイルが宣言するプラグイン設定の JSON Schema を出力するダンプモードです。この記事はダンプ表面のオプション紹介を [rescue-dump](/reference/cli/rescue-dump.md) に譲り、上流 CLI behavior reference の schema-dump セクションに書かれた安全性・診断・文書構造を詳述します。上流は信頼できない（untrusted）プラグインを含むツリーを検査する前に、この「schema-dump safety and scope」を読むことを明示的に求めています。

## 実行条件と基本の振る舞い

| 項目 | 振る舞い |
| --- | --- |
| 対象レイヤー | `--dump-config` と同じく、バンドル・プロファイル・ホーム・argv の各パッチレイヤー。反復可能な `--patch` と `--from-default-profile` も受け付ける |
| ダンプフラグ同士 | 3つのダンプフラグ（`--dump-default-config`・`--dump-config`・`--dump-config-schema`）は相互排他 |
| 拒否する入力 | アプリ引数と、予約済みの `desktop` プロファイルを拒否する |
| 出力 | 成功すると、整形済み（pretty-printed）の JSON Schema 2020-12 ドキュメントを1つ stdout に出す |
| 終了コード（基本） | 準備・パッチ解析/合成・解決セットアップの失敗はスキーマを出さずに非ゼロ終了（部分出力の扱いは次節） |

出力の根（root）は、`--dump-config` が表示する解析済みエントリリストを記述します。パッチ（プロファイル・ホーム・CLIオーバーレイ）の形状は `$defs.patchList` が別途記述します。**断片を検証するときは文書の `$defs` を必ず保持してください。**

## untrusted プラグインとの関係 — 収集時に何が動くか

安全作法の出発点は「スキーマダンプは設定値の代わりに宣言を出すが、プラグインモジュールの読み込み自体は実行する」という点です。

| 収集時の動作 | 内容 |
| --- | --- |
| 実行される | 信頼済みモジュールのインポート。Config ゲッターや遅延ビルダー（lazy builder）の呼び出し |
| 実行されない | プラグインの適用（apply）。transform コールバックの実行。設定式（configuration expression）の評価 |
| 落とし穴 | インポートは出力の前後でブロックしたりプロセスハンドルを保持したりしうる。自動化する側は外部タイムアウトを課すこと。ダンプ自身は強制終了（force-exit）せず、インポート時リソースの破棄も管理しない。プロファイル準備は YAML ダンプ初期化の書き込みを伴う |
| stdout の迂回 | 通常のインポート・ビルダーからの stdout は stderr へ振られる。ただしファイルディスクリプタへの直接書き込みは迂回されない |

プラグインを適用せず式を評価しないので `!!js` 式は不活性です（次節参照）。それでも、信頼できないプラグインのモジュール読み込みや Config ゲッターは実際に動きます。これが上流が「untrusted プラグインを検査する前に schema-dump の安全性とスコープを読むこと」と述べる理由です。

## 出力を共有する前に

| 検査点 | 理由 |
| --- | --- |
| 宣言されたデフォルト値 | スキーマは宣言のみを出し実際に構成された値は出さないが、宣言されたデフォルトや生のプラグインエラーに機微情報が入ることがある |
| 生のプラグインエラー | 値のマスキング（redact）はされない |

コレクターAPIの詳細は上流の packages/boot/app-boot の README が管理します。

## 診断と部分出力の扱い

| 失敗の発生段階 | 終了コード | stdout |
| --- | --- | --- |
| 準備（preparation）の失敗 | 非ゼロ | スキーマなし |
| パッチ解析／合成の失敗 | 非ゼロ | スキーマなし |
| 解決セットアップの失敗 | 非ゼロ | スキーマなし |
| 収集（collection）・投影（projection）の失敗 | 1 | 部分出力が残る |

収集・投影の失敗では stderr にも診断が出ます。stdout に有効で有用なスキーマが出ていても、partial 投影や非JSON注釈の省略が含まれていることがあり、診断は stderr 側に残ります。stdout だけで判断しないことが要点です。

また、schema-dump の unmatched-target（未一致ターゲット）警告にはレイヤーラベルがありません。出自を知りたいときは、同じレイヤー構成で `--dump-config` を実行し、供給元ファイル名付きの警告を参照します。

## 文書の構造と `$defs` — 何を保持すべきか

根の `x-cordis` 注釈は次のキーを持ちます。

| キー | 内容 |
| --- | --- |
| `profile` | プロファイル情報 |
| `complete` | 完了状態（false 条件は後述） |
| `entries` | エントリ配列。走査順を保持 |
| `diagnostics` | 診断 |
| `patchSchema` | パッチのスキーマ |

| 項目 | 説明 |
| --- | --- |
| `path`・`name`・`id` | パスは必須。name はリテラル名が無いとき省略される。id は任意 |
| `status` | `schema`（投影できた）・`partial`（投影に制限あり。制限内容は診断に出る）・`absent`（Config を出力しないキャリアなど）・`unsupported`（対象外の形）・`error` のいずれか |
| `configRef` | Loader の構造定義を指す |
| `tree` | 任意。group か include を示すネイティブキャリア（carrier）の印。キャリアは Config を出力しないため status: absent になりうる |

| 補足 | 内容 |
| --- | --- |
| 不正行との共存 | 検査不能な行は位置付きエラーを受け取るが、有効な兄弟（siblings）は捨てられない |
| 合成失敗の include | 当該 include の子は利用不可として扱われる。未パッチ・フィルタ済みの子を最終状態として報告しない |
| 子のパス | group の子は /config/INDEX、include された子は /include/INDEX。後者は根のダンプへの JSON ポインタではない |
| absent の意味 | Config が無い＝未知のフィールドを許すことであり、構成を禁止する意味ではない |
| complete が false になる条件 | エラー診断の存在。partial・unsupported・error エントリの存在。1つのプラグイン名が複数の Config 定義に対応すること |
| 完全性の限界 | 本参照は宣言（disabled 行を含む）を扱う。import・include の失敗は起動可能なプロファイルを不完全にしうる。実行時生成のプリセット／クライアントツリーやプラグインの起動チェックは対象外であり、complete: true は起動の成功を保証しない |

## 投影の精細 — Schemastery 宣言から JSON Schema へ

対応関係の要点です。

| Schemastery 側 | JSON Schema 側 |
| --- | --- |
| 通常のフィールド | インラインで投影 |
| 共有 Config・再帰 | `$ref` |
| デフォルト | 注釈（annotation）であり、デフォルト挿入ではない |
| 必須 | Schemastery の nullable フォールバックが検証を通るかどうかを踏まえる |
| ユニオン | `anyOf`。ネイティブ実行は最初に成功したブランチを選ぶ |
| ロールメタデータ | `secret`・`credential-ref`・`ms` と `volatile` の live-update メタデータは `x-cordis` 注釈に残る |

投影が完全でない箇所は黙って捨てられず、マークや注記のまま残ります。

| 現象 | 扱い |
| --- | --- |
| callback 検証・未対応の正規表現セマンティクスなど、投影されない制約 | partial としてマーク。さりげなく捨てない |
| 非有限の境界、非JSONの default・表示注釈 | 制限付きで省略。構造的なフィールドは残る |
| オブジェクト定数 | 通常の nullable メンバー制約は保持。継承プロパティ比較は partial |
| 表現不能なデフォルト・未対応の交差（intersection）・再帰的デフォルト依存の未解決 | 省略挙動が unknown に留まる。ネイティブ検証が依然必要 |
| 不正な `volatile` 含有 | スキーマ定義エラー。フィールドの入力型は参照オブジェクト型にならない |
| 入力を変えうる先行のユニオンブランチ、改名・衝突しうる辞書キー | 緩めた検証（relaxed validation）と無制限の代替を併せ持つ。ネイティブの変異をシミュレートしない。いずれも partial |

## エントリリスト方言での YAML 解析

| 構成要素 | 振る舞い |
| --- | --- |
| `!!js` スカラー | 不活性な `{ "__jsExpr": "..." }` マーカーになる。通常の Config 値とエントリ disabled は結果を評価せずに受け付ける |
| group リスト・Include フィールド | リテラルのまま |
| エントリ disabled | 真偽値・null・式マーカーを受け付ける。Loader が型を迫る（coerce）他の真値は拒否 |
| 無効化エントリ | `group: true` 強制が無い限り必須 Config を省略できる。式による disabled は実行時まで省略の是非が未決。供給された Config 値は依然検証される |
| 無効化 group/include の子 | 制御フラグが無い子は Loader が生成しないため検証されない。制御行配下の子と disabled group へのパッチ挿入は有効として検証するが、Loader は祖先無効の子を未初期化に保つ |
| 非挿入パッチ | 非空 id が無い非挿入パッチは、Loader 警告付きの no-op として受理される |

| 未知・曖昧 | 扱い |
| --- | --- |
| 未知のプラグイン名 | 開放（open）のまま。フィールドを禁止しない |
| 同名で解決が異なる | ユニオンで扱い、曖昧性の診断を出す |
| 既知の根ツリーターゲット / include ローカル id、早期パッチで導入・変更された順序依存ターゲット | 前者は Config 全体置換を検証（深い部分オブジェクトではない）。後者は推論しない |

## 再生成が前提の参照物として扱う

出力は版管理された永続カタログではなく、再生成されること前提の pre-stable 参照物です。

| 作法 | 内容 |
| --- | --- |
| 再生成タイミング | dsh もしくはプラグインを変えたあと。$schema は検証方言を示し、x-cordis は dsh リリースに従う |
| 硬直を避ける | 定義名・順序・本文をハードコードしない。$ref と configRef に従う |
| 方言の不整合 | 互換のない方言変更は新しい $schema を選ぶ。注釈の変更に Session 形式の移行（migration）は使わない |

## 関連ドキュメント

- ダンプフラグの一覧と使い分けは [rescue-dump](/reference/cli/rescue-dump.md)。レイヤーの合成順序は [behaviors](/reference/cli/behaviors.md)、プロファイル起動の全体像は [launcher](/reference/cli/launcher.md)

## 出典

本文は上流ドキュメントの該当記述の翻訳です。オプション名・フィールド名・原文の説明文はそのまま保存しています。

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/reference/README.md
- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md
