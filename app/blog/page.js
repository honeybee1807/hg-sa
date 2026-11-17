// this is the page at hiddengemssa.co.za/blog — an index of every
// published blog post, most recent first. draft posts (published = false)
// never show up here; they're only visible to an admin from within
// /admin (see the "Blog" tab in app/admin/AdminPanel.js).

import Link from "next/link";
import Image from "next/image";
import supabase from "@/lib/supabase";
import { cloudinaryUrl } from "@/lib/images";
import { breadcrumbList, JsonLd } from "@/lib/seo";
import Breadcrumbs from "@/components/Breadcrumbs";

// rebuild this page at most once an hour, so a newly published post shows
// up here without a long wait.
export const revalidate = 3600;

export const metadata = {
  title: "Blog: Local Business Stories and Guides",
  description: "Stories about local businesses in KwaZulu-Natal and South Africa, plus practical tips for getting your business found. From the Hidden Gems SA team.",
  alternates: { canonical: "/blog" },
};

// fetches every published post, newest first — draft posts are
// deliberately left out of the query itself, not just filtered out of
// what's rendered.
async function getPublishedPosts() {
  const { data } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, featured_image_url, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();
  const crumbs = [{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }];

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...breadcrumbList(crumbs) }} />
      <div className="container section-sm">
        <Breadcrumbs items={crumbs} />
      </div>

      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container">
          <div className="section-header">
            <h1><i className="fa-solid fa-newspaper text-sapphire" aria-hidden="true" /> Stories and guides</h1>
            <p>
              {posts.length > 0
                ? `${posts.length} ${posts.length === 1 ? "post" : "posts"}`
                : "No posts yet. Check back soon."}
            </p>
          </div>

          {posts.length > 0 ? (
            <div className="listing-grid">
              {posts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="listing-empty">
              <i className="fa-solid fa-newspaper" />
              <p>No blog posts yet.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function BlogCard({ post }) {
  return (
    <div className="listing-card blog-card">
      <Link href={`/blog/${post.slug}`} className="listing-card-link blog-card-link">
        {post.featured_image_url && (
          <div className="blog-card-image">
            <Image
              src={cloudinaryUrl(post.featured_image_url, { width: 800 })}
              alt={post.title}
              fill
              sizes="(max-width: 640px) 100vw, 400px"
              className="blog-card-img"
            />
          </div>
        )}
        <div className="listing-card-body">
          <h2 className="listing-card-name">{post.title}</h2>
          {post.excerpt && <p className="listing-card-desc">{post.excerpt}</p>}
        </div>
      </Link>
      <div className="listing-card-actions blog-card-actions">
        <span className="admin-view-link">Read more</span>
        <i className="fa-solid fa-chevron-right listing-card-arrow" />
      </div>
    </div>
  );
}
