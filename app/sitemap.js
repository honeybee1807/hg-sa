// hiddengemssa.co.za/sitemap.xml: every page search engines should index,
// built from live data.
//
// what's in it: the homepage and hub pages, every category and area with at
// least one listing, every "category in area" page, every approved
// business, the blog and its published posts, and the disclaimer. empty
// categories (which are noindex), the edit pages and the admin are left
// out on purpose.
//
// "lastModified" uses real dates where the data has them (a business's
// updated_at, a post's updated_at); a group page uses the newest date of
// the listings on it. pages with no date of their own leave it out rather
// than claiming they changed today.

import supabase from "@/lib/supabase";
import { SITE_URL } from "@/lib/constants";
import { getApprovedBusinesses, getAreas, getCategories, getCombos, latestUpdate } from "@/lib/directory";

// rebuilt at most once an hour.
export const revalidate = 3600;

function entry(path, lastModified, changeFrequency, priority) {
  return {
    url: `${SITE_URL}${path}`,
    ...(lastModified && { lastModified }),
    changeFrequency,
    priority,
  };
}

export default async function sitemap() {
  const [businesses, areas, categories, combos, { data: posts }] = await Promise.all([
    getApprovedBusinesses(),
    getAreas(),
    getCategories(),
    getCombos(),
    supabase.from("blog_posts").select("slug, updated_at, created_at").eq("published", true),
  ]);

  const newestListing = latestUpdate(businesses);
  const newestPost = (posts ?? [])
    .map((p) => p.updated_at ?? p.created_at)
    .filter(Boolean)
    .sort()
    .pop();

  return [
    entry("/", newestListing, "daily", 1.0),
    entry("/categories", newestListing, "weekly", 0.8),
    entry("/towns", newestListing, "weekly", 0.8),
    entry("/submit", null, "monthly", 0.5),
    entry("/blog", newestPost ? new Date(newestPost) : null, "weekly", 0.5),
    entry("/disclaimer", null, "yearly", 0.2),

    ...categories
      .filter((c) => c.businesses.length > 0)
      .map((c) => entry(`/category/${c.slug}`, latestUpdate(c.businesses), "weekly", 0.8)),

    ...areas.map((a) => entry(`/town/${a.slug}`, latestUpdate(a.businesses), "weekly", 0.7)),

    ...combos.map((c) =>
      entry(`/category/${c.category.slug}/${c.area.slug}`, latestUpdate(c.businesses), "weekly", 0.7)
    ),

    ...businesses.map((b) => entry(`/business/${b.slug}`, b.updated_at ? new Date(b.updated_at) : null, "monthly", 0.9)),

    ...(posts ?? []).map((p) => {
      const date = p.updated_at ?? p.created_at;
      return entry(`/blog/${p.slug}`, date ? new Date(date) : null, "monthly", 0.6);
    }),
  ];
}
