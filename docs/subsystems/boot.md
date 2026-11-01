# プロファイル管理（Boot）

bootパッケージ群は、ランチャが提供するprofileへのアクセスとプラグインマネージャを所有します。管理記録はLoader entryとbundle、market記録はプラグインマーケットの索引と検索、profile reconciliationはHMRによる再構成と再読込を扱います。永続化・reload・package操作の挙動はPlugin ManagerのREADMEが所有します。

## 管理記録

| 概念 | 意味 |
| --- | --- |
| `PluginEntryId` | 1つのLoader entryの同一性。呼び出し側は自作せず `listPlugins` から取得する |
| `PluginInfo` | module identity・実効enablement・fiber phase・任意の表示 `meta`、さらに一意な `patchId` か `readOnlyReason` を持つ |
| `BundleInfo` | bundleの現在像。`official` はプロジェクト維持の出荷optional bundleとon-demand catalog要素をinstallationと独立に示す。`availability` は読めるinstallation提供/profileパッケージまたは `missing`、`installed` はprofile依存宣言 |
| `installTarget` | on-demand要素のためのhost由来の正確なspecとversion |
| `InstallBundleOptions` | `saveExact`（`--save-exact`）、`enabled`（既定true。falseはbundle層を選ばずにinstall）、`approvedBuilds`（install前に該当パッケージへ実行許可を永続付与）、`registry`（最初に尋ねるregistry） |
| `BundleDetail` | bundleの長文説明。`{ status: 'found' }` は `origin`（`locale` / `readme`）・パッケージ内 `path`・`markdown`、見つからなければ `none` |
| `PluginRegistries` | 構成先頭registry（nullはpnpm自身の設定が指すもの）、後続fallback、pnpmが読む現在の `resolved` |
| `ChangeResult` | disk編集を示す `changed` と独立に `applied` / `restart-required` / `overridden` / `failed` を `application` として報告。任意のlocalize可能な `error`、`packageResult`（exit status・有界出力・切捨て・診断ログ・`timedOut`） |

打ち切られたrunはsignalが残したexit statusによらず `timeout` に分類されるため、install・removeは失敗として報告され、別のregistryも尋ねません。

## Market記録

Plugin Marketは `dsh-plugin-market-index` が検証する索引形式1を読みます。

| 概念 | 意味 |
| --- | --- |
| `MarketIndexSummary` | 構成索引URLと、直近成功読取のtitle/description、失敗した場合はそのerror |
| `MarketQuery` | あいまい `text`、`category`、全て揃うべき `labels`、`MarketSort`、`offset`、100までの `limit`、キャッシュを避ける `refresh`、1文書のページ継続 `fetchedAt` |
| `MarketSearchResult` | 索引URL・title・description・market `metadata`・`fetchedAt`・`entries`・合致数の `total`・`nextOffset` |
| `MarketListingEntry` | entryごとに既定installed versionとprofileでのinstallation status、各versionにinstall specと `engines.dsh` 互換評価（version免除込み） |
| `PluginDetail` | 対象の長文説明。`origin` は `locale` / `readme` / `repository`。画像は `GET /api/plugin-market/detail-file` が供するdocument id |

## Profile reconciliation

`Hmr.reconcileProfile()` の結果は次のとおりです。manifestとpatchファイルからprofileを再構成し、profile directoryやlinked packageの下でdisk変更のあった読込済みpluginを置換します。

| 項目 | 意味 |
| --- | --- |
| `warnings` | 非活性のまま残ったLoader entriesの診断 |
| `pending` / `PendingModule` | disk変更済みで旧コードが再起動まで走り続けるmodule。理由は `host-module` / `unmanaged-plugin` / `module-comparison` |
| `restartReason` | 全変更が再起動待ちになる理由: `module-comparison`（module cacheとファイルの比較ができない）または `package-moved`（移動済みpackageをruntime解決が公開できない） |

再構成では、変更moduleのevictionと対象entryの停止、`app-boot` による解決公開・世代適用・現在のファイルと構成での再開・失敗importの再施行・活性化判定が続きます。再構成が落としたmappingの下のmoduleは再度evictされるため、除去または選択解除されたpackageは戻ったときに新たにimportされます。

## 使い方（`ctx.pluginManager`）

