// the page for one business, e.g. hiddengemssa.co.za/business/some-bakery:
// its logo, description, contact buttons, location, links to similar
// listings, and structured data describing the business.

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { PHYSICAL_BUSINESS_TYPES, halalCertificateLabel } from "@/lib/constants";
import { getApprovedBusinesses, getArea, areaSlug, categoryByName } from "@/lib/directory";
import {
  searchPhraseLower, clampDescription, fullTitle, breadcrumbList, schemaTypeFor, sameAsLinks,
  JsonLd, absoluteUrl, ORGANIZATION_ID,
} from "@/lib/seo";
import { cloudinaryUrl, logoAlt } from "@/lib/images";
import SocialLink from "@/components/SocialLink";
import BusinessMap from "@/components/BusinessMapLoader";
import BadgePills from "@/components/BadgePills";
import Breadcrumbs from "@/components/Breadcrumbs";
import LinkList from "@/components/LinkList";

export const revalidate = 3600;

// finds one approved business by its slug. also accepts the older
// "-kwazulu-natal" version of a slug, so links shared before that suffix
// was dropped still work (the canonical URL always points to the real one).
async function getBusiness(slug) {
  const businesses = await getApprovedBusinesses();
  return businesses.find((b) => b.slug === slug) ?? businesses.find((b) => b.slug === `${slug}-kwazulu-natal`) ?? null;
}

export async function generateStaticParams() {
  const businesses = await getApprovedBusinesses();
  return businesses.map((b) => ({ slug: b.slug }));
}

// the saved WhatsApp number in "27..." format, whatever way it was stored.
function formatWhatsApp(raw) {
  if (!raw) return null;
  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly.startsWith("27")) return digitsOnly;
  if (digitsOnly.startsWith("0")) return "27" + digitsOnly.slice(1);
  return "27" + digitsOnly;
}

// the street address is only ever shown (and only ever put in structured
// data) for a shop, office or on-site service that gave one. home-based
// businesses never have an address shown anywhere.
function publicStreetAddress(biz) {
  return PHYSICAL_BUSINESS_TYPES.includes(biz.business_type) && biz.street_address ? biz.street_address : null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const biz = await getBusiness(slug);
  // a real 404 status for crawlers, before the loading screen streams.
  if (!biz) notFound();

  const area = (await getArea(areaSlug(biz.area)))?.name ?? biz.area;
  const title = `${biz.name} | ${biz.category} in ${area}`;
  const description = clampDescription(
    biz.description
      ? `${biz.description} ${biz.category} in ${area}, ${biz.province}.`
      : `${biz.name} is listed under ${biz.category} in ${area}, ${biz.province}. Message them directly on WhatsApp from Hidden Gems SA.`
  );

  return {
    title: fullTitle(title),
    description,
    alternates: { canonical: `/business/${biz.slug}` },
    openGraph: { title: `${biz.name} in ${area}`, description, url: `/business/${biz.slug}` },
  };
}

