# Webシェル資産キャッシュ — 実装契約

rdsh が起動時にシェル資産を **Rustで事前圧縮**し、DSH側の小さなプラグインがそれを配信します。Nodeは圧縮をしない（CPUコストゼロ）、クライアントはbrotliを取得します。

実測（4資産、raw 1,785,636 B）:

| 方式 | bytes | 圧縮時間 |
| ---- | ----- | -------- |
| gzip L1 | 632,582 | 7.7 ms |
| gzip L6 | 486,474 | 40.7 ms |
| br q9 | 448,100 | 136 ms |
| **br q11** | **408,561** | 1.74 s（直列） |

br q11 は現行より **-25.6%**、gzip L6 より **-16.2%** です。圧縮は一度だけディスクにキャッシュするため、2回目以降の起動コストはゼロです。

## キャッシュディレクトリ

```text
$DSH_HOME/webui/assets/FINGERPRINT//
```

`fingerprint` は次を連結した文字列のsha256先頭16 hexです。

```text
"v1\0" + brotli_quality + "\0" + gzip_level + "\0"
+ 各ファイル（相対パス昇順）: relpath + "\0" + size + "\0" + mtime_ns + "\n"
```

これにより、DSHの更新・品質変更のどちらでも自動的に作り直されます。同一fingerprintのディレクトリが既に `manifest.json` を持っていれば**再構築しません**。

## 生成物とmanifest

```text
FINGERPRINT//manifest.json
FINGERPRINT//index-CN7NIWNw.js.br
FINGERPRINT//index-CN7NIWNw.js.gz
FINGERPRINT//langs/rust-B1yitclQ.js.br     ← サブディレクトリ構造を保つ
```

圧縮対象は `.js .mjs .css .json .map .svg .html .txt` です。`.woff2 .woff .png .jpg .webp .ico`（既に圧縮済み）とサイズ0は圧縮しません。圧縮しないファイルもmanifestには載せます（`br: null, gzip: null`）。

```json
{
  "version": 1,
  "source": "/abs/path/to/dist/assets",
  "assets": {
    "index-CN7NIWNw.js": {
      "identity": 939867,
      "br": 209730,
      "gzip": 285293,
      "etag": "\"a1b2c3d4e5f60718\""
    },
    "fonts/KaTeX_Main-Regular-B22Nviop.woff2": {
      "identity": 10000,
      "br": null,
      "gzip": null,
      "etag": "\"1122334455667788\""
    }
  }
}
```

- `identity` は元ファイルのバイト数。
- `br` / `gzip` は圧縮後のバイト数（圧縮しない場合は `null`）。
- `etag` は元ファイル内容のsha256先頭16 hexを**ダブルクォートで囲んだ** HTTP ETag値。
- キーは `source` からの相対パス（`/` 区切り）。

## 環境変数とプラグインの挙動

DSHを起動するときに `RDSH_WEB_ASSETS=<キャッシュディレクトリの絶対パス>` を渡します。未設定ならDSHは従来どおり動き、プラグインは何もしません。

`RDSH_WEB_ASSETS` が未設定、またはmanifestが読めない/不正という場合には**ルートを登録しません**（従来動作のまま、fail-safe）。有効なときは `/assets` のprefixルートを登録し、次のように振る舞います。

1. GET / HEAD 以外は405。
2. パスから `/assets/` を除いた相対パスを取ります。空・`..` を含む・絶対パスは404。
3. manifestに無い場合: `source` 配下に実ファイルがあれば **identityで配信**（安全網）、無ければ404。
4. manifestにある場合、`Accept-Encoding` を見て `br` → `gzip` → `identity` の優先順に選びます（`q=0` は除外し、`*` は考慮しません）。
5. レスポンスヘッダは `content-type`（拡張子から決定）、`content-encoding: br | gzip`（identityでは付けない）、`cache-control: public, max-age=31536000, immutable`、`etag`（manifestの値）、`content-length`（実際に送るバイト数）、identity以外を選び得る場合の `vary: accept-encoding` を置きます。
6. `If-None-Match` がetagと一致すれば **304** をヘッダ付きでボディなしで返し、HEADはボディを送りません。

content-typeの表はdistと同一にします:

```text
.js  text/javascript; charset=utf-8
.css text/css; charset=utf-8
.svg image/svg+xml
.json application/json
.map application/json
.webmanifest application/manifest+json
.html text/html; charset=utf-8
.woff2 font/woff2
.woff font/woff
.png image/png
.ico image/x-icon
既定  application/octet-stream
```

## 失敗時の原則と実装担当

**最悪でも最適化が効かないだけで、起動と表示は壊れません。**

- rdsh側: 事前圧縮に失敗したら環境変数を渡さず、プラグインは無効化されます。
- プラグイン側: manifestが不正ならルートを登録しません。
- 個別ファイルの読み取り失敗は404（distと同じ挙動）。

| 範囲 | 担当 |
| ---- | ---- |
| `src/webui_assets.rs`（走査・圧縮・manifest・並列化・テスト） | rust-assets |
| `plugins/rdsh-web-cache`（配信ルート・交渉・304・テスト） | web-plugin |
| 統合（passthroughでenv設定）・Docker計測・レポート | lead |

## 実務上の注意

- fingerprintにはファイルのmtimeが入る仕組みのため、distの各ファイルが変わるたびに新しいディレクトリが作られます。古いfingerprintディレクトリの掃除を一緒に運用するなら、他と衝突しない場所と基準を決めておきます。
キャッシュの挙動を変えたい場合も、fail-safeの結論は保ちます。manifestの欠損・不正で登録しない経路は壊さないこと。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/webui-asset-cache.md
