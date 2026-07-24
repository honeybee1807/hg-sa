// shared South African phone number helpers — used everywhere a WhatsApp
// number is collected or validated: the original submission form
// (app/submit/SubmitForm.js, app/submit/actions.js) and the listing edit
// form (app/edit/[token]/EditListingForm.js, app/edit/actions.js). kept in
// one place so all four stay in agreement about what counts as a valid
// number, rather than drifting apart as separate copies.

// turns a WhatsApp number typed in any common format into the one format
// WhatsApp's own links understand: digits only, starting with the "27"
// South Africa country code. handles someone typing:
//   - a number starting with 0, e.g. "082 123 4567"
//   - a number already starting with the country code, e.g. "27821234567"
//   - a number with the international dialling prefix, e.g. "0027821234567"
export function normalizeWhatsApp(raw) {
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
export function isValidSouthAfricanMobile(normalized) {
  return /^27[678]\d{8}$/.test(normalized ?? "");
}
