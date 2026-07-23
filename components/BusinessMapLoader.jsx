"use client";

// next/dynamic's "ssr: false" option can only be used from inside a Client
// Component — Next.js's App Router rejects it if called directly from a
// Server Component (which app/business/[slug]/page.js is). this thin
// wrapper exists purely to give that dynamic import a Client Component to
// live in, so the page itself can stay a plain Server Component and just
// render <BusinessMapLoader ... /> like any other component.

import dynamic from "next/dynamic";

const BusinessMap = dynamic(() => import("@/components/BusinessMap"), { ssr: false });

export default function BusinessMapLoader(props) {
  return <BusinessMap {...props} />;
}
