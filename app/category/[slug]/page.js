// the page at hiddengemssa.co.za/category/[slug], e.g.
// /category/baking-catering: every approved business in one category, a
// short intro written from the live listings, links into each area
// ("Bakers and caterers in Estcourt"), related categories, and a small FAQ.
//
// a category with no listings yet still loads (so links to it never
// break), but it's marked noindex and left out of the sitemap until its
// first listing is approved.

import { notFound } from "next/navigation";
import Link from "next/link";
import { CATEGORIES } from "@/lib/constants";
import { getCategories, getCombos, getAreas, categoryBySlug, areaSlug } from "@/lib/directory";
import {
  searchPhrase, searchPhraseLower, clampDescription, listToSentence, listWithMore, plural, fullTitle,
  breadcrumbList, itemList, JsonLd, absoluteUrl,
} from "@/lib/seo";
import ListingCard from "@/components/ListingCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import LinkList from "@/components/LinkList";

export const revalidate = 3600;

export function generateStaticParams() {
  return CATEGORIES.map((cat) => ({ slug: cat.slug }));
}

// "KwaZulu-Natal" when most listings are there, otherwise "South Africa".
function regionFor(businesses) {
  const counts = new Map();
  for (const b of businesses) counts.set(b.province, (counts.get(b.province) ?? 0) + 1);
  const [top, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  return top && topCount / businesses.length >= 0.75 ? top : "South Africa";
}

// distinct area names (grouped, so "DURBAN" and "Durban" count once),
// most listings first.
async function topAreas(businesses) {
  const nameBySlug = new Map((await getAreas()).map((a) => [a.slug, a.name]));
  const counts = new Map();
  for (const b of businesses) {
    const name = nameBySlug.get(areaSlug(b.area));
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
}

async function loadCategory(slug) {
  const cat = categoryBySlug(slug);
  if (!cat) return null;
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug);
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cat = await loadCategory(slug);
  if (!cat) notFound();

  const count = cat.businesses.length;
  const region = count ? regionFor(cat.businesses) : "South Africa";
  const areas = await topAreas(cat.businesses);
  const title = `${searchPhrase(cat.name)} in ${region}`;
  const description = count
    ? clampDescription(
        `${plural(count, "listing", "listings")} for ${searchPhraseLower(cat.name)} in ${listWithMore(areas)}. Free to browse, and you can message each one on WhatsApp.`
      )
    : `${searchPhrase(cat.name)} on Hidden Gems SA. No listings yet. Run one? List it for free.`;

  return {
    title: fullTitle(title),
    description,
    alternates: { canonical: `/category/${slug}` },
    ...(count === 0 && { robots: { index: false, follow: true } }),
    openGraph: { title, description, url: `/category/${slug}` },
  };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const cat = await loadCategory(slug);
  if (!cat) notFound();

  const businesses = cat.businesses;
  const count = businesses.length;
  const phrase = searchPhrase(cat.name);
  const phraseLower = searchPhraseLower(cat.name);
  const region = count ? regionFor(businesses) : "South Africa";
  const areas = await topAreas(businesses);

  // this category, split by area ("Bakers and caterers in Estcourt").
  const combos = (await getCombos()).filter((c) => c.category.slug === slug);

  // other categories that have listings in the same areas as this one.
  const myAreas = new Set(combos.map((c) => c.area.slug));
  const allCategories = await getCategories();
  const related = allCategories
    .filter((c) => c.slug !== slug && c.businesses.length > 0)
    .map((c) => ({ c, shared: c.businesses.filter((b) => myAreas.has(areaSlug(b.area))).length }))
    .sort((a, b) => b.shared - a.shared || b.c.businesses.length - a.c.businesses.length)
    .slice(0, 8)
    .map(({ c }) => ({ href: `/category/${c.slug}`, label: searchPhrase(c.name), count: c.businesses.length }));

  const delivery = businesses.filter((b) => b.delivery_available).length;
  const callouts = businesses.filter((b) => b.callouts_available).length;
  const halal = businesses.filter((b) => b.halal).length;
  const extras = [
    delivery && `${delivery} deliver`,
    callouts && `${callouts} do call-outs`,
    halal && `${halal} ${halal === 1 ? "is" : "are"} halal`,
  ].filter(Boolean);

  const faqItems = [
    {
      question: `Where can I find ${phraseLower} near me?`,
      answer: count
        ? `We list ${plural(count, "business", "businesses")} in this category, in ${listToSentence(areas)}. Pick an area below to see only the ones close to you.`
        : `We don't have any listings in this category yet. If you run one, you can list it for free.`,
    },
    {
      question: `Is it free to list a business here?`,
      answer: "Yes. Listing is free and you don't need an account. We check new listings and usually have them live within 24 to 48 hours.",
    },
    {
      question: `How do I contact one of these businesses?`,
      answer: "Open a listing and tap the WhatsApp button to message the business directly. Some listings also have a website, Instagram or Facebook link.",
    },
  ];

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Categories", path: "/categories" },
    { name: cat.name, path: `/category/${slug}` },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbList(crumbs),
      ...(count ? [itemList(`${phrase} in ${region}`, businesses)] : []),
      {
        "@type": "FAQPage",
        "@id": absoluteUrl(`/category/${slug}#faq`),
        mainEntity: faqItems.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="container section-sm">
        <Breadcrumbs items={crumbs} />
      </div>

      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container">
          <div className="section-header">
            <h1>
              <i className={`${cat.icon} text-sapphire`} aria-hidden="true" /> {phrase} in {region}
            </h1>
            {count > 0 ? (
              <p className="page-intro">
                {plural(count, "business", "businesses")} listed under {cat.name}, in {listToSentence(areas.slice(0, 4))}
                {areas.length > 4 ? ` and ${plural(areas.length - 4, "other area", "other areas")}` : ""}.
                {extras.length > 0 && ` Of these, ${listToSentence(extras)}.`}
                {" "}Tap a listing for details, or message them on WhatsApp.
              </p>
            ) : (
              <p className="page-intro">No {phraseLower} are listed yet.</p>
            )}
          </div>

          {count > 0 ? (
            <div className="listing-grid">
              {businesses.map((biz) => <ListingCard key={biz.id} biz={biz} show="area" />)}
            </div>
          ) : (
            <div className="listing-empty">
              <i className="fa-solid fa-store-slash" aria-hidden="true" />
              <p>Be the first {cat.name.toLowerCase()} business on Hidden Gems SA.</p>
              <Link href="/submit" className="btn-primary mt-2">
                <i className="fa-solid fa-plus" aria-hidden="true" /> List your business free
              </Link>
            </div>
          )}
        </div>
      </section>

      {(combos.length > 0 || related.length > 0) && (
        <section className="section section--narrow" style={{ paddingTop: 0 }}>
          <div className="container link-list-grid">
            <LinkList
              title={`${phrase} by area`}
              links={combos.map((c) => ({
                href: `/category/${slug}/${c.area.slug}`,
                label: `${phrase} in ${c.area.name}`,
                count: c.businesses.length,
              }))}
            />
            <LinkList title="Related categories" links={related} />
          </div>
        </section>
      )}

      <section className="section section--narrow" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2 className="page-faq-title">Questions about {phraseLower}</h2>
          <div className="faq-list">
            {faqItems.map((f) => (
              <details key={f.question} className="faq-item">
                <summary className="faq-question">{f.question}</summary>
                <p className="faq-answer">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
