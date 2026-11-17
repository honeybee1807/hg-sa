// the share preview for the homepage (and any page without its own).
import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getApprovedBusinesses, getAreas } from "@/lib/directory";

export const alt = "Hidden Gems SA, a free local business directory";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 3600;

export default async function Image() {
  const [businesses, areas] = await Promise.all([getApprovedBusinesses(), getAreas()]);
  return renderOg({
    eyebrow: "KwaZulu-Natal and beyond",
    title: "Find local businesses near you",
    subtitle: `${businesses.length} listings in ${areas.length} areas. Message them on WhatsApp.`,
  });
}
