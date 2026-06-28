import Link from "next/link";
import { CATEGORIES, SITE_URL } from "@/lib/constants";
import supabase from "@/lib/supabase";

export const metadata = {
  title: "Browse by Category — KwaZulu-Natal Local Businesses",
  description: "Find bakers, tutors, transport, beauty, trades and more local KZN businesses by category.",
  alternates: { canonical: `${SITE_URL}/categories` },
};

export const revalidate = 3600;

async function getCountsByCategory() {
  const { data } = await supabase
    .from("businesses")
    .select("category")
    .eq("status", "approved");
  if (!data) return {};
  return data.reduce((acc, b) => {
    acc[b.category] = (acc[b.category] ?? 0) + 1;
    return acc;
  }, {});
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
            <p>Find exactly the local business you need.</p>
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
