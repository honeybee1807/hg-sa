"use client";

// the rotating photo background shown behind the hero section's headline,
// stats, and mockup card. these photos crossfade into one another with a
// slow "Ken Burns" zoom, and sit behind everything else already in the
// hero — the dot grid and every piece of real content keep rendering on
// top of it exactly as before.
//
// the first photo is this page's LCP element, so it's rendered with
// next/image's `priority` (eager load, resized/re-encoded, and preloaded
// via a <link> the browser can see before it even parses the render-
// blocking stylesheets) — the other three are the default lazy behavior,
// since they only need to be ready by the time their turn comes around in
// the rotation.
//
// if a photo fails to load, its slot just shows the overlay (and the
// hero's own gradient behind it) for its turn instead of a broken-image
// icon. if every photo fails (e.g. the folder is empty), this component
// quietly renders nothing and the hero falls back to its existing plain
// CSS gradient background. there's no layout shift either way, since this
// whole component is one absolutely-positioned layer that never affects
// the size of the hero section around it.

import { useEffect, useState } from "react";
import Image from "next/image";

const IMAGE_PATHS = [
  "/hero-images/hero-1.jpg",
  "/hero-images/hero-2.jpg",
  "/hero-images/hero-3.jpg",
  "/hero-images/hero-4.jpg",
];

const CYCLE_MS = 8000; // how long each image stays on screen before the next one crossfades in

export default function HeroBackground() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedIndexes, setFailedIndexes] = useState(() => new Set());

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
  if (failedIndexes.size === IMAGE_PATHS.length) return null;

  return (
    <div className="hero-photo-bg" aria-hidden="true">
      {IMAGE_PATHS.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          sizes="100vw"
          priority={index === 0}
          fetchPriority={index === 0 ? "high" : undefined}
          loading={index === 0 ? undefined : "lazy"}
          className={`hero-photo-bg-image${index === activeIndex ? " is-active" : ""}`}
          onError={() =>
            setFailedIndexes((current) => new Set(current).add(index))
          }
        />
      ))}
      <div className="hero-photo-overlay" />
    </div>
  );
}
