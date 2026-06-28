"use server";

import { cookies } from "next/headers";
import { createHmac } from "crypto";
import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase-admin";

function sessionToken() {
  return createHmac("sha256", process.env.ADMIN_PASSWORD ?? "")
    .update("hg_admin_v1")
    .digest("hex");
}

export async function loginAdmin(formData) {
  const password = formData.get("password")?.toString() ?? "";
  if (password !== process.env.ADMIN_PASSWORD) {
    return { success: false, error: "Incorrect password." };
  }
  const store = await cookies();
  store.set("hg_admin_session", sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return { success: true };
}

export async function logoutAdmin() {
  const store = await cookies();
  store.delete("hg_admin_session");
}

export async function isAdminAuthed() {
  const store = await cookies();
  return store.get("hg_admin_session")?.value === sessionToken();
}

function generateSlug(name, town) {
  return `${name}-${town}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function approveBusiness(id, name, town) {
  const db = getAdminClient();
  let slug = generateSlug(name, town);

  const { data: collision } = await db
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();

  if (collision) slug = `${slug}-${id}`;

  const { error } = await db
    .from("businesses")
    .update({ status: "approved", slug, review_note: null })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/towns");
  revalidatePath("/categories");
  revalidatePath(`/business/${slug}`);
  revalidatePath("/admin");
  return { success: true, slug };
}

export async function rejectBusiness(id, note) {
  const db = getAdminClient();
  const { error } = await db
    .from("businesses")
    .update({ status: "rejected", review_note: note || null })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin");
  return { success: true };
}

export async function searchBusinesses(query) {
  const db = getAdminClient();
  const { data } = await db
    .from("businesses")
    .select("id, name, category, town, logo_url, slug, whatsapp, owner_name")
    .eq("status", "approved")
    .ilike("name", `%${query}%`)
    .limit(8);
  return data ?? [];
}

export async function setFeaturedGem(businessId) {
  const db = getAdminClient();
  const featuredUntil = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await db
    .from("featured_gem")
    .insert({ business_id: businessId, featured_until: featuredUntil });

  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}

export async function autoSelectFeaturedGem() {
  const db = getAdminClient();

  const { data: businesses } = await db
    .from("businesses")
    .select("id, name, logo_url")
    .eq("status", "approved")
    .not("slug", "is", null);

  if (!businesses?.length) return { success: false, error: "No approved businesses." };

  const { data: history } = await db
    .from("featured_gem")
    .select("business_id");

  const featuredIds = new Set((history ?? []).map((r) => r.business_id));
  let pool = businesses.filter((b) => !featuredIds.has(b.id));
  if (!pool.length) pool = businesses;

  const weighted = pool.flatMap((b) => Array(b.logo_url ? 3 : 1).fill(b));
  const pick = weighted[Math.floor(Math.random() * weighted.length)];

  return setFeaturedGem(pick.id);
}
