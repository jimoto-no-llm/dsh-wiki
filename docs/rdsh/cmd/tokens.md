# rdsh tokens — トークン数の即時見積り

テキストのトークン数を Node.js を起動せずにネイティブ処理で見積もるコマンドです。README.ja.md の実測では約12msで、本家 `dsh` 相当処理（約35ms）の約2.9倍の速度と案内されています。トークン計算などの独立ツールは本家 `dsh` がなくても単体で動作します。

推定式は `rdsh prune`・`rdsh compact`・`rdsh sessions --tokens`・`rdsh route plan` と共通の「ASCII の連なりは約4文字で1トークン、非ASCII文字（日本語など）は1文字で1トークン」という近似です。見積りであって、このコマンド自体が予算の強制を行うものではありません。

## オプション

| オプション | 既定 | 説明 |
| --- | --- | --- |
| files（位置引数） | 省略時は標準入力 | 計測するファイル。複数指定でき、2件以上のときは合計行も出ます |
| `--preview` | 0 | 各ファイルの先頭から指定した文字数ぶんを `preview:` 行として追加表示 |

## 使用例

```sh
rdsh tokens ./README.md             # 1ファイルのトークン数
rdsh tokens ./AGENTS.md             # README.ja.md の案内例（入力トークンをネイティブで見積り）
rdsh tokens ./AGENTS.md src/main.rs # 複数ファイルと合計
rdsh tokens ./README.md --preview 40 # 先頭40文字のプレビュー付き
echo "..." | rdsh tokens            # 標準入力から見積もり
```

## 既定値・注意

- README.ja.md の案内どおり「英語:約4文字=1tok、日本語:1文字=1tok」の近似値です。正確なカウントやモデル固有のトークナイザ互換ではありません。
- `--preview` を指定すると、各ファイルの行に続けて先頭部分のプレビューが表示されます（改行は `
` 表記に置き換え）。
- 標準入力から読む場合は JSON 1行で `{"tokens": …, "chars": …}` を出力します。
- 推定式は `estimate_tokens` として他コマンドと共有されており、式は凍結（変更しない）方針の部分です。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「使い方 ＞ 高速ネイティブコマンド」「実測ベンチマーク」「安全設計」「動作環境」節を参照）
- docs: README.ja.md の節のみを使用（該当する追加 docs なし）

### 実装（src/tokens.rs・src/main.rs）から補足

- 出力形式（単数・複数ファイル時の右寄せ表と `(total)` 行、標準入力時の JSON）。
- `--preview` の既定値 0 と、プレビューを 1 スキャンのバイト分類で重ねなくする実装上の詳細。
- `prune_to_budget` が同一ファイル内で「ASCII 4文字=1トークン・非ASCIIスカラー=1トークン」で定義されていること。
