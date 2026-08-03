// this is the page shown at hiddengemssa.co.za/town/whatever-slug — e.g.
// /town/umhlanga — listing every approved business in one area, plus a
// small FAQ section written specifically for that area.
//
// unlike categories, areas aren't a fixed list anymore — anyone can submit
// a business from anywhere in South Africa (see app/submit/SubmitForm.js),
// so which areas exist is discovered by asking the database rather than
// looping over a constant.

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import supabase from "@/lib/supabase";
import { SITE_URL } from "@/lib/constants";
import SocialLink from "@/components/SocialLink";
import BadgePills from "@/components/BadgePills";

export const revalidate = 3600;

// turns an area name (e.g. "Mooi River") into its web-address version
// ("mooi-river") — the same slugging rule used everywhere an area needs a
// URL: lowercase, spaces become dashes.
function areaToSlug(area) {
  return area.toLowerCase().replace(/\s+/g, "-");
}

// turns the web-address version of an area (e.g. "umhlanga") back into its
// proper display name and province, by finding any approved business whose
// area slugs to a match. there's no fixed list to look this up in — the
// business records themselves are the source of truth for what areas exist.
async function findAreaBySlug(slug) {
  const { data } = await supabase
    .from("businesses")
    .select("area, province")
    .eq("status", "approved")
    .not("area", "is", null);

  for (const business of data ?? []) {
    const areaNameOnly = business.area.split(",")[0].trim();
    if (areaToSlug(areaNameOnly) === slug) {
      return { area: areaNameOnly, province: business.province };
    }
  }
  return null;
}

// fetches every approved business in one specific area. uses "ilike" (a
// case-insensitive, "starts with" match) rather than an exact match,
// because some older records store the area with extra text after it
// (like "Estcourt, KwaZulu-Natal" instead of just "Estcourt").
async function getBusinessesByArea(area) {
  const { data } = await supabase
    .from("businesses")
    .select("id, name, category, business_type, area, province, logo_url, slug, description, instagram, facebook, street_address, halal, delivery_available, callouts_available")
    .eq("status", "approved")
    .filter("area", "ilike", `${area}%`)
    .order("name");
  return data ?? [];
}

// tells Next.js every area page that currently has an approved business, so
// those can be pre-built ahead of time. any area that gets approved later
// (and therefore isn't in this list yet) still works fine — Next.js builds
// it on that first visit and caches the result, per the "revalidate" above.
export async function generateStaticParams() {
  const { data } = await supabase
    .from("businesses")
    .select("area")
    .eq("status", "approved");

  const slugs = new Set();
  for (const business of data ?? []) {
    const areaNameOnly = business.area?.split(",")[0]?.trim();
    if (areaNameOnly) slugs.add(areaToSlug(areaNameOnly));
  }
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const found = await findAreaBySlug(slug);
  if (!found) return { title: "Area Not Found" };
  return {
    title: `Local Businesses in ${found.area}, ${found.province}`,
    description: `Browse approved local businesses in ${found.area}, ${found.province} — bakers, tutors, transport, beauty and more.`,
    alternates: { canonical: `${SITE_URL}/town/${slug}` },
  };
}

export default async function TownPage({ params }) {
  const { slug } = await params;
  const found = await findAreaBySlug(slug);
  if (!found) notFound();
  const { area, province } = found;

  const businesses = await getBusinessesByArea(area);

  // the distinct list of categories actually represented in this area, so
  // the FAQ answer below can name them specifically. "new Set(...)" just
  // removes any duplicate category names before sorting alphabetically.
  const categoryNamesWithoutDuplicates = new Set(businesses.map((b) => b.category));
  const categories = [...categoryNamesWithoutDuplicates].sort();

  // the FAQ shown on this specific area's page — written to directly
  // answer a real search like "where can I find a caterer in Estcourt".
  const faqItems = [
    {
      question: `Where can I find local businesses in ${area}?`,
      answer:
        categories.length > 0
          ? `Hidden Gems SA currently lists ${businesses.length} approved local ${businesses.length === 1 ? "business" : "businesses"} in ${area}, ${province}, covering ${categories.join(", ")}. Browse the full list above, or visit the Categories page to search by type.`
          : `Hidden Gems SA doesn't have any approved listings in ${area} yet. Be the first — list your business for free.`,
    },
    {
      question: `Is Hidden Gems SA free for businesses in ${area}?`,
      answer:
        "Yes — completely free to list, with no account required. We review and approve new listings within 24–48 hours.",
    },
    {
      question: `How do I contact a business in ${area}?`,
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
          { "@type": "ListItem", position: 2, name: "Areas", item: `${SITE_URL}/towns` },
          { "@type": "ListItem", position: 3, name: area,    item: `${SITE_URL}/town/${slug}` },
        ],
      },
      {
        "@type": "ItemList",
        name: `Local businesses in ${area}, ${province}`,
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
        name: `Local Businesses in ${area}, ${province}`,
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
          <Link href="/towns">Areas</Link>
          <i className="fa-solid fa-chevron-right" />
          <span>{area}</span>
        </nav>
      </div>

      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container">
          <div className="section-header">
            <h1>
              <i className="fa-solid fa-location-dot text-sapphire" /> {area}, {province}
            </h1>
            <p>
              {businesses.length > 0
                ? `${businesses.length} local ${businesses.length === 1 ? "business" : "businesses"} listed`
                : "No businesses listed yet in this area"}
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
              <p>Be the first to list your business in {area}!</p>
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
    <div className="listing-card">
      <Link href={`/business/${biz.slug}`} className="listing-card-link">
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
          {biz.business_type && (
            <span className="business-type-badge">{biz.business_type}</span>
          )}
          <BadgePills biz={biz} />
          {biz.description && (
            <p className="listing-card-desc">{biz.description}</p>
          )}
        </div>
      </Link>
      <div className="listing-card-actions">
        <SocialLink platform="instagram" value={biz.instagram} className="social-icon-btn social-icon-btn--instagram social-icon-btn--sm" iconOnly />
        <SocialLink platform="facebook" value={biz.facebook} className="social-icon-btn social-icon-btn--facebook social-icon-btn--sm" iconOnly />
        <i className="fa-solid fa-chevron-right listing-card-arrow" />
      </div>
    </div>
  );
}
