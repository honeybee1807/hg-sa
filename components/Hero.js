"use client";

// the big banner section at the very top of the homepage: the headline,
// the "browse directory" / "list for free" buttons, three animated
// counters (areas/categories/free), and — on the right-hand side — a
// preview of what a business listing looks like.
//
// that right-hand preview is actually two different things depending on
// screen size (decided purely by CSS, both exist in the markup at once):
//   - on desktop (980px and wider): MockupCard below, a purely decorative,
//     hand-written example card that never changes — it exists just to
//     show what a listing looks like, it is NOT a real business
//   - on mobile (below 980px): the decorative mockup is hidden, and the
//     REAL current Featured Gem card (see [[FeaturedGemCard]]) is promoted
//     up into the hero instead, so mobile visitors still see something
//     real and current rather than losing this space entirely

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import HeroBackground from "@/components/HeroBackground";
import FeaturedGemCard from "@/components/FeaturedGemCard";
import { CATEGORIES } from "@/lib/constants";

// a hand-written, always-the-same example of what a business listing card
// looks like. purely decorative — "Your Business Name" is a deliberately
// generic placeholder, not a real business in the database — it's just
// there to make the hero look populated on desktop screens before any
// animation or real data loads. named unmistakably as a placeholder so it's
// never mistaken for leftover fallback data.
function MockupCard() {
  return (
    <div className="hero-mockup">
      <div className="hero-mockup-glow" aria-hidden="true" />
      <div className="hero-mockup-card">
        <div className="hero-mc-gem-badge">
          <i className="fa-solid fa-gem" /> Featured Gem
        </div>
        <div className="hero-mc-header">
          <div className="hero-mc-avatar">YB</div>
          <div className="hero-mc-meta">
            <strong className="hero-mc-name">Your Business Name</strong>
            <div className="hero-mc-tags">
              <span className="hero-mc-tag hero-mc-tag--cat">
                <i className="fa-solid fa-bread-slice" /> Baking &amp; Catering
              </span>
              <span className="hero-mc-tag hero-mc-tag--town">
                <i className="fa-solid fa-location-dot" /> Ladysmith
              </span>
            </div>
          </div>
        </div>
        <p className="hero-mc-desc">
          Homemade meals, event catering &amp; baked goods — trusted by the Ladysmith community since 2019.
        </p>
        <div className="hero-mc-actions">
          <span className="hero-mc-wa">
            <i className="fa-brands fa-whatsapp" /> WhatsApp
          </span>
          <span className="hero-mc-view">
            View Profile <i className="fa-solid fa-arrow-right" />
          </span>
        </div>
        <div className="hero-mc-glare" aria-hidden="true" />
      </div>
      <div className="hero-mockup-shadow-card" aria-hidden="true" />
    </div>
  );
}

