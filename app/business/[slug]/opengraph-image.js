// the share preview for a business page: its logo (or initials), name,
// category and area.
import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getApprovedBusinesses, getArea, areaSlug } from "@/lib/directory";

export const alt = "A business listed on Hidden Gems SA";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 3600;
export { generateStaticParams } from "./page";

export default async function Image({ params }) {
  const { slug } = await params;
  const businesses = await getApprovedBusinesses();
  const biz = businesses.find((b) => b.slug === slug) ?? businesses.find((b) => b.slug === `${slug}-kwazulu-natal`);
  if (!biz) return renderOg({ title: "Hidden Gems SA" });
  const area = (await getArea(areaSlug(biz.area)))?.name ?? biz.area;
  return renderOg({
    eyebrow: "Listed on Hidden Gems SA",
    title: biz.name,
    subtitle: `${biz.category} in ${area}, ${biz.province}`,
    logoUrl: biz.logo_url,
    logoName: biz.name,
  });
}
