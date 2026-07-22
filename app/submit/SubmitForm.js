"use client";

// this is the actual "list your business" form that people fill in at
// hiddengemssa.co.za/submit. it's a client component (it needs to react to
// typing, clicking, and uploading in the browser) that hands the finished
// data over to submitBusiness() in actions.js once someone hits submit.
//
// the trickiest part of this file is the logo upload, which happens in two
// steps: first the person crops their photo into a neat square using the
// Cropper.js library (loaded only when needed, so it doesn't slow down
// everyone who never uploads a logo), then the cropped image is uploaded
// straight to Cloudinary (an image-hosting service) from the browser. the
// business itself isn't saved to our database until the very end, once a
// logo URL (if any) is ready.
//
// every required field is checked here, in the browser, before the form is
// ever sent to the server — each problem shows up as its own small message
// directly under the field it belongs to, rather than one combined message
// at the top. app/submit/actions.js repeats the same checks server-side as
// a backstop (in case JavaScript is ever unavailable or bypassed); if that
// backstop is what catches something, its message shows in the banner at
// the top of the form instead, since there's no per-field context to attach
// it to at that point.

import { useState, useRef, useEffect } from "react";
import { submitBusiness } from "./actions";
import { CATEGORIES, PROVINCES } from "@/lib/constants";

// where uploaded logos get sent, and which "upload preset" (a pre-configured
// set of rules on the Cloudinary side — image size limits, allowed formats,
// etc.) to use. these are not secret; Cloudinary's unsigned-upload presets
// are designed to be called directly from a browser.
const CLOUDINARY_URL    = "https://api.cloudinary.com/v1_1/dfxhlv8jc/image/upload";
const CLOUDINARY_PRESET = "hidden_gems_sa_logos";

// the options shown in the "Business Type" dropdown — kept here rather than
// in lib/constants.js since this list is only ever used on this form.
const BUSINESS_TYPES = [
  "Physical location — customers visit us",
  "Home-based — we operate from home",
  "Mobile — we come to the customer",
  "Online only — no physical location",
];

// the options shown in the optional "how did you hear about us" dropdown —
// for internal tracking only, never shown anywhere public.
const REFERRAL_SOURCES = [
  "WhatsApp",
  "Facebook",
  "Instagram",
  "TikTok",
  "Google Search",
  "A friend or family member",
  "Saw it shared online",
  "Olideen Technologies",
  "Other",
];

// what every field in the form starts out as — all empty. used both when the
// form first loads and to reset everything after a successful submission.
// "is_own_business" defaults to "yes" since most people listing a business
// are listing their own — someone submitting on behalf of another business
// has to actively switch it to "no".
const INITIAL = {
  name: "", category: "", custom_category: "", business_type: "", province: "", area: "",
  whatsapp: "", website: "", description: "",
  owner_name: "", owner_email: "", referral_source: "",
  is_own_business: "yes",
  on_behalf_of_name: "", on_behalf_of_reason: "",
};

// turns a WhatsApp number typed in any common format into the one format
// WhatsApp's own links understand: digits only, starting with the "27"
// South Africa country code. mirrors the exact same logic in
// app/submit/actions.js, kept here too so the browser can check a number
// looks valid before ever sending the form off.
function normalizeWhatsApp(raw) {
  if (!raw) return null;

  let digitsOnly = raw.replace(/\D/g, "");
  if (!digitsOnly) return null;

  if (digitsOnly.startsWith("00")) {
    digitsOnly = digitsOnly.slice(2);
  }

  if (digitsOnly.startsWith("27")) return digitsOnly;
  if (digitsOnly.startsWith("0")) return "27" + digitsOnly.slice(1);
  return "27" + digitsOnly;
}

// checks that a normalized number actually looks like a real South African
// mobile number: the "27" country code, then a mobile prefix digit (6, 7,
// or 8 — landlines start with 01-05 instead), then exactly 8 more digits.
function isValidSouthAfricanMobile(normalized) {
  return /^27[678]\d{8}$/.test(normalized ?? "");
}

