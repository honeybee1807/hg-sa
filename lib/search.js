// the homepage directory's "smart" search: turns whatever someone types
// ("tutor estcourt", "cakes", "mechnic", "halal food") into a ranked list of
// matching businesses. plain JavaScript with no React and no libraries, so
// it's easy to test on its own and cheap to ship — the whole directory is already in the browser, so this just runs
// over that list.
//
// how a query is understood:
//   1. normalise   — lowercase, strip accents and punctuation, tidy spaces.
//   2. phrases     — multi-word terms ("call out", "panel beater", "port
//                    shepstone") are recognised first.
//   3. filler      — words like "in", "near", "the", "best" are dropped.
//   4. stemming    — bakers / baking / bakery / baked all become "bak", so
//                    any word form matches any other.
//   5. each remaining word becomes one of:
//        AREA      — a town/suburb that actually has listings
//        PROVINCE  — e.g. "kzn", "gauteng"
//        CATEGORY  — via SEARCH_SYNONYMS in lib/constants.js
//        BADGE     — halal / delivery / call-outs
//        TEXT      — anything else, matched against name and description
//      small typos are forgiven (1 letter for 4+ letter words, 2 for 8+).
//
// matching: every kind must match (AND). if nothing matches, it falls back
// in clearly-labelled steps: first the same thing in other areas, then the
// closest partial matches, and only then the empty state.

import { CATEGORIES, PROVINCES, SEARCH_SYNONYMS } from "./constants";

// ─── words and text ────────────────────────────────────────────────────

// words that carry no meaning for a directory search.
const STOPWORDS = new Set([
  "in", "near", "me", "for", "a", "an", "the", "and", "around", "best", "good", "cheap", "any",
  "find", "looking", "need", "someone", "who", "can", "my", "i", "to", "of", "at", "with", "on",
  "nearby", "where", "is", "want", "some", "please", "close", "by", "area",
]);

// lowercase, no accents, letters and digits only, single spaces.
export function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// light suffix stripping, so word forms meet in the middle. checked in
// order, first match wins. deliberately simple — it only has to make the
// same word family land on the same stem, not produce real words.
const SUFFIX_RULES = [
  ["ographers", "ograph"], ["ographer", "ograph"], ["ography", "ograph"], ["ographic", "ograph"],
  ["eries", ""], ["ery", ""], ["ings", ""], ["ing", ""], ["ies", ""], ["ied", ""],
  ["ers", ""], ["er", ""], ["ed", ""], ["es", ""], ["s", ""], ["y", ""],
];
const UNDOUBLE_AFTER = new Set(["ings", "ing", "ers", "er", "ed"]);

export function stem(word) {
  if (word.length <= 3 || /\d/.test(word)) return word;
  let result = word;
  for (const [suffix, replacement] of SUFFIX_RULES) {
    if (!word.endsWith(suffix)) continue;
    if (suffix === "s" && /(ss|us)$/.test(word)) break; // glass, bus
    const candidate = word.slice(0, -suffix.length) + replacement;
    if (candidate.length < 3) continue;
    result = candidate;
    // shopping -> shopp -> shop, wedding -> wedd -> wed
    if (UNDOUBLE_AFTER.has(suffix) && /([b-df-hj-km-np-tv-z])\1$/.test(result) && !/(ll|ss|zz)$/.test(result)) {
      result = result.slice(0, -1);
    }
    break;
  }
  // cake / cakes / caked all end up as "cak"
  if (result.length > 3 && result.endsWith("e")) result = result.slice(0, -1);
  return result;
}

function wordsOf(normalizedText) {
  return normalizedText ? normalizedText.split(" ") : [];
}

function uniqueStems(normalizedText) {
  const stems = new Set();
  for (const word of wordsOf(normalizedText)) {
    if (!STOPWORDS.has(word)) stems.add(stem(word));
  }
  return [...stems];
}

