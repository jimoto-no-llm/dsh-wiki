import { useEffect, useMemo, useRef, useState } from "react";
import articles from "../../src/data/articles.json";

type A = { slug: string; title: string; desc: string; catLabel: string };

export default function Search() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const hits = useMemo(() => {
    const all = articles as A[];
    const n = q.trim().toLowerCase();
    if (!n) return all.slice(0, 8);
    return all.filter((a) => (a.title + " " + a.desc + " " + a.slug).toLowerCase().includes(n)).slice(0, 24);
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === "Escape") setOpen(false);
    };
    const ext = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-search", ext as EventListener);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("open-search", ext as EventListener); };
  }, []);

  useEffect(() => { if (open) { setQ(""); setIdx(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);
  useEffect(() => { listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" }); }, [idx]);

  const go = (slug: string) => { window.location.href = "/" + slug; };

  return (
    <>
      <div className="bigsearch">
        <button type="button" onClick={() => setOpen(true)}>
          <span aria-hidden="true">⌕</span>
          <span>記事を検索</span>
          <span className="keys"><kbd>⌘</kbd><kbd>K</kbd></span>
        </button>
      </div>
      {open && (
        <div className="overlay" onMouseDown={() => setOpen(false)}>
          <div className="palette" role="dialog" aria-modal="true" aria-label="記事検索" onMouseDown={(e) => e.stopPropagation()}>
            <div className="palette-input">
              <span aria-hidden="true">⌕</span>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setIdx(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, hits.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
                  else if (e.key === "Enter") { e.preventDefault(); const t = hits[idx]; if (t) go(t.slug); }
                }}
                placeholder="記事名・説明で検索"
                aria-label="検索キーワード"
              />
              <kbd>Esc</kbd>
            </div>
            <div className="palette-list" ref={listRef} role="listbox">
              {hits.map((a, i) => (
                <div key={a.slug} role="option" aria-selected={i === idx} className="palette-item"
                     onMouseEnter={() => setIdx(i)} onClick={() => go(a.slug)}>
                  <span className="t">{a.title}</span>
                  <span className="s">{a.catLabel}</span>
                </div>
              ))}
              {hits.length === 0 && <div className="palette-empty">該当する記事がありません</div>}
            </div>
            <div className="palette-foot">
              <span><kbd>↑</kbd><kbd>↓</kbd> 移動</span>
              <span><kbd>↵</kbd> 開く</span>
              <span className="sp" />
              <span className="num">{articles.length} 記事</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
