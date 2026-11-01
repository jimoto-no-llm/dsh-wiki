# コンパクション

会話が長くなったとき、選択した範囲を1つの要約ノードに置き換えて文脈を節約する仕組みです。bash例に倣うcapability seamの分割で、抽象seam（`dsh-compaction`、`ctx.compaction`）・バックエンド実装（たとえば `dsh-compaction-basic`。トークナイザー型でもテンプレート型でも同じ面を実装できる）・人間が呼ぶコンシューマ（`dsh-command-compact`）とに分かれます。バッシュと違い、この面は動詞の対象がエージェント所有の `Session` であり、永続する要約イベントが `ContentBlock` 語彙を使う点で `dsh-session` / `dsh-llm` に依存します。

## セッションイベントの3点

3つの `compaction/*` イベントはすべてログ専用（log-only）で、会話面（surface）には参加しません。

| イベント | payload | 役割 |
| --- | --- | --- |
| `compaction/start` | `turn` | ログ記録されたロックの取得。数値は未完の自動 turn、`null` は手動の独走試行 |
| `compaction/summary` | summary／rawOutput?／llmStreamCall?／shadowedRange／shadowedSeqs／shadowedTokenCount／provider/model 等 | 安全な要約投影、provider出力とusage、代えられた表面境界、影トークンの推定 |
| `compaction/end` | `turn, error?` | 同一の数値 or null の所有者でロックを解放。不受理なら `error` |

ロックは操作全体を挟みます。`compaction/start` を一番に差し込み，要約化、`compaction/summary` 記録、置換後 `user/message` の着地を経て最後に `compaction/end`。最後にロックを外すのは、操作途中のクラッシュを「偽の完了」でなく「検知可能な孤立ロック」（対にならない `compaction/start`）に変えるためです。要約そのものは別の `user/message`（`surfaceOp.replace` を伴う）に載り、要約compactionが実行する唯一のsurface変化です。

## マーカーの独立

マーカー対は処理の排他的容器ではありません。手動のstartとendの間に無関係のidle注入が入ることがあり、手動経路は自分が選んだ位置範囲だけを再検証するので、注入された文脈は置換の チェックポイント後にも生きます。生存中の対にならないstartは全ての入口を塞ぎます。ただしより新しい `session/end-seed` の前にある unmatching startは、以前のライフサイクルのざんしょ（旧事実）として無視されます。

## C `CompactionResult` とトリガー

| フィールド | 意味 |
| --- | --- |
| `compactionId` | コンパクションの全 lifecycleに共有される安定識別 |
| `sourceCommandId` | 手動実行なら、それを起こした人間コマンド |
| `startSeq` / `summarySeq` / `endSeq` | 付加された3イベントのseq |
| `summary` | バックエンドが作った要約のコンテンツブロック |
| `shadowedRange` | 代えられた表面境界の行位置ペア（`start`が`end`より大きくなり得る位置スパン） |
| `shadowedSeqs` | 影に入ったノードのseq（surface順、権威ある集合） |
| `shadowedTokenCount` | 影の内容の推定トークン数 |

自動ポリシーの依頼理由 `CompactionTrigger` は `pressure`（普通の圧迫）と `context-overflow`（プロバイダが確認した文脈超過。通常のしきい値未満でも強制的に取り得る）の2つです。

## 使い方

1. 自動ポリシーは `compactIfNeeded(agent, trigger, signal)` で依頼します。安全にcompactできる範囲がなければ `null` を返します（1つの巨大な保持単位や要求封筒は文面compactionでは修復できません）。
2. 圧迫未満のときは `compactNow(agent, signal, sourceCommandId?)` で有用な履歴の圧縮を起てられます。無駄書込なしに `null` を返す場合も、試行は log 上で独立した `turn: null` の対として残ります。閉じた試行はあとで並ぶプロンプトの述定元になる前に flush します。
3. 明示的な包括範囲を強制的に要約するには `compactRegion(start, end, agent, signal?)` を使います。両端は assistant ツール呼び出しと結果の対が割れない「均衡」が求められ、前面位置による指定です（可視seqは非単調になり得ます）。
4. 置換後のユーザーメッセージは `compactCheckpointSource(compactionId, sourceCommandId?)` をその出力元に使う契約で、コードとificador一致し得るようになります。

## ツール結果の見積

`ctx.toolResultPruner` は、現在のツール結果surfaceノードへの決定論的な head / middle / tail の剪定です。テキストの計上は Unicode コードポイント（UTF-16ではなく）で行われ、surrogate対を割ることはないが grapheme 群は割れる、という目論でセルルスlicingされます。ノードの置換は、影のノードを示す `compaction/prune` シャドー価格イベントをすぐ前に差し込むため、純粋な消費者はノード単位のstateなしで差し引きできます。

## 画像オフロード

`compaction-image-offload` は `image/offload` の宣言と純粋なメッセージ投影を所有します。対象は現在の入力ノードのseq `seq` と、その不変メッセージ内のゼロ始まり深さ優先の画像番号列 `imageIndexes` で、ノードとメッセージの同一性を保存し `surfaceOp` を持ちません。復旧方針・登録・分離再生はパッケージREADMEが所有します。

## 3つの入口の対比

| 入口 | 起点動機 | 挙動 |
| --- | --- | --- |
| `compactIfNeeded` | 自動ポリシー（pressure / context-overflow） | 安全な範囲がなければ無駄書込なしの null |
| `compactNow` | 大いなる待機セッションの有用な圧縮（圧迫未満でも） | 試行のmarker対を単独の turn として記録 |
| `compactRegion` | 人間が指名した包括範囲 | 両端のバランス検査で、cue置換の正当性を守る |

## 注意

- 要約要求が失敗したときは `compaction/summary-error` waterfall が復旧に使えます。listenerは進捗があったときだけtrueを返し、失敗が回復不能なら `next()` で次へ回します。決定は後つの失敗や取消にも残ります。
- 画像オフロード（`compaction-image-offload` の `image/offload`）は、現在の入力ノードと、そのノード内の深さ優先の画像出現位置を特定した管理対象です。recovery政策やregistrationはそのパッケージREADMEを正とします。
- `shadowedRange` は seq の数値区間ではなく位置スパンです。前の置換が新しい高位seqの要約ノードを古い範囲位置に落とすので、権威は `shadowedSeqs` です。
- 手動の `compactNow` は期待されるbusy・取り消し・範囲変更・要約 / 縮小失敗・修正段階・persist失敗に `ManualCompactionError` を投げ、失敗の試行もログに残ります。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/compaction.md