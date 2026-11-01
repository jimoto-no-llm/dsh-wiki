# rdsh sessions — 過去セッションの一覧

`$DSH_HOME/sessions` 配下のセッションを Node.js なしで新しい順に一覧するコマンドです。README.ja.md の実測では `--tokens` 付きの展開が約0.41秒で、従来処理（約1.65秒）の約4.0倍の速度と案内されています。`--json` でサイド用途の機械可読形式が取れます。

## オプション

| オプション | 既定 | 説明 |
| --- | --- | --- |
| `--project` | なし（全プロジェクト） | セッションルート直下の1つのプロジェクトディレクトリ名に限定 |
| `--limit` | 設定 `sessions.limit` | 表示する最大セッション数 |
| `--tokens` | なし（off） | 展開トークンを見積もる（zstd 展開、失敗時は保存バイト数÷4 の近似） |
| `--json` | なし（off） | 機械可読な JSON を出力 |

## 使用例

```sh
rdsh sessions --limit 20 --tokens     # 上限20件を展開トークン付きで表示
rdsh sessions --project my-project    # 1プロジェクトだけ
rdsh sessions --json                  # サイド用途の機械可読出力
```

## 既定値・注意

- 表は「バイト数 / トークン / 更新時刻 / プロジェクト・セッションID」を1行に1セッションで出します。`--tokens` 無しのときトークン欄は `-` です。
- `--tokens` 無しのときは展開とサイズ計算を行わず、そのまま一覧を返します。
- `--tokens` の展開には外部の `zstd` コマンドを使います。`zstd` が無い環境では該当行は `?` 付きの保存バイト数÷4 近似になり、標準エラーに注記が出ます。
- `--project` は単一のディレクトリ名だけを受け付けます。`../` のようなトラバーサルを意図した値は拒否され、プロジェクトディレクトリ自体がシンボリックリンクの場合は一覧を出しません。
- 標準エラーに走査した総数と表示上限が出ます（表・JSON 共通）。
- セッションのトークンサイズキャッシュ（`sessions_token_cache` 特徴、既定 on）により、繰り返し表示の再展開を避けます。
- 新しい順は各セッションの更新時刻（mtime）による並び替えです。`--limit` は表示の絞り込みで、標準エラーの `total` は走査した全件数です。`$DSH_HOME/sessions` が無い環境では `# no sessions dir at ＼path］`（`--json` 時は `total: 0`）を出して終了します。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「使い方 ＞ 高速ネイティブコマンド」「実測ベンチマーク」節を参照）
- docs: README.ja.md の節のみを使用（該当する追加 docs なし）

### 実装（src/inspect.rs・src/main.rs）から補足

- `--tokens` の zstd 展開（フレームヘッダの内容サイズと CLI フォールバック）、内容キーのキャッシュ、`--project` の単一名制限とリンク拒否。
- 表・JSON の正確な項目（`project`・`id`・`bytes`・`mtime`・`tokens`・`tokens_exact`）。JSON は `{"sessions": [...], "total": N}` の形です。
