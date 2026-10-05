import { useApi } from "../api";
import { ErrorBox, Loading } from "../components/ui.jsx";
import { fmtDate } from "../constants";

export default function MyReports() {
  const { loading, data, error } = useApi("/reports");
  return (
    <div className="wrap sec">
      <h2>My reports</h2>
      <p className="meta">Listings you have reported and what happened.</p>
      <ErrorBox error={error} />
      {loading && !data ? <Loading /> : data && (
        data.items.length ? data.items.map((r) => (
          <div className="item" key={r.id}>
            <div className="row">
              <b><a href={"#/listing/" + r.listing.id}>{r.listing.title}</a></b>
              <span className="tag">{r.statusLabel}</span>
            </div>
            <div className="meta">{r.reasonLabel}, filed {fmtDate(r.createdAt)}{r.resolvedAt ? ", closed " + fmtDate(r.resolvedAt) : ""}</div>
          </div>
        )) : <p className="empty">You have not reported anything.</p>
      )}
    </div>
  );
}