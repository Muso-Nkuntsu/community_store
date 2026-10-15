// Small shared pieces used by many pages
import { useEffect, useRef, useState } from "react";
import { rememberReturn } from "../context/AppContext.jsx";
import { categoryLabel, fmtPrice } from "../constants";

// Sets the browser tab title for the current page
export function useTitle(title) {
  useEffect(() => {
    document.title = title ? title + " | Community Store" : "Community Store";
  }, [title]);
}

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
  useEffect(() => setFailed(false), [l.imageUrl]); // a new photo gets a fresh try
  if (l.imageUrl && !failed) {
    return <img className={className} src={l.imageUrl} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
  }
  const label = l.categoryLabel || categoryLabel(l.category);
  return (
    <div className={className + " ph"} role="img" aria-label={alt ? alt + " (no photo)" : "No photo"}>
      <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={ICONS[l.category] || ICONS.OTHER} />
      </svg>
      <span aria-hidden="true">{label || "No photo"}</span>
    </div>
  );
}

export const Loading = () => <p className="empty" role="status">Loading...</p>;

// A "Log in" link that brings the person back to the current page afterwards
export function LoginLink({ className, children = "Log in", style }) {
  return (
    <a className={className} style={style} href="#/login" onClick={() => rememberReturn(window.location.hash)}>
      {children}
    </a>
  );
}

// Shows a request error. A 401 means the session ended, so offer the login link.
export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  const is401 = error.status === 401;
  const is404 = error.status === 404;
  return (
    <div className="panel" role="alert">
      <b>{is401 ? "Please log in to continue." : error.message}</b>
      {is401 && <p style={{ marginTop: 10 }}><LoginLink className="btn" /></p>}
      {is404 && <p style={{ marginTop: 10 }}><a className="btn alt" href="#/">Back to listings</a></p>}
      {onRetry && !is401 && !is404 && (
        <p style={{ marginTop: 10 }}><button className="btn alt sm" onClick={onRetry}>Try again</button></p>
      )}
    </div>
  );
}

// Per-field validation message from the backend (error.fields.<name> is an array)
export const FieldErr = ({ err, name }) => {
  const f = err?.fields?.[name];
  return f ? <div className="err" id={"err-" + name}>{[].concat(f).join(" ")}</div> : null;
};

// Props for an input so screen readers link it to its error message
export const invalid = (err, name) =>
  err?.fields?.[name] ? { "aria-invalid": true, "aria-describedby": "err-" + name } : {};

// General message for a form. `shown` lists the fields that have their own <FieldErr>;
// errors for any other field are spelled out here so nothing is ever hidden.
export function FormErr({ err, shown = [] }) {
  const ref = useRef(null);
  // Put the cursor in the first field that has a problem
  useEffect(() => {
    if (err) ref.current?.closest("form")?.querySelector('[aria-invalid="true"]')?.focus();
  }, [err]);
  let text = "";
  if (err) {
    const fields = Object.entries(err.fields || {});
    const extra = fields.filter(([k]) => !shown.includes(k)).map(([, v]) => [].concat(v).join(" "));
    if (!fields.length) text = err.message;
    else if (extra.length) text = extra.join(" ");
    else if (fields.length > 1) text = "Please fix the highlighted fields.";
  }
  return <div className="err" role="alert" ref={ref}>{text}</div>;
}

export function Pagination({ page, totalPages, onPage }) {
  if (!totalPages || totalPages <= 1) return null;
  const go = (p) => { onPage(p); window.scrollTo({ top: 0 }); };
  return (
    <nav className="row pad pager" aria-label="Pages">
      <button className="btn alt sm" disabled={page <= 1} onClick={() => go(page - 1)}>Previous</button>
      <span className="meta">Page {page} of {totalPages}</span>
      <button className="btn alt sm" disabled={page >= totalPages} onClick={() => go(page + 1)}>Next</button>
    </nav>
  );
}

// ListingCard from the API contract
export function ListingCard({ l, children }) {
  return (
    <article className="card">
      <a href={"#/listing/" + l.id} tabIndex={-1} aria-hidden="true"><ListingImage l={l} /></a>
      <div className="cb">
        <div className="row tags">
          <span className="tag">{l.categoryLabel || categoryLabel(l.category)}</span>
          {l.status === "SOLD" && <span className="tag sold">Sold</span>}
          {l.status === "REMOVED" && <span className="tag off">Removed</span>}
        </div>
        <h3><a href={"#/listing/" + l.id}>{l.title}</a></h3>
        {l.seller && <div className="meta">by <a href={"#/seller/" + l.seller.id}>{l.seller.name}</a></div>}
        <span className="price">{fmtPrice(l.price)}</span>
        {children}
      </div>
    </article>
  );
}
