import { useCallback, useEffect, useState } from 'react';
import QuoteList from './components/QuoteList.jsx';
import QuoteForm from './components/QuoteForm.jsx';
import QuoteDetail from './components/QuoteDetail.jsx';
import { listQuotes, getQuote, createQuote, updateQuote, deleteQuote } from './api.js';
import { EMPTY_QUOTE } from './constants.js';
import { toFormValues } from './validation.js';

export default function App() {
  const [view, setView] = useState('list');
  const [selectedId, setSelectedId] = useState(null);

  const [quotes, setQuotes] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [current, setCurrent] = useState(null); // { quote, breakdown }
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [submitError, setSubmitError] = useState('');
  const [submitFieldErrors, setSubmitFieldErrors] = useState({});
  const [flash, setFlash] = useState('');

  // Data loading

  const loadQuotes = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      setQuotes(await listQuotes());
    } catch (err) {
      setListError(err.message);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { loadQuotes(); }, [loadQuotes]);

  useEffect(() => {
    if ((view !== 'detail' && view !== 'edit') || selectedId === null) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError('');
    getQuote(selectedId)
      .then((data) => { if (!cancelled) setCurrent(data); })
      .catch((err) => { if (!cancelled) setDetailError(err.message); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [view, selectedId]);

  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(''), 4000);
    return () => clearTimeout(timer);
  }, [flash]);

  // Navigation helpers

  const clearSubmitErrors = () => { setSubmitError(''); setSubmitFieldErrors({}); };

  const goList = () => { setView('list'); setSelectedId(null); setCurrent(null); clearSubmitErrors(); };
  const goCreate = () => { setView('create'); setCurrent(null); clearSubmitErrors(); };
  const goDetail = (id) => { setView('detail'); setSelectedId(id); clearSubmitErrors(); };
  const goEdit = (id) => { setView('edit'); setSelectedId(id); clearSubmitErrors(); };

  // Actions

  const handleCreate = async (payload) => {
    clearSubmitErrors();
    try {
      const saved = await createQuote(payload);
      await loadQuotes();
      setFlash(`Quote #${saved.quote.id} created for ${saved.quote.customer_name}.`);
      goDetail(saved.quote.id);
    } catch (err) {
      setSubmitError(err.message);
      setSubmitFieldErrors(err.fieldErrors || {});
    }
  };

  const handleUpdate = async (payload) => {
    clearSubmitErrors();
    try {
      const saved = await updateQuote(selectedId, payload);
      await loadQuotes();
      setFlash(`Quote #${saved.quote.id} updated.`);
      goDetail(saved.quote.id);
    } catch (err) {
      setSubmitError(err.message);
      setSubmitFieldErrors(err.fieldErrors || {});
    }
  };

  const handleDelete = async (quote) => {
    const ok = window.confirm(`Delete the quote for ${quote.customer_name} (#${quote.id})? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteQuote(quote.id);
      await loadQuotes();
      setFlash(`Quote #${quote.id} deleted.`);
      goList();
    } catch (err) {
      setListError(err.message);
    }
  };

  // Render

  return (
    <div className="app">
      <header className="header">
        <div className="header__inner">
          <div>
            <h1>HealthCoverSim</h1>
            <p className="tagline">Private health insurance quote simulator</p>
          </div>
          <nav className="nav">
            <button type="button" className={`nav__btn ${view === 'list' ? 'nav__btn--active' : ''}`} onClick={goList}>
              All quotes
            </button>
            <button type="button" className={`nav__btn ${view === 'create' ? 'nav__btn--active' : ''}`} onClick={goCreate}>
              New quote
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        {flash && <div className="alert alert--success" role="status">{flash}</div>}

        {view === 'list' && (
          <QuoteList
            quotes={quotes}
            loading={listLoading}
            error={listError}
            onView={goDetail}
            onEdit={goEdit}
            onDelete={handleDelete}
            onCreate={goCreate}
            onRetry={loadQuotes}
          />
        )}

        {view === 'create' && (
          <QuoteForm
            mode="create"
            initialValues={EMPTY_QUOTE}
            onSubmit={handleCreate}
            onCancel={goList}
            submitError={submitError}
            submitFieldErrors={submitFieldErrors}
          />
        )}

        {view === 'detail' && (
          <QuoteDetail
            quote={current && current.quote}
            breakdown={current && current.breakdown}
            loading={detailLoading}
            error={detailError}
            onBack={goList}
            onEdit={goEdit}
            onDelete={handleDelete}
          />
        )}

        {view === 'edit' && (
          detailLoading ? (
            <div className="card"><p>Loading quote...</p></div>
          ) : detailError ? (
            <div className="card">
              <div className="alert alert--error" role="alert">{detailError}</div>
              <button type="button" className="btn" onClick={goList}>Back to list</button>
            </div>
          ) : current ? (
            <QuoteForm
              mode="edit"
              key={current.quote.id}
              initialValues={toFormValues(current.quote)}
              onSubmit={handleUpdate}
              onCancel={() => goDetail(current.quote.id)}
              submitError={submitError}
              submitFieldErrors={submitFieldErrors}
            />
          ) : null
        )}
      </main>

      <footer className="footer">
        <p>
          HealthCoverSim - CSE3CWA / CSE5006 Assignment 1. A learning simulator only:
          not financial advice, and not the pricing of any real insurer.
        </p>
      </footer>
    </div>
  );
}
