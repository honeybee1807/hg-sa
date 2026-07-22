// shared helpers for turning whatever a business owner typed into their
// Instagram/Facebook field — a bare handle, an "@handle", or a full profile
// URL — into a clean, clickable URL, and (for Instagram) the plain username
// needed by the native-app deep link on its own. pure string logic, safe to
// import from both server and client code.

// used once, at save time (see app/submit/actions.js): turns a typed
// "@handle" into the full profile URL before it's stored. anything not
// starting with "@" (a full URL, or a bare handle with no "@") is saved
// exactly as typed.
export function normalizeInstagramInput(raw) {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("@") ? `https://instagram.com/${trimmed.slice(1)}` : trimmed;
}

// pulls just the plain username back out of a saved Instagram value,
// whichever format it was saved in (a full URL, per normalizeInstagramInput
// above, or an older bare handle) — this is what the native-app deep link
// needs (see components/SocialLink.js), since "instagram://user?username=..."
// takes a bare username, not a URL.
export function instagramUsername(saved) {
  const trimmed = saved?.trim().replace(/^@/, "");
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).pathname.split("/").filter(Boolean)[0] || null;
    } catch {
      return null;
    }
  }
  return trimmed.split("/").filter(Boolean)[0] || null;
}

// the clickable https:// URL for a saved Instagram value — built from
// instagramUsername() above, for places (like the admin panel) that just
// need a plain link rather than the native-app deep link.
export function instagramUrl(saved) {
  const username = instagramUsername(saved);
  return username ? `https://instagram.com/${username}` : null;
}

// turns a saved Facebook value into a clean, clickable https:// URL —
// handles the same "bare handle vs full URL" cases as Instagram above,
// minus the "@" conversion (which only ever applies to Instagram — see
// app/submit/SubmitForm.js).
export function facebookUrl(saved) {
  const trimmed = saved?.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://facebook.com/${trimmed.replace(/^@/, "")}`;
}
