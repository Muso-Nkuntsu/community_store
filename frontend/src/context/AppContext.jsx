import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, setUnauthorizedHandler, usePending } from "../api";
import Dialog from "../components/Dialog.jsx";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

// Where to go after logging in. Set by any "Log in" link so people come back to the page they were on.
let returnTo = null;
export const rememberReturn = (hash) => {
  returnTo = hash && !/^#\/(login|register)/.test(hash) ? hash : null;
};
const takeReturn = () => {
  const h = returnTo;
  returnTo = null;
  return h;
};

export function AppProvider({ children }) {
  const [user, setUser] = useState(null); // { id, name, email, role } or null
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(null); // { text, id }
  const [dialog, setDialog] = useState(null); // { spec, resolve }
  const pending = usePending();
  const userRef = useRef(null);
  userRef.current = user;

  const notify = useCallback((text) => setToast(text ? { text, id: Date.now() } : null), []);

  // Ask the server who is logged in (the cookie decides, never localStorage)
  useEffect(() => {
    api("/auth/session")
      .then((d) => setUser(d.authenticated ? d.user : null))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // A 401 from any page means the session ended: show the app as logged out
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!userRef.current) return;
      setUser(null);
      notify("Your session has ended. Please log in again.");
    });
    return () => setUnauthorizedHandler(null);
  }, [notify]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Opens a dialog and resolves with the entered values, or null if cancelled. See Dialog in ui.jsx.
  const ask = useCallback((spec) => new Promise((resolve) => setDialog({ spec, resolve })), []);
  const confirm = useCallback(
    async (spec) => (await ask(typeof spec === "string" ? { title: spec } : spec)) !== null,
    [ask]
  );
  const closeDialog = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

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
    notify("Logged out");
    window.location.hash = "#/";
  };

  return (
    <Ctx.Provider value={{ user, setUser, ready, login, register, logout, notify, ask, confirm, takeReturn }}>
      {pending && <div className="loadbar" aria-hidden="true" />}
      {children}
      {dialog && <Dialog key={dialog.spec.title} spec={dialog.spec} onClose={closeDialog} />}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && <div className="toast" key={toast.id}>{toast.text}</div>}
      </div>
    </Ctx.Provider>
  );
}
