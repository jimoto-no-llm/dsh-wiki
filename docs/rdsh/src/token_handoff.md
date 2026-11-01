# token_handoff — bearer token のファイル渡し（src/token_handoff.rs）

## ① 目的
プロセスごとの bearer-token handoff を、credential を argv・ログへ出さない形で行うモジュールです（先頭 doc L1）。トークン内容は一時ファイルにのみ書き、使い手が読み取った後など `TokenHandoff` の寿命が尽きるとファイルは削除されます。

## ② CLI と本家 dsh への橋渡し
- 本家 dsh への橋渡しは無し。serve.rs（L30）などが起動した dashboard 向けのトークンをこの handoff に置き、browser 側の入力を受け渡しする
- token の日付計算、random は local_http.rs (`random_token()` L62) 側で供給される
- handoff ファイル名は rdsh-token-hex64.txt 形式（L18）

## ③ 主な関数と挙動
| 構成 | 行 | 挙動 |
| --- | --- | --- |
| `TokenHandoff::create()` | L13 | 一時ディレクトリに random 名のファイルを新規作成する。重複は 8 回まで試す（L16-19） |
| `TokenHandoff::path()` | L44 | トークンを書いたファイルの path を返す |
| `TokenHandoff の Drop` | L50 | `fs::remove_file` で best-effort 削除する |
| `open_restricted()` | L55 | create_new(true)。Unix は mode 0o600。Windows は ACL 経由の保護、その他プラットフォームは unsupported で失敗させる（L70-78） |
| `write_handoff()` | L82 | token を書き込み、`sync_all()` で flush を担保する |
| `restrict_windows_acl()` | L90 | whoami.exe で現在アカウントの SID を取得し、icacls で継承剥奪 + 現アカウントと SYSTEM（S-1-5-18）のみ grant する（L113-119） |
| `parse_whoami_sid()` | L137 | whoami 出力から SID を取り出し、S-1-N 形式を検証する |

## 保護の設計（読める事実）
- ファイル名は random で secret と結び付かず、認証情報はファイル内容のみに入れる（L16-18）
- Secret bytes は ACL 設定後に書く順序を守る（Windows 側の comment L111-112）
- 全プラットフォームで create_new による一意性と race を避ける
- Unix は 0o600 で、Windows は ACL の継承剥奪。

## ④ 既定値・環境変数
- ファイルは `std::env::temp_dir()` 配下に書かれる（L14）
- 接触回数 8 回（AlreadyExists の retry 上限、L16）
- windows 側は SystemRoot env の有無が guard に（L94-95）
- その他の環境変数は無し

## ⑤ 既知の制限
- TokenHandoff が drop されたら（best-effort ではdelete する）credential は消失する。使用側は先に読み切る必要がある
- temp_dir の同時書と Windows の icacls 実行に依存するため環境が前提をつくる（ Unable な whoami・icacls は error ）
- Unix / Windows 以外は unsupported で作れない（L70-78）
- ファイルは保護された状態で作成され、secret は argv もログにも出ないが、削除 Drop を督促する形しか担保されない

## 出典
- UPSTREAM: <https://github.com/jimoto-no-llm/rustdsh/blob/main/src/token_handoff.rs>
- README.ja: <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
