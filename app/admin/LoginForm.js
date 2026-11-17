"use client";

// the login screen shown at hiddengemssa.co.za/admin when nobody is logged
// in yet. it's a small form with just a password field.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loginAdmin } from "./actions";
import "./admin.css";

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

  // the look matches the redesigned admin (see the ".adm-login" styles in
  // app/globals.css); the sign-in logic above is unchanged.
  return (
    <div className="adm-login">
      <form onSubmit={handleSubmit} className="adm-login-card">
        <div className="adm-login-brand">
          <Image src="/HG_Logo.png" alt="Hidden Gems SA" width={180} height={78} style={{ width: 160, height: "auto" }} priority />
        </div>
        <p className="adm-eyebrow">Directory workspace</p>
        <h1 className="adm-login-title">Welcome <em>back.</em></h1>
        <p className="adm-login-sub">Sign in to review listings and manage the directory.</p>

        {error && (
          <div className="adm-banner adm-banner--error" role="alert">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {error}
          </div>
        )}

        <div className="adm-field">
          <label htmlFor="password" className="adm-label">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className="adm-input"
            required
            autoFocus
            autoComplete="current-password"
            placeholder="Enter admin password"
          />
        </div>

        <button type="submit" className="adm-btn adm-btn--primary adm-btn--block" disabled={loading}>
          {loading
            ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Signing in...</>
            : <><i className="fa-solid fa-right-to-bracket" aria-hidden="true" /> Sign In</>}
        </button>

        <Link href="/" className="adm-login-back">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to the public site
        </Link>
      </form>
    </div>
  );
}
