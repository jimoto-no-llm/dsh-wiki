---
title: "Git Worktrees"
desc: "実験的な dsh-experimental-worktree サービスが ctx.worktrees を提供します。消費者の create_worktree が新しいGit bra"
cat: "subsystems"
catLabel: "サブシステム"
chars: 3622
slug: "subsystems/worktrees"
---

# Git Worktrees

実験的な `dsh-experimental-worktree` サービスが `ctx.worktrees` を提供します。消費者の `create_worktree` が新しいGit branchとcheckoutを作り、working-directoryサービス経由でそこへ選択します。GUI plugin manager経由で両パッケージを載せるoptional bundleがあり、出荷時はoff、明示compositionでのmountも可能です。

## 作成と保持

呼び出しSessionの現在ディレクトリがsource repositoryを選びます。作成はcheckout割当ての前に要求されたlocal commit・branch・tagを固定し、省略は `HEAD` です。各名は新branchと未使用のcheckout pathを同時に満たさなければなりません。操作は欠損オブジェクトのfetchや、staged・unstaged・untracked・ignoredファイルのsource checkoutからのコピーを一切行いません。

既定の目的地は `<current checkout root>/.agents/worktrees/＼name］` です。`repositoryRoot` は呼び出し側の現在checkoutの最上位ディレクトリであり、linked checkoutは自分のpoolを持ちます。割当てが構成pool directoryを新規作成するときだけ、`*` と末尾改行だけの `.gitignore` を書きます（既存のファイルとignore規則は保持されます）。呼び出しSessionのsandbox policyが目的地と共有Git管理ディレクトリへの書込みを許す必要があります。Git設定が成功してからworking-directoryが変わります。

`working_directory({ cd: path })` での退出はcheckoutとbranchを保持します。取消や失敗も部分的なartifactを保持しえて、その場所はエラーで示されます。disposalでpending操作をabort・drainします。構成とGit要件はパッケージREADMEが所有します。

## 構成とbundle

| 項目 | 内容 |
| --- | --- |
| パッケージ | `dsh-experimental-worktree`（`ctx.worktrees` 提供）と、消費ツール `create_worktree` |
| 導入 | GUI plugin managerのGit Worktrees optional bundle、または明示compositionでのmount |
| 既定状態 | 出荷時はoff |
| 呼出し側の権限 | 呼び出しSessionのsandbox policyが目的地と共有Git管理ディレクトリへの書込みを要求 |
| `.gitignore` | 割当てがpool directoryを新規作成したときだけ `*` と末尾改行を書き、既存のファイルとignore規則は保持 |

## 要求と結果

要求は新しい名前とlocal revisionだけを選びます。結果は作成されたcheckoutと正確なcommitを特定し、Sessionの元プロジェクトや書込み権限は変えません。任意のコールバックが作成の各段階の開始前に受信します。restorationは、消されたcheckoutを記録ディレクトリで、branchから、branchが無いときはbase commitから再度checkoutします。


| 型 | 意味 |
| --- | --- |
| `CreateWorktreeRequest` | 新branch名で相対checkout directoryを兼ねる任意の `name?`、作成前に解決される任意の `from?`（省略はHEAD） |
| `CreatedWorktree` | canonical checkout directory、新branch名、解決されたcommitオブジェクト名、source root。repository-localのreplacement refsがcheckout内容を変え得る |
| `CreateWorktreePhase` | 作成・restorationの開始前段階。`prepare` は検証・directory割当て・branch作成（restorationでは消滅時のみ再作成）、`checkout` はファイル書込みと作成時のcheckout進入 |
| `RestoreWorktreeRequest` | 記録されたcheckout directory・branch・base commit・source root |
| `RestoredWorktree` | 返ったpathと、branchが無くbase commitから同名再作成されたか否か（branchRecreated） |

## 使い方

`ctx.worktrees`（`WorktreeService`）はmounted filesystemとsandbox providerの下で保持対象のcheckoutを作ります。

| メソッド | 挙動 |
| --- | --- |
| `create(agent, request = {}, signal?, onPhase?)` | pinningされたlocal revisionで新branchとcheckoutを作りそこへ入る。既存branchやcheckout pathは失敗。未commitファイルはsource checkoutに留まる。checkoutはclean・smudge・process filterをGit設定を変えずに無効化する。新checkoutが現currentに変わるのはGit設定成功後。失敗してもbranchやcheckoutは自動除去されない |
| `restore(agent, request, signal?, onPhase?)` | 消されたworktreeを記録ディレクトリで再checkout。branchがまだあればそれを、無ければ `baseCommit` に同名の新branch。消えていたtargetのロックされていない登録だけを除去し、既存directoryは失敗。未commitの変更は回復しない。呼び出しSessionのworking directoryは変えない |

## 使い方の流れ

次の流れは既定値の組合わせでの典型的な使用です。

1. `create_worktree`（または直接 `ctx.worktrees.create`）へ、任意の新branch名と任意のlocal revisionを渡します。
2. `prepare` 段階で要求検証とcheckout directory割当てとbranch作成が終わります（既定目的地 `<current checkout root>/.agents/worktrees/＼name］`）。
3. `checkout` 段階でファイルが書き込まれ、作成のときはcheckoutに入ります。
4. working-directoryサービスが新checkoutを現currentへ結び付けます。
5. 作業後に `working_directory({ cd })` で元checkoutへ戻ると、worktree自体は保持されます。

## 注意

- requestは `name` と `from` だけであり、作成の他にfetchやコピーは行いません。未commitの変更は一切引き継ぎません。
- 成功したGit設定がworking-directory変更に先行するため、checkoutは入れたつもりでも失敗時には元ディレクトリに留まります。
- 失敗・取消が新規割当てのGit/filesystem artifactを保持し得る一方、自動clean-upは一切ありません。
- この機能は実験的です。構成の窓口はパッケージREADME、消費ツールの契約は `create_worktree` のREADMEです。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/worktrees.md
