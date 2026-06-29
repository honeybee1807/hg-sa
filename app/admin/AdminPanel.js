"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  logoutAdmin,
  approveBusiness,
  rejectBusiness,
  setFeaturedGem,
  autoSelectFeaturedGem,
  searchBusinesses,
} from "./actions";
import { SITE_URL, OLIDEEN_URL } from "@/lib/constants";

const TABS = ["pending", "approved", "rejected", "all"];

export default function AdminPanel({ businesses, currentFeatured }) {
  const router  = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tab, setTab]                 = useState("pending");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote]   = useState("");
  const [featSearch, setFeatSearch]   = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]     = useState(false);
  const [message, setMessage]         = useState(null);

  const filtered = businesses.filter((b) => tab === "all" || b.status === tab);

  function flash(msg, isError = false) {
    setMessage({ text: msg, error: isError });
    setTimeout(() => setMessage(null), 4000);
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleApprove(biz) {
    const res = await approveBusiness(biz.id, biz.name, biz.town);
    if (res.success) { flash(`Approved — slug: ${res.slug}`); refresh(); }
    else flash(res.error, true);
  }

  async function handleReject(id) {
    const res = await rejectBusiness(id, rejectNote);
    if (res.success) { setRejectingId(null); setRejectNote(""); flash("Rejected."); refresh(); }
    else flash(res.error, true);
  }

  async function handleAutoSelect() {
    const res = await autoSelectFeaturedGem();
    if (res.success) { flash("Featured Gem auto-selected for this week!"); refresh(); }
    else flash(res.error ?? "Auto-select failed.", true);
  }

  async function handleFeatSearch(e) {
    const q = e.target.value;
    setFeatSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const results = await searchBusinesses(q);
    setSearchResults(results);
    setSearching(false);
  }

  async function handleSetFeatured(bizId) {
    const res = await setFeaturedGem(bizId);
    if (res.success) {
      setFeatSearch(""); setSearchResults([]);
      flash("Featured Gem updated!"); refresh();
    } else flash(res.error, true);
  }

  function buildWaMessage(biz) {
    const text = `Congratulations ${biz.owner_name ?? ""}! 🎉\n\nYour business *${biz.name}* has been selected as Hidden Gems SA's *Featured Gem of the Week*!\n\nYour listing is live at:\n${SITE_URL}/business/${biz.slug}\n\n— Lubnah\nHidden Gems SA Team\n🌐 ${SITE_URL}\n💻 Built by Olideen Technologies — ${OLIDEEN_URL}`;
    return `https://wa.me/${biz.whatsapp}?text=${encodeURIComponent(text)}`;
  }

  function downloadGraphic(biz) {
    const canvas  = document.createElement("canvas");
    canvas.width  = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");

    function draw(logoImg) {
      // Background
      const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
      grad.addColorStop(0, "#1C3060");
      grad.addColorStop(0.55, "#22587F");
      grad.addColorStop(1, "#1A4566");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1080);

      // Rose accent bar top
      const bar = ctx.createLinearGradient(0, 0, 1080, 0);
      bar.addColorStop(0, "#C46EA1");
      bar.addColorStop(1, "#22587F");
      ctx.fillStyle = bar;
      ctx.fillRect(0, 0, 1080, 12);

      // "Gem of the Week" tag
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.roundRect(390, 90, 300, 48, 24);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "600 20px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✦ FEATURED GEM OF THE WEEK ✦", 540, 121);

      // Logo or monogram
      const logoY = 220, logoR = 120;
      ctx.save();
      ctx.beginPath();
      ctx.arc(540, logoY + logoR, logoR, 0, Math.PI * 2);
      ctx.fillStyle = "#E4EFF7";
      ctx.fill();

      if (logoImg) {
        ctx.clip();
        ctx.drawImage(logoImg, 540 - logoR, logoY, logoR * 2, logoR * 2);
      } else {
        ctx.clip();
        ctx.fillStyle = "#22587F";
        ctx.font = `italic bold 110px Georgia, serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(biz.name[0].toUpperCase(), 540, logoY + logoR);
      }
      ctx.restore();
      ctx.textBaseline = "alphabetic";

      // Business name
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 68px Georgia, serif`;
      ctx.textAlign = "center";
      const nameY = logoY + logoR * 2 + 80;
      ctx.fillText(biz.name, 540, nameY);

      // Category · Town
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "36px Arial, sans-serif";
      ctx.fillText(`${biz.category}  ·  ${biz.town}, KZN`, 540, nameY + 58);

      // Owner
      if (biz.owner_name) {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "italic 30px Georgia, serif";
        ctx.fillText(`by ${biz.owner_name}`, 540, nameY + 110);
      }

      // Divider
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(200, 900); ctx.lineTo(880, 900);
      ctx.stroke();

      // Site URL
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "28px Arial, sans-serif";
      ctx.fillText(SITE_URL.replace("https://", ""), 540, 946);

      // Olideen credit
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "22px Arial, sans-serif";
      ctx.fillText(`Built by Olideen Technologies — olideentech.co.za`, 540, 985);

      // Download
      const a = document.createElement("a");
      a.download = `${biz.name.replace(/\s+/g, "-")}-featured-gem.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    }

    if (biz.logo_url) {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload  = () => draw(img);
      img.onerror = () => draw(null);
      img.src = biz.logo_url;
    } else {
      draw(null);
    }
  }

  const featBiz = currentFeatured?.businesses ?? null;

  return (
    <div className="admin-wrap">
      {/* Header */}
      <header className="admin-header">
        <div className="container admin-header-inner">
          <h1><i className="fa-solid fa-shield-halved" /> Admin Panel</h1>
          <button
            className="btn-secondary admin-logout"
            onClick={async () => { await logoutAdmin(); router.refresh(); }}
          >
            <i className="fa-solid fa-right-from-bracket" /> Logout
          </button>
        </div>
      </header>

      <div className="container admin-body">

        {/* Flash message */}
        {message && (
          <div className={message.error ? "submit-error" : "admin-flash-ok"}>
            <i className={`fa-solid ${message.error ? "fa-triangle-exclamation" : "fa-circle-check"}`} />
            {" "}{message.text}
          </div>
        )}

        {/* ── Featured Gem ── */}
        <section className="admin-card">
          <h2 className="admin-section-title">
            <i className="fa-solid fa-gem text-rose" /> Featured Gem of the Week
          </h2>

          {featBiz ? (
            <div className="admin-feat-current">
              <div className="admin-feat-info">
                {featBiz.logo_url
                  ? <Image src={featBiz.logo_url} alt="" width={56} height={56} className="avatar" />
                  : <div className="avatar-monogram">{featBiz.name[0]}</div>}
                <div>
                  <strong>{featBiz.name}</strong>
                  <p>{featBiz.category} · {featBiz.town}</p>
                  <p className="admin-feat-until">
                    Until {new Date(currentFeatured.featured_until).toLocaleDateString("en-ZA")}
                  </p>
                </div>
              </div>
              <div className="admin-feat-actions">
                {featBiz.whatsapp && (
                  <a
                    href={buildWaMessage(featBiz)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary admin-wa-btn"
                  >
                    <i className="fa-brands fa-whatsapp" /> Notify Owner
                  </a>
                )}
                <button
                  className="btn-secondary"
                  onClick={() => downloadGraphic(featBiz)}
                >
                  <i className="fa-solid fa-download" /> Download Graphic
                </button>
              </div>
            </div>
          ) : (
            <p className="admin-feat-empty">No featured gem set this week.</p>
          )}

          <div className="admin-feat-controls">
            <button className="btn-primary" onClick={handleAutoSelect} disabled={isPending}>
              <i className="fa-solid fa-rotate" /> Auto-select This Week&apos;s Gem
            </button>

            <div className="admin-feat-search">
              <input
                type="text"
                className="form-control"
                placeholder="Search to manually set featured gem..."
                value={featSearch}
                onChange={handleFeatSearch}
              />
              {searching && <p className="admin-searching">Searching...</p>}
              {searchResults.length > 0 && (
                <ul className="admin-search-results">
                  {searchResults.map((b) => (
                    <li key={b.id} className="admin-search-result">
                      <span><strong>{b.name}</strong> — {b.town}</span>
                      <button
                        className="btn-primary admin-pick-btn"
                        onClick={() => handleSetFeatured(b.id)}
                      >
                        Set Featured
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* ── Business Listings ── */}
        <section className="admin-card">
          <h2 className="admin-section-title">
            <i className="fa-solid fa-store" /> Listings
          </h2>

          {/* Tabs */}
          <div className="admin-tabs">
            {TABS.map((t) => {
              const count = t === "all"
                ? businesses.length
                : businesses.filter((b) => b.status === t).length;
              return (
                <button
                  key={t}
                  className={`admin-tab ${tab === t ? "admin-tab--active" : ""}`}
                  onClick={() => setTab(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  <span className="admin-tab-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Business list */}
          {filtered.length === 0 ? (
            <div className="admin-empty">
              <i className="fa-solid fa-inbox" />
              <p>No {tab === "all" ? "" : tab} listings.</p>
            </div>
          ) : (
            <div className="admin-biz-list">
              {filtered.map((biz) => (
                <div key={biz.id} className="admin-biz-card">
                  <div className="admin-biz-top">
                    <div className="admin-biz-logo">
                      {biz.logo_url
                        ? <Image src={biz.logo_url} alt="" width={56} height={56} className="avatar" />
                        : <div className="avatar-monogram">{biz.name[0]}</div>}
                    </div>
                    <div className="admin-biz-info">
                      <div className="admin-biz-name-row">
                        <strong>{biz.name}</strong>
                        <span className={`badge badge-${biz.status}`}>{biz.status}</span>
                      </div>
                      <p className="admin-biz-meta">
                        <i className="fa-solid fa-tag" /> {biz.category}
                        <span className="admin-meta-sep">·</span>
                        <i className="fa-solid fa-location-dot" /> {biz.town.split(",")[0]}, KZN
                      </p>
                      {biz.description && <p className="admin-biz-desc">{biz.description}</p>}
                    </div>
                  </div>

                  <div className="admin-biz-owner">
                    <span><i className="fa-solid fa-user" /> {biz.owner_name}</span>
                    {biz.owner_email && <span><i className="fa-solid fa-envelope" /> {biz.owner_email}</span>}
                    {biz.whatsapp && <span><i className="fa-brands fa-whatsapp" /> {biz.whatsapp}</span>}
                  </div>

                  {biz.review_note && (
                    <div className="admin-reject-note">
                      <i className="fa-solid fa-note-sticky" /> {biz.review_note}
                    </div>
                  )}

                  {biz.status === "pending" && (
                    <div className="admin-biz-actions">
                      <button
                        className="btn-primary admin-approve-btn"
                        onClick={() => handleApprove(biz)}
                        disabled={isPending}
                      >
                        <i className="fa-solid fa-check" /> Approve
                      </button>
                      {rejectingId === biz.id ? (
                        <div className="admin-reject-form">
                          <textarea
                            className="form-control"
                            rows={2}
                            placeholder="Rejection reason (optional)..."
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                          />
                          <div className="admin-reject-btns">
                            <button className="btn-secondary" onClick={() => { setRejectingId(null); setRejectNote(""); }}>
                              Cancel
                            </button>
                            <button className="admin-reject-confirm-btn" onClick={() => handleReject(biz.id)}>
                              <i className="fa-solid fa-xmark" /> Confirm Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="admin-reject-btn"
                          onClick={() => setRejectingId(biz.id)}
                        >
                          <i className="fa-solid fa-xmark" /> Reject
                        </button>
                      )}
                    </div>
                  )}

                  {biz.slug && (
                    <a
                      href={`/business/${biz.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-view-link"
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square" /> View listing
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
