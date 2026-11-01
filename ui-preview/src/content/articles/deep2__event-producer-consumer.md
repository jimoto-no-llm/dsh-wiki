---
title: "イベント生成元・消費者マトリクス（event-producer-consumer.md 深掘り）"
desc: "上流の docs/event-producer-consumer.md は Harness 保有イベントの一覧で、「どのパッケージがどの"
cat: "deep2"
catLabel: "深掘り 2"
chars: 2291
slug: "deep2/event-producer-consumer"
---

# イベント生成元・消費者マトリクス（event-producer-consumer.md 深掘り）

## 導入

上流の docs/event-producer-consumer.md は Harness 保有イベントの一覧で、「どのパッケージがどの
イベントを送出し、どのパッケージが受け取るか」を表で示します。イベントとパッケージは多対多のため、
一つの大きな依存グラフではなく表形式が選ばれています。

## マトリクスの構造

表の列は「Event / Mode / Declared in / Dispatchers / Listeners」です。

- **Declared in**: イベント型が宣言されたパッケージのソース位置（行番号つきのパッケージ参照）。
- **Dispatchers**: 送出側のパッケージと、その送出方式が括弧書きで付きます。上流の表では
  `(emit)`・`(serial)`・`(waterfall)`・`(events.dispatch)` が見られます。`events.dispatch` は
  ctx.emit と区別されて列挙された送出経路で、Receiver・イベント名の型には subagent の
  lifecycle containment のように、意図的に ctx.emit をバイパスする含意配置点も含まれます。
- **Listeners**: 受け取り側のパッケージ群。agent/created のように20個近くのリスナーが付く広いイベントもあります。

## 傾向

- **agent/**: agent-loop と core/agent が主に送出します。agent/pre-step は waterfall で、
  action-cards、agent-instructions、compaction-basic、goal-round-driver、hooks、liveshare、
  plan-mode、repeat-tool-reminder、session-checkpoint-policy、time-context、tmux-context、tool-skill など
  多数の介入点が合流します。agent/inbox/inserted・claimed・discarded は inbox の順序を emit で伝えます。
- agent/created と agent/turn-stopping は serial。順序が意味を持ちます。
- agent/request-error も waterfall で、compaction-basic、compaction-image-offload、llm-retry が受けます。
- **api-session/**: session-controller が送出し、消費者は一貫して remotes です。UI 側への
  サブスクライブ面としてまとめられています。
- approval/request は waterfall で、acp、remotes、server が受けます。
- cordis/dynamic-package・dynamic-retract・inspect-query は cordis-host-runner から remotes へ流れます。
- agent/error は emit で acp・deepseek-account・goal-round-driver・headless・server・
  session-controller・session-telemetry・subagent に届きます。障害通知の広がりを確認する読み方の例です。
- compaction/summary-error は waterfall で compaction-basic から compaction-image-offload へ、
  connection/request は waterfall でリスナー無しに宣言されているなど、宣言のみで運用される
  イベントも表から読み取れます。

## ctx.emit を通らない配下

上流の冒頭で、Receiver・イベント名の型は ctx.emit を意図的にバイパスする発報点
（例: subagent の lifecycle containment）も含むと明記されています。またアプリケーション系リスナーはこの
パッケージ・マトリクスの外にあり、Desktop Host が plugin-manager/operation を
installOperationDiagnostics で購読して有界レコードを shell へ転送する例が合わせて載っています。

## 注意

- 表形式のため全体俯瞰は難しく、目的のイベント名やパッケージ名で絞り込む読み方が前提です。
- Listeners はパッケージ単位です。個別リスナーの場所は subsystem ページやソースで確認する必要があります。
- 本wikiでは docs/deep/agent-lifecycle.md が関連領域です。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/event-producer-consumer.md
