import { useApp } from "../context/AppContext.jsx";

export default function Header({ route }) {
  const { user, ready, logout } = useApp();
  const link = (path, label, key) => (
    <a href={"#/" + path} className={route === key ? "on" : ""}>{label}</a>
  );
  return (
    <header>
      <div className="wrap">
        <a className="brand" href="#/">Community Store</a>
        <nav aria-label="Main">
          {link("", "Browse", "")}
          {link("sell", "Sell", "sell")}
          {user && link("wishlist", "Wishlist", "wishlist")}
          {user && link("my-listings", "My listings", "my-listings")}
          {user && link("dashboard", "Dashboard", "dashboard")}
          {user?.role === "ADMIN" && link("admin", "Admin", "admin")}
          {link("about", "How it works", "about")}
        </nav>
        {ready && (user
          ? <button className="ib" onClick={logout}>Log out</button>
          : <a className="ib" href="#/login" style={{ textDecoration: "none" }}>Log in</a>)}
      </div>
    </header>
  );
}