// the share-preview images (the picture WhatsApp, Facebook and others show
// when a link is pasted), drawn with Next's built-in image generator. one
// layout for every page type, in the Hidden Gems SA colours.
//
// fonts: the generator's built-in sans-serif is used. the site's own fonts
// are hosted by next/font under generated names, so they can't be reused
// here without bundling the font files a second time.

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cloudinaryUrl } from "@/lib/images";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

let siteLogoPromise = null;
function siteLogo() {
  if (!siteLogoPromise) {
    siteLogoPromise = readFile(join(process.cwd(), "public", "HG_Logo.png"))
      .then((buf) => `data:image/png;base64,${buf.toString("base64")}`)
      .catch(() => null);
  }
  return siteLogoPromise;
}

// fetches a business logo as a PNG data URL, or null if it can't be loaded
// (in which case the initials are drawn instead).
async function businessLogo(url) {
  if (!url) return null;
  try {
    const res = await fetch(cloudinaryUrl(url, { format: "png", width: 320 }), { cache: "force-cache" });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!/png|jpe?g/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type.split(";")[0]};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function initials(name) {
  const words = (name ?? "").replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "HG";
  return (words.length === 1 ? words[0][0] : words[0][0] + words[1][0]).toUpperCase();
}

function fitTitle(title) {
  if (title.length > 60) return 54;
  if (title.length > 40) return 64;
  return 76;
}

// eyebrow: small label at the top ("Featured listing", "Category")
// title:   the big line
// subtitle: one line under it
// logoUrl / logoName: a business logo (or its initials) on the left
export async function renderOg({ eyebrow, title, subtitle, logoUrl, logoName }) {
  const [hgLogo, bizLogo] = await Promise.all([siteLogo(), logoName ? businessLogo(logoUrl) : null]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "linear-gradient(135deg, #082B66 0%, #0F52BA 55%, #9966CC 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", background: "#ffffff", borderRadius: 14, padding: "10px 18px" }}>
            {hgLogo ? (
              // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
              <img src={hgLogo} width={144} height={64} style={{ width: 144, height: 64 }} />
            ) : (
              <span style={{ fontSize: 32, fontWeight: 700, color: "#082B66" }}>Hidden Gems SA</span>
            )}
          </div>
          {eyebrow && (
            <div
              style={{
                display: "flex",
                fontSize: 26,
                padding: "10px 22px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              {eyebrow}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {logoName && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 200,
                height: 200,
                flexShrink: 0,
                borderRadius: 32,
                background: "#ffffff",
                overflow: "hidden",
              }}
            >
              {bizLogo ? (
                // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
                <img src={bizLogo} width={176} height={176} style={{ objectFit: "contain" }} />
              ) : (
                <span style={{ fontSize: 80, fontWeight: 700, color: "#0F52BA" }}>{initials(logoName)}</span>
              )}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: logoName ? 820 : 1060 }}>
            <div style={{ display: "flex", fontSize: fitTitle(title), fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
            {subtitle && (
              <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.86)", lineHeight: 1.3 }}>{subtitle}</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: "rgba(255,255,255,0.8)" }}>
          <span>Free local business directory</span>
          <span>hiddengemssa.co.za</span>
        </div>
      </div>
    ),
    OG_SIZE
  );
}
