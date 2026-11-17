// the page at hiddengemssa.co.za/categories: every category with a live
// count of approved listings. categories with listings link to their own
// page; empty ones are shown (so people know they exist) but not linked,
// since their pages aren't indexed until the first listing arrives.

import Link from "next/link";
import { SITE_WHATSAPP } from "@/lib/constants";
import { getCategories, getApprovedBusinesses } from "@/lib/directory";
import { searchPhraseLower, listToSentence, breadcrumbList, JsonLd, plural } from "@/lib/seo";
import Breadcrumbs from "@/components/Breadcrumbs";

export const revalidate = 3600;

export const metadata = {
  title: "Browse Local Businesses by Category",
  description:
    "Browse local businesses by category on Hidden Gems SA: bakers and caterers, tutors, hair and beauty, trades, transport and more. Free to browse.",
  alternates: { canonical: "/categories" },
};

const requestCategoryUrl = `https://wa.me/${SITE_WHATSAPP}?text=${encodeURIComponent(
  "Hi! I'd like to request a new category for Hidden Gems SA: "
)}`;

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Categories", path: "/categories" },
];

export default async function CategoriesPage() {
  const [categories, businesses] = await Promise.all([getCategories(), getApprovedBusinesses()]);
  const withListings = categories.filter((c) => c.businesses.length > 0);
  const busiest = [...withListings].sort((a, b) => b.businesses.length - a.businesses.length).slice(0, 3);

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...breadcrumbList(crumbs) }} />

      <div className="container section-sm">
        <Breadcrumbs items={crumbs} />
      </div>

      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container">
          <div className="section-header">
            <h1>Browse by category</h1>
            <p className="page-intro">
              {plural(businesses.length, "business", "businesses")} across {plural(withListings.length, "category", "categories")}
              {busiest.length > 0 && `, with the most listed under ${listToSentence(busiest.map((c) => searchPhraseLower(c.name)))}`}.
              {" "}Pick a category to see who&apos;s listed and where.
            </p>
          </div>

          <div className="hub-grid">
            {categories.map((cat) => {
              const count = cat.businesses.length;
              const body = (
                <>
                  <div className="hub-card-icon">
                    <i className={cat.icon} aria-hidden="true" />
                  </div>
                  <div className="hub-card-body">
                    <span className="hub-card-name">{cat.name}</span>
                    <span className="hub-card-count">{count ? plural(count, "business", "businesses") : "None listed yet"}</span>
                  </div>
                </>
              );
              return count > 0 ? (
                <Link key={cat.slug} href={`/category/${cat.slug}`} className="hub-card">
                  {body}
                  <i className="fa-solid fa-chevron-right hub-card-arrow" aria-hidden="true" />
                </Link>
              ) : (
                <div key={cat.slug} className="hub-card hub-card--empty">{body}</div>
              );
            })}
            <a
              href={requestCategoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hub-card hub-card--request"
            >
              <div className="hub-card-icon hub-card-icon--request">
                <i className="fa-brands fa-whatsapp" aria-hidden="true" />
              </div>
              <div className="hub-card-body">
                <span className="hub-card-name">Don&apos;t see your category?</span>
                <span className="hub-card-count">Message us on WhatsApp and we&apos;ll add it.</span>
              </div>
              <i className="fa-solid fa-chevron-right hub-card-arrow" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
