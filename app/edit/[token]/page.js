// the page at hiddengemssa.co.za/edit/[token] — where the magic link
// emailed by requestEditLink() (see app/edit/actions.js) actually lands.
// validates the token itself (a Server Component data read, same pattern
// as getBusiness() in app/business/[slug]/page.js), then either shows the
// "this link isn't valid" message or the pre-filled edit form.

import Link from "next/link";
import { getAdminClient } from "@/lib/supabase-admin";
import EditListingForm from "./EditListingForm";

export const metadata = { title: "Edit Your Listing — Hidden Gems SA", robots: "noindex" };

// every field the edit form can change — see the "Keep" list in the
// business's edit spec: the same fields as the original submission form,
// minus the private/admin-only ones (business_detail, owner_name,
// owner_email, referral_source).
const EDITABLE_FIELDS = "id, name, category, custom_category, business_type, province, area, street_address, whatsapp, website, instagram, facebook, description, logo_url, halal, halal_certificate, delivery_available, callouts_available";

// true only while a business_edit_requests row is still usable: it
// exists, hasn't already been resolved by an admin (status is still
// "pending"), and hasn't passed its 24-hour expiry. mirrors
// editRequestIsUsable() in app/edit/actions.js — kept as a separate copy
// rather than a shared import because a "use server" actions file may
// only export async functions, and this one needs to stay synchronous.
function editRequestIsUsable(editRequest) {
  if (!editRequest) return false;
  if (editRequest.status !== "pending") return false;
  return new Date(editRequest.token_expires_at).getTime() > Date.now();
}

async function getEditableBusiness(token) {
  const db = getAdminClient();

  const { data: editRequest } = await db
    .from("business_edit_requests")
    .select("id, business_id, status, token_expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!editRequestIsUsable(editRequest)) return null;

  const { data: business } = await db
    .from("businesses")
    .select(EDITABLE_FIELDS)
    .eq("id", editRequest.business_id)
    .maybeSingle();

  return business ?? null;
}

export default async function EditTokenPage({ params }) {
  const { token } = await params;
  const business = await getEditableBusiness(token);

  if (!business) {
    return (
      <div className="container" style={{ maxWidth: 480, paddingTop: "2rem", paddingBottom: "4rem" }}>
        <div className="submit-error">
          <i className="fa-solid fa-triangle-exclamation" /> This edit link is invalid or expired — request a new one.
        </div>
        <Link href="/edit" className="btn-secondary mt-3">
          <i className="fa-solid fa-arrow-left" /> Request a New Link
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 720, paddingTop: "2rem", paddingBottom: "4rem" }}>
      <div className="submit-page-header">
        <h1>Edit Your Listing</h1>
        <p>Update your details and submit — changes go live once we review them.</p>
      </div>
      <EditListingForm token={token} business={business} />
    </div>
  );
}
