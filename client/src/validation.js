/*
 * validation.js (frontend) — mirrors the backend rules in server/validation.js
 * so the user is told what is wrong before anything is sent.
 */

import { COVER_TYPES, HOSPITAL_LEVELS, EXTRAS_LEVELS, COVER_HISTORIES, PAYMENT_FREQUENCIES, MIN_AGE, MAX_AGE, MIN_DISCOUNT, MAX_DISCOUNT, needsApplicant2 } from './constants.js';

const isWholeNumberInRange = (value, min, max) => {
  if (value === null || value === undefined || String(value).trim() === '') return false;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) && n >= min && n <= max;
};

/**
 * @returns {object} errors keyed by field name — empty object means valid.
 */
export function validateQuoteForm(values) {
  const errors = {};

  if (!values.customer_name || !values.customer_name.trim()) {
    errors.customer_name = 'Please enter the customer name.';
  } else if (values.customer_name.trim().length > 100) {
    errors.customer_name = 'Customer name must be 100 characters or fewer.';
  }

  if (!COVER_TYPES.includes(values.cover_type)) {
    errors.cover_type = 'Please choose a cover type.';
  }

  if (!isWholeNumberInRange(values.applicant1_age, MIN_AGE, MAX_AGE)) {
    errors.applicant1_age = `Enter a whole number between ${MIN_AGE} and ${MAX_AGE}.`;
  }
  if (!COVER_HISTORIES.includes(values.applicant1_cover_history)) {
    errors.applicant1_cover_history = 'Please choose Applicant 1’s hospital cover history.';
  }

  // Applicant 2 is only required for Couple and Family cover.
  if (needsApplicant2(values.cover_type)) {
    if (!isWholeNumberInRange(values.applicant2_age, MIN_AGE, MAX_AGE)) {
      errors.applicant2_age = `Applicant 2 age is required for ${values.cover_type} cover — a whole number between ${MIN_AGE} and ${MAX_AGE}.`;
    }
    if (!COVER_HISTORIES.includes(values.applicant2_cover_history)) {
      errors.applicant2_cover_history = `Applicant 2 hospital cover history is required for ${values.cover_type} cover.`;
    }
  }

  if (!HOSPITAL_LEVELS.includes(values.hospital_cover)) {
    errors.hospital_cover = 'Please choose a hospital cover level (choose None if not required).';
  }
  if (!EXTRAS_LEVELS.includes(values.extras_cover)) {
    errors.extras_cover = 'Please choose an extras cover level (choose None if not required).';
  }
  if (!PAYMENT_FREQUENCIES.includes(values.payment_frequency)) {
    errors.payment_frequency = 'Please choose a payment frequency.';
  }

  const discountText = String(values.annual_discount ?? '').trim();
  if (discountText === '') {
    if (values.payment_frequency === 'Yearly') {
      errors.annual_discount = `Enter the annual discount (${MIN_DISCOUNT}–${MAX_DISCOUNT}%). Enter 0 for no discount.`;
    }
  } else {
    const d = Number(discountText);
    if (!Number.isFinite(d) || d < MIN_DISCOUNT || d > MAX_DISCOUNT) {
      errors.annual_discount = `Discount must be between ${MIN_DISCOUNT}% and ${MAX_DISCOUNT}%.`;
    }
  }

  if (values.notes && values.notes.length > 500) {
    errors.notes = 'Notes must be 500 characters or fewer.';
  }

  return errors;
}

/** Convert form strings into the JSON types the API expects. */
export function toPayload(values) {
  const twoAdults = needsApplicant2(values.cover_type);
  return {
    customer_name: values.customer_name.trim(),
    cover_type: values.cover_type,
    applicant1_age: Number(values.applicant1_age),
    applicant1_cover_history: values.applicant1_cover_history,
    applicant2_age: twoAdults ? Number(values.applicant2_age) : null,
    applicant2_cover_history: twoAdults ? values.applicant2_cover_history : null,
    hospital_cover: values.hospital_cover,
    extras_cover: values.extras_cover,
    payment_frequency: values.payment_frequency,
    annual_discount: String(values.annual_discount).trim() === '' ? 0 : Number(values.annual_discount),
    notes: values.notes && values.notes.trim() !== '' ? values.notes.trim() : null,
  };
}

/** Turn a saved database row back into form field strings. */
export function toFormValues(quote) {
  return {
    customer_name: quote.customer_name ?? '',
    cover_type: quote.cover_type ?? 'Single',
    applicant1_age: quote.applicant1_age ?? '',
    applicant1_cover_history: quote.applicant1_cover_history ?? '',
    applicant2_age: quote.applicant2_age ?? '',
    applicant2_cover_history: quote.applicant2_cover_history ?? '',
    hospital_cover: quote.hospital_cover ?? '',
    extras_cover: quote.extras_cover ?? '',
    payment_frequency: quote.payment_frequency ?? 'Monthly',
    annual_discount: quote.annual_discount ?? '0',
    notes: quote.notes ?? '',
  };
}
