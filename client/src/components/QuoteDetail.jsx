import ExplanationSheet from './ExplanationSheet.jsx';

export default function QuoteDetail({ quote, breakdown, loading, error, onBack, onEdit, onDelete }) {
  if (loading) return <div className="card"><p>Loading quote...</p></div>;

  if (error) {
    return (
      <div className="card">
        <div className="alert alert--error" role="alert">{error}</div>
        <button type="button" className="btn" onClick={onBack}>Back to list</button>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="detail-layout">
      <div className="card">
        <div className="card__header">
          <h2>{quote.customer_name}</h2>
          <div className="row-actions">
            <button type="button" className="btn" onClick={onBack}>Back to list</button>
            <button type="button" className="btn btn--primary" onClick={() => onEdit(quote.id)}>Edit</button>
            <button type="button" className="btn btn--danger" onClick={() => onDelete(quote)}>Delete</button>
          </div>
        </div>

        <h3>Quote inputs</h3>
        <table className="breakdown">
          <tbody>
            <tr><th scope="row">Quote reference</th><td>#{quote.id}</td></tr>
            <tr><th scope="row">Cover type</th><td>{quote.cover_type}</td></tr>
            <tr><th scope="row">Applicant 1</th><td>Age {quote.applicant1_age} · prior hospital cover: {quote.applicant1_cover_history}</td></tr>
            <tr>
              <th scope="row">Applicant 2</th>
              <td>
                {quote.applicant2_age === null || quote.applicant2_age === undefined
                  ? <span className="muted">Not applicable for Single cover</span>
                  : <>Age {quote.applicant2_age} · prior hospital cover: {quote.applicant2_cover_history}</>}
              </td>
            </tr>
            <tr><th scope="row">Hospital cover</th><td>{quote.hospital_cover}</td></tr>
            <tr><th scope="row">Extras cover</th><td>{quote.extras_cover}</td></tr>
            <tr><th scope="row">Payment frequency</th><td>{quote.payment_frequency}</td></tr>
            <tr>
              <th scope="row">Annual-payment discount</th>
              <td>
                {quote.annual_discount}%
                {quote.payment_frequency === 'Monthly' && <span className="muted"> - not applied, this customer pays monthly</span>}
              </td>
            </tr>
            <tr><th scope="row">Notes</th><td>{quote.notes ? quote.notes : <span className="muted">-</span>}</td></tr>
            <tr><th scope="row">Created</th><td>{quote.created_at}</td></tr>
          </tbody>
        </table>
      </div>

      <ExplanationSheet breakdown={breakdown} />
    </div>
  );
}
