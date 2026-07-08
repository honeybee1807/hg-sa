"use client";

// a reusable wrapper that makes whatever is inside it gently fade and slide
// upward into view the moment it scrolls onto the screen. used all over the
// site (category grid, town grid, FAQ, etc.) so that animation only needs
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

    // skip the animation on mobile-sized screens — see the note above.
    const isMobileScreen = window.matchMedia("(max-width: 767px)").matches;
    if (isMobileScreen) return;

    // decide what exactly gets animated: either every direct child of this
    // wrapper one at a time (a "staggered" reveal), or the wrapper itself
    // as one single block.
    const thingsToAnimate = stagger
      ? Array.from(sectionElement.querySelectorAll(":scope > *"))
      : [sectionElement];
    if (thingsToAnimate.length === 0) return;

    // animate from a slightly lower, faded-out, slightly-shrunk starting
    // position up to its normal resting state, triggered the moment the
    // section scrolls to 88% of the way up the screen. "once: true" means
    // this only ever plays the first time — scrolling back up and down
    // again won't replay it.
    gsap.fromTo(
      thingsToAnimate,
      { y: 32, opacity: 0, scale: 0.97 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.7,
        delay,
        stagger: stagger ? 0.08 : 0,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionElement, start: "top 88%", once: true },
      }
    );
  }, [stagger, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
