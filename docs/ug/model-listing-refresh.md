# モデル一覧が自動で更新される（v0.2.1-rc.4）

DeepSeek のアカウント・API キー各経路が、初回使用後からモデル一覧を自動更新するようになります。アイドル中も更新は続きます。

一覧キャッシュを自前で持つコードには、最新の設定と変更通知の供給が求められます。

## 更新の挙動

| 状況 | 挙動 |
| --- | --- |
| `modelsMaxAgeMs` | 既定の10分を保ち、追加のアクセスを待たずにバックグラウンド要求を予約する |
| 更新の失敗 | 最後に成功した一覧を、badge を含めて保持する |
| 更新済みモデル, ウェブ・セレクタ通知 | 更新がうまくいくと、badge のメタデータは全量置き換わる（欠落や `null` も含む）。開いている Web セレクタへ通知する |
| 更新の成功 | badge のメタデータを全量置き換える（欠落や `null` も含む）。開いている Web のセレクタへ通知する |

## 型・API の新要求

| API | 新しい要求 |
| --- | --- |
| `ModelListingCache` の消費者 | `settings` と `changed` のコールバックを供給する |
| `cache.dispose()` | Promise を返し、動作中の読み取りと自動 credential 探索が終わるまで確定しない |
| `ListedCatalog` | `badges` マップが必須 |
| `ModelSelectInjected` | `resolveText` コールバックが必須 |

## 移行の手順

1. 既存の `modelsMaxAgeMs` の値を保てば、同じ間隔の自動更新を継続します。`0` は、アクセスごとに更新し自動タイマを動かさない用途にのみ使います
2. `ModelListingCache` を自前で持つコードは、最新の経路設定を返す `settings: () => ListingSettings | undefined` を供給します
3. 同時に、カタログの消費者へ知らせる `changed: () => void` を供給します
4. 経路が一覧を追わなくなったら `settings` は `undefined` を返します
5. 所有するプラグインの掃除処理から、`cache.dispose()` を返すか await します
6. `ListedCatalog` を組み立てるコードは、badge が無いときの `badges: new Map()` を含めます
7. badge を持つときは、モデル id から `LlmModelBadge` へのマップを含めます
8. デコード済みの listing 項目から結果を作るなら、`resolveListedCatalog` に寄せられます
5. `ModelSelectInjected` を組み立てるコードは、所有する locale サービスから `resolveText: text => ctx.locale.resolveText(text)` を供給します。意図的に英語で描画するテストの替え玉は `text => typeof text === 'string' ? text : text.en` を使えます
9. 次回の更新後に、すでに開いたモデル セレクタがページ再読み込みなしで現在の badge を表示することを確認します
11. badge を消すには、その項目を取り除くか `null` にします

4. badge を消去するには、該当する項目を取り除くか、`null` を設定します

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/upgrade-guide/v0.2.1-rc.4/model-listing-refresh/guide.md
