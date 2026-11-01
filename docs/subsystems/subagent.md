# サブエージェント

1つのエージェントが別のエージェント実行を起て、届け、計測するための統一された活性化（activation）APIです。新規の独立した子会話の起動と、外部実行（他のCLI・DSH SDK 等）の起動の両方を1つの起動要求で扱います。モデル向きのツールは、結果を親のモデルに届ける「parent delivery」を使います。

## 実行バックエンドの役割

| バックエンド | 役割 | 後続 |
| --- | --- | --- |
| `spawn` | 続け易い局所子（continuable）を作る。親履歴を付けずに独立プリセットも選べる | 後続メッセージ可 |
| `fork` | 親の確定済みターン接頭部を引き継ぐ子を作る | 後続メッセージ可 |
| SDK / CLI 系外部プロバイダ | 外部実行を1個のhandleで起てる（複数ターンは取らない） | 後続メッセージ不可 |

バックエンドはその名前・能力（`agentOptions`・`agentPreset`・`outputSchema`・`depthLimit`）・間接性（親履歴の継承有無）を申告します。能力はstart時に検証され、未対応の要求はその場で拒否されます。歴史の子にdescriptorが残らない場合は、継続能力を与えない `mode: unknown` として発見だけできます。

## 開始要求のフィールド

| フィールド | 意味 |
| --- | --- |
| `prompt` | 子へユーザーメッセージとして届ける内容（ContentBlock列） |
| `parent` | 親エージェント。子の実効 cwd・系譜・委譲深さの提供源 |
| `cwd` | 子の初期ディレクトリ。省略時は親の実効ディレクトリを収集 |
| `agentOptions` | 子のプロバイダ／モデル／推論努力／出力トークン上限の上書き（能力が必要） |
| `outputSchema` | オブジェクト根のJSON Schema（強制部分集合 `assertObjectJsonSchema` 内）。成功した子は合致値を structured で返す |
| `maxDepth` | その子の絶対委譲深さの上限（能力が必要） |
| `signal` | 開始前後共通的なキャンセルの正路。発行済み実行では残りのターン作業を中止する |

`agentPreset` は spawn単独の能力で、forkは親の現組成を継承します。

## 子のつき合い方

- 実行済みの子には `send_message(agent_id, message)` で隣接の局所エージェントへメッセージを送れます。working中の子はsteering入力（次のステップへ）、待機中のcontinuableは永続からの再開、外部実行は後続扱拒否です。
- 子の停止は `interrupt_agent(agent_id)` で中止要求を入れる仕組みです。確認を待たず即座に受理され、不在・待機中・完了済みの対象は変更なしの受け取りになります（実際に静止したことの保証ではない）。
- 実行終りは `subagent/end` で、最終助言出力・structured・診断（provider記述、tool入力や機密を含まない4096バイト上限）・stop理由がどうなったかが親のsettlement 通知へ自動で届きます。caller delivery ではclose 通知が出ません。
- 終了理由 map は `completed` / `aborted` / `error` / `max-tokens` / `refusal`（_BACKENDが拡張可能）。非completedの理由は toolレイヤが isError 化します。

## 目録（カタログ）の見方

`list_agents`（子単位の一覧）はその場の activity として `running` / `inactive` を返しますが、これはタスクの完了や `send_message` の成功を約束する値ではありません。直接の子は `listChildren`、子孫は `listDescendants`（カタログ親と根からの深さを持つ事前順）が読めます。カタログは親が所有する目録で、creation 時点の所属の記録です（実行の成否を記録しない）。

## 注意

- 外部実行は後続メッセージを受け付けないため、継続をしたい作業は spawn / fork のcontinuable子へ置いてください。
- 所属とライフサイクルは親所有のカタログ（アーキテクチャのAgent Note）で管理され、forkの見え方や永続化コストはそのNoteが所有します。
- structured は要求した `outputSchema` が満たされたときだけ存在し、要求しても childが失敗やcapture無しで終われば取り落とされます。
- 子のはず `prompt` や出力の内容が、や routing に届くのは各 provider policy です。parent delivery のsettled通知は、子の最終出力をそのまま運ぶ形で提供され、传播のために二重化しないでください。

## 結果の中身

`SubagentResult` は実行の最終 outcome を構成します。

| フィールド | 意味 |
| --- | --- |
| `output` | 最後の非空assistantメッセージの内容。無ければ蓄積されたassistantテキストストリーム、それも無ければ空列 |
| `structured` | 要求した `outputSchema` を満たせたときだけ存在する構造化値 |
| `diagnostic` | provider記述の失敗詳細。tool入力・ファイル内容・環境値・資格を含まない4096バイト上限 |
| `stopReason` | `completed` / `aborted` / `error` / `max-tokens` / `refusal`（merge拡張可）|

`SubagentRun.result` は child-level の失敗では reject せず `error` として解決します（tool結果の isError 化のため）。infrastructure fault だけが例外です。片付けは idle な `dispose()` を持ち、結果が前に出ても確定の処読はスキップされません。

## 能力と実装の分担

`SubagentManager` が起動・受付・ライフタイムを、`SubagentProvider` が transport を担います。spawnとforkは局所Agentのための分離した作成入力を、Codex・Claude Code・ACP・DSH SDK は1個の実行handleを寄付し、どちらも複数ターンは持ちません。両経路とも受付・容量・親の所有・キャンセル・片付けを共有します（このNoteの厳密な信頼はパッケージ参照に従う）。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/subagent.md