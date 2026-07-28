import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

// Reusable client-side pagination control. Renders nothing for a single page.
const Pagination = ({ page, totalPages, onChange, className = "" }) => {
  if (totalPages <= 1) return null;

  const go = (p) => onChange(Math.min(totalPages, Math.max(1, p)));

  // Windowed page numbers (up to 5 around the current page).
  const WINDOW = 5;
  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, start + WINDOW - 1);
  start = Math.max(1, end - WINDOW + 1);
  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);

  const btn =
    "min-w-9 h-9 px-3 inline-flex items-center justify-center rounded-lg text-sm font-semibold border border-line transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className={`flex items-center justify-center gap-1.5 flex-wrap ${className}`}>
      <button onClick={() => go(page - 1)} disabled={page === 1} className={`${btn} bg-surface text-main hover:bg-hover`} aria-label="Previous page">
        <FaChevronLeft size={12} />
      </button>
      {start > 1 && (
        <>
          <button onClick={() => go(1)} className={`${btn} bg-surface text-main hover:bg-hover`}>1</button>
          {start > 2 && <span className="text-muted px-1">…</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => go(p)}
          className={`${btn} ${p === page ? "bg-accent text-white border-accent" : "bg-surface text-main hover:bg-hover"}`}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-muted px-1">…</span>}
          <button onClick={() => go(totalPages)} className={`${btn} bg-surface text-main hover:bg-hover`}>{totalPages}</button>
        </>
      )}
      <button onClick={() => go(page + 1)} disabled={page === totalPages} className={`${btn} bg-surface text-main hover:bg-hover`} aria-label="Next page">
        <FaChevronRight size={12} />
      </button>
    </div>
  );
};

export default Pagination;