export default function SubmitForm() {
  const [fields, setFields]       = useState(INITIAL);      // every text field in the form, kept together in one object
  const [fieldErrors, setFieldErrors] = useState({});         // one inline validation message per field name, only for fields currently failing validation
  const [logoUrl, setLogoUrl]     = useState("");            // the Cloudinary web address of the uploaded logo, once there is one
  const [cropSrc, setCropSrc]     = useState("");            // a temporary local link to the photo the person just picked, for the crop popup to display
  const [cropOpen, setCropOpen]   = useState(false);          // whether the "crop your logo" popup is currently showing
  const [uploading, setUploading] = useState(false);          // true while the cropped logo is being sent to Cloudinary
  const [submitting, setSubmitting] = useState(false);         // true while the whole form is being sent to our database
  const [result, setResult]       = useState(null);            // the outcome of a server-side rejection: { success: false, error: "..." } — only used as a backstop, see the top-of-file note
  const [charCount, setCharCount] = useState(0);               // how many characters are currently in the description box, for the "x/200" counter

  const imgRef     = useRef(null);  // points at the <img> element that Cropper.js attaches itself to
  const cropperRef = useRef(null);  // holds the live Cropper.js instance, so it can be cleaned up later
  const fileRef    = useRef(null);  // points at the hidden file-picker <input>, so it can be reset when the person removes a logo

  // this runs every time the crop popup opens or closes. Cropper.js is a
  // fairly heavy library, so instead of loading it up front for every
  // visitor, it's only fetched ("import(...)") the moment someone actually
  // opens the crop popup.
  useEffect(() => {
    // nothing to do if the popup isn't open, or the image it needs to
    // attach to hasn't rendered yet.
    if (!cropOpen || !imgRef.current) return;

    // this flag protects against a timing problem: if the popup gets closed
    // again before the cropper.js library has finished loading, "destroyed"
    // will be true by the time the .then() below runs, so it knows to skip
    // setting anything up on an image that's no longer there.
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

    // cleanup: whenever the popup closes (or the component goes away), mark
    // this run as destroyed and tear down the cropper instance so it isn't
    // left running against an image that no longer exists.
    return () => {
      destroyed = true;
      cropperRef.current?.destroy();
      cropperRef.current = null;
    };
  }, [cropOpen]);

  // clears one field's inline error message, if it currently has one —
  // called whenever that field changes, so a message doesn't linger on
  // screen after the person has already started fixing it.
  function clearFieldError(field) {
    setFieldErrors((previousErrors) => {
      if (!previousErrors[field]) return previousErrors;
      const nextErrors = { ...previousErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  // builds a small onChange handler for one specific text field. instead of
  // writing a separate handler function for "name", another for "category",
  // and so on, every input below calls set("name"), set("category"), etc.,
  // and gets back a ready-to-use handler that updates just that one field
  // while leaving the rest of the form exactly as it was.
  function set(field) {
    return function handleFieldChange(event) {
      setFields((previousFields) => ({
        ...previousFields,
        [field]: event.target.value,
      }));
      clearFieldError(field);
    };
  }

  // the category dropdown needs one extra step beyond the generic set()
  // above: the moment someone switches away from "Other", whatever they'd
  // typed into the custom-category field is stale and must be cleared —
  // otherwise it could linger in state and get submitted for an unrelated
  // category if the field were ever hidden without being reset.
  function handleCategoryChange(event) {
    const newCategory = event.target.value;
    setFields((previousFields) => ({
      ...previousFields,
      category: newCategory,
      custom_category: newCategory === "Other" ? previousFields.custom_category : "",
    }));
    clearFieldError("category");
    clearFieldError("custom_category");
  }

  // runs the moment someone picks a photo from their device. it doesn't
  // upload anything yet — it just creates a temporary, browser-only link to
  // the chosen file so the crop popup can display it, then opens that popup.
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
  // straight to Cloudinary from the browser.
  async function confirmCrop() {
    if (!cropperRef.current) return;
    setUploading(true);

    // ask cropper.js for the cropped result as a 400x400 image, then
    // convert it into a "blob" (a raw file-like chunk of image data) that
    // can be attached to an upload. this conversion happens in the
    // background, so everything that depends on it lives inside this
    // callback function.
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
            // success — remember the logo's new web address, close the
            // popup, and clean up the temporary local file link.
            setLogoUrl(uploadResult.secure_url);
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
      }, "image/jpeg", 0.9); // save the crop as a jpeg at 90% quality
  }

  // checks every field in the form and returns an object of { fieldName:
  // message } for whichever ones aren't valid right now — empty object
  // means the form is entirely valid. each message is a complete sentence
  // that says what's needed and why, shown inline right under that field.
  function validateForm() {
    const errors = {};

    if (!fields.name.trim()) {
      errors.name = "Please enter your business name.";
    }
    if (!fields.category) {
      errors.category = "Please select a category for your business.";
    }
    if (fields.category === "Other" && !fields.custom_category.trim()) {
      errors.custom_category = "Please describe your business category.";
    }
    if (!fields.business_type) {
      errors.business_type = "Please select the business type that best describes how your business operates.";
    }
    if (!fields.province) {
      errors.province = "Please select your province.";
    }
    if (!fields.area.trim()) {
      errors.area = "Please enter the area, suburb, or town your business operates in.";
    }
    if (!fields.description.trim()) {
      errors.description = "Please describe what your business offers.";
    }
    if (!fields.whatsapp.trim()) {
      errors.whatsapp = "A WhatsApp number is required. We use this to contact you directly regarding your listing.";
    } else if (!isValidSouthAfricanMobile(normalizeWhatsApp(fields.whatsapp))) {
      errors.whatsapp = "Please enter a valid South African mobile number, starting with 0 or +27.";
    }
    if (!fields.owner_name.trim()) {
      errors.owner_name = "Please enter your name.";
    }
    if (!fields.owner_email.trim()) {
      errors.owner_email = "An email address is required. We use this to notify you when your listing has been reviewed.";
    }
    if (fields.is_own_business === "no") {
      if (!fields.on_behalf_of_name.trim()) {
        errors.on_behalf_of_name = "Please tell us whose business this is.";
      }
      if (!fields.on_behalf_of_reason.trim()) {
        errors.on_behalf_of_reason = "Please tell us why you're listing it on their behalf.";
      }
    }

    return errors;
  }

  // runs when the whole form is submitted. checks everything in the browser
  // first — if anything's wrong, it stops right there and shows each
  // problem under its own field, without ever contacting the server. only
  // once everything passes does it gather "fields" plus whatever logo URL
  // is currently set, package it into a FormData object (the format Server
  // Actions expect), and hand it off to submitBusiness() in actions.js.
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

    const formDataToSubmit = new FormData();

    // copy every field currently in state onto the FormData one at a time,
    // rather than one long chained expression, so it's obvious exactly what
    // is being sent. "custom_category" is the one exception: only ever sent
    // when the category itself is "Other" — for any other category it's
    // blanked out here as a last line of defence, even though the field is
    // already cleared the moment the category selection changes away from
    // "Other" (see handleCategoryChange above).
    for (const fieldName of Object.keys(fields)) {
      const value = fieldName === "custom_category" && fields.category !== "Other"
        ? ""
        : fields[fieldName];
      formDataToSubmit.append(fieldName, value);
    }
    formDataToSubmit.append("logo_url", logoUrl);

    const submissionResult = await submitBusiness(formDataToSubmit);
    setResult(submissionResult);
    setSubmitting(false);
  }

  // the description box needs two things to happen on every keystroke: the
  // usual field update (via set("description")) and an update to the
  // on-screen "x/200" character counter. this keeps both steps together and
  // named, instead of an inline arrow function doing both at once.
  function handleDescriptionChange(event) {
    set("description")(event);
    setCharCount(event.target.value.length);
  }

  // clears the uploaded logo so the person can pick a different one. also
  // resets the hidden file-picker input, if it exists, so choosing the same
  // file again would still register as a change.
  function handleChangeLogoClick() {
    setLogoUrl("");
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  // wipes the form back to its empty starting state, for the "Submit
  // Another Business" button shown after a successful submission.
  function handleSubmitAnotherClick() {
    setFields(INITIAL);
    setFieldErrors({});
    setLogoUrl("");
    setResult(null);
  }

  // once a submission has succeeded, show a thank-you screen instead of the
  // form itself.
  if (result?.success) {
    return (
      <div className="submit-success">
        <i className="fa-solid fa-circle-check" />
        <h2>Submission Received!</h2>
        <p>Thank you! Your listing is now under review — we&apos;ll have it live within 24–48 hours.</p>
        <button className="btn-secondary mt-3" onClick={handleSubmitAnotherClick}>
          <i className="fa-solid fa-plus" /> Submit Another Business
        </button>
      </div>
    );
  }

  // the form itself, laid out in four sections: business info, contact
  // details, owner details (kept private), and an optional logo — followed
  // by the submit button and, when open, the crop popup.
  return (
    <form onSubmit={handleSubmit} className="submit-form" noValidate>
      {/* only ever shown if the server-side backstop in actions.js rejects
          a submission that somehow got past the checks above (e.g.
          JavaScript was unavailable) — see the top-of-file note. */}
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

        {/* only shown once someone picks "Other" as their category — for
            any of the listed categories, there's nothing more to ask here. */}
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
            onChange={set("business_type")}>
            <option value="">Select business type...</option>
            {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {fieldErrors.business_type && <span className="field-error">{fieldErrors.business_type}</span>}
        </div>

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

      {/* ── Contact Details ── */}
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
              onChange={set("owner_name")} placeholder="Full name" />
            {fieldErrors.owner_name && <span className="field-error">{fieldErrors.owner_name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="owner_email">
              Your Email <span className="required">*</span>
            </label>
            <input id="owner_email" className="form-control" type="email" value={fields.owner_email}
              onChange={set("owner_email")} placeholder="For approval notifications" />
            {fieldErrors.owner_email && <span className="field-error">{fieldErrors.owner_email}</span>}
          </div>
        </div>
      </div>

      {/* ── Relationship to This Business ── */}
      <div className="form-section">
        <h2 className="form-section-title">
          <i className="fa-solid fa-handshake" /> Whose Business Is This?
        </h2>
        <p className="form-section-note">
          <i className="fa-solid fa-circle-info" /> This helps us confirm every listing has the
          real owner&apos;s knowledge before it goes live.
        </p>

        <div className="form-group">
          <div className="radio-choice-row">
            <label className="radio-choice">
              <input
                type="radio"
                name="is_own_business"
                value="yes"
                checked={fields.is_own_business === "yes"}
                onChange={set("is_own_business")}
              />
              This is my own business
            </label>
            <label className="radio-choice">
              <input
                type="radio"
                name="is_own_business"
                value="no"
                checked={fields.is_own_business === "no"}
                onChange={set("is_own_business")}
              />
              I&apos;m listing it on someone else&apos;s behalf
            </label>
          </div>
        </div>

        {/* these two extra questions only appear once someone says they're
            listing on someone else's behalf — for their own business, there's
            nothing more to ask here. */}
        {fields.is_own_business === "no" && (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="on_behalf_of_name">
                Whose Business Is It? <span className="required">*</span>
              </label>
              <input id="on_behalf_of_name" className="form-control" type="text" value={fields.on_behalf_of_name}
                onChange={set("on_behalf_of_name")} placeholder="Business owner's name" />
              {fieldErrors.on_behalf_of_name && <span className="field-error">{fieldErrors.on_behalf_of_name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="on_behalf_of_reason">
                Why Are You Listing It for Them? <span className="required">*</span>
              </label>
              <input id="on_behalf_of_reason" className="form-control" type="text" value={fields.on_behalf_of_reason}
                onChange={set("on_behalf_of_reason")} placeholder="e.g. Their son, helping them get online" />
              {fieldErrors.on_behalf_of_reason && <span className="field-error">{fieldErrors.on_behalf_of_reason}</span>}
            </div>
          </div>
        )}
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

      {/* ── How did you hear about us (internal tracking only) ── */}
      <div className="form-section">
        <div className="form-group">
          <label htmlFor="referral_source">
            How did you hear about Hidden Gems SA? <span className="optional">(optional)</span>
          </label>
          <select id="referral_source" className="form-control" value={fields.referral_source}
            onChange={set("referral_source")}>
            <option value="">Select an option...</option>
            {REFERRAL_SOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
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
