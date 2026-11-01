/**
 * dsh-wiki worker — 匿名編集Wiki（/w/ 以下）
 *
 * - 本文は KV の page:<slug>（{current:{content,at,by,ip}, revs:[{ts,by,len}]})
 * - 保存のたび rev:<slug>:<ts> に版を残す（版は各ページ30個まで）
 * - Markdown は自前レンダラ。まず HTML 文字を全部エスケープするので XSS 不可
 * - 編集はアカウント不要。保存元IPハッシュで 5分8回の簡易レート制限
 * - lock:<slug> = "1" のページは読み取り専用（スパム時の締め方）
 * - /w/ 以外は VitePress の静的アセットをそのまま配信
 */
interface Env {
  WIKI: KVNamespace;
  // 管理者API用トークン（wrangler secret put ADMIN_TOKEN）。未設定なら管理APIは無効
  ADMIN_TOKEN?: string;
}

const SITE = "https://dsh.sahen.site";
const VERSIONS_KEPT = 30;
const MAX_BODY = 200_000;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 8;
const BAN_TTL = 24 * 60 * 60; // 自動BANの秒数
const BAN_STRIKES = 3; // この回数レート超過でBAN
const MAX_EXTERNAL_LINKS = 5; // 本文にこの数を超える外部リンクがある投稿は拒否

type PageDoc = {
  current: { content: string; at: number; by: string; ip: string };
  revs: { ts: number; by: string; len: number }[];
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugValid(slug: string): boolean {
  return (
    slug.length > 0 &&
    slug.length <= 96 &&
    /^[\p{L}\p{N}][\p{L}\p{N} ./_-]*$/u.test(slug)
  );
}

function normSlug(raw: string): string {
  const s = decodeURIComponent(raw).trim().replace(/\.(md|html?)$/, "").replace(/\/+$/, "");
  return s.length ? s : "ホーム";
}

async function ipHash(req: Request): Promise<string> {
  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  const dig = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode("dsh-wiki:" + ip),
  );
  return [...new Uint8Array(dig)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------- 最小 Markdown レンダラ ---------- */

function mdToHtml(src: string): string {
  const out: string[] = [];
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let list: "ul" | "ol" | null = null;
  const closeList = () => {
    if (list) {
      out.push("</" + list + ">");
      list = null;
    }
  };
  const inline = (t: string) => {
    let s = esc(t);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, txt: string, url: string) => {
      const u = url.trim();
      let href: string | null = null;
      const ext = /^https?:\/\//i.test(u);
      if (ext) href = u;
      else if (/^\/\//.test(u)) href = null;
      // 危険なスキーム（javascript:, data:, vbscript: 等）を排除
      else if (/^[A-Za-z][A-Za-z0-9+.\-]*:/i.test(u)) href = null;
      else href = u;
      if (href === null) return txt;
      const attrs = ext ? ' rel="nofollow noopener" target="_blank"' : "";
      return '<a href="' + href + '"' + attrs + ">" + txt + "</a>";
    });
    return s;
  };
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      closeList();
      i++;
      const buf: string[] = [];
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push("<pre><code>" + esc(buf.join("\n")) + "</code></pre>");
      continue;
    }
    if (/^\s*$/.test(line)) {
      closeList();
      i++;
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeList();
      out.push("<h" + (h[1].length + 1) + ">" + inline(h[2]) + "</h" + (h[1].length + 1) + ">");
      i++;
      continue;
    }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      closeList();
      out.push("<hr>");
      i++;
      continue;
    }
    const bq = line.match(/^\s*>\s?(.*)$/);
    if (bq) {
      closeList();
      out.push("<blockquote>" + inline(bq[1]) + "</blockquote>");
      i++;
      continue;
    }
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) {
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push("<li>" + inline(ul[1]) + "</li>");
      i++;
      continue;
    }
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push("<li>" + inline(ol[1]) + "</li>");
      i++;
      continue;
    }
    closeList();
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^\s*(#{1,4}\s|>|[-*]\s|\d+\.\s|```)/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push("<p>" + inline(buf.join(" ")) + "</p>");
  }
  closeList();
  return out.join("\n");
}

/* ---------- HTML シェル ---------- */

