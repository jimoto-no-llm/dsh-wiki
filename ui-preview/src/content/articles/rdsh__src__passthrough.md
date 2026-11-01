---
title: "passthrough — 本家 dsh への drop-in 委譲（src/passthrough.rs）"
desc: "rdsh を dsh として振る舞わせ、実際の処理は本家 dsh（lib/bin.js）に委譲するモジュールです。起動時に PATH から original dsh を探し、 sl"
cat: "rdsh-src"
catLabel: "rustdsh ソース"
chars: 2739
slug: "rdsh/src/passthrough"
---

# passthrough — 本家 dsh への drop-in 委譲（src/passthrough.rs）

## ① 目的
rdsh を dsh として振る舞わせ、実際の処理は本家 dsh（lib/bin.js）に委譲するモジュールです。起動時に PATH から original dsh を探し、 slim env や Web UI アセット overlay などを加えてから exec します（先頭コメント L1-2）。

## ② CLI と本家 dsh への橋渡し（本モジュールの主機能）
- `exec_boot()`（L548）: --profile / --from-default-profile / --patch を引き渡す。exec 前に `auth::pre_boot(true)`（L561）
- `exec_dump_config()`（L587）: --dump-config / --dump-default-config / --dump-config-schema を本家へ渡す
- `exec_raw()`（L618）: `dsh` として shadow されたときの引数無編集委譲。--version / -V / --help / -h は metadata_only として高速パスをとる（L625-626）
- `exec_plugin()`（L643）: `plugin --profile <名>` に pnpm args を付けて転送（L655-656）
- --patch の並び順: 生成 overlay（gzip overlay）を先に付け、後続の caller 供給 --patch を常に最上位に保つ（exec_boot L567-571）
- Web profile への最適化: `profile_of()`（L416）で引数から web profile が検出されたときのみ、web assets（L437）と gzip overlay（L461）を適用する

## ③ 主な関数と挙動
| 関数 | 行 | 挙動 |
| --- | --- | --- |
| `env_passthrough()` | L3 | RDSH_PASSTHROUGH=1 で slim env を止める |
| `env_dry()` | L7 | RDSH_DRY_RUN=1 で exec せずコマンドを print するだけにする |
| `origin_file()` | L11 | $home/.config/rdsh/origin から install.ps1 が記録した backup 元 path を読む |
| `is_executable_candidate()` | L27 | 実効 user による実行可能かを metadata から判定する（他の permission class にだけ exec bit があるファイルをそのまま通さない） |
| `find_original_dsh()` | L67 | PATH 候補を順に検査し、rdsh 自身や非実行バイナリを skip して original dsh を返す |
| `pick_latest_node_tree()` | L181 | opt 配下の version-labeled node ツリーを比較して最新を選ぶ（`parse_node_tree_version()` L157） |
| `find_node_bin()` | L227 | 起動に使う node runtime を探す |
| `base_cmd()` | L468 | 本家が .js か否かで node 起動か直接起動かを決める。sandbox 有効時（`tool_security::sandbox_enabled()` L481）は `tool_security::command()`（L496）経由にし、RDSH_VERSION を子環境に設定する（L493、L497） |
| `apply_slim()` | L501 | slim::slim_env() の値を環境へ設定し、features.node_compile_cache 有効なら NODE_COMPILE_CACHE を条件つき設定する（L516-523） |
| `exec_or_spawn()` | L526 | Unix は exec() で置換し、Windows は spawn 後子の exit code で終了する（L541-545） |

## ④ 既定値・環境変数
- RDSH_PASSTHROUGH=1、RDSH_DRY_RUN=1（L3-9）
- DSH_ORIG_BIN は original dsh が見つからないときの解決策として error 文で案内される（L557 / L622-624）
- RDSH_VERSION は子プロセスに rdsh の version を伝える（base_cmd）
- sandbox は features.agent_tool_sandbox、--share-file、RDSH_SECURITY=1 で有効化する（L482-484 のコメント）
- NODE_COMPILE_CACHE の借用は RDSH_NODE_COMPILE_CACHE=0 で opt out できる（L515-517）

## ⑤ 既知の制限
- original dsh が PATH に無いとき起動できない（find_original_dsh が None なら error）
- 起動に使う node runtime が見つからないときは error（L480）
- Unix は exec 置換。Windows は spawn + 同じ exit code なので、置換の性質（pid維持など）が代わる（L541-545）
- dump や plugin は生成 overlay・web assets を伴わない（exec_boot と exec_raw のみが行う）

## 出典
- UPSTREAM: <https://github.com/jimoto-no-llm/rustdsh/blob/main/src/passthrough.rs>
- README.ja: <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
