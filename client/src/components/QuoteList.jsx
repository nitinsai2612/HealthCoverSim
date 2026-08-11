import { formatMoney } from '../constants.js';

export default function QuoteList({ quotes, loading, error, onView, onEdit, onDelete, onCreate, onRetry }) {
  if (loading) return <div className="card"><p>Loading quotes...</p></div>;

  if (error) {
    return (
      <div className="card">
        <div className="alert alert--error" role="alert">{error}</div>
        <button type="button" className="btn" onClick={onRetry}>Try again</button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__header">
        <h2>Saved quotes <span className="count">({quotes.length})</span></h2>
        <button type="button" className="btn btn--primary" onClick={onCreate}>+ New quote</button>
      </div>

      {quotes.length === 0 ? (
        <p className="empty">No quotes yet. Choose <strong>New quote</strong> to create your first one.</p>
      ) : (
        <div className="table-scroll">
          <table className="list">
            <caption className="visually-hidden">All saved quotes</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Customer</th>
                <th scope="col">Cover</th>
                <th scope="col">Hospital</th>
                <th scope="col">Extras</th>
                <th scope="col">Pays</th>
                <th scope="col" className="numeric">Monthly</th>
                <th scope="col" className="numeric">Yearly</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td>{q.id}</td>
                  <td>
                    <button type="button" className="link" onClick={() => onView(q.id)}>{q.customer_name}</button>
                    {q.hasWarnings && <span className="pill pill--warn" title="This quote has a warning">!</span>}
                  </td>
                  <td>{q.cover_type}</td>
                  <td>{q.hospital_cover}</td>
                  <td>{q.extras_cover}</td>
                  <td>{q.payment_frequency}</td>
                  <td className="numeric">{formatMoney(q.monthlyPremium)}</td>
                  <td className="numeric">
                    {q.payment_frequency === 'Yearly'
                      ? formatMoney(q.yearlyAfterDiscount)
                      : formatMoney(q.yearlyBeforeDiscount)}
                  </td>
                  <td className="row-actions">
                    <button type="button" className="btn btn--small" onClick={() => onView(q.id)}>View</button>
                    <button type="button" className="btn btn--small" onClick={() => onEdit(q.id)}>Edit</button>
                    <button type="button" className="btn btn--small btn--danger" onClick={() => onDelete(q)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
