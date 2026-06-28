import { SITE_URL } from "@/lib/constants";

export default function robots() {
  return {
    rules: [
      {
        // let all crawlers index everything except the admin panel
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
