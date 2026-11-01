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
      { text: "誰でも編集Wiki", link: "https://dsh.sahen.site/w/" },
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
          { text: "ツール", link: "/guide/tools" },
          { text: "セッション", link: "/guide/sessions" },
          { text: "予定実行", link: "/guide/schedule" },
          { text: "Python SDK", link: "/guide/python-sdk" },
          { text: "ネットワーク/プロキシ", link: "/guide/network-proxy" },
          { text: "プラグインの見つけ方", link: "/guide/plugin-market" },
        ],
      },
      {
        text: "rustdsh（rdsh）",
        items: [
          { text: "概要", link: "/rdsh/overview" },
          { text: "インストール", link: "/rdsh/install" },
          { text: "性能計測", link: "/rdsh/benchmarks" },
          { text: "安全設計", link: "/rdsh/security" },
          { text: "モデル管理", link: "/rdsh/models" },
          { text: "デスクトップ", link: "/rdsh/desktop" },
          { text: "コンテキスト入力", link: "/rdsh/context" },
          { text: "内部構造", link: "/rdsh/architecture" },
        ],
      },      {
        text: "仕組みと開発",
        items: [
          { text: "アーキテクチャの全体像", link: "/guide/architecture" },
          { text: "バージョンアップ", link: "/guide/upgrade" },
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
      pattern: "https://dsh.sahen.site/w/:path",
      text: "このページを編集（匿名OK）",
    },
    footer: {
      message:
        "非公式の日本語Wiki。DeepSeek Harness および rustdsh とは独立しています。",
      copyright: "Content: MIT · Based on DeepSeek Harness & rustdsh (MIT)",
    },
  },
});
