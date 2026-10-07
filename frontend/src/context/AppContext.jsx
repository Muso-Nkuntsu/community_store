import { createContext, useContext, useEffect, useState } from "react";
import { api, usePending } from "../api";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null); // { id, name, email, role } or null
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const pending = usePending();

  // Ask the server who is logged in (the cookie decides, never localStorage)
  useEffect(() => {
    api("/auth/session")
      .then((d) => setUser(d.authenticated ? d.user : null))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const login = async (email, password) => {
    const d = await api("/auth/login", { method: "POST", body: { email, password } });
    setUser(d.user);
    return d.user;
  };
  const register = async (body) => {
    const d = await api("/auth/register", { method: "POST", body });
    setUser(d.user);
    return d.user;
  };
  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    setToast("Logged out");
    window.location.hash = "#/";
  };

  return (
    <Ctx.Provider value={{ user, setUser, ready, login, register, logout, notify: setToast }}>
      {pending && <div className="loadbar" aria-hidden="true" />}
      {children}
      {toast && <div className="toast" role="status">{toast}</div>}
    </Ctx.Provider>
  );
}