import { useEffect, useState } from "react";
import { api, useApi } from "../api";
import { useApp } from "../context/AppContext.jsx";
import { ErrorBox, FieldErr, FormErr, ListingCard, Loading, invalid, useTitle } from "../components/ui.jsx";
import { ROLES } from "../constants";

const NO_PW = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function Dashboard() {
  const { setUser, notify, confirm } = useApp();
  const { loading, data, error, reload } = useApi("/users/me");
  const [p, setP] = useState({ name: "", email: "", studentId: "", phone: "" });
  const [pErr, setPErr] = useState(null);
  const [pw, setPw] = useState(NO_PW);
  const [pwErr, setPwErr] = useState(null);
  const [delPw, setDelPw] = useState("");
  const [delErr, setDelErr] = useState(null);
  useTitle("Dashboard");

  useEffect(() => {
    if (data) setP({ name: data.user.name, email: data.user.email, studentId: data.user.studentId || "", phone: data.user.phone || "" });
  }, [data]);

  if (loading && !data) return <div className="wrap sec"><Loading /></div>;
  if (error) return <div className="wrap sec"><ErrorBox error={error} onRetry={reload} /></div>;
  const { user, stats, recentListings } = data;

  const saveProfile = async (e) => {
    e.preventDefault();
    setPErr(null);
    try {
      const body = { name: p.name.trim(), email: p.email.trim(), studentId: p.studentId.trim() || null, phone: p.phone.trim() || null };
      const r = await api("/users/me", { method: "PATCH", body });
      setUser({ id: r.user.id, name: r.user.name, email: r.user.email, role: r.user.role });
      notify(r.message || "Profile updated");
      reload();
    } catch (e2) { setPErr(e2); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwErr(null);
    if (pw.newPassword !== pw.confirmPassword) {
      setPwErr({ message: "", fields: { confirmPassword: ["Passwords do not match."] } });
      return;
    }
    try {
      await api("/users/me/password", { method: "POST", body: pw });
      setPw(NO_PW);
      notify("Password changed. Other devices have been logged out.");
    } catch (e2) { setPwErr(e2); }
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    setDelErr(null);
    const ok = await confirm({
      title: "Delete your account?",
      message: "Your listings will disappear and you will be logged out. This cannot be undone.",
      confirmLabel: "Delete my account",
      danger: true,
    });
    if (!ok) return;
    try {
      await api("/users/me", { method: "DELETE", body: { password: delPw } });
      setUser(null);
      notify("Your account has been deleted.");
      window.location.hash = "#/";
    } catch (e2) { setDelErr(e2); }
  };

  const setP1 = (k) => (e) => setP({ ...p, [k]: e.target.value });
  const setPw1 = (k) => (e) => setPw({ ...pw, [k]: e.target.value });

  return (
    <div className="wrap sec">
      <h2>Hi, {user.name.split(" ")[0]}</h2>
      <p className="meta">{ROLES[user.role] || "Member"} account, {user.email}</p>

      <div className="stats">
        <a className="stat" href="#/my-listings"><b>{stats.activeListings}</b>Available listings</a>
        <a className="stat" href="#/my-listings"><b>{stats.soldListings}</b>Sold</a>
        <a className="stat" href="#/wishlist"><b>{stats.wishlistCount}</b>In your wishlist</a>
      </div>
      <div className="row start">
        <a className="btn" href="#/sell">New listing</a>
        <a className="btn alt" href="#/reports">My reports</a>
      </div>

      <div className="row" style={{ margin: "26px 0 12px" }}>
        <h3>Recent listings</h3>
        {recentListings.length > 0 && <a href="#/my-listings">See all</a>}
      </div>
      {recentListings.length ? (
        <div className="grid">{recentListings.map((l) => <ListingCard key={l.id} l={l} />)}</div>
      ) : (
        <p className="empty">You have not listed anything yet. <a href="#/sell">Create a listing</a>.</p>
      )}

      <div className="cols">
        <form className="panel" onSubmit={saveProfile}>
          <h3>Profile</h3>
          <p className="meta">Buyers see your name, email and phone on your listings.</p>
          <label htmlFor="pn">Name</label>
          <input className="field" id="pn" required autoComplete="name" value={p.name} onChange={setP1("name")} {...invalid(pErr, "name")} />
          <FieldErr err={pErr} name="name" />
          <label htmlFor="pe">Email</label>
          <input className="field" id="pe" type="email" required autoComplete="email" value={p.email} onChange={setP1("email")} {...invalid(pErr, "email")} />
          <FieldErr err={pErr} name="email" />
          <label htmlFor="ps">Student number <span className="meta">(optional)</span></label>
          <input className="field" id="ps" value={p.studentId} onChange={setP1("studentId")} {...invalid(pErr, "studentId")} />
          <FieldErr err={pErr} name="studentId" />
          <label htmlFor="pp">Phone <span className="meta">(optional)</span></label>
          <input className="field" id="pp" type="tel" autoComplete="tel" value={p.phone} onChange={setP1("phone")} {...invalid(pErr, "phone")} />
          <FieldErr err={pErr} name="phone" />
          <FormErr err={pErr} shown={["name", "email", "studentId", "phone"]} />
          <button className="btn">Save profile</button>
        </form>

        <div>
          <form className="panel" style={{ marginTop: 18 }} onSubmit={savePassword}>
            <h3>Change password</h3>
            <label htmlFor="cpw">Current password</label>
            <input className="field" id="cpw" type="password" required autoComplete="current-password" value={pw.currentPassword} onChange={setPw1("currentPassword")} {...invalid(pwErr, "currentPassword")} />
            <FieldErr err={pwErr} name="currentPassword" />
            <label htmlFor="np">New password <span className="meta">(8 to 72 characters)</span></label>
            <input className="field" id="np" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={pw.newPassword} onChange={setPw1("newPassword")} {...invalid(pwErr, "newPassword")} />
            <FieldErr err={pwErr} name="newPassword" />
            <label htmlFor="cf">Confirm new password</label>
            <input className="field" id="cf" type="password" required autoComplete="new-password" value={pw.confirmPassword} onChange={setPw1("confirmPassword")} {...invalid(pwErr, "confirmPassword")} />
            <FieldErr err={pwErr} name="confirmPassword" />
            <FormErr err={pwErr} shown={["currentPassword", "newPassword", "confirmPassword"]} />
            <button className="btn">Change password</button>
          </form>

          <form className="panel danger-zone" onSubmit={deleteAccount}>
            <h3>Delete account</h3>
            <label htmlFor="dp">Enter your password to confirm</label>
            <input className="field" id="dp" type="password" required autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} {...invalid(delErr, "password")} />
            <FieldErr err={delErr} name="password" />
            <FormErr err={delErr} shown={["password"]} />
            <button className="btn danger">Delete my account</button>
          </form>
        </div>
      </div>
    </div>
  );
}
