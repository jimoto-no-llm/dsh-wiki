import { defineConfig } from "vitepress";
import { readFileSync } from "node:fs";

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
    sidebar: (() => {
      const reg = JSON.parse(readFileSync(new URL("../meta/registry.json", import.meta.url), "utf8"));
      const items = (prefix) => Object.entries(reg)
        .filter(([k]) => k.startsWith(prefix))
        .sort((a, b) => a[0].localeCompare(b[0], "ja"))
        .map(([k, v]) => ({ text: v.t, link: "/" + k }));
      return [
        { text: "DSH を使う", items: items("guide/") },
        { text: "rustdsh（rdsh）", items: items("rdsh/").filter((it) => !it.link.startsWith("/rdsh/cmd/") && !it.link.startsWith("/rdsh/dw/")) },
        { text: "rustdsh コマンド詳細", items: items("rdsh/cmd/") },
        { text: "rustdsh 調査メモ", items: items("rdsh/dw/") },
        { text: "CLI リファレンス", items: items("reference/cli/") },
        { text: "サブシステム", items: items("subsystems/") },
        { text: "リファレンス", items: items("reference/").filter((it) => !it.link.startsWith("/reference/cli/")) },
      ];
    })(),
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
