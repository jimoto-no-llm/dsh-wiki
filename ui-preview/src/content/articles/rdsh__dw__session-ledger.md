---
title: "永続CLIセッション台帳"
desc: "プロジェクト・論理run・タスク・ネイティブCLIセッションの各識別子を結び付ける台帳です。表示ラベルは記述データに過ぎず、再開ターゲットの選択に決して使われません。ネイティブセッ"
cat: "rdsh-dw"
catLabel: "rustdsh 調査"
chars: 3726
slug: "rdsh/dw/session-ledger"
---

# 永続CLIセッション台帳

プロジェクト・論理run・タスク・ネイティブCLIセッションの各識別子を結び付ける台帳です。表示ラベルは記述データに過ぎず、再開ターゲットの選択に決して使われません。ネイティブセッションと対話はCLI自身のストレージに存続し、rdshは複製せず別のエージェントループも実装しません。

## 識別と永続性

各プロジェクトは、dashboard状態の脇に `sessions.json` を持ちます。メトリクスの `session_id`、ダッシュボードタスク報告、DSHのセッションデータベースとは別物です。

| フィールド | 意味 |
| --- | --- |
| `project_id` | `state.mjs` 由来の既存正準プロジェクト識別 |
| `run_id` | 割り当てられたUUID。論理runを再attachするとき保持される |
| `task_id` | 明示的なタスク結合、または `null`。タイトルから推測しない |
| `cli` / `cli_session_id` | CLI名とそのネイティブセッションID、または `null` |
| `cwd` / `branch` | 正準作業ディレクトリと観察されたGitブランチ |
| `git` | リポジトリルート、観察commit、コンテキスト状態 |
| `provider` | 任意の操作者報告プロバイダ名。認証証拠はない |
| `launch` | プロトコル、実行可能パス、任意Node entrypoint、ACP profile |
| `scope` | CLI home/configディレクトリパス。クレデンシャル内容や環境の書き出しはしない |
| `binding` | `unknown`、操作者 `reported`、またはネイティブACP `confirmed` 識別 |
| `cli_version` | confirmed attachment中に観察されたバージョン |

欠落IDは `不明` と表示されJSONでは `null` のままです。欠けているprovider・branch・launch情報は `unknown_fields` にも列挙されます。confirmedはセッション識別についての確認であり、生プロセス・タスク完了・有効なプロバイダ認証の主張ではありません。

書き込みは排他ファイルロックの下で永続revisionを再読し、JSONを原子置換します。不正スキーマ、プロジェクト不一致、破損JSONは上書きせず拒否します。台帳は8 MiB上限内で最大5,000 runを保持し、古い識別を黙って落としません。競合writerは `ledger_busy` を受けます。中断writerが残したロックは保存され、PIDを確認して所有者が既に退去したと確かめたあと、その特定のstale lockだけを除去します。読み取り専用resolveはwriter lockを要しません。このロックは台帳書き込みを守るもので、動いているネイティブセッションの所有権にはなりません。

## 公開CLI

```sh
node dashboard/cli.mjs session-ledger list --project /workspace/project
node dashboard/cli.mjs session-ledger record --project /workspace/project \
  --task-id task-42 --label 'same screen name'
node dashboard/cli.mjs session-ledger resolve --project /workspace/project \
  --run-id run_00000000-0000-4000-8000-000000000001
```

`record` は新しいrun IDを割ります。任意の `--session-id` は操作者報告で、ネイティブattachmentがconfirmするまで `reported` のままです。同一タスクID+同一ラベルの2記録は、別のrun IDと別のネイティブセッション結合を保持します。`resolve` は正確なrun IDを要し、ラベルやタスクタイトルではありません。未知のネイティブIDは再開できません。

DSH ACP のライフサイクル検証は、ネイティブセッションを作成/再attachし識別を永続させたうえでプロセスを停止します。promptは送りません。

```sh
node dashboard/cli.mjs session-ledger start --project /workspace/project \
  --executable /absolute/path/to/original-dsh --task-id task-42
node dashboard/cli.mjs session-ledger resume --project /workspace/project \
  --executable /absolute/path/to/original-dsh --run-id ＼recorded-run-id］
```

Node entrypointの場合は `--executable /absolute/path/to/node` と `--entrypoint /absolute/path/to/bin.js` を使います。どちらも実行可能ファイルのパスで、任意フラグやシェルコマンド文字列は永続されません。resumeには、記録に一致する明示的な操作者argv、同一のCLI home/configスコープ、互換CLIバージョン、不変の作業ディレクトリ/リポジトリコンテキストが毎回要ります。ブランチをcheckoutしたり別セッションに差し替えたりしません。Detached HEADのresumeはさらに記録commitを要求します。通常ブランチは識別を変えずに進められます。読めないGitリポジトリは非Gitディレクトリと区別され、コンテキストが観察できるまでattachmentを妨げます。

pending記録はネイティブセッション作成の前に書かれます。startが失敗するか、confirm保存前に終了すると、ネイティブIDはunknownのままです。resume失敗は新しい成功attachを主張せず、前のreported/confirmed IDを保持します。CLIライフサイクル出力は、所有ACPプロセスが停止したことを明示的に報告します。

## アダプタ呼び出しと検証

`attachRecordedSession({ ledger, command, env, task_id })` は記録された識別と、生の[バージョン検証済みアダプタ](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/CLI-ADAPTERS.md) を返します。`run_id` を渡すと、永続されたネイティブセッションと作業ディレクトリを解決します。返されたアダプタの所有権は呼び出し側にあり、終了時に `adapter.stop()` を呼ぶ必要があります。prompt・CLI出力・クレデンシャル値は台帳に保存しません。他のCLI名も記録できますが、そのlaunch/resume実装は明示的に未対応です。

fixtureテストは、同一ラベル、未知ID、別クライアントプロセス、launch/home/branch/versionの変更、並行writer、破損ファイル、不変binding、失敗したネイティブ処理をカバーします。[コマンド比較と隔離した実DSH再起動](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/evidence/session-ledger.md) が試された内容、プロバイダ認証の限界を記録します。

## 実務上の注意

- resumeはargv・home/config・バージョン・cwd/branch（Detached HEADはcommit）の一致性を毎回検査します。裏で silent checkout などは起きないので、環境が変わったら新記録を作る方が早いです。
- ラベル・タスクタイトルで対話を探す使い方は不可。`resolve` はrun IDだけです。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/SESSION-LEDGER.md
