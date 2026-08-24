// shared website-URL helpers — used everywhere a business's website is
// collected or validated: the original submission form
// (app/submit/SubmitForm.js, app/submit/actions.js) and the listing edit
// form (app/edit/[token]/EditListingForm.js, app/edit/actions.js). kept in
// one place so both stay in agreement about what counts as a valid website,
// the same way lib/phone.js does for WhatsApp numbers.

// turns a website value typed into either form into a normalized, checkable
// URL: a bare domain with nothing else suspicious about it, like
// "example.com" or "www.example.com", gets "https://" added on the front,
// the same way a browser's own address bar would treat it. anything already
// starting with "http://" or "https://" is left alone. anything else (an
// email address, several space-separated links, some other "scheme://") is
// returned unchanged so isValidWebsiteUrl() below can reject it — auto-
// prepending "https://" to those would risk silently turning something like
// "person@example.com" into the technically-valid URL
// "https://person@example.com" (the "@" is valid URL syntax for a userinfo
// section), which is exactly the kind of bad data this is meant to catch.
export function normalizeWebsiteUrl(raw) {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!/[\s@]/.test(trimmed) && !trimmed.includes("://")) return `https://${trimmed}`;

  return trimmed;
}

// true only for an empty value (the field is optional) or a single,
// well-formed http(s) URL with a real-looking domain (something.tld) — the
// actual backstop after normalizeWebsiteUrl() above has had a chance to fix
// up a bare domain. rejects an email address, several space-separated
// values, a non-http(s) scheme (like the "httos://" typo seen in real
// submitted data), and anything else that isn't a real single website link.
export function isValidWebsiteUrl(normalized) {
  if (!normalized) return true;
  if (/\s/.test(normalized)) return false;

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (!parsed.hostname.includes(".")) return false;

  return true;
}
