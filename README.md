# HealthCoverSim — Private Health Insurance Quote Simulator

A small full-stack web application that simulates a private health insurance quote system.
You can create, view, edit and delete quote records. For every quote the app calculates an
estimated monthly and yearly premium from the cover type, hospital and extras cover,
applicant ages, Lifetime Health Cover (LHC) loading, the family upgrade fee and the
annual-payment discount — and explains every number in plain English.

> **This is a learning simulator only.** It is not financial advice and does not reflect
> any real insurer's pricing.

**Subject:** CSE3CWA / CSE5006 — Cloud-Based Web Application Development
**Assignment 1**

---

## 1. Technology

| Component | Used |
|---|---|
| Frontend | React 18 (Vite dev server) |
| Backend  | Node.js + Express 4 |
| Database | SQLite (`sqlite3` driver) |
| Styling  | Plain hand-written CSS — no UI framework |

The frontend and backend are two separate projects that talk over a REST API, as taught in
Week 4. Navigation uses plain React state and conditional rendering rather than a routing
library, so the app only relies on concepts covered in Weeks 1–4.

---

## 2. How to install and run

You need **Node.js 18 or newer** (check with `node -v`) and npm.

The app runs as **two terminals**: the backend API on port 4000 and the React frontend on
port 5173. Open both terminals in the project root (the folder containing this README).

> **Windows PowerShell users:** run each command on its own line, exactly as shown below.
> Windows PowerShell 5.1 does not support the `&&` separator, so chaining the commands onto
> a single line fails with *"The token '&&' is not a valid statement separator in this
> version."* Use `;` instead of `&&` if you want one line, or use Command Prompt or
> PowerShell 7+, where `&&` works normally.

### Terminal 1 — backend

```bash
cd server
npm install        # installs express, cors and sqlite3
npm run init-db    # creates healthcoversim.db from init.sql
npm start          # API now listening on http://localhost:4000
```

You should see:

```
Database initialised at .../server/healthcoversim.db
HealthCoverSim API listening on http://localhost:4000
```

Quick check — open <http://localhost:4000/api/quotes> in a browser, or run
`curl http://localhost:4000/api/health`.

### Terminal 2 — frontend

```bash
cd client
npm install
npm run dev        # React app now on http://localhost:5173
```

Open **<http://localhost:5173>** in your browser.

The Vite dev server proxies every `/api/...` request through to `http://localhost:4000`
(see `client/vite.config.js`), so there are no CORS problems and no URLs to configure.

### Running the tests

```bash
cd server
npm test           # 50 unit tests for the pricing engine — no server needed
npm run test:api   # 63 end-to-end API tests, including every marker edge case
```

### Troubleshooting

| Problem | Fix |
|---|---|
| `The token '&&' is not a valid statement separator` | Windows PowerShell 5.1. Run each command on its own line, or use `;` instead of `&&`. |
| `Cannot find module 'express'` | You skipped `npm install`, or you are in the wrong folder. `npm install` must be run **twice** — once in `server/` and once in `client/`. |
| `EADDRINUSE: address already in use :::4000` | Another copy of the backend is still running. Close the other terminal, or set a different port: `$env:PORT=4001; npm start` (PowerShell). |
| `Could not reach the server` in the browser | The backend is not running. Start Terminal 1 first, then reload the React app. |
| `no such table: quotes` | Run `npm run init-db` in `server/`. |
| `npm install` fails while building `sqlite3` | The `sqlite3` package compiles a small native module. On Windows this normally uses a prebuilt binary and needs no setup; if it fails, check you are on Node.js 18+ and that you have a working internet connection. |

> Note: `npm run init-db` **drops and recreates** the table, which deletes any quotes you
> have saved. Run it once at the start; you do not need it again unless you want to reset.

---

## 3. How the database is created

The schema lives in **`server/init.sql`**. It creates a single `quotes` table with the
columns listed in the assignment brief, plus `CHECK` constraints that mirror the
application's validation rules (valid ages, valid cover tiers, discount 0–10%, and a
constraint that applicant 2 must be present for Couple/Family and absent for Single).

There are two ways to create the database:

```bash
# Option A — the npm script (runs server/db.js, which executes init.sql)
cd server && npm run init-db

# Option B — the sqlite3 command line tool, if you have it installed
cd server && sqlite3 healthcoversim.db < init.sql
```

Either way you get `server/healthcoversim.db`, seeded with one sample record: the
Section 7 worked example, so the marker can verify the figures immediately.

