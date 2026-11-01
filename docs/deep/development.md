# 開発の流れ

セットアップ手順が新しいコントリビュータを前提条件から確認済みチェックアウトまで連れて行き、後続のコントリビュータのリファレンスがリポジトリ配置・日常ワークフロー・CI構成を扱います。設計の根拠と実装詳細は、リンクされたAgent Noteとスクリプトに置かれます。

## セットアップ手順

### 前提条件

- Node.js 24.9 以降。CIは24.9・最新の24・26を網羅します。
- Node.js TypeScript型ストリッピングが有効であること。ビルドスクリプトはtsdownのnative config loaderで `tsdown.config.ts` を読むため、NODE_OPTIONSに `--no-experimental-strip-types` がある、またはNodeビルドがTypeScript非対応だと失敗します。`pnpm run build` が最初にこれを検査して原因を名指します。
- Corepack対応のpnpm。`package.json` が pnpm@11.28.5 を固定します。
- Git 2.26 以降。フックセットアップがGitのworktree固有設定を扱う拡張を有効化します。
- 任意：Web・headless・ACP自動化デモとreal-API e2eテストのためのDeepSeek APIキー。

### WindowsとWSL 2

Windowsではnativeツールか、Linux環境のためのWSL 2を使えます。WSL 2はLinux挙動の確認や、native依存のコンパイル・filesystem権限がWindows開発を阻むときのLinuxツールチェーンに有用ですが、省略可能です。チェックアウト・導入済み依存・ツールチェーンは同じOS環境に置きます。WSL 2ではチェックアウトをLinux filesystemに、native WindowsツールではWindows filesystemに置きます。2つのfilesystemをまたぐアクセスは、Git・依存導入・ビルドのようなI/O集中操作の負荷になります。環境ごとに依存を別々に導入します。nativeバイナリやリンクがOSごとに異なるためです。テスト結果は実行した環境だけに適用され、Windows固有の挙動はnative Windows検証を別途必要とします。

### 初回セットアップ

pnpmはstrictなsymlink linkerを使うため、宣言されていない依存はhoistingを当てにするのでなく失敗します。依存のビルドスクリプトは `pnpm-workspace.yaml` で明示的に許可リストに入れます。リポジトリルートから依存を導入します。

```sh
pnpm install
```

導入には `scripts/install-lefthook.mjs` を通したworktreeローカルのLefthookフック設置が含まれます。DevTools frontendは固定されたnpmソースパッケージとViteからローカルでコンパイルされ、依存導入後のそのビルドにネットワークアクセスもブラウザ導入も要りません。キャッシュから依存を復元した場合などフックが不足するときは、手動で配置します。

```sh
node scripts/install-lefthook.mjs
```

既存のGit設定をwrapperが拒む、またはstale lockを報告するときは、worktreeメタデータをさり気なく編集するのでなく、diagnosticとリンクされたAgent Noteに従います。チェックアウトを移した後は、所有するパスを再生成するためwrapperを再実行します。この後、新しいクローンで1回 typecheck を実行します。

```sh
pnpm run typecheck
```

このtypecheckが成功したらセットアップ完了です。

## contributorリファレンス：TypeScriptプロジェクト配置

リポジトリは分離されたHostとClientのaggregateを使います。普通のパッケージはちょうど1つのaggregateに登録され、Hostパッケージは `tsconfig.host.json`、Clientパッケージは `tsconfig.client.json` に入ります。3つのパッケージ（`host/webserver`・`compaction/compaction`・`typert/registry`）は両方のaggregateから参照される共有リーフで、各側が同じソースを型検査します。

HostとClientが2つのaggregateプログラムのままである理由は、両側が同じキーでcordisの `Context` インターフェイスに異なるサービスを宣言マージするからで、1つのプログラムが両方のマージを見ると衝突します。衝突は `ts.Program` の内部だけに現れ、モジュール解決では起きません。そこから3つの規範が従います。

- `tsconfig.base.json` に include か files を追加しない。すべての拡張パッケージへ漏れ、paths facadeの全域一致の範囲を狭めます。
- リポジトリ全体の `ts.Program` を組み立てるスクリプトは、ルートsolutionではなく `tsconfig.host.json` か `tsconfig.client.json` を明示的にseedします。両aggregateを1プログラムへflat化すると `Context` のマージが衝突するためです。
- 新規パッケージはちょうど1つのaggregateに登録する。両方のリーフ設定を運ぶのは上記の分割パッケージだけです。Node loader入口とbrowser入口の両方を持つことはパッケージを分割する理由になりません。普通のClientプラグインはClientビルドフェーズで両方の実行時成果物を生みます。

