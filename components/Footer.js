// the site-wide footer shown at the bottom of every page, on a light
// lavender background:
//   top row     the Hidden Gems SA logo (links home), a two-line tagline,
//               and "Back to top"
//   link row    popular categories and areas, from live listings (passed in
//               by app/layout.js), as plain links
//   hairline divider
//   bottom row  the nav links, the "Built by Olideen Technologies" credit,
//               and a small stack: Disclaimer & Terms, Edit your listing,
//               and the copyright line
// on a phone it all stacks into one centred column, in that same order.

import Link from "next/link";
import Image from "next/image";
import { OLIDEEN_URL } from "@/lib/constants";
import BackToTop from "@/components/BackToTop";

export default function Footer({ categoryLinks = [], areaLinks = [] }) {
  const year = new Date().getFullYear(); // used in the "© 2026 Hidden Gems SA" line below, so it never needs manually updating

  return (
    <footer className="footer">
      <div className="container">
        {/* ── top row ── */}
        <div className="footer-top">
          <Link href="/" className="footer-logo" aria-label="Hidden Gems SA home">
            <Image
              src="/HG_Logo.png"
              alt="Hidden Gems SA"
              width={206}
              height={92}
              sizes="206px"
              style={{ width: 206, height: "auto" }}
            />
          </Link>

          <p className="footer-tagline">
            <span>Hidden in your community.</span>
            <em>Found through Hidden Gems SA.</em>
          </p>

          <BackToTop className="footer-back-to-top" />
        </div>

        {(categoryLinks.length > 0 || areaLinks.length > 0) && (
          <div className="footer-links">
            {categoryLinks.length > 0 && (
              <nav aria-label="Popular categories">
                <p className="footer-links-title">Popular categories</p>
                <ul>
                  {categoryLinks.map((l) => <li key={l.href}><Link href={l.href} prefetch={false}>{l.label}</Link></li>)}
                  <li><Link href="/categories" prefetch={false}>All categories</Link></li>
                </ul>
              </nav>
            )}
            {areaLinks.length > 0 && (
              <nav aria-label="Browse by area">
                <p className="footer-links-title">Browse by area</p>
                <ul>
                  {areaLinks.map((l) => <li key={l.href}><Link href={l.href} prefetch={false}>{l.label}</Link></li>)}
                  <li><Link href="/towns" prefetch={false}>All areas</Link></li>
                </ul>
              </nav>
            )}
          </div>
        )}

        <hr className="footer-rule" />

        {/* ── bottom row ── */}
        <div className="footer-bottom">
          <nav className="footer-nav" aria-label="Footer">
            {/* "Directory" goes to the directory section on the homepage
                (id="directory", see components/DirectorySearch.js) */}
            <Link href="/#directory">Directory</Link>
            <Link href="/towns">Areas</Link>
            <Link href="/categories">Categories</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/submit">Submit a Business</Link>
          </nav>

          <a
            href={OLIDEEN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-credit"
          >
            Built by Olideen Technologies <span aria-hidden="true">↗</span>
          </a>

          <div className="footer-meta">
            <Link href="/disclaimer">Disclaimer &amp; Terms</Link>
            <Link href="/edit">Edit your listing</Link>
            <p className="footer-copy">&copy; {year} Hidden Gems SA</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
