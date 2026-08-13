// every outgoing email the site sends. uses Resend (https://resend.com) —
// the "click this link to edit your listing" message (sendEditLinkEmail)
// was the first use of it; the two admin-security notifications below
// (sendAdminLoginNotification, sendBusinessDeletedNotification) reuse the
// exact same client/pattern rather than adding a second email service.
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

// where the two admin-security tripwire emails below (login + delete) go —
// not a customer-facing address, so it's kept separate from FROM_ADDRESS.
const ADMIN_NOTIFICATION_EMAIL = "olideentech@gmail.com";

// shared by both tripwire notifications below — same Resend client setup,
// same try/catch/return-rather-than-throw shape as sendEditLinkEmail, just
// factored out since neither notification needs anything as involved as
// that one's templated HTML.
async function sendNotificationEmail({ subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("sendNotificationEmail: RESEND_API_KEY is not set.");
    return { success: false, error: "Email sending is not configured." };
  }

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: ADMIN_NOTIFICATION_EMAIL,
      subject,
      html,
    });

    if (error) {
      console.error("sendNotificationEmail error:", error);
      return { success: false, error: "Failed to send notification email." };
    }

    return { success: true };
  } catch (error) {
    console.error("sendNotificationEmail exception:", error);
    return { success: false, error: "Failed to send notification email." };
  }
}

// security tripwire: fired (via next/server's after(), see app/admin/actions.js)
// on every successful admin login, so a login you didn't make doesn't go
// unnoticed.
export async function sendAdminLoginNotification({ time }) {
  return sendNotificationEmail({
    subject: "Admin login — Hidden Gems SA",
    html: `<p>An admin login occurred on Hidden Gems SA at <strong>${time}</strong>.</p>`,
  });
}

// security tripwire: fired (via next/server's after()) on every permanent
// business deletion, so a deletion you didn't make doesn't go unnoticed.
export async function sendBusinessDeletedNotification({ businessName, time }) {
  return sendNotificationEmail({
    subject: "Business deleted — Hidden Gems SA",
    html: `<p><strong>${businessName}</strong> was permanently deleted from Hidden Gems SA at <strong>${time}</strong>.</p>`,
  });
}

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
