// this file automatically creates the page at hiddengemssa.co.za/sitemap.xml
// — a list of every page on the site, handed to search engines so they know
// what exists and how important/how-often-changing each page is.

import supabase from "@/lib/supabase";
import { CATEGORIES, SITE_URL } from "@/lib/constants";

// rebuild this list once a day at most, so a newly approved business shows
// up here (and can start getting found by Google) without a long wait.
export const revalidate = 86400; // 86400 seconds = 24 hours

export default async function sitemap() {
  // get every approved business's web address (slug), the date it was last
  // changed, and its area (used below to work out which area pages exist).
  // we deliberately only ask for these fields, not the whole business
  // record — the sitemap doesn't need anything else.
  const { data: businesses } = await supabase
    .from("businesses")
    .select("slug, updated_at, area")
    .eq("status", "approved")
    .not("slug", "is", null);

  const today = new Date();

  // the handful of pages that always exist, regardless of what's in the
  // database. "priority" is a hint (0 to 1) about how important a page is
  // relative to the others; "changeFrequency" hints how often it changes.
  const staticPages = [
    { url: SITE_URL,                   lastModified: today, changeFrequency: "daily",   priority: 1.0 },
    { url: `${SITE_URL}/towns`,        lastModified: today, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${SITE_URL}/categories`,   lastModified: today, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${SITE_URL}/submit`,       lastModified: today, changeFrequency: "monthly", priority: 0.5 },
  ];

  // one sitemap entry per area page, e.g. hiddengemssa.co.za/town/umhlanga —
  // areas aren't a fixed list anymore (see lib/constants.js), so this asks
  // the database for every distinct area that currently has an approved
  // business instead of looping over a constant.
  const distinctAreaSlugs = new Set(
    (businesses ?? [])
      .map((business) => business.area?.split(",")[0]?.trim())
      .filter(Boolean)
      .map((areaName) => areaName.toLowerCase().replace(/\s+/g, "-"))
  );
  const townPages = [...distinctAreaSlugs].map((areaSlug) => ({
    url: `${SITE_URL}/town/${areaSlug}`,
    lastModified: today,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // one sitemap entry per category page, e.g. .../category/baking-catering
  const categoryPages = CATEGORIES.map((category) => ({
    url: `${SITE_URL}/category/${category.slug}`,
    lastModified: today,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // one sitemap entry per approved business, e.g. .../business/some-bakery
  const businessPages = (businesses ?? []).map((business) => {
    // use the business's own "last updated" date if we have one, otherwise
    // just fall back to today's date.
    const lastModifiedDate = business.updated_at ? new Date(business.updated_at) : today;
    return {
      url: `${SITE_URL}/business/${business.slug}`,
      lastModified: lastModifiedDate,
      changeFrequency: "monthly",
      priority: 0.9,
    };
  });

  // combine everything into one single list — this is what actually becomes
  // the sitemap.xml file.
  return [...staticPages, ...townPages, ...categoryPages, ...businessPages];
}
