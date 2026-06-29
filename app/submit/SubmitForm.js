"use client";

import { useState, useRef, useEffect } from "react";
import { submitBusiness } from "./actions";
import { CATEGORIES, TOWNS } from "@/lib/constants";

const CLOUDINARY_URL    = "https://api.cloudinary.com/v1_1/dfxhlv8jc/image/upload";
const CLOUDINARY_PRESET = "hidden_gems_sa_logos";

const INITIAL = {
  name: "", category: "", town: "",
  whatsapp: "", website: "", description: "",
  owner_name: "", owner_email: "",
};

export default function SubmitForm() {
  const [fields, setFields]       = useState(INITIAL);
  const [logoUrl, setLogoUrl]     = useState("");
  const [cropSrc, setCropSrc]     = useState("");
  const [cropOpen, setCropOpen]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]       = useState(null);
  const [charCount, setCharCount] = useState(0);

  const imgRef     = useRef(null);
  const cropperRef = useRef(null);
  const fileRef    = useRef(null);

  useEffect(() => {
    if (!cropOpen || !imgRef.current) return;
    let destroyed = false;
    import("cropperjs").then(({ default: Cropper }) => {
      if (destroyed || !imgRef.current) return;
      cropperRef.current = new Cropper(imgRef.current, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 0.8,
        responsive: true,
      });
    });
    return () => {
      destroyed = true;
      cropperRef.current?.destroy();
      cropperRef.current = null;
    };
  }, [cropOpen]);

  function set(field) {
    return (e) => setFields((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    setCropOpen(true);
    e.target.value = "";
  }

  function cancelCrop() {
    setCropOpen(false);
    URL.revokeObjectURL(cropSrc);
    setCropSrc("");
  }

  async function confirmCrop() {
    if (!cropperRef.current) return;
    setUploading(true);
    cropperRef.current
      .getCroppedCanvas({ width: 400, height: 400 })
      .toBlob(async (blob) => {
        try {
          const fd = new FormData();
          fd.append("file", blob, "logo.jpg");
          fd.append("upload_preset", CLOUDINARY_PRESET);
          const res  = await fetch(CLOUDINARY_URL, { method: "POST", body: fd });
          const data = await res.json();
          if (data.secure_url) {
            setLogoUrl(data.secure_url);
            setCropOpen(false);
            URL.revokeObjectURL(cropSrc);
            setCropSrc("");
          } else {
            alert("Upload failed — please try again.");
          }
        } catch {
          alert("Upload error — please check your connection and try again.");
        } finally {
          setUploading(false);
        }
      }, "image/jpeg", 0.9);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    fd.append("logo_url", logoUrl);
    const res = await submitBusiness(fd);
    setResult(res);
    setSubmitting(false);
  }

  if (result?.success) {
    return (
      <div className="submit-success">
        <i className="fa-solid fa-circle-check" />
        <h2>Submission Received!</h2>
        <p>Thank you! Your listing is now under review — we&apos;ll have it live within 24–48 hours.</p>
        <button className="btn-secondary mt-3" onClick={() => { setFields(INITIAL); setLogoUrl(""); setResult(null); }}>
          <i className="fa-solid fa-plus" /> Submit Another Business
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="submit-form" noValidate>
      {result?.error && (
        <div className="submit-error">
          <i className="fa-solid fa-triangle-exclamation" /> {result.error}
        </div>
      )}

      {/* ── Business Information ── */}
      <div className="form-section">
        <h2 className="form-section-title">
          <i className="fa-solid fa-store" /> Your Business
        </h2>

        <div className="form-group">
          <label htmlFor="name">Business Name <span className="required">*</span></label>
          <input id="name" className="form-control" type="text" value={fields.name}
            onChange={set("name")} required placeholder="e.g. Thandi's Home Bakery" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category <span className="required">*</span></label>
            <select id="category" className="form-control" value={fields.category}
              onChange={set("category")} required>
              <option value="">Select a category...</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="town">Town <span className="required">*</span></label>
            <select id="town" className="form-control" value={fields.town}
              onChange={set("town")} required>
              <option value="">Select your town...</option>
              {TOWNS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">
            What do you offer? <span className="required">*</span>
            <span className="char-count">{charCount}/200</span>
          </label>
          <textarea id="description" className="form-control" value={fields.description}
            onChange={(e) => { set("description")(e); setCharCount(e.target.value.length); }}
            required rows={3} maxLength={200}
            placeholder="1–2 sentences about your products or services" />
        </div>
      </div>

      {/* ── Contact Details ── */}
      <div className="form-section">
        <h2 className="form-section-title">
          <i className="fa-solid fa-address-card" /> How Customers Reach You
        </h2>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="whatsapp">WhatsApp Number <span className="required">*</span></label>
            <input id="whatsapp" className="form-control" type="tel" value={fields.whatsapp}
              onChange={set("whatsapp")} required placeholder="e.g. 082 123 4567" />
            <span className="form-hint">Enter your number starting with 0 — we&apos;ll format it automatically.</span>
          </div>

          <div className="form-group">
            <label htmlFor="website">Website <span className="optional">(optional)</span></label>
            <input id="website" className="form-control" type="url" value={fields.website}
              onChange={set("website")} placeholder="https://..." />
          </div>
        </div>
      </div>

      {/* ── Owner Details ── */}
      <div className="form-section">
        <h2 className="form-section-title">
          <i className="fa-solid fa-user" /> About You
        </h2>
        <p className="form-section-note">
          <i className="fa-solid fa-lock" /> This information is private — only our team sees it.
          We may reach out on WhatsApp or email if we need to verify your listing.
        </p>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="owner_name">Your Name <span className="required">*</span></label>
            <input id="owner_name" className="form-control" type="text" value={fields.owner_name}
              onChange={set("owner_name")} required placeholder="Full name" />
          </div>

          <div className="form-group">
            <label htmlFor="owner_email">
              Your Email <span className="optional">(optional)</span>
            </label>
            <input id="owner_email" className="form-control" type="email" value={fields.owner_email}
              onChange={set("owner_email")} placeholder="For approval notifications" />
          </div>
        </div>
      </div>

      {/* ── Logo ── */}
      <div className="form-section">
        <h2 className="form-section-title">
          <i className="fa-solid fa-image" /> Logo{" "}
          <span className="optional">(optional)</span>
        </h2>

        {logoUrl ? (
          <div className="logo-preview">
            <img src={logoUrl} alt="Your uploaded logo" className="logo-preview-img" />
            <div className="logo-preview-info">
              <p><i className="fa-solid fa-circle-check" /> Logo uploaded successfully</p>
              <button type="button" className="btn-secondary" onClick={() => { setLogoUrl(""); fileRef.current && (fileRef.current.value = ""); }}>
                <i className="fa-solid fa-rotate" /> Change Logo
              </button>
            </div>
          </div>
        ) : (
          <label className="logo-dropzone">
            <i className="fa-solid fa-cloud-arrow-up" />
            <span className="logo-dropzone-label">Click to upload a logo</span>
            <span className="logo-dropzone-hint">PNG, JPG or WebP — you&apos;ll crop it to size before it uploads.</span>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange} className="logo-file-input" />
          </label>
        )}
      </div>

      {/* ── Submit ── */}
      <div className="submit-form-footer">
        <p className="submit-disclaimer">
          <i className="fa-solid fa-shield-halved" /> Free listing. Reviewed before going live. No spam, no payment.
        </p>
        <button type="submit" className="btn-primary submit-btn" disabled={submitting}>
          {submitting
            ? <><i className="fa-solid fa-spinner fa-spin" /> Submitting...</>
            : <><i className="fa-solid fa-paper-plane" /> Submit My Business</>}
        </button>
      </div>

      {/* ── Crop Modal ── */}
      {cropOpen && (
        <div className="crop-overlay" role="dialog" aria-modal="true" aria-label="Crop your logo">
          <div className="crop-modal">
            <div className="crop-modal-header">
              <h3>Crop Your Logo</h3>
              <p>Drag to reposition — scroll or pinch to zoom</p>
            </div>
            <div className="crop-img-wrap">
              <img ref={imgRef} src={cropSrc} alt="Logo to crop" />
            </div>
            <div className="crop-modal-footer">
              <button type="button" className="btn-secondary" onClick={cancelCrop} disabled={uploading}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={confirmCrop} disabled={uploading}>
                {uploading
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Uploading...</>
                  : <><i className="fa-solid fa-check" /> Confirm &amp; Upload</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
