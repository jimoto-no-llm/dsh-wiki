# rustdsh（rdsh）とは

rustdsh（コマンド名: `rdsh`）は、DeepSeek Harness（`dsh`）を高速かつ安全に使うための Rust 製ランチャーです。日常的によく使う処理だけを Rust に移植し、エージェントの会話やモデル実行は本家 `dsh` にそのまま委譲します。独立したコミュニティプロジェクトで、DeepSeek や DeepSeek Harness の公式ではありません。

## 何が速く、なぜ軽いのか

ノードを起動する必要のある処理を、Rust の単一バイナリに置き換えているためです。具体的には次の3点です。

- トークン計算・並列コード検索・セッション一覧など、毎回の呼び出しで Node.js を立ち上げていた処理をネイティブ化
- 会話・モデル実行は本家 `dsh` へ透過的に委譲（引数もオプションもそのまま）
- 配布形態が約 1.97 MB の単一バイナリ（Node ツリーは約 508 MB）

## 計測値とその条件

Linux x86_64 環境での測定値です。**数字はすべて短い呼び出し（`--version` など）の計測であり、通常の会話セッションやモデル実行中の値ではありません。**

| 項目 | rdsh | 本家 dsh / 従来処理 | 差・倍率 |
| --- | --- | --- | --- |
| `--version` 起動時間 | 約0.90 ms | 約88 ms | 約98倍高速 |
| `--version` メモリ消費（最大RSS） | 約2.9 MB | 約66 MB | 約1/23 |
| フック相当処理のメモリ | 約2.7 MB | 約45 MB（Node相当） | 約1/16 |
| コード検索（`search`） | 約17 ms | 約41 ms | 約2.4倍高速 |
| トークン計算（`tokens`） | 約12 ms | 約35 ms | 約2.9倍 |
| セッション展開（`sessions --tokens`） | 約0.41 秒 | 約1.65 秒 | 約4.0倍 |
| 配布バイナリサイズ | 約1.97 MB（単一バイナリ） | 約508 MB（Nodeツリー） | 超軽量 |

- 起動時間は中央値（n=5）、`rdsh bench --n 5` などで再現できます。
- 起動時間と RSS の計測は、Desktop アプリのメモリや、委譲先のモデル実行の性能を表すものではありません。
- 再現手順と詳細な内訳は、出典の docs/BENCHMARKS.md をご覧ください。

## 置換モード（dsh 互換）

通常は `rdsh` と打てば本家 `dsh` と同じ引数で動きます。

```sh
rdsh tui                          # dsh --profile tui と同等
rdsh --profile web --patch x.yml  # 追加設定を重ねて起動
rdsh --dry-run tui -- --resume id # 実行コマンドの内容だけを確認
```

インストール時に `--as-dsh`（Windows は `-AsDsh`）を付けると、`dsh` コマンドを打つだけで高速起動が適用されます。元に戻すのは `--restore`（Windows は `-Restore`）です。

```sh
./install.sh --as-dsh        # dsh コマンド名で使えるように置き換え（元は dsh-orig に退避）
./install.sh --restore       # 置き換えを元に戻す
```

rdsh 固有のコマンド以外は、指定したすべての引数をそのまま本家 `dsh` に渡すため、既存のスクリプトや CI パイプラインはそのまま動きます。

## 安全設計

1. **本家挙動の透過性**: 会話ループやモデル推論は独自実装せず、すべて本家 `dsh` に委譲して互換性を担保します。
2. **非破壊設計**: トークン計算、検索、ログ圧縮などの読み取り系コマンドは、既存のファイルを一切変更しません。
3. **明示的な認証管理**: 他アプリの認証情報を無断で同期・送信せず、利用者が明示的に指定したものだけ取り込みます。
4. **サンドボックス隔離**（オプトイン）: Linux で bubblewrap と prlimit がある環境では、`--share-file` で共有したファイルだけを読み取り専用・ネットワークなしで渡すため、ホストの他の領域には触れません。
5. **既定値の明示**: serve・search-web・context_engine・agent_tool_sandbox などは既定 OFF で、`rdsh features on <id>` で有効化します。一覧は `rdsh features` です。

