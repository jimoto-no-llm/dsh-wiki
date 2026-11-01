# ツール実行パイプライン

モデルが呼び出したツールが、どのように検証・実行・記録され、UIに届くかを担う中核コンポーネントです。`core.md` が `ToolDefinition` をパイプライン共有の型として導入するの続きとして、このページはツール定義の全フィールド、型付きスキーマDSL、ガード付き実行、UI提示の語彙を扱います。ソースは `packages/core/tools`（src/index.ts・schema.ts・presentation.ts）です。

## `ToolDefinition` — 登録された1つのツール

ツールは「モデル向きの `ToolSchema`」＋「必須の正規出力宣言 `output`」＋「実行関数 `execute`」＋実行側のメタデータ（タイムアウト・並行安全性・UI提示コールバック）から成ります。レジストリは `schemas()` でモデル要求用の投影を作り、`output`・`execute`・`projectContent`・`finalizeContent`・`timeoutMs`・`isConcurrencySafe`・`presentCall`・`presentResult` がモデル要求へ漏れることは決してありません。

| フィールド | 役割 |
| --- | --- |
| `output.schema` / `output.render` | 正規出力の生スキーマと、検証済み値からコンテンツへの純粋投影 |
| `execute(args, exec)` | 受託された呼び出しを実行し、正規のロスレスJSON値だけを返す |
| `projectContent` | `tools/post-execute` ポリシーの前に実行準備したコンテンツを挿入する任意コールバック |
| `finalizeContent` | 永続化直前の最終マイル変換。パイプライン失敗でも必ず1回呼ばれる |
| `timeoutMs` | 協調的なタイムアウト予算。`tools/execute` ラッパーで強制され、モデルには決して送らない |
| `isConcurrencySafe(args)` | 兄弟ツールとの並行実行が安全かを判定する純粋分類子。`true` のみ有効 |
| `presentCall` / `presentResult` | 待ち状態／完了状態のUIカード。リプレイでも呼べるため `args` だけに依存する純粋関数 |

引数は `execute` には生の `unknown` で届きます。第一-partyツールは手書きの代わりに `defineTool` を使い、引数の検証・縮小・`output.schema` からの戻り型推定を一括で行います。引数不一致は `ToolArgsError`（`INVALID_ARGS`）、本体やポリシー後の値の不備は `ToolOutputError`（`INVALID_TOOL_OUTPUT`）として通常のツールエラー経路に流れます。

## 統一されたJSON値スキーマDSL

パラメータと出力の双方を1つの語彙で書けるDSLが用意されています。`ValueSchemaSpec` は `string`・`number`・`integer`・`boolean`・`null`・`array`・`object` と、作者専用の `json`、厳密に1つだけ選ぶ `oneOf` をサポートします。明示的なobjectノードは必ず `additionalProperties` を宣言します。

- 型推定は16階層まで正確に続き、それを超えると `JsonValue` に広がります。実行時検証は最後までスキーマ全体を歩きます。
- オプション性はプロパティごとの `required: true` の注釈で表します（ルートは暗黙の開いたobject）。
- 生JSON Schemaは既定で開いており、対応しないキーワードは黙って受け入れられるのではなく拒否されます。`assertSupportedJsonSchema()` が外部スキーマ（サブエージェント・ワークフロー・MCP・動的登録）を検査し、`JsonSchemaError` が不正な部分のパスを報告します。

## 条件付き活性化と可視性の制限

登録に `when` 条件を付けると、そのツールはモデル選択とともに提起された各ステップでのみ宣言・実行されます。制限（`ToolRestriction`）は、継承した大域ツールへのスコープ単位のフィルタで、複数の制限は交差し、スコープ自身の登録は影響を受けません。

| 制限 | 意味 |
| --- | --- |
| `allow` | 名前を挙げた大域ツールだけを残す |
| `deny` | 名前を挙げた大域ツールを可視集合から取り除く |

`allow` 一覧の形式では、後に誰かが追加登録した未挙名のツールは黙って見えたままになります。ステップの実行が終わると、ワークフローやPTCの内側のサブコールも含めてそのステップの受理集合は廃棄され、同名の置き換えや新しい制限は開始前の呼び出しを失格させます。

## ガード付き実行と決定IDIOM

