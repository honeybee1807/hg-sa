"use client";

// the pre-filled form shown once a business owner's magic link has been
// validated (see the Server Component in page.js, which does that
// validation and passes down the current "business" record). mirrors
// app/submit/SubmitForm.js closely — same fields, same validation, same
// logo upload/crop flow — minus the private/admin-only fields that don't
// belong on a self-service edit (business_detail, owner_name, owner_email,
// referral_source) and the "whose business is this" section, since neither
// is something an existing approved listing needs to redo.
//
// submitting here never changes the live listing — it only proposes
// changes for an admin to review (see submitEditRequest in
// app/edit/actions.js), which is why the button says "Submit Changes for
// Review" rather than something that implies an immediate update.

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { submitEditRequest } from "../actions";
import { CATEGORIES, PROVINCES, BUSINESS_TYPES, PHYSICAL_BUSINESS_TYPES, HALAL_CERTIFICATES, isBadgeVisible } from "@/lib/constants";
import { normalizeWhatsApp, isValidSouthAfricanMobile } from "@/lib/phone";

// where uploaded logos get sent, and which "upload preset" (a pre-configured
// set of rules on the Cloudinary side — image size limits, allowed formats,
// etc.) to use. these are not secret; Cloudinary's unsigned-upload presets
// are designed to be called directly from a browser. mirrors
// app/submit/SubmitForm.js exactly — same Cloudinary account and preset.
const CLOUDINARY_URL    = "https://api.cloudinary.com/v1_1/dfxhlv8jc/image/upload";
const CLOUDINARY_PRESET = "hidden_gems_sa_logos";

