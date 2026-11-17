// the share preview for a "category in area" page.
import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getCombo } from "@/lib/directory";
import { searchPhrase, plural } from "@/lib/seo";

export const alt = "Local businesses on Hidden Gems SA";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 3600;
export { generateStaticParams } from "./page";

export default async function Image({ params }) {
  const { slug, area } = await params;
  const combo = await getCombo(slug, area);
  if (!combo) return renderOg({ title: "Hidden Gems SA" });
  return renderOg({
    eyebrow: combo.area.name,
    title: `${searchPhrase(combo.category.name)} in ${combo.area.name}`,
    subtitle: `${plural(combo.businesses.length, "listing", "listings")} on Hidden Gems SA`,
  });
}
