// shows the current "Gem of the Week" — a single business the admin (or the
// automatic Monday draw, see app/admin/actions.js) has chosen to spotlight.
// "gem" is the row from the featured_gem table, joined with the actual
// business it points to (gem.businesses).
//
// if there's no featured business yet (e.g. the very first week, before
// anything has ever been chosen), a placeholder card is shown instead,
// inviting visitors to submit their own business for a future feature.

import Link from "next/link";
import Image from "next/image";

export default function FeaturedGemCard({ gem }) {
  // no featured business set — show the "could this be you?" placeholder.
  if (!gem?.businesses) {
    return (
      <div className="featured-gem-empty">
        <div className="featured-gem-badge">
          <i className="fa-solid fa-gem" /> Gem of the Week
        </div>
        <div className="featured-gem-body">
          <div className="featured-gem-logo">
            <div className="featured-gem-empty-icon-wrap">
              <i className="fa-solid fa-gem featured-gem-empty-icon" />
            </div>
          </div>
          <div className="featured-gem-info">
            <h3 className="featured-gem-empty-heading">Could this be your business?</h3>
            <p className="featured-gem-desc">
              Every Monday we spotlight an outstanding South African business — completely free.
              Submit your listing and you could be featured next.
            </p>
            <Link href="/submit" className="btn-primary featured-gem-cta">
              <i className="fa-solid fa-plus" /> List Your Business Free
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const biz = gem.businesses;
  const initial = biz.name?.[0]?.toUpperCase() ?? "?";

  return (
    <article className="featured-gem-card">
      <div className="featured-gem-badge">
        <i className="fa-solid fa-gem" /> Gem of the Week
      </div>

      <div className="featured-gem-body">
        <div className="featured-gem-logo">
          {biz.logo_url ? (
            <Image
              src={biz.logo_url}
              alt={`${biz.name} logo`}
              width={96}
              height={96}
              className="featured-gem-img"
            />
          ) : (
            <div className="avatar-monogram avatar-monogram--lg">{initial}</div>
          )}
        </div>

        <div className="featured-gem-info">
          <h3>{biz.name}</h3>
          <p className="featured-gem-meta">
            <span><i className="fa-solid fa-tag" /> {biz.category}</span>
            <span><i className="fa-solid fa-location-dot" /> {biz.town}, KZN</span>
          </p>
          {biz.description && (
            <p className="featured-gem-desc">{biz.description}</p>
          )}
          <Link href={`/business/${biz.slug}`} className="btn-primary featured-gem-cta">
            <i className="fa-solid fa-store" /> View Profile
          </Link>
        </div>
      </div>
    </article>
  );
}