export default function EditListingForm({ token, business }) {
  // pre-filled from the business's current values — "?? \"\"" turns any
  // null coming back from the database into an empty, controlled-input-
  // friendly string.
  const [fields, setFields] = useState({
    name: business.name ?? "",
    category: business.category ?? "",
    custom_category: business.custom_category ?? "",
    business_type: business.business_type ?? "",
    province: business.province ?? "",
    area: business.area ?? "",
    street_address: business.street_address ?? "",
    whatsapp: business.whatsapp ?? "",
    website: business.website ?? "",
    instagram: business.instagram ?? "",
    facebook: business.facebook ?? "",
    description: business.description ?? "",
    halal: business.halal ?? false,
    halal_certificate: business.halal_certificate ?? "",
    delivery_available: business.delivery_available ?? false,
    callouts_available: business.callouts_available ?? false,
    consent: false,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting]   = useState(false);
  const [result, setResult]           = useState(null);
  const [charCount, setCharCount]     = useState((business.description ?? "").length);

  // logo state — mirrors SubmitForm.js exactly, except logoUrl starts out
  // as whatever the business already has (possibly empty), rather than
  // always starting empty, so an existing logo shows as already-uploaded.
  const [logoUrl, setLogoUrl]     = useState(business.logo_url ?? "");
  const [cropSrc, setCropSrc]     = useState("");
  const [cropOpen, setCropOpen]   = useState(false);
  const [uploading, setUploading] = useState(false);

  const imgRef     = useRef(null);  // points at the <img> element that Cropper.js attaches itself to
  const cropperRef = useRef(null);  // holds the live Cropper.js instance, so it can be cleaned up later
  const fileRef    = useRef(null);  // points at the hidden file-picker <input>, so it can be reset when the person removes a logo

  // this runs every time the crop popup opens or closes. Cropper.js is a
  // fairly heavy library, so instead of loading it up front for every
  // visitor, it's only fetched ("import(...)") the moment someone actually
  // opens the crop popup. mirrors SubmitForm.js exactly.
  useEffect(() => {
    if (!cropOpen || !imgRef.current) return;

    let destroyed = false;

    import("cropperjs").then(({ default: Cropper }) => {
      if (destroyed || !imgRef.current) return;
      cropperRef.current = new Cropper(imgRef.current, {
        aspectRatio: 1,      // logos are always cropped into a perfect square
        viewMode: 1,          // don't let the crop box be dragged outside the photo
        autoCropArea: 0.8,    // start the crop box covering 80% of the photo
        responsive: true,
      });
    });

    return () => {
      destroyed = true;
      cropperRef.current?.destroy();
      cropperRef.current = null;
    };
  }, [cropOpen]);

  function clearFieldError(field) {
    setFieldErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  function set(field) {
    return function handleFieldChange(event) {
      setFields((previous) => ({ ...previous, [field]: event.target.value }));
      clearFieldError(field);
    };
  }

  function handleCategoryChange(event) {
    const newCategory = event.target.value;
    setFields((previous) => ({
      ...previous,
      category: newCategory,
      custom_category: newCategory === "Other" ? previous.custom_category : "",
    }));
    clearFieldError("category");
    clearFieldError("custom_category");
  }

  function handleBusinessTypeChange(event) {
    const newBusinessType = event.target.value;
    setFields((previous) => ({
      ...previous,
      business_type: newBusinessType,
      street_address: PHYSICAL_BUSINESS_TYPES.includes(newBusinessType) ? previous.street_address : "",
    }));
    clearFieldError("business_type");
  }

  function handleDescriptionChange(event) {
    set("description")(event);
    setCharCount(event.target.value.length);
  }

  // mirrors SubmitForm.js: a generic toggle for the plain badges, and a
  // dedicated handler for Halal since unchecking it also has to clear the
  // certificate dropdown underneath it.
  function toggleCheckbox(field) {
    return function handleToggle(event) {
      setFields((previous) => ({ ...previous, [field]: event.target.checked }));
      clearFieldError(field);
    };
  }

  function handleHalalChange(event) {
    const checked = event.target.checked;
    setFields((previous) => ({
      ...previous,
      halal: checked,
      halal_certificate: checked ? previous.halal_certificate : "",
    }));
    clearFieldError("halal");
    clearFieldError("halal_certificate");
  }

  // runs the moment someone picks a photo from their device. it doesn't
  // upload anything yet — it just creates a temporary, browser-only link to
  // the chosen file so the crop popup can display it, then opens that
  // popup. mirrors SubmitForm.js exactly.
  function handleFileChange(event) {
    const chosenFile = event.target.files?.[0];
    if (!chosenFile) return;

    setCropSrc(URL.createObjectURL(chosenFile));
    setCropOpen(true);

    // clear the file input's own value so that picking the exact same file
    // again later (e.g. after cancelling) still fires this change handler.
    event.target.value = "";
  }

  // closes the crop popup without uploading anything, and frees up the
  // temporary browser link created in handleFileChange so it doesn't sit
  // around in memory forever.
  function cancelCrop() {
    setCropOpen(false);
    URL.revokeObjectURL(cropSrc);
    setCropSrc("");
  }

  // runs when the person confirms their crop. this takes the cropped
  // square, turns it into an actual image file, and uploads that file
  // straight to Cloudinary from the browser. mirrors SubmitForm.js exactly.
  async function confirmCrop() {
    if (!cropperRef.current) return;
    setUploading(true);

    cropperRef.current
      .getCroppedCanvas({ width: 400, height: 400 })
      .toBlob(async (croppedImageBlob) => {
        try {
          const uploadData = new FormData();
          uploadData.append("file", croppedImageBlob, "logo.jpg");
          uploadData.append("upload_preset", CLOUDINARY_PRESET);

          const uploadResponse = await fetch(CLOUDINARY_URL, { method: "POST", body: uploadData });
          const uploadResult   = await uploadResponse.json();

          if (uploadResult.secure_url) {
            setLogoUrl(uploadResult.secure_url);
            setCropOpen(false);
            URL.revokeObjectURL(cropSrc);
            setCropSrc("");
          } else {
            alert("Upload failed. Please try again.");
          }
        } catch {
          alert("Upload error. Please check your connection and try again.");
        } finally {
          setUploading(false);
        }
      }, "image/jpeg", 0.9); // save the crop as a jpeg at 90% quality
  }

  // clears the uploaded logo so the person can pick a different one (or
  // remove an existing one). also resets the hidden file-picker input, if
  // it exists, so choosing the same file again would still register as a
  // change.
  function handleChangeLogoClick() {
    setLogoUrl("");
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  function validateForm() {
    const errors = {};

    if (!fields.name.trim()) errors.name = "Please enter your business name.";
    if (!fields.category) errors.category = "Please select a category for your business.";
    if (fields.category === "Other" && !fields.custom_category.trim()) {
      errors.custom_category = "Please describe your business category.";
    }
    if (!fields.business_type) {
      errors.business_type = "Please select the business type that best describes how your business operates.";
    }
    if (!fields.province) errors.province = "Please select your province.";
    if (!fields.area.trim()) {
      errors.area = "Please enter the area, suburb, or town your business operates in.";
    }
    if (!fields.description.trim()) {
      errors.description = "Please describe what your business offers.";
    } else if (fields.description.length > 200) {
      errors.description = "Description must be 200 characters or fewer.";
    }
    if (!fields.whatsapp.trim()) {
      errors.whatsapp = "A WhatsApp number is required. We use this to contact you directly regarding your listing.";
    } else if (!isValidSouthAfricanMobile(normalizeWhatsApp(fields.whatsapp))) {
      errors.whatsapp = "Please enter a valid South African mobile number, starting with 0 or +27.";
    }
    if (isBadgeVisible("halal", fields.category) && fields.halal && !fields.halal_certificate) {
      errors.halal_certificate = "Please select your Halal certificate type.";
    }
    if (!fields.consent) {
      errors.consent = "Please confirm you agree to the Disclaimer & Terms of Use before submitting.";
    }

    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    setResult(null);

    // same last-line-of-defence clearing as SubmitForm.js's handleSubmit —
    // a badge no longer visible for the currently selected category is
    // cleared here before sending, not just visually.
    const halalVisible    = isBadgeVisible("halal", fields.category);
    const deliveryVisible = isBadgeVisible("delivery", fields.category);
    const calloutsVisible = isBadgeVisible("callouts", fields.category);

    const cleanedHalal            = halalVisible && fields.halal;
    const cleanedHalalCertificate = cleanedHalal ? fields.halal_certificate : "";
    const cleanedDelivery         = deliveryVisible && fields.delivery_available;
    const cleanedCallouts         = calloutsVisible && fields.callouts_available;

    const formData = new FormData();
    for (const field of Object.keys(fields)) {
      let value = fields[field];
      if (field === "halal") value = cleanedHalal;
      if (field === "halal_certificate") value = cleanedHalalCertificate;
      if (field === "delivery_available") value = cleanedDelivery;
      if (field === "callouts_available") value = cleanedCallouts;
      formData.append(field, value);
    }
    formData.append("logo_url", logoUrl);

    const response = await submitEditRequest(token, formData);
    setResult(response);
    setSubmitting(false);
  }

  if (result?.success) {
    return (
      <div className="submit-success">
        <i className="fa-solid fa-circle-check" />
        <h2>Changes Submitted</h2>
        <p>{result.message}</p>
      </div>
    );
  }

  // an invalid/expired token discovered only at submit time (e.g. the
  // 24-hour window ran out while this tab was still open) gets the exact
  // same message as the page-load check in page.js, plus a way back.
  if (result?.invalidToken) {
    return (
      <div className="submit-error">
        <i className="fa-solid fa-triangle-exclamation" /> {result.error}{" "}
        <Link href="/edit">Request a new link</Link>.
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

      <div className="form-section">
        <h2 className="form-section-title">
          <i className="fa-solid fa-store" /> Your Business
        </h2>

        <div className="form-group">
          <label htmlFor="name">Business Name <span className="required">*</span></label>
          <input id="name" className="form-control" type="text" value={fields.name}
            onChange={set("name")} placeholder="e.g. Thandi's Home Bakery" />
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category <span className="required">*</span></label>
            <select id="category" className="form-control" value={fields.category}
              onChange={handleCategoryChange}>
              <option value="">Select a category...</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.name}>{c.name}</option>
              ))}
            </select>
            <span className="form-hint">Choose the category that best describes your business. Use Halal, Delivery, and Call-Outs below to show what you also offer.</span>
            {fieldErrors.category && <span className="field-error">{fieldErrors.category}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="province">Province <span className="required">*</span></label>
            <select id="province" className="form-control" value={fields.province}
              onChange={set("province")}>
              <option value="">Select your province...</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {fieldErrors.province && <span className="field-error">{fieldErrors.province}</span>}
          </div>
        </div>

        {fields.category === "Other" && (
          <div className="form-group">
            <label htmlFor="custom_category">Please describe your category <span className="required">*</span></label>
            <input id="custom_category" className="form-control" type="text" value={fields.custom_category}
              onChange={set("custom_category")} placeholder="e.g. Pet Grooming" />
            {fieldErrors.custom_category && <span className="field-error">{fieldErrors.custom_category}</span>}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="business_type">Business Type <span className="required">*</span></label>
          <select id="business_type" className="form-control" value={fields.business_type}
            onChange={handleBusinessTypeChange}>
            <option value="">Select business type...</option>
            {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {fieldErrors.business_type && <span className="field-error">{fieldErrors.business_type}</span>}
        </div>

        {PHYSICAL_BUSINESS_TYPES.includes(fields.business_type) && (
          <div className="form-group">
            <label htmlFor="street_address">Street Address <span className="optional">(optional)</span></label>
            <input id="street_address" className="form-control" type="text" value={fields.street_address}
              onChange={set("street_address")} placeholder="e.g. 12 Main Street, Estcourt" />
            <span className="form-hint">Shown on a map for customers to find you — only needed for a physical location.</span>
          </div>
        )}

        {(isBadgeVisible("halal", fields.category) ||
          isBadgeVisible("delivery", fields.category) ||
          isBadgeVisible("callouts", fields.category)) && (
          <div className="form-group">
            <label>Badges <span className="optional">(optional)</span></label>

            {isBadgeVisible("halal", fields.category) && (
              <>
                <label className="badge-checkbox">
                  <input type="checkbox" checked={fields.halal} onChange={handleHalalChange} />
                  Halal
                </label>
                {fields.halal && (
                  <div className="badge-cert-group">
                    <select
                      className="form-control"
                      value={fields.halal_certificate}
                      onChange={set("halal_certificate")}
                    >
                      <option value="" disabled>Select certificate type...</option>
                      {HALAL_CERTIFICATES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    {fieldErrors.halal_certificate && (
                      <span className="field-error">{fieldErrors.halal_certificate}</span>
                    )}
                  </div>
                )}
              </>
            )}

            {isBadgeVisible("delivery", fields.category) && (
              <label className="badge-checkbox">
                <input type="checkbox" checked={fields.delivery_available} onChange={toggleCheckbox("delivery_available")} />
                We offer delivery
              </label>
            )}

            {isBadgeVisible("callouts", fields.category) && (
              <label className="badge-checkbox">
                <input type="checkbox" checked={fields.callouts_available} onChange={toggleCheckbox("callouts_available")} />
                We come to you (call-outs available)
              </label>
            )}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="area">Area / Suburb / Town <span className="required">*</span></label>
          <input id="area" className="form-control" type="text" value={fields.area}
            onChange={set("area")} placeholder="e.g. Umhlanga, Estcourt, Sandton" />
          <span className="form-hint">Type the area, suburb, or town your business operates in</span>
          {fieldErrors.area && <span className="field-error">{fieldErrors.area}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description">
            What do you offer? <span className="required">*</span>
            <span className="char-count">{charCount}/200</span>
          </label>
          <textarea id="description" className="form-control" value={fields.description}
            onChange={handleDescriptionChange}
            rows={3} maxLength={200}
            placeholder="1–2 sentences about your products or services" />
          {fieldErrors.description && <span className="field-error">{fieldErrors.description}</span>}
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section-title">
          <i className="fa-solid fa-address-card" /> How Customers Reach You
        </h2>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="whatsapp">WhatsApp Number <span className="required">*</span></label>
            <input id="whatsapp" className="form-control" type="tel" value={fields.whatsapp}
              onChange={set("whatsapp")} placeholder="e.g. 082 123 4567" />
            <span className="form-hint">Enter your number starting with 0 — we&apos;ll format it automatically.</span>
            {fieldErrors.whatsapp && <span className="field-error">{fieldErrors.whatsapp}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="website">Website <span className="optional">(optional)</span></label>
            <input id="website" className="form-control" type="url" value={fields.website}
              onChange={set("website")} placeholder="https://..." />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="instagram">Instagram Profile <span className="optional">(optional)</span></label>
            <input id="instagram" className="form-control" type="text" value={fields.instagram}
              onChange={set("instagram")} placeholder="https://instagram.com/yourbusiness or @yourbusiness" />
            <span className="form-hint">Enter your Instagram handle or full profile link</span>
          </div>

          <div className="form-group">
            <label htmlFor="facebook">Facebook Page <span className="optional">(optional)</span></label>
            <input id="facebook" className="form-control" type="text" value={fields.facebook}
              onChange={set("facebook")} placeholder="https://facebook.com/yourbusiness" />
            <span className="form-hint">Enter your Facebook page link</span>
          </div>
        </div>
      </div>

      {/* ── Logo ── mirrors SubmitForm.js exactly, except logoUrl can start
          out already set (see the useState above), so an existing logo
          shows the "Change Logo" state on load rather than an empty
          dropzone. */}
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
              <button type="button" className="btn-secondary" onClick={handleChangeLogoClick}>
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

      <div className="form-group">
        <label className="badge-checkbox">
          <input type="checkbox" checked={fields.consent} onChange={toggleCheckbox("consent")} />
          I have read and agree to the Hidden Gems SA{" "}
          <Link href="/disclaimer" target="_blank" rel="noopener noreferrer">
            Disclaimer &amp; Terms of Use
          </Link>
        </label>
        {fieldErrors.consent && <span className="field-error">{fieldErrors.consent}</span>}
      </div>

      <div className="submit-form-footer">
        <p className="submit-disclaimer">
          <i className="fa-solid fa-shield-halved" /> Changes are reviewed before going live — your current listing stays as-is until then.
        </p>
        <button type="submit" className="btn-primary submit-btn" disabled={submitting || !fields.consent}>
          {submitting
            ? <><i className="fa-solid fa-spinner fa-spin" /> Submitting...</>
            : <><i className="fa-solid fa-paper-plane" /> Submit Changes for Review</>}
        </button>
      </div>

      {/* ── Crop Modal ── mirrors SubmitForm.js exactly. */}
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
