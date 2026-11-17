"use client";

// sample data + stand-in actions for the dev-only admin preview (see
// page.js in this folder). nothing here talks to a server or database:
// every "action" just waits briefly and reports success, and the admin's
// own on-screen updates take care of the rest until the page is reloaded.

import AdminApp from "../_components/AdminApp";

// rounded to the hour so the server and browser compute identical sample
// timestamps (avoids a preview-only hydration warning).
const now = Math.floor(Date.now() / 3600000) * 3600000;
const hoursAgo = (h) => new Date(now - h * 3600 * 1000).toISOString();

const BUSINESSES = [
  { id: 101, name: "Mina's Bakehouse", category: "Baking & Catering", business_type: "Home-based", area: "DURBAN / surrounding", province: "KwaZulu-Natal", whatsapp: "0821234567", website: "https://example.com", instagram: "@minasbakehouse", facebook: null, description: "Celebration cakes, koeksisters and weekly bread boxes, baked to order.", owner_name: "Mina Patel", owner_email: "mina@example.com", logo_url: null, status: "pending", review_note: null, slug: null, is_own_business: true, halal: true, halal_certificate: "SANHA", delivery_available: true, callouts_available: false, created_at: hoursAgo(5) },
  { id: 102, name: "Khwezi Auto Care", category: "Automotive", business_type: "Shop or Office", area: "Pietermaritzburg", province: "KwaZulu-Natal", street_address: "12 Church Street", whatsapp: "0731112222", website: null, instagram: null, facebook: "khweziauto", description: "Services, diagnostics and tyre fitment for all makes.", owner_name: "Sipho Khwezi", owner_email: "sipho@example.com", logo_url: null, status: "pending", review_note: null, slug: null, is_own_business: false, on_behalf_of_name: "Sipho Khwezi", on_behalf_of_reason: "He's my uncle and doesn't use the internet much.", halal: false, delivery_available: false, callouts_available: true, created_at: hoursAgo(30) },
  { id: 103, name: "The Study Corner", category: "Tutoring & Education", business_type: "Online only", area: "Newcastle", province: "KwaZulu-Natal", whatsapp: "0605556666", website: null, instagram: null, facebook: null, description: "Maths and science tutoring for grades 8 to 12.", owner_name: "Ayesha Dlamini", owner_email: "ayesha@example.com", logo_url: null, status: "pending", review_note: null, slug: null, is_own_business: true, created_at: hoursAgo(40) },
  { id: 104, name: "Umoya Makers", category: "Arts & Crafts", business_type: "Home-based", area: "Richards Bay", province: "KwaZulu-Natal", whatsapp: "0614443333", description: "Beadwork, woven baskets and custom gifts.", owner_name: "Thandi Mthembu", owner_email: "thandi@example.com", logo_url: null, status: "pending", slug: null, is_own_business: true, created_at: hoursAgo(70) },
  { id: 105, name: "Savvy Finds Co", category: "Other", custom_category: "Retail", business_type: "Online only", area: "Ladysmith", province: "KwaZulu-Natal", whatsapp: "0829998888", instagram: "https://instagram.com/savvyfinds", description: "Fashion, tech, accessories and more for men and women.", owner_name: "Zaid Cassim", owner_email: "zaid@example.com", logo_url: "/HG_Logo.png", status: "approved", slug: "savvy-finds-co-ladysmith", is_own_business: true, created_at: hoursAgo(200) },
  { id: 106, name: "Bright Home Repairs", category: "Trades & Repairs", business_type: "On-site service", area: "Johannesburg", province: "Gauteng", whatsapp: "0711230000", description: "Plumbing, tiling and general handyman work.", owner_name: "Peter Naidoo", owner_email: "peter@example.com", status: "approved", slug: "bright-home-repairs-johannesburg", is_own_business: true, callouts_available: true, created_at: hoursAgo(260) },
  { id: 108, name: "Coastal Tiles & Trims", category: "Hardware & Homeware", business_type: "Shop or Office", area: "Durban", province: "KwaZulu-Natal", whatsapp: "0315550000", description: "Tiles, trims and adhesives for DIY and trade.", owner_name: "Rashid Moosa", owner_email: "rashid@example.com", status: "approved", slug: "coastal-tiles-trims-durban", is_own_business: true, delivery_available: true, created_at: hoursAgo(150) },
  { id: 107, name: "Fresh Fold Laundry", category: "Cleaning Services", business_type: "Shop or Office", area: "Umhlanga", province: "KwaZulu-Natal", whatsapp: "0790001111", description: "Wash, dry and fold with same-day collection.", owner_name: "Lerato M", owner_email: "lerato@example.com", status: "rejected", review_note: "Duplicate of an existing listing.", is_own_business: true, created_at: hoursAgo(320) },
];

