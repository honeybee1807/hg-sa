// a light list of plain text links with optional counts, e.g. the
// "Popular categories" and "Browse by area" blocks on the homepage and the
// related links on category and area pages. no images, no animation:
// just links that are cheap to load and easy for search engines to follow.

import Link from "next/link";

// links: [{ href, label, count? }]
export default function LinkList({ title, links, headingLevel = 2, className = "" }) {
  if (links.length === 0) return null;
  const Heading = `h${headingLevel}`;
  return (
    <div className={`link-list ${className}`}>
      {title && <Heading className="link-list-title">{title}</Heading>}
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            {/* no prefetching: these lists can hold dozens of links, and
                fetching every one in the background slows the page down
                and uses mobile data. they still load quickly on tap. */}
            <Link href={link.href} prefetch={false}>
              {link.label}
              {typeof link.count === "number" && <span className="link-list-count">{link.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
