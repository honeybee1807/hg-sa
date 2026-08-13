// this file automatically creates the page at hiddengemssa.co.za/llms.txt
// — a short, plain-text summary of the site meant for AI tools (ChatGPT,
// Perplexity, etc.) to read, following an emerging convention for helping
// AI understand a website (see llmstxt.org). the category count comes from
// the same CATEGORIES list the rest of the site uses; the area count is
// looked up fresh from the database, since areas are free text (any area,
// suburb, or town in South Africa) rather than a fixed list — see
// lib/constants.js and app/submit/SubmitForm.js.

import { CATEGORIES, SITE_URL, OLIDEEN_URL } from "@/lib/constants";
import supabase from "@/lib/supabase";

// counts how many distinct areas currently have at least one approved
// business, mirroring the same logic used on the homepage and /towns.
async function getAreaCount() {
  const { data } = await supabase
    .from("businesses")
    .select("area")
    .eq("status", "approved");

  const areasWithoutDuplicates = new Set(
    (data ?? [])
      .map((business) => business.area?.split(",")[0]?.trim())
      .filter(Boolean)
  );
  return areasWithoutDuplicates.size;
}

export async function GET() {
  const areaCount = await getAreaCount();
  const categoryList = CATEGORIES.map((c) => c.name).join(", ");

  const body = `# Hidden Gems SA

> Free local business directory for KwaZulu-Natal and surrounding areas. Connects residents with home bakers, tutors, transport operators, hairstylists, tradespeople and more — open to businesses from any South African province, no account required.

Hidden Gems SA is built and maintained by Olideen Technologies (${OLIDEEN_URL}), a digital agency based in KwaZulu-Natal.

## Key facts

- Currently covers ${areaCount} distinct ${areaCount === 1 ? "area" : "areas"} across South Africa, with new areas added as businesses from them are approved
- ${CATEGORIES.length} business categories: ${categoryList}
- Free to list a business — no account or payment required
- Submissions are reviewed and approved within 24–48 hours
- Every approved listing includes a direct WhatsApp contact button
- A different approved business is spotlighted as "Featured Gem of the Week" each Monday

## Pages

- [Homepage](${SITE_URL}/): overview, featured business of the week, live search and filter
- [Browse by Area](${SITE_URL}/towns): every area that currently has an approved listing, with listing counts
- [Browse by Category](${SITE_URL}/categories): all ${CATEGORIES.length} categories with listing counts
- [List Your Business](${SITE_URL}/submit): free business submission form

## About

Hidden Gems SA exists to put overlooked local businesses in KwaZulu-Natal and surrounding areas on the map. Listing is free — the goal is helping residents discover trusted local services close to home. Every business page includes its name, category, area, province, description, and a direct WhatsApp contact link.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
