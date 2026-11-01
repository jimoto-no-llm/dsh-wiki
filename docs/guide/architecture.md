# アーキテクチャの全体像

Dshの構成単位と実行の主体、そして能力（capability）のつなぎ目を概観します。

## Cordisとプラグイン

Dshの下支えはCordisというフレームワークです。プラグインが共有コンテキストへサービス・型付きイベント・可逆な効果を寄与し、モデルアダプタ、ツールレジストリ、セッションログ、エージェントループ自体まですべてがプラグインとして構成されるため、どれも設定から差し替え可能です。特権的な修正対象の本体はなく、他のプラグインの横に1つマウントするのが拡張の方法で、登録はプラグインのアンロード時に巻き戻る「効果」です。

## プロファイルとバンドル

- **プロファイル**はHarnessホームに保存される名前付きの構成で、積むバンドル、ツリー外プラグイン、独自の `cordis.patch.yml` を持ちます。テンプレートとして `web`・`headless`・`sdk`・`sdk-minimal`・`acp` が同梱します。
- **バンドル**はCordis設定行とそれがマウントするコードの配布形式で、挿入物はより上位の層からパッチ可能に保たれます。`dsh.profile` がプロファイルのバンドル並びを、`dsh.bundle` がバンドルのパッチファイルを宣言します。
- 共有の最初の層は `dsh-base` で、モデルアダプタ・ツール・永続化・サンドボックスと承認ポリシー・設定・認証情報・テレメトリを担います。`dsh-web-app` がブラウザアプリ、`dsh-headless` がサーバなしの1回実行、`dsh-sdk-app` がSDK JSON-RPCサーバ、`dsh-acp-app` が自動化用ACPサーバを加えます。例外は `dsh-sdk-minimal` で、1バンドルが完全で明示的なSDKツリーを持ち、`dsh-base` を適用しません。
- レイヤーの適用順は、空のエントリリストに向かって: プロファイルの順序付きバンドル → プロファイルの `cordis.patch.yml` → ホームパッチ → `--patch` 上書き。パッチは行idを狙って設定全体を置き換えるか、新行を挿入します。

実際に起動するツリーは `dsh --profile web --dump-config` で確認でき、表示された行は自分のパッチで置き換えられます。

## 起動と各種アプリ

サポートされるNodeアプリは名前付き `dsh` プロファイルで起動します（`dsh --profile ＼name］` または `dsh ＼name］`）。`plugin` は管理コマンド名なので、同名のプロファイルには `--profile plugin` が要ります。前提のverifyスクリプトは Nodeアプリの経路が dsh を迂回することを拒否します。Python SDKも同じ応用構成で、ランタイムwheelが通常の dsh CLI を同梱し、既定でHarnessホームを明示して `dsh --profile sdk` を起動します。Electronのデスクトップアプリは署名付きリソースとしてdsh実行ランタイムを同梱し、予約済みの `$DSH_HOME/profiles/desktop` を所有します。ホストはNodeモードで起動し、ウィンドウはパッケージ済みWeb資産を即座に読み込みます。

## 中核パッケージとイベント

| パッケージ | 担当 | ctxキー |
|---|---|---|
| core/session | 追加専用の SessionEvent ログとメモリ内ストア | ctx.sessions |
| core/system-prompt | プロンプト節とツールスキーマの組み立て | ctx.systemPrompt |
| core/tools | スコープ付きツールレジストリと保護付き実行パイプライン | ctx.tools |
| core/agent / core/agent-loop | Agentインターフェース、生存中レジストリ、既定ドライバ | ctx.agents / ctx.agentLoop |
| core/scope | エージェントごとにスコープ化される登録primitive | ライブラリ(キーなし) |
| llm/llm | メッセージとストリームの語彙とアダプタ接続部 | ctx.llm |

イベントが拡張点です。**セッションイベント**はログへ追加され `session/event` で配信される恒久的な事実、**エージェントイベント**（agent/*）は生存中Agentの入力箱・手順・状態・要求を運ぶ、**能力イベント**（fs/*・tools/*・telemetry/*）はループをimportせずにポリシーとアダプタを接続部へ付けます。ターンの構造は「step = 1プロンプト要求＋それが呼ぶツール」「turn = 0個以上のstep」で、`turn/*`・`step/*`・`tool/*` 等は恒久セッションイベント、`agent/pre-step`・`agent/request`・`llm/stream` と3つの `tools/*` はリスナが next() を呼ぶwaterfall、`agent/turn-stopping` はserialでnextを持たせません。

## 能力（capability）のつなぎ目

サービスは、中核の背骨サービス・差し替え可能な能力接合・バンドル/構成点・独立サービスのいずれかに分けられます。能力接合グラフは、サービス宣言を所有するパッケージ・既知の実装パッケージ・直接消費するパッケージを示します。接合は、`ctx.pluginMarket`（プラグイン市の索引読み取り）や `ctx.mcpResources`（スコープ限定MCPリソース）、`ctx.browserUse` / `ctx.computerUse`（プロバイダ登録）など、宣言側のサービス名と `ctx.<名前>` のキーが対で書かれます。

## 出典

- [docs/architecture.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)
- [docs/capability-seams.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.md)
