---
title: "local_http — ローカル HTTP の最小実装（src/local_http.rs）"
desc: "dashboard などが使うローカル HTTP サーバの共通部を提供するモジュールです。上限つきのリクエストパーサ、host・origin による信頼判定、トークン認証、恒定時間"
cat: "rdsh-src"
catLabel: "rustdsh ソース"
chars: 2149
slug: "rdsh/src/local_http"
---

# local_http — ローカル HTTP の最小実装（src/local_http.rs）

## ① 目的
dashboard などが使うローカル HTTP サーバの共通部を提供するモジュールです。上限つきのリクエストパーサ、host・origin による信頼判定、トークン認証、恒定時間比較、セキュリティヘッダ付きの応答が揃っています。

## ② CLI と本家 dsh への橋渡し
- 本家 dsh への直接の橋渡しは無し。serve.rs の dashboard と webui 系の Web UI がこのモジュールを前提にする（推測）

## ③ 主な関数・型と挙動
| 構成 | 行 | 挙動 |
| --- | --- | --- |
| `Request` / `header()` | L12 / L20 | method・target・body と解析済みヘッダ列を保持する |
| `trusted()` | L27 | host が 127.0.0.1:{port} か localhost:{port} であることを要求する。Origin があればそれも同一値、ネイティブクライアント（Sec-Fetch-* 無し）は Origin 無しでも許可する。ブラウザ由来の POST は Origin 必須（L35-42）。Sec-Fetch-* はブラウザの合図として使うがトークン認証の代わりにはならない |
| `authorized()` | L45 | x-rdsh-token ヘッダを `constant_time_eq()`（L52）で恒定時間比較する |
| `constant_time_eq()` | L52 | XOR fold による恒定時間比較 |
| `random_token()` | L62 | getrandom::fill で 32 バイト乱数から 16 進 64 文字のトークンを作る |
| `read_request()` | L74 | 下記の解析規則。失敗は HTTP status コードで返す |
| `read_with_deadline()` | L166 | 全体 10 秒の deadline 付き chunk 読み |
| `respond()` | L187 | X-Content-Type-Options: nosniff、Referrer-Policy、CSP（default-src など）、Connection: close をまとめて付与する |
| `ConnectionSlot` | L216 | Arc＼AtomicUsize］ のカウントで並列接続数を制限し、Drop で解放する |

## read_request の解析規則（L74-164）
- ヘッダ上限 16KiB（MAX_HEADER L8）、ボディ上限 64KiB（MAX_BODY L9）
- \r\n\r\n を探しつつ尻切上限超過で 413
- method は GET / POST のみ、target は / 始まり、protocol は HTTP/1.1 固定で、これ以外は 400（L105-111）
- ヘッダ名は英数字と - のみ、値に制御文字は禁止（L112-127）
- transfer-encoding は 400（L124-126）
- content-length は 1 つだけ、空・非数字・過大は 400 / 413（L127-132）
- host・origin・x-rdsh-token の重複は 400（L133-137）
- POST は content-length 必須（L140-142）。宣言長より body が長ければ 413（L144-156）

## ④ 既定値・環境変数
- 上限値: ヘッダ 16KiB、ボディ 64KiB、読み取り 10 秒 deadline
- 接続数上限は呼び出し側が ConnectionSlot に渡す値で決まる
- モジュール内の環境変数は無し

## ⑤ 既知の制限
- HTTP/1.1 と GET / POST のみ。chunked transfer は拒否する
- TLS は無しで、127.0.0.1 の listen を前提にする（trusted の許可 host が固定）
- 信頼判定で意味を持つのは host・origin・x-rdsh-token・Sec-Fetch-* のみ。他のヘッダは読み取りと通過検査の対象だけ
- 10 秒の deadline に達すると読み取りはエラーになり、接続は失敗応答で終わる（L166 と read_request の戻り値扱い）

## 出典
- UPSTREAM: <https://github.com/jimoto-no-llm/rustdsh/blob/main/src/local_http.rs>
- README.ja: <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
