import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import supabase from "@/lib/supabase";
import { SITE_URL, CATEGORIES } from "@/lib/constants";

export const revalidate = 3600;

async function getBusiness(slug) {
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  return data;
}

export async function generateStaticParams() {
  const { data } = await supabase
    .from("businesses")
    .select("slug")
    .eq("status", "approved")
    .not("slug", "is", null);
  return (data ?? []).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const biz = await getBusiness(slug);
  if (!biz) return { title: "Business Not Found" };

  return {
    title: `${biz.name} — ${biz.town}, KZN`,
    description: biz.description ?? `${biz.name} is a local business in ${biz.town}, KwaZulu-Natal.`,
    alternates: { canonical: `${SITE_URL}/business/${biz.slug}` },
    openGraph: {
      title: biz.name,
      description: biz.description ?? "",
      images: biz.logo_url ? [{ url: biz.logo_url }] : [],
    },
  };
}

function formatWhatsApp(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("27")) return digits;
  if (digits.startsWith("0")) return "27" + digits.slice(1);
  return "27" + digits;
}

function getCategoryIcon(categoryName) {
  const CATEGORIES_MAP = {
    "Baking & Catering":    "fa-bread-slice",
    "Tutoring & Education": "fa-graduation-cap",
    "Transport & Delivery": "fa-car",
    "Beauty & Hair":        "fa-scissors",
    "Health & Wellness":    "fa-heart-pulse",
    "Trades & Repairs":     "fa-wrench",
    "Clothing & Fashion":   "fa-shirt",
    "Cleaning Services":    "fa-broom",
    "Photography & Events": "fa-camera",
    "General Services":     "fa-star",
  };
  return CATEGORIES_MAP[categoryName] ?? "fa-store";
}

export default async function BusinessPage({ params }) {
  const { slug } = await params;
  const biz = await getBusiness(slug);
  if (!biz) notFound();

  const initial = biz.name[0].toUpperCase();
  const waNumber = formatWhatsApp(biz.whatsapp);
  const catSlug = CATEGORIES.find((c) => c.name === biz.category)?.slug ?? "";
  const townSlug = biz.town.toLowerCase().replace(/\s+/g, "-");

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
          addressLocality: biz.town,
          addressRegion: "KwaZulu-Natal",
          addressCountry: "ZA",
        },
        ...(waNumber && {
          contactPoint: {
            "@type": "ContactPoint",
            telephone: `+${waNumber}`,
            contactType: "customer service",
            contactOption: "TollFree",
          },
        }),
        areaServed: { "@type": "AdministrativeArea", name: biz.town },
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
                  <i className={`fa-solid ${getCategoryIcon(biz.category)}`} />
                  {biz.category}
                </span>
                <span>
                  <i className="fa-solid fa-location-dot" />
                  {biz.town}, {biz.province}
                </span>
              </div>
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

            {!waNumber && !biz.website && (
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
              <Link href={`/town/${townSlug}`} className="biz-town-link">
                {biz.town}
              </Link>
              , KwaZulu-Natal
            </p>
          </div>
        </aside>
      </div>

      <div className="container section-sm">
        <Link href={catSlug ? `/category/${catSlug}` : "/"} className="btn-secondary">
          <i className="fa-solid fa-arrow-left" />
          Back to {biz.category}
        </Link>
      </div>
    </>
  );
}
