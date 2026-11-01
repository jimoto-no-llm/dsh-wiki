# CONTRIBUTING — 編集に参加する

Wiki は誰でも編集に参加できます。GitHub アカウントがなくても報告は可能です。

## どこを編集するか

| 編集したいもの | 場所 |
| --- | --- |
| Wiki 本文（日本語ページ） | `docs/guide/`, `docs/rdsh/`, `docs/reference/` 配下の Markdown |
| ナビやページ名（サイト設定） | `docs/.vitepress/config.mts` |
| 現状メモ | `docs/STATUS.md` |

ビルド生成物（`docs/.vitepress/dist`、`docs/.vitepress/cache`）は編集しません。編集後に main へ push されると CI が検証し、本サイトへ配信されます。

## 方法 1. 報告だけする（アカウント不要の選択肢あり）

内容の誤り・不足を見つけたら、修正までしなくても報告だけ歓迎です。

1. [Issues](https://github.com/jimoto-no-llm/dsh-wiki/issues/new) を開く
2. ページ名と「どこが・どう間違っているか」を1〜2行書く
3. GitHub アカウントがない場合は、サイト各ページ末尾の「このページを編集」から GitHub へ誘導されます（アカウント作成後の編集フローになります）

## 方法 2. 編集して送る（fork → PR）

1. このリポジトリを Fork する
2. fork 先で `docs/` 配下のページを編集する
3. Pull Request を出す（タイトルは「どのページを・何を」の1行、本文は理由の1段落で十分）
4. CI が VitePress のビルド検証をする。問題なければ main に反映され、その後 https://dsh.sahen.site へ配信される

サイトの「このページを編集」リンクは、GitHub 上で fork 作成に誘導されるので、そのまま指示に従えば OK です。

## 方法 3. Discussions・直接 push

雑談・質問・アイデアは [Discussions](https://github.com/jimoto-no-llm/dsh-wiki/discussions) にも書けます。

変更の衝突を避けるため、基本は方法 2（PR）を使ってください。継続的に参加したい場合は、「collaborator として追加してほしい」と Issue で伝えてもらえれば直接 push 権を渡します。

## 約束ごと

1. **事実は条件つきで**: 計測値や構文（例「約98倍」は Linux x86_64 の `--version` 短い呼び出しの計測）は、条件を落とさずに転記する
2. **出典を残す**: 各ページ末尾の「## 出典」に、情報の依拠先を1行以上追記する。上流リポジトリのリンクは blob/master を使う
3. **非公式表記を維持する**: このWikiはコミュニティ管理の非公式ドキュメントなので、その旨の記述は消さない
4. **商標ルール**: プロジェクト名に「DeepSeek Harness」フルネームを使わず、記述的表現と略称 DSH を使う（[BRAND_GUIDELINES](https://github.com/deepseek-ai/deepseek-harness/blob/master/BRAND_GUIDELINES.md) 準拠）
