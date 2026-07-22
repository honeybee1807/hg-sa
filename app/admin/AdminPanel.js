"use client";

// this is the whole admin panel — everything you see and can click on
// after logging in at hiddengemssa.co.za/admin: the featured-gem section
// at the top, and the list of every submitted business with its approve/
// reject buttons below.
//
// it receives "businesses" and "currentFeatured" as ready-made data from
// app/admin/page.js (which fetched them from the database before this
// component ever ran) — this file is only responsible for displaying that
// data and reacting to clicks, not for the initial page load itself.

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
import { instagramUrl, facebookUrl } from "@/lib/social";

// the four tabs above the business list.
const TABS = ["pending", "approved", "rejected", "all"];

export default function AdminPanel({ businesses, currentFeatured }) {
  const router  = useRouter();
  // "isPending" here just means "we're waiting for the page to refresh
  // itself after a change" — nothing to do with a business's "pending"
  // status, it's an unrelated React tool for showing a loading state.
  const [isPending, startTransition] = useTransition();

  const [tab, setTab]                 = useState("pending"); // which tab is currently selected
  const [rejectingId, setRejectingId] = useState(null);       // which business's "reject" form is open, if any
  const [rejectNote, setRejectNote]   = useState("");         // the text typed into that reject form
  // the admin's edited version of each pending business's area, keyed by
  // business id — only populated once an admin actually types in that
  // field. falls back to the submitted value (biz.area) until then.
  const [editedAreas, setEditedAreas] = useState({});
  const [featSearch, setFeatSearch]   = useState("");         // what's typed in the "search to manually set featured gem" box
  const [searchResults, setSearchResults] = useState([]);     // matching businesses for that search
  const [searching, setSearching]     = useState(false);      // true while that search is in progress
  const [message, setMessage]         = useState(null);       // the small "Approved!" / error banner shown after an action

  // only show businesses matching the currently selected tab (or
  // everything, if the "all" tab is selected).
  const filtered = businesses.filter((b) => tab === "all" || b.status === tab);

  // shows a small message banner for 4 seconds, then hides it again.
  function flash(msg, isError = false) {
    setMessage({ text: msg, error: isError });
    setTimeout(() => setMessage(null), 4000);
  }

  // re-fetches the page's data from the server, so the list of businesses
  // (and their statuses/counts) reflects whatever change was just made.
  function refresh() {
    startTransition(() => router.refresh());
  }

  // called when the "Approve" button is clicked on a pending business. uses
  // whatever the admin has typed into the area field (falling back to the
  // originally submitted value if they didn't touch it) — see the
  // "Standardise before approving" note shown next to that field.
  async function handleApprove(biz) {
    const area = editedAreas[biz.id] ?? biz.area;
    const result = await approveBusiness(biz.id, biz.name, area, biz.category);
    if (result.success) {
      flash(`Approved — slug: ${result.slug}`);
      refresh();
    } else {
      flash(result.error, true);
    }
  }

  // called when "Confirm Reject" is clicked.
  async function handleReject(id) {
    const result = await rejectBusiness(id, rejectNote);
    if (result.success) {
      setRejectingId(null);
      setRejectNote("");
      flash("Rejected.");
      refresh();
    } else {
      flash(result.error, true);
    }
  }

  // called when "Auto-select This Week's Gem" is clicked.
  async function handleAutoSelect() {
    const result = await autoSelectFeaturedGem();
    if (result.success) {
      flash("Featured Gem auto-selected for this week!");
      refresh();
    } else {
      flash(result.error ?? "Auto-select failed.", true);
    }
  }

  // called every time a letter is typed into the "search to manually set
  // featured gem" box.
  async function handleFeatSearch(e) {
    const typedText = e.target.value;
    setFeatSearch(typedText);

    // don't bother searching until at least 2 characters have been typed —
    // searching after every single keystroke on a 1-letter query would
    // return too many irrelevant results.
    if (typedText.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const results = await searchBusinesses(typedText);
    setSearchResults(results);
    setSearching(false);
  }

  // called when a business is picked from the manual search results.
  async function handleSetFeatured(businessId) {
    const result = await setFeaturedGem(businessId);
    if (result.success) {
      setFeatSearch("");
      setSearchResults([]);
      flash("Featured Gem updated!");
      refresh();
    } else {
      flash(result.error, true);
    }
  }

  // turns a WhatsApp number typed in any common format (e.g. starting with
  // 0, or already starting with the 27 country code) into the one format
  // WhatsApp's own links need: digits only, starting with 27.
  function formatWa(raw) {
    if (!raw) return null;
    const digitsOnly = raw.replace(/\D/g, ""); // strip out spaces, dashes, brackets, "+" — anything that isn't a digit
    if (digitsOnly.startsWith("27")) return digitsOnly;
    if (digitsOnly.startsWith("0")) return "27" + digitsOnly.slice(1); // swap the leading 0 for the country code
    return "27" + digitsOnly; // no recognisable prefix — just add the country code on the front
  }

  // builds the "Contact on WhatsApp" link + pre-written message shown next
  // to a pending business, so the admin can message the owner to verify
  // details before approving.
  function buildContactUrl(biz) {
    const whatsappNumber = formatWa(biz.whatsapp);
    if (!whatsappNumber) return null;

    const message = `Hi ${biz.owner_name ?? "there"}! This is the *Hidden Gems SA* team 👋\n\nWe received your listing for *${biz.name}* and need to verify a few details before we can approve it.\n\nIs now a good time to chat?\n\n— Hidden Gems SA Team`;

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  // builds the "Notify Owner" link + pre-written congratulations message
  // shown for whoever is this week's featured business.
  function buildWaMessage(biz) {
    const message = `Congratulations ${biz.owner_name ?? ""}! 🎉\n\nYour business *${biz.name}* has been selected as Hidden Gems SA's *Featured Gem of the Week*!\n\nYour listing is live at:\n${SITE_URL}/business/${biz.slug}\n\n— Lubnah\nHidden Gems SA Team\n🌐 ${SITE_URL}\n💻 Built by Olideen Technologies — ${OLIDEEN_URL}`;
    return `https://wa.me/${biz.whatsapp}?text=${encodeURIComponent(message)}`;
  }

  // builds the downloadable square image announcing this week's featured
  // business, and saves it to the visitor's computer as a PNG file.
  //
  // there's no image template file anywhere for this — the whole picture is
  // drawn from scratch, piece by piece, using the browser's built-in
  // "canvas" drawing tool (think of it like a blank digital canvas that can
  // be told to draw shapes and text at exact x/y positions, the same way
  // you'd instruct someone over the phone: "draw a blue rectangle starting
  // 10 pixels from the left, 10 from the top..."). the image is 1080 by
  // 1080 pixels — a square, which is the safest shape for sharing on
  // WhatsApp, Instagram, and Facebook without anything getting cropped off.
  function downloadGraphic(biz) {
    const canvas  = document.createElement("canvas");
    canvas.width  = 1080;
    canvas.height = 1080;
    // "ctx" (short for "context") is the actual drawing tool — every "draw
    // a rectangle" / "draw this text" instruction below happens through it.
    const ctx = canvas.getContext("2d");

    // draws everything onto the canvas. "logoImg" is either the business's
    // real logo (already downloaded and ready to draw) or nothing, if the
    // business doesn't have one — in which case a big letter is drawn
    // instead, the same "monogram" style used elsewhere on the site.
    function draw(logoImg) {
      // background: a diagonal blue gradient covering the whole square
      const backgroundGradient = ctx.createLinearGradient(0, 0, 1080, 1080);
      backgroundGradient.addColorStop(0, "#082B66");
      backgroundGradient.addColorStop(0.55, "#0F52BA");
      backgroundGradient.addColorStop(1, "#0B3D8C");
      ctx.fillStyle = backgroundGradient;
      ctx.fillRect(0, 0, 1080, 1080); // fill the entire 1080x1080 square with it

      // a thin purple-to-blue accent stripe along the very top edge
      const topStripeGradient = ctx.createLinearGradient(0, 0, 1080, 0);
      topStripeGradient.addColorStop(0, "#9966CC");
      topStripeGradient.addColorStop(1, "#0F52BA");
      ctx.fillStyle = topStripeGradient;
      ctx.fillRect(0, 0, 1080, 12); // a slim 12-pixel-tall bar across the top

      // the pill-shaped "FEATURED GEM OF THE WEEK" tag
      ctx.fillStyle = "rgba(255,255,255,0.12)"; // faint white, so it reads as a soft badge over the background
      ctx.beginPath();
      ctx.roundRect(390, 90, 300, 48, 24); // a 300x48 rounded rectangle, positioned near the top-center
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "600 20px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✦ FEATURED GEM OF THE WEEK ✦", 540, 121); // 540 = the exact horizontal center of a 1080-wide image

      // the round logo (or monogram letter) in the middle of the image
      const logoCenterY = 220, logoRadius = 120;
      ctx.save(); // remember the current drawing settings, so they can be restored after this part
      ctx.beginPath();
      ctx.arc(540, logoCenterY + logoRadius, logoRadius, 0, Math.PI * 2); // draw a full circle (a full 360-degree arc)
      ctx.fillStyle = "#E7EFFA";
      ctx.fill();

      if (logoImg) {
        // "clip" means "only allow drawing to show up inside the circle we
        // just drew" — this is what makes a rectangular logo image appear
        // neatly cropped into a circle instead of overflowing it.
        ctx.clip();
        ctx.drawImage(logoImg, 540 - logoRadius, logoCenterY, logoRadius * 2, logoRadius * 2);
      } else {
        // no logo — draw the business name's first letter instead, the
        // same "monogram" fallback style used across the rest of the site.
        ctx.clip();
        ctx.fillStyle = "#0F52BA";
        ctx.font = `italic bold 110px Georgia, serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(biz.name[0].toUpperCase(), 540, logoCenterY + logoRadius);
      }
      ctx.restore(); // undo the "clip", so later drawing isn't stuck inside that circle too
      ctx.textBaseline = "alphabetic"; // put text alignment back to the normal default

      // the business's name, in large text below the logo
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 68px Georgia, serif`;
      ctx.textAlign = "center";
      const nameY = logoCenterY + logoRadius * 2 + 80;
      ctx.fillText(biz.name, 540, nameY);

      // the category and area, just below the name
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "36px Arial, sans-serif";
      ctx.fillText(`${biz.category}  ·  ${biz.area}, ${biz.province}`, 540, nameY + 58);

      // the owner's name, if one was given (some businesses don't have one)
      if (biz.owner_name) {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "italic 30px Georgia, serif";
        ctx.fillText(`by ${biz.owner_name}`, 540, nameY + 110);
      }

      // a thin horizontal line near the bottom, separating the business
      // details above from the site credit below
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(200, 900); // start point of the line
      ctx.lineTo(880, 900); // end point — a straight horizontal line since the y stays 900
      ctx.stroke();

      // the site's own web address, near the very bottom
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "28px Arial, sans-serif";
      ctx.fillText(SITE_URL.replace("https://", ""), 540, 946);

      // the smallest, faintest line — credit for who built the site
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "22px Arial, sans-serif";
      ctx.fillText(`Built by Olideen Technologies — olideentech.co.za`, 540, 985);

      // everything above only drew onto an invisible canvas — nothing has
      // actually been saved anywhere yet. these last few lines are what
      // turn the finished drawing into an actual PNG picture file and
      // trigger the browser to download it, by creating an invisible link
      // that points at the image and immediately "clicking" it in code.
      const downloadLink = document.createElement("a");
      downloadLink.download = `${biz.name.replace(/\s+/g, "-")}-featured-gem.png`;
      downloadLink.href = canvas.toDataURL("image/png"); // turns the canvas drawing into actual image file data
      downloadLink.click();
    }

    // before any drawing can happen, we need the business's logo file to
    // have actually finished downloading (if it has one) — drawing can't
    // start until then. if there's no logo at all, skip straight to
    // drawing, passing "null" so the monogram-letter fallback is used.
    if (biz.logo_url) {
      const logoImage = new window.Image();
      logoImage.crossOrigin = "anonymous"; // needed to be allowed to draw an image from another website onto the canvas
      logoImage.onload  = () => draw(logoImage); // once the logo has finished downloading, draw everything
      logoImage.onerror = () => draw(null);      // if the logo fails to load for any reason, still produce the graphic, just with a monogram instead
      logoImage.src = biz.logo_url; // setting this is what actually starts the download
    } else {
      draw(null);
    }
  }

  const featBiz = currentFeatured?.businesses ?? null;

  // everything from here down is just the visible page itself — the
  // header bar, the featured-gem section, and the list of businesses with
  // their tabs and buttons. it reads top to bottom in the same order
  // things appear on screen.
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
                  <p>{featBiz.category} · {featBiz.area}, {featBiz.province}</p>
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
                      <span><strong>{b.name}</strong> — {b.area}, {b.province}</span>
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
                        {biz.category === "Other" && biz.custom_category && ` (${biz.custom_category})`}
                        <span className="admin-meta-sep">·</span>
                        <i className="fa-solid fa-earth-africa" /> {biz.province}
                      </p>
                      {biz.description && <p className="admin-biz-desc">{biz.description}</p>}

                      {/* the area is editable right up until approval, since
                          it's free text typed by whoever submitted the
                          listing and often needs standardising (see the
                          hint below) — after approval there's nothing left
                          to change it for, so it's shown as plain text. */}
                      {biz.status === "pending" ? (
                        <div className="admin-area-edit">
                          <label htmlFor={`area-${biz.id}`} className="admin-area-edit-label">
                            <i className="fa-solid fa-location-dot" /> Area
                          </label>
                          <input
                            id={`area-${biz.id}`}
                            type="text"
                            className="form-control"
                            value={editedAreas[biz.id] ?? biz.area}
                            onChange={(e) => setEditedAreas((prev) => ({ ...prev, [biz.id]: e.target.value }))}
                          />
                          <span className="admin-area-hint">
                            Standardise before approving — e.g. Johannesburg not JHB, Umhlanga not Umlanga
                          </span>
                        </div>
                      ) : (
                        <p className="admin-biz-area-readonly">
                          <i className="fa-solid fa-location-dot" /> {biz.area}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="admin-biz-owner">
                    <span><i className="fa-solid fa-user" /> {biz.owner_name}</span>
                    {biz.owner_email && (
                      <a href={`mailto:${biz.owner_email}`} className="admin-owner-link">
                        <i className="fa-solid fa-envelope" /> {biz.owner_email}
                      </a>
                    )}
                    {biz.whatsapp && (
                      <a
                        href={buildContactUrl(biz)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-wa-contact-btn"
                      >
                        <i className="fa-brands fa-whatsapp" /> Contact on WhatsApp
                      </a>
                    )}
                    {instagramUrl(biz.instagram) && (
                      <a
                        href={instagramUrl(biz.instagram)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-ig-link"
                      >
                        <i className="fa-brands fa-instagram" /> Instagram
                      </a>
                    )}
                    {facebookUrl(biz.facebook) && (
                      <a
                        href={facebookUrl(biz.facebook)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-fb-link"
                      >
                        <i className="fa-brands fa-facebook" /> Facebook
                      </a>
                    )}
                  </div>

                  {/* flags whether the submitter told us this is their own
                      business or someone else's — worth checking before
                      approving, since a "someone else's" listing means the
                      actual owner hasn't necessarily agreed to it themselves. */}
                  {biz.is_own_business === false ? (
                    <div className="admin-on-behalf-note">
                      <i className="fa-solid fa-triangle-exclamation" />
                      <span>
                        Submitted on behalf of <strong>{biz.on_behalf_of_name}</strong> — reason given:
                        &ldquo;{biz.on_behalf_of_reason}&rdquo;
                      </span>
                    </div>
                  ) : (
                    <p className="admin-own-business-note">
                      <i className="fa-solid fa-circle-check" /> Submitter says this is their own business
                    </p>
                  )}

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
