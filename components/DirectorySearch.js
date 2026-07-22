"use client";

// the live search/filter box shown on the homepage above the full business
// directory. everything here runs entirely in the browser — the full list
// of approved businesses is already loaded on the page, and this component
// just narrows down which ones are currently shown, based on whatever text
// someone has typed and which category tab / province is selected. nothing
// is re-fetched from the database as someone types or filters.

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CATEGORIES, PROVINCES } from "@/lib/constants";

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

export default function DirectorySearch({ businesses }) {
  const [query, setQuery] = useState("");         // whatever text is currently typed into the search box
  const [category, setCategory] = useState("All"); // which category tab is selected — "All" means no category filtering
  const [province, setProvince] = useState("All");  // which province is selected in the dropdown — "All" means no province filtering

  // recalculates the filtered list of businesses whenever the full list,
  // the search text, the selected category, or the selected province
  // changes. "useMemo" just means this filtering work is skipped and the
  // previous result reused if none of those things have actually changed
  // since the last render.
  const filtered = useMemo(() => {
    const searchText = query.trim().toLowerCase();

    return businesses.filter((business) => {
      const matchesSearchText = businessMatchesSearchText(business, searchText);
      const matchesCategory   = category === "All" || business.category === category;
      const matchesProvince   = province === "All" || business.province === province;

      // a business only stays in the results if it satisfies all three
      // filters at once.
      return matchesSearchText && matchesCategory && matchesProvince;
    });
  }, [businesses, query, category, province]);

  return (
    <div className="dir-search">
      <div className="dir-search-controls">
        <div className="dir-search-input-wrap">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            type="text"
            className="dir-search-input"
            placeholder="Search by name, category, area..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search the directory"
          />
        </div>

        <select
          className="dir-search-town-select"
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          aria-label="Filter by province"
        >
          <option value="All">All Provinces</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="dir-search-tabs" role="tablist" aria-label="Filter by category">
        <button
          type="button"
          role="tab"
          aria-selected={category === "All"}
          className={`dir-search-tab ${category === "All" ? "dir-search-tab--active" : ""}`}
          onClick={() => setCategory("All")}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            type="button"
            role="tab"
            aria-selected={category === c.name}
            key={c.slug}
            className={`dir-search-tab ${category === c.name ? "dir-search-tab--active" : ""}`}
            onClick={() => setCategory(c.name)}
          >
            <i className={c.icon} aria-hidden="true" /> {c.name}
          </button>
        ))}
      </div>

      <p className="dir-search-count">
        {businesses.length === 0
          ? "No approved listings yet — be the first!"
          : `${filtered.length} ${filtered.length === 1 ? "business" : "businesses"} found`}
      </p>

      {filtered.length > 0 ? (
        <div className="listing-grid">
          {filtered.map((biz) => (
            <DirectoryCard key={biz.id} biz={biz} />
          ))}
        </div>
      ) : (
        <div className="listing-empty">
          <i className="fa-solid fa-magnifying-glass" />
          <p>
            {businesses.length === 0
              ? "No businesses listed yet."
              : "No businesses match your search. Try a different name, category, or province."}
          </p>
        </div>
      )}
    </div>
  );
}

function DirectoryCard({ biz }) {
  const initial = biz.name[0].toUpperCase();
  // some older records may store the area with extra text after it (like
  // "Estcourt, KwaZulu-Natal" instead of just "Estcourt") — only the part
  // before the first comma is the actual area name.
  const areaName = biz.area.split(",")[0].trim();
  return (
    <Link href={`/business/${biz.slug}`} className="listing-card">
      <div className="listing-card-logo">
        {biz.logo_url ? (
          <Image src={biz.logo_url} alt={`${biz.name} logo`} width={56} height={56} className="avatar" />
        ) : (
          <div className="avatar-monogram">{initial}</div>
        )}
      </div>
      <div className="listing-card-body">
        <h3 className="listing-card-name">{biz.name}</h3>
        <p className="listing-card-meta">
          <span><i className="fa-solid fa-tag" /> {biz.category}</span>
          <span><i className="fa-solid fa-location-dot" /> {areaName}, {biz.province}</span>
        </p>
        {biz.description && <p className="listing-card-desc">{biz.description}</p>}
      </div>
      <i className="fa-solid fa-chevron-right listing-card-arrow" />
    </Link>
  );
}
