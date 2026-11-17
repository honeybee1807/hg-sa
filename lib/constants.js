// this file holds the "master lists" that the rest of the site is built from.
// if a category needs to be added, removed, or renamed, this is the only
// place it needs to change — every page (the submit form, the category
// dropdown, the sitemap, the plain-text site summary) reads from here. areas
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
// kept in alphabetical order by name, since that's the order shown across
// the site (category dropdowns, the categories hub page, etc.) — "Other" is
// the one deliberate exception, always kept last as the catch-all regardless
// of where it'd fall alphabetically.
export const CATEGORIES = [
  { name: "Arts & Crafts",                desc: "Painters, artists & handmade goods",              icon: "fa-solid fa-palette",         slug: "arts-crafts",                 gradient: "linear-gradient(135deg,#D946EF,#F472B6)" },
  { name: "Automotive",                   desc: "Tools, repairs, servicing & car sales",           icon: "fa-solid fa-car-side",        slug: "automotive",                  gradient: "linear-gradient(135deg,#334155,#0F172A)" },
  { name: "Baking & Catering",            desc: "Home bakers, caterers & sweet treats",            icon: "fa-solid fa-bread-slice",     slug: "baking-catering",             gradient: "linear-gradient(135deg,#F59E0B,#EF8C38)" },
  { name: "Beauty & Hair",                desc: "Hair, nails, skincare & beauty",                  icon: "fa-solid fa-scissors",        slug: "beauty-hair",                 gradient: "linear-gradient(135deg,#EC4899,#9966CC)" },
  { name: "Cleaning Services",            desc: "Home, office & deep cleaning",                    icon: "fa-solid fa-broom",           slug: "cleaning-services",           gradient: "linear-gradient(135deg,#06B6D4,#3B82F6)" },
  { name: "Clothing & Fashion",           desc: "Tailors, retail clothing & alterations",                 icon: "fa-solid fa-shirt",           slug: "clothing-fashion",            gradient: "linear-gradient(135deg,#8B5CF6,#6366F1)" },
  { name: "Furniture",                    desc: "New, used & custom furniture",                    icon: "fa-solid fa-couch",           slug: "furniture",                   gradient: "linear-gradient(135deg,#78350F,#451A03)" },
  { name: "General Services",             desc: "Admin & more",                        icon: "fa-solid fa-star",            slug: "general-services",            gradient: "linear-gradient(135deg,#EAB308,#F59E0B)" },
  { name: "Hardware & Homeware",          desc: "Tools, fittings & household goods",               icon: "fa-solid fa-screwdriver-wrench", slug: "hardware-homeware",         gradient: "linear-gradient(135deg,#78716C,#57534E)" },
  { name: "Health & Wellness",            desc: "Fitness, therapy & wellness",                     icon: "fa-solid fa-heart-pulse",     slug: "health-wellness",             gradient: "linear-gradient(135deg,#EF4444,#F97316)" },
  { name: "Local Shop",                   desc: "Everyday essentials & convenience goods",         icon: "fa-solid fa-basket-shopping",  slug: "local-shop",                  gradient: "linear-gradient(135deg,#65A30D,#84CC16)" },
  { name: "Medical & Healthcare",         desc: "Clinics, pharmacies & healthcare",                icon: "fa-solid fa-kit-medical",     slug: "medical-healthcare",          gradient: "linear-gradient(135deg,#0F52BA,#1F94D2)" },
  { name: "Photography & Events",         desc: "Photographers, DJs & event planning",             icon: "fa-solid fa-camera",          slug: "photography-events",          gradient: "linear-gradient(135deg,#A855F7,#8B5CF6)" },
  { name: "Recycling & Waste Management", desc: "Waste collection, recycling & disposal",          icon: "fa-solid fa-recycle",         slug: "recycling-waste-management",  gradient: "linear-gradient(135deg,#2EC4B6,#06B6D4)" },
  { name: "Technology & IT",              desc: "IT support, computer & tech",                     icon: "fa-solid fa-microchip",       slug: "technology-it",               gradient: "linear-gradient(135deg,#9966CC,#C9A8E0)" },
  { name: "Trades & Repairs",             desc: "Plumbers, electricians & handymen",               icon: "fa-solid fa-wrench",          slug: "trades-repairs",              gradient: "linear-gradient(135deg,#F97316,#D97706)" },
  { name: "Transport",                    desc: "Rides, couriers & freight",                       icon: "fa-solid fa-car",             slug: "transport-delivery",          gradient: "linear-gradient(135deg,#10B981,#059669)" },
  { name: "Travel & Accommodation",       desc: "Holiday lets, timeshares & short-term stays",     icon: "fa-solid fa-house-chimney",   slug: "travel-accommodation",        gradient: "linear-gradient(135deg,#0EA5E9,#22D3EE)" },
  { name: "Tutoring & Education",         desc: "Private tutors, lessons & coaching",              icon: "fa-solid fa-graduation-cap",  slug: "tutoring-education",          gradient: "linear-gradient(135deg,#6366F1,#8B5CF6)" },
  { name: "Other",                        desc: "Something else not listed above",                 icon: "fa-solid fa-circle-question", slug: "other",                       gradient: "linear-gradient(135deg,#A8A29E,#78716C)" },
];

