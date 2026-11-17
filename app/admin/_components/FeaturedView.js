"use client";

// "Featured Gem": choose the next gem (Auto-select, or pick an approved
// business), the current spotlight, and the spotlight history. it calls
// the existing autoSelectFeaturedGem and setFeaturedGem actions — the
// picking rules live only on the server and are not repeated here — and
// keeps the classic panel's Notify Owner and Download Graphic buttons.

import { useState } from "react";
import { BizLogo, EmptyState, InlineFeedback, formatFeaturedRange, formatDate } from "./ui";
import { buildWaMessage, downloadGraphic } from "./shareTools";

const PAGE_SIZE = 12;

export function GemHero({ featBiz, description, expiry, expired = false, label }) {
  return (
    <div className="adm-gem-hero">
      {label && <span className="adm-gem-hero-label">{label}</span>}
      <div className="adm-gem-hero-top">
        <BizLogo biz={featBiz} size={56} />
        <div className="adm-gem-hero-id">
          <span className="adm-gem-hero-name">{featBiz.name}</span>
          <span className="adm-gem-hero-sub">{[featBiz.area, featBiz.category].filter(Boolean).join(" · ")}</span>
        </div>
      </div>
      {description && <p className="adm-gem-hero-desc">{description}</p>}
      {expiry && (
        <p className={`adm-gem-hero-count ${expired ? "adm-gem-hero-count--expired" : ""}`}>
          <i className="fa-solid fa-clock" aria-hidden="true" /> {expiry}
        </p>
      )}
    </div>
  );
}

