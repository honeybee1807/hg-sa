// the share preview for a blog post.
import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import supabase from "@/lib/supabase";

export const alt = "A story from Hidden Gems SA";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 3600;
export { generateStaticParams } from "./page";

export default async function Image({ params }) {
  const { slug } = await params;
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, published")
    .eq("slug", slug)
    .maybeSingle();
  if (!post?.published) return renderOg({ title: "Hidden Gems SA" });
  return renderOg({ eyebrow: "From the blog", title: post.title });
}
