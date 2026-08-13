// the page at hiddengemssa.co.za/edit — the entry point for a business
// owner who wants to change something on their already-approved listing.
// the actual form (just an email field) lives in EditRequestForm.js; this
// file just wraps it with the page heading and search-engine metadata,
// the same way app/submit/page.js wraps SubmitForm.js.

import { SITE_URL } from "@/lib/constants";
import EditRequestForm from "./EditRequestForm";

export const metadata = {
  title: "Edit Your Listing — Hidden Gems SA",
  description: "Request a secure link to edit your Hidden Gems SA listing.",
  alternates: { canonical: `${SITE_URL}/edit` },
  robots: "noindex",
};

export default function EditRequestPage() {
  return (
    <div className="container" style={{ maxWidth: 480, paddingTop: "2rem", paddingBottom: "4rem" }}>
      <div className="submit-page-header">
        <h1>Edit Your Listing</h1>
        <p>Enter the email address you used when you submitted your business.</p>
      </div>
      <EditRequestForm />
    </div>
  );
}
