"use server";

// every server action for the public "edit your listing" flow:
// requesting a magic link by email (requestEditLink, used by
// app/edit/EditRequestForm.js), and submitting proposed changes once
// someone's clicked that link (submitEditRequest, used by
// app/edit/[token]/EditListingForm.js).
//
// neither of these ever touches the live businesses row directly — they
// only ever write to business_edit_requests as a *proposal*. an admin has
// to actually approve it (see approveEditRequest in app/admin/actions.js)
// before any of it reaches the public listing.
//
// both use the admin/service-role Supabase client rather than the public
// one: looking a business up by owner_email needs to read a column the
// public "anon" key was deliberately never given access to (see the note
// at the top of lib/supabase.js), and business_edit_requests has no
// legitimate anonymous-browsing use case at all — every access to it goes
// through a token that was emailed directly to the business owner, never
// through an open query a visitor's browser could run for itself.

import { randomUUID } from "crypto";
import { getAdminClient } from "@/lib/supabase-admin";
import { CATEGORIES, PROVINCES, BUSINESS_TYPES, PHYSICAL_BUSINESS_TYPES, SITE_URL, BADGE_CATEGORY_VISIBILITY } from "@/lib/constants";
import { normalizeInstagramInput } from "@/lib/social";
import { normalizeWhatsApp, isValidSouthAfricanMobile } from "@/lib/phone";
import { sendEditLinkEmail } from "@/lib/email";

const VALID_CATEGORIES = new Set(CATEGORIES.map((c) => c.name));
const VALID_PROVINCES = new Set(PROVINCES);
const VALID_BUSINESS_TYPES = new Set(BUSINESS_TYPES);

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours

// step 1 of the flow: someone types their email at hiddengemssa.co.za/edit.
// if it matches an approved business, this generates a one-time token,
// saves it as a new (still-empty) business_edit_requests row, and emails
// them a link built around that token.
export async function requestEditLink(formData) {
  const email = formData.get("email")?.toString().trim();
  if (!email) {
    return { success: false, error: "Please enter your email address." };
  }

  const db = getAdminClient();

  const { data: business } = await db
    .from("businesses")
    .select("id, name, owner_email, edit_status")
    .eq("status", "approved")
    .ilike("owner_email", email)
    .maybeSingle();

  if (!business) {
    return {
      success: false,
      error: "No approved listing found for that email address. If you believe this is an error, please contact us.",
    };
  }

  if (business.edit_status === "pending_edit") {
    return {
      success: false,
      error: "You already have a pending edit request under review. Please wait for it to be reviewed before submitting another.",
    };
  }

  const token = randomUUID();
  const tokenExpiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS).toISOString();

  const { error: insertError } = await db.from("business_edit_requests").insert({
    business_id: business.id,
    token,
    token_expires_at: tokenExpiresAt,
    proposed_changes: {},
    status: "pending",
  });

  if (insertError) {
    console.error("requestEditLink insert error:", insertError);
    return { success: false, error: "Something went wrong. Please try again." };
  }

  const editUrl = `${SITE_URL}/edit/${token}`;
  const emailResult = await sendEditLinkEmail({ to: business.owner_email, businessName: business.name, editUrl });

  if (!emailResult.success) {
    return { success: false, error: "We couldn't send the edit link email. Please try again shortly." };
  }

  return {
    success: true,
    message: "A secure edit link has been sent to your email address. It will expire in 24 hours.",
  };
}

// true only while a business_edit_requests row is still usable: it exists,
// hasn't already been acted on by an admin (status is still "pending"),
// and hasn't passed its 24-hour expiry. used both by
// app/edit/[token]/page.js (on page load) and submitEditRequest below
// (re-checked at submit time, in case the token expired or an admin
// somehow already resolved it in between).
function editRequestIsUsable(editRequest) {
  if (!editRequest) return false;
  if (editRequest.status !== "pending") return false;
  return new Date(editRequest.token_expires_at).getTime() > Date.now();
}

