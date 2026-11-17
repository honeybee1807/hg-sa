// the share preview for a category page.
import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getCategories } from "@/lib/directory";
import { searchPhrase, plural } from "@/lib/seo";

export const alt = "Category on Hidden Gems SA";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 3600;
export { generateStaticParams } from "./page";

export default async function Image({ params }) {
  const { slug } = await params;
  const cat = (await getCategories()).find((c) => c.slug === slug);
  if (!cat) return renderOg({ title: "Hidden Gems SA" });
  const count = cat.businesses.length;
  return renderOg({
    eyebrow: "Category",
    title: searchPhrase(cat.name),
    subtitle: count ? `${plural(count, "local business", "local businesses")} listed on Hidden Gems SA` : "Free to list. Be the first.",
  });
}
