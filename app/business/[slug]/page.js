// this is the page shown at hiddengemssa.co.za/business/whatever-slug —
// one individual business's own page, with its logo, description, contact
// button, and location. "[slug]" in the folder name means this same file
// handles every business's page; only the web address changes.

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import supabase from "@/lib/supabase";
import { SITE_URL, CATEGORIES, PHYSICAL_BUSINESS_TYPE, halalCertificateLabel } from "@/lib/constants";
import SocialLink from "@/components/SocialLink";
import BusinessMap from "@/components/BusinessMapLoader";
import BadgePills from "@/components/BadgePills";

// rebuild a business's page at most once an hour, so a recent admin change
// (like approving it) shows up reasonably quickly without needing to
// rebuild the page on every single visit.
export const revalidate = 3600; // 3600 seconds = 1 hour

// looks up one approved business by its web-address slug. also checks for
// an older "-kwazulu-natal" version of the slug, kept around so links
// shared before that suffix was dropped still work instead of 404-ing.
async function getBusiness(slug) {
  const { data } = await supabase
    .from("businesses")
    .select("name, category, custom_category, business_type, area, province, description, logo_url, slug, website, whatsapp, instagram, facebook, street_address, owner_name, business_detail, halal, halal_certificate, delivery_available, callouts_available")
    .eq("status", "approved")
    .or(`slug.eq.${slug},slug.eq.${slug}-kwazulu-natal`)
    .maybeSingle();
  return data;
}

// tells Next.js the full list of business pages that exist, so it can
// prepare (pre-build) all of them ahead of time rather than building each
// one from scratch on a visitor's very first visit.
export async function generateStaticParams() {
  const { data } = await supabase
    .from("businesses")
    .select("slug")
    .eq("status", "approved")
    .not("slug", "is", null);
  return (data ?? []).map((b) => ({ slug: b.slug }));
}

// builds the page title, description, and share-preview details for this
// specific business — this is what shows up in a Google search result or
// a WhatsApp link preview.
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const biz = await getBusiness(slug);
  if (!biz) return { title: "Business Not Found" };

  return {
    title: `${biz.name} — ${biz.category} in ${biz.area}, ${biz.province} | Hidden Gems SA`,
    description: biz.description ?? `${biz.name} is a local business in ${biz.area}, ${biz.province}.`,
    alternates: { canonical: `${SITE_URL}/business/${biz.slug}` },
    openGraph: {
      title: biz.name,
      description: biz.description ?? "",
      siteName: "Hidden Gems SA",
      locale: "en_ZA",
      type: "website",
      images: biz.logo_url
        ? [{ url: biz.logo_url }]
        : [{ url: "/HG_Logo.png", alt: "Hidden Gems SA – KZN Business Directory" }],
    },
  };
}

// turns a saved WhatsApp number (already stored in the "27..." format
// from when it was submitted — see app/submit/actions.js) into that exact
// format, just in case an older record was saved differently.
function formatWhatsApp(raw) {
  if (!raw) return null;
  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly.startsWith("27")) return digitsOnly;
  if (digitsOnly.startsWith("0")) return "27" + digitsOnly.slice(1);
  return "27" + digitsOnly;
}

// looks up which little icon (from the Font Awesome, or "FA", icon set)
// should sit next to a business's category name on its page — reuses the
// same icon already assigned to that category in lib/constants.js, rather
// than keeping a second, separate list here that could drift out of sync.
function getCategoryIcon(categoryName) {
  return CATEGORIES.find((c) => c.name === categoryName)?.icon ?? "fa-solid fa-store";
}

