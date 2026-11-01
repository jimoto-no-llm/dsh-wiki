# DSH 日本語Wiki

DeepSeek Harness（DSH）と rustdsh の非公式日本語Wiki。

2層構成です。

- **静的ドキュメント**（VitePress）: 整備済みページ。https://dsh.sahen.site/
- **匿名編集Wiki**（Cloudflare Workers + KV）: `/w/` 以下はアカウント不要で誰でも読み書き・新規作成ができる。履歴が残る。https://dsh.sahen.site/w/

各静的ページの「このページを編集」リンクは `/w/` の該当ページに繋がっており、編集は即公開されます。

```sh
npm install
npm run dev     # http://localhost:5173
npm run build   # -> docs/.vitepress/dist
npx wrangler deploy   # 静的＋worker を一緒にデプロイ
node scripts/seed-kv.mjs <KV_NAMESPACE_ID>   # docs/*.md を /w/ に初期投入（初回のみ）
```

## ライセンス

コンテンツ: MIT（各ページの「出典」に準拠）。DeepSeek Harness / rustdsh とも MIT。
「DeepSeek Harness」は DeepSeek の登録商標のため、サイト名には略称 DSH を使用（BRAND_GUIDELINES 準拠）。
