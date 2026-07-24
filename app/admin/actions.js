"use server";

// this file holds every action the admin panel can take: logging in and
// out, approving/rejecting a submitted business, searching businesses, and
// setting the featured "gem of the week". every one of these (except
// logging in itself) checks the visitor is actually logged in as admin
// before touching the database — see the "isAdminAuthed()" checks below.
//
// these functions run only on the server, never in a visitor's browser, so
// they're allowed to use the powerful "admin" database connection (see
// lib/supabase-admin.js) that can read and change anything.

import { cookies } from "next/headers";
import { createHmac } from "crypto";
import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase-admin";
import { CATEGORIES } from "@/lib/constants";

// builds the secret value stored in the "you are logged in" cookie. it's a
// scrambled (hashed) combination of the admin password and a fixed label —
// so the actual password is never stored anywhere, only this scrambled
// version, and it can only be recreated by someone who knows the real
// password.
function sessionToken() {
  return createHmac("sha256", process.env.ADMIN_PASSWORD ?? "")
    .update("hg_admin_v1")
    .digest("hex");
}

// checks the password typed into the login form. if it's correct, gives the
// browser a cookie proving it's logged in (good for 7 days); if not,
// returns an error message for the login form to show.
export async function loginAdmin(formData) {
  const enteredPassword = formData.get("password")?.toString() ?? "";
  const passwordIsCorrect = enteredPassword === process.env.ADMIN_PASSWORD;

  if (!passwordIsCorrect) {
    return { success: false, error: "Incorrect password." };
  }

  const store = await cookies();
  store.set("hg_admin_session", sessionToken(), {
    httpOnly: true,                              // JavaScript in the browser can't read this cookie (blocks a common type of attack)
    secure: process.env.NODE_ENV === "production", // only sent over a secure https connection, once live
    sameSite: "lax",                             // extra protection against other websites tricking the browser into sending it
    maxAge: 60 * 60 * 24 * 7,                    // stays logged in for 7 days (measured in seconds)
    path: "/",
  });
  return { success: true };
}

// logs out by deleting the "you are logged in" cookie.
export async function logoutAdmin() {
  const store = await cookies();
  store.delete("hg_admin_session");
}

// checks whether whoever is making this request is actually logged in as
// admin, by comparing their cookie against what a real logged-in cookie
// should look like. every action below that touches the database calls
// this first and refuses to continue if it comes back false.
export async function isAdminAuthed() {
  const store = await cookies();
  const cookieOnThisRequest = store.get("hg_admin_session")?.value;
  const whatALoggedInCookieShouldBe = sessionToken();
  return cookieOnThisRequest === whatALoggedInCookieShouldBe;
}

// turns a business name and area into the web-address-friendly text used
// in a business's URL, e.g. "Thandi's Bakery" in "Ladysmith" becomes
// "thandis-bakery-ladysmith" so the page lives at
// hiddengemssa.co.za/business/thandis-bakery-ladysmith
//
// this is done as a series of small clean-up steps, each one removing or
// replacing something that isn't allowed in a web address:
function generateSlug(name, area) {
  const combined = `${name}-${area}`;

  // step 1: make everything lowercase, e.g. "Thandi's" -> "thandi's"
  let cleaned = combined.toLowerCase();

  // step 2: split accented letters into a plain letter plus a separate
  // "accent mark" character, e.g. "é" becomes "e" + a mark. this is what
  // lets step 3 strip the accent mark and be left with a plain "e".
  cleaned = cleaned.normalize("NFD");

  // step 3: remove those now-separated accent marks.
  cleaned = cleaned.replace(/[̀-ͯ]/g, "");

  // step 4: remove anything that isn't a lowercase letter, a number, a
  // space, or a dash — this is what strips out the apostrophe in
  // "thandi's", punctuation, emoji, etc.
  cleaned = cleaned.replace(/[^a-z0-9\s-]/g, "");

  // step 5: turn any run of spaces into a single dash.
  cleaned = cleaned.replace(/\s+/g, "-");

  // step 6: collapse multiple dashes in a row into just one.
  cleaned = cleaned.replace(/-+/g, "-");

  // step 7: remove a leading or trailing dash, if the cleanup above left one.
  cleaned = cleaned.replace(/^-|-$/g, "");

  return cleaned;
}

