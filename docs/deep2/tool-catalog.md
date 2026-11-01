# ツールスキーマカタログ（tool-catalog.md 深掘り）

## 導入

上流の docs/tool-catalog.md は、出荷済みプラグインが ctx.tools に提供する「モデル向きツール」
全件の name・description・JSON-Schema パラメータを収めた生成カタログです。システムプロンプトの
組み立てを通じてモデルが実際に見る形がそのまま載るため、ツールの参照表として機能します。

## 生成の仕組み（深部）

この文書は単なる AST 走査ではありません。上流の冒頭が明確に区別しています。

- 生成スクリプト gen-tool-catalog.ts は、各ツールプラグインを**実コンテキスト上でブートし**、
  ctx.tools.schemas() を読みます。これはツールスキーマが静的には決まらないためです。
  実行時に広がる enum、連結される description、config 由来の名前、生 JSON-Schema の MCP ツールなどが該当します。
- 完全性のガードが `packages/*/tool-*` を glob し、生成器のブート対象が欠けると失敗します。
  新しいツールが黙って非文書化になることを防ぐ仕組みです。
- `pnpm run verify-tool-catalog` が doc-sync の一部として生成物を検証します。手編集は禁止です。
- 対象範囲は `packages/*/tool-*` の出荷済みツールで、パッケージの **DEFAULT config** で
  ブートされます。REQUIRED で既定のない config 項目がある場合、generator が選んだ分岐と
  その記録がパッケージ節の note として残ります。
- 登録されるツール名は load-time config で変わり得ます（たとえば tool-subagent の toolName）。
  出荷上の別名（shipped aliases）はパッケージ節に記録されます。
- examples/ のデモツール（echo など）は対象外です。cordis カタログと同じ packages-only 範囲です。

## Tool Package Map

冒頭にあるマップ表は「Tool package / Model-visible names / Requires / Writes / Shipped aliases /
Deployment note」を持ちます。代表的な例を原文から拾うと次のとおりです。

- tool-bash: bash。ctx.workingDirectory・ctx.shell・ctx.shellEnv・ctx.jobs などを require。
  job registry が合成されている場合のみ、各呼び出しが ctx.jobs に登録され run_in_background
  パラメータ付きのスキーマになり、そうでなければ foreground-only のスキーマになります。
- tool-executor-ptc: run_code。モデルには run_code の1本のみを見せ、その他の能力は実行言語の
  生成 SDK で宣言します。プログラムのバインディングは投稿順に共有のガード付きツール
  パイプラインへ入り、body は maxParallelSubCalls まで重なり得ます。
- tool-ask-user: ask_user_question。既定は元の blocking 挙動で、mode: timed にすると
  foreground タイムアウトと pending result になりつつ回答可能を保てます。
- plan-mode: exit_plan_mode。plan が非アクティブでもモデル向きスキーマから外さず、
  plan-policy の変更がツールカタログの churn に波及しない設計が記載されています。
- action-cards: propose_action。登録済みカード kind の skill を読み込んだ Agent にだけ宣言されます。
- tool-present: present。deliveries は呼び出し Session に属します。

## 注意

- スキーマは DEFAULT config ベースで、config により実行時分岐する名前・パラメータは
  note の記載と合わせて読む必要があります。実運用のプロファイル設定次第で
  異なる名前や省略されたパラメータが現れます。
- 生成検証は「カタログと実態の一致」であり、ツールの挙動そのものの正しさは tools パイプライン
  や各 subsystem ページに当たってください。
- 本wikiでは docs/guide/tools.md が概説を、docs/deep/graph-atlas.md が生成カタログ群の
  位置づけを扱います。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/tool-catalog.md
