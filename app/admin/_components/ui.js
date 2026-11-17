"use client";

// small building blocks shared across the redesigned admin's screens.

import { useEffect, useRef } from "react";
import Image from "next/image";

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// every date in the admin is shown in South Africa time, whatever timezone
// the server or the viewer's device happens to be in. because the zone is
// fixed, the server-rendered text always matches what the browser renders.
const SA_TZ = "Africa/Johannesburg";

function saParts(value) {
  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: SA_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

function currentSaYear() {
  return saParts(Date.now()).year;
}

// "17 Nov" (the year is added only when it isn't the current year).
export function formatDate(value) {
  if (!value) return "—";
  const p = saParts(value);
  const day = String(Number(p.day)); // "9 Nov", not "09 Nov"
  return p.year === currentSaYear() ? `${day} ${p.month}` : `${day} ${p.month} ${p.year}`;
}

// "17 Nov, 02:25".
export function formatDateTime(value) {
  if (!value) return "—";
  const p = saParts(value);
  return `${formatDate(value)}, ${p.hour}:${p.minute}`;
}

export function When({ value, time = false }) {
  if (!value) return <>—</>;
  return (
    <time dateTime={value} title={`${formatDateTime(value)} (SAST)`}>
      {time ? formatDateTime(value) : formatDate(value)}
    </time>
  );
}

// the business's logo, or its initials as a monogram when it has none.
export function BizLogo({ biz, size = 40 }) {
  const name = biz?.name ?? "?";
  if (biz?.logo_url) {
    return (
      <Image
        src={biz.logo_url}
        alt=""
        width={size}
        height={size}
        className="adm-logo"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span className="adm-monogram" style={{ width: size, height: size, fontSize: Math.max(12, size * 0.3) }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

// "Mina's Bakehouse" -> "MB"; single words use their first letter.
export function initials(name) {
  const words = (name ?? "").replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const STATUS_LABELS = { pending: "Pending", approved: "Approved", rejected: "Rejected" };

export function StatusPill({ status }) {
  return <span className={`adm-pill adm-pill--${status}`}>{STATUS_LABELS[status] ?? status}</span>;
}

// the category as it should read, with the free-text custom category
// appended for "Other" (same rule as the classic panel).
export function categoryLabel(biz) {
  if (!biz) return "";
  return biz.category === "Other" && biz.custom_category ? `Other (${biz.custom_category})` : biz.category;
}

// the traffic-light status of the current featured gem — same rules as
// getFeaturedStatus() in the classic panel, plus the expiry date.
export function getFeaturedStatus(gem) {
  if (!gem) return { tone: "not-set", label: "Not Set", countdown: null, expiry: null };

  const msRemaining = new Date(gem.featured_until).getTime() - Date.now();

  if (msRemaining <= 0) {
    const daysAgo = Math.floor(Math.abs(msRemaining) / ONE_DAY_MS);
    const countdown = daysAgo < 1 ? "Expired today" : `Expired ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`;
    return { tone: "expired", label: "Expired", countdown, expiry: `Expired ${formatDate(gem.featured_until)}` };
  }

  const daysRemaining = Math.floor(msRemaining / ONE_DAY_MS);
  const countdown = daysRemaining < 1
    ? "Expires today"
    : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`;
  return { tone: "active", label: "Active", countdown, expiry: `Expires ${formatDate(gem.featured_until)}` };
}

// "9 Nov – 16 Nov" — "to" prefers replaced_at (exactly when the next gem was
// set), falling back to featured_until for older history.
export function formatFeaturedRange(createdAt, featuredUntil, replacedAt) {
  return `${formatDate(createdAt)} – ${formatDate(replacedAt ?? featuredUntil)}`;
}

// the inline, two-step "are you sure?" delete control. never uses
// window.confirm()/alert().
export function DeleteConfirm({
  noun = "listing",
  isConfirming,
  isFeaturedActive = false,
  deleting,
  onRequestDelete,
  onCancel,
  onConfirmDelete,
}) {
  const label = noun === "post" ? "Delete Post" : "Delete Listing";
  if (!isConfirming) {
    return (
      <button type="button" className="adm-btn adm-btn--danger-ghost" onClick={onRequestDelete}>
        <i className="fa-solid fa-trash" aria-hidden="true" /> {label}
      </button>
    );
  }

  return (
    <div className="adm-delete-confirm" role="alert">
      <p>
        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> This will permanently delete this {noun} and cannot be undone. Are you sure?
      </p>
      {isFeaturedActive && (
        <p className="adm-delete-confirm-featured">
          <i className="fa-solid fa-gem" aria-hidden="true" /> Warning: This business is currently the featured Gem of the Week. Deleting it will remove it from the homepage immediately.
        </p>
      )}
      <div className="adm-btn-row">
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onCancel} disabled={deleting}>
          Cancel
        </button>
        <button type="button" className="adm-btn adm-btn--danger" onClick={onConfirmDelete} disabled={deleting}>
          <i className="fa-solid fa-trash" aria-hidden="true" /> {deleting ? "Deleting..." : "Yes, Delete Permanently"}
        </button>
      </div>
    </div>
  );
}

// a success or error message shown inside a card or drawer.
export function InlineFeedback({ feedback }) {
  if (!feedback) return null;
  return (
    <div className={`adm-banner ${feedback.error ? "adm-banner--error" : "adm-banner--ok"}`} role={feedback.error ? "alert" : "status"}>
      <i className={`fa-solid ${feedback.error ? "fa-triangle-exclamation" : "fa-circle-check"}`} aria-hidden="true" />
      <span>{feedback.text}</span>
    </div>
  );
}

export function EmptyState({ icon = "fa-inbox", title, children }) {
  return (
    <div className="adm-empty">
      <i className={`fa-solid ${icon}`} aria-hidden="true" />
      <p className="adm-empty-title">{title}</p>
      {children && <div className="adm-empty-body">{children}</div>}
    </div>
  );
}

// shared behaviour for the side drawers / full-screen sheets: Escape
// closes, focus starts on the close button, and the page behind stops
// scrolling while one is open.
export function useDrawer(onClose) {
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return closeRef;
}

// builds the activity feed ONLY from timestamps that already exist in the
// data the page fetched — nothing is stored or invented. event types with
// no timestamp of their own (approvals, rejections) are left out, and
// login/security data is never shown here.
export function buildActivity({ businesses, editRequests, currentFeatured, featuredHistory, blogPosts }) {
  const events = [];

  for (const biz of businesses) {
    if (!biz.created_at) continue;
    events.push({
      id: `biz-${biz.id}`,
      kind: "listing",
      icon: "fa-store",
      at: biz.created_at,
      title: "Listing submitted",
      subject: biz.name,
      detail: [biz.category, biz.area].filter(Boolean).join(" · "),
      status: biz.status,
      bizId: biz.id,
    });
  }

  for (const request of editRequests) {
    if (!request.created_at) continue;
    events.push({
      id: `edit-${request.id}`,
      kind: "edit",
      icon: "fa-pen-to-square",
      at: request.created_at,
      title: "Edit request submitted",
      subject: request.businesses?.name ?? "Unknown business",
      detail: changeSummary(request.proposed_changes),
      editId: request.id,
    });
  }

  for (const gem of [currentFeatured, ...featuredHistory].filter(Boolean)) {
    if (!gem.created_at) continue;
    events.push({
      id: `gem-${gem.id}`,
      kind: "featured",
      icon: "fa-gem",
      at: gem.created_at,
      title: "Featured Gem selected",
      subject: gem.businesses?.name ?? "Deleted business",
      detail: `Until ${formatDate(gem.replaced_at ?? gem.featured_until)}`,
      view: "featured",
    });
  }

  for (const post of blogPosts) {
    if (post.created_at) {
      events.push({
        id: `post-c-${post.id}`,
        kind: "blog",
        icon: "fa-feather",
        at: post.created_at,
        title: "Story created",
        subject: post.title,
        detail: post.published ? "Published" : "Draft",
        storyId: post.id,
      });
    }
    // a separate "updated" event only when it was actually edited after
    // being created (more than a minute apart).
    if (post.updated_at && post.created_at &&
        new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 60000) {
      events.push({
        id: `post-u-${post.id}`,
        kind: "blog",
        icon: "fa-pen-nib",
        at: post.updated_at,
        title: "Story updated",
        subject: post.title,
        detail: post.published ? "Published" : "Draft",
        storyId: post.id,
      });
    }
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

const FIELD_NAMES = {
  name: "name",
  category: "category",
  custom_category: "custom category",
  business_type: "business type",
  province: "province",
  area: "area",
  street_address: "street address",
  whatsapp: "WhatsApp",
  website: "website",
  instagram: "Instagram",
  facebook: "Facebook",
  description: "description",
  logo_url: "logo",
  halal: "Halal",
  halal_certificate: "Halal certificate",
  delivery_available: "delivery",
  callouts_available: "call-outs",
};

// "Changes to area and description" / "Changes to logo, area and 2 more".
export function changeSummary(proposedChanges) {
  const names = Object.keys(proposedChanges ?? {}).map((f) => FIELD_NAMES[f] ?? f);
  if (names.length === 0) return "No changes";
  if (names.length === 1) return `Changes to ${names[0]}`;
  if (names.length === 2) return `Changes to ${names[0]} and ${names[1]}`;
  if (names.length === 3) return `Changes to ${names[0]}, ${names[1]} and ${names[2]}`;
  return `Changes to ${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

export function ActivityList({ events, onOpen }) {
  return (
    <ol className="adm-activity">
      {events.map((event) => {
        const body = (
          <>
            <span className={`adm-activity-icon adm-activity-icon--${event.kind}`} aria-hidden="true">
              <i className={`fa-solid ${event.icon}`} />
            </span>
            <span className="adm-activity-body">
              <span className="adm-activity-title">{event.title}</span>
              <span className="adm-activity-meta">
                {event.subject}{event.detail && <> · {event.detail}</>}
                {event.status && <> <StatusPill status={event.status} /></>}
              </span>
              <span className="adm-activity-time"><When value={event.at} time /></span>
            </span>
          </>
        );
        return (
          <li key={event.id}>
            {onOpen ? (
              <button type="button" className="adm-activity-row" onClick={() => onOpen(event)}>{body}</button>
            ) : (
              <div className="adm-activity-row">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
