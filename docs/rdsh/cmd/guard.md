# rdsh guard — フック用の危険コマンド遮断

DSH の `hooks.json` と連携するフックヘルパーです。標準入力のテキストが `--deny` のパターンに当たると exit 2 で遮断を示します。README.ja.md では "危険なコマンド実行を瞬時に検知・遮断します" と案内されています。パターン照合に加え、任意の policy file でファイル操作を構造で判定できます（プラグイン側設定は `guard.deny` キー）。

## オプション

| オプション | 既定 | 説明 |
| --- | --- | --- |
| `--deny ＼pattern］` | なし（繰り返し指定可・既定は設定 `guard.deny`） | 遮断するテキストパターン |
| `--policy-file ＼path］` | なし（未指定は deny パターン照合） | 構造判定用のポリシーファイル（schema 1） |
| `--reason ＼text］` | なし | 判定理由として添える文字列 |
| `--json` | なし（off） | 判定結果の機械可読出力 |

## 使用例

```sh
echo "$input" | rdsh guard --deny "rm -rf /*" --deny "*token*"
echo "$hook_json" | rdsh guard --policy-file ./hook-policy.json --json
```

`hooks.json` での組み込み例（README.ja.md より）:

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "rdsh guard --deny \"rm -rf /*\"" }] }
    ]
  }
}
```

policy file の例（README.ja.md より。作業ディレクトリ内の `Read` を分類上だけ許可）:

```json
{
  "schema": 1,
  "rules": [
    { "id": "project-read", "tool": "Read", "access": "read", "roots": ["/absolute/project/path"] }
  ]
}```

## 既定値・注意

- 構造判定が対応するのは `Read`・`Write`・`Edit` のファイル path schemaだけです。未知の tool・shell command・壊れた入力・未対応の引数は fail closed です。
- 作業ディレクトリと対象 path を正規化し、read/write 範囲を既存rootに照合して `allow`・`deny`・`unknown` を秘密を含まない理由つきで返します。shell 構文解析と network 先の判定は未対応です。
- JSON の `allow` は分類結果だけでホストの permission/approval を意味しません。`decision` は出さず、最終的な権限判断はホストに残します。
- path判定後にファイルシステムが変わる競合もあるため、この hook は OS sandbox ではありません。実際の強制には実行 sandbox を使ってください。
- `--policy-file` 無しのときは従来どおり deny パターン照合です。これは docs/RDSH-SETTINGS.md の記述と一致します。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「使い方 ＞ フック監視 (`rdsh guard`)」節）
- docs: [docs/RDSH-SETTINGS.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/RDSH-SETTINGS.md)（guard.deny の記述）

### 実装（src/main.rs・src/guard.rs）から補足

- 引数定義（`--deny` は繰り返し可、`--policy-file` は単一値、`--reason`・`--json`）と exit 2 の意味。
- ポリシーファイルは `schema: 1` と `rules` の配列構造をとること。
