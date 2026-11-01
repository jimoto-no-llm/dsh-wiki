import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import data from "../data/pages.json";

type PageRow = {
  slug: string;
  name: string;
  cat: string;
  desc: string;
  updated: string;
  by: string;
};

const CAT_LABEL: Record<string, string> = {
  guide: "DSH ガイド",
  rdsh: "rustdsh",
  reference: "リファレンス",
  meta: "メタ",
};

const helper = createColumnHelper<PageRow>();

export default function PageTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [cat, setCat] = useState("");

  const rows = useMemo(
    () => (cat ? data.filter((d) => d.cat === cat) : data),
    [cat],
  );

  const columns = useMemo(
    () => [
      helper.accessor("name", {
        header: "ページ名",
        cell: (info) => (
          <div className="name">
            <a href={"/w/" + encodeURIComponent(info.row.original.slug)}>
              {info.getValue()}
            </a>
            <span className="dsc">{info.row.original.desc}</span>
          </div>
        ),
      }),
      helper.accessor("cat", {
        header: "分類",
        cell: (info) => CAT_LABEL[info.getValue()] ?? info.getValue(),
      }),
],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
  });

  const shown = table.getRowModel().rows.length;

  return (
    <div>
      <div className="controls">

        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="分類">
          <option value="">全分類</option>
          <option value="guide">DSH ガイド</option>
          <option value="rdsh">rustdsh</option>
          <option value="reference">リファレンス</option>
          <option value="meta">メタ</option>
        </select>
        <span className="count">
          {shown} / {data.length} ページ
        </span>
      </div>
      <div className="table-wrap">
      <table className="pages">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} onClick={h.column.getToggleSortingHandler()}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {"\u00A0"}
                  {{ asc: "↑", desc: "↓" }[h.column.getIsSorted() as string] ?? ""}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {shown === 0 ? (
            <tr>
              <td colSpan={3}>
                該当するページがありません。「新しいページを作る」から登録できます。
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={cell.column.id === "cat" ? "cat" : cell.column.id === "updated" ? "updated" : cell.column.id === "name" ? "name" : ""}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
