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
//              like hiddengemssa.co.za/category/baking-catering
//   gradient - the two colours used for that category's icon background
export const CATEGORIES = [
  { name: "Baking & Catering",            desc: "Home bakers, caterers & sweet treats",            icon: "fa-solid fa-bread-slice",     slug: "baking-catering",             gradient: "linear-gradient(135deg,#F59E0B,#EF8C38)" },
  { name: "Tutoring & Education",         desc: "Private tutors, lessons & coaching",              icon: "fa-solid fa-graduation-cap",  slug: "tutoring-education",          gradient: "linear-gradient(135deg,#6366F1,#8B5CF6)" },
  { name: "Transport & Delivery",         desc: "Rides, couriers & delivery services",             icon: "fa-solid fa-car",             slug: "transport-delivery",          gradient: "linear-gradient(135deg,#10B981,#059669)" },
  { name: "Beauty & Hair",                desc: "Hair, nails, skincare & beauty",                  icon: "fa-solid fa-scissors",        slug: "beauty-hair",                 gradient: "linear-gradient(135deg,#EC4899,#9966CC)" },
  { name: "Health & Wellness",            desc: "Fitness, therapy & wellness services",            icon: "fa-solid fa-heart-pulse",     slug: "health-wellness",             gradient: "linear-gradient(135deg,#EF4444,#F97316)" },
  { name: "Trades & Repairs",             desc: "Plumbers, electricians & handymen",               icon: "fa-solid fa-wrench",          slug: "trades-repairs",              gradient: "linear-gradient(135deg,#F97316,#D97706)" },
  { name: "Clothing & Fashion",           desc: "Tailors, clothing & alterations",                 icon: "fa-solid fa-shirt",           slug: "clothing-fashion",            gradient: "linear-gradient(135deg,#8B5CF6,#6366F1)" },
  { name: "Cleaning Services",            desc: "Home, office & deep cleaning",                    icon: "fa-solid fa-broom",           slug: "cleaning-services",           gradient: "linear-gradient(135deg,#06B6D4,#3B82F6)" },
  { name: "Photography & Events",         desc: "Photographers, DJs & event planning",             icon: "fa-solid fa-camera",          slug: "photography-events",          gradient: "linear-gradient(135deg,#A855F7,#8B5CF6)" },
  { name: "General Services",             desc: "IT support, admin & more",                        icon: "fa-solid fa-star",            slug: "general-services",            gradient: "linear-gradient(135deg,#EAB308,#F59E0B)" },
  { name: "Medical & Healthcare",         desc: "Clinics, pharmacies & healthcare services",       icon: "fa-solid fa-kit-medical",     slug: "medical-healthcare",          gradient: "linear-gradient(135deg,#0F52BA,#1F94D2)" },
  { name: "Technology & IT",              desc: "IT support, computer & tech services",            icon: "fa-solid fa-microchip",       slug: "technology-it",               gradient: "linear-gradient(135deg,#9966CC,#C9A8E0)" },
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
