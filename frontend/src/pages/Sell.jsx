import { useEffect, useRef, useState } from "react";
import { api, useApi } from "../api";
import { useApp } from "../context/AppContext.jsx";
import { ErrorBox, FieldErr, FormErr, ListingImage, Loading, invalid, useTitle } from "../components/ui.jsx";
import { CATEGORIES, UPLOAD, categoryLabel } from "../constants";

const BLANK = { title: "", description: "", price: "", category: "", imageUrl: null };

// Accepts how people type prices in South Africa: "R1 250,50", "1250.50", "1,250.50" -> "1250.50"
function normalisePrice(value) {
  let s = String(value).replace(/[\sR ]/gi, "");
  s = s.includes(".") ? s.replace(/,/g, "") : s.replace(",", ".");
  return s;
}

// Create a listing (#/sell) or edit one (#/sell/<id>)
export default function Sell({ id }) {
  const { notify } = useApp();
  const edit = Boolean(id);
  const { loading, data, error, reload } = useApi(edit ? "/listings/" + encodeURIComponent(id) : null);
  const [f, setF] = useState(BLANK);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const fileRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useTitle(edit ? "Edit listing" : "Sell something");

  const listing = data ? data.listing || data : null;
  useEffect(() => {
    if (!listing) return;
    setF({ title: listing.title, description: listing.description, price: String(listing.price ?? ""), category: listing.category, imageUrl: listing.imageUrl || null });
  }, [listing]);

  const upload = async (e) => {
    const input = e.target;
    const file = input.files[0];
    setUploadErr("");
    if (!file) return;
    // Quick checks before sending; the server checks again
    if (!UPLOAD.types.includes(file.type)) {
      setUploadErr("Choose a JPEG, PNG or WebP image.");
      input.value = "";
      return;
    }
    if (file.size > UPLOAD.maxBytes) {
      setUploadErr("That image is " + (file.size / 1048576).toFixed(1) + " MB. Images must be 2 MB or smaller.");
      input.value = "";
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const r = await api("/uploads", { method: "POST", form: fd });
      setF((old) => ({ ...old, imageUrl: r.url }));
    } catch (e2) {
      setUploadErr(e2.message);
    } finally {
      setUploading(false);
      input.value = ""; // lets the same file be picked again
    }
  };

  const removePhoto = () => {
    setF({ ...f, imageUrl: null });
    setUploadErr("");
    fileRef.current?.focus();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (uploading) return;
    setErr(null);
    setBusy(true);
    const body = { title: f.title.trim(), description: f.description.trim(), price: normalisePrice(f.price), category: f.category, imageUrl: f.imageUrl };
    try {
      const r = await api(edit ? "/listings/" + id : "/listings", { method: edit ? "PATCH" : "POST", body });
      notify(r.message || "Listing saved");
      window.location.hash = "#/listing/" + (r.listing?.id || id);
    } catch (e2) {
      setErr(e2);
      setBusy(false);
    }
  };

  if (edit && loading && !data) return <div className="wrap sec"><Loading /></div>;
  if (edit && error) return <div className="wrap sec"><ErrorBox error={error} onRetry={reload} /></div>;
  if (edit && listing && listing.viewer && !listing.viewer.canEdit) {
    return (
      <div className="wrap sec narrow">
        <h2>You cannot edit this listing</h2>
        <p className="empty">Only the seller can edit a listing, and only while it is available.</p>
        <a className="btn alt" href={"#/listing/" + id}>Back to the listing</a>
      </div>
    );
  }

  const shown = ["title", "description", "price", "category", "imageUrl"];
  return (
    <div className="wrap sec narrow wide">
      <h2>{edit ? "Edit listing" : "Create a listing"}</h2>
      {!edit && <p className="meta">Buyers contact you by email or phone from your listing. Arrange payment and collection with them directly.</p>}
      <form className="panel" onSubmit={submit}>
        <label htmlFor="t">Title</label>
        <input className="field" id="t" required maxLength={120} placeholder="e.g. Intro to Java, 3rd edition" value={f.title} onChange={set("title")} {...invalid(err, "title")} />
        <FieldErr err={err} name="title" />

        <label htmlFor="d">Description</label>
        <textarea className="field" id="d" rows="5" required placeholder="Condition, what's included, where to collect" value={f.description} onChange={set("description")} {...invalid(err, "description")} />
        <FieldErr err={err} name="description" />

        <div className="two">
          <div>
            <label htmlFor="p">Price (R)</label>
            <input className="field" id="p" inputMode="decimal" required placeholder="e.g. 150" value={f.price} onChange={set("price")} {...invalid(err, "price")} />
            <FieldErr err={err} name="price" />
          </div>
          <div>
            <label htmlFor="c">Category</label>
            <select id="c" required value={f.category} onChange={set("category")} {...invalid(err, "category")}>
              <option value="" disabled>Choose a category</option>
              {CATEGORIES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
            <FieldErr err={err} name="category" />
          </div>
        </div>

        <label htmlFor="i">Photo <span className="meta">(optional: JPEG, PNG or WebP, max 2 MB)</span></label>
        <div className="upload">
          <ListingImage
            l={{ imageUrl: f.imageUrl, category: f.category || "OTHER", categoryLabel: categoryLabel(f.category) }}
            className="thumb preview"
            alt={f.imageUrl ? "Photo preview" : ""}
          />
          <div>
            <input ref={fileRef} id="i" type="file" accept={UPLOAD.types.join(",")} onChange={upload} disabled={uploading} aria-describedby="upload-status" />
            <div id="upload-status" className="err" role="status">
              {uploading ? <span className="meta">Uploading...</span> : uploadErr}
            </div>
            {f.imageUrl && !uploading && <button type="button" className="btn alt sm" onClick={removePhoto}>Remove photo</button>}
          </div>
        </div>
        <FieldErr err={err} name="imageUrl" />

        <FormErr err={err} shown={shown} />
        <div className="row start">
          <button className="btn" disabled={busy || uploading}>{busy ? "Saving..." : edit ? "Save changes" : "Publish listing"}</button>
          {edit && <a className="btn alt" href={"#/listing/" + id}>Cancel</a>}
        </div>
      </form>
    </div>
  );
}