function shell(title: string, bodyHtml: string, opts: { slug?: string } = {}): string {
  const editLink =
    opts.slug !== undefined
      ? '<a class="btn" href="/w/' + encodeURIComponent(opts.slug) + '?edit">このページを編集</a>'
      : "";
  return (
    '<!DOCTYPE html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<meta name="robots" content="noindex, nofollow">\n' +
    "<title>" + esc(title) + " - DSH 日本語Wiki</title>\n" +
    '<style>:root{color-scheme:light}' +
    "html,body{background:#fff}" +
    "body{font-family:'Hiragino Kaku Gothic ProN','Hiragino Sans','Noto Sans JP',system-ui,sans-serif;font-size:.95rem;max-width:62rem;margin:0 auto;padding:0 1rem 3rem;line-height:1.7;color:#202122}" +
    "a{color:#3366cc;text-decoration:none}a:hover{text-decoration:underline}" +
    "header{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;border-bottom:1px solid #a2a9b1;padding:.55rem 0;margin-bottom:1rem}" +
    "header .brand{font-weight:700;text-decoration:none;color:#202122;font-size:1.02rem}" +
    "header .brand small{color:#72777d;font-weight:400;font-size:.78rem}" +
    ".actions{margin-left:auto;display:flex;gap:.4rem;align-items:center;flex-wrap:wrap}" +
    ".actions form{display:flex;gap:.25rem}" +
    '.btn{border:1px solid #a2a9b1;background:#f8f9fa;border-radius:2px;padding:.15rem .55rem;text-decoration:none;color:#202122;font-size:.85rem}' +
    ".btn:hover{background:#eaecf0;text-decoration:none}" +
    '.searchbox input[type=text]{border:1px solid #a2a9b1;padding:.2rem .45rem;width:10rem;background:#fff;color:#202122;font-size:.85rem}' +
    '.searchbox button{border:1px solid #a2a9b1;background:#f8f9fa;padding:.2rem .55rem;font-size:.85rem;cursor:pointer}' +
    "h1{font-size:1.6rem;border-bottom:1px solid #a2a9b1;padding-bottom:.25rem;margin:.4rem 0 .8rem;font-weight:400}" +
    "h2{font-size:1.05rem;border-bottom:1px solid #c8ccd1;padding-bottom:.2rem;margin:1.2rem 0 .6rem;font-weight:700}" +
    "h3{font-size:.95rem;margin:1rem 0 .4rem}" +
    "pre{background:#f8f9fa;border:1px solid #eaecf0;border-radius:2px;padding:.7rem .9rem;overflow-x:auto}" +
    "code{font-size:.9em}blockquote{border-left:3px solid #a2a9b1;margin:.5rem 0;padding:.05rem .9rem;color:#54595d}" +
    ".warning{background:#fef6e7;border:1px solid #f0c67d;border-radius:2px;padding:.5rem .8rem;margin:.8rem 0;font-size:.9rem}" +
    ".infobox{background:#f8f9fa;border:1px solid #a2a9b1;border-radius:2px;padding:.6rem .9rem;margin:.8rem 0;font-size:.88rem}" +
    "footer{margin-top:2.6rem;border-top:1px solid #a2a9b1;padding-top:.6rem;color:#72777d;font-size:.8rem}" +
    ".revlist{font-size:.85rem;color:#72777d}" +
    ".mp-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:1rem 0}" +
    '@media (max-width:640px){.mp-grid{grid-template-columns:1fr}}' +
    ".mp-box{border:1px solid #a2a9b1;background:#f8f9fa;border-radius:2px;padding:.5rem .9rem .7rem}" +
    ".mp-box h2{border-bottom:1px solid #a2a9b1;font-size:.92rem;margin:.2rem 0 .5rem;padding:.15rem 0 .3rem;color:#202122}" +
    ".mp-box ul{margin:.2rem 0 .2rem 1.1rem;padding:0}" +
    ".mp-box li{margin:.25rem 0}" +
    ".mp-box .sub{font-size:.8rem;color:#72777d}" +
    ".mp-hero{border:1px solid #a2a9b1;background:#f8f9fa;border-radius:2px;padding:.9rem 1.1rem;margin:0 0 1rem;text-align:center}" +
    ".mp-hero h1{border:none;font-size:1.7rem;margin:.1rem 0}" +
    ".mp-hero p{margin:.25rem 0;font-size:.9rem;color:#54595d}" +
    ".mp-hero .big{font-size:.95rem}" +
    ".pagerow{display:flex;gap:.4rem;flex-wrap:wrap;align-items:baseline;margin:.35rem 0 .1rem}" +
    '.pagerow .pname{font-size:1rem}' +
    '.pagerow .pd{color:#54595d;font-size:.82rem;margin-left:.35rem}' +
    '</style>\n</head>\n<body>\n' +
    '<header><a class="brand" href="/">DSH 日本語Wiki</a> <small>非公式・誰でも編集できる</small>' +
    '<div class="actions">' +
    editLink +
    '<div class="searchbox"><form method="get" action="/w/%E6%A4%9C%E7%B4%A2"><input type="text" name="q" placeholder="Wiki内を検索" aria-label="検索"><button type="submit">検索</button></form></div>' +
    '<a class="btn" href="/w/%E6%9C%80%E8%BF%91%E3%81%AE%E7%B7%A8%E9%9B%86">最近の編集</a>' +
    '</div></header>\n<main>' +
    bodyHtml +
    "</main>\n" +
    '<footer>このWikiはアカウント不要で誰でも編集できます（いたずら防止のため履歴と連投制限があります）。整備済みのリファレンスも将来はここへ取り込みます。対象: DeepSeek Harness（DSH）・ rustdsh — どちらも MIT。</footer>\n' +
    "</body>\n</html>"
  );
}

