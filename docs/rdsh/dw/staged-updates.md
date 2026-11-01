# プロジェクトスコープの固定更新（#47）

ローカルのダッシュボードCLIが互換ランタイムを一度captureし、1つのcanaryプロジェクトで検証してから、明示的に他プロジェクトへ選択させます。プロジェクトの既定は新しいrunに効きます。管理下の各runは、更新やロールバックを通じて元のNode/CLI/アダプタ/DSH成果物とネイティブセッション結合を保持します。グローバルインストール、リリースワークフロー、更新通知は一切変更しません。

## 信頼済みランタイムコードをcaptureする

Rustランチャやシェルshimではなく、既存の本家DSHインストールとそのNode実行可能物を使います。stage入力は小さなローカルJSONです。

```json
{
  "executable": "/absolute/node/bin/node",
  "dsh_root": "/absolute/node/lib/node_modules/@deepseek-ai/dsh",
  "entrypoint": "lib/bin.js",
  "adapter_root": "/absolute/rustdsh",
  "changes": "テスト中のCLI/アダプタ/プラグイン変更の具体的説明",
  "rollback": "旧プロジェクトリリースIDを再認定して再選択する手順",
  "provenance": "操作者が選んだコードインストールの説明"
}
```

```sh
node dashboard/cli.mjs release stage --input-file candidate.json
node dashboard/cli.mjs release inspect --project /projects/alpha
```

`executable`、`dsh_root`、`adapter_root` は絶対パス必須です。ルート指定は明示的な信頼決定であり、stageは指定Nodeの `--version` を実行し、認定はcaptureしたDSHとアダプタを実行します。stagingは自動ダウンロード、署名検証、updater、非信頼コードのサンドボックスではありません。

スロットにはNodeバイナリ、本家DSHパッケージと依存、dashboard runtimeのモジュール/依存、2つの管理プラグインを含めます。ソーステスト、証拠、`.git`、`.bin`リンク、プロジェクトコード、ネイティブhome、クレデンシャルファイル、runtime鍵、イベント状態は除外します。シンボリックリンクと非正則コードファイルは拒否し、実体化されたパッケージインストールを使います。ユーザープロファイル/設定と外部プラグインは外部設定のままです。

各リリースには、manifest全体（ファイルパス・長さ・読み取り/executable権限・チェックサム・タプル・変更/回復備考）で作るSHA-256識別があります。同じバージョン文字列でも別のコードビルドを指し得ます。リリースIDと変更備考を確認してください。

現行サポートタプル:

| 構成要素 | 契約 |
| --- | --- |
| ローカルdashboard CLI | `0.1.0`、captureしたソース/依存 |
| ACPアダプタ | `acp-stdio-v1`、captureしたソース/依存 |
| 本家DSH | `0.2.0-rc.2`、`0.2.1-alpha.1` |
| 認定プラグイン | `rdsh-release-probe`、契約1 |
| Node | captureした正確なバイナリ/バージョン、Node 22+ |
| プラットフォーム | 正確なOSとアーキテクチャ |

スロットは1 GiB・50,000ファイル（manifest 16 MiB）まで。レジストリはリリース100、プロジェクト選択5,000、run pin 10,000まで保持します。スロットは `RDSH_DASHBOARD_HOME/managed-releases/slots/rel_＼sha256］`（または既存の既定状態home）に置かれます。ファイルは読み取り専用で、変異するインストールからはコピーで配置します（リンクではありません）。状態ルートはWindowsの大文字小文字/短名エイリアスも正準に解決され、スロット階層内のリンクは拒否され続けます。管理されたlaunch/選択は記録済みバイト全体を検証し、余分・欠落ファイル、リンク、非互換タプルを拒否します。これらの検査はattach/選択時点のバイト確認であり、プロセスを改変する特権的な操作者への防御にはなりません。スロットの自動削除もグローバル更新もありません。

## 1プロジェクトで検証してから明示的に広げる

```sh
node dashboard/cli.mjs release canary --project /projects/alpha \
  --release-id rel_＼sha256］ --selection-revision 0
node dashboard/cli.mjs release promote --project /projects/beta \
  --release-id rel_＼sha256］ --selection-revision 0
```

既定を変える前に読むのは、グローバルのレジストリrevisionではなく**プロジェクト選択revision**です。初回選択から0です。1プロジェクトだけが候補のcanaryになれます。認定合格の前には、どのプロジェクトの既定も変わりません。追加プロジェクトにはその成功の後、明示的な `promote` が必要です。失敗または未完了の認定では、新runの起動にも他プロジェクトへのpromoteにも使えません。観察は `release inspect` に残ります。

