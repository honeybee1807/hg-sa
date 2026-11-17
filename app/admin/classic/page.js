// TEMPORARY fallback: the previous admin panel, unchanged, at
// hiddengemssa.co.za/admin/classic — kept reachable (behind exactly the
// same login check as /admin) until the redesigned admin at /admin has been
// confirmed working on live data. delete this folder to remove it.

import { isAdminAuthed } from "../actions";
import { getAdminData } from "../data";
import LoginForm from "../LoginForm";
import AdminPanel from "../AdminPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Classic Admin — Hidden Gems SA", robots: "noindex" };

export default async function ClassicAdminPage() {
  const isLoggedIn = await isAdminAuthed();
  if (!isLoggedIn) return <LoginForm />;

  const { businesses, currentFeatured, featuredHistory, editRequests, blogPosts } = await getAdminData();
  return (
    <AdminPanel
      businesses={businesses}
      currentFeatured={currentFeatured}
      featuredHistory={featuredHistory}
      editRequests={editRequests}
      blogPosts={blogPosts}
    />
  );
}
