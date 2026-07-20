"use client";

// the "built by Olideen Technologies" section shown on the homepage,
// giving Olideen an explicit, dedicated credit rather than a small
// footer-only mention.
//
// this component actually renders two different versions of the credit at
// once, and CSS (via the "promo-full-only" / "promo-mobile-credit" class
// names) decides which one is visible at any given screen width:
//   - on desktop/tablet (768px and wider): a full rich panel with the
//     logo, heading, paragraph, and a "visit Olideen" button
//   - on mobile (below 768px): a small, compact strip with just the logo
//     and one line of text, so it doesn't compete for scroll space with
//     the Featured Gem card and the business listings
// both versions exist in the markup at the same time; only one is ever
// visible to a given visitor.

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { OLIDEEN_URL } from "@/lib/constants";

gsap.registerPlugin(ScrollTrigger);

export default function OlideenPromo() {
  const ref = useRef(null); // points at the outer <section> below, used both as the scroll-trigger target and to scope the animation to just this component

  useEffect(() => {
    // gsap.context() groups every animation created inside it so they can
    // all be cleaned up together (via ctx.revert()) when this component is
    // removed from the page — without it, an animation on ".promo-animate"
    // could accidentally linger and affect a different part of the page.
    const animationContext = gsap.context(() => {
      // every element carrying the "promo-animate" class name — logo,
      // heading, paragraph, button, and the mobile credit strip — fades
      // and slides upward into place together, one after another
      // ("stagger"), the moment this section scrolls into view.
      gsap.fromTo(
        ".promo-animate",
        { y: 32, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.85,
          stagger: 0.18,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 82%", once: true },
        }
      );
    }, ref);

    return () => animationContext.revert();
  }, []);

  return (
    <section className="olideen-promo" ref={ref}>
      <div className="promo-shimmer" aria-hidden="true" />
      <div className="container promo-content">
        {/* full rich panel — desktop/tablet only, ≥768px */}
        <a
          href={OLIDEEN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="promo-animate promo-ot-logo-wrap promo-full-only"
        >
          <Image
            src="/OT_Logo.png"
            alt="Olideen Technologies"
            width={200}
            height={70}
            className="ot-logo-pulse"
            style={{ objectFit: "contain", height: "auto" }}
          />
        </a>
        <h2 className="promo-animate promo-heading promo-full-only">
          Connecting South Africa,<br />One Business at a Time
        </h2>
        <p className="promo-animate promo-sub promo-full-only">
          We build digital tools that put overlooked local businesses on the map —
          from Estcourt to Pietermaritzburg.
        </p>
        <a
          href={OLIDEEN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="promo-animate btn-primary promo-cta promo-full-only"
        >
          <i className="fa-solid fa-arrow-up-right-from-square" />
          Visit Olideen Technologies
        </a>

        {/* compact dedicated credit strip — mobile only, below 768px.
            replaces the full panel so it doesn't compete with the
            Featured Gem card and directory listing for scroll space,
            while still giving Olideen an explicit, dedicated mention. */}
        <a
          href={OLIDEEN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="promo-animate promo-mobile-credit"
        >
          <Image
            src="/OT_Logo.png"
            alt="Olideen Technologies"
            width={140}
            height={49}
            style={{ objectFit: "contain", height: "auto" }}
          />
          <span>Built with care by Olideen Technologies</span>
        </a>
      </div>
    </section>
  );
}