// the words people might type when they're looking for each category — used
// by the homepage's smart search (lib/search.js) so "cakes", "baker" or
// "halaal food" all find Baking & Catering, "mechnic" finds Automotive, etc.
//
// HOW TO EXTEND: find the category (the key must match a CATEGORIES name
// above EXACTLY) and add more words to its list. that's it.
//   - write words in plain lowercase. plurals and word forms are handled
//     automatically ("baker" also covers bakers, baking, bakery, baked),
//     and small typos are forgiven, so there's no need to list variations.
//   - multi-word phrases are fine ("panel beater", "web design") — they're
//     matched as a phrase before single words are.
//   - the same word can appear under two categories (e.g. "repairs"); the
//     search then shows both, ranked by how well each business matches.
//   - these words are only used for searching; they never appear on the site.
//   - only add words that really mean the category. a specific dish or
//     product ("pizza", "coffee") is better left out: it then matches only
//     businesses that actually mention it, and a search that finds nothing
//     shows up in analytics as something people want.
// a category's own name ("Automotive", "Furniture"...) is matched
// automatically, so it doesn't need repeating here.
export const SEARCH_SYNONYMS = {
  "Arts & Crafts": [
    "art", "arts", "artist", "painting", "paintings", "craft", "crafts", "handmade", "gifts", "gift",
    "jewellery", "jewelry", "candles", "crochet", "knitting", "pottery", "ceramics", "beadwork",
    "beads", "calligraphy", "islamic art", "canvas", "portrait", "sketch", "resin", "embroidery",
    "hampers", "personalised", "custom gifts", "frames",
  ],
  "Automotive": [
    "mechanic", "car", "cars", "tyres", "tires", "panel beater", "panel beating", "spares", "spare parts",
    "auto", "vehicle", "vehicles", "service", "car service", "tracker", "tracking", "car wash", "valet",
    "exhaust", "battery", "batteries", "brakes", "wheel alignment", "towing", "tow truck", "diesel",
    "motor", "motorbike", "bakkie service", "auto electrician", "car sales", "dealer", "windscreen",
  ],
  "Baking & Catering": [
    "baker", "bakery", "baking", "cake", "cakes", "cupcake", "cupcakes", "pastry", "pastries", "bread",
    "caterer", "catering", "food", "meals", "snacks", "treats", "sweets", "dessert", "desserts", "braai",
    "platter", "platters", "takeaway", "takeaways", "restaurant", "cook", "chef", "kitchen", "halaal",
    "biscuits", "cookies", "rusks", "savouries", "samoosas", "samosas", "pies", "biryani", "curry",
    "bunny chow", "frozen food", "lunch", "dinner", "breakfast", "eat", "eats", "birthday cake", "wedding cake", "doughnuts", "koeksisters", "home cooked",
  ],
  "Beauty & Hair": [
    "hair", "hairdresser", "hairstylist", "salon", "makeup", "make up", "mua", "nails", "manicure",
    "pedicure", "lashes", "brows", "eyebrows", "skincare", "beauty", "beautician", "bridal", "barber",
    "braids", "braiding", "wigs", "weave", "spa", "facial", "waxing", "threading", "henna", "mehndi",
    "perfume", "cosmetics",
  ],
  "Cleaning Services": [
    "cleaner", "cleaning", "domestic", "domestic worker", "maid", "laundry", "ironing", "carpet",
    "carpet cleaning", "upholstery cleaning", "pest", "pest control", "fumigation", "garden", "gardener",
    "gardening", "deep clean", "office cleaning", "window cleaning", "pool cleaning", "dry cleaning",
  ],
  "Clothing & Fashion": [
    "clothes", "clothing", "dress", "dresses", "abaya", "hijab", "scarf", "scarves", "shoes", "tailor",
    "seamstress", "sewing", "fashion", "thobe", "kurta", "alterations", "boutique", "modest wear",
    "kids clothes", "uniform", "uniforms", "suits", "jalabiya", "punjabi", "kaftan", "bags", "accessories",
  ],
  "Furniture": [
    "furniture", "couch", "couches", "sofa", "lounge suite", "bed", "beds", "mattress", "table", "chair",
    "chairs", "wardrobe", "wardrobes", "kitchen units", "cupboards", "upholstery", "reupholstery",
    "shelves", "desk", "pallet furniture", "built in cupboards",
  ],
  "General Services": [
    "admin", "administration", "typing", "printing", "copies", "laminating", "errands", "odd jobs",
    "assistant", "bookkeeping", "accounting", "accountant", "tax", "sars", "insurance", "legal",
    "lawyer", "attorney", "consultant", "marketing", "branding", "signage", "security", "funeral",
    "pet care", "dog grooming", "childcare", "creche", "daycare", "elderly care", "translation",
    "registration", "cipc", "estate agent", "property",
  ],
  "Hardware & Homeware": [
    "hardware", "tools", "paint", "building supplies", "building materials", "cement", "bricks",
    "homeware", "home decor", "appliances", "crockery", "cutlery", "kitchenware", "plastics",
    "plumbing supplies", "electrical supplies", "timber", "garden tools", "linen", "curtains", "blinds",
  ],
  "Health & Wellness": [
    "gym", "fitness", "trainer", "personal trainer", "yoga", "pilates", "wellness", "massage", "therapy",
    "therapist", "physio", "physiotherapy", "nutrition", "nutritionist", "diet", "dietician", "weight loss",
    "counselling", "counsellor", "psychologist", "hijama", "cupping", "supplements", "herbal", "health",
    "bootcamp", "zumba",
  ],
  "Local Shop": [
    // "spaza" is a search word only — it never appears anywhere in the UI.
    "shop", "store", "grocery", "groceries", "spar", "convenience", "convenience store", "tuck shop",
    "general dealer", "spaza", "supermarket", "butchery", "butcher", "meat", "fruit", "veg",
    "vegetables", "bottle store", "airtime", "electricity", "corner shop", "mini market", "wholesale",
  ],
  "Medical & Healthcare": [
    "doctor", "gp", "clinic", "dentist", "dental", "pharmacy", "chemist", "nurse", "optometrist",
    "glasses", "spectacles", "contact lenses", "medical", "medicine", "healthcare", "hospital",
    "paediatrician", "midwife", "home nursing", "audiologist", "radiology", "pathology", "first aid",
  ],
  "Photography & Events": [
    "photographer", "photography", "photos", "photo", "video", "videographer", "videography", "wedding",
    "weddings", "events", "event", "decor", "decorations", "venue", "venues", "mc", "dj", "planner",
    "event planner", "party", "parties", "balloons", "flowers", "florist", "tent hire",
    "jumping castle", "photo booth", "nikah", "engagement", "birthday party", "sound hire", "catering hire",
  ],
  "Recycling & Waste Management": [
    "waste", "recycling", "recycle", "rubbish", "refuse", "skip", "skip hire", "scrap", "scrap metal",
    "removal", "rubble", "rubble removal", "garden refuse", "dump", "bins", "e waste", "waste collection",
  ],
  "Technology & IT": [
    "computer", "computers", "laptop", "laptops", "phone", "phones", "cellphone", "mobile phone", "mobile phones", "website", "websites",
    "web design", "web developer", "software", "app", "apps", "wifi", "internet", "fibre", "network",
    "it support", "it services", "repairs", "phone repairs", "laptop repairs", "screen repair", "tech",
    "cctv", "printer", "data recovery", "social media", "graphic design", "coding", "programming",
  ],
  "Trades & Repairs": [
    "plumber", "plumbing", "electrician", "electrical", "builder", "building", "construction",
    "handyman", "painter", "tiler", "tiling", "roofer", "roofing", "welder", "welding", "repairs",
    "repair", "maintenance", "carpenter", "carpentry", "geyser", "aircon", "air conditioning", "gate",
    "gate motor", "fencing", "fence", "paving", "renovations", "waterproofing", "ceilings", "glazier",
    "locksmith", "solar", "inverter", "boreholes", "drywall", "plastering", "appliance repairs",
  ],
  "Transport": [
    "transport", "taxi", "shuttle", "ride", "lift", "lift club", "courier", "delivery truck", "freight",
    "trucking", "truck", "moving", "movers", "removals", "furniture removals", "bakkie", "bakkie hire",
    "driver", "logistics", "airport transfer", "school transport", "scholar transport", "bus", "minibus",
    "chauffeur", "parcel",
  ],
  "Travel & Accommodation": [
    "accommodation", "holiday", "holidays", "timeshare", "guesthouse", "guest house", "bnb",
    "bed and breakfast", "lodge", "travel", "flights", "tours", "tour", "umrah", "hajj", "visa",
    "travel agent", "self catering", "chalet", "cottage", "airbnb", "stay", "hotel", "camping",
  ],
  "Tutoring & Education": [
    "tutor", "tutoring", "tuition", "teacher", "lessons", "classes", "school", "maths", "math", "science",
    "homework", "matric", "exam", "exams", "madressa", "madrasah", "education", "coaching", "study",
    "learning", "extra lessons", "reading", "english", "afrikaans", "zulu", "accounting lessons",
    "quran", "hifz", "arabic", "music lessons", "piano", "swimming lessons", "driving school",
    "driving lessons", "preschool", "aftercare", "academy", "courses",
  ],
  "Other": [
    "other", "miscellaneous", "anything", "everything", "various",
  ],
};

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
  "Shop or Office",
  "Home-based",
  "On-site service",
  "Delivery only",
  "Remote",
];

