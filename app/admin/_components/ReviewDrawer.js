"use client";

// the Review drawer: everything the classic panel's business card showed,
// in a side panel on desktop and a full-screen sheet on phones. opened from
// any listings table row (or an activity item).

import { useState } from "react";
import BadgePills from "@/components/BadgePills";
import { halalCertificateLabel } from "@/lib/constants";
import { instagramUrl, facebookUrl } from "@/lib/social";
import { BizLogo, StatusPill, DeleteConfirm, InlineFeedback, categoryLabel, useDrawer, When } from "./ui";
import { buildContactUrl, buildNotifyOwnerUrl, downloadShareGraphic, formatWa } from "./shareTools";

// stored websites are normally already full URLs (see normalizeWebsiteUrl
// in the submit/edit actions); this only guards older bare entries.
function websiteHref(raw) {
  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export default function ReviewDrawer({
  biz,
  areaValue,
  onAreaChange,
  isFeaturedActive,
  onClose,
  onApprove,
  onReject,
  onDelete,
}) {
  const [rejecting, setRejecting]       = useState(false);
  const [rejectNote, setRejectNote]     = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [working, setWorking]           = useState(null); // "approve" | "reject" | "delete" | null
  const [feedback, setFeedback]         = useState(null); // { text, error }
  const closeRef = useDrawer(onClose);

  async function run(kind, fn, successText) {
    setWorking(kind);
    setFeedback(null);
    const result = await fn();
    setWorking(null);
    if (result?.success) {
      if (successText) setFeedback({ text: typeof successText === "function" ? successText(result) : successText });
    } else {
      setFeedback({ text: result?.error ?? "Something went wrong. Please try again.", error: true });
    }
    return result;
  }

  async function handleApprove() {
    await run("approve", () => onApprove(biz, areaValue),
      (result) => `Approved. ${biz.name} is now live at /business/${result.slug}. You can share it below.`);
  }

  async function handleReject() {
    const result = await run("reject", () => onReject(biz, rejectNote), "Rejected. The listing will not appear on the site.");
    if (result?.success) {
      setRejecting(false);
      setRejectNote("");
    }
  }

  async function handleDelete() {
    await run("delete", () => onDelete(biz));
  }

  const isPending  = biz.status === "pending";
  const isApproved = biz.status === "approved";
  const contactUrl = biz.whatsapp ? buildContactUrl(biz) : null;
  const igUrl      = instagramUrl(biz.instagram);
  const fbUrl      = facebookUrl(biz.facebook);
  const webUrl     = websiteHref(biz.website);
  const busy       = working !== null;

  return (
    <div className="adm-drawer-layer">
      <div className="adm-drawer-scrim" onClick={onClose} aria-hidden="true" />
      <aside className="adm-drawer" role="dialog" aria-modal="true" aria-labelledby="adm-drawer-title">
        <header className="adm-drawer-head">
          <div className="adm-drawer-head-text">
            <span className="adm-eyebrow">Review listing</span>
            <StatusPill status={biz.status} />
          </div>
          <button ref={closeRef} type="button" className="adm-icon-btn" onClick={onClose} aria-label="Close review">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </header>

        <div className="adm-drawer-body">
          <InlineFeedback feedback={feedback} />
          <div className="adm-drawer-identity">
            <BizLogo biz={biz} size={64} />
            <div>
              <h2 id="adm-drawer-title" className="adm-drawer-name">{biz.name}</h2>
              <p className="adm-drawer-sub">
                {categoryLabel(biz)}
                {biz.business_type && <> · {biz.business_type}</>}
              </p>
              <p className="adm-drawer-sub adm-drawer-sub--muted">
                Submitted <When value={biz.created_at} />
              </p>
            </div>
          </div>

          {(biz.halal || biz.delivery_available || biz.callouts_available) && (
            <div className="adm-drawer-badges">
              <BadgePills biz={biz} />
              {biz.halal && biz.halal_certificate && (
                <p className="adm-drawer-cert">
                  <i className="fa-solid fa-certificate" aria-hidden="true" /> Certified by: {halalCertificateLabel(biz.halal_certificate)}
                </p>
              )}
            </div>
          )}

          {biz.description && <p className="adm-drawer-desc">{biz.description}</p>}

          {(webUrl || igUrl || fbUrl) && (
            <div className="adm-chip-row">
              {webUrl && (
                <a href={webUrl} target="_blank" rel="noopener noreferrer" className="adm-chip">
                  <i className="fa-solid fa-globe" aria-hidden="true" /> Website
                </a>
              )}
              {igUrl && (
                <a href={igUrl} target="_blank" rel="noopener noreferrer" className="adm-chip">
                  <i className="fa-brands fa-instagram" aria-hidden="true" /> Instagram
                </a>
              )}
              {fbUrl && (
                <a href={fbUrl} target="_blank" rel="noopener noreferrer" className="adm-chip">
                  <i className="fa-brands fa-facebook" aria-hidden="true" /> Facebook
                </a>
              )}
            </div>
          )}

          <section className="adm-drawer-section">
            <h3 className="adm-drawer-section-title">Location</h3>
            {biz.street_address && (
              <p className="adm-drawer-line">
                <i className="fa-solid fa-map-pin" aria-hidden="true" /> {biz.street_address}
              </p>
            )}
            {biz.province && (
              <p className="adm-drawer-line">
                <i className="fa-solid fa-earth-africa" aria-hidden="true" /> {biz.province}
              </p>
            )}
            {isPending ? (
              <div className="adm-field">
                <label htmlFor={`adm-area-${biz.id}`} className="adm-label">Area</label>
                <input
                  id={`adm-area-${biz.id}`}
                  type="text"
                  className="adm-input"
                  value={areaValue}
                  onChange={(e) => onAreaChange(e.target.value)}
                  autoComplete="off"
                />
                <span className="adm-hint">
                  Standardise before approving, e.g. Johannesburg not JHB, Umhlanga not Umlanga
                </span>
              </div>
            ) : (
              <p className="adm-drawer-line">
                <i className="fa-solid fa-location-dot" aria-hidden="true" /> {biz.area}
              </p>
            )}
          </section>

          <section className="adm-drawer-section adm-drawer-section--private">
            <h3 className="adm-drawer-section-title">
              <i className="fa-solid fa-lock" aria-hidden="true" /> Admin only
            </h3>
            {biz.owner_name && (
              <p className="adm-drawer-line">
                <i className="fa-solid fa-user" aria-hidden="true" /> {biz.owner_name}
              </p>
            )}
            {biz.owner_email && (
              <p className="adm-drawer-line">
                <i className="fa-solid fa-envelope" aria-hidden="true" />{" "}
                <a href={`mailto:${biz.owner_email}`} className="adm-link">{biz.owner_email}</a>
              </p>
            )}
            {contactUrl && (
              <a href={contactUrl} target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn--whatsapp adm-btn--block">
                <i className="fa-brands fa-whatsapp" aria-hidden="true" /> Contact on WhatsApp
              </a>
            )}
            {biz.is_own_business === false ? (
              <div className="adm-note adm-note--warn">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                <span>
                  Submitted on behalf of <strong>{biz.on_behalf_of_name}</strong>. Reason given:
                  {" "}&ldquo;{biz.on_behalf_of_reason}&rdquo;
                </span>
              </div>
            ) : (
              <div className="adm-note adm-note--ok">
                <i className="fa-solid fa-circle-check" aria-hidden="true" />
                <span>Submitter says this is their own business</span>
              </div>
            )}
            {biz.review_note && (
              <div className="adm-note">
                <i className="fa-solid fa-note-sticky" aria-hidden="true" />
                <span>{biz.review_note}</span>
              </div>
            )}
          </section>

          {isApproved && (
            <section className="adm-drawer-section">
              <h3 className="adm-drawer-section-title">Share</h3>
              <div className="adm-btn-row adm-btn-row--wrap">
                <button type="button" className="adm-btn adm-btn--secondary" onClick={() => downloadShareGraphic(biz)}>
                  <i className="fa-solid fa-image" aria-hidden="true" /> Share Graphic
                </button>
                {formatWa(biz.whatsapp) && (
                  <a href={buildNotifyOwnerUrl(biz)} target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn--whatsapp">
                    <i className="fa-brands fa-whatsapp" aria-hidden="true" /> Notify Owner
                  </a>
                )}
                {biz.slug && (
                  <a href={`/business/${biz.slug}`} target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn--ghost">
                    <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> View listing
                  </a>
                )}
              </div>
            </section>
          )}

          {!isApproved && biz.slug && (
            <a href={`/business/${biz.slug}`} target="_blank" rel="noopener noreferrer" className="adm-link adm-drawer-view">
              <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> View listing
            </a>
          )}

          <section className="adm-drawer-danger">
            <DeleteConfirm
              isConfirming={confirmDelete}
              isFeaturedActive={isFeaturedActive}
              deleting={working === "delete"}
              onRequestDelete={() => setConfirmDelete(true)}
              onCancel={() => setConfirmDelete(false)}
              onConfirmDelete={handleDelete}
            />
          </section>
        </div>

        {isPending && !confirmDelete && (
          <footer className="adm-drawer-foot">
            {rejecting ? (
              <div className="adm-reject">
                <label htmlFor={`adm-reject-${biz.id}`} className="adm-label">Rejection reason (optional)</label>
                <textarea
                  id={`adm-reject-${biz.id}`}
                  className="adm-input"
                  rows={2}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Only visible to admins"
                />
                <div className="adm-btn-row">
                  <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { setRejecting(false); setRejectNote(""); }} disabled={busy}>
                    Cancel
                  </button>
                  <button type="button" className="adm-btn adm-btn--danger" onClick={handleReject} disabled={busy}>
                    <i className="fa-solid fa-xmark" aria-hidden="true" /> {working === "reject" ? "Rejecting..." : "Confirm Reject"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="adm-btn-row adm-btn-row--split">
                <button type="button" className="adm-btn adm-btn--reject" onClick={() => setRejecting(true)} disabled={busy}>
                  <i className="fa-solid fa-xmark" aria-hidden="true" /> Reject
                </button>
                <button type="button" className="adm-btn adm-btn--approve" onClick={handleApprove} disabled={busy}>
                  <i className={`fa-solid ${working === "approve" ? "fa-spinner fa-spin" : "fa-check"}`} aria-hidden="true" />
                  {working === "approve" ? " Approving..." : " Approve"}
                </button>
              </div>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}
