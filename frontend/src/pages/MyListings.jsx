import { useState } from "react";
import { qs, useApi } from "../api.js";
import { ErrorBox, ListingCard, Loading, Pagination, useTitle } from "../components/ui.jsx";

const TABS = [["", "All"], ["ACTIVE", "Available"], ["SOLD", "Sold"], ["REMOVED", "Removed"]];
const EMPTY = { "": "You have not listed anything yet.", ACTIVE: "Nothing available right now.", SOLD: "Nothing sold yet.", REMOVED: "No listings have been removed." };

export default function MyListings() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { loading, data, error, reload } = useApi("/users/me/listings" + qs({ status, page, limit: 12 }));
  useTitle("My listings");

  return (
    <div className="wrap sec">
      <div className="row"><h2>My listings</h2><a className="btn" href="#/sell">New listing</a></div>
      <div className="bar" role="group" aria-label="Filter by status">
        {TABS.map(([v, label]) => (
          <button key={v} className={"chip" + (status === v ? " on" : "")} aria-pressed={status === v} onClick={() => { setStatus(v); setPage(1); }}>{label}</button>
        ))}
      </div>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : data && (
        <>
          {data.items.length ? (
            <div className="grid">
              {data.items.map((l) => (
                <ListingCard key={l.id} l={l}>
                  {l.removalReason && <div className="notice">Removed by an admin: {l.removalReason}</div>}
                  {l.status === "ACTIVE" && <a className="btn alt sm" href={"#/sell/" + l.id}>Edit</a>}
                </ListingCard>
              ))}
            </div>
          ) : (
            <div className="empty-box">
              <p>{EMPTY[status]}</p>
              {status !== "REMOVED" && <a className="btn sm" href="#/sell">Create a listing</a>}
            </div>
          )}
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
