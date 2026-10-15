import { useApp } from "../context/AppContext.jsx";
import { LoginLink } from "./ui.jsx";

// Which nav item to highlight for each route (e.g. the seller and listing pages belong to Browse)
const SECTION = { "": "", listing: "", seller: "", reports: "dashboard" };

export default function Header({ route }) {
  const { user, ready, logout } = useApp();
  const current = route in SECTION ? SECTION[route] : route;
  const link = (path, label) => (
    <a href={"#/" + path} className={current === path ? "on" : ""} aria-current={current === path ? "page" : undefined}>
      {label}
    </a>
  );
  return (
    <header>
      <div className="wrap">
        <a className="brand" href="#/">Community Store</a>
        <nav aria-label="Main">
          {link("", "Browse")}
          {link("sell", "Sell")}
          {user && link("wishlist", "Wishlist")}
          {user && link("my-listings", "My listings")}
          {user && link("dashboard", "Dashboard")}
          {user?.role === "ADMIN" && link("admin", "Admin")}
          {link("about", "How it works")}
        </nav>
        {ready && (user
          ? <button className="ib" onClick={logout}>Log out</button>
          : <LoginLink className="ib" />)}
      </div>
    </header>
  );
}
