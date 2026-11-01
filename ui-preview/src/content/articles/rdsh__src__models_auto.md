---
title: "models_auto — provider モデルの定期リフレッシュ（src/models_auto.rs）"
desc: "rdsh models sync はプロファイルの provider ブロックを provider 自身が広告するモデル一覧に揃えます（モジュール doc L1-5）。ただし実行を"
cat: "rdsh-src"
catLabel: "rustdsh ソース"
chars: 2388
slug: "rdsh/src/models_auto"
---

# models_auto — provider モデルの定期リフレッシュ（src/models_auto.rs）

## ① 目的
`rdsh models sync` はプロファイルの provider ブロックを provider 自身が広告するモデル一覧に揃えます（モジュール doc L1-5）。ただし実行を記憶して行う必要があり、その運用を担うのが本モジュールです。ブート経路は状態ファイルを読むだけで、期限が来ていれば detached で `rdsh models auto --quiet` を起動し、ネットワーク処理は DSH 起動後に行われます。

## ② CLI と本家 dsh への橋渡し
- 本家 dsh への橋渡しは無し。対象は dsh プロファイルの設定ファイル
- `rdsh models auto [--json] [--quiet]` が本体。JSON は models sync レポートの要約にスケジュール情報を足したものです（doc L17-18）
- ブート側の入口は `maybe_spawn()`（L216）。返り値は () で、あらゆる error を吞み込む（doc L9-11）

## ③ 主な関数と挙動
| 関数 | 行 | 挙動 |
| --- | --- | --- |
| `decide()` | L141 | Disabled / NotDue / Run の 3 振り分けをします |
| `due()` | L154 | 記録が無い・読めないものは期限到来とみなす。自ら停滞しないための設計 |
| `interval_hours_from()` | L161 | env 値を整数として取り、下限 1h（MIN_INTERVAL_HOURS）に clamp する |
| `read_state()` | L194 | 状態ファイルが無い・非 regular・64KiB 超過・JSON 構文不一致のどれでも State::default に落ち、壊れた状態で schedule が固まらない。未知の field は保持する（tests L635） |
| `write_state()` | L208 | auth::write_creds（atomic sibling-temp-and-rename、credential 用）を流用する（L210-212） |
| `maybe_spawn()` | L216 | dry_run で中止。Run 判定のときだけ detached spawn を行い、error は静かに無視する |
| `spawn_detached()`（Unix） | L233 | stdio 全部を null 化し、pre_exec 中 setsid() を呼ぶ（L236-250） |
| `spawn_detached()`（Windows） | L256 | DETACHED_PROCESS | CREATE_NO_WINDOW で spawn する |
| `sync_argv()` | L271 | 継承した selector（--profile / --provider など）を sync 呼び出しに付ける（tests L700） |
| `summarize()` | L303 | sync レポートの差分を要約する。空のレポートは change 無しとする（tests L684） |

## ④ 既定値・環境変数
- feature id: models_auto（rdsh.json の features、rdsh features off で veto）（L32）
- 既定間隔 24h、下限 1h、上書きは RDSH_MODELS_AUTO_INTERVAL_HOURS（L34-38）
- 明示無効化: RDSH_NO_MODELS_AUTO（env 存在で veto、L40 / L175）、features.models_auto=false、--dry-run（doc L12-13）
- 状態ファイルは $DSH_HOME/cache/rdsh-models-auto.json（上限 64KiB、L42-44）。二重起動の直列化は状態の sibling lock（doc L16）
- 失敗レポートに sync の stderr 中央末尾 400 文字まで残す（MAX_ERROR_CHARS L46）

## ⑤ 既知の制限
- interval 毎に最大 1 回しか refresh しない
- ブート path は network を取らない。fan-ロスのため sync 失敗への reflex は次回まで行わない（确期s）
- sync 自体の挙動（詳しい接近先先URL など）は models.rs 側にあり、本モジュールは schedule と spawn に特化する

- interval は秒への換算後で `due()` に渡される（L168-171）
- 失敗時の報告は `tail_error()`（L345）が残しやすい形で stderr の末尾のみにする（推測含む）
- spawn 後の子の終了を待つことは無く、結果は次回の状態ファイルで確認する

## 出典
- UPSTREAM: <https://github.com/jimoto-no-llm/rustdsh/blob/main/src/models_auto.rs>
- README.ja: <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
