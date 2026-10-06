import { useState } from "react";
import { api, qs, useApi } from "../api";
import { useApp } from "../context/AppContext.jsx";
import { ErrorBox, Loading, Pagination } from "../components/ui.jsx";
import { CATEGORIES, fmtDate } from "../constants";

const TABS = ["Overview", "Users", "Listings", "Reports"];

export default function Admin() {
  const [tab, setTab] = useState("Overview");
  return (
    <div className="wrap sec">
      <h2>Admin</h2>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={"chip" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === "Overview" ? <Overview /> : tab === "Users" ? <Users /> : tab === "Listings" ? <AdminListings /> : <Reports />}
    </div>
  );
}

function Overview() {
  const { loading, data, error } = useApi("/admin/stats");
  const names = {
    users: "Users", activeUsers: "Active users", listings: "Listings", activeListings: "Available listings",
    soldListings: "Sold listings", removedListings: "Removed listings", pendingReports: "Pending reports",
  };
  if (error) return <ErrorBox error={error} />;
  if (loading || !data) return <Loading />;
  return (
    <div className="stats">
      {Object.entries(names).map(([k, label]) => (
        <div className="stat" key={k}><b>{data.stats[k]}</b>{label}</div>
      ))}
    </div>
  );
}

function Users() {
  const { notify } = useApp();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { loading, data, error, reload } = useApi("/admin/users" + qs({ q, status, page, limit: 20 }));

  const setActive = async (u, isActive) => {
    const body = { isActive };
    if (!isActive) {
      const reason = window.prompt("Reason for deactivating " + u.name + "?");
      if (reason === null) return;
      if (reason.trim()) body.reason = reason.trim();
    }
    try {
      await api("/admin/users/" + u.id, { method: "PATCH", body });
      notify(isActive ? "User reactivated" : "User deactivated");
      reload();
    } catch (e) { notify(e.message); }
  };

  return (
    <>
      <div className="bar">
        <input className="field" style={{ maxWidth: 280 }} placeholder="Search name, email or student number" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ width: "auto", marginLeft: 0 }}>
          <option value="">All users</option><option value="active">Active</option><option value="inactive">Deactivated</option>
        </select>
      </div>
      <ErrorBox error={error} />
      {loading && !data ? <Loading /> : data && (
        <>
          <div className="tblwrap">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Listings</th><th>Reports filed</th><th></th></tr></thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td><td>{u.email}</td><td>{u.role}</td>
                    <td>{u.isActive ? "Active" : "Deactivated" + (u.deactivationReason ? ": " + u.deactivationReason : "")}</td>
                    <td>{u.listingCount}</td><td>{u.reportsFiled}</td>
                    <td>{u.isActive
                      ? <button className="btn alt sm" onClick={() => setActive(u, false)}>Deactivate</button>
                      : <button className="btn alt sm" onClick={() => setActive(u, true)}>Reactivate</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </>
  );
}

function AdminListings() {
  const { notify } = useApp();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { loading, data, error, reload } = useApi("/admin/listings" + qs({ q, status, page, limit: 20 }));

  const removeListing = async (l) => {
    const reason = window.prompt('Reason for removing "' + l.title + '" (5 to 500 characters):');
    if (!reason) return;
    try {
      await api("/admin/listings/" + l.id, { method: "DELETE", body: { reason: reason.trim() } });
      notify("Listing removed");
      reload();
    } catch (e) { notify(e.message); }
  };

  return (
    <>
      <div className="bar">
        <input className="field" style={{ maxWidth: 280 }} placeholder="Search title or seller" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ width: "auto", marginLeft: 0 }}>
          <option value="">All statuses</option><option value="ACTIVE">Available</option><option value="SOLD">Sold</option><option value="REMOVED">Removed</option>
        </select>
      </div>
      <ErrorBox error={error} />
      {loading && !data ? <Loading /> : data && (
        <>
          <div className="tblwrap">
            <table className="tbl">
              <thead><tr><th>Listing</th><th>Category</th><th>Price</th><th>Seller</th><th>Status</th><th>Reports</th><th></th></tr></thead>
              <tbody>
                {data.items.map((l) => (
                  <tr key={l.id}>
                    <td><a href={"#/listing/" + l.id}>{l.title}</a></td>
                    <td>{l.categoryLabel || (CATEGORIES.find(([v]) => v === l.category) || [])[1]}</td>
                    <td>R{l.price}</td>
                    <td>{l.seller.name}<div className="meta">{l.seller.email}</div></td>
                    <td>{l.statusLabel}{l.removalReason ? ": " + l.removalReason : ""}</td>
                    <td>{l.reportCount}</td>
                    <td>{l.status !== "REMOVED" && <button className="btn alt sm" onClick={() => removeListing(l)}>Remove</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </>
  );
}

function Reports() {
  const { notify } = useApp();
  const [status, setStatus] = useState("OPEN");
  const [page, setPage] = useState(1);
  const { loading, data, error, reload } = useApi("/admin/reports" + qs({ status, page, limit: 20 }));

  const update = async (r, body) => {
    try {
      await api("/admin/reports/" + r.id, { method: "PATCH", body });
      notify("Report updated");
      reload();
    } catch (e) { notify(e.message); }
  };
  const actionTaken = (r) => {
    const note = window.prompt("Resolution note (optional):");
    if (note === null) return;
    const body = { status: "ACTION_TAKEN" };
    if (note.trim()) body.resolutionNote = note.trim();
    if (window.confirm("Also remove the listing?")) {
      const why = window.prompt("Reason for removing the listing (5 to 500 characters):");
      if (!why) return;
      body.removeListing = true;
      body.removalReason = why.trim();
    }
    update(r, body);
  };

  return (
    <>
      <div className="bar">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ width: "auto", marginLeft: 0 }}>
          <option value="OPEN">Open (pending and in review)</option>
          <option value="PENDING">Pending</option>
          <option value="REVIEWED">In review</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="ACTION_TAKEN">Action taken</option>
        </select>
      </div>
      <ErrorBox error={error} />
      {loading && !data ? <Loading /> : data && (
        <>
          {data.items.length ? data.items.map((r) => {
            const closed = r.status === "DISMISSED" || r.status === "ACTION_TAKEN";
            return (
              <div className="item" key={r.id}>
                <div className="row">
                  <b>{r.reasonLabel}</b><span className="tag">{r.statusLabel}</span>
                </div>
                <div>Listing: <a href={"#/listing/" + r.listing.id}>{r.listing.title}</a> ({r.listing.status})</div>
                <div className="meta">Reported by {r.reporter.name} ({r.reporter.email}) on {fmtDate(r.createdAt)}</div>
                {r.details && <p>{r.details}</p>}
                {r.resolutionNote && <div className="notice">Note: {r.resolutionNote}</div>}
                {!closed && (
                  <div className="row" style={{ justifyContent: "flex-start", gap: 8 }}>
                    {r.status === "PENDING" && <button className="btn alt sm" onClick={() => update(r, { status: "REVIEWED" })}>Mark as in review</button>}
                    <button className="btn alt sm" onClick={() => update(r, { status: "DISMISSED" })}>Dismiss</button>
                    <button className="btn sm" onClick={() => actionTaken(r)}>Action taken</button>
                  </div>
                )}
              </div>
            );
          }) : <p className="empty">No reports here.</p>}
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </>
  );
}