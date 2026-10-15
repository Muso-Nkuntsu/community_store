import { useState } from "react";
import { api, qs, useApi, useDebounced } from "../api";
import { useApp } from "../context/AppContext.jsx";
import { ErrorBox, Loading, Pagination, useTitle } from "../components/ui.jsx";
import { LISTING_STATUS, ROLES, categoryLabel, fmtDate, fmtPrice } from "../constants";

const TABS = ["Overview", "Users", "Listings", "Reports"];
const REMOVAL_REASON = { name: "reason", label: "Reason (the seller will see this)", type: "textarea", required: true, minLength: 5, maxLength: 500 };

export default function Admin() {
  const [tab, setTab] = useState("Overview");
  useTitle("Admin");
  return (
    <div className="wrap sec">
      <h2>Admin</h2>
      <div className="tabs" role="group" aria-label="Admin sections">
        {TABS.map((t) => (
          <button key={t} className={"chip" + (tab === t ? " on" : "")} aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === "Overview" ? <Overview go={setTab} /> : tab === "Users" ? <Users /> : tab === "Listings" ? <AdminListings /> : <Reports />}
    </div>
  );
}

function Overview({ go }) {
  const { loading, data, error, reload } = useApi("/admin/stats");
  const names = [
    ["users", "Users", "Users"], ["activeUsers", "Active users", "Users"],
    ["listings", "Listings", "Listings"], ["activeListings", "Available listings", "Listings"],
    ["soldListings", "Sold listings", "Listings"], ["removedListings", "Removed listings", "Listings"],
    ["pendingReports", "Pending reports", "Reports"],
  ];
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading || !data) return <Loading />;
  return (
    <div className="stats">
      {names.map(([k, label, tab]) => (
        <button className={"stat" + (k === "pendingReports" && data.stats[k] > 0 ? " alert" : "")} key={k} onClick={() => go(tab)}>
          <b>{data.stats[k] ?? 0}</b>{label}
        </button>
      ))}
    </div>
  );
}

// Search box + status filter used by the Users and Listings tabs
function Filters({ q, setQ, placeholder, status, setStatus, options }) {
  return (
    <div className="bar">
      <input className="field search-sm" type="search" aria-label={placeholder} placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
      <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="auto">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

// Shared state for a searchable, filterable, paged admin list
function useAdminList(path, initialStatus = "") {
  const [q, setQRaw] = useState("");
  const [status, setStatusRaw] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const dq = useDebounced(q.trim(), 300);
  const [lastDq, setLastDq] = useState(dq);
  if (dq !== lastDq) { setLastDq(dq); setPage(1); } // a new search starts at page 1
  const res = useApi(path + qs({ q: dq, status, page, limit: 20 }));
  return {
    ...res, q, status, page, setPage,
    setQ: setQRaw,
    setStatus: (v) => { setStatusRaw(v); setPage(1); },
  };
}

function Users() {
  const { user: me, notify, ask } = useApp();
  const list = useAdminList("/admin/users");
  const { loading, data, error, reload } = list;

  const setActive = async (u, isActive) => {
    const body = { isActive };
    if (!isActive) {
      const r = await ask({
        title: "Deactivate " + u.name + "?",
        message: "They will be logged out and cannot log in until you reactivate them.",
        fields: [{ name: "reason", label: "Reason", type: "textarea", maxLength: 500 }],
        confirmLabel: "Deactivate",
        danger: true,
      });
      if (!r) return;
      if (r.reason) body.reason = r.reason;
    }
    try {
      const res = await api("/admin/users/" + u.id, { method: "PATCH", body });
      notify(res?.message || (isActive ? "User reactivated" : "User deactivated"));
      reload();
    } catch (e) { notify(e.message); }
  };

  return (
    <>
      <Filters
        q={list.q} setQ={list.setQ} placeholder="Search name, email or student number"
        status={list.status} setStatus={list.setStatus}
        options={[["", "All users"], ["active", "Active"], ["inactive", "Deactivated"]]}
      />
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : data && (
        <>
          <p className="meta">{data.total ?? data.items.length} user{(data.total ?? data.items.length) === 1 ? "" : "s"}</p>
          <div className="tblwrap">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Listings</th><th>Reports filed</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.items.length ? data.items.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}{u.id === me?.id && <span className="meta"> (you)</span>}</td>
                    <td>{u.email}</td>
                    <td>{ROLES[u.role] || u.role}</td>
                    <td>
                      {u.isActive ? "Active" : <span className="tag off">Deactivated</span>}
                      {!u.isActive && u.deactivationReason && <div className="meta">{u.deactivationReason}</div>}
                    </td>
                    <td>{u.listingCount}</td><td>{u.reportsFiled}</td>
                    <td>{u.id !== me?.id && (u.isActive
                      ? <button className="btn alt sm danger-text" onClick={() => setActive(u, false)}>Deactivate</button>
                      : <button className="btn alt sm" onClick={() => setActive(u, true)}>Reactivate</button>)}</td>
                  </tr>
                )) : <tr><td colSpan={7} className="empty">No users match.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={list.setPage} />
        </>
      )}
    </>
  );
}