const SEC_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-robots-tag": "noindex, nofollow",
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; img-src * data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

function withSecHeaders(h: Record<string, string>): Record<string, string> {
  return { ...h, ...SEC_HEADERS };
}

function htmlResp(body: string, title: string, opts: { slug?: string; status?: number } = {}): Response {
  return new Response(shell(title, body, opts), {
    status: opts.status ?? 200,
    headers: withSecHeaders({ "content-type": "text/html; charset=utf-8" }),
  });
}

function jsonResp(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: withSecHeaders({ "content-type": "application/json; charset=utf-8" }),
  });
}

/* ---------- KV 操作 ---------- */

async function getDoc(env: Env, slug: string): Promise<PageDoc | null> {
  return await env.WIKI.get<PageDoc>("page:" + slug, "json");
}

async function listIndex(env: Env): Promise<string[]> {
  return (await env.WIKI.get<string[]>("index", "json")) ?? [];
}

async function addToIndex(env: Env, slug: string): Promise<void> {
  const idx = await listIndex(env);
  if (!idx.includes(slug)) {
    idx.push(slug);
    idx.sort((a, b) => a.localeCompare(b, "ja"));
    await env.WIKI.put("index", JSON.stringify(idx));
  }
}

/* ---------- GET ---------- */

async function doGet(req: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname;
  // ルート「/」は匿名編集Wiki本体。/w/* と同じUIを出す
  if (path === "/" || path === "/w" || path === "/w/") return indexPage(env);
  if (!path.startsWith("/w")) return new Response(null, { status: 404 });
  // /go?p=名前 → 新規作成フォームへ（ポータルの作成ボックス用）
  if (path === "/go") {
    const name = url.searchParams.get("p") ?? "".trim();
    const target = name.trim();
    if (!target || !slugValid(target)) {
      return htmlResp("<h1>ページ名を入力してください</h1><p>文字・数字・スペース、_ - . / が使えます。</p>", "ページ名エラー", { status: 400 });
    }
    return Response.redirect(SITE + "/w/" + encodeURIComponent(target) + "?edit", 303);
  }

  const slug = normSlug(path.replace(/^\/w\/?/, ""));
  if (!slugValid(slug)) {
    return htmlResp("<h1>404</h1><p>不明なページ名です。</p>", "404", { status: 404 });
  }
  // 作成ボックス用: /w/作成?p=名前 → 新規ページの編集フォームへ
  if (slug === "作成") {
    const name = (url.searchParams.get("p") ?? "").trim();
    if (!name || !slugValid(name)) {
      return htmlResp("<h1>ページ名を入力してください</h1><p>文字・数字・スペース、_ - . / が使えます。</p>", "ページ名エラー", { status: 400 });
    }
    return Response.redirect(SITE + "/w/" + encodeURIComponent(name) + "?edit", 303);
  }
  const q = url.searchParams;
  if (q.has("edit")) return editPage(env, slug, q.get("err") ?? "");
  if (q.has("history")) return historyPage(env, slug);
  const vn = q.get("v");
  if (vn) return revisionPage(env, slug, vn);

  if (slug === "最近の編集") return recentPage(env);
  if (slug === "検索") return searchPage(env, url.searchParams.get("q") ?? "");

  const doc = await getDoc(env, slug);
  if (!doc) {
    const body =
      "<h1>" + esc(slug) + " <small>（まだありません）</small></h1>" +
      '<div class="warning">このページはまだありません。<a href="/w/' +
      encodeURIComponent(slug) +
      '?edit">編集フォームから新規作成</a>できます（アカウント不要、保存すると即公開）。</div>';
    return htmlResp(body, "404 / " + slug, { slug, status: 404 });
  }
  const body =
    "<h1>" + esc(pageTitle(slug)) + "<br><span style=\"font-size:.8rem;font-weight:400;color:#72777d\">" + esc(slug) + "</span></h1>\n" +
    mdToHtml(doc.current.content) +
    '<hr><p class="revlist">最終更新: ' +
    new Date(doc.current.at).toISOString() +
    "（" +
    esc(doc.current.by || "匿名") +
    '）　<a href="/w/' +
    encodeURIComponent(slug) +
    '?history">版一覧（' +
    doc.revs.length +
    "）</a></p>";
  return htmlResp(body, slug, { slug });
}

