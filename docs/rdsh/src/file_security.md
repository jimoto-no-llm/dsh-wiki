# file_security — no-follow による安全なリポジトリ読み取り（src/file_security.rs）

## ① 目的
リポジトリ配下のファイルを、no-follow とディレクトリ相対ハンドルで安全に読むための capability 型 `Root` を提供します。絶対かつ正準な root を呼び出し側が用意した上でリクエストを行い、対応していないホストでは fail closed（None を返して開かない）にします。設計の中心は TOCTOU（symlink 差し替え）を閉じることです（先頭コメント L1-12）。

## ② CLI と本家 dsh への橋渡し
- 直接の橋渡しは無し。`deps.rs` のインデックス読み取り（L1660 で `Root::new(root)` を使用）、`search.rs` の `read_capped()`（L216）、context 系のコード検索が `Root` を経由します（推測）

## ③ 主な関数と挙動
| 構成 | 行 | 挙動 |
| --- | --- | --- |
| `Root::new()`（Unix） | L30 | root が絶対パスでなければ None。開いたディレクトリ fd を capability として保存する |
| `Root::new()`（Windows） | L64 | 同様に絶対パスを要求し、identity（root のパス）を保存する |
| `Root::new()`（その他） | L70 | 常に None（fail closed） |
| `Root::open()`（Unix） | L75 | 各構成要素をディレクトリ fd 上の `openat` / O_NOFOLLOW で開き、最後の fd が regular file かつ nlink == 1 であるときのみ返す |
| `Root::open()`（Windows） | L113 | open を先に行い、開いた handle 后処理を `win32::open_verified()`（L215）で検証する。validation から open の間に競合が構造的に発生しない |
| `open_beneath()` | L293 | Root を作らず単発で open する helper |

## Windows 側の技術的詳細（先頭コメント + win32 モジュール L131-290）
- `CreateFileW` に verbatim（\\?\...）prefix の絶対パスで open。FILE_FLAG_BACKUP_SEMANTICS でディレクトリも open し、後段の handle 検証で拒否する
- `GetFinalPathNameByHandleW` で handle 先が root 配下であることを確認し、`GetFileInformationByHandle` で reparse point でない単一リンクの regular file であることを確認する
- Win32 API は raw `extern "system"` FFI で宣言し、新しい crate を追加しない（先頭コメント L10-12）
- `normalize()`（L185）は \\?\ と \\?\UNC\ を剥がして root と表記を揃える
- `final_path()`（L193）のバッファ拡張は 8 回までに上限制限し、異常な応答でループしない

## テストが示す保証（L303-451）
- 親ディレクトリの symlink swap、FIFO、検証後の symlink 差し替え、root 外への hardlink、`..` による脱出、キャッシュした root identity の置換後 read からの保護を検査する

## ④ 既定値・環境変数
- 上限値や環境変数は無し。挙動はプラットフォームの syscall / Win32 FFI のみで決まる

## ⑤ 既知の制限
- Unix を含まないその他プラットフォームでは open が常に None。依存モジュール（search など）は 結果 避免 空 になります（推測）
- 読み取り専用で、書き込み操作は提供しない
- root の identity は new 時に固定される。root より上のコントロールの前提は呼び出し側が守る必要がある
- Windows 側は handle 検証のどれかが失敗すれば open は None を返す。例外にならず、呼び出し側からは静かに見えなくなる

## 出典
- UPSTREAM: <https://github.com/jimoto-no-llm/rustdsh/blob/main/src/file_security.rs>
- README.ja: <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
