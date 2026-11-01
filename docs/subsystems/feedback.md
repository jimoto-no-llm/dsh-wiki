# メッセージフィードバック

`@deepseek-ai/dsh-message-feedback` は、個々のアシスタントメッセージに対する編集可能なフィードバックを所有します。正典のセッションログは `feedback/message-put` と `feedback/message-delete` を保存し、不変のセッションレベル所感 `feedback/record` は `@deepseek-ai/dsh-command-feedback` が、両者が下敷きにする `FeedbackCategory` 分類とともに所有します。3種ともログ専用のイベントであり、モデルコンテクストには決して入りません。

## 公開型

| 型 | 意味 |
| --- | --- |
| `MessageFeedbackVersion` | 特定1項目のrevisionを表す不透明なcompare-and-setトークン |
| `MessageFeedbackRating` | 人間の総合判断。`positive` / `negative` の2値 |
| `MessageFeedbackItem` | `messageId`、`rating`、任意の `note`（検証後に文字どおり保持）、任意の `category`、`version`、Host採番の `createdAt` / `updatedAt` |
| `MessageFeedbackPut` | 実質的な生成または編集。編集後の完全な現在値を含む。forkの継承feedbackは親に属す |
| `MessageFeedbackDelete` | 現在の項目1つを実質的に削除した記録 |

`FeedbackCategory` は固定の7分類で、idはdurableログの語彙です: `task-result` / `instruction-following` / `product-interaction` / `service-stability` / `resource-cost` / `security-privacy-permission` / `other`。

## 操作と失敗

`ctx.messageFeedback`（`MessageFeedbackService`）はセッションログのサービスであり、cold操作はSessionやAgentを構成しません。

| メソッド | 挙動 |
| --- | --- |
| `list` | @Remote。persistent Sessionの全feedbackイベントを読み、初回生成順の現在値スナップショットを返す。確定的なpersistence missは `session-not-found` |
| `put` | @Remote。createまたはreplace。現在versionとの照合を行い、値が変わらない一致の再put（no-op）はversionを保持しイベントを追記しない |
| `delete` | @Remote。version照合後の削除。すでに存在しない項目の削除はイベントなしで成功する（`absent: true`） |

失敗は安定したbusiness failureコードで返ります。

| コード | 意味 |
| --- | --- |
| `session-not-found` | 指定idのpersisted Session headerが存在しない |
| `target-not-found` | idが派生・append-originのアシスタントメッセージを名指さない |
| `version-conflict` | 現在versionと不一致。authoritativeな現在項目（存在しなければ `null`）を同梱 |
| `note-blank` | noteが非空白文字を1つも含まない |
| `note-too-large` | noteが設定のUTF-8バイト上限を超過。`maxBytes` / `actualBytes` 同梱 |

## セッションレベルの所感

`ctx.sessionFeedback`（`SessionFeedbackService`）の `record` は、生きているSessionへの所感を記録するHost Remoteです。`text` と `category` はともに任意で、どちらも無い提出でも「人がSessionのreviewを求めた」こと自体を記録します。それがログ配布を承認する条件です。返値 `recorded: true` は、セッション自身のスケジュールでflushが続く、追記済みの安定な事後条件です。live Sessionsのみを扱い、それ以外は `session-not-found` を返します。

## データと整合

現在の項目は、payloadの `sessionId` が所有Sessionに一致する正典feedbackイベントの畳み込み（fold）から得られます。version等は等値のみで、名指されたメッセージに対してだけ比較され、大小付けや合成は行いません。`put` は厳密な楽観的並行制御で、既存項目へのすべての要求が現在の `ifVersion` に一致する必要があります（rating・note・categoryが同じ単純な再putもno-opとして扱われます）。conflictはauthoritativeな現在値を返すため、もう一度読まずに並行編集を和解できます。読み取りと変異はSession単位のqueueで直列化され、cold変異はread・比較・追記・flushに渡ってpersistence書込みhandleを保持します。成功した変異はcanonical persistenceをawaitし、persistence失敗は成功と報告されません。

fork seedは親のfeedbackイベントを含めますが、payloadが親の `sessionId` を保つため、子の現在feedbackにはなりません。削除はtombstoneの追記であり、以前のratingとnoteはログに残ります。

## 使い方（Web UI と `/feedback`）

- コントロールは `conversation.chat.assistant-actions` list slotの `feedback` entry（順序10）で、確定済みアシスタントメッセージのIconActions行内に `ui-conversation` が描画します。中断で凍結された部分メッセージには `messageId` がないため、描画側はスロットを飛ばします。
- 1セッションにつき1つの `MessageFeedbackController` が全メッセージコントロールを裏付けます。`list` の1回の読みでtranscript全体が撒かれ、mountではなく初回hover/focusに延期されます。各変異はコントローラが最後に観測したversionを `ifVersion` として送り、`version-conflict` 返信に付属するauthoritative項目でreconcileします（再取得しない）。
- 未記録の判定からはfeedback dialog（`conversation.input.overlay` の `feedback-dialog` entry。7分類チップと詳細boxを持つ共通Modal）が開きます。提出は選ばれた判定に整えた説明（またはどちらも無し）を載せ、成功でdialogを閉じ、acknowledgement toastを出します。失敗はdialogとdraftを保持し警告toastを出します。
- スラッシュ無しの `/feedback` は `ui-commands` のdecorationが `action` としてrouteし、dialogを開いてから `sessionFeedback.record` で記録します。`/feedback ＼text］` はHost command経路を保ちます。

## 注意

- cold要求は全ログを読みます。項目数や合計バイトの上限はなく、`maxNoteBytes`（必須。Web Host構成では8192）はnoteだけを境界付けます。
- operation queueはプロセス局所であり、cold writer排除は選択されたpersistence providerに依存します。
- live離脱直後からpersistence catalogがheaderを物質化するまでの狭い区間では `session-not-found` が返り得ます。retirement物質化後に再試行します。
- Host契約は認証されたactorや監査identityを記録せず、trusted caller境界を仮定します。
- Webコントロールはchatビューだけです。trajectory・waterfallビューはassistantノードが同じ `messageId` を持っていてもfeedback entryを描きません。
- Webコントローラはfeedbackログイベントを消費しないため、別タブの判定は再接続か次のconflict返信で見えます。
- Session remarkにはサイズ上限がありません（`/feedback` コマンドが当初から上限を設けていないため）。dialogは `maxNoteBytes` を入力時にプレチェックしないため、大きすぎる説明は提出時に `note-too-large` で失敗します。
- 既定では `session-log-deepseek` がfeedbackを通常の `dsh_session_log` suffixとして後続の対象DeepSeek要求に乗せます（`enabled: false` で無効化）。記録はLLM要求や別途の `dsh_feedback` uploadを引き起こしません。非DeepSeekルートではOTelバックエンドがrecorded feedback経由で正典prefixを解放します。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/feedback.md
