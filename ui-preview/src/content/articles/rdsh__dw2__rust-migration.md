---
title: "JS→Rustの段階的移行"
desc: "まずworkflow-boardのソースパッチ準備処理を移しました。src/workflow_patch.rs がマニフェスト検証、パッチのSHA256照合、固定コミット・変更範囲"
cat: "rdsh-dw2"
catLabel: "rustdsh 運用"
chars: 2767
slug: "rdsh/dw2/rust-migration"
---

# JS→Rustの段階的移行

まずworkflow-boardのソースパッチ準備処理を移しました。`src/workflow_patch.rs` がマニフェスト検証、パッチのSHA256照合、固定コミット・変更範囲の確認、Gitへの適用と適用後のblob照合を担当します。`source-patch.mjs` はCLI互換とJSON呼び出しだけを残します。Git blobのハッシュは `git hash-object --stdin --no-filters` を使い、依存クレートは追加しません。

```sh
cargo build --locked
./target/debug/rdsh workflow-board --source ../dsh-board-source --check
./target/debug/rdsh workflow-board --source ../dsh-board-source --apply

# 既存Node入口も同じRust処理を呼ぶ
RDSH_BIN="$PWD/target/debug/rdsh" node plugins/workflow-board/source-patch.mjs \
  --source ../dsh-board-source --check
```

`--check` が既定です。適用先を明示し、固定されたDSHベースコミットの隔離チェックアウトを使います。`--apply` は全体の事前チェック後に適用し、巻き戻しチェックと全対象blobの一致を確認します。既存変更・未追跡ファイル・symlink・固定範囲外のファイルを検出すると成功にしません。失敗したソースを自動resetしないため、適用後のエラーはdiffを調べてください。

旧Node入口が動くには現在のrdshビルドが必要です。`RDSH_BIN` を優先し、リポジトリ内ではdebug→releaseの順で探し、それ以外はPATHのrdshを使います。Nodeの `prepare(source, {apply, patch, manifest})` APIとJSON結果・エラーコードは維持します。テスト専用の `runGit` 注入はRustの内部テストへ移っています。直接 `rdsh workflow-board` を使う場合はNodeが不要です。CLI名 `workflow-board` をDSHのprofile名にする起動は `--profile workflow-board` です。

## 現行の責任分担

| 部位 | 担当 | 備考 |
| --- | --- | --- |
| `src/workflow_patch.rs` | マニフェスト検証、SHA256照合、固定コミット・範囲の確認、Git適用、blob照合 | 依存クレートは追加しない |
| `plugins/workflow-board/source-patch.mjs` | CLI互換とJSON呼び出しの入口 | 既存Node入口がRust処理を呼ぶ |
| CLI `rdsh workflow-board` | Nodeを使わない直接入口 | profile起動は `--profile workflow-board` |
| Rust内部テスト | 障害注入、`runGit` の代替 | Nodeテストは実Rustプロセスを通す |

## 移行の進め方

1. 変更単位は既存機能1つに絞り、成功だけでなく失敗・入力境界・互換性のテストを先に確認します。
2. 元の公開インターフェースを保ち、責任をRustへ移したらJSの同じ実装を削除します。
3. OS依存コードはLinuxだけの成功で完了扱いにせず、CIのLinux/macOS/Windowsでも検証します。
4. 高速化は同じ入力で全処理時間を測ります。IPCやGit起動の費用も含め、言語比率だけで効果を判断しません。
5. DSHのagent loop、認証、セッションの正本はDSHに残し、ブラウザDOMやCordis接続も必要な部分だけJSを残します。

次の候補は `rdsh-compute` の実際の呼び出し箇所を1つずつ増やすことと、dashboardの純粋計算を計測して移すことです。安全境界をまたぐ新操作を既存のcomputeプロトコルへ無条件に足しません。UIコードを言語比率のために重複移植しません。

候補の選び方としては、まず `rdsh-compute` の既存の呼び出し箇所を列挙し、その中で効果が見込める所から1つずつRust側へ移し、dashboardの純粋計算は実測した処理時間で対象を決めます。安全境界に触れる新操作は、既存プロトコルの外に勝手に付け足しません。UIコードも言語比率のために重複移植しません。

## 検証

```sh
cargo fmt --check
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked workflow_patch
cargo build --locked
RDSH_BIN="$PWD/target/debug/rdsh" node --test plugins/workflow-board/tests/source-patch.test.mjs
```

Rustの障害注入テストは書き込み失敗・適用後の外部変更を確認します。Nodeの一時Git fixtureは実際のRustプロセスを通るため、既存のパッチ適用・冪等性・CRLF・作業中変更の保持・所有者チェック・fsmonitor禁止・symlink入口を確認します。

## 実務上の注意

- 速度の根拠は全時間の計測です。Rustへの書き換え率や言語割合だけでは移行の妥当性になりません。
- 適用後の失敗には自動修復がありません。diffを調べ、失敗したソースをその場で直すか手動で巻き戻します。
- 公開インターフェースは `prepare(source, {apply, patch, manifest})` とJSONの結果・エラーコードを維持します。移行がNT entrypointの利用者に見えないことを壊れる実行環境ではなく、テストで確認する方が確実です。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/RUST-MIGRATION.md
