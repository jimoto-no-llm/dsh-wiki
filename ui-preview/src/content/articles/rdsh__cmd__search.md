---
title: "rdsh search — 高速並列テキスト検索"
desc: "再帰的なテキスト検索を Node.js なしで実行するコマンドです。README.ja.md の実測では約17msで、従来処理（約41ms）の約2.4倍の速度と案内されています。2"
cat: "rdsh-cmd"
catLabel: "rustdsh コマンド"
chars: 1414
slug: "rdsh/cmd/search"
---

# rdsh search — 高速並列テキスト検索

再帰的なテキスト検索を Node.js なしで実行するコマンドです。README.ja.md の実測では約17msで、従来処理（約41ms）の約2.4倍の速度と案内されています。2段構え（固定順のディレクトリ走査 → 並列 grep）で、出力の順序は常に走査順です。

## オプション

| オプション | 既定 | 説明 |
| --- | --- | --- |
| pattern（位置引数） | 必須 | 探すテキスト |
| `--dir` | 設定 `search.dir` | 検索ルート（起点ディレクトリ） |
| `--max` | 設定 `search.max` | 最大ヒット数 |

## 使用例

```sh
rdsh search TODO --dir . --max 100   # カレント配下から TODO を最大100件
rdsh search TODO                    # 既定のディレクトリ・上限を使う
rdsh search hello --dir .           # README の例から簡潔に
```

## 既定値・注意

- 実装の補足: 非 Unix 環境ではこのコマンドは実行できません（セキュアなネイティブ検索はこのプラットフォームでは利用できない旨のエラーで停止します）。
- スキップされるディレクトリ: `.git`・`node_modules`・`target`・`.venv`・`dist`・`build`・`.next`、およびドット始まりの隠しディレクトリ。
- 2MB を超えるファイルと非 UTF-8 の内容は読み飛ばします（2MB ちょうどは対象）。
- シンボリックリンクはたどりません。解析後にファイルが差し替えられた場合は、交換後の内容を読まない設計です。
- ヒットごとの行は `パス:行番号: テキスト` で、行は240文字で切り詰めます。総計は標準エラーに `N hit(s) in M file(s)` で出力します。
- grep の並列度はコア数に依存し、上限は1〜8。
- 既定のディレクトリ・上限は `rdsh settings set search.dir …` / `rdsh settings set search.max 50` で変えられます（docs/RDSH-SETTINGS.md）。
- 見出しのパスは `--dir` で渡したルートからの相対表記です。
- 上限に達した後は、残りの読み込みを早めに止めます。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「使い方 ＞ 高速ネイティブコマンド」「実測ベンチマーク」「安全設計」節）

### 実装（src/search.rs・src/main.rs）から補足

- `--dir` / `--max` の既定が設定 `search.dir` / `search.max` であること。
- 2段構え（並列な配下走査 → 固定順での並列 grep マージ)により、件数上限があっても走査順の出力順序を保ちます。実行合計は標準エラーへのみ出します。
