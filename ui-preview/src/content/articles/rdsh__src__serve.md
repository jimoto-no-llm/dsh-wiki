---
title: "serve — ローカル dashboard（src/serve.rs）"
desc: "rdsh serve で起動する bounded な local dashboard です。127.0.0.1 のみの server、embedded UI と小さな JSON A"
cat: "rdsh-src"
catLabel: "rustdsh ソース"
chars: 2665
slug: "rdsh/src/serve"
---

# serve — ローカル dashboard（src/serve.rs）

## ① 目的
`rdsh serve` で起動する bounded な local dashboard です。127.0.0.1 のみの server、embedded UI と小さな JSON API。読み取り専用: HTTP 経由では boot・file 書き込み・コマンド実行を行わない（モジュール doc L1-3）。

## ② CLI と本家 dsh への橋渡し
- dashboard 自体は委譲を行わない。ただし `doctor_json()`（L213-225）が `passthrough::find_original_dsh()` や `slim::describe()` の読み取り結果を表示する
- doctor は提供情報: original_dsh、dsh_home、local_profiles、slim、version

## ③ cmd_serve の挙動（L19-73）
1. 127.0.0.1:{port} で bind。error 時は dsh web GUI が 3080 を使い、rdsh serve の既定は 38080、--port 0 も試すよう案内する（L21-25）
2. listener を non-blocking 化して shutdown::install()（Ctrl-C で graceful 終了）する（L26-27）
3. local_http::random_token() でトークン作り、token_handoff::TokenHandoff 用にファイル handoff に置く。token 自体はログに出さず、dashboard に handoff ファイルの中身を入力させる（L29-39）
4. accept loop は、idle 時に 5ms sleep（nonblocking poll）、`ConnectionSlot` の上限を超える接続は 503 busy で即応答する（L41-52）
5. shutdownが requested() で loop 各を終了する（L42）

## handle() の振る舞い（L75-211）
- read timeout 10 秒付き。syntax error は HTTP status コード返しの JSON error（L77-88）
- trusted() 失敗は 403 untrusted host or origin（L90-98）
- /api/* には x-rdsh-token 必須、無しは 401（L105-112）

## HTTP ルート（L117-208）
| method | パス | 挙動 |
| --- | --- | --- |
| GET | / | embedded UI（include_str! L5-6） |
| GET | /ui.js /icon.svg /icon.png /favicon.ico /rdsh-ui-controls.css | embedded 静的資源（最後の 1 つは plugins/rdsh-settings から include） |
| GET | /api/version | rdsh name と CARGO_PKG_VERSION（L117-121） |
| GET | /api/doctor | ステータス JSON（doctor_json L213-225） |
| GET | /api/sessions?limit | limit 既定 20、clamp 1〜100、inspect::sessions_json（L179-195） |
| GET | /api/skills /api/profiles | 名前一覧（inspect::names_json L197-206） |
| GET | /api/bench | 自身の --version spawn 時間を cache つき計測。n は default 3、clamp 1〜5（L227-266） |
| POST | /api/tokens | text の tokens・chars を estimate（L153-166） |
| POST | /api/prune | text を max_tokens に prune、default 4000・clamp 100〜200,000（L167-177） |
| その他 | | 404 {"error":"not found"}（L207） |

## ④ 既定値・環境変数
- port: 既定 38080（設定 serve.port、rdsh_config.rs L880・1〜65535）。--port 0 でランダム化
- bench は OnceLock/Mutex/HashMap で n ごとに永遠キャッシュする（L228-245）
- 環境変数はモジュール内に無し
- idle 時の accept poll は 5ms 間隔。shutdown 応答性と 100ms 時に測られた約 93ms の追加受け付け遅延のトレードオフから選ばれた値（L62-66）

## ⑤ 既知の制限
- 読み取り専用。boot・書き込み・命令実行はしない（先頭 doc L2-3）
- bench のキャッシュは process lifetime 固定で、n 毎に最大 1 エントリーの size一定性
- thread は connection 毎 spawn、上限は ConnectionSlot で決まる
- stderr が閉じられても log_line()（L14）が panic するしないように作られている（doc L7-12）
- ポートが他の process に取られていると bind が失敗し、serve は起動に失敗して終了する

## 出典
- UPSTREAM: <https://github.com/jimoto-no-llm/rustdsh/blob/main/src/serve.rs>
- README.ja: <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
