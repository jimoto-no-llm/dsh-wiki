---
title: "難易度に基づくモデルルーティング（`rdsh route`）"
desc: "DeepSeek Harnessはセッション開始時にプロバイダ・モデル・推論effortを1組だけ選びます。依頼の難しさを推定せず、自動フォールバックや繰り返し切替もありません（d"
cat: "rdsh-dw"
catLabel: "rustdsh 調査"
chars: 4798
slug: "rdsh/dw/route"
---

# 難易度に基づくモデルルーティング（`rdsh route`）

DeepSeek Harnessはセッション開始時にプロバイダ・モデル・推論effortを1組だけ選びます。依頼の難しさを推定せず、自動フォールバックや繰り返し切替もありません（`docs/MODEL-ROUTING.md` 明示的に許された変更節）。 `rdsh route` はrdsh側の対処です。依頼を `easy`/`standard`/`hard` に分類する決定論的ヒューリスティックと、分類が割り当てる層ごとの provider/model/effort を提供します。

このコマンドは**設定と判定だけ**です。使用されるものを報告します。割り当てをセッションへ適用することは別の作業です（後述の限界参照）。

## コマンド

```sh
rdsh route plan --text "この関数のバグを直して"     # 文字列を分類
rdsh route plan --file ./request.md                # ファイルを分類
cat prompt.txt | rdsh route plan                    # stdinを分類（標準）
rdsh route plan --text "..." --json                 # 機械可読プラン
rdsh route show                                     # 現在の割り当て、全層
rdsh route show --tier hard --json                  # 1層をJSONで
```

`rdsh route plan` は`$DSH_HOME/rdsh.json` を他コマンドと同じ方法で読むため、破損した設定ファイルは既定値で黙って振り分けるのではなく、落とす(elapsed: fail closed)挙動になります。出力には使用したファイル名が付きます。

## 層と割り当て

割り当ては `rdsh.json`（schema 1）の `route` 部に置きます。

```json
{
  "route": {
    "schema": 1,
    "enabled": false,
    "tiers": {
      "easy":     { "provider": "openai-codex", "model": "gpt-5.6-sol", "effort": "low" },
      "standard": { "provider": "openai-codex", "model": "gpt-5.6-sol", "effort": "medium" },
      "hard":     { "provider": "openai-codex", "model": "gpt-5.6-sol", "effort": "high" }
    },
    "rules": { "max_chars_for_easy": 400, "keywords_hard": ["refactor", "設計", "..."] }
  }
}
```

ルーティングは既定OFF（`route.enabled: false`）。`route` 部を持たない設定ファイルは従来の振る舞いを完全に保ちます。3層の既定は同一モデルで `effort` だけが違います。これは意図的です。プロバイダが提供しないモデルIDを既定で名指すと、改善のつもりのセッションを壊すため、このビルドで検証できるIDだけが使われます。各層は自由に指せられます。

```sh
rdsh settings set route.tiers.easy.model     gpt-5.6-sol
rdsh settings set route.tiers.hard.provider  anthropic
rdsh settings set route.tiers.hard.model     claude-opus-4-6
rdsh settings set route.tiers.hard.effort    high
rdsh features on route
```

`effort` は `off`/`minimal`/`low`/`medium`/`high`/`xhigh`/`max` から選びます。`rdsh settings set` は未知のレベルを拒否し、プロバイダに退けられる値を転送しません。手で編集した `rdsh.json` の未知のレベルは `off`（推論省略）と読みます。provider/modelを持たない層は割り当てでは**なく**、空選択のセッション起動より先にエンジンが拒否します。半分だけ設定した層は静かなフォールバックではなく目に見えるエラーです。

## 層の決まり方

決定論的で入力はサイズ・句読点密度・キーワードの3種です。閾値は `src/route.rs`（`Thresholds::default`）の名前付き定数で、`rdsh route plan` で印字され、正確な境界を主張するunit testで固定されます。

