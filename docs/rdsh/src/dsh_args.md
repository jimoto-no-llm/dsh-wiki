# dsh_args — 起動引数の分割（src/dsh_args.rs）

## ① 目的
rdsh が受け取った引数を、本家 dsh（lib/bin.js）互換の意味論に沿って起動フラグと内部アプリ引数に分けるモジュールです。先頭コメント「Launcher flags come first; first unrecognized token starts inner app-args」（L1-3）が規約そのものですが、読み取り専用の分割器であり判定以外は行いません。まとめると使い勝手がシンプルです（`dsh <名>` は ``--profile <名>`` の略）。

## ② CLI と本家 dsh への橋渡し
- 分割結果は `Launcher` 列挙型（L4-25）: `Help` / `Boot` / `Dump` / `Plugin` / `Error`
- `Dump` の種類は `DumpKind`（L27-31）: `Config` / `DefaultConfig` / `Schema`
- 分割結果から main.rs が `passthrough::exec_*` へ引き渡す

## ③ 主な関数と挙動
| 関数 | 行 | 挙動 |
| --- | --- | --- |
| `split_launcher_args()` | L33 | 唯一の公開関数。規則は下記 |

- 最初の位置引数が `plugin` なら Plugin モードにし、残りを pnpm args とする（L50-59）
- `-h` / `--help` はプロファイル未指定・位置引数なしのとき Help（L71）
- `--profile <名>` と `--profile=<名>` のどちらも受け付けるが、二重指定はエラー（L72-80、L89-94）
- `--from-default-profile <名>` はそのまま Boot で転送（L81）
- `--patch <パス>` は複数回指定可、空はエラー（L82-85）
- `--dump-config` / `--dump-default-config` / `--dump-config-schema` は相互に排他。dump 系はアプリ引数を拒否し、`--dump-default-config` は `--patch` も拒否する（L129-158）
- 最初のまだ知らない `-` 始まりトークンとそれ以降の全トークンはアプリ引数として打ち切る（L95-99）
- 最初の位置引数はプロファイル略記。残りはアプリ引数に付加する（L100-114）
- プロファイルが小文字で `desktop` は Electron が独占するためエラー（L124-128）
- プロファイル最終判定は dump 系では必須（error）、それ以外は Helpに（L115-122）
- 先頭が `--` のみ、アプリ引数から剥ぎ取る（L160-162）

## ④ 既定値・環境変数
- 環境変数・既定値はモジュール内に無し。実際の起動の既定は main.rs / rdsh_config.rs 側に置く
- テストは規約の回帰版（positional_is_profile L179 以降、unknown_flag_starts_app_args L193 など）

## ⑤ 既知の制限
- 本家 bin.js が意味論を変えると壊れる可能性がある（先頭コメントに mirrors の立場） 日上な維持を要する
- プロファイルの存在や正しい spell はこのモジュールでは確認しない
- Help の表示自体は呼び出し側（main.rs）にあり、本モジュールは分岐だけを行う

- `--patch` のパスの存在や重複は本モジュールでは確認しない
- dump 種別がどれも指定なしなら通常の Boot に流れる（L129-158 の dumps == 0 系）
- Help に到達すると、それ以上の引数解析は呼び出し側が行う

## 出典
- UPSTREAM: <https://github.com/jimoto-no-llm/rustdsh/blob/main/src/dsh_args.rs>
- README.ja: <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
