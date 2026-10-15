import { useEffect, useRef, useState } from "react";
import { qs, useApi, useDebounced } from "../api";
import { CATEGORIES } from "../constants";
import { ErrorBox, ListingCard, Loading, Pagination, useTitle } from "../components/ui.jsx";
import { useApp } from "../context/AppContext.jsx";

// Remembers (in this browser only) that the visitor has seen the welcome banner.
// Storage can be blocked in private windows, so every access is guarded.
const SEEN_KEY = "cs_welcome_seen";
const hasSeenWelcome = () => { try { return localStorage.getItem(SEEN_KEY) === "1"; } catch { return false; } };
const markWelcomeSeen = () => { try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ } };

// Search and filters survive opening a listing and coming back (kept in memory for this tab)
const last = { q: "", cats: [], page: 1 };

export default function Browse() {
  const [q, setQ] = useState(last.q);
  const [cats, setCats] = useState(last.cats);
  const [page, setPage] = useState(last.page);
  const dq = useDebounced(q.trim(), 300); // wait until typing pauses before calling the API
  const { user, ready } = useApp();
  const [welcome, setWelcome] = useState(() => !hasSeenWelcome());
  const closeWelcome = () => { markWelcomeSeen(); setWelcome(false); };
  useTitle(null);

  // A new search starts again from page 1
  const prevDq = useRef(dq);
  useEffect(() => {
    if (prevDq.current !== dq) { prevDq.current = dq; setPage(1); }
  }, [dq]);

  useEffect(() => { Object.assign(last, { q, cats, page }); }, [q, cats, page]);

  const { loading, data, error, reload } = useApi("/listings" + qs({ q: dq, categories: cats.join(","), page, limit: 12 }));

  const toggle = (v) => {
    setCats((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]));
    setPage(1);
  };
  const clear = () => { setQ(""); setCats([]); setPage(1); };
  const filtered = Boolean(q.trim() || cats.length);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>Buy and sell within your community</h1>
          <p>Textbooks, electronics, furniture and services from students and neighbours.</p>
          <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
            <input type="search" placeholder="Search listings" aria-label="Search listings" value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
        </div>
      </section>
      <div className="wrap">
        {welcome && ready && !user && (
          <div className="welcome" role="region" aria-label="Welcome">
            <div>
              <b>First time here?</b>
              <p>See how buying and selling works, or create an account to start listing.</p>
            </div>
            <div className="row">
              <a className="btn" href="#/about" onClick={markWelcomeSeen}>How it works</a>
              <a className="btn alt" href="#/register" onClick={markWelcomeSeen}>Create account</a>
              <button className="btn alt" onClick={closeWelcome}>Not now</button>
            </div>
          </div>
        )}
        <div className="bar" role="group" aria-label="Filter by category">
          {CATEGORIES.map(([v, label]) => (
            <button key={v} className={"chip" + (cats.includes(v) ? " on" : "")} aria-pressed={cats.includes(v)} onClick={() => toggle(v)}>{label}</button>
          ))}
          {filtered && <button className="btn alt sm" onClick={clear}>Clear filters</button>}
        </div>
        <ErrorBox error={error} onRetry={reload} />
        {loading && !data ? <Loading /> : data && (
          <>
            <p className="meta" aria-live="polite">{data.total} listing{data.total === 1 ? "" : "s"}{dq ? ` for "${dq}"` : ""}</p>
            {data.items.length ? (
              <div className="grid">
                {data.items.map((l) => <ListingCard key={l.id} l={l} />)}
              </div>
            ) : (
              <div className="empty-box">
                <p>{filtered ? "No listings match your search." : "No listings yet."}</p>
                {filtered
                  ? <button className="btn alt sm" onClick={clear}>Clear filters</button>
                  : <a className="btn sm" href="#/sell">Be the first to sell something</a>}
              </div>
            )}
            <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
          </>
        )}
      </div>
    </>
  );
}
