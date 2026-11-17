"use client";

// the redesigned admin at hiddengemssa.co.za/admin — the sidebar/topbar
// shell and every screen inside it. it receives the already-fetched data
// from app/admin/page.js (which only renders this after the login check
// passes) and calls the exact same server actions as the classic panel,
// with the same arguments. every one of those actions still does its own
// isAdminAuthed() check on the server.
//
// ROUTING: everything lives at the single /admin route, with the current
// screen kept in the address bar, e.g.
//   /admin?view=listings&status=approved   a listings tab
//   /admin?view=listings&review=123        ...with the Review drawer open
//   /admin?view=edits&compare=45           an edit request's comparison
//   /admin?view=blog&story=new             the story editor
// so every screen can be bookmarked or linked, and the browser's back
// button steps back through them (closing an open drawer first). moving
// between screens only changes the address — the data isn't re-fetched.
//
// after an action succeeds, the change shows on screen straight away
// (counts, tables, the open drawer) and the page data is then re-fetched
// in the background with router.refresh(), as the classic panel does.

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
// named imports only — the actions the classic panel uses (minus its
// search box's searchBusinesses, which the new Featured Gem list doesn't
// need), so nothing else from that "use server" file is ever referenced
// from the browser.
import {
  logoutAdmin,
  approveBusiness,
  rejectBusiness,
  deleteBusiness,
  setFeaturedGem,
  autoSelectFeaturedGem,
  approveEditRequest,
  rejectEditRequest,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} from "../actions";
import { buildActivity, getFeaturedStatus } from "./ui";
import ReviewDrawer from "./ReviewDrawer";
import OverviewView from "./OverviewView";
import ListingsView from "./ListingsView";
import EditRequestsView, { CompareDrawer } from "./EditRequestsView";
import FeaturedView from "./FeaturedView";
import BlogView from "./BlogView";
import ActivityView from "./ActivityView";
import "../admin.css";

const REAL_ACTIONS = {
  logoutAdmin,
  approveBusiness,
  rejectBusiness,
  deleteBusiness,
  setFeaturedGem,
  autoSelectFeaturedGem,
  approveEditRequest,
  rejectEditRequest,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
};

const VIEWS = {
  overview: { label: "Overview",          icon: "fa-table-cells-large" },
  listings: { label: "Business listings", icon: "fa-clipboard-list" },
  edits:    { label: "Edit requests",     icon: "fa-pen-to-square" },
  featured: { label: "Featured Gem",      icon: "fa-gem" },
  blog:     { label: "Blog & stories",    icon: "fa-feather" },
  activity: { label: "Activity",          icon: "fa-wave-square" },
};

const PAGE_INTRO = {
  overview: { title: <>A little care. <em>A lot of local.</em></>,   sub: "Keep your directory useful, current, and ready for its next discovery." },
  listings: { title: <>Business <em>listings</em></>,                 sub: "A clear queue. Thoughtful checks. Every local business deserves a proper look." },
  edits:    { title: <>Change, <em>with a little care.</em></>,       sub: "Review owner updates before they replace the live public listing." },
  featured: { title: <>Give a local business <em>its moment.</em></>, sub: "A thoughtful spotlight, with the same familiar Hidden Gems identity." },
  blog:     { title: <>Stories from <em>your community.</em></>,      sub: "Draft, polish, and manage your blog content in one calm workspace." },
  activity: { title: <>A clear view of <em>what changed.</em></>,     sub: "An activity trail for your workspace, not your security audit log." },
};

const STATUSES  = ["pending", "approved", "rejected", "all"];
const BLOG_TABS = ["all", "drafts", "published"];

// the current address-bar parameters as a plain object.
function currentParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

// writes a new address without reloading anything. "overlay" marks the
// entry as one that opened a drawer/editor, so closing it can simply step
// back in history (and the phone's back gesture closes it too).
function writeUrl(params, { push = true, overlay = false } = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  }
  const query = qs.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
  if (push) window.history.pushState(overlay ? { admOverlay: true } : null, "", url);
  else window.history.replaceState(null, "", url);
}

