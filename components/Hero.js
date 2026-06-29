"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import GemBackground from "@/components/GemBackground";

function MockupCard() {
  return (
    <div className="hero-mockup">
      <div className="hero-mockup-glow" aria-hidden="true" />
      <div className="hero-mockup-card">
        <div className="hero-mc-gem-badge">
          <i className="fa-solid fa-gem" /> Featured Gem
        </div>
        <div className="hero-mc-header">
          <div className="hero-mc-avatar">YL</div>
          <div className="hero-mc-meta">
            <strong className="hero-mc-name">Y&amp;L Enterprises</strong>
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

export default function Hero() {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.1 });

      tl.fromTo(".h-eyebrow",
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

      // perpetual float on the mockup card
      gsap.to(".hero-mockup-card", {
        y: -14,
        duration: 3.8,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });

      // animated counters
      [
        { sel: ".hc-towns", end: 12, suffix: "" },
        { sel: ".hc-cats",  end: 10, suffix: "" },
        { sel: ".hc-free",  end: 100, suffix: "%" },
      ].forEach(({ sel, end, suffix }) => {
        const node = ref.current?.querySelector(sel);
        if (!node) return;
        const obj = { v: 0 };
        gsap.to(obj, {
          v: end,
          duration: 2.2,
          ease: "power2.out",
          delay: 1.0,
          onUpdate() { node.textContent = Math.round(obj.v) + suffix; },
        });
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <section className="hero" ref={ref}>
      <GemBackground />
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
            KwaZulu-Natal Business Directory
          </span>

          <h1 className="hero-h1">
            <span className="h-line-1">Find KZN&apos;s</span>
            <span className="h-line-2">
              <span className="hero-shimmer-text">Hidden Gems</span>
            </span>
          </h1>

          <p className="h-sub">
            Connect with KwaZulu-Natal&apos;s finest home bakers, tutors, transport operators,
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
              <span className="h-stat-label">KZN Towns</span>
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

        {/* ── right: mockup ── */}
        <MockupCard />
      </div>
    </section>
  );
}
