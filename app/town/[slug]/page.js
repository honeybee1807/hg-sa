// this is the page shown at hiddengemssa.co.za/town/whatever-slug — e.g.
// /town/estcourt — listing every approved business in one town, plus a
// small FAQ section written specifically for that town.

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import supabase from "@/lib/supabase";
import { TOWNS, SITE_URL } from "@/lib/constants";

export const revalidate = 3600;

// turns the web-address version of a town (e.g. "mooi-river") back into
// its proper display name ("Mooi River") from lib/constants.js.
function slugToTown(slug) {
  return TOWNS.find((t) => t.toLowerCase().replace(/\s+/g, "-") === slug) ?? null;
}

// fetches every approved business in one specific town. uses "ilike" (a
// case-insensitive, "starts with" match) rather than an exact match,
// because some older records store the town with extra text after it
// (like "Estcourt, KwaZulu-Natal" instead of just "Estcourt").
async function getBusinessesByTown(town) {
  const { data } = await supabase
    .from("businesses")
    .select("id, name, category, town, logo_url, slug, description")
    .eq("status", "approved")
    .filter("town", "ilike", `${town}%`)
    .order("name");
  return data ?? [];
}

// tells Next.js every town page that exists, so all 12 can be pre-built
// ahead of time.
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

  // the distinct list of categories actually represented in this town, so
  // the FAQ answer below can name them specifically. "new Set(...)" just
  // removes any duplicate category names before sorting alphabetically.
  const categoryNamesWithoutDuplicates = new Set(businesses.map((b) => b.category));
  const categories = [...categoryNamesWithoutDuplicates].sort();

  // the FAQ shown on this specific town's page — written to directly
  // answer a real search like "where can I find a caterer in Estcourt".
  const faqItems = [
    {
      question: `Where can I find local businesses in ${town}?`,
      answer:
        categories.length > 0
          ? `Hidden Gems SA currently lists ${businesses.length} approved local ${businesses.length === 1 ? "business" : "businesses"} in ${town}, covering ${categories.join(", ")}. Browse the full list above, or visit the Categories page to search by type.`
          : `Hidden Gems SA doesn't have any approved listings in ${town} yet. Be the first — list your business for free.`,
    },
    {
      question: `Is Hidden Gems SA free for businesses in ${town}?`,
      answer:
        "Yes — completely free to list, with no account required. We review and approve new listings within 24–48 hours.",
    },
    {
      question: `How do I contact a business in ${town}?`,
      answer:
        "Every approved listing includes a WhatsApp button so you can message the business directly. Some listings also include a website link.",
    },
  ];

  // hidden, machine-readable description of this page for search engines
  // and AI tools (see the fuller explanation in app/page.js).
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
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/town/${slug}#webpage`,
        url: `${SITE_URL}/town/${slug}`,
        name: `Local Businesses in ${town}, KwaZulu-Natal`,
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: [".page-faq-question", ".page-faq-answer"],
        },
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

      <section className="section section--narrow" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="faq-list">
            {faqItems.map((f, i) => (
              <details key={i} className="faq-item">
                <summary className="faq-question page-faq-question">{f.question}</summary>
                <p className="faq-answer page-faq-answer">{f.answer}</p>
              </details>
            ))}
          </div>
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
