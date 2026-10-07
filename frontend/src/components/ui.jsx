// Small shared pieces used by many pages
import { useState } from "react";

// Simple line icons shown when a listing has no photo, one per category
const ICONS = {
  TEXTBOOKS: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z M4 19a2 2 0 0 0 2 2h13",
  ELECTRONICS: "M5 5h14v10H5z M2 19h20",
  SERVICES: "M3 8h18v11H3z M9 8V5h6v3",
  CLOTHING: "M8 3 3 6l2 4 2-1v11h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z",
  FURNITURE: "M7 3v9h10V3 M5 12h14v4H5z M7 16v5 M17 16v5",
  OTHER: "M3 8l9-5 9 5v8l-9 5-9-5z M3 8l9 5 9-5 M12 13v8",
};

// A listing's photo. Falls back to a category tile when there is no photo or it fails to load.
export function ListingImage({ l, className = "thumb", alt = "" }) {
  const [failed, setFailed] = useState(false);
  if (l.imageUrl && !failed) {
    return <img className={className} src={l.imageUrl} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
  }
  return (
    <div className={className + " ph"} role="img" aria-label={alt || "No photo"}>
      <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={ICONS[l.category] || ICONS.OTHER} />
      </svg>
      <span>{l.categoryLabel || "No photo"}</span>
    </div>
  );
}

export const Loading = () => <p className="empty">Loading...</p>;

// Shows a request error. A 401 means the session ended, so offer the login link.
export function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="panel" role="alert">
      <b>{error.status === 401 ? "Please log in to continue." : error.message}</b>
      {error.status === 401 && <p><a className="btn" href="#/login">Log in</a></p>}
    </div>
  );
}

// Per-field validation message from the backend (error.fields.<name> is an array)
export const FieldErr = ({ err, name }) => {
  const f = err?.fields?.[name];
  return f ? <div className="err">{f.join(" ")}</div> : null;
};

// General message for a form, shown only when there are no per-field messages
export const FormErr = ({ err }) => (
  <div className="err" role="alert">
    {err ? (Object.keys(err.fields).length ? "Please fix the highlighted fields." : err.message) : ""}
  </div>
);

export function Pagination({ page, totalPages, onPage }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="row pad" style={{ justifyContent: "center", gap: 14 }}>
      <button className="btn alt sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="meta">Page {page} of {totalPages}</span>
      <button className="btn alt sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}

// ListingCard from the API contract
export function ListingCard({ l, children }) {
  return (
    <article className="card">
      <a href={"#/listing/" + l.id} tabIndex={-1} aria-hidden="true"><ListingImage l={l} /></a>
      <div className="cb">
        <div className="row">
          <span className="tag">{l.categoryLabel}</span>
          {l.status === "SOLD" && <span className="tag sold">Sold</span>}
          {l.status === "REMOVED" && <span className="tag off">Removed</span>}
        </div>
        <h3><a href={"#/listing/" + l.id}>{l.title}</a></h3>
        {l.seller && <div className="meta">by <a href={"#/seller/" + l.seller.id}>{l.seller.name}</a></div>}
        <span className="price">R{l.price}</span>
        {children}
      </div>
    </article>
  );
}