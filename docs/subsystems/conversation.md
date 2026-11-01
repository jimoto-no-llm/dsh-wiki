# 会話組み立て（Conversation Assembly）

Conversationは、Clientの `SessionEventLikeEntry` ウィンドウとブラウザビューの間にあるtarget非依存の組み立て層です。`ui-conversation` がイベント・ビューのレジストリ、`SessionBinding` ごとのidentity安定な結合、Turn/Stepの位置、増分的Context組み立て、target source、共有シェル、入力統合を所有し、`ui-chat` や `ui-trajectory` などのtargetパッケージがそれぞれのDefinition・最終スナップショット・描画を所有します。このページはビジネス所有Conversationノードのデータモデルと拡張経路を定義するものであり、経緯はConversation Node組み立て決定のAgent Noteが所有します。

## データモデルと所有

Session Controllerが連続した読込済み論理イベントウィンドウを所有します。各 `SessionEventLikeEntry` は1つのdurableイベント（`event`）か、Client専用 `assistant/live-chunk` プレゼンテーション（`transient`）のどちらかで、どちらの内側イベントも `type`・`seq`・`time`・`data` を露出します。`ui-conversation` は2本目の履歴 stream を開かずにこのentryをアセンブラへ渡します。Sessionごとに1つの `ConversationNodeAssembler` が全登録Definitionを適用し、登録targetごとに独立sourceを発行します。

| 概念 | 所有者と目的 |
| --- | --- |
| Event Definition | 1度に1つのdurableまたはtransientイベントへ一致し、安定した `(kind, id)` で相関し、決定論的なStateを折りたたみ、任意でtargetノードを物質化する。ビジネスパッケージの所有 |
| Context | `(kind, id)` ごとのengine所有の順序付きMatchと現在State。durableとtransientのどちらもstartになり得る。最も早く読めたstartがStateを初期化し、後続Matchが更新する。updateだけの証拠はstart読込までpending |
| Location | durableな境界イベントから導かれるSession・Turn・Stepの座標。DefinitionはTurn/Stepへ型付きデータを発行できる |
| View Definition | targetパッケージがSessionごとに増分ビルダを作り、targetの最終スナップショット型を所有 |
| Group Definition | 物質化ノードからtargetのroot参照とgroupスナップショットを導出する。所属・分割・要約・増分キャッシュの所有 |
| View | ChatやTrajectoryなどのslot entryは自targetのスナップショットだけを読み、target所有ノードを描画 |

ChatとTrajectoryが同じdurableイベント族を認識しても、それぞれのDefinition Stateと最終ノードpayloadは独立です。共有機構はidentityルーティング、順序付きreplay、Locationデータ、先行依存、発行cadenceに限られます。

## targetの活性化

各Sessionは単調なactive target集合を持ちます。target sourceの作成や読み取りでは活性化しません。シェルは保存済みまたは新選択のViewを明示的に活性化し、別の消費者は最初のsource購読でtargetを活性化します。最初の活性化がそのtargetのビルダを作り、現在のContextから `replace()` を1回呼びます。以後のflushはあらゆるactive targetへ `apply()` し、購読解除でもtargetは残ります。シェルはView選択を所有し、解決済みtarget idをアセンブラへ渡すだけであり、Chat等の既定targetを選ぶ責を持ちません。`toolCallFocus(callId)` を公開するView Definitionに対し、シェルは可視targetにだけInspectを供給します。

## Group Definitions

任意の `ctx.uiConversation.groups.register(definition)` はイベント・ビュー登録と同じeffect所有レジストリ寿命を使います。既存のView targetを要求し、重複target登録をビルダ構築なしで拒否します。Group contextはtargetが活性化されたときにSessionごとに作られます。登録差換えは旧contextを棄て、観測groupを掃除します。

| 型 | 意味 |
| --- | --- |
| `ConversationGroupDefinition` | `create()` がSession局所Stateを初期化、`update()` が次Stateを返し、`buildGroups()` がpending出力または `null` を返す |
| `GroupInput<Node>` | `replace` はtarget順序・タイムライン・同期reader（`readNode` / `readTurn` / `readPosition`）を供給。`apply` はNode変化とlifecycleの `changedTurns` / `changedTurnOrders` を加える。Stateにreaderを保持しない |
| `GroupNodePosition` | 所有Turn（あれば）と直前・直後の可視Nodeキー。Turnだけのキー列が落とす割込みを近傍が保持する |
| `NodeReference` / `GroupReference` | `kind` で区別されるbrandedキー。Node参照はrenderer所有の `groupPart` を選べる（省略はNode全体） |
| `GroupSnapshot<Data>` | 不変のgroup key、ビジネスデータ、順序付きNode参照。groupはgroupを含まず、source Nodeデータも所有しない |
| `GroupUpdate<Data>` | `entries` がroot列の完全差換え。`groups.replace` が全groupを置換、`groups.apply` のupsert/removeがnamed groupのみ更新。除去はNodeを削除しない |

Group storeは取り込み前に全結果を検証します。root参照と記録の1対1対応、参照Nodeの存在、` (NodeKey, groupPart)` の占められる定位置はrootかmemberの最大1つ、ノード全体とその部分の共存不可、重複upsert/removeの失敗です。rendererは2種の参照をswitchして所属View側でコンポーネントを選びます。root参照に載らなかったtargetノードは保存されたまま描画されません。

## 実装手順（例: review job）

