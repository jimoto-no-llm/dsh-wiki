# rdsh のモデル管理

`rdsh` が提供するモデル一覧の自動同期、ルーティング記録、安全な再試行の仕組みを説明します。

## モデル一覧の自動同期（rdsh models）

プロファイルの `models:` に書いたものはバンドルのカタログを置き換えますが、プロバイダの側は後から変わります。`rdsh models` はプロバイダ自身のカタログを読み、欠けている id や古い表示名をプロファイルに反映します。

```sh
rdsh models                              # 読み取り専用: 各プロファイルの不足・古名を報告
rdsh models sync                         # 反映する
rdsh models sync --profile web --dry-run # 1プロファイル分のプレビュー
```

| プロバイダ | カタログ取得元 |
| --- | --- |
| `openai-codex` | `codex debug models`（なければ `~/.codex/models_cache.json`） |
| `kimi-coding` | `GET {baseURL}/v1/models`（プロファイルの apiKeyEnv 資格情報で認証） |

同期は追加と表示名の更新だけを行い、削除しません。対応しない構造のプロファイルは書き換えず、必要な YAML を提示して拒否します。プロファイルは DSH と同じロック方式で原子的に置換されるため、手動編集と衝突しません。ライブ一覧は stdin の設定ファイルで `curl` し、API キーがプロセス一覧に現れないようにして HTTPS に固定します。

## 起動時の自動更新（rdsh models auto）

`--version` が指定された起動ではフック自体が走らず、コマンド表示だけで停止します。通常の起動では小さな状態ファイルを読み、間隔が経っていれば切断された `rdsh models auto --quiet` を走らせるため、起動がプロバイダ待ちになることはありません。

- `features.models_auto` は既定 on。`RDSH_NO_MODELS_AUTO=1` でも拒否できます（CI 向け）。
- `RDSH_MODELS_AUTO_INTERVAL_HOURS` で間隔を指定します（既定 24、最小 1）。
- 状態は `$DSH_HOME/cache/rdsh-models-auto.json` に記録され、壊れた状態ファイルは「未実行」と扱われます。
- Desktop（Electron）用の予約プロファイルは変更しません。

## ルーティングの記録（rdsh-dashboard routing）

`rdsh-dashboard routing` は、要求したプロバイダ／モデル／effort を設定値と独立に記録します。プローブは記録した起動情報で元の ACP 実装を経由して設定を観察し、プロンプトは送らず所有 root だけ止めます。ルート変更の承認には `routing allow-change` で明示オペレータの承認 JSON（有効期限は 24 時間以内）が要り、期限切れ後は追跡プロンプトをブロックします。これはクライアント内の表明の仕組みであり、OS 隔離やプロバイダ内部の実行保証ではありません。

## 安全な再試行（SAFE-RETRY）

再試行コーディネータは元の操作スコープ内の限定的な転送操作を扱います。タスク JSON からスクリプトを渡せず、権限を拡張しません。

- `adapters --cli dsh` だけが `--retry` を受け付け、元 CLI の `--version` 問い合わせを再試行します。プロンプト送信やプロバイダ API 呼び出しは行いません。
- 実行ファイル・エントリポイントの内容と正規化 cwd がスコープ digest（SHA-256）になり、各試行で再確認します。
- 既定予算は 3 試行・10,000 ms、指数遅延は 200 ms 開始・2,000 ms 上限。設定は 20 試行・600,000 ms までに制限されます。
- `rate_limited`・`unavailable`・`timeout` は一時的として扱い、`auth_denied` や未分類エラーは即座に停止します。相手のエラーテキストは根拠になりません。
- 書き込み系の `acp_prompt`・`external_send`・`git_commit` は直後に自動再試行せず、読み取り専用の照合（照合レシート）を先に行います。

## 出典

- <https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/MODEL-AUTO-SYNC.md>
- <https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/MODEL-ROUTING.md>
- <https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/SAFE-RETRY.md>
