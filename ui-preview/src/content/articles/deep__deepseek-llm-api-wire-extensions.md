---
title: "DeepSeek LLM APIのワイヤ拡張"
desc: "@deepseek-ai/dsh-llm-deepseek が、deepseek-official のMessagesリクエスト上で送る、DeepSeek Harness固有のHT"
cat: "deep"
catLabel: "深掘り"
chars: 6989
slug: "deep/deepseek-llm-api-wire-extensions"
---

# DeepSeek LLM APIのワイヤ拡張

`@deepseek-ai/dsh-llm-deepseek` が、deepseek-official のMessagesリクエスト上で送る、DeepSeek Harness固有のHTTPヘッダと追加JSONフィールドをすべて定義するリファレンスです。上流のDeepSeek APIが所有するフィールドを再定義しません。プロバイダ中立のLLMインターフェイスと `llm-pi-ai` はこれらの追加を実装しません。アダプタは解決された baseURL（設定されたgatewayを含む）へ追加を送ります。追加はmessages・systemプロンプト・toolスキーマの外側に置かれるため、モデル入力トークンを増やさず、モデルから見える接頭辞も変えません。

## ワイヤ名前空間とバージョニング

| 場所 | 命名 | 例 |
| --- | --- | --- |
| HTTPヘッダ名 | 小文字のkebab-case（HTTP照合は大小非依存） | user-agent、x-deepseek-harness-session-id |
| DeepSeekリクエストボディ拡張フィールド | 予約済み `dsh_` 接頭のsnake case | `dsh_plugin_packages`、`dsh_session_log` |
| DSH所有のネストされたJSONメンバー | camel case | afterSeq、throughSeq、sessionId |
| タグ付き値 | kebab-case文字列。永続イベントは domain/action | session-log-deepseek/delivery-accepted |

各ボディ拡張は自分の `version` を独立に所有します。バージョンは自分を含むオブジェクトにだけ適用され、別フィールドのバージョン同士に互換や順序の関係はありません。JSONメンバーの順序はプロトコルの一部ではありません。`DeepSeekLlmApiExtensionRegistry` は最上位の拡張名ごとに1つのプロバイダを予約し、空名・空白のみの名前・重複登録・基本DeepSeekリクエストとの衝突はHTTPディスパッチの前に失敗します。

## リクエストヘッダ

| ヘッダ | 送る条件 | 値 |
| --- | --- | --- |
| user-agent | Files API操作を含むすべてのプロバイダHTTPリクエスト | product/version (+url) 形式のアプリケーション識別。既定のproductは deepseek-harness |
| x-deepseek-harness-user-id | すべての認証済みモデルリクエスト | 解決されたHarness homeの安定した匿名UUID |
| x-deepseek-harness-session-id | Session idを運ぶモデルリクエスト | リクエストの sessionId の文字列そのままである値 |
| x-deepseek-harness-compact | purpose が compaction のモデルリクエスト | 文字列リテラルの 1 |

資格情報の失敗は匿名user-id解決の前に起こるため、未認可リクエストはこれらのヘッダを送らず、identityファイルも作りません。Session無しの直接リクエストは x-deepseek-harness-session-id を省きます。Session-titlingやAuto reviewのリクエストには追加のpurposeヘッダがなく、sessionId を運ぶなら通常のSession-id規則がそのまま適用されます。

## ボディ拡張のトランザクション

アダプタは、正確な messages を含む完全な基本ボディを直列化してから、登録プロバイダにフィールドの準備を求めます。プロバイダはその不変ボディと、リクエストキャンセルシグナルと、省略可能な sessionId と Auxiliary-call purpose を受け取ります。undefined を返すと、そのプロバイダのフィールドはそのリクエストから省略されます。

準備されたJSON値はプロバイダ所有の状態から切り離され、基本フィールドの最上位の兄弟としてマージされ、同じHTTPボディにまとめて直列化されます。準備に失敗した貢献者はそのリクエストから除外され（最初の失敗だけが記録）、他のフィールドは送られます。基本フィールドと衝突するフィールドはリクエストを防止します。マージ後のボディが直列化に失敗した場合、アダプタはどの拡張フィールドも付けずに基本ボディを送り、acceptanceトランザクションを飛ばすため貢献者は後のリクエストで状態を再送し、省略されたフィールド名を記録します。レジストリを持たない構成は拡張のない基本ボディを送ります。

