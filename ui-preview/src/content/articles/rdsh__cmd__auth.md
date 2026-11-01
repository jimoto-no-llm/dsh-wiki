---
title: "rdsh auth — 認証情報の状態確認と明示インポート"
desc: "他ツール（Codex・opencode 等）で完了しているログインを、DSH が利用する $DSH_HOME/.credentials.yaml へ安全に取り込む（または状態だけ確"
cat: "rdsh-cmd"
catLabel: "rustdsh コマンド"
chars: 1880
slug: "rdsh/cmd/auth"
---

# rdsh auth — 認証情報の状態確認と明示インポート

他ツール（Codex・opencode 等）で完了しているログインを、DSH が利用する `$DSH_HOME/.credentials.yaml` へ安全に取り込む（または状態だけ確認する）コマンドです。README.ja.md では「他ツールの認証情報を無断で外部へ送信したり、同期したりしません。明示的に指定したログイン情報のみをローカルで安全に管理します」と案内されています。

## オプション

| オプション | 既定 | 説明 |
| --- | --- | --- |
| （オプションなし） | 状態表示のみ | 外部ログインの検出状況・保存済み参照・プロファイルに必要な認証の判定を表示 |
| `--import` | なし（off） | 選択した認証情報を `.credentials.yaml` へ書き込む |
| `--provider ＼id］` | なし | 取り込むプロバイダを限定（例: `openai-codex`） |
| `--source ＼id］` | なし | 探す元を限定。指定できるのは `codex` または `opencode` |
| `--ref ＼name］` | なし | 参照名（キー名）で取り込む。OAuth グラントは含めない |
| `--json` | なし（off） | `credentials`、`sources`、`records`、`refs_known`、`notes`、`wrote` を含む機械可読出力 |

## 使用例

```sh
rdsh auth                                  # 現在のログイン状態を確認
rdsh auth --import --provider openai-codex # Codex / opencode のログインを取り込み
rdsh auth --import --ref ANTHROPIC_API_KEY # キー参照で取り込み
```

## 既定値・注意

- 検出元は `~/.codex/auth.json` と、opencode の `＼data］/opencode/auth.json`（代替として `~/.config/opencode/auth.json` も見ます）。
- `--import` では `--provider` か `--ref` の指定が必須で、一括コピーは無効です（"credential import requires --provider ＼id］ or --ref ＼name］; bulk copying is disabled"）。
- dsh のレコード ID に対応しない opencode ログインは取り込まず、`notes` にスキップを記録します。
- `--ref` による取り込みは OAuth グラントを含みません。API キーの参照だけを対象にします。
- 書き込み先が旧来の flat レイアウトのまま（`version: 1` が無い）場合は追記を拒否し、`version: 1` を足すよう案内します。
- 出力には dsh 既定起動に必要な認証情報の判定（credential ok / credential importable / credential missing）と、Codex モデルがプロファイル未掲載のときの `rdsh models`・`rdsh models sync` のヒントも出ます。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「クイックスタート」手順 D、「使い方 ＞ 認証情報のセットアップ (`rdsh auth`)」、「安全設計」節を参照）
- docs: README.ja.md の節のみを使用（該当する追加 docs なし）

### 実装（src/auth.rs・src/main.rs）から補足

- 検出元パスの候補、各オプションの検証エラー、`.credentials.yaml` の行を温存する読み書き方式。
- 出力1行ずつの形式（`source ＼from］: ＼provider］ oauth (expires_ms=…)`、保存済みかの判定、次の一手の案内）。
