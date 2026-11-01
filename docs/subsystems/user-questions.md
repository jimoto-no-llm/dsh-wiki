# ユーザー質問

エージェントが継続前に人間の回答を必要とするとき、ツールや許可プラグインが使うプロバイダ中立の語彙です。所有者は `dsh-user-questions` パッケージで、エージェントスコープのwaterfallリスナーが接続クライアントへの転送も含めて利用可能なUI面を合成します。

## 質問の構成

| 構造 | 意味 |
| --- | --- |
| `AskUserQuestionOption` | 1つの選択肢。`label` は表示と選択値の両方を兼ね、`description` は熟慮のための補足 |
| `AskUserQuestionItem` | 1問。安定した `id`（回答で返り、一括質問の宛先付けに使う）、本文、任意 `detail`・`header`・`options`、`multiSelect`、|
| `AskUserQuestionRequest` | 複数の質問を1つの配列に入れた要求。UIが関連プロンプトを1つの流れで見せられる |
| `AskUserQuestionAnswerItem` | 問ごとの回答。選択ラベル列 `selected` と、自由記述回答 `custom` |
| `AskUserQuestionAnswer` | 質問idで辿れる構造化回答のまとまり |

回答の取り決め: 単一選択では `custom` が選択を上書きし `selected` は空になります。multi-select では `custom` が `selected` のラベルを補足し得ます。空の `selected` と `custom` なしの項目は、まとまりの中で飛ばされた質問を保持するために使えます。

## 提示のintent

`AskUserQuestionIntent` は、その質問が「計画の承認」や「許可の承認」という決断そのものであることを示すタグです。UIがタグを知らなければ一般的な選択肢リストとして出すだけ（回答の符号化はどちらでも同一）で、プロトコルは変わりません。

| intent | 内容 |
| --- | --- |
| `plan-review` | 計画の確認。`detail` に計画markdownが必須で、`approve` が承認選択肢の名前を指定（位置ではなく名前で判定するため、選択肢の並びが判定材料にならない）|
| `approval` | 1つの阻止的な質問を要求。`approve`・`reject`・任意の `always` だけの選択肢で、multi-select と暫定待ちを拒否する |

`approval` の `subject` や `display` は見分けやすさのためのmetadataで、認可の識別ではありません。

## 使用できる場面

- `ctx.userQuestions.ask(request)` は承認者のwaterfallに尋ねて回答を待ちます。エージェントを渡した場合、人間との相互作用は生きた実行ルートそのものに限られます（実行の所有権が境界で、持続系の系譜ではない）。所有された子には人間の承認者がいないため、待ち続けることになります。
- ウォーターフォール `user-questions/request` が回答者たちを辿ります。回答を返せば請求を引き受け、`next()` なら委譲します。スコープ付きdispatch: agent-scopedリスナーはそのエージェントのみ受け取る。
- 期限つきの待ちが閉じたときは `askTimed` が `{ pending: true, callId }` を返します。pending とは「まだ回答できる」こと（空回答でも拒否でも確認でも許可でもない）です。

## 待ちと後発の回答

- 期限つきの質問は前景の有限窓内で待ちます。窓内の回答なら回答群を返し、閉じたらpending。Clientのclaimは業務Remoteストリーム（`attachWait`）で、残り時間を配信します。計時はclaimが無いうちはHost、claim後はClient側の時計で数えます。
- pending の質問はRemoteメソッド `answer(agent, callId, answer)` で継続的に受けられます。返信は source `user-question-reply`、outcome `answered`、payload `answer_to_pending_question` のユーザーメッセージとして所属エージェントを起床し、projectionを閉じます。
- `answer` は、開いている質問や未知のidには `false` を返し、二重返信に `REPLY_QUEUED`（Host再起動後でも）、不完全や重複の回答群に `BAD_ANSWER` を投げます。
- クライアントのパネルを閉じても何も送信せず、前景のタイムアウトはツールの待ちだけを終わらせます。継続された質問には締切がなく、受付されるまで答えられ続けます。Host再起動後も、Sessionが再開したら殆どの返信は新しいturnとして入ります。

## セッションの投影

`UserQuestionProjectionView` は、すべき質問の2つの半面をすべてのClientが同じ形で読む投影です。

| 半面 | 意味 |
| --- | --- |
| `active` | まだ回答を受けられる期限つき `ask_user_question` 呼び出し（ask順） |
| `settled` | 回答で決着した呼び出し（決着順）。窓内の回答はその回答群、後発の返信は遅れて届いた回答群 |

ブロッキングの旧来ツールで出された呼び出しはどちらの半面にも現れません。開いた質問はwaterfall経由だけで回答を受け、`continued` になったあとは `answer` 経由のみです。

## エラー

`UserQuestionError` は `HarnessError` の派生で、ツール実行はモデル向きの `{ name, code }` を保持します。

| コード | 意味 |
| --- | --- |
| `EMPTY_QUESTIONS` | 質問群が空 |
| `BAD_INTENT` | intentの扱いが不正 |
| `NO_PROVIDER` | 回答者がいない |
| `ASK_ABORTED` | signalがすでに、あるいは途中でabortした |
| `CALLER_NOT_LIVE` | 渡されたエージェントが実行レジストリの正確な生存インスタンスでない |
| `DELEGATED_CALLER` | その生存エージェントが別のエージェントに所有されている |
| `BAD_TIMEOUT` | 待ちが非整数・非正・巨大 |
| `BAD_ANSWER` / `REPLY_QUEUED` | 回答群の不備／返信の二重待ち |

## 注意

- 人間の回答が有効なのは、正確に生きている実行ルートへの要求に限ります。境界は持続的なセッション系譜ではなく実行の所有権で決まり、所有された子には人間の回答者がいないため待ち続けます。系譜を持つセッションが新しい実行ルートとして再開された場合は普通に質問できます。
- 回答UIは添付のwaterfallリスナーと、接続クライアントへ中継されるリスナーから合成され、どれか1つが要求を引き受けます（回答を返す）か、`next()` で次へ委ねます。
- 期限つきの待ちはClientのclaimと結びついています。claimが外れるとHostのtimerが残り時間の計時に戻り、Client側の切断もclaim解放として扱われます。
## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/user-questions.md