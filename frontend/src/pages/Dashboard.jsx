import { useEffect, useState } from "react";
import { api, useApi } from "../api";
import { useApp } from "../context/AppContext.jsx";
import { ErrorBox, FieldErr, FormErr, ListingCard, Loading } from "../components/ui.jsx";

export default function Dashboard() {
  const { setUser, notify } = useApp();
  const { loading, data, error, reload } = useApi("/users/me");
  const [p, setP] = useState({ name: "", email: "", studentId: "", phone: "" });
  const [pErr, setPErr] = useState(null);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwErr, setPwErr] = useState(null);
  const [delPw, setDelPw] = useState("");
  const [delErr, setDelErr] = useState(null);

  useEffect(() => {
    if (data) setP({ name: data.user.name, email: data.user.email, studentId: data.user.studentId || "", phone: data.user.phone || "" });
  }, [data]);

  if (loading && !data) return <div className="wrap sec"><Loading /></div>;
  if (error) return <div className="wrap sec"><ErrorBox error={error} /></div>;
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
    try {
      await api("/users/me/password", { method: "POST", body: pw });
      setPw({ currentPassword: "", newPassword: "", confirmPassword: "" });
      notify("Password changed");
    } catch (e2) { setPwErr(e2); }
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    if (!window.confirm("Delete your account? Your listings will disappear and this cannot be undone.")) return;
    setDelErr(null);
    try {
      await api("/users/me", { method: "DELETE", body: { password: delPw } });
      setUser(null);
      notify("Account deleted");
      window.location.hash = "#/";
    } catch (e2) { setDelErr(e2); }
  };

  const setP1 = (k) => (e) => setP({ ...p, [k]: e.target.value });
  const setPw1 = (k) => (e) => setPw({ ...pw, [k]: e.target.value });

  return (
    <div className="wrap sec">
      <h2>Hi, {user.name}</h2>
      <p className="meta">{user.role === "ADMIN" ? "Admin" : "Member"} account, {user.email}</p>

      <div className="stats">
        <div className="stat"><b>{stats.activeListings}</b>Available listings</div>
        <div className="stat"><b>{stats.soldListings}</b>Sold</div>
        <div className="stat"><b>{stats.wishlistCount}</b>Wishlist</div>
      </div>
      <p><a className="btn alt" href="#/reports">My reports</a></p>

      <h3 style={{ margin: "22px 0 12px" }}>Recent listings</h3>
      <div className="grid">
        {recentListings.length ? recentListings.map((l) => <ListingCard key={l.id} l={l} />) : <p className="empty">You have not listed anything yet. <a href="#/sell">Create a listing</a>.</p>}
      </div>

      <div className="cols">
        <form className="panel" onSubmit={saveProfile}>
          <h3>Profile</h3>
          <label htmlFor="pn">Name</label>
          <input className="field" id="pn" required value={p.name} onChange={setP1("name")} />
          <FieldErr err={pErr} name="name" />
          <label htmlFor="pe">Email</label>
          <input className="field" id="pe" type="email" required value={p.email} onChange={setP1("email")} />
          <FieldErr err={pErr} name="email" />
          <label htmlFor="ps">Student number</label>
          <input className="field" id="ps" value={p.studentId} onChange={setP1("studentId")} />
          <FieldErr err={pErr} name="studentId" />
          <label htmlFor="pp">Phone</label>
          <input className="field" id="pp" value={p.phone} onChange={setP1("phone")} />
          <FieldErr err={pErr} name="phone" />
          <FormErr err={pErr} />
          <button className="btn">Save profile</button>
        </form>

        <div>
          <form className="panel" style={{ marginTop: 0 }} onSubmit={savePassword}>
            <h3>Change password</h3>
            <label htmlFor="cp">Current password</label>
            <input className="field" id="cp" type="password" required value={pw.currentPassword} onChange={setPw1("currentPassword")} />
            <FieldErr err={pwErr} name="currentPassword" />
            <label htmlFor="np">New password (8 to 72 characters)</label>
            <input className="field" id="np" type="password" required value={pw.newPassword} onChange={setPw1("newPassword")} />
            <FieldErr err={pwErr} name="newPassword" />
            <label htmlFor="cf">Confirm new password</label>
            <input className="field" id="cf" type="password" required value={pw.confirmPassword} onChange={setPw1("confirmPassword")} />
            <FieldErr err={pwErr} name="confirmPassword" />
            <FormErr err={pwErr} />
            <button className="btn">Change password</button>
          </form>

          <form className="panel" onSubmit={deleteAccount}>
            <h3>Delete account</h3>
            <label htmlFor="dp">Enter your password to confirm</label>
            <input className="field" id="dp" type="password" required value={delPw} onChange={(e) => setDelPw(e.target.value)} />
            <FormErr err={delErr} />
            <button className="btn alt">Delete my account</button>
          </form>
        </div>
      </div>
    </div>
  );
}