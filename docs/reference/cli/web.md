# CLI web（`dsh web`）

`dsh web`（`dsh --profile web` と同じ）は、DSH のブラウザ UI を提供する Web プロファイルを起動します。同じヘルプが `dsh web --help` と `dsh --profile web --help` のどちらでも表示されます。

## 文法

```text
Usage: dsh --profile web [options]
```

ヘルプの説明文:

```text
Serve the DeepSeek Harness browser UI.
```

訳: DeepSeek Harness のブラウザ UI を提供します。

## オプション

ヘルプに列挙されたオプションの全量です。

| オプション | 説明 |
| --- | --- |
| `--host ＼host］` | バインドするアドレス。ローカルインターフェースの具体的な IPv4 または IPv6 リテラルの1つを指定します。ワイルドカードアドレスは拒否されます |
| `--no-open` | Web UI を既定のブラウザで開きません |
| `--port ＼port］` | 待ち受けポート。`0` を渡すと OS が空きポートを選びます |
| `--public-url ＼url］` | 印刷・ブラウザオープン・ランタイムコンテキスト・`DSH_WEB_URL` の各形式で、この HTTP(S) ルートを広告します。信頼は付与しません |
| `--trusted-host ＼authority...］` | `/api` のブラウザ信頼フェンス（browser-trust fence）が受け入れる追加の authority（`host` または `host:port` の形式）。繰り返し指定できます |
| `--tls-cert ＼file］` | PEM 形式のサーバー証明書チェーン。`--tls-key` と同時に必要です |
| `--tls-key ＼file］` | 暗号化されていない PEM 形式の秘密鍵。`--tls-cert` と同時に必要です |
| `-h, --help` | このヘルプを表示します |

## 実行例

ヘルプに記載された実行例は次のとおりです。

```text
dsh --profile web                          serve on the composed host and port
dsh --profile web --no-open                serve without opening a browser
dsh --profile web --port 8080              serve on another port
dsh --profile web --host 10.0.0.7          bind one local interface address
dsh --profile web --public-url https://app.example/ui/ --trusted-host app.example
                                           advertise a prefix-stripping HTTPS proxy entry and admit its authority
dsh --profile web --tls-cert ./server-chain.pem --tls-key ./server-key.pem
                                           serve HTTPS with an existing certificate and key
```

訳の要点:

- 合成されたホストとポートで提供します（`--public-url` 例は、接頭辞を剥がす形の HTTPS プロキシ経由の入口を広告し、その authority を受け入れます）
- 既存の証明書と鍵で HTTPS を提供できます

## ふるまいの要点

- `web` プロファイルは、初回使用時に同梱テンプレートから自動初期化されます（[behaviors](/reference/cli/behaviors.md)）。
- `dsh web --help` は Web アプリ自身のフラグを表示します。ランチャー自身のヘルプは `dsh --help` です（[launcher](/reference/cli/launcher.md)）。
- 上流のテストでは、Web プロファイルに対して起動失敗とネイティブ設定 HMR（`awaitWriteFinish` 有効）を実 CLI 経由で走らせる「Web failure matrix」があり、モデル API 呼び出しなしで認証付き HTTP 応答・診断・復旧・プロセス終了・廃棄（disposal）を検証しています。起動受け入れテスト（startup acceptance）は、同梱の必須 Web 依存とポート競合もカバーします。

## 出典

本文は上流ドキュメントの該当記述の翻訳です。オプション名・使用例・原文の説明文はそのまま保存しています。

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cli-help.md
- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md