Host・Clientでtsconfigを分割するのは7パッケージです。api/remotes・api/gateway・api/session-controller・api/workspace-controller・client/connection・session-query/session-log-export・experimental/liveshare-protocol。Host・Clientのaggregate型検査は8 GiBのNode旧世代ヒープ上限で実行されます。これはコンパイラごとの上限で、並行するビルドstepには追加のメモリが要ります。`pnpm run build:official --serial` はビルドstepを重ならないようにします。

## ビルドと検査コマンド

成果物の順序は次の通りです。

```sh
pnpm run build:native-system
pnpm exec tsx scripts/generate-typert.ts
tsc -b <tsconfig.host.json の参照>
tsdown --env.DSH_BUILD_FACE host
pnpm --filter @deepseek-ai/dsh-desktop run bundle
tsc -b <tsconfig.client.json の参照>
tsdown --env.DSH_BUILD_FACE client
pnpm run build:web
```

状況に応じてコマンドを選びます。パッケージソースを反復実行する成果物が要るときは `build:artifacts`（dev:web と dev:desktop は起動前に実行）。テスト・スクリプト・benchmarks・websiteコードの型検査は、最新の成果物の後に `build:check`（パッケージソースを変えた場合は先に `build:artifacts` を再実行）。TypeScript作業の完了宣言には `build:check` または `build`。CIビルドレーンと同じ完全検証は `build`。Web・Desktop成果物なしの型検査は `typecheck`。lintや文書コードブロック検査は `lint`・`doc-typecheck`（各コマンドが host-contracts を自分で準備します）。

ビルド済み成果物を消費する関連ローカル検査がある場合、まず1回 `pnpm run build` します。

ビルドと build:artifacts は、ルートパッケージのバージョン、7文字のソースcommit、そしてGitがローカル変更を報告するときはdirtyマーカーを埋め込みます。build:official はCI・リリース成果物ビルドのクロスプラットフォームなローカル等価物で、ローカルのdirtyマーカーを省きます。`build --profile local` は明示的にローカルclient brandingを選び、リポジトリのバージョン・commit・dirtyメタデータを保ちます。成功したビルドは、正確な公開値をVite出力と動的clientバンドルに結び付けるgitignore済み記録を書き、リリースpackとビルトWebテストは、記録の欠落や、その後の部分ビルドで変わった成果物を拒否します。

### 環境変数

実DeepSeekアダプタとキー裏付けのエージェントデモは、環境変数かリポジトリルートのgitignore済み `.env` から資格情報を読みます。DEEPSEEK_API_KEY=sk-... が必須で、DEEPSEEK_BASE_URL は省略可能で既定は公開APIです。実資格情報をコミットしてはいけません。キー無しでは、real-API e2eスイートは自身をskipします。

### Git統合

lefthookは速いローカル検査点として設定されます。

- `pre-commit` はstagedなpairing記録をstagedなowner blobに照らして検証し、プロジェクト非依存のOxlintプロファイルでstagedファイルを検査し、1回の有界retryでOxlint修正を適用し、staged diffの空白誤りを検査し、pi-aiプロバイダメタデータを検査し、vendorマニフェスト警備を走らせます。
- `pre-merge-commit` は、Gitが自動マージコミットを作る前に同じindex裏付けのpairing検査を実行します。
- `pre-push` は `pnpm run typecheck` を実行し、bundleを伴わないTypert契約生成をClient TypeScript検査の前に行い、両aggregateを検査します。

フックは意図的にテスト・snapshot・文書検査・ビルド・hygieneを走らせません。コントリビュータは変更された挙動に合う検査群を選び、それを1回実行します。網羅的な被覆・ビルト成果物smoke・Nodeバージョン互換マトリクスはCIが所有します。vendorコード編集の前に vendor/README.md を、pi-ai依存やジェネレータ変更の後はパッケージREADMEのプロバイダメタデータ更新手順を確認してください。包括的なローカルゲート集合は check:all で選択できますが、Gitフックとは独立しており、エージェントへの指示でもありません。

## CIゲート

