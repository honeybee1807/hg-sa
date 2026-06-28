import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// self-hosted via next/font — no extra network round-trip at runtime
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

// sitewide defaults — individual pages override title and description
export const metadata = {
  title: {
    default: "Hidden Gems SA – Free KZN Business Directory | KwaZulu-Natal",
    template: "%s | Hidden Gems SA",
  },
  description:
    "Find trusted local businesses across KwaZulu-Natal for free. Home bakers, tutors, transport, beauty & more in Ladysmith, Pietermaritzburg, Dundee and 8 other KZN towns.",
  metadataBase: new URL("https://directory.olideentech.co.za"),
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
  // geo meta tags — helps map and local search engines
  other: {
    "geo.region":    "ZA-KZN",
    "geo.placename": "KwaZulu-Natal, South Africa",
    "geo.position":  "-28.7282;30.3577",
    "ICBM":          "-28.7282, 30.3577",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-ZA" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        {/* preconnect to icon/ui cdn — reduces time-to-first-byte for external assets */}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        {/* preconnect to cloudinary so logo images load faster */}
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />

        {/* font awesome — loaded sync because icons appear above the fold */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        {/* cropper.js css — only used on the /submit page but small enough to keep global */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
