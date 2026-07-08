// this file automatically creates the page at hiddengemssa.co.za/robots.txt.
// it's the standard way of telling search engines (Google, Bing, etc.) which
// parts of the site they're allowed to read and list in search results.

import { SITE_URL } from "@/lib/constants";

export default function robots() {
  return {
    rules: [
      {
        // this rule applies to every search engine ("*" means "all of them").
        // "allow: /" means "you may read the whole site"...
        // ...except the two lines below, which block the private admin panel.
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/"],
      },
    ],
    // points search engines at the full list of pages (see app/sitemap.js)
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
