import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
const DOCS = join(ROOT, "..", "docs");
const OUT = join(ROOT, "src/content/articles");
const DATA = join(ROOT, "src/data");

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(DATA, { recursive: true });

const CATS = [
  ["guide/", "DSH を使う", "guide"],
  ["subsystems/", "サブシステム", "subsystems"],
  ["reference/config/", "設定の詳細", "config"],
  ["reference/cli/", "CLI リファレンス", "cli"],
  ["reference/", "リファレンス", "reference"],
  ["rdsh/cmd/", "rustdsh コマンド", "rdsh-cmd"],
  ["rdsh/src/", "rustdsh ソース", "rdsh-src"],
  ["rdsh/dw/", "rustdsh 調査", "rdsh-dw"],
  ["rdsh/dw2/", "rustdsh 運用", "rdsh-dw2"],
  ["rdsh/", "rustdsh", "rdsh"],
  ["develop/", "開発ガイド", "develop"],
  ["develop2/", "レビュー", "develop2"],
  ["deep/", "深掘り", "deep"],
  ["deep2/", "深掘り 2", "deep2"],
  ["ug/", "移行", "ug"],
  ["meta/", "メタ", "meta"],
];

const categorize = (slug) => {
  for (const [prefix, label, key] of CATS) if (slug.startsWith(prefix)) return { label, key };
  return { label: "メタ", key: "meta" };
};

const fixContainers = (src) => {
  const out = [];
  let inBox = false;
  let first = true;
  for (const line of src.split("\n")) {
    const t = line.trim();
    if (t.startsWith(":::")) {
      if (!inBox && t !== ":::") {
        inBox = true;
        const label = t.replace(/^:::+\s*(info|tip|warning|danger)?\s*/, "").trim();
        out.push("> " + (label ? "**" + label + "**" : ""));
        first = true;
        continue;
      }
      if (t === ":::") { inBox = false; continue; }
    }
    if (inBox) {
      if (!t) { out.push(">"); continue; }
      out.push("> " + line);
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
};

const files = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "public" || e.name === "meta") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".md")) files.push(p);
  }
};
walk(DOCS);

const index = [];
for (const file of files.sort()) {
  const raw = readFileSync(file, "utf8");
  const slug = relative(DOCS, file).split(sep).join("/").replace(/\.md$/, "");
  if (slug === "index") continue;
  const body = fixContainers(raw.replace(/^---\n[\s\S]*?\n---\n/, ""));
  const h1 = body.match(/^#\s+(.+)$/m);
  const title = h1 ? h1[1].trim() : slug.split("/").pop();
  let desc = "";
  for (const line of body.replace(/^#\s+.+$/m, "").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith("|") || t.startsWith("-") || t.startsWith(">") || t.startsWith("```")) continue;
    desc = t.replace(/[*`\[\]]/g, "").replace(/\(https?:\/\/\S+\)/g, "").slice(0, 90);
    break;
  }
  const { label, key } = categorize(slug);
  const fm = "---\ntitle: " + JSON.stringify(title) + "\ndesc: " + JSON.stringify(desc) + "\ncat: " + JSON.stringify(key) + "\ncatLabel: " + JSON.stringify(label) + "\nchars: " + body.length + "\nslug: " + JSON.stringify(slug) + "\n---\n\n";
  writeFileSync(join(OUT, slug.replace(/\//g, "__") + ".md"), fm + body);
  index.push({ slug, title, desc, cat: key, catLabel: label, chars: body.length });
}

writeFileSync(join(DATA, "articles.json"), JSON.stringify(index, null, 2));
console.log("articles:", index.length, "total chars:", index.reduce((a, b) => a + b.chars, 0));
