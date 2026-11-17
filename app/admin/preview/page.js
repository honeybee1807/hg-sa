// DEVELOPMENT ONLY: the redesigned admin running on made-up sample data,
// at localhost:3000/admin/preview, for checking layout and styling
// without a login or any database access. in production (the live site)
// this route always returns a 404, so it is never publicly reachable.
// its buttons call harmless stand-ins (see PreviewClient.js), never the
// real server actions.

import { notFound } from "next/navigation";
import PreviewClient from "./PreviewClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin preview (dev) — Hidden Gems SA", robots: "noindex" };

// deep links work the same as on the real admin, e.g.
// /admin/preview?view=listings&review=101
export default function AdminPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PreviewClient />;
}
