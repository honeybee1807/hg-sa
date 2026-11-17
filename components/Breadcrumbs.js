// the "Home > Category > Business" trail at the top of a page. the same
// list of items is passed to breadcrumbList() in lib/seo.js for the page's
// structured data, so what Google reads always matches what's on screen.
// the last item is the current page and isn't a link.

import { Fragment } from "react";
import Link from "next/link";

export default function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <Fragment key={item.path}>
          {i > 0 && <i className="fa-solid fa-chevron-right" aria-hidden="true" />}
          {i < items.length - 1 ? (
            <Link href={item.path}>{item.name}</Link>
          ) : (
            <span aria-current="page">{item.name}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
