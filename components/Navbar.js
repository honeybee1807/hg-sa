"use client";

// the site-wide navigation bar shown at the top of every page. on a wide
// screen the links are always visible; on a narrow (mobile) screen they're
// tucked behind a hamburger button and only shown once tapped open — that
// open/closed state is the only thing this component needs to track.

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [menuIsOpen, setMenuIsOpen] = useState(false); // whether the mobile dropdown menu is currently showing

  // closes the mobile menu after tapping any link inside it, so the menu
  // doesn't stay open once the visitor has navigated away.
  function closeMenu() {
    setMenuIsOpen(false);
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link href="/" className="navbar-logo">
          <Image src="/HG_Logo.png" alt="Hidden Gems SA" width={110} height={48} priority style={{ height: 48, width: "auto" }} />
        </Link>

        {/* on mobile, the "navbar-links--open" class is what actually
            slides this menu into view — see the matching CSS. */}
        <nav className={`navbar-links ${menuIsOpen ? "navbar-links--open" : ""}`}>
          <Link href="/" onClick={closeMenu}>Home</Link>
          <Link href="/towns" onClick={closeMenu}>Areas</Link>
          <Link href="/categories" onClick={closeMenu}>Categories</Link>
          <Link href="/blog" onClick={closeMenu}>Blog</Link>
          <Link href="/submit" className="btn-primary navbar-cta" onClick={closeMenu}>
            <i className="fa-solid fa-plus" />
            List Your Business
          </Link>
        </nav>

        {/* the hamburger / close button — only visible on mobile widths via
            CSS, but always present in the markup. */}
        <button
          className="navbar-toggle"
          onClick={() => setMenuIsOpen(!menuIsOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuIsOpen}
        >
          <i className={menuIsOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"} />
        </button>
      </div>
    </header>
  );
}
