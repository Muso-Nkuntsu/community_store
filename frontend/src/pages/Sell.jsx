import { useEffect, useState } from "react";
import { api, useApi } from "../api";
import { useApp } from "../context/AppContext.jsx";
import { FieldErr, FormErr, Loading } from "../components/ui.jsx";
import { CATEGORIES } from "../constants";

// Create a listing (#/sell) or edit one (#/sell/<id>)
export default function Sell({ id }) {
  const { notify } = useApp();
  const edit = Boolean(id);
  const { loading, data } = useApi(edit ? "/listings/" + id : null);
  const [f, setF] = useState({ title: "", description: "", price: "", category: "TEXTBOOKS", imageUrl: null });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (!data) return;
    const l = data.listing || data;
    setF({ title: l.title, description: l.description, price: l.price, category: l.category, imageUrl: l.imageUrl });
  }, [data]);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await api("/uploads", { method: "POST", form: fd });
      setF((old) => ({ ...old, imageUrl: r.url }));
    } catch (e2) {
      notify(e2.message);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const body = { title: f.title.trim(), description: f.description.trim(), price: String(f.price).trim(), category: f.category, imageUrl: f.imageUrl };
    try {
      const r = await api(edit ? "/listings/" + id : "/listings", { method: edit ? "PATCH" : "POST", body });
      notify(r.message || "Listing saved");
      window.location.hash = "#/listing/" + (r.listing?.id || id);
    } catch (e2) {
      setErr(e2);
    } finally {
      setBusy(false);
    }
  };

  if (edit && loading) return <div className="wrap sec"><Loading /></div>;

  return (
    <div className="wrap sec" style={{ maxWidth: 640 }}>
      <h2>{edit ? "Edit listing" : "Create a listing"}</h2>
      <form className="panel" onSubmit={submit}>
        <label htmlFor="t">Title</label>
        <input className="field" id="t" required maxLength={120} value={f.title} onChange={set("title")} />
        <FieldErr err={err} name="title" />

        <label htmlFor="d">Description</label>
        <textarea className="field" id="d" rows="5" required value={f.description} onChange={set("description")} />
        <FieldErr err={err} name="description" />

        <label htmlFor="p">Price (R)</label>
        <input className="field" id="p" inputMode="decimal" required value={f.price} onChange={set("price")} />
        <FieldErr err={err} name="price" />

        <label htmlFor="c">Category</label>
        <select id="c" value={f.category} onChange={set("category")}>
          {CATEGORIES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <FieldErr err={err} name="category" />

        <label htmlFor="i">Photo (JPEG, PNG or WebP, max 2 MB)</label>
        <img className="thumb" style={{ maxWidth: 260, borderRadius: 10, margin: "6px 0" }} src={f.imageUrl || "/placeholder-listing.svg"} alt="Listing preview" />
        <input id="i" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} />
        {f.imageUrl && <button type="button" className="btn alt sm" style={{ marginLeft: 8 }} onClick={() => setF({ ...f, imageUrl: null })}>Remove photo</button>}
        <FieldErr err={err} name="imageUrl" />

        <FormErr err={err} />
        <button className="btn" disabled={busy}>{busy ? "Saving..." : edit ? "Save changes" : "Publish listing"}</button>
      </form>
    </div>
  );
}