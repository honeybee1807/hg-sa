"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link href="/" className="navbar-logo">
          <Image src="/HG_Logo.png" alt="Hidden Gems SA" width={80} height={80} priority />
        </Link>

        <nav className={`navbar-links ${open ? "navbar-links--open" : ""}`}>
          <Link href="/" onClick={() => setOpen(false)}>Home</Link>
          <Link href="/towns" onClick={() => setOpen(false)}>Towns</Link>
          <Link href="/categories" onClick={() => setOpen(false)}>Categories</Link>
          <Link href="/submit" className="btn-primary navbar-cta" onClick={() => setOpen(false)}>
            <i className="fa-solid fa-plus" />
            List Your Business
          </Link>
        </nav>

        <button
          className="navbar-toggle"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <i className={open ? "fa-solid fa-xmark" : "fa-solid fa-bars"} />
        </button>
      </div>
    </header>
  );
}
