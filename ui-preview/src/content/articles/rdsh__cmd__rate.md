---
title: "rdsh rate limit — レート制限から自動再開する retryPolicy の設定"
desc: "DSH は base bundle で @deepseek-ai/dsh-llm-retry を常に読み込みますが、provider 設定の retryPolicy が未定義だと "
cat: "rdsh-cmd"
catLabel: "rustdsh コマンド"
chars: 2633
slug: "rdsh/cmd/rate"
---

# rdsh rate limit — レート制限から自動再開する retryPolicy の設定

DSH は base bundle で `@deepseek-ai/dsh-llm-retry` を常に読み込みますが、provider 設定の `retryPolicy` が未定義だと `recover()` は何もせず、429（レート制限）や 5xx が1回返るだけでターンが失敗します。`rdsh rate limit` は、書ける場所が `llm-pi-ai` の `providers.＼route］.retryPolicy` だけであるこの設定をプロファイルへ追記します。書き込み系の `apply` と、読み取り専用の `show` があります。

## オプション

| オプション／サブコマンド | 既定 | 説明 |
| --- | --- | --- |
| `show` `--profile ＼name］` | 全プロファイル | 各 provider の現在の `retryPolicy` を表示（未設定も明示） |
| `show` `--json` | なし（off） | 機械可読出力 |
| `apply` `--profile ＼name］` | 全プロファイル | 対象プロファイル |
| `apply` `--provider ＼id］` | 全 provider | 追記する provider を限定 |
| `apply` `--mode ＼MODE］` | `normal` | `normal`（回数・対象コードに上限あり）または `always`（明示時だけ。無制限 再試行） |
| `apply` `--max-retries ＼N］` | 5 | `normal` の再試行回数 |
| `apply` `--max-delay-ms ＼MS］` | 60000（環境変数 `RDSH_RATE_LIMIT_MAX_DELAY_MS`） | `backoff.maxDelayMs` |
| `apply` `--force` | なし（off） | 既存の単一行 `retryPolicy` を書き直す |
| `apply` `--dry-run` | なし（off） | 書き込まずに追記内容を確認 |
| `apply` `--json` | なし（off） | 機械可読出力 |

## 使用例

```sh
rdsh rate limit show                     # 読み取り専用：provider ごとの現在値を表示
rdsh rate limit apply --dry-run          # 書き込まずに追記内容を確認
rdsh rate limit apply --profile web      # 各 provider へ retryPolicy を追記
rdsh rate limit apply --max-retries 8 --max-delay-ms 120000
```

## 既定値・注意

- `Retry-After` が `maxDelayMs` より大きい応答は `normal` では再試行されません。長いレート制限から再開したいときは `--max-delay-ms` を引き上げてください（`maxDelayMs` 以下ならサーバー指定どおり待つ）。
- `--max-delay-ms` は上流の上限 `MAX_TIMER_DELAY_MS=2147483647` を超える値を clamp し、`initialDelayMs`（既定500ms）を下回る値は500msへ持ち上げます。待機は `initialDelayMs * 2^(retry-1)` にジッター（0.1）を掛け `maxDelayMs` で打ち切り。
- `mode: always` は失敗を種類・回数問わず再試行し続けるため（停止条件なし）、書き込み時に警告が表示されます。夜間バッチなど明示時だけ使い、`--max-delay-ms` と合わせてください。
- 既存の `retryPolicy` は `--force` なしでは上書きしません。複数行のブロックは `--force` でも触らず、手動編集を求めます。
- 書き込みは YAML 再生成ではなく、provider ブロック末尾への追記です（他の行はバイト単位で温存）。構造を認識できないプロファイルは書き換えずに拒否します。
- 書き込み前に `cordis.patch.yml.bak-rate-limit-＼YYYYMMDD-HHMMSS］` を作り、`CredentialFileLock` を取ったうえで一時ファイル＋rename で書きます（途中で落ちても半端なファイルを残しません）。`mode: always` のとき `maxRetries` は書きません。
- 反映は provider 登録時の読み込み時で、DSH 再起動か設定再読み込みが必要です。反映後は `llm/retry` / `llm/retry-started` イベントが残り、`rdsh retry-log` で確認できます。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「使い方 ＞ レート制限からの自動再開 (`rdsh rate limit`)」節）
- docs: [docs/RATE-LIMIT.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/RATE-LIMIT.md)

### 実装（src/main.rs・src/rate_limit.rs）から補足

- サブコマンド構成（`rate limit show` / `apply`）と各オプションの正確な既定値、環境変数（`RDSH_RATE_LIMIT_MODE` / `RDSH_RATE_LIMIT_MAX_RETRIES` / `RDSH_RATE_LIMIT_MAX_DELAY_MS`、引数優先）。
