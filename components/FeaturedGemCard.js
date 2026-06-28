import Link from "next/link";
import Image from "next/image";

export default function FeaturedGemCard({ gem }) {
  if (!gem?.businesses) {
    return (
      <div className="featured-gem-empty">
        <i className="fa-solid fa-gem" />
        <p>This week&apos;s featured gem is coming soon — check back on Monday!</p>
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