エグゼキュータは解析済み実行を共通パイプラインに渡し、パイプラインが引数のスナップショット・実行識別子・ポリシー总体・dispatch・最終通知を担います。各ウォーターフォールは型付きの**決定**を返します。

| 決定 | 返し方 | 意味 |
| --- | --- | --- |
| `tools/pre-execute` → `PreToolDecision` | `allow` / `deny` / `cancel` / `ask` | 本体実行前。引数の書き換えは除外（ログ・監査・UI・実行が一致する必要があるため） |
| `tools/execute` ラッパー → `ToolExecutionResult` | 成功か失敗 | around dispatch。`signal` の置換は可能だが削除は不可 |
| `tools/post-execute` → `PostToolDecision` | `accept` / `block` | 内容か値のどちらか一方を置換。`block` は是正フィードバックを含む `isError` にする |
| `ToolGuard` | 理由文字列か `undefined` | 単調ガード。allow を返す道が存在しないので、後段のリスナーが拒否を権限に戻すことはできない |

- 決定は `next()` で既定に委ねるか、決定を返して短絡させます。`ask` は承認サービスの `allowed-once` が受理されたときだけ走り、非承認・欠けている承認経路・エージェントなしなら拒否になります。
- 成功の実行は、値をスナップショット・検証・凍結してから純粋レンダラと任意の提示メタデータ投影を呼びます。内容・構造化エラー・追加文脈・提示メタデータのどこかで失敗しても、`finalizeContent` に届く `isError` に正規化されます。
- 正規値 `value` は実行局所で、永続イベントには載りません。ログは `content`・`error`・`meta` だけを保持し、`tool/call` / `tool/result` に実行識別子が伴うため、ラッパーが第二の矛盾する識別子を作れません。
- 未知のツールも投げるツールも構造化エラー（`ToolNotFoundError` は `UNKNOWN_TOOL` に対応）になるため、呼び出しが1つ失敗してもターンは終わりません。

## UI提示の語彙

`presentCall` / `presentResult` は card タグ付きの描画意図（`ToolCallView` / `ToolResultView`）を返します。

| card | 意味 |
| --- | --- |
| `generic` | 既定の汎用カード。`kind`（read/edit/delete/move/search/execute/fetch/other）がアイコンを選ぶ |
| `terminal` | シェルコマンド→端末カード。完了側は出力とexitコードを持つ |
| `diff` | ファイル作成・変更→差分カード。新規ファイルでは `oldText: null` |
| `search` | grep/globの完了結果。`truncated`/`total` が部分結果の見せ方を守る |
| `read` | ファイル読み取り→1ベース行番号付きの表示（`lang` はシンタックスハイライトのヒント） |
| `web` | 検索（`sources`/`answer`/`truncated`）と取り込み（`url`/`statusCode`/`truncated`） |

完了ビューが待ちビューを置き換えるため、変更系ツールは呼び出し時と重複する差分でも結果を返します。`FileLocation`（`path` + 任意 `line`）・`FileDiff`・`ReadFileLine` はホストとクライアントの両ランタイムで共有される中立語彙で、bashのスキーマとエグゼキュータは shell.md に、汎用的な背景制御は jobs.md にあります。

## 注意

- 並行実行は `isConcurrencySafe` が `true` を返した呼び出しだけが対象です。親が所有する状態の変異は禁止で、共有状態は並列dispatchに耐えるか、可換または失敗時に閉じる記録裁許が要ります（並列ツール呼び出しのAgent Noteが完全な契約）。
- スコープの局所ツールは大域を遮蔽します。同一レイヤ内の重複と、予約済みの `run_code` という名前は登録に失敗します。`restrict` は大域ツールだけに効き、空フィルタ・未知名・スコープ局所名・予約名は受理しません。
- `timeoutMs` は協調的な予算です。正の有限値だけが受理され、宣言は「実装が `exec.signal` を下層へ転送し、信号がabortしたら静穏化へ到達できる」ことの表明になります。
- 引数はロスレスに写像・凍結されます。事前の書き換えはなく、事後の置換も `post-execute` の内容か値のどちらか一方に局限されます。履歴・監査・UI・実行が同じ引数を見なければならないためです。
- 永続イベントの `tool/call` / `tool/result` は不変の実行識別子を共有します。ラッパーが第二の矛盾する識別子を作れないため、実測と観測が同じ説明に一致します。
## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/tools.md