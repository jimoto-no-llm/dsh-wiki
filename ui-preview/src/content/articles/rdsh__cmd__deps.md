---
title: "rdsh deps — 静的な依存グラフと変更影響"
desc: "ソースコードから import・定義・静的な呼び出し箇所を記録した持続的な索引を作り、シンボルの定義元・参照元と、ファイル・シンボルから見た変更影響とカバーするテストを出す読み取り"
cat: "rdsh-cmd"
catLabel: "rustdsh コマンド"
chars: 1659
slug: "rdsh/cmd/deps"
---

# rdsh deps — 静的な依存グラフと変更影響

ソースコードから import・定義・静的な呼び出し箇所を記録した持続的な索引を作り、シンボルの定義元・参照元と、ファイル・シンボルから見た変更影響とカバーするテストを出す読み取り専用コマンドです。README.ja.md では "呼び出しごとのオーバーヘッドは約1msと非常に軽量です" と案内されています。`dep_graph` 特徴は既定 ON です。

## オプション

| サブコマンド | オプション（既定） | 説明 |
| --- | --- | --- |
| `build` | `--root ＼path］`（既定：カレントディレクトリ）、`--force`（off）、`--json`（off） | `$DSH_HOME/rdsh-index` に持続的な索引を作る／更新する |
| `query ＼symbol］` | `--json`（off） | シンボルの定義元と参照元を表示 |
| `impact ＼target］` | `--depth ＼n］`（既定3、最大8）、`--json`（off） | 対象が依存される側（アウトバウンド）の遷移的影響とカバーするテストを出す |

## 使用例

```sh
rdsh deps build                    # $DSH_HOME/rdsh-index に増分索引を作る
rdsh deps build --json             # 機械可読でビルド結果を取る
rdsh deps query engine_score       # シンボルの定義元と参照元
rdsh deps impact src/context.rs    # 直接・推移的な依存元と影響するテスト
rdsh deps impact src/core.rs --depth 3 --json   # docs/RDSH-SETTINGS.md の対応例
rdsh deps build --force            # 未変更のエントリも再解析
```

## 既定値・注意

- 対応言語は Rust・JavaScript/TypeScript・Python・Go です。
- 索引は `$DSH_HOME/rdsh-index/＼root-key］.json` に置かれます。size と mtime が同じファイルは再解析しないため、繰り返し実行しても速いままです（`--force` で全再解析）。
- 静的近似です。動的 dispatch・間接呼び出し・マクロ・生成コードは `unknown` として明示し、未解決件数として報告します（推測で埋めていません）。
- 索引が無い場合は「情報が無い」であり「依存が無い」ではありません。
- 索引があるときは `rdsh context build` と `rdsh context inject` も、検索で当たったファイルの依存近傍を取り込みます。
- README.ja.md では呼び出しごのオーバーヘッドが約1msと案内されています。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「使い方 ＞ 依存グラフと変更影響（`rdsh deps`）」節）
- docs: [docs/RDSH-SETTINGS.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/RDSH-SETTINGS.md)（依存グラフ節）

### 実装（src/deps.rs・src/main.rs）から補足

- 各サブコマンドの引数定義（`--root`・`--force`・`--depth` は既定3・最大8）。