export default async function BusinessPage({ params }) {
  const { slug } = await params;
  const biz = await getBusiness(slug);
  if (!biz) notFound();

  const all = await getApprovedBusinesses();
  const myAreaSlug = areaSlug(biz.area);
  const area = await getArea(myAreaSlug);
  const areaDisplay = area?.name ?? biz.area;
  const category = categoryByName(biz.category);
  const waNumber = formatWhatsApp(biz.whatsapp);
  const streetAddress = publicStreetAddress(biz);
  const pageUrl = absoluteUrl(`/business/${biz.slug}`);

  // a few similar listings: the same category (nearest first), and other
  // businesses in the same area.
  const sameCategory = all
    .filter((b) => b.id !== biz.id && b.category === biz.category)
    .sort((a, b) => Number(areaSlug(b.area) === myAreaSlug) - Number(areaSlug(a.area) === myAreaSlug))
    .slice(0, 4);
  const sameArea = all
    .filter((b) => b.id !== biz.id && areaSlug(b.area) === myAreaSlug && b.category !== biz.category)
    .slice(0, 4);
  const sameComboCount = all.filter((b) => b.category === biz.category && areaSlug(b.area) === myAreaSlug).length;

  const crumbs = [
    { name: "Home", path: "/" },
    ...(category ? [{ name: category.name, path: `/category/${category.slug}` }] : []),
    { name: biz.name, path: `/business/${biz.slug}` },
  ];

  const logo = biz.logo_url ? cloudinaryUrl(biz.logo_url, { width: 600 }) : null;
  const sameAs = sameAsLinks(biz);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": schemaTypeFor(biz.category),
        "@id": `${pageUrl}#business`,
        name: biz.name,
        url: pageUrl,
        ...(biz.description && { description: biz.description }),
        ...(logo && { image: logo, logo }),
        ...(waNumber && { telephone: `+${waNumber}` }),
        areaServed: { "@type": "Place", name: `${areaDisplay}, ${biz.province}` },
        ...(streetAddress && {
          address: {
            "@type": "PostalAddress",
            streetAddress,
            addressLocality: areaDisplay,
            addressRegion: biz.province,
            addressCountry: "ZA",
          },
        }),
        ...(sameAs.length > 0 && { sameAs }),
      },
      breadcrumbList(crumbs),
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: `${biz.name}, ${biz.category} in ${areaDisplay}`,
        about: { "@id": `${pageUrl}#business` },
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="container section-sm">
        <Breadcrumbs items={crumbs} />
      </div>

      <div className="container biz-layout">
        <article className="biz-main">
          <div className="card biz-header">
            <div className="biz-header-logo">
              {biz.logo_url ? (
                <Image
                  src={cloudinaryUrl(biz.logo_url, { width: 320 })}
                  alt={logoAlt(biz, areaDisplay)}
                  width={120}
                  height={120}
                  className="biz-logo-img"
                  priority
                />
              ) : (
                <div className="avatar-monogram avatar-monogram--xl" aria-hidden="true">{biz.name[0].toUpperCase()}</div>
              )}
            </div>
            <div className="biz-header-info">
              <h1 className="biz-name">{biz.name}</h1>
              <div className="biz-meta">
                <span>
                  <i className={category?.icon ?? "fa-solid fa-store"} aria-hidden="true" />
                  {category ? <Link href={`/category/${category.slug}`}>{biz.category}</Link> : biz.category}
                  {biz.category === "Other" && biz.custom_category && ` (${biz.custom_category})`}
                </span>
                <span>
                  <i className="fa-solid fa-location-dot" aria-hidden="true" />
                  {area ? <Link href={`/town/${area.slug}`}>{areaDisplay}</Link> : areaDisplay}, {biz.province}
                </span>
              </div>
              {biz.business_type && (
                <span className="business-type-badge">{biz.business_type}</span>
              )}

              {(biz.halal || biz.delivery_available || biz.callouts_available) && (
                <>
                  <p className="biz-badges-heading">What they offer</p>
                  <BadgePills biz={biz} size="lg" />
                  {biz.halal && biz.halal_certificate && (
                    <p className="biz-halal-cert">
                      Certified by: {halalCertificateLabel(biz.halal_certificate)}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {biz.description && (
            <div className="card biz-section">
              <h2 className="biz-section-title">
                <i className="fa-solid fa-circle-info" aria-hidden="true" /> About {biz.name}
              </h2>
              <p>{biz.description}</p>
            </div>
          )}

          {biz.business_detail && (
            <div className="card biz-section">
              <h2 className="biz-section-title">
                <i className="fa-solid fa-list" aria-hidden="true" /> More details
              </h2>
              <p>{biz.business_detail}</p>
            </div>
          )}

          {streetAddress && (
            <BusinessMap streetAddress={streetAddress} area={areaDisplay} province={biz.province} />
          )}
        </article>

        <aside className="biz-sidebar">
          <div className="card biz-contact">
            <h2 className="biz-section-title">
              <i className="fa-solid fa-address-card" aria-hidden="true" /> Contact
            </h2>

            {waNumber && (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary biz-wa-btn"
              >
                <i className="fa-brands fa-whatsapp" aria-hidden="true" /> WhatsApp {biz.name}
              </a>
            )}

            {biz.website && (
              <a
                href={biz.website}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary biz-web-btn"
              >
                <i className="fa-solid fa-globe" aria-hidden="true" /> Visit website
              </a>
            )}

            <SocialLink platform="instagram" value={biz.instagram} className="btn-primary biz-ig-btn" />
            <SocialLink platform="facebook" value={biz.facebook} className="btn-primary biz-fb-btn" />

            {!waNumber && !biz.website && !biz.instagram && !biz.facebook && (
              <p className="biz-no-contact">This business hasn&apos;t added contact details yet.</p>
            )}
          </div>

          <div className="card biz-owner">
            <h2 className="biz-section-title">
              <i className="fa-solid fa-map" aria-hidden="true" /> Location
            </h2>
            {streetAddress && <p className="biz-street-address">{streetAddress}</p>}
            <p>
              {area ? (
                <Link href={`/town/${area.slug}`} className="biz-town-link">{areaDisplay}</Link>
              ) : areaDisplay}
              , {biz.province}
            </p>
          </div>

          <div className="card biz-owner biz-edit-prompt">
            <p className="biz-edit-prompt-text">Is this your business?</p>
            <Link href="/edit" className="btn-secondary biz-edit-prompt-btn">
              <i className="fa-solid fa-pen" aria-hidden="true" /> Edit this listing
            </Link>
          </div>
        </aside>
      </div>

      {(sameCategory.length > 0 || sameArea.length > 0) && (
        <section className="container section-sm">
          <div className="link-list-grid">
            {category && (
              <LinkList
                title={`More in ${category.name}`}
                links={[
                  ...sameCategory.map((b) => ({ href: `/business/${b.slug}`, label: `${b.name}, ${b.area.split(",")[0].trim()}` })),
                  ...(sameComboCount > 1 && area
                    ? [{ href: `/category/${category.slug}/${area.slug}`, label: `All ${searchPhraseLower(category.name)} in ${areaDisplay}`, count: sameComboCount }]
                    : []),
                  { href: `/category/${category.slug}`, label: `All ${category.name} listings` },
                ]}
              />
            )}
            {area && (
              <LinkList
                title={`More in ${areaDisplay}`}
                links={[
                  ...sameArea.map((b) => ({ href: `/business/${b.slug}`, label: `${b.name}, ${b.category}` })),
                  { href: `/town/${area.slug}`, label: `All businesses in ${areaDisplay}`, count: area.businesses.length },
                ]}
              />
            )}
          </div>
        </section>
      )}

      <div className="container section-sm">
        <p className="biz-disclaimer-note">
          Hidden Gems SA doesn&apos;t verify or endorse listed businesses. Read our full{" "}
          <Link href="/disclaimer">Disclaimer &amp; Terms of Use</Link> before engaging.
        </p>
      </div>
    </>
  );
}