// re-runs the same required-field checks the edit form itself already ran
// in the browser (see validateForm() in EditListingForm.js) — a backstop
// in case JavaScript was ever unavailable or bypassed, mirroring the same
// two-layer approach used by app/submit/actions.js. returns either
// { error } or the fully normalized set of values every editable field
// should end up holding, ready to be compared against the business's
// current row.
function buildEditedValues(formData) {
  const name         = formData.get("name")?.toString().trim();
  const category      = formData.get("category")?.toString().trim();
  const customCategory = formData.get("custom_category")?.toString().trim();
  const businessType  = formData.get("business_type")?.toString().trim();
  const province       = formData.get("province")?.toString().trim();
  const area             = formData.get("area")?.toString().trim();
  const streetAddress   = formData.get("street_address")?.toString().trim();
  const whatsapp         = formData.get("whatsapp")?.toString().trim();
  const website           = formData.get("website")?.toString().trim();
  const instagram         = formData.get("instagram")?.toString().trim();
  const facebook           = formData.get("facebook")?.toString().trim();
  const description       = formData.get("description")?.toString().trim();
  const logoUrl             = formData.get("logo_url")?.toString().trim();

  const halal              = formData.get("halal")?.toString() === "true";
  const halalCertificate   = formData.get("halal_certificate")?.toString().trim();
  const deliveryAvailable  = formData.get("delivery_available")?.toString() === "true";
  const calloutsAvailable  = formData.get("callouts_available")?.toString() === "true";

  if (!name || !category || !businessType || !province || !area || !description) {
    return { error: "Please fill in all required fields." };
  }
  if (category === "Other" && !customCategory) {
    return { error: "Please describe your business category." };
  }
  if (!VALID_CATEGORIES.has(category)) {
    return { error: "Invalid category selected." };
  }
  if (!VALID_PROVINCES.has(province)) {
    return { error: "Invalid province selected." };
  }
  if (!VALID_BUSINESS_TYPES.has(businessType)) {
    return { error: "Please select the business type that best describes how your business operates." };
  }
  if (description.length > 200) {
    return { error: "Description must be 200 characters or fewer." };
  }
  if (!whatsapp) {
    return { error: "A WhatsApp number is required. We use this to contact you directly regarding your listing." };
  }
  const normalizedWhatsapp = normalizeWhatsApp(whatsapp);
  if (!isValidSouthAfricanMobile(normalizedWhatsapp)) {
    return { error: "Please enter a valid South African mobile number, starting with 0 or +27." };
  }

  // same backstop as submitBusiness() in app/submit/actions.js: re-check
  // each badge against the now-validated category, in case one was still
  // marked true for a category that doesn't offer it.
  const finalHalal            = BADGE_CATEGORY_VISIBILITY.halal.includes(category) && halal;
  const finalHalalCertificate = finalHalal ? (halalCertificate || null) : null;
  const finalDelivery         = BADGE_CATEGORY_VISIBILITY.delivery.includes(category) && deliveryAvailable;
  const finalCallouts         = BADGE_CATEGORY_VISIBILITY.callouts.includes(category) && calloutsAvailable;

  if (finalHalal && !finalHalalCertificate) {
    return { error: "Please select your Halal certificate type." };
  }

  return {
    values: {
      name,
      category,
      custom_category: category === "Other" ? customCategory : null,
      business_type: businessType,
      province,
      area,
      street_address: PHYSICAL_BUSINESS_TYPES.includes(businessType) ? (streetAddress || null) : null,
      whatsapp: normalizedWhatsapp,
      website: website || null,
      instagram: normalizeInstagramInput(instagram),
      facebook: facebook || null,
      description,
      logo_url: logoUrl || null,
      halal: finalHalal,
      halal_certificate: finalHalalCertificate,
      delivery_available: finalDelivery,
      callouts_available: finalCallouts,
    },
  };
}

// treats null, undefined, and "" as the same "nothing here" value, so a
// field that's blank in the database and left blank on the form doesn't
// get flagged as "changed" just because one is null and the other is an
// empty string.
function valuesAreEqual(a, b) {
  const normalize = (value) => (value === undefined || value === null || value === "" ? null : value);
  return normalize(a) === normalize(b);
}

// step 2 of the flow: someone's followed the emailed link, edited the
// pre-filled form, and hit submit. builds a diff against the business's
// actual current values — only the fields that actually changed are saved
// to proposed_changes — and marks the business as having a pending edit,
// so it shows up in the admin's "Edit Requests" tab. the live businesses
// row itself is never touched here; see approveEditRequest in
// app/admin/actions.js for the only place that happens.
export async function submitEditRequest(token, formData) {
  const db = getAdminClient();

  const { data: editRequest } = await db
    .from("business_edit_requests")
    .select("id, business_id, status, token_expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!editRequestIsUsable(editRequest)) {
    return { success: false, invalidToken: true, error: "This edit link is invalid or has expired. Please request a new one." };
  }

  // the consent checkbox already gates the submit button client-side (see
  // EditListingForm.js), but that's only ever a UI convenience — this is
  // the actual backstop, mirroring the same check submitBusiness() runs in
  // app/submit/actions.js.
  const consent = formData.get("consent")?.toString() === "true";
  if (!consent) {
    return { success: false, error: "Please confirm you agree to the Disclaimer & Terms of Use before submitting." };
  }

  const { values, error: validationError } = buildEditedValues(formData);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { data: currentBusiness } = await db
    .from("businesses")
    .select("name, category, custom_category, business_type, province, area, street_address, whatsapp, website, instagram, facebook, description, logo_url, halal, halal_certificate, delivery_available, callouts_available")
    .eq("id", editRequest.business_id)
    .maybeSingle();

  if (!currentBusiness) {
    return { success: false, error: "This listing could no longer be found. Please contact us for help." };
  }

  const proposedChanges = {};
  for (const field of Object.keys(values)) {
    if (!valuesAreEqual(values[field], currentBusiness[field])) {
      proposedChanges[field] = values[field];
    }
  }

  if (Object.keys(proposedChanges).length === 0) {
    return { success: false, error: "No changes were detected. Please update at least one field before submitting." };
  }

  const { error: updateRequestError } = await db
    .from("business_edit_requests")
    .update({ proposed_changes: proposedChanges })
    .eq("id", editRequest.id);

  if (updateRequestError) {
    console.error("submitEditRequest update error:", updateRequestError);
    return { success: false, error: "Something went wrong while saving your changes. Please try again." };
  }

  const { error: updateBusinessError } = await db
    .from("businesses")
    .update({ edit_status: "pending_edit" })
    .eq("id", editRequest.business_id);

  if (updateBusinessError) {
    console.error("submitEditRequest edit_status update error:", updateBusinessError);
    return { success: false, error: "Something went wrong while saving your changes. Please try again." };
  }

  return {
    success: true,
    message: "Your changes have been submitted for review. We will notify you once they have been reviewed.",
  };
}
