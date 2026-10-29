# rdsh ネイティブコマンド リファレンス

`rdsh` のネイティブコマンドをまとめています。ここに挙げない引数やサブコマンドは、そのまま本家 `dsh` に渡ります。記載の構文は出典の README.ja.md に準拠しています。

## 一覧

| コマンド | 用途 |
| --- | --- |
| `rdsh tokens` | トークン数の即時見積り |
| `rdsh prune` | トークン上限に合わせて前後を残して切り詰め |
| `rdsh search` | 高速並列テキスト検索 |
| `rdsh sessions` | 過去セッション一覧と展開トークン見積り |
| `rdsh compact` | セッション JSONL の圧縮（元ファイルは不変） |
| `rdsh doctor` | 本家 dsh、環境変数、パスなどの健全性診断 |
| `rdsh profiles` / `rdsh skills` | 利用可能なプロファイル・スキルの一覧 |
| `rdsh features` | 機能スイッチと既定値の一覧 |
| `rdsh auth` | ログイン状態の確認と認証情報の取り込み |
| `rdsh setup` | 対話型セットアップウィザード |
| `rdsh models` | プロバイダのモデル一覧の照会と同期 |
| `rdsh rate limit` | レート制限用 `retryPolicy` の追記 |
| `rdsh guard` | フック連携の危険コマンド検知・遮断 |
| `rdsh context` | コンテキスト注入と記憶の管理 |
| `rdsh deps` | 依存グラフと変更影響の照会 |
| `rdsh route` | 難易度別のモデル自動割当の判定 |
| `rdsh wait` | 進捗表示つきの待機 |
| `rdsh retry-log` | LLM 再試行のプロバイダ別集計 |
| `rdsh serve` | 内蔵 Web UI |
| `rdsh desktop` | デスクトップアプリ（Electron）連携 |
| `rdsh plugin` | プラグイン管理（`dsh plugin` と同等） |
| `rdsh bench` | rdsh と本家 dsh の起動速度比較 |
| `rdsh tui` | TUI プロファイルで起動（`dsh --profile tui` 相当） |

## 高速ネイティブコマンド

Node.js を起動せず、Rust ネイティブで処理します。

```sh
rdsh tokens ./README.md             # トークン数の即時見積り（英語:約4文字=1tok、日本語:1文字=1tok）
echo "..." | rdsh prune --max-tokens 4000 # トークン上限に合わせて前後を残して切り詰め
rdsh search TODO --dir . --max 100  # 高速並列テキスト検索
rdsh sessions --limit 20 --tokens   # 過去セッション一覧と展開トークン見積り
rdsh compact ./s.jsonl              # セッション JSONL を圧縮（元ファイルは不変）
rdsh doctor                         # 本家 dsh、環境変数、パスなどの健全性診断
rdsh profiles / rdsh skills         # 利用可能なプロファイル・スキル一覧
rdsh desktop status                 # DeepSeek Harness Desktop アプリとプロファイルの検出
rdsh bench --n 5                    # rdsh と本家 dsh の起動速度比較
rdsh features                       # 機能スイッチと既定値の一覧（既定OFF: serve / search-web / context_engine / agent_tool_sandbox など）
```

## `dsh` 互換での実行

```sh
rdsh tui                          # dsh --profile tui と同等
rdsh --profile web --patch x.yml  # 追加設定を重ねて起動
rdsh --dry-run tui -- --resume id # 実行コマンドの内容だけを確認
```

## rdsh auth — 認証情報のセットアップ

他ツールですでに完了しているログインを、DSH が利用する `$DSH_HOME/.credentials.yaml` へ安全に取り込みます。

```sh
rdsh auth                                  # 現在のログイン状態を確認
rdsh auth --import --provider openai-codex # Codex / opencode のログインを取り込み
rdsh setup                                 # 対話型セットアップウィザード
rdsh setup --web                           # ブラウザから行える Web 設定画面
```

他ツールの認証情報を無断で外部へ送信したり、同期したりしません。

## rdsh models — モデル一覧の同期

プロバイダ自身のカタログ（ローカルの Codex CLI、または Kimi Code の `/v1/models` をプロファイルの API キーで取得）を読んでプロファイルへ反映します。

