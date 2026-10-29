import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "ja-JP",
  title: "DSH 日本語Wiki",
  description:
    "DeepSeek Harness（DSH）と rustdsh の非公式日本語ドキュメント",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: "ホーム", link: "/" },
      { text: "DSH", link: "/guide/getting-started" },
      { text: "rustdsh", link: "/rdsh/overview" },
      { text: "ライセンス", link: "/reference/license" },
    ],
    sidebar: [
      {
        text: "DSH へ始める",
        items: [
          { text: "はじめに", link: "/guide/getting-started" },
          { text: "プロファイル", link: "/guide/profiles" },
          { text: "CLI リファレンス", link: "/guide/cli" },
        ],
      },
      {
        text: "DSH の使い方",
        items: [
          { text: "プラグイン管理", link: "/guide/plugins" },
          { text: "設定カタログ", link: "/guide/config" },
          { text: "Web UI", link: "/guide/web" },
          { text: "スキルと MCP", link: "/guide/skills" },
        ],
      },
      {
        text: "rustdsh（rdsh）",
        items: [
          { text: "概要", link: "/rdsh/overview" },
          { text: "ネイティブコマンド", link: "/rdsh/commands" },
        ],
      },
      {
        text: "リファレンス",
        items: [
          { text: "ライセンスと商標", link: "/reference/license" },
          { text: "FAQ", link: "/reference/faq" },
        ],
      },
    ],
    outline: { label: "このページの内容", level: [2, 3] },
    docFooter: { prev: "前のページ", next: "次のページ" },
    search: { provider: "local" },
    editLink: {
      pattern: "https://github.com/jimoto-no-llm/dsh-wiki/edit/main/docs/:path",
      text: "このページを編集",
    },
    footer: {
      message:
        "非公式の日本語Wiki。DeepSeek Harness および rustdsh とは独立しています。",
      copyright: "Content: MIT · Based on DeepSeek Harness & rustdsh (MIT)",
    },
  },
});
