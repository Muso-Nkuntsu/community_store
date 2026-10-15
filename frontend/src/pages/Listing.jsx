import { useState } from "react";
import { api, useApi } from "../api";
import { useApp } from "../context/AppContext.jsx";
import { ErrorBox, FieldErr, FormErr, ListingImage, Loading, LoginLink, invalid, useTitle } from "../components/ui.jsx";
import { LISTING_STATUS, REASONS, categoryLabel, fmtDate, fmtPrice } from "../constants";

const EMPTY_REPORT = { open: false, reason: "FRAUD", details: "" };

export default function Listing({ id }) {
  const { user, notify, confirm, ask } = useApp();
  const { loading, data, error, reload } = useApi("/listings/" + encodeURIComponent(id));
  const [rep, setRep] = useState(EMPTY_REPORT);
  const [repErr, setRepErr] = useState(null);
  const l = data ? data.listing || data : null; // works whether or not the response is wrapped
  useTitle(l?.title || (error ? "Listing not found" : "Listing"));

  if (loading && !data) return <div className="wrap sec"><Loading /></div>;
  if (error) return <div className="wrap sec"><ErrorBox error={error} onRetry={reload} /></div>;

  const v = l.viewer || {};
  const isOwner = user && l.seller && user.id === l.seller.id;
  const canAdminRemove = user?.role === "ADMIN" && l.status !== "REMOVED" && !isOwner;

  // Runs an API call, shows a message, then refreshes (or runs "after")
  const act = async (fn, msg, after) => {
    try {
      const r = await fn();
      notify(r?.message || msg);
      after ? after() : reload();
    } catch (e) {
      notify(e.message);
    }
  };
  const toggleWish = () =>
    act(
      () => (v.inWishlist ? api("/wishlist/" + l.id, { method: "DELETE" }) : api("/wishlist", { method: "POST", body: { listingId: l.id } })),
      v.inWishlist ? "Removed from wishlist" : "Saved to wishlist"
    );
  const markSold = async () => {
    const ok = await confirm({
      title: "Mark as sold?",
      message: "Buyers will see a Sold badge and can no longer contact you about it. This cannot be undone.",
      confirmLabel: "Mark as sold",
    });
    if (ok) act(() => api(`/listings/${l.id}/sold`, { method: "POST" }), "Marked as sold");
  };
  const remove = async () => {
    const ok = await confirm({ title: "Delete this listing?", message: "It will disappear from the site. This cannot be undone.", confirmLabel: "Delete", danger: true });
    if (ok) act(() => api("/listings/" + l.id, { method: "DELETE" }), "Listing deleted", () => (window.location.hash = "#/my-listings"));
  };
  const adminRemove = async () => {
    const r = await ask({
      title: "Remove this listing?",
      message: "The seller will see your reason. The listing is hidden, not erased.",
      fields: [{ name: "reason", label: "Reason", type: "textarea", required: true, minLength: 5, maxLength: 500 }],
      confirmLabel: "Remove listing",
      danger: true,
    });
    if (r) act(() => api("/admin/listings/" + l.id, { method: "DELETE", body: { reason: r.reason } }), "Listing removed");
  };
  const sendReport = async (e) => {
    e.preventDefault();
    setRepErr(null);
    const body = { reason: rep.reason };
    if (rep.details.trim()) body.details = rep.details.trim();
    try {
      const r = await api(`/listings/${l.id}/reports`, { method: "POST", body });
      notify(r.message || "Your report has been received.");
      setRep(EMPTY_REPORT);
      reload();
    } catch (e2) {
      setRepErr(e2);
    }
  };

  const statusClass = l.status === "SOLD" ? " sold" : l.status === "REMOVED" ? " off" : "";

  return (
    <div className="wrap sec">
      <p className="crumbs"><a href="#/">Listings</a> / {l.categoryLabel || categoryLabel(l.category)}</p>
      <div className="cols">
        <ListingImage l={l} className="hero-img" alt={l.title} />
        <div>
          <div className="row start">
            <span className="tag">{l.categoryLabel || categoryLabel(l.category)}</span>
            <span className={"tag" + statusClass}>{l.statusLabel || LISTING_STATUS[l.status]}</span>
          </div>
          <h1 className="listing-title">{l.title}</h1>
          <div className="price big">{fmtPrice(l.price)}</div>
          <p className="desc">{l.description}</p>
          <p className="meta">
            Sold by <a href={"#/seller/" + l.seller.id}>{l.seller.name}</a>
            {l.seller.memberSince && <>, member since {fmtDate(l.seller.memberSince)}</>}
            {l.createdAt && <>. Listed {fmtDate(l.createdAt)}</>}
          </p>

          {l.moderation && (
            <div className="notice">Removed by an admin: {l.moderation.removalReason}</div>
          )}

          <div className="row start">
            {l.canContact && l.contact ? (
              <>
                <a className="btn" href={l.contact.mailto}>Email seller</a>
                {l.contact.tel && <a className="btn alt" href={l.contact.tel}>Call seller</a>}
              </>
            ) : isOwner ? null : (
              <p className="meta">
                {l.status === "SOLD" ? "This item has been sold." : l.status === "REMOVED" ? "This listing is no longer available." : "Contact details are not available."}
              </p>
            )}
          </div>

          {user ? (
            <div className="row start" style={{ marginTop: 14 }}>
              {v.canWishlist && <button className="btn alt" aria-pressed={Boolean(v.inWishlist)} onClick={toggleWish}>{v.inWishlist ? "Remove from wishlist" : "Save to wishlist"}</button>}
              {v.canEdit && <a className="btn alt" href={"#/sell/" + l.id}>Edit</a>}
              {v.canMarkSold && <button className="btn alt" onClick={markSold}>Mark as sold</button>}
              {v.canDelete && <button className="btn alt danger-text" onClick={remove}>Delete</button>}
              {v.canReport && <button className="btn alt" aria-expanded={rep.open} aria-controls="report-form" onClick={() => setRep({ ...rep, open: !rep.open })}>Report listing</button>}
              {canAdminRemove && <button className="btn alt danger-text" onClick={adminRemove}>Remove (admin)</button>}
            </div>
          ) : (
            <p className="meta" style={{ marginTop: 14 }}><LoginLink /> to save or report this listing.</p>
          )}

          {rep.open && (
            <form className="panel" id="report-form" onSubmit={sendReport}>
              <h3>Report this listing</h3>
              <p className="meta">An admin will review it. The seller does not see who reported it.</p>
              <label htmlFor="rs">Reason</label>
              <select id="rs" value={rep.reason} onChange={(e) => setRep({ ...rep, reason: e.target.value })} {...invalid(repErr, "reason")}>
                {REASONS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
              <FieldErr err={repErr} name="reason" />
              <label htmlFor="rd">Details <span className="meta">{rep.reason === "OTHER" ? "(required)" : "(optional)"}</span></label>
              <textarea
                className="field" id="rd" rows="3" maxLength={1000} required={rep.reason === "OTHER"}
                value={rep.details} onChange={(e) => setRep({ ...rep, details: e.target.value })} {...invalid(repErr, "details")}
              />
              <FieldErr err={repErr} name="details" />
              <FormErr err={repErr} shown={["reason", "details"]} />
              <div className="row start">
                <button className="btn">Send report</button>
                <button type="button" className="btn alt" onClick={() => { setRep(EMPTY_REPORT); setRepErr(null); }}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
