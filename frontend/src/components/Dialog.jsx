import { useEffect, useRef, useState } from "react";

/**
 * Modal dialog used instead of window.prompt / window.confirm. Opened through useApp().ask(spec).
 *
 * spec = {
 *   title, message?, confirmLabel?, danger?,
 *   fields?: [{ name, label, type?: "text" | "textarea" | "checkbox", required?, minLength?, maxLength?,
 *               hint?, initial?, showIf?: (values) => boolean }]
 * }
 * Resolves with { [name]: trimmed string | boolean } for the visible fields, or null when cancelled.
 */
export default function Dialog({ spec, onClose }) {
  const ref = useRef(null);
  const fields = spec.fields || [];
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.type === "checkbox" ? Boolean(f.initial) : f.initial ?? ""]))
  );
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const d = ref.current;
    const opener = document.activeElement;
    if (d && !d.open) d.showModal();
    return () => {
      if (d?.open) d.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus(); // give focus back
    };
  }, []);

  const visible = fields.filter((f) => !f.showIf || f.showIf(values));
  const set = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const out = {};
    const errs = {};
    for (const f of visible) {
      if (f.type === "checkbox") { out[f.name] = Boolean(values[f.name]); continue; }
      const v = String(values[f.name] ?? "").trim();
      if (f.required && !v) errs[f.name] = "This is required.";
      else if (v && f.minLength && v.length < f.minLength) errs[f.name] = `Use at least ${f.minLength} characters.`;
      else if (v && f.maxLength && v.length > f.maxLength) errs[f.name] = `Use at most ${f.maxLength} characters.`;
      out[f.name] = v;
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      ref.current?.querySelector(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    onClose(out);
  };

  return (
    <dialog
      ref={ref}
      className="dlg"
      aria-labelledby="dlg-title"
      onCancel={(e) => { e.preventDefault(); onClose(null); }}
    >
      <form onSubmit={submit} noValidate>
        <h3 id="dlg-title">{spec.title}</h3>
        {spec.message && <p className="dlg-msg">{spec.message}</p>}
        {visible.map((f) => {
          const id = "dlg-" + f.name;
          const errId = id + "-err";
          if (f.type === "checkbox") {
            return (
              <label className="check" key={f.name}>
                <input type="checkbox" name={f.name} checked={values[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
                {f.label}
              </label>
            );
          }
          const Tag = f.type === "textarea" ? "textarea" : "input";
          const len = String(values[f.name] ?? "").trim().length;
          return (
            <div key={f.name}>
              <label htmlFor={id}>{f.label}{!f.required && <span className="meta"> (optional)</span>}</label>
              <Tag
                className="field"
                id={id}
                name={f.name}
                rows={f.type === "textarea" ? 3 : undefined}
                value={values[f.name]}
                maxLength={f.maxLength}
                aria-invalid={errors[f.name] ? true : undefined}
                aria-describedby={errors[f.name] ? errId : undefined}
                onChange={(e) => set(f.name, e.target.value)}
              />
              <div className="err" id={errId}>
                {errors[f.name] || (f.hint ? <span className="meta">{f.hint}</span> : null)}
                {f.maxLength && len > f.maxLength * 0.8 && <span className="meta"> {len}/{f.maxLength}</span>}
              </div>
            </div>
          );
        })}
        <div className="row dlg-actions">
          <button type="button" className="btn alt" onClick={() => onClose(null)}>Cancel</button>
          <button type="submit" className={"btn" + (spec.danger ? " danger" : "")} autoFocus={!visible.length}>
            {spec.confirmLabel || "OK"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
