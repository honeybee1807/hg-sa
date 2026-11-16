"use client";

// the live search/filter for the homepage's business directory. everything
// here runs entirely in the browser — the full list of approved businesses
// is already loaded on the page, and this just narrows down which ones are
// currently shown, based on whatever text someone has typed and which
// filters (category / province / business type / badges) are applied, plus
// which of the three view layouts (2-column grid, compact grid, or list) is
// selected. nothing is re-fetched from the database as someone types,
// filters, or switches views.
//
// it's split into pieces that all read one shared state, so the hero's
// search bar and the directory section below it always agree:
//   DirectorySearchProvider — owns the single source of truth (search
//                             text, applied filters, the filtered list).
//                             wraps both of the pieces below (see
//                             app/page.js).
//   DirectorySearchBar      — the hero's search card and Filters link
//                             (rendered in components/Hero.js).
//   DirectorySection        — the "Explore the directory" section under
//                             the hero: its own search bar (bound to the
//                             same search text), Filters button, category
//                             pills, info card, and the results.
// both Filters entry points render the same FilterControl, so there's one
// copy of the filter panel logic, not two.

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { CATEGORIES, PROVINCES, BUSINESS_TYPES } from "@/lib/constants";
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

// the three query-string keys the badge filters sync to/from (e.g.
// "?halal=true&delivery=true"), so a filtered view is shareable by link.
// category/province/business type don't have URL params. app/page.js reads
// the starting values for these from the page's own searchParams on the
// server (it keeps its own copy of this list, since a server component
// can't import a plain value from a "use client" file).
const BADGE_PARAM_KEYS = ["halal", "delivery", "callouts"];

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

const DirectorySearchContext = createContext(null);

function useDirectorySearch() {
  const context = useContext(DirectorySearchContext);
  if (!context) {
    throw new Error("DirectorySearchBar and DirectoryResults must be inside a DirectorySearchProvider.");
  }
  return context;
}

