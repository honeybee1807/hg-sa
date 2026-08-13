// this file holds the "master lists" that the rest of the site is built from.
// if a category needs to be added, removed, or renamed, this is the only
// place it needs to change — every page (the submit form, the category
// dropdown, the sitemap, the AI summary file) reads from here. areas
// (suburb/town) are free text now rather than a fixed list — see
// app/submit/SubmitForm.js and app/town/[slug]/page.js.

// the full list of business categories shown across the site.
// each category has:
//   name     - the label shown to people (e.g. on the submit form)
//   desc     - a short description shown under the category icon
//   icon     - which Font Awesome (FA) icon to display
//   slug     - the web-address-friendly version of the name, used in URLs
//              like hiddengemssa.co.za/category/baking-catering
//   gradient - the two colours used for that category's icon background
export const CATEGORIES = [
  { name: "Baking & Catering",            desc: "Home bakers, caterers & sweet treats",            icon: "fa-solid fa-bread-slice",     slug: "baking-catering",             gradient: "linear-gradient(135deg,#F59E0B,#EF8C38)" },
  { name: "Tutoring & Education",         desc: "Private tutors, lessons & coaching",              icon: "fa-solid fa-graduation-cap",  slug: "tutoring-education",          gradient: "linear-gradient(135deg,#6366F1,#8B5CF6)" },
  { name: "Transport",                    desc: "Rides, couriers & freight",                       icon: "fa-solid fa-car",             slug: "transport-delivery",          gradient: "linear-gradient(135deg,#10B981,#059669)" },
  { name: "Beauty & Hair",                desc: "Hair, nails, skincare & beauty",                  icon: "fa-solid fa-scissors",        slug: "beauty-hair",                 gradient: "linear-gradient(135deg,#EC4899,#9966CC)" },
  { name: "Health & Wellness",            desc: "Fitness, therapy & wellness",                     icon: "fa-solid fa-heart-pulse",     slug: "health-wellness",             gradient: "linear-gradient(135deg,#EF4444,#F97316)" },
  { name: "Trades & Repairs",             desc: "Plumbers, electricians & handymen",               icon: "fa-solid fa-wrench",          slug: "trades-repairs",              gradient: "linear-gradient(135deg,#F97316,#D97706)" },
  { name: "Clothing & Fashion",           desc: "Tailors, clothing & alterations",                 icon: "fa-solid fa-shirt",           slug: "clothing-fashion",            gradient: "linear-gradient(135deg,#8B5CF6,#6366F1)" },
  { name: "Cleaning Services",            desc: "Home, office & deep cleaning",                    icon: "fa-solid fa-broom",           slug: "cleaning-services",           gradient: "linear-gradient(135deg,#06B6D4,#3B82F6)" },
  { name: "Photography & Events",         desc: "Photographers, DJs & event planning",             icon: "fa-solid fa-camera",          slug: "photography-events",          gradient: "linear-gradient(135deg,#A855F7,#8B5CF6)" },
  { name: "General Services",             desc: "IT support, admin & more",                        icon: "fa-solid fa-star",            slug: "general-services",            gradient: "linear-gradient(135deg,#EAB308,#F59E0B)" },
  { name: "Medical & Healthcare",         desc: "Clinics, pharmacies & healthcare",                icon: "fa-solid fa-kit-medical",     slug: "medical-healthcare",          gradient: "linear-gradient(135deg,#0F52BA,#1F94D2)" },
  { name: "Technology & IT",              desc: "IT support, computer & tech",                     icon: "fa-solid fa-microchip",       slug: "technology-it",               gradient: "linear-gradient(135deg,#9966CC,#C9A8E0)" },
  { name: "Recycling & Waste Management", desc: "Waste collection, recycling & disposal",          icon: "fa-solid fa-recycle",         slug: "recycling-waste-management",  gradient: "linear-gradient(135deg,#2EC4B6,#06B6D4)" },
  { name: "Other",                        desc: "Something else not listed above",                 icon: "fa-solid fa-circle-question", slug: "other",                       gradient: "linear-gradient(135deg,#A8A29E,#78716C)" },
];

// the 9 provinces of South Africa, in the order they're shown in the submit
// form's Province dropdown. the area itself (suburb/town) is free text —
// see app/submit/SubmitForm.js — since businesses can now be anywhere in
// the country, not just a fixed list of KZN towns.
export const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];

// the options shown in the "Business Type" dropdown on both the original
// submission form and the listing edit form (app/edit/[token]/EditListingForm.js).
export const BUSINESS_TYPES = [
  "Physical location — customers visit us",
  "Home-based — we operate from home",
  "Mobile — we come to the customer",
  "Online only — no physical location",
];

// which categories show which badge checkbox on the submit and edit forms
// (see app/submit/SubmitForm.js and app/edit/[token]/EditListingForm.js) —
// kept here, as the single shared source, so both forms (and their
// server-side backstops in app/submit/actions.js and app/edit/actions.js)
// always agree on exactly the same rule.
export const BADGE_CATEGORY_VISIBILITY = {
  halal: ["Baking & Catering"],
  delivery: ["Baking & Catering", "General Services", "Recycling & Waste Management"],
  callouts: [
    "Trades & Repairs", "Beauty & Hair", "Health & Wellness", "Cleaning Services",
    "Photography & Events", "Medical & Healthcare", "General Services", "Transport",
  ],
};

// true if the given badge's checkbox should be shown for a given category.
export function isBadgeVisible(badge, category) {
  return BADGE_CATEGORY_VISIBILITY[badge]?.includes(category) ?? false;
}

// the options shown in the Halal certificate dropdown, in the exact order
// they should appear. "value" is what's actually stored in the database;
// "label" is the fuller text shown in the dropdown itself.
export const HALAL_CERTIFICATES = [
  { value: "SANHA",          label: "SANHA — South African National Halaal Authority" },
  { value: "NIHT",           label: "NIHT — National Independent Halaal Trust" },
  { value: "MJCHT",          label: "MJCHT — Muslim Judicial Council Halaal Trust" },
  { value: "ICSA",           label: "ICSA — Islamic Council of South Africa" },
  { value: "Self-certified", label: "Self-certified" },
  { value: "In process",     label: "In process" },
  { value: "Other",          label: "Other" },
];

// turns a stored certificate value (e.g. "SANHA") back into its fuller
// display label — used on the business detail page. falls back to the
// stored value itself if it's ever something outside the list above.
export function halalCertificateLabel(value) {
  return HALAL_CERTIFICATES.find((c) => c.value === value)?.label ?? value;
}

// the one business type that has a real, visitable street address — the
// street address field, and the map on a business's detail page, only ever
// apply to this one. pulled out as its own constant (rather than just
// comparing against BUSINESS_TYPES[0]) so it reads clearly wherever it's
// checked.
export const PHYSICAL_BUSINESS_TYPE = BUSINESS_TYPES[0];

// the site's own web address. used to build canonical links, the sitemap,
// and the structured data (JSON-LD) that search engines and AI tools read.
// if the domain ever changes, this is the only line that needs updating.
export const SITE_URL = "https://www.hiddengemssa.co.za";

// Olideen Technologies' website — the agency that built and maintains this
// site. used for the "built by" credit in the footer and promo panel.
export const OLIDEEN_URL = "https://olideentech.co.za";
