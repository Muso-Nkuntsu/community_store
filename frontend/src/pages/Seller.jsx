import { useState } from "react";
import { qs, useApi } from "../api";
import { ErrorBox, ListingCard, Loading, Pagination } from "../components/ui.jsx";
import { fmtDate } from "../constants";

export default function Seller({ id }) {
  const [page, setPage] = useState(1);
  const info = useApi("/users/" + id);
  const list = useApi("/listings" + qs({ sellerId: id, status: "ACTIVE", page, limit: 12 }));

  if (info.loading && !info.data) return <div className="wrap sec"><Loading /></div>;
  if (info.error) return <div className="wrap sec"><ErrorBox error={info.error} /></div>;
  const s = info.data.seller;

  return (
    <div className="wrap sec">
      <h2>{s.name}</h2>
      <p className="meta">Member since {fmtDate(s.memberSince)}. {s.stats.activeListings} available, {s.stats.soldListings} sold.</p>
      {s.contact && (
        <div className="row" style={{ justifyContent: "flex-start", gap: 10 }}>
          <a className="btn" href={s.contact.mailto}>Email</a>
          {s.contact.tel && <a className="btn alt" href={s.contact.tel}>Call</a>}
        </div>
      )}
      <h3 style={{ margin: "22px 0 12px" }}>Available listings</h3>
      <ErrorBox error={list.error} />
      {list.data && (
        <>
          <div className="grid">
            {list.data.items.length ? list.data.items.map((l) => <ListingCard key={l.id} l={l} />) : <p className="empty">No listings available right now.</p>}
          </div>
          <Pagination page={list.data.page} totalPages={list.data.totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}