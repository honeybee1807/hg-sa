"use client";

// the big banner section at the very top of the homepage: the headline,
// a short description, the directory search bar (see
// components/DirectorySearch.js; it shares its state with the results
// further down the page), the real current Featured Gem card on the
// right-hand side (see components/FeaturedGemCard.js), at every screen
// size, and a full-width stats bar along the bottom (areas / categories /
// free, plus a tagline). the
// featured card used to swap between a hand-written decorative mockup on
// desktop and the real card on mobile, which meant desktop visitors never
// actually saw live Supabase data in the hero — now it's the same real
// card (or the genuine "Could this be your business?" placeholder, if none
// is set) everywhere.
import { useEffect, useRef } from "react";
import HeroBackground from "@/components/HeroBackground";
import FeaturedGemCard from "@/components/FeaturedGemCard";
import { DirectorySearchBar } from "@/components/DirectorySearch";
import { CATEGORIES } from "@/lib/constants";

export default function Hero({ featuredGem, areaCount }) {
  const ref = useRef(null); // points at the outer <section>, used to scope all of the animations below to just this component

  // the entrance sequence (headline lines, description, search bar,
  // featured card, stats, tagline sliding and fading in one after another)
  // is plain CSS — see the "hero entrance" block in globals.css. it used to
  // be a GSAP timeline, but GSAP is downloaded after the page is already on
  // screen, so the hero rendered fully, then blinked out and replayed once
  // GSAP arrived. CSS starts on the very first paint, and because it only
  // animates transform and opacity it runs on the GPU even while the page
  // is still busy hydrating.
  //
  // the two number stats (areas and categories) still count up from zero.
  // ("Free" is a word, so it's left alone.) the markup renders the real
  // numbers (right for search engines and without JavaScript); they're only
  // reset to 0 and counted up if the stats are still invisible when this
  // runs, so a slow hydration never makes a visible number jump back to 0.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const counters = [
      { selector: ".hc-towns", finalValue: areaCount },
      { selector: ".hc-cats",  finalValue: CATEGORIES.length },
    ]
      .map((counter) => ({ ...counter, element: ref.current?.querySelector(counter.selector) }))
      .filter(({ element }) => element && Number(getComputedStyle(element.closest(".h-stat")).opacity) < 0.1);

    if (counters.length === 0) return;

    for (const { element, finalValue } of counters) {
      // reserve the final number's width so the label beside it doesn't
      // shuffle sideways as the count goes from 1 digit to 2.
      element.style.minWidth = `${String(finalValue).length}ch`;
      element.textContent = "0";
    }

    const DURATION_MS = 2200;
    let frameId;
    let startTime;
    const tick = (now) => {
      startTime ??= now;
      const progress = Math.min((now - startTime) / DURATION_MS, 1);
      const eased = 1 - (1 - progress) ** 2; // ease-out
      for (const { element, finalValue } of counters) {
        element.textContent = String(Math.round(finalValue * eased));
      }
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      for (const { element, finalValue } of counters) element.textContent = String(finalValue);
    };
  }, [areaCount]);

  // the actual markup: the rotating photo background, then two columns —
  // the headline/description/search on the left, and the real Featured Gem
  // card on the right — then the full-width stats bar along the bottom.
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
          <h1 className="hero-h1">
            <span className="h-line-1">Find KwaZulu-Natal&apos;s</span>
            <span className="h-line-2">
              <span className="hero-shimmer-text">Hidden Gems</span>
            </span>
          </h1>

          <p className="h-sub">
            From home bakers and tutors to mechanics, transport operators, creatives and
            family-run businesses, we&apos;re making it easier for people to discover
            what&apos;s already around them and support local.
          </p>

          {/* typing here filters the directory results further down the
              page, see DirectorySearchProvider in app/page.js */}
          <div className="h-search">
            <DirectorySearchBar />
          </div>
        </div>

        {/* ── right: the real Featured Gem, at every screen size ── */}
        <div className="hero-featured-slot">
          <FeaturedGemCard gem={featuredGem} />
        </div>
      </div>

      {/* ── bottom: full-width stats bar (its hairline runs edge to edge)
          — three live stats on the left, a two-line tagline on the right ── */}
      <div className="hero-stats-bar">
        <div className="container hero-stats-inner">
          <ul className="h-stats">
            <li className="h-stat">
              <span className="h-stat-val hc-towns">{areaCount}</span>
              <span className="h-stat-label">areas to explore</span>
            </li>
            <li className="h-stat-sep" aria-hidden="true" />
            <li className="h-stat">
              <span className="h-stat-val hc-cats">{CATEGORIES.length}</span>
              <span className="h-stat-label">business categories</span>
            </li>
            <li className="h-stat-sep" aria-hidden="true" />
            <li className="h-stat">
              <span className="h-stat-val">Free</span>
              <span className="h-stat-label">for local businesses</span>
            </li>
          </ul>

          <p className="h-tagline">
            <span className="h-tagline-1">Local businesses.</span>
            <span className="h-tagline-2">A world of possibility.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
