// this is the "wrapper" that every single page on the site sits inside —
// the navbar and footer come from here, and so does all the default
// information search engines and social media use to describe the site
// (the sitewide title, description, and preview image). individual pages
// can override the title/description, but everything else defined here
// applies everywhere.

import { Instrument_Serif, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppHelpButton from "@/components/WhatsAppHelpButton";
import DeferredStylesheet from "@/components/DeferredStylesheet";
import { SITE_URL } from "@/lib/constants";
import { getAreas, getCategories } from "@/lib/directory";
import { SITE_GRAPH, JsonLd, searchPhrase } from "@/lib/seo";

// pages without their own refresh interval (the disclaimer, the submit
// form) still pick up new footer links at least hourly.
export const revalidate = 3600;

// the two fonts used across the site: Instrument Serif for headings, Space
// Grotesk for body text. next/font downloads and hosts these ourselves
// (instead of linking to Google's servers), which is faster for visitors.
// they're wired into the rest of the site through the --font-heading and
// --font-body tokens at the top of app/globals.css.
//
// Instrument Serif only comes in one weight (regular), plus a true italic —
// which is used for the italic second lines of headings (e.g. "is closer
// than you think.").
const headingFont = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const bodyFont = Space_Grotesk({
  variable: "--font-space-grotesk",
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
    default: "Hidden Gems SA | Free Local Business Directory, KZN",
    // when a page DOES set its own title, "%s" gets replaced with that title
    // and " | Hidden Gems SA" is added on the end automatically — so a page
    // titled "Ladysmith" becomes "Ladysmith | Hidden Gems SA".
    template: "%s | Hidden Gems SA",
  },
  description:
    "A free directory of local businesses in KwaZulu-Natal and across South Africa: home bakers, tutors, transport, beauty, trades and more. No account needed.",
  metadataBase: new URL(SITE_URL),
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
  // the preview shown when a link is shared on WhatsApp, Facebook and so
  // on. the images themselves come from the opengraph-image.js files.
  openGraph: {
    siteName: "Hidden Gems SA",
    locale: "en_ZA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@HiddenGemsSA",
  },
  // the region the directory mostly covers. there's deliberately no exact
  // coordinate: the directory has no physical location of its own.
  other: {
    "geo.region":    "ZA-KZN",
    "geo.placename": "KwaZulu-Natal, South Africa",
    // Bing Webmaster Tools site-ownership verification — must stay in place
    // even after verification succeeds, or Bing will consider the site
    // unverified again.
    "msvalidate.01": "17AF8ABDB6A08331DD9759B6181136F5",
  },
};

// this component wraps around every page on the site. anything placed here
// (like the navbar and footer below) appears on every single page.
export default async function RootLayout({ children }) {
  // the footer's "Popular categories" and "Areas" links, built from live
  // listings so they only ever point at pages that have something on them.
  const [categories, areas] = await Promise.all([getCategories(), getAreas()]);
  const footerCategories = categories
    .filter((c) => c.businesses.length > 0)
    .sort((a, b) => b.businesses.length - a.businesses.length)
    .slice(0, 8)
    .map((c) => ({ href: `/category/${c.slug}`, label: searchPhrase(c.name) }));
  const footerAreas = [...areas]
    .sort((a, b) => b.businesses.length - a.businesses.length)
    .slice(0, 8)
    .map((a) => ({ href: `/town/${a.slug}`, label: a.name }));

  return (
    <html lang="en-ZA" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <head>
        {/* "preconnect" tells the browser to start setting up a connection to
            these outside websites early, before it actually needs the files
            from them — this shaves a little bit of loading time off later. */}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />

        {/* Font Awesome (FA) is the icon set used everywhere on the site
            (the little symbols next to text, like the location pin or the
            WhatsApp logo). it's loaded here so every page has access to
            it — but deferred until after first paint, since the full kit
            is a 280KB+ download that would otherwise block the page from
            rendering at all. non-JS visitors and crawlers still get it
            via the plain <link> in the <noscript> fallback below. */}
        <DeferredStylesheet
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
        </noscript>
        {/* styling for the logo-cropping tool on the "submit a business" page.
            it's small enough that loading it on every page (rather than just
            that one) doesn't meaningfully slow anything down. */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css"
          crossOrigin="anonymous"
        />

        {/* Google Analytics (gtag.js) — "afterInteractive" loads it once the
            page has become interactive, rather than blocking the initial
            render like a plain <script> tag placed here would. */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-GR2Q5QZRRJ"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-GR2Q5QZRRJ');
          `}
        </Script>

        {/* Microsoft Clarity — same "afterInteractive" loading approach as
            Google Analytics above. */}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "xx7lu0aqhf");
          `}
        </Script>
      </head>
      <body>
        <JsonLd data={SITE_GRAPH} />
        <Navbar />
        {/* "children" is whatever the current page is — the homepage, a
            business page, the submit form, and so on. it always appears
            between the navbar and the footer. */}
        <main>{children}</main>
        <Footer categoryLinks={footerCategories} areaLinks={footerAreas} />
        {/* floating "Need help?" WhatsApp button, bottom-right on every public page */}
        <WhatsAppHelpButton />
      </body>
    </html>
  );
}