export default async function BusinessPage({ params }) {
  const { slug } = await params;
  const biz = await getBusiness(slug);
  // no business found with this web address — show the site's normal
  // "page not found" screen instead of a broken/blank page.
  if (!biz) notFound();

  const initial = biz.name[0].toUpperCase(); // fallback monogram letter, used if there's no logo
  const waNumber = formatWhatsApp(biz.whatsapp);
  const catSlug = CATEGORIES.find((c) => c.name === biz.category)?.slug ?? "";
  // some older records may store the area with extra text after it (like
  // "Estcourt, KwaZulu-Natal" instead of just "Estcourt") — only the part
  // before the first comma is the actual area name.
  const areaName = biz.area.split(",")[0].trim();
  const areaSlug = areaName.toLowerCase().replace(/\s+/g, "-");

  // the hidden, machine-readable description of this business (see the
  // longer explanation of structured data / JSON-LD in app/page.js) —
  // this is what lets Google show rich details in search results, and
  // helps AI tools describe this exact business accurately.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": `${SITE_URL}/business/${biz.slug}#business`,
        name: biz.name,
        description: biz.description ?? undefined,
        image: biz.logo_url ?? undefined,
        url: biz.website ?? undefined,
        address: {
          "@type": "PostalAddress",
          addressLocality: areaName,
          addressRegion: biz.province,
          addressCountry: "ZA",
        },
        ...(waNumber && {
          telephone: `+${waNumber}`,
          contactPoint: {
            "@type": "ContactPoint",
            telephone: `+${waNumber}`,
            contactType: "customer service",
          },
        }),
        areaServed: { "@type": "AdministrativeArea", name: areaName },
        knowsAbout: biz.category,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home",        item: SITE_URL },
          { "@type": "ListItem", position: 2, name: biz.category,  item: `${SITE_URL}/category/${catSlug}` },
          { "@type": "ListItem", position: 3, name: biz.name,      item: `${SITE_URL}/business/${biz.slug}` },
        ],
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
        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <i className="fa-solid fa-chevron-right" />
          {catSlug && <Link href={`/category/${catSlug}`}>{biz.category}</Link>}
          {catSlug && <i className="fa-solid fa-chevron-right" />}
          <span>{biz.name}</span>
        </nav>
      </div>

      <div className="container biz-layout">
        {/* Main */}
        <article className="biz-main">
          {/* Header card */}
          <div className="card biz-header">
            <div className="biz-header-logo">
              {biz.logo_url ? (
                <Image
                  src={biz.logo_url}
                  alt={`${biz.name} logo`}
                  width={120}
                  height={120}
                  className="biz-logo-img"
                />
              ) : (
                <div className="avatar-monogram avatar-monogram--xl">{initial}</div>
              )}
            </div>
            <div className="biz-header-info">
              <h1 className="biz-name">{biz.name}</h1>
              <div className="biz-meta">
                <span>
                  <i className={getCategoryIcon(biz.category)} />
                  {biz.category}
                  {biz.category === "Other" && biz.custom_category && ` — ${biz.custom_category}`}
                </span>
                <span>
                  <i className="fa-solid fa-location-dot" />
                  {areaName}, {biz.province}
                </span>
              </div>
              {biz.business_type && (
                <span className="business-type-badge">{biz.business_type}</span>
              )}

              {(biz.halal || biz.delivery_available || biz.callouts_available) && (
                <>
                  <h3 className="biz-badges-heading">About This Business</h3>
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

          {/* Description */}
          {biz.description && (
            <div className="card biz-section">
              <h2 className="biz-section-title">
                <i className="fa-solid fa-circle-info" /> About
              </h2>
              <p>{biz.description}</p>
            </div>
          )}

          {/* Business detail */}
          {biz.business_detail && (
            <div className="card biz-section">
              <h2 className="biz-section-title">
                <i className="fa-solid fa-list" /> More Details
              </h2>
              <p>{biz.business_detail}</p>
            </div>
          )}

          {/* Map — only for a physical location that's actually given a
              street address; a home-based, mobile, or online-only business
              has no fixed address to show a map of. */}
          {biz.business_type === PHYSICAL_BUSINESS_TYPE && biz.street_address && (
            <BusinessMap streetAddress={biz.street_address} area={areaName} province={biz.province} />
          )}
        </article>

        {/* Sidebar */}
        <aside className="biz-sidebar">
          {/* Contact */}
          <div className="card biz-contact">
            <h2 className="biz-section-title">
              <i className="fa-solid fa-address-card" /> Contact
            </h2>

            {waNumber && (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary biz-wa-btn"
              >
                <i className="fa-brands fa-whatsapp" /> WhatsApp {biz.owner_name ?? "Owner"}
              </a>
            )}

            {biz.website && (
              <a
                href={biz.website}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary biz-web-btn"
              >
                <i className="fa-solid fa-globe" /> Visit Website
              </a>
            )}

            <SocialLink platform="instagram" value={biz.instagram} className="btn-primary biz-ig-btn" />
            <SocialLink platform="facebook" value={biz.facebook} className="btn-primary biz-fb-btn" />

            {!waNumber && !biz.website && !biz.instagram && !biz.facebook && (
              <p className="biz-no-contact">This business hasn&apos;t added contact details yet.</p>
            )}
          </div>

          {/* Owner */}
          {biz.owner_name && (
            <div className="card biz-owner">
              <h2 className="biz-section-title">
                <i className="fa-solid fa-user" /> Owner
              </h2>
              <p>{biz.owner_name}</p>
            </div>
          )}

          {/* Location */}
          <div className="card biz-owner">
            <h2 className="biz-section-title">
              <i className="fa-solid fa-map" /> Location
            </h2>
            <p>
              <Link href={`/town/${areaSlug}`} className="biz-town-link">
                {areaName}
              </Link>
              , {biz.province}
            </p>
          </div>

          {/* Owner edit prompt */}
          <div className="card biz-owner biz-edit-prompt">
            <p className="biz-edit-prompt-text">Is this your business?</p>
            <Link href="/edit" className="btn-secondary biz-edit-prompt-btn">
              <i className="fa-solid fa-pen" /> Edit This Listing
            </Link>
          </div>
        </aside>
      </div>

      <div className="container section-sm">
        <Link href={catSlug ? `/category/${catSlug}` : "/"} className="btn-secondary">
          <i className="fa-solid fa-arrow-left" />
          Back to {biz.category}
        </Link>

        <p className="biz-disclaimer-note">
          Hidden Gems SA does not verify or endorse listed businesses. Please read our full{" "}
          <Link href="/disclaimer">Disclaimer &amp; Terms of Use</Link> before engaging.
        </p>
      </div>
    </>
  );
}
