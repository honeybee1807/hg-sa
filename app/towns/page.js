// this is the page at hiddengemssa.co.za/towns — the "browse by town" hub,
// showing all 12 towns as clickable cards with a live count of how many
// approved businesses are in each one.

import Link from "next/link";
import { TOWNS, SITE_URL } from "@/lib/constants";
import supabase from "@/lib/supabase";

export const metadata = {
  title: "Browse by Town — KwaZulu-Natal Local Businesses",
  description: "Find local businesses in KwaZulu-Natal towns — Ladysmith, Pietermaritzburg, Dundee, Harrismith and more.",
  alternates: { canonical: `${SITE_URL}/towns` },
};

export const revalidate = 3600;

// counts how many approved businesses are in each town, so each card can
// show something like "8 businesses". returns an object that looks like
// { "Ladysmith": 8, "Estcourt": 3, ... }.
async function getCountsByTown() {
  const { data: approvedBusinesses } = await supabase
    .from("businesses")
    .select("town")
    .eq("status", "approved");

  if (!approvedBusinesses) return {};

  // start with an empty tally, then go through every approved business one
  // at a time, adding 1 to that business's town count. some older records
  // store the town with extra text after it (like "Estcourt, KwaZulu-
  // Natal"), so only the part before the first comma is used.
  const countByTown = {};
  for (const business of approvedBusinesses) {
    const townNameOnly = business.town.split(",")[0].trim();
    const currentCount = countByTown[townNameOnly] ?? 0;
    countByTown[townNameOnly] = currentCount + 1;
  }
  return countByTown;
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home",  item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Towns", item: `${SITE_URL}/towns` },
  ],
};

export default async function TownsPage() {
  const counts = await getCountsByTown();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h1>Browse by Town</h1>
            <p>Discover local businesses across KwaZulu-Natal.</p>
          </div>

          <div className="hub-grid">
            {TOWNS.map((town) => {
              const slug = town.toLowerCase().replace(/\s+/g, "-");
              const count = counts[town] ?? 0;
              return (
                <Link key={town} href={`/town/${slug}`} className="hub-card">
                  <div className="hub-card-icon">
                    <i className="fa-solid fa-location-dot" />
                  </div>
                  <div className="hub-card-body">
                    <span className="hub-card-name">{town}</span>
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
