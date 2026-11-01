# rdsh setup — 初回接続とセットアップ

初回起動時の接続をまとめて進めるコマンドです。README.ja.md では "First-run connect: import what exists, persist env keys, optionally run the provider login flow or reveal settings dirs, else show next step" と説明され、対話式として `rdsh setup`、ブラウザから `rdsh setup --web` で使えます。

## オプション

| オプション | 既定 | 説明 |
| --- | --- | --- |
| （オプションなし） | 案内モード | 存在するものを取り込みつつ、次の一手を表示 |
| `--open` | なし（off） | 設定ディレクトリを開く |
| `--login` | なし（off） | プロバイダのログインフローを進める |
| `--json` | なし（off） | 機械可読出力 |
| `--yes` | なし（off） | 確認を省略して進める |
| `--web` | なし（off） | localhost 上の "Floating glass setup UI" を起動し、ブラウザタブも自動で開く |
| `--port ＼n］` | 設定 `setup.web_port`（`0` は空きポートから自動選択） | `--web` のときのローカルポート |

## 使用例

```sh
rdsh setup          # 対話式セットアップ
rdsh setup --web    # ブラウザから行える Web 設定画面
rdsh setup --open   # 設定ディレクトリを開いてから案内
```

## 既定値・注意

- 環境変数キー（`DEEPSEEK_API_KEY`、`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`）がある場合、"あらかじめ接続済み" として扱われ、それを検出した案内を出します。
-セッションの取込ではなく、OpenCode や Codex CLI（ChatGPT OAuth）にログイン済みの場合、`rdsh auth --import --provider openai-codex` の取り込み方法を案内します（README.ja.md 手順 D）。
- ローカル状態画面と Web 検索の追加（`extras.enable serve,search-web`）は `--web` の Extras 画面から切り替えられます。設定画面と CLI キーの一覧は docs/RDSH-SETTINGS.md にあります。
- `--web` のポートは設定値から既定で取り、`--port 0` で空きポートから選べます。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「クイックスタート」手順 D、「使い方 ＞ 認証情報のセットアップ」、「動作環境」節を参照）
- docs: [docs/RDSH-SETTINGS.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/RDSH-SETTINGS.md)（開き方節、コマンドから見る節）

### 実装（src/main.rs・src/auth.rs）から補足

- `--port` の解決と `--web` がブラウザタブを自動で開く旨。
- 接続済み判定の環境変数キーと、流れ（検出・取り込み・ログイン・次の一手の案内）。