// how many typos a word is allowed, by its typed length.
function typoAllowance(length) {
  if (length >= 8) return 2;
  if (length >= 4) return 1;
  return 0;
}

// true if a and b are within `max` edits (insert, delete, swap a letter, or
// swap two neighbouring letters). gives up early once it can't succeed.
function withinEditDistance(a, b, max) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > max) return false;
  let prevPrev = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prevPrev[j - 2] + 1);
      }
      cur[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return false;
    prevPrev = prev;
    prev = cur;
  }
  return prev[b.length] <= max;
}

// how well a typed word fits a known word: 3 exact, 2 prefix (still
// typing, or a longer/shorter form), 1 within typo tolerance, 0 no match.
// very short words are never fuzzy-matched.
function wordQuality(text, fuzz, word, minPrefix = 3) {
  if (word === text) return 3;
  if (text.length >= minPrefix && word.startsWith(text)) return 2;
  if (word.length >= 4 && text.startsWith(word) && word.length * 2 >= text.length) return 2;
  if (fuzz > 0 && text.length >= 4 && word.length >= 3 && withinEditDistance(text, word, fuzz)) return 1;
  return 0;
}

function makeTerm(rawWord) {
  return { raw: rawWord, stem: stem(rawWord), fuzz: typoAllowance(rawWord.length) };
}

// ─── the fixed dictionaries (categories, badges, provinces) ────────────

export const BADGE_LABELS = {
  halal: "Halal",
  delivery: "Delivery available",
  callouts: "Call-outs available",
};

const BADGE_TERMS = {
  halal: ["halal", "halaal"],
  delivery: ["delivery", "deliver", "deliveries", "delivers", "delivering"],
  callouts: [
    "call out", "call outs", "callout", "callouts", "come to you", "come to me", "comes to you",
    "home visit", "home visits", "mobile",
  ],
};

// words from a category's own name that are too generic to mean that category.
const CATEGORY_NAME_WORDS_TO_SKIP = new Set(["and", "services", "service", "general", "other", "local", "management"]);

// generic words that only count half when deciding which category a query
// means, so "cleaning service" is Cleaning, not Automotive.
const WEAK_CATEGORY_WORDS = new Set(["service", "repairs", "hire", "shop", "store", "supplies"].map(stem));

// common short names for places. only used if that place has listings.
const AREA_ALIASES = { pmb: "pietermaritzburg", maritzburg: "pietermaritzburg", dbn: "durban", joburg: "johannesburg", jozi: "johannesburg" };

const PROVINCE_ALIASES ={ kzn: "KwaZulu-Natal", natal: "KwaZulu-Natal", gp: "Gauteng", jhb: "Gauteng", wc: "Western Cape", ec: "Eastern Cape" };

// built once, the first time a search runs.
let dictionary = null;

function getDictionary() {
  if (dictionary) return dictionary;

  const categoryWords = new Map(); // stem -> Set of category names
  const phrases = [];               // multi-word entries of every kind
  const badgeWords = new Map();     // stem -> badge key
  const provinceWords = new Map();  // raw word -> province

  function addCategoryEntry(categoryName, text) {
    const words = wordsOf(normalize(text));
    if (words.length === 0) return;
    if (words.length === 1) {
      const key = stem(words[0]);
      if (!categoryWords.has(key)) categoryWords.set(key, new Set());
      categoryWords.get(key).add(categoryName);
    } else {
      phrases.push({ kind: "category", value: categoryName, words: words.map(stem), useStem: true });
    }
  }

  for (const category of CATEGORIES) {
    for (const word of wordsOf(normalize(category.name))) {
      if (word.length >= 3 && !CATEGORY_NAME_WORDS_TO_SKIP.has(word)) addCategoryEntry(category.name, word);
    }
    for (const synonym of SEARCH_SYNONYMS[category.name] ?? []) addCategoryEntry(category.name, synonym);
  }

  for (const [badge, terms] of Object.entries(BADGE_TERMS)) {
    for (const term of terms) {
      const words = wordsOf(normalize(term));
      if (words.length === 1) badgeWords.set(stem(words[0]), badge);
      else phrases.push({ kind: "badge", value: badge, words: words.map(stem), useStem: true });
    }
  }

  for (const province of PROVINCES) {
    const words = wordsOf(normalize(province));
    if (words.length === 1) provinceWords.set(words[0], province);
    else phrases.push({ kind: "province", value: province, words, useStem: false });
  }
  for (const [alias, province] of Object.entries(PROVINCE_ALIASES)) provinceWords.set(alias, province);

  dictionary = { categoryWords, phrases, badgeWords, provinceWords };
  return dictionary;
}

