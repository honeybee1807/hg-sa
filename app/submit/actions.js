"use server";

// this file handles what happens when someone submits the "list your
// business" form: it checks everything was filled in correctly, cleans up
// the WhatsApp number into a consistent format, and saves the new business
// to the database with a "pending" status, ready for an admin to review.

import supabase from "@/lib/supabase";
import { CATEGORIES, PROVINCES } from "@/lib/constants";
import { normalizeInstagramInput } from "@/lib/social";

// a quick-to-check list of every valid category name — used below to catch
// someone submitting a category that isn't one of the real options (which
// shouldn't be possible through the form itself, but is an easy, cheap
// safety check in case the form is ever bypassed).
const VALID_CATEGORIES = new Set(CATEGORIES.map((c) => c.name));

// same idea, for the province dropdown.
const VALID_PROVINCES = new Set(PROVINCES);

// same idea, for the business type dropdown.
const VALID_BUSINESS_TYPES = new Set([
  "Physical location — customers visit us",
  "Home-based — we operate from home",
  "Mobile — we come to the customer",
  "Online only — no physical location",
]);

// the one business type that has a real, visitable street address — mirrors
// the same constant in app/submit/SubmitForm.js. used below as a server-side
// backstop, so a street address can never be saved against a business type
// that doesn't claim to have one, even if the form's own client-side clearing
// (see handleBusinessTypeChange there) were somehow bypassed.
const PHYSICAL_BUSINESS_TYPE = "Physical location — customers visit us";

// turns a WhatsApp number typed in any common format into the one format
// WhatsApp's own links understand: digits only, starting with the "27"
// South Africa country code. handles someone typing:
//   - a number starting with 0, e.g. "082 123 4567"
//   - a number already starting with the country code, e.g. "27821234567"
//   - a number with the international dialling prefix, e.g. "0027821234567"
function normalizeWhatsApp(raw) {
  if (!raw) return null;

  let digitsOnly = raw.replace(/\D/g, ""); // strip out everything that isn't a digit — spaces, dashes, brackets, "+"
  if (!digitsOnly) return null; // nothing left after stripping — not a real number

  // someone dialling the "international" way types "00" before the country
  // code instead of "+" — remove it so what's left starts with "27" like
  // the other formats below.
  if (digitsOnly.startsWith("00")) {
    digitsOnly = digitsOnly.slice(2);
  }

  if (digitsOnly.startsWith("27")) return digitsOnly; // already in the right format
  if (digitsOnly.startsWith("0")) return "27" + digitsOnly.slice(1); // swap the leading 0 for the country code
  return "27" + digitsOnly; // no recognisable prefix — just add the country code on the front
}

// checks that a normalized number ("27" followed by digits) actually looks
// like a real South African mobile number: the "27" country code, then a
// mobile prefix digit (6, 7, or 8 — landlines start with 01-05 instead), then
// exactly 8 more digits. this catches things normalizeWhatsApp() would
// otherwise happily accept, like a landline number or a string of the wrong
// length, which aren't real WhatsApp-reachable mobile numbers.
function isValidSouthAfricanMobile(normalized) {
  return /^27[678]\d{8}$/.test(normalized ?? "");
}

