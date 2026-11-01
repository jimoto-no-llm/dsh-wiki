---
title: "MCP"
desc: "Model Context Protocol（MCP）は、外部サーバが提供するツールをモデルへ接続します。構成済みの各サーバは、キャンセル・権限検査・結果記録・画像出力対応を備えた"
cat: "subsystems"
catLabel: "サブシステム"
chars: 3465
slug: "subsystems/mcp"
---

# MCP

Model Context Protocol（MCP）は、外部サーバが提供するツールをモデルへ接続します。構成済みの各サーバは、キャンセル・権限検査・結果記録・画像出力対応を備えた普通のharnessツールを寄与します。共有ツールは呼び出し側スコープにサーバが構成されているときにリソースを発見・読み取り、サーバの指示文はloggedなsystem promptへ加わります。公式SDKがリビジョンの交渉を担います。このページはMCPパッケージ群の責任・範囲・合成の選択を扱い、サーバ構成の詳細はclient READMEが所有します。

## 構成

MCPサーバはopt-inです。目的のCordisスコープに `@deepseek-ai/dsh-mcp-client` のentryをサーバごとに1つ構成します。すべてのshipped profileはツールレジストリを供給し、共有リソースサービスを1回mountします。ユーザーが構成するのはclient entriesだけです。可視の構成サーバが無い呼び出し側には、native・PTCいずれでもMCPのpromptテキストやツールは現れません。

| 選択肢 | 構成の所有者 |
| --- | --- |
| サーバの同一性、local processまたはHTTP endpoint、credential、process環境 | client構成 |
| ツール・リソース要求のtimeout、startup失敗ポリシー、再接続 | client構成 |
| リソースの発見と読み取り | `mcp-resources`。shipped profileに含まれ、構成フィールドは無し |
| サーバ指示文のサイズ上限 | clientの `maxInstructionBytes`。system-prompt組み立てが合成で供給 |
| 権限判断と画像出力対応 | ツール実行（tools）とattachments |

プロトコル交渉はSDKの対応リビジョンに従い、リビジョンを強制する製品設定はありません。受付けるフィールドと既定はconfiguration catalogに列挙されます。

## 責任と範囲

clientはサーバごとの接続プラグインであり、harnessツールレジストリの消費者です。共有の `ctx.mcp` サービスは発行しません。MCPの操作は外部サーバが実装し、プロトコル交換はSDK所有、clientは発見されたツールをharness実行へ適応させます。

`mcp-resources` は共有リソースツールを所有し、呼び出し側スコープでプロバイダを選びます。各MCP clientは自分の接続を通じてリソース操作を供給します。スコープ内の最初のプロバイダが共有ツールを有効化し、最後が消えると共有ツールも消えます（継承プロバイダは可視のまま）。このツール登録はどの1clientからも独立です。可視のclient entryが残っている間は、接続失敗で共有リソースツールが消えることはありません。

構成された `serverName` が登録スコープ内のサーバを特定します。同一スコープで同じ名前は予約できませんが、別Agentスコープでの再利用は可能です。公開ツール名は構成されたサーバ名を含むため、別サーバの同名ツールは区別されます。名前と発見ツールは登録effectの所有で、plugin disposalが接続を閉じ寄与を除去します。nativeのCua DriverプロバイダはMCP接続を開かずにclientの結果アダプタを使えます（Desktop provider選択はcomputer-useシームの所属）。

## プロトコルと結果


stdioとStreamable HTTPの両方が、公式SDK交渉・発見・プロトコル検証・キャンセルを使います。ツール一覧の変化は旧式の通知または現代的なsubscriptionで発見を引き起こします。refreshの失敗は前のツール世代を保持し、接続回復はclient lifecycleの規則に従います。

結果アダプタは、プログラム向きの呼び出し元のためにcanonicalなMCP JSONを保持し、通常のツール内容も用意します。対応画像はattachmentsシステムを使い、非対応のリッチ内容は明示的なテキスト診断になります。ツールレジストリが依然としてポリシー失敗と差換え結果のauthorityであり、記録と最終提示の契約はtoolsが所有します。

## リソースと指示文

リソース呼び出しは明示的に構成されたサーバ名を要求します。system-prompt組み立てが使えるとき、リソースサービスはdispatcherと同じレジストリから呼び出し側可視の名前を列挙します（ツールや指示が無いサーバも含む）。共有レジストリはdispatch前に呼び出しAgentのスコープでその名を解決し、利用不可能なサーバはネットワーク要求無しで失敗します。発見と読取はon demandであり、リソースだけを公開するサーバも対象です。paginationと内容の描画はリソースパッケージが所有し、生成されたツールschemaはtool catalogにあります。

リソースプロバイダはconnection所有です。scope disposalが登録を除去し、cancelと回復はMCP clientが制御します。canonical結果は全JSONを保持し、テキスト投影はバイナリblobを説明に差換えます。返されたテキストは通常のツール履歴に入り、サーバが接続したことだけでは内容を取ってきません。

system-prompt組み立てが合成されているとき、clientは非空のサーバ指示文をscoped・server帰属のsectionとして発行します。指示文は文字通りのテキストで、構成されたサイズ上限の検査後に発行されます。差換え接続は発見が成功した後だけ指示文を発行し、指示がなければsectionを加えません。

## リソースプロバイダの型

接続プロバイダは1つの操作と元のツール実行（呼び出し元とキャンセルsignalを含む）を受け取ります。サーバ所有cursorとURIがそのまま渡ります。

| 型 | 意味 |
| --- | --- |
| `McpResourceRequest` | `resources/list` / `resources/templates/list`（`cursor?`）または `resources/read`（`uri`）の操作 |
| `McpResourceProvider` | 生きた接続世代に対して1操作を実行する `request(request, exec)`。結果はlossless JSON |

## 使い方

`ctx.mcpResources`（`McpResourceRuntime`）はscopedなリソースアクセスと、構成されたMCPサーバ群に共有される3つのツールを持ちます。

| メソッド | 挙動 |
| --- | --- |
| `register(server, provider)` | サーバ名（このscope内で一意）とconnection所有のリソース操作を登録する。このscopeにプロバイダがある限りリソースツールを露出し、この登録の解除子を返す |

## 注意

- 対応しないもの: MCP promptテンプレート、human-input誘発（elicitation）、タスクベース実行、リソースsubscription。
- リソースツールは呼び出し側から可視の構成サーバを要求し、バイナリリソースはプログラム向けデータとして残り、モデル向けにはテキスト説明が付く。
- ツール能力のないサーバは空のツール集合で接続します。接続・発見のtimeoutはSDKに従い、clientにはそちらの個別設定がありません。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/mcp.md