function AdminListings() {
  const { notify, ask } = useApp();
  const list = useAdminList("/admin/listings");
  const { loading, data, error, reload } = list;

  const removeListing = async (l) => {
    const r = await ask({
      title: `Remove "${l.title}"?`,
      message: "The listing is hidden from buyers. Nothing is erased.",
      fields: [REMOVAL_REASON],
      confirmLabel: "Remove listing",
      danger: true,
    });
    if (!r) return;
    try {
      await api("/admin/listings/" + l.id, { method: "DELETE", body: { reason: r.reason } });
      notify("Listing removed");
      reload();
    } catch (e) { notify(e.message); }
  };

  return (
    <>
      <Filters
        q={list.q} setQ={list.setQ} placeholder="Search title or seller"
        status={list.status} setStatus={list.setStatus}
        options={[["", "All statuses"], ["ACTIVE", "Available"], ["SOLD", "Sold"], ["REMOVED", "Removed"]]}
      />
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : data && (
        <>
          <div className="tblwrap">
            <table className="tbl">
              <thead><tr><th>Listing</th><th>Category</th><th>Price</th><th>Seller</th><th>Status</th><th>Reports</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.items.length ? data.items.map((l) => (
                  <tr key={l.id}>
                    <td><a href={"#/listing/" + l.id}>{l.title}</a></td>
                    <td>{l.categoryLabel || categoryLabel(l.category)}</td>
                    <td className="num-cell">{fmtPrice(l.price)}</td>
                    <td>{l.seller?.name}<div className="meta">{l.seller?.email}</div></td>
                    <td>
                      {l.statusLabel || LISTING_STATUS[l.status]}
                      {l.removalReason && <div className="meta">{l.removalReason}</div>}
                    </td>
                    <td className="num-cell">{l.reportCount > 0 ? <b>{l.reportCount}</b> : 0}</td>
                    <td>{l.status !== "REMOVED" && <button className="btn alt sm danger-text" onClick={() => removeListing(l)}>Remove</button>}</td>
                  </tr>
                )) : <tr><td colSpan={7} className="empty">No listings match.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={list.setPage} />
        </>
      )}
    </>
  );
}

function Reports() {
  const { notify, ask } = useApp();
  const [status, setStatus] = useState("OPEN");
  const [page, setPage] = useState(1);
  const { loading, data, error, reload } = useApi("/admin/reports" + qs({ status, page, limit: 20 }));

  const update = async (id, body) => {
    try {
      const res = await api("/admin/reports/" + id, { method: "PATCH", body });
      notify(res?.message || "Report updated");
      reload();
    } catch (e) { notify(e.message); }
  };

  const dismiss = async (r) => {
    const v = await ask({
      title: "Dismiss this report?",
      message: "Use this when the listing is fine. The reporter sees the report as dismissed.",
      fields: [{ name: "resolutionNote", label: "Note", type: "textarea", maxLength: 500 }],
      confirmLabel: "Dismiss report",
    });
    if (!v) return;
    update(r.id, { status: "DISMISSED", ...(v.resolutionNote && { resolutionNote: v.resolutionNote }) });
  };

  const actionTaken = async (r) => {
    const listingLive = r.listing.status !== "REMOVED";
    const v = await ask({
      title: "Close as action taken",
      message: `Report on "${r.listing.title}".`,
      fields: [
        { name: "resolutionNote", label: "Resolution note", type: "textarea", maxLength: 500 },
        ...(listingLive ? [
          { name: "removeListing", label: "Also remove the listing", type: "checkbox" },
          { ...REMOVAL_REASON, name: "removalReason", showIf: (vals) => vals.removeListing },
        ] : []),
      ],
      confirmLabel: "Close report",
    });
    if (!v) return;
    const body = { status: "ACTION_TAKEN" };
    if (v.resolutionNote) body.resolutionNote = v.resolutionNote;
    if (v.removeListing) { body.removeListing = true; body.removalReason = v.removalReason; }
    update(r.id, body);
  };

  return (
    <>
      <div className="bar">
        <select aria-label="Report status" className="auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="OPEN">Open (pending and in review)</option>
          <option value="PENDING">Pending</option>
          <option value="REVIEWED">In review</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="ACTION_TAKEN">Action taken</option>
        </select>
      </div>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : data && (
        <>
          {data.items.length ? (
            <ul className="items">
              {data.items.map((r) => {
                const closed = r.status === "DISMISSED" || r.status === "ACTION_TAKEN";
                return (
                  <li className="item" key={r.id}>
                    <div className="row">
                      <b>{r.reasonLabel}</b><span className={"tag" + (closed ? " sold" : "")}>{r.statusLabel}</span>
                    </div>
                    <div>
                      Listing: <a href={"#/listing/" + r.listing.id}>{r.listing.title}</a>{" "}
                      <span className="meta">({LISTING_STATUS[r.listing.status] || r.listing.status})</span>
                    </div>
                    <div className="meta">Reported by {r.reporter.name} ({r.reporter.email}) on {fmtDate(r.createdAt)}</div>
                    {r.details && <p className="quote">{r.details}</p>}
                    {r.resolutionNote && <div className="notice">Note: {r.resolutionNote}</div>}
                    {!closed && (
                      <div className="row start">
                        {r.status === "PENDING" && <button className="btn alt sm" onClick={() => update(r.id, { status: "REVIEWED" })}>Mark as in review</button>}
                        <button className="btn alt sm" onClick={() => dismiss(r)}>Dismiss</button>
                        <button className="btn sm" onClick={() => actionTaken(r)}>Action taken</button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : <p className="empty">{status === "OPEN" ? "No open reports. All caught up." : "No reports here."}</p>}
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </>
  );
}
