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
import Image from "next/image";
import { OLIDEEN_URL } from "@/lib/constants";

export default function OlideenPromo() {
  const ref = useRef(null); // points at the outer <section> below, used both as the scroll-trigger target and to scope the animation to just this component

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const sectionElement = ref.current;
    if (!sectionElement) return;

    // gsap.context() groups every animation created inside it so they can
    // all be cleaned up together (via ctx.revert()) when this component is
    // removed from the page. scoped to this section, so ".promo-animate"
    // only ever matches elements inside it.
    const animationContext = gsap.context(() => {
      gsap.set(".promo-animate", { y: 32, opacity: 0 });
    }, sectionElement);

    // every element carrying the "promo-animate" class name — logo,
    // heading, paragraph, button, and the mobile credit strip — fades and
    // slides upward into place, one after another ("stagger"), once this
    // section's top is 18% of the screen height above the bottom of the
    // screen (the old "top 82%" point). uses IntersectionObserver rather
    // than ScrollTrigger for the same reason as AnimatedSection.js: it
    // always checks the section's real current position, so the content
    // can't get stuck invisible when the page above changes height.
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();

        animationContext.add(() => {
          gsap.to(".promo-animate", {
            y: 0,
            opacity: 1,
            duration: 0.85,
            stagger: 0.18,
            ease: "power3.out",
            force3D: true,
            clearProps: "transform",
          });
        });
      },
      { rootMargin: "0px 0px -18% 0px" }
    );
    observer.observe(sectionElement);

    return () => {
      observer.disconnect();
      animationContext.revert();
    };
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
            width={150}
            height={53}
            className="ot-logo-pulse"
            style={{ objectFit: "contain", height: "auto" }}
          />
        </a>
        <h2 className="promo-animate promo-heading promo-full-only">
          Connecting South Africa,<br />One Business at a Time
        </h2>
        <p className="promo-animate promo-sub promo-full-only">
          We build digital tools that put local businesses 
          across KwaZulu-Natal, on the map.
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
