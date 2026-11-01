---
title: "ポストモーテム（postmortem/ 深掘り）"
desc: "上流の docs/postmortem/ は障害の後事録です。バグが本来あるべきでない場所（実際のユーザ、"
cat: "deep2"
catLabel: "深掘り 2"
chars: 3778
slug: "deep2/postmortems"
---

# ポストモーテム（postmortem/ 深掘り）

## 導入

上流の docs/postmortem/ は障害の後事録です。バグが本来あるべきでない場所（実際のユーザ、
マージ済み PR、リリース）へ届いた事例を取り上げ、「一行の修正」より「安全網がなぜすり抜けたか」を
深掘って記録します。Agent Note（設計決断の記録）とは役割の異なる、後ろ向きの失敗記録です。

## 書き起こす基準

README は、次の3つが揃ったときにポストモーテムを書くとしています。

- **巧妙さ（subtle）**: 機構が非自明で、注意深いエンジニアでも地道な再解明を強いられる。
- **系統性（systemic）**: すり抜けの原因が一発の typo ではなく、テスト・ツール・規約の隙間。
- **再発見の高コスト**: 実際のデバッグ時間を消費し、再発時にも同じ額のコスト。

形式としては、壊れたもの・仕組み・安全網のすり抜け原因・追加された保障（テスト、AGENTS.md 規則、
ADR）へのリンクを記載し、冒頭に忙しい読者が30秒で読める Executive summary を置いてから
詳細の Summary / Timeline / Root cause / Guardrails が続きます。

## 記録された4事例

- **0001 ACP server crashed on connect（resolved、PR #41 で修正）**: `export default` で
  plugin の `inject` が Loader に棄てられ、traced な optional-service lookup が shadow
  boundary を跨げない別問題も重なり、実エディタ（Zed）の接続で session/new と session/load が
  即死しました。178 全件緑・行カバレッジ100%の単体テストを見逃した理由は、実際のロードと
  サービス解決の経路を通っていない手動マウントでした。guardrail は keyless な
  real-Loader カバレッジと、plugin export と optional-service access に対する
  パッケージ規則です。
- **0002 Filesystem snapshot tools were permanently disabled（resolved）**: ACP 例が
  `disabled: !!js ...` で filesystem プラグインを条件付きで有効化しようとした例です。
  Cordis の !!js 補間は plugin の `config` の内側のみ有効で、Entry の `disabled` は
  補間されないまま真偽オブジェクトが常に真になり、filesystem stack が全モードで
  常に無効でした。未登録ツールの UNKNOWN_TOOL 結果ですら、スナップショットの refresh が
  新しい期待出力として受けてしまうことで、リグレッションの決定的な再生が成功として通りました。
  guardrail は fs.cordis.yml という明示的な full-access オーバレイ、Loader entry メタデータの
  式ノード拒否（verify-cordis-config）、UNKNOWN_TOOL 結果の拒否（dsh-session-snapshot）です。
  事故の教訓には、runtime の permission preset が Sandbox state を替えても
  filesystem stack を mounts / confine できない、という境界も書かれています。
- **0003 Web agent validated a replacement server instead of its current GUI（resolved）**:
  GUI 改修をした Web エージェントが自 URL・プロセス・更新モードを知らず、素の Vite の
  HTTP 200 を成功と見なし（window.__DSH_BOOT__ が無く白画面）、更に元のページのいる
  3081 を検査せずに 3334 の代替サーバへ検証先を移しました。guardrail は、ログの
  app:web-surface prompt に正本的な loopback URL を出すこと、$DSH_WEB_URL のこと、
  standalone な Vite serve を構成時に拒否すること、production refresh と development HMR を
  外部状態に対して検証する階層化テスト群、PR 証拠に原 3081 セッションのスクリーンショットと
  実モデル GUI 前後実行を残すこと、などの複数層です。
- **0004 Landlock partial-enforcement notice misclassified child failures（resolved）**:
  古い Landlock ABI が全子プロセスの前に出す informational な
  `landlock-run: partial enforcement (older Landlock ABI)` に対し、harness が
  「広い landlock-run: プレフィックス＋子の非零 exit」という近似で runner 失敗と判別した
  事故です。ripgrep の no-match exit 1 などの正規の結果が SANDBOX_UNAVAILABLE として
  面に出ました。guardrail は status-gated fatal 証拠と informational 行の正確な排除を含む
  RunnerFailureRule、foreground/background で証拠を返す統一分類器、packaged ripgrep を
  ctx.subprocess 経由に移す filesystem search です。

## 共通の教訓

各事例の Lessons と README の形式規定から、幅広く共通するのは次の趣旨です。

- 公開 API の契約は両側で守られ、内部の複数表現は、消費者が越える境界の一箇所で
  正規化されるべきです。
- 構文的に受容された YAML の式・値でも、評価される対象の field を正確に文書化し、
  実行時の受道を検証します。
- スナップショット等の決定的な出力一致は fixture の生産であり正しさの判定ではありません。
  意味的に不可能な状態（未登録のツールが production で呼ばれるなど）は、期待出力とは
  独立した assert で落とします。
- 子プロセスの帰属判定は独立した証拠の連結として組み上げ、共有の前置列1本を根拠にしません。

## 注意

- ポストモーテムは DSH 開発の工程を反映したもので、番号が振られ随時追加されます。
  最新の号は上流の docs/postmortem/ ディレクトリに当たってください。
- 本wikiでは docs/deep/testing.md と docs/deep2/defensive-patterns.md が隣接します。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/postmortem/README.md
UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/postmortem/0001-acp-default-export-drops-inject.md
UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/postmortem/0002-js-expression-disabled-filesystem-tools.md
UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/postmortem/0003-web-agent-gui-feedback-loop.md
UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/postmortem/0004-landlock-partial-notice-misclassified-child-failures.md
