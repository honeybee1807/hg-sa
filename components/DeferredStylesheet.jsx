"use client";

// loads an external stylesheet after the page has already rendered,
// instead of as a normal <link> in <head> that blocks first paint until
// it downloads. used for Font Awesome, which is otherwise a 280KB+
// render-blocking download (icon webfonts + CSS) on every single page.
// non-JS visitors and crawlers still get the stylesheet via the
// <noscript> fallback rendered alongside this in app/layout.js.

import { useEffect } from "react";

export default function DeferredStylesheet({ href, crossOrigin, referrerPolicy }) {
  useEffect(() => {
    if (document.querySelector(`link[href="${href}"]`)) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    if (crossOrigin) link.crossOrigin = crossOrigin;
    if (referrerPolicy) link.referrerPolicy = referrerPolicy;
    document.head.appendChild(link);
  }, [href, crossOrigin, referrerPolicy]);

  return null;
}
