import { getAdminClient } from "@/lib/supabase-admin";
import { isAdminAuthed } from "./actions";
import LoginForm from "./LoginForm";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Hidden Gems SA", robots: "noindex" };

async function getAllBusinesses() {
  const db = getAdminClient();
  const { data } = await db
    .from("businesses")
    .select("id, name, category, town, province, whatsapp, description, owner_name, owner_email, logo_url, status, review_note, slug")
    .order("created_at", { ascending: false });
  return data ?? [];
}

async function getCurrentFeatured() {
  const db = getAdminClient();
  const { data } = await db
    .from("featured_gem")
    .select(`*, businesses(id, name, category, town, logo_url, slug, whatsapp, owner_name)`)
    .gte("featured_until", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export default async function AdminPage() {
  const authed = await isAdminAuthed();
  if (!authed) return <LoginForm />;

  const [businesses, currentFeatured] = await Promise.all([
    getAllBusinesses(),
    getCurrentFeatured(),
  ]);

  return (
    <AdminPanel
      businesses={businesses}
      currentFeatured={currentFeatured}
    />
  );
}
