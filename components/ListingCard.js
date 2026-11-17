// one business as a card, linking to its own page. used on the category,
// area, "category in area" and blog post pages, so they all look and
// behave the same. rendered on the server, so every card is a plain link
// search engines can follow without running any JavaScript.

import Link from "next/link";
import Image from "next/image";
import SocialLink from "@/components/SocialLink";
import BadgePills from "@/components/BadgePills";
import { areaName } from "@/lib/directory";
import { cloudinaryUrl, logoAlt } from "@/lib/images";

// "show" picks the second line under the name: the area (on a category
// page, where the category is already known) or the category (on an area
// page).
export default function ListingCard({ biz, show = "area" }) {
  const area = areaName(biz.area);
  return (
    <div className="listing-card">
      <Link href={`/business/${biz.slug}`} className="listing-card-link">
        <div className="listing-card-logo">
          {biz.logo_url ? (
            <Image
              src={cloudinaryUrl(biz.logo_url, { width: 160 })}
              alt={logoAlt(biz, area)}
              width={56}
              height={56}
              className="avatar"
            />
          ) : (
            <div className="avatar-monogram" aria-hidden="true">{biz.name[0].toUpperCase()}</div>
          )}
        </div>
        <div className="listing-card-body">
          <h3 className="listing-card-name">{biz.name}</h3>
          <p className="listing-card-meta">
            {show === "category" ? (
              <span><i className="fa-solid fa-tag" aria-hidden="true" /> {biz.category}</span>
            ) : (
              <span><i className="fa-solid fa-location-dot" aria-hidden="true" /> {area}, {biz.province}</span>
            )}
          </p>
          {biz.business_type && (
            <span className="business-type-badge">{biz.business_type}</span>
          )}
          <BadgePills biz={biz} />
          {biz.description && (
            <p className="listing-card-desc">{biz.description}</p>
          )}
        </div>
      </Link>
      <div className="listing-card-actions">
        <SocialLink platform="instagram" value={biz.instagram} className="social-icon-btn social-icon-btn--instagram social-icon-btn--sm" iconOnly />
        <SocialLink platform="facebook" value={biz.facebook} className="social-icon-btn social-icon-btn--facebook social-icon-btn--sm" iconOnly />
        <i className="fa-solid fa-chevron-right listing-card-arrow" aria-hidden="true" />
      </div>
    </div>
  );
}
