# rdsh retry-log — LLM 再試行の集計

DSH がセッションログへ記録した LLM 再試行イベントを集計するコマンドです。読み取り専用で `$DSH_HOME` へ書き込みません。Node.js を起動せず、追加クレートもしません。

## オプション

| オプション | 既定 | 説明 |
| --- | --- | --- |
| `--project ＼dir］` | なし（全プロジェクト） | 1つのセッションプロジェクトディレクトリに限定。ハイフン始まりの名前（`--home-user-project--`）もそのまま受ける（`--` の付け替え不要） |
| `--since ＼dur］` | なし（全期間） | この期間より新しいセッションだけ。例: `24h`、`7d` |
| `--json` | なし（off） | 機械可読 JSON を出力 |

## 使用例

```sh
rdsh retry-log                     # 全プロジェクト
rdsh retry-log --since 24h         # プロバイダ別の再試行回数・待機合計・失敗コード
rdsh retry-log --project '--home-sahen-File-Prog-rustdsh--' --json
```

## 既定値・注意

- 集計対象は `$DSH_HOME/sessions/**/*.jsonl.zstd` を読み取り専用で走査し、`llm/retry` を再試行1回として数えます（バックオフ待機**前**に記録される方）。`llm/retry-started` は数えません。
- 同じ `(provider, retryId, retry)` は1回として数えます。巻き戻しや再追記があっても数字が膨らまず、排除した件数は `duplicate_retries` に出ます。
- `type` が `llm/retry` 等と宣言しながらパースできない行だけを `damaged_lines` に、zstd 展開に失敗したログは `damaged_files` に数え、他のセッションの集計は続行します（`zstd` が無い環境も同様）。
- 表は stdout、走査件数やスキップ件数は stderr です。表の行は provider ごとの `retries`・total wait・max wait・`codes` 内訳と TOTAL 行、末尾に最新 `llm/retry` の日時とプロバイダが出ます。
- `--json` には `sessions`、`providers`（`retries` `wait_ms` `max_wait_ms` `codes`）、`total_retries`、`max_wait_provider`、`latest_at`、`duplicate_retries` などが含まれます。
- `--since` はセッションの更新時刻だけを見て、指定より古いセッションを展開せずに飛ばす軽量な絞り込みです（セッション数が多い環境では `--since` や `--project` で絞ると速い。1200セッションで約25秒の実測あり）。
- `latest_at`（最後の再試行時刻）はローカル時刻で表示します。`wait_ms`・`max_wait_ms` はミリ秒です。
- セッションディレクトリの走査はシンボリックリンクをたどらず、`--project` のトラバーサルも拒否します。書き込み中のセッションは伸び続けるため、実行のたびに件数がわずかに変わることがあります。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「使い方 ＞ 待機と再試行ログ集計 (`rdsh wait` / `rdsh retry-log`)」節）
- docs: [docs/WAIT-AND-RETRY-LOG.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/WAIT-AND-RETRY-LOG.md)

### 実装（src/main.rs・src/wait.rs）から補足

- `--project` だけが `allow_hyphen_values` を持つことと、`/`・`..` を含む値を exit 2 で拒否する仕様。
- セッション並列読み（`inspect::parallelism()` 上限1〜8）で、出力順はセッション順に揃える実装。
