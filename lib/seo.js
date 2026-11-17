// shared helpers for page titles, descriptions and structured data
// (JSON-LD). structured data only ever describes what is visible on the
// page it sits on: no ratings, no reviews, no invented details.

import { SITE_URL, OLIDEEN_URL } from "@/lib/constants";
import { instagramUrl, facebookUrl } from "@/lib/social";

export const SITE_NAME = "Hidden Gems SA";

// how people actually search for each category ("bakers in Estcourt", not
// "Baking & Catering in Estcourt"). used in titles, headings and intros
// only; the stored category names are never changed.
const SEARCH_PHRASES = {
  "Arts & Crafts": "Arts and crafts",
  "Automotive": "Mechanics and auto services",
  "Baking & Catering": "Bakers and caterers",
  "Beauty & Hair": "Hair and beauty",
  "Cleaning Services": "Cleaning services",
  "Clothing & Fashion": "Clothing and tailors",
  "Furniture": "Furniture",
  "General Services": "General services",
  "Hardware & Homeware": "Hardware and homeware",
  "Health & Wellness": "Health and wellness",
  "Local Shop": "Local shops",
  "Medical & Healthcare": "Medical and healthcare",
  "Photography & Events": "Photographers and events",
  "Recycling & Waste Management": "Recycling and waste removal",
  "Technology & IT": "IT and tech support",
  "Trades & Repairs": "Trades and repairs",
  "Transport": "Transport and couriers",
  "Travel & Accommodation": "Accommodation and travel",
  "Tutoring & Education": "Tutors and lessons",
  "Other": "Other local businesses",
};

export function searchPhrase(categoryName) {
  return SEARCH_PHRASES[categoryName] ?? categoryName;
}

// lowercase for use mid-sentence, keeping "IT" as it is.
export function searchPhraseLower(categoryName) {
  return searchPhrase(categoryName).replace(/^(\S)/, (c) => c.toLowerCase()).replace(/\bit\b/i, "IT");
}

// the most specific schema.org type that clearly fits each category. where
// nothing fits cleanly, plain LocalBusiness is the honest choice.
const SCHEMA_TYPES = {
  "Automotive": "AutoRepair",
  "Baking & Catering": "FoodEstablishment",
  "Beauty & Hair": "BeautySalon",
  "Clothing & Fashion": "ClothingStore",
  "Furniture": "FurnitureStore",
  "Hardware & Homeware": "HardwareStore",
  "Health & Wellness": "HealthAndBeautyBusiness",
  "Local Shop": "Store",
  "Medical & Healthcare": "MedicalBusiness",
  "Trades & Repairs": "HomeAndConstructionBusiness",
  "Travel & Accommodation": "LodgingBusiness",
  "Technology & IT": "ProfessionalService",
};

export function schemaTypeFor(categoryName) {
  return SCHEMA_TYPES[categoryName] ?? "LocalBusiness";
}

// trims text to a meta description length (about 155 characters), ending on
// a whole word.
export function clampDescription(text, max = 155) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:\s]+$/, "")}…`;
}

// "a, b and c"
export function listToSentence(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// "a, b, c and more" when there are more than "max" items, otherwise
// listToSentence(). keeps descriptions readable when the items themselves
// contain "and" ("bakers and caterers").
export function listWithMore(items, max = 3) {
  return items.length > max ? `${items.slice(0, max).join(", ")} and more` : listToSentence(items);
}

export function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

// a page's full title, with " | Hidden Gems SA" added only when it still
// fits in about 60 characters.
export function fullTitle(title) {
  const withBrand = `${title} | ${SITE_NAME}`;
  return { absolute: withBrand.length <= 62 ? withBrand : title };
}

export function absoluteUrl(path = "/") {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}

// only real, well-formed http(s) links make it into sameAs.
function validUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function sameAsLinks(biz) {
  return [validUrl(biz.website), instagramUrl(biz.instagram), validUrl(facebookUrl(biz.facebook))].filter(Boolean);
}

export function breadcrumbList(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function itemList(name, businesses) {
  return {
    "@type": "ItemList",
    name,
    numberOfItems: businesses.length,
    itemListElement: businesses.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/business/${b.slug}`),
      name: b.name,
    })),
  };
}

export const ORGANIZATION_ID = `${SITE_URL}/#publisher`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

// sitewide: who publishes the site, and the site itself. no personal names
// and no town, by design.
export const SITE_GRAPH = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: "Olideen Technologies",
      url: OLIDEEN_URL,
      logo: absoluteUrl("/OT_Logo.png"),
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      url: SITE_URL,
      name: SITE_NAME,
      description: "A free directory of local businesses in KwaZulu-Natal and across South Africa.",
      inLanguage: "en-ZA",
      publisher: { "@id": ORGANIZATION_ID },
    },
  ],
};

// renders a JSON-LD block. "<" is escaped so text from listings can never
// close the script tag early.
export function JsonLd({ data }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
