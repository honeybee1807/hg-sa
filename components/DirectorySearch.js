"use client";

// the live search/filter box shown on the homepage above the full business
// directory. everything here runs entirely in the browser — the full list
// of approved businesses is already loaded on the page, and this component
// just narrows down which ones are currently shown, based on whatever text
// someone has typed and which filters (category / province / business type)
// are currently applied, plus which of the three view layouts (2-column
// grid, compact grid, or list) is currently selected. nothing is re-fetched
// from the database as someone types, filters, or switches views.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CATEGORIES, PROVINCES } from "@/lib/constants";
import SocialLink from "@/components/SocialLink";
import BadgePills from "@/components/BadgePills";

// the three badge filters shown in their own section of the filter panel —
// same icons/colours as the pills themselves (see components/BadgePills.js
// and the "badge-pill--*" / "dir-filter-badge-icon--*" classes in
// globals.css), so a filter checkbox always visually matches the pill it's
// filtering for.
const BADGE_FILTER_OPTIONS = [
  { key: "halal",     label: "Halal",                 icon: "fa-solid fa-moon" },
  { key: "delivery",  label: "Delivery Available",     icon: "fa-solid fa-box" },
  { key: "callouts",  label: "Call-Outs Available",    icon: "fa-solid fa-location-arrow" },
];

// the three query-string keys the badge filters sync to/from — kept as
// their own list (rather than category/province/business-type) since
// those don't have URL-param support yet; see the note on "readBadgesFromUrl"
// below.
const BADGE_PARAM_KEYS = ["halal", "delivery", "callouts"];

// the options shown in the "Business Type" filter section — kept here
// rather than in lib/constants.js since this exact list is also
// hand-written directly into app/submit/SubmitForm.js (the only other place
// it's needed), rather than being a shared master list like categories or
// provinces.
const BUSINESS_TYPES = [
  "Physical location — customers visit us",
  "Home-based — we operate from home",
  "Mobile — we come to the customer",
  "Online only — no physical location",
];

// the three ways results can be displayed, and the localStorage key that
// remembers whichever one someone last picked, so it's still selected next
// time they visit.
const VALID_VIEWS = new Set(["grid2", "compact", "list"]);
const VIEW_STORAGE_KEY = "hgsa_view_preference";

// checks one business against the current search text, deciding whether it
// should stay in the results. returns true if the search box is empty (no
// filtering needed), or if the typed text shows up anywhere in the
// business's name, category, area, or description.
function businessMatchesSearchText(business, searchText) {
  if (!searchText) return true;

  const lowercaseName        = business.name.toLowerCase();
  const lowercaseCategory    = business.category.toLowerCase();
  const lowercaseArea        = business.area.toLowerCase();
  const lowercaseDescription = (business.description ?? "").toLowerCase();

  return (
    lowercaseName.includes(searchText) ||
    lowercaseCategory.includes(searchText) ||
    lowercaseArea.includes(searchText) ||
    lowercaseDescription.includes(searchText)
  );
}

// turns a saved WhatsApp number (already stored in the "27..." format from
// when it was submitted — see app/submit/actions.js) into that exact
// format, just in case an older record was saved differently. mirrors the
// same small helper already used on the business detail page.
function formatWhatsApp(raw) {
  if (!raw) return null;
  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly.startsWith("27")) return digitsOnly;
  if (digitsOnly.startsWith("0")) return "27" + digitsOnly.slice(1);
  return "27" + digitsOnly;
}

