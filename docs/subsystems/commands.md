# 人間コマンド

`dsh-commands`（`packages/interaction/commands`）の人間コマンドレジストリサービスは、プラグイン所有のコマンドを正確なエージェントに対して発見し、モデルメッセージを作らずに直接実行するための仕組みです。対話アダプタ（composerなどのUI）がこのレジストリを消費します。ディスパッチとライフサイクルの経緯は歴史的なコマンドAgent Noteに、合成と制限はパッケージREADMEがそれぞれ所有しています。

## 定義と入力メタデータ

`CommandDefinition` はプラグインが書く登録項目です。レジストリが検証し、detachedで凍結した実効定義を配ります。

| フィールド | 意味 |
| --- | --- |
| `definitionId` | 安定したプラグイン所有の同一性。identity基盤のクライアント振る舞いを持たない定義では欠落 |
| `name` | 先頭のスラッシュを付けない小文字のコマンド名 |
| `description` | 発見UIに使われる人間向けの概要 |
| `input` | 自由記述入力のメタデータ（任意） |
| `recordInput` | `command/run` が `rawInput` を記録するか。既定はtrue。ドメインイベントが同じペイロードを持つコマンドは重複を避けるためfalseにする |
| `handler` | 受け取ったエージェントに対して実行し、コマンドをモデルへ送らない処理 |

入力メタデータ `CommandInputDescriptor` は `hint`（入力前のplaceholder表示）と `attachments`（composer添付の併記可否）を持ちます。未設定またはfalseのときは、添付付きの呼び出しをexecutorが拒否し、対応するcomposerはディスパッチ前に提出を拒みます。宣言コマンドのhandlerは受理されたdurableブロックを受け取り、サブコマンドへの使用可否を含む残りの文法判断を自分で所有します。

## 呼び出しと結果

`CommandInvocation` には次が渡ります。

| フィールド | 意味 |
| --- | --- |
| `commandId` | この呼び出しの `command/run` イベントにすでに書き込まれたpairing id |
| `agent` | コマンドを受け取った正確なエージェント |
| `rawInput` | 解析済みコマンド名の直後から始まる全文。アダプタが届けた区切りと後続部分を保持 |
| `attachments` | 定義が `input.attachments` を宣言した場合の受理済み画像・ファイルブロック。使用はhandlerの責務 |
| `signal` | ディスパッチしたUI要求が所有する中止信号 |

結果 `CommandResult` はUIが直接描画するものであり、ツール結果でもセッションイベントでもありません。`success` は任意の `text` と、任意の `sourceEventSeq` を持ちます。`sourceEventSeq` はsuccessのみで現れ、受信セッションログ内の先行する非コマンドイベントを名指します。`command/done` が同じ参照を永続するため、クライアントは `text` を解析せずにコマンドライフサイクルとそのドメイン投影を結合できます。`error` は必須の `text` を持ちます。

## 発見と構文解析ビュー

アダプタはscope解決後のhandler無しの不変ディスクリプタを受け取り、`parseCommand()` はレジストリ解決前の `ParsedCommand`（name + rawInput）を返します。構文上有効な入力でも、利用不可能なコマンドを名指せる点に注意します。コマンドの可用性はプラグイン合成に従い、レジストリを消費するすべてのアダプタが同じ実効定義を見ます。

## 使い方

`ctx.commands`（`CommandRuntime`）のAPIは次の通りです。

| メソッド | 挙動 |
| --- | --- |
| `register(definition)` | グローバルまたは呼び出しエージェントscopedのコマンドを登録する。この定義の解除子を返す |
| `registerFileReceiptResolver(resolver)` | コマンド提出に伴うステージ済みファイル受領を解決する唯一のauthorityを登録 |
| `list(agent)` | @Remote。スコープshadowing後のname順ディスクリプタ一覧 |
| `find(agent, name)` | 対象エージェントに対するscoped shadowまたはグローバル定義を解決 |
| `execute(agent, line, submittedAttachments, signal)` | @Remote。既知コマンドを解析しモデルへ送らずに実行。結果＋ライフサイクルpairing idを返す。構文や名前が解決できないときは `undefined` |

```ts
const desc = await ctx.commands.list(agent)
const exec = await ctx.commands.execute(agent, '/plan off', [], signal)
if (exec && exec.result.kind === 'error') show(exec.result.text)
```

## 注意

- コマンドライフサイクルはログされます。handlerの呼出前に `command/run`、確定の後に `command/done` が追記されます（thrown/abortedはerror確定）。どちらもturnで包まれないログ専用の直接追記であり、通常のcheckpointでdrainされます。
- 構文や不明名のadmissionミスは何もログしません（handlerに到達していない）。`command/run` 追記失敗は実行をその場で可視に失敗させます。handler失敗経路での `command/done` 追記失敗は隔離され、handler自身のエラーが報告された失敗として残ります。
- 添付の承認検査はcomposerではなく `execute` 内で行われます。未宣言コマンドへの添付、attachment storeの欠落、画像上限超過はhandler実行前にerror結果で確定し、検証拒否は添付書込みを開始しません。
- plain contextで登録された定義はグローバルです。エージェントコンテクストのcommand-injected子を通じて登録された定義は、そのエージェントに対してグローバル定義をshadowします。
- 登録・解除で `commands/change`（emit）が通知されます。グローバル/scopedのどちらの変更も任意のUIビューに影響するため無フィルタの通知であり、オブザーバの失敗は隔離されてレジストリ変異を拒否しません。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/commands.md