設定されたエンドポイントがHTTP 2xxを返した後、アダプタはSSE応答本文を読む前に、準備された `accept()` トランザクションを実行します。転送失敗と非2xx応答では何もacceptanceしません。acceptance失敗は記録され、モデルリクエストを失敗させません。貢献者は未acceptanceの状態を後のリクエストで再送します。AcceptanceはエンドポイントレベルのHTTP成功を記録するもので、SSEストリームの完了や、エンドポイントが拡張を保存したことは意味しません。

## `dsh_plugin_packages`

`@deepseek-ai/dsh-plugin-package-inventory-deepseek` が、Loaderに支えられたアクティブなプラグインパッケージの完全な目録を提供します。このフィールドは既定で有効です。

```json
{
  "dsh_plugin_packages": {
    "version": 1,
    "packages": [
      {
        "name": "@deepseek-ai/dsh-example",
        "version": "0.1.1-rc.2"
      }
    ]
  }
}
```

| メンバー | 型 | 意味 |
| --- | --- | --- |
| version | 1 | `dsh_plugin_packages` のスキーマバージョン |
| packages | 配列 | このリクエストのアクティブな全集合 |
| packages[].name | string | 所有マニフェスト由来の正確な空でないnpmパッケージ名 |
| packages[].version | 省略可能なstring | 同じマニフェスト由来の正確な空白でないバージョン。取得できないときは省略 |

送信者は毎リクエスト、ホストツリー（そのリクエストのSessionが対象ならスタンディングのagent-presetツリーも）からアクティブな非groupのLoaderエントリを再読みします。同名マニフェストに空白でないstringバージョンがない場合、private のいかんにかかわらず { name } だけが貢献します。名前不足や読めないマニフェストは該当エントリだけを省き、パッケージメタデータがリクエストを止めることはありません。送信者は (name, version省略可) の同一ペアを重複除去し、まず name 次に version で、ロケール非依存の比較・バージョン不在が先という並びで整列します。1つのパッケージの複数の同時アクティブバージョンは、name-onlyエントリも含めて別エントリのままです。受信側はバージョン不在を許し、配列をパッケージ名で縮約してはならず、配列順から活性を推論してはなりません。無効や保留中・失敗・卸載中・破棄済み・構造的なLoaderエントリは現れません。通常の依存関係や、名前のある所有パッケージを持たない疎モジュール、プログラム的にマウントされた子fiber、メモリ上の動的プラグインも、権威あるLoader裏付けのパッケージ識別を持たないため現れません。

有効な目録に該当エントリがなければ packages: [] を送り、貢献者を無効化すると `dsh_plugin_packages` フィールド全体が省かれます。パッケージ識別はプロバイダメタデータで、モデル入力には入りません。

## `dsh_session_log`

`@deepseek-ai/dsh-session-log-deepseek` が、正規のSessionログの1本の連続した接尾辞を提供します。既定で有効です。ライブなSessionと1つ以上のイベントがあるリクエストに適用し、直接リクエスト・staleなSession id・空のログ・登録済みアップロード除外に一致するリクエストでは省略されます。最初のpendingイベントだけでも maxBytes を超えたり直列化できないリクエストも省略し、構成は enabled: false で無効化できます。

```json
{
  "dsh_session_log": {
    "version": 1,
    "sessionFormatVersion": 2,
    "session": { "version": 2, "id": "session-id", "createdAt": 1780000000000 },
    "afterSeq": -1,
    "throughSeq": 0,
    "events": [
      { "type": "turn/start", "seq": 0, "time": 1780000000001, "data": { "turn": 1 } }
    ]
  }
}
```

まず最初のアップロードは afterSeq: -1 とし、以後のアップロードは同じSession idについてのaccepted済み最大watermarkの後から始まります。各アップロードは、そのwatermarkの後から、ヘッダと数値項目を含めてUTF-8バイト数で数えた（既定では8MiBの）maxBytes に収まる最長の連続実行を運びます。上限を超える未送本文に対しては複数回のaccepted済みリクエストに分割されます。送信者はイベント配列をリクエストごとに1回だけsnapshotし、snapshot後の追加分は次のリクエストに属します。

