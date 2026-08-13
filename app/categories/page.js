// this is the page at hiddengemssa.co.za/categories — the "browse by
// category" hub, showing all 14 categories as clickable cards with a
// live count of how many approved businesses are in each one.

import Link from "next/link";
import { CATEGORIES, SITE_URL } from "@/lib/constants";
import supabase from "@/lib/supabase";

export const metadata = {
  title: "Browse by Category — KwaZulu-Natal Local Businesses",
  description: "Find local KwaZulu-Natal businesses by category — bakers, tutors, transport, trades and more.",
  alternates: { canonical: `${SITE_URL}/categories` },
};

export const revalidate = 3600;

// counts how many approved businesses are in each category, so each card
// can show something like "12 businesses". returns an object that looks
// like { "Baking & Catering": 12, "Beauty & Hair": 4, ... }.
async function getCountsByCategory() {
  const { data: approvedBusinesses } = await supabase
    .from("businesses")
    .select("category")
    .eq("status", "approved");

  if (!approvedBusinesses) return {};

  // start with an empty tally, then go through every approved business one
  // at a time, adding 1 to that business's category count.
  const countByCategory = {};
  for (const business of approvedBusinesses) {
    const currentCount = countByCategory[business.category] ?? 0;
    countByCategory[business.category] = currentCount + 1;
  }
  return countByCategory;
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home",       item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Categories", item: `${SITE_URL}/categories` },
  ],
};

export default async function CategoriesPage() {
  const counts = await getCountsByCategory();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h1>Browse by Category</h1>
            <p>Find the local business you need.</p>
          </div>

          <div className="hub-grid">
            {CATEGORIES.map((cat) => {
              const count = counts[cat.name] ?? 0;
              return (
                <Link key={cat.slug} href={`/category/${cat.slug}`} className="hub-card">
                  <div className="hub-card-icon">
                    <i className={cat.icon} />
                  </div>
                  <div className="hub-card-body">
                    <span className="hub-card-name">{cat.name}</span>
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