| メソッド | 挙動 |
| --- | --- |
| `listPlugins()` | @Remote。現在プラグインと、その行がpatchから変えられない理由 |
| `setPluginEnabled(id, enabled)` | @Remote。plugin entryの望むenablementを永続し、生profileへ適用（上位overrideを含む） |
| `listBundles()` | @Remote。installed・installation提供・offline公式catalogのbundleと、選択されている非bundle名（`not-bundle` 問題として列挙） |
| `setBundleEnabled(name, enabled)` | @Remote。bundle層の選択・除去（installed dependencyは保持） |
| `readBundleDetail(name, language, options?)` | @Remote。locale `meta.detail` の指定document、無ければREADME。installedは無networkで、未installの公式bundleはnpm file CDNで読む。キャッシュなし |
| `listVersionExemptions()` / `setVersionExemption(...)` | @Remote。plugin/runtimeの正確なversion免除一覧と付与・取消（付与は `acceptRisk: true` を要求。startup専用profileでは再起動が必要） |
| `registries()` / `inspect(spec, ...)` / `listVersions(name, ...)` | @Remote。尋ねるregistry群、specの事前調査（registry名・絶対path・git・tarball）、公式bundleを除くより新しい発行version一覧（`versionListLimit` まで、最新順） |
| `updateBundle(name, version, options?)` | @Remote。対象をregistryで事前検査してから、HMR下では旧版除去→同選択で新版install（install失敗・取消なら新版を元registryから再install）。HMRなしでは新版install結果が再起動を報告 |
| `installBundle(spec, options?)` / `waitForInstall(id)` / `cancelInstall(id)` / `removeBundle(name)` | @Remote。pnpm共用実装によるinstall（GitHubは時限のconnection check、SSHでしか読めないHTTP Git URLはSSHへ切替。失敗・取消・bundle patchを持たないpackage追加は `package.json` と `pnpm-lock.yaml` を復元）、進行中installの結果回復、install停止とファイル復元待ち、bundle依存のuninstall（依存がなければ選択解除だけ） |

## 使い方（`ctx.pluginMarket` ほか）

| メソッド | 挙動 |
| --- | --- |
| `listIndexes()` / `setIndexes(urls)` | @Remote。構成索引源の列挙とSettings経由の差換え（重複URL・不正URLは拒否。`plugin-market/changed` が通達） |
| `search(url, query)` | @Remote。同時読取は1fetchを共有し、cacheTtlMsまで成功文書を再利用（`refresh` で回避）。合致と順序は文書から、installation statusとcompatibilityは毎回計算 |
| `entry(url, name)` / `readEntryDetail(...)` | 登録1件と長文説明（公開npmはnpm file CDNかpinned Git commitから。locale指定document→README→repository READMEの順。`npmFileSources` で問合せ順を指示） |
| `ctx.actionCards` ほか3サービス | card toolのkind登録、`enable_official_plugin` cardのcatalog照会、最速registry競争（結果はcache）、現在profile事実の読み取り |

## イベント

| イベント | 意味 |
| --- | --- |
| `app-boot/config-reload` | profile patchesが走るLoader木にreconcile済み。diffは持たずリスナーはentry再読取 |
| `hmr/change` | 監視ファイルにmodule・configuration handlerのどちらも無い |
| `hmr/reload` | module差換えの読込完了（差換えpluginとmodule位置） |
| `plugin-manager/changed` | マネージャ操作完了でplugins/bundles/compositionが変わった。マネージャ外のpatch適用はここに来ない |
| `plugin-manager/install-log` / `install-state` / `operation` / `update-state` | install出力のstreamとHost phase遷移（`installing` はregistryごと、`cancelling`・`applying` は1回）、操作の開始・終了、update step遷移 |
| `plugin-market/changed` | 構成索引源の変更 |

## 注意

- マーケットのpage続きは `fetchedAt` を使います。installation statusやcompatibilityは文書には無く毎回の計算です。
- `timedOut` の判定は「出力が止まったrun」と「deadlineに達したGitHub接続check」です。打切れたrunのstatusはcoerceで1として記録されます。
- 後続registryは、timeoutしていないinstallのときだけ尋ねられます。registry到達失敗の位置は `failedAt` が示します。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/boot.md
