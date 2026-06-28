import Link from "next/link";
import supabase from "@/lib/supabase";
import { CATEGORIES, TOWNS, SITE_URL, OLIDEEN_URL } from "@/lib/constants";
import Hero from "@/components/Hero";
import OlideenPromo from "@/components/OlideenPromo";
import FeaturedGemCard from "@/components/FeaturedGemCard";
import AnimatedSection from "@/components/AnimatedSection";

// keyword-rich title and description for maximum search visibility
export const metadata = {
  title: "Hidden Gems SA – Free KZN Business Directory | KwaZulu-Natal Local Businesses",
  description:
    "Discover trusted KwaZulu-Natal businesses for free. Home bakers, tutors, transport, beauty services & trades across Ladysmith, Pietermaritzburg, Dundee and 8 more KZN towns. No account needed.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Hidden Gems SA – Free KZN Business Directory",
    description:
      "Find local KwaZulu-Natal businesses for free. Browse by category or town across 11 KZN communities.",
    url: SITE_URL,
  },
};

async function getFeaturedGem() {
  const { data } = await supabase
    .from("featured_gem")
    .select(`*, businesses(id, name, category, town, logo_url, slug, description)`)
    .gte("featured_until", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// expanded faq list — covers voice search, ai answer engines, and long-tail queries
const faqItems = [
  {
    question: "Is Hidden Gems SA free to use?",
    answer:
      "Yes — completely free. Businesses list at no cost, and customers browse with no account, no subscription, and no hidden fees.",
  },
  {
    question: "Which areas does Hidden Gems SA cover?",
    answer:
      "We serve 11 KwaZulu-Natal towns: Ladysmith, Pietermaritzburg, Dundee, Harrismith, Greytown, Bergville, Colenso, Frere, Mooi River, Weenen and Winterton.",
  },
  {
    question: "How do I get my business listed on Hidden Gems SA?",
    answer:
      "Click 'List Your Business', fill in the short form with your business details, optionally upload a logo, and submit. Our team reviews listings within 24–48 hours and notifies you on WhatsApp once approved.",
  },
  {
    question: "What types of businesses are listed?",
    answer:
      "Any legitimate local business in KZN — home bakers, tutors, transport operators, hairstylists, plumbers, electricians, cleaning services, photographers, event planners, tailors, IT support and more.",
  },
  {
    question: "How do I contact a business listed on Hidden Gems SA?",
    answer:
      "Every approved listing shows a WhatsApp button. Tap it to open a direct WhatsApp conversation with the business owner. Some listings also include a website link.",
  },
  {
    question: "Where can I find local businesses in Ladysmith or Pietermaritzburg?",
    answer:
      "Visit the Towns section, select your town (e.g. Ladysmith or Pietermaritzburg), and browse all approved local businesses in that area. You can also filter by category.",
  },
  {
    question: "Who runs Hidden Gems SA?",
    answer:
      "Hidden Gems SA is built and maintained by Olideen Technologies, a digital agency based in Estcourt, KwaZulu-Natal. Our mission is to put invisible local businesses on the digital map.",
  },
];

// rich structured data — covers websearch, ai answer engines, and local seo
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      "url": SITE_URL,
      "name": "Hidden Gems SA",
      "description":
        "Free local business directory for KwaZulu-Natal, South Africa — find home bakers, tutors, transport, beauty services, trades and more across 11 KZN towns.",
      "inLanguage": "en-ZA",
      "publisher": {
        "@type": "Organization",
        "@id": `${SITE_URL}/#org`,
        "name": "Olideen Technologies",
        "url": OLIDEEN_URL,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Estcourt",
          "addressRegion": "KwaZulu-Natal",
          "addressCountry": "ZA",
        },
      },
      // enables the google sitelinks search box in results
      "potentialAction": {
        "@type": "SearchAction",
        "target": { "@type": "EntryPoint", "urlTemplate": `${SITE_URL}/categories` },
        "query-input": "required name=search_term_string",
      },
      "areaServed": {
        "@type": "State",
        "name": "KwaZulu-Natal",
        "alternateName": "KZN",
        "addressCountry": "ZA",
      },
    },
    {
      // faq schema — helps with people-also-ask, voice search, ai summaries
      "@type": "FAQPage",
      "mainEntity": faqItems.map((f) => ({
        "@type": "Question",
        "name": f.question,
        "acceptedAnswer": { "@type": "Answer", "text": f.answer },
      })),
    },
    {
      // howto schema — helps ai answer engines explain the listing process
      "@type": "HowTo",
      "name": "How to list your business on Hidden Gems SA",
      "description":
        "Get your KwaZulu-Natal business discovered online for free in three simple steps.",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Fill in the submission form",
          "text": "Go to the List Your Business page and enter your business name, category, town, WhatsApp number, description and owner details.",
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Upload a logo (optional)",
          "text": "Optionally upload a business logo. The built-in crop tool lets you frame it perfectly before it uploads.",
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Wait for review",
          "text": "Our team reviews your submission within 24–48 hours. Once approved, your listing goes live and is searchable by KZN customers.",
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
      ],
    },
    {
      // itemlist of categories — helps search engines understand the directory structure
      "@type": "ItemList",
      "name": "Business categories on Hidden Gems SA",
      "itemListElement": CATEGORIES.map((cat, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": cat.name,
        "url": `${SITE_URL}/category/${cat.slug}`,
      })),
    },
  ],
};

