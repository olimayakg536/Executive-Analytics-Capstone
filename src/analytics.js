// All analysis runs in the browser from the CSV file. No backend is used.

export const SOURCE_URL = 'https://edvyro.in/datasets/customer_churn_sample.csv';

export const SCENARIOS = [5, 10, 15, 25, 50];

// ---------- Formatting helpers ----------
export const fmtPct = (n) => `${n.toFixed(1)}%`;
export const fmtNum = (n) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtInt = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

// ---------- CSV parsing (simple file, no quoted commas) ----------
export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? '').trim();
    });
    return row;
  });
}

const toNumber = (v) => {
  if (v === '' || v === undefined || v === null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// ---------- Grouping ----------
const tenureBand = (t) => {
  if (t === null) return 'Unknown';
  if (t <= 12) return '0–12 months';
  if (t <= 24) return '13–24 months';
  return '25+ months';
};

const ticketBand = (t) => {
  if (t === null) return 'Unknown';
  return t >= 3 ? '3+ tickets' : '0–2 tickets';
};

function groupRates(rows, keyFn, order) {
  const map = new Map();
  rows.forEach((r) => {
    const key = keyFn(r) || 'Unknown';
    if (!map.has(key)) map.set(key, { name: key, total: 0, churned: 0 });
    const g = map.get(key);
    g.total += 1;
    if (r.churned) g.churned += 1;
  });
  let list = Array.from(map.values()).map((g) => ({
    ...g,
    rate: (g.churned / g.total) * 100,
  }));
  if (order) {
    list.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  }
  return list;
}

const byRateDesc = (list) => [...list].sort((a, b) => b.rate - a.rate || b.total - a.total);

// ---------- Main analysis ----------
export function analyze(rawRows) {
  const fields = rawRows.length ? Object.keys(rawRows[0]) : [];

  // Data quality: count blanks in every column.
  const missingByField = {};
  fields.forEach((f) => {
    missingByField[f] = rawRows.filter((r) => r[f] === '' || r[f] === undefined).length;
  });

  const parsed = rawRows.map((r) => {
    const churnText = String(r.Churn || '').trim().toLowerCase();
    return {
      ...r,
      tenure: toNumber(r.TenureMonths),
      monthly: toNumber(r.MonthlyCharges),
      tickets: toNumber(r.SupportTickets),
      churnValid: churnText === 'yes' || churnText === 'no',
      churned: churnText === 'yes',
    };
  });

  const invalidChurnRows = parsed.filter((r) => !r.churnValid).length;
  const rows = parsed.filter((r) => r.churnValid);

  const total = rows.length;
  const churnedRows = rows.filter((r) => r.churned);
  const retainedRows = rows.filter((r) => !r.churned);
  const churned = churnedRows.length;
  const retained = retainedRows.length;

  const churnRate = total ? (churned / total) * 100 : 0;
  const retentionRate = total ? (retained / total) * 100 : 0;

  const churnedMissingCharge = churnedRows.filter((r) => r.monthly === null).length;
  const revenueReliable = churnedMissingCharge === 0 && churned > 0;
  const revenueAtRisk = churnedRows.reduce((s, r) => s + (r.monthly ?? 0), 0);
  const avgChurnCharge = revenueReliable ? revenueAtRisk / churned : null;

  const retainedCharges = retainedRows.filter((r) => r.monthly !== null);
  const avgRetainedCharge = retainedCharges.length
    ? retainedCharges.reduce((s, r) => s + r.monthly, 0) / retainedCharges.length
    : null;

  const avg = (list) => {
    const v = list.filter((r) => r.tickets !== null);
    return v.length ? v.reduce((s, r) => s + r.tickets, 0) / v.length : null;
  };

  const a = {
    total,
    churned,
    retained,
    churnRate,
    retentionRate,
    revenueAtRisk,
    avgChurnCharge,
    avgRetainedCharge,
    revenueReliable,
    churnedMissingCharge,
    invalidChurnRows,
    fields,
    missingByField,
    rowCount: rawRows.length,
    byContract: groupRates(rows, (r) => r.ContractType, ['Month-to-Month', 'One Year', 'Two Year']),
    byTenure: groupRates(rows, (r) => tenureBand(r.tenure), [
      '0–12 months',
      '13–24 months',
      '25+ months',
      'Unknown',
    ]),
    byPayment: groupRates(rows, (r) => r.PaymentMethod),
    bySubscription: groupRates(rows, (r) => r.SubscriptionType, ['Basic', 'Pro', 'Enterprise']),
    byTickets: groupRates(rows, (r) => ticketBand(r.tickets), ['0–2 tickets', '3+ tickets', 'Unknown']),
    avgTicketsChurned: avg(churnedRows),
    avgTicketsRetained: avg(retainedRows),
  };
  a.byPayment = byRateDesc(a.byPayment);
  return a;
}

// ---------- Scenario maths (illustrative only) ----------
export function scenario(a, pct) {
  if (!a.revenueReliable) return null;
  const customers = Math.round((a.churned * pct) / 100); // whole customers first
  const monthly = customers * a.avgChurnCharge;
  const annual = monthly * 12;
  return { pct, customers, monthly, annual };
}

// ---------- Insights (built from the calculated numbers) ----------
export function buildInsights(a) {
  const contract = byRateDesc(a.byContract);
  const tenure = byRateDesc(a.byTenure.filter((g) => g.name !== 'Unknown'));
  const payment = a.byPayment;
  const tickets = Object.fromEntries(a.byTickets.map((g) => [g.name, g]));
  const gap = (list) => (list[0].rate - list[list.length - 1].rate).toFixed(1);
  const list = (groups) =>
    groups.map((g) => `${g.name}: ${fmtPct(g.rate)} (${g.churned} of ${g.total})`).join('; ');

  const payMin = Math.min(...payment.map((g) => g.total));
  const payMax = Math.max(...payment.map((g) => g.total));
  const low = tickets['0–2 tickets'] || { churned: 0, total: 0 };
  const high = tickets['3+ tickets'] || { churned: 0, total: 0 };

  return [
    {
      id: 1,
      title: `About ${Math.round(a.churnRate / 10)} in every 10 customers have churned`,
      finding: `${a.churned} of ${a.total} customers (${fmtPct(a.churnRate)}) are marked as churned.`,
      metric: `Churn rate ${fmtPct(a.churnRate)} · Retention rate ${fmtPct(a.retentionRate)}`,
      meaning:
        'Churn is a core business problem in this data, not a small leak. The next question is where the losses are concentrated.',
      action:
        'Make churn reduction a named management priority and track the churn rate every month against a target.',
    },
    {
      id: 2,
      title: `Churn is concentrated in ${contract[0].name} contracts`,
      finding: list(contract) + '.',
      metric: `Gap between highest and lowest group: ${gap(contract)} percentage points`,
      meaning:
        'Customers without a longer commitment left far more often than customers on longer contracts. This is an association: contract type may reflect how committed a customer already was, rather than cause the churn.',
      action:
        'Pilot annual-plan discounts or loyalty perks for month-to-month customers and measure whether churn falls.',
    },
    {
      id: 3,
      title: `Churn varies strongly with how long customers have stayed`,
      finding: list(a.byTenure.filter((g) => g.name !== 'Unknown')) + '.',
      metric: `Gap between highest and lowest group: ${gap(tenure)} percentage points`,
      meaning: `${tenure[0].name} customers churned most often. Customers who stay past the early months appear much more likely to stay. Tenure and contract type overlap in this data, so the two effects cannot be separated.`,
      action:
        'Design a first-year onboarding and check-in program, and review what happens to customers in their first 12 months.',
    },
    {
      id: 4,
      title: 'Churned customers raised more support tickets',
      finding:
        a.avgTicketsChurned !== null && a.avgTicketsRetained !== null
          ? `Churned customers averaged ${a.avgTicketsChurned.toFixed(1)} support tickets versus ${a.avgTicketsRetained.toFixed(1)} for retained customers.`
          : 'Support ticket data is incomplete, so this comparison could not be calculated.',
      metric: `${high.churned} of ${high.total} customers with 3+ tickets churned, versus ${low.churned} of ${low.total} with 0–2 tickets`,
      meaning:
        'Frequent support contact may signal unresolved problems. However, the data has no dates, so tickets could also have been raised after a customer decided to leave. The 3-ticket cut-off was chosen for readability, not tested statistically.',
      action:
        'Flag customers who reach 3 tickets and have a retention or service team follow up before they leave.',
    },
    {
      id: 5,
      title: `Payment methods show uneven churn, but groups are tiny`,
      finding: list(payment) + '.',
      metric: `Gap between highest and lowest group: ${gap(payment)} percentage points · Group sizes: ${payMin}–${payMax} customers`,
      meaning: `${payment[0].name} customers churned most often. With only ${payMin}–${payMax} customers per method, these differences could easily be due to chance, so treat this as a lead to investigate, not a finding.`,
      action:
        'Check whether payment failures or friction affect the highest-churn methods, and re-test on a larger dataset.',
    },
  ];
}

// ---------- Recommended actions ----------
export function buildActions(a) {
  const top = byRateDesc(a.byContract)[0];
  return [
    {
      priority: 'High',
      title: 'Move flexible-contract customers toward longer commitments',
      why: `${top.name} customers churned at ${fmtPct(top.rate)}. Insight 2.`,
      how: 'Offer an annual plan discount to a test group and compare churn with a similar group that receives no offer.',
    },
    {
      priority: 'High',
      title: 'Build a first-year customer success program',
      why: 'Churn is highest among customers in their first 12 months. Insight 3.',
      how: 'Add check-ins at months 1, 3 and 6, and review the onboarding experience.',
    },
    {
      priority: 'High',
      title: 'Create a support-ticket early-warning flag',
      why: 'Customers with 3+ tickets churned far more often. Insight 4.',
      how: 'Alert the retention team when a customer reaches 3 tickets, and record the outcome of each follow-up.',
    },
    {
      priority: 'Medium',
      title: 'Investigate payment friction',
      why: 'Some payment methods show higher churn, but with very small groups. Insight 5.',
      how: 'Review failed payments and checkout steps for the highest-churn methods before changing anything.',
    },
    {
      priority: 'Medium',
      title: 'Validate on a larger dataset before committing budget',
      why: `This analysis covers only ${a.total} customers.`,
      how: 'Repeat the analysis on the full customer base, add churn dates, and test any retention offer with a controlled pilot.',
    },
  ];
}

// ---------- Limitations ----------
export function buildLimitations(a) {
  return [
    `Very small sample: only ${a.total} customers. Percentages swing sharply with one customer, and nothing here is statistically tested.`,
    'Association, not causation: contract type, tenure, payment method and support tickets overlap heavily, so their separate effects cannot be isolated.',
    'No dates: the file has no churn date or ticket dates, so we cannot tell whether tickets came before or after the decision to leave.',
    'Revenue at risk uses monthly charges of customers who have already churned. It is not a forecast and not a guaranteed loss.',
    'Scenario results are hypothetical. They assume retained customers would keep paying the average monthly charge of churned customers, and they do not show that those customers can actually be recovered.',
    'No cost data: the figures are revenue, not profit. Retention offers, discounts and service costs are not included.',
    'The currency is not stated in the dataset, so amounts are shown in dataset units.',
    `Data quality: ${
      Object.values(a.missingByField).every((v) => v === 0) && a.invalidChurnRows === 0
        ? 'no missing values or invalid Churn labels were found in the fields checked.'
        : 'some missing or invalid values were found; see Data and Methodology.'
    } The file is named a "sample", so it may not represent all customers.`,
  ];
}

// ---------- Executive summary ----------
export function buildSummary(a) {
  const contract = byRateDesc(a.byContract);
  return [
    {
      q: 'What is the business problem?',
      a: `Customers are leaving. ${a.churned} of ${a.total} customers (${fmtPct(a.churnRate)}) in the dataset have churned, taking ${fmtNum(a.revenueAtRisk)} of monthly recurring charges with them.`,
    },
    {
      q: 'What does the data indicate?',
      a: `Churn is concentrated among ${contract[0].name} customers, customers in their first year, customers who raised several support tickets, and some payment methods. Customers on longer contracts and with longer tenure rarely churned in this data.`,
    },
    {
      q: 'What should management do next?',
      a: 'Pilot longer-contract offers, build a first-year support program, and flag customers with repeated support tickets for early follow-up. Measure each with a controlled test.',
    },
    {
      q: 'What limitations should management consider?',
      a: `Only ${a.total} customers are included, there are no dates, and the patterns are associations rather than proven causes. Treat the results as a guide for where to investigate, not as a forecast.`,
    },
  ];
}
