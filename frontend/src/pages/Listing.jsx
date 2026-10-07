import { useState } from "react";
import { api, useApi } from "../api";
import { useApp } from "../context/AppContext.jsx";
import { ErrorBox, FieldErr, FormErr, ListingImage, Loading } from "../components/ui.jsx";
import { REASONS, fmtDate } from "../constants";

export default function Listing({ id }) {
  const { user, notify } = useApp();
  const { loading, data, error, reload } = useApi("/listings/" + id);
  const [rep, setRep] = useState({ open: false, reason: "FRAUD", details: "" });
  const [repErr, setRepErr] = useState(null);

  if (loading && !data) return <div className="wrap sec"><Loading /></div>;
  if (error) return <div className="wrap sec"><ErrorBox error={error} /></div>;

  const l = data.listing || data; // works whether or not the response is wrapped
  const v = l.viewer || {};

  // Runs an API call, shows a message, then refreshes (or runs "after")
  const act = async (fn, msg, after) => {
    try {
      await fn();
      notify(msg);
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
  const markSold = () => act(() => api(`/listings/${l.id}/sold`, { method: "POST" }), "Marked as sold");
  const remove = () => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    act(() => api("/listings/" + l.id, { method: "DELETE" }), "Listing deleted", () => (window.location.hash = "#/my-listings"));
  };
  const sendReport = async (e) => {
    e.preventDefault();
    setRepErr(null);
    const body = { reason: rep.reason };
    if (rep.details.trim()) body.details = rep.details.trim();
    try {
      const r = await api(`/listings/${l.id}/reports`, { method: "POST", body });
      notify(r.message);
      setRep({ open: false, reason: "FRAUD", details: "" });
    } catch (e2) {
      setRepErr(e2);
    }
  };

  return (
    <div className="wrap sec">
      <div className="cols">
        <ListingImage l={l} className="hero-img" alt={l.title} />
        <div>
          <div className="row" style={{ justifyContent: "flex-start" }}>
            <span className="tag">{l.categoryLabel}</span>
            <span className={"tag" + (l.status === "SOLD" ? " sold" : l.status === "REMOVED" ? " off" : "")}>{l.statusLabel}</span>
          </div>
          <h1 style={{ fontSize: "2rem", margin: "10px 0" }}>{l.title}</h1>
          <div className="price" style={{ fontSize: "1.6rem" }}>R{l.price}</div>
          <p style={{ whiteSpace: "pre-wrap" }}>{l.description}</p>
          <p className="meta">
            Sold by <a href={"#/seller/" + l.seller.id}>{l.seller.name}</a>
            {l.seller.memberSince && <>, member since {fmtDate(l.seller.memberSince)}</>}
          </p>

          {l.moderation && (
            <div className="notice">Removed by an admin: {l.moderation.removalReason}</div>
          )}

          <div className="row" style={{ justifyContent: "flex-start", gap: 10 }}>
            {l.canContact && l.contact ? (
              <>
                <a className="btn" href={l.contact.mailto}>Email seller</a>
                {l.contact.tel && <a className="btn alt" href={l.contact.tel}>Call seller</a>}
              </>
            ) : (
              <button className="btn" disabled>{l.status === "SOLD" ? "Sold, seller cannot be contacted" : "Contact unavailable"}</button>
            )}
          </div>

          {user ? (
            <div className="row" style={{ justifyContent: "flex-start", gap: 10, marginTop: 14 }}>
              {v.canWishlist && <button className="btn alt" onClick={toggleWish}>{v.inWishlist ? "Remove from wishlist" : "Save to wishlist"}</button>}
              {v.canEdit && <a className="btn alt" href={"#/sell/" + l.id}>Edit</a>}
              {v.canMarkSold && <button className="btn alt" onClick={markSold}>Mark as sold</button>}
              {v.canDelete && <button className="btn alt" onClick={remove}>Delete</button>}
              {v.canReport && <button className="btn alt" onClick={() => setRep({ ...rep, open: !rep.open })}>Report listing</button>}
            </div>
          ) : (
            <p className="meta" style={{ marginTop: 14 }}><a href="#/login">Log in</a> to save or report this listing.</p>
          )}

          {rep.open && (
            <form className="panel" onSubmit={sendReport}>
              <label htmlFor="rs">Reason</label>
              <select id="rs" value={rep.reason} onChange={(e) => setRep({ ...rep, reason: e.target.value })}>
                {REASONS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
              <label htmlFor="rd">Details {rep.reason === "OTHER" ? "(required)" : "(optional)"}</label>
              <textarea className="field" id="rd" rows="3" value={rep.details} onChange={(e) => setRep({ ...rep, details: e.target.value })} />
              <FieldErr err={repErr} name="details" />
              <FormErr err={repErr} />
              <button className="btn">Send report</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}