const CURRENT_FEATURED = {
  id: 9001,
  created_at: hoursAgo(20),
  featured_until: new Date(now + 6 * 24 * 3600 * 1000).toISOString(),
  replaced_at: null,
  businesses: { id: 105, name: "Savvy Finds Co", category: "Other", area: "Ladysmith", province: "KwaZulu-Natal", logo_url: "/HG_Logo.png", slug: "savvy-finds-co-ladysmith", whatsapp: "27829998888", owner_name: "Zaid Cassim" },
};

const FEATURED_HISTORY = [
  { id: 9000, created_at: hoursAgo(190), featured_until: hoursAgo(22), replaced_at: hoursAgo(20), businesses: { id: 106, name: "Bright Home Repairs", logo_url: null } },
];

const EDIT_REQUESTS = [
  {
    id: 501, business_id: 106, created_at: hoursAgo(9),
    proposed_changes: { area: "Sandton", description: "Plumbing, tiling, painting and general handyman work.", logo_url: "/HG_Logo.png" },
    businesses: { id: 106, name: "Bright Home Repairs", category: "Trades & Repairs", area: "Johannesburg", province: "Gauteng", description: "Plumbing, tiling and general handyman work.", logo_url: null, slug: "bright-home-repairs-johannesburg" },
  },
  {
    id: 502, business_id: 105, created_at: hoursAgo(26),
    proposed_changes: { whatsapp: "27820001234", delivery_available: true },
    businesses: { id: 105, name: "Savvy Finds Co", category: "Other", area: "Ladysmith", province: "KwaZulu-Natal", whatsapp: "27829998888", logo_url: "/HG_Logo.png", slug: "savvy-finds-co-ladysmith" },
  },
];

const BLOG_POSTS = [
  { id: 1, title: "Five hidden bakeries worth the drive", slug: "five-hidden-bakeries", excerpt: "", content: "Sample.", category: "Baking & Catering", area: "", published: true, featured_image_url: null, created_at: hoursAgo(400), updated_at: hoursAgo(50) },
  { id: 2, title: "Meet the makers of Richards Bay", slug: "makers-of-richards-bay", excerpt: "", content: "Draft.", category: null, area: "Richards Bay", published: false, featured_image_url: null, created_at: hoursAgo(12), updated_at: hoursAgo(12) },
];

const wait = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
const ok = async () => { await wait(); return { success: true }; };

const DEMO_ACTIONS = {
  logoutAdmin: async () => { await wait(); },
  approveBusiness: async (id, name, area) => {
    await wait();
    const slug = `${name}-${area}`.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
    return { success: true, slug };
  },
  rejectBusiness: ok,
  deleteBusiness: ok,
  setFeaturedGem: ok,
  autoSelectFeaturedGem: ok,
  approveEditRequest: ok,
  rejectEditRequest: ok,
  createBlogPost: ok,
  updateBlogPost: ok,
  deleteBlogPost: ok,
};

export default function PreviewClient() {
  return (
    <AdminApp
      businesses={BUSINESSES}
      currentFeatured={CURRENT_FEATURED}
      featuredHistory={FEATURED_HISTORY}
      editRequests={EDIT_REQUESTS}
      blogPosts={BLOG_POSTS}
      actions={DEMO_ACTIONS}
    />
  );
}
