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
  deleteBusiness,
  setFeaturedGem,
  autoSelectFeaturedGem,
  searchBusinesses,
  approveEditRequest,
  rejectEditRequest,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} from "./actions";
import { SITE_URL, OLIDEEN_URL, CATEGORIES } from "@/lib/constants";
import { instagramUrl, facebookUrl } from "@/lib/social";
import BadgePills from "@/components/BadgePills";

// the six tabs above the business list. "edit-requests" and "blog" are
// each handled separately from the other four everywhere below (they list
// rows from a different table entirely — business_edit_requests and
// blog_posts, not businesses), so they carry their own label here rather
// than being auto-capitalised from their id the way the status tabs are.
const TABS = [
  { id: "pending",       label: "Pending" },
  { id: "approved",      label: "Approved" },
  { id: "rejected",      label: "Rejected" },
  { id: "all",           label: "All" },
  { id: "edit-requests", label: "Edit Requests" },
  { id: "blog",          label: "Blog" },
];

// how each proposed-change field name (a raw businesses column name) should
// read in the admin's side-by-side comparison card — see the "Edit
// Requests" tab further down.
const EDIT_FIELD_LABELS = {
  name: "Business Name",
  category: "Category",
  custom_category: "Custom Category",
  business_type: "Business Type",
  province: "Province",
  area: "Area",
  street_address: "Street Address",
  whatsapp: "WhatsApp",
  website: "Website",
  instagram: "Instagram",
  facebook: "Facebook",
  description: "Description",
};

