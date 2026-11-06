#!/usr/bin/env node
// 既存の page:* から recent / searchindex キーを再構築する（1回実行でよい）
// 使い方: node scripts/backfill-indexes.mjs <KV_NAMESPACE_ID>
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const nsId = process.argv[2];
if (!nsId) {
  console.error("usage: node scripts/backfill-indexes.mjs <KV_NAMESPACE_ID>");
  process.exit(1);
}
const wr = (args) =>
  execFileSync("npx", ["--yes", "wrangler@4", ...args], { encoding: "utf8" });

// 全 page: キーを列挙（このWikiの規模では1ページに収まる）
const keys = JSON.parse(wr(["kv", "key", "list", "--namespace-id", nsId, "--prefix", "page:", "--remote"])).map((k) => k.name);
console.log("page keys:", keys.length);

const recent = [];
const searchindex = [];
for (const name of keys) {
  const slug = name.replace(/^page:/, "");
  try {
    const doc = JSON.parse(wr(["kv", "key", "get", name, "--namespace-id", nsId, "--remote"]));
    recent.push({ slug, ts: doc.current.at, by: doc.current.by || "匿名", ipHash: doc.current.ipHash ?? doc.current.ip ?? "" });
    searchindex.push({ key: "searchindex", value: null }); // placeholder（後で上書き）
    searchindex.pop();
    // searchindex は1オブジェクトにまとめるのでここでは本文だけ集める
    searchindex.push({ slug, content: doc.current.content });
  } catch (e) {
    console.error("skip", name, String(e).slice(0, 80));
  }
}
recent.sort((a, b) => b.ts - a.ts);

// searchindex を1キーにまとめる
const idxObj = {};
for (const { slug, content } of searchindex) {
  idxObj[slug] = { t: slug, c: content.toLowerCase().slice(0, 1200) };
}

const bulk = [
  { key: "recent", value: JSON.stringify(recent.slice(0, 50)) },
  { key: "searchindex", value: JSON.stringify(idxObj) },
];
writeFileSync("/tmp/wiki-backfill-bulk.json", JSON.stringify(bulk));
wr(["kv", "bulk", "put", "/tmp/wiki-backfill-bulk.json", "--namespace-id", nsId, "--remote"]);
console.log("backfill done: recent", Math.min(recent.length, 50), "searchindex", Object.keys(idxObj).length);