---
title: "rdsh bench — 起動速度の比較"
desc: "rdsh と本家 dsh の起動速度を、どちらの --version も複数回実行して比較するコマンドです。README.ja.md の実測ベンチマーク表はこのコマンド（rdsh "
cat: "rdsh-cmd"
catLabel: "rustdsh コマンド"
chars: 1218
slug: "rdsh/cmd/bench"
---

# rdsh bench — 起動速度の比較

`rdsh` と本家 `dsh` の起動速度を、どちらの `--version` も複数回実行して比較するコマンドです。README.ja.md の実測ベンチマーク表はこのコマンド（`rdsh bench --n 5` など）が基です。

## オプション

| オプション | 既定 | 説明 |
| --- | --- | --- |
| `--n ＼n］` | 設定 `bench.n` | 試行回数。1 以上の整数（0 はエラー） |

## 使用例

```sh
rdsh bench --n 5        # rdsh と dsh を各5回ずつ --version 実行して比較
rdsh bench              # 既定の回数で比較
```

## 既定値・注意

- `rdsh --version`（自分自身の実行ファイル）と、PATH に見つかる本家 `dsh` の `--version` を、指定回数ずつ実行します。
- 本家 `dsh` が見つからない場合、`[dsh ] skipped (original not found)` と表示して rdsh 側だけを続行します。
- 統計の報告は各行に `median=… min=… max=…` の形式（中央値・最小・最大）で出ます。

README.ja.md 実測（参考）:

| 項目 | rdsh | 本家 dsh / 従来処理 | 差・倍率 |
| --- | --- | --- | --- |
| `--version` 起動時間 | **約0.90 ms** | 約88 ms | **約98倍高速** |
| `--version` メモリ消費（最大RSS） | **約2.9 MB** | 約66 MB | **約1/23に削減** |

再現手順や詳細な内訳は docs/BENCHMARKS.md が基準ドキュメントです（README.ja.md から参照）。本記事では再現手順を記述しません。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「使い方 ＞ 高速ネイティブコマンド」「実測ベンチマーク」節）
- docs: README.ja.md の節のみ（本記事は BENCHMARKS.md を直接読んでいません）

### 実装（src/main.rs）から補足

- `--n` の既定が設定 `bench.n` で、0 を渡すとエラーになること、本家 `dsh` が無いときに `[dsh ] skipped (original not found)` と表示して続行すること、`median=… min=… max=…` の形式。
