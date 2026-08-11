/*
 * QuoteForm.jsx — used for BOTH creating a new quote and editing an existing one.
 * Applicant 2 fields are rendered only when Couple or Family is selected
 * (React conditional rendering).
 */

import { useEffect, useState } from 'react';
import { Field, TextInput, NumberInput, SelectInput, RadioGroup, TextArea } from './FormField.jsx';
import ExplanationSheet from './ExplanationSheet.jsx';
import { validateQuoteForm, toPayload } from '../validation.js';
import { previewQuote } from '../api.js';
import {
  COVER_TYPES, HOSPITAL_LEVELS, EXTRAS_LEVELS, COVER_HISTORIES, PAYMENT_FREQUENCIES,
  HOSPITAL_PRICES, EXTRAS_PRICES, MIN_AGE, MAX_AGE, MIN_DISCOUNT, MAX_DISCOUNT,
  EMPTY_QUOTE, needsApplicant2, priceLabel,
} from '../constants.js';

export default function QuoteForm({ mode = 'create', initialValues = EMPTY_QUOTE, onSubmit, onCancel, submitError, submitFieldErrors = {} }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const twoAdults = needsApplicant2(values.cover_type);
  const isYearly = values.payment_frequency === 'Yearly';

  // Update one field and clear its error as soon as the user edits it.
  const setField = (name) => (value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  // Re-validate live once the user has tried to submit at least once.
  useEffect(() => {
    if (touched) setErrors(validateQuoteForm(values));
  }, [values, touched]);

  // Live preview: whenever the form is valid, ask the backend for the figures.
  // This keeps ONE copy of the pricing logic (on the server).
  useEffect(() => {
    const problems = validateQuoteForm(values);
    if (Object.keys(problems).length > 0) {
      setPreview(null);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      previewQuote(toPayload(values))
        .then((data) => { if (!cancelled) setPreview(data.breakdown); })
        .catch(() => { if (!cancelled) setPreview(null); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [values]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    const problems = validateQuoteForm(values);
    setErrors(problems);
    if (Object.keys(problems).length > 0) {
      // Move focus to the first problem so the user can see it.
      const firstField = document.getElementById(Object.keys(problems)[0]);
      if (firstField) firstField.focus();
      return;
    }
    setSaving(true);
    try {
      await onSubmit(toPayload(values));
    } finally {
      setSaving(false);
    }
  };

  // Server-side field errors take priority (they are the authoritative check).
  const errorFor = (name) => submitFieldErrors[name] || errors[name];

  return (
    <div className="form-layout">
      <form className="card" onSubmit={handleSubmit} noValidate>
        <h2>{mode === 'edit' ? 'Edit quote' : 'Create a new quote'}</h2>
        <p className="card__intro">
          Fields marked <span className="field__required">*</span> are required. Ages must be between{' '}
          {MIN_AGE} and {MAX_AGE}.
        </p>

        {submitError && <div className="alert alert--error" role="alert">{submitError}</div>}

        {/* ---- Customer ------------------------------------------------- */}
        <fieldset className="group">
          <legend>Customer</legend>

          <Field label="Customer name" htmlFor="customer_name" required error={errorFor('customer_name')}>
            <TextInput
              id="customer_name"
              value={values.customer_name}
              onChange={setField('customer_name')}
              error={errorFor('customer_name')}
              placeholder="e.g. Jordan Smith"
              maxLength={100}
              autoComplete="name"
            />
          </Field>

          <Field
            label="Cover type"
            htmlFor="cover_type"
            required
            error={errorFor('cover_type')}
            hint="Couple and Family cover price two adults. Family adds a $30/month upgrade fee."
          >
            <RadioGroup id="cover_type" value={values.cover_type} onChange={setField('cover_type')} options={COVER_TYPES} />
          </Field>
        </fieldset>

        {/* ---- Applicant 1 ---------------------------------------------- */}
        <fieldset className="group">
          <legend>Applicant 1</legend>

          <Field label="Age" htmlFor="applicant1_age" required error={errorFor('applicant1_age')}>
            <NumberInput
              id="applicant1_age"
              value={values.applicant1_age}
              onChange={setField('applicant1_age')}
              error={errorFor('applicant1_age')}
              min={MIN_AGE}
              max={MAX_AGE}
              placeholder={`${MIN_AGE}–${MAX_AGE}`}
            />
          </Field>

          <Field
            label="Has held hospital cover before?"
            htmlFor="applicant1_cover_history"
            required
            error={errorFor('applicant1_cover_history')}
            hint="Used to work out Lifetime Health Cover loading."
          >
            <SelectInput
              id="applicant1_cover_history"
              value={values.applicant1_cover_history}
              onChange={setField('applicant1_cover_history')}
              options={COVER_HISTORIES}
              error={errorFor('applicant1_cover_history')}
            />
          </Field>
        </fieldset>

        {/* ---- Applicant 2: CONDITIONAL RENDERING ----------------------- */}
        {twoAdults && (
          <fieldset className="group group--conditional">
            <legend>Applicant 2 <span className="badge">required for {values.cover_type}</span></legend>

            <Field label="Age" htmlFor="applicant2_age" required error={errorFor('applicant2_age')}>
              <NumberInput
                id="applicant2_age"
                value={values.applicant2_age}
                onChange={setField('applicant2_age')}
                error={errorFor('applicant2_age')}
                min={MIN_AGE}
                max={MAX_AGE}
                placeholder={`${MIN_AGE}–${MAX_AGE}`}
              />
            </Field>

            <Field
              label="Has held hospital cover before?"
              htmlFor="applicant2_cover_history"
              required
              error={errorFor('applicant2_cover_history')}
            >
              <SelectInput
                id="applicant2_cover_history"
                value={values.applicant2_cover_history}
                onChange={setField('applicant2_cover_history')}
                options={COVER_HISTORIES}
                error={errorFor('applicant2_cover_history')}
              />
            </Field>
          </fieldset>
        )}

        {/* ---- Cover levels --------------------------------------------- */}
        <fieldset className="group">
          <legend>Cover levels</legend>

          <Field
            label="Hospital cover"
            htmlFor="hospital_cover"
            required
            error={errorFor('hospital_cover')}
            hint="Pays toward treatment as an admitted hospital patient. LHC loading applies here only."
          >
            <SelectInput
              id="hospital_cover"
              value={values.hospital_cover}
              onChange={setField('hospital_cover')}
              options={HOSPITAL_LEVELS.map((t) => ({ value: t, label: priceLabel(t, HOSPITAL_PRICES) }))}
              error={errorFor('hospital_cover')}
            />
          </Field>

          <Field
            label="Extras cover"
            htmlFor="extras_cover"
            required
            error={errorFor('extras_cover')}
            hint="Pays toward everyday services such as dental, optical and physio. Never loaded."
          >
            <SelectInput
              id="extras_cover"
              value={values.extras_cover}
              onChange={setField('extras_cover')}
              options={EXTRAS_LEVELS.map((t) => ({ value: t, label: priceLabel(t, EXTRAS_PRICES) }))}
              error={errorFor('extras_cover')}
            />
          </Field>
        </fieldset>

        {/* ---- Payment --------------------------------------------------- */}
        <fieldset className="group">
          <legend>Payment</legend>

          <Field label="Payment frequency" htmlFor="payment_frequency" required error={errorFor('payment_frequency')}>
            <RadioGroup
              id="payment_frequency"
              value={values.payment_frequency}
              onChange={setField('payment_frequency')}
              options={PAYMENT_FREQUENCIES}
            />
          </Field>

          <Field
            label="Annual-payment discount (%)"
            htmlFor="annual_discount"
            error={errorFor('annual_discount')}
            hint={isYearly
              ? `${MIN_DISCOUNT}–${MAX_DISCOUNT}% (3–8% typical). Enter 0 for no discount.`
              : 'Only applied when paying Yearly — this value is ignored for monthly payers.'}
          >
            <NumberInput
              id="annual_discount"
              value={values.annual_discount}
              onChange={setField('annual_discount')}
              error={errorFor('annual_discount')}
              min={MIN_DISCOUNT}
              max={MAX_DISCOUNT}
              step={0.5}
              disabled={!isYearly}
            />
          </Field>
        </fieldset>

        {/* ---- Notes ------------------------------------------------------ */}
        <fieldset className="group">
          <legend>Notes (optional)</legend>
          <Field label="Notes" htmlFor="notes" error={errorFor('notes')} hint="Anything you want to remember about this quote.">
            <TextArea id="notes" value={values.notes} onChange={setField('notes')} maxLength={500} />
          </Field>
        </fieldset>

        <div className="actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create quote'}
          </button>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </form>

      {/* ---- Live preview ------------------------------------------------ */}
      <aside className="preview">
        {preview ? (
          <ExplanationSheet breakdown={preview} />
        ) : (
          <div className="card preview__empty">
            <h2>Live estimate</h2>
            <p>Fill in every required field and your premium breakdown will appear here before you save.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
