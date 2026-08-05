// the page at hiddengemssa.co.za/disclaimer — a static legal page (no
// data fetching, nothing dynamic) covering consumer protection, ECTA,
// POPIA, and the general terms of using the site. linked from the footer
// (see components/Footer.js), the submission/edit forms' consent
// checkbox, and a small notice on every business's own page.

import { SITE_URL } from "@/lib/constants";

export const metadata = {
  title: "Disclaimer & Terms of Use | Hidden Gems SA",
  description:
    "Hidden Gems SA's disclaimer and terms of use — how the platform connects users with independent local businesses, and what that does and doesn't mean under South African law.",
  alternates: { canonical: `${SITE_URL}/disclaimer` },
};

export default function DisclaimerPage() {
  return (
    <div className="container" style={{ maxWidth: 720, paddingTop: "2rem", paddingBottom: "4rem" }}>
      <div className="submit-page-header">
        <h1>Disclaimer &amp; Terms of Use</h1>
        <p><em>Operated by Olideen Technologies</em></p>
      </div>

      <div className="legal-content">
        <h2>1. About This Platform</h2>
        <p>
          Hidden Gems SA is a free, community-focused local business directory operated by
          Olideen Technologies. It is not a registered separate business entity, and does not
          itself provide the goods or services listed — it simply connects users with local
          businesses across KwaZulu-Natal and beyond.
        </p>

        <h2>2. Consumer Protection Act (CPA) 68 of 2008</h2>
        <p>
          Hidden Gems SA acts solely as a platform connecting users with independent
          third-party businesses. Any transaction, service, or purchase arising from a listing
          is a matter strictly between the user and the business concerned. Olideen Technologies
          is not a supplier of the goods or services advertised and accepts no liability under
          the CPA for the conduct, quality, or performance of any listed business.
        </p>

        <h2>3. Electronic Communications and Transactions Act (ECTA) 25 of 2002</h2>
        <p>
          As an intermediary service provider hosting third-party content (business listings
          submitted by their owners), Olideen Technologies&apos; liability is limited in
          accordance with ECTA. We do not independently verify, endorse, or guarantee the
          accuracy of information submitted by business owners.
        </p>

        <h2>4. Protection of Personal Information Act (POPIA) 4 of 2013</h2>
        <p>
          Personal information submitted through Hidden Gems SA (such as a business owner&apos;s
          name, email, or WhatsApp number) is collected solely for the purpose of operating and
          displaying business listings, and for confirming ownership when a listing is edited.
          We do not sell or share this information with third parties beyond what is necessary
          to operate the platform. Queries regarding personal information can be directed to{" "}
          <a href="mailto:info@hiddengemssa.co.za">info@hiddengemssa.co.za</a>.
        </p>

        <h2>5. No Warranty</h2>
        <p>
          Hidden Gems SA makes no warranty, express or implied, as to the accuracy,
          completeness, legitimacy, or quality of any business listed on the platform.
        </p>

        <h2>6. No Endorsement</h2>
        <p>
          The inclusion of a business on Hidden Gems SA does not constitute an endorsement,
          recommendation, or certification by Hidden Gems SA or Olideen Technologies.
        </p>

        <h2>7. Right to Remove</h2>
        <p>
          Hidden Gems SA reserves the right to remove, edit, or decline any listing at any time,
          without notice or obligation to provide a reason.
        </p>

        <h2>8. User Responsibility</h2>
        <p>
          Users engage with listed businesses entirely at their own risk. Users are responsible
          for conducting their own due diligence — including verifying credentials,
          certifications (such as Halal certification status), pricing, and legitimacy — before
          engaging with any listed business.
        </p>

        <h2>9. Business Owner Responsibility</h2>
        <p>
          Business owners are solely responsible for the accuracy and legality of the
          information they submit, including any claims, certifications, or badges (such as
          Halal, Delivery, or Call-Outs status) selected during submission or editing of their
          listing.
        </p>

        <h2>10. Indemnification</h2>
        <p>
          By using Hidden Gems SA — whether as a business owner submitting a listing or a user
          browsing listings — you agree to indemnify and hold harmless Olideen Technologies, its
          founder, and affiliates against any claim, loss, or damage arising from your use of
          the platform or your reliance on information found on it.
        </p>

        <h2>11. Governing Law</h2>
        <p>
          This disclaimer and your use of Hidden Gems SA are governed by the laws of the
          Republic of South Africa. Any disputes shall be subject to the jurisdiction of South
          African courts.
        </p>

        <p><strong>Contact:</strong> <a href="mailto:info@hiddengemssa.co.za">info@hiddengemssa.co.za</a></p>
      </div>
    </div>
  );
}
