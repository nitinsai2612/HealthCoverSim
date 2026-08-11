// Quote calculation engine. All pricing logic lives here.

// Price tables (per adult, per month)

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

const FAMILY_UPGRADE_FEE = 30;

const ADULT_COUNT = {
  Single: 1,
  Couple: 2,
  Family: 2,
};

const LHC_STATEMENT =
  'Lifetime Health Cover loading applies only to hospital cover. It does not apply to extras cover.';

// Helpers

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateLhcLoading(age, coverHistory, hospitalCover) {
  if (!hospitalCover || hospitalCover === 'None') return 0;

  if (coverHistory === 'Yes') return 0;
  if (coverHistory === 'Not sure') return 0;

  if (coverHistory === 'No') {
    const numericAge = Number(age);
    if (!Number.isFinite(numericAge)) return 0;
    if (numericAge <= 30) return 0;
    return (numericAge - 30) * 0.02;
  }

  return 0;
}

// Main calculation

function calculateQuote(quote) {
  const coverType = quote.cover_type;
  const hospitalCover = quote.hospital_cover;
  const extrasCover = quote.extras_cover;
  const paymentFrequency = quote.payment_frequency;

  const adultCount = ADULT_COUNT[coverType] || 1;
  const hospitalBase = HOSPITAL_PRICES[hospitalCover] ?? 0;
  const extrasBase = EXTRAS_PRICES[extrasCover] ?? 0;

  // Per-applicant hospital premium. LHC loading applies here only.
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
      lhcLoadingPercent: round2(loading * 100),
      hospitalBasePrice: round2(hospitalBase),
      hospitalPremium: premium,
    });

    if (history === 'Not sure') {
      warnings.push(
        `Applicant ${i}: Cover history is unknown. LHC loading has not been applied. This quote may be inaccurate.`
      );
    }
  }

  // Totals

  const hospitalTotal = round2(applicants.reduce((sum, a) => sum + a.hospitalPremium, 0));
  const extrasTotal = round2(extrasBase * adultCount);
  const familyUpgradeFee = coverType === 'Family' ? FAMILY_UPGRADE_FEE : 0;

  const monthlyPremium = round2(hospitalTotal + extrasTotal + familyUpgradeFee);
  const yearlyBeforeDiscount = round2(monthlyPremium * 12);

  // Annual discount applies only when paying Yearly

  const isYearly = paymentFrequency === 'Yearly';
  const discountPercent = isYearly ? Number(quote.annual_discount) || 0 : 0;
  const discountAmount = isYearly ? round2(yearlyBeforeDiscount * (discountPercent / 100)) : 0;
  const yearlyAfterDiscount = isYearly
    ? round2(yearlyBeforeDiscount * (1 - discountPercent / 100))
    : null;

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
