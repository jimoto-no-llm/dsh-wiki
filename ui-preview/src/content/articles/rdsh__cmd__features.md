---
title: "rdsh features — 機能スイッチの一覧と on/off"
desc: "rdsh の選択的機能（features）を一覧し、個々の能力を on / off で切り替えます。README.ja.md では「機能スイッチと既定値の一覧（既定OFF: ser"
cat: "rdsh-cmd"
catLabel: "rustdsh コマンド"
chars: 2264
slug: "rdsh/cmd/features"
---

# rdsh features — 機能スイッチの一覧と on/off

rdsh の選択的機能（features）を一覧し、個々の能力を on / off で切り替えます。README.ja.md では「機能スイッチと既定値の一覧（既定OFF: serve / search-web / context_engine / agent_tool_sandbox など）」と案内されています。設定は `$DSH_HOME/rdsh.json` に保存され、同梱プラグインや Web 設定画面と共有されます。

## オプション

| オプション／サブコマンド | 既定 | 説明 |
| --- | --- | --- |
| （サブコマンドなし）＋ `--json` | 機能一覧を表示 | 機能・現在値・既定値・説明の一覧。`--json` で `config` と `features` を機械可読出力 |
| `on ＼id］` | — | 1つの能力を有効化（例: `rdsh features on discord`） |
| `off ＼id］` | — | 1つの能力を無効化（例: `rdsh features off update_check`） |

## 使用例

```sh
rdsh features                        # 機能・現在値・既定値・説明の一覧
rdsh features --json                 # 機械可読一覧
rdsh features on serve               # ローカル状態画面を有効化
rdsh features off update_check       # 更新確認を無効化
```

## 既定値・注意

- 設定に未記載の id は既定値のまま動くため、既存の挙動が勝手に変わることはありません。
- 旧キー（`discord.enabled` / `extras.enable` / `beta.context_engine`）も引き続き動きますが、`features.＼id］` が指定されている場合はそちらが優先です。`rdsh settings set features.＼id］ true|false` でも同じ切替ができます。
- `models_auto` は起動時に一度だけ確認し、前回から24時間以上経っていれば背後で `rdsh models sync` を走らせます（起動は待ちません）。
- `serve` / `search-web` / `context_engine` / `setup_web` はネイティブ側のスイッチで、無効なまま対応コマンドを実行すると理由と有効化方法を表示して終了します。
- `discord` / `sound` / `compute` / `budget_guard` / `release_probe` / `update_check` / `update_notifications` はプラグイン側のスイッチで、DSH の再起動後に反映されます。
- `slim_lazy_plugins` / `slim_disable_voice` / `slim_disable_auto_review` と `node_compile_cache` は、委譲して起動する DSH プロセスの環境変数に反映されます。
- docs/RDSH-SETTINGS.md の表による既定値:
  - 既定 on: `discord`、`update_check`、`update_notifications`、`models_auto`、`budget_guard`、`setup_web`、`sessions_token_cache`、`node_compile_cache`、`slim_lazy_plugins`、`slim_disable_voice`、`slim_disable_auto_review`
  - 既定 off: `sound`、`serve`、`search-web`、`context_engine`、`compute`、`agent_tool_sandbox`、`release_probe`

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「使い方 ＞ 高速ネイティブコマンド」「安全設計」「Web UI とダッシュボード」「Smart-DSH との併用」節を参照）
- docs: [docs/RDSH-SETTINGS.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/RDSH-SETTINGS.md)（機能スイッチ節、機能スイッチの効き方節）

### 実装（src/main.rs・src/rdsh_config.rs）から補足

- 一覧表の列（feature / state / default / what it does）と、切替が共有ロック下の `features.＼id］` 1キー更新であること。
- 未知の id を渡したときのエラー文（`try: rdsh features` と案内）。
