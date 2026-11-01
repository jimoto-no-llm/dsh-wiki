# 恒久アタッチメント（Durable Attachments）

アタッチメントシームは、画像と汎用ファイルのバイナリ所有権をセッションログから分離します。生産者はバイト列を `ctx.attachments` に渡し、サービスはオブジェクトが恒久化された後でのみ、不変のcontent-addressed参照を発行します。セッションイベントとモデル可視のアタッチメントブロックが含むのはその参照とメタデータだけであり、ブラウザのオブジェクトURL・Host一時パス・プロバイダURL・base64ペイロードは決して入りません。独立した `ctx.fileUploads` サービスがブラウザのファイル転送をステージ済み受領（receipt）として受信Agentへ結び付けます。

未送信のブラウザドラフトはメモリに留まれ、ネイティブクライアントはOS一時領域にステージできます。ブラウザの汎用ファイルはステージ済み受領を付与される前に恒久化されます。Hostがユーザーメッセージを受け入れると、その画像は `＼DSH_HOME］/attachments/v1` 配下へ、ユーザーイベントの追記前に移動します。モデルの構造化画像出力も同じpersist-before-event（追記前の恒久化）規則に従います。

## 識別と検証済みメタデータ

| 概念 | 意味 |
| --- | --- |
| `AttachmentId` | brandedの不透明文字列。ローカルバックエンドは現在 `sha256:＼digest］` を出すが、消費者はその表現を解析したりファイルシステムパスを導出したりしてはならない |
| `ImageAttachmentRef` | 恒久的・直列化可能な参照。`attachmentId` / 検証済み `mediaType` / `bytes` / `width` / `height` / 任意 `name`（パス情報を剥がした表示名） |
| `originalDimensions` | EXIF向き適用後・正規化スケール前の入力寸法。正規化が縮小したときだけ存在 |
| `ImageAttachmentLimits` | 配置で解決された受付上限（upload受付と要求バッファで使用） |

参照は本質寸法とエンコード長を記録するため、クライアントはデコードなしで履歴を配置できます。読み取り時は保存オブジェクトを参照のID・書式・バイト長・幅・高さで検証します。`name` と `originalDimensions` は保存バイトと照合せず、呼び出し側が渡した表示情報としてそのまま返ります。ローカルバックエンドの受付上限は、1メッセージで最大20画像・200 MiBのエンコード元データ、1元で最大50 MiB・64,000,000ピクセル・各辺65,535px。この元データ上限は、独立した正規化段階（長辺2048px・エンコード4 MiBが既定）の前に適用される別の上限です。

## 受付とコミットの型


| 型 | 意味 |
| --- | --- |
| `PromptContentPart` | Host promptの入口で受理されるブラウザ提出内容（textまたはbase64画像） |
| `AttachmentAdmissionPart` | 受領解決後のprompt内容。エンコードが済んでいない画像、または同一セッションがステージング済みの保存済み画像（`encodedBytes` 付き）を含む |
| `AdmittedPromptContentPart` | すべてのアタッチメントが恒久参照になった、Host受理済みprompt |
| `StoredImageAttachment` | 参照とダイジェストの検証後に返る保存済みバイト |
| `ImageRequestTarget` | 1つの正確なモデルルートが選んだ決定論的な要求画像目標（width/height/maxBytes）。目標が元より大きければ元寸法を保つ |
| `RequestImageAttachment` | プロバイダ非依存の正規化アタッチメントから派生したキャッシュ済み要求版。`variantId` はattachment id・ポリシー・固定エンコーダパラメータへ跨るキャッシュとアップロード索引の鍵 |

## 使い方（`ctx.attachments`）

`ctx.attachments` は `AttachmentStore` という抽象seamです。実装は参照を発行する前にバイトを検証します。

| メソッド | 挙動 |
| --- | --- |
| `validateImage(input)` | 検証してエンコードラスタを完全にデコードするが、永続化はしない。バッチ呼び出しはどのメンバーも保存せずに全メンバーを検証 |
| `saveImage(input)` | プロバイダ非依存の正規化アタッチメントを整備し、アトミックにコミットしてから参照を返す |
| `saveImages(inputs)` | 検証済みの全メンバーを一度に整備してからバッチを発行する。検証拒否は部分オブジェクトを残さず、再デコードや再品質選択もしない |
| `admitPromptContent(content)` | Host promptを受ける。エンコード画像を恒久参照に置換し、text・恒久ファイル参照・保存済み画像はそのまま通す。画像のないpromptは記憶操作をしない。wire呼び出し元が未アップロードのアタッチメントを引用できなくなる |
| `admitEncodedImages` / `admitEncodedFile` | 他のwire入口向け入口。件数・合計バイト・順序付きバッチ受付を `saveImages` に委譲 |
| `readImage(ref, signal?)` | セッション履歴に触れずに、正規化オブジェクトを参照の全項目に対して検証し、バイトと参照を返す。アクセスポリシーは呼び出し側APIの責務 |
| `readImageRequest(ref, target, signal?)` | ルート指定の寸法とバイト目標に正確な決定論的request版を派生・キャッシュ。実行世界のパスは含まない |
| `saveFile` / `saveFileStream` / `readFileStream` | ファイルはバイト完全一致で保存。受付上限は一切なし。stream系はbackpressureを強要し全体をメモリに集めない |
| `imageHostPath(ref)` / `fileHostPath(ref)` | プロバイダ所有のHostオブジェクト位置だけを公開。実行世界が読めるかは決めない |
| `isAttachmentError(error)` | 安定したコードでこの能力の失敗かを判定 |

## 使い方（`ctx.fileUploads`）

ブラウザ転送とステージ済み受領を、受信エージェントの正確なセッション単位で管理するHostサービスです。

| メソッド | 挙動 |
| --- | --- |
| `upload(agent, request, signal)` | @Remote。canonical base64のアップロードを恒久化し、受領と恒久ファイル参照を返す |
| `uploadStream(request)` | 生チャンクをセッション単位で保存し、アップロードを集約しない |
| `uploadImageStream(request)` | prompt画像をprompt受付と同じ方式で検証・正規化・保存。あとから受領経由で引用できる |
| `resolve(agent, receiptId)` | ステージ済み受領を受信Agentの正確なセッションで解決。未知または他セッション由来の受領は `undefined` |
| `bindPrompt(agent, receiptIds, requestId)` | promptがAgent inboxに入る間、受領を結び付ける。解放は前の結合を復元し、成功交付のcommit時にのみ保持する |
| `retirePrompt(agent, requestId)` | queue除去に伴う全受領を退職させる |

## 注意

- `PromptContentPart` の画像は、あらゆるメッセージ作成前に `ctx.attachments.admitPromptContent()` で参照へ昇格されます。wire呼び出し側は自分がアップロードしたことのないアタッチメントを引用できません。
- 記憶開始前の取消は何も保存せず、取消されたuploadは受領を受け取りません。保存が開始済みだった画像はcontent-addressedストアに残ります。
- request版の新規entryは発行前に完全にデコードされ、受信キャッシュ版は境界付きメタデータprobeを使用します。順序付きバッチが要るときは単一メソッドで `Promise.all` を使います。
- 正規化アタッチメントの要求版には `depth: 'uchar'`・`space: 'srgb'` 等のプロバイダ互換の実測値が記録されます。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/attachment.md
