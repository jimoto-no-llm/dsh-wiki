# Cordis Fiber（cordis-api/fiber.md 深掘り）

## 導入

上流の docs/cordis-api/fiber.md は、vendor/cordis の Fiber に関する生成カタログ
（gen-cordis-catalog.ts 出力）です。fiber は「ロード済みプラグイン1インスタンス」にあたり、
ライフサイクル状態・検証済み config・登録済み effects を持ちます。ctx.fiber は現在の fiber、
ctx.effect() はその fiber への委譲です。

## ctx.effect の契約

- `ctx.effect(execute, label?)` は cleanup-aware な effect をこの fiber 上に登録します。
- execute は即座に走ります。そこから生まれた disposer は、返された disposer が呼ばれた時か
  fiber unload の時の**いずれか早い方**で、逆順に実行されます。
- disposer の二重呼び出しは no-op。fiber が既に破棄済みなら
  `CordisError('INACTIVE_EFFECT')`、execute の返りが不正な形なら TypeError が throw されます。
- label は getEffects() の診断に表示されます。戻り値は effect を teardown し完了で settle する disposer です。

## Fiber クラスの主要メンバ

原文の docstring に沿って要約します。

- uid: registry 内の一意 id。root fiber は 0、dispose 済みなら null。
- ctx: この fiber のプラグインが走る context。親 context を継承します。
- config: 次の activation のために保持される生のプラグイン入力。
- state: 現在のライフサイクル状態。遷移は internal/status イベントを発します。
- dispose: この fiber を破棄する。プラグインを unload し、cleanup 終了で settle する Promise。
- committed: 依存先の teardown を通じて保持される required implementations。
- provisions: この fiber が所有する service 実装（isolated provisions を含む）。
- inertia: 現在走行中の load/unload 遷移があればその Promise。

## fiber 上の操作

公開 API は fiber.getEffects()（登録済み effect の診断）、fiber.rawConfig と
fiber.effectiveConfig（生入力と検証・解決済みの両面）、fiber.resolveConfig(config)、
fiber.await()、fiber.restart()、fiber.update(config, noSave?) などが列挙されています。
また同文書は Effect・Disposable・EffectMeta・CordisError・ValidationError の型についても
簡単な定義と説明を続けています。ここに挙げられる CordisError は INACTIVE_EFFECT など
fiber ライフサイクル由来の失敗を担います。

各 public API には vendor/cordis/src/fiber.ts の行番号付きリンクが付いており、
生成元のシグネチャがそのまま置かれています。

## 注意

- 本ファイルも生成物です。gen-cordis-catalog の再生成対象で、手で符号や文面を編集しません。
- Fiber は「プラグイン実行1つ分の単位」にあたるため、dsh のホットリロード
  （ctx.hmr が設定とモジュールの再読込を管理する）と合わせて読むと構図が掴みやすくなります。
- 本wikiでは docs/deep/cordis-primer.md が Cordis 全体の入門を扱います。ctx の API 詳細として
  は上流の cordis-api/（context・events・service・registry・fiber・inherited）が正本です。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-api/fiber.md
