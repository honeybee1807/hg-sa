// this is the "public" connection to the Supabase database — the one every
// visitor's browser and every ordinary page (homepage, category pages, area
// pages, business pages) uses to look up businesses.
//
// it only ever uses the public "anon" key, which is safe to expose — it's
// meant to end up in the browser. the actual security comes from row level
// security (RLS) rules set up inside Supabase itself, which decide what this
// key is and isn't allowed to see (for example: only approved businesses,
// never a business owner's private email address).
//
// for anything that needs to bypass those rules (like the admin panel), see
// lib/supabase-admin.js instead — that one must never be used in the browser.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default supabase;
