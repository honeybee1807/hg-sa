// this is the page at hiddengemssa.co.za/towns — the "browse by area" hub.
// unlike the category list, areas are no longer a fixed set picked ahead of
// time — anyone can submit a business from anywhere in South Africa (see
// app/submit/SubmitForm.js), so this page is built from whatever distinct
// areas actually have an approved business right now, discovered fresh from
// the database rather than looped from a constant.

import Link from "next/link";
import { SITE_URL } from "@/lib/constants";
import supabase from "@/lib/supabase";

export const metadata = {
  title: "Browse by Area — South African Local Businesses",
  description: "Find local South African businesses by area, suburb, or town.",
  alternates: { canonical: `${SITE_URL}/towns` },
};

export const revalidate = 3600;

// finds every distinct area with at least one approved business, how many
// businesses are in it, and which province it's in — returns an array like
// [{ area: "Umhlanga", province: "KwaZulu-Natal", count: 3 }, ...],
// sorted alphabetically by area name.
async function getAreaSummaries() {
  const { data: approvedBusinesses } = await supabase
    .from("businesses")
    .select("area, province")
    .eq("status", "approved");

  if (!approvedBusinesses) return [];

  // tally businesses per area, remembering that area's province along the
  // way. some older records may store the area with extra text after it
  // (like "Estcourt, KwaZulu-Natal"), so only the part before the first
  // comma is used as the grouping key.
  const summaryByArea = new Map();
  for (const business of approvedBusinesses) {
    const areaNameOnly = business.area?.split(",")[0]?.trim();
    if (!areaNameOnly) continue;

    const existing = summaryByArea.get(areaNameOnly);
    if (existing) {
      existing.count += 1;
    } else {
      summaryByArea.set(areaNameOnly, { province: business.province, count: 1 });
    }
  }

  return [...summaryByArea.entries()]
    .map(([area, { province, count }]) => ({ area, province, count }))
    .sort((a, b) => a.area.localeCompare(b.area));
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home",  item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Areas", item: `${SITE_URL}/towns` },
  ],
};

export default async function TownsPage() {
  const areaSummaries = await getAreaSummaries();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h1>Browse by Area</h1>
            <p>
              {areaSummaries.length > 0
                ? "Discover local businesses across South Africa."
                : "No areas listed yet — be the first to list your business."}
            </p>
          </div>

          <div className="hub-grid">
            {areaSummaries.map(({ area, province, count }) => {
              const slug = area.toLowerCase().replace(/\s+/g, "-");
              return (
                <Link key={area} href={`/town/${slug}`} className="hub-card">
                  <div className="hub-card-icon">
                    <i className="fa-solid fa-location-dot" />
                  </div>
                  <div className="hub-card-body">
                    <span className="hub-card-name">{area}, {province}</span>
                    <span className="hub-card-count">
                      {count} {count === 1 ? "business" : "businesses"}
                    </span>
                  </div>
                  <i className="fa-solid fa-chevron-right hub-card-arrow" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
