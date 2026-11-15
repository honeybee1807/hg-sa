"use client";

// a reusable wrapper that makes whatever is inside it gently fade and slide
// upward into view the moment it scrolls onto the screen. used all over the
// site (category grid, area grid, FAQ, etc.) so that animation only needs
// to be built once here rather than repeated everywhere.
//
// on phones and small tablets (screens 767px wide or narrower) this
// animation is skipped entirely — scroll animations tend to feel janky on
// mobile and cost battery/performance for little visual benefit, so mobile
// visitors just see the content appear normally, already in place.

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// ScrollTrigger is a GSAP add-on that watches the page scroll position and
// fires an animation once a chosen element scrolls into view. it has to be
// registered with GSAP once, here, before it can be used below.
gsap.registerPlugin(ScrollTrigger);

// props:
//   children  — whatever content should be animated in
//   className — passed straight through to the wrapping <div>
//   stagger   — if true, animate each direct child one after another
//               (a staggered reveal) instead of animating the whole
//               block as one single piece
//   delay     — how many seconds to wait before the animation starts
export default function AnimatedSection({ children, className = "", stagger = false, delay = 0 }) {
  const ref = useRef(null); // points at the wrapping <div> below, once it has rendered

  useEffect(() => {
    const sectionElement = ref.current;
    if (!sectionElement) return;

    // skip the animation on mobile-sized screens (see the note above), and
    // for anyone whose device asks for reduced motion.
    const isMobileScreen = window.matchMedia("(max-width: 767px)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isMobileScreen || prefersReducedMotion) return;

    // gsap.context() records every tween and ScrollTrigger created inside
    // it, so the cleanup below can kill them all when this component
    // unmounts. without it, every page visit left its ScrollTriggers
    // behind, and they piled up, re-measuring the page on every scroll and
    // resize, which is what made scrolling get laggier the longer the site
    // was open.
    const animationContext = gsap.context(() => {
      // decide what exactly gets animated: either every direct child of
      // this wrapper one at a time (a "staggered" reveal), or the wrapper
      // itself as one single block.
      const thingsToAnimate = stagger
        ? Array.from(sectionElement.querySelectorAll(":scope > *"))
        : [sectionElement];
      if (thingsToAnimate.length === 0) return;

      // fade and slide up into place once the section scrolls 88% of the
      // way up the screen. only transform (y) and opacity are animated,
      // since the GPU can do both without repainting. "once: true" means
      // it plays the first time only. "clearProps" removes the leftover
      // inline transform once it's done, so finished sections (like the
      // big directory search) don't stay stuck as their own GPU layer.
      gsap.fromTo(
        thingsToAnimate,
        { y: 32, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.7,
          delay,
          stagger: stagger ? 0.08 : 0,
          ease: "power3.out",
          force3D: true,
          clearProps: "transform,opacity,visibility",
          scrollTrigger: { trigger: sectionElement, start: "top 88%", once: true },
        }
      );
    }, sectionElement);

    return () => animationContext.revert();
  }, [stagger, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
