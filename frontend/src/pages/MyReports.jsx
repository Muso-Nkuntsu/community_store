import { useApi } from "../api";
import { ErrorBox, Loading, useTitle } from "../components/ui.jsx";
import { fmtDate } from "../constants";

export default function MyReports() {
  const { loading, data, error, reload } = useApi("/reports");
  useTitle("My reports");
  return (
    <div className="wrap sec">
      <p className="crumbs"><a href="#/dashboard">Dashboard</a> / My reports</p>
      <h2>My reports</h2>
      <p className="meta">Listings you have reported and what happened.</p>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : data && (
        data.items.length ? (
          <ul className="items">
            {data.items.map((r) => (
              <li className="item" key={r.id}>
                <div className="row">
                  <b><a href={"#/listing/" + r.listing.id}>{r.listing.title}</a></b>
                  <span className={"tag" + (r.resolvedAt ? " sold" : "")}>{r.statusLabel}</span>
                </div>
                <div className="meta">{r.reasonLabel}, filed {fmtDate(r.createdAt)}{r.resolvedAt ? ", closed " + fmtDate(r.resolvedAt) : ""}</div>
              </li>
            ))}
          </ul>
        ) : <p className="empty">You have not reported anything. If a listing looks wrong, open it and choose Report listing.</p>
      )}
    </div>
  );
}
