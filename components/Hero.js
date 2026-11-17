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
import { loadGsap } from "@/lib/loadGsap";

// start downloading GSAP as soon as this file runs in the browser, in
// parallel with hydration rather than as part of it.
if (typeof window !== "undefined") loadGsap();
import HeroBackground from "@/components/HeroBackground";
import FeaturedGemCard from "@/components/FeaturedGemCard";
import { DirectorySearchBar } from "@/components/DirectorySearch";
import { CATEGORIES } from "@/lib/constants";

export default function Hero({ featuredGem, areaCount }) {
  const ref = useRef(null); // points at the outer <section>, used to scope all of the animations below to just this component

  useEffect(() => {
    // for visitors whose device asks for reduced motion, skip the entrance
    // sequence entirely. the stat numbers are already rendered with their
    // real values in the markup below, so there's nothing to fill in.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // if the browser freezes for 100ms or more (busy loading the rest of
    // the page), carry on from where the animation was instead of skipping
    // ahead to "catch up" — the skip is what reads as a stutter. GSAP's own
    // default only steps in for freezes over 500ms. applies to every GSAP
    // animation on the page.
    let cancelled = false;
    let entranceTimeline;
    let animationContext = null;
    let idleHandle, timeoutHandle;

    loadGsap().then((gsap) => {
      if (cancelled) return;
      gsap.ticker.lagSmoothing(100, 16);

      animationContext = gsap.context(() => {
        // the entrance sequence: each piece of the hero fades and slides in
        // one after another, in this order — first headline
        // line, second headline line, subheading paragraph, the search bar,
        // the featured gem card, then the stats bar along the bottom (the
        // three stats, then the tagline). the negative
        // "-=0.x" timings make each step start slightly before the previous
        // one finishes, so it reads as one flowing motion rather than a
        // series of separate, disconnected pops.
        // created paused: every element is put in its hidden starting state
        // straight away, but the timeline only plays once the page has
        // finished its heaviest start-up work (see the end of this effect).
        entranceTimeline = gsap.timeline({ paused: true });

        entranceTimeline
          .fromTo(".h-line-1",
            { y: 64, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" })
          .fromTo(".h-line-2",
            { y: 64, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, "-=0.52")
          .fromTo(".h-sub",
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, "-=0.4")
          // the search bar takes the place the two buttons used to have in
          // the sequence. "clearProps" removes the leftover transform once
          // it's done, so the filter dropdown inside it isn't positioned
          // relative to a lingering transformed layer.
          .fromTo(".h-search",
            { y: 16, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", clearProps: "transform" }, "-=0.35")
          // no scale here: scaling the card makes the browser re-rasterise
          // its text and logo every frame. a slide plus fade looks almost the
          // same and runs entirely on the GPU.
          .fromTo(".hero-featured-slot",
            { x: 56, opacity: 0 },
            { x: 0, opacity: 1, duration: 1.1, ease: "expo.out", force3D: true, clearProps: "transform" }, "-=0.7")
          .fromTo(".h-stat",
            { y: 12, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.09, duration: 0.45, ease: "power3.out" }, "-=0.4")
          .fromTo(".h-tagline",
            { y: 12, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, "-=0.25");

        // the two number stats (areas and categories) count up from zero
        // once the hero loads, rather than just appearing as static text.
        // ("Free" is a word, not a number, so it's left as it is.) the
        // categories total comes straight from lib/constants.js so it can
        // never drift out of sync; the areas total is passed in as a prop
        // (see app/page.js) since areas are no longer a fixed list — it's
        // however many distinct areas currently have an approved business.
        const counters = [
          { selector: ".hc-towns", finalValue: areaCount },
          { selector: ".hc-cats",  finalValue: CATEGORIES.length },
        ];

        for (const counter of counters) {
          const counterElement = ref.current?.querySelector(counter.selector);
          if (!counterElement) continue;

          // the markup renders the real number (so it's right for search
          // engines and if JavaScript never loads); it's reset to 0 here,
          // while the stats are still hidden by the entrance timeline
          // above, and then counted back up.
          counterElement.textContent = "0";

          // gsap can't directly "animate" a piece of text, so instead a
          // plain number is animated from 0 up to the target value, and on
          // every tick of that animation the on-screen text is updated to
          // show the current rounded number.
          // added to the same timeline (starting 1s in), so the count-up
          // waits for the timeline to start too.
          const animatedNumber = { currentValue: 0 };
          entranceTimeline.to(animatedNumber, {
            currentValue: counter.finalValue,
            duration: 2.2,
            ease: "power2.out",
            onUpdate() {
              counterElement.textContent = String(Math.round(animatedNumber.currentValue));
            },
          }, 1.0);
        }
      }, ref);

      // start the entrance once the browser is idle — i.e. after the burst of
      // work right after the page loads (hydrating the directory, decoding
      // images, swapping in fonts), which is what made it stutter — but never
      // later than 600ms. browsers without requestIdleCallback (Safari) wait a
      // short fixed moment instead.
      const play = () => entranceTimeline?.play();
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(play, { timeout: 600 });
      } else {
        timeoutHandle = window.setTimeout(play, 250);
      }
    });

    return () => {
      cancelled = true;
      if (idleHandle) window.cancelIdleCallback(idleHandle);
      if (timeoutHandle) window.clearTimeout(timeoutHandle);
      animationContext?.revert();
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
