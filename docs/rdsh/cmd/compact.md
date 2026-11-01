# rdsh compact — セッション JSONL の圧縮

セッションの JSONL トランスクリプトをトークン予算内へ圧縮するコマンドです。README.ja.md の案内どおり元ファイルは不変で、圧縮結果は標準出力へ出します。README では "セッション JSONL を圧縮（元ファイルは不変）" と案内されています。

## オプション

| オプション | 既定 | 説明 |
| --- | --- | --- |
| file（位置引数） | 必須 | 元となるトランスクリプト（JSONL）ファイル |
| `--max-tokens` | 設定 `compact.max_tokens` | 圧縮先のトークン予算 |

## 使用例

```sh
rdsh compact ./s.jsonl                   # 既定予算で圧縮（元ファイルは不変）
rdsh compact ./s.jsonl --max-tokens 8000 # 予算を明示
```

## 既定値・注意

- 出力の構成は「先頭行・予算の約1/4を上限とする重要な中間行・新しい方の末尾行」です。重要行は元の出現順にとり、重複した行は1度だけ出します。
- 重要行の重みは4カテゴリ（制約 > エラー > diff/パス > コマンド）で判定します。制約（`必ず` `方針` `決定` `制約` `してはいけない` `decided` `constraint` `must` `never`）、エラー（`error` `failed` `panic` `fail`）、diff・パス（`+++ b/` `--- a/` `@@` `src/`）、コマンド（`$ ` `cargo ` `npm ` `git `）のどれかが行に含まれるかで点数を付けます。
-圧縮したときは `...[rdsh compact: dropped N turn(s), B->A tokens]...` と `...[rdsh compact: preserved M important line(s) from the dropped middle; constraint=…, error=…, diff/path=…, command=…]...` の要約行を挟みます。
- 元のテキストが既に予算内ならそのまま全文を出し、標準エラーに `[rdsh] no compaction needed (… <= … tokens)` を出します。
- 元ファイルは読み取り専用で、既存ファイルは一切変更しません。
- 圧縮したときの標準エラーは `[rdsh] compacted ＼before］ -> ~＼after］ tokens (＼kept］ lines kept of ＼all］)` 形式です。
- README.ja.md では "セッション JSONL を圧縮（元ファイルは不変）" とクイックリストに載っています。
- 出力の重要行は元の行を丸ごと残し、行の順序も元のままです（削除は中間行に限ります）。
- 行単位のトークン数は1回の走査で数えます。ASCII 行はバイト数÷4 と同値です。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「使い方 ＞ 高速ネイティブコマンド」「安全設計」節を参照）
- docs: README.ja.md の節のみを使用（該当する追加 docs なし）

### 実装（src/compact.rs・src/main.rs）から補足

- `--max-tokens` の既定が設定 `compact.max_tokens` であること。
- 重要行は1行分の予算が中間予約を超える小さすぎる予算でも1件だけ保存し、予算の3分の1や64トークンでも `必ず` のような制約行が落ちない保証があること。
- 行ごとのトークン数を1回の走査で数え、予算超過でUTF-8バイト境界を切らない実装上の詳細。
