import { useState } from "react";
import { qs, useApi } from "../api.js";
import { ErrorBox, ListingCard, Loading, Pagination } from "../components/ui.jsx";

const TABS = [["", "All"], ["ACTIVE", "Available"], ["SOLD", "Sold"], ["REMOVED", "Removed"]];

export default function MyListings() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { loading, data, error } = useApi("/users/me/listings" + qs({ status, page, limit: 12 }));

  return (
    <div className="wrap sec">
      <div className="row"><h2>My listings</h2><a className="btn" href="#/sell">New listing</a></div>
      <div className="bar">
        {TABS.map(([v, label]) => (
          <button key={v} className={"chip" + (status === v ? " on" : "")} onClick={() => { setStatus(v); setPage(1); }}>{label}</button>
        ))}
      </div>
      <ErrorBox error={error} />
      {loading && !data ? <Loading /> : data && (
        <>
          <div className="grid">
            {data.items.length ? data.items.map((l) => (
              <ListingCard key={l.id} l={l}>
                {l.removalReason && <div className="notice">Removed: {l.removalReason}</div>}
                {l.status === "ACTIVE" && <a className="btn alt sm" href={"#/sell/" + l.id}>Edit</a>}
              </ListingCard>
            )) : <p className="empty">Nothing here yet.</p>}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}