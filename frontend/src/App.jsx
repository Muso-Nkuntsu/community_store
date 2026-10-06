import { useEffect, useState } from "react";
import { useApp } from "./context/AppContext.jsx";
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

// Hash routing: "#/listing/abc" gives ["listing", "abc"]
function useRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash || "#/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  const [, a, b] = hash.replace(/^#/, "").split("/");
  return [a || "", b];
}

// Pages that need a login
function NeedLogin({ children }) {
  const { user, ready } = useApp();
  if (!ready) return <div className="wrap sec"><p className="empty">Loading...</p></div>;
  if (!user) {
    return (
      <div className="wrap sec">
        <h2>Log in required</h2>
        <p className="empty">You need to be logged in to see this page.</p>
        <a className="btn" href="#/login">Log in</a>
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

  let page;
  switch (route) {
    case "listing": page = <Listing key={id} id={id} />; break;
    case "sell": page = <NeedLogin><Sell key={id} id={id} /></NeedLogin>; break;
    case "my-listings": page = <NeedLogin><MyListings /></NeedLogin>; break;
    case "wishlist": page = <NeedLogin><Wishlist /></NeedLogin>; break;
    case "dashboard": page = <NeedLogin><Dashboard /></NeedLogin>; break;
    case "reports": page = <NeedLogin><MyReports /></NeedLogin>; break;
    case "seller": page = <Seller key={id} id={id} />; break;
    case "admin": page = <NeedLogin><NeedAdmin><Admin /></NeedAdmin></NeedLogin>; break;
    case "login": page = <Auth mode="login" />; break;
    case "register": page = <Auth mode="register" />; break;
    default: page = <Browse />;
  }

  return (
    <>
      <Header route={route} />
      <main>{page}</main>
      <footer>
        <div className="wrap">Community Store. Buy and sell with students, staff and neighbours.</div>
      </footer>
    </>
  );
}