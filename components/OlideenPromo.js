"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { OLIDEEN_URL } from "@/lib/constants";

gsap.registerPlugin(ScrollTrigger);

export default function OlideenPromo() {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
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
    return () => ctx.revert();
  }, []);

  return (
    <section className="olideen-promo" ref={ref}>
      <div className="promo-shimmer" aria-hidden="true" />
      <div className="container promo-content">
        <span className="promo-animate promo-tag">
          <i className="fa-solid fa-building-columns" /> Olideen Technologies
        </span>
        <h2 className="promo-animate promo-heading">
          Connecting KwaZulu-Natal,<br />One Business at a Time
        </h2>
        <p className="promo-animate promo-sub">
          We build digital tools that put overlooked local businesses on the map —
          from Estcourt to Pietermaritzburg.
        </p>
        <a
          href={OLIDEEN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="promo-animate btn-primary promo-cta"
        >
          <i className="fa-solid fa-arrow-up-right-from-square" />
          Visit Olideen Technologies
        </a>
      </div>
    </section>
  );
}
