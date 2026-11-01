# auth — 外部ログインの自動認識とミラー（src/auth.rs）

## ① 目的
Codex CLI と opencode の外部ログイン情報を自動で認識し、rdsh 側の唯一の書き込み可能な認保管 `$DSH_HOME/.credentials.yaml` へ安全にミラーします（`creds_path()` L38）。この認保管は本家 dsh が OAuth 補助を参照するレイヤで、レコードの scope は `const RECORD_SCOPE = "llm-pi-ai"`（L32）です。先頭コメント（L1-19）に設計規則がまとまっています。

## 安全規則（先頭コメント L3-19、コードから読める事実）
- 対象ストア: `~/.codex/auth.json`（Codex CLI）、`$XDG_DATA_HOME/opencode/auth.json`（既定は `~/.local/share/opencode/auth.json`）
- 何も削除・リネームしない。単一エントリの追加・置き換えのみ行う
- 新しい grant を古い grant で上書きしない。`expires` を比較し、無い場合はソースファイルと認保管の mtime で判定（`fresher_than()` L667）
- 認保管は 0600 を維持する（dsh は権限が緩いと読み込みを拒否する）
- ドキュメントの他の部分は一切保存し替えない。`load_doc()`（L343）と `splice_entry()`（L470）による行単位の編集

## ② CLI と本家 dsh への橋渡し
- `rdsh auth [--import] [--json] [--provider ＼id］] [--source codex|opencode] [--ref ＼name］]` → `cmd_auth()`（L869、main.rs L1192 から分岐）
- `rdsh setup` → `cmd_setup()`（L1433）が初回接続ガイドを表示し、`launch_login()`（L1171）で外部 CLI の login を起動
- `pre_boot(banner)`（L747）は起動直前の best-effort ミラーで、失敗しても起動を止めない。boot・dump・raw 委譲の直前に passthrough.rs から呼ばれる（passthrough.rs L561 / L599 / L629）
- `summary_line()`（L990）は `rdsh doctor` 用の 1 行サマリ
- dsh GUI の既定モデルが要求する認情報が揃っているかを `provider_needs()`（L1267）が ok / importable / missing で判定する

## ③ 主な関数と挙動
| 関数 | 行 | 挙動 |
| --- | --- | --- |
| `scan_codex()` | L207 | `auth.json` から ChatGPT OAuth grant と任意の API key を抽出する |
| `scan_opencode()` | L244 | opencode 由来の grant と注記を抽出する |
| `jwt_exp_ms()` | L197 | base64url デコード（`b64url_decode()` L159）で JWT の `expires` を復元する |
| `decisions_for()` | L603 | grant ごとに ok / import / skip などの判断を生成する |
| `apply_imports()` | L765 | `CredentialFileLock` による排他の下で、ロック取得後に判断をやり直してから行単位の書き込みを行う |
| `layout_refused()` | L865 | `version: 1` 無しの pre-release flat レイアウトを拒否するかを返す |
| `print_first_boot_banner()` | L1064 | 認情報が無い初回のみ接続ガイダンスを表示する |

## ④ 既定値・環境変数
- 監視対象の API key 環境変数 `KNOWN_ENV_KEYS` は DEEPSEEK_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY（L1024）
- setup への入力も `SETUP_KEY_ALLOWLIST`（L1533）で同じ 3 つに限定
- Windows は `APPDATA` を参照（`config_dir()` L70）、opencode 既定データディレクトリも `APPDATA` から導出（L51）
- メッセージ言語は `user_lang()`（L1026）が環境変数から判定する

## ⑤ 既知の制限
- `--import` には `--provider` か `--ref` が必須。一括コピーは意図的に無効（cmd_auth L876-880）
- flat レイアウトの認保管は利用者が `version: 1` を追加する必要がある（L892、L973-974）
- Codex grant はプロファイルが列挙したモデルにしか反映されない。モデル一覧はハーネス発行時点のもの（cmd_auth L961-971）
- 価格・モデル助言（Issue #87 系）はコメントのみで未実装（L11-19）

## 出典
- UPSTREAM: <https://github.com/jimoto-no-llm/rustdsh/blob/main/src/auth.rs>
- README.ja: <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
