// this is not a normal page — it's an address (hiddengemssa.co.za/api/cron/
// featured-gem) that only exists to be visited automatically by Vercel's
// own scheduling system every Monday morning, based on the timing set in
// vercel.json. visiting it is what triggers the "pick a new featured gem
// of the week" logic, without anyone needing to log into the admin panel
// and click the button themselves.
//
// because nobody is actually logged in when this runs (it's a computer
// talking to another computer, not a browser with a login cookie), it
// proves it's allowed to run this by sending a secret password
// (CRON_SECRET) that only Vercel and this server both know.

import { NextResponse } from "next/server";
import { autoSelectFeaturedGemForCron } from "@/app/admin/actions";

// always run this fresh — never show a cached response.
export const dynamic = "force-dynamic";

export async function GET(request) {
  // check the secret password sent along with the request. if it's
  // missing, wrong, or the site doesn't even have one configured, refuse
  // to do anything — this stops a stranger from finding this address and
  // triggering it themselves.
  const authHeader = request.headers.get("authorization");
  const expectedAuthHeader = `Bearer ${process.env.CRON_SECRET}`;
  const secretIsMissingOrWrong = !process.env.CRON_SECRET || authHeader !== expectedAuthHeader;

  if (secretIsMissingOrWrong) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // secret checked out — go ahead and pick this week's featured gem.
  const result = await autoSelectFeaturedGemForCron();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
