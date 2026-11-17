"use client";

// the listings table (a real table on wide cards, stacked cards on narrow
// ones — see .adm-table in admin.css) and the "Business listings" page
// around it: status tabs with live counts, search, category and area
// filters, and the sort order (pending oldest first, everything else
// newest first).

import { useState } from "react";
import { CATEGORIES } from "@/lib/constants";
import { BizLogo, StatusPill, EmptyState, When, categoryLabel } from "./ui";

const byOldest = (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
const byNewest = (a, b) => -byOldest(a, b);

// pending listings, oldest first, so nothing waits forever.
export function sortForStatus(rows, status) {
  return [...rows].sort(status === "pending" ? byOldest : byNewest);
}

// area values are free text, so "DURBAN" and "Durban" are grouped for
// filtering only — nothing stored is ever changed.
const areaKey = (area) => (area ?? "").trim().toLowerCase();

export function ListingsTable({ rows, onReview }) {
  return (
    <div className="adm-table" role="table" aria-label="Business listings">
      <div className="adm-tr adm-tr--head" role="row">
        <span role="columnheader">Business</span>
        <span role="columnheader">Area</span>
        <span role="columnheader">Status</span>
        <span role="columnheader">Submitted</span>
        <span role="columnheader" className="adm-visually-hidden">Action</span>
      </div>
      {rows.map((biz) => (
        <div key={biz.id} className="adm-tr" role="row">
          <span className="adm-td adm-td--biz" role="cell">
            <BizLogo biz={biz} size={44} />
            <span className="adm-td-biz-text">
              <span className="adm-td-name">{biz.name}</span>
              <span className="adm-td-cat">{categoryLabel(biz)}</span>
            </span>
          </span>
          <span className="adm-td adm-td--area" role="cell">
            <i className="fa-solid fa-location-dot adm-area-pin" aria-hidden="true" />{biz.area}
          </span>
          <span className="adm-td adm-td--status" role="cell"><StatusPill status={biz.status} /></span>
          <span className="adm-td adm-td--date" role="cell">
            <span className="adm-date-prefix">Submitted </span><When value={biz.created_at} />
          </span>
          <span className="adm-td adm-td--actions" role="cell">
            <button type="button" className="adm-btn adm-btn--sm adm-btn--review" onClick={() => onReview(biz.id)}>
              {biz.status === "pending" ? "Review" : "View"}
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { id: "pending",  label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all",      label: "All listings" },
];

export default function ListingsView({ businesses, status, onStatusChange, onReview }) {
  const [query, setQuery]       = useState("");
  const [category, setCategory] = useState("");
  const [area, setArea]         = useState("");

  const counts = {
    all: businesses.length,
    pending: businesses.filter((b) => b.status === "pending").length,
    approved: businesses.filter((b) => b.status === "approved").length,
    rejected: businesses.filter((b) => b.status === "rejected").length,
  };

  // distinct areas, grouped case-insensitively. the label shown is the
  // spelling used most often for that area.
  const areaOptions = (() => {
    const groups = new Map();
    for (const b of businesses) {
      const key = areaKey(b.area);
      if (!key) continue;
      const spellings = groups.get(key) ?? new Map();
      const label = b.area.trim();
      spellings.set(label, (spellings.get(label) ?? 0) + 1);
      groups.set(key, spellings);
    }
    return [...groups.entries()]
      .map(([key, spellings]) => ({ key, label: [...spellings.entries()].sort((a, b) => b[1] - a[1])[0][0] }))
      .sort((a, b) => a.label.localeCompare(b.label));
  })();

  const q = query.trim().toLowerCase();
  const rows = sortForStatus(
    businesses
      .filter((b) => status === "all" || b.status === status)
      .filter((b) => !category || b.category === category)
      .filter((b) => !area || areaKey(b.area) === area)
      .filter((b) => !q ||
        b.name?.toLowerCase().includes(q) ||
        b.area?.toLowerCase().includes(q) ||
        b.owner_name?.toLowerCase().includes(q)),
    status,
  );

  const filtersActive = q || category || area;

  return (
    <section className="adm-card adm-card--flush">
      <div className="adm-card-head adm-card-head--pad">
        <div>
          <h2 className="adm-card-title">Moderation queue</h2>
          <p className="adm-card-sub">
            {status === "pending" ? "Oldest submissions first, so nothing waits forever." : "Newest first."}
          </p>
        </div>
      </div>

      <div className="adm-toolbar">
        <div className="adm-filters" role="tablist" aria-label="Filter by status">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={status === id}
              className={`adm-filter ${status === id ? "is-active" : ""}`}
              onClick={() => onStatusChange(id)}
            >
              {label}
              <span className="adm-filter-count">{counts[id]}</span>
            </button>
          ))}
        </div>

        <div className="adm-filter-row">
          <div className="adm-search adm-filter-search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input
              type="search"
              className="adm-input"
              placeholder="Search businesses or areas"
              aria-label="Search by business name, area or owner name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className="adm-input adm-select" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}
          </select>
          <select className="adm-input adm-select" aria-label="Filter by area" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">All areas</option>
            {areaOptions.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
          <button
            type="button"
            className="adm-link-btn"
            onClick={() => { setQuery(""); setCategory(""); setArea(""); }}
            disabled={!filtersActive}
          >
            Clear
          </button>
        </div>
        <p className="adm-count-line" aria-live="polite">
          {rows.length} listing{rows.length === 1 ? "" : "s"} in this view
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={status === "pending" && !filtersActive ? "fa-mug-hot" : "fa-inbox"}
          title={filtersActive ? "No listings match these filters." : status === "pending" ? "You're all caught up." : `No ${status === "all" ? "" : status} listings yet.`}
        >
          {status === "pending" && !filtersActive ? "No listings are waiting for review." : null}
        </EmptyState>
      ) : (
        <ListingsTable rows={rows} onReview={onReview} />
      )}
    </section>
  );
}
