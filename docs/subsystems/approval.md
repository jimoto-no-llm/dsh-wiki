# ユーザー承認

`dsh-user-approval` パッケージのユーザー承認シームは、「この特定のアクションを進めてよいか」という1つの問いに答えるための部品です。要求と結果の共有語彙、`ctx.approval` ディスパッチサービス、`approval/request` のアンサワー滝（waterfall）、ログ専用の監査ペア、セッション単位の `ask` / `never` ポリシーを所有します。UIチャネルは人間のアンサワーを提供し、ACP自動化ブリッジは自身のエージェント向けに1回限りの機械判断を提供します。`dsh-tools` や `dsh-tool-bash` などの呼び出し側は閉じた結果集合だけを消費し、`allowed-once` 以外では失敗閉鎖（fail-closed）で落とします。UI側の具象はユーザーquestion対応システム（user-questions）が別 paradise として説明します。

## 識別と結果

すべての要求には新しいIDが発行されます。ブランド付きIDは監査イベント同士を結び付けるためのものであり、承認IDはツール呼び出しやセッションのIDと互換でも置換可能でもありません。

| 概念 | 意味 |
| --- | --- |
| `ApprovalRequestId` | 1回の承認要求につき新規発行されるbranded id。`approval/asked` と `approval/decided` の監査ペアを結合する |
| `ApprovalOutcome` | 閉じた結果集合。`allowed-once` / `rejected` / `cancelled` / `unavailable` の4値 |
| `allowed-once` | 尋ねられたアクションそのものだけを許可する1回限りのgrant。唯一の許可値 |
| fail-closed | アンサワーが欠落・非所有・例外・語彙外だった場合、門を開けずに `unavailable` で落とす |

## セッション別ポリシー

`ApprovalPolicy` は、対話型アンサワーが動き出す前に何をすべきかを決めます。

| 値 | 挙動 |
| --- | --- |
| `ask`（既定） | 合成されたアンサワー連鎖へ委譲する。誰も答えなければ fail-closed の `unavailable` |
| `never` | 誰にも尋ねない。すべての要求を決定論的に `rejected` とする。CIや無人実行の厳格なheadless立ち位置 |

実効値はセッションログ内の最後の `approval/policy` イベントで解決され、無い場合はサービス設定にフォールバックします。読み取りは `ctx.approval.effectivePolicy(session)`、書込みは `setApprovalPolicy(session, policy)` が唯一の経路で、リプレイ時に上書きを再構成します。

## 承認要求の構造

`ApprovalRequest` はルーティングと監査に十分な粒度で対象を特定します。ツール引数は意図的に省略されます。アンサワーは `callId` 経由ですでにストリーム済みのツール呼び出しにプロンプトを結び付けるため、引数のコピーが2つ生まれてずれる余地がありません。

| フィールド | 意味 |
| --- | --- |
| `agent` | 承認を求められるエージェント。質問をルートし、監査イベントをそのセッションログに記す |
| `toolName` | 扱いの対象ツール名。表示と監査に使用 |
| `callId` | askerが持つ対象のツール呼び出しID。すでに表示された呼び出しにプロンプトを添える |
| `reason` | 依頼者の人間向け説明（監査テキスト） |
| `displayReason` | 表示側へ渡す要求者所有のロケール文字列（任意） |
| `signal` | 中止信号。abortすると即座に `cancelled` で確定し、あとから届いた保留中アンサワーの答えは捨てられる |

## ディスパッチと監査

`ctx.approval.request(req)` は要求セッションがturnを開いていることを要求し、`approval/asked` を追記し、結果を1つ取得し、対応する `approval/decided` を追記して解決します。`never` ポリシーは滝ディスパッチの前にサービス内部で強制されるため、後から `prepend` で登録したアンサワーでも迂回できません。アンサワーは自分が所有する場合だけ結果を返し、それ以外は `next()` で委譲します。最初の答えだけが単一の決定スロットを占有します。

監査イベントはログ専用で、モデルtranscriptには入りません。モデルから見える振る舞いは、呼び出し側が導出したツール結果と現在のランタイムコンテクストスナップショットの2つです。

## 使い方

`ctx.approval`（`ApprovalService`）のAPIは次の通りです。

| メソッド | 挙動 |
| --- | --- |
| `request(req)` | 合成アンサワーに1つの決定を問い合わせる。turn未開放のaskは追記前に拒否。監査追記の確定に失敗した失敗はreject |
| `setPolicy(agent, policy)` | 生きているエージェントのポリシーを切替え、次のモデルステップへの移行を予約。初期化時は直接 `setApprovalPolicy` を使う |
| `overrideOf(session)` | 設定既定を適用せずにセッション上書きだけを読む。無ければ `undefined` |
| `effectivePolicy(session)` | 上書きと設定既定を含む実効値を読む |

`approval/request` イベントはwaterfall形式で、scopeフィルタ（`@deepseek-ai/dsh-scope`）付きのディスパッチではagent限定リスナーはそのagentの要求だけを受信します。要求側の例です。

```ts
const outcome = await ctx.approval.request({
  agent,
  toolName: 'bash',
  callId,
  reason: 'シェル実行の許可を求める',
  signal
})
if (outcome !== 'allowed-once') throw new Error('fail-closed: ' + outcome)
```

## 注意

- abort信号は要求を `cancelled` に確定させる。欠落・非所有・throwingアンサワーは `unavailable`（fail-closed）となり、語彙外の返り値も `unavailable` に正規化される。
- 監査ペアはdurableログのcommit/replay境界内に閉じ込められるため、turnが開いていないaskは何も追記せずに拒否される。
- 監査イベントがどちらも確定できない致命的な失敗は、未記録の決定を返して対を壊さないためrejectになる。確定後のオブザーバ失敗はセッションが隔離する。
- `setPolicy` による変更はランタイムコンテクストスナップショットにも現れる。既存の `system/message` ノードは保持し、履歴の後に完全スナップショットを追記する。
- cordis-surface は `scripts/gen-cordis-catalog.ts` で生成され、`pnpm run verify-cordis-catalog` で新しさが検証されている。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/approval.md
