---
title: "rdsh の内部構造"
desc: "rdsh の設計原則、クレート構成、移行方針、CLI アダプタ契約を説明します。"
cat: "rdsh"
catLabel: "rustdsh"
chars: 2293
slug: "rdsh/architecture"
---

# rdsh の内部構造

`rdsh` の設計原則、クレート構成、移行方針、CLI アダプタ契約を説明します。

## 設計原則

`rdsh` は `dsh`（DeepSeek Harness CLI）向けの高速 Rust ランチャーで、設計規律は「ホットパスだけ移植し、それ以外はすべて委譲」です。会話とモデル実行は元の DSH ランタイムに残し、ネイティブコマンドだけ Rust で処理します。Node ダッシュボードは別の任意エントリポイントで、2つのモード（project / harness）とも loopback 限定です。

- 委譲はそのままの `exec` で、作成時点から挙動変更ゼロです。
- 最適化は出力同一性を要求します（`tests/regress.sh` で確認）。
- 設定の正本は `$DSH_HOME/rdsh.json` で、壊れた JSON では通常コマンドが失敗し、既定値への置換は `settings init --force` だけが明示的に行います。

## Rust 側の構成（docs/ARCHITECTURE.md）

`src/` の主な担当は次のとおりです：

| ファイル | 役割 |
| --- | --- |
| `main.rs` | CLI 定義（clap）と振り分け、`--dry-run` / `--passthrough` |
| `dsh_args.rs` | dsh 互換の引数・プロファイル・patch 解析 |
| `passthrough.rs` | 元 `dsh` へのそのまま `exec` 委譲 |
| `tokens.rs` / `search.rs` / `compact.rs` | トークン見積り・並列検索・予算圧縮 |
| `guard.rs` | stdin フックガード（`--deny` と構造ファイルポリシー） |
| `context.rs` / `context_hook.rs` | コンテキストエンジンとフック配線 |
| `deps.rs` | 静的依存グラフ・永続索引・変更影響 |
| `rdsh_config.rs` / `local_http.rs` | 統一設定・妥当性検査、ローカル HTTP の信頼確認 |

性能面では、pure-ASCII のトークン見積りは `len/4` の1ステップで非 ASCII は正確な走査を保ち、search は順序固定の並列走査（32ファイル未満は逐次）です。バイト一致の委譲は `--passthrough` を参照実装として確認します。

## JS から Rust への段階的移行（docs/RUST-MIGRATION.md）

移行は既存機能1つに単位を絞り、失敗・入力境界・互換性のテストを先に確認してから行います。公開インターフェースを保ち、Rust へ移したら JS を削除します。 OS 依存コードは Linux だけの成功で完了扱いにせず、OS 別（Linux/macOS/Windows）の CI でも検証します。高速化の判断は IPC や Git 起動の費用も込みの全体処理時間で行い、言語比率だけで判断しません。agent loop・認証・セッションの正本は DSH に残します。

`src/workflow_patch.rs` は workflow-board のソースパッチ準備を Rust に移した例で、マニフェスト検証、パッチの SHA256 照合、Git 適用と適用後の blob 照合を担い、Node 側は CLI・JSON 呼び出しだけを残します。失敗したソースを自動 reset せず、既存変更・未追跡ファイル・symlink を検出したら成功にしません。

## CLI アダプタ契約（docs/CLI-ADAPTERS.md）

ダッシュボードの Node モジュールはバージョン確認つきの CLI クライアントを提供します。現時点で検証済みなのは DSH（ACP v1 over stdio）のみで、Codex・Claude Code・Kimi は未実装です。対応は成功したバージョンプローブと ACP 初期化を条件とし、プローブだけではプロトコル・認証・モデル要求の実績を主張しません。元の DSH 実行ファイルを明示指定する必要があり、PATH 上の shim を誤って起動しないようにしています。起動・再開・送信・中断・停止・usage の各操作はアダプタメソッドとして提供され、同一セッションへの同時プロンプトは busy で拒否、中断は「書き込み済み通知」であって確認ではありません。使用量は context 占有率・容量の観察であり、金額や課金トークン数は推定せず null を返します。NDJSON フレームは 1 MiB 上限で、不正なフレームは互換性を取り消します。

## 出典

- <https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/ARCHITECTURE.md>
- <https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/RUST-MIGRATION.md>
- <https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/CLI-ADAPTERS.md>