// which categories show which badge checkbox on the submit and edit forms
// (see app/submit/SubmitForm.js and app/edit/[token]/EditListingForm.js) —
// kept here, as the single shared source, so both forms (and their
// server-side backstops in app/submit/actions.js and app/edit/actions.js)
// always agree on exactly the same rule.
export const BADGE_CATEGORY_VISIBILITY = {
  halal: ["Baking & Catering"],
  delivery: ["Baking & Catering", "General Services", "Recycling & Waste Management", "Hardware & Homeware", "Local Shop", "Automotive", "Furniture"],
  callouts: [
    "Trades & Repairs", "Beauty & Hair", "Health & Wellness", "Cleaning Services",
    "Photography & Events", "Medical & Healthcare", "General Services", "Transport",
    "Hardware & Homeware", "Automotive", "Furniture",
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
  { value: "SANHA",          label: "SANHA (South African National Halaal Authority)" },
  { value: "NIHT",           label: "NIHT (National Independent Halaal Trust)" },
  { value: "MJCHT",          label: "MJCHT (Muslim Judicial Council Halaal Trust)" },
  { value: "ICSA",           label: "ICSA (Islamic Council of South Africa)" },
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

// the business types that have a real, visitable street address — the
// street address field, and the map on a business's detail page, only ever
// apply to these. "Home-based" is deliberately excluded even though it's a
// physical place: collecting someone's home address through this form is a
// privacy risk, not a feature.
export const PHYSICAL_BUSINESS_TYPES = ["Shop or Office", "On-site service"];

// the site's own web address. used to build canonical links, the sitemap,
// and the structured data (JSON-LD) that search engines and assistants read.
// if the domain ever changes, this is the only line that needs updating.
export const SITE_URL = "https://www.hiddengemssa.co.za";

// Hidden Gems SA's own WhatsApp contact number — normalized to the "27..."
// format wa.me links need (see lib/phone.js). used for site-level contact
// links, as distinct from a business's own listed WhatsApp number.
export const SITE_WHATSAPP = "27733075218";

// Olideen Technologies' website — the agency that built and maintains this
// site. used for the "built by" credit in the footer and promo panel.
export const OLIDEEN_URL = "https://olideentech.co.za";
