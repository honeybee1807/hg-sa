-- Adds an optional featured image to blog posts — run this once, manually,
-- in the Supabase SQL Editor. Nullable: existing posts and any post
-- published without one simply have no image.
alter table public.blog_posts
  add column if not exists featured_image_url text;
