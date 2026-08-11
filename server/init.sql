-- ============================================================
-- HealthCoverSim — database schema
-- Run with:  sqlite3 healthcoversim.db < init.sql
-- (or simply: npm run init-db, which executes this file via db.js)
-- ============================================================

DROP TABLE IF EXISTS quotes;

CREATE TABLE quotes (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name             TEXT    NOT NULL,
  cover_type                TEXT    NOT NULL CHECK (cover_type IN ('Single', 'Couple', 'Family')),

  applicant1_age            INTEGER NOT NULL CHECK (applicant1_age BETWEEN 18 AND 100),
  applicant1_cover_history  TEXT    NOT NULL CHECK (applicant1_cover_history IN ('Yes', 'No', 'Not sure')),

  -- NULL for Single cover — the backend performs null checks before use.
  applicant2_age            INTEGER          CHECK (applicant2_age IS NULL OR applicant2_age BETWEEN 18 AND 100),
  applicant2_cover_history  TEXT             CHECK (applicant2_cover_history IS NULL OR applicant2_cover_history IN ('Yes', 'No', 'Not sure')),

  hospital_cover            TEXT    NOT NULL CHECK (hospital_cover IN ('None', 'Basic', 'Bronze', 'Silver', 'Gold')),
  extras_cover              TEXT    NOT NULL CHECK (extras_cover   IN ('None', 'Basic', 'Standard', 'Premium')),

  payment_frequency         TEXT    NOT NULL CHECK (payment_frequency IN ('Monthly', 'Yearly')),
  annual_discount           REAL    NOT NULL DEFAULT 0 CHECK (annual_discount BETWEEN 0 AND 10),

  notes                     TEXT,
  created_at                TEXT    NOT NULL DEFAULT (datetime('now')),

  -- Applicant 2 details must be present for Couple and Family cover.
  CHECK (
    (cover_type = 'Single'  AND applicant2_age IS NULL     AND applicant2_cover_history IS NULL)
    OR
    (cover_type IN ('Couple', 'Family') AND applicant2_age IS NOT NULL AND applicant2_cover_history IS NOT NULL)
  )
);

-- ------------------------------------------------------------
-- Sample row: the Section 7 worked example.
-- Expected: monthly $472, yearly before discount $5,664,
--           yearly after 5% discount $5,380.80
-- ------------------------------------------------------------
INSERT INTO quotes (
  customer_name, cover_type,
  applicant1_age, applicant1_cover_history,
  applicant2_age, applicant2_cover_history,
  hospital_cover, extras_cover,
  payment_frequency, annual_discount, notes
) VALUES (
  'Worked Example (Section 7)', 'Family',
  40, 'No',
  35, 'Yes',
  'Silver', 'Standard',
  'Yearly', 5, 'Verification record from the assignment brief.'
);
