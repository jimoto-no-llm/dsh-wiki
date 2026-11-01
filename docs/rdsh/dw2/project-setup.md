# リポジトリ設定 (Project settings)

正本のリポジトリは [jimoto-no-llm/rustdsh](https://github.com/jimoto-no-llm/rustdsh) です。リポジトリのメタデータと必須チェックの意図は [.github/project-settings.json](https://github.com/jimoto-no-llm/rustdsh/blob/main/.github/project-settings.json) に記録します。GitHubの管理設定は設定ファイルのマージとは別に適用されるため、JSONファイルを変えるだけではリポジトリ設定は変わりません。

## 既定の発見と保守

- リポジトリのdescriptionはネイティブの高速コマンド・ガード付きagentツール・ローカルdashboardを説明します。topicsはRust、DSH、DeepSeek、CLI、dashboard、performance、agent toolingです。homepageはREADMEを指します。
- マージ済みPRブランチは自動削除します。ローカルのチェックアウトには影響しません。
- 自動マージは必須チェックと他者レビューの成功後に使えます。ブランチ保護を迂回しません。
- [管理ラベル](https://github.com/jimoto-no-llm/rustdsh/blob/main/.github/labels.yml) がtype/componentラベルと `P0` (critical)、`P1` (high)、`P2` (normal)、`P3` (backlog) の優先度ラベルを定義します。既存ラベルとissueの割り当ては保持します。
- labels workflowは `main` で定義変更時に同期します。手動同期は認証済み `gh` CLIとPyYAML付きPythonで行います。

```sh
sh scripts/sync-labels.sh
```

`REPO=owner/repo` で同期先を上書きできます。同期は繰り返し可能で、失敗した作成を「既存ラベル」と解釈せずエラーで止めます。

## main とリリースタグ

`main` は承認レビュー1件の既存要件を保ち、staleになったapproveを失効させ、最後のpushには自分以外の人物の承認を要求します。必須チェックはGitHub Actions appを使い、ブランチが最新であることも要求します。Rust lint jobはdocs lintと区別できる名前を持ちます。会話解決をマージの前提とし、force pushと削除は無効のまま、既存の管理者bypassは回復用に残します。

必須チェックは「すべてのPRで走るチェック」だけに限定します。docsとdashboardのworkflowはpath filterが付くため、これらの個別jobを全体的に必須化すると無関係なPRが永遠に待ちます。該当領域の変更時には、その結果をレビューで確認します。

[リリースタグruleset](https://github.com/jimoto-no-llm/rustdsh/blob/main/.github/tag-ruleset.json) は `refs/tags/v*` に適用され、bypass actorなしでは更新と削除をブロックしつつ新規タグ作成を許します。既存タグの追加・移動は行いません。リリース公開は `docs/RELEASING.md` と v0.2.0 形式に従います。

## セキュリティ設定

Dependabot脆弱性アラート、自動セキュリティ更新、secret scanning、secret scanning push protectionをGitHubで有効にします。非公開の脆弱性報告も有効で、外部ユーザーは公開issueを立てずに報告できます。CodeQLは既存workflowのままです。報告は [SECURITY.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/SECURITY.md) 経由です。

これらのsecurity設定はGitHubのリポジトリ管理面の項目で、コードの動作を変えるものではありません。CodeQLを除く自動修正も、既存のworkflowの役割分担を置き換えません。

## 現在の設定を確認する

```sh
gh api repos/jimoto-no-llm/rustdsh --jq '{description,homepage,topics,delete_branch_on_merge,security_and_analysis}'
gh api repos/jimoto-no-llm/rustdsh/branches/main/protection
gh api repos/jimoto-no-llm/rustdsh/rulesets
gh label list --repo jimoto-no-llm/rustdsh --limit 100
gh release view v0.2.0 --repo jimoto-no-llm/rustdsh
```

管理値の編集はGitHubのリポジトリ設定で行い、その後レビュー付きPRでソース設定を更新します。必須チェック名を追加するときは、強制化の前に新しいPR commitでその名前が実際に存在することを確認します。既存のレビュー要件を保ち、path filter付きjobを全般的な必須チェックにはしません。

## 実際の設定に合わせて更新する

```sh
# 設定値の編集はGitHubのUIで行い、その後ソース設定を見直す
gh api repos/jimoto-no-llm/rustdsh --jq .description
```

管理値の変更をGitHubのリポジトリ設定で行った後は、レビュー付きPRで `project-settings.json` や `labels.yml` といったソース設定を追従させます。ソースが実態からずれると、次の保守担当者が意図を読み誤ります。

## 実務上の注意

- JSONを編集してもGitHubの管理設定は変わりません。設定の実適用とソース更新は別手順です。
- 必須チェックをpath filter付きjobに設定すると、無関係PRの待ちが溜まります。既存要件を壊さず新規チェックは実際のPRで名前を確認してから強制化します。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/PROJECT-SETUP.md
