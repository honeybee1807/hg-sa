// one blog post, e.g. hiddengemssa.co.za/blog/some-post. a draft
// (published = false) is treated exactly like a post that doesn't exist;
// drafts are only ever seen from inside /admin.

import { notFound } from "next/navigation";
import Image from "next/image";
import supabase from "@/lib/supabase";
import { getApprovedBusinesses, getArea, areaSlug } from "@/lib/directory";
import { clampDescription, fullTitle, breadcrumbList, JsonLd, absoluteUrl, ORGANIZATION_ID, SITE_NAME } from "@/lib/seo";
import { cloudinaryUrl } from "@/lib/images";
import ListingCard from "@/components/ListingCard";
import Breadcrumbs from "@/components/Breadcrumbs";

export const revalidate = 3600;

async function getBlogPost(slug) {
  const { data } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, content, category, area, published, featured_image_url, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

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
  if (!post || !post.published) notFound();
  // a short excerpt is topped up with the start of the post, so the
  // description is a useful length.
  const description = clampDescription(
    post.excerpt && post.excerpt.length >= 110 ? post.excerpt : `${post.excerpt ?? ""} ${post.content}`
  );
  return {
    title: fullTitle(post.title),
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description,
      url: `/blog/${slug}`,
      type: "article",
      publishedTime: post.created_at,
      modifiedTime: post.updated_at ?? post.created_at,
    },
  };
}

// approved businesses matching the post's tagged category and/or area,
// for the "Businesses you might like" section under the post.
async function getMatchingBusinesses(category, area) {
  if (!category && !area) return [];
  const businesses = await getApprovedBusinesses();
  const wantedArea = area ? areaSlug(area) : null;
  return businesses.filter(
    (b) => (!category || b.category === category) && (!wantedArea || areaSlug(b.area) === wantedArea)
  );
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post || !post.published) notFound();

  const businesses = await getMatchingBusinesses(post.category, post.area);
  const areaLabel = post.area ? (await getArea(areaSlug(post.area)))?.name ?? post.area : null;

  // the content is plain text, split into paragraphs on blank lines.
  const paragraphs = post.content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const pageUrl = absoluteUrl(`/blog/${post.slug}`);
  const image = post.featured_image_url ? cloudinaryUrl(post.featured_image_url, { width: 1200 }) : null;

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${pageUrl}#post`,
        mainEntityOfPage: pageUrl,
        url: pageUrl,
        headline: post.title,
        ...(post.excerpt && { description: post.excerpt }),
        datePublished: post.created_at,
        dateModified: post.updated_at ?? post.created_at,
        ...(image && { image }),
        inLanguage: "en-ZA",
        author: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
        publisher: { "@id": ORGANIZATION_ID },
      },
      breadcrumbList(crumbs),
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="container section-sm">
        <Breadcrumbs items={crumbs} />
      </div>

      <section className="section" style={{ paddingTop: "1rem" }}>
        <article className="container" style={{ maxWidth: 760 }}>
          {post.featured_image_url && (
            <div className="blog-post-featured-image">
              <Image
                src={cloudinaryUrl(post.featured_image_url, { width: 1600 })}
                alt={post.title}
                fill
                sizes="(max-width: 800px) 100vw, 760px"
                className="blog-post-featured-img"
                priority
              />
            </div>
          )}
          <h1>{post.title}</h1>
          <div className="blog-post-body">
            {paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
          </div>
        </article>
      </section>

      {businesses.length > 0 && (
        <section className="section section--narrow" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-header">
              <h2>
                Businesses you might like
                {post.category && areaLabel ? `: ${post.category} in ${areaLabel}` : post.category ? `: ${post.category}` : areaLabel ? ` in ${areaLabel}` : ""}
              </h2>
            </div>
            <div className="listing-grid">
              {businesses.map((biz) => <ListingCard key={biz.id} biz={biz} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