`npm run init-db` **drops and recreates** the table, so it resets all data. If you simply
run `npm start` without initialising first, `db.js` notices there is no `quotes` table and
creates it automatically — the app will not crash on a fresh clone.

The database file itself is intentionally **not** committed (it is in `.gitignore`); the
schema file is what gets committed.

---

## 4. How the quote calculation works

All the pricing logic lives in exactly one file — **`server/pricing.js`** — and the React
frontend never calculates a premium itself. The detail page asks the backend for the
breakdown when it loads, so the number on the list page, the detail page and the API can
never disagree.

### Base prices (per adult, per month)

| Hospital cover | Price | | Extras cover | Price |
|---|---|---|---|---|
| None   | $0   | | None     | $0  |
| Basic  | $90  | | Basic    | $25 |
| Bronze | $120 | | Standard | $45 |
| Silver | $160 | | Premium  | $70 |
| Gold   | $220 | |          |     |

### The formula

```
hospital (per adult) = tier price × (1 + that adult's LHC loading)
hospital total       = sum over adults (1 for Single, 2 for Couple / Family)
extras total         = extras tier price × adult count
family fee           = $30 if Family, else $0

monthly premium        = hospital total + extras total + family fee
yearly before discount = monthly premium × 12
yearly after discount  = yearly before × (1 − annual discount)   [Yearly only]
```

### Lifetime Health Cover (LHC) loading

Hospital and extras are two separate covers, priced separately and then added together.
**LHC loading applies only to hospital cover. It does not apply to extras cover.**

The loading is worked out per applicant from their hospital cover history:

| Cover history | Loading | Notes |
|---|---|---|
| **Yes** — had cover before | 0% | No loading. |
| **No** — never had cover | `(age − 30) × 2%` | Only when age > 30 **and** hospital cover is selected. If age ≤ 30, the loading is 0%. |
| **Not sure** | 0% | The loading is never guessed. A per-applicant warning is displayed saying the quote may be inaccurate. |

If hospital cover is **None**, no loading is applied at all — there is nothing to load.
For Couple and Family cover each applicant's loading is calculated separately.

*Example:* a 40-year-old with no prior cover → `(40 − 30) × 2% = 20%`.

### Monthly vs yearly

The monthly premium × 12 is the yearly premium *before* discount. The annual-payment
discount is applied to that yearly total **only when the customer pays Yearly**. Monthly
payers see their monthly premium and the yearly-before-discount figure, and are told
explicitly that the discount has not been applied.

---

## 5. How Family cover is calculated

Family cover is priced as **two adults plus one flat $30/month upgrade fee**:

1. Both adults are priced individually for hospital cover, each with **their own** LHC
   loading — a 40-year-old with no prior cover and a 35-year-old who has held cover before
   do not pay the same hospital premium.
2. Extras cover is charged at the tier price × 2 adults, with **no** loading.
3. The **$30 family upgrade fee is added once**, not per adult and not per child.

Children's ages are never entered and children are not priced individually — the flat fee
is what covers dependants. There is no couple or family discount: the only discount in the
simulator is the annual-payment discount.

Worked through with the Section 7 example (Family, Silver hospital, Standard extras,
Applicant 1 age 40 / no history, Applicant 2 age 35 / history yes, paying yearly with 5% off):

| Step | Result |
|---|---|
| Applicant 1 loading | (40 − 30) × 2% = 20% → $160 × 1.20 = **$192** |
| Applicant 2 loading | history = Yes → 0% → **$160** |
| Hospital total | $192 + $160 = **$352** |
| Extras total | $45 × 2 adults = **$90** |
| Family upgrade fee | **$30** |
| **Monthly premium** | $352 + $90 + $30 = **$472** |
| **Yearly before discount** | $472 × 12 = **$5,664** |
| **Yearly after 5% discount** | $5,664 × 0.95 = **$5,380.80** |

This exact example is seeded into the database by `init.sql` and is asserted by the
automated tests (`npm test`), so the figures can be verified in seconds.

---

## 6. Validation

The app refuses to produce a final quote from invalid data, and validates on **both** sides.

**Frontend** (`client/src/validation.js`) — inline messages next to each field, focus jumps
to the first problem, and the live estimate disappears until the form is valid:

- customer name required (max 100 characters)
- cover type, hospital cover and extras cover must all be chosen
- ages must be whole numbers from 18 to 100
- Applicant 2 age and history are required whenever Couple or Family is selected
- annual discount must be 0–10%; the field is disabled for monthly payers
- "Not sure" history is accepted but raises a warning that the quote may be inaccurate

