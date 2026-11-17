// loads the GSAP animation library on demand, in its own file, instead of
// bundling it into the page's main JavaScript. the page becomes usable
// (hydrated) without waiting for it; the animations start a moment later.
// every caller shares the same single download.

let gsapPromise = null;

export function loadGsap() {
  if (!gsapPromise) gsapPromise = import("gsap").then((mod) => mod.gsap ?? mod.default);
  return gsapPromise;
}