```sh
rdsh models                              # 読み取り専用：不足IDと古い表示名を表示
rdsh models --provider kimi-coding       # プロバイダを限定
rdsh models sync                         # 不足分を追記し、古い表示名を更新
rdsh models sync --profile web --dry-run # 書き込まずに確認
```

削除は行いません。構造を認識できないプロファイルは書き換えずに拒否します。反映は次回の設定リロードまたは再起動時です。

## rdsh rate limit — レート制限からの自動再開

既定のプロファイルでは 429（レート制限）や 5xx が 1 回でターンを失敗します。`rdsh rate limit` は provider 設定に `retryPolicy` を追記します。

```sh
rdsh rate limit show                     # 読み取り専用：provider ごとの現在値を表示
rdsh rate limit apply --dry-run          # 書き込まずに追記内容を確認
rdsh rate limit apply --profile web      # 各 provider へ retryPolicy を追記
rdsh rate limit apply --max-retries 8 --max-delay-ms 120000
```

- 既定は `mode: normal`（`maxRetries: 5`、`backoff.maxDelayMs: 60000`）です。
- `Retry-After` が `maxDelayMs` を超える応答は normal では再試行されないため、長いレート制限から再開するときは `--max-delay-ms` を引き上げます。
- `mode: always` は失敗を種類・回数問わず再試行し続けるため、明示したときだけ書きます。
- 既存の `retryPolicy` は `--force` なしでは上書きしません。書き込み前に `cordis.patch.yml.bak-rate-limit-<日時>` を作り、構造を認識できないプロファイルは拒否します。

## rdsh guard — フック監視

DSH の `hooks.json` と連携し、危険なコマンド実行を検知・遮断します。

```sh
echo "$input" | rdsh guard --deny "rm -rf /*" --deny "*token*"
echo "$hook_json" | rdsh guard --policy-file ./hook-policy.json --json
```

