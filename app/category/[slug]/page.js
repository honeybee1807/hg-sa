// this is the page shown at hiddengemssa.co.za/category/whatever-slug —
// e.g. /category/baking-catering — listing every approved business in one
// category, plus a small FAQ section written specifically for that
// category (see faqItems further down).

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import supabase from "@/lib/supabase";
import { CATEGORIES, SITE_URL } from "@/lib/constants";
import SocialLink from "@/components/SocialLink";

// rebuild this page at most once an hour.
export const revalidate = 3600;

// turns the web-address version of a category (e.g. "baking-catering")
// back into the full category record from lib/constants.js.
function slugToCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug) ?? null;
}

// fetches every approved business in one specific category.
async function getBusinessesByCategory(categoryName) {
  const { data } = await supabase
    .from("businesses")
    .select("id, name, category, business_type, area, province, logo_url, slug, description, instagram, facebook")
    .eq("status", "approved")
    .eq("category", categoryName)
    .order("name");
  return data ?? [];
}

// tells Next.js every category page that exists, so all 14 can be
// pre-built ahead of time.
export async function generateStaticParams() {
  return CATEGORIES.map((cat) => ({ slug: cat.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cat = slugToCategory(slug);
  if (!cat) return { title: "Category Not Found" };
  return {
    title: `${cat.name} — South African Local Businesses`,
    description: `Browse local ${cat.name.toLowerCase()} businesses across South Africa. Free directory by Hidden Gems SA.`,
    alternates: { canonical: `${SITE_URL}/category/${slug}` },
  };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const cat = slugToCategory(slug);
  if (!cat) notFound();

  const businesses = await getBusinessesByCategory(cat.name);

  // build the list of distinct areas that actually have a business in this
  // category, so the FAQ answer below can name them specifically (e.g.
  // "we list baking businesses in Estcourt, Ladysmith..."). "new Set(...)"
  // is just a quick way to remove duplicate area names before sorting
  // them alphabetically.
  const areaNamesWithoutDuplicates = new Set(businesses.map((b) => b.area.split(",")[0].trim()));
  const areas = [...areaNamesWithoutDuplicates].sort();

  const catLower = cat.name.toLowerCase();

  // the FAQ shown on this specific category's page — written to directly
  // answer a real search like "where can I find a caterer in Estcourt".
  const faqItems = [
    {
      question: `Where can I find ${catLower} businesses in South Africa?`,
      answer:
        areas.length > 0
          ? `Hidden Gems SA currently lists ${businesses.length} approved ${catLower} ${businesses.length === 1 ? "business" : "businesses"} in ${areas.join(", ")}. Browse the full list above, or visit the Areas page to search by area.`
          : `Hidden Gems SA is currently building its ${catLower} directory. Check back soon, or list your own ${catLower} business for free.`,
    },
    {
      question: `Is it free to list a ${catLower} business on Hidden Gems SA?`,
      answer:
        "Yes — completely free. There's no cost to list your business and no account required. Submissions are reviewed and approved within 24–48 hours.",
    },
    {
      question: `How do I contact a ${catLower} business listed here?`,
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
          { "@type": "ListItem", position: 1, name: "Home",       item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Categories", item: `${SITE_URL}/categories` },
          { "@type": "ListItem", position: 3, name: cat.name,     item: `${SITE_URL}/category/${slug}` },
        ],
      },
      {
        "@type": "ItemList",
        name: `${cat.name} businesses in South Africa`,
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
        "@id": `${SITE_URL}/category/${slug}#webpage`,
        url: `${SITE_URL}/category/${slug}`,
        name: `${cat.name} — South African Local Businesses`,
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
  // some older records may store the area with extra text after it (like
  // "Estcourt, KwaZulu-Natal" instead of just "Estcourt") — only the part
  // before the first comma is the actual area name.
  const areaName = biz.area.split(",")[0].trim();
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
            <span><i className="fa-solid fa-location-dot" /> {areaName}, {biz.province}</span>
          </p>
          {biz.business_type && (
            <span className="business-type-badge">{biz.business_type}</span>
          )}
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
