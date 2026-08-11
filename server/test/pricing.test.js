/*
 * pricing.test.js — unit tests for the quote calculation engine.
 * Run with:  npm test        (no server or database required)
 *
 * The Section 7 worked example is the primary verification tool:
 *   monthly $472 | yearly before discount $5,664 | yearly after 5% $5,380.80
 */

const assert = require('node:assert');
const { calculateQuote, calculateLhcLoading, LHC_STATEMENT } = require('../pricing');

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    fail += 1;
    console.log(`  FAIL  ${name}\n        ${err.message}`);
  }
}

function section(title) {
  console.log(`\n== ${title} ==`);
}

/** Convenience: a valid Single quote with overrides applied. */
const quote = (overrides = {}) => ({
  customer_name: 'Test User',
  cover_type: 'Single',
  applicant1_age: 40,
  applicant1_cover_history: 'No',
  applicant2_age: null,
  applicant2_cover_history: null,
  hospital_cover: 'Silver',
  extras_cover: 'Standard',
  payment_frequency: 'Monthly',
  annual_discount: 0,
  ...overrides,
});

// ---------------------------------------------------------------------------
section('Section 7 worked example (primary verification)');

const worked = calculateQuote({
  cover_type: 'Family',
  applicant1_age: 40,
  applicant1_cover_history: 'No',
  applicant2_age: 35,
  applicant2_cover_history: 'Yes',
  hospital_cover: 'Silver',
  extras_cover: 'Standard',
  payment_frequency: 'Yearly',
  annual_discount: 5,
});

test('Applicant 1: age 40, no history -> 20% loading', () =>
  assert.strictEqual(worked.applicants[0].lhcLoadingPercent, 20));
test('Applicant 1: $160 x 1.20 = $192', () =>
  assert.strictEqual(worked.applicants[0].hospitalPremium, 192));
test('Applicant 2: history Yes -> 0% loading', () =>
  assert.strictEqual(worked.applicants[1].lhcLoadingPercent, 0));
test('Applicant 2: hospital premium = $160', () =>
  assert.strictEqual(worked.applicants[1].hospitalPremium, 160));
test('Hospital total = $192 + $160 = $352', () =>
  assert.strictEqual(worked.hospitalTotal, 352));
test('Extras total = $45 x 2 adults = $90', () =>
  assert.strictEqual(worked.extrasTotal, 90));
test('Family upgrade fee = $30', () =>
  assert.strictEqual(worked.familyUpgradeFee, 30));
test('Monthly premium = $352 + $90 + $30 = $472', () =>
  assert.strictEqual(worked.monthlyPremium, 472));
test('Yearly before discount = $472 x 12 = $5,664', () =>
  assert.strictEqual(worked.yearlyBeforeDiscount, 5664));
test('Yearly after 5% discount = $5,380.80', () =>
  assert.strictEqual(worked.yearlyAfterDiscount, 5380.8));
test('Discount amount = $283.20', () =>
  assert.strictEqual(worked.annualDiscountAmount, 283.2));

// ---------------------------------------------------------------------------
section('LHC loading rules (Section 6)');

test('history "Yes" -> 0% at any age', () =>
  assert.strictEqual(calculateLhcLoading(70, 'Yes', 'Gold'), 0));
test('history "Not sure" -> 0% (never guessed)', () =>
  assert.strictEqual(calculateLhcLoading(70, 'Not sure', 'Gold'), 0));
test('history "No", age 30 -> 0% (boundary, not > 30)', () =>
  assert.strictEqual(calculateLhcLoading(30, 'No', 'Gold'), 0));
test('history "No", age 29 -> 0%', () =>
  assert.strictEqual(calculateLhcLoading(29, 'No', 'Gold'), 0));
test('history "No", age 31 -> 2%', () =>
  assert.strictEqual(calculateLhcLoading(31, 'No', 'Gold'), 0.02));
test('history "No", age 40 -> 20%', () =>
  assert.strictEqual(calculateLhcLoading(40, 'No', 'Gold'), 0.2));
test('hospital "None" -> 0% even at age 70 with no history', () =>
  assert.strictEqual(calculateLhcLoading(70, 'No', 'None'), 0));

test('Loading never touches extras: extras-only quote is unloaded', () => {
  const r = calculateQuote(quote({ applicant1_age: 60, hospital_cover: 'None', extras_cover: 'Premium' }));
  assert.strictEqual(r.applicants[0].lhcLoadingPercent, 0);
  assert.strictEqual(r.hospitalTotal, 0);
  assert.strictEqual(r.extrasTotal, 70);
  assert.strictEqual(r.monthlyPremium, 70);
});

