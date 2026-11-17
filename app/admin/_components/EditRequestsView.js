"use client";

// "Edit requests": a card per pending owner edit, and the "Compare
// changes" drawer showing current vs proposed for each changed field
// (logo changes as images), wired to the existing approveEditRequest /
// rejectEditRequest / deleteBusiness actions — the same three things the
// classic panel's edit cards offer.

import { useState } from "react";
import Image from "next/image";
import { BizLogo, DeleteConfirm, EmptyState, InlineFeedback, When, changeSummary, useDrawer } from "./ui";

const FIELD_LABELS = {
  name: "Business name",
  category: "Category",
  custom_category: "Custom category",
  business_type: "Business type",
  province: "Province",
  area: "Area",
  street_address: "Street address",
  whatsapp: "WhatsApp",
  website: "Website",
  instagram: "Instagram",
  facebook: "Facebook",
  description: "Description",
  logo_url: "Logo",
  halal: "Halal",
  halal_certificate: "Halal certificate",
  delivery_available: "Delivery",
  callouts_available: "Call-Outs",
};

function FieldValue({ field, value }) {
  if (value === null || value === undefined || value === "") {
    return <span className="adm-compare-empty">{field === "logo_url" ? "No logo" : "Empty"}</span>;
  }
  if (field === "logo_url") {
    return <Image src={value} alt="" width={72} height={72} className="adm-logo adm-compare-logo" />;
  }
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  return <>{String(value)}</>;
}

