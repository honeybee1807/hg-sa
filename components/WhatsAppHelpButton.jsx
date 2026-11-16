"use client";

// the floating green WhatsApp button in the bottom-right corner of every
// public page, for visitors who need help — it opens a WhatsApp chat with
// Hidden Gems SA (SITE_WHATSAPP in lib/constants.js) with a short message
// already typed in. hidden on the admin pages, where it isn't needed.

import { usePathname } from "next/navigation";
import { SITE_WHATSAPP } from "@/lib/constants";

const HELP_URL = `https://wa.me/${SITE_WHATSAPP}?text=${encodeURIComponent(
  "Hi Hidden Gems SA! I need some assistance with "
)}`;

export default function WhatsAppHelpButton() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <a
      href={HELP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="wa-help"
      aria-label="Need help? Chat with Hidden Gems SA on WhatsApp"
    >
      <i className="fa-brands fa-whatsapp" aria-hidden="true" />
      <span className="wa-help-label">Need help?</span>
    </a>
  );
}