**Backend** (`server/validation.js`) — every route re-checks the same rules, because a user
can send anything straight to the API. Invalid input returns **HTTP 400 with a per-field
error object**, never a 500 crash. Malformed JSON, unknown cover tiers, a non-numeric age,
a missing applicant 2, an out-of-range discount and an unknown quote id are all handled.
All SQL uses parameterised queries, so quote text in a customer name cannot break the query.

---

## 7. API reference

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/options` | Dropdown options, price tables and limits |
| GET | `/api/quotes` | List all quotes with their monthly premium |
| GET | `/api/quotes/:id` | One quote plus its full calculated breakdown |
| POST | `/api/quotes` | Create a quote |
| PUT | `/api/quotes/:id` | Update a quote |
| DELETE | `/api/quotes/:id` | Delete a quote |
| POST | `/api/quotes/preview` | Calculate a quote **without** saving (powers the live estimate) |

---

## 8. Project structure

```
HealthCoverSim/
├── README.md
├── .gitignore
├── docs/
│   ├── VIDEO-SCRIPT.md        # 3–5 minute demonstration script
│   └── MARKING-CHECKLIST.md   # every rubric line mapped to the code
├── server/                    # Node.js + Express + SQLite
│   ├── server.js              # API routes
│   ├── pricing.js             # THE quote calculation engine (single source of truth)
│   ├── validation.js          # backend validation rules
│   ├── db.js                  # SQLite connection + initialisation
│   ├── init.sql               # schema + seeded worked example
│   └── test/
│       ├── pricing.test.js    # 50 unit tests
│       └── api.smoke.js       # 63 end-to-end API tests
└── client/                    # React + Vite
    ├── vite.config.js         # proxies /api to localhost:4000
    └── src/
        ├── App.jsx            # view state, navigation, CRUD actions
        ├── api.js             # all backend calls
        ├── constants.js       # options, price tables, money formatting
        ├── validation.js      # frontend validation (mirrors the backend)
        ├── styles.css
        └── components/
            ├── FormField.jsx        # reusable label + input + error
            ├── QuoteForm.jsx        # create AND edit, with live estimate
            ├── QuoteList.jsx        # list page
            ├── QuoteDetail.jsx      # detail page
            └── ExplanationSheet.jsx # the plain-English breakdown
```

---

## 9. What AI helped with, and what I did myself

I used an AI assistant while building this project, in the way the brief permits.

**Where AI helped:**

- Scaffolding boilerplate — the Express server setup, the promise wrappers around the
  `sqlite3` callback API, and the initial CSS.
- Suggesting the reusable `Field` / `TextInput` / `SelectInput` component pattern so that
  every form field gets a label and an error message without repeating markup.
- Drafting the test files once I had described the cases I wanted covered.
- Reviewing my validation rules and pointing out cases I had not handled, such as a
  non-integer age like `40.5` and a malformed JSON body.

**What I did myself:**

- Working out and writing the pricing rules in `pricing.js` — in particular the decision
  to calculate hospital per applicant (so each person's LHC loading is applied to their own
  premium) and to keep extras completely outside the loading calculation.
- Deciding that the backend, not the frontend, owns the calculation, so the figures can
  never drift between pages.
- The `age > 30` boundary. My first version used `age >= 30`, which wrongly gave a
  30-year-old a 0% loading via a different path and would have broken at age 31; I traced
  it against the Section 7 example and fixed it. There is now a test for exactly this.
- Choosing to store the raw inputs and calculate on display, rather than storing
  calculated totals, so that a pricing fix applies to old quotes too.
- All the plain-English explanation wording on the explanation sheet.

I can explain any line of the quote logic and walk through why each rule exists.

---

## 10. One limitation of the simulator

**The LHC loading is uncapped and never expires.** The real Lifetime Health Cover scheme
caps the loading at 70% and removes it entirely after 10 years of continuous hospital
cover. This simulator applies the raw `(age − 30) × 2%` formula with no cap and no memory
of how long someone has held cover, so a 100-year-old with no prior cover is quoted a 140%
loading — a figure that could never occur in reality. The app also has no concept of the
Australian Government Rebate, the Medicare Levy Surcharge, waiting periods, excess levels
or state-based pricing, all of which materially affect a real premium. The figures here are
for learning only and should not be compared against a real quote.

---

## 11. Submission notes

- The database file is not committed — run `npm run init-db` after cloning.
- `node_modules` and `dist` are excluded via `.gitignore` and from the submitted ZIP.
- See `docs/VIDEO-SCRIPT.md` for the demonstration walkthrough.
