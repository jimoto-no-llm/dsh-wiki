import { useMemo, useState } from "react";
import data from "../data/pages.json";

type P = { name: string; slug: string; desc: string };
const pages = data as P[];

export default function SearchBox() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const trimmed = q.trim();
  const hits = useMemo(() => {
    if (!trimmed) return [];
    const s = trimmed.toLowerCase();
    return pages
      .filter((p) => (p.name + p.slug + p.desc).toLowerCase().includes(s))
      .slice(0, 6);
  }, [trimmed]);

  const go = (slug: string) => {
    setOpen(false);
    // 実サイトでは /w/<slug>。ローカルプレビューなので location で飛ばさない
    window.location.hash = slug;
  };

  return (
    <div className="bigsearch">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setOpen(false);
          window.location.hash = "q:" + trimmed;
        }}
      >
        <input
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="このWiki内を検索"
          aria-label="Wiki内検索"
        />
        <button type="submit">検索</button>
      </form>
      {open && hits.length > 0 && (
        <ul className="suggest" role="listbox">
          {hits.map((p) => (
            <li key={p.slug}>
              <a href={"#/w/" + p.slug} onMouseDown={(e) => { e.preventDefault(); go(p.slug); }}>
                <b>{p.name}</b>
                <span>{p.desc}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {open && trimmed && hits.length === 0 && (
        <ul className="suggest" role="listbox">
          <li>
            <a href="#" onMouseDown={(e) => { e.preventDefault(); setOpen(false); }}>
              <b>「{trimmed}」という名前で新しいページを作る</b>
              <span>作成フォームに進みます</span>
            </a>
          </li>
        </ul>
      )}
    </div>
  );
}
