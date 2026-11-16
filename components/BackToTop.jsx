"use client";

// the footer's "Back to top ↑" link. its own tiny client component so the
// rest of the footer (components/Footer.js) can stay a plain server
// component. it's a real link to "#top" underneath, so it still works with
// JavaScript off; with JavaScript, it smooth-scrolls instead (or jumps, for
// anyone whose device asks for reduced motion).

export default function BackToTop({ className }) {
  function handleClick(event) {
    event.preventDefault();
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  return (
    <a href="#top" className={className} onClick={handleClick}>
      Back to top <span aria-hidden="true">↑</span>
    </a>
  );
}
