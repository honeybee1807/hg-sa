// adds Cloudinary delivery settings to a stored image URL when it's shown,
// so the browser (or the Next.js image optimiser) downloads a right-sized,
// modern-format file instead of the full original upload. the stored URL
// in the database is never changed; this only affects what is requested.
//
//   cloudinaryUrl("https://res.cloudinary.com/x/image/upload/v1/logo.png", { width: 240 })
//   -> "https://res.cloudinary.com/x/image/upload/f_auto,q_auto,c_limit,w_240/v1/logo.png"
//
// anything that isn't a Cloudinary upload URL is returned unchanged.

export function cloudinaryUrl(url, { width, format = "auto", extra = "" } = {}) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  const parts = [`f_${format}`, "q_auto"];
  if (width) parts.push("c_limit", `w_${width}`);
  if (extra) parts.push(extra);
  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
}

// the alt text for a business logo, e.g.
// "Thandi's Bakes logo, Baking & Catering in Estcourt".
export function logoAlt(biz, area) {
  return `${biz.name} logo, ${biz.category} in ${area}`;
}
