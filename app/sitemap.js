import supabase from "@/lib/supabase";
import { CATEGORIES, TOWNS, SITE_URL } from "@/lib/constants";

// regenerates daily so newly approved businesses appear in the sitemap quickly
export const revalidate = 86400;

export default async function sitemap() {
  // fetch only what we need — slug and update timestamp
  const { data: businesses } = await supabase
    .from("businesses")
    .select("slug, updated_at")
    .eq("status", "approved")
    .not("slug", "is", null);

  const now = new Date();

  const staticPages = [
    { url: SITE_URL,                   lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${SITE_URL}/towns`,        lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${SITE_URL}/categories`,   lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${SITE_URL}/submit`,       lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const townPages = TOWNS.map((town) => ({
    url: `${SITE_URL}/town/${town.toLowerCase().replace(/\s+/g, "-")}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const categoryPages = CATEGORIES.map((cat) => ({
    url: `${SITE_URL}/category/${cat.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const businessPages = (businesses ?? []).map((b) => ({
    url: `${SITE_URL}/business/${b.slug}`,
    lastModified: b.updated_at ? new Date(b.updated_at) : now,
    changeFrequency: "monthly",
    priority: 0.9,
  }));

  return [...staticPages, ...townPages, ...categoryPages, ...businessPages];
}
