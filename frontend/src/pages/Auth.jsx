import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { FieldErr, FormErr } from "../components/ui.jsx";

export default function Auth({ mode }) {
  const { login, register, notify } = useApp();
  const isRegister = mode === "register";
  const [f, setF] = useState({ name: "", email: "", studentId: "", phone: "", password: "", confirmPassword: "" });
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      if (isRegister) {
        const body = { name: f.name.trim(), email: f.email.trim(), password: f.password, confirmPassword: f.confirmPassword };
        if (f.studentId.trim()) body.studentId = f.studentId.trim(); // optional
        if (f.phone.trim()) body.phone = f.phone.trim(); // optional
        await register(body);
        notify("Account created");
      } else {
        await login(f.email.trim(), f.password);
        notify("Signed in");
      }
      window.location.hash = "#/";
    } catch (e2) {
      setErr(e2);
    }
  };

  return (
    <div className="wrap sec" style={{ maxWidth: 520 }}>
      <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
      <div className="tabs" style={{ marginTop: 12 }}>
        <a className={"chip" + (!isRegister ? " on" : "")} href="#/login" style={{ textDecoration: "none" }}>Log in</a>
        <a className={"chip" + (isRegister ? " on" : "")} href="#/register" style={{ textDecoration: "none" }}>Register</a>
      </div>
      <form className="panel" onSubmit={submit}>
        {isRegister && (
          <>
            <label htmlFor="n">Full name</label>
            <input className="field" id="n" required value={f.name} onChange={set("name")} />
            <FieldErr err={err} name="name" />
          </>
        )}
        <label htmlFor="e">Email</label>
        <input className="field" id="e" type="email" required value={f.email} onChange={set("email")} />
        <FieldErr err={err} name="email" />
        {isRegister && (
          <>
            <label htmlFor="s">Student number (optional)</label>
            <input className="field" id="s" value={f.studentId} onChange={set("studentId")} />
            <FieldErr err={err} name="studentId" />
            <label htmlFor="p">Phone (optional)</label>
            <input className="field" id="p" value={f.phone} onChange={set("phone")} />
            <FieldErr err={err} name="phone" />
          </>
        )}
        <label htmlFor="pw">Password</label>
        <input className="field" id="pw" type="password" required minLength={isRegister ? 8 : undefined} value={f.password} onChange={set("password")} />
        <FieldErr err={err} name="password" />
        {isRegister && (
          <>
            <label htmlFor="cp">Confirm password</label>
            <input className="field" id="cp" type="password" required value={f.confirmPassword} onChange={set("confirmPassword")} />
            <FieldErr err={err} name="confirmPassword" />
          </>
        )}
        <FormErr err={err} />
        <button className="btn" style={{ width: "100%" }}>{isRegister ? "Register" : "Log in"}</button>
      </form>
    </div>
  );
}