// approves a pending business submission: saves whatever area the admin
// last had in the (possibly edited/standardised) area field, gives it a web
// address (slug) built from that same area, and flips its status to
// "approved" so it starts showing up on the site.
export async function approveBusiness(id, name, area, category) {
  if (!(await isAdminAuthed())) return { success: false, error: "Unauthorized." };

  const db = getAdminClient();
  let slug = generateSlug(name, area);

  // two different businesses could end up wanting the exact same web
  // address (e.g. two different "Thandi's Bakery, Ladysmith" submissions).
  // check whether another business already has this exact slug...
  const { data: anotherBusinessAlreadyHasThisSlug } = await db
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .neq("id", id) // "neq" = not equal to — ignore this same business if it was already approved before
    .maybeSingle();

  // ...and if so, make this one unique by tacking its own database id onto
  // the end, e.g. "thandis-bakery-ladysmith-482".
  if (anotherBusinessAlreadyHasThisSlug) {
    slug = `${slug}-${id}`;
  }

  const { error } = await db
    .from("businesses")
    .update({ status: "approved", slug, area, review_note: null })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  // the site caches pages for speed, which normally means a change doesn't
  // show up immediately. "revalidatePath" tells Next.js "this specific page
  // just changed, throw away the cached version so the next visitor gets a
  // freshly built one." we do this for every page that could now be
  // showing this newly-approved business.
  const areaSlug = area.split(",")[0].trim().toLowerCase().replace(/\s+/g, "-");
  const categorySlug = CATEGORIES.find((c) => c.name === category)?.slug;

  revalidatePath("/");                                    // homepage (search results, counts)
  revalidatePath("/towns");                                // "browse by area" listing counts
  revalidatePath("/categories");                            // "browse by category" listing counts
  revalidatePath(`/town/${areaSlug}`);                      // this business's own area page
  if (categorySlug) revalidatePath(`/category/${categorySlug}`); // this business's own category page
  revalidatePath(`/business/${slug}`);                      // the business's own detail page
  revalidatePath("/admin");                                 // the admin panel's own listing view
  return { success: true, slug };
}

// rejects a pending business submission, optionally saving a note
// explaining why (shown to the admin later, not to the business owner).
export async function rejectBusiness(id, note) {
  if (!(await isAdminAuthed())) return { success: false, error: "Unauthorized." };

  const db = getAdminClient();
  const { error } = await db
    .from("businesses")
    .update({ status: "rejected", review_note: note || null })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin");
  return { success: true };
}

// approves a pending listing-edit request (see app/edit/actions.js for how
// one gets created): applies exactly the fields in "proposed_changes" to
// the live businesses row — nothing else — and puts both the business and
// the request itself back into their normal, non-pending state. this is
// the only place a self-service edit ever actually reaches the public
// listing; up until now it's only ever existed as a proposal.
export async function approveEditRequest(requestId) {
  if (!(await isAdminAuthed())) return { success: false, error: "Unauthorized." };

  const db = getAdminClient();

  const { data: editRequest } = await db
    .from("business_edit_requests")
    .select("id, business_id, status, proposed_changes")
    .eq("id", requestId)
    .maybeSingle();

  if (!editRequest || editRequest.status !== "pending") {
    return { success: false, error: "This edit request has already been reviewed." };
  }

  // fetch the business's current slug, category, and area before applying
  // anything — needed below to revalidate both where it used to show up
  // and (if the category or area is one of the changed fields) where it
  // now shows up instead.
  const { data: business } = await db
    .from("businesses")
    .select("slug, category, area")
    .eq("id", editRequest.business_id)
    .maybeSingle();

  const { error: applyError } = await db
    .from("businesses")
    .update({ ...editRequest.proposed_changes, edit_status: "none" })
    .eq("id", editRequest.business_id);

  if (applyError) return { success: false, error: applyError.message };

  const { error: requestError } = await db
    .from("business_edit_requests")
    .update({ status: "approved" })
    .eq("id", requestId);

  if (requestError) return { success: false, error: requestError.message };

  // revalidate every page that could have shown this business before the
  // edit, plus (if the category or area actually changed) every page it
  // could now show up on instead — the same belt-and-braces approach
  // approveBusiness() above takes for a brand-new listing.
  revalidatePath("/");
  revalidatePath("/towns");
  revalidatePath("/categories");
  revalidatePath("/admin");
  if (business?.slug) revalidatePath(`/business/${business.slug}`);

  const areasToRevalidate = new Set();
  const categoriesToRevalidate = new Set();
  if (business?.area) areasToRevalidate.add(business.area);
  if (editRequest.proposed_changes.area) areasToRevalidate.add(editRequest.proposed_changes.area);
  if (business?.category) categoriesToRevalidate.add(business.category);
  if (editRequest.proposed_changes.category) categoriesToRevalidate.add(editRequest.proposed_changes.category);

  for (const area of areasToRevalidate) {
    const areaSlug = area.split(",")[0].trim().toLowerCase().replace(/\s+/g, "-");
    revalidatePath(`/town/${areaSlug}`);
  }
  for (const category of categoriesToRevalidate) {
    const categorySlug = CATEGORIES.find((c) => c.name === category)?.slug;
    if (categorySlug) revalidatePath(`/category/${categorySlug}`);
  }

  return { success: true };
}

