-- Migrates the `business_type` column on `businesses` from the old 4-option
-- list to the new 5-option list, and checks for a privacy issue before
-- doing so. Run the sections in order, in the Supabase SQL editor.
--
-- Old -> new mapping:
--   "Physical location — customers visit us" -> "Shop or Office"
--   "Home-based — we operate from home"      -> "Home-based"
--   "Mobile — we come to the customer"       -> "On-site service"
--   "Online only — no physical location"     -> "Remote"
--   (no old value maps to "Delivery only" — it's a genuinely new option)


-- ============================================================
-- STEP 1 (read-only) — privacy check, run this FIRST.
--
-- The app already nulls `street_address` on save whenever business_type
-- isn't the one physical type, so this should normally return zero rows.
-- A non-empty result means Home-based rows already have a stored address
-- (e.g. old data from before that null-forcing logic existed, or an
-- admin-side edit) — do not proceed to Step 3 until you've seen this.
-- ============================================================
SELECT id, name, business_type, street_address
FROM businesses
WHERE business_type = 'Home-based — we operate from home'
  AND street_address IS NOT NULL;


-- ============================================================
-- STEP 2 (read-only) — sanity check on current values, so you know what
-- Step 3 is about to touch.
-- ============================================================
SELECT business_type, count(*)
FROM businesses
GROUP BY business_type
ORDER BY business_type;


-- ============================================================
-- STEP 3 — the actual migration. Only run after reviewing Steps 1 and 2.
-- This does NOT touch street_address — it only remaps the business_type
-- label itself, so if Step 1 found existing Home-based addresses, they
-- are left in place (not silently wiped) until you decide what to do
-- with them.
-- ============================================================
UPDATE businesses SET business_type = 'Shop or Office'   WHERE business_type = 'Physical location — customers visit us';
UPDATE businesses SET business_type = 'Home-based'       WHERE business_type = 'Home-based — we operate from home';
UPDATE businesses SET business_type = 'On-site service'  WHERE business_type = 'Mobile — we come to the customer';
UPDATE businesses SET business_type = 'Remote'           WHERE business_type = 'Online only — no physical location';


-- ============================================================
-- STEP 4 (read-only) — confirm every row now has a value from the new
-- list (should return zero rows).
-- ============================================================
SELECT id, name, business_type
FROM businesses
WHERE business_type NOT IN ('Shop or Office', 'Home-based', 'On-site service', 'Delivery only', 'Remote');


-- ============================================================
-- OPTIONAL — only if Step 1 found rows AND you decide, after seeing them,
-- that those stored addresses should be cleared for privacy. Not run
-- automatically; commented out on purpose.
-- ============================================================
-- UPDATE businesses SET street_address = NULL
-- WHERE business_type = 'Home-based' AND street_address IS NOT NULL;
