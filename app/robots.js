// hiddengemssa.co.za/robots.txt: tells crawlers what they may read. the
// whole public site is open to every crawler, including AI search tools,
// which are a useful way for people to find listings. only the admin area
// and the internal API are blocked. the private edit pages aren't blocked
// here on purpose: they carry a "noindex" tag, and crawlers have to be
// allowed to load a page to see that tag.

import { SITE_URL } from "@/lib/constants";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