export function CompareDrawer({ request, current, resolved, actions, isFeaturedActive, onClose, onApproved, onRejected, onDeleted }) {
  const [rejecting, setRejecting]   = useState(false);
  const [note, setNote]             = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [working, setWorking]       = useState(null);
  const [feedback, setFeedback]     = useState(null);
  const closeRef = useDrawer(onClose);

  const biz = current;
  const fields = Object.keys(request.proposed_changes ?? {});
  const busy = working !== null;

  async function run(kind, fn, onSuccess, successText) {
    setWorking(kind);
    setFeedback(null);
    const result = await fn();
    setWorking(null);
    if (result.success) {
      if (successText) setFeedback({ text: successText });
      onSuccess();
    } else {
      setFeedback({ text: result.error ?? "That didn't work. Please try again.", error: true });
    }
  }

  return (
    <div className="adm-drawer-layer">
      <div className="adm-drawer-scrim" onClick={onClose} aria-hidden="true" />
      <aside className="adm-drawer adm-drawer--wide" role="dialog" aria-modal="true" aria-labelledby="adm-compare-title">
        <header className="adm-drawer-head">
          <div className="adm-drawer-head-text">
            <span className="adm-eyebrow">Compare changes</span>
            <span className={`adm-pill adm-pill--${resolved ?? "pending"}`}>
              {resolved === "approved" ? "Approved" : resolved === "rejected" ? "Rejected" : "Pending"}
            </span>
          </div>
          <button ref={closeRef} type="button" className="adm-icon-btn" onClick={onClose} aria-label="Close comparison">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </header>

        <div className="adm-drawer-body">
          <InlineFeedback feedback={feedback} />

          <div className="adm-drawer-identity">
            <BizLogo biz={biz} size={56} />
            <div>
              <h2 id="adm-compare-title" className="adm-drawer-name">{biz?.name ?? "Unknown business"}</h2>
              <p className="adm-drawer-sub adm-drawer-sub--muted">
                Requested <When value={request.created_at} time /> · {changeSummary(request.proposed_changes)}
              </p>
            </div>
          </div>

          <div className="adm-diff">
            {fields.map((field) => (
              <section key={field} className="adm-diff-field">
                <h3 className="adm-drawer-section-title">{FIELD_LABELS[field] ?? field}</h3>
                <div className="adm-diff-cols">
                  <div className="adm-diff-old">
                    <span className="adm-diff-tag">Current</span>
                    <div className="adm-diff-value"><FieldValue field={field} value={biz?.[field]} /></div>
                  </div>
                  <div className="adm-diff-new">
                    <span className="adm-diff-tag">Proposed</span>
                    <div className="adm-diff-value"><FieldValue field={field} value={request.proposed_changes[field]} /></div>
                  </div>
                </div>
              </section>
            ))}
          </div>

          {biz?.slug && (
            <a href={`/business/${biz.slug}`} target="_blank" rel="noopener noreferrer" className="adm-link adm-drawer-view">
              <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> View the live listing
            </a>
          )}

          {!resolved && biz?.id && (
            <section className="adm-drawer-danger">
              <DeleteConfirm
                isConfirming={confirmDelete}
                isFeaturedActive={isFeaturedActive}
                deleting={working === "delete"}
                onRequestDelete={() => setConfirmDelete(true)}
                onCancel={() => setConfirmDelete(false)}
                onConfirmDelete={() => run("delete", () => actions.deleteBusiness(biz.id), () => onDeleted(biz))}
              />
            </section>
          )}
        </div>

        {resolved ? (
          <footer className="adm-drawer-foot">
            <button type="button" className="adm-btn adm-btn--ghost adm-btn--block" onClick={onClose}>
              Back to edit requests
            </button>
          </footer>
        ) : !confirmDelete && (
          <footer className="adm-drawer-foot">
            {rejecting ? (
              <div className="adm-reject">
                <label htmlFor={`adm-edit-reject-${request.id}`} className="adm-label">Rejection reason (optional)</label>
                <textarea
                  id={`adm-edit-reject-${request.id}`}
                  className="adm-input"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Only visible to admins"
                />
                <div className="adm-btn-row">
                  <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { setRejecting(false); setNote(""); }} disabled={busy}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn--danger"
                    disabled={busy}
                    onClick={() => run("reject", () => actions.rejectEditRequest(request.id, note), () => onRejected(request),
                      "Edit request rejected. The live listing is unchanged.")}
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true" /> {working === "reject" ? "Rejecting..." : "Confirm Reject"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="adm-btn-row adm-btn-row--split">
                <button type="button" className="adm-btn adm-btn--reject" onClick={() => setRejecting(true)} disabled={busy}>
                  <i className="fa-solid fa-xmark" aria-hidden="true" /> Reject
                </button>
                <button
                  type="button"
                  className="adm-btn adm-btn--approve"
                  disabled={busy}
                  onClick={() => run("approve", () => actions.approveEditRequest(request.id), () => onApproved(request),
                    "Changes approved and applied to the live listing.")}
                >
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

export default function EditRequestsView({ editRequests, businessesById, onCompare }) {
  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <div>
          <h2 className="adm-card-title">Edit requests</h2>
          <p className="adm-card-sub">Owners asked for these changes. Nothing changes on the site until you approve.</p>
        </div>
        <span className="adm-pill adm-pill--pending adm-pill--lg">{editRequests.length} awaiting review</span>
      </div>

      {editRequests.length === 0 ? (
        <EmptyState icon="fa-pen-to-square" title="No edit requests waiting.">
          When an owner submits changes to their listing, they&apos;ll appear here for review.
        </EmptyState>
      ) : (
        <ul className="adm-request-list">
          {editRequests.map((request) => {
            const biz = { ...(businessesById[request.business_id] ?? {}), ...(request.businesses ?? {}) };
            return (
              <li key={request.id} className="adm-request">
                <BizLogo biz={biz} size={44} />
                <div className="adm-request-text">
                  <span className="adm-request-name">{biz.name ?? "Unknown business"}</span>
                  <span className="adm-muted">Requested <When value={request.created_at} time /></span>
                  <span className="adm-request-summary">{changeSummary(request.proposed_changes)}</span>
                </div>
                <span className="adm-pill adm-pill--pending adm-request-pill">Pending</span>
                <button type="button" className="adm-btn adm-btn--sm adm-btn--review adm-request-btn" onClick={() => onCompare(request.id)}>
                  Compare changes <span aria-hidden="true">→</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
