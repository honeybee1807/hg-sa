import Link from "next/link";
import Image from "next/image";
import { OLIDEEN_URL } from "@/lib/constants";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-inner">

        {/* brand */}
        <div className="footer-brand">
          <div className="footer-brand-mark">
            <Image src="/HG_Logo.png" alt="Hidden Gems SA" width={92} height={40} style={{ height: 40, width: "auto" }} />
            <span className="footer-title">Hidden Gems SA</span>
          </div>
          <p>Free local business directory for KwaZulu-Natal.</p>
        </div>

        {/* nav links */}
        <nav className="footer-links">
          <Link href="/">Home</Link>
          <Link href="/towns">Browse by Town</Link>
          <Link href="/categories">Browse by Category</Link>
          <Link href="/submit">Submit a Business</Link>
        </nav>

        {/* olideen credit */}
        <div className="footer-credit">
          <span className="footer-built-by">Built by</span>
          <a
            href={OLIDEEN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-ot-link"
          >
            <Image
              src="/OT_Logo.png"
              alt="Olideen Technologies"
              width={160}
              height={56}
              className="ot-logo-pulse"
              style={{ objectFit: "contain", height: "auto" }}
            />
          </a>
          <p className="footer-copy">&copy; {year} Hidden Gems SA</p>
        </div>

      </div>
    </footer>
  );
}
