"use client";

// the Overview page: four live stat cards, the pending review queue, this
// week's gem, and the most recent activity.

import { ListingsTable, sortForStatus } from "./ListingsView";
import { GemHero } from "./FeaturedView";
import { ActivityList, EmptyState, formatDate } from "./ui";

const OVERVIEW_QUEUE_LIMIT = 6;
const OVERVIEW_ACTIVITY_LIMIT = 5;

function StatCard({ label, value, hint, icon, onClick }) {
  return (
    <button type="button" className="adm-stat" onClick={onClick}>
      <span className="adm-stat-head">
        <span className="adm-stat-label">{label}</span>
        <span className="adm-stat-icon" aria-hidden="true"><i className={`fa-regular ${icon}`} /></span>
      </span>
      <span className="adm-stat-value">{value}</span>
      <span className="adm-stat-hint">{hint}</span>
    </button>
  );
}

export default function OverviewView({ counts, pending, currentFeatured, featBiz, featDescription, featuredStatus, events, onNavigate, onReview, onOpenActivity }) {
  const queue = sortForStatus(pending, "pending").slice(0, OVERVIEW_QUEUE_LIMIT);
  const gemIsLive = featBiz && featuredStatus.tone === "active";

  return (
    <>
      <div className="adm-stats">
        <StatCard
          label="Awaiting review"
          value={counts.pending}
          hint={counts.pending === 1 ? "Listing waiting for a decision" : "Listings waiting for a decision"}
          icon="fa-clock"
          onClick={() => onNavigate("listings", { status: "pending" })}
        />
        <StatCard
          label="Approved listings"
          value={counts.approved}
          hint="Live in the directory"
          icon="fa-circle-check"
          onClick={() => onNavigate("listings", { status: "approved" })}
        />
        <StatCard
          label="Edit requests"
          value={counts.edits}
          hint="Owner changes awaiting a decision"
          icon="fa-pen-to-square"
          onClick={() => onNavigate("edits")}
        />
        <StatCard
          label="Draft stories"
          value={counts.drafts}
          hint="Unpublished blog posts"
          icon="fa-file-lines"
          onClick={() => onNavigate("blog", { tab: "drafts" })}
        />
      </div>

      <div className="adm-grid adm-grid--overview">
        <div className="adm-col">
          <section className="adm-card adm-card--flush">
            <div className="adm-card-head adm-card-head--pad">
              <div>
                <h2 className="adm-card-title">Ready for a closer look</h2>
                <p className="adm-card-sub">Review the details before a business joins the directory.</p>
              </div>
              <span className="adm-pill adm-pill--pending adm-pill--lg">{counts.pending} pending</span>
            </div>
            {queue.length === 0 ? (
              <EmptyState icon="fa-mug-hot" title="You're all caught up.">
                No listings are waiting for review. New submissions will appear here.
              </EmptyState>
            ) : (
              <ListingsTable rows={queue} onReview={onReview} />
            )}
            <div className="adm-card-foot">
              <button type="button" className="adm-btn adm-btn--outline" onClick={() => onNavigate("listings", { status: "pending" })}>
                Open the review queue <span aria-hidden="true">→</span>
              </button>
              {pending.length > queue.length && (
                <span className="adm-muted">Showing the {queue.length} oldest of {pending.length}</span>
              )}
            </div>
          </section>

          <aside className="adm-tip">
            <i className="fa-regular fa-gem" aria-hidden="true" />
            <p>Getting an area right helps people find a business. You can correct it in the review drawer before approval.</p>
          </aside>
        </div>

        <div className="adm-col">
          <section className="adm-card">
            <div className="adm-card-head">
              <h2 className="adm-card-title">This week&apos;s gem</h2>
              <span className={`adm-pill adm-pill--${featuredStatus.tone}`}>{featuredStatus.label}</span>
            </div>
            {gemIsLive ? (
              <GemHero featBiz={featBiz} description={featDescription} expiry={featuredStatus.expiry} />
            ) : featBiz ? (
              <div className="adm-note adm-note--warn">
                <i className="fa-solid fa-hourglass-end" aria-hidden="true" />
                <span>
                  The last Featured Gem, <strong>{featBiz.name}</strong>, expired on {formatDate(currentFeatured.featured_until)}.
                  The homepage has no spotlight until a new one is chosen.
                </span>
              </div>
            ) : (
              <div className="adm-note">
                <i className="fa-solid fa-gem" aria-hidden="true" />
                <span>No Featured Gem has been set yet. Choose one so the homepage has a spotlight this week.</span>
              </div>
            )}
            <button type="button" className="adm-btn adm-btn--outline adm-mt" onClick={() => onNavigate("featured")}>
              {gemIsLive ? "Manage Featured Gem" : "Choose a Featured Gem"} <span aria-hidden="true">→</span>
            </button>
          </section>

          <section className="adm-card">
            <div className="adm-card-head">
              <h2 className="adm-card-title">Recent activity</h2>
              <button type="button" className="adm-link-btn" onClick={() => onNavigate("activity")}>View all</button>
            </div>
            {events.length === 0 ? (
              <EmptyState icon="fa-wave-square" title="No activity yet." />
            ) : (
              <ActivityList events={events.slice(0, OVERVIEW_ACTIVITY_LIMIT)} onOpen={onOpenActivity} />
            )}
          </section>
        </div>
      </div>
    </>
  );
}
