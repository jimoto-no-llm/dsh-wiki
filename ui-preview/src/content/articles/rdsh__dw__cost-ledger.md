---
title: "報告型コスト台帳"
desc: "外部の請求票や使用量観察を、プロジェクトの状態として後から報告・積算するための台帳です（issue #44）。プロジェクト状態に任意の cost_ledger.schema: 1 "
cat: "rdsh-dw"
catLabel: "rustdsh 調査"
chars: 4813
slug: "rdsh/dw/cost-ledger"
---

# 報告型コスト台帳

外部の請求票や使用量観察を、プロジェクトの状態として後から報告・積算するための台帳です（issue #44）。プロジェクト状態に任意の `cost_ledger.schema: 1` メタデータを追加します。プロジェクトスキーマ自体は1のままです。既存の6つのMCPツールが唯一のツールで、台帳への報告は `dashboard_update_metrics`、認証付き `POST /api/update/metrics`、または専用の `cost-ledger` CLIから行います。ブラウザクレデンシャルはコストを読めますが報告はできません。報告はネイティブCLIを起動せず、モデル呼び出しもしません。

## 期間と対象集団を宣言する

報告の前に、不変な `cost_scope` を宣言します。`project_id` は現在のプロジェクトと一致させる必要があります。UTC開始は含み、UTC終了は含みません。各ターゲットは1本のworker/session/provider/modelストリームを指します。run/provider/modelは未報告なら `null` にできます。使用のないworkerも含め、期待するターゲットを全部宣言します。worker/session/provider/modelの重複する同一性は拒否されます。

`membership_complete` は報告者の明示的な宣言であり、全workerの独立した発見ではありません。`false` は、登録済みターゲット全てに金額が分かっていても合計を部分と扱います。あるworkerの既知金額が別のworkerのゼロ支出を意味することはありません。スコープIDの期間・集団・同一性を変えることは競合です。別の期間や集団には別スコープを作ります。スコープ同士は、期間が重複していても合算しません。

```json
{
  "scope_id": "workers-oct-06",
  "project_id": "YOUR_PROJECT_ID",
  "period_start": "2026-10-06T00:00:00Z",
  "period_end": "2026-10-07T00:00:00Z",
  "membership_complete": true,
  "targets": [
    {
      "target_id": "worker-a-session",
      "worker_id": "worker-a",
      "session_id": "ORIGINAL_NATIVE_SESSION_ID",
      "run_id": null,
      "provider": "REPORTED_PROVIDER",
      "model": "REPORTED_MODEL"
    }
  ]
}
```

識別子は安定した呼び出し側指定のASCII識別子で最大160文字です。session/provider/modelの値は報告された識別リンクであり、検証済みネイティブアタッチの証拠ではありません。報告はセッション台帳を結び替えられません。

## 観察を報告する

reportは全フィールドが必須です。スコープの正確な期間に属し、宣言済みターゲットを1つ指定します。`target_id: null` は配分されていないプロジェクト請求票にだけ許されます。この請求はworker請求の詳細と別に表示され、合算や配分はされません。

```json
{
  "event_id": "native-usage-observation-17",
  "scope_id": "workers-oct-06",
  "target_id": "worker-a-session",
  "source_kind": "provider_usage",
  "source_ref": "provider statement / native meter observation 17",
  "observed_at": "2026-10-06T03:00:00Z",
  "mode": "cumulative",
  "sequence": 17,
  "currency": "USD",
  "amount": "0.123456789",
  "certainty": "reported",
  "tokens": { "input": 1000, "cached_input": 200, "output": null },
  "basis": "Provider-reported amount for this session and declared UTC period."
}
```

| ソース | 金額の確実性 | 意味 |
| --- | --- | --- |
| `provider_usage` | `reported` | 外部報告されたプロバイダ金額/使用量 |
| `cli_report` | `reported` | 外部報告されたCLI金額/使用量 |
| `api_estimate` | `estimated` | 明示的な計算根拠つきの外部API換算 |
| `invoice_actual` | `confirmed` | 報告者が請求票と明示した宣言期間の金額 |

`confirmed` は報告者がソースを請求票だと言ったことで、ダッシュボードはプロバイダに認証せず請求票を検証しません。UIでは**報告元で確定**と表示します。`source_ref` と `basis` は必須の文書参照で、URLを取得せずファイルを開かずデータとして表示します。API推定では、プロバイダレート/バージョン、課金対象使用量、通貨換算の根拠を含めてください。金額・推定・請求票が別のソースを上書きしたり差分を直したりすることはありません。ソースや通貨をまたぐ合算合計はありません。

