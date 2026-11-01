# compact — セッション転写のトークン圧縮（src/compact.rs）

## ① 目的
JSONL セッション転写を読み込み、トークン予算内に抑えて標準出力へ返します。ソースファイルは変更しません（`cmd_compact()` L263）。トークン推定は `crate::tokens::estimate_tokens`、最終の境界調整は `prune_to_budget` を利用します。

## ② CLI との橋渡し
- `rdsh compact ＼file］ [--max-tokens ＼n］]`（main.rs L778-779）
- `--max-tokens` の既定値は設定 `compact.max_tokens`。既定 8000、可変範囲 500〜200,000（rdsh_config.rs L869）

## ③ 主な関数と挙動
| 関数 | 行 | 挙動 |
| --- | --- | --- |
| `split_lines_with_tokens()` | L9 | 行分割と行ごとのトークン数を 1 回の走査で同時に数える。ASCII は fast path で行長の `div_ceil(4)` をトークン数とする |
| `importance()` | L92 | 行の重要度をビット重みで採点。制約語（必ず/方針/決定/制約/してはいけない/decided/constraint/must/never）×8、エラー語（error/failed/panic/fail）×4、diff・パス語（+++ b/ --- a/ @@ src/）×2、コマンド語（$ 、cargo 、npm 、git ）×1 |
| `compact_digest()` | L119 | 削減の要約を固定形式（dropped/change、preserved と 4 カテゴリの件数）で返す |
| `compact_output()` | L136 | 圧縮処理本体。手順は下記 |
| `cmd_compact()` | L263 | 全体が予算内なら原文を出力し、stderr に no compaction needed を表示する |

## compact_output の手順（L136-259}
1. 全体が予算内なら原文をそのまま返す（L138）
2. 最初の 1 行（システム行）は必ず残す。予算より重い場合は UTF-8 境界を跨がず `prune_to_budget` で切り詰める（L147-151）
3. 予算の 1/4 を中間の重要行用に予約（L153）
4. 末尾から重複排除しつつ新しい行を tail に追加（L176-187）
5. 予約分の中間行を重要度順に保存し、元の行順に並べ直す（L188-206）
6. 余った予約分は tail へ返却し、行順が崩れないよう最新の保存行の直前までで止める（L212-230）
7. digest を含めた推定値が実際の出力と一致するまで、digest の桁幅を調整して確定する（L234-259）

## ④ 既定値・環境変数
- モジュール自身の環境変数は無し。予算のみ設定 `compact.max_tokens` を継承する
- 1 行のトークン推定は推定トークン + 1（newline 分）を上限として扱う（L145）

## ⑤ 既知の制限
- 圧縮は行単位。1 行内の長いテキストはそのまま残る
- 重要度判定はキーワード一致（L94-115）であり、日本語は一部の語のみ対応
- digest の再推定ループは出力トークン数を実際に合わせるための追加調整を含む（L234-259）
- JSONL 形式を前提とするが、データ構造自体は解析せず行の時系列順に扱う（推測）

## 出典
- UPSTREAM: <https://github.com/jimoto-no-llm/rustdsh/blob/main/src/compact.rs>
- README.ja: <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