test('Extras cost is identical with and without a loaded hospital cover', () => {
  const loaded = calculateQuote(quote({ applicant1_age: 60, hospital_cover: 'Gold', extras_cover: 'Premium' }));
  const unloaded = calculateQuote(quote({ applicant1_age: 25, hospital_cover: 'Gold', extras_cover: 'Premium', applicant1_cover_history: 'Yes' }));
  assert.strictEqual(loaded.extrasTotal, unloaded.extrasTotal);
});

test('Required LHC statement is exact', () =>
  assert.strictEqual(
    worked.lhcStatement,
    'Lifetime Health Cover loading applies only to hospital cover. It does not apply to extras cover.'
  ));
test('LHC statement is exported for reuse', () =>
  assert.strictEqual(LHC_STATEMENT, worked.lhcStatement));

// ---------------------------------------------------------------------------
section('Cover types (Section 5)');

test('Single -> 1 adult, no family fee', () => {
  const r = calculateQuote(quote({ cover_type: 'Single', applicant1_cover_history: 'Yes', hospital_cover: 'Basic', extras_cover: 'Basic' }));
  assert.strictEqual(r.adultCount, 1);
  assert.strictEqual(r.familyUpgradeFee, 0);
  assert.strictEqual(r.monthlyPremium, 90 + 25);
});

test('Couple -> 2 adults, no family fee', () => {
  const r = calculateQuote(quote({ cover_type: 'Couple', applicant1_cover_history: 'Yes', applicant2_age: 40, applicant2_cover_history: 'Yes', hospital_cover: 'Basic', extras_cover: 'Basic' }));
  assert.strictEqual(r.adultCount, 2);
  assert.strictEqual(r.familyUpgradeFee, 0);
  assert.strictEqual(r.monthlyPremium, 90 * 2 + 25 * 2);
});

test('Family -> 2 adults + $30 fee, applied exactly once', () => {
  const r = calculateQuote(quote({ cover_type: 'Family', applicant1_cover_history: 'Yes', applicant2_age: 40, applicant2_cover_history: 'Yes', hospital_cover: 'Basic', extras_cover: 'Basic' }));
  assert.strictEqual(r.adultCount, 2);
  assert.strictEqual(r.familyUpgradeFee, 30);
  assert.strictEqual(r.monthlyPremium, 90 * 2 + 25 * 2 + 30);
});

test('There is no couple/family discount — Couple is exactly 2x Single', () => {
  const single = calculateQuote(quote({ cover_type: 'Single', applicant1_cover_history: 'Yes', hospital_cover: 'Gold', extras_cover: 'Premium' }));
  const couple = calculateQuote(quote({ cover_type: 'Couple', applicant1_cover_history: 'Yes', applicant2_age: 40, applicant2_cover_history: 'Yes', hospital_cover: 'Gold', extras_cover: 'Premium' }));
  assert.strictEqual(couple.monthlyPremium, single.monthlyPremium * 2);
});

test('Single ignores any stray applicant 2 data', () => {
  const r = calculateQuote(quote({ cover_type: 'Single', applicant2_age: 99, applicant2_cover_history: 'No' }));
  assert.strictEqual(r.applicants.length, 1);
});

// ---------------------------------------------------------------------------
section('Price tables (Section 5)');

const hospitalTiers = { None: 0, Basic: 90, Bronze: 120, Silver: 160, Gold: 220 };
Object.entries(hospitalTiers).forEach(([tier, price]) => {
  test(`Hospital ${tier} = $${price}/adult/month`, () => {
    const r = calculateQuote(quote({ hospital_cover: tier, extras_cover: 'None', applicant1_cover_history: 'Yes' }));
    assert.strictEqual(r.monthlyPremium, price);
  });
});

const extrasTiers = { None: 0, Basic: 25, Standard: 45, Premium: 70 };
Object.entries(extrasTiers).forEach(([tier, price]) => {
  test(`Extras ${tier} = $${price}/adult/month`, () => {
    const r = calculateQuote(quote({ hospital_cover: 'None', extras_cover: tier, applicant1_cover_history: 'Yes' }));
    assert.strictEqual(r.monthlyPremium, price);
  });
});

// ---------------------------------------------------------------------------
section('Annual discount (Yearly only)');

test('Monthly payment: discount is ignored entirely', () => {
  const r = calculateQuote(quote({ payment_frequency: 'Monthly', annual_discount: 10, applicant1_cover_history: 'Yes' }));
  assert.strictEqual(r.annualDiscountPercent, 0);
  assert.strictEqual(r.annualDiscountAmount, 0);
  assert.strictEqual(r.yearlyAfterDiscount, null);
});

