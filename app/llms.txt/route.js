import { CATEGORIES, TOWNS, SITE_URL, OLIDEEN_URL } from "@/lib/constants";

// A plain-text summary for AI systems (llmstxt.org convention) — built
// from the same constants the rest of the site uses, so it can never
// drift out of sync with the real town/category list.
export async function GET() {
  const townList = TOWNS.join(", ");
  const categoryList = CATEGORIES.map((c) => c.name).join(", ");

  const body = `# Hidden Gems SA

> Free local business directory for KwaZulu-Natal, South Africa. Connects residents with home bakers, tutors, transport operators, hairstylists, tradespeople and more across ${TOWNS.length} KZN towns — completely free, no account required.

Hidden Gems SA is built and maintained by Olideen Technologies (${OLIDEEN_URL}), a digital agency based in Estcourt, KwaZulu-Natal.

## Key facts

- Covers ${TOWNS.length} towns: ${townList}
- ${CATEGORIES.length} business categories: ${categoryList}
- Free to list a business — no account or payment required
- Submissions are reviewed and approved within 24-48 hours
- Every approved listing includes a direct WhatsApp contact button
- A different approved business is spotlighted as "Featured Gem of the Week" each Monday

## Pages

- [Homepage](${SITE_URL}/): overview, featured business of the week, live search and filter
- [Browse by Town](${SITE_URL}/towns): all ${TOWNS.length} towns with listing counts
- [Browse by Category](${SITE_URL}/categories): all ${CATEGORIES.length} categories with listing counts
- [List Your Business](${SITE_URL}/submit): free business submission form

## About

Hidden Gems SA exists to put overlooked local businesses in KwaZulu-Natal on the map. It is not a paid directory — listing is free, and the goal is to help residents discover trusted, verified local services close to home. Every business page includes the business's name, category, town, description, and a direct WhatsApp contact link.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
