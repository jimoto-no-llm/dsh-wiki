---
title: "search — ネイティブ再帰 grep（src/search.rs）"
desc: "リポジトリ配下を再帰的に走査して部分文字列を探すネイティブ grep です。hidden ディレクトリと vendor 系を除外し、出力上限を持ちます。2 相構成で、先に固定順の "
cat: "rdsh-src"
catLabel: "rustdsh ソース"
chars: 2158
slug: "rdsh/src/search"
---

# search — ネイティブ再帰 grep（src/search.rs）

## ① 目的
リポジトリ配下を再帰的に走査して部分文字列を探すネイティブ grep です。hidden ディレクトリと vendor 系を除外し、出力上限を持ちます。2 相構成で、先に固定順の walk、その後に並列 grep を行います。出力の順序は逐次 scan と同じ（walk 順）を保ちます（モジュール doc L1-4）。

## ② CLI と本家 dsh への橋渡し
- 本家 dsh への橋渡しは無し。rdsh 固有のサブコマンドです
- CLI: `rdsh search ＼pattern］ [--dir ＼d］] [--max ＼n］]`（main.rs L769）。max の既定は設定 search.max（rdsh_config.rs L962、既定 100・1〜100）

## ③ 主な関数と挙動
| 関数 | 行 | 挙動 |
| --- | --- | --- |
| `cmd_search()` | L5 | Unix 以外は error。root を canonicalize し、file_security::Root を作って file 一覧を作る。32 ファイル以上は grep_parallel、未満は grep_chunk。Root が作れないときは読み取り無しで終える |
| `collect_files()` | L59 | dirent の file_type で分類し stat を使わない walk |
| `entry_kind()` | L109 | Dir / File / Skip に分類。symlink と未知の型は Skip |
| `is_skip_dir_name()` | L94 | 先頭が . の hidden、SKIP 名の集合（L49-57）をしきいに exclude |
| `collect_parallel()` | L129 | サブディレクトリ単位で並行 walk。pieces は inspect::parallelism() 幅の batch、位置は結果の index に埋め込んで元の順序を保つ。サブディレクトリ 2 未満は逐次 walk へフォールバック（L140-143） |
| `read_capped()` | L214 | 開いた fd の metadata で 2,000,000 バイト超を skip、上限付読みで UTF-8 判定（L221-229） |
| `grep_one()` | L232 | 行ごとに contains パターン一致、max 行に達したら中断。1 行は 240 文字まで truncate（`truncate()` L302） |
| `grep_chunk()` | L262 | 残り max を追跡しながら逐次 grep |
| `grep_parallel()` | L278 | file 一覧を chunk に分けて threads 分の worker（inspect::parallelism()）へ渡し、結果を順序保持で連結する |

## ④ 既定値・上限値・環境変数
- SKIP 集合（L49-57）: .git, node_modules, target, .venv, dist, build, .next（hidden も排除）
- 表示は行ごとに最大 240 文字で切り、末尾に > を付ける（L302-308）
- 1 ファイルと全体の読み取り上限は 2,000,000 バイト（L221）
- worker / walker の thread 数は inspect::parallelism() に同心です（1〜8 に clamp、tests L316-318）
- 設定 search.max の既定 100、可変範囲 1〜100（rdsh_config.rs L962）
- モジュール内の環境変数は無し

## ⑤ 既知の制限
- Unix 専用。それ以外の OS は RDSH_SECURITY の error で中断する（L6-8）
- 正規表現は使えない（contains の部分文字列一致のみ）
- repository 内の symlink は追わない（tests L365  recursive_search_does_not_follow_repository_symlinks）
- 走査後に差し替えられた file は拒否して読まない（tests L386）
- 上限 max に達したら残りの file は読み飛ばす。全体出力を global 上限内に保つための設計（L262-276）

## 出典
- UPSTREAM: <https://github.com/jimoto-no-llm/rustdsh/blob/main/src/search.rs>
- README.ja: <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
