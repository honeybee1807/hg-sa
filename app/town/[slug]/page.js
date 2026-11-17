// the page at hiddengemssa.co.za/town/[slug], e.g. /town/estcourt: every
// approved business in one area, a short intro written from the live
// listings, links into each category in this area ("Tutors and lessons in
// Estcourt"), other areas in the same province, and a small FAQ.
//
// areas aren't a fixed list. they come from the approved listings
// themselves (see lib/directory.js), so an area page only exists while it
// has at least one listing, and returns a 404 otherwise.

import { notFound } from "next/navigation";
import { getAreas, getArea, getCombos } from "@/lib/directory";
import {
  searchPhrase, searchPhraseLower, clampDescription, listToSentence, listWithMore, plural, fullTitle,
  breadcrumbList, itemList, JsonLd, absoluteUrl,
} from "@/lib/seo";
import ListingCard from "@/components/ListingCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import LinkList from "@/components/LinkList";

export const revalidate = 3600;

export async function generateStaticParams() {
  const areas = await getAreas();
  return areas.map((a) => ({ slug: a.slug }));
}

// this area's categories, most listings first.
async function combosFor(slug) {
  return (await getCombos())
    .filter((c) => c.area.slug === slug)
    .sort((a, b) => b.businesses.length - a.businesses.length || a.category.name.localeCompare(b.category.name));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const area = await getArea(slug);
  // calling notFound() here (not only in the page) makes sure crawlers get
  // a real 404 status, before the loading screen starts streaming.
  if (!area) notFound();

  const combos = await combosFor(slug);
  const count = area.businesses.length;
  const title = `Local Businesses in ${area.name}`;
  const description = clampDescription(
    `${plural(count, "local business", "local businesses")} in ${area.name}, ${area.province}: ${listWithMore(combos.map((c) => searchPhraseLower(c.category.name)))}. Browse free and message them on WhatsApp.`
  );

  return {
    title: fullTitle(title),
    description,
    alternates: { canonical: `/town/${slug}` },
    openGraph: { title, description, url: `/town/${slug}` },
  };
}

export default async function TownPage({ params }) {
  const { slug } = await params;
  const area = await getArea(slug);
  if (!area) notFound();

  const { businesses } = area;
  const count = businesses.length;
  const combos = await combosFor(slug);
  const phrases = combos.map((c) => searchPhraseLower(c.category.name));

  // other areas in the same province, busiest first.
  const nearby = (await getAreas())
    .filter((a) => a.slug !== slug && a.province === area.province)
    .sort((a, b) => b.businesses.length - a.businesses.length || a.name.localeCompare(b.name))
    .slice(0, 10)
    .map((a) => ({ href: `/town/${a.slug}`, label: a.name, count: a.businesses.length }));

  const delivery = businesses.filter((b) => b.delivery_available).length;
  const callouts = businesses.filter((b) => b.callouts_available).length;

  const intro =
    combos.length === 1
      ? `${plural(count, "business", "businesses")} in ${area.name} ${count === 1 ? "is" : "are"} listed so far, all under ${searchPhraseLower(combos[0].category.name)}.`
      : `${plural(count, "business", "businesses")} in ${area.name} ${count === 1 ? "is" : "are"} listed, from ${phrases[0]} to ${phrases[phrases.length - 1]}.`;
  const extras = [
    delivery && `${delivery} ${delivery === 1 ? "delivers" : "deliver"}`,
    callouts && `${callouts} ${callouts === 1 ? "does" : "do"} call-outs`,
  ].filter(Boolean);

  const faqItems = [
    {
      question: `What local businesses are there in ${area.name}?`,
      answer: `We list ${plural(count, "business", "businesses")} in ${area.name}, ${area.province}, covering ${listToSentence(combos.map((c) => c.category.name))}.`,
    },
    {
      question: `Is it free to list a business in ${area.name}?`,
      answer: "Yes. Listing is free and you don't need an account. We check new listings and usually have them live within 24 to 48 hours.",
    },
    {
      question: `How do I contact a business in ${area.name}?`,
      answer: "Open a listing and tap the WhatsApp button to message the business directly. Some listings also have a website, Instagram or Facebook link.",
    },
  ];

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Areas", path: "/towns" },
    { name: area.name, path: `/town/${slug}` },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbList(crumbs),
      itemList(`Local businesses in ${area.name}, ${area.province}`, businesses),
      {
        "@type": "FAQPage",
        "@id": absoluteUrl(`/town/${slug}#faq`),
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
              <i className="fa-solid fa-location-dot text-sapphire" aria-hidden="true" /> Local businesses in {area.name}
            </h1>
            <p className="page-intro">
              {intro}
              {extras.length > 0 && ` ${listToSentence(extras)}.`}
              {" "}All of them are in {area.province}, and you can message each one on WhatsApp.
            </p>
          </div>

          <div className="listing-grid">
            {businesses.map((biz) => <ListingCard key={biz.id} biz={biz} show="category" />)}
          </div>
        </div>
      </section>

      <section className="section section--narrow" style={{ paddingTop: 0 }}>
        <div className="container link-list-grid">
          <LinkList
            title={`${area.name} by category`}
            links={combos.map((c) => ({
              href: `/category/${c.category.slug}/${slug}`,
              label: `${searchPhrase(c.category.name)} in ${area.name}`,
              count: c.businesses.length,
            }))}
          />
          <LinkList title={`More areas in ${area.province}`} links={nearby} />
        </div>
      </section>

      <section className="section section--narrow" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2 className="page-faq-title">Questions about {area.name}</h2>
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
