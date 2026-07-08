// this is the page at hiddengemssa.co.za/submit — "List Your Business
// Free". the actual form (all the input fields, logo upload, etc.) lives
// in SubmitForm.js; this file just wraps it with the page heading and the
// page's title/description for search engines.

import { SITE_URL } from "@/lib/constants";
import SubmitForm from "./SubmitForm";

export const metadata = {
  title: "List Your Business Free — Hidden Gems SA",
  description:
    "Submit your KwaZulu-Natal local business to Hidden Gems SA. Free listing, approved within 48 hours. Home bakers, tutors, transport, beauty and more welcome.",
  alternates: { canonical: `${SITE_URL}/submit` },
};

export default function SubmitPage() {
  return (
    <div className="container" style={{ maxWidth: 720, paddingTop: "2rem", paddingBottom: "4rem" }}>
      <div className="submit-page-header">
        <h1>List Your Business for Free</h1>
        <p>
          Join the Hidden Gems SA directory. Fill in the form below — our team reviews and
          approves your listing within 24–48 hours. No payment and no account required.
        </p>
      </div>
      <SubmitForm />
    </div>
  );
}