// rejects a pending listing-edit request: the proposed changes are simply
// never applied (they stay sitting in the business_edit_requests row,
// which is harmless — see the "Edit Requests" tab in app/admin/AdminPanel.js,
// which only ever shows rows still at status "pending"), and the business
// goes back to normal so its owner can request a fresh edit link later.
export async function rejectEditRequest(requestId, note) {
  if (!(await isAdminAuthed())) return { success: false, error: "Unauthorized." };

  const db = getAdminClient();

  const { data: editRequest } = await db
    .from("business_edit_requests")
    .select("id, business_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!editRequest || editRequest.status !== "pending") {
    return { success: false, error: "This edit request has already been reviewed." };
  }

  const { error: requestError } = await db
    .from("business_edit_requests")
    .update({ status: "rejected", review_note: note || null })
    .eq("id", requestId);

  if (requestError) return { success: false, error: requestError.message };

  const { error: businessError } = await db
    .from("businesses")
    .update({ edit_status: "none" })
    .eq("id", editRequest.business_id);

  if (businessError) return { success: false, error: businessError.message };

  revalidatePath("/admin");
  return { success: true };
}

// permanently deletes a business, regardless of its current status
// (pending, approved, or rejected). the businesses table has "on delete
// cascade" set up for both business_edit_requests and featured_gem, so the
// database itself takes care of removing any pending edit request or
// featured-gem record tied to this business — nothing else needs to be
// deleted by hand here.
export async function deleteBusiness(id) {
  if (!(await isAdminAuthed())) return { success: false, error: "Unauthorized." };

  const db = getAdminClient();

  // fetch these before deleting, purely so the revalidation calls below can
  // still target the exact pages this business used to appear on — once the
  // row is gone there's no way to look this up again.
  const { data: business } = await db
    .from("businesses")
    .select("slug, area, category")
    .eq("id", id)
    .maybeSingle();

  const { error } = await db
    .from("businesses")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/towns");
  revalidatePath("/categories");
  revalidatePath("/admin");
  if (business?.slug) revalidatePath(`/business/${business.slug}`);
  if (business?.area) {
    const areaSlug = business.area.split(",")[0].trim().toLowerCase().replace(/\s+/g, "-");
    revalidatePath(`/town/${areaSlug}`);
  }
  if (business?.category) {
    const categorySlug = CATEGORIES.find((c) => c.name === business.category)?.slug;
    if (categorySlug) revalidatePath(`/category/${categorySlug}`);
  }

  return { success: true };
}

// used by the "search to manually set featured gem" box in the admin
// panel — finds up to 8 approved businesses whose name contains whatever
// was typed (case doesn't matter, thanks to "ilike").
export async function searchBusinesses(query) {
  if (!(await isAdminAuthed())) return [];

  const db = getAdminClient();
  const { data } = await db
    .from("businesses")
    .select("id, name, category, area, province, logo_url, slug, whatsapp, instagram, facebook, owner_name")
    .eq("status", "approved")
    .ilike("name", `%${query}%`)
    .limit(8);
  return data ?? [];
}

