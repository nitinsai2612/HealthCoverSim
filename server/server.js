/*
 * server.js — HealthCoverSim REST API (Node.js + Express + SQLite)
 * ----------------------------------------------------------------
 * Endpoints
 *   GET    /api/health         health check
 *   GET    /api/options        dropdown options + price tables (drives the React form)
 *   GET    /api/quotes         list all quotes (with monthly premium for each)
 *   GET    /api/quotes/:id     one quote + full calculated breakdown
 *   POST   /api/quotes         create
 *   PUT    /api/quotes/:id     update
 *   DELETE /api/quotes/:id     delete
 *   POST   /api/quotes/preview calculate without saving
 *
 * Every route validates its input and returns a meaningful 400 error
 * rather than crashing with a 500.
 */

const express = require('express');
const cors = require('cors');

const { run, get, all, ensureDatabaseReady } = require('./db');
const { calculateQuote, HOSPITAL_PRICES, EXTRAS_PRICES, FAMILY_UPGRADE_FEE } = require('./pricing');
const {
  validateQuote,
  normaliseQuote,
  COVER_TYPES,
  HOSPITAL_LEVELS,
  EXTRAS_LEVELS,
  COVER_HISTORIES,
  PAYMENT_FREQUENCIES,
  MIN_AGE,
  MAX_AGE,
  MIN_DISCOUNT,
  MAX_DISCOUNT,
} = require('./validation');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Reject malformed JSON bodies with 400 instead of letting Express throw a 500.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Request body is not valid JSON.' });
  }
  return next(err);
});

// ---- Helpers -------------------------------------------------------------

/** Parse and validate an :id route parameter. */
function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

const SELECT_COLUMNS = `
  id, customer_name, cover_type,
  applicant1_age, applicant1_cover_history,
  applicant2_age, applicant2_cover_history,
  hospital_cover, extras_cover, payment_frequency,
  annual_discount, notes, created_at
`;

// ---- Routes --------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'HealthCoverSim API' });
});

// Options + price tables, so the React form never hard-codes prices twice.
app.get('/api/options', (req, res) => {
  res.json({
    coverTypes: COVER_TYPES,
    hospitalLevels: HOSPITAL_LEVELS,
    extrasLevels: EXTRAS_LEVELS,
    coverHistories: COVER_HISTORIES,
    paymentFrequencies: PAYMENT_FREQUENCIES,
    hospitalPrices: HOSPITAL_PRICES,
    extrasPrices: EXTRAS_PRICES,
    familyUpgradeFee: FAMILY_UPGRADE_FEE,
    limits: {
      minAge: MIN_AGE,
      maxAge: MAX_AGE,
      minDiscount: MIN_DISCOUNT,
      maxDiscount: MAX_DISCOUNT,
    },
  });
});

// LIST — every quote, newest first, with its monthly premium for the summary table.
app.get('/api/quotes', async (req, res) => {
  try {
    const rows = await all(`SELECT ${SELECT_COLUMNS} FROM quotes ORDER BY id DESC`);
    const quotes = rows.map((row) => {
      const breakdown = calculateQuote(row);
      return {
        ...row,
        monthlyPremium: breakdown.monthlyPremium,
        yearlyBeforeDiscount: breakdown.yearlyBeforeDiscount,
        yearlyAfterDiscount: breakdown.yearlyAfterDiscount,
        hasWarnings: breakdown.warnings.length > 0,
      };
    });
    res.json(quotes);
  } catch (err) {
    console.error('GET /api/quotes failed:', err.message);
    res.status(500).json({ error: 'Could not read quotes from the database.' });
  }
});

// PREVIEW — calculate without saving (used by the live preview on the form).
app.post('/api/quotes/preview', (req, res) => {
  const { valid, errors } = validateQuote(req.body);
  if (!valid) {
    return res.status(400).json({ error: 'Validation failed. Please correct the fields below.', errors });
  }
  const quote = normaliseQuote(req.body);
  return res.json({ quote, breakdown: calculateQuote(quote) });
});

