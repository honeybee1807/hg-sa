// the share preview for an area page.
import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getArea } from "@/lib/directory";
import { plural } from "@/lib/seo";

export const alt = "Local businesses on Hidden Gems SA";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 3600;
export { generateStaticParams } from "./page";

export default async function Image({ params }) {
  const { slug } = await params;
  const area = await getArea(slug);
  if (!area) return renderOg({ title: "Hidden Gems SA" });
  return renderOg({
    eyebrow: area.province ?? "South Africa",
    title: `Local businesses in ${area.name}`,
    subtitle: `${plural(area.businesses.length, "listing", "listings")} on Hidden Gems SA`,
  });
}