認定はcaptureしたNodeとCLIを再execし、captureしたアダプタをimportします。既存の `--profile acp --patch ＼owned-file］` bootと既存のACP操作を使い、セッション開始、probeのネイティブ `llm` 注入観察、所有プロセスのexit確認、同一ネイティブIDで第2プロセスへresume、再注入観察とexit確認が行われます。probeは契約/Node/プラットフォーム識別だけを、一時的でスコープ付きのループバックcallbackに送ります。エージェントループ、ストリーム割込み、モデル要求はありません。

認定の一時homeはプロバイダクレデンシャルを継承しません。結果はstartup・両プラグインload・同ID resume・所有停止・cleanupを区別します。プロバイダ認証、モデル出力/課金、本番採用は明示的に未検証です。このbase profile検査は、全ユーザーの外部profile/プラグイン設定を認定するものではありません。cleanupが未確認ならそのhomeを保持し、成功は記録しません。

## 新しいrunと既存セッション

```sh
node dashboard/cli.mjs session-ledger start --project /projects/alpha
node dashboard/cli.mjs session-ledger resume --project /projects/alpha \
  --run-id run_＼uuid］
node dashboard/cli.mjs reply-consumer once --project /projects/alpha \
  --run-id run_＼uuid］
```

管理コマンドは `--executable`/`--entrypoint` を省略し、overrideは拒否します。CLIはスロットのNodeとCLIを再execし、選択された/pinnedな成果物とrevisionをそのプロセス内で再検証します。予算強制は `--budget-guard --worker-id` という明示選択で、captureした予算プラグインを使います。既存の返信消費者もcaptureしたCLI/アダプタ経由でdispatchします。管理dispatchは `NODE_OPTIONS`/`NODE_PATH` の注入を拒否します。pinned runtimeのlaunch前に、これらの外部コードoverrideを明示的に解決してください。stagingはこれらのoverrideを継承せずNodeバージョンだけをprobeします。

新しいrunのpinは、予算/ネイティブセッションdispatchの前に永続保存します。元のSessionLedgerは正確なexecutable/entrypoint、home/configパス、作業tree、branch、ネイティブIDを保持します。更新は後続runのための別の既定を選ぶだけです。既存pinは旧スロットを使い続けます。resumeは新しい既定をフォールバックとして参照しません。未知または旧来の非pin記録は既存のlaunch契約を保ち、自動バージョン保証は受けません。`release inspect` は既定とrun pinを表示し、管理attach出力は `new_run_project_default` と `existing_run_pin` を区別し、タプル/リリースIDを報告します。

レジストリ更新は非公開の排他lockの下で再読み込みし、古いプロジェクトrevisionを拒否します。planとdispatchの間の選択変更は新しいネイティブworkを阻止します。その拒否試行はunknownなledger記録を残すことがあり、開始されたセッションではなく、黙ってretryされません。欠落/改竄スロットと非互換runtimeは、正確なpinnedバイトの復元か互換ランタイムの到着待ちを要求します。他のrunを完遂させたり、無関係なownerをkillしたり、resumeをredirectしたりしません。クラッシュした認定は `checking` のまま、lockがowner PIDを記録します。手動回復の前に所有と未完了workを調べてください。自動のstale lock除去や捏造された認定はありません。

## 検証付きでロールバックする

```sh
node dashboard/cli.mjs release rollback --project /projects/alpha \
  --release-id rel_＼previous-sha256］ --selection-revision 2
node dashboard/cli.mjs release inspect --project /projects/alpha
```

ターゲットはこのプロジェクトの過去の既定であり、成果物がまだ使える必要があります。rollbackは、新run既定の変更前にstartup・両プラグインload・同ID continuation・所有exit検証を繰り返します。失敗は現行既定を保持し、失敗結果を記録します。成功は `rollback_requalified` の選択履歴と `rollback` 認定を追記します。いずれのリリース配下で作られたrunも、ロールバック後も自分のpinを使います。

Rustのpassthroughランチャ、`sync-dsh.sh`、グローバルDSHインストール、通常の外部CLI起動は、この管理されたプロジェクト/run契約の外です。既存のグローバル更新バナー/リリースワークフローは複製しません。実際のfixtureとネイティブライフサイクル証拠は [`evidence/staged-updates`](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/evidence/staged-updates/README.md) にあります。

## 実務上の注意

- 既定値の変更は canary検証-success が前提です。失敗・未完了の認定を既定の代入に使えず、新runの起動にも他のpromoteにも使えません。まず `release inspect` で記録された証拠を確認します。
- 回復手段は正確なpinnedバイトの復実だけです。スロットの改竄・欠落時には、resumeを別runへ流し替えるなどの迂回路は設けられていません。スロットの保管先は慎重に選びます。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/STAGED-UPDATES.md
