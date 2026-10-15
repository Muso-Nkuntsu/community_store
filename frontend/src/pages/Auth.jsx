import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { FieldErr, FormErr, invalid, useTitle } from "../components/ui.jsx";

export default function Auth({ mode }) {
  const { user, ready, login, register, notify, takeReturn } = useApp();
  const isRegister = mode === "register";
  const [f, setF] = useState({ name: "", email: "", studentId: "", phone: "", password: "", confirmPassword: "" });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useTitle(isRegister ? "Register" : "Log in");

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (isRegister && f.password !== f.confirmPassword) {
      setErr({ message: "", fields: { confirmPassword: ["Passwords do not match."] } });
      return;
    }
    setBusy(true);
    try {
      if (isRegister) {
        const body = { name: f.name.trim(), email: f.email.trim(), password: f.password, confirmPassword: f.confirmPassword };
        if (f.studentId.trim()) body.studentId = f.studentId.trim(); // optional
        if (f.phone.trim()) body.phone = f.phone.trim(); // optional
        await register(body);
        notify("Account created");
      } else {
        await login(f.email.trim(), f.password);
        notify("Logged in");
      }
      // New accounts start on the "How it works" page; returning users go back to where they were
      const back = takeReturn();
      window.location.hash = isRegister ? "#/about" : back || "#/";
    } catch (e2) {
      setErr(e2);
      setBusy(false);
    }
  };

  if (ready && user && !busy) {
    return (
      <div className="wrap sec narrow">
        <h2>You are logged in</h2>
        <p className="meta">Signed in as {user.name} ({user.email}).</p>
        <div className="row start" style={{ marginTop: 14 }}>
          <a className="btn" href="#/">Browse listings</a>
          <a className="btn alt" href="#/dashboard">My dashboard</a>
        </div>
      </div>
    );
  }

  const shown = ["name", "email", "studentId", "phone", "password", "confirmPassword"];
  return (
    <div className="wrap sec narrow">
      <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
      <div className="tabs" style={{ marginTop: 12 }}>
        <a className={"chip" + (!isRegister ? " on" : "")} href="#/login" aria-current={!isRegister ? "page" : undefined}>Log in</a>
        <a className={"chip" + (isRegister ? " on" : "")} href="#/register" aria-current={isRegister ? "page" : undefined}>Register</a>
      </div>
      <form className="panel" onSubmit={submit}>
        {isRegister && (
          <>
            <label htmlFor="n">Full name</label>
            <input className="field" id="n" required autoComplete="name" maxLength={100} value={f.name} onChange={set("name")} {...invalid(err, "name")} />
            <FieldErr err={err} name="name" />
          </>
        )}
        <label htmlFor="e">Email</label>
        <input className="field" id="e" type="email" required autoComplete="email" value={f.email} onChange={set("email")} {...invalid(err, "email")} />
        <FieldErr err={err} name="email" />
        {isRegister && (
          <>
            <label htmlFor="s">Student number <span className="meta">(optional)</span></label>
            <input className="field" id="s" value={f.studentId} onChange={set("studentId")} {...invalid(err, "studentId")} />
            <FieldErr err={err} name="studentId" />
            <label htmlFor="p">Phone <span className="meta">(optional, shown to buyers)</span></label>
            <input className="field" id="p" type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} {...invalid(err, "phone")} />
            <FieldErr err={err} name="phone" />
          </>
        )}
        <label htmlFor="pw">Password{isRegister && <span className="meta"> (8 to 72 characters)</span>}</label>
        <input
          className="field" id="pw" type="password" required
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={isRegister ? 8 : undefined} maxLength={isRegister ? 72 : undefined}
          value={f.password} onChange={set("password")} {...invalid(err, "password")}
        />
        <FieldErr err={err} name="password" />
        {isRegister && (
          <>
            <label htmlFor="cp">Confirm password</label>
            <input className="field" id="cp" type="password" required autoComplete="new-password" value={f.confirmPassword} onChange={set("confirmPassword")} {...invalid(err, "confirmPassword")} />
            <FieldErr err={err} name="confirmPassword" />
          </>
        )}
        <FormErr err={err} shown={shown} />
        <button className="btn full" disabled={busy}>
          {busy ? "Please wait..." : isRegister ? "Create account" : "Log in"}
        </button>
      </form>
      <p className="meta">
        {isRegister
          ? <>Already have an account? <a href="#/login">Log in</a></>
          : <>New here? <a href="#/register">Create an account</a></>}
      </p>
    </div>
  );
}
