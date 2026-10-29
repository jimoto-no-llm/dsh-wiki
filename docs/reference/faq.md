# よくある質問

rdsh（rustdsh）と DSH について、よく寄せられる質問をまとめます。

## rdsh と本家 dsh の違いは？

rdsh は Rust 製のランチャーで、日常的によく使う処理（トークン計算、検索、セッション管理など）だけをネイティブ化しています。エージェントの会話やモデル実行は本家 `dsh` へそのまま透過的に委譲し、いま使っている引数やオプションはそのまま動きます。

- rdsh 独自のサブコマンド以外は、指定したすべての引数をそのまま本家 `dsh` に渡します
- 会話ループやモデル推論は独自実装していません
- 本家 `dsh` は独立プロジェクトであり、DeepSeek や DeepSeek Harness の公式ではありません

## 本家 dsh は必要ですか？

会話やモデル実行には本家 `dsh` が必要です。一方、トークン計算、ファイル検索、環境診断（`rdsh doctor`）などのユーティリティコマンドは `rdsh` 単体でも動作します。

## 「約98倍・約1/23」の計測はどこまで有効ですか？

その数値は **Linux x86_64 環境で `--version` という短い呼び出しを計測したもの**（起動時間は中央値 n=5）です。

- `--version` 起動時間: rdsh 約0.90 ms、本家 `dsh` 約88 ms（約98倍）
- `--version` 最大RSS: rdsh 約2.9 MB、本家 `dsh` 約66 MB（約1/23）
- 起動時間と RSS の計測は、Desktop アプリのメモリや、委譲先のモデル実行の性能を表すものではありません
- 機種・OS・キャッシュ状態で変わるため、`rdsh bench --n 5` で自分の環境で測り直すのが確実です
- 再現手順の条件（マシン、OS、n、生の出力、出力の等価性確認）は、出典の docs/BENCHMARKS.md に定められています

長い会話セッションやモデルの推論時間自体が98倍速くなる、という意味ではありません。

## rdsh はどこまで委譲しますか？

会話ループ・モデル推論・ツール実行といった、エージェントとしての中核はすべて本家 `dsh` に委譲します。rdsh が自前で担うのは次のような前段の処理だけです。

- 起動と引数の受け渡し（dsh 互換）
- トークン見積り、並列検索、セッション一覧・圧縮などの高速ネイティブコマンド
- 認証情報の取り込み、レート制限設定の追記、フック監視などの設定まわり

## セッションは互換ですか？

会話は本家 `dsh` が生成するため、セッションは DSH と同じ場所（`$DSH_HOME/sessions`）に保存されます。rdsh 側の読み取り系コマンドは非破壊で、`rdsh compact` も元ファイルを変更しません。`rdsh retry-log` もセッションログを読み取り専用で走査します。

## プラグインやプロファイルは使えますか？

使えます。

```sh
rdsh profiles                       # 利用可能なプロファイル一覧
rdsh plugin --profile web add /path/to/bundle  # プラグインの追加（dsh plugin と同等）
rdsh --profile web                  # プラグイン付きで起動
```

Smart-DSH などのプラグイン集とも共存でき、ポート（DSH Web: `3080`、rdsh serve: `38080`）も競合しません。

## 既存の dsh コマンドと置き換えられますか？

はい。`./install.sh --as-dsh`（Windows では `.\install.ps1 -AsDsh`）で導入すると、普段の `dsh` コマンドで自動的に高速起動されます。元に戻す場合は `--restore`（Windows は `-Restore`）ですぐに復元できます。

## 既存のスクリプトは壊れませんか？

rdsh 固有のコマンド以外は、指定したすべての引数をそのまま本家 `dsh` に引き渡すため、既存のスクリプトや CI パイプラインはそのまま動きます。

## 認証情報は外部に送信されますか？

送信しません。他アプリの認証情報を無断で同期・送信せず、明示的に指定したものだけをローカルで安全に取り込みます（例: `rdsh auth --import --provider openai-codex`）。

## rdsh guard はセキュリティ対策として十分ですか？

十分とは言えません。`rdsh guard` は危険なコマンドを分類して `allow` / `deny` / `unknown` を返すだけで、ホストの permission / approval を意味しません。shell 構文解析や network 先の判定は未対応で、OS sandbox でもありません。実際の隔離が必要なときは `--share-file` によるサンドボックス（Linux、bubblewrap と prlimit が必要）を使ってください。共有したファイルは読み取り専用でマウントされ、ネットワークアクセスもありません。

## ポート番号が衝突したときは？

本家 DSH の Web GUI（`:3080`）と `rdsh serve`（`:38080`）は既定ポートが異なります。空きポートを自動選択したい場合は `--port 0` を指定してください。

## 便利な機能は既定で有効ですか？

機能ごとに既定値が異なります（一覧は `rdsh features`）。

- 既定 ON: 更新チェック（update_check）と更新通知。無効化は `rdsh features off update_check`
- 既定 OFF: serve、search-web、context_engine、agent_tool_sandbox など。有効化は `rdsh features on <id>`
- route（難易度別のモデル割当）も既定は OFF です

## ライセンスは？

rustdsh は MIT（Copyright (c) 2026 sahenjp）です。本家 DeepSeek Harness と依存ライブラリにはそれぞれのライセンスが適用されます。

## 出典

- [rustdsh README.ja.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md)
- [rustdsh docs/BENCHMARKS.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/BENCHMARKS.md)
- [rustdsh LICENSE（MIT）](https://github.com/jimoto-no-llm/rustdsh/blob/main/LICENSE)
