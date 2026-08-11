const COVER_TYPES = ['Single', 'Couple', 'Family'];
const HOSPITAL_LEVELS = ['None', 'Basic', 'Bronze', 'Silver', 'Gold'];
const EXTRAS_LEVELS = ['None', 'Basic', 'Standard', 'Premium'];
const COVER_HISTORIES = ['Yes', 'No', 'Not sure'];
const PAYMENT_FREQUENCIES = ['Monthly', 'Yearly'];

const MIN_AGE = 18;
const MAX_AGE = 100;
const MIN_DISCOUNT = 0;
const MAX_DISCOUNT = 10;

function isWholeNumberInRange(value, min, max) {
  if (value === null || value === undefined || value === '') return false;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) && n >= min && n <= max;
}

function validateQuote(body) {
  const errors = {};
  const data = body && typeof body === 'object' ? body : {};

  // Customer name
  const name = typeof data.customer_name === 'string' ? data.customer_name.trim() : '';
  if (!name) {
    errors.customer_name = 'Customer name is required.';
  } else if (name.length > 100) {
    errors.customer_name = 'Customer name must be 100 characters or fewer.';
  }

  // Cover type
  if (!COVER_TYPES.includes(data.cover_type)) {
    errors.cover_type = `Cover type is required and must be one of: ${COVER_TYPES.join(', ')}.`;
  }

  // Cover selections
  if (!HOSPITAL_LEVELS.includes(data.hospital_cover)) {
    errors.hospital_cover = `Hospital cover level is required and must be one of: ${HOSPITAL_LEVELS.join(', ')}.`;
  }
  if (!EXTRAS_LEVELS.includes(data.extras_cover)) {
    errors.extras_cover = `Extras cover level is required and must be one of: ${EXTRAS_LEVELS.join(', ')}.`;
  }

  // Applicant 1 (always required)
  if (!isWholeNumberInRange(data.applicant1_age, MIN_AGE, MAX_AGE)) {
    errors.applicant1_age = `Applicant 1 age is required and must be a whole number between ${MIN_AGE} and ${MAX_AGE}.`;
  }
  if (!COVER_HISTORIES.includes(data.applicant1_cover_history)) {
    errors.applicant1_cover_history = `Applicant 1 hospital cover history is required (${COVER_HISTORIES.join(' / ')}).`;
  }

  // Applicant 2 (required ONLY for Couple / Family)
  const needsApplicant2 = data.cover_type === 'Couple' || data.cover_type === 'Family';
  if (needsApplicant2) {
    if (!isWholeNumberInRange(data.applicant2_age, MIN_AGE, MAX_AGE)) {
      errors.applicant2_age = `Applicant 2 age is required for ${data.cover_type} cover and must be a whole number between ${MIN_AGE} and ${MAX_AGE}.`;
    }
    if (!COVER_HISTORIES.includes(data.applicant2_cover_history)) {
      errors.applicant2_cover_history = `Applicant 2 hospital cover history is required for ${data.cover_type} cover (${COVER_HISTORIES.join(' / ')}).`;
    }
  }

  // Payment frequency
  if (!PAYMENT_FREQUENCIES.includes(data.payment_frequency)) {
    errors.payment_frequency = `Payment frequency is required and must be one of: ${PAYMENT_FREQUENCIES.join(', ')}.`;
  }

  // Annual discount
  const discountProvided =
    data.annual_discount !== undefined && data.annual_discount !== null && data.annual_discount !== '';
  if (discountProvided) {
    const d = Number(data.annual_discount);
    if (!Number.isFinite(d) || d < MIN_DISCOUNT || d > MAX_DISCOUNT) {
      errors.annual_discount = `Annual discount must be a number between ${MIN_DISCOUNT}% and ${MAX_DISCOUNT}%.`;
    }
  } else if (data.payment_frequency === 'Yearly') {
    errors.annual_discount = `Annual discount is required when paying Yearly (${MIN_DISCOUNT}-${MAX_DISCOUNT}%). Enter 0 for no discount.`;
  }

  // Notes (optional)
  if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
    errors.notes = 'Notes must be text.';
  } else if (typeof data.notes === 'string' && data.notes.length > 500) {
    errors.notes = 'Notes must be 500 characters or fewer.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function normaliseQuote(data) {
  const needsApplicant2 = data.cover_type === 'Couple' || data.cover_type === 'Family';
  return {
    customer_name: String(data.customer_name).trim(),
    cover_type: data.cover_type,
    applicant1_age: Number(data.applicant1_age),
    applicant1_cover_history: data.applicant1_cover_history,
    applicant2_age: needsApplicant2 ? Number(data.applicant2_age) : null,
    applicant2_cover_history: needsApplicant2 ? data.applicant2_cover_history : null,
    hospital_cover: data.hospital_cover,
    extras_cover: data.extras_cover,
    payment_frequency: data.payment_frequency,
    annual_discount:
      data.annual_discount === undefined || data.annual_discount === null || data.annual_discount === ''
        ? 0
        : Number(data.annual_discount),
    notes: typeof data.notes === 'string' && data.notes.trim() !== '' ? data.notes.trim() : null,
  };
}

module.exports = {
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
};