test('Monthly payment: final total is the monthly premium', () => {
  const r = calculateQuote(quote({ payment_frequency: 'Monthly', applicant1_cover_history: 'Yes' }));
  assert.strictEqual(r.finalTotal, r.monthlyPremium);
});

test('Yearly with 0% discount: after == before', () => {
  const r = calculateQuote(quote({ payment_frequency: 'Yearly', annual_discount: 0, applicant1_cover_history: 'Yes' }));
  assert.strictEqual(r.yearlyAfterDiscount, r.yearlyBeforeDiscount);
});

test('Yearly with 10% discount: after == before x 0.9', () => {
  const r = calculateQuote(quote({ payment_frequency: 'Yearly', annual_discount: 10, applicant1_cover_history: 'Yes' }));
  assert.strictEqual(r.yearlyAfterDiscount, Math.round(r.yearlyBeforeDiscount * 0.9 * 100) / 100);
});

test('Yearly payment: final total is the discounted yearly figure', () => {
  const r = calculateQuote(quote({ payment_frequency: 'Yearly', annual_discount: 8, applicant1_cover_history: 'Yes' }));
  assert.strictEqual(r.finalTotal, r.yearlyAfterDiscount);
});

test('Yearly before discount is always monthly x 12', () => {
  const r = calculateQuote(quote({ payment_frequency: 'Yearly', annual_discount: 7 }));
  assert.strictEqual(r.yearlyBeforeDiscount, Math.round(r.monthlyPremium * 12 * 100) / 100);
});

// ---------------------------------------------------------------------------
section('"Not sure" warnings (Section 6 & 9)');

test('One "Not sure" applicant -> exactly one warning', () => {
  const r = calculateQuote(quote({ applicant1_cover_history: 'Not sure' }));
  assert.strictEqual(r.warnings.length, 1);
  assert.match(r.warnings[0], /^Applicant 1: Cover history is unknown/);
});

test('Two "Not sure" applicants -> one warning each, numbered', () => {
  const r = calculateQuote(quote({ cover_type: 'Couple', applicant1_cover_history: 'Not sure', applicant2_age: 50, applicant2_cover_history: 'Not sure' }));
  assert.strictEqual(r.warnings.length, 2);
  assert.match(r.warnings[0], /^Applicant 1:/);
  assert.match(r.warnings[1], /^Applicant 2:/);
});

test('Warning text matches the wording in the brief', () => {
  const r = calculateQuote(quote({ applicant1_cover_history: 'Not sure' }));
  assert.strictEqual(
    r.warnings[0],
    'Applicant 1: Cover history is unknown — LHC loading has not been applied. This quote may be inaccurate.'
  );
});

test('No warnings when both histories are known', () => {
  const r = calculateQuote(quote({ cover_type: 'Couple', applicant1_cover_history: 'Yes', applicant2_age: 50, applicant2_cover_history: 'No' }));
  assert.strictEqual(r.warnings.length, 0);
});

// ---------------------------------------------------------------------------
section('Rounding and money safety');

test('No floating point drift: 5664 x 0.95 = 5380.8 exactly', () =>
  assert.strictEqual(worked.yearlyAfterDiscount, 5380.8));

test('Odd loading rounds to 2dp: age 33, Bronze -> $120 x 1.06 = $127.20', () => {
  const r = calculateQuote(quote({ applicant1_age: 33, hospital_cover: 'Bronze', extras_cover: 'None' }));
  assert.strictEqual(r.applicants[0].hospitalPremium, 127.2);
});

test('Maximum realistic quote (age 100, Gold, Premium, Family) stays finite', () => {
  const r = calculateQuote(quote({ cover_type: 'Family', applicant1_age: 100, applicant1_cover_history: 'No', applicant2_age: 100, applicant2_cover_history: 'No', hospital_cover: 'Gold', extras_cover: 'Premium', payment_frequency: 'Yearly', annual_discount: 10 }));
  assert.strictEqual(r.applicants[0].lhcLoadingPercent, 140); // (100-30) x 2%
  assert.ok(Number.isFinite(r.yearlyAfterDiscount));
});

test('Zero-cost quote (None/None) is $0, not NaN', () => {
  const r = calculateQuote(quote({ hospital_cover: 'None', extras_cover: 'None' }));
  assert.strictEqual(r.monthlyPremium, 0);
  assert.strictEqual(r.yearlyBeforeDiscount, 0);
});

// ---------------------------------------------------------------------------
console.log(`\n================ ${pass} passed, ${fail} failed ================\n`);
process.exit(fail === 0 ? 0 : 1);
