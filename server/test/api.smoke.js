/* API smoke test: exercises every endpoint + every edge case markers will probe. */
const app = require('../server');
const { ensureDatabaseReady } = require('../db');

const BASE = 'http://127.0.0.1:4100';
let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${extra}`); }
}
async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}
const valid = (o = {}) => ({
  customer_name: 'Test User', cover_type: 'Single',
  applicant1_age: 40, applicant1_cover_history: 'No',
  hospital_cover: 'Silver', extras_cover: 'Standard',
  payment_frequency: 'Monthly', annual_discount: 0, ...o,
});

(async () => {
  await new Promise((resolve, reject) => ensureDatabaseReady((e) => (e ? reject(e) : resolve())));
  const server = app.listen(4100);
  await new Promise((r) => server.once('listening', r));

  console.log('\n== Endpoints ==');
  check('GET /api/health -> 200', (await req('GET', '/api/health')).status === 200);
  check('GET /api/options -> 200', (await req('GET', '/api/options')).status === 200);
  const list = await req('GET', '/api/quotes');
  check('GET /api/quotes -> 200 array', list.status === 200 && Array.isArray(list.json));

  console.log('\n== Section 7 worked example (primary verification) ==');
  const we = await req('POST', '/api/quotes/preview', {
    customer_name: 'Worked Example', cover_type: 'Family',
    applicant1_age: 40, applicant1_cover_history: 'No',
    applicant2_age: 35, applicant2_cover_history: 'Yes',
    hospital_cover: 'Silver', extras_cover: 'Standard',
    payment_frequency: 'Yearly', annual_discount: 5,
  });
  const b = we.json.breakdown;
  check('Applicant 1 loading = 20%', b.applicants[0].lhcLoadingPercent === 20, b.applicants[0].lhcLoadingPercent);
  check('Applicant 1 hospital = $192', b.applicants[0].hospitalPremium === 192, b.applicants[0].hospitalPremium);
  check('Applicant 2 loading = 0%', b.applicants[1].lhcLoadingPercent === 0);
  check('Applicant 2 hospital = $160', b.applicants[1].hospitalPremium === 160);
  check('Hospital total = $352', b.hospitalTotal === 352, b.hospitalTotal);
  check('Extras total = $90', b.extrasTotal === 90, b.extrasTotal);
  check('Family fee = $30', b.familyUpgradeFee === 30);
  check('Monthly = $472', b.monthlyPremium === 472, b.monthlyPremium);
  check('Yearly before = $5664', b.yearlyBeforeDiscount === 5664, b.yearlyBeforeDiscount);
  check('Yearly after 5% = $5380.80', b.yearlyAfterDiscount === 5380.8, b.yearlyAfterDiscount);
  check('LHC statement present', b.lhcStatement === 'Lifetime Health Cover loading applies only to hospital cover. It does not apply to extras cover.');

  console.log('\n== CRUD end-to-end ==');
  const created = await req('POST', '/api/quotes', valid({ customer_name: 'CRUD Alice' }));
  check('POST create -> 201', created.status === 201, created.status);
  const id = created.json && created.json.quote && created.json.quote.id;
  check('Single stores NULL applicant 2', created.json.quote.applicant2_age === null && created.json.quote.applicant2_cover_history === null);
  const read = await req('GET', `/api/quotes/${id}`);
  check('GET detail -> 200 with breakdown', read.status === 200 && !!read.json.breakdown);
  const upd = await req('PUT', `/api/quotes/${id}`, valid({ customer_name: 'CRUD Alice Updated', hospital_cover: 'Gold' }));
  check('PUT update -> 200 persists change', upd.status === 200 && upd.json.quote.customer_name === 'CRUD Alice Updated' && upd.json.quote.hospital_cover === 'Gold');
  const reread = await req('GET', `/api/quotes/${id}`);
  check('Update persisted in SQLite', reread.json.quote.hospital_cover === 'Gold');
  check('DELETE -> 200', (await req('DELETE', `/api/quotes/${id}`)).status === 200);
  check('GET deleted -> 404', (await req('GET', `/api/quotes/${id}`)).status === 404);

  console.log('\n== Edge cases markers will probe ==');
  const noA2 = await req('POST', '/api/quotes', valid({ cover_type: 'Couple' }));
  check('Couple missing Applicant 2 -> 400', noA2.status === 400, noA2.status);
  check('  ...names both missing fields', !!noA2.json.errors.applicant2_age && !!noA2.json.errors.applicant2_cover_history);
  const famNoA2 = await req('POST', '/api/quotes', valid({ cover_type: 'Family' }));
  check('Family missing Applicant 2 -> 400', famNoA2.status === 400);

  for (const age of [-5, 0, 17, 101, 150, 'abc', null, 40.5]) {
    const r = await req('POST', '/api/quotes', valid({ applicant1_age: age }));
    check(`Invalid age ${JSON.stringify(age)} -> 400`, r.status === 400, r.status);
  }
  for (const d of [-3, 10.5, 25, 'x']) {
    const r = await req('POST', '/api/quotes', valid({ payment_frequency: 'Yearly', annual_discount: d }));
    check(`Invalid discount ${JSON.stringify(d)} -> 400`, r.status === 400, r.status);
  }
  check('Discount 0 accepted', (await req('POST', '/api/quotes/preview', valid({ payment_frequency: 'Yearly', annual_discount: 0 }))).status === 200);
  check('Discount 10 accepted', (await req('POST', '/api/quotes/preview', valid({ payment_frequency: 'Yearly', annual_discount: 10 }))).status === 200);

  const noneHosp = await req('POST', '/api/quotes/preview', valid({ applicant1_age: 60, applicant1_cover_history: 'No', hospital_cover: 'None', extras_cover: 'Premium' }));
  check('hospital=None -> loading NOT applied', noneHosp.json.breakdown.applicants[0].lhcLoadingPercent === 0);
  check('hospital=None -> hospital total $0', noneHosp.json.breakdown.hospitalTotal === 0);
  check('extras-only quote not loaded (monthly = $70)', noneHosp.json.breakdown.monthlyPremium === 70, noneHosp.json.breakdown.monthlyPremium);

  const ns = await req('POST', '/api/quotes/preview', valid({ cover_type: 'Couple', applicant1_cover_history: 'Not sure', applicant2_age: 52, applicant2_cover_history: 'Not sure' }));
  check('"Not sure" -> loading 0% for both', ns.json.breakdown.applicants.every((a) => a.lhcLoadingPercent === 0));
  check('"Not sure" -> warning per applicant (2)', ns.json.breakdown.warnings.length === 2, ns.json.breakdown.warnings.length);
  check('  ...warning names applicant number', ns.json.breakdown.warnings[0].startsWith('Applicant 1:') && ns.json.breakdown.warnings[1].startsWith('Applicant 2:'));

  const monthly = await req('POST', '/api/quotes/preview', valid({ payment_frequency: 'Monthly', annual_discount: 10 }));
  check('Monthly ignores discount (yearlyAfter null)', monthly.json.breakdown.yearlyAfterDiscount === null);
  check('Monthly discount% forced to 0', monthly.json.breakdown.annualDiscountPercent === 0);

  const age30 = await req('POST', '/api/quotes/preview', valid({ applicant1_age: 30, applicant1_cover_history: 'No' }));
  check('Age exactly 30, no history -> 0% loading', age30.json.breakdown.applicants[0].lhcLoadingPercent === 0);
  const age31 = await req('POST', '/api/quotes/preview', valid({ applicant1_age: 31, applicant1_cover_history: 'No' }));
  check('Age 31, no history -> 2% loading', age31.json.breakdown.applicants[0].lhcLoadingPercent === 2);

  console.log('\n== Malformed / hostile input (must be 400/404, never 500) ==');
  const hostile = [['empty object', {}, 400], ['null name', { customer_name: null }, 400], ['bad cover type', valid({ cover_type: 'Triple' }), 400], ['bad hospital tier', valid({ hospital_cover: 'Platinum' }), 400], ['bad extras tier', valid({ extras_cover: 'Ultra' }), 400], ['bad history', valid({ applicant1_cover_history: 'Maybe' }), 400], ['bad frequency', valid({ payment_frequency: 'Weekly' }), 400], ['SQL injection in name', valid({ customer_name: "Robert'); DROP TABLE quotes;--" }), 201]];
  for (const [name, body, expected] of hostile) {
    const r = await req('POST', '/api/quotes', body);
    check(`${name} -> ${expected}`, r.status === expected, `got ${r.status}`);
  }
  const badJson = await fetch(BASE + '/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
  check('Malformed JSON -> 400 not 500', badJson.status === 400, badJson.status);
  check('GET /api/quotes/abc -> 400', (await req('GET', '/api/quotes/abc')).status === 400);
  check('GET /api/quotes/99999 -> 404', (await req('GET', '/api/quotes/99999')).status === 404);
  check('PUT /api/quotes/99999 -> 404', (await req('PUT', '/api/quotes/99999', valid())).status === 404);
  check('DELETE /api/quotes/99999 -> 404', (await req('DELETE', '/api/quotes/99999')).status === 404);
  check('Unknown endpoint -> 404 JSON', (await req('GET', '/api/nope')).status === 404);

  const after = await req('GET', '/api/quotes');
  check('Table survived SQL-injection attempt', Array.isArray(after.json) && after.json.length > 0);

  console.log(`\n================ ${pass} passed, ${fail} failed ================`);
  server.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('SMOKE TEST CRASHED:', e); process.exit(1); });