// ─── the per-directory index (rebuilt only when the listings change) ───

// prepares everything that doesn't depend on what's typed: each business's
// words, the distinct areas, and every word that appears in any listing.
export function buildSearchIndex(businesses) {
  const areas = new Map(); // area key -> { key, label, words, compact, provinces }
  const vocab = new Set();

  const entries = businesses.map((biz, order) => {
    const areaLabel = String(biz.area ?? "").split(",")[0].trim();
    const areaKey = normalize(areaLabel);
    const entry = {
      biz,
      order,
      nameNorm: normalize(biz.name),
      descNorm: normalize(biz.description),
      nameWords: uniqueStems(normalize(biz.name)),
      descWords: uniqueStems(normalize(biz.description)),
      categoryWords: uniqueStems(normalize(biz.category)),
      areaWords: uniqueStems(areaKey),
      areaKey,
    };
    for (const list of [entry.nameWords, entry.descWords, entry.categoryWords, entry.areaWords]) {
      for (const word of list) vocab.add(word);
    }
    if (areaKey) {
      if (!areas.has(areaKey)) {
        areas.set(areaKey, { key: areaKey, label: areaLabel, words: wordsOf(areaKey), compact: areaKey.replace(/ /g, ""), provinces: new Set() });
      }
      if (biz.province) areas.get(areaKey).provinces.add(biz.province);
    }
    return entry;
  });

  return { entries, areas: [...areas.values()], vocab: [...vocab], vocabSet: vocab };
}

// ─── understanding the query ───────────────────────────────────────────

const KIND_PRIORITY = { badge: 4, category: 3, province: 2, area: 1 };

// splits the typed text into tokens, remembering which typed word each
// came from (so a chip can remove exactly the words it stands for).
function tokenize(query) {
  const rawWords = String(query ?? "").trim().split(/\s+/).filter(Boolean);
  const tokens = [];
  rawWords.forEach((rawWord, rawIndex) => {
    for (const text of wordsOf(normalize(rawWord))) tokens.push({ text, rawIndex });
  });
  return tokens;
}

// tries to read a multi-word phrase starting at tokens[start].
function matchPhraseAt(tokens, start, phraseList) {
  let best = null;
  for (const phrase of phraseList) {
    const n = phrase.words.length;
    if (start + n > tokens.length) continue;
    let total = 0;
    let ok = true;
    for (let k = 0; k < n; k++) {
      const typed = tokens[start + k].text;
      const text = phrase.useStem ? stem(typed) : typed;
      const q = wordQuality(text, typoAllowance(typed.length), phrase.words[k]);
      if (q === 0) { ok = false; break; }
      total += q;
    }
    if (!ok) continue;
    const better =
      !best ||
      n > best.length ||
      (n === best.length && (total > best.total || (total === best.total && KIND_PRIORITY[phrase.kind] > KIND_PRIORITY[best.kind])));
    if (better) best = { kind: phrase.kind, value: phrase.value, length: n, total };
  }
  return best;
}

