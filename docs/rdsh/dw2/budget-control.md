# 予算アドミッション制御（#45）

検証済みの DSH 0.2.0-rc.2 ACP adapter に、オプトインのソフト警告とハードなアドミッション上限を追加します。新しいガード付きjobとモデル呼び出しは入口で検査し、既存の呼び出しは継続させます。キュー・モデル/プロバイダ選択・レスポンスチャンクはそのまま素通りさせ、本家のprofile boot・retry・Rust passthroughには触れません。middlewareの拒否は `next()` の手前でthrowし、その試行を終了させます。

## 金額と予約

管理者がUTCの期間・スコープ・通貨・コストソースを1つ選びます。`provider_usage`、`cli_report`、`api_estimate`、`invoice_actual` はcost ledgerと同じ語彙ですが、金額は別管理です。cost ledgerの観察が、明示的な期首ベースラインと呼び出しごとの最終領収書の根拠を供給します。アドミッションledgerは管理者の金額/根拠を記録するもので、請求書の検証や部分コストカードの自動化にはなりません。ガードの外の既存支出は期首ベースラインで吸収し、ガード付き呼び出しをベースラインと領収書の両方に数えません。`baseline: null` はアドミッションをブロック、`0` は明示的なオペレータ宣言です。

アドミッション検査は ベースライン + 決済済み呼び出し金額 + 未決済予約 の合計です。小数文字列は9桁の小数部まで扱えます。プロジェクト/runの上限は同時に適用され、1つの呼び出しは一致する各スコープで一度ずつ数えます。重複するpolicyは同じsource/通貨/期間を使い、各上限が同じ最大call予約に対して検査されます。

硬い上限に達すると新しいjobは拒否され、予約が上限超えになる呼び出しも拒否されます。残りちょうどを予約すればその呼び出しは許可され、次は止まります。ソフトは警告のみで停止しません。予約は**潜在的コストの見積もりであり、確定請求額の保証ではありません**。使用量の遅れや予約超過の呼び出しは超過を晒し得ます。トークン使用からドル価格を捏造せず、uncached input・cache-read・cache-write・outputのカウンタだけを記録します。

呼び出し完了後の最終領収書は予約を選択ソースの金額で置き換えます。未知の金額は保留を維持します。同一receipt IDは冪等で、金額・ID・通貨・ソース・時刻の競合は拒否します。決済済み金額の黙示的な書き換えはなく、訂正は将来のオペレータ照合に委ねられます。実行中の呼び出しは不完全な観察から決済できず、完了確認の欠落は予約を保持します。

## オペレータの設定

先にプロジェクトのローカルdashboardを起動します。現在の期間と実際の期首根拠を含むpolicy JSONを保存します。

```json
{
  "policy_id": "project-budget",
  "expected_revision": 0,
  "run_id": null,
  "period_start": "2026-10-06T00:00:00Z",
  "period_end": "2026-10-07T00:00:00Z",
  "currency": "USD",
  "source_kind": "provider_usage",
  "baseline": "0",
  "baseline_basis": "本スコープ・期間の明示的な期首支出",
  "soft_limit": "8",
  "hard_limit": "10",
  "call_reservation": "1",
  "paused": false,
  "active": true,
  "reason": "Operator authorizes this guarded execution budget"
}
```

WSLのネイティブDSHではdashboardと制御CLIを同じWSL環境で、ネイティブNode/entrypointの明示パスで実行します。Windows→WSLの起動shimはこのガードの検証済み起動境界の外です。

```sh
node dashboard/cli.mjs budget policy --project /repo --input-file policy.json
node dashboard/cli.mjs session-ledger start --budget-guard --worker-id worker-1 \
  --project /repo --executable /native/node --entrypoint /installed/dsh/lib/bin.js
node dashboard/cli.mjs reply-consumer serve --budget-guard --worker-id worker-1 \
  --project /repo --run-id RECORDED_RUN_ID \
  --executable /native/node --entrypoint /installed/dsh/lib/bin.js
node dashboard/cli.mjs budget inspect --project /repo
```

`session-ledger start/resume` は元のセッションを確認してから所有プロセスをプロンプト無しで停止します。`reply-consumer` はそのガード付きセッションを通じて人間の指示を送ります。JS attachment APIは `budget: { worker_id: "worker-1" }` も受けます。run固有policyは `run_id` に記録済みrun IDを置き、プロジェクトpolicyと併用します。worker IDはラベルであり権限を追加しません。

呼び出し側はネイティブバージョンをprobeしてからjobを原子的にadmitします。クレデンシャル無しの一時patchがネイティブ `--patch` 経由でプラグインを参照し、per-job producer keyは子の環境だけに渡ります。ネイティブ登録の観察がprompt許可の前提です。停止/exitはkeyを失効させpatchを除去します。

呼び出し完了後はinspectのcall IDで最終コスト観察を保存します。

```json
{
  "event_id": "source-observation-001",
  "call_id": "CALL_ID_FROM_INSPECT",
  "amount": "0.42",
  "currency": "USD",
  "source_kind": "provider_usage",
  "source_ref": "クレデンシャルを含まない特定可能なコスト観察",
  "observed_at": "2026-10-06T01:00:00Z",
  "basis": "この完了呼び出しの選択ソースによる最終金額"
}
```

```sh
node dashboard/cli.mjs budget usage --project /repo --input-file usage.json
```

観察時刻は記録された完了時刻より後で、サーバー時計を超えないこと。期間終了後の到着は許されます。実際のプロバイダ価格・認証情報・請求書取込はオペレータ統合のままで、hookはbilling呼び出しをしません。

## 権限、再起動、適用範囲

上限・予約サイズ・pause/resume・active状態の変更にはローカル管理者credentialとexpected revision・reasonが必要です。scope/通貨/ソース/期間/baselineはpolicy内で不変で、新期間には新しい明示baseline/policyが要ります。未解決の呼び出しがあるpolicyは停止できません。上限引き上げは監査対象の選択で、モデル/プロバイダの自動ダウングレードはありません。

MCP/ブラウザkeyは公開状態を読めるだけです。producer keyはhook登録・admit・自分のjobの呼び出し完了だけを行い、上限の緩和や決済はできません。制御/producer経路は直接loopback必須で、`Forwarded` 系ヘッダ付きの要求は拒否します。Tailscale ServeやHTTPリバースプロキシ経由では使えません。よってbudget controlはdashboardホスト上で実行します。prompt/メッセージ、API key、生のモデル応答はjournalしません。既存の6つのproject MCP toolはそのままです。

全admission/書き込みはdashboardの単一project update queueを使い、応答消失は自動再dispatchしません。予約はproducer切断・プロセス死・完了確認欠落・サーバー再起動の後も保持されます。keyはライブのみで、再起動後のサーバーは旧ownerをunknownとしてcredentialを拒否します。未決済の資金は保留のままに置かれ、新しいガードにはネイティブattachmentを開き直します。硬い上限到達後もstop/cleanupは使えます。適用は `--budget-guard` またはJSオプションを明示したattachmentだけです。通常のDSH起動とCodex/Claude/Kimiは表示専用です。

## 実務上の注意

- 予約は概算です。遅れた使用量や予約を超える高額呼び出しは超過支出を生み得ます。screen上の実行中/未知の呼び出し・保留金額・選択ソース・超過を随時確認します。
- 決済の訂正手段はまだありません。金額・ID・通貨・ソースに競合があるreceiptは拒否されます。入力は慎重に行います。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/BUDGET-CONTROL.md