export default function AdminApp({ businesses, currentFeatured, featuredHistory, editRequests, blogPosts, actions = REAL_ACTIONS }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [refreshing, startTransition] = useTransition();

  // everything about "where am I" comes from the address bar.
  const viewParam = searchParams.get("view");
  const view      = VIEWS[viewParam] ? viewParam : "overview";
  const status    = STATUSES.includes(searchParams.get("status")) ? searchParams.get("status") : "pending";
  const blogTab   = BLOG_TABS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "all";
  const reviewId  = searchParams.get("review");
  const compareId = searchParams.get("compare");
  const story     = view === "blog" ? searchParams.get("story") : null;

  const [navOpen, setNavOpen]             = useState(false);
  const [menuOpen, setMenuOpen]           = useState(false);
  const [toasts, setToasts]               = useState([]);
  const [editedAreas, setEditedAreas]     = useState({});
  // local, immediate reflections of successful actions, layered over the
  // server data until the background refresh brings the same values back.
  const [overrides, setOverrides]         = useState({});
  const [removedBizIds, setRemovedBizIds] = useState([]);
  const [resolvedEdits, setResolvedEdits] = useState({}); // request id -> "approved" | "rejected"
  const toastId = useRef(0);

  const refresh = useCallback(() => startTransition(() => router.refresh()), [router]);

  const notify = useCallback((text, isError = false) => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((prev) => [...prev, { id, text, isError }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), isError ? 7000 : 4500);
  }, []);

  const allBusinesses = useMemo(
    () => businesses
      .filter((b) => !removedBizIds.includes(b.id))
      .map((b) => (overrides[b.id] ? { ...b, ...overrides[b.id] } : b)),
    [businesses, overrides, removedBizIds],
  );
  const businessesById = useMemo(
    () => Object.fromEntries(allBusinesses.map((b) => [b.id, b])),
    [allBusinesses],
  );
  // requests whose business still exists; "open" ones haven't been decided
  // in this session yet.
  const liveEditRequests = useMemo(
    () => editRequests.filter((r) => !removedBizIds.includes(r.business_id)),
    [editRequests, removedBizIds],
  );
  const openEditRequests = useMemo(
    () => liveEditRequests.filter((r) => !resolvedEdits[r.id]),
    [liveEditRequests, resolvedEdits],
  );

  const pending = allBusinesses.filter((b) => b.status === "pending");
  const counts = {
    pending: pending.length,
    approved: allBusinesses.filter((b) => b.status === "approved").length,
    edits: openEditRequests.length,
    drafts: blogPosts.filter((p) => !p.published).length,
  };

  const featBiz = currentFeatured?.businesses ?? null;
  const featuredStatus = getFeaturedStatus(currentFeatured);
  const featDescription = featBiz ? businessesById[featBiz.id]?.description : null;
  const isFeaturedActive = (bizId) => !!bizId && featBiz?.id === bizId && featuredStatus.tone === "active";

  const events = useMemo(
    () => buildActivity({
      businesses: allBusinesses,
      editRequests: openEditRequests,
      currentFeatured,
      featuredHistory,
      blogPosts,
    }),
    [allBusinesses, openEditRequests, currentFeatured, featuredHistory, blogPosts],
  );

  const drawerBiz = reviewId ? allBusinesses.find((b) => String(b.id) === reviewId) ?? null : null;
  const compareRequest = compareId ? liveEditRequests.find((r) => String(r.id) === compareId) ?? null : null;

  // ── navigation ──

  function navigate(nextView, extra = {}) {
    writeUrl({ view: nextView === "overview" ? undefined : nextView, ...extra });
    setNavOpen(false);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }

  function openOverlay(params) {
    writeUrl({ ...currentParams(), ...params }, { overlay: true });
  }

  // closes a drawer/editor: steps back if opening it added a history
  // entry, otherwise (e.g. it was opened from a shared link) just drops
  // the parameter.
  const closeOverlay = useCallback((key) => {
    if (window.history.state?.admOverlay) {
      window.history.back();
    } else {
      const params = currentParams();
      delete params[key];
      writeUrl(params, { push: false });
    }
  }, []);

  const closeReview  = useCallback(() => closeOverlay("review"), [closeOverlay]);
  const closeCompare = useCallback(() => closeOverlay("compare"), [closeOverlay]);
  const closeStory   = useCallback(() => closeOverlay("story"), [closeOverlay]);

  function openReview(id) {
    openOverlay({ review: id });
  }

  function openActivity(event) {
    if (event.bizId) openOverlay({ review: event.bizId });
    else if (event.editId) writeUrl({ view: "edits", compare: event.editId }, { overlay: true });
    else if (event.storyId) writeUrl({ view: "blog", story: event.storyId }, { overlay: true });
    else if (event.view) navigate(event.view);
  }

  // ── business actions (same calls and arguments as the classic panel) ──

  async function handleApprove(biz, area) {
    const result = await actions.approveBusiness(biz.id, biz.name, area, biz.category);
    if (result.success) {
      setOverrides((prev) => ({ ...prev, [biz.id]: { ...prev[biz.id], status: "approved", area, slug: result.slug, review_note: null } }));
      notify(`Approved — slug: ${result.slug}`);
      refresh();
    }
    return result;
  }

  async function handleReject(biz, note) {
    const result = await actions.rejectBusiness(biz.id, note);
    if (result.success) {
      setOverrides((prev) => ({ ...prev, [biz.id]: { ...prev[biz.id], status: "rejected", review_note: note || null } }));
      notify("Rejected.");
      refresh();
    }
    return result;
  }

  async function handleDelete(biz) {
    const result = await actions.deleteBusiness(biz.id);
    if (result.success) {
      closeReview();
      setRemovedBizIds((prev) => [...prev, biz.id]);
      notify("Listing deleted successfully.");
      refresh();
    }
    return result;
  }

  // ── edit request outcomes ──

  function handleEditApproved(request) {
    setResolvedEdits((prev) => ({ ...prev, [request.id]: "approved" }));
    setOverrides((prev) => ({ ...prev, [request.business_id]: { ...prev[request.business_id], ...request.proposed_changes } }));
    notify("Changes approved and applied to the listing.");
    refresh();
  }

  function handleEditRejected(request) {
    setResolvedEdits((prev) => ({ ...prev, [request.id]: "rejected" }));
    notify("Edit request rejected.");
    refresh();
  }

  function handleEditBizDeleted(biz) {
    closeCompare();
    setRemovedBizIds((prev) => [...prev, biz.id]);
    notify("Listing deleted successfully.");
    refresh();
  }

  async function handleLogout() {
    setMenuOpen(false);
    await actions.logoutAdmin();
    router.refresh();
  }

  const intro = PAGE_INTRO[view];

  return (
    <div className={`adm-root ${navOpen ? "is-nav-open" : ""}`}>
      {/* ── sidebar ── */}
      <aside className="adm-sidebar" id="adm-sidebar" aria-label="Admin navigation">
        <div className="adm-sidebar-top">
          <Link href="/" className="adm-brand" aria-label="Hidden Gems SA home">
            <Image src="/HG_Logo.png" alt="Hidden Gems SA" width={180} height={78} style={{ width: "100%", height: "auto" }} />
          </Link>
          <button type="button" className="adm-icon-btn adm-icon-btn--dark adm-only-mobile" onClick={() => setNavOpen(false)} aria-label="Close menu">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
        <p className="adm-sidebar-label">Directory workspace</p>
        <nav className="adm-nav">
          {["overview", "listings", "edits"].map((id) => (
            <NavItem
              key={id}
              id={id}
              active={view === id}
              onClick={() => navigate(id, id === "listings" ? { status: "pending" } : {})}
              badge={id === "listings" ? counts.pending : id === "edits" ? counts.edits : null}
            />
          ))}
          <hr className="adm-nav-sep" />
          {["featured", "blog", "activity"].map((id) => (
            <NavItem key={id} id={id} active={view === id} onClick={() => navigate(id)} />
          ))}
        </nav>
        <a href="/" target="_blank" rel="noopener noreferrer" className="adm-sidebar-site">
          View website <span aria-hidden="true">↗</span>
        </a>
      </aside>
      <div className="adm-nav-scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />

      {/* ── main column ── */}
      <div className="adm-main">
        <header className="adm-topbar">
          <button
            type="button"
            className="adm-icon-btn adm-icon-btn--dark adm-menu-btn"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            aria-controls="adm-sidebar"
            aria-expanded={navOpen}
          >
            <i className="fa-solid fa-bars" aria-hidden="true" />
            {counts.pending > 0 && <span className="adm-menu-dot" aria-hidden="true" />}
          </button>
          <nav className="adm-crumbs" aria-label="Breadcrumb">
            <span className="adm-crumbs-root">Workspace</span>
            <span className="adm-crumbs-sep" aria-hidden="true">/</span>
            <span aria-current="page">{VIEWS[view].label}</span>
          </nav>
          <div className="adm-topbar-right">
            {refreshing && <i className="fa-solid fa-spinner fa-spin adm-topbar-spin" aria-label="Updating" />}
            <a href="/" target="_blank" rel="noopener noreferrer" className="adm-topbar-link" aria-label="Public site (opens in a new tab)">
              <span className="adm-hide-mobile">Public site</span> <span aria-hidden="true">↗</span>
            </a>
            <div className="adm-user">
              <button
                type="button"
                className="adm-avatar"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
              >
                HG
              </button>
              {menuOpen && (
                <>
                  <div className="adm-menu-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                  <div className="adm-user-menu" role="menu">
                    <button type="button" className="adm-user-menu-item" role="menuitem" onClick={handleLogout}>
                      <i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> Logout
                    </button>
                    <a href="/admin/classic" className="adm-user-menu-item" role="menuitem">
                      <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> Classic admin
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="adm-content">
          {!story && (
            <div className="adm-intro">
              <div>
                <p className="adm-eyebrow">Hidden Gems SA / Workspace</p>
                <h1 className="adm-h1">{intro.title}</h1>
                <p className="adm-intro-sub">{intro.sub}</p>
              </div>
              {view === "overview" && (
                <a href="/" target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn--soft adm-hide-mobile">
                  View website <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          )}

          {view === "overview" && (
            <OverviewView
              counts={counts}
              pending={pending}
              currentFeatured={currentFeatured}
              featBiz={featBiz}
              featDescription={featDescription}
              featuredStatus={featuredStatus}
              events={events}
              onNavigate={navigate}
              onReview={openReview}
              onOpenActivity={openActivity}
            />
          )}
          {view === "listings" && (
            <ListingsView
              businesses={allBusinesses}
              status={status}
              onStatusChange={(next) => writeUrl({ view: "listings", status: next }, { push: false })}
              onReview={openReview}
            />
          )}
          {view === "edits" && (
            <EditRequestsView
              editRequests={openEditRequests}
              businessesById={businessesById}
              onCompare={(id) => openOverlay({ compare: id })}
            />
          )}
          {view === "featured" && (
            <FeaturedView
              businesses={allBusinesses}
              currentFeatured={currentFeatured}
              featuredHistory={featuredHistory}
              featuredStatus={featuredStatus}
              description={featDescription}
              actions={actions}
              notify={notify}
              refresh={refresh}
              refreshing={refreshing}
            />
          )}
          {view === "blog" && (
            <BlogView
              blogPosts={blogPosts}
              tab={blogTab}
              onTabChange={(next) => writeUrl({ view: "blog", tab: next === "all" ? undefined : next }, { push: false })}
              story={story}
              onOpenStory={(id) => { openOverlay({ story: id }); window.scrollTo({ top: 0 }); }}
              onCloseStory={closeStory}
              actions={actions}
              notify={notify}
              refresh={refresh}
            />
          )}
          {view === "activity" && (
            <ActivityView events={events} onOpen={openActivity} />
          )}
        </div>
      </div>

      {drawerBiz && (
        <ReviewDrawer
          key={drawerBiz.id}
          biz={drawerBiz}
          areaValue={editedAreas[drawerBiz.id] ?? drawerBiz.area ?? ""}
          onAreaChange={(value) => setEditedAreas((prev) => ({ ...prev, [drawerBiz.id]: value }))}
          isFeaturedActive={isFeaturedActive(drawerBiz.id)}
          onClose={closeReview}
          onApprove={handleApprove}
          onReject={handleReject}
          onDelete={handleDelete}
        />
      )}

      {compareRequest && (
        <CompareDrawer
          key={compareRequest.id}
          request={compareRequest}
          current={{ ...(businessesById[compareRequest.business_id] ?? {}), ...(compareRequest.businesses ?? {}) }}
          resolved={resolvedEdits[compareRequest.id] ?? null}
          actions={actions}
          isFeaturedActive={isFeaturedActive(compareRequest.business_id)}
          onClose={closeCompare}
          onApproved={handleEditApproved}
          onRejected={handleEditRejected}
          onDeleted={handleEditBizDeleted}
        />
      )}

      <div className="adm-toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`adm-toast ${toast.isError ? "adm-toast--error" : ""}`} role={toast.isError ? "alert" : "status"}>
            <i className={`fa-solid ${toast.isError ? "fa-triangle-exclamation" : "fa-circle-check"}`} aria-hidden="true" />
            <span>{toast.text}</span>
            <button type="button" className="adm-toast-close" onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} aria-label="Dismiss">
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NavItem({ id, active, onClick, badge = null }) {
  return (
    <button type="button" className={`adm-nav-item ${active ? "is-active" : ""}`} onClick={onClick} aria-current={active ? "page" : undefined}>
      <i className={`fa-solid ${VIEWS[id].icon}`} aria-hidden="true" />
      <span className="adm-nav-label">{VIEWS[id].label}</span>
      {badge !== null && badge > 0 && <span className="adm-nav-badge">{badge}</span>}
    </button>
  );
}