// resolves one word: the best-fitting kind wins (exact beats prefix beats
// typo); on a tie, badge > category > province > area.
function resolveWord(token, index, dict) {
  const term = makeTerm(token.text);
  const candidates = [];

  let badgeQ = 0, badge = null;
  for (const [word, key] of dict.badgeWords) {
    const q = wordQuality(term.stem, term.fuzz, word);
    if (q > badgeQ) { badgeQ = q; badge = key; }
  }
  if (badgeQ) candidates.push({ kind: "badge", quality: badgeQ, value: badge });

  let categoryQ = 0;
  let categories = new Set();
  for (const [word, names] of dict.categoryWords) {
    const q = wordQuality(term.stem, term.fuzz, word);
    if (q === 0 || q < categoryQ) continue;
    if (q > categoryQ) { categoryQ = q; categories = new Set(); }
    for (const name of names) categories.add(name);
  }
  if (categoryQ) candidates.push({ kind: "category", quality: categoryQ, value: categories });

  let provinceQ = 0, province = null;
  for (const [word, name] of dict.provinceWords) {
    const q = wordQuality(term.raw, term.fuzz, word, 4);
    if (q > provinceQ) { provinceQ = q; province = name; }
  }
  if (provinceQ) candidates.push({ kind: "province", quality: provinceQ, value: province });

  let areaQ = 0;
  let areaKeys = new Set();
  const aliasTarget = AREA_ALIASES[term.raw];
  for (const area of index.areas) {
    let q = Math.max(wordQuality(term.raw, term.fuzz, area.words[0]), wordQuality(term.raw, term.fuzz, area.compact));
    // any whole word of a multi-word area counts too ("durban" also finds
    // "Greyville Durban"); a partly-typed later word counts a little less.
    for (const word of area.words.slice(1)) {
      const wq = wordQuality(term.raw, term.fuzz, word, 4);
      q = Math.max(q, wq === 3 ? 3 : Math.min(2, wq));
    }
    if (aliasTarget && area.words.includes(aliasTarget)) q = 3;
    if (q === 0 || q < areaQ) continue;
    if (q > areaQ) { areaQ = q; areaKeys = new Set(); }
    areaKeys.add(area.key);
  }
  if (areaQ) candidates.push({ kind: "area", quality: areaQ, value: areaKeys });

  candidates.sort((a, b) => b.quality - a.quality || KIND_PRIORITY[b.kind] - KIND_PRIORITY[a.kind]);
  const best = candidates[0];

  // a typo-level guess loses to a word that's actually in a listing, so a
  // business called "Bara" isn't mistaken for "barber".
  if (!best || (best.quality === 1 && index.vocabSet.has(term.stem))) return { kind: "text", term };
  return { ...best, term };
}

// turns the typed text into the parts it was understood as.
export function parseQuery(query, index) {
  const dict = getDictionary();
  const tokens = tokenize(query);

  // multi-word areas join the fixed phrases for this directory.
  const phraseList = dict.phrases.concat(
    index.areas.filter((a) => a.words.length > 1).map((a) => ({ kind: "area", value: new Set([a.key]), words: a.words, useStem: false }))
  );

  const parts = [];
  let i = 0;
  while (i < tokens.length) {
    const phrase = matchPhraseAt(tokens, i, phraseList);
    if (phrase) {
      const rawIndexes = tokens.slice(i, i + phrase.length).map((t) => t.rawIndex);
      const value = phrase.kind === "category" ? new Set([phrase.value]) : phrase.value;
      const text = tokens.slice(i, i + phrase.length).map((t) => t.text).join(" ");
      parts.push({ kind: phrase.kind, value, quality: 3, term: makeTerm(text), rawIndexes });
      i += phrase.length;
      continue;
    }
    const token = tokens[i];
    i++;
    if (STOPWORDS.has(token.text)) continue;
    parts.push({ ...resolveWord(token, index, dict), rawIndexes: [token.rawIndex] });
  }
  return parts;
}

// ─── searching ─────────────────────────────────────────────────────────

const NAME_POINTS = [0, 5, 8, 12];
const CATEGORY_POINTS = [0, 4, 6, 9];
const AREA_POINTS = [0, 3, 5, 7];
const DESC_POINTS = [0, 2, 3, 4];