// this is what runs when the submit form is sent. it's given the raw form
// data, checks it thoroughly, and only saves it to the database if
// everything looks valid.
export async function submitBusiness(formData) {
  // pull every field out of the submitted form, trimming any accidental
  // leading/trailing spaces.
  const name        = formData.get("name")?.toString().trim();
  const category     = formData.get("category")?.toString().trim();
  const customCategory = formData.get("custom_category")?.toString().trim();
  const businessType = formData.get("business_type")?.toString().trim();
  const province     = formData.get("province")?.toString().trim();
  const area          = formData.get("area")?.toString().trim();
  const streetAddress = formData.get("street_address")?.toString().trim();
  const whatsapp      = formData.get("whatsapp")?.toString().trim();
  const website        = formData.get("website")?.toString().trim();
  const instagram      = formData.get("instagram")?.toString().trim();
  const facebook        = formData.get("facebook")?.toString().trim();
  const description   = formData.get("description")?.toString().trim();
  const owner_name     = formData.get("owner_name")?.toString().trim();
  const owner_email    = formData.get("owner_email")?.toString().trim();
  const referralSource = formData.get("referral_source")?.toString().trim();
  const logo_url        = formData.get("logo_url")?.toString().trim();

  // whether the person submitting this form is the business's actual
  // owner, or someone listing it on the owner's behalf (e.g. a family
  // member helping them get online). the form sends this as the text
  // "yes" or "no", so it's turned into a real true/false value here.
  const isOwnBusiness      = formData.get("is_own_business")?.toString() === "yes";
  const onBehalfOfName    = formData.get("on_behalf_of_name")?.toString().trim();
  const onBehalfOfReason  = formData.get("on_behalf_of_reason")?.toString().trim();

  // check every required field actually has something in it. (website,
  // referral_source, and logo_url are allowed to be empty — they're
  // optional.) owner_email, whatsapp, and business_type each get their own
  // specific, field-level message below instead of this generic one, since
  // they're shown inline right under their own field on the form.
  const aRequiredFieldIsMissing = !name || !category || !province || !area || !description || !owner_name;
  if (aRequiredFieldIsMissing) {
    return { success: false, error: "Please fill in all required fields." };
  }

  if (!owner_email) {
    return { success: false, error: "An email address is required. We use this to notify you when your listing has been reviewed." };
  }

  if (!whatsapp) {
    return { success: false, error: "A WhatsApp number is required. We use this to contact you directly regarding your listing." };
  }

  if (!businessType) {
    return { success: false, error: "Please select the business type that best describes how your business operates." };
  }

  // if this is being listed on someone else's behalf, both follow-up
  // questions — whose business it is, and why they're the one listing it —
  // must also be answered. these two questions don't apply at all when the
  // submitter is listing their own business.
  if (!isOwnBusiness) {
    const onBehalfOfInfoIsMissing = !onBehalfOfName || !onBehalfOfReason;
    if (onBehalfOfInfoIsMissing) {
      return { success: false, error: "Please tell us whose business this is and why you're listing it for them." };
    }
  }

  if (!VALID_CATEGORIES.has(category)) {
    return { success: false, error: "Invalid category selected." };
  }

  if (!VALID_PROVINCES.has(province)) {
    return { success: false, error: "Invalid province selected." };
  }

  if (!VALID_BUSINESS_TYPES.has(businessType)) {
    return { success: false, error: "Please select the business type that best describes how your business operates." };
  }

  // "Other" is the one category that needs a follow-up description — for
  // every other category, whatever came through in this field (there
  // shouldn't be anything, since the form clears and hides it) is ignored
  // and saved as null.
  if (category === "Other" && !customCategory) {
    return { success: false, error: "Please describe your business category" };
  }

  if (description.length > 200) {
    return { success: false, error: "Description must be 200 characters or fewer." };
  }

  const normalizedWhatsapp = normalizeWhatsApp(whatsapp);
  if (!isValidSouthAfricanMobile(normalizedWhatsapp)) {
    return { success: false, error: "Please enter a valid South African mobile number, starting with 0 or +27." };
  }

  // everything checked out — save the new business with a "pending"
  // status, so it shows up in the admin panel's "Pending" tab waiting for
  // approval. it won't appear anywhere on the public site until then. the
  // "on behalf of" details are only saved when they're actually relevant —
  // for someone listing their own business, both are stored as empty.
  const { error } = await supabase.from("businesses").insert({
    name,
    category,
    custom_category:      category === "Other" ? customCategory : null,
    business_type:         businessType,
    area,
    street_address:       businessType === PHYSICAL_BUSINESS_TYPE ? (streetAddress || null) : null,
    province,
    whatsapp:    normalizedWhatsapp,
    website:     website || null,
    instagram:   normalizeInstagramInput(instagram),
    facebook:    facebook || null,
    description,
    owner_name,
    owner_email,
    referral_source:      referralSource || null,
    logo_url:             logo_url || null,
    status:               "pending",
    is_own_business:      isOwnBusiness,
    on_behalf_of_name:    isOwnBusiness ? null : onBehalfOfName,
    on_behalf_of_reason:  isOwnBusiness ? null : onBehalfOfReason,
  });

  if (error) {
    console.error("submitBusiness error:", error);
    return { success: false, error: "Submission failed. Please try again." };
  }

  return { success: true };
}
