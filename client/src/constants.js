export const COVER_TYPES = ['Single', 'Couple', 'Family'];
export const HOSPITAL_LEVELS = ['None', 'Basic', 'Bronze', 'Silver', 'Gold'];
export const EXTRAS_LEVELS = ['None', 'Basic', 'Standard', 'Premium'];
export const COVER_HISTORIES = ['Yes', 'No', 'Not sure'];
export const PAYMENT_FREQUENCIES = ['Monthly', 'Yearly'];

export const HOSPITAL_PRICES = { None: 0, Basic: 90, Bronze: 120, Silver: 160, Gold: 220 };
export const EXTRAS_PRICES = { None: 0, Basic: 25, Standard: 45, Premium: 70 };

export const MIN_AGE = 18;
export const MAX_AGE = 100;
export const MIN_DISCOUNT = 0;
export const MAX_DISCOUNT = 10;

export const EMPTY_QUOTE = {
  customer_name: '',
  cover_type: 'Single',
  applicant1_age: '',
  applicant1_cover_history: '',
  applicant2_age: '',
  applicant2_cover_history: '',
  hospital_cover: '',
  extras_cover: '',
  payment_frequency: 'Monthly',
  annual_discount: '0',
  notes: '',
};

export const needsApplicant2 = (coverType) => coverType === 'Couple' || coverType === 'Family';

export function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return Number(value).toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const priceLabel = (tier, table) =>
  tier === 'None' ? 'None - $0' : `${tier} - $${table[tier]} / adult / month`;
