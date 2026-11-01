---
title: "サードパーティのメモリ MCP サーバをつなぐ"
desc: "既定で無効になっている参照設定3種のうちの1つを使うと、1つのメモリ システムを @deepseek-ai/dsh-mcp-client を経由して DSH につなげられます。1つ"
cat: "ug"
catLabel: "移行"
chars: 4203
slug: "ug/mcp-memory"
---

# サードパーティのメモリ MCP サーバをつなぐ

既定で無効になっている参照設定3種のうちの1つを使うと、1つのメモリ システムを `@deepseek-ai/dsh-mcp-client` を経由して DSH につなげられます。1つを選ぶか、同じ汎用 MCP 行を別サーバ用にコピーします。これらのサードパーティ設定は相互運用のための例だけで、添付は DeepSeek による推薦・推奨・提携・継続サポートを意味しません。

## DSH が担う範囲

| 項目 | DSH がやること | DSH がやらないこと |
| --- | --- | --- |
| 接続 | 選んだ Cordis オーバーレイをパースし、設定済みの stdio コマンドを起動または Streamable HTTP URL へ接続する | サーバのダウンロード、データベースの初期化 |
| ツール | MCP ツールを発見し、`mcp__＼serverName］__＼tool］` として公開する | モデルや埋め込みプロバイダの選択 |
| 運用 | stdio は子プロセスを DSH プラグインのライフサイクルで起動・停止する | クラウド アカウント作成、ベンダー データの移行、別 HTTP サービスの監督（HTTP では上流サービスが既に稼働している前提） |

stdio ブリッジは子を起動する前、認証情報を示す名前の環境変数とすべての `DSH_*` 変数を意図的に取り除きます。その他の環境変数は継承します。各例は必要な基本の上書きだけを足します。オプションの上流機能に別のシークレットが要るときは、その行の `config.env` に足し、YAML へ直接書き込みません。

## 選べるサーバ

| システム | 検証済み pin | 転送方式 | 上流の前提 |
| --- | --- | --- | --- |
| [Memorix](https://github.com/AVIDS2/memorix) | `memorix@1.3.0`（`500792cad3144142293bfbb20acb4841c9f7fcfa`） | stdio | Node 22.18+ ＋ `npm install --global memorix@1.3.0` |
| [MCP Reference Memory](https://github.com/modelcontextprotocol/servers/tree/main/src/memory) | `@modelcontextprotocol/server-memory@2026.7.4`（`6dd0a683e198783e30feabf7abaf42f925bd18b1`） | stdio | `npm install --global @modelcontextprotocol/server-memory@2026.7.4` |
| [Engram](https://github.com/Gentleman-Programming/engram) | `v1.20.0`（`ba9e46ced152c37a7cb9e576153c41995873e2fc`） | stdio | Go 1.25.10+ ＋ `go install …/engram/cmd/engram@v1.20.0`、または対応するリリース バイナリ |

## 有効にする

DSH にオーバーレイを1つ渡します。

```sh
dsh web --patch "$PWD/apps/cli/config/examples/mcp-memory/memorix.cordis.yml"
```

ファイル名は `mcp-reference-memory.cordis.yml` や `engram.cordis.yml` に差し替えられます。パスはディスク上のどこでも構いません。同梱の構成にメモリ サーバは1つも無く、`--patch` を省くと3種とも無効のままです。選択を複数回の起動にわたって保つには、選んだファイルの単一 `insert` パッチをユーザー パッチ層へ合流します。プロファイル1つだけなら `$DSH_HOME/profiles/＼name］/cordis.patch.yml`、マシン上のすべてのプロファイルなら `$DSH_HOME/cordis.patch.yml` です。既存ファイルを上書きコピーしないでください。無関係なユーザー パッチがすでに入っていることがあります。

## プロバイダ側の所在

- **Memorix**: LLM も埋め込みサービスもなしのローカル ヒューリスティック モードで動きます。オプションのプロバイダ設定は本人側の `~/.memorix/config.toml` やプロジェクトの `memorix.toml` で行います。例では Memorix が知る Git プロジェクトの同一性を DSH 作業ディレクトリから保ち、保存先は Memorix 自身の既定 `~/.memorix/data` を使います。DSH 起動前に `MEMORIX_DATA_DIR` を設定すると上書きできます
- **MCP Reference Memory**: ローカルの知識グラフを保存し、entity・relation・observation・read・search・open のツールを公開します。モデルも埋め込みサービスも要りません。例では JSONL をインストール済み npm パッケージ ディレクトリではなく `$HOME/.dsh-mcp-reference-memory.jsonl` に保存し、DSH 起動前に `MEMORY_FILE_PATH` を設定すると上書きできます
- **Engram**: 保存とプロジェクト選択を Engram 自身が担います。既定は `~/.engram` で、DSH 作業ディレクトリから Git プロジェクトを検出し、`ENGRAM_DATA_DIR` や `ENGRAM_PROJECT` を環境変数の上書きとして受け付けます

検索は、エンティティ名・型・observation について大文字小文字を区別しない部分文字列の一致で、意味検索ではありません。サーバは埋め込み、自動要約、競合解決、忘却ポリシーを追加しません。

## 書込み・Fresh-session 想起・利用を検証する

一意な値を1つ用意し、検証中はプロバイダのストレージ範囲を変えないでください。

1. DSH セッション A で `Remember that my validation drink is lapsang-<unique suffix>.` と頼みます。モデルがプロバイダの書込みツールを呼び、ツールが成功を返すことを確認します
2. 同じ稼働中の Host に DSH セッション B を作ります。セッション A の会話はコピーしません。`What is my validation drink? Check memory.` と頼み、検索または想起ツールの呼び出しと値の返却を確認します
3. セッション B のまま `Use that preference to suggest one drink for the meeting.` と頼み、答えが想起した値を使うことを確認します

新しい DSH セッションは必要ですが、Host の再起動は不要です。初期のツール発見は非同期なので、最初の検証プロンプトの前にプロバイダの `mcp__...` ツールが並ぶのを待ってください。クラッシュした MCP 子はバックオフ付きの自動再接続とツールの再同期を行います。中断の間はツールが並び続け、呼び出しだけが失敗します。再接続の予算を使い尽くすとツールの登録が解除され、再読み込みか再起動まで再接続が止まります。

## 共有モデルの任意指示

サーバのツール説明だけでは記憶の利用がうまく引き出されないとき、既存のモデル指示にこの短いベンダー中立の指示を足せます。

> When the user asks you to remember something, call a memory write tool. When historical information may be relevant, search memory and use relevant results.

追加の助言にすぎず、これらの例が DSH の system-prompt 人物像を置き換えることはありません。

## 別の MCP サーバを持ち込む

同じ行の各フィールドをコピーし、`id` と `serverName` を一意に変えます。

```yaml
- insert:
    - id: memory-my-server
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: my-memory
        transport: stdio
        command: my-memory-mcp
        args: []
        env: {}
        cwd: !!js process.cwd()
```

リモート サーバの場合は、`transport: streamable-http` に `url` と `headers` を代わりに使います。プロバイダ固有の導入・同一性・認証・モデル・埋め込み・永続化・ライセンスはプロバイダ側の責任のままです。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/mcp-memory.md
