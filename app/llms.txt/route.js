// hiddengemssa.co.za/llms.txt: a plain-text site summary for crawlers and
// assistants (see llmstxt.org). it states facts only and matches the
// Disclaimer: listings are checked before they go live, but Hidden Gems SA
// does not verify or endorse the businesses listed. counts and links are
// built from live data, so they're always current.

import { CATEGORIES, SITE_URL, OLIDEEN_URL } from "@/lib/constants";
import { getApprovedBusinesses, getAreas, getCategories } from "@/lib/directory";
import { searchPhrase } from "@/lib/seo";

export const revalidate = 3600;

export async function GET() {
  const [businesses, areas, categories] = await Promise.all([getApprovedBusinesses(), getAreas(), getCategories()]);
  const listedCategories = categories.filter((c) => c.businesses.length > 0);

  const body = `# Hidden Gems SA

> A free directory of local businesses, mostly in KwaZulu-Natal, South Africa, and open to businesses in any province. People can browse home bakers, tutors, transport operators, hairstylists, tradespeople and more, and contact them directly on WhatsApp. No account is needed to browse or to list.

Hidden Gems SA is built and run by Olideen Technologies (${OLIDEEN_URL}).

## Key facts

- ${businesses.length} approved listings in ${areas.length} ${areas.length === 1 ? "area" : "areas"}
- ${CATEGORIES.length} categories: ${CATEGORIES.map((c) => c.name).join(", ")}
- Free to list a business, with no account or payment
- New listings are checked by the team before they go live, usually within 24 to 48 hours
- Information on each listing is supplied by the business owner. Hidden Gems SA does not verify or endorse listed businesses (see the Disclaimer)
- Most listings have a WhatsApp contact button
- One approved business is shown as the Featured Gem each week

## Main pages

- [Homepage](${SITE_URL}/): the full directory with search and filters, and this week's Featured Gem
- [Browse by area](${SITE_URL}/towns): every area with a listing, with counts
- [Browse by category](${SITE_URL}/categories): every category, with counts
- [List your business](${SITE_URL}/submit): free submission form
- [Blog](${SITE_URL}/blog): stories and guides
- [Disclaimer and Terms of Use](${SITE_URL}/disclaimer)

## Categories with listings

${listedCategories.map((c) => `- [${searchPhrase(c.name)}](${SITE_URL}/category/${c.slug}): ${c.businesses.length}`).join("\n")}

## Areas with listings

${areas.map((a) => `- [${a.name}, ${a.province}](${SITE_URL}/town/${a.slug}): ${a.businesses.length}`).join("\n")}

## What a listing page shows

Each business page has the business name, category, area, province, a description, any Halal, Delivery or Call-Outs badges the owner selected, and contact links (WhatsApp, and where given, a website, Instagram or Facebook). A street address is shown only for shops, offices and on-site services that provided one.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
