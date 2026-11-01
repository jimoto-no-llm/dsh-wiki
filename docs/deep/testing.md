# 開発のテスト

このリポジトリがどうテストするかを階層別に示し、緑のスイートが意味を保つための規則をまとめます。コマンド自体はルートのAGENTS.mdが所有し、根拠はリンクされたAgent Noteに置かれます。

## テストの階層

| 階層 | コマンド | 内容 |
| --- | --- | --- |
| Unit | `pnpm run test` | パッケージ・exampleの `tests/**` 配下と、リポジトリスクリプトの `scripts/**/*.spec.ts` 配下をvitestで実行。テストは対象コード範囲のそばに置く。すべてのレジストリにHMR安全テスト（貢献fiberを破棄し、後始末を検証）を用意。エッジケース・エラー経路・イベント順序・並行性の競合や、契約回帰のための恒久テストが好まれる |
| Coverage gate | `pnpm run test:coverage` | ゲート実行。packages/*/*/src でファイル単位100%を要求。未被覆の行は補うべき欠けたテストでなく、削除すべきdead codeであることが多い。行被覆は必要条件であって十分条件ではない。pwshが無いホストでは pwsh-local のexecutorスイートが自身をskipし、vitest.config.ts がそのファイルを免除するため、pwsh無しのホストも緑を保てる。CIランナーはpwshを持ち、全体基準を強制する |
| Real-API e2e | `pnpm run test:e2e` | キー付きで実APIに当てるテスト。DeepSeekモデルに加え、各プロバイダが自分のキー（`EXA_API_KEY`・`PERPLEXITY_API_KEY`など）で管理するスモーク。キーが無い場合、各スイートは自身をskipするためキーレスのCIも緑のまま |
| Owner-local expected output | `pnpm run test:expected` | キーレスで、録画セッション往復なしの、組み立て済みCLI/process期待値。driverは tests/expected/ のそばの `*.expected.e2e.ts` を使い、CIはビルト済みexportを実行する。パッケージ・スクリプト期待値は test を、ブラウザ期待値は test:web を使う |
| Performance benchmarks | `pnpm run test:bench` | 必須のLinux PRゲート。benchmarks/ がユーザー経路のゲートを束ねる。ライブラリとworkerをビルドし、時間指定コードはTSXではなくplain Nodeの下で走る。合成入力が時間・ヒープ・スケーリングの予算を強制する。パッケージローカルの `.perf.ts` は診断どまり |
| Snapshot | `pnpm run test:snapshot` | 最上位シナリオの録画済み親世代がuser入力とモデル再生を供給し、期待される永続結果として振る舞う。親ファイル名は `session[.vN].jsonl`、子の役割名は `session.＼ordinal］[.vN].jsonl`。`snapshot.yml` がプロファイル・構成とヘッダクラス・録画ポリシー・例外的な再生や入力メタデータ・ワークスペースの事実を宣言する。型付きトークンが親子の同一性関係を保持し、ヘッダpinだけがprompt/schemaのsidecarを所有する。変異シナリオは `workspace.expected/` の木全体を独立に比較する |
| Web browser snapshot | `pnpm run test:web` | 必須のLinux PRゲート。プラグインCSSをビルドした後、Chromiumでセッション駆動の `snapshots/web/` とUIだけの `apps/web/tests/expected/` を比較。モデル/推論ピッカーはWebKitでも走る。CIは読み取り専用の `DSH_SNAPSHOT=replay` を強制し、record/refreshはローカル用で、diffは全件レビューする |

セッションfixtureはヘッダとpayloadを保留しますが、bodyのsequence・time envelopeは省き、replayがそれらを合成します。replay・record・refreshは親子それぞれの役割の最高世代を選択します。現行fixtureはファイル名とヘッダに現行のwriterフォーマットを使い、1イベント1行で、compactなアシスタントストリームを埋め込みます。歴史fixtureはリリース時表現を保持し、明示的な sessionFormat の所有者が移行被覆を保ちます。後継フォーマットの追加はフォーマット版追加のcookbookを参照してください。

## specの実行方法

forkedされたworkerは複数のspecファイルを同時に走らせ、coverageゲートは自身のジョブ内で他のゲートと並行して分割されます。self-hostedランナーは1台のホストと1つのvolumeを共有します。隔離されるのはプロセスだけで、ポート・決定論的なパス・外部namespace・継承された子は対象外です。獲得したリソースはteardownを通じて自分で所有します。単独でだけ通るspecは、非安定ランナーではなくテストの欠陥です。CIテスト信頼性のskillが割り当て・復元・同期・タイムアウト予算・platform・teardownの規則と、確率的失敗の分類手順を所有します。

## with-key政策

