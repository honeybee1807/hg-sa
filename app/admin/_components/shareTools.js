// the admin's WhatsApp-link builders and canvas graphics, shared by every
// screen of the redesigned admin. copied as-is from app/admin/AdminPanel.js
// (the classic panel, which keeps its own copy untouched until it's
// removed) — same messages, same drawing, same mobile share-sheet fallback.
// browser-only: the graphic functions use document/canvas/navigator.

import { SITE_URL, OLIDEEN_URL } from "@/lib/constants";

// turns a WhatsApp number typed in any common format (e.g. starting with
// 0, or already starting with the 27 country code) into the one format
// WhatsApp's own links need: digits only, starting with 27.
export function formatWa(raw) {
  if (!raw) return null;
  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly.startsWith("27")) return digitsOnly;
  if (digitsOnly.startsWith("0")) return "27" + digitsOnly.slice(1);
  return "27" + digitsOnly;
}

// the "Contact on WhatsApp" link + pre-written message, so the admin can
// message the owner to verify details before approving.
export function buildContactUrl(biz) {
  const whatsappNumber = formatWa(biz.whatsapp);
  if (!whatsappNumber) return null;

  const message = `Hi ${biz.owner_name ?? "there"}! This is the *Hidden Gems SA* team 👋\n\nWe received your listing for *${biz.name}* and need to verify a few details before we can approve it.\n\nIs now a good time to chat?\n\n— Hidden Gems SA Team`;

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

// the Featured Gem "Notify Owner" link + congratulations message. like the
// classic panel, this one uses the stored number as-is (no formatWa()).
export function buildWaMessage(biz) {
  const message = `Congratulations ${biz.owner_name ?? ""}! 🎉\n\nYour business *${biz.name}* has been selected as Hidden Gems SA's *Featured Gem of the Week*!\n\nYour listing is live at:\n${SITE_URL}/business/${biz.slug}\n\n— Hidden Gems SA Team\n🌐 ${SITE_URL}\n💻 Built by Olideen Technologies — ${OLIDEEN_URL}`;
  return `https://wa.me/${biz.whatsapp}?text=${encodeURIComponent(message)}`;
}

// the approved-listing "Notify Owner" link + "you're live" message.
export function buildNotifyOwnerUrl(biz) {
  const whatsappNumber = formatWa(biz.whatsapp);
  if (!whatsappNumber) return null;

  const message = `🎉 You're live on Hidden Gems SA!\n\nHi ${biz.owner_name ?? "there"}, great news *${biz.name}* has been approved and is now visible to customers searching in ${biz.area}, ${biz.province}.\n\nYour listing: ${SITE_URL}/business/${biz.slug}\n\nHelp more customers find you by sharing your listing on your WhatsApp Status, Facebook or Instagram page! We've attached a graphic you can post directly.\n\nHidden Gems SA Team\n🌐 ${SITE_URL}\n💻 Built by Olideen Technologies ${OLIDEEN_URL}`;

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

// the downloadable 1080x1080 "Featured Gem of the Week" announcement image,
// drawn on a canvas and saved as a PNG.
export function downloadGraphic(biz) {
  const canvas  = document.createElement("canvas");
  canvas.width  = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");

  function draw(logoImg) {
    const backgroundGradient = ctx.createLinearGradient(0, 0, 1080, 1080);
    backgroundGradient.addColorStop(0, "#082B66");
    backgroundGradient.addColorStop(0.55, "#0F52BA");
    backgroundGradient.addColorStop(1, "#0B3D8C");
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, 1080, 1080);

    const topStripeGradient = ctx.createLinearGradient(0, 0, 1080, 0);
    topStripeGradient.addColorStop(0, "#9966CC");
    topStripeGradient.addColorStop(1, "#0F52BA");
    ctx.fillStyle = topStripeGradient;
    ctx.fillRect(0, 0, 1080, 12);

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.roundRect(390, 90, 300, 48, 24);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "600 20px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✦ FEATURED GEM OF THE WEEK ✦", 540, 121);

    const logoCenterY = 220, logoRadius = 120;
    ctx.save();
    ctx.beginPath();
    ctx.arc(540, logoCenterY + logoRadius, logoRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#E7EFFA";
    ctx.fill();

    if (logoImg) {
      ctx.clip();
      ctx.drawImage(logoImg, 540 - logoRadius, logoCenterY, logoRadius * 2, logoRadius * 2);
    } else {
      ctx.clip();
      ctx.fillStyle = "#0F52BA";
      ctx.font = `italic bold 110px Georgia, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(biz.name[0].toUpperCase(), 540, logoCenterY + logoRadius);
    }
    ctx.restore();
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 68px Georgia, serif`;
    ctx.textAlign = "center";
    const nameY = logoCenterY + logoRadius * 2 + 80;
    ctx.fillText(biz.name, 540, nameY);

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "36px Arial, sans-serif";
    ctx.fillText(`${biz.category}  ·  ${biz.area}, ${biz.province}`, 540, nameY + 58);

    if (biz.owner_name) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "italic 30px Georgia, serif";
      ctx.fillText(`by ${biz.owner_name}`, 540, nameY + 110);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(200, 900);
    ctx.lineTo(880, 900);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "28px Arial, sans-serif";
    ctx.fillText(SITE_URL.replace("https://", ""), 540, 946);

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "22px Arial, sans-serif";
    ctx.fillText(`Built by Olideen Technologies — olideentech.co.za`, 540, 985);

    const downloadLink = document.createElement("a");
    downloadLink.download = `${biz.name.replace(/\s+/g, "-")}-featured-gem.png`;
    downloadLink.href = canvas.toDataURL("image/png");
    downloadLink.click();
  }

  if (biz.logo_url) {
    const logoImage = new window.Image();
    logoImage.crossOrigin = "anonymous";
    logoImage.onload  = () => draw(logoImage);
    logoImage.onerror = () => draw(null);
    logoImage.src = biz.logo_url;
  } else {
    draw(null);
  }
}

// loads one image and resolves once it's ready, or to null if there was
// nothing to load or it failed.
function loadImage(src) {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// hands a finished canvas off as a saved/shared image: Web Share API first
// (the native share sheet on iOS/Android — Save to Photos, WhatsApp, etc.),
// then a classic download link on desktop, then opening it in a new tab as
// a last resort.
async function shareOrDownloadCanvas(canvas, filename, shareTitle, shareText) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;

  const file = new File([blob], filename, { type: "image/png" });
  const canWebShareFile =
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  if (canWebShareFile) {
    try {
      await navigator.share({ files: [file], title: shareTitle, text: shareText });
      return;
    } catch (err) {
      if (err?.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);

  if ("download" in document.createElement("a")) {
    const downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.href = url;
    downloadLink.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  window.open(url, "_blank");
  alert("Long-press the image to save it.");
}

// the "You're Listed!" 1080x1080 graphic an owner can post once approved.
export function downloadShareGraphic(biz) {
  const canvas  = document.createElement("canvas");
  canvas.width  = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");

  const displayName = biz.name.replace(
    /\S+/g,
    (word) => word[0].toUpperCase() + word.slice(1).toLowerCase()
  );

  function fitLines(text, maxWidth, { maxSize, minSize, weight = "", family }) {
    const font = (size) => `${weight}${size}px ${family}`;
    let size = maxSize;
    ctx.font = font(size);
    while (ctx.measureText(text).width > maxWidth && size > minSize) {
      size -= 1;
      ctx.font = font(size);
    }
    if (ctx.measureText(text).width <= maxWidth) return { lines: [text], size };

    const words = text.split(" ");
    const mid = Math.ceil(words.length / 2);
    const lines = [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
    while (
      size > 14 &&
      (ctx.measureText(lines[0]).width > maxWidth || ctx.measureText(lines[1]).width > maxWidth)
    ) {
      size -= 1;
      ctx.font = font(size);
    }
    return { lines, size };
  }

  function drawFitted(text, centerX, top, maxWidth, opts) {
    const { lines, size } = fitLines(text, maxWidth, opts);
    ctx.font = `${opts.weight || ""}${size}px ${opts.family}`;
    ctx.fillStyle = opts.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const lineHeight = size * 1.25;
    lines.forEach((line, i) => ctx.fillText(line, centerX, top + lineHeight * (i + 0.8)));
    return lineHeight * lines.length;
  }

  Promise.all([loadImage("/HG_Logo.png"), loadImage(biz.logo_url)]).then(([hgLogo, bizLogo]) => {
    const backgroundGradient = ctx.createLinearGradient(0, 0, 1080, 1080);
    backgroundGradient.addColorStop(0, "#0F52BA");
    backgroundGradient.addColorStop(1, "#9966CC");
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, 1080, 1080);

    const glow = ctx.createRadialGradient(540, 260, 40, 540, 260, 620);
    glow.addColorStop(0, "rgba(255,255,255,0.16)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1080, 1080);

    const logoTop = 60, logoHeight = 72;
    if (hgLogo) {
      const logoWidth = logoHeight * (hgLogo.naturalWidth / hgLogo.naturalHeight);
      ctx.drawImage(hgLogo, 540 - logoWidth / 2, logoTop, logoWidth, logoHeight);
    }

    const headlineTop = logoTop + logoHeight + 54;
    const headlineHeight = drawFitted("You're Listed!", 540, headlineTop, 960, {
      maxSize: 76, minSize: 56, weight: "bold ", family: "Georgia, serif", color: "#ffffff",
    });

    const subheadTop = headlineTop + headlineHeight + 30;
    const subheadHeight = drawFitted(`CONGRATS, ${displayName}!`, 540, subheadTop, 960, {
      maxSize: 38, minSize: 24, weight: "600 ", family: "Arial, sans-serif", color: "rgba(255,255,255,0.92)",
    });

    const cardX = 140, cardWidth = 800, cardRadius = 28;
    const cardPaddingTop = 56, cardPaddingBottom = 56, cardInnerWidth = cardWidth - 128;
    const cardTop = subheadTop + subheadHeight + 70;

    const circleRadius = 86;
    const relNameTop = cardPaddingTop + circleRadius * 2 + 36;
    const { lines: nameLines, size: nameSize } = fitLines(displayName, cardInnerWidth, {
      maxSize: 42, minSize: 24, weight: "bold ", family: "Georgia, serif",
    });
    const nameLineHeight = nameSize * 1.25;
    const relCategoryTop = relNameTop + nameLineHeight * nameLines.length + 18;
    const categoryLineHeight = 26 * 1.25;
    const cardHeight = relCategoryTop + categoryLineHeight + cardPaddingBottom;

    ctx.save();
    ctx.shadowColor   = "rgba(0,0,0,0.22)";
    ctx.shadowBlur    = 38;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(cardX, cardTop, cardWidth, cardHeight, cardRadius);
    ctx.fill();
    ctx.restore();

    const circleCenterY = cardTop + cardPaddingTop + circleRadius;
    ctx.save();
    ctx.beginPath();
    ctx.arc(540, circleCenterY, circleRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#E7EFFA";
    ctx.fill();
    ctx.clip();
    if (bizLogo) {
      ctx.drawImage(bizLogo, 540 - circleRadius, circleCenterY - circleRadius, circleRadius * 2, circleRadius * 2);
    } else {
      ctx.fillStyle = "#0F52BA";
      ctx.font = "italic bold 78px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(displayName[0].toUpperCase(), 540, circleCenterY);
    }
    ctx.restore();
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "#082B66";
    ctx.font = `bold ${nameSize}px Georgia, serif`;
    ctx.textAlign = "center";
    nameLines.forEach((line, i) =>
      ctx.fillText(line, 540, cardTop + relNameTop + nameLineHeight * (i + 0.8))
    );

    ctx.fillStyle = "#6b7280";
    ctx.font = "26px Arial, sans-serif";
    ctx.fillText(biz.category, 540, cardTop + relCategoryTop + 22);

    const footerTop = cardTop + cardHeight + 70;
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(300, footerTop);
    ctx.lineTo(780, footerTop);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "600 30px Arial, sans-serif";
    ctx.fillText("Find us on Hidden Gems SA", 540, footerTop + 44);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "22px Arial, sans-serif";
    ctx.fillText(SITE_URL.replace("https://", ""), 540, footerTop + 78);

    shareOrDownloadCanvas(
      canvas,
      `hidden-gems-sa-${biz.slug}-listed.png`,
      "Hidden Gems SA",
      `${biz.name} is now listed on Hidden Gems SA!`
    );
  });
}
