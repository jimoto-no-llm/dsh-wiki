# ワーカースコープとworktreeのリース

`rdsh-dashboard workers` はワーカーごとにGitのチェックアウトとブランチを割り当て、読み取り/書き込みスコープを記録し、編集の前後で競合を報告します。作られたcheckoutで既存のDSH worker/runtimeを使います。このコマンドはmodelを起動せずDSH profileを変えず、browser/MCP toolsも追加しません。

## 宣言と割り当て

プロジェクトはコミット済みHEADを持つGit リポジトリのrootである必要があります。オペレータが所有する宣言を `worker.json` として保存します。

```json
{
  "worker_id": "dashboard-editor",
  "role": "edit",
  "read_paths": ["."],
  "write_paths": ["dashboard", "tests"],
  "modules": ["dashboard"],
  "forbidden_paths": ["dashboard/package-lock.json", "tests/e2e/package-lock.json"],
  "lease_seconds": 3600
}
```

スコープはリポジトリ相対のpath接頭辞です。ファイルとディレクトリを受け付け、`.` はリポジトリrootを意味します。絶対パス、traversal、バックスラッシュ、globは拒否します。forbidden接頭辞は書き込み権に優先し、Gitメタデータの書き込みは除外します。各write接頭辞は読み取り可能でもある必要があります。worker IDはlowercase英数字とハイフンで、letterから始まります。

```sh
node dashboard/cli.mjs workers plan --project /path/to/repo --input-file worker.json
node dashboard/cli.mjs workers prepare --project /path/to/repo --input-file worker.json \
  --expected-revision 0 --expected-head <planが返したsource.head_sha>
node dashboard/cli.mjs workers inspect --project /path/to/repo
```

`plan` が返した `revision` と `source.head_sha` をそのまま使います。registry revisionやsource commitが変わったらplanをやり直します。書き込みスコープは、割り当て済みワーカーやsource checkoutの変更と照合して競合を判定し、共通のconfigやlockfileには別の競合理由を付けます。競合があると割り当てが承認されず、planは対象のworker/pathを示します。

sourceの全変更は `source.dirty_paths` に、未追跡ファイルも含めて報告されます。新しいワーカーのwrite範囲外の変更は、元のcheckoutに残せます。ワーカーは指定のコミット済みHEADから始まり、未コミットのsource変更はその場に保持されます。記録は割り当て前のsource観察を保持し、割り当て後の観察も返します。

各ワーカーは新しい `codex/worker-...` ブランチと、プロジェクトのdashboard stateディレクトリ下の独立checkoutを受け取ります。stateの場所は `RDSH_DASHBOARD_HOME` で選び、source リポジトリとそのGitメタデータの外に置きます。既存のworker IDとcheckout pathは保持され上書きされません。新しい割り当てには新しいworker IDを使います。

reviewワーカーには `"role": "review"` を設定して `write_paths` を省略または空にします。writeスコープがあれば拒否され、scanは観察された編集をスコープ違反として報告します。宣言とGit scanは割り当てと診断の手段であり、実行時の強制はDSHのネイティブtool policyとexecution sandboxが行います。reviewerの起動には一致する読み取り専用のネイティブpolicyを選びます。

## 変更のscanと作業の保持

`inspect` は読み取り専用です。source checkoutの変化、各ワーカーの実際のHEAD/branch、未コミットpath、割り当てbase以降のコミット済みpath、スコープ違反、ワーカー間とsource checkoutとの重複変更を報告します。renameとdelete対象も残ります。2つのワーカーが別のmoduleを宣言した後でも、共有のlock/configの書き込みは検出されます。checkoutが利用不可・再割当て済みなら `tree.status: "unavailable"`・`tree.dirty: null` で、きれいなtreeの報告にはなりません。

リースの状態とcheckoutの状態は独立です。リースが期限切れでも、未コミットファイル・コミット済み変更・利用不能さ（checkout欠落）がそのまま残り得ます。期限切れはワーカーのスコープを割り当てたまま、cleanupを行いません。inspectの後、現在のregistry revisionを使ってリースを更新するか明示的に解放します。

```sh
node dashboard/cli.mjs workers renew --project /path/to/repo \
  --worker-id dashboard-editor --lease-seconds 3600 --expected-revision 2
node dashboard/cli.mjs workers release --project /path/to/repo \
  --worker-id dashboard-editor --expected-revision 3
```

releaseは、operatorの割り当てを終える判断を記録します。checkout・branch・全変更は保持され、dirty/changedの対象はinspectに残ります。後のplanは、解放済みワーカーとの重複scopeを警告します。releaseは実行中のDSH プロセスを停止せず、統合の成功も意味しません。

registryは非公開のwriter lock、revision確認、flushしてからの原子的書き換えを使い、Gitを開始する前のprovisioningを記録します。中断または失敗したcheckout操作は `provision_failed` か `provisioning` の記録と、Gitが作ったファイル/branchを保持するので、手を付ける前にinspectします。既存のwriter lockは書き込みを止め、経過時間で再取得しません。壊れた・リンクされたregistryファイルは置き換えずに拒否します。割り当ては空のcheckoutフック ディレクトリを使います。

## 統合と検証

このCLIはmerge/push権限を持たず、cleanup操作もありません。宣言したroleに一致するネイティブpolicyで、割り当てられたworktreeに既存のDSH workerを実行します。scanは統合と検証に回すべき作業を表出させるだけで、統合の順序と検証はissue #22のintegration queueに属します。

現在のupstream subagentサービスがprovider能力・子セッション・working directory継承・tool filterを所有し、実行のownerであり続けます: [upstream subagent契約](https://github.com/deepseek-ai/deepseek-harness/blob/5badb15009ae1756c3afe0ae0cef1faafc290ccc/docs/subsystems/subagent.md)。旧提案のfork文書は現状入手不能で、その欠けているソースからランタイム機能を推測しません。

`dashboard/test/workers.test.mjs` は本物の使い捨てのGit リポジトリ・ブランチ・worktreeを使い、割り当て、source変化、重複警告、共有lockfileの変更前後、コミット済み変更、reviewスコープ、期限切れ/更新/解放の保持、staleなsource/revision、競合する割り当て元、checkout欠落、壊れた/lockされた記録、既存のNode CLIをカバーします。testにprovider・model・外部リポジトリは使いません。

## 実務上の注意

- scanは分配の道具であり、統合が自動ではありません。重複するスコープを解放済みワーカーと割り当てる前には、残った変更を必ず確認します。
- writer lockが残っていても経過時間では回収しません。lockの持ち主を確認し、手を付ける前にinspectします。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/WORKER-WORKSPACES.md
