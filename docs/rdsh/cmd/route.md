# rdsh route — 難易度別のモデル自動割当（設定と判定）

タスクの大きさから `easy` / `standard` / `hard` を決定的に判定し、tier ごとの provider・model・effort の割当を返すコマンドです。このコマンドは判定と設定のみで、実行中セッションのモデルは切り替えません（セッション側の適用は別の仕事です）。実行の接続は発生しません（ローカル判定）。判定材料は文字数・行数・記号密度・見積トークン数（`rdsh tokens` と同じ近似）・キーワードです。

## オプション

| サブコマンド | オプション（既定） | 説明 |
| --- | --- | --- |
| `plan` | `--text ＼text］`（なし＝stdin から判定）、`--file ＼path］`（`--text` と排他）、`--json`（off） | 判定と、tier・provider・model・effort の割当を表示 |
| `show` | `--tier ＼name］`（なし＝全 tier）、`--json`（off） | 現在の tier 別割当（`route.tiers` in `rdsh.json`）を表示 |

## 使用例

```sh
rdsh route plan --text "この関数のバグを直して"   # easy と割当を表示
rdsh route plan --file ./request.md --json        # 判定理由つきの JSON
cat prompt.txt | rdsh route plan                  # stdin から判定
rdsh route show                                   # 現在の tier 別割当
rdsh settings set route.tiers.hard.model claude-opus-4-6
rdsh features on route                            # 既定は OFF
```

## 既定値・注意

- `route.enabled` は既定 `false` です。`rdsh.json` に `route` 節が無ければ従来動作のままです（既定の割当は `rdsh route show` で報告されるだけで使われません）。
- 既定の割当は3 tier とも同じ検証済みモデル ID で、effort だけが異なります（`easy=low` / `standard=medium` / `hard=high`）。provider・model は設定で自由に変えられます（例: `route.tiers.hard.provider`・`route.tiers.hard.model`・`route.tiers.hard.effort`）。
- effort は `off` / `minimal` / `low` / `medium` / `high` / `xhigh` / `max` のどれか。`rdsh settings set` は未知の level を拒否し、手編集の `rdsh.json` の未知の level は `off`（推論を付けない）として読みます。
- provider や model が未指定の tier は「割当なし」であり、割当を出さずに拒否します（半分だけ設定された tier を静かなフォールバックにしません）。
- 判定基準の閾値: `easy` は 400 文字以下・8行以下・150トークン以下・記号密度 40/100 未満・hard キーワード無しを**すべて**満たすときだけ。`hard` は hard キーワードを含む・4000文字超・1500トークン超の**いずれか**。それ以外は `standard` です。
- キーワードは両側小文字化・全角 ASCII を半角へ畳んで部分一致します。内蔵の hard キーワード一覧のほか、`route.rules.keywords_hard` で差し替え可能（空リストは一つもマッチしない）です。`route.rules.max_chars_for_easy` も変えられます（50–100000）。他の閾値は構造定義（コード）側に固定されたポリシーであり、設定ではありません。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「使い方 ＞ 難易度別のモデル自動割当（`rdsh route`）」節）
- docs: [docs/MODEL-ROUTING.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/MODEL-ROUTING.md)（DSH 側は選択を変えない旨の注意節）、[docs/ROUTE.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/ROUTE.md)

### 実装（src/route.rs・src/main.rs）から補足

- 閾値は定数として明示された `src/route.rs`（`Thresholds::default`）の実装で、境界はユニットテストで固定です。
- `rdsh route plan` は他コマンドと同じ `$DSH_HOME/rdsh.json` 読み込みを通るため、破損した設定は静かに既定値で割当を続けずに失敗します（fail closed）。
