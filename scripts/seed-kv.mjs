#!/usr/bin/env node
// docs/*.md を匿名編集Wiki（KV) に投入するスクリプト。
// 使い方: node scripts/seed-kv.mjs <KV_NAMESPACE_ID>
//   dry-run: node scripts/seed-kv.mjs <ID> --dry
// 既に KV に存在する page:<slug> は編集履歴を守るためスキップする（--force で上書き）。
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const nsId = process.argv[2];
const dry = process.argv.includes("--dry");
const force = process.argv.includes("--force");
if (!nsId) {
  console.error("usage: node scripts/seed-kv.mjs <KV_NAMESPACE_ID> [--dry] [--force]");
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
import { readdirSync } from "node:fs";
walk(docsDir);

const now = Date.now();
const all = [];
for (const { slug, path } of slugs) {
  const content = readFileSync(path, "utf8");
  // frontmatter (--- ... ---) は wiki 側ではそのまま見えるので剥がす
  const cleaned = content.replace(/^---\n[\s\S]*?\n---\n/, "").trim() + "\n";
  all.push({
    slug,
    key: `page:${slug}`,
    value: JSON.stringify({
      current: { content: cleaned, at: now, by: "seed", ip: "seed" },
      revs: [],
    }),
  });
}

// 既存キーの一覧を取得して、編集履歴があるページを保護する
let existing = new Set();
if (!force) {
  console.log("listing existing keys ...");
  const out = execFileSync(
    "npx",
    ["--yes", "wrangler@4", "kv", "key", "list", "--namespace-id", nsId, "--prefix", "page:", "--remote"],
    { encoding: "utf8", shell: process.platform === "win32" },
  );
  existing = new Set(JSON.parse(out).map((k) => k.name));
  console.log(`existing page keys: ${existing.size}`);
}

const payload = all.filter((p) => force || !existing.has(p.key));
console.log(`docs pages: ${all.length}, to seed: ${payload.length}, skipped: ${all.length - payload.length}`);
for (const p of payload) console.log("  " + p.key);

// index は既存のものとマージする（無ければ空配列）
let existingIdx = [];
try {
  existingIdx = JSON.parse(
    execFileSync("npx", ["--yes", "wrangler@4", "kv", "key", "get", "index", "--namespace-id", nsId, "--remote"], { encoding: "utf8" }),
  );
} catch {
  // index キーがまだ無い初回は空でよい
}
const mergedIdx = [...new Set([...existingIdx, ...all.map((s) => s.slug)])].sort((a, b) => a.localeCompare(b, "ja"));
payload.push({ key: "index", value: JSON.stringify(mergedIdx) });

if (dry) {
  console.log("dry-run: index would be", mergedIdx.length, "pages");
  process.exit(0);
}

// 一括投入（bulk put）
const tmp = mkdtempSync(join(tmpdir(), "dsh-wiki-seed-"));
const f = join(tmp, "bulk.json");
writeFileSync(f, JSON.stringify(payload));
execFileSync(
  "npx",
  ["--yes", "wrangler@4", "kv", "bulk", "put", f, "--namespace-id", nsId, "--remote"],
  { stdio: "inherit", shell: process.platform === "win32" },
);
rmSync(tmp, { recursive: true, force: true });
console.log("seed done");