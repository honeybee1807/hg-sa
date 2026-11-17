// the homepage, hiddengemssa.co.za. it shows the hero (with the current
// Featured Gem and the search bar, see Hero.js), the directory with every
// approved listing, the "built by Olideen" panel, light links into the
// category and area pages, the FAQ, and the closing call to action.
//
// the page is cached and rebuilt in the background every 15 minutes. the
// admin actions (approve, edit, delete, new Featured Gem) also refresh it
// straight away, so changes show up without waiting.
//
// every listing is rendered into the HTML on the server as a normal link,
// so search engines see the full directory without running JavaScript.
// badge filters in the address (e.g. "?halal=true") are applied in the
// browser once the page loads (see DirectorySearchProvider), which is what
// lets the page itself be cached. those URLs all point search engines back
// to the plain homepage through the canonical tag.

import Link from "next/link";
import supabase from "@/lib/supabase";
import { SITE_URL } from "@/lib/constants";
import { getApprovedBusinesses, getAreas, getCategories } from "@/lib/directory";
import { searchPhrase, itemList, JsonLd, absoluteUrl } from "@/lib/seo";
import Hero from "@/components/Hero";
import OlideenPromo from "@/components/OlideenPromo";
import AnimatedSection from "@/components/AnimatedSection";
import LinkList from "@/components/LinkList";
import { DirectorySearchProvider, DirectorySection } from "@/components/DirectorySearch";

export const revalidate = 900;

export const metadata = {
  title: { absolute: "Hidden Gems SA: Free Local Business Directory in KZN" },
  description:
    "Find local businesses in KwaZulu-Natal and across South Africa: home bakers, tutors, transport, beauty, trades and more. Free to browse, no account needed.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Hidden Gems SA: Free Local Business Directory",
    description: "Find local businesses in KwaZulu-Natal and across South Africa, and message them on WhatsApp.",
    url: "/",
  },
};

// the current Featured Gem, if its week hasn't run out yet.
async function getFeaturedGem() {
  const { data } = await supabase
    .from("featured_gem")
    .select(`*, businesses(id, name, category, business_type, area, province, logo_url, slug, description, instagram, facebook)`)
    .gte("featured_until", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// only the fields the directory search shows, so the page sends the browser
// no more data than it needs.
const DIRECTORY_FIELDS = [
  "id", "name", "category", "business_type", "area", "province", "logo_url", "slug", "description",
  "whatsapp", "instagram", "facebook", "street_address", "halal", "delivery_available", "callouts_available",
];
function forDirectory(biz) {
  return Object.fromEntries(DIRECTORY_FIELDS.map((key) => [key, biz[key] ?? null]));
}

// shown in the FAQ section and, word for word, in the FAQ structured data.
const faqItems = [
  {
    question: "Is Hidden Gems SA free to use?",
    answer:
      "Yes. It's free for businesses and for anyone looking for one. There's no account, subscription or hidden fee. We may add paid extras one day, so now is a good time to get your free listing.",
  },
  {
    question: "Which areas does Hidden Gems SA cover?",
    answer:
      "Mostly KwaZulu-Natal and surrounding areas, but any business in South Africa can list. Browse by area to see what's listed near you, or be the first in your town.",
  },
  {
    question: "How do I get my business listed?",
    answer:
      "Tap List Your Business, fill in your details and send it. We check new listings within 24 to 48 hours and let you know on WhatsApp once yours is live.",
  },
  {
    question: "What kinds of businesses are listed?",
    answer:
      "Any legitimate local business: home bakers, tutors, transport, hairstylists, tradespeople, cleaners, photographers and more.",
  },
  {
    question: "How do I contact a business?",
    answer:
      "Most listings have a WhatsApp button, so you can message the owner directly. Some also link to a website, Instagram or Facebook.",
  },
  {
    question: "How do I find businesses in my town?",
    answer:
      "Open the Areas page and pick your town to see everything listed there. You can also search, or filter by category, right here on the homepage.",
  },
  {
    question: "Who runs Hidden Gems SA?",
    answer:
      "Hidden Gems SA is built and run by Olideen Technologies, a digital agency in KwaZulu-Natal. The aim is simple: help local businesses do well in their own communities.",
  },
];

export default async function HomePage() {
  const [featuredGem, approved, areas, categories] = await Promise.all([
    getFeaturedGem(),
    getApprovedBusinesses(),
    getAreas(),
    getCategories(),
  ]);
  const allBusinesses = approved.map(forDirectory);

  const popularCategories = categories
    .filter((c) => c.businesses.length > 0)
    .sort((a, b) => b.businesses.length - a.businesses.length)
    .slice(0, 10)
    .map((c) => ({ href: `/category/${c.slug}`, label: searchPhrase(c.name), count: c.businesses.length }));
  const popularAreas = [...areas]
    .sort((a, b) => b.businesses.length - a.businesses.length)
    .slice(0, 12)
    .map((a) => ({ href: `/town/${a.slug}`, label: a.name, count: a.businesses.length }));

  // describes only what's on this page: the listings in the directory and
  // the FAQ. the sitewide publisher and website data is in app/layout.js.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/#webpage`,
        url: SITE_URL,
        name: "Hidden Gems SA: Free Local Business Directory",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        inLanguage: "en-ZA",
      },
      itemList("Local businesses on Hidden Gems SA", approved),
      {
        "@type": "FAQPage",
        "@id": absoluteUrl("/#faq"),
        mainEntity: faqItems.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };

  return (
    <div className="home-wrap">
      <JsonLd data={jsonLd} />

      {/* the hero's search bar and the directory section below it share
          one source of truth, so typing in either updates both. see
          components/DirectorySearch.js. */}
      <DirectorySearchProvider businesses={allBusinesses}>
        <Hero featuredGem={featuredGem} areaCount={areas.length} />
        <DirectorySection />
      </DirectorySearchProvider>

      <OlideenPromo />

      {/* plain links into the category and area pages: light on purpose,
          no images and no animation. */}
      <section className="home-section home-links" aria-label="Browse the directory">
        <div className="container link-list-grid">
          <LinkList
            title="Popular categories"
            links={[...popularCategories, { href: "/categories", label: "All categories" }]}
          />
          <LinkList
            title="Browse by area"
            links={[...popularAreas, { href: "/towns", label: "All areas" }]}
          />
        </div>
      </section>

      <section className="home-section" id="faq">
        <div className="container section--narrow">
          <AnimatedSection>
            <div className="section-header home-section-header">
              <h2>Frequently asked questions</h2>
              <p>The quick answers about Hidden Gems SA</p>
            </div>
          </AnimatedSection>
          <AnimatedSection stagger className="faq-list">
            {faqItems.map((f) => (
              <details key={f.question} className="faq-item">
                <summary className="faq-question">{f.question}</summary>
                <p className="faq-answer">{f.answer}</p>
              </details>
            ))}
          </AnimatedSection>
        </div>
      </section>

      <section className="home-cta-band">
        <div className="home-cta-glow" aria-hidden="true" />
        <div className="container text-center" style={{ position: "relative", zIndex: 1 }}>
          <AnimatedSection>
            <h2 className="home-cta-h2">Is your business a hidden gem?</h2>
            <p className="home-cta-sub mt-1">
              It&apos;s free and you don&apos;t need an account. Send us your details and we&apos;ll have your listing checked and live within 48 hours.
            </p>
            <Link href="/submit" className="hero-cta-primary mt-3">
              <i className="fa-solid fa-plus" aria-hidden="true" /> List your business free
            </Link>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