session メンバーは論理Sessionメタデータの生JSONプリミティブへの投影です。seededなSessionは正確な `Session.inheritedEventCount` を seedLength として送り、非seededは省略します。論理の isSeeded フラグはネットワークに現れません。外側の `dsh_session_log.version` が拡張スキーマを選択し、session.version が論理Sessionフォーマットを選択します。Sessionヘッダ投影の変更は、埋め込まれた論理フォーマットが変わらない場合でも、拡張スキーマのバージョン上昇を要求します。ヘッダの項目は version・id・createdAt が必須で、cwd や parentSession（forkの親Session id）、origin（サブエージェント子のリテラル subagent）、delegationDepth、agentPreset が省略可能です。

events の各項目は、他のどのリクエストフィールドからも独立した生JSONプリミティブの正規イベントを運びます。すべてのイベントは type・数値 seq・time・data を含み、`ignorable: true` は存在すればそのまま保持されます。surfaceイベントは surfaceOp を要求し、置き換え範囲は数値の startSeq と endSeq を使い、system・user・toolイベントは数値の sourceEventSeqs を運べます。アシスタントのプロバイダメタデータは埋め込みストリーム内に残ります。既知のログだけイベントはsurfaceメタデータを省き、復元された未知のignorable記録は不透明メタデータを保持し、surface操作としては扱いません。

### Acceptance watermarkとat-least-once配信

エンドポイントがHTTP 2xxを返した後、貢献者は同じSessionへ session-log-deepseek/delivery-accepted という正規イベントを追記します。delivery-accepted は、含まれていたLLMリクエストに対して設定エンドポイントがHTTP 2xxを返したことを意味します。SSE完了や、遠隔での保存は意味しません。イベントの throughSeq はより前のイベントを指し、sessionId は接尾辞を送ったSessionを示し、sessionFormatVersion がwatermarkをその論理世代に結び付けます。不在は歴史的なフォーマットv0を意味します。

送信者は現在のSession idとフォーマット世代に対する最大の一致 throughSeq をfoldするため、並行したaccepted済みリクエストがカーソルを後退させることがなく、別世代のwatermarkが現行接尾辞を承認することもできません。resumeしたプロセスは永続ログからカーソルを再構築します。forkは別Sessionを指す継承watermarkを無視するため、自らの継承済み接頭辞をシーケンス0から、maxBytes に収まるリクエストで送り上げた後に、子idで進めます。watermarkイベント自体は、次の未送接尾辞に属します。

転送失敗・非2xx応答・直列化失敗後に拡張フィールドなしで送られたリクエストは、watermarkを追記しません。エンドポイントのacceptance後でローカル保存前のクラッシュは、既にacceptedされた範囲を再送することがあります。不確実性は重複を生み、シーケンスのgapは決して生みません。独立したupload storeや切り詰め経路は存在せず、各リクエストのフィールドを maxBytes が縛ります。

## 公開されるものと受信側の要件

リクエストヘッダはHarnessアプリケーションバージョン、1つの匿名Harness-home識別、省略可能なSession識別を公開します。`dsh_plugin_packages` はアクティブなnpmパッケージ名とバージョンを公開します。構成で無効化しない限り、`dsh_session_log` はSessionの作業ディレクトリ・systemプロンプトsnapshot・userとアシスタント内容・埋め込みアシスタントストリーム・失敗attempt出力・ツール引数と結果・要約・フィードバック・プラグイン所有イベントを公開し得ます。アダプタのAPIキーはSessionイベントではないため、このフィールドに入りません。baseURL で選ばれたgatewayは公式エンドポイントと同じ値を受け取ります。

受信側は拡張フィールドを名前で扱い、各フィールドを自分の version で振り分け、別のパッケージバージョンを保持し、JSONメンバー順序を無視します。Session-logレシーバはイベント型を解釈する前に連続シーケンスの範囲を検証します。`ignorable: true` のない未知の正規イベントは、損失なしの再構築を妨げます。レジストリや特定の貢献なしでも基本リクエストは使い続けられます。フィールド不在は、その貢献がそのリクエストに適用されなかったことを意味します。Session-logのbacklogが排出されている間は throughSeq がSessionの最新イベントに追いつかないため、2xxが受信側が現行ログを保持していることを示しません。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/deepseek-llm-api-wire-extensions.md