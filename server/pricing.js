/*
 * pricing.js — HealthCoverSim quote calculation engine
 * ----------------------------------------------------
 * All pricing logic lives in this ONE file so the numbers can never
 * disagree between the list page, the detail page and the API.
 *
 * Rules implemented (Assignment Section 5 & 6):
 *   hospital (per adult) = tier price x (1 + that adult's LHC loading)
 *   hospital total       = sum over adults (1 for Single, 2 for Couple/Family)
 *   extras total         = extras tier price x adult count
 *   family fee           = $30 if Family, else $0
 *   monthly premium      = hospital total + extras total + family fee
 *   yearly before disc.  = monthly premium x 12
 *   yearly after disc.   = yearly before x (1 - annual discount)   [Yearly only]
 */

// ---- Price tables (per adult, per month) --------------------------------
const HOSPITAL_PRICES = {
  None: 0,
  Basic: 90,
  Bronze: 120,
  Silver: 160,
  Gold: 220,
};

const EXTRAS_PRICES = {
  None: 0,
  Basic: 25,
  Standard: 45,
  Premium: 70,
};

const FAMILY_UPGRADE_FEE = 30; // per month, flat, Family only

const ADULT_COUNT = {
  Single: 1,
  Couple: 2,
  Family: 2, // 2 adults + the flat family fee; children are not priced individually
};

// The exact statement the assignment requires on every explanation sheet.
const LHC_STATEMENT =
  'Lifetime Health Cover loading applies only to hospital cover. It does not apply to extras cover.';

// ---- Helpers -------------------------------------------------------------

/** Round to 2 decimal places, avoiding floating point drift (5380.799999 -> 5380.8). */
function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Lifetime Health Cover loading for ONE applicant, as a decimal (0.20 = 20%).
 *
 *   history "Yes"      -> 0%  (they already held cover)
 *   history "No"       -> (age - 30) x 2%, ONLY if age > 30
 *   history "Not sure" -> 0%  (never guess) + a warning is raised
 *   hospital = "None"  -> 0%  (there is no hospital premium to load)
 */
function calculateLhcLoading(age, coverHistory, hospitalCover) {
  // No hospital cover selected => nothing to load. This also guarantees that
  // an extras-only quote is never loaded.
  if (!hospitalCover || hospitalCover === 'None') return 0;

  if (coverHistory === 'Yes') return 0;
  if (coverHistory === 'Not sure') return 0; // do not auto-apply; warn instead

  if (coverHistory === 'No') {
    const numericAge = Number(age);
    if (!Number.isFinite(numericAge)) return 0;
    if (numericAge <= 30) return 0;
    return (numericAge - 30) * 0.02;
  }

  return 0;
}

// ---- Main calculation ----------------------------------------------------

/**
 * Build the full premium breakdown for a quote record.
 * Assumes the record has already passed validation.
 *
 * @param {object} quote - the stored quote row / form values
 * @returns {object} breakdown used by the explanation sheet
 */
function calculateQuote(quote) {
  const coverType = quote.cover_type;
  const hospitalCover = quote.hospital_cover;
  const extrasCover = quote.extras_cover;
  const paymentFrequency = quote.payment_frequency;

  const adultCount = ADULT_COUNT[coverType] || 1;
  const hospitalBase = HOSPITAL_PRICES[hospitalCover] ?? 0;
  const extrasBase = EXTRAS_PRICES[extrasCover] ?? 0;

  // --- Per-applicant hospital premium (LHC loading applies here only) -----
  const applicants = [];
  const warnings = [];

  for (let i = 1; i <= adultCount; i += 1) {
    const age = i === 1 ? Number(quote.applicant1_age) : Number(quote.applicant2_age);
    const history = i === 1 ? quote.applicant1_cover_history : quote.applicant2_cover_history;

    const loading = calculateLhcLoading(age, history, hospitalCover);
    const premium = round2(hospitalBase * (1 + loading));

    applicants.push({
      applicant: i,
      age,
      coverHistory: history,
      lhcLoadingPercent: round2(loading * 100), // e.g. 20 means 20%
      hospitalBasePrice: round2(hospitalBase),
      hospitalPremium: premium,
    });

    if (history === 'Not sure') {
      warnings.push(
        `Applicant ${i}: Cover history is unknown — LHC loading has not been applied. This quote may be inaccurate.`
      );
    }
  }

  // --- Totals -------------------------------------------------------------
  const hospitalTotal = round2(applicants.reduce((sum, a) => sum + a.hospitalPremium, 0));
  const extrasTotal = round2(extrasBase * adultCount);
  const familyUpgradeFee = coverType === 'Family' ? FAMILY_UPGRADE_FEE : 0;

  const monthlyPremium = round2(hospitalTotal + extrasTotal + familyUpgradeFee);
  const yearlyBeforeDiscount = round2(monthlyPremium * 12);

  // --- Annual discount: ONLY when paying Yearly ---------------------------
  const isYearly = paymentFrequency === 'Yearly';
  const discountPercent = isYearly ? Number(quote.annual_discount) || 0 : 0;
  const discountAmount = isYearly ? round2(yearlyBeforeDiscount * (discountPercent / 100)) : 0;
  const yearlyAfterDiscount = isYearly
    ? round2(yearlyBeforeDiscount * (1 - discountPercent / 100))
    : null;

  // The single figure the customer actually pays.
  const finalTotal = isYearly ? yearlyAfterDiscount : monthlyPremium;

  return {
    coverType,
    adultCount,
    paymentFrequency,

    hospitalCover,
    hospitalBasePricePerAdult: round2(hospitalBase),
    extrasCover,
    extrasBasePricePerAdult: round2(extrasBase),

    applicants,

    hospitalTotal,
    extrasTotal,
    familyUpgradeFee,

    monthlyPremium,
    yearlyBeforeDiscount,

    isYearly,
    annualDiscountPercent: discountPercent,
    annualDiscountAmount: discountAmount,
    yearlyAfterDiscount,

    finalTotal,
    finalTotalLabel: isYearly ? 'Total payable per year' : 'Total payable per month',

    warnings,
    lhcStatement: LHC_STATEMENT,
  };
}

module.exports = {
  calculateQuote,
  calculateLhcLoading,
  round2,
  HOSPITAL_PRICES,
  EXTRAS_PRICES,
  FAMILY_UPGRADE_FEE,
  ADULT_COUNT,
  LHC_STATEMENT,
};
