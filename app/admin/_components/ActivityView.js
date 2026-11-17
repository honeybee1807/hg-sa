"use client";

// the full activity feed — same rules as the Overview's short version:
// built only from timestamps already in the fetched data, newest first.

import { useState } from "react";
import { ActivityList, EmptyState } from "./ui";

const PAGE_SIZE = 15;

export default function ActivityView({ events, onOpen }) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const shown = events.slice(0, limit);

  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <div>
          <h2 className="adm-card-title">Workspace activity</h2>
          <p className="adm-card-sub">
            Listings submitted, edit requests, Featured Gem changes and stories. Approvals and rejections aren&apos;t dated, so they don&apos;t appear here.
          </p>
        </div>
      </div>
      {events.length === 0 ? (
        <EmptyState icon="fa-wave-square" title="No activity yet." />
      ) : (
        <>
          <ActivityList events={shown} onOpen={onOpen} />
          {events.length > shown.length && (
            <button type="button" className="adm-btn adm-btn--ghost adm-btn--block adm-mt" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              Load more
            </button>
          )}
        </>
      )}
    </section>
  );
}
