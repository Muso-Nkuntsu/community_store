import { api, useApi } from "../api";
import { useApp } from "../context/AppContext.jsx";
import { ErrorBox, ListingCard, Loading, useTitle } from "../components/ui.jsx";
import { fmtPrice } from "../constants";

const WHY = { SOLD: "Sold", REMOVED: "Removed by an admin", DELETED: "Deleted by the seller" };

export default function Wishlist() {
  const { notify } = useApp();
  const { loading, data, error, reload } = useApi("/wishlist");
  useTitle("Wishlist");

  const remove = async (listingId) => {
    try {
      await api("/wishlist/" + listingId, { method: "DELETE" });
      notify("Removed from wishlist");
      reload();
    } catch (e) {
      notify(e.message);
    }
  };

  const items = data?.items || [];
  const unavailable = items.filter((it) => !it.isAvailable).length;

  return (
    <div className="wrap sec">
      <h2>My wishlist</h2>
      {items.length > 0 && (
        <p className="meta">
          {items.length} saved{unavailable ? `, ${unavailable} no longer available` : ""}.
        </p>
      )}
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : data && (
        items.length ? (
          <div className="grid">
            {items.map((it) =>
              it.isAvailable ? (
                <ListingCard key={it.id} l={it.listing}>
                  <button className="btn alt sm" onClick={() => remove(it.listing.id)} aria-label={"Remove " + it.listing.title + " from wishlist"}>Remove</button>
                </ListingCard>
              ) : (
                <article className="card grey" key={it.id}>
                  <div className="cb">
                    <h3>{it.listing.title}</h3>
                    {it.listing.price != null && <span className="price">{fmtPrice(it.listing.price)}</span>}
                    <div className="meta">No longer available{WHY[it.unavailableReason] ? ": " + WHY[it.unavailableReason] : ""}</div>
                    <button className="btn alt sm" onClick={() => remove(it.listing.id)} aria-label={"Remove " + it.listing.title + " from wishlist"}>Remove</button>
                  </div>
                </article>
              )
            )}
          </div>
        ) : (
          <div className="empty-box">
            <p>Nothing saved yet. Open a listing and choose Save to wishlist.</p>
            <a className="btn sm" href="#/">Browse listings</a>
          </div>
        )
      )}
    </div>
  );
}