// owns everything both halves need to agree on: the search text, the
// filters currently applied, and the resulting filtered list.
// "initialBadges" is whichever badge filters were in the URL when the page
// loaded, read on the server by app/page.js — so a shared "?halal=true"
// link renders already filtered, with no flash of unfiltered results.
export function DirectorySearchProvider({ businesses, initialBadges = [], children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState(""); // whatever text is currently typed into the search box

  // the filters actually being applied to the results right now.
  const [appliedCategories, setAppliedCategories]       = useState([]);
  const [appliedProvinces, setAppliedProvinces]         = useState([]);
  const [appliedBusinessTypes, setAppliedBusinessTypes] = useState([]);
  const [appliedBadges, setAppliedBadges]               = useState(initialBadges);

  // keeps the URL's badge query params in sync with whatever's currently
  // applied, so a filtered view is shareable via link and restores
  // correctly on page load/refresh. reads the current query string straight
  // from the address bar, so any other params already there are kept.
  function syncBadgesToUrl(badges) {
    const params = new URLSearchParams(window.location.search);
    for (const key of BADGE_PARAM_KEYS) {
      if (badges.includes(key)) params.set(key, "true");
      else params.delete(key);
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  function applyFilters({ categories, provinces, businessTypes, badges }) {
    setAppliedCategories(categories);
    setAppliedProvinces(provinces);
    setAppliedBusinessTypes(businessTypes);
    setAppliedBadges(badges);
    syncBadgesToUrl(badges);
  }

  // used by the category pills in DirectorySection: sets the exact same
  // category filter the filter panel uses (a name from CATEGORIES), or
  // clears it when null ("All listings"). only categories change — no URL
  // update is needed, since categories don't have URL params.
  function setCategoryFilter(categoryName) {
    setAppliedCategories(categoryName ? [categoryName] : []);
  }

  // resets absolutely everything — the keyword search box included — back
  // to a completely unfiltered directory.
  function clearAll() {
    setQuery("");
    applyFilters({ categories: [], provinces: [], businessTypes: [], badges: [] });
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

  const value = {
    businesses,
    filtered,
    query,
    setQuery,
    appliedCategories,
    appliedProvinces,
    appliedBusinessTypes,
    appliedBadges,
    activeFilterCount,
    applyFilters,
    setCategoryFilter,
    clearAll,
  };

  return <DirectorySearchContext.Provider value={value}>{children}</DirectorySearchContext.Provider>;
}

// the id on DirectorySection's outer <section>, so the hero search bar's
// "Find a gem" button knows where to scroll to.
const DIRECTORY_SECTION_ID = "directory";

// smooth-scrolls to the directory section (or jumps, for anyone whose
// device asks for reduced motion).
function scrollToDirectory() {
  const section = document.getElementById(DIRECTORY_SECTION_ID);
  if (!section) return;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
}

// the Filters button plus the existing filter panel (Category, Province,
// Business Type, badges, "Clear all", "Apply Filters"). rendered in two
// places — the hero (as a small text link) and the directory section's
// search bar (as a button with a count badge) — but both read and write
// the same applied filters from the provider, so they always agree. the
// panel's checkboxes are "pending" until Apply Filters is clicked — only
// then are they handed to the provider and the results change.
//   variant — "link" (hero) or "button" (directory section)
function FilterControl({ variant }) {
  const {
    appliedCategories,
    appliedProvinces,
    appliedBusinessTypes,
    appliedBadges,
    activeFilterCount,
    applyFilters,
    clearAll,
  } = useDirectorySearch();

  // the filters currently ticked inside the (possibly still open) filter
  // panel — kept separate from the "applied" versions so that ticking a
  // checkbox doesn't change the results until "Apply Filters" is clicked.
  const [pendingCategories, setPendingCategories]       = useState([]);
  const [pendingProvinces, setPendingProvinces]         = useState([]);
  const [pendingBusinessTypes, setPendingBusinessTypes] = useState([]);
  const [pendingBadges, setPendingBadges]               = useState(appliedBadges);

  const [filtersOpen, setFiltersOpen] = useState(false); // whether the filter panel is currently showing
  const [openSections, setOpenSections] = useState({ category: true, province: true, businessType: true, badges: true }); // which of the panel's collapsible sections are expanded

  const filterWrapRef = useRef(null); // points at the button + panel together, used to detect clicks landing outside both

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

  // opening the panel copies whatever's currently applied into the pending
  // (checkbox) state, so re-opening it after closing without applying shows
  // the last applied selection (including a category picked from the
  // pills) rather than a half-finished one.
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
    applyFilters({
      categories: pendingCategories,
      provinces: pendingProvinces,
      businessTypes: pendingBusinessTypes,
      badges: pendingBadges,
    });
    setFiltersOpen(false);
  }

  function handleClearAll() {
    setPendingCategories([]);
    setPendingProvinces([]);
    setPendingBusinessTypes([]);
    setPendingBadges([]);
    clearAll();
    setFiltersOpen(false);
  }

  return (
    <div className={`dir-filter-wrap dir-filter-wrap--${variant}`} ref={filterWrapRef}>
      {variant === "link" ? (
        <button
          type="button"
          className={`hsb-filter-btn ${filtersOpen ? "hsb-filter-btn--active" : ""}`}
          onClick={handleToggleFilters}
          aria-expanded={filtersOpen}
        >
          <i className="fa-solid fa-sliders" aria-hidden="true" />
          <span>
            Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
          </span>
        </button>
      ) : (
        <button
          type="button"
          className={`dsec-filter-btn ${filtersOpen ? "dsec-filter-btn--active" : ""}`}
          onClick={handleToggleFilters}
          aria-expanded={filtersOpen}
          aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : "Filters"}
        >
          <i className="fa-solid fa-sliders" aria-hidden="true" />
          <span className="dsec-filter-btn-label">Filters</span>
          {activeFilterCount > 0 && (
            <span className="dsec-filter-count" aria-hidden="true">{activeFilterCount}</span>
          )}
        </button>
      )}

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
  );
}

// the hero's search card (icon, input, "Find a gem" button) plus a small
// Filters link underneath. the input is bound to the same shared "query"
// as the directory section's own search bar, so typing in either updates
// both. pressing Enter or clicking "Find a gem" smooth-scrolls down to the
// directory section, where the results are already filtered.
export function DirectorySearchBar() {
  const { query, setQuery } = useDirectorySearch();

  // the input is blurred first so a phone's on-screen keyboard closes and
  // doesn't cover the results.
  function handleSubmit(event) {
    event.preventDefault();
    event.currentTarget.querySelector("input")?.blur();
    scrollToDirectory();
  }

  return (
    <div className="hsb">
      <form className="hsb-card" role="search" onSubmit={handleSubmit}>
        <i className="fa-solid fa-magnifying-glass hsb-icon" aria-hidden="true" />
        <input
          type="text"
          className="hsb-input"
          placeholder="What are you looking for?"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search the directory"
          enterKeyHint="search"
        />
        {/* the full label is swapped for a shorter one on narrow phones
            (see .hsb-btn-label--short in globals.css), so the bar always
            fits on one row. */}
        <button type="submit" className="hsb-btn" aria-label="Find a gem">
          <span className="hsb-btn-label hsb-btn-label--full">Find a gem</span>
          <span className="hsb-btn-label hsb-btn-label--short">Find</span>
          {/* a plain "↗" character: Font Awesome 6.5.1's free set has no
              simple up-right arrow icon. */}
          <span className="hsb-btn-arrow" aria-hidden="true">↗</span>
        </button>
      </form>

      <div className="hsb-filters">
        <FilterControl variant="link" />
      </div>
    </div>
  );
}

// the "Explore the directory" section directly below the hero: header,
// search bar with Filters, category pills, then a two-column layout — a
// dark info card on the left (moved below the results on mobile) and the
// live results on the right.
export function DirectorySection() {
  const { query, setQuery, appliedCategories, setCategoryFilter } = useDirectorySearch();

  // when someone arrives via a "/#directory" link from another page (the
  // footer's "Directory" link), Next.js shows the loading screen first and
  // tries to jump to #directory before this section exists — so it gives
  // up and leaves the page at the top. once the section is actually on the
  // page, finish that jump here.
  useEffect(() => {
    if (window.location.hash !== `#${DIRECTORY_SECTION_ID}`) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(DIRECTORY_SECTION_ID)?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="dsec" id={DIRECTORY_SECTION_ID} aria-labelledby="dsec-heading">
      <div className="container">
        <header className="dsec-header">
          <p className="dsec-eyebrow">
            <i className="fa-solid fa-diamond" aria-hidden="true" /> Explore the directory
          </p>
          <h2 id="dsec-heading" className="dsec-title">
            <span>Your next local favourite</span>
            <em>is closer than you think.</em>
          </h2>
        </header>

        {/* the same shared search text as the hero's bar. Enter does
            nothing extra here: results already filter live as you type. */}
        <form className="dsec-search" role="search" onSubmit={(event) => event.preventDefault()}>
          <i className="fa-solid fa-magnifying-glass dsec-search-icon" aria-hidden="true" />
          <input
            type="text"
            className="dsec-search-input"
            placeholder="Search a business, service or keyword"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search a business, service or keyword"
            enterKeyHint="search"
          />
          <FilterControl variant="button" />
        </form>

        {/* category pills: the same category filter the panel uses. a pill
            reads as active when its category is applied (the panel can
            apply several at once); "All listings" when none is. */}
        <div className="dsec-pills-wrap">
          <div className="dsec-pills" role="group" aria-label="Filter by category">
            <button
              type="button"
              className={`dsec-pill ${appliedCategories.length === 0 ? "dsec-pill--active" : ""}`}
              aria-pressed={appliedCategories.length === 0}
              onClick={() => setCategoryFilter(null)}
            >
              All listings
            </button>
            {CATEGORIES.map((category) => {
              const isActive = appliedCategories.includes(category.name);
              return (
                <button
                  key={category.slug}
                  type="button"
                  className={`dsec-pill ${isActive ? "dsec-pill--active" : ""}`}
                  aria-pressed={isActive}
                  onClick={() => setCategoryFilter(category.name)}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="dsec-layout">
          {/* results come first in the page order, so on a phone people
              see businesses before the info card; on desktop the grid puts
              the info card back in the left-hand column. */}
          <div className="dsec-results">
            <DirectoryResultsList />
          </div>

          <aside className="dsec-aside">
            <div className="dsec-info">
              {/* the Hidden Gems SA pin-and-gem mark: the main logo
                  (transparent background), framed so only its left-hand
                  pin shows — the wordmark's dark lettering wouldn't read on
                  this dark card. see .dsec-info-logo in globals.css. */}
              <span className="dsec-info-logo" aria-hidden="true">
                <Image
                  src="/HG_Logo.png"
                  alt=""
                  width={144}
                  height={64}
                  sizes="144px"
                />
              </span>
              <h3 className="dsec-info-title">Every community has businesses worth discovering.</h3>
              <p>
                Hidden Gems SA exists to shine a light on the local and independent
                businesses that make our communities special.
              </p>
              <p>
                From home bakers and tutors to mechanics, transport operators, creatives
                and family-run businesses, we&apos;re making it easier for people to
                discover what&apos;s already around them and support local.
              </p>
              <p>
                Because sometimes, the best businesses aren&apos;t the biggest ones.
                They&apos;re the hidden gems right next door.
              </p>
              <nav className="dsec-info-links" aria-label="Browse the directory">
                <Link href="/towns" className="dsec-info-link">
                  Explore by area <span aria-hidden="true">↗</span>
                </Link>
                <Link href="/categories" className="dsec-info-link">
                  See all categories <span aria-hidden="true">↗</span>
                </Link>
              </nav>
            </div>
            <p className="dsec-update">
              Already listed?{" "}
              <Link href="/edit">Update your business details ↗</Link>
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

// the result count, the (small) view toggle, and the results themselves.
function DirectoryResultsList() {
  const { businesses, filtered } = useDirectorySearch();

  // which of the three layouts is currently selected. starts as "grid2"
  // (the new card grid) so the very first server-rendered frame is
  // predictable — the effect below then swaps in whatever was actually
  // saved from a previous visit, once the page has loaded in the browser.
  const [view, setView] = useState("grid2");
  const [isMobile, setIsMobile] = useState(false); // whether the screen is currently narrow enough to hide the compact-grid option

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

  // the compact grid doesn't make sense on a narrow screen, so on mobile it
  // quietly falls back to the card grid instead — without touching the
  // actual saved preference.
  const effectiveView = view === "compact" && isMobile ? "grid2" : view;

  return (
    <>
      <div className="dsec-count-row">
        <p className="dsec-count">
          {businesses.length === 0
            ? "No approved listings yet — be the first!"
            : `${filtered.length} ${filtered.length === 1 ? "business" : "businesses"} to discover`}
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
              : <GemCard key={biz.id} biz={biz} compact={effectiveView === "compact"} />
          )}
        </div>
      ) : (
        <div className="listing-empty">
          <i className="fa-solid fa-magnifying-glass" />
          <p>
            {businesses.length === 0
              ? "No businesses listed yet."
              : "No matches. Try a different name, category, or filter."}
          </p>
        </div>
      )}
    </>
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

// a single business shown as a card — used for both the card grid and the
// compact grid, which differ only in size (via the "compact" flag). the
// whole card is one link to the business's own page.
function GemCard({ biz, compact }) {
  const initial = biz.name[0].toUpperCase();
  // some older records may store the area with extra text after it (like
  // "Estcourt, KwaZulu-Natal" instead of just "Estcourt") — only the part
  // before the first comma is the actual area name.
  const areaName = biz.area.split(",")[0].trim();

  return (
    <Link href={`/business/${biz.slug}`} className={`gem-card ${compact ? "gem-card--compact" : ""}`}>
      <div className="gem-card-banner">
        {biz.logo_url ? (
          <Image
            src={biz.logo_url}
            alt={`${biz.name} logo`}
            width={104}
            height={104}
            sizes="104px"
            className="gem-card-logo"
          />
        ) : (
          <div className="avatar-monogram gem-card-monogram" aria-hidden="true">{initial}</div>
        )}
      </div>

      <div className="gem-card-body">
        <p className="gem-card-meta">{biz.category} · {areaName}</p>
        <h3 className="gem-card-name">{biz.name}</h3>
        {biz.description && <p className="gem-card-desc">{biz.description}</p>}
        <BadgePills biz={biz} />
      </div>

      <div className="gem-card-footer">
        <span>Listed on Hidden Gems SA</span>
        <span className="gem-card-arrow" aria-hidden="true">↗</span>
      </div>
    </Link>
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
