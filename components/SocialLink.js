"use client";

// a single Instagram or Facebook link, used everywhere one of those two
// platforms is shown (listing cards, the business detail page): on a phone
// with the native app installed, tapping it hands off straight to that app;
// otherwise (desktop, or a phone without the app) it opens the normal
// profile URL in a new tab. the href underneath is still a real, normal
// profile URL, so right-click / long-press "open in new tab" and visiting
// with JavaScript disabled both still work.
//
// renders nothing at all if the business hasn't set this field — callers
// don't need to check that themselves before rendering it.

import { instagramUsername, facebookUrl } from "@/lib/social";

// the web fallback used to be opened from inside a setTimeout, timed to
// fire only if the app-scheme redirect below hadn't (visibly) navigated
// away within 1.5 seconds. that's the standard-looking pattern, but it's
// broken: browsers only exempt window.open() from their pop-up blocker
// when it's called synchronously, in the same call stack as the click
// event that triggered it. anything deferred — even a few hundred ms via
// setTimeout — has lost that "direct result of a user gesture" status and
// gets silently blocked, with no error and nothing after it in the same
// setTimeout callback running either. that's what made this button
// silently do nothing on desktop: there's no instagram:// or fb:// handler
// registered, so the page never actually navigates away, and the deferred
// window.open() fallback that was supposed to catch that case just got
// blocked instead.
//
// the fix is to open the fallback tab first, synchronously, still inside
// the click handler — so the pop-up blocker sees it as directly
// user-initiated and always allows it — and only then attempt the
// app-scheme hand-off on the current tab. if a native app actually is
// registered for the scheme, the OS switches to it immediately and the
// fallback tab is left open, unused, in the background; if not (the common
// case, especially on desktop), the fallback tab is exactly the profile
// page the user wanted.
function openWithAppFallback(appUrl, webUrl) {
  window.open(webUrl, "_blank", "noopener,noreferrer");
  window.location = appUrl;
}

export default function SocialLink({ platform, value, className, iconOnly = false, label }) {
  let webUrl, appUrl, icon, defaultLabel;

  if (platform === "instagram") {
    const username = instagramUsername(value);
    if (!username) return null;
    webUrl = `https://instagram.com/${username}`;
    appUrl = `instagram://user?username=${username}`;
    icon = "fa-brands fa-instagram";
    defaultLabel = "Instagram";
  } else if (platform === "facebook") {
    webUrl = facebookUrl(value);
    if (!webUrl) return null;
    appUrl = `fb://facewebmodal/f?href=${encodeURIComponent(webUrl)}`;
    icon = "fa-brands fa-facebook";
    defaultLabel = "Facebook";
  } else {
    return null;
  }

  function handleClick(event) {
    event.preventDefault();
    openWithAppFallback(appUrl, webUrl);
  }

  return (
    <a
      href={webUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={label ?? defaultLabel}
      onClick={handleClick}
    >
      <i className={icon} aria-hidden="true" />
      {!iconOnly && <span>{defaultLabel}</span>}
    </a>
  );
}
