"use client";

// a single Instagram or Facebook link, used everywhere one of those two
// platforms is shown (listing cards, the business detail page): on a phone,
// tapping it tries to open the native app first, only falling back to a
// normal browser tab if the app doesn't launch within 1.5 seconds (e.g. it
// isn't installed). the href underneath is still a real, normal profile
// URL, so right-click / long-press "open in new tab" and visiting with
// JavaScript disabled both still work.
//
// renders nothing at all if the business hasn't set this field — callers
// don't need to check that themselves before rendering it.

import { instagramUsername, facebookUrl } from "@/lib/social";

function openWithAppFallback(appUrl, webUrl) {
  const start = Date.now();
  window.location = appUrl;
  setTimeout(() => {
    if (Date.now() - start < 1500) {
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }
  }, 500);
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
