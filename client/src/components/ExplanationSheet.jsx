import { formatMoney } from '../constants.js';

export default function ExplanationSheet({ breakdown }) {
  if (!breakdown) return null;

  const {
    coverType, adultCount, paymentFrequency,
    hospitalCover, hospitalBasePricePerAdult,
    extrasCover, extrasBasePricePerAdult,
    applicants, hospitalTotal, extrasTotal, familyUpgradeFee,
    monthlyPremium, yearlyBeforeDiscount,
    isYearly, annualDiscountPercent, annualDiscountAmount, yearlyAfterDiscount,
    finalTotal, finalTotalLabel, warnings, lhcStatement,
  } = breakdown;

  return (
    <section className="sheet" aria-label="Quote explanation sheet">
      <h2>Explanation sheet</h2>

      <div className="estimates">
        <div className="estimate">
          <span className="estimate__label">Estimated monthly premium</span>
          <span className="estimate__value">{formatMoney(monthlyPremium)}</span>
          <span className="estimate__note">per month</span>
        </div>
        <div className="estimate">
          <span className="estimate__label">Yearly premium before discount</span>
          <span className="estimate__value">{formatMoney(yearlyBeforeDiscount)}</span>
          <span className="estimate__note">{formatMoney(monthlyPremium)} x 12 months</span>
        </div>
        {isYearly ? (
          <div className="estimate estimate--highlight">
            <span className="estimate__label">Yearly premium after {annualDiscountPercent}% discount</span>
            <span className="estimate__value">{formatMoney(yearlyAfterDiscount)}</span>
            <span className="estimate__note">saves {formatMoney(annualDiscountAmount)}</span>
          </div>
        ) : (
          <div className="estimate estimate--muted">
            <span className="estimate__label">Annual discount</span>
            <span className="estimate__value">Not applied</span>
            <span className="estimate__note">only available when paying yearly</span>
          </div>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="warning-box" role="alert">
          <strong>Please note</strong>
          <ul>
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      )}

      <h3>How this quote is built</h3>
      <table className="breakdown">
        <caption className="visually-hidden">Premium breakdown by line item</caption>
        <thead>
          <tr>
            <th scope="col">Line item</th>
            <th scope="col">Detail</th>
            <th scope="col" className="numeric">Amount / month</th>
          </tr>
        </thead>
        <tbody>
          {applicants.map((a) => (
            <tr key={`hospital-${a.applicant}`}>
              <th scope="row">Hospital - Applicant {a.applicant}</th>
              <td>
                {hospitalCover === 'None' ? (
                  <>No hospital cover selected</>
                ) : (
                  <>
                    {hospitalCover} at {formatMoney(hospitalBasePricePerAdult)}
                    {' '}x (1 + {a.lhcLoadingPercent}% LHC loading)
                  </>
                )}
                <span className="muted"> · age {a.age}, prior cover: {a.coverHistory}</span>
              </td>
              <td className="numeric">{formatMoney(a.hospitalPremium)}</td>
            </tr>
          ))}
          <tr className="subtotal">
            <th scope="row">Hospital premium</th>
            <td>{adultCount === 1 ? '1 adult' : `${adultCount} adults added together`}</td>
            <td className="numeric">{formatMoney(hospitalTotal)}</td>
          </tr>

          <tr>
            <th scope="row">Extras premium</th>
            <td>
              {extrasCover === 'None'
                ? 'No extras cover selected'
                : <>{extrasCover} at {formatMoney(extrasBasePricePerAdult)} x {adultCount} adult{adultCount > 1 ? 's' : ''}</>}
              <span className="muted"> · no LHC loading applied</span>
            </td>
            <td className="numeric">{formatMoney(extrasTotal)}</td>
          </tr>

          {coverType === 'Family' && (
            <tr>
              <th scope="row">Family upgrade fee</th>
              <td>Flat add-on for Family cover - covers dependent children</td>
              <td className="numeric">{formatMoney(familyUpgradeFee)}</td>
            </tr>
          )}

          <tr className="total">
            <th scope="row">Monthly premium</th>
            <td>Hospital + extras{coverType === 'Family' ? ' + family fee' : ''}</td>
            <td className="numeric">{formatMoney(monthlyPremium)}</td>
          </tr>
        </tbody>
      </table>

      <h3>Yearly figures</h3>
      <table className="breakdown">
        <tbody>
          <tr>
            <th scope="row">Yearly before discount</th>
            <td>{formatMoney(monthlyPremium)} x 12</td>
            <td className="numeric">{formatMoney(yearlyBeforeDiscount)}</td>
          </tr>
          {isYearly ? (
            <>
              <tr>
                <th scope="row">Annual-payment discount</th>
                <td>{annualDiscountPercent}% off the yearly total</td>
                <td className="numeric">− {formatMoney(annualDiscountAmount)}</td>
              </tr>
              <tr className="total">
                <th scope="row">Yearly after discount</th>
                <td>{formatMoney(yearlyBeforeDiscount)} x (1 − {annualDiscountPercent / 100})</td>
                <td className="numeric">{formatMoney(yearlyAfterDiscount)}</td>
              </tr>
            </>
          ) : (
            <tr>
              <th scope="row">Annual-payment discount</th>
              <td colSpan={2}>
                Not applied - this customer pays <strong>Monthly</strong>. The discount is only
                available when paying yearly.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>Lifetime Health Cover (LHC) loading</h3>
      <table className="breakdown">
        <thead>
          <tr>
            <th scope="col">Applicant</th>
            <th scope="col">Age</th>
            <th scope="col">Prior hospital cover</th>
            <th scope="col" className="numeric">LHC loading</th>
          </tr>
        </thead>
        <tbody>
          {applicants.map((a) => (
            <tr key={`lhc-${a.applicant}`}>
              <th scope="row">Applicant {a.applicant}</th>
              <td>{a.age}</td>
              <td>{a.coverHistory}</td>
              <td className="numeric">{a.lhcLoadingPercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="statement">{lhcStatement}</p>

      <h3>In plain English</h3>
      <p className="plain">
        This is a <strong>{coverType}</strong> policy, so we price{' '}
        <strong>{adultCount} adult{adultCount > 1 ? 's' : ''}</strong>
        {coverType === 'Family' && ' (children are covered by the flat family fee rather than priced individually)'}.
        {' '}Hospital and extras are two separate covers, so we work them out separately and then add them together.
      </p>
      <p className="plain">
        {hospitalCover === 'None'
          ? 'No hospital cover was selected, so the hospital part of this quote is $0 and no LHC loading can apply.'
          : `Hospital cover is ${hospitalCover} at ${formatMoney(hospitalBasePricePerAdult)} per adult per month. ` +
            applicants
              .map((a) => `Applicant ${a.applicant} ${a.lhcLoadingPercent > 0 ? `pays a ${a.lhcLoadingPercent}% LHC loading, bringing their hospital premium to ${formatMoney(a.hospitalPremium)}` : `has no LHC loading, so their hospital premium stays at ${formatMoney(a.hospitalPremium)}`}`)
              .join('; ') +
            `. Added together that is ${formatMoney(hospitalTotal)} per month.`}
      </p>
      <p className="plain">
        {extrasCover === 'None'
          ? 'No extras cover was selected, so the extras part of this quote is $0.'
          : `Extras cover is ${extrasCover} at ${formatMoney(extrasBasePricePerAdult)} per adult per month, which is ${formatMoney(extrasTotal)} for ${adultCount} adult${adultCount > 1 ? 's' : ''}. LHC loading is never added to extras.`}
        {coverType === 'Family' && ` The ${formatMoney(familyUpgradeFee)} family upgrade fee is then added once.`}
      </p>
      <p className="plain">
        That gives a monthly premium of <strong>{formatMoney(monthlyPremium)}</strong>, which is{' '}
        <strong>{formatMoney(yearlyBeforeDiscount)}</strong> over twelve months.
        {isYearly
          ? ` Because this customer pays yearly, a ${annualDiscountPercent}% annual-payment discount comes off that total, saving ${formatMoney(annualDiscountAmount)} and bringing the yearly cost to ${formatMoney(yearlyAfterDiscount)}.`
          : ' Because this customer pays monthly, no annual-payment discount is applied.'}
      </p>

      <div className="final-total">
        <span>{finalTotalLabel}</span>
        <strong>{formatMoney(finalTotal)}</strong>
      </div>

      <p className="disclaimer">
        This is a learning simulator only. It is not financial advice and does not reflect any real
        insurer's pricing.
      </p>
    </section>
  );
}
