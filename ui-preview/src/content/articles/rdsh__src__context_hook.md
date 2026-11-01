---
title: "context_hook — hooks.json への注入フック登録（src/context_hook.rs）"
desc: "rdsh context inject を DSH の Claude Code 方言設定 hooks.json に UserPromptSubmit コマンドフックとして登録するモ"
cat: "rdsh-src"
catLabel: "rustdsh ソース"
chars: 2080
slug: "rdsh/src/context_hook"
---

# context_hook — hooks.json への注入フック登録（src/context_hook.rs）

## ① 目的
`rdsh context inject` を DSH の Claude Code 方言設定 hooks.json に `UserPromptSubmit` コマンドフックとして登録するモジュールです（先頭ドキュメント L1-9）。注入の入口は隠し side channel ではなく、文書化された hook JSON stdout（hookSpecificOutput.additionalContext）を使う方式です。2 回目の install は何も変わらない冪等実装で、書き込み時は正規化 JSON に書き換え、初回のみ元のバックアップを作ります。

## ② CLI と本家 dsh への橋渡し
- 対象は DSH 本体の hook 設定。規定パスは `{dsh_home}/hooks.json`（`default_path()` L19）
- 登録されるコマンドは `inject_command()`（L125）が `--rdsh` で渡された rdsh バイナリ名から組み立てる
- フック実行後の実際の注入本体・予算は context.rs 側（本モジュールは設定ファイル編集のみ）
- CLI: `rdsh context hook install|remove|status` → `cmd_hook()`（L263、main.rs L1035-1043）
- `remove` / `status` へは `--rdsh` を引き渡さない（main.rs L1037、L1043）

## ③ 主な関数と挙動
| 関数 | 行 | 挙動 |
| --- | --- | --- |
| `read_config()` | L23 | JSON 構文エラーはエラー、ファイルが無い場合のみ空オブジェクトを返す |
| `is_ours()` / `command_is_ours()` | L39 / L46 | 部分文字列ではなく program 名が rdsh 系であること（`rdsh_named()` L71）とシェルトークン解析（`shell_tokens()` L78）で一致する場合のみ自分のものと判断する |
| `shell_tokens()` | L78 | コマンド文字列を語に分割して一致判定に使う |
| `merge()` | L170 | 対象 event 配下に自分の entry が無ければ追加する |
| `unmerge()` | L198 | 自分の entry と追加後に空になった group を取り除く |
| `write_atomic()` | L227 | 正規化 JSON による上書き。初回のみ `{path}.bak-rdsh-context`（L16 `BACKUP_SUFFIX`）を作る |
| `cmd_hook()` | L263 | install / remove / status の分岐。dry-run では結果 JSON を表示して書かない（L280-290） |

## ④ 既定値・環境変数
- イベント名は固定: `const EVENT = "UserPromptSubmit"`（L17）
- 規定パスとバックアップ接尾語は上記の通り。モジュール内の環境変数は無し

## ⑤ 既知の制限
- 対応するのは Claude Code 方言の hooks レイアウトのみで、他ツールの互換設定ファイルは扱わない
- 正規化 JSON に書き換えるため元のフォーマットは失われ、バックアップは初回書き込み時のみ（L9、L227）
- `--rdsh` に rdsh 以外の名前を渡すと冪等性が崩れるため note を表示する（cmd_hook L276-278）
- 冪等判定がシェル語の一致であるため、ラッパースクリプト経由の記載は別エントリとして扱われ得る（推測）

| `entry()` | L155 | 登録する hook JSON entry（type と command を持つ）を組み立てる |
- 重複する hooks.json 編集を避けるため、merge 判定は値ではなく自分の entry の存在のみを見る
- status は hooks.json の `hooks` 配下の該当 event を `has_entry()`（L147）で検査する

## 出典
- UPSTREAM: <https://github.com/jimoto-no-llm/rustdsh/blob/main/src/context_hook.rs>
- README.ja: <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