export default function FeaturedView({ businesses, currentFeatured, featuredHistory, featuredStatus, description, actions, notify, refresh, refreshing }) {
  const [query, setQuery]         = useState("");
  const [limit, setLimit]         = useState(PAGE_SIZE);
  const [confirming, setConfirming] = useState(null); // "auto" | business id
  const [working, setWorking]     = useState(null);
  const [feedback, setFeedback]   = useState(null);

  const featBiz = currentFeatured?.businesses ?? null;
  const currentId = featBiz?.id ?? null;

  // how often each business appears in the spotlights the admin loads
  // (the current gem plus the five before it) — no extra data is fetched.
  const recentGems = [currentFeatured, ...featuredHistory].filter(Boolean);
  const timesFeatured = new Map();
  for (const gem of recentGems) {
    const id = gem.businesses?.id;
    if (id) timesFeatured.set(id, (timesFeatured.get(id) ?? 0) + 1);
  }

  const q = query.trim().toLowerCase();
  const approved = businesses
    .filter((b) => b.status === "approved")
    .filter((b) => !q || b.name?.toLowerCase().includes(q) || b.area?.toLowerCase().includes(q))
    .sort((a, b) => (a.id === currentId ? -1 : b.id === currentId ? 1 : a.name.localeCompare(b.name)));
  const shown = approved.slice(0, limit);

  async function run(kind, fn, successText) {
    setWorking(kind);
    setFeedback(null);
    const result = await fn();
    setWorking(null);
    setConfirming(null);
    if (result.success) {
      setFeedback({ text: successText });
      notify(successText);
      refresh();
    } else {
      setFeedback({ text: result.error ?? "That didn't work. Please try again.", error: true });
    }
  }

  return (
    <div className="adm-grid adm-grid--featured">
      <section className="adm-card">
        <div className="adm-card-head">
          <div>
            <h2 className="adm-card-title">Choose the next Featured Gem</h2>
            <p className="adm-card-sub">Only approved listings can be selected.</p>
          </div>
        </div>

        <InlineFeedback feedback={feedback} />

        {confirming === "auto" ? (
          <div className="adm-confirm" role="alert">
            <p>
              Auto-select picks the next gem using the existing fairness rules (businesses that haven&apos;t been featured
              come first, and those with a logo are favoured). It replaces the current gem on the homepage for 7 days.
            </p>
            <div className="adm-btn-row">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirming(null)} disabled={working !== null}>Cancel</button>
              <button
                type="button"
                className="adm-btn adm-btn--primary"
                disabled={working !== null}
                onClick={() => run("auto", () => actions.autoSelectFeaturedGem(), "Featured gem updated successfully.")}
              >
                <i className={`fa-solid ${working === "auto" ? "fa-spinner fa-spin" : "fa-wand-magic-sparkles"}`} aria-hidden="true" />
                {working === "auto" ? " Selecting..." : " Yes, auto-select"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="adm-btn adm-btn--primary adm-btn--block"
            onClick={() => { setConfirming("auto"); setFeedback(null); }}
            disabled={working !== null || refreshing}
          >
            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Auto-select
          </button>
        )}

        <div className="adm-field adm-mt">
          <label htmlFor="adm-feat-search" className="adm-label">Or pick a business yourself</label>
          <div className="adm-search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input
              id="adm-feat-search"
              type="search"
              className="adm-input"
              placeholder="Search approved businesses or areas"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setLimit(PAGE_SIZE); }}
              autoComplete="off"
            />
          </div>
          <span className="adm-hint">&ldquo;Featured&rdquo; counts cover the {recentGems.length || "recent"} most recent spotlights.</span>
        </div>

        {approved.length === 0 ? (
          <EmptyState icon="fa-store" title={q ? "No approved businesses match." : "No approved businesses yet."} />
        ) : (
          <>
            <ul className="adm-pick-list">
              {shown.map((b) => {
                const n = timesFeatured.get(b.id) ?? 0;
                const isCurrent = b.id === currentId;
                return (
                  <li key={b.id} className="adm-pick">
                    <div className="adm-pick-row">
                      <BizLogo biz={b} size={40} />
                      <span className="adm-pick-text">
                        <strong>{b.name}</strong>
                        <span className="adm-muted">
                          {b.area} · {n === 0 ? "Not featured recently" : `Featured ${n === 1 ? "once" : `${n} times`} recently`}
                        </span>
                      </span>
                      {isCurrent ? (
                        <span className="adm-pill adm-pill--active">Current</span>
                      ) : (
                        <button
                          type="button"
                          className="adm-btn adm-btn--sm adm-btn--outline-sm"
                          onClick={() => { setConfirming(b.id); setFeedback(null); }}
                          disabled={working !== null}
                          aria-label={`Select ${b.name} as the Featured Gem`}
                        >
                          Select <span aria-hidden="true">↗</span>
                        </button>
                      )}
                    </div>
                    {confirming === b.id && (
                      <div className="adm-confirm" role="alert">
                        <p>Feature <strong>{b.name}</strong> for the next 7 days? This replaces the current gem on the homepage.</p>
                        <div className="adm-btn-row">
                          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirming(null)} disabled={working !== null}>Cancel</button>
                          <button
                            type="button"
                            className="adm-btn adm-btn--primary"
                            disabled={working !== null}
                            onClick={() => run(b.id, () => actions.setFeaturedGem(b.id), `${b.name} is now the Featured Gem.`)}
                          >
                            {working === b.id ? "Setting..." : "Yes, feature it"}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {approved.length > shown.length && (
              <button type="button" className="adm-btn adm-btn--ghost adm-btn--block adm-mt" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                Show more ({approved.length - shown.length} more)
              </button>
            )}
          </>
        )}
      </section>

      <div className="adm-col">
        <section className="adm-card">
          <div className="adm-card-head">
            <h2 className="adm-card-title">Current spotlight</h2>
            <span className={`adm-pill adm-pill--${featuredStatus.tone}`}>
              {refreshing ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Updating</> : featuredStatus.label}
            </span>
          </div>
          {featBiz ? (
            <>
              <GemHero
                featBiz={featBiz}
                description={description}
                expiry={featuredStatus.expiry}
                expired={featuredStatus.tone === "expired"}
                label="Gem of the week"
              />
              <div className="adm-btn-row adm-btn-row--wrap adm-mt">
                {featBiz.whatsapp && (
                  <a href={buildWaMessage(featBiz)} target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn--whatsapp">
                    <i className="fa-brands fa-whatsapp" aria-hidden="true" /> Notify Owner
                  </a>
                )}
                <button type="button" className="adm-btn adm-btn--secondary" onClick={() => downloadGraphic(featBiz)}>
                  <i className="fa-solid fa-download" aria-hidden="true" /> Download Graphic
                </button>
                {featBiz.slug && (
                  <a href={`/business/${featBiz.slug}`} target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn--ghost">
                    <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> View listing
                  </a>
                )}
              </div>
            </>
          ) : (
            <EmptyState icon="fa-gem" title="No business is featured yet.">
              Use Auto-select or pick an approved business to start the spotlight.
            </EmptyState>
          )}
        </section>

        <section className="adm-card">
          <div className="adm-card-head">
            <h2 className="adm-card-title">Spotlight history</h2>
          </div>
          {recentGems.length === 0 ? (
            <EmptyState icon="fa-clock-rotate-left" title="No featured gem history yet." />
          ) : (
            <ol className="adm-timeline">
              {recentGems.map((gem, i) => (
                <li key={gem.id} className={`adm-timeline-item ${i === 0 ? "is-current" : ""}`}>
                  <span className="adm-timeline-dot" aria-hidden="true" />
                  <span className="adm-timeline-name">{gem.businesses?.name ?? "Deleted business"}</span>
                  <span className="adm-timeline-range">
                    {i === 0
                      ? `${formatDate(gem.created_at)} – ${featuredStatus.tone === "active" ? `now (until ${formatDate(gem.featured_until)})` : formatDate(gem.featured_until)}`
                      : formatFeaturedRange(gem.created_at, gem.featured_until, gem.replaced_at)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
