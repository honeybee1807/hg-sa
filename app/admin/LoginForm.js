"use client";

// the login screen shown at hiddengemssa.co.za/admin when nobody is logged
// in yet. it's a small form with just a password field.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "./actions";

export default function LoginForm() {
  const [error, setError]     = useState(""); // an error message to show, if the password was wrong
  const [loading, setLoading] = useState(false); // true while we're waiting to hear back
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault(); // stop the browser from doing its normal full-page-reload form submit
    setLoading(true);
    setError("");

    const result = await loginAdmin(new FormData(e.target));

    if (result.success) {
      // successfully logged in — reload the page's data. app/admin/page.js
      // will now see the "logged in" cookie and show the real admin panel
      // instead of this login form.
      router.refresh();
    } else {
      // wrong password — show the error and let them try again.
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-wrap">
      <form onSubmit={handleSubmit} className="admin-login-card">
        <div className="admin-login-logo">
          <i className="fa-solid fa-shield-halved" />
        </div>
        <h1 className="admin-login-title">Admin Access</h1>
        <p className="admin-login-sub">Hidden Gems SA</p>

        {error && (
          <div className="submit-error">
            <i className="fa-solid fa-triangle-exclamation" /> {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className="form-control"
            required
            autoFocus
            placeholder="Enter admin password"
          />
        </div>

        <button type="submit" className="btn-primary admin-login-btn" disabled={loading}>
          {loading
            ? <><i className="fa-solid fa-spinner fa-spin" /> Signing in...</>
            : <><i className="fa-solid fa-right-to-bracket" /> Sign In</>}
        </button>
      </form>
    </div>
  );
}
