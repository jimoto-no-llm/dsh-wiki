# rdsh prune — トークン予算に合わせた前方・末尾保持の切り詰め

テキストを予算内に収まるよう切り詰めるコマンドです。README.ja.md の案内例では標準入力を対象に「`echo "..." | rdsh prune --max-tokens 4000`」のように使い、前後を残して中間を圧縮します。切り詰められたテキストは標準出力へ、進捗は標準エラーへ出ます。元ファイルは不変です。

## オプション

| オプション | 既定 | 説明 |
| --- | --- | --- |
| `--max-tokens` | 設定 `tokens.default_budget` | 切り詰め先のトークン予算 |
| file（位置引数） | 省略時は標準入力 | 対象ファイル。省略すると標準入力から読みます |

## 使用例

```sh
echo "..." | rdsh prune --max-tokens 4000   # 標準入力を 4000 トークンに切り詰め
echo "..." | rdsh prune                     # 既定予算（settings tokens.default_budget）
rdsh prune --max-tokens 2000 ./notes.md     # ファイルを対象にする
rdsh prune ./notes.md                       # ファイルを既定予算で切り詰め
```

## 既定値・注意

- トークン数は `rdsh tokens` と同じ近似式（ASCII 約4文字=1トークン、非ASCII 1文字=1トークン）です。
- 切り詰め方は前方重視で、先頭と末尾を残して中間を `...[rdsh pruned 9000->4000 tokens]...` 形式のマーカーに置き換えます。
- 非常に小さい予算でマーカーが入らない場合は、予算内で前方のみを残します。
- 出力は常に推定トークン数が予算以下になることが保証されています。
- 標準エラーの進捗行は `[rdsh] tokens ＼before］ -> ＼after］ (budget ＼n］)` 形式です。既定予算は `rdsh settings set tokens.default_budget ＼n］` で変えられます（キー一覧は `rdsh settings keys`）。
- 元ファイルは一切書き換えません（非破壊設計）。
- 標準入力とファイルのどちらも受け付けます（`--max-tokens` の扱いは同じです）。
- README.ja.md の案内どおり「トークン上限に合わせて前後を残して切り詰め」ます。計算結果は標準出力、進捗は標準エラーへ出ます。先頭と末尾がマーカー1行を挟んでそのまま連なり、中間の行は丸ごと消えます。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「使い方 ＞ 高速ネイティブコマンド」節・実測ベンチマーク表）

### 実装（src/tokens.rs・src/main.rs）から補足

- `--max-tokens` の既定が設定 `tokens.default_budget` であること。
- 入力が JSON で、かつ空でない `content` 文字列フィールドを持つときは、その文字列を切り詰め対象として再利用します（失敗したパースは生テキストにフォールバック）。
- 先頭2/3・末尾1/3を残す前方重視の分割と、マーカーの総トークン監視、予算内で先頭のみに劣化する動作、`[rdsh] tokens {before} -> {after} (budget …)` の標準エラー報告。
