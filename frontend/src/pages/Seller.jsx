import { useState } from "react";
import { qs, useApi } from "../api";
import { ErrorBox, ListingCard, Loading, Pagination, useTitle } from "../components/ui.jsx";
import { fmtDate } from "../constants";

export default function Seller({ id }) {
  const [page, setPage] = useState(1);
  const info = useApi("/users/" + encodeURIComponent(id));
  const list = useApi(info.data ? "/listings" + qs({ sellerId: id, status: "ACTIVE", page, limit: 12 }) : null);
  const s = info.data?.seller;
  useTitle(s?.name || "Seller");

  if (info.loading && !info.data) return <div className="wrap sec"><Loading /></div>;
  if (info.error) return <div className="wrap sec"><ErrorBox error={info.error} onRetry={info.reload} /></div>;

  return (
    <div className="wrap sec">
      <h2>{s.name}</h2>
      <p className="meta">
        Member since {fmtDate(s.memberSince)}. {s.stats?.activeListings ?? 0} available, {s.stats?.soldListings ?? 0} sold.
      </p>
      {s.contact && (
        <div className="row start">
          <a className="btn" href={s.contact.mailto}>Email {s.name.split(" ")[0]}</a>
          {s.contact.tel && <a className="btn alt" href={s.contact.tel}>Call</a>}
        </div>
      )}
      <h3 style={{ margin: "26px 0 12px" }}>Available listings</h3>
      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.loading && !list.data ? <Loading /> : list.data && (
        <>
          {list.data.items.length ? (
            <div className="grid">{list.data.items.map((l) => <ListingCard key={l.id} l={l} />)}</div>
          ) : <p className="empty">No listings available right now.</p>}
          <Pagination page={list.data.page} totalPages={list.data.totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
