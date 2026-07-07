"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CATEGORIES } from "@/lib/constants";

export default function DirectorySearch({ businesses }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [town, setTown] = useState("All");

  const towns = useMemo(() => {
    const set = new Set(businesses.map((b) => b.town.split(",")[0].trim()));
    return Array.from(set).sort();
  }, [businesses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return businesses.filter((biz) => {
      const matchesQuery =
        !q ||
        biz.name.toLowerCase().includes(q) ||
        biz.category.toLowerCase().includes(q) ||
        biz.town.toLowerCase().includes(q) ||
        (biz.description ?? "").toLowerCase().includes(q);
      const matchesCategory = category === "All" || biz.category === category;
      const matchesTown = town === "All" || biz.town.split(",")[0].trim() === town;
      return matchesQuery && matchesCategory && matchesTown;
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
          {towns.map((t) => (
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
