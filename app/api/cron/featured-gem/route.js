import { NextResponse } from "next/server";
import { autoSelectFeaturedGem } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

// Triggered by Vercel Cron every Monday — see vercel.json.
// Vercel signs cron requests with `Authorization: Bearer $CRON_SECRET`.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await autoSelectFeaturedGem();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
