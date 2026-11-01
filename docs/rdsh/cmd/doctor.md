# rdsh doctor — 環境の健全性診断

本家 `dsh`・環境変数・パスが正しくそろっているかを一度に診断する読み取り専用コマンドです。README.ja.md の動作確認（手順 C）では `dsh --version && rdsh --version && rdsh doctor` の一部として使われます。書き込みは一切行いません。

## オプション

| オプション | 既定 | 説明 |
| --- | --- | --- |
| （引数なし） | — | このコマンドはオプションを取りません |

## 使用例

```sh
rdsh doctor   # dsh の在所・DSH_HOME・プロファイル・認証状態などの確認
rdsh doctor   # dsh のバージョンと Smart-DSH バンドルを確認（README.ja.md の Smart-DSH 節）
```

## 診断される項目

- 本家 `dsh` の在所（PATH に見つかるか）と `dsh --version` の実行結果。
- `DSH_HOME` の場所と、その `profiles/` 配下のローカルプロファイル数。
- Desktop（Electron）アプリの検出と desktop プロファイルの初期化状態、有効になっている rdsh 同梱プラグイン。
- slim 環境の説明と `rdsh auth` の状態サマリ。
- Smart-DSH バンドルが web プロファイルに入っているか（`dsh-notify-push` `dsh-esc-stop` `dsh-btw` `dsh-tasks` の検出）。
- `dsh` コマンドが `rdsh` に差し替わっている場合の注意（Smart-DSH スクリプトには `dsh-orig` か `DSH_PACKAGE_DIR` が必要）。
- Node ラッパーの警告と、ポート番号の注意（dsh web GUI: 3080、`rdsh serve`: 38080）。serve は既定 OFF のため、使う前に有効化を促します。

## 既定値・注意

- 本家 `dsh` が見つからないときだけ異常終了し、`dsh-orig`・`DSH_ORIG_BIN`・`@deepseek-ai/dsh` の導入案内を出します。それ以外の個別項目は継続します。
- 診断系コマンドのため、出力は標準出力に1行ずつです。パイプ先が先に閉じても中断の恐慌を出しません。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「クイックスタート」「使い方」「Smart-DSH との併用」「安全設計」「よくある質問」節を参照）
- docs: README.ja.md の節のみを使用（該当する追加 docs なし）

### 実装（src/main.rs）から補足

- 個別診断の正確な項目セットと、各項目の読み取り先（`profiles/web/package.json` からの Smart-DSH 検知、desktop プロファイルの plugin 状態、`dsh --version` の取り出しなど）。
