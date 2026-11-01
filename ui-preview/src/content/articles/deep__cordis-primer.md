---
title: "Cordisの基礎"
desc: "CordisはDeepSeek Harnessの下にvendoredされたプラグインフレームワークです。この入門は、サブシステムページの生成済みサービス・イベントリファレンスを読む"
cat: "deep"
catLabel: "深掘り"
chars: 2773
slug: "deep/cordis-primer"
---

# Cordisの基礎

CordisはDeepSeek Harnessの下にvendoredされたプラグインフレームワークです。この入門は、サブシステムページの生成済みサービス・イベントリファレンスを読む前に、ハーネスのプラグイン作者が知っておくべきCordisの考えを伝えます。同じ考えは手を動かして学べる形でCordisのチュートリアルが歩きます。vendoredソースと同期手順は vendor/README.md に置かれます。

## Cordisの5つの考え

- **プラグインはServiceを実装するオブジェクトです。** 省略可能な `inject` と `apply(ctx)` フィールドを持つ関数か、Cordisが現在のcontextへライフサイクルごとマウントする `Service` 派生クラスで書けます。
- **contextはサービスの倉庫です。** serviceは `ctx.tools`・`ctx.llm`・`ctx.sessions` のような安定した `ctx.＼key］` をcontextから請求します。他のプラグインは具象実装をimportする代わりに、keyでサービスを探します。
- **`inject`でサービス依存を宣言します。** 必要なサービスを名指しするプラグインは、そのサービスが存在するまで待つため、読み込み順序が手動のboot順序でなくサービス要件として表現されます。
- **型付きイベントで通信します。** serviceはTypeScript宣言マージでイベント名を宣言し、リスナーが観測か、包み込みか、扇出か、順序実行か、最初のbailで停止かに応じて、emit・waterfall・parallel・serial・bailでdispatchします。
- **登録は可逆的なeffectです。** プロンプトセクション・ツールスキーマ・アダプタ・プロバイダ・リスナーは `ctx.effect()` や `ctx.on()` 経由で設置されるため、reloadとteardownは予測可能に巻き戻ります。

## Dispatchモード

すべてのイベントは次のどれかのdispatchモードを持ち、対応するメソッドでだけdispatchできます。

| モード | 待つか | ディスパッチ順 | 戻り値 |
| --- | --- | --- | --- |
| `emit` | 待たない | リスナーが登録順に観測 | なし |
| `waterfall` | 待たない | リスナーが登録順に観測 | あり |
| `parallel` | 待つ | 全リスナーが並行に観測 | なし |
| `serial` | 待つ | リスナーが登録順に観測 | あり |
| `bail` | 待たない | bailするリスナーまで登録順に観測 | あり |

dispatchモードはイベントのpublic契約の一部です。新規のハーネスイベントは @mode タグで文書化するため、生成されたカタログが宣言とdispatch箇所を照合できます。

## Cordisのwaterfall意味論

`ctx.waterfall`はaround-middlewareです。リスナーは(...args, next)を受け取り、nextを通じて処理をつなぎます。`next()`を呼ぶと、包まれうる結果を次のserviceへ委譲します。`next()`なしで返ると短絡します。値は`next()`の戻り値を通じて伝播します。

協調的なリスナーは通常、共有のリクエストや決定オブジェクトを変形してから委譲します。リスナーが結果を完全に差し替えることを選ぶこともあり、そのとき下流のリスナーは差し替え後の結果だけを見ます。prepend: true は、リスナーが通常の登録より先に走る必要があるときに限ります。

単一決定のイベントでは、短絡は設計です。決定を所有するポリシーリスナーはnext()なしで返り、注釈や観測だけのリスナーは委譲します。

## Loader設定

`@deepseek-ai/cordis-plugin-include` は `!!js` をexpressionノードとして解析します。Loaderは、宣言されたinjectionが活性化した後、そのプラグインcontext（`ctx.serviceName`）に対してエントリの config を補間し、disabled フィールドを、mount判断の時点ごとにloader contextに対して補間します。Includeはネストされた行のexpressionを、目標がactivationされるまで保持します。他のエントリメタデータはliteralのままです。環境がプラグインを選ぶときはoverlayを使います。

## 実務上の規則

挙動はプラグインの中にencapsulateします。ツールパイプラインのイベントは `ctx.tools` へ、モデルストリーミングは `ctx.llm` へ、生きているエージェントの連携は `ctx.agents` に属します。割り込みとpolicyにはイベントを優先し、直接的な能力呼び出しにはserviceメソッドを優先します。

すべての登録はdisposerを持つべきです。`ctx.effect()` から1つを返すか、同じことを代わりにやってくれるCordisのヘルパを使います。teardown順序が重要な場合は、関連する作業を1つのeffectにまとめれば、disposalが意図した順序で巻き戻ります。

## 注意

- サービスの `ctx.＼key］` と語彙型を所有する定義、実装（provider）、呼び出し側（consumer）の3役割で1つの能力（capability seam）を構成する考え方は、用語集の「seam」を参照してください。ハーネスでは `dsh-shell`（定義）・`dsh-bash-local` / `dsh-bash-sandbox`（実装）・`dsh-tool-bash`（消費者）がその典型です。
- イベントのdispatchモードはイベント契約の一部です。既存イベントのdispatchモードを変えるのは契約の変更であり、生成カタログとdispatch箇所の照合を崩します。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-primer.md