export default async function HomePage() {
  const featuredGem = await getFeaturedGem();

  return (
    <div className="home-wrap">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Hero />

      {/* featured gem of the week */}
      <section className="home-section">
        <div className="container">
          <AnimatedSection>
            <div className="section-header home-section-header">
              <h2>
                <i className="fa-solid fa-gem" style={{ color: "#C46EA1" }} /> Featured Gem of the Week
              </h2>
              <p>Spotlight on an outstanding KwaZulu-Natal local business</p>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <FeaturedGemCard gem={featuredGem} />
          </AnimatedSection>
        </div>
      </section>

      {/* browse by category — 10 categories covering all major kzn business types */}
      <section className="home-section home-section--inset">
        <div className="container">
          <AnimatedSection>
            <div className="section-header home-section-header">
              <h2>Browse by Category</h2>
              <p>Find the type of business you&apos;re looking for across KwaZulu-Natal</p>
            </div>
          </AnimatedSection>
          <AnimatedSection stagger className="grid-4 cat-grid">
            {CATEGORIES.map((cat) => (
              <Link key={cat.slug} href={`/category/${cat.slug}`} className="category-card">
                <span className="cat-icon" style={{ background: cat.gradient }}>
                  <i className={cat.icon} />
                </span>
                <span className="cat-name">{cat.name}</span>
              </Link>
            ))}
          </AnimatedSection>
          <AnimatedSection delay={0.15}>
            <div className="text-center mt-3">
              <Link href="/categories" className="btn-ghost-white">
                <i className="fa-solid fa-grid-2" /> View All Categories
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* browse by town — 11 kzn communities */}
      <section className="home-section">
        <div className="container">
          <AnimatedSection>
            <div className="section-header home-section-header">
              <h2>Browse by Town</h2>
              <p>Discover local businesses in your KwaZulu-Natal community</p>
            </div>
          </AnimatedSection>
          <AnimatedSection stagger className="towns-grid">
            {TOWNS.map((town) => (
              <Link
                key={town}
                href={`/town/${town.toLowerCase().replace(/\s+/g, "-")}`}
                className="town-pill"
              >
                <i className="fa-solid fa-location-dot" /> {town}
              </Link>
            ))}
          </AnimatedSection>
          <AnimatedSection delay={0.15}>
            <div className="text-center mt-3">
              <Link href="/towns" className="btn-ghost-white">
                <i className="fa-solid fa-map" /> All Towns
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <OlideenPromo />

      {/* faq — targets voice search, people-also-ask, and ai answer engines */}
      <section className="home-section">
        <div className="container section--narrow">
          <AnimatedSection>
            <div className="section-header home-section-header">
              <h2>Frequently Asked Questions</h2>
              <p>Everything you need to know about Hidden Gems SA</p>
            </div>
          </AnimatedSection>
          <AnimatedSection stagger className="faq-list">
            {faqItems.map((f, i) => (
              <details key={i} className="faq-item">
                <summary className="faq-question">{f.question}</summary>
                <p className="faq-answer">{f.answer}</p>
              </details>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* bottom cta band */}
      <section className="home-cta-band">
        <div className="home-cta-glow" aria-hidden="true" />
        <div className="container text-center" style={{ position: "relative", zIndex: 1 }}>
          <AnimatedSection>
            <p className="home-cta-pre">Ready to grow?</p>
            <h2 className="home-cta-h2">Is Your Business a Hidden Gem?</h2>
            <p className="home-cta-sub mt-1">
              Free listing, no account required — reviewed and live within 48 hours.
            </p>
            <Link href="/submit" className="hero-cta-primary mt-3">
              <i className="fa-solid fa-plus" /> List Your Business Free
            </Link>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
