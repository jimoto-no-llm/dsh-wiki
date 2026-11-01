# 成果物（deliverables）とターンの変更カード

1つのターンがユーザーに渡すものを扱うパッケージ群です。大きく2つの顔があります。

- **present の成果物**: モデルが `present` ツールで宣言したファイル群。元のパスに実体が残るまま、宣言だけが記録される。
- **workspace changes**: ターン開始とターン終了のgitスナップショットに加え、gitが見ないパスのためにファイルツール編集前後の全ファイルキャプチャから要約した「ターン中の変更ファイル」一覧。

両者ともモデルには届かず、読むのはクライアントだけです。Webクライアントの `deliverables` プラグインがターン末尾の両カードを描画します。ツールのふるまい・スナップショット機械・設定は `tool-present` と `workspace-changes` の各パッケージREADMEを正とします。

## 宣言側の語彙

| 語彙 | 意味 |
| --- | --- |
| `PresentedFile` | 1成果物。絶対パスまたはセッション相対の `path` と、モデル提供の任意 `description` |
| `deliverables/presented` | ログ専用イベント。成功した最終 present 結果ごとに1回、turn／callId／files を記録 |

ローカルパスはセッションの作業ディレクトリからの相対で示し、作業ディレクトリ外は絶対パスで示されます。

## 変更側の語彙

| 語彙 | 意味 |
| --- | --- |
| `WorkspaceChangedFile` | 変更1ファイル。行数はgitまたは編集前後の全ファイルキャプチャから |
| `WorkspaceChangesSummary` | 1ターンの要約。表示順の `files`（上限 `maxFiles`）、件数と行数の総計、turn-start/endのgitツリーid（あれば）に置換 |
| `WorkspaceDiffHunk` | 3行文脈のunified差分ハンク。各接頭記号（`+`/`-`/space）を保持 |
| `WorkspaceFileDiff` | 要求した時に計算される1ファイルの比較。`text` / `binary` / `oversized` の3variant |
| `workspace/changes` | ログ専用イベント。トップレベルturnの停止時に付加（値は-log外）、同じturnの後発イベントが先行を置き換える |

表示名列（`display`）は「作業ディレクトリ内の相対、その上のリポジトリなら `../`、home配下なら `~`、他は絶対」の規則で常にスラッシュ区切りです。binary・以上サイズ（`maxFileBytes` 超え）のファイルは件数や比較を付けず一覧にだけ現れます。

## 使い方（Host サービス）

`WorkspaceChanges` Hostサービスが、Sessionが生きている間だけ要約と比較を提供します。

1. `summary(sessionId, seq)` が `workspace/changes` イベントが告げた要約を返します。Session破棄またはHostが記録していないなら undefined。
2. `diff(sessionId, seq, index, signal)` が要約内の指定ファイルの比較を計算します。差分の行比較が設定した `diffTimeoutMs` を超えると `coarse: true`（全行が置換表示）になります。
3. スナップショットが取られたターンの要約には `snapshot: { before, after }` のgitツリーidが残ります。

パッチ系の呼び出しも同じ要約・比較APIを共有します。gitの網にないパスでは移動が「削除された出所＋追加された宛先」として寄与し、途中で止まったcommitは実際の正味のファイル変化だけを指します。

## 両カードの描画イメージ

| カード | 中身 | 出てくる場所 |
| --- | --- | --- |
| 成果物カード | `present` で宣言されたファイルのpath＋任意のdescription | 成功した最終presentの直後にターン末尾 |
| 変更ファイルカード | 変更ファイルの一覧（追加・削除行数）と、開ければ差分ビュー | トップレベルturnの停止後 |

変更の比較は要求した時に計算されるので、一覧を出すコストは軽く、差分ビューを開いたときに初めて行比較が走ります。

## 注意

- イベントはログ専用で、要約そのものはログに載りません。`workspace/changes` の seq が要約を引き出す鍵であり、Session破棄後は取れません。会話をHost再起動後に再開した場合、以前のターンに変更ファイルカードは出ません。
- 後続の同turnイベントが先行を置き換えるため、Client は最新版だけを保持します。両イベントともモデルには届きません。
- 場所は作業ディレクトリから見た語彙で、成果物の実体は `present` の元パスに留まる点（移動や複製はしない点）に注意してください。

## 変更検出の取り決め

| 項目 | 取決め |
| --- | --- |
| 行数の源 | gitによるターン開始/終了スナップショット＋gitの外のパスだけファイルツール編集前後の全ファイルキャプチャ |
| サイズ上限 | `maxFileBytes` を超える側はbinaryと同様に件数・比較なし |
| 順序 | 要約の `files` は `display` 順。上限外のファイルは `total` にだけ数える |
| 場所の語彙 | `path`はセッション相対（外は絶対）、`display`は表示型 |

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/deliverables.md