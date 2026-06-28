import Link from "next/link";
import { SITE_URL, OLIDEEN_URL } from "@/lib/constants";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="footer-title">Hidden Gems SA</span>
          <p>Free local business directory for KwaZulu-Natal.</p>
        </div>

        <nav className="footer-links">
          <Link href="/">Home</Link>
          <Link href="/towns">Browse by Town</Link>
          <Link href="/categories">Browse by Category</Link>
          <Link href="/submit">Submit a Business</Link>
        </nav>

        <div className="footer-credit">
          <p>
            <i className="fa-solid fa-code" />{" "}
            Built by{" "}
            <a href={OLIDEEN_URL} target="_blank" rel="noopener noreferrer">
              Olideen Technologies
            </a>
          </p>
          <p className="footer-copy">&copy; {year} Hidden Gems SA</p>
        </div>
      </div>
    </footer>
  );
}
