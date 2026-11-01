# deps — 静的依存グラフの近似インデックス（src/deps.rs）

## ① 目的
リポジトリを決定論的・オフラインの静的解析で近似し、関連ファイルやシンボルの参照を `rdsh deps` コマンド群で提供します。先頭コメント「Dynamic dispatch, indirect calls, macros and generated code は unresolved のまま、決して推測しない」が設計姿勢そのものです。解析結果は半分は方言に近い NOTE 文言（L20）で明示されます。

## ② CLI と本家 dsh への橋渡し
- 本家 dsh への橋渡しはなし。rdsh 固有のサブコマンド: `rdsh deps build/query/impact` → `cmd_build()`（L1921）、`cmd_query()`（L2004）、`cmd_impact()`（L2089）
- インデックスは `$DSH_HOME` 配下に保存（`index_path()` L137）、対象 root は `repository_root()`（L118）で決める

## ③ 主な関数と挙動
| 関数 | 行 | 挙動 |
| --- | --- | --- |
| `scan()` | L301 | SKIP_DIRS を避け、上限 MAX_FILES まで走査し、mtime・size を拾う（`Scan` L71） |
| `lex()` | L408 | 言語別にトークン化。`is_word()`（L404）を共通化 |
| `extract()` | L727 | 1 ソースから import・定義シンボル・呼び出しを抽出し `Entry`（L45）を作る |
| `resolve()` | L1178 | import 先をファイル規則と `module_dir()`（L1151）で解決する |
| `read_go_module()` | L1368 | go.mod からモジュール名を読み Index に記載する |
| `build_index()` | L1658 | サイズ+ns 単位 mtime が一致し unknown が無いファイルは旧 Index を再利用。再解析は SHA-256 の前 8 バイトを `digest()`（L76）で保存し、truncate・非 UTF-8・読み込み失敗・インデックス中の変更は unknown に記録 |
| `stale()` / `ensure_index()` | L1764 / L1791 | query・impact はインデックスが無ければ build、`related_files()`（L1849）は stale でも旧い Index を読んで近似を返す |
| `cmd_query()` | L2004 | 定義と参照のファイル一覧を出し、未発見は exit code 1（`ensure!` L2024）、似た候補を `candidates()`（L1953）で提示 |

## ④ 既定値・上限値・環境変数
- `MAX_FILES` 20,000、`MAX_BYTES` 512KiB（1 ファイル読み取り上限、超過は `truncated` と unknown 記録）、`MAX_INDEX_BYTES` 64MiB、`MAX_CALLS` 200（L15-19）
- SKIP_DIRS（L21-35）: .git, target, node_modules, dist, .local, .serde, .serena, .playwright-cli, __pycache__, .venv, venv, .next, coverage
- gitignore 相当は部分集合（`*`, `**`, `?`, root/nested, `!`）を `wildcard()`（L164）で実装
- impact の深度は最大 8 に clamp（L2033）
- `RDSH_DEPS_TEST_ACTION` はテスト専用の環境変数（L2199）
- index ファイルは `atomic_write()`（L1609）で原子書き込みする

## ⑤ 既知の制限
- dynamic dispatch・間接呼び出し・マクロ生成・生成コードは unresolved。外部パッケージ・曖昧な名前・lexer で確定できない参照も unresolved（NOTE L20）
- 字句スコープ・型の binding は unknown。名前一致による潜在的な影響も含めた近似のまま
- 512KiB を超えるソースは前半 512KiB 分のみをハッシュし、unknown に truncated を入れる（L1699-1707）
- 読み取れないファイルは unknown に read failed で記録して継続する（L1705-1707）

| `related_files()` | L1849 | seed から `neighbours()`（L1801）で近隣ファイルを選び、最大 max 件返す |
| `graph_summary()` | L1913 | edge 数などのグラフ要約の 1 行と NOTE を返す |
- impact は対象ファイルの symbol コールを辿りつつ、逆方向の依存も Graph（L1431）から提示する（推測）

## 出典
- UPSTREAM: <https://github.com/jimoto-no-llm/rustdsh/blob/main/src/deps.rs>
- README.ja: <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
