import Link from "next/link";
import { TOWNS, SITE_URL } from "@/lib/constants";
import supabase from "@/lib/supabase";

export const metadata = {
  title: "Browse by Town — KwaZulu-Natal Local Businesses",
  description: "Find local businesses in KwaZulu-Natal towns — Ladysmith, Pietermaritzburg, Dundee, Harrismith and more.",
  alternates: { canonical: `${SITE_URL}/towns` },
};

export const revalidate = 3600;

async function getCountsByTown() {
  const { data } = await supabase
    .from("businesses")
    .select("town")
    .eq("status", "approved");
  if (!data) return {};
  return data.reduce((acc, b) => {
    const key = b.town.split(",")[0].trim();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
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
