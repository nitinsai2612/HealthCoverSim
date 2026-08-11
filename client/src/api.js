const BASE = '/api';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('Could not reach the server. Is the backend running on http://localhost:4000?');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error((data && data.error) || `Request failed (${response.status}).`);
    error.fieldErrors = (data && data.errors) || {};
    error.status = response.status;
    throw error;
  }
  return data;
}

export const getOptions = () => request('/options');
export const listQuotes = () => request('/quotes');
export const getQuote = (id) => request(`/quotes/${id}`);
export const previewQuote = (body) => request('/quotes/preview', { method: 'POST', body: JSON.stringify(body) });
export const createQuote = (body) => request('/quotes', { method: 'POST', body: JSON.stringify(body) });
export const updateQuote = (id, body) => request(`/quotes/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteQuote = (id) => request(`/quotes/${id}`, { method: 'DELETE' });
