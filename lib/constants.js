// this file holds the "master lists" that the rest of the site is built from.
// if a category or town needs to be added, removed, or renamed, this is the
// only place it needs to change — every page (the submit form, the category
// and town dropdowns, the sitemap, the AI summary file) reads from here.

// the full list of business categories shown across the site.
// each category has:
//   name     - the label shown to people (e.g. on the submit form)
//   desc     - a short description shown under the category icon
//   icon     - which Font Awesome (FA) icon to display
//   slug     - the web-address-friendly version of the name, used in URLs
//              like hiddengemssa.co.za/category/food-drinks
//   gradient - the two colours used for that category's icon background
export const CATEGORIES = [
  { name: "Food & Drinks",                desc: "Bakers, caterers, restaurants & food stalls",     icon: "fa-solid fa-utensils",       slug: "food-drinks",                 gradient: "linear-gradient(135deg,#F59E0B,#EF8C38)" },
  { name: "Health & Beauty",              desc: "Hair, nails, skincare & beauty services",         icon: "fa-solid fa-spa",             slug: "health-beauty",               gradient: "linear-gradient(135deg,#EC4899,#9966CC)" },
  { name: "Medical & Healthcare",         desc: "Clinics, pharmacies & healthcare services",       icon: "fa-solid fa-kit-medical",     slug: "medical-healthcare",          gradient: "linear-gradient(135deg,#0F52BA,#1F94D2)" },
  { name: "Technology & IT",              desc: "IT support, computer & tech services",            icon: "fa-solid fa-microchip",       slug: "technology-it",               gradient: "linear-gradient(135deg,#9966CC,#C9A8E0)" },
  { name: "Education",                    desc: "Tutors, lessons & coaching",                      icon: "fa-solid fa-graduation-cap",  slug: "education",                   gradient: "linear-gradient(135deg,#6366F1,#8B5CF6)" },
  { name: "Retail",                       desc: "Shops, spaza stores & general retail",            icon: "fa-solid fa-bag-shopping",    slug: "retail",                      gradient: "linear-gradient(135deg,#EAB308,#F59E0B)" },
  { name: "Fashion",                      desc: "Clothing, tailoring & alterations",               icon: "fa-solid fa-shirt",           slug: "fashion",                     gradient: "linear-gradient(135deg,#8B5CF6,#6366F1)" },
  { name: "Services",                     desc: "Cleaning, trades, repairs & general services",    icon: "fa-solid fa-toolbox",         slug: "services",                    gradient: "linear-gradient(135deg,#F97316,#D97706)" },
  { name: "Transport",                    desc: "Rides, couriers & delivery services",             icon: "fa-solid fa-car",             slug: "transport",                   gradient: "linear-gradient(135deg,#10B981,#059669)" },
  { name: "Home & Garden",                desc: "Home improvement, gardening & maintenance",       icon: "fa-solid fa-house",           slug: "home-garden",                 gradient: "linear-gradient(135deg,#84CC16,#65A30D)" },
  { name: "Recycling & Waste Management", desc: "Waste collection, recycling & disposal services", icon: "fa-solid fa-recycle",         slug: "recycling-waste-management",  gradient: "linear-gradient(135deg,#2EC4B6,#06B6D4)" },
  { name: "Other",                        desc: "Something else not listed above",                 icon: "fa-solid fa-circle-question", slug: "other",                       gradient: "linear-gradient(135deg,#A8A29E,#78716C)" },
];

// every KwaZulu-Natal (KZN) town the directory covers. this list is used
// everywhere a town needs to be picked or displayed — the submit form's
// town dropdown, the "browse by town" page, the sitemap, and the search
// filter. adding a new town here is enough to make it appear everywhere.
export const TOWNS = [
  "Bergville", "Colenso", "Dundee", "Estcourt", "Frere", "Greytown",
  "Harrismith", "Ladysmith", "Mooi River", "Pietermaritzburg",
  "Weenen", "Winterton",
];

// the site's own web address. used to build canonical links, the sitemap,
// and the structured data (JSON-LD) that search engines and AI tools read.
// if the domain ever changes, this is the only line that needs updating.
export const SITE_URL = "https://www.hiddengemssa.co.za";

// Olideen Technologies' website — the agency that built and maintains this
// site. used for the "built by" credit in the footer and promo panel.
export const OLIDEEN_URL = "https://olideentech.co.za";
