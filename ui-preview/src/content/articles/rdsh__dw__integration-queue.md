---
title: "ローカル統合キュー"
desc: "workerがcommitした変更を固定順に統合するための、オプトインのローカル操作者CLIです（issue #22）。ダッシュボードのブラウザ、HTTPハンドラ、MCPツールから"
cat: "rdsh-dw"
catLabel: "rustdsh 調査"
chars: 4269
slug: "rdsh/dw/integration-queue"
---

# ローカル統合キュー

workerがcommitした変更を固定順に統合するための、オプトインの**ローカル操作者CLI**です（issue #22）。ダッシュボードのブラウザ、HTTPハンドラ、MCPツールからこのキューを登録・適用・運転することはできません。非公開レジストリと専用Git worktreeはソースリポジトリの外、`＼project-state］/integration/` 配下に置きます。ソースチェックアウト、workerブランチ、未commitファイル、remote refはそのまま保持します。

## 完全検査スイートを定義する

プロジェクトの完全な検証スイートを持つ、信頼済みローカルJSONファイルを作ります。各検査は絶対パス実行可能物、リテラル引数配列、関連する追跡入力、500〜600000ミリ秒のタイムアウトを持ちます。キューのスイートは不変で、部分テストや操作者の報告によるpassで置き換えられません。

```json
{
  "checks": [
    {
      "id": "full-tests",
      "description": "Complete project test suite",
      "inputs": ["package.json", "package-lock.json"],
      "argv": ["/absolute/path/to/node", "/absolute/path/to/npm-cli.js", "test"],
      "timeout_ms": 600000
    }
  ]
}
```

`inspect` の出力から、実際の完全なソースHEADと現在のレジストリrevisionを使います。未初期化レジストリはrevision 0です。Windowsのパスは `"C:/Tools/node.exe"` のような絶対JSON文字列にします。

```sh
node dashboard/cli.mjs integration inspect --project /path/to/repo
node dashboard/cli.mjs integration init --project /path/to/repo \
  --input-file /private/full-checks.json --expected-revision 0 \
  --expected-head ＼full-source-sha］
```

`init` はそのcommitへ専用の `codex/integration-＼uuid］` ブランチとworktreeを作ります。Gitを動かす前にprovisioningを記録し、空のcheckout-hookディレクトリを使い、受け入れ定義を登録します。検査の実行も公開もしません。中断されたprovisioning記録は既に作ったブランチ/ファイルを残し、準備完了checkoutを主張しません。

## 固定されたcommit済みソースを登録する

enqueue入力はラベルと、同じリポジトリ内の完全で不変なbase/head commit IDを指定します。baseはソースと統合ターゲット両方の祖先である必要があります。headはターゲットに未含のcommitを寄与せねばならず、重複ソースheadは拒否されます。あとでworkerブランチが動いても、キュー入りのソースは変わりません。未commitのworker編集は含まれません。

```sh
node dashboard/cli.mjs integration enqueue --project /path/to/repo \
  --input-file /private/worker-a.json --expected-revision ＼current-revision］
```

登録により単調番号のエントリが追記されます。変えるのは非公開レジストリだけです。統合、コマンドディスパッチ、push は起きません。

## 1エントリを適用し、そのcommitに対して検証する

```sh
node dashboard/cli.mjs integration apply --project /path/to/repo \
  --expected-revision ＼current-revision］ --expected-head ＼current-target-sha］
node dashboard/cli.mjs integration validate --project /path/to/repo \
  --expected-revision ＼new-revision］ --expected-head ＼integrated-target-sha］
```

`apply` は常に最も早いキューのエントリを選びます。Gitはworker/ソースcheckoutを編集せず3方向マージツリーを計算します。成功すると、親が前の統合ターゲットと正確なキュー済みソースであるローカルマージcommitが記録され、専用統合ブランチだけが進みます。before/afterのcommit IDと順序はレジストリに残ります。このローカル処理ではcheckout hooksと署名を無効化します。統合checkoutがdirty/欠落/再割当のときは適用が阻止され、ファイルは保存されます。

各統合の後、**宣言された完全検査全部がその正確なターゲットで合格するまで次のエントリは適用できません**。`validate` は既存の受け入れランナー経由で信頼済みargvを統合worktree内で実行します。新鮮な非公開homeと精査済み環境を用意し、dispatch前にintentを記録して、終了ステータス、stdout/stderrハッシュ、コード/環境観察を保持します。失敗検査は他が合格でも失敗のままです。リトライはスイート全部の再走行で、別試行の合格を混ぜられません。`inspect` は決してテストを実行しません。

検査報告はターゲット、次シーケンス、失敗理由、再試行可否、各検査の証拠を出します。`ready_for_review` は全登録エントリの統合と最新の完全検証試行の確認が残っていることです。人間の承認、本番採用、出版許可を意味しません。

## 競合、ターゲット変更、中断

マージ競合はパスと正確なソース/ターゲットIDを保持します。ターゲットcommitは変えられず、後続エントリが競合を飛ばすこともできません。`next_integration.retryable` のときは `apply` が同じ固定ソースを再試行できます。キュー入り/競合項目の撤退は `integration reject --input-file ... --expected-revision ...` に `{"reason":"Why this source is withdrawn"}` を添えて行い、撤退は明示記録されます。拒否入りキューが「全ソース統合済み」を報告することはありません。

新しいターゲットcommit、dirty checkout、コマンド/証拠変更、コード観察の変更は旧passを無効にします。操作者のcommit済み修正は、まず `integration retarget --expected-revision ... --expected-head ...` で承認します。同一統合ブランチ上のcleanな子孫を要求し、何も出版せず、新しい完全検証走行を要します。

レジストリは非公開の排他的writer lock、revisionチェック、有界な厳格スキーマ、flushedな原子置換を持ちます。Git/検証のintentは変異や実行の前に永続化されます。プロセス中断は未確認の証拠を残し、結果未知の統合やテストが自動で繰り返されることはありません。経過時間で旧lockを回収しません。破損・リンク付きレジストリは置き換えず拒否します。保存された部分workは操作者の検査を要し、破壊的クリーンアップ/resetは存在しません。

## 権限と範囲

このCLIは、既存のネイティブ実行ポリシーの下、ローカルで信頼したソースコード・Git設定・検証argvと共に使います。検査とGit merge driver/filterはローカルコードを実行できます。キューはOSサンドボックスではありません。スイートは「何を検査したか」を宣言するだけで、操作者が要求すべきテストを全部選んだ証明にはなりません。無視されたビルド出力は受け入れ入力ではないため、ネイティブDSHツールポリシーとサンドボックス制限がコード実行の権限を継続して担います。

mainへのマージ、push、保護変更、リリース出版のキュー操作はありません。これらの決定とクレデンシャルは別口です。本モジュールは受け入れ証拠の再利用だけをし、エージェントループ、profile boot、プロバイダ呼び出し、workerランチャ、ブラウザ実行エンドポイントを追加しません。

`dashboard/test/integration.test.mjs` は、実際の使い捨てGit worktree、固定ソースhead、順序マージ、競合/拒否、完全スイートのリトライ、commit/dirt変更、締切/中断、並行writer、破損/リンク保存、証拠改竄、公開CLIを実際に使って試します。モデルやプロバイダは使用しません。

## 実務上の注意

- キューは「統合が済み、完全検査が通った履歴」を作れるまでです。mainへの入船は常に人間操作です。
- スイートの不変性が実質の安全装置です。部分的テストで代替しようとすると、初期化時点で拒まれます。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/INTEGRATION-QUEUE.md