```sh
rdsh --share-file README.md --share-file src/main.rs --profile tui
rdsh features on agent_tool_sandbox   # 常時有効化（off で解除、RDSH_SECURITY=1 で強制）
```

## しないこと

- **エージェントループの再実装**: 会話・推論・ツール実行は本家 `dsh` 任せです。rdsh は前段の高速化にとどまります。
- **モデル実行の置き換え**: ベンチマークの数値は rdsh 自身の起動と処理のもので、モデル実行の高速化を主張するものではありません。
- **認証情報の無断送信**: 明示的に指定したログイン情報だけをローカルで取り込みます。
- **ファイルの書き換え**: 読み取り系コマンドは元ファイルを変更しません（`compact` も元ファイルは不変）。
- **OS サンドボックスの代用**: `rdsh guard` は分類（allow / deny / unknown）を返すだけで、ホストの permission / approval を意味しません。実際の強制には実行 sandbox を使ってください。

## クイックスタート

前提は、本家 DeepSeek Harness（`dsh`）がエージェントとの会話・モデル実行に必要だということです。すでに `dsh` を入れている方は手順 A を飛ばして構いません。

### 手順 A. 本家 `dsh` の導入（未導入の方）

Node.js と npm を用意し、npm registry の `@deepseek-ai/dsh`（bin 名: `dsh`、2026-10-29 時点の latest は 0.2.1-rc.2）をグローバルに導入します。

```sh
npm install -g @deepseek-ai/dsh
npm install -g @deepseek-ai/dsh@<version>   # バージョンを固定する場合
```

### 手順 B. `rdsh` の導入（ビルド済みバイナリ）

Linux / macOS / WSL:

```sh
curl -fsSL https://github.com/jimoto-no-llm/rustdsh/releases/latest/download/install.sh | bash -s -- --from-release
```

Windows（PowerShell）:

```powershell
$f = Join-Path $env:TEMP 'rdsh-install.ps1'
Invoke-WebRequest -Uri https://github.com/jimoto-no-llm/rustdsh/releases/latest/download/install.ps1 -OutFile $f -UseBasicParsing
& $f -FromRelease
```

ソースからビルドする場合は `git clone` して `./install.sh`（Windows は `.\install.ps1`）を実行します。Rust はビルド済みバイナリなら不要で、ソースビルド時のみ 1.85 以上が必要です。

### 手順 C. 動作確認

```sh
dsh --version && rdsh --version && rdsh doctor   # 本家 dsh と rdsh の双方を確認
```

`rdsh tokens` のような独立ツールは、本家 `dsh` がなくても単体で動作します。

### 手順 D. 初期セットアップと会話開始

```sh
rdsh setup    # 対話式セットアップ（rdsh setup --web でブラウザから設定も可）
rdsh tui      # TUI プロファイルで起動
```

## 動作環境

| 項目 | 内容 |
| --- | --- |
| OS | Linux、macOS、WSL、Windows（ネイティブ） |
| DSH 本体 | 会話実行に必要（手順 A。トークン計算や検索などの独立ツールは単体で動作） |
| Node.js / npm | 本家 `dsh` の導入時のみ必要 |
| Rust | ビルド済みバイナリなら不要。ソースビルド時のみ 1.85 以上 |
| 任意 | ダッシュボードには Node.js 22 以上、`search-web` には SearXNG が必要 |

## ライセンス

MIT（Copyright (c) 2026 sahenjp）です。本家 DeepSeek Harness と依存ライブラリにはそれぞれのライセンスが適用されます。

## 出典

- [rustdsh README.ja.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md)
- [rustdsh docs/BENCHMARKS.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/BENCHMARKS.md)
- [rustdsh LICENSE（MIT）](https://github.com/jimoto-no-llm/rustdsh/blob/main/LICENSE)
