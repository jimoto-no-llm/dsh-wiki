# rdsh context — コンテキスト注入と記憶（実験的）

そのターンの文脈（goal・constraints・decisions・作業対象ファイル・Git 状態・検索結果・管理された記憶）を組み立て、DSH の `UserPromptSubmit` フック契約で出力する、実験的なコンテキストエンジンです。README.ja.md では "コピペなしでモデルに届きます" と案内されています。`rdsh features on context_engine`（既定 OFF）で有効化してから使います。fail-open で、プロンプトを止めず常に exit 0、フックとして毎ターンの文脈を注入します。

## オプション

| サブコマンド | オプション（既定） | 説明 |
| --- | --- | --- |
| `build` | `--query ＼text］`（なし）、`--budget ＼n］`（なし）、`--sessions ＼n］`（設計 `context.max_sessions`）、`--require-stable`（off）、`--json`（off） | このターンに渡す文脈を組み立てる |
| `search ＼query］` | `--max ＼n］`（設定 `context.max_code_hits`） | コード＋セッション関連だけ検索 |
| `status` | `--json`（off） | 現在の goal・記憶・トークン使用量を表示 |
| `explain` | `--query`、`--budget`（いずれもなし） | 各節が採用された理由を説明 |
| `inject` | `--event ＼name］`（既定 `user-prompt-submit`）、`--query ＼text］`（なし＝stdinのフックpayload）、`--sessions ＼n］`（設定 `context.inject_session_count`）、`--json`（off） | 文脈を注入するフック JSON を出力 |
| `remember ＼text］` | `--kind ＼kind］`（既定 `note`）、`--json`（off） | 記憶を1項目書き込む（goal / decision / constraint / task / file / note） |
| `memory` | `--json`（off） | active と superseded を区別して一覧 |
| `distill` | `--session ＼path］`（既定は最新セッション）、`--apply`（off＝dry-run）、`--json`（off） | セッション中から記憶候補を抽出（zstd 圧縮セッションにも対応） |
| `forget ＼id］` | `--json`（off） | active から1項目を取り下げ（履歴は残る） |
| `hook install` | `--path ＼path］`（既定 `$DSH_HOME/hooks.json`）、`--rdsh ＼entry］`（既定 `rdsh`）、`--dry-run`（off）、`--json`（off） | UserPromptSubmit エントリを追記（冪等） |
| `hook status` | `--path`（上と同じ既定）、`--json`（off） | エントリの有無を表示 |
| `hook remove` | `--path`（上と同じ既定）、`--dry-run`（off）、`--json`（off） | 追記した1件だけを消す（他の hook は残す） |

## 使用例

```sh
rdsh features on context_engine        # コンテキストエンジンはオプトイン
rdsh context hook install              # $DSH_HOME/hooks.json に追記（冪等）
rdsh context hook status --json
rdsh context remember "APIの互換性を必ず保つ" --kind constraint
rdsh context distill --session ~/.dsh/sessions/＼project］/＼session］/session.v4.jsonl.zstd --apply
rdsh context memory --json
rdsh context forget mem_ab12cd34ef56
rdsh context build --require-stable
```

## 既定値・注意

- 注入には専用の予算と期限があり、既定は `context.inject_budget=1200` トークン・`context.inject_deadline_ms=1200`ms。期限を過ぎたらコード検索を省略して記憶・goal・constraints だけを出します。
- フックは fail-open で、無出力は設定ファイルが読めない場合と stdin を解釈できない場合だけ。壊れた索引や期限超過では依存グラフやコード検索だけを落とします。
- 優先度は goal > constraints > related_files > git_diff > decisions > open_tasks > retrieved の順で、予算超過時は retrieved から削ります。
- 注入設定の範囲は `inject_budget`（200-8000）、`inject_deadline_ms`（100-10000）、`inject_sessions`（true）、`inject_session_count`（0-10、既定2）。
- 記憶は会話ログの丸写しではなく、`$DSH_HOME/rdsh-context-memory.json`（schema 1）による管理された項目です。重なる古い項目は推測ではなく `superseded_by` で無効化され、context には active な項目だけが `[mem]` 付きで入ります。
- `distill` はユーザー発話だけを読み、決定・制約・撤回を決定的なマーカーで抽出します。既定は dry-run です。
- `build --require-stable` は、組み立て中にファイルや git 状態が変わった、または git 状態を読めない場合にも exit 3 で終了し、古い・不明なスナップショットを新しいものと誤認させません。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「使い方 ＞ コンテキスト注入（`rdsh context`）」、「Smart-DSH との併用」節を参照）
- docs: [docs/RDSH-SETTINGS.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/RDSH-SETTINGS.md)（context engine 節、context 自動注入節、記憶節）

### 実装（src/context.rs・src/main.rs）から補足

- 各サブコマンドとオプションの正確な引数定義、`--event` / `--query` / `--sessions` の既定、設定キーとその範囲、`--require-stable` の終了コード（git 状態が読めない場合にも有効）。
- フックの install / status / remove の `--path` `--rdsh` `--dry-run` の動作。
