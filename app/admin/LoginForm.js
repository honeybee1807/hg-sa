"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "./actions";

export default function LoginForm() {
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await loginAdmin(new FormData(e.target));
    if (res.success) {
      router.refresh();
    } else {
      setError(res.error);
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