キーレスのCIワークフローは独立ゲートを広いレーンに纏め、サポートされたNodeバージョン上で小さな互換性シグナルを走らせます。成果物の消費者はレーン内の1ビルドを待ちます。coverageの分割は、platformとランナープール単位のファイルtimingsを再利用してworker上限内のバランスを取ります。native Windowsレーンは専用のCI Windowsワークフロー、Python検査は専用のCI Pythonワークフローで、独立に再実行できます。必須benchmarkはGitHub提供の標準Linuxランナーで別々に走ります。real-APIワークフローは設定されたworker上限で test:e2e を実行します。

## 日常コマンドとデモ実行

ルートのcontributor指示が共通コマンドを要約し、`package.json` と `scripts/run-gates.ts` が現行のスクリプト・ゲート目録を所有します。変更範囲を被覆する最小検査群を選びます。文書変更は `doc-sync`。パッケージの公開挙動の変更は、所有するREADMEやJSDocも更新します。ビルト成果物検査は `build` を先に要求します。

ソースチェックアウトのデモは、先にリポジトリのビルドを別途実行してから使います（コマンドは前節と同じ `pnpm run build`）。1回で完結するheadlessコーディングエージェントは、環境変数DEEPSEEK_API_KEY（またはリポジトリルートの .env）が必要で、`pnpm dsh --profile headless "<概要指示>"` の形で起動します。PTCモードのデモは、同一headlessプロファイルにコード表示を付けたもので、`pnpm run demo:ptc` で走ります。

## アプリケーションコマンド

WebとDesktopは1組のコマンド対を共有します。start:* は先行のビルド成果物を走らせ、dev:* は先にbuild:artifactsしてから走らせます。Webはさらに、clientバンドルをソース編集時に再ビルドし続けます。そのHostはソースから走る一方、ブラウザはビルド済みバンドルを読み込むからです。

```sh
pnpm run start:web       # ビルド済みWebをソースlauncher経由で提供（pnpm dsh web と同じ起動）
pnpm run dev:web         # ビルド・提供し、ソース編集に合わせclientバンドルを再ビルド
pnpm run start:desktop   # ビルド済みDesktopを起動
pnpm run dev:desktop     # ビルドしてからDesktopを起動
```

引数はWebコマンドの後に dsh web へ届きます（`pnpm run dev:web --no-open --port 3081`）。dev:web は既存成果物の木を再利用する `--skip-build` と、別に起動されたサーバのそばで再ビルドwatcherだけを走らせる `--no-serve` も受け付けます。Webの両コマンドは通常のHarness homeを使い、Desktopのコマンドは隔離された開発homeを使います。ルートのMakefileは `make web`・`make dev-web` などの同じコマンドを名付け、`ARGS` を転送します。

## TODOマーカー

既知の課題を示す3つのコメントタグを緊急性順に使います。 FIXME は新しいリリースを止めるべき課題で、レビュー者が明示的に同意しない限り、開いたまま出荷しません。TODO は近いうちに直すべき課題、XXX はいつか直せばよい最低優先度の課題です。緊急性に合うタグを選び、コードを見る誰もがリリースを止める課題と将来直す課題を区別できるようにします。

## 型定義の原本転記（ts type-equiv）

サブシステムページでは、元のJSDocとともにソース等価の宣言を転記し、読者が正確な型定義と契約を同じ場所で見られるようにします。転記がソース変更でずれないよう、通常の `ts` フェンスの代わりに `ts type-equiv` フェンスで囲み、`scripts/type-equiv.manifest.json` にソースファイルとsymbolを登録します。`pnpm run verify-type-equiv`（doc-syncの一部）はTypeScriptパーサ経由で、ソースからsymbolの宣言と添付JSDocを抽出し、ブロックが両方に一致することを検証します。実装本体を実装詳細のカタログに入れないクラスは `ts public-api` フェンスと `"projection": "public-api"` を設定します。検査されたprojectionはpublicフィールド・コンストラクタ・accessor・メソッドと元のクラス・メンバーJSDocを保留し、本体とprivate・protectedメンバーを省きます。比較はwhitespaceと非JSDocコメントを無視しますが、メンバー文書を含む元の全JSDocを要求します。ゲートは文書・symbol・projectionの1対1対応をprimary blockとmanifestの間に強制し、zh.mdのペアブロックは、追跡fenceの列全体がbyte一致と順序一致のときだけ、接尾辞なしの兄弟のエントリを再利用します。文書化した宣言やJSDocを変えるとゲートが失敗するので、pasteも更新します。primary blockの追加・削除では、manifestを同じ変更で更新します。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/development.md