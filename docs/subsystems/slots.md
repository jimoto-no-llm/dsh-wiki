# WebクライアントSlots

WebクライアントのUIを、プラグインが安全に拡張するための型付きReact合成システムです。`dsh-client-ui-slots` がReactに依存しないレジストリと型代数、`dsh-client-ui-renderer` が観測可能ソースとhookの結合・描画・Reactコンテキストの内部所有を受け持ちます。機能プラグインは `ctx.slots.register()` でUIを差し込み、他プラグインのコンポーネントをimportすることはしません。

## 宣言とライフサイクル

`SlotMap` はコンパイル時のレジストリです。パッケージはキー・カーディナリティ・スコープ・所有者props・キー付きprops・任意のスロットレベルinject面を宣言マージします。

- 子の宣言は「子キーを生かす」「親の `renderSlot` / `renderSlotChain` 呼び出しを許可する」「実行時のdispatch仕様を記録する」の3つの効果を持ちます。各宣言は1つの生存エントリが所有します。
- 未宣言のスロットへの登録や、他で既に所有されている子の宣言は、プラグイン活性化時に失敗します。
- `root` が唯一の組み込み宣言で、ui-rendererが「root キーを Cordis サービス自身で描画する」唯一のキーです。子孫はすべて宣言したエントリの `renderSlot` プロップ経由で描画されます。
- 登録と宣言はCordisのeffectライフタイクルに従います。エントリの破棄はその寄与を取り除き、宣言した子スロットを再帰的に折りたたみます。

他パッケージのスロットに寄与する機能は `ctx.slots.inject(key, callback)` を使います。コールバックは各宣言ライフタイクルごとに走り、所有者折りたたみでeffectが取り除かれ、再mount時には再度走ります。

## カーディナリティとスコープ

| 軸 | 値 | 意味 |
| --- | --- | --- |
| cardinality | `single` | 1セル。優先順の当選者が描画される（追加リストには子スロットを使う） |
| cardinality | `list` | 必須 `id` で宛先付け、`order` と登録順で順序付けされる |
| cardinality | `keyed` | 所有者が `entryKey` をdispatchし、一致セルがキー専用props付きで描画される |
| cardinality | `chain` | 各エントリの純粋 `select(owner)` の最初の非nullが勝ち、`matched` として受け取る |
| scope | `root` | rootスコープの単一コンポーネントとストア |
| scope | `session-maybe` | 周囲Providerが無くても描ける。Session値は任意 |
| scope | `session` | 解決済みProvider結合が必須で、確定したSession値を受け取る |

`priority` は `single`・`list`・`keyed` の遮蔽rank、`chain` の選挙順です。値が低いほど先に走り描画されます。通常の追加型の寄与は新しいlist `id` か未使用のkeyed `key` を選ぶべきで、既存セルの再利用は提示の置き換えが意図されない限り避けます。

## コンポーネントの入力

登録されたコンポーネントは、結合場所で組み立てられた入力を受け取ります。型をコピーせず派生させます。

| 入力 | 宣言元 | 型 |
| --- | --- | --- |
| 所有者値と標準スコープ値 | `SlotMap` 行とスコープアダプタ | `PropsRuntime＼K］` |
| 認可された子レンダラ | 登録の `children` キー | `PropsRenderSlots＼S］` |
| 共有ビュー状態のselector hook | 登録の `store` | `PropsStore＼H］` |
| 非公開データとコールバック | 登録の `inject` ファクトリ | `InjectFace<I>` |
| ローカライズされた `t` 関数 | 登録の `locale` 名前空間 | `PropsLocale＼N］` |
| chainの選択値 | `select` の結果 | `matched` |

コンポーネントは決して `ctx` を受け取りません。時点値は所有者の `renderSlot` 引数経由、共有ビュー状態は宣言されたストア経由、サービスとモデルオブジェクトは `apply` クロージャ内に留めてコールバックや観測可能ソースへ投影します。

## 使い方

1. 他パッケージの子スロットを使う場合は、`import type` で宣言だけを取り込み、実行時値のimport・再輸出はしません。
2. 他パッケージが所有するロケーションに属性寄与する機能は、新しい子スロットを宣言せず、`ctx.slots.inject()` + `ctx.slots.register()` を使います。
3. 値を渡す使い分けは、所有者props（1描画時点で既知の値）・登録 `inject`（1エントリ専用のコールバックと観測ソース）・スロットレベル `inject`（スロット所有者が管理する能力）・宣言ストア（複数エントリで共有しremountを跨ぐ状態）です。
4. 特別な `hooks` 区画だけが生のgetSnapshot/subscribeソースを許し、レンダラがそれを `useStatus(selector)` のようなhookプロップに変換して同一性で束ねます。Reactの内容はslotsで運び、注入値ではありません。

## 注意

- ビジネス状態と通信状態は所有するCordisサービスやClientモデルに置き、スロットストアは共有の「見せ方と操作」状態だけに使います。
- 观測ソースとスナップショットの同一性は変化間で安定させ、値が変わっても同じソースから再発行します。UIドメイン間ではJSON互換データとコールバックを渡します。
- `plugins.bundle.config`・`plugins.bundle.activation`・`conversation.input.activity` のような既出スロットと、Moreメニューの3つのrootスコープリストの振る舞いは出典ページに記載されています。実装の正確な契約（カーディナリティ・スコープ・現在の在住者・宣言所有者）は生成されたクライアントカタログが最終権威で、動的パッケージは実行時に `cordis_inspect what:"client"` で照会できます。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/slots.md