// the actual work of making a business this week's "featured gem" — adds a
// record that expires in 7 days. this is a plain, un-checked helper
// function (no login check inside it); the two functions below it are the
// only ones allowed to call it, and each one does its own check first in
// the way that's appropriate for who's calling it.
async function setFeaturedGemInternal(businessId) {
  const db = getAdminClient();

  // whichever row is currently the most-recently-created one (the "current"
  // gem, active or already expired — same rule getCurrentFeatured() in
  // app/admin/page.js uses) is about to be dethroned by the new one below —
  // stamp it with exactly when that happened, so the admin panel's "Recent
  // History" list can show "featured from ... to ..." instead of just a
  // duration. harmless no-op the very first time this ever runs, when
  // there's no previous row yet.
  const { data: previousGem } = await db
    .from("featured_gem")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousGem) {
    await db
      .from("featured_gem")
      .update({ replaced_at: new Date().toISOString() })
      .eq("id", previousGem.id);
  }

  const sevenDaysFromNowInMilliseconds = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const featuredUntil = new Date(sevenDaysFromNowInMilliseconds).toISOString();

  const { error } = await db
    .from("featured_gem")
    .insert({ business_id: businessId, featured_until: featuredUntil });

  if (error) return { success: false, error: error.message };
  revalidatePath("/");     // homepage shows the featured gem
  revalidatePath("/admin"); // admin panel shows who's currently featured
  return { success: true };
}

// the version of the above that the admin panel's "set featured" button
// calls directly — checks the visitor is actually logged in first.
export async function setFeaturedGem(businessId) {
  if (!(await isAdminAuthed())) return { success: false, error: "Unauthorized." };
  return setFeaturedGemInternal(businessId);
}

// automatically picks this week's featured gem — used both by the admin
// panel's "Auto-select This Week's Gem" button and by the Monday morning
// cron job. the picking rules, in plain terms:
//   1. prefer a business that's never been featured before, so the
//      spotlight rotates around rather than repeating the same few.
//   2. if every business has already had a turn, it's fine to pick from
//      everyone again.
//   3. a business with a logo is three times more likely to be picked than
//      one without — a logo just makes for a better-looking feature.
async function autoSelectFeaturedGemInternal() {
  const db = getAdminClient();

  const { data: businesses } = await db
    .from("businesses")
    .select("id, name, logo_url")
    .eq("status", "approved")
    .not("slug", "is", null);

  if (!businesses?.length) return { success: false, error: "No approved businesses." };

  // get the full history of who's been featured before.
  const { data: history } = await db
    .from("featured_gem")
    .select("business_id");

  const idsAlreadyFeaturedBefore = new Set((history ?? []).map((record) => record.business_id));

  // rule 1 & 2: start with only the never-featured businesses. if that
  // leaves nobody (everyone's had a turn already), fall back to the full
  // list instead.
  let candidateBusinesses = businesses.filter((b) => !idsAlreadyFeaturedBefore.has(b.id));
  if (candidateBusinesses.length === 0) {
    candidateBusinesses = businesses;
  }

  // rule 3: build a "weighted lottery" — a business with a logo gets 3
  // tickets in the draw, a business without one gets 1 ticket. more
  // tickets means a better chance of being picked, without making it
  // impossible for a business without a logo to be chosen.
  const lotteryTickets = [];
  for (const business of candidateBusinesses) {
    const ticketsForThisBusiness = business.logo_url ? 3 : 1;
    for (let i = 0; i < ticketsForThisBusiness; i++) {
      lotteryTickets.push(business);
    }
  }

  // draw one ticket at random.
  const randomIndex = Math.floor(Math.random() * lotteryTickets.length);
  const chosenBusiness = lotteryTickets[randomIndex];

  return setFeaturedGemInternal(chosenBusiness.id);
}

// the version the admin panel's own button calls — checks the visitor is
// actually logged in first.
export async function autoSelectFeaturedGem() {
  if (!(await isAdminAuthed())) return { success: false, error: "Unauthorized." };
  return autoSelectFeaturedGemInternal();
}

// a separate entry point made specifically for the Monday-morning
// automatic job (see app/api/cron/featured-gem/route.js). that job isn't
// running in a browser at all, so it can never have the "logged in"
// cookie — instead, it proves it's allowed to run by sending a secret
// password (CRON_SECRET) which that route already checks before it ever
// calls this function. so this one deliberately does NOT check for the
// admin cookie — it would always fail that check and break the Monday job.
export async function autoSelectFeaturedGemForCron() {
  return autoSelectFeaturedGemInternal();
}
