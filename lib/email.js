// the site's only outgoing email, so far: the "click this link to edit your
// listing" message sent from app/edit/actions.js. uses Resend
// (https://resend.com) — no existing email setup was found anywhere else in
// the codebase, so this is a new, small integration rather than a
// replacement of something already there.
//
// this file must only ever be imported from server-only code (a Server
// Action or a Server Component) — RESEND_API_KEY is a secret and must never
// reach a visitor's browser.

import { Resend } from "resend";

// the address customer-facing emails are sent "from". Resend requires the
// domain in this address to be verified in the Resend dashboard before it
// will actually deliver mail — see the setup note in the project's
// deployment instructions. until that's done, sending will fail with a
// clear error from Resend rather than silently doing nothing.
const FROM_ADDRESS = "Hidden Gems SA <edit@hiddengemssa.co.za>";

// sends the magic-link email a business owner needs to edit their listing.
// returns { success: true } or { success: false, error } rather than
// throwing, so app/edit/actions.js can show a clean message to the visitor
// instead of a raw exception if Resend is ever unreachable or misconfigured.
export async function sendEditLinkEmail({ to, businessName, editUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("sendEditLinkEmail: RESEND_API_KEY is not set.");
    return { success: false, error: "Email sending is not configured." };
  }

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `Edit your Hidden Gems SA listing — ${businessName}`,
      html: `
        <p>Hello,</p>
        <p>You requested a link to edit your Hidden Gems SA listing for <strong>${businessName}</strong>.</p>
        <p><a href="${editUrl}">Click here to edit your listing</a></p>
        <p>This link will expire in 24 hours and can only be used once your changes have been submitted for review. If you didn't request this, you can safely ignore this email.</p>
        <p>— Hidden Gems SA</p>
      `,
    });

    if (error) {
      console.error("sendEditLinkEmail error:", error);
      return { success: false, error: "Failed to send the edit link email." };
    }

    return { success: true };
  } catch (error) {
    console.error("sendEditLinkEmail exception:", error);
    return { success: false, error: "Failed to send the edit link email." };
  }
}
