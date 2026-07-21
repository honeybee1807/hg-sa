"use server";

// this file handles what happens when someone submits the "list your
// business" form: it checks everything was filled in correctly, cleans up
// the WhatsApp number into a consistent format, and saves the new business
// to the database with a "pending" status, ready for an admin to review.

import supabase from "@/lib/supabase";
import { CATEGORIES, TOWNS } from "@/lib/constants";

// a quick-to-check list of every valid category name — used below to catch
// someone submitting a category that isn't one of the real options (which
// shouldn't be possible through the form itself, but is an easy, cheap
// safety check in case the form is ever bypassed).
const VALID_CATEGORIES = new Set(CATEGORIES.map((c) => c.name));

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

// this is what runs when the submit form is sent. it's given the raw form
// data, checks it thoroughly, and only saves it to the database if
// everything looks valid.
export async function submitBusiness(formData) {
  // pull every field out of the submitted form, trimming any accidental
  // leading/trailing spaces.
  const name        = formData.get("name")?.toString().trim();
  const category     = formData.get("category")?.toString().trim();
  const customCategory = formData.get("custom_category")?.toString().trim();
  const town         = formData.get("town")?.toString().trim();
  const whatsapp      = formData.get("whatsapp")?.toString().trim();
  const website        = formData.get("website")?.toString().trim();
  const description   = formData.get("description")?.toString().trim();
  const owner_name     = formData.get("owner_name")?.toString().trim();
  const owner_email    = formData.get("owner_email")?.toString().trim();
  const logo_url        = formData.get("logo_url")?.toString().trim();

  // whether the person submitting this form is the business's actual
  // owner, or someone listing it on the owner's behalf (e.g. a family
  // member helping them get online). the form sends this as the text
  // "yes" or "no", so it's turned into a real true/false value here.
  const isOwnBusiness      = formData.get("is_own_business")?.toString() === "yes";
  const onBehalfOfName    = formData.get("on_behalf_of_name")?.toString().trim();
  const onBehalfOfReason  = formData.get("on_behalf_of_reason")?.toString().trim();

  // check every required field actually has something in it. (website,
  // owner_email, and logo_url are allowed to be empty — they're optional.)
  const aRequiredFieldIsMissing = !name || !category || !town || !whatsapp || !description || !owner_name;
  if (aRequiredFieldIsMissing) {
    return { success: false, error: "Please fill in all required fields." };
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
  if (!normalizedWhatsapp) {
    return { success: false, error: "Please enter a valid WhatsApp number." };
  }

  // everything checked out — save the new business with a "pending"
  // status, so it shows up in the admin panel's "Pending" tab waiting for
  // approval. it won't appear anywhere on the public site until then. the
  // "on behalf of" details are only saved when they're actually relevant —
  // for someone listing their own business, both are stored as empty.
  // only the 12 listed KwaZulu-Natal towns are known to be in that
  // province — anyone who typed in their own town via the "Somewhere else
  // in South Africa" option could be anywhere, so their province is left
  // unset rather than guessed.
  const province = TOWNS.includes(town) ? "KwaZulu-Natal" : null;

  const { error } = await supabase.from("businesses").insert({
    name,
    category,
    custom_category:      category === "Other" ? customCategory : null,
    town,
    province,
    whatsapp:    normalizedWhatsapp,
    website:     website || null,
    description,
    owner_name,
    owner_email:         owner_email || null,
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
