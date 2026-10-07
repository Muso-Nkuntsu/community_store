import { useEffect, useState } from "react";

// Every backend error has the shape { error: { code, message, fields } }
export class ApiError extends Error {
  constructor(status, data) {
    super(data?.error?.message || "Something went wrong. Please try again.");
    this.status = status;
    this.code = data?.error?.code;
    this.fields = data?.error?.fields || {};
  }
}

// Counts requests in flight so the app can show a progress bar and block double clicks.
let pending = 0;
let mutating = 0;
const listeners = new Set();
function track(isMutation, delta) {
  pending += delta;
  if (isMutation) mutating += delta;
  document.body.classList.toggle("busy", mutating > 0);
  listeners.forEach((fn) => fn(pending));
}

// True while any request is waiting for the backend
export function usePending() {
  const [n, setN] = useState(pending);
  useEffect(() => {
    listeners.add(setN);
    return () => listeners.delete(setN);
  }, []);
  return n > 0;
}

// Calls the backend. The session cookie (cs_session) is sent automatically; we never touch the token.
export async function api(path, { method = "GET", body, form } = {}) {
  const opts = { method, headers: {} };
  if (form) {
    opts.body = form; // multipart upload, the browser sets the Content-Type
  } else if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const isMutation = method !== "GET";
  track(isMutation, 1);
  try {
    let res;
    try {
      res = await fetch("/api" + path, opts);
    } catch {
      throw new ApiError(0, { error: { message: "Cannot reach the server. Check that the backend is running." } });
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, data);
    return data;
  } finally {
    track(isMutation, -1);
  }
}

// Builds "?a=1&b=2" and skips empty values
export function qs(obj) {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== "" && v !== null && v !== undefined) p.set(k, v);
  });
  const s = p.toString();
  return s ? "?" + s : "";
}

// Loads a GET endpoint. Pass null to skip. reload() fetches again.
export function useApi(path) {
  const [state, setState] = useState({ loading: !!path, data: null, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) {
      setState({ loading: false, data: null, error: null });
      return;
    }
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path)
      .then((data) => live && setState({ loading: false, data, error: null }))
      .catch((error) => live && setState({ loading: false, data: null, error }));
    return () => { live = false; };
  }, [path, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}