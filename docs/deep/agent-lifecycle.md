# エージェントライフサイクル

この文書はエージェントのターン（turn）とステップ（step）がどう駆動されるかを、アーキテクチャのターンフローの視覚的な補助資料として説明します。元文書ではcuratedなMermaidシーケンス図で表現されていますが、ここでは同じ流れを段階説明として解きほぐします。永続再生の事実は `session/event` に置かれ、生きた制御・状態は `agent/*` に置かれるのが基本方針です。

## イベントの分類

| 区分 | 役割 |
| --- | --- |
| `agent/inbox/*`（spliced / inserted / claimed） | 受信箱キューの差し替え・追加・クレームの通知 |
| `agent/status` | running / idle など生きた状態の表示 |
| `session/event`（`turn/*`・`step/*`・`system/message`・`user/message`・`assistant/*`・`tool/*`） | 永続再生を可能にする記録 |
| `agent/pre-step`・`agent/request`・`agent/request-error`・`agent/turn-stopping` | hookリスナーのwaterfall（進入制御・リクエスト操作・リトライ判断・終端検査） |

## ライフサイクルの流れ

1. ユーザーが `followup(content)` を呼ぶと、エージェントは `agent/inbox/spliced` と `agent/inbox/inserted` をSDKリスナーへ通知します。
2. キューの仕事がドライバを目覚めさせ、`agent/status` が running になります。ドライバはセッションに `turn/start` を記録します。
3. ドライバは次のstep入力の保留分と1件のキュー済みプロンプトをクレームし、1件ごとに `agent/inbox/spliced`（純粋な削除）と `agent/inbox/claimed` { message, turn } を通知します。
4. 提案されたstepごとに1回、`resolve({ agent, modelSelection, signal })` でツール群を解決します。
5. `system-prompt/assemble` のwaterfallがstepのツール集合とともに実行され、次いで `agent/pre-step` のwaterfallが走ります。リスナーは権威的に拒絶するか `enter(messages)` に入ります。
6. stepが拒絶された、最初のバッチが空、pre-step失敗のときは、クレーム済みバッチを取り除いたまま終了します。開いたターンはstepを1つも費やしません。
7. 承認された場合、`step/start` を記録し、`agent/request` のwaterfallを経て `ctx.llm` へ `prepareCall(config, signal)` を行います。このどちらの非同期段でもキャンセルされると、systemもusersもコミットしません。
8. 準備済みコール能力を使った同期アドミッションの後、`system/message`（ノードごとの順序付き照合）、`user/message`（入力メッセージごと）、必要に応じて `request/header` と `request/context` を記録します。
9. ログからリクエストを導出・凍結し、`llm/stream` のwaterfallを通して準備済みコールを束縛して実行します。ドライバは `agent/assistant-stream` のchunkをSDKへ配信し、LLMはStreamChunkを返します。
10. 最終アダプタのエラー、または途中（in-band）のリクエスト失敗で打ち切られたとき、`assistant/attempt` を記録し、`agent/assistant-stream` の完了端を通知してから `agent/request-error` のwaterfallに入ります。リスナーはリトライアクションを返すか元のエラーを保持します。リトライは開いたstepの中で行われ、同一のレンダリング済み組み立ての準備と照合をやり直しますが、pre-stepとuserアドミッションは繰り返しません。
11. モデルリクエストが成功したら `assistant/message` を記録し、`agent/assistant-stream` の完了端を通知します。
12. pending callをexecutionModeで分類し、barrierと有界のrolling poolの中で実行します。開始前に再分類します。開始時に `tool/call` を記録し、順序付きpre → 並行execute（ツール所有のイベントがあればセッションにも記録）→ 次のモデル順の結果が整い次第、順序付きpostと `tool/result` という順序で進みます。
13. `step/end` を記録してstepのツール集合を破棄します。自然停止で次stepのinboxが空なら、`agent/turn-stopping` のserialなterminal checkpointへ進みます。
14. ここに次stepの入力が保留されていれば、クレーム、`agent/inbox/claimed`、`agent/pre-step` のwaterfall（5〜7に相当）をもう一度行います。
15. 最後に `turn/end` を記録し、`agent/status` を idle にします。

## 失敗した試行の取り扱い

`assistant/message` は成功したすべてのプロバイダコールを記録します。内容ゼロの応答や `max-tokens` による終了も含み、正確なcompactなtimed streamを埋め込みます。空の内容は派生履歴に入りません。失敗・リトライ・キャンセル・streamエラーで、表面メッセージなしに完結に達した試行は `assistant/attempt` に記録されます。生きている `agent/assistant-stream` のchunkフレームは過渡的なもので、再生はどちらかの永続完結を読みます。完結前にプロセスが失われると、永続的なattempt streamは残りません。

`dsh-compaction-basic` はリクエスト導出前の圧迫に `agent/pre-step` を使い、正規のcontext overflowに限って `agent/request-error` を使います。どちらかの発火条件が成立すると、要約選択の前に任意のtool-result剪定が走ります。回復は開いたstepの中で行われ、剪定または要約が表面の置き換え世代を進めたときにだけリトライし、そうでなければ元のリクエストエラーが権威のままです。リトライのたびにコールを準備し、リクエスト導出の前に保持されたレンダリング済み組み立てを照合します。組み立て・pre-step・userアドミッションの繰り返しは行いません。

要約すると、成功したプロバイダ呼び出しは常に `assistant/message` が担い、表面メッセージのない完結した試行は `assistant/attempt` が担います。両方ともセッションログに残り、再生の読者はここから表面の実際を見分けます。

## 注意

- turn・step・round（goal roundなど）の階層関係は用語集の「loop hierarchy」を参照してください。goal roundはgoal由来の1つのturnとして、この一連のフローに乗ります。
- `agent/inbox/*` やclaim操作のような生きた決定はSDKのcoordination層に留まり、セッションログには `turn/start` から `turn/end` までの記録として現れます。
- `agent/pre-step` が返す判断は権威的です。`next()` を包むリスナーは、置き換えが意図的でない限り、下流のメッセージと `startsRequestSeries` を保持します。
- steeringや注入されたcontextも、後続のclaim操作がその次stepバッチを受け取ったあと、同じwaterfallを通って進みます。
- 再生可能なtranscriptデータが必要なSDK利用者は `session/event` を消費してください。`agent/*` はキュー・状態・プロンプトの割り込み・リクエスト構築・steering・継続・エラーのための、生きたcoordination APIです。
- 正確なイベントシグネチャは生成されたCordisカタログにあり、このページはcuratedなMermaidシーケンスとして維持されます。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/agent-lifecycle.md