金額は非負の10進**文字列**で、整数部16桁・小数部9桁までです。整数スケール演算で10進の和が厳密に保たれます。`null` 金額は `certainty: "unknown"` を必須とし、ゼロにはなりません。3文字の大文字コードを明示します。サーバーは通貨換算や現在価格の参照をしません。負の金額（返金/クレジット）は支出専用台帳の対象外です。

`tokens` は `null` か、非負の安全整数か `null` の `input`/`cached_input`/`output` を持つオブジェクトです。cached入力は報告されたinputを超えられません。ソースの課金対象カウンタだけを報告します。DSH ACPの現行 `usage_update.used` はコンテキスト占有で、アダプタの `billable_tokens`/`cost` は使えないため、この機能はコンテキスト占有を有料トークンや支出として再解釈しません。

## 冪等性と累積報告

- `event_id` はプロジェクト全体で一意です。HTTPタイムアウト後は、正規化した同じペイロードを同じIDで再送します。元の受領が保持され、同じIDで異なるデータは競合です。報告はデータ保存だけなので、ネイティブ副作用を記録するための自動リトライは不要です。
- 各 scope/target/source には1本のストリーム、1つの通貨、1つの報告モードしかありません。同じ基礎使用量を複数ターゲットや複数ストリームに報告してはいけません。期間の帰属と重複しない同一性は報告者が正しく出すもので、ダッシュボードは捏造IDで重複したネイティブ使用量を発見できません。
- `event` モードの `sequence` は独立した課金項目を指します。一意なシーケンスは1回だけ加算されます。同じシーケンスで同一観察の新しいevent IDは履歴の別名で、矛盾するデータは拒否です。
- `cumulative` モードの `sequence` はメーターの観察を指します。最大シーケンスだけが寄与します。後の観察は前の合計をそのまま置き換えます。到着順で結果は変わりません。同一シーケンスの新しいevent IDはコストを重ねません。
- 累積の観察時刻と既知カウンタは減らせません。メーターのリセットは別の宣言期間を用意します。未知金額の最新観察は、古い証拠を残したままそのストリームの現在コストを未知にします。
- 同じソースストリームで独立イベントと累積合計を混ぜることは、メーターとその構成の二重計上になるため拒否です。

未知の報告や欠落ターゲットを含む小計は**部分集計**です。完全既知の合計は、宣言された期間/集団/ソース/通貨だけを述べることができます。トークンの集計も部分カバーを別に記録します。APIは集計カウンタを10進文字列で出力し整数桁あふれを避けます。

## CLIと状態

```powershell
rdsh-dashboard cost-ledger declare --project C:\Projects\App --input-file scope.json
rdsh-dashboard cost-ledger report --project C:\Projects\App --input-file report.json
rdsh-dashboard cost-ledger inspect --project C:\Projects\App
```

CLIは一致するプロジェクトの既存リテラルループバックランタイムと報告用MCPクレデンシャルだけを使い、外部URLとリダイレクトを拒否します。MCP呼び出し側は既存のmetricsツール内で `{ "cost_scope": {...} }`、`{ "cost_report": {...} }` を送れます。旧来の数値メトリクスは元のスナップショット意味論を保ち、台帳合計へ移行・統合・変更されません。UIでは**従来の累積報告（API換算）**と表記します。

保存状態は不変なスコープ宣言、報告、受領時刻を保持します。公開状態はソース/通貨の合計、欠落ターゲット、各報告の `included` フラグを追加します。UIは更新中に選択期間と開いた詳細を保持し、履歴は100観察ずつ表示します（集計は制限されません）。保持上限はプロジェクトごとにスコープ100、報告10,000です。上限到達は古い監査証拠を黙って消すのではなく新規記録を拒否します。台帳状態の破損は、ソースファイルを書き換えずに開く時点で拒否されます。

## 実務上の注意

- 記帳は全部「人間が報告するもの」です。自動取得も検証もないので、`basis` に根拠を書いて残しておくことが実務の要です。
- 期間・集団を変える際は既存スコープに手を入れるのではなく新しいスコープを宣言します。スコープの合算は一切行われません。
- issue #45の予算アドミッション制御は本機能とは別の作業です。ハードな支出ガードはここにありません。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/COST-LEDGER.md
