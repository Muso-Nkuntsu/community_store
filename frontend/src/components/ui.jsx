// Small shared pieces used by many pages

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
      <a href={"#/listing/" + l.id}><img className="thumb" src={l.displayImageUrl} alt="" /></a>
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