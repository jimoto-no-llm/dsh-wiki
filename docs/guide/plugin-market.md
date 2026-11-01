# プラグインの見つけ方

プラグイン索引（plugin index）は、インストール可能なDSHバンドルをタイトル・アイコン・作者・版つきで列挙する1つのJSONファイルです。実験プラグインの**Custom plugin indexes**バンドルを有効にすると、Pluginsページの**Discover**タブで索引を閲覧し、確認のうえ記載版をインストールできます。Dsh自体は索引ソースを1つも同付属しません。

## Discoverを有効にする

1. **Plugins**を開き、**Experimental plugins**配下の**Custom plugin indexes**をオンにします。
2. **Installed**の隣に**Discover**タブが現れ、Creator modeには読み取り専用の `plugin_market` ツールが加わります。オフにすると両方とも消えます。
3. **Discover** → **Add index source** で索引ファイルのURLを登録します。URLは 「http:」か「https:」で、ユーザ名・パスワード・#フラグは不可です。管理外のネットワークを経由する索引は、『http:』は経路の途中の誰でも（列挙されるインストール仕様ごと含め）書き換え得るため「https:」にします。ソースは現在のプロファイルに属します。

## 閲覧とインストール

検索は名前・作者・キーワード・タイトル・説明・カテゴリ・ラベルを全言語対象に、typoを許容して一致します。**Labels**メニュー・カテゴリ表示（pill）・**Sort**メニューは、索引が宣言したカテゴリ・ラベル・並べ替えキーを使います（**Publish date**は各プラグインの最新版で並べ替え）。

- カードは推奨版を示します。実行中のDSH互換で、 prerelease 以外の最高版。互換版がすべてprereleaseなら、その最高互換prereleaseです。
- **Install**はその版の取得元（npmのパッケージとレジストリ、またはGitのリポジトリ・commit・ディレクトリ）を示す確認を開きます。確認なければ何も入らず、確認後は通常の互換性・レジストリ検査込みのインストールが進みます。
- カードを開くと**Versions**に載っている全版と互換性が出て、古い版・prerelease も含めDSHが受け付ける版はどれでもインストール可能です。
- 索引は第三者コンテンツです。Dshはファイル形式のみ検査し、タイトルや作者などの記載は裏取りされませんので、信頼できるソースだけ追加し、確認画面で取得元を確認してください。

## 索引を公開する

索引はUTF-8のJSONファイルで、標準では最大128 MiB、2xxと同時、リダイレクトなしで配信します。GitLab Pages、GitHub Pages、https配下のオブジェクトストアなど静的ホストに置きます。アイコンは索引自体に埋め込まれるbase64 data: URL（SVG・PNG・JPEG・WebP、最大32 KiB）か、別ファイルのURLです。相対URLは索引URLに対して解決されます: 索引が `https://market.example/dsh/index.json` で `"icon": "icons/foo.svg"` なら `https://market.example/dsh/icons/foo.svg` を読みます。索引と `icons/` ディレクトリを並べて置けば、任意のホストでファイル編集なしに通ります。別オリジンの絶対URLは「https:」が必須です。

規則の違反は索引全体の拒否で、理由と違反値のJSON経路が **Manage index sources…** のソースの下に表示されます。

## リファレンスジェネレータで作る

リポジトリ同梱のジェネレータは、1行1パッケージ名（またはhttpsのGitリポジトリURL）の単純なリストから索引を作ります。空行と `#` で始まる行は無視され、DSHチェックアウトから:

```sh
pnpm --filter @deepseek-ai/dsh-plugin-market-generator start --input plugins.txt --output site/index.json --title "Team plugins"
```

npmパッケージからは、廃止・非公開でなく `dsh.bundle` を宣言する全版を列挙します。Gitリポジトリからは、標準ブランチ上で非 private なバンドルパッケージを `vX.Y.Z`・`X.Y.Z`・`<name>@X.Y.Z` の各タグで、加えて標準ブランチ上の各パッケージの現在版を列挙します。ジェネレータはファイルのダウンロードと読み取りだけ行い、パッケージのインストールやコード実行は行いません。リストの隣の `.plugin-market-cache` にキャッシュを作り、再実行では新規の版とcommitだけダウンロードします。出力ディレクトリ（`index.json` と `icons/`）を上記の通り公開します。

## 索引形式の主な項目

- 索引: `format`（必須、1）、`title`（必須、LocalizedText）、`metadata.categories`/`labels`/`sortKeys`（任意）、`plugins`（必須）。
- プラグイン: `name`（必須、索引内で唯一のnpm名）、`title`/`description`/`icon`/`author`/`homepage`/`repository`（任意）、`versions`（必須、1件以上）。
- 版: `version`（必須の正確なSemVer、プラグイン内で単一）、`publishTimestamp`（必須、Unix秒）、`source`（必須、npmなら `{ "type": "npm", "registry"?: url }`、gitなら `{ "type": "git", "url": https-url, "commit": 40桁hex, "path"?: ディレクトリ }`）、`engines.dsh`（任意のSemVer範囲、不在は全版）。
- Dshはnpm版を `name@version` で（`registry` があれば最初にそこへ）、Git版を `git+<url>.git#<commit>`（サブディレクトリパッケージには `&path:/<path>` 付き）でインストールします。`engines.dsh` はパッケージ自身の `engines.dsh` と一致させ、値がないパッケージは `@deepseek-ai/dsh*` のpeer依存で検査します。

## 出典

- [docs/user/guide/plugin-market.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/plugin-market.md)
