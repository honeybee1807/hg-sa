"use client";

// the rotating photo background shown behind the hero section's headline,
// stats, and mockup card. these photos crossfade into one another with a
// slow "Ken Burns" zoom, and sit behind everything else already in the
// hero — the dot grid and every piece of real content keep rendering on
// top of it exactly as before.
//
// if none of the images can be loaded (e.g. the folder is empty), this
// component quietly renders nothing, and the hero falls back to its
// existing plain CSS gradient background (already defined on the .hero
// section itself). there's no error message either way, and no layout
// shift, since this whole component is one absolutely-positioned layer
// that never affects the size of the hero section around it.

import { useEffect, useState } from "react";

const IMAGE_PATHS = [
  "/hero-images/hero-1.jpg",
  "/hero-images/hero-2.jpg",
  "/hero-images/hero-3.jpg",
  "/hero-images/hero-4.jpg",
  "/hero-images/hero-5.jpg",
  "/hero-images/hero-6.jpg",
  "/hero-images/hero-7.jpg",
];

const CYCLE_MS = 8000; // how long each image stays on screen before the next one crossfades in

export default function HeroBackground() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedCount, setFailedCount] = useState(0); // how many images have failed to load

  // preload every image once, purely to find out whether the whole set is
  // missing. individual failures don't need any special handling beyond
  // this count — a CSS background-image that fails to load simply paints
  // nothing, so a single missing photo just shows the overlay (and the
  // hero's own gradient behind it) for its turn instead of a broken-image
  // icon. only if every single one fails does this component hide itself.
  useEffect(() => {
    let cancelled = false;

    for (const src of IMAGE_PATHS) {
      const preloadImage = new Image();
      preloadImage.onerror = () => {
        if (!cancelled) setFailedCount((count) => count + 1);
      };
      preloadImage.src = src;
    }

    return () => { cancelled = true; };
  }, []);

  // advance to the next image every CYCLE_MS, looping back to the first
  // once the last one has shown.
  useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveIndex((current) => (current + 1) % IMAGE_PATHS.length);
    }, CYCLE_MS);
    return () => clearInterval(intervalId);
  }, []);

  // every image failed (e.g. public/hero-images is empty or missing) —
  // render nothing, so the hero silently falls back to its existing CSS
  // gradient background.
  if (failedCount === IMAGE_PATHS.length) return null;

  return (
    <div className="hero-photo-bg" aria-hidden="true">
      {IMAGE_PATHS.map((src, index) => (
        <div
          key={src}
          className={`hero-photo-bg-image${index === activeIndex ? " is-active" : ""}`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
      <div className="hero-photo-overlay" />
    </div>
  );
}
