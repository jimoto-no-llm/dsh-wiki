# rdsh models — プロバイダのモデル一覧をプロファイルへ反映

DSH のモデルカタログは依存パッケージ `@earendil-works/pi-ai` 同梱のものがパッケージ公開時に生成されるため、それ以降にプロバイダが変えた内容は選択肢に出てきません（Codex の `gpt-6.1-sol` 全滅や、Kimi Code の `kimi-for-coding` が旧表示名のまま等）。`rdsh models` はプロバイダ自身のカタログを読み、プロファイルの `models:` に不足IDを追記し、古い表示名だけを更新します。

## オプション

| オプション／サブコマンド | 既定 | 説明 |
| --- | --- | --- |
| （サブコマンドなし） | 読み取り専用 | 各プロファイルの不足IDと古い表示名を表示 |
| `--provider ＼id］` | なし（このビルドが読む全ソース） | 対象プロバイダを限定 |
| `--json` | なし（off） | 機械可読出力 |
| `sync` `--profile ＼name］` | なし（全プロファイル） | 不足分の追記と表示名更新を実行する対象プロファイル |
| `sync` `--provider ＼id］` | 全ソース | 対象プロバイダを限定 |
| `sync` `--dry-run` | なし（off） | プロファイルを書き込まず変更内容だけ表示 |
| `sync` `--json` | なし（off） | 機械可読出力 |
| `auto` `--profile ＼name］` | なし（全プロファイル） | 間隔経過時に限る全体更新の対象プロファイル |
| `auto` `--force` | なし（off） | 間隔が経過していなくても今すぐ更新 |
| `auto` `--dry-run` | なし（off） | 変更予定だけを報告し書き込まない |
| `auto` `--quiet` | なし（off） | 失敗時を除き何も出力しない（起動フック用） |
| `auto` `--json` | なし（off） | 機械可読出力 |

## 使用例

```sh
rdsh models                              # 読み取り専用：不足IDと古い表示名を表示
rdsh models --provider kimi-coding       # プロバイダを限定
rdsh models sync                         # 不足分を追記し、古い表示名を更新
rdsh models sync --profile web --dry-run # 書き込まずに確認
rdsh models auto --force                 # 間隔に関係なく更新
```

## 既定値・注意

- 読み取り元は `openai-codex` が `codex debug models`（フォールバック `~/.codex/models_cache.json`）、`kimi-coding` が `GET {baseURL}/v1/models`（プロファイルの `apiKeyEnv` 認証、curl で取得し HTTPS 固定、APIキーはプロセス一覧に出ません）。
- 削除は一切行いません。既存エントリの他の行は温存し、表示名はプロバイダの現行名を既に含む場合に限り書き換えません（Codex 由来の表示名更新もしない）。
- 構造を認識できないプロファイル（`llm-pi-ai` エントリ無し・provider ブロック無し・inline `provider: {}`）は書き換えずに拒否し、必要な YAML 形を示します。書き込みは DSH と同じロック方式での原子置換です。
- 追記する各モデルにはコンテキスト窓、入力モダリティ、推論レベルが入ります。`off` は意図的に書かれません（書くと Codex バックエンドが `reasoning` ブロックを拒否するため）。
- 反映は次回の設定リロードまたは DSH 再起動時です。
- `auto` は起動フックが間隔経過時に背後で `rdsh models auto --quiet` を起動する方式で、起動はプロバイダ待ちをしません。状態は `$DSH_HOME/cache/rdsh-models-auto.json`（壊れても「未実行」扱い、後続は止まらない）。間隔の既定は24時間（下限1時間）。無効化は `rdsh features off models_auto` か `RDSH_NO_MODELS_AUTO=1`。実行の `reason` は `due` / `not_due` / `no_profiles` / `disabled` / `dry_run`。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「使い方 ＞ モデル一覧の同期 (`rdsh models`)」節）
- docs: [docs/MODEL-AUTO-SYNC.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/MODEL-AUTO-SYNC.md)、[docs/MODEL-ROUTING.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/MODEL-ROUTING.md)（カタログ基準の節）

### 実装（src/main.rs・src/models.rs）から補足

- 各サブコマンドのオプション定義（`sync` `auto`）と `--provider` の「このビルドが読む全ソース」既定。
- `auto` の背景起動（boot フックが detached で `--quiet` を起動）と状態ファイル・ロック（`rdsh-models-auto.json.lock`）の仕様。
