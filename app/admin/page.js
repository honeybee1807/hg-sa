// this is the page at hiddengemssa.co.za/admin. it's the "front door" of
// the admin area: if you're not logged in, it shows the login form and
// stops there — it never even looks up any business data until it's
// confirmed you're logged in. this is what keeps private information
// (like a submitter's email address) from ever reaching someone who isn't
// meant to see it, no matter how they try to get to this page.
//
// the previous admin panel is still reachable, behind the same login, at
// /admin/classic (see app/admin/classic/page.js) as a temporary fallback.

import { isAdminAuthed } from "./actions";
import { getAdminData } from "./data";
import LoginForm from "./LoginForm";
import AdminApp from "./_components/AdminApp";

// always load this page fresh from the database — never show a cached
// (possibly outdated) version.
export const dynamic = "force-dynamic";

// "robots: noindex" tells search engines not to list this page in their
// results, on top of it already being blocked in robots.txt.
export const metadata = { title: "Admin — Hidden Gems SA", robots: "noindex" };

export default async function AdminPage() {
  // the most important line in this whole file: if this comes back false,
  // stop here and show only the login form. nothing below this point ever
  // runs for someone who isn't logged in.
  const isLoggedIn = await isAdminAuthed();
  if (!isLoggedIn) return <LoginForm />;

  const data = await getAdminData();
  return <AdminApp {...data} />;
}
