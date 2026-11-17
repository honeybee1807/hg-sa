// the read-only data fetches behind the admin area, shared by the new
// admin (app/admin/page.js) and the classic fallback panel
// (app/admin/classic/page.js). moved here unchanged from app/admin/page.js
// so both routes load exactly the same data the same way.
//
// IMPORTANT: only ever call these AFTER isAdminAuthed() has come back true
// — see the two page.js files, which both check that first and show the
// login form instead if it fails. nothing in here checks it by itself.
//
// this is a plain server module (no "use server" at the top on purpose —
// that would turn every function here into a publicly callable action).

import { getAdminClient } from "@/lib/supabase-admin";

// fetches every business regardless of status (pending, approved, or
// rejected) so the admin panel can show all of them across its tabs.
// created_at, business_type, website and halal_certificate are existing
// columns of these same rows, read so the redesigned admin can show the
// submitted date, business type, website and Halal certificate in its
// review drawer.
export async function getAllBusinesses() {
  const db = getAdminClient();
  const { data } = await db
    .from("businesses")
    .select("id, name, category, custom_category, business_type, area, province, street_address, whatsapp, website, instagram, facebook, description, owner_name, owner_email, logo_url, status, review_note, slug, is_own_business, on_behalf_of_name, on_behalf_of_reason, halal, halal_certificate, delivery_available, callouts_available, created_at")
    .order("created_at", { ascending: false }) // newest submissions first
  return data ?? [];
}

// fetches whichever business was most recently set as featured — active or
// already expired (deliberately no "featured_until in the future" filter,
// unlike the public homepage's version in app/page.js, so the admin can see
// an expired gem and its "Expired" status).
export async function getCurrentFeatured() {
  const db = getAdminClient();
  const { data } = await db
    .from("featured_gem")
    .select(`*, businesses(id, name, category, area, province, logo_url, slug, whatsapp, instagram, facebook, owner_name)`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// the 5 featured-gem records before the current one, for the "Recent
// History" list. ".range(1, 5)" skips row 0 (the current gem, already
// covered by getCurrentFeatured() above). "replaced_at" is when the *next*
// gem after this one was set (see setFeaturedGemInternal in
// app/admin/actions.js).
export async function getFeaturedHistory() {
  const db = getAdminClient();
  const { data } = await db
    .from("featured_gem")
    .select(`id, created_at, featured_until, replaced_at, businesses(id, name, logo_url)`)
    .order("created_at", { ascending: false })
    .range(1, 5);
  return data ?? [];
}

// every listing-edit request still awaiting review, alongside the business
// it belongs to. filters out rows that exist only because someone requested
// a magic link but never submitted any changes (proposed_changes starts out
// as an empty object — see requestEditLink in app/edit/actions.js).
export async function getEditRequests() {
  const db = getAdminClient();
  const { data } = await db
    .from("business_edit_requests")
    .select(`id, business_id, proposed_changes, created_at, businesses(id, name, category, custom_category, business_type, province, area, street_address, whatsapp, website, instagram, facebook, description, logo_url, slug)`)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (data ?? []).filter((request) => Object.keys(request.proposed_changes ?? {}).length > 0);
}

// every blog post — published and draft alike — for the admin's blog
// section (the public blog pages only ever ask for published posts).
export async function getBlogPosts() {
  const db = getAdminClient();
  const { data } = await db
    .from("blog_posts")
    .select("id, title, slug, excerpt, content, category, area, published, featured_image_url, created_at, updated_at")
    .order("updated_at", { ascending: false });
  return data ?? [];
}

// everything the admin needs, fetched in parallel.
export async function getAdminData() {
  const [businesses, currentFeatured, featuredHistory, editRequests, blogPosts] = await Promise.all([
    getAllBusinesses(),
    getCurrentFeatured(),
    getFeaturedHistory(),
    getEditRequests(),
    getBlogPosts(),
  ]);
  return { businesses, currentFeatured, featuredHistory, editRequests, blogPosts };
}
