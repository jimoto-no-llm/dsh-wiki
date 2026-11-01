# 依存グラフの構造

DeepSeek Harnessの文書群は、生成カタログが示さない関係性を示す図で補います。パッケージの依存、capability seams、イベントの流れ、モデル向けツール、アプリ構成、実行時ライフサイクルの経路を調べるときにこの索引を使います。正確なシグネチャや型定義は、依然としてサブシステムページ（typesと生成されたCordis API領域）とtool-catalogにあります。

## 文書グラフの一覧

この索引が指す各ページは、自身が generated・hybrid generated・curated のどの保守モードかを宣言します。索引全体の保守モードは mixed（混在）です。

| グラフ | モード |
| --- | --- |
| モジュール依存グラフ（module-graph.md） | generated |
| ツールスキーマカタログとパッケージマップ（tool-catalog.md） | generated |
| capability seamsとcore services（capability-seams.md） | hybrid generated |
| [dsh共有ベース構成](/guide/architecture.md) | hybrid generated |
| イベントの生成元・消費者マトリクス（event-producer-consumer.md） | hybrid generated |
| [エージェントターンとステップのライフサイクル](agent-lifecycle.md) | curated |
| ツール実行パイプライン（tool-execution-pipeline.md） | curated |

この索引の背後にあるプロセス決定は、documentation graphのAgent Noteに記録されます。

## 各グラフの使いどころ

| 段階 | グラフ | 調べること |
| --- | --- | --- |
| 依存の向きを知る | モジュール依存グラフ | パッケージ間の依存関係の全体像 |
| 能力の継ぎ目を知る | capability seams | Service Definition・providers・consumersの対応 |
| ツールの形を知る | tool-catalog | モデル向けツールのスキーマと所属マップ |
| イベントの流れを知る | event-producer-consumer、agent-lifecycle、tool-execution-pipeline | 誰がイベントを生み誰が受け取るか、turn/step内の順序 |
| アプリの組み立を知る | dsh共有ベース構成 | CLI・Webなどが共有ベースをどう構成するか |

## 再生成と検証

```sh
pnpm run gen-doc-graphs
pnpm run verify-doc-graphs   # 新鮮さの検証
```

このコマンドで生成される図は手で編集するものではありません。手編集した内容は次の再生成で失われます。モードが mixed のため、保守の分担は各リンク先ページが宣言するモードに従い、生成ページに手書きの説明を混ぜるときはそのページのモードに置きます。

## モードの区分

| モード | 意味 |
| --- | --- |
| `generated` | 生成スクリプトが全部を書き出す。手編集は再生で失われる |
| `hybrid generated` | 生成部分に、手で書かれた説明が伴う |
| `curated` | Mermaidシーケンスなど手で書かれ、正確なシグネチャは生成カタログが補う |

## 注意

- 図自体には、コードの正確なシグネチャや型定義はありません。実装に合わせる作業はサブシステムページやtool-catalog（生成カタログ）と併用してください。
- 索引の行追加・削除はdocumentation graphのAgent Noteの決定に従い、`gen-doc-graphs` の成果物と `verify-doc-graphs` の検証が一致する状態を保ちます。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/graph-atlas.md