function bestQuality(words, qualities) {
  let best = 0;
  for (const word of words) {
    const q = qualities.get(word);
    if (q > best) best = q;
    if (best === 3) break;
  }
  return best;
}

// for one typed word, how well it fits every word in the directory.
function qualitiesFor(term, vocab) {
  const map = new Map();
  for (const word of vocab) {
    const q = wordQuality(term.stem, term.fuzz, word);
    if (q) map.set(word, q);
  }
  return map;
}

function joinLabels(labels) {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`;
}

function intersect(setLike, list) {
  return new Set([...setLike].filter((v) => list.includes(v)));
}

// the whole search: listings + typed text + the filter panel -> what to show.
//   filters: { categories, provinces, businessTypes, badges } (the panel/pills)
// returns {
//   results     — businesses to show, best first
//   tier        — "all" (no query), "exact", "other_areas", "closest" or "none"
//   message     — the line explaining fallback results (null for exact)
//   notes       — any filter-vs-search conflicts, explained
//   chips       — how the query was understood: { id, kind, label, rawIndexes }
//   exactCount  — how many matched everything (for analytics)
// }
export function searchDirectory(index, query, filters = {}) {
  const { categories = [], provinces = [], businessTypes = [], badges = [] } = filters;

  const passesPanel = (entry, requiredBadges) => {
    const biz = entry.biz;
    if (categories.length && !categories.includes(biz.category)) return false;
    if (provinces.length && !provinces.includes(biz.province)) return false;
    if (businessTypes.length && !businessTypes.includes(biz.business_type)) return false;
    for (const key of requiredBadges) {
      if (key === "halal" && !biz.halal) return false;
      if (key === "delivery" && !biz.delivery_available) return false;
      if (key === "callouts" && !biz.callouts_available) return false;
    }
    return true;
  };

  const fullQuery = normalize(query);
  if (!fullQuery) {
    const results = index.entries.filter((e) => passesPanel(e, badges)).map((e) => e.biz);
    return { results, tier: "all", message: null, notes: [], chips: [], exactCount: results.length };
  }

  const parts = parseQuery(query, index);
  const notes = [];

  // ── gather the parts by kind ──
  const categoryParts = parts.filter((p) => p.kind === "category");
  const textParts = parts.filter((p) => p.kind === "text");
  const areaParts = parts.filter((p) => p.kind === "area");
  const provinceParts = parts.filter((p) => p.kind === "province");
  const badgeParts = parts.filter((p) => p.kind === "badge");

  // the category the query means: each category word votes, a word that
  // fits fewer categories counting for more ("cleaning service" -> Cleaning,
  // not Automotive). ties keep every tied category.
  let concept = null;
  if (categoryParts.length) {
    const votes = new Map();
    for (const part of categoryParts) {
      const weight = WEAK_CATEGORY_WORDS.has(part.term.stem) ? 0.5 : 1;
      for (const name of part.value) votes.set(name, (votes.get(name) ?? 0) + weight / part.value.size);
    }
    const top = Math.max(...votes.values());
    concept = new Set([...votes].filter(([, v]) => Math.abs(v - top) < 1e-9).map(([name]) => name));
  }
  const conceptLabel = concept ? joinLabels([...concept]) : "";
  let conceptTerms = categoryParts.map((p) => p.term);

  let areaKeys = areaParts.length ? new Set(areaParts.flatMap((p) => [...p.value])) : null;
  let queryProvinces = provinceParts.length ? new Set(provinceParts.map((p) => p.value)) : null;
  const queryBadges = [...new Set(badgeParts.map((p) => p.value))];

  const areaLabelOf = (keys) => joinLabels(index.areas.filter((a) => keys.has(a.key)).map((a) => a.label));
  const chipAreaLabel = areaKeys ? areaLabelOf(areaKeys) : "";

  // ── the filter panel and pills win over the typed text ──
  if (concept && categories.length) {
    const overlap = intersect(concept, categories);
    if (overlap.size === 0) {
      notes.push(`Your search looks like ${conceptLabel}, but the ${joinLabels(categories)} filter is selected, so the filter wins.`);
      concept = null;
      conceptTerms = [];
    } else {
      concept = overlap;
    }
  }
  if (queryProvinces && provinces.length) {
    const overlap = intersect(queryProvinces, provinces);
    if (overlap.size === 0) {
      notes.push(`You searched ${joinLabels([...queryProvinces])}, but the ${joinLabels(provinces)} filter is selected, so the filter wins.`);
      queryProvinces = null;
    } else {
      queryProvinces = overlap;
    }
  }
  if (areaKeys && provinces.length) {
    const kept = new Set(index.areas.filter((a) => areaKeys.has(a.key) && [...a.provinces].some((p) => provinces.includes(p))).map((a) => a.key));
    if (kept.size === 0) {
      notes.push(`${chipAreaLabel} isn't in the ${joinLabels(provinces)} filter you selected, so the filter wins.`);
      areaKeys = null;
    } else {
      areaKeys = kept;
    }
  }

  const requiredBadges = [...new Set([...badges, ...queryBadges])];
  const pool = index.entries.filter((e) => passesPanel(e, requiredBadges));

  const textTerms = textParts.map((p) => p.term);
  const textQualities = textTerms.map((t) => qualitiesFor(t, index.vocab));
  const conceptQualities = conceptTerms.map((t) => qualitiesFor(t, index.vocab));

  // scores one business, and records what it matched.
  function evaluate(entry) {
    let score = 0;
    let matched = 0;
    let allTermsMatched = true;

    conceptTerms.forEach((term, k) => {
      if (concept && concept.has(entry.biz.category)) {
        score += 10;
        matched++;
        return;
      }
      // a business outside the category can still match on its own words
      // ("cakes" finds "Sweet Cakes" listed under Other) — exact words, or
      // a clear prefix, only.
      const qualities = conceptQualities[k];
      const strong = (q) => (q === 3 || (q === 2 && term.stem.length >= 4) ? q : 0);
      const n = strong(bestQuality(entry.nameWords, qualities));
      const d = strong(bestQuality(entry.descWords, qualities));
      if (n || d) {
        score += Math.max(NAME_POINTS[n], DESC_POINTS[d]);
        matched++;
      } else {
        allTermsMatched = false;
      }
    });

    textTerms.forEach((term, k) => {
      const qualities = textQualities[k];
      const points = Math.max(
        NAME_POINTS[bestQuality(entry.nameWords, qualities)],
        CATEGORY_POINTS[bestQuality(entry.categoryWords, qualities)],
        AREA_POINTS[bestQuality(entry.areaWords, qualities)],
        DESC_POINTS[bestQuality(entry.descWords, qualities)]
      );
      if (points) {
        score += points;
        matched++;
      } else {
        allTermsMatched = false;
      }
    });

    const areaMatch = !areaKeys || areaKeys.has(entry.areaKey);
    const provinceMatch = !queryProvinces || queryProvinces.has(entry.biz.province);
    if (areaKeys && areaMatch) score += 8;
    if (queryProvinces && provinceMatch) score += 3;

    if (entry.nameNorm === fullQuery) score += 100;
    else if (fullQuery.length >= 3 && entry.nameNorm.includes(fullQuery)) score += 40;

    const inConcept = !!concept && concept.has(entry.biz.category);
    return { entry, score, matched, allTermsMatched, inConcept, placeMatch: areaMatch && provinceMatch };
  }

  const byScore = (a, b) => b.score - a.score || a.entry.order - b.entry.order;
  const evaluated = pool.map(evaluate);
  const termCount = conceptTerms.length + textTerms.length;

  const chips = buildChips(parts, conceptLabel, chipAreaLabel);
  const finish = (list, tier, message) => ({
    results: list.map((r) => r.entry.biz),
    tier,
    message,
    notes,
    chips,
    exactCount: tier === "exact" ? list.length : 0,
  });

  // everything typed was filler ("the best") — fall back to the raw phrase.
  if (parts.length === 0) {
    const list = evaluated.filter((r) => r.entry.nameNorm.includes(fullQuery) || r.entry.descNorm.includes(fullQuery));
    return finish(list.sort(byScore), list.length ? "exact" : "none", null);
  }

  // 1. everything matches
  const exact = evaluated.filter((r) => r.allTermsMatched && r.placeMatch).sort(byScore);
  if (exact.length) return finish(exact, "exact", null);

  // 2. the same thing, in other areas
  const hasPlace = !!(areaKeys || queryProvinces);
  if (hasPlace && (termCount || queryBadges.length)) {
    const elsewhere = evaluated.filter((r) => r.allTermsMatched).sort(byScore);
    if (elsewhere.length) {
      const place = joinLabels([chipAreaLabel, ...(queryProvinces ? [...queryProvinces] : [])].filter(Boolean));
      // only name the category if the results really are in it — a match
      // on a business's own words alone gets the plainer wording.
      if (concept && elsewhere.some((r) => r.inConcept)) {
        const category = joinLabels([...concept]);
        const message = `No ${category} listed in ${place} yet. Showing ${category} businesses in other areas.`;
        return finish(elsewhere, "other_areas", message);
      }
      const what = joinLabels([
        ...conceptTerms.map((t) => `“${t.raw}”`),
        ...textTerms.map((t) => `“${t.raw}”`),
        ...queryBadges.map((b) => BADGE_LABELS[b].toLowerCase()),
      ]);
      const message = `Nothing matching ${what} in ${place} yet. Showing matches in other areas.`;
      return finish(elsewhere, "other_areas", message);
    }
  }

  // 3. the closest partial matches — must share at least one real search
  //    word (an area alone isn't "related").
  if (termCount > 1) {
    const closest = evaluated
      .filter((r) => r.matched > 0)
      .sort((a, b) => b.matched - a.matched || byScore(a, b));
    if (closest.length) {
      return finish(closest, "closest", "Closest matches: nothing matched everything you typed, so these match part of it.");
    }
  }

  return finish([], "none", null);
}

