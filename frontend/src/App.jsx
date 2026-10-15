import { useEffect, useRef, useState } from "react";
import { useApp } from "./context/AppContext.jsx";
import { Loading, LoginLink, useTitle } from "./components/ui.jsx";
import Header from "./components/Header.jsx";
import Browse from "./pages/Browse.jsx";
import Listing from "./pages/Listing.jsx";
import Sell from "./pages/Sell.jsx";
import MyListings from "./pages/MyListings.jsx";
import Wishlist from "./pages/Wishlist.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Seller from "./pages/Seller.jsx";
import MyReports from "./pages/MyReports.jsx";
import Admin from "./pages/Admin.jsx";
import Auth from "./pages/Auth.jsx";
import About from "./pages/About.jsx";

// Hash routing: "#/listing/abc" gives ["listing", "abc"]
function useRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  const [, a, b] = hash.replace(/^#/, "").split("/");
  return [a || "", b ? decodeURIComponent(b) : undefined];
}

// Pages that need a login
function NeedLogin({ children }) {
  const { user, ready } = useApp();
  useTitle(ready && !user ? "Log in required" : null);
  if (!ready) return <div className="wrap sec"><Loading /></div>;
  if (!user) {
    return (
      <div className="wrap sec">
        <h2>Log in required</h2>
        <p className="empty">You need to be logged in to see this page.</p>
        <div className="row start">
          <LoginLink className="btn" />
          <a className="btn alt" href="#/register">Create an account</a>
        </div>
      </div>
    );
  }
  return children;
}

function NeedAdmin({ children }) {
  const { user } = useApp();
  if (user?.role !== "ADMIN") {
    return <div className="wrap sec"><h2>Admins only</h2><p className="empty">You do not have access to this page.</p></div>;
  }
  return children;
}

export default function App() {
  const [route, id] = useRoute();
  const mainRef = useRef(null);
  const shown = useRef(route + "/" + id);

  // On every page change (not the first load): scroll to the top and move keyboard/screen-reader focus to the new page
  useEffect(() => {
    const key = route + "/" + id;
    if (shown.current === key) return;
    shown.current = key;
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [route, id]);

  let page;
  switch (route) {
    case "listing": page = id ? <Listing key={id} id={id} /> : <Browse />; break;
    case "sell": page = <NeedLogin><Sell key={id || "new"} id={id} /></NeedLogin>; break;
    case "my-listings": page = <NeedLogin><MyListings /></NeedLogin>; break;
    case "wishlist": page = <NeedLogin><Wishlist /></NeedLogin>; break;
    case "dashboard": page = <NeedLogin><Dashboard /></NeedLogin>; break;
    case "reports": page = <NeedLogin><MyReports /></NeedLogin>; break;
    case "seller": page = id ? <Seller key={id} id={id} /> : <Browse />; break;
    case "admin": page = <NeedLogin><NeedAdmin><Admin /></NeedAdmin></NeedLogin>; break;
    case "login": page = <Auth key="login" mode="login" />; break;
    case "register": page = <Auth key="register" mode="register" />; break;
    case "about": page = <About />; break;
    default: page = <Browse />;
  }

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>Skip to content</a>
      <Header route={route} />
      <main id="main" ref={mainRef} tabIndex={-1}>{page}</main>
      <footer>
        <div className="wrap">Community Store. Buy and sell with students, staff and neighbours. <a href="#/about">How it works</a></div>
      </footer>
    </>
  );
}
