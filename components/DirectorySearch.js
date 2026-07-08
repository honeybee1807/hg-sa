"use client";

// the live search/filter box shown on the homepage above the full business
// directory. everything here runs entirely in the browser — the full list
// of approved businesses is already loaded on the page, and this component
// just narrows down which ones are currently shown, based on whatever text
// someone has typed and which category/town tabs are selected. nothing is
// re-fetched from the database as someone types or filters.

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CATEGORIES, TOWNS } from "@/lib/constants";

// checks one business against the current search text, deciding whether it
// should stay in the results. returns true if the search box is empty (no
// filtering needed), or if the typed text shows up anywhere in the
// business's name, category, town, or description.
function businessMatchesSearchText(business, searchText) {
  if (!searchText) return true;

  const lowercaseName        = business.name.toLowerCase();
  const lowercaseCategory    = business.category.toLowerCase();
  const lowercaseTown        = business.town.toLowerCase();
  const lowercaseDescription = (business.description ?? "").toLowerCase();

  return (
    lowercaseName.includes(searchText) ||
    lowercaseCategory.includes(searchText) ||
    lowercaseTown.includes(searchText) ||
    lowercaseDescription.includes(searchText)
  );
}

export default function DirectorySearch({ businesses }) {
  const [query, setQuery] = useState("");         // whatever text is currently typed into the search box
  const [category, setCategory] = useState("All"); // which category tab is selected — "All" means no category filtering
  const [town, setTown] = useState("All");          // which town is selected in the dropdown — "All" means no town filtering

  // recalculates the filtered list of businesses whenever the full list,
  // the search text, the selected category, or the selected town changes.
  // "useMemo" just means this filtering work is skipped and the previous
  // result reused if none of those things have actually changed since the
  // last render.
  const filtered = useMemo(() => {
    const searchText = query.trim().toLowerCase();

    return businesses.filter((business) => {
      const matchesSearchText = businessMatchesSearchText(business, searchText);
      const matchesCategory   = category === "All" || business.category === category;

      // some older records store the town with extra text after it (like
      // "Estcourt, KwaZulu-Natal" instead of just "Estcourt"), so only the
      // part before the first comma is compared against the selected town.
      const townNameOnly  = business.town.split(",")[0].trim();
      const matchesTown    = town === "All" || townNameOnly === town;

      // a business only stays in the results if it satisfies all three
      // filters at once.
      return matchesSearchText && matchesCategory && matchesTown;
    });
  }, [businesses, query, category, town]);

  return (
    <div className="dir-search">
      <div className="dir-search-controls">
        <div className="dir-search-input-wrap">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            type="text"
            className="dir-search-input"
            placeholder="Search by name, category, town..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search the directory"
          />
        </div>

        <select
          className="dir-search-town-select"
          value={town}
          onChange={(e) => setTown(e.target.value)}
          aria-label="Filter by town"
        >
          <option value="All">All Towns</option>
          {TOWNS.map((t) => (
            <option key={t} value={t}>{t}</option>
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
              : "No businesses match your search. Try a different name, category, or town."}
          </p>
        </div>
      )}
    </div>
  );
}

function DirectoryCard({ biz }) {
  const initial = biz.name[0].toUpperCase();
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
          <span><i className="fa-solid fa-location-dot" /> {biz.town.split(",")[0]}</span>
        </p>
        {biz.description && <p className="listing-card-desc">{biz.description}</p>}
      </div>
      <i className="fa-solid fa-chevron-right listing-card-arrow" />
    </Link>
  );
}
