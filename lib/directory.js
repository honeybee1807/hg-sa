// the shared, read-only view of the directory that every public page is
// built from: one query for all approved businesses, then the areas,
// categories and "category in area" groupings worked out from that list.
//
// getApprovedBusinesses() is wrapped in React's cache(), so a page and its
// generateMetadata() (and the footer, in the same render) share one
// database read instead of each making their own.
//
// nothing here ever changes stored data. area names are free text, so they
// are grouped for display and URLs only: "DURBAN" and "Durban" become one
// /town/durban page, but each business keeps exactly what was submitted.

import { cache } from "react";
import supabase from "@/lib/supabase";
import { CATEGORIES } from "@/lib/constants";

const BUSINESS_FIELDS =
  "id, name, category, custom_category, business_type, area, province, logo_url, slug, description, business_detail, website, whatsapp, instagram, facebook, street_address, halal, halal_certificate, delivery_available, callouts_available, updated_at";

export const getApprovedBusinesses = cache(async () => {
  const { data } = await supabase
    .from("businesses")
    .select(BUSINESS_FIELDS)
    .eq("status", "approved")
    .not("slug", "is", null)
    .order("name");
  return data ?? [];
});

// "Estcourt, KwaZulu-Natal" -> "Estcourt". only the part before the first
// comma is the area name (some older records include the province too).
export function areaName(area) {
  return (area ?? "").split(",")[0].trim();
}

// the URL version of an area. lowercase with spaces as dashes, which is the
// same rule the admin actions use when they refresh a town page, so normal
// names ("Mooi River" -> "mooi-river") produce identical URLs. anything that
// can't appear in a clean URL ("/", "&", brackets) is dropped.
export function areaSlug(area) {
  return areaName(area)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function categoryBySlug(slug) {
  return CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function categoryByName(name) {
  return CATEGORIES.find((c) => c.name === name) ?? null;
}

// picks the spelling to show for an area that's been typed several ways:
// the most common one, preferring one that isn't written in all capitals.
function pickDisplayName(spellings) {
  return [...spellings.entries()]
    .sort((a, b) => {
      const aCaps = a[0] === a[0].toUpperCase() ? 1 : 0;
      const bCaps = b[0] === b[0].toUpperCase() ? 1 : 0;
      return aCaps - bCaps || b[1] - a[1] || a[0].localeCompare(b[0]);
    })[0][0];
}

function mostCommon(values) {
  const counts = new Map();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

// every area with at least one approved business:
// [{ slug, name, province, businesses: [...] }], sorted by name.
export const getAreas = cache(async () => {
  const businesses = await getApprovedBusinesses();
  const groups = new Map();
  for (const biz of businesses) {
    const slug = areaSlug(biz.area);
    if (!slug) continue;
    const group = groups.get(slug) ?? { slug, spellings: new Map(), provinces: [], businesses: [] };
    const name = areaName(biz.area);
    group.spellings.set(name, (group.spellings.get(name) ?? 0) + 1);
    group.provinces.push(biz.province);
    group.businesses.push(biz);
    groups.set(slug, group);
  }
  return [...groups.values()]
    .map((g) => ({
      slug: g.slug,
      name: pickDisplayName(g.spellings),
      province: mostCommon(g.provinces),
      businesses: g.businesses,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

export async function getArea(slug) {
  const areas = await getAreas();
  return areas.find((a) => a.slug === slug) ?? null;
}

// every category from lib/constants.js, with its approved businesses
// (empty categories included, with businesses: []).
export const getCategories = cache(async () => {
  const businesses = await getApprovedBusinesses();
  return CATEGORIES.map((cat) => ({
    ...cat,
    businesses: businesses.filter((b) => b.category === cat.name),
  }));
});

// every "category in area" combination that has at least one listing.
export const getCombos = cache(async () => {
  const areas = await getAreas();
  const combos = [];
  for (const area of areas) {
    for (const cat of CATEGORIES) {
      const businesses = area.businesses.filter((b) => b.category === cat.name);
      if (businesses.length > 0) combos.push({ category: cat, area, businesses });
    }
  }
  return combos;
});

export async function getCombo(categorySlug, areaSlugValue) {
  const combos = await getCombos();
  return combos.find((c) => c.category.slug === categorySlug && c.area.slug === areaSlugValue) ?? null;
}

// the newest "last updated" date among a set of businesses, for sitemaps.
export function latestUpdate(businesses) {
  let latest = null;
  for (const b of businesses) {
    if (b.updated_at && (!latest || b.updated_at > latest)) latest = b.updated_at;
  }
  return latest ? new Date(latest) : null;
}
