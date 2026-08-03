// the little coloured "Halal" / "Delivery" / "Call-Outs" pills shown on
// business cards, the business detail page, and the admin review card —
// one shared component so all three places always render (and restyle)
// identically, the same way SocialLink.js is shared across every place an
// Instagram/Facebook link is shown.

const BADGES = [
  { key: "halal",     label: "Halal",     icon: "fa-solid fa-moon" },
  { key: "delivery",  label: "Delivery",  icon: "fa-solid fa-box" },
  { key: "callouts",  label: "Call-Outs", icon: "fa-solid fa-location-arrow" },
];

// "size" is either "sm" (the default, used on cards) or "lg" (used on the
// business detail page, per Part D's "roughly 1.2x card size").
export default function BadgePills({ biz, size = "sm" }) {
  const active = BADGES.filter((badge) => {
    if (badge.key === "halal") return !!biz.halal;
    if (badge.key === "delivery") return !!biz.delivery_available;
    if (badge.key === "callouts") return !!biz.callouts_available;
    return false;
  });

  if (active.length === 0) return null;

  return (
    <div className={`badge-pills ${size === "lg" ? "badge-pills--lg" : ""}`}>
      {active.map((badge) => (
        <span key={badge.key} className={`badge-pill badge-pill--${badge.key}`}>
          <i className={badge.icon} aria-hidden="true" /> {badge.label}
        </span>
      ))}
    </div>
  );
}