| シグナル | 定数 | 効果 |
| --- | --- | --- |
| 文字数 | `max_chars_for_easy` = 400 | 超えると `easy` 以外 |
| 文字数 | `max_chars_for_standard` = 4000 | 超えると `hard` |
| 推定トークン | `max_tokens_for_easy` = 150 | 超えると `easy` 以外 |
| 推定トークン | `max_tokens_for_standard` = 1500 | 超えると `hard` |
| 空行以外の行数 | `max_lines_for_easy` = 8 | 超えると `easy` 以外 |
| 100文字あたり記号密度 | `symbol_density_permille` = 40 | 以上で `easy` 以外 |
| キーワード | `rules.keywords_hard` | 1件一致でサイズに関係なく `hard` |

`easy` は**すべて**が必要: 400文字以下、非空行8行以下、推定150トークン以下、記号密度は40/100未満、hardキーワード無し。`hard` は**いずれか**1つで足ります: hardキーワード、4,000文字超、推定1,500トークン超。他は `standard` です。

トークン推定は `rdsh tokens`（`estimate_tokens`）を再利用し、ASCII 4文字≒1トークン、非ASCIIスカラは1文字1トークン（日本語は1文字につき1トークン）です。

キーワードは両側で大文字小文字を考えず一致し、全角ASCII（`ＲＥＦＡＣＴＯＲ`）は一致前に半角へ折り返します。一致は両方向の単純substringで、`migrations` は `migration` に、`refactoring` は `refactor` に一致します。内蔵の英語リストはrefactor / migrate / redesign / rewrite / architecture / security / concurrency / performance 系、日本語は 設計 / 調査 / 全て / 全部 / 網羅 / 移行 / 再設計 / リファクタ / 最適化 / 脆弱性 / 並行 / 排他 です。

リストは語彙に合わせて差し換えられ、空リストはキーワード照合を無効化します（全件一致にはなりません）。

```sh
rdsh settings set route.rules.keywords_hard "deploy,本番,本番環境"
rdsh settings set route.rules.max_chars_for_easy 250
```

`rdsh route plan --json` は測定した指標、一致キーワード、規則適用順の理由を報告するので、意外な層もコードを読まずに説明できます。

## 限界

- **生きてるセッションは変えません。** `rdsh route` は分類と報告。harness設定の上書きや、別モデルでのセッション起動はここにはなく、セッション開始時の消費者は別の作業です。
- **ヒューリスティックはサイズの当て推量で、難しさのではない。**短い依頼が最も難しい仕事（「この設計を直して」は200行の推論）になり得て、長い依頼が些細です。キーワードリストが唯一の意味シグナルでsubstring照合であり、意図の推定ではありません。
- **層は保証ではない。** `provider`/`model` は書かれた通りに通され、そのプロバイダがそのモデルを提供するか、クレデンシャルもあるか、実際の課金はこのコマンドの外です。harnessが知らないモデルIDは従来の場所で失敗します。
- **プロバイダに接しません。**分類は局所で、コマンドはオフラインで動きます。
- **閾値は固定**です。可変は `max_chars_for_easy` とキーワードリストに限り、他の定数はコンパイル時ポリシーです。意外な分類は設定ではなくコード変更で直します。

## 設定キー

| キー | 意味 |
| --- | --- |
| `route.enabled` | ルーティングを有効にするか（既定 `false`） |
| `route.tiers.<easy/standard/hard>.provider` | 層のプロバイダ |
| `route.tiers.<easy/standard/hard>.model` | 層のモデル |
| `route.tiers.<easy/standard/hard>.effort` | `off`/`minimal`/`low`/`medium`/`high`/`xhigh`/`max` |
| `route.rules.max_chars_for_easy` | easyの文字数上限（50–100000） |
| `route.rules.keywords_hard` | hardを意味するカンマ/改行区切りのキーワード |

`rdsh settings unset route` は部の全既定へ戻します。無関係な `rdsh settings set` では部は書かれたままです。

## 実務上の注意

- `route.enabled` は既定falseのため、`tiers` を書いただけでは働きません。`rdsh features on route` の有効化が必要です。
- 3層の既定は同一モデルです。最初はモデル差でなく effort の差だけから始めるのが安全です。hard層のモデル差し替えは、プロバイダが実際に提供するIDで検証してからにします。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/ROUTE.md