real-APIテストに上限を設けないのが方針です。キー無しテストは配管を証明するだけで、実モデルに向き合うエージェントが動くのは with-key 実行だけが証明します。ファイル書き込みのprompt、複数ターンの会話、ツール利用、途中キャンセルを被覆します。特に価値が高いのは、出荷済みの dsh プロファイルを起動してプロンプトを1つ送り、世界の状態を確認するスモークテストで、ユニットは緑なのに製品が壊れているclassを捕まえます。self-skipはシークレット無しのCIとキーレスの貢献者が止まらないための仕組みであって、コストの節約を示唆するものではありません。プロファイルレベルの統合テストは apps/cli/tests/profiles/ の下に、パッケージ固有の構成はパッケージのテストに置きます。

## mockより実装を優先する

モックは高価または非決定的な境界（LLMアダプタ・ネットワーク・時計）だけに限定し、下流はすべて実装のまま保ちます。手作りの代用品が証明するのは、橋がバイトを運ぶことだけです。Bridgeツールコールのテストは、scriptedなmockモデルを背後に、実のツールレジストリとパイプラインを保ちます（`makeBridgeHarness()` がloop・session store・tool registry・JSONL永続化をマウントし、`MockAdapter` を唯一のmockとします）。

回復テストはchunkの前後失敗をstepで分け、失敗したchunkがメッセージもツール副作用も派生させないことを証明します。枯渇・キャンセル・ポリシー合成・永続化・状態・ネットワークカウント・接続を閉じるidleタイムアウト・出荷Loader構成を被覆します。

## 自己申告ではなく世界を検証する

e2eの検証は、コマンド再実行か外部からのファイル再読みです。エージェント自身の出力へのキーワード調査は、不正をするエージェントに合格を許します。未変更のファイルはバイト一致を検証します。e2eテストは自分のリソースを所有し、テスト内で生成して afterEach で破棄します（失敗・リトライ・タイムアウトでも）。共有fixtureは別の名前のe2eファイルではなく plain な tests/harness.ts に置きます（他のspecのimportはdescribeを再登録し、実API呼び出しを重複させます）。

## 正しい入口経路のテスト

- 製品から見えるプラグインは、非unitのREAL構成テストを要求します。手作りの `ctx.plugin(...)` スイートでは不十分で、testだけの `cordis.yml` をLoaderとアプリ/プロセスを通して起動し、外部サービスか非決定的入力だけをmockし、モデルから見えるrequest/log・永続状態・ユーザーに見える出力を検証します。
- ガードは回帰が実際に失敗させてこそ機能します。inject を持たないプラグイン（bundle/composition系）では、requiredなnamed exportがdefault exportに置き換えられてもLoader smokeは緑のままです。そこへ明示的な不正検査（モジュールのdefaultプロパティ不在の主張）と `unwrapExports` 往復のassertionを書き入れ、実際に回帰を導入して赤になること・revertして直ることを証明します。
- 正しい入口経路とは published artifact のこと。package の bin はビルド済みの `lib/bin.js` をplain Nodeで走らせ、tsxが隠してしまう失敗（settle race、モジュール解決、呑み込まれたload失敗）を顕在化させます。非indexの実行時入口（Nodeプログラムbootstrapの `lib/process.js`）や、バンドル間で共有されるsingletonモジュールも同じです。ビルド済み成果物のsmokeを緑に保ち、本当に欠けている設定が非ゼロexitで終わることを断言します。

## 解決はソース平面だけで行う

すべてのvitest configはvite-tsconfig-pathsを `tsconfig.base.json` に向けるため、bareなワークスペースimportは `src` に解決されます。package exports を経由してビルド済み `lib/` に解決されることはありません。そこに古い成果物があると、singletonモジュールの第2コピーがloadされます。ビルト成果物は明示的な消費に限ります。

## サブプロセスの起動モード

- CIとビルドを持つtestレーンは、共有のdual-mode launcher経由で、ビルド済み `lib/` からすべてのプロファイル・Cordis設定サブプロセスを走らせます。手書きのtsx import注入は書きません。
- プロトコルやOSのfixtureのうち、Cordisを読み込まないものは、tsxもルートのpaths mapも使わず、Nodeで直接erasableな`.ts`ファイルとして走ります。
- 検体がsource-path解決であるテストだけが src を選べる。その契約をテストの中に明記します。

## snapshotテストを要求するとき

非自明なモデル・プロトコル・人間に見える変更はすべて、同一PR内でキーレスの録画セッションシナリオを追加または更新します。パッケージ・e2e・mock only・論拠の証拠では、組み立て済みtranscriptの代わりになりません。headless・SDK・ACP・Web録画は `snapshots/session/`・`snapshots/sdk/`・`snapshots/acp/`・`snapshots/web/` の下に置きます。録画セッションで駆動されない期待出力は、所有するapp・パッケージ・スクリプトの `tests/expected/` に置き、snapshot接尾辞を使いません。ローカルのsession-snapshotパッケージが共有storage規則とプロファイルアダプタを所有します。agent-loop・session-lifecycle・`SessionEventMap` の変更はSDK投影の両方を更新します（TypeScriptは `snapshots/sdk/`、Python-runtimeは専用CIが管理）。新しいcapability seamやライフサイクル・transcriptの変種は、計画時に必要な各階層を明示します。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/testing.md