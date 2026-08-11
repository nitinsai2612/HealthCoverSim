/*
 * FormField.jsx — reusable form controls (Week 4: reusable components).
 * Every field gets a <label>, the right input type, and an inline error message.
 */

/** Wraps any control with its label, hint and error message. */
export function Field({ label, htmlFor, error, hint, required, children }) {
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {required && <span className="field__required" aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="field__hint">{hint}</p>}
      {error && <p className="field__error" role="alert">{error}</p>}
    </div>
  );
}

/** Single-line text input. */
export function TextInput({ id, value, onChange, error, ...rest }) {
  return (
    <input
      id={id}
      name={id}
      type="text"
      className="field__input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={error ? 'true' : 'false'}
      {...rest}
    />
  );
}

/** Number input with min/max/step so the browser helps too. */
export function NumberInput({ id, value, onChange, error, min, max, step = 1, ...rest }) {
  return (
    <input
      id={id}
      name={id}
      type="number"
      className="field__input"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={error ? 'true' : 'false'}
      {...rest}
    />
  );
}

/** Dropdown built from an array of options (strings, or {value,label} objects). */
export function SelectInput({ id, value, onChange, options, error, placeholder = 'Please choose…' }) {
  return (
    <select
      id={id}
      name={id}
      className="field__input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={error ? 'true' : 'false'}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => {
        const optValue = typeof opt === 'string' ? opt : opt.value;
        const optLabel = typeof opt === 'string' ? opt : opt.label;
        return (
          <option key={optValue} value={optValue}>
            {optLabel}
          </option>
        );
      })}
    </select>
  );
}

/** Radio group — used for the small either/or choices. */
export function RadioGroup({ id, value, onChange, options }) {
  return (
    <div className="radio-group" role="radiogroup" aria-labelledby={`${id}-label`}>
      {options.map((opt) => (
        <label key={opt} className={`radio ${value === opt ? 'radio--selected' : ''}`}>
          <input
            type="radio"
            name={id}
            value={opt}
            checked={value === opt}
            onChange={(e) => onChange(e.target.value)}
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
}

/** Multi-line notes field. */
export function TextArea({ id, value, onChange, rows = 3, ...rest }) {
  return (
    <textarea
      id={id}
      name={id}
      className="field__input field__input--textarea"
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  );
}