export default function DirectorySearch({ businesses }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // reads whichever badge filters are currently in the URL (e.g.
  // "?halal=true&delivery=true") — used once, below, to restore a shared/
  // refreshed link's filter state. category/province/business-type don't
  // have URL params yet, so only these three are read here.
  function readBadgesFromUrl() {
    return BADGE_PARAM_KEYS.filter((key) => searchParams.get(key) === "true");
  }

  const [query, setQuery] = useState(""); // whatever text is currently typed into the search box

  // the filters actually being applied to the results right now.
  const [appliedCategories, setAppliedCategories]         = useState([]);
  const [appliedProvinces, setAppliedProvinces]           = useState([]);
  const [appliedBusinessTypes, setAppliedBusinessTypes]   = useState([]);
  const [appliedBadges, setAppliedBadges]                 = useState(readBadgesFromUrl);

  // the filters currently ticked inside the (possibly still open) filter
  // panel — kept separate from the "applied" versions above so that ticking
  // a checkbox doesn't change the results until "Apply Filters" is clicked.
  const [pendingCategories, setPendingCategories]         = useState([]);
  const [pendingProvinces, setPendingProvinces]           = useState([]);
  const [pendingBusinessTypes, setPendingBusinessTypes]   = useState([]);
  const [pendingBadges, setPendingBadges]                 = useState(appliedBadges);

  const [filtersOpen, setFiltersOpen] = useState(false); // whether the filter panel is currently showing
  const [openSections, setOpenSections] = useState({ category: true, province: true, businessType: true, badges: true }); // which of the panel's collapsible sections are expanded

  // keeps the URL's badge query params in sync with whatever's currently
  // applied, so a filtered view is shareable via link and restores
  // correctly on page load/refresh. only the badge filters do this for
  // now — category/province/business-type never touch the URL, so those
  // are left completely alone here.
  function syncBadgesToUrl(badges) {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of BADGE_PARAM_KEYS) {
      if (badges.includes(key)) params.set(key, "true");
      else params.delete(key);
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  // which of the three layouts is currently selected. starts as "list"
  // (the default) so the very first server-rendered frame is predictable —
  // the effect below then swaps in whatever was actually saved from a
  // previous visit, once the page has loaded in the browser.
  const [view, setView] = useState("list");
  const [isMobile, setIsMobile] = useState(false); // whether the screen is currently narrow enough to hide the compact-grid option

  const filterWrapRef = useRef(null); // points at the button + panel together, used to detect clicks landing outside both

  // on first load in the browser, restore whichever view was saved from a
  // previous visit (if any, and if it's still one of the three valid ones).
  useEffect(() => {
    function restoreSavedView() {
      const savedView = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (savedView && VALID_VIEWS.has(savedView)) {
        setView(savedView);
      }
    }
    restoreSavedView();
  }, []);

  // every time the view changes, remember it for next time.
  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  // tracks whether the screen is currently narrow enough that the compact
  // grid option should be hidden (see the "effectiveView" fallback below).
  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 768px)");

    function handleChange(query) {
      setIsMobile(query.matches);
    }
    handleChange(mobileQuery);
    mobileQuery.addEventListener("change", handleChange);
    return () => mobileQuery.removeEventListener("change", handleChange);
  }, []);

  // closes the filter panel if someone clicks anywhere outside it, or
  // presses Escape — but only while it's actually open, so these listeners
  // aren't sitting on the page doing nothing the rest of the time.
  useEffect(() => {
    if (!filtersOpen) return;

    function handleClickOutside(event) {
      if (filterWrapRef.current && !filterWrapRef.current.contains(event.target)) {
        setFiltersOpen(false);
      }
    }
    function handleEscape(event) {
      if (event.key === "Escape") setFiltersOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [filtersOpen]);

  // the compact grid doesn't make sense on a narrow screen (there's no room
  // for 3-4 columns), so on mobile it quietly falls back to list view
  // instead — without touching the actual saved preference, so the compact
  // grid is exactly where they left it next time they're back on a wider
  // screen.
  const effectiveView = view === "compact" && isMobile ? "list" : view;

  // opening the panel copies whatever's currently applied into the pending
  // (checkbox) state, so re-opening it after closing without applying shows
  // the last applied selection rather than a half-finished one.
  function handleToggleFilters() {
    setFiltersOpen((currentlyOpen) => {
      if (!currentlyOpen) {
        setPendingCategories(appliedCategories);
        setPendingProvinces(appliedProvinces);
        setPendingBusinessTypes(appliedBusinessTypes);
        setPendingBadges(appliedBadges);
      }
      return !currentlyOpen;
    });
  }

  function toggleSection(section) {
    setOpenSections((previous) => ({ ...previous, [section]: !previous[section] }));
  }

  function handleApplyFilters() {
    setAppliedCategories(pendingCategories);
    setAppliedProvinces(pendingProvinces);
    setAppliedBusinessTypes(pendingBusinessTypes);
    setAppliedBadges(pendingBadges);
    syncBadgesToUrl(pendingBadges);
    setFiltersOpen(false);
  }

  // resets absolutely everything — the keyword search box included — back
  // to a completely unfiltered directory.
  function handleClearAll() {
    setQuery("");
    setPendingCategories([]);
    setPendingProvinces([]);
    setPendingBusinessTypes([]);
    setPendingBadges([]);
    setAppliedCategories([]);
    setAppliedProvinces([]);
    setAppliedBusinessTypes([]);
    setAppliedBadges([]);
    syncBadgesToUrl([]);
    setFiltersOpen(false);
  }

  const activeFilterCount = appliedCategories.length + appliedProvinces.length + appliedBusinessTypes.length + appliedBadges.length;

  // recalculates the filtered list of businesses whenever the full list,
  // the search text, or any applied filter changes. "useMemo" just means
  // this filtering work is skipped and the previous result reused if none
  // of those things have actually changed since the last render.
  const filtered = useMemo(() => {
    const searchText = query.trim().toLowerCase();

    return businesses.filter((business) => {
      const matchesSearchText     = businessMatchesSearchText(business, searchText);
      const matchesCategory       = appliedCategories.length === 0 || appliedCategories.includes(business.category);
      const matchesProvince       = appliedProvinces.length === 0 || appliedProvinces.includes(business.province);
      const matchesBusinessType   = appliedBusinessTypes.length === 0 || appliedBusinessTypes.includes(business.business_type);

      // every checked badge filter must match (AND, not OR) — a business
      // checked against "Halal" and "Delivery Available" together has to
      // have both, not just one.
      const matchesBadges = appliedBadges.every((key) => {
        if (key === "halal") return !!business.halal;
        if (key === "delivery") return !!business.delivery_available;
        if (key === "callouts") return !!business.callouts_available;
        return true;
      });

      // a business only stays in the results if it satisfies every active
      // filter at once.
      return matchesSearchText && matchesCategory && matchesProvince && matchesBusinessType && matchesBadges;
    });
  }, [businesses, query, appliedCategories, appliedProvinces, appliedBusinessTypes, appliedBadges]);

  return (
    <div className="dir-search">
      <div className="dir-search-top">
        {/* "onSubmit" here just stops the browser's default full-page-reload
            behaviour — filtering already happens live as "query" changes,
            so pressing Enter or clicking the search button don't need to
            do anything extra beyond that. */}
        <form className="dir-search-bar" onSubmit={(event) => event.preventDefault()}>
          <div className="dir-search-pill">
            <i className="fa-solid fa-magnifying-glass dir-search-pill-icon" aria-hidden="true" />
            <input
              type="text"
              className="dir-search-pill-input"
              placeholder="Search businesses by name, category or area..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search the directory"
            />
            <button type="submit" className="dir-search-pill-btn" aria-label="Search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            </button>
          </div>
        </form>

        <div className="dir-filter-wrap" ref={filterWrapRef}>
          <button
            type="button"
            className={`dir-filter-btn ${filtersOpen ? "dir-filter-btn--active" : ""}`}
            onClick={handleToggleFilters}
            aria-expanded={filtersOpen}
          >
            <i className="fa-solid fa-sliders" aria-hidden="true" />
            <span className="dir-filter-btn-label">
              Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
            </span>
          </button>

          {filtersOpen && (
            <div className="dir-filter-panel" role="dialog" aria-label="Filter businesses">
              <FilterSection
                title="Category"
                isOpen={openSections.category}
                onToggle={() => toggleSection("category")}
                options={CATEGORIES.map((c) => c.name)}
                selected={pendingCategories}
                onChange={setPendingCategories}
              />
              <FilterSection
                title="Province"
                isOpen={openSections.province}
                onToggle={() => toggleSection("province")}
                options={PROVINCES}
                selected={pendingProvinces}
                onChange={setPendingProvinces}
              />
              <FilterSection
                title="Business Type"
                isOpen={openSections.businessType}
                onToggle={() => toggleSection("businessType")}
                options={BUSINESS_TYPES}
                selected={pendingBusinessTypes}
                onChange={setPendingBusinessTypes}
              />
              <BadgeFilterSection
                isOpen={openSections.badges}
                onToggle={() => toggleSection("badges")}
                selected={pendingBadges}
                onChange={setPendingBadges}
              />

              <div className="dir-filter-actions">
                <button type="button" className="btn-secondary" onClick={handleClearAll}>
                  Clear all
                </button>
                <button type="button" className="btn-primary" onClick={handleApplyFilters}>
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="dir-view-toggle-row">
        <p className="dir-search-count">
          {businesses.length === 0
            ? "No approved listings yet — be the first!"
            : `${filtered.length} ${filtered.length === 1 ? "business" : "businesses"} found`}
        </p>

        <div className="dir-view-toggle" role="group" aria-label="Choose how results are displayed">
          <button
            type="button"
            className={`dir-view-btn ${effectiveView === "grid2" ? "dir-view-btn--active" : ""}`}
            onClick={() => setView("grid2")}
            aria-label="Card grid view"
            aria-pressed={effectiveView === "grid2"}
          >
            <i className="fa-solid fa-grip" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`dir-view-btn dir-view-btn--compact-only ${effectiveView === "compact" ? "dir-view-btn--active" : ""}`}
            onClick={() => setView("compact")}
            aria-label="Compact grid view"
            aria-pressed={effectiveView === "compact"}
          >
            <i className="fa-solid fa-border-all" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`dir-view-btn ${effectiveView === "list" ? "dir-view-btn--active" : ""}`}
            onClick={() => setView("list")}
            aria-label="List view"
            aria-pressed={effectiveView === "list"}
          >
            <i className="fa-solid fa-list" aria-hidden="true" />
          </button>
        </div>
      </div>

      {filtered.length > 0 ? (
        // the "key" forces a fresh element whenever the view changes, which
        // is what lets the CSS fade-in animation on ".dir-results" replay
        // every time someone switches layouts, instead of only playing once.
        <div key={effectiveView} className={`dir-results dir-results--${effectiveView}`}>
          {filtered.map((biz) =>
            effectiveView === "list"
              ? <DirectoryRow key={biz.id} biz={biz} />
              : <DirectoryCard key={biz.id} biz={biz} compact={effectiveView === "compact"} />
          )}
        </div>
      ) : (
        <div className="listing-empty">
          <i className="fa-solid fa-magnifying-glass" />
          <p>
            {businesses.length === 0
              ? "No businesses listed yet."
              : "No businesses match your search. Try a different name, category, or filter."}
          </p>
        </div>
      )}
    </div>
  );
}

// one collapsible section of the filter panel — a header with a chevron
// that expands or collapses independently of the other two sections, and a
// checkbox for every option it's given.
function FilterSection({ title, isOpen, onToggle, options, selected, onChange }) {
  function toggleOption(option) {
    onChange(
      selected.includes(option)
        ? selected.filter((o) => o !== option)
        : [...selected, option]
    );
  }

  return (
    <div className="dir-filter-section">
      <button
        type="button"
        className="dir-filter-section-header"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span>
          {title}
          {selected.length > 0 ? ` (${selected.length})` : ""}
        </span>
        <i className={`fa-solid ${isOpen ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="dir-filter-section-body">
          {options.map((option) => (
            <label key={option} className="dir-filter-checkbox">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggleOption(option)}
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// the "Badges" section of the filter panel — same collapsible shape as
// FilterSection above, but each checkbox shows a coloured icon matching
// the badge pill it filters for (see components/BadgePills.js), and
// selecting more than one is an AND (a business must have every checked
// badge), not an OR the way category/province/business-type work.
function BadgeFilterSection({ isOpen, onToggle, selected, onChange }) {
  function toggleOption(key) {
    onChange(
      selected.includes(key)
        ? selected.filter((k) => k !== key)
        : [...selected, key]
    );
  }

  return (
    <div className="dir-filter-section">
      <button
        type="button"
        className="dir-filter-section-header"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span>
          Badges
          {selected.length > 0 ? ` (${selected.length})` : ""}
        </span>
        <i className={`fa-solid ${isOpen ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="dir-filter-section-body">
          {BADGE_FILTER_OPTIONS.map((badge) => (
            <label key={badge.key} className="dir-filter-checkbox">
              <input
                type="checkbox"
                checked={selected.includes(badge.key)}
                onChange={() => toggleOption(badge.key)}
              />
              <i className={`${badge.icon} dir-filter-badge-icon dir-filter-badge-icon--${badge.key}`} aria-hidden="true" />
              {badge.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// a single business shown as a card — used for both the 2-column grid and
// the compact grid, which differ only in size (via the "compact" flag)
// rather than in what information they show.
function DirectoryCard({ biz, compact }) {
  const initial = biz.name[0].toUpperCase();
  // some older records may store the area with extra text after it (like
  // "Estcourt, KwaZulu-Natal" instead of just "Estcourt") — only the part
  // before the first comma is the actual area name.
  const areaName = biz.area.split(",")[0].trim();
  const socialSize = compact ? "sm" : "md";

  return (
    <div className={`dir-card ${compact ? "dir-card--compact" : ""}`}>
      <Link href={`/business/${biz.slug}`} className="dir-card-link">
        <div className="dir-card-top">
          <div className="dir-card-logo">
            {biz.logo_url ? (
              <Image src={biz.logo_url} alt={`${biz.name} logo`} width={56} height={56} className="avatar" />
            ) : (
              <div className="avatar-monogram">{initial}</div>
            )}
          </div>
          <div className="dir-card-heading">
            <h3 className="dir-card-name">{biz.name}</h3>
            <p className="dir-card-location">
              <i className="fa-solid fa-location-dot" aria-hidden="true" /> {areaName}, {biz.province}
            </p>
          </div>
        </div>

        <div className="dir-card-tags">
          <span className="dir-card-cat-pill"><i className="fa-solid fa-tag" aria-hidden="true" /> {biz.category}</span>
          {biz.business_type && <span className="business-type-badge">{biz.business_type}</span>}
        </div>

        <BadgePills biz={biz} />

        {biz.description && <p className="dir-card-desc">{biz.description}</p>}
      </Link>

      {(biz.instagram || biz.facebook) && (
        <div className="dir-card-actions">
          <SocialLink platform="instagram" value={biz.instagram} className={`social-icon-btn social-icon-btn--instagram social-icon-btn--${socialSize}`} iconOnly />
          <SocialLink platform="facebook" value={biz.facebook} className={`social-icon-btn social-icon-btn--facebook social-icon-btn--${socialSize}`} iconOnly />
        </div>
      )}
    </div>
  );
}

// a single business shown as a full-width row — used for list view.
function DirectoryRow({ biz }) {
  const initial = biz.name[0].toUpperCase();
  const areaName = biz.area.split(",")[0].trim();
  const waNumber = formatWhatsApp(biz.whatsapp);

  return (
    <div className="dir-row">
      <Link href={`/business/${biz.slug}`} className="dir-row-main">
        <div className="dir-row-logo">
          {biz.logo_url ? (
            <Image src={biz.logo_url} alt={`${biz.name} logo`} width={56} height={56} className="avatar" />
          ) : (
            <div className="avatar-monogram">{initial}</div>
          )}
        </div>
        <div className="dir-row-body">
          <div className="dir-row-top">
            <h3 className="dir-row-name">{biz.name}</h3>
            <span className="dir-card-cat-pill"><i className="fa-solid fa-tag" aria-hidden="true" /> {biz.category}</span>
            {biz.business_type && <span className="business-type-badge">{biz.business_type}</span>}
          </div>
          <p className="dir-row-location">
            <i className="fa-solid fa-location-dot" aria-hidden="true" /> {areaName}, {biz.province}
          </p>
          <BadgePills biz={biz} />
        </div>
      </Link>

      <div className="dir-row-actions">
        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="dir-row-wa-btn"
            aria-label={`WhatsApp ${biz.name}`}
          >
            <i className="fa-brands fa-whatsapp" aria-hidden="true" />
          </a>
        )}
        <SocialLink platform="instagram" value={biz.instagram} className="social-icon-btn social-icon-btn--instagram social-icon-btn--md" iconOnly />
        <SocialLink platform="facebook" value={biz.facebook} className="social-icon-btn social-icon-btn--facebook social-icon-btn--md" iconOnly />
        <Link href={`/business/${biz.slug}`} className="dir-row-view-link">
          <span className="dir-row-view-label">View Profile</span>
          <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
