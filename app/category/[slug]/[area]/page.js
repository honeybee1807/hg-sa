// "category in area" pages, e.g. /category/baking-catering/estcourt
// ("Bakers and caterers in Estcourt"). one page exists for every
// combination that has at least one approved listing; any other
// combination returns a 404 and never appears in the sitemap.
//
// these are built ahead of time and refreshed hourly. the admin actions
// refresh the category and area pages straight away when a listing is
// approved or changed; these combined pages catch up within the hour.

import { notFound } from "next/navigation";
import Link from "next/link";
import { getCombos, getCombo } from "@/lib/directory";
import {
  searchPhrase, searchPhraseLower, clampDescription, listToSentence, plural, fullTitle,
  breadcrumbList, itemList, JsonLd,
} from "@/lib/seo";
import ListingCard from "@/components/ListingCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import LinkList from "@/components/LinkList";

export const revalidate = 3600;

export async function generateStaticParams() {
  const combos = await getCombos();
  return combos.map((c) => ({ slug: c.category.slug, area: c.area.slug }));
}

export async function generateMetadata({ params }) {
  const { slug, area: areaSlugValue } = await params;
  const combo = await getCombo(slug, areaSlugValue);
  // notFound() here as well as in the page, so a combination with no
  // listings returns a real 404 status rather than a 200 "not found" page.
  if (!combo) notFound();

  const { category, area, businesses } = combo;
  const title = `${searchPhrase(category.name)} in ${area.name}`;
  const names = businesses.slice(0, 3).map((b) => b.name);
  const description = clampDescription(
    `${plural(businesses.length, "listing", "listings")} for ${searchPhraseLower(category.name)} in ${area.name}, ${area.province}${names.length ? `, including ${listToSentence(names)}` : ""}. Free to browse, message them on WhatsApp.`
  );
  const path = `/category/${slug}/${areaSlugValue}`;

  return {
    title: fullTitle(title),
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
  };
}

export default async function ComboPage({ params }) {
  const { slug, area: areaSlugValue } = await params;
  const combo = await getCombo(slug, areaSlugValue);
  if (!combo) notFound();

  const { category, area, businesses } = combo;
  const phrase = searchPhrase(category.name);
  const phraseLower = searchPhraseLower(category.name);
  const path = `/category/${slug}/${areaSlugValue}`;
  const count = businesses.length;

  const combos = await getCombos();
  // the same category in other areas, and other categories in this area.
  const sameCategory = combos
    .filter((c) => c.category.slug === slug && c.area.slug !== areaSlugValue)
    .sort((a, b) => b.businesses.length - a.businesses.length)
    .slice(0, 10)
    .map((c) => ({ href: `/category/${slug}/${c.area.slug}`, label: `${phrase} in ${c.area.name}`, count: c.businesses.length }));
  const sameArea = combos
    .filter((c) => c.area.slug === areaSlugValue && c.category.slug !== slug)
    .sort((a, b) => b.businesses.length - a.businesses.length)
    .map((c) => ({ href: `/category/${c.category.slug}/${areaSlugValue}`, label: `${searchPhrase(c.category.name)} in ${area.name}`, count: c.businesses.length }));

  const crumbs = [
    { name: "Home", path: "/" },
    { name: category.name, path: `/category/${slug}` },
    { name: area.name, path },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [breadcrumbList(crumbs), itemList(`${phrase} in ${area.name}`, businesses)],
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
              <i className={`${category.icon} text-sapphire`} aria-hidden="true" /> {phrase} in {area.name}
            </h1>
            <p className="page-intro">
              {count === 1
                ? `There is 1 listing for ${phraseLower} in ${area.name}, ${area.province}: ${businesses[0].name}.`
                : `There are ${count} listings for ${phraseLower} in ${area.name}, ${area.province}.`}
              {" "}Message them on WhatsApp straight from their listing, or see{" "}
              <Link href={`/category/${slug}`}>all {phraseLower}</Link> and{" "}
              <Link href={`/town/${areaSlugValue}`}>everything in {area.name}</Link>.
            </p>
          </div>

          <div className="listing-grid">
            {businesses.map((biz) => <ListingCard key={biz.id} biz={biz} show="area" />)}
          </div>
        </div>
      </section>

      {(sameArea.length > 0 || sameCategory.length > 0) && (
        <section className="section section--narrow" style={{ paddingTop: 0 }}>
          <div className="container link-list-grid">
            <LinkList title={`More in ${area.name}`} links={sameArea} />
            <LinkList title={`${phrase} in other areas`} links={sameCategory} />
          </div>
        </section>
      )}
    </>
  );
}
