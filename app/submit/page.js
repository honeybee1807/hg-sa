// this is the page at hiddengemssa.co.za/submit — "List Your Business
// Free". the actual form (all the input fields, logo upload, etc.) lives
// in SubmitForm.js; this file just wraps it with the page heading and the
// page's title/description for search engines.

import { SITE_URL } from "@/lib/constants";
import SubmitForm from "./SubmitForm";

export const metadata = {
  title: "List Your Business for Free",
  description:
    "List your business on Hidden Gems SA for free, with no account needed. We check new listings within 48 hours. Bakers, tutors, trades, beauty and more.",
  alternates: { canonical: `${SITE_URL}/submit` },
};

export default function SubmitPage() {
  return (
    <div className="container" style={{ maxWidth: 720, paddingTop: "2rem", paddingBottom: "4rem" }}>
      <div className="submit-page-header">
        <h1>List Your Business for Free</h1>
        <p>
          Fill in the form below. It&apos;s free, you don&apos;t need an account, and we
          check new listings within 24 to 48 hours.
        </p>
      </div>
      <SubmitForm />
    </div>
  );
}
