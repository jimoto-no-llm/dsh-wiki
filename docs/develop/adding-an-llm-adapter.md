# LLM アダプタ追加ガイド

## 目的

新しいモデルプロバイダを接続する方法を確認する。リファレンス実装は `packages/llm/llm-deepseek`（直接 HTTP、`eventsource-parser` で framing した SSE）と `packages/llm/llm-pi-ai`（LLM ライブラリの wrap）。まず `packages/llm/llm/src/types.ts` の `StreamChunk` ドキュメントを読む。両アダプタが検証済みのプロトコル規約をそこに記録してある。

## 前提

- `LlmAdapter` を継承したクラスと、`ctx.llm` へのプラグイン登録を書けること。
- 秘密情報は cordis ネイティブに扱う: schemastery Config に env fallback を組み、`cordis.yml` から `!!js process.env.MY_KEY` で供給する。コード内でアドホックな key ファイルを読んではならない。

## 手順

### 形（The shape）

```ts ignore-check
class MyAdapter extends LlmAdapter {
  async * stream(options: GenerateOptions): AsyncIterable＼StreamChunk］ { … }
}

export const name = 'llm-myprovider'
export const inject = ['llm']
export const Config: z＼Config］ = z.object({ apiKey: z.string(), … })

export function apply(ctx: Context, config: Config) {
  ctx.llm.registerAdapter(['my-provider'], new MyAdapter(…))
}
```

登録はエフェクトベース（HMR-safe）。1 プロバイダ経路につき 1 アダプタで、重複は throw、複数経路の登録は all-or-nothing。`options.provider` が adapter を選び `options.model` が provider 側の model id になるため、動的 catalog アダプタは lifecycle 再設定なしで新モデルを提供できる。

### プロトコル上の義務（2 実装で検証済みの契約）

- `usage` を `finish` の **前に** 出力し、`finish` の後は **何も出力しない**。堅牢な方法は、finish／usage を provider の end-of-stream marker まで buffer してから flush すること（usage だけの trailing chunk を送る provider も吸収する）。
- tool-call の `arguments` は RAW JSON 文字列のまま端から端まで流し、断片は `argumentsDelta` で出す。provider が parse済みオブジェクトを返すなら `block-end` で re-stringify する。
- block の `index` は最初に stream で見えた順に割り当て、同じ block の delta はその index を再利用する。
- エラーは 2 通りだけ: `stream()` から THROW（transport・protocol 障害。stable code 付き `LlmError`）か、`finish {kind: 'error' | 'aborted'}` で stream を終える（provider の in-band 障害）。障害クラスごとに選び、ドキュメントに書く。
- `options.signal` を尊重する（fetch／SDK に渡す）。
- provider が対応できない `GenerateOptions` のフィールド（stop sequences のない provider への `stop` リストなど）は、黙って落とさず `LlmError(..., 'UNSUPPORTED_OPTION')` を throw する。
- provider が follow-up コールで response id・signature などの native metadata を要求するなら、最小の lossless-JSON projection を `finish.replayState` として出す。履歴再構築時に検証する。`LlmRuntime` は履歴経路と対象経路が同一 adapter instance に所有されているときだけ渡す。legal な復元（同モデル／cross-model／cross-provider）は adapter が判断する。state がないのに provider／model 名だけで native replay を推定してはならない。

### thinking モードとモデルメタデータ

provider 固有の thinking-mode toggle は adapter の Config に残す。正確なモデルメタデータは 1 つの provider-neutral capability seam を使う: `resolveModel()` を provider/model identity と任意の `context`・`reasoning` フィールドで実装し、設定済みの `defaultEffort` は存在する場合だけ宣言し、resolver の `AbortSignal` を尊重する。reasoning effort は順序付き opaque id で、provider 要求への写像は adapter の仕事。adapter の定める authoritative な選択肢リスト（対応なら adapter 定義の `off` を含む）を保ち、wire 上の綴りを出したり未対応値を丸めたりしない。id は wire 表現と一致しなくてよい。

### 実装構造

wire types・要求の serialization・transport parsing・chunk 変換・adapter クラスを別責任に保つ。参考のレイアウトは `llm-deepseek` の README。

### 検証

リポジトリの testing policy に従う。adapter coverage・実 provider チェック・published entry の要件はそこに規定されている。

## 注意

- `usage` 後出し・`finish` 后出しの provider があるため、finish／usage の buffering が推奨解との理由を理解してから実装する。
- エラーの 2 系統（throw と in-band finish）を混ぜて実装しない。消費者は両方を処理する。
- 秘密情報を回答・ログへ出さない（共通規則）。

## 出典

UPSTREAM: <https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-an-llm-adapter.md>
