import { useEffect, useState } from "react";
import { qs, useApi } from "../api";
import { CATEGORIES } from "../constants";
import { ErrorBox, ListingCard, Loading, Pagination } from "../components/ui.jsx";

export default function Browse() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState(""); // debounced search text
  const [cats, setCats] = useState([]);
  const [page, setPage] = useState(1);

  // Wait about 300 ms after typing before calling the API
  useEffect(() => {
    const t = setTimeout(() => { setDq(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const { loading, data, error } = useApi("/listings" + qs({ q: dq, categories: cats.join(","), page, limit: 12 }));

  const toggle = (v) => {
    setCats((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]));
    setPage(1);
  };
  const clear = () => { setQ(""); setDq(""); setCats([]); setPage(1); };

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>Buy and sell within your community</h1>
          <p>Textbooks, electronics, furniture and services from students and neighbours.</p>
          <div className="search">
            <input type="search" placeholder="Search listings" aria-label="Search listings" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </section>
      <div className="wrap">
        <div className="bar">
          {CATEGORIES.map(([v, label]) => (
            <button key={v} className={"chip" + (cats.includes(v) ? " on" : "")} onClick={() => toggle(v)}>{label}</button>
          ))}
          {(q || cats.length > 0) && <button className="btn alt sm" onClick={clear}>Clear filters</button>}
        </div>
        <ErrorBox error={error} />
        {loading && !data ? <Loading /> : data && (
          <>
            <p className="meta">{data.total} listing{data.total === 1 ? "" : "s"}</p>
            <div className="grid">
              {data.items.length
                ? data.items.map((l) => <ListingCard key={l.id} l={l} />)
                : <p className="empty">No listings found.</p>}
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
          </>
        )}
      </div>
    </>
  );
}