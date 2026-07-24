"use client";

// the small form at hiddengemssa.co.za/edit — a business owner types the
// email address they used when they submitted their listing, and (if it
// matches an approved business) gets sent a one-time link to
// /edit/[token] where they can actually make changes. see
// app/edit/actions.js for what happens server-side.

import { useState } from "react";
import { requestEditLink } from "./actions";

export default function EditRequestForm() {
  const [email, setEmail]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]       = useState(null); // { success, error } or { success: true, message }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    const formData = new FormData();
    formData.append("email", email);

    const response = await requestEditLink(formData);
    setResult(response);
    setSubmitting(false);
  }

  if (result?.success) {
    return (
      <div className="submit-success">
        <i className="fa-solid fa-circle-check" />
        <h2>Check Your Email</h2>
        <p>{result.message}</p>
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

      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          className="form-control"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <button type="submit" className="btn-primary submit-btn" disabled={submitting}>
        {submitting
          ? <><i className="fa-solid fa-spinner fa-spin" /> Sending...</>
          : <><i className="fa-solid fa-paper-plane" /> Send Edit Link</>}
      </button>
    </form>
  );
}
