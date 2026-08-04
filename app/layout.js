// this is the "wrapper" that every single page on the site sits inside —
// the navbar and footer come from here, and so does all the default
// information search engines and social media use to describe the site
// (the sitewide title, description, and preview image). individual pages
// can override the title/description, but everything else defined here
// applies everywhere.

import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// the two fonts used across the site: Playfair Display for headings, Inter
// for body text. next/font downloads and hosts these ourselves (instead of
// linking to Google's servers), which is faster for visitors.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// sitewide defaults for search engines and social media previews.
// any page can override "title" and "description" for itself — everything
// else below (keywords, geo tags, preview image, etc.) is shared by every
// page unless that page specifically overrides it too.
export const metadata = {
  title: {
    // shown when a page doesn't set its own title
    default: "Hidden Gems SA – Free KZN Business Directory | KwaZulu-Natal",
    // when a page DOES set its own title, "%s" gets replaced with that title
    // and " | Hidden Gems SA" is added on the end automatically — so a page
    // titled "Ladysmith" becomes "Ladysmith | Hidden Gems SA".
    template: "%s | Hidden Gems SA",
  },
  description:
    "Find trusted local businesses across KwaZulu-Natal for free. Home bakers, tutors, transport, beauty & more in Ladysmith, Pietermaritzburg, Dundee and 9 other KZN towns.",
  metadataBase: new URL("https://www.hiddengemssa.co.za"),
  keywords: [
    "KwaZulu-Natal business directory",
    "KZN local businesses",
    "find businesses KZN",
    "Ladysmith businesses",
    "Pietermaritzburg local directory",
    "Dundee KZN businesses",
    "home bakers KZN",
    "tutors KwaZulu-Natal",
    "transport KZN",
    "hairstylists KwaZulu-Natal",
    "free business listing South Africa",
    "Hidden Gems SA",
    "Olideen Technologies",
  ],
  authors: [{ name: "Olideen Technologies", url: "https://olideentech.co.za" }],
  creator: "Olideen Technologies",
  publisher: "Olideen Technologies",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
  // "open graph" (OG) is the standard that controls how a link looks when
  // it's pasted into WhatsApp, Facebook, or similar apps — the preview
  // image, title, and description that show up automatically.
  openGraph: {
    siteName: "Hidden Gems SA",
    locale: "en_ZA",
    type: "website",
    images: [{ url: "/HG_Logo.png", alt: "Hidden Gems SA – KZN Business Directory" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@HiddenGemsSA",
  },
  // "geo" tags tell search engines and map services exactly where in the
  // world this business is based — this helps the site show up for local
  // ("near me") searches around KwaZulu-Natal.
  other: {
    "geo.region":    "ZA-KZN",
    "geo.placename": "KwaZulu-Natal, South Africa",
    "geo.position":  "-28.7282;30.3577",
    "ICBM":          "-28.7282, 30.3577",
    // Bing Webmaster Tools site-ownership verification — must stay in place
    // even after verification succeeds, or Bing will consider the site
    // unverified again.
    "msvalidate.01": "17AF8ABDB6A08331DD9759B6181136F5",
  },
};

// this component wraps around every page on the site. anything placed here
// (like the navbar and footer below) appears on every single page.
export default function RootLayout({ children }) {
  return (
    <html lang="en-ZA" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        {/* "preconnect" tells the browser to start setting up a connection to
            these outside websites early, before it actually needs the files
            from them — this shaves a little bit of loading time off later. */}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />

        {/* Font Awesome (FA) is the icon set used everywhere on the site
            (the little symbols next to text, like the location pin or the
            WhatsApp logo). it's loaded here so every page has access to it. */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        {/* styling for the logo-cropping tool on the "submit a business" page.
            it's small enough that loading it on every page (rather than just
            that one) doesn't meaningfully slow anything down. */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Navbar />
        {/* "children" is whatever the current page is — the homepage, a
            business page, the submit form, and so on. it always appears
            between the navbar and the footer. */}
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
