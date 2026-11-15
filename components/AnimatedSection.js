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
//
// "is it on screen yet?" is answered by the browser's own
// IntersectionObserver rather than GSAP's ScrollTrigger. ScrollTrigger
// measures each section's position once, up front — but the homepage keeps
// changing height after that (the directory switching to a saved view,
// images and fonts loading in), so those measurements went stale and a
// section could sit on screen still invisible, waiting for a scroll
// position it had already passed. IntersectionObserver always uses the
// element's real, current position, so that can't happen.

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

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

    // decide what exactly gets animated: either every direct child of this
    // wrapper one at a time (a "staggered" reveal), or the wrapper itself
    // as one single block.
    const thingsToAnimate = stagger
      ? Array.from(sectionElement.querySelectorAll(":scope > *"))
      : [sectionElement];
    if (thingsToAnimate.length === 0) return;

    // gsap.context() records every tween created inside it, so the cleanup
    // below can undo them all when this component unmounts.
    const animationContext = gsap.context(() => {});

    // hide everything up front (only once JavaScript is running — the
    // server-rendered page is fully visible, so nothing is ever lost if
    // this script fails to load).
    animationContext.add(() => {
      gsap.set(thingsToAnimate, { y: 32, autoAlpha: 0 });
    });

    // reveal once the section's top edge is 12% of the screen height above
    // the bottom of the screen — the same "top 88%" point as before.
    // fires straight away if the section is already on screen.
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect(); // only ever plays once

        animationContext.add(() => {
          // only transform (y) and opacity are animated, since the GPU can
          // do both without repainting. "clearProps" removes the leftover
          // inline styles once it's done, so finished sections (like the
          // big directory search) don't stay stuck as their own GPU layer.
          gsap.to(thingsToAnimate, {
            y: 0,
            autoAlpha: 1,
            duration: 0.7,
            delay,
            stagger: stagger ? 0.08 : 0,
            ease: "power3.out",
            force3D: true,
            clearProps: "transform,opacity,visibility",
          });
        });
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    observer.observe(sectionElement);

    return () => {
      observer.disconnect();
      animationContext.revert();
    };
  }, [stagger, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
