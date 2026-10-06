import { api, useApi } from "../api";
import { useApp } from "../context/AppContext.jsx";
import { ErrorBox, ListingCard, Loading } from "../components/ui.jsx";

const WHY = { SOLD: "Sold", REMOVED: "Removed by an admin", DELETED: "Deleted by the seller" };

export default function Wishlist() {
  const { notify } = useApp();
  const { loading, data, error, reload } = useApi("/wishlist");

  const remove = async (listingId) => {
    try {
      await api("/wishlist/" + listingId, { method: "DELETE" });
      notify("Removed from wishlist");
      reload();
    } catch (e) {
      notify(e.message);
    }
  };

  return (
    <div className="wrap sec">
      <h2>My wishlist</h2>
      <ErrorBox error={error} />
      {loading && !data ? <Loading /> : data && (
        data.items.length ? (
          <div className="grid">
            {data.items.map((it) =>
              it.isAvailable ? (
                <ListingCard key={it.id} l={it.listing}>
                  <button className="btn alt sm" onClick={() => remove(it.listing.id)}>Remove</button>
                </ListingCard>
              ) : (
                <article className="card grey" key={it.id}>
                  <div className="cb">
                    <h3>{it.listing.title}</h3>
                    <div className="meta">No longer available{WHY[it.unavailableReason] ? ": " + WHY[it.unavailableReason] : ""}</div>
                    <button className="btn alt sm" onClick={() => remove(it.listing.id)}>Remove</button>
                  </div>
                </article>
              )
            )}
          </div>
        ) : <p className="empty">Nothing saved yet. Tap "Save to wishlist" on a listing.</p>
      )}
    </div>
  );
}