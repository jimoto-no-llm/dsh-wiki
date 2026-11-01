---
title: "rdsh serve — ローカル閲覧用 Web 画面"
desc: "手元で状態確認やトークン見積もりを行える軽量なローカル Web 画面です。既定ポート :38080（本家の :3080 と競合しません）で、localhost 限定・一時トークンで"
cat: "rdsh-cmd"
catLabel: "rustdsh コマンド"
chars: 1993
slug: "rdsh/cmd/serve"
---

# rdsh serve — ローカル閲覧用 Web 画面

手元で状態確認やトークン見積もりを行える軽量なローカル Web 画面です。既定ポート `:38080`（本家の `:3080` と競合しません）で、localhost 限定・一時トークンで保護されています。API は読み取り専用で、boot もファイル書き込みも HTTP からの実行もありません。

## オプション

| オプション | 既定 | 説明 |
| --- | --- | --- |
| `--port ＼n］` | 設定 `serve.port`（既定 38080） | リッスンポート。`0` で空きポートから自動選択 |

## 使用例

```sh
rdsh settings set extras.enable serve  # 機能を有効化（既定 OFF）
rdsh serve                             # 起動（ローカルホスト限定、一時トークンで保護）
rdsh serve --port 0                    # 空きポートで起動
rdsh serve --port 38080                # 明示的に既定ポートで起動
```

## 既定値・注意

- 既定 OFF の特徴（`serve`）のため、有効化していない場合、対応する呼び出しは理由と有効化方法を表示して終了します。
- リッスンは `127.0.0.1` だけに限定され、信頼できないホスト・オリジンからの要求は `403` で拒否されます。`/api/*` は一時トークンによる認証が必要です（トークン本体は出力せず、ハンドオフファイルへ書いて内容入力を促します）。
- ポート衝突時のエラーでは、dsh web GUI が 3080・rdsh serve が 既定38080 であることと `--port 0` の使い方を案内します。
- Ctrl-C での停止は共通の shutdown フラグを使い、stderr がパイプ先で先に閉じても（`rdsh serve | head -1` など）画面が落ちません。
- 通知は stderr（例: `[rdsh] dashboard: http://127.0.0.1:＼port］/ (Ctrl-C to stop, localhost only)`）。Ctrl-C で終了します。
- API の応答は JSON で、UI は静的な HTML/CSS/JS が組み込まれて配信される構成です。
- API: `/api/version`、`/api/doctor`、`POST /api/tokens`、`POST /api/prune`、`/api/bench`、`/api/sessions`（`?limit=1..100` で上限は20）、`/api/skills`、`/api/profiles`。
- `/api/doctor` は `original_dsh`・`dsh_home`・`local_profiles`・`slim`・`version` の JSON を返します。
- `/api/tokens` は `{"text": …}` を受け、`{"tokens": …, "chars": …}` を返します。`/api/prune` は `max_tokens`（既定4000、100〜200000 に丸め）を受けます。`--port 0` のとき、実際に割当たったポートを stderr へ表示します。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「Web UI とダッシュボード ＞ 内蔵 Web UI (`rdsh serve`)」、「Smart-DSH との併用」、「よくある質問」節を参照）
- docs: [docs/RDSH-SETTINGS.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/RDSH-SETTINGS.md)（ローカル状態画面の既定ポート 38080 のくだり）

### 実装（src/serve.rs・src/main.rs）から補足

- API 端点一覧と認証方式（`/api/*` はトークン必須）、静的資産（`/`、`/ui.js`、アイコンなど）、存在しない端点の `404`、同時接続上限の `503 busy`。
- 起動ログの形式とトークンハンドオフ（トークン本体は出力しない）、Ctrl-C 由来の停止フラグの共有。
