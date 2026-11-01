# ユーザー認証情報（Credentials）

`dsh-credentials` の認証情報シームは、秘密情報を設定から外します。settingsセクションと `cordis.yml` の要素は *リファレンス*（環境変数名）だけを持ち、`dsh-credentials-local` などのプロバイダが値を所有し、消費者は操作ごとに一度リファレンスを解決します。LLMアダプタはモデルリクエストごとに1度解決するため、ローテーションされた認証情報は再起動なしで次のリクエストから届きます。シーム全体に共通する規則として、保存値が空であればすべての層で不在として扱われます。

## 識別と2つのキー空間


| 概念 | 意味 |
| --- | --- |
| `CredentialRef` | 認証情報への名義参照。POSIX流の環境変数名で、shell-identifier文法が構成時に検証されるbranded型 |
| `ResolvedCredential` | 解決結果。非空の `value` と、供給した層の `source`（ローカルプロバイダは `env` / `file` / `project-env` / `user-env`） |
| `CredentialInfo` | 設定UI向きの情報（値を含まない）。`configured` / 供給層 `source` / 書込み可否 `writable` のみ |
| `CredentialKey` | プラグインが所持する認証記録のキー。承認grantに読むべき環境が無いため、レコードの在不在が事実の全体 |

## 使い方（`ctx.credentials`）

`CredentialProvider`（抽象seam）は参照半分と記録半分の2つの質問に答えます。

| メソッド | 挙動 |
| --- | --- |
| `resolve(ref)` | 現在値とsource層を返す。未設定は `undefined`。消費者は操作ごとに再解決し、操作を跨いでキャッシュしない（これがhot-update機構） |
| `describe(ref)` | 設定UI向けに、解決能・供給層・書込み可否だけを返す。値は絶対に露出しない |
| `set(ref, value)` | プロバイダ管理の書込み可能sourceへ永続保存。管理値はambientなフォールバックに優先し、空値は拒否 |
| `unset(ref)` | 管理sourceから除去。不在の除去はno-opで、除去後は起動環境や `.env` フォールバックが再び実効化される |
| `readRecord(key)` | 記録をその所有書込み者が書いた形のまま読む。payloadの解釈はしない |
| `describeRecord(key)` / `listRecords()` | 存在・判別子・書込み可否の記述。参照半分にはない列挙はこちらにだけある（レコードはsettings schemaから発見できない） |
| `modifyRecord(key, mutate)` | 直列化されたread-modify-writeで、唯一の記録書込み経路。排他はバッキングストアの対応する範囲でプロセスを跨ぐため、2プロセスが同時にrefresh tokenをローテーションしても先に書いた方が失われない |
| `deleteRecord(key)` | 記録を除去。不在の除去はno-op |

ローカルプロバイダは管理ファイルを起動環境より上位に置くため、保存は必ず実効的な書込み可能層を作ります。作成した設定値はUIの「configured」バッジ用に `credentials/reference-updated` で通知されますが、消費者には不要です（操作ごとの再解決が機構なので）。

## 使い方（`ctx.credentialsController` とwire側）

`CredentialsController` は生成Remote `ctx.remote.credentials` の背後にあるHostサービスで、seam本体が担わないwire上の義務を持ちます。バッチ上限・フィールドごとのview投影・参照文法のガード・拒否マッピングです。秘密値は単方向にだけ渡ります（書込のみ・読返しなし）。

| メソッド | 挙動 |
| --- | --- |
| `describe(refs)` | @Remote。複数参照を1往復で記述するバッチ。`MAX_DESCRIBE_REFS` を上限とし、文法外の名前は全体を `gateway/bad-request` で拒否 |
| `set(ref, value)` | @Remote。設定UIからの値書込み。この方向にのみ値が通る |
| `unset(ref)` | @Remote。参照の除去 |

## 認可フロー（`ctx.authorization`）

`AuthorizationService` は認証情報取得フローのレジストリで、キーごとに1試行ずつです。

| メソッド | 挙動 |
| --- | --- |
| `registerFlow(flow)` | キー・ラベル・methods・runnerの登録。キーの重複主張は `DUPLICATE_FLOW` で拒否（後勝ちで書式が壊れるのを防ぐ） |
| `list()` / `describe(key)` | 登録順の全フロー列挙。特定キーのエントリ照会 |
| `cancel(key)` | 進行中試行の撤退。要求固有signalと分離（Cancelボタンが別呼び出しで届くため） |
| `begin(request)` | 1試行を実行。同時試行は合流ではなく拒否（2人が同じフローの質問に答えるのを防ぐ）。`NO_FLOW` / `UNKNOWN_METHOD` / `ALREADY_IN_FLIGHT` / `NOT_COMMITTED` のthrows |

試行完了は `authorization/settled`（emit）で通達され、失敗を含むすべての終端outcomeで発火します。開始していない面（別ブラウザタブ）にも試行終了が伝わります。

## DeepSeekアカウント（`ctx.deepseekAccount`）

アカウント操作の抽象seamです。要求credentialを得られるのはHost消費者のみです。

| メソッド | 挙動 |
| --- | --- |
| `getState()` | 保存状態と直近ログイン試行のスナップショット。credentialやPKCE secretを含まない |
| `getProfile` / `getBalance` / `getUnnotifiedBonuses` / `ackBonusNotified` | profile・ウォレット残高・未通知ボーナスを独立に照会。サインアウトやgrant変化では `null` または `false` |
| `startSignIn` / `cancelSignIn` / `signOut` / `watch` | ブラウザ承認の開始（待機せずsnapshot返却）・試行単位の取消・ローカルgrant除去（APIキーは保持、revocationはバックグラウンド）・完全初始状態を含むwatch |
| `resolveToken(url)` | プロバイダが許した推論originにだけcredentialを解決 |
| `rejectToken(token)` | 推論拒否されたtokenを、現ログインと一致する間だけ除去 |
| `getPlatformSession()` | 構成済みPlatform origin向けのHost限定スナップショット。実profileの前にprofile要求を発行しない |

イベントは `deepseek-account/model-sign-in-required`（サインイン要請）、`deepseek-account/session-expired`（server拒否によるcredential除去。replayされない）、`deepseek-account/signed-out`（ローカル除去完了）がemitされます。

## 注意

- 空の保存値はどこでも不在: `resolve` はskipし、`describe` はunconfiguredと報告する。空値が設定済み秘密に成りすますことはありません。
- 参照半分に列挙はなく、設定面はsettings schemaから参照を知ります。レコード半分だけが `listRecords` を持つ（未install插件の残滓発見のため）。
- `credentials/reference-updated` と `credentials/record-updated` は別のイベントです。キー文法が互いに素なので、1つのリスナーが両方受けるとsubjectの所属空間を判別できないためです。リスナ失敗は同期throwも非同期rejectも隔離・記録されます。
- `PlatformSession` はHost限定のスナップショットです。account-controller RPC・AccountView・AccountDetailsからは除外されます。balance表現はrechargeウォレットをvalue、promotionウォレットをbonusWalletsで投影します。
- `AccountClientMetadata` は呼出元の `DSH_CLIENT_VERSION`、UI `locale`、操作開始時の `timezoneOffsetSeconds`（ローカル時刻からUTCを引いた秒数。UTC+8は28800）を持ち、credentialを含みません。ボーナス照会・ackは `x-client-locale` で開始UIの言語を使います。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/credentials.md
