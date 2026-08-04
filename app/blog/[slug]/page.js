// this is the page shown at hiddengemssa.co.za/blog/whatever-slug — one
// individual blog post. same overall shape as app/category/[slug]/page.js
// and app/town/[slug]/page.js: revalidate on a timer, a per-slug fetcher,
// generateStaticParams() for the posts that exist at build time,
// generateMetadata() for search engines, and notFound() if the slug
// doesn't resolve.
//
// a draft post (published = false) is treated exactly like a slug that
// doesn't exist at all — there's no separate "admin preview" path here on
// the public route; an admin previews an unpublished post from inside
// /admin instead (see the "Blog" tab in app/admin/AdminPanel.js).

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import supabase from "@/lib/supabase";
import { SITE_URL } from "@/lib/constants";
import SocialLink from "@/components/SocialLink";
import BadgePills from "@/components/BadgePills";

export const revalidate = 3600;

// fetches one blog post by its slug, published or not — the published
// check happens afterwards, in the page component itself, the same way a
// missing slug is handled (both end up calling notFound()).
async function getBlogPost(slug) {
  const { data } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, content, category, area, published, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

// tells Next.js every published post that exists, so those can be
// pre-built ahead of time. a draft only gets built (and only becomes
// reachable at all) once it's published.
export async function generateStaticParams() {
  const { data } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("published", true);
  return (data ?? []).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post || !post.published) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.excerpt ?? post.content.slice(0, 160),
    alternates: { canonical: `${SITE_URL}/blog/${slug}` },
  };
}

// fetches approved businesses matching this post's tagged category and/or
// area, for the "Businesses You Might Like" section below the content —
// reuses the exact same category (.eq, exact match, from
// app/category/[slug]/page.js's getBusinessesByCategory()) and area
// (.filter ilike prefix match, from app/town/[slug]/page.js's
// getBusinessesByArea()) query patterns, applied together when the post
// has both set.
async function getMatchingBusinesses(category, area) {
  if (!category && !area) return [];

  let query = supabase
    .from("businesses")
    .select("id, name, category, business_type, area, province, logo_url, slug, description, instagram, facebook, street_address, halal, delivery_available, callouts_available")
    .eq("status", "approved");

  if (category) query = query.eq("category", category);
  if (area) query = query.filter("area", "ilike", `${area}%`);

  const { data } = await query.order("name");
  return data ?? [];
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post || !post.published) notFound();

  const businesses = await getMatchingBusinesses(post.category, post.area);

  // the plain-text content is split into paragraphs on a blank line (two
  // consecutive newlines) — no rich text, nothing fancier than that.
  const paragraphs = post.content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${SITE_URL}/blog/${post.slug}#post`,
        headline: post.title,
        description: post.excerpt ?? undefined,
        articleBody: post.content,
        datePublished: post.created_at,
        dateModified: post.updated_at,
        url: `${SITE_URL}/blog/${post.slug}`,
        publisher: { "@type": "Organization", name: "Hidden Gems SA", url: SITE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
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
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <i className="fa-solid fa-chevron-right" />
          <Link href="/blog">Blog</Link>
          <i className="fa-solid fa-chevron-right" />
          <span>{post.title}</span>
        </nav>
      </div>

      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <h1>{post.title}</h1>
          <div className="blog-post-body">
            {paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
          </div>
        </div>
      </section>

      {businesses.length > 0 && (
        <section className="section section--narrow" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-header">
              <h2>Businesses You Might Like</h2>
            </div>
            <div className="listing-grid">
              {businesses.map((biz) => (
                <BusinessCard key={biz.id} biz={biz} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

// identical to the BusinessCard duplicated at the bottom of
// app/category/[slug]/page.js and app/town/[slug]/page.js — same
// per-file convention (nothing shared between these pages), not a new one.
function BusinessCard({ biz }) {
  const initial = biz.name[0].toUpperCase();
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
