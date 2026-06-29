import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import supabase from "@/lib/supabase";
import { CATEGORIES, SITE_URL } from "@/lib/constants";

export const revalidate = 3600;

function slugToCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug) ?? null;
}

async function getBusinessesByCategory(categoryName) {
  const { data } = await supabase
    .from("businesses")
    .select("id, name, category, town, logo_url, slug, description")
    .eq("status", "approved")
    .eq("category", categoryName)
    .order("name");
  return data ?? [];
}

export async function generateStaticParams() {
  return CATEGORIES.map((cat) => ({ slug: cat.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cat = slugToCategory(slug);
  if (!cat) return { title: "Category Not Found" };
  return {
    title: `${cat.name} — KwaZulu-Natal Local Businesses`,
    description: `Browse local ${cat.name.toLowerCase()} businesses in KwaZulu-Natal. Free directory by Hidden Gems SA.`,
    alternates: { canonical: `${SITE_URL}/category/${slug}` },
  };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const cat = slugToCategory(slug);
  if (!cat) notFound();

  const businesses = await getBusinessesByCategory(cat.name);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home",       item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Categories", item: `${SITE_URL}/categories` },
          { "@type": "ListItem", position: 3, name: cat.name,     item: `${SITE_URL}/category/${slug}` },
        ],
      },
      {
        "@type": "ItemList",
        name: `${cat.name} businesses in KwaZulu-Natal`,
        itemListElement: businesses.map((b, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/business/${b.slug}`,
          name: b.name,
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container section-sm">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <i className="fa-solid fa-chevron-right" />
          <Link href="/categories">Categories</Link>
          <i className="fa-solid fa-chevron-right" />
          <span>{cat.name}</span>
        </nav>
      </div>

      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container">
          <div className="section-header">
            <h1>
              <i className={`${cat.icon} text-sapphire`} /> {cat.name}
            </h1>
            <p>
              {businesses.length > 0
                ? `${businesses.length} local ${businesses.length === 1 ? "business" : "businesses"} listed`
                : "No businesses listed yet in this category"}
            </p>
          </div>

          {businesses.length > 0 ? (
            <div className="listing-grid">
              {businesses.map((biz) => (
                <BusinessCard key={biz.id} biz={biz} />
              ))}
            </div>
          ) : (
            <div className="listing-empty">
              <i className="fa-solid fa-store-slash" />
              <p>No {cat.name.toLowerCase()} businesses listed yet.</p>
              <Link href="/submit" className="btn-primary mt-2">
                <i className="fa-solid fa-plus" /> List Your Business Free
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function BusinessCard({ biz }) {
  const initial = biz.name[0].toUpperCase();
  return (
    <Link href={`/business/${biz.slug}`} className="listing-card">
      <div className="listing-card-logo">
        {biz.logo_url ? (
          <Image src={biz.logo_url} alt={`${biz.name} logo`} width={56} height={56} className="avatar" />
        ) : (
          <div className="avatar-monogram">{initial}</div>
        )}
      </div>
      <div className="listing-card-body">
        <h3 className="listing-card-name">{biz.name}</h3>
        <p className="listing-card-meta">
          <span><i className="fa-solid fa-location-dot" /> {biz.town.split(",")[0]}</span>
        </p>
        {biz.description && (
          <p className="listing-card-desc">{biz.description}</p>
        )}
      </div>
      <i className="fa-solid fa-chevron-right listing-card-arrow" />
    </Link>
  );
}
