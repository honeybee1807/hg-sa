import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import supabase from "@/lib/supabase";
import { TOWNS, SITE_URL } from "@/lib/constants";

export const revalidate = 3600;

function slugToTown(slug) {
  return TOWNS.find((t) => t.toLowerCase().replace(/\s+/g, "-") === slug) ?? null;
}

async function getBusinessesByTown(town) {
  const { data } = await supabase
    .from("businesses")
    .select("id, name, category, town, logo_url, slug, description")
    .eq("status", "approved")
    .filter("town", "ilike", `${town}%`)
    .order("name");
  return data ?? [];
}

export async function generateStaticParams() {
  return TOWNS.map((town) => ({ slug: town.toLowerCase().replace(/\s+/g, "-") }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const town = slugToTown(slug);
  if (!town) return { title: "Town Not Found" };
  return {
    title: `Local Businesses in ${town}, KwaZulu-Natal`,
    description: `Browse approved local businesses in ${town}, KZN — bakers, tutors, transport, beauty and more.`,
    alternates: { canonical: `${SITE_URL}/town/${slug}` },
  };
}

export default async function TownPage({ params }) {
  const { slug } = await params;
  const town = slugToTown(slug);
  if (!town) notFound();

  const businesses = await getBusinessesByTown(town);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home",  item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Towns", item: `${SITE_URL}/towns` },
          { "@type": "ListItem", position: 3, name: town,    item: `${SITE_URL}/town/${slug}` },
        ],
      },
      {
        "@type": "ItemList",
        name: `Local businesses in ${town}`,
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
          <Link href="/towns">Towns</Link>
          <i className="fa-solid fa-chevron-right" />
          <span>{town}</span>
        </nav>
      </div>

      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container">
          <div className="section-header">
            <h1>
              <i className="fa-solid fa-location-dot text-sapphire" /> {town}
            </h1>
            <p>
              {businesses.length > 0
                ? `${businesses.length} local ${businesses.length === 1 ? "business" : "businesses"} listed`
                : "No businesses listed yet in this town"}
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
              <p>Be the first to list your business in {town}!</p>
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
          <span><i className="fa-solid fa-tag" /> {biz.category}</span>
        </p>
        {biz.description && (
          <p className="listing-card-desc">{biz.description}</p>
        )}
      </div>
      <i className="fa-solid fa-chevron-right listing-card-arrow" />
    </Link>
  );
}