- policy file で `Read`・`Write`・`Edit` のファイル path schema を構造判定できます。roots に対して tool と read/write 範囲を照合し、`allow`・`deny`・`unknown` を返します。
- JSON の `allow` は分類結果だけで、ホストの permission / approval を意味しません。`decision` は出力せず、最終的な権限判断はホストに残ります。
- 未知の tool、shell command、壊れた入力、未対応の引数は fail closed です。shell 構文解析と network 先の判定は未対応で、この hook は OS sandbox ではありません。
- `hooks.json` への組み込み例:

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "rdsh guard --deny \"rm -rf /*\"" }] }
    ]
  }
}
```

## rdsh context — コンテキスト注入

そのターンの文脈（goal・constraints・decisions・作業対象ファイル・Git 状態・検索結果・管理された記憶）を組み立て、DSH の `UserPromptSubmit` フック契約で出力します。

```sh
rdsh features on context_engine        # コンテキストエンジンはオプトイン
rdsh context hook install              # $DSH_HOME/hooks.json に追記（冪等）
rdsh context hook status --json
rdsh context remember "APIの互換性を必ず保つ" --kind constraint
rdsh context distill --session ~/.dsh/sessions/<project>/<session>/session.v4.jsonl.zstd --apply
rdsh context memory --json      # active と superseded を区別して表示
rdsh context forget mem_ab12cd34ef56
rdsh context build --require-stable
```

- フックは fail-open で、プロンプトを止めず常に exit 0 です。
- 注入には予算（`context.inject_budget`、既定1200トークン）と期限（`context.inject_deadline_ms`、既定1200ms）があり、期限切れならコード検索を省略して記憶・goal・constraints だけを出します。
- `distill` はユーザー発話だけを読み、決定・制約・撤回を決定的なマーカーで抽出します。重なる古い項目は `superseded_by` で無効化されます。
- `build --require-stable` は、スナップショットが安定していないと証明できないとき（組み立て中にファイルや git 状態が変わった、または git 状態を読めない）に exit 3 で終了します。

## rdsh deps — 依存グラフと変更影響

```sh
rdsh deps build                    # $DSH_HOME/rdsh-index に増分索引を作る
rdsh deps query engine_score       # シンボルの定義元と参照元
rdsh deps impact src/context.rs    # 直接・推移的な依存元と影響するテスト
```

- 対応言語は Rust・JavaScript/TypeScript・Python・Go です。size と mtime が同じファイルは再解析しません。
- 静的近似であり、動的 dispatch・間接呼び出し・マクロ・生成コードは `unknown` として明示します。索引が無い場合は「情報が無い」であり「依存が無い」ではありません。
- 呼び出しごとのオーバーハッドは約1ms です。

## rdsh route — 難易度別のモデル自動割当

タスクの大きさから `easy` / `standard` / `hard` を決定的に判定し、tier ごとの provider・model・effort の割当を返します。

```sh
rdsh route plan --text "この関数のバグを直して"   # easy と割当を表示
rdsh route plan --file ./request.md --json        # 判定理由つきの JSON
cat prompt.txt | rdsh route plan                  # stdin から判定
rdsh route show                                   # 現在の tier 別割当
rdsh settings set route.tiers.hard.model claude-opus-4-6
rdsh features on route                            # 既定は OFF
```

- `hard` は「hard キーワードを含む」「4000 文字超」「1500 トークン超」のいずれか。`easy` は 400 文字以下・8 行以下・150 トークン以下・記号密度 40/100 未満をすべて満たす場合だけ。それ以外は `standard` です。
- このコマンドは判定と設定のみで、実行中セッションのモデルは切り替えません。

## rdsh wait / rdsh retry-log — 待機と再試行ログ集計

```sh
rdsh wait --for 5m                 # 残り時間を 1 行表示。Ctrl+C で中断（exit 0）
rdsh wait --until 09:30            # 次に来る 09:30（過ぎていれば翌日）
rdsh wait --for 6h --json          # 終了時に {"waited_ms","until_unix","interrupted"}
rdsh retry-log --since 24h         # プロバイダ別の再試行回数・待機合計・失敗コード
rdsh retry-log --project '--home-sahen-File-Prog-rustdsh--' --json
```

- 待機は既定で上限 12 時間です（`--max` または `RDSH_WAIT_MAX=NULL` で変更）。stdout は静かで、進捗は stderr に出ます。
- `retry-log` は `$DSH_HOME/sessions/**/*.jsonl.zstd` を読み取り専用で走査し、`llm/retry` を再試行 1 回として数えます。重複レコードと破損行は件数だけ報告します。

## rdsh serve — 内蔵 Web UI

手元で状態確認やトークン見積もりを行える軽量な Web 画面です（既定ポート `:38080`、本家の `:3080` と競合しません）。

```sh
rdsh settings set extras.enable serve  # 機能を有効化
rdsh serve                             # 起動（ローカルホスト限定、一時トークンで保護）
```

空きポートを自動選択したい場合は `--port 0` を指定します。

## rdsh desktop — デスクトップアプリ連携

```sh
rdsh desktop status                 # アプリ、コマンドランタイム、プロファイル、プラグインの状態（読み取り専用）
rdsh desktop install --plugins-dir .   # desktop プロファイルに rdsh-settings と rdsh-mobile-ui を組み込み
rdsh desktop install --plugins-dir . --compute   # 常駐 compute bridge もあわせて追加
rdsh desktop verify                 # プロファイルに rdsh プラグインがない場合は 0 以外で終了
```

rdsh がプロファイルを起動したり直接書き換えたりすることはありません。

## rdsh plugin — プラグイン管理

`dsh plugin` と同等の操作です。

```sh
rdsh plugin --profile web add /path/to/bundle  # プラグインの追加
```

## その他

```sh
rdsh features                        # 機能スイッチと既定値の一覧
rdsh features on serve               # 機能を有効化
rdsh features off update_check       # 無効化
rdsh settings set extras.enable serve
rdsh bench --n 5                     # 起動速度の比較
```

- 更新チェック（update_check）と更新通知は既定で有効です。
- serve・search-web・context_engine・agent_tool_sandbox などは既定 OFF です。

## 出典

- [rustdsh README.ja.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md)
- [rustdsh docs/BENCHMARKS.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/BENCHMARKS.md)
