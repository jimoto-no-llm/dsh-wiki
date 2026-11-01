# 現状メモ（STATUS）

このWikiプロジェクトの現状を記録するファイルです。更新日: 2026-11-01

## 全体の状態

| 項目 | 状態 |
| --- | --- |
| 公開サイト | https://dsh.sahen.site ・稼働中（全12ページ 200 確認 2026-11-01） |
| リポジトリ | https://github.com/jimoto-no-llm/dsh-wiki （public・main 1本） |
| CI | ci.yml（ビルド検証）と deploy.yml（Cloudflare デプロイ）が緑 |
| ローカル | /home/sahen/Projects/windows-migration/dsh-wiki ・未コミット変更なし（本ファイル追加を除く） |

## やったこと（作成〜公開まで）

1. **方向性の確認**: DSH本体が主役、rustdsh（rdsh）は1章。公開方法は自由 → 共同編集できる構成なら何でも可という回答だった。
2. **ライセンス調査**: rustdsh が MIT（sahenjp）、DSH本体が MIT（DeepSeek）で、翻訳・引用とも問題なし。MIT の条件は著作権表示の保持のみ。
3. **上流ドキュメントの収集**: github.com/deepseek-ai/deepseek-harness を sparse clone して /tmp/dsh-upstream に置き、README・cli-help・config-catalog・docs/user・docs/subsystems 等を参照ソースにした。
4. **Wiki作成**: VitePress v1.6.4 で新規リポジトリ dsh-wiki を構成。subagent 2体で DSHガイド7ページと rustdsh章を並列執筆。全ページの末尾に「## 出典」を置き、数値や構文は上流に基づく（創作なし）。
5. **公開設定**: Cloudflare Workers に assets-only 構成（wrangler.jsonc に custom_domain: true）でデプロイ。カスタムドメイン指定の結果、DNS（dsh.sahen.site）は自動作成された。
6. **検証と修正**:
   - 全出典リンクを curl で確認 → 上流の既定ブランチが `main` ではなく `master` で404になることが発覚・全リンクを修正済み
   - anchor の実在確認（config-catalog、plugin-manager、cli-reference の各id）
   - deploy ワークフロー1回目が失敗（wrangler-action 既定の v3 は assets-only 構成で main を要求）→ wranglerVersion 4.155.0 を明示し、Cloudflare secrets 未設定時はスキップする形に修正して緑化

## ページ一覧（12ページ）

- DSHガイド: getting-started / profiles / cli / plugins / config / web / skills
- rustdsh章: overview（計測は `--version` の Linux x86_64 n=5 中央値の条件つき） / commands（README.ja.md の構文を準拠）
- リファレンス: faq / license（MIT一覧と商標ルール・BRAND_GUIDELINES 準拠の注記あり）
- ホーム: index（非公式である旨の info コンテナつき）

## 既知の注意点

1. **商標**: 「DeepSeek Harness」は DeepSeek の登録商標。サイト名には略称 DSH を使用し、全文で非公式表記を維持する（BRAND_GUIDELINES.md のルール）。
2. **自動デプロイ未設定**: リポジトリ secrets に Cloudflare APIトークン（CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID）を登録していない。secrets未設定なので deploy ワークフローはスキップする。手動更新は `npx wrangler deploy`（ローカルの wrangler OAuth で実行可）。
3. **上流ブランチ**: deepseek-ai/deepseek-harness の既定ブランチは `master`。出典リンクを新規作成するときは blob/master を使う。
4. **DSH は開発者プレビュー**: 破壊的変更が入る前提なので、Wiki の内容はバージョンずれに注意する。
5. **/tmp/dsh-upstream**: 参照用の sparse clone は一時領域。再取得は `git clone --depth 1 --filter=blob:none --sparse` + sparse-checkout set docs などで。
6. **参考情報**: sahenjpsite（sahen.site のポートフォリオ）と方式は同じ Cloudflare Workers 静的配信。secrets未設定のときは GitHub Actions で自動化せず手動運用にする判断をした。

## 更新手順

1. Markdown を編集（direct push または PR）
2. main に push → ci.yml が VitePress ビルドを検証
3. secrets 登録後は deploy.yml が自動で Cloudflare へ配信（未設定なら手動: `npm run build && npx wrangler deploy`）
