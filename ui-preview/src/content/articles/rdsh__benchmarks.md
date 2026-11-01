---
title: "rdsh の性能計測"
desc: "このページは rdsh の実測ベンチマークをまとめます。数値は Linux x86_64 での測定値です。"
cat: "rdsh"
catLabel: "rustdsh"
chars: 1717
slug: "rdsh/benchmarks"
---

# rdsh の性能計測

このページは `rdsh` の実測ベンチマークをまとめます。数値は Linux x86_64 での測定値です。

## 主要な計測結果

README.ja.md の実測ベンチマーク（Linux x86_64、`rdsh bench --n 5` など）に基づきます：

| 項目 | rdsh | 本家 dsh / 従来処理 | 差・倍率 |
| --- | --- | --- | --- |
| `--version` 起動時間（中央値） | 約0.90 ms | 約88 ms | 約98倍高速 |
| `--version` メモリ消費（最大RSS） | 約2.9 MB | 約66 MB | 約1/23に削減 |
| フック相当処理のメモリ | 約2.7 MB | 約45 MB（Node相当） | 約1/16に削減 |
| コード検索（`search`） | 約17 ms | 約41 ms | 約2.4倍高速 |
| トークン計算（`tokens`） | 約12 ms | 約35 ms | 約2.9倍高速 |
| セッション展開（`sessions --tokens`） | 約0.41 秒 | 約1.65 秒 | 約4.0倍高速 |

`--version` 起動時間は中央値（n=5）の数値です。配布は単一バイナリで済み、`dsh` 本体の Node ツリー（約508 MB）と比べて大幅に小さくなります。

なお docs/BENCHMARKS.md の検索計測では、`--max 10`・160ファイル・約96万行一致の条件下で約4.61 ms（対従来約197.77 ms、約42.9倍）という報告もあります。これは生成データによるフィクスチャ計測なので、すべてのコマンドやファイルシステムに対する主張ではありません。CPU アフィニティを固定し、ウォームアップ2回・交互10サンプルを取る方法が文書化されています。

## 再現方法

合成ワークロードと前後の出力一致確認には、Rust 側の Cargo example を使います：

```sh
cargo build --release
cargo run --release --example benchmark_extended -- \
  --bin ./target/release/rdsh --baseline /path/to/base/target/release/rdsh --n 15 \
  --output 出力先JSON
```

起動比較の内訳は次のコマンドで確認できます：

```sh
rdsh bench --n 5
/usr/bin/time -v rdsh --version
/usr/bin/time -v dsh --version
```

ランナーは一時的に HOME・DSH_HOME・XDG 環境を用意し、既知サイズおよびストリーミング圧縮セッション、伸長ログ、検索ツリー、JSONL 入力を生成します（zstd が必要）。結果 JSON には全サンプル、中央値・p95、ワークロードサイズ、バイナリ指紋、対応環境では最大RSS、標準出力の一致が含まれます。候補側の失敗や直列出力の不一致は実行を停止します。

## 計測の注意

- CLI の起動時間・RSS の数値は、Desktop 版のメモリや委譲先モデル実行の性能を表しません。
- ベンチマーク PR では、マシン・OS・n の明示、要約表だけでなく生出力の貼付、前後出力の一致証明が求められます。
- 主要数値が約10%より多く動いたときは、docs/BENCHMARKS.md を更新する運用です。

## 出典

- <https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/BENCHMARKS.md>
- <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