Definitionを書く前に安定したビジネスidを決め、同じNodeに寄与するすべてのイベントがそのidを持つかpayloadから独自に導くようにします。クライアントが『最新の未完了Context』へ更新を割当てることを禁じます。例は `review/start`（固有start: reviewId・座標・title）、`review/progress`（update: 同id・座標・進捗）、`review/end`（update: 要約）の3イベントを宣言し、`SessionEventMap` 合併とpayload型を生産側のtype-only exportに置き、clientパッケージから副作用importします。各 `(kind, id)` にstartイベントは最大1つで、単一イベントのビジネスは `event.seq` 等の安定identityをDefinition局所idに使えます。

`match(event)` はidentity抽出器でありfoldではありません。現在イベントだけを受けてDefinition局所idとlifecycle役割を返します。`exclusive: true` のmatch結果はそのDefinitionのtarget上でイベントを独占主張します。アセンブラは受理前に全matchを評価するため結果は登録順に依存せず、主張されたtargetの他DefinitionはContextを作らず、対象targetのunmatched-eventフォールバックも走りません。別targetのDefinitionやtarget無しDefinitionは依然として受け取ります。同一targetへの二重主張やtarget無しDefinitionによる主張はdispatch時にthrowします。

| 設定項目 | 値の例 |
| --- | --- |
| `kind` / `target` | `review-job` / `chat`。`target` と `buildViewNode` は必ず揃えて宣言 |
| `match` | `review/start` をidでstart役に、`review/progress` と `review/end` をupdate役に分類する関数、またはイベント型から関数への読取専用テーブル |
| `start` / `update` | engineが採択するStateを返す。不変値の新規生成が望ましく、同一オブジェクトを変異して返しても採択意味は同じ |
| `publication` | 構造的・終端変化は `immediate`、高頻度の可視差分は `animation-frame`、後段の出版にだけ流れるState変化は `none` |
| `buildLocationData` | `scope === 'step'` などの判定で、Turn/Step所有データを宣言合併した型付きkeyで発行。同Locationの別ノードは `useTurnData(key)` などで消費 |
| `groupTree` | Chatノードの行位置: `exchange` / `input` / `turn` / `process`、省略で周囲のstep runに参加する通常process内容 |

`start` と `buildViewNode` の記述: 一度発行されたtarget Nodeは同じ `context.key` を保ち、一時的に可視flowから外れるときは `visibility: 'hidden'` を使い、`null` で引き下げません。

## 前行の読み取り

`start` には `ConversationContextReader` が渡り、他のビジネスkindの直近の先行Stateは `reader.previous<State>(kind)` で読みます。アセンブラはその依存を記録し、より近い先行がprependで届く・未知gapが塞がる・先行Stateが改訂される場合、依存Contextを `start` から再実行し、更新を昇順seqでreplayします。readerにビジネス固有照会メソッドはなく、他Contextへの変異権もありません。

## ウィンドウ更新の経路

| 経路 | engineの仕事 | Definitionに見える振る舞い |
| --- | --- | --- |
| 開時・再同期・gap修復の全体replace | 読込ウィンドウを再構成し、標準イベントやpacked runをDefinitionごとに1回matchし、開始済みContextをreplay | `start` を最初に、その後は昇順seqのupdate一式。updateのみのpending ContextはState無しのまま |
| 古いページのprepend | 新しい古い入力だけをmatchし、Contextへ `(kind, id)` で併合し、済みのキー付きノードを保つ。影響Contextと依存だけreplay | 新しく見つかったscalar startが集めていたupdatesを活性化。Locationや先行の変化はContextの再実行を招く |
| 生イベントのappend | 各Definitionのmatchを1回呼び、キーでmatched Contextを引いて、そのContextだけ更新する | 開始post-startイベントへの対応に1つのscalar updateと1つの要求出版。既存Contextの走査はしない |

登録Definition数 `D` に対して、1つのscalarイベントまたはpacked runのappendは `D` 回の現入力matchとmatch後の定数時間Context lookupに収まります。Definitionはappend不変経路で完全イベントウィンドウ・全Context・`context.matches`・描画ノード集合を走査してはなりません。積み上げ事実はState、同Turn/Step共用はLocation data、索引化先行依存は `reader.previous()` で担います。

## 注意

- 増分イベントは、各deltaが安定idを持ち、昇順seqでreplayしたとき決定論的Stateを作る限り対応します。startが読めないときはアセンブラはpendingのContextを保ちStateを作りません。start読込前に描画が要るときは、終端やcheckpointイベントが全体フォールバックStateを担い、無関係なイベント走査で復旧はしません。
- 生Assistant差分はClient専用 `assistant/live-chunk` として届き、再接続基底がプロセス局所の圧縮streamを同transientへ広げます。履歴はdurableな `assistant/message`・`assistant/attempt` がcomplete compact streamを埋め込み、settledメッセージをlive deltaへは拡げません。Assistant出力を消費するDefinitionはlive chunkとdurable settlementを同一matching・update interfaceで扱い、無関連なDefinitionはstreamを展開せず `null` を返します。
- レンダラは `node.data` と制約付きLocation hookだけを消費します。Session event window、Context、Chat Nodesの走査は禁止です。
- 本文書は検証の義務を8項目で列挙します。全体replaceの最終一致、prependと全体replaceの一致、initial history+live appendの一致、未変化キー付きノードの保存、animation frameあたり最大1出版、pack runの単一matchとeight検定範囲などがその内容です。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/conversation.md
