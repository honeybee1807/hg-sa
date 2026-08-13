// shows the current "Featured Gem" — a single business the admin (or the
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
  // no featured business set — show the "want to be featured?" placeholder.
  if (!gem?.businesses) {
    return (
      <div className="featured-gem-empty">
        <div className="featured-gem-badge">
          <i className="fa-solid fa-diamond" /> Featured Gem
        </div>
        <div className="featured-gem-body">
          <div className="featured-gem-logo">
            <div className="featured-gem-empty-icon-wrap">
              <i className="fa-solid fa-diamond featured-gem-empty-icon" />
            </div>
          </div>
          <div className="featured-gem-info">
            <h3 className="featured-gem-empty-heading">Want your business to be the next Featured Gem?</h3>
            <p className="featured-gem-desc">List your business today!</p>
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
  // some older records may store the area with extra text after it (like
  // "Estcourt, KwaZulu-Natal" instead of just "Estcourt") — only the part
  // before the first comma is the actual area name. same normalization
  // already used on the business detail page and directory cards.
  const areaName = biz.area?.split(",")[0]?.trim();

  return (
    <article className="featured-gem-card">
      <div className="featured-gem-badge">
        <i className="fa-solid fa-diamond" /> Featured Gem
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
          <p className="featured-gem-tags">
            <span className="featured-gem-tag">{biz.category}</span>
            {areaName && <span className="featured-gem-tag">{areaName}</span>}
          </p>
          {biz.description && (
            <p className="featured-gem-desc">{biz.description}</p>
          )}
          <div className="featured-gem-actions">
            <Link href={`/business/${biz.slug}`} className="featured-gem-view-link">
              View Profile <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
