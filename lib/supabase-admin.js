// this is the "backstage" connection to the database, used only by the
// admin panel (approving/rejecting businesses, setting the featured gem,
// and so on).
//
// unlike lib/supabase.js, this one uses the secret "service role" key,
// which completely skips Supabase's row level security (RLS) rules — it
// can read and change anything in the database, including private fields
// and pending/rejected listings. because it's this powerful, it must NEVER
// be sent to a visitor's browser. every function that calls this must also
// check the person is actually logged in as admin first (see the
// isAdminAuthed check in app/admin/actions.js).

import { createClient } from "@supabase/supabase-js";

export function getAdminClient() {
  // safety net: if this code somehow ran in a browser instead of on the
  // server, stop immediately rather than risk leaking the secret key.
  const isRunningInABrowser = typeof window !== "undefined";
  if (isRunningInABrowser) {
    throw new Error("getAdminClient must only be called on the server.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const eitherValueIsMissing = !supabaseUrl || !secretServiceRoleKey;
  if (eitherValueIsMissing) {
    throw new Error("Missing Supabase admin env vars.");
  }

  return createClient(supabaseUrl, secretServiceRoleKey, {
    // this connection is only ever used for a single request at a time on
    // the server, so it doesn't need to remember a login session or
    // automatically refresh tokens the way a browser-based one would.
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