// DETAIL — one quote plus the full explanation-sheet breakdown.
app.get('/api/quotes/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Quote id must be a positive whole number.' });
  }
  try {
    const row = await get(`SELECT ${SELECT_COLUMNS} FROM quotes WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ error: `No quote found with id ${id}.` });
    return res.json({ quote: row, breakdown: calculateQuote(row) });
  } catch (err) {
    console.error(`GET /api/quotes/${id} failed:`, err.message);
    return res.status(500).json({ error: 'Could not read the quote from the database.' });
  }
});

// CREATE
app.post('/api/quotes', async (req, res) => {
  const { valid, errors } = validateQuote(req.body);
  if (!valid) {
    return res.status(400).json({ error: 'Validation failed. Please correct the fields below.', errors });
  }
  const q = normaliseQuote(req.body);
  try {
    const result = await run(
      `INSERT INTO quotes (
         customer_name, cover_type,
         applicant1_age, applicant1_cover_history,
         applicant2_age, applicant2_cover_history,
         hospital_cover, extras_cover,
         payment_frequency, annual_discount, notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        q.customer_name, q.cover_type,
        q.applicant1_age, q.applicant1_cover_history,
        q.applicant2_age, q.applicant2_cover_history,
        q.hospital_cover, q.extras_cover,
        q.payment_frequency, q.annual_discount, q.notes,
      ]
    );
    const row = await get(`SELECT ${SELECT_COLUMNS} FROM quotes WHERE id = ?`, [result.lastID]);
    return res.status(201).json({ quote: row, breakdown: calculateQuote(row) });
  } catch (err) {
    console.error('POST /api/quotes failed:', err.message);
    return res.status(400).json({ error: `Could not save the quote: ${err.message}` });
  }
});

// UPDATE
app.put('/api/quotes/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Quote id must be a positive whole number.' });
  }
  const { valid, errors } = validateQuote(req.body);
  if (!valid) {
    return res.status(400).json({ error: 'Validation failed. Please correct the fields below.', errors });
  }
  const q = normaliseQuote(req.body);
  try {
    const existing = await get('SELECT id FROM quotes WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: `No quote found with id ${id}.` });

    await run(
      `UPDATE quotes SET
         customer_name = ?, cover_type = ?,
         applicant1_age = ?, applicant1_cover_history = ?,
         applicant2_age = ?, applicant2_cover_history = ?,
         hospital_cover = ?, extras_cover = ?,
         payment_frequency = ?, annual_discount = ?, notes = ?
       WHERE id = ?`,
      [
        q.customer_name, q.cover_type,
        q.applicant1_age, q.applicant1_cover_history,
        q.applicant2_age, q.applicant2_cover_history,
        q.hospital_cover, q.extras_cover,
        q.payment_frequency, q.annual_discount, q.notes,
        id,
      ]
    );
    const row = await get(`SELECT ${SELECT_COLUMNS} FROM quotes WHERE id = ?`, [id]);
    return res.json({ quote: row, breakdown: calculateQuote(row) });
  } catch (err) {
    console.error(`PUT /api/quotes/${id} failed:`, err.message);
    return res.status(400).json({ error: `Could not update the quote: ${err.message}` });
  }
});

// DELETE
app.delete('/api/quotes/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Quote id must be a positive whole number.' });
  }
  try {
    const result = await run('DELETE FROM quotes WHERE id = ?', [id]);
    if (result.changes === 0) return res.status(404).json({ error: `No quote found with id ${id}.` });
    return res.json({ message: `Quote ${id} deleted.`, id });
  } catch (err) {
    console.error(`DELETE /api/quotes/${id} failed:`, err.message);
    return res.status(500).json({ error: 'Could not delete the quote.' });
  }
});

// Unknown API route
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Unknown API endpoint: ${req.method} ${req.originalUrl}` });
});

// Catch-all error handler — guarantees a JSON error instead of an HTML crash page.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

// ---- Start ---------------------------------------------------------------
if (require.main === module) {
  ensureDatabaseReady((err) => {
    if (err) {
      console.error('Database is not ready:', err.message);
      process.exit(1);
    }
    app.listen(PORT, () => {
      console.log(`HealthCoverSim API listening on http://localhost:${PORT}`);
      console.log(`Try: http://localhost:${PORT}/api/quotes`);
    });
  });
}

module.exports = app;