/* ---------- ポータル（トップページ） ---------- */

const PAGE_INFO: Record<string, { t: string; d: string }> = {
  "guide/getting-started": { t: "はじめに", d: "インストールから最初の会話まで" },
  "guide/profiles": { t: "プロファイル", d: "起動モードと設定のしくみ" },
  "guide/cli": { t: "CLI リファレンス", d: "コマンドとオプション一覧" },
  "guide/plugins": { t: "プラグイン管理", d: "追加・削除・バージョン管理" },
  "guide/config": { t: "設定", d: "設定ファイルの置き場所" },
  "guide/web": { t: "Web UI", d: "ブラウザから使う方法" },
  "guide/schedule": { t: "予定実行", d: "リマインダーと定期実行" },
  "guide/python-sdk": { t: "Python SDK", d: "Pythonから使う" },
  "guide/sessions": { t: "セッションとデータの保存", d: "保存形式と intercourse" },
  "guide/tools": { t: "ツール一覧と実行の流れ", d: "ツールの実行のしかた" },
  "guide/architecture": { t: "アーキテクチャの全体像", d: "全体像と層" },
  "guide/upgrade": { t: "バージョンアップと互換性", d: "更新の注意" },
  "guide/network-proxy": { t: "ネットワークとプロキシ", d: "外向き通信の設定" },
  "guide/plugin-market": { t: "プラグインの見つけ方", d: " Markets" },

  "guide/skills": { t: "スキルと MCP", d: "スキル・MCPの接続方法" },
  "rdsh/overview": { t: "rustdsh とは", d: "約98倍の起動と導入手順" },
  "rdsh/install": { t: "rdsh のインストール", d: "導入手順とdsh互換切替" },
  "rdsh/benchmarks": { t: "rdsh の性能計測", d: "実測表と再現手順" },
  "rdsh/security": { t: "rdsh の安全設計", d: "サンドボックスとguard" },
  "rdsh/models": { t: "rdsh のモデル管理", d: "同期・難易度別・再試行" },
  "rdsh/desktop": { t: "rdsh とデスクトップ", d: "Electron連携" },
  "rdsh/context": { t: "rdsh のコンテキスト", d: "注入と入力順序" },
  "rdsh/architecture": { t: "rdsh の内部構造", d: "Rust化の範囲とCLI橋" },
  "rdsh/commands": { t: "ネイティブコマンド", d: "tokens・search・deps など" },
  "reference/faq": { t: "FAQ", d: "困ったときにまず見る" },
  "reference/license": { t: "ライセンスと商標", d: "MIT と商標ルール" },
  "STATUS": { t: "現状メモ", d: "このWikiの現状" },
  "index": { t: "旧トップ", d: "以前の案内ページ" },
};

function pageTitle(slug: string): string {
  return PAGE_INFO[slug]?.t ?? slug;
}

function pageLink(slug: string): string {
  const info = PAGE_INFO[slug];
  const title = info ? info.t : slug;
  const desc = info ? info.d : "";
  return (
    '<li><a href="/w/' + encodeURIComponent(slug) + '" class="pname">' + esc(title) +
    '</a>' + (desc ? '<span class="pd">— ' + esc(desc) + '</span>' : "") + "</li>"
  );
}

