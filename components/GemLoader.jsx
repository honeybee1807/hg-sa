"use client";

import { useEffect, useState } from "react";

const PHRASES = [
  "Uncovering local gems...",
  "Finding the businesses your neighbours trust...",
  "Digging through KwaZulu-Natal...",
  "Every gem was hidden once...",
  "Your community's best, coming right up...",
  "Almost there — good things take a moment...",
];

export default function GemLoader({ variant = "light" }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % PHRASES.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`gem-loader gem-loader--${variant}`} role="status" aria-live="polite">
      <svg className="gem-loader-svg" viewBox="0 0 170 190" aria-hidden="true" focusable="false">
        <ellipse className="gem-loader-shadow" cx="80" cy="179" rx="32" ry="6" />

        {/* legs */}
        <rect className="gem-loader-limb" x="61" y="128" width="13" height="36" rx="6.5" />
        <rect className="gem-loader-limb" x="86" y="128" width="13" height="36" rx="6.5" />

        {/* torso */}
        <rect className="gem-loader-torso" x="54" y="60" width="52" height="72" rx="26" />

        {/* resting arm */}
        <rect className="gem-loader-limb" x="38" y="72" width="14" height="44" rx="7" transform="rotate(14 45 72)" />

        {/* head */}
        <circle className="gem-loader-torso" cx="80" cy="38" r="18" />

        {/* swinging arm + pickaxe, pivoting at the shoulder (104,74) */}
        <g className="gem-loader-arm">
          <rect className="gem-loader-limb" x="97" y="74" width="14" height="42" rx="7" />
          <rect className="gem-loader-handle" x="100.5" y="60" width="7" height="58" rx="3.5" />
          <path className="gem-loader-pickhead" d="M76 54 L104 42 L132 54 L104 63 Z" />
        </g>

        {/* impact sparks — land where the pick reaches at full swing.
            each particle is a static-position wrapper <g> around the
            animated <path>, since an SVG transform attribute and a CSS
            transform animation on the same element don't compose —
            the CSS one would simply replace the attribute outright. */}
        <g className="gem-loader-particles">
          <g transform="translate(140 60)">
            <path className="gem-loader-particle gem-loader-particle--1" d="M0 -6 L5 0 L0 6 L-5 0 Z" />
          </g>
          <g transform="translate(148 72)">
            <path className="gem-loader-particle gem-loader-particle--2" d="M0 -5 L4.5 0 L0 5 L-4.5 0 Z" />
          </g>
          <g transform="translate(132 78)">
            <path className="gem-loader-particle gem-loader-particle--3" d="M0 -4.5 L4 0 L0 4.5 L-4 0 Z" />
          </g>
          <g transform="translate(144 46)">
            <path className="gem-loader-particle gem-loader-particle--4" d="M0 -5 L4.5 0 L0 5 L-4.5 0 Z" />
          </g>
        </g>
      </svg>

      <p className="gem-loader-text" key={index}>{PHRASES[index]}</p>
    </div>
  );
}
