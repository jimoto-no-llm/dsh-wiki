# Capability Seams とコアサービス（capability-seams.md 深掘り）

## 導入

上流の docs/capability-seams.md は scripts/gen-doc-graphs.ts が生成する文書で、DeepSeek Harness 内の
全 Cordis サービスを一枚の mermaid グラフと一覧表に整理したものです。一覧性の高い地図ですが、
読み方を押さえると「どのサービスが差し替え可能な接点で、どのサービスが固定の中枢か」を
一覧で判断できる設計資料になります。

## サービスの分類

上流では各サービスを「core spine service / swappable capability seam / bundle・composition point /
standalone service」に分けています。

- **core（中枢）**: 差し替えを前提としない中核。ctx.hmr（モジュールと設定の watcher、アプリ変更は
  同一キュー共有とアプリケーションファイルロック待ち）、ctx.pluginManager、ctx.pluginMarket、
  ctx.profileContext、ctx.connection（ブラウザ認証と共有 HTTP 送出、API アダプタが
  エンドポイントとストリームを登録）、ctx.headlessStartup、ctx.cuaAccess、ctx.officeToPdf、
  ctx.fileUploads、ctx.sessionLogDeepSeek など。
- **seam（縫合点）**: 実装パッケージを差し替え可能な接点。ctx.llm が典型で、llm-deepseek・
  llm-pi-ai・llm-replay がアダプタを登録し、agent-loop と compaction-basic が
  プロバイダ中立のストリームサービスを呼びます。ctx.workingDirectory、ctx.mcpResources、
  ctx.attachments、ctx.browserUse、ctx.computerUse、ctx.forge、ctx.worktrees も seam です。
- **service（単独サービス）**: 実装差し替えを前提としない独立した機能。ctx.actionCards、
  ctx.pluginRecommendations、ctx.cotTranslation、ctx.translator、ctx.forgeSession、
  ctx.forgePanel など。

## 表の読み方

一覧表は各行に「ctx key / Role / Owner / Implementations / Direct consumers / Companion plugins / Note」を持ちます。読む順序の目安は次のとおりです。

1. Role で seam か core かを見る。seam なら Implementations 列が差し替え候補の全体像になる。
2. Owner はサービス宣言を所有するパッケージ。実装と消費者はこれを前提にする。
3. Direct consumers はそのサービスを直接 ctx から取得するパッケージ群。
4. Note に責務の要約と設計判断がある。たとえば ctx.browserUse は「1 provider-owned name per service
   instance」で、共有サービスにブラウザ操作の共通 API は存在しない、と書かれています。
   ctx.computerUse も同様に共通アクション API・実行時選択・Session workflow lock を持たない旨が Note にあります。

## 具体例

- ctx.translator は service。Google または Bing の要求を解決し、実験結果の保存はアクティブな
  Session writer で共有します。消費者に ctx.cotTranslation（推論翻訳）がつきます。
- ctx.forge は seam。実装に experimental-forge-github を持ち、remote/変更要求 URL の対応付け、
  head branch からの変更要求検索、バッチでの状態取得を担い、1つの変更要求の watcher は1つの
  ポーリングループを共有します。
- ctx.attachments は seam。attachment-local が実装で、Host は Session イベントの前に承認済み画像を
  commit し、プロバイダアダプタは承認済み durable 参照をプロバイダネイティブな content に解決します。
- ctx.workingDirectory は seam で実装は自身のみ。1つの Session projection が実効実行ディレクトリを
  所有し、filesystem が変更を検証、元の metadata と write 権限は固定のまま、と Note にあります。

## 注意

- 本ファイルは生成物です。手で編集すべきではなく、pnpm run gen-doc-graphs で再生成されます。
- Note の記述は行の要約です。詳細は各パッケージの README と subsystem ページに当たってください。
- 本wikiでは docs/deep/graph-atlas.md と docs/deep/cordis-primer.md あたりが隣接領域になります。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.md
