// the page at hiddengemssa.co.za/towns: every area that currently has an
// approved listing, with a live count. areas aren't a fixed list; they come
// from the listings themselves (see lib/directory.js).

import Link from "next/link";
import { getAreas } from "@/lib/directory";
import { breadcrumbList, JsonLd, plural } from "@/lib/seo";
import Breadcrumbs from "@/components/Breadcrumbs";

export const revalidate = 3600;

export const metadata = {
  title: "Local Businesses by Town and Area",
  description:
    "Find local businesses by town or suburb on Hidden Gems SA, mostly in KwaZulu-Natal. See how many are listed in each area and browse them for free.",
  alternates: { canonical: "/towns" },
};

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Areas", path: "/towns" },
];

export default async function TownsPage() {
  const areas = await getAreas();
  const total = areas.reduce((sum, a) => sum + a.businesses.length, 0);
  const provinces = new Set(areas.map((a) => a.province).filter(Boolean));

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...breadcrumbList(crumbs) }} />

      <div className="container section-sm">
        <Breadcrumbs items={crumbs} />
      </div>

      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container">
          <div className="section-header">
            <h1>Browse by area</h1>
            <p className="page-intro">
              {areas.length > 0
                ? `${plural(total, "business", "businesses")} listed in ${plural(areas.length, "area", "areas")} across ${plural(provinces.size, "province", "provinces")}. Pick your town to see what's nearby.`
                : "No areas are listed yet. List your business and yours will be the first."}
            </p>
          </div>

          <div className="hub-grid">
            {areas.map((area) => (
              <Link key={area.slug} href={`/town/${area.slug}`} className="hub-card">
                <div className="hub-card-icon">
                  <i className="fa-solid fa-location-dot" aria-hidden="true" />
                </div>
                <div className="hub-card-body">
                  <span className="hub-card-name">{area.name}, {area.province}</span>
                  <span className="hub-card-count">{plural(area.businesses.length, "business", "businesses")}</span>
                </div>
                <i className="fa-solid fa-chevron-right hub-card-arrow" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