// a null/empty field reads as an actual dash in the comparison card,
// rather than a blank space that could be mistaken for a loading glitch.
function formatEditValue(value) {
  return value === null || value === undefined || value === "" ? "—" : value;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// works out the traffic-light status shown for the currently-featured gem
// (see the "Currently Featured Gem" card below): green "active" while
// featured_until is still in the future, red "expired" once it's passed,
// or grey "not-set" if there's no featured_gem row at all yet. also builds
// the matching countdown line shown under the business's name.
function getFeaturedStatus(gem) {
  if (!gem) return { tone: "not-set", label: "Not Set", countdown: null };

  const msRemaining = new Date(gem.featured_until).getTime() - Date.now();

  if (msRemaining <= 0) {
    const daysAgo = Math.floor(Math.abs(msRemaining) / ONE_DAY_MS);
    const countdown = daysAgo < 1 ? "Expired today" : `Expired ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`;
    return { tone: "expired", label: "Expired", countdown };
  }

  const daysRemaining = Math.floor(msRemaining / ONE_DAY_MS);
  const countdown = daysRemaining < 1
    ? "Expires today"
    : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`;
  return { tone: "active", label: "Active", countdown };
}

// the "featured from ... to ..." line shown on each row of the "Recent
// History" list. "to" prefers replaced_at — exactly when the *next* gem
// was set, see setFeaturedGemInternal in app/admin/actions.js — falling
// back to the row's own featured_until for any history predating that
// column being added, where replaced_at will be null forever.
function formatFeaturedRange(createdAt, featuredUntil, replacedAt) {
  const from = new Date(createdAt).toLocaleDateString("en-ZA");
  const to = new Date(replacedAt ?? featuredUntil).toLocaleDateString("en-ZA");
  return `Featured from ${from} to ${to}`;
}

// the "Delete Listing" button plus its inline confirmation state, shared by
// every card type (pending/approved/rejected businesses and edit requests)
// so all four stay in sync rather than drifting into slightly different
// copies. never uses window.confirm()/alert() — the confirmation lives
// entirely in the card itself, see Change 2 in the task this was built for.
function DeleteControls({ isConfirming, isFeaturedActive, deleting, onRequestDelete, onCancel, onConfirmDelete }) {
  if (!isConfirming) {
    return (
      <div className="admin-delete-zone">
        <button type="button" className="admin-delete-btn" onClick={onRequestDelete}>
          <i className="fa-solid fa-trash" /> Delete Listing
        </button>
      </div>
    );
  }

  return (
    <div className="admin-delete-confirm">
      <p className="admin-delete-warning">
        <i className="fa-solid fa-triangle-exclamation" /> This will permanently delete this listing and cannot be undone. Are you sure?
      </p>
      {isFeaturedActive && (
        <p className="admin-delete-warning admin-delete-warning--featured">
          <i className="fa-solid fa-gem" /> Warning: This business is currently the featured Gem of the Week. Deleting it will remove it from the homepage immediately.
        </p>
      )}
      <div className="admin-delete-confirm-btns">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={deleting}>
          Cancel
        </button>
        <button type="button" className="admin-delete-confirm-btn" onClick={onConfirmDelete} disabled={deleting}>
          <i className="fa-solid fa-trash" /> {deleting ? "Deleting..." : "Yes, Delete Permanently"}
        </button>
      </div>
    </div>
  );
}

// the same inline "are you sure?" delete UX as DeleteControls above (same
// CSS classes, same no-window.confirm() approach) but with its own wording
// ("Post" rather than "Listing") — DeleteControls' copy is hardcoded to
// businesses, not generic, so this is a separate small component rather
// than a shared one, to avoid changing what DeleteControls itself says.
function BlogDeleteControls({ isConfirming, deleting, onRequestDelete, onCancel, onConfirmDelete }) {
  if (!isConfirming) {
    return (
      <div className="admin-delete-zone">
        <button type="button" className="admin-delete-btn" onClick={onRequestDelete}>
          <i className="fa-solid fa-trash" /> Delete Post
        </button>
      </div>
    );
  }

  return (
    <div className="admin-delete-confirm">
      <p className="admin-delete-warning">
        <i className="fa-solid fa-triangle-exclamation" /> This will permanently delete this post and cannot be undone. Are you sure?
      </p>
      <div className="admin-delete-confirm-btns">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={deleting}>
          Cancel
        </button>
        <button type="button" className="admin-delete-confirm-btn" onClick={onConfirmDelete} disabled={deleting}>
          <i className="fa-solid fa-trash" /> {deleting ? "Deleting..." : "Yes, Delete Permanently"}
        </button>
      </div>
    </div>
  );
}

// turns a blog post title into its web-address-friendly slug, live as the
// admin types — the same cleanup rules as generateSlug() in
// app/admin/actions.js (minus the "combine with area" step, since a blog
// post's slug comes from its title alone). the server re-applies its own
// version of this before saving (cleanBlogSlug() in actions.js), so this
// copy is just for the live preview in the field below.
function slugifyTitle(title) {
  let cleaned = title.toLowerCase();
  cleaned = cleaned.normalize("NFD");
  cleaned = cleaned.replace(/[̀-ͯ]/g, "");
  cleaned = cleaned.replace(/[^a-z0-9\s-]/g, "");
  cleaned = cleaned.replace(/\s+/g, "-");
  cleaned = cleaned.replace(/-+/g, "-");
  cleaned = cleaned.replace(/^-|-$/g, "");
  return cleaned;
}

// the "Blog" tab's post editor — its own component (like DeleteControls
// above) since it owns a good amount of local form state that has no
// reason to live on AdminPanel itself. handles both creating a new post
// (post is null) and editing an existing one.
function BlogEditorForm({ post, existingSlugs, onSaved, onCancel }) {
  const [title, setTitle]     = useState(post?.title ?? "");
  const [slug, setSlug]       = useState(post?.slug ?? "");
  // once editing an already-saved post, typing in the title should never
  // silently rewrite its slug out from under it — only a brand new post
  // (or manually clearing/retyping the slug field) does that.
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [category, setCategory] = useState(post?.category ?? "");
  const [area, setArea]       = useState(post?.area ?? "");
  const [published, setPublished] = useState(post?.published ?? false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving]   = useState(false);

  function handleTitleChange(e) {
    const value = e.target.value;
    setTitle(value);
    if (!slugTouched) setSlug(slugifyTitle(value));
  }

  function handleSlugChange(e) {
    setSlugTouched(true);
    setSlug(e.target.value);
  }

  function validate() {
    const errors = {};
    if (!title.trim()) errors.title = "Title is required.";
    if (!content.trim()) errors.content = "Content is required.";

    const cleanSlug = slugifyTitle(slug);
    if (!cleanSlug) {
      errors.slug = "Slug is required.";
    } else if (existingSlugs.some((existing) => existing.slug === cleanSlug && existing.id !== post?.id)) {
      errors.slug = "This slug is already used by another post.";
    }
    return errors;
  }

  async function handleSave() {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    const payload = {
      title,
      slug: slugifyTitle(slug),
      excerpt,
      content,
      category: category || null,
      area,
      published,
    };
    const result = post
      ? await updateBlogPost(post.id, payload)
      : await createBlogPost(payload);
    setSaving(false);

    if (result.success) {
      onSaved();
    } else {
      setFieldErrors((prev) => ({ ...prev, save: result.error }));
    }
  }

  return (
    <div className="admin-blog-editor">
      <div className="form-group">
        <label htmlFor="blog-title">Title <span className="required">*</span></label>
        <input
          id="blog-title"
          className="form-control"
          type="text"
          value={title}
          onChange={handleTitleChange}
        />
        {fieldErrors.title && <span className="field-error">{fieldErrors.title}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="blog-slug">Slug <span className="required">*</span></label>
        <input
          id="blog-slug"
          className="form-control"
          type="text"
          value={slug}
          onChange={handleSlugChange}
        />
        {fieldErrors.slug && <span className="field-error">{fieldErrors.slug}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="blog-excerpt">Excerpt <span className="optional">(optional)</span></label>
        <textarea
          id="blog-excerpt"
          className="form-control"
          rows={2}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="blog-content">Content <span className="required">*</span></label>
        <textarea
          id="blog-content"
          className="form-control"
          rows={12}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Separate paragraphs with a blank line — they'll each render as their own paragraph."
        />
        {fieldErrors.content && <span className="field-error">{fieldErrors.content}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="blog-category">Category <span className="optional">(optional)</span></label>
          <select
            id="blog-category"
            className="form-control"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">None</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="blog-area">Area <span className="optional">(optional)</span></label>
          <input
            id="blog-area"
            className="form-control"
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Ladysmith"
          />
        </div>
      </div>

      <label className="badge-checkbox">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        Published (visible on the public site)
      </label>

      {fieldErrors.save && (
        <div className="submit-error">
          <i className="fa-solid fa-triangle-exclamation" /> {fieldErrors.save}
        </div>
      )}

      <div className="admin-blog-editor-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Post"}
        </button>
      </div>
    </div>
  );
}

export default function AdminPanel({ businesses, currentFeatured, featuredHistory, editRequests, blogPosts }) {
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
  const [historyOpen, setHistoryOpen] = useState(false);       // whether the "Recent History" list is expanded — collapsed by default
  // which edit request's "reject" form is open, if any, and the text typed
  // into it — kept separate from rejectingId/rejectNote above rather than
  // reused, since a business id and an edit_request id could otherwise
  // collide (they're rows in two different tables) and open the wrong form.
  const [rejectingEditId, setRejectingEditId] = useState(null);
  const [editRejectNote, setEditRejectNote]   = useState("");
  // which business is showing its "are you sure?" delete confirmation, if
  // any — shared across business cards and edit-request cards, since an
  // edit request's delete button targets the underlying business, not the
  // request itself.
  const [deletingBizId, setDeletingBizId] = useState(null);
  const [deleting, setDeleting]           = useState(false); // true only while a delete is actually in flight, so the buttons can't be double-clicked
  // the "Blog" tab: whether the editor is currently open (vs. showing the
  // post list), and which post it's editing — null means creating a brand
  // new post rather than editing an existing one.
  const [blogEditorOpen, setBlogEditorOpen]   = useState(false);
  const [blogEditingPost, setBlogEditingPost] = useState(null);
  // kept separate from deletingBizId above — a blog post id and a business
  // id are rows in two different tables and could otherwise collide, same
  // reasoning as rejectingEditId being kept separate from rejectingId.
  const [deletingBlogId, setDeletingBlogId] = useState(null);
  const [deletingBlog, setDeletingBlog]     = useState(false);

  // only show businesses matching the currently selected tab (or
  // everything, if the "all" tab is selected) — irrelevant for the
  // "edit-requests" and "blog" tabs, which list rows from different tables
  // entirely (see those sections further down).
  const filtered = businesses.filter((b) => tab === "all" || b.status === tab);

  // the number shown in each tab's little count badge.
  function tabCount(tabId) {
    if (tabId === "all") return businesses.length;
    if (tabId === "edit-requests") return editRequests.length;
    if (tabId === "blog") return blogPosts.length;
    return businesses.filter((b) => b.status === tabId).length;
  }

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

  // called when "Approve Changes" is clicked on an edit request — applies
  // the proposed changes to the live listing (see approveEditRequest in
  // app/admin/actions.js for exactly what that updates).
  async function handleApproveEdit(requestId) {
    const result = await approveEditRequest(requestId);
    if (result.success) {
      flash("Changes approved and applied to the listing.");
      refresh();
    } else {
      flash(result.error, true);
    }
  }

  // called when "Confirm Reject" is clicked on an edit request's reject form.
  async function handleRejectEdit(requestId) {
    const result = await rejectEditRequest(requestId, editRejectNote);
    if (result.success) {
      setRejectingEditId(null);
      setEditRejectNote("");
      flash("Edit request rejected.");
      refresh();
    } else {
      flash(result.error, true);
    }
  }

  // called when "Yes, Delete Permanently" is clicked. leaves deletingBizId
  // set on failure, so the confirmation (and its warning text) stays open
  // rather than silently reverting to the normal buttons.
  async function handleDeleteConfirm(id) {
    setDeleting(true);
    const result = await deleteBusiness(id);
    setDeleting(false);
    if (result.success) {
      setDeletingBizId(null);
      flash("Listing deleted successfully.");
      refresh();
    } else {
      flash(result.error, true);
    }
  }

  // called when "Yes, Delete Permanently" is clicked on a blog post's
  // confirmation. same shape as handleDeleteConfirm() above.
  async function handleDeleteBlogConfirm(id) {
    setDeletingBlog(true);
    const result = await deleteBlogPost(id);
    setDeletingBlog(false);
    if (result.success) {
      setDeletingBlogId(null);
      flash("Post deleted.");
      refresh();
    } else {
      flash(result.error, true);
    }
  }

  // true if the given business id is the one currently live as the
  // featured gem (i.e. its featured_gem row hasn't expired yet) — an
  // already-expired past feature doesn't need the extra warning, since
  // deleting it wouldn't change anything visible on the homepage.
  function isFeaturedActive(bizId) {
    return !!bizId && featBiz?.id === bizId && featuredStatus.tone === "active";
  }

  // called when "Auto-select" is clicked.
  async function handleAutoSelect() {
    const result = await autoSelectFeaturedGem();
    if (result.success) {
      flash("Featured gem updated successfully.");
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
      flash("Featured gem updated successfully.");
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
    const message = `Congratulations ${biz.owner_name ?? ""}! 🎉\n\nYour business *${biz.name}* has been selected as Hidden Gems SA's *Featured Gem of the Week*!\n\nYour listing is live at:\n${SITE_URL}/business/${biz.slug}\n\n— Hidden Gems SA Team\n🌐 ${SITE_URL}\n💻 Built by Olideen Technologies — ${OLIDEEN_URL}`;
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

  // loads one image and resolves once it's ready, or resolves to null if
  // there was nothing to load or it failed — lets downloadShareGraphic()
  // below load the (always-present) site logo and the (optional)
  // business logo side by side instead of one after another.
  function loadImage(src) {
    if (!src) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload  = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // builds the "you're approved" square graphic an owner can post to their
  // own Facebook/Instagram once their listing goes live — separate from
  // downloadGraphic() above (the weekly Featured Gem announcement), with
  // its own layout and copy, but the same Canvas approach and 1080x1080
  // size.
  //
  // canvas text can't use the site's actual Playfair Display/Inter web
  // fonts — next/font hosts them locally under generated, unpredictable
  // font-family names (see the comment in app/layout.js), not literally
  // "Playfair Display"/"Inter" — so, like downloadGraphic() above,
  // headings use Georgia as a serif stand-in and body text uses Arial as
  // a sans-serif stand-in.
  function downloadShareGraphic(biz) {
    const canvas  = document.createElement("canvas");
    canvas.width  = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");

    Promise.all([loadImage("/HG_Logo.png"), loadImage(biz.logo_url)]).then(([hgLogo, bizLogo]) => {
      // background: a diagonal Sapphire-to-Amethyst gradient, the same
      // corner-to-corner direction downloadGraphic() uses above
      const backgroundGradient = ctx.createLinearGradient(0, 0, 1080, 1080);
      backgroundGradient.addColorStop(0, "#0F52BA");
      backgroundGradient.addColorStop(1, "#9966CC");
      ctx.fillStyle = backgroundGradient;
      ctx.fillRect(0, 0, 1080, 1080);

      // the Hidden Gems SA logo mark, centered near the top, kept at its
      // real aspect ratio rather than stretched to a fixed box
      if (hgLogo) {
        const logoHeight = 110;
        const logoWidth  = logoHeight * (hgLogo.naturalWidth / hgLogo.naturalHeight);
        ctx.drawImage(hgLogo, 540 - logoWidth / 2, 30, logoWidth, logoHeight);
      }

      // "You're Listed!" headline
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 72px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("You're Listed!", 540, 250);

      // "CONGRATS, {business name}!" subheadline
      ctx.font = "600 40px Arial, sans-serif";
      ctx.fillText(`CONGRATS, ${biz.name}!`, 540, 310);

      // the center card: a rounded white card holding the business's own
      // identity (its logo/monogram, name, and category), set apart from
      // the site-branded elements around it
      const cardX = 140, cardY = 380, cardWidth = 800, cardHeight = 380, cardRadius = 24;
      ctx.save();
      ctx.shadowColor   = "rgba(0,0,0,0.18)";
      ctx.shadowBlur    = 30;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
      ctx.fill();
      ctx.restore(); // drop the shadow before drawing anything else, so it doesn't bleed onto what's drawn next

      // the round logo (or monogram letter) inside the card — same
      // sapphire-pale circle / sapphire letter fallback as
      // downloadGraphic() above
      const logoCenterY = cardY + 140, logoRadius = 90;
      ctx.save();
      ctx.beginPath();
      ctx.arc(540, logoCenterY, logoRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#E7EFFA";
      ctx.fill();

      if (bizLogo) {
        ctx.clip();
        ctx.drawImage(bizLogo, 540 - logoRadius, logoCenterY - logoRadius, logoRadius * 2, logoRadius * 2);
      } else {
        ctx.clip();
        ctx.fillStyle = "#0F52BA";
        ctx.font = "italic bold 84px Georgia, serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(biz.name[0].toUpperCase(), 540, logoCenterY);
      }
      ctx.restore();
      ctx.textBaseline = "alphabetic";

      // the business name, inside the card, below the logo/monogram
      ctx.fillStyle = "#082B66";
      ctx.font = "bold 44px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(biz.name, 540, cardY + 290);

      // the category, inside the card, below the name
      ctx.fillStyle = "#6b7280";
      ctx.font = "26px Arial, sans-serif";
      ctx.fillText(biz.category, 540, cardY + 330);

      // site credit, along the bottom
      ctx.fillStyle = "#ffffff";
      ctx.font = "28px Arial, sans-serif";
      ctx.fillText("Find us on Hidden Gems SA", 540, 1000);
      ctx.font = "24px Arial, sans-serif";
      ctx.fillText(SITE_URL.replace("https://", ""), 540, 1035);

      const downloadLink = document.createElement("a");
      downloadLink.download = `hidden-gems-sa-${biz.slug}-listed.png`;
      downloadLink.href = canvas.toDataURL("image/png");
      downloadLink.click();
    });
  }

  // builds the "Notify Owner" link + pre-written message shown on an
  // approved business's card, once the admin is ready to tell the owner
  // their listing is live. unlike buildWaMessage() above (left as-is for
  // the Featured Gem section), this one runs the number through
  // formatWa() first, same as buildContactUrl() above.
  function buildNotifyOwnerUrl(biz) {
    const whatsappNumber = formatWa(biz.whatsapp);
    if (!whatsappNumber) return null;

    const message = `🎉 You're live on Hidden Gems SA!\n\nHi ${biz.owner_name ?? "there"}, great news — ${biz.name} has been approved and is now visible to customers searching in ${biz.area}, ${biz.province}.\n\nYour listing: ${SITE_URL}/business/${biz.slug}\n\nHelp more customers find you — share your listing on your Facebook or Instagram page! We've attached a graphic you can post directly.\n\nHidden Gems SA Team\n🌐 ${SITE_URL}\n💻 Built by Olideen Technologies — ${OLIDEEN_URL}`;

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  const featBiz = currentFeatured?.businesses ?? null;
  const featuredStatus = getFeaturedStatus(currentFeatured);

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

          {/* Area 1 — Currently Featured: the most prominent part of this
              section, so an admin never has to guess who's live right now,
              for how much longer, or whether the panel is just slow to
              load. */}
          <div className="admin-feat-current-block">
            <div className="admin-feat-current-heading">
              <h3>Currently Featured Gem</h3>
              <span className={`badge badge-${featuredStatus.tone}`}>{featuredStatus.label}</span>
              {isPending && (
                <span className="admin-feat-updating">
                  <i className="fa-solid fa-spinner fa-spin" /> Updating...
                </span>
              )}
            </div>

            {featBiz ? (
              <div className="admin-feat-current">
                <div className="admin-feat-info">
                  {featBiz.logo_url
                    ? <Image src={featBiz.logo_url} alt="" width={56} height={56} className="avatar" />
                    : <div className="avatar-monogram">{featBiz.name[0]}</div>}
                  <div className="admin-feat-info-text">
                    <strong>{featBiz.name}</strong>
                    <p>{featBiz.category} · {featBiz.area}, {featBiz.province}</p>
                    <p className={`admin-feat-countdown admin-feat-countdown--${featuredStatus.tone}`}>
                      <i className="fa-solid fa-clock" /> {featuredStatus.countdown}
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
              <div className="admin-feat-empty-state">
                <i className="fa-solid fa-gem" />
                <p>No business is currently featured. Use the section below to set one.</p>
              </div>
            )}
          </div>

          {/* Area 2 — Set This Week's Gem: visually separated (border +
              tinted background) from Area 1 above, so it always reads as
              "change mode" rather than part of the current-status display. */}
          <div className="admin-feat-set-section">
            <h3 className="admin-feat-set-heading">Set This Week&apos;s Gem</h3>
            <div className="admin-feat-controls">
              <button className="btn-primary" onClick={handleAutoSelect} disabled={isPending}>
                <i className="fa-solid fa-rotate" /> Auto-select
              </button>

              <div className="admin-feat-search">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search to manually feature a business..."
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
                          Feature
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Area 3 — Recently Featured: collapsed by default so it stays
              out of the way of the two areas above, which matter far more
              day-to-day. */}
          <div className="admin-feat-history">
            <button
              type="button"
              className="admin-feat-history-toggle"
              onClick={() => setHistoryOpen((open) => !open)}
              aria-expanded={historyOpen}
            >
              <span><i className="fa-solid fa-clock-rotate-left" /> Recent History</span>
              <i className={`fa-solid ${historyOpen ? "fa-chevron-up" : "fa-chevron-down"}`} />
            </button>

            {historyOpen && (
              featuredHistory.length === 0 ? (
                <p className="admin-feat-history-empty">No featured gem history yet.</p>
              ) : (
                <ul className="admin-feat-history-list">
                  {featuredHistory.map((gem) => (
                    <li key={gem.id} className="admin-feat-history-row">
                      {gem.businesses?.logo_url
                        ? <Image src={gem.businesses.logo_url} alt="" width={32} height={32} className="avatar avatar--sm" />
                        : <div className="avatar-monogram avatar-monogram--sm">{gem.businesses?.name?.[0] ?? "?"}</div>}
                      <span className="admin-feat-history-name">{gem.businesses?.name ?? "Deleted business"}</span>
                      <span className="admin-feat-history-range">
                        {formatFeaturedRange(gem.created_at, gem.featured_until, gem.replaced_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        </section>

        {/* ── Business Listings ── */}
        <section className="admin-card">
          <h2 className="admin-section-title">
            <i className="fa-solid fa-store" /> Listings
          </h2>

          {/* Tabs */}
          <div className="admin-tabs">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                className={`admin-tab ${tab === id ? "admin-tab--active" : ""}`}
                onClick={() => setTab(id)}
              >
                {label}
                <span className="admin-tab-count">{tabCount(id)}</span>
              </button>
            ))}
          </div>

          {/* Edit Requests tab */}
          {tab === "edit-requests" && (
            editRequests.length === 0 ? (
              <div className="admin-empty">
                <i className="fa-solid fa-inbox" />
                <p>No pending edit requests.</p>
              </div>
            ) : (
              <div className="admin-biz-list">
                {editRequests.map((request) => {
                  const biz = request.businesses;
                  const changedFields = Object.keys(request.proposed_changes);
                  return (
                    <div key={request.id} className="admin-edit-card">
                      <div className="admin-edit-card-header">
                        {biz?.logo_url
                          ? <Image src={biz.logo_url} alt="" width={48} height={48} className="avatar" />
                          : <div className="avatar-monogram">{biz?.name?.[0] ?? "?"}</div>}
                        <div>
                          <strong>{biz?.name ?? "Unknown business"}</strong>
                          <p className="admin-edit-card-meta">
                            Requested {new Date(request.created_at).toLocaleDateString("en-ZA")}
                          </p>
                        </div>
                      </div>

                      <div className="admin-edit-compare">
                        <div className="admin-edit-compare-col">
                          <span className="badge admin-edit-badge-current">Current</span>
                          {changedFields.map((field) => (
                            <div key={field} className="admin-edit-field">
                              <span className="admin-edit-field-label">{EDIT_FIELD_LABELS[field] ?? field}</span>
                              <span className="admin-edit-field-value">{formatEditValue(biz?.[field])}</span>
                            </div>
                          ))}
                        </div>
                        <div className="admin-edit-compare-col">
                          <span className="badge admin-edit-badge-proposed">Proposed</span>
                          {changedFields.map((field) => (
                            <div key={field} className="admin-edit-field">
                              <span className="admin-edit-field-label">{EDIT_FIELD_LABELS[field] ?? field}</span>
                              <span className="admin-edit-field-value">{formatEditValue(request.proposed_changes[field])}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {biz?.id && deletingBizId === biz.id ? (
                        <DeleteControls
                          isConfirming
                          isFeaturedActive={isFeaturedActive(biz.id)}
                          deleting={deleting}
                          onCancel={() => setDeletingBizId(null)}
                          onConfirmDelete={() => handleDeleteConfirm(biz.id)}
                        />
                      ) : (
                        <>
                          {rejectingEditId === request.id ? (
                            <div className="admin-reject-form">
                              <textarea
                                className="form-control"
                                rows={2}
                                placeholder="Rejection reason (optional)..."
                                value={editRejectNote}
                                onChange={(e) => setEditRejectNote(e.target.value)}
                              />
                              <div className="admin-reject-btns">
                                <button className="btn-secondary" onClick={() => { setRejectingEditId(null); setEditRejectNote(""); }}>
                                  Cancel
                                </button>
                                <button className="admin-reject-confirm-btn" onClick={() => handleRejectEdit(request.id)}>
                                  <i className="fa-solid fa-xmark" /> Confirm Reject
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="admin-biz-actions">
                              <button
                                className="btn-primary admin-approve-btn admin-approve-edit-btn"
                                onClick={() => handleApproveEdit(request.id)}
                                disabled={isPending}
                              >
                                <i className="fa-solid fa-check" /> Approve Changes
                              </button>
                              <button
                                className="admin-reject-btn"
                                onClick={() => setRejectingEditId(request.id)}
                              >
                                <i className="fa-solid fa-xmark" /> Reject Changes
                              </button>
                            </div>
                          )}

                          {biz?.id && (
                            <DeleteControls
                              isConfirming={false}
                              onRequestDelete={() => setDeletingBizId(biz.id)}
                            />
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Blog tab */}
          {tab === "blog" && (
            blogEditorOpen ? (
              <BlogEditorForm
                post={blogEditingPost}
                existingSlugs={blogPosts.map((p) => ({ id: p.id, slug: p.slug }))}
                onCancel={() => setBlogEditorOpen(false)}
                onSaved={() => {
                  const wasEditing = !!blogEditingPost;
                  setBlogEditorOpen(false);
                  flash(wasEditing ? "Post updated." : "Post created.");
                  refresh();
                }}
              />
            ) : (
              <>
                <div className="admin-blog-toolbar">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => { setBlogEditingPost(null); setBlogEditorOpen(true); }}
                  >
                    <i className="fa-solid fa-plus" /> New Post
                  </button>
                </div>

                {blogPosts.length === 0 ? (
                  <div className="admin-empty">
                    <i className="fa-solid fa-newspaper" />
                    <p>No blog posts yet.</p>
                  </div>
                ) : (
                  <div className="admin-biz-list">
                    {blogPosts.map((post) => (
                      <div key={post.id} className="admin-blog-card">
                        <button
                          type="button"
                          className="admin-blog-card-main"
                          onClick={() => { setBlogEditingPost(post); setBlogEditorOpen(true); }}
                        >
                          <div className="admin-blog-card-title-row">
                            <strong>{post.title}</strong>
                            <span className={`badge ${post.published ? "badge-approved" : "badge-pending"}`}>
                              {post.published ? "Published" : "Draft"}
                            </span>
                          </div>
                          <p className="admin-blog-card-meta">
                            /blog/{post.slug} · Updated {new Date(post.updated_at).toLocaleDateString("en-ZA")}
                          </p>
                        </button>

                        {deletingBlogId === post.id ? (
                          <BlogDeleteControls
                            isConfirming
                            deleting={deletingBlog}
                            onCancel={() => setDeletingBlogId(null)}
                            onConfirmDelete={() => handleDeleteBlogConfirm(post.id)}
                          />
                        ) : (
                          <BlogDeleteControls
                            isConfirming={false}
                            onRequestDelete={() => setDeletingBlogId(post.id)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          )}

          {/* Business list */}
          {tab !== "edit-requests" && tab !== "blog" && (filtered.length === 0 ? (
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

                      {/* read-only — lets the admin see at a glance what
                          badges the business owner selected before
                          approving. renders nothing if none are set. */}
                      <BadgePills biz={biz} />

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

                      {/* street address is only ever set for a physical
                          business (see app/submit/SubmitForm.js) and is
                          purely informational here — nothing for the admin
                          to edit, it's just useful to see before approving. */}
                      {biz.street_address && (
                        <p className="admin-biz-street-address">
                          <i className="fa-solid fa-map-pin" /> <strong>Street Address:</strong> {biz.street_address}
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

                  {/* manual, admin-triggered actions for a listing that's
                      already live — nothing here runs automatically on
                      approval, both are click-to-use so they can be tried
                      out before relying on them. */}
                  {biz.status === "approved" && (
                    <div className="admin-approved-actions">
                      <button
                        type="button"
                        className="admin-share-graphic-btn"
                        onClick={() => downloadShareGraphic(biz)}
                      >
                        <i className="fa-solid fa-image" /> Share Graphic
                      </button>
                      {formatWa(biz.whatsapp) && (
                        <a
                          href={buildNotifyOwnerUrl(biz)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-wa-contact-btn"
                        >
                          <i className="fa-brands fa-whatsapp" /> Notify Owner
                        </a>
                      )}
                    </div>
                  )}

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

                  {deletingBizId === biz.id ? (
                    <DeleteControls
                      isConfirming
                      isFeaturedActive={isFeaturedActive(biz.id)}
                      deleting={deleting}
                      onCancel={() => setDeletingBizId(null)}
                      onConfirmDelete={() => handleDeleteConfirm(biz.id)}
                    />
                  ) : (
                    <>
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

                      <DeleteControls
                        isConfirming={false}
                        onRequestDelete={() => setDeletingBizId(biz.id)}
                      />
                    </>
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
          ))}
        </section>
      </div>
    </div>
  );
}