async function indexPage(env: Env): Promise<Response> {
  const idx = await listIndex(env);
  const inCategories = new Set<string>();
  const rootSlugs: string[] = [];
  for (const s of idx) {
    if (s === "最近の編集") continue;
    if (/^(guide|rdsh|reference)\//.test(s)) inCategories.add(s);
    else rootSlugs.push(s);
  }
  const pick = (prefix: string) => [...inCategories].filter((s) => s.startsWith(prefix)).sort().map(pageLink).join("\n");

  // 最近の編集（上8件）
  type Row = { slug: string; ts: number; by: string };
  const rows: Row[] = [];
  for (const slug of idx) {
    const doc = await getDoc(env, slug);
    if (!doc) continue;
    rows.push({ slug, ts: doc.current.at, by: doc.current.by || "匿名" });
  }
  rows.sort((a, b) => b.ts - a.ts);
  const recent = rows
    .slice(0, 8)
    .map(
      (r) =>
        '<li><a href="/w/' +
        encodeURIComponent(r.slug) +
        '">' +
        esc(r.slug) +
        "</a> <span class=\"sub\">" +
        new Date(r.ts).toISOString().slice(5, 16).replace("T", " ") +
        "（" +
        esc(r.by) +
        "）</span></li>",
    )
    .join("\n");

  const body =
    '<div class="mp-hero">' +
    "<h1>DSH 日本語Wiki</h1>" +
    '<p class="big"><b>アカウント不要</b>で誰でも読めて・書ける、DeepSeek Harness（DSH）と rustdsh の非公式Wikiです。</p>' +
    '<form method="get" action="/w/%E6%A4%9C%E7%B4%A2" style="max-width:34rem;margin:.6rem auto 0;display:flex;gap:.5rem"><input type="text" name="q" placeholder="このWiki内を検索" style="flex:1;height:2.6rem;border:1px solid #a2a9b1;border-radius:.5rem;padding:0 .9rem;font-size:.95rem" aria-label="Wiki内検索"><button type="submit" style="height:2.6rem;padding:0 1.2rem;background:#111827;color:#fff;border:none;border-radius:.5rem;font-weight:500">検索</button></form>' +
    '<p class="sub" style="margin-top:.5rem">見つからない名前は<a href="/w/%E4%BD%9C%E6%88%90">作成フォーム</a>から新規ページにできます。まず読むなら「はじめに」。</p>' +
    "</div>" +
    '<div class="mp-grid">' +
    '<div class="mp-box"><h2>DSH を使う</h2><ul>' + pick("guide/") + "</ul></div>" +
    '<div class="mp-box"><h2>もっと速く（rustdsh）</h2><ul>' + pick("rdsh/") + "</ul></div>" +
    '<div class="mp-box"><h2>調べる・確かめる</h2><ul>' + pick("reference/") + "</ul></div>" +
    '<div class="mp-box"><h2>最近の編集</h2><ul>' + recent + "</ul><p class=\"sub\"><a href=\"/w/%E6%9C%80%E8%BF%91%E3%81%AE%E7%B7%A8%E9%9B%86\">もっと見る →</a></p></div>" +
    "</div>" +
    '<div class="mp-grid">' +
    '<div class="mp-box"><h2>新しいページを作る</h2>' +
    '<form method="get" action="/w/%E4%BD%9C%E6%88%90" style="display:flex;gap:.35rem;flex-wrap:wrap"><input type="text" name="p" placeholder="ページ名（例: DSHのアップデート手順）" style="flex:1;min-width:12rem;border:1px solid #a2a9b1;padding:.3rem .5rem" aria-label="新しいページ名"><button type="submit" class="btn">作成する</button></form>' +
    '<p class="sub">作成フォームに進みます。保存すると即公開（履歴あり）。名前は日本語でOKです。</p>' +
    "</div>" +
    '<div class="mp-box"><h2>ルール（短い3つ）</h2><ul>' +
    "<li>事実は<b>条件つきで</b>書く（計測値はどんな環境の数値か）</li>" +
    "<li>ページ末尾に<b>出典</b>を1行以上残す</li>" +
    "<li>本Wikiは<b>非公式</b>。「DeepSeek Harness」をプロジェクト名には使わない（略称 DSH を使用）</li>" +
    '</ul><p class="sub">くわしくは <a href="https://github.com/jimoto-no-llm/dsh-wiki/blob/main/CONTRIBUTING.md">CONTRIBUTING</a> へ。</p></div>' +
    "</div>" +
    (rootSlugs.length ? '<h2>その他のページ</h2><ul>' + rootSlugs.sort().map(pageLink).join("\n") + "</ul>" : "");
  return htmlResp(body, "メインページ");
}

async function searchPage(env: Env, query: string): Promise<Response> {
  const trimmed = query.trim();
  if (!trimmed) {
    return htmlResp(
      "<h1>検索</h1><form method=\"get\" action=\"/w/%E6%A4%9C%E7%B4%A2\" class=\"searchbox\"><input type=\"text\" name=\"q\" style=\"width:16rem;border:1px solid #a2a9b1;padding:.3rem .5rem\"><button type=\"submit\" class=\"btn\">検索</button></form>\n<p>本文とページ名をまとめて調べます。</p>",
      "検索",
    );
  }
  const idx = await listIndex(env);
  const exact = idx.find((s) => PAGE_INFO[s]?.t === trimmed || s === trimmed);
  if (exact) {
    return Response.redirect(SITE + "/w/" + encodeURIComponent(exact), 303);
  }
  const needle = trimmed.toLowerCase();
  const hits: { slug: string; snippet: string }[] = [];
  for (const slug of idx) {
    const doc = await getDoc(env, slug);
    if (!doc) continue;
    const whole = slug + "\n" + (PAGE_INFO[slug]?.t ?? "") + "\n" + doc.current.content;
    const pos = whole.toLowerCase().indexOf(needle);
    if (pos === -1) continue;
    const start = Math.max(0, pos - 40);
    const bodyTxt = whole.slice(start, pos + needle.length + 80).replace(/\s+/g, " ");
    hits.push({ slug, snippet: bodyTxt });
  }
  hits.sort((a, b) => a.slug.localeCompare(b.slug, "ja"));
  const list = hits
    .map(
      (h) =>
        '<li><a href="/w/' +
        encodeURIComponent(h.slug) +
        '">' +
        esc(pageTitle(h.slug)) +
        "</a><div class=\"sub\">…" +
        esc(h.snippet) +
        "…</div></li>",
    )
    .join("\n");
  const body =
    "<h1>検索: " +
    esc(trimmed) +
    "</h1>" +
    (hits.length
      ? "<ul>" + list + "</ul>"
      : '<div class="warning">見つかりませんでした。<a href="/go?p=' +
        encodeURIComponent(trimmed) +
        '">この名前で新しいページを作る</a>ことはできます（アカウント不要）。</div>');
  return htmlResp(body, "検索 / " + trimmed);
}

async function recentPage(env: Env): Promise<Response> {
  const idx = await listIndex(env);
  type Row = { slug: string; ts: number; by: string };
  const rows: Row[] = [];
  for (const slug of idx) {
    const doc = await getDoc(env, slug);
    if (!doc) continue;
    rows.push({ slug, ts: doc.current.at, by: doc.current.by || "匿名" });
    for (const r of doc.revs.slice(0, 5)) rows.push({ slug, ts: r.ts, by: r.by || "匿名" });
  }
  rows.sort((a, b) => b.ts - a.ts);
  const list = rows
    .slice(0, 50)
    .map(
      (r) =>
        "<li>" +
        new Date(r.ts).toISOString().replace("T", " ").slice(0, 16) +
        "　<a href=\"/w/" +
        encodeURIComponent(r.slug) +
        "\">" +
        esc(r.slug) +
        "</a>　（" +
        esc(r.by) +
        "）</li>",
    )
    .join("\n");
  return htmlResp("<h1>最近の編集</h1><ul>" + list + "</ul>", "最近の編集");
}

async function editPage(env: Env, slug: string, err: string): Promise<Response> {
  const doc = await getDoc(env, slug);
  const locked = (await env.WIKI.get("lock:" + slug)) === "1";
  const content = doc ? doc.current.content : "";
  if (locked) {
    return htmlResp(
      "<h1>" + esc(slug) + "</h1><div class=\"warning\">このページは現在編集停止中です（スパム対策）。</div>",
      slug,
      { slug },
    );
  }
  const errBox = err
    ? '<div class="warning">保存できませんでした: ' + esc(err) + "。 内容を直して再度保存してください。</div>"
    : "";
  const body =
    "<h1>" +
    (doc ? "編集: " : "新規作成: ") +
    esc(slug) +
    "</h1>" +
    errBox +
    '<form method="post" action="/w/' +
    encodeURIComponent(slug) +
    '">' +
    '<p><label>署名（任意・40字まで）: <input name="by" maxlength="40" style="width:16rem"></label></p>' +
    '<p><textarea name="content" rows="22" style="width:100%;font-family:monospace">' +
    esc(content) +
    "</textarea></p>" +
    '<p><button type="submit" style="padding:.4rem 1.2rem">保存して公開</button>　保存すると即公開されます（履歴に残ります）。</p>' +
    "</form>" +
    '<p class="revlist">ヒント: 見出しは <code>## 見出し</code>、リンクは <code>[文字](URL)</code>、コードは <code>```</code> で囲む。</p>';
  return htmlResp(body, "編集 / " + slug, { slug });
}

async function historyPage(env: Env, slug: string): Promise<Response> {
  const doc = await getDoc(env, slug);
  if (!doc) return htmlResp("<h1>履歴なし</h1><p>このページはまだありません。</p>", slug, { status: 404 });
  const items: string[] = [];
  items.push(
    "<li><strong>現行版</strong>　" +
      new Date(doc.current.at).toISOString().replace("T", " ").slice(0, 16) +
      "　（" + esc(doc.current.by || "匿名") + "）</li>",
  );
  doc.revs.forEach((r, n) => {
    items.push(
      "<li><a href=\"/w/" +
        encodeURIComponent(slug) +
        "?v=" +
        (doc.revs.length - n) +
        "\">" +
        new Date(r.ts).toISOString().replace("T", " ").slice(0, 16) +
        "</a>　（" +
        esc(r.by || "匿名") +
        "・" +
        r.len +
        "字）</li>",
    );
  });
  return htmlResp(
    "<h1>" + esc(slug) + " の履歴</h1><ul class=\"revlist\">" + items.join("\n") + "</ul>",
    "履歴 / " + slug,
    { slug },
  );
}

async function revisionPage(env: Env, slug: string, vn: string): Promise<Response> {
  const doc = await getDoc(env, slug);
  if (!doc) return htmlResp("<h1>見つかりません</h1>", slug, { status: 404 });
  const n = Number(vn);
  if (!Number.isInteger(n) || n < 1 || n > doc.revs.length) {
    return htmlResp("<h1>版が見つかりません</h1>", slug, { status: 404 });
  }
  const meta = doc.revs[doc.revs.length - n];
  const raw = await env.WIKI.get("rev:" + slug + ":" + meta.ts);
  if (!raw) return htmlResp("<h1>版データが見つかりません</h1>", slug, { status: 404 });
  const cur = JSON.parse(raw) as { content: string };
  const body =
    "<h1>" + esc(slug) + " <small>（過去版 " + n + "）</small></h1>" +
    '<div class="warning">過去版の閲覧です。現行版は<a href="/w/' +
    encodeURIComponent(slug) +
    '">こちら</a>。この版に戻すには、内容をコピーして<a href="/w/' +
    encodeURIComponent(slug) +
    '?edit">編集フォーム</a>に貼り付けて保存します。</div>' +
    mdToHtml(cur.content);
  return htmlResp(body, slug + " v" + n, { slug });
}

/* ---------- POST ---------- */

/* ---------- 悪用対策ユーティリティ ---------- */

function countExternalLinks(content: string): number {
  const urls = content.match(/https?:\/\/[^\s)\]>'"]+/gi) ?? [];
  return new Set(urls.map((u) => u.toLowerCase())).size;
}

const okAdmin = (env: Env, req: Request): boolean => {
  if (!env.ADMIN_TOKEN) return false;
  const t = req.headers.get("x-admin-token") ?? "";
  if (t.length !== env.ADMIN_TOKEN.length) return false;
  // タイミング差を見せない簡易比較
  let diff = 0;
  for (let i = 0; i < env.ADMIN_TOKEN.length; i++) diff |= t.charCodeAt(i) ^ env.ADMIN_TOKEN.charCodeAt(i);
  return diff === 0;
};

async function removePage(env: Env, slug: string): Promise<number> {
  // KV list は結果整合なので、版tsはドキュメントから取る（list はフォールバック）
  let removed = 0;
  const doc = await getDoc(env, slug);
  const tsSet = new Set<number>();
  if (doc) {
    tsSet.add(doc.current.at);
    for (const r of doc.revs) tsSet.add(r.ts);
  }
  const keys = await env.WIKI.list({ prefix: "rev:" + slug + ":" });
  for (const k of keys.keys) {
    const m = k.name.match(/:(\d+)$/);
    if (m) tsSet.add(Number(m[1]));
  }
  for (const ts of tsSet) {
    await env.WIKI.delete("rev:" + slug + ":" + ts);
    removed++;
  }
  await env.WIKI.delete("page:" + slug);
  const idx = await listIndex(env);
  const next = idx.filter((s) => s !== slug);
  if (next.length !== idx.length) await env.WIKI.put("index", JSON.stringify(next));
  return removed;
}

async function adminAction(req: Request, env: Env, url: URL): Promise<Response> {
  const slug = normSlug(url.pathname.replace(/^\/w\/?/, ""));
  if (!okAdmin(env, req)) return jsonResp({ ok: false, error: "admin token missing or wrong" }, 403);
  const action = url.searchParams.get("admin") ?? "";
  if (action === "lock") {
    await env.WIKI.put("lock:" + slug, "1");
    return jsonResp({ ok: true, action: "lock", slug });
  }
  if (action === "unlock") {
    await env.WIKI.delete("lock:" + slug);
    return jsonResp({ ok: true, action: "unlock", slug });
  }
  if (action === "delete") {
    const revs = await removePage(env, slug);
    return jsonResp({ ok: true, action: "delete", slug, revs_removed: revs });
  }
  if (action === "status") {
    const doc = await getDoc(env, slug);
    return jsonResp({
      ok: true,
      slug,
      exists: !!doc,
      locked: (await env.WIKI.get("lock:" + slug)) === "1",
      last: doc ? { at: doc.current.at, by: doc.current.by, ip: doc.current.ip, len: doc.current.content.length } : null,
    });
  }
  return jsonResp({ ok: false, error: "unknown action" }, 400);
}

// ブラウザフォームからの保存失敗は、JSONではなく編集フォームへ戻す（戻り先にメッセージ）
function saveError(url: URL, slug: string, msg: string): Response {
  return Response.redirect(
    SITE + "/w/" + encodeURIComponent(slug) + "?edit&err=" + encodeURIComponent(msg),
    303,
  );
}

async function doPost(req: Request, env: Env, url: URL): Promise<Response> {
  const slug = normSlug(url.pathname.replace(/^\/w\/?/, ""));
  if (!slugValid(slug)) return jsonResp({ ok: false, error: "invalid slug" }, 400);

  const origin = req.headers.get("origin");
  const host = new URL(req.url).origin;
  if (origin && origin !== SITE && origin !== host) {
    return jsonResp({ ok: false, error: "bad origin" }, 403);
  }

  // 本文サイズを formData 解析前にチェック（巨大リクエストのリソース消費防止）
  const clen = Number(req.headers.get("content-length") ?? "0");
  if (clen > MAX_BODY + 16_384) {
    return saveError(url, slug, "リクエストが大きすぎます");
  }

  const form = await req.formData();
  const content = String(form.get("content") ?? "");
  const by = String(form.get("by") ?? "").trim().slice(0, 40);
  const ip = await ipHash(req);
  const browser = !!origin; // Origin あり=ブラウザフォーム。無しはAPIとしてJSONを返す

  // 1) 自動BAN
  if ((await env.WIKI.get("ban:" + ip)) === "1") {
    return browser ? saveError(url, slug, "一時的に保存が禁止されています（24時間）") : jsonResp({ ok: false, error: "temporarily banned" }, 403);
  }
  // 2) ページロック
  if ((await env.WIKI.get("lock:" + slug)) === "1") {
    return browser ? saveError(url, slug, "このページは編集停止中です") : jsonResp({ ok: false, error: "page is locked" }, 403);
  }
  // 3) 内容チェック（失敗したらレートを消費しない）
  if (!content.trim()) return browser ? saveError(url, slug, "本文が空です") : jsonResp({ ok: false, error: "empty" }, 400);
  if (content.length > MAX_BODY) return browser ? saveError(url, slug, "本文が大きすぎます") : jsonResp({ ok: false, error: "too long" }, 413);
  if (countExternalLinks(content) > MAX_EXTERNAL_LINKS) {
    return browser ? saveError(url, slug, "外部リンクが多すぎます（スパムガード）") : jsonResp({ ok: false, error: "too many external links (spam guard)" }, 400);
  }
  // 4) レート制限（超過でストライク、3回で自動BAN）
  const bucket = Math.floor(Date.now() / RATE_WINDOW_MS);
  const rk = "rl:" + ip + ":" + bucket;
  const cur = Number((await env.WIKI.get(rk)) ?? "0");
  if (cur >= RATE_MAX) {
    const hour = Math.floor(Date.now() / (60 * 60 * 1000));
    const sk = "strikes:" + ip + ":" + hour;
    const strikes = Number((await env.WIKI.get(sk)) ?? "0") + 1;
    if (strikes >= BAN_STRIKES) {
      await env.WIKI.put("ban:" + ip, "1", { expirationTtl: BAN_TTL });
    } else {
      await env.WIKI.put(sk, String(strikes), { expirationTtl: 3 * 60 * 60 });
    }
    return jsonResp({ ok: false, error: "rate limited" }, 429);
  }
  await env.WIKI.put(rk, String(cur + 1), {
    expirationTtl: Math.ceil(RATE_WINDOW_MS / 1000) + 10,
  });

  const key = "page:" + slug;
  const prev = await getDoc(env, slug);
  const now = Date.now();
  const doc: PageDoc = {
    current: { content, at: now, by, ip },
    revs: prev
      ? [
          { ts: prev.current.at, by: prev.current.by, len: prev.current.content.length },
          ...prev.revs,
        ].slice(0, VERSIONS_KEPT)
      : [],
  };
  await env.WIKI.put(key, JSON.stringify(doc));
  await env.WIKI.put("rev:" + slug + ":" + now, JSON.stringify(doc.current));
  if (!prev) await addToIndex(env, slug);
  return Response.redirect("https://dsh.sahen.site/w/" + encodeURIComponent(slug), 303);
}

/* ---------- エントリポイント ---------- */

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const allowed = url.pathname === "/" || url.pathname === "/go" || url.pathname.startsWith("/w");
    if (!allowed) {
      return new Response(null, { status: 404 });
    }
    try {
      if (req.method === "GET" || req.method === "HEAD") return await doGet(req, env, url);
      if (req.method === "POST") {
        if (url.searchParams.has("admin")) return await adminAction(req, env, url);
        return await doPost(req, env, url);
      }
      return jsonResp({ ok: false, error: "method" }, 405);
    } catch (e) {
      return jsonResp({ ok: false, error: String(e) }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
