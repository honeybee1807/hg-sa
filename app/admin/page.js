// this is the page at hiddengemssa.co.za/admin. it's the "front door" of
// the admin area: if you're not logged in, it shows the login form and
// stops there — it never even looks up any business data until it's
// confirmed you're logged in. this is what keeps private information
// (like a submitter's email address) from ever reaching someone who isn't
// meant to see it, no matter how they try to get to this page.

import { getAdminClient } from "@/lib/supabase-admin";
import { isAdminAuthed } from "./actions";
import LoginForm from "./LoginForm";
import AdminPanel from "./AdminPanel";

// always load this page fresh from the database — never show a cached
// (possibly outdated) version. this matters a lot for an admin panel,
// where seeing the latest pending submissions immediately is important.
export const dynamic = "force-dynamic";

// "robots: noindex" tells search engines not to list this page in their
// results, on top of it already being blocked in robots.txt — belt and
// braces, since this is a private page.
export const metadata = { title: "Admin — Hidden Gems SA", robots: "noindex" };

// fetches every business regardless of status (pending, approved, or
// rejected) so the admin panel can show all of them across its tabs.
async function getAllBusinesses() {
  const db = getAdminClient();
  const { data } = await db
    .from("businesses")
    .select("id, name, category, custom_category, area, province, whatsapp, instagram, facebook, description, owner_name, owner_email, logo_url, status, review_note, slug, is_own_business, on_behalf_of_name, on_behalf_of_reason")
    .order("created_at", { ascending: false }) // newest submissions first
  return data ?? [];
}

// fetches whichever business was most recently set as featured, so the
// admin panel can show it at the top of the page — whether that feature is
// still active or has since expired (unlike the public homepage's version
// of this query, in app/page.js, which only ever wants an active one, this
// one deliberately does NOT filter by "featured_until" still being in the
// future, so the admin can see an expired gem and its "Expired" status
// rather than the section just going blank once the week is up).
async function getCurrentFeatured() {
  const db = getAdminClient();
  const { data } = await db
    .from("featured_gem")
    .select(`*, businesses(id, name, category, area, province, logo_url, slug, whatsapp, instagram, facebook, owner_name)`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// fetches the 5 featured-gem records before the current one, for the
// admin panel's collapsible "Recent History" list. ".range(1, 5)" (after
// sorting newest-first) skips row 0 — the current gem, already covered by
// getCurrentFeatured() above — and returns the next 5.
async function getFeaturedHistory() {
  const db = getAdminClient();
  const { data } = await db
    .from("featured_gem")
    .select(`id, created_at, featured_until, businesses(id, name)`)
    .order("created_at", { ascending: false })
    .range(1, 5);
  return data ?? [];
}

export default async function AdminPage() {
  // the most important line in this whole file: if this comes back false,
  // stop here and show only the login form. nothing below this point ever
  // runs for someone who isn't logged in.
  const isLoggedIn = await isAdminAuthed();
  if (!isLoggedIn) return <LoginForm />;

  // fetch all three at once, rather than one after the other, so the page
  // loads a little faster.
  const [businesses, currentFeatured, featuredHistory] = await Promise.all([
    getAllBusinesses(),
    getCurrentFeatured(),
    getFeaturedHistory(),
  ]);

  return (
    <AdminPanel
      businesses={businesses}
      currentFeatured={currentFeatured}
      featuredHistory={featuredHistory}
    />
  );
}