// one chip per meaning, in the order it was typed.
function buildChips(parts, conceptLabel, areaLabel) {
  const chips = [];
  const seen = new Map();
  for (const part of parts) {
    let id, label;
    if (part.kind === "category") { id = "category"; label = conceptLabel; }
    else if (part.kind === "area") { id = "area"; label = areaLabel; }
    else if (part.kind === "province") { id = `province:${part.value}`; label = part.value; }
    else if (part.kind === "badge") { id = `badge:${part.value}`; label = BADGE_LABELS[part.value]; }
    else { id = `text:${part.term.raw}:${part.rawIndexes[0]}`; label = `“${part.term.raw}”`; }

    if (seen.has(id)) {
      seen.get(id).rawIndexes.push(...part.rawIndexes);
      continue;
    }
    const chip = { id, kind: part.kind, label, rawIndexes: [...part.rawIndexes] };
    seen.set(id, chip);
    chips.push(chip);
  }
  return chips;
}

// the typed text with the given words (by position) taken out — used when
// a chip's × is pressed.
export function removeQueryWords(query, rawIndexes) {
  const drop = new Set(rawIndexes);
  return String(query ?? "").trim().split(/\s+/).filter((_, i) => !drop.has(i)).join(" ");
}

// strips anything that could be personal (emails, phone numbers) from a
// search before it's sent to analytics, and caps its length.
export function sanitizeSearchTerm(query) {
  return String(query ?? "")
    .replace(/\S+@\S+/g, "[email]")
    .replace(/\+?\d[\d\s-]{5,}\d/g, "[number]")
    .trim()
    .toLowerCase()
    .slice(0, 100);
}
