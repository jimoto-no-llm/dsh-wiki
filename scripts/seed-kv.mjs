#!/usr/bin/env node
// docs/*.md を匿名編集Wiki（KV) に初期投入するスクリプト。
// 使い方: node scripts/seed-kv.mjs <KV_NAMESPACE_ID>
//   dry-run: node scripts/seed-kv.mjs <ID> --dry
import { readdirSync, readFileSync, statSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const nsId = process.argv[2];
const dry = process.argv.includes("--dry");
if (!nsId) {
  console.error("usage: node scripts/seed-kv.mjs <KV_NAMESPACE_ID> [--dry]");
  process.exit(1);
}

const docsDir = new URL("../docs/", import.meta.url).pathname;
const slugs = [];

function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === ".vitepress" || e.name === "node_modules") continue;
      walk(p);
    } else if (e.name.endsWith(".md")) {
      const rel = relative(docsDir, p).split(sep).join("/");
      const slug = rel.replace(/\.md$/, "").replace(/\/+$/, "") || "ホーム";
      slugs.push({ slug, rel, path: p });
    }
  }
}
walk(docsDir);

const now = Date.now();
const payload = [];
for (const { slug, path } of slugs) {
  const content = readFileSync(path, "utf8");
  // frontmatter (--- ... ---) は wiki 側ではそのまま見えるので、index.html 用のレイアウトだけ剥がす
  const cleaned = content.replace(/^---\n[\s\S]*?\n---\n/, "").trim() + "\n";
  payload.push({
    key: `page:${slug}`,
    value: JSON.stringify({
      current: { content: cleaned, at: now, by: "seed", ip: "seed" },
      revs: [],
    }),
  });
}
// インデックス
const index = slugs.map((s) => s.slug).sort((a, b) => a.localeCompare(b, "ja"));
payload.push({ key: "index", value: JSON.stringify(index) });

console.log(`seed pages: ${slugs.length}`);
for (const p of payload.slice(0, -1)) console.log("  " + p.key);

if (dry) process.exit(0);

for (const p of payload) {
  const tmp = mkdtempSync(join(tmpdir(), "dsh-wiki-seed-"));
  const f = join(tmp, "v.json");
  writeFileSync(f, p.value);
  execFileSync("npx", ["--yes", "wrangler@4", "kv", "key", "put", p.key, "--namespace-id", nsId, "--path", f, "--remote"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}
console.log("seed done");