export default function Hero({ featuredGem, areaCount }) {
  const ref = useRef(null); // points at the outer <section>, used to scope all of the animations below to just this component

  useEffect(() => {
    const animationContext = gsap.context(() => {
      // the entrance sequence: each piece of the hero fades and slides in
      // one after another, in this order — eyebrow tag, first headline
      // line, second headline line, subheading paragraph, the two buttons,
      // the mockup card, then the three stat numbers. the negative
      // "-=0.x" timings make each step start slightly before the previous
      // one finishes, so it reads as one flowing motion rather than a
      // series of separate, disconnected pops.
      const entranceTimeline = gsap.timeline({ delay: 0.1 });

      entranceTimeline
        .fromTo(".h-eyebrow",
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" })
        .fromTo(".h-line-1",
          { y: 64, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, "-=0.2")
        .fromTo(".h-line-2",
          { y: 64, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, "-=0.52")
        .fromTo(".h-sub",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, "-=0.4")
        .fromTo(".h-ctas",
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, "-=0.35")
        .fromTo(".hero-mockup",
          { x: 56, opacity: 0, scale: 0.93 },
          { x: 0, opacity: 1, scale: 1, duration: 1.1, ease: "expo.out" }, "-=0.7")
        .fromTo(".h-stat",
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.09, duration: 0.45, ease: "power3.out" }, "-=0.4");

      // once the mockup card has entered, it keeps gently floating up and
      // down forever (repeat: -1 means "repeat endlessly", yoyo means
      // "reverse back and forth" rather than snapping back to the start).
      gsap.to(".hero-mockup-card", {
        y: -14,
        duration: 3.8,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });

      // the three "Areas Covered / Categories / Free to List" numbers count
      // up from zero once the hero loads, rather than just appearing as
      // static text. each one is set up the same way, so this loops over a
      // small list describing all three instead of writing the same setup
      // code three separate times. the categories total comes straight from
      // lib/constants.js so it can never drift out of sync; the areas total
      // is passed in as a prop (see app/page.js) since areas are no longer
      // a fixed list — it's however many distinct areas currently have an
      // approved business.
      const counters = [
        { selector: ".hc-towns", finalValue: areaCount,          suffix: "" },
        { selector: ".hc-cats",  finalValue: CATEGORIES.length, suffix: "" },
        { selector: ".hc-free",  finalValue: 100,               suffix: "%" },
      ];

      for (const counter of counters) {
        const counterElement = ref.current?.querySelector(counter.selector);
        if (!counterElement) continue;

        // gsap can't directly "animate" a piece of text, so instead a
        // plain number is animated from 0 up to the target value, and on
        // every tick of that animation the on-screen text is updated to
        // show the current rounded number.
        const animatedNumber = { currentValue: 0 };
        gsap.to(animatedNumber, {
          currentValue: counter.finalValue,
          duration: 2.2,
          ease: "power2.out",
          delay: 1.0,
          onUpdate() {
            counterElement.textContent = Math.round(animatedNumber.currentValue) + counter.suffix;
          },
        });
      }
    }, ref);

    return () => animationContext.revert();
  }, [areaCount]);

  // the actual markup: the rotating photo background, then two columns —
  // the headline/buttons/stats on the left, and either the decorative
  // mockup or the real Featured Gem on the right (see the top-of-file note
  // for how those two are switched between by CSS).
  return (
    <section className="hero" ref={ref}>
      <HeroBackground />
      <div className="hero-bg" aria-hidden="true">
        <div className="hero-dot-grid" />
        <div className="hero-glow-rose" />
        <div className="hero-glow-blue" />
      </div>

      <div className="container hero-inner">
        {/* ── left: copy ── */}
        <div className="hero-left">
          <span className="h-eyebrow">
            <span className="h-eyebrow-dot" />
            South African Business Directory
          </span>

          <h1 className="hero-h1">
            <span className="h-line-1">Find South Africa&apos;s</span>
            <span className="h-line-2">
              <span className="hero-shimmer-text">Hidden Gems</span>
            </span>
          </h1>

          <p className="h-sub">
            Connect with South Africa&apos;s finest home bakers, tutors, transport operators,
            hairstylists and more — all completely free.
          </p>

          <div className="h-ctas">
            <Link href="/categories" className="hero-cta-primary">
              <i className="fa-solid fa-compass" /> Browse Directory
            </Link>
            <Link href="/submit" className="hero-cta-ghost">
              <i className="fa-solid fa-plus" /> List for Free
            </Link>
          </div>

          <div className="h-stats">
            <div className="h-stat">
              <span className="h-stat-val hc-towns">0</span>
              <span className="h-stat-label">Areas Covered</span>
            </div>
            <div className="h-stat-sep" />
            <div className="h-stat">
              <span className="h-stat-val hc-cats">0</span>
              <span className="h-stat-label">Categories</span>
            </div>
            <div className="h-stat-sep" />
            <div className="h-stat">
              <span className="h-stat-val hc-free">0%</span>
              <span className="h-stat-label">Free to List</span>
            </div>
          </div>
        </div>

        {/* ── right: mockup (desktop only, decorative) ── */}
        <MockupCard />

        {/* ── mobile only: the real Featured Gem, promoted up into the hero
             since the decorative mockup above is hidden below 980px ── */}
        <div className="hero-mobile-gem">
          <FeaturedGemCard gem={featuredGem} />
        </div>
      </div>
    </section>
  );
}
