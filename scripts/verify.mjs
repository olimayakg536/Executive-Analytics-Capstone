// Independent check of the numbers. Run with: npm test
import { readFileSync } from 'node:fs';
import { parseCsv, analyze, scenario, buildInsights } from '../src/analytics.js';

const text = readFileSync(new URL('../public/data/customer_churn_sample.csv', import.meta.url), 'utf8');
const rows = parseCsv(text);
const a = analyze(rows);

let failed = 0;
const check = (name, actual, expected) => {
  const ok = typeof expected === 'number' ? Math.abs(actual - expected) < 0.005 : actual === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${actual} (expected ${expected})`);
};

// Expected values were counted by hand from the CSV.
check('rows', a.total, 15);
check('churned', a.churned, 7);
check('retained', a.retained, 8);
check('churn rate', a.churnRate, 46.67);
check('retention rate', a.retentionRate, 53.33);
check('revenue at risk', a.revenueAtRisk, 409.93);
check('avg churned charge', a.avgChurnCharge, 58.56);

const rate = (list, name) => list.find((g) => g.name === name).rate;
check('Month-to-Month churn', rate(a.byContract, 'Month-to-Month'), 100);
check('One Year churn', rate(a.byContract, 'One Year'), 0);
check('Two Year churn', rate(a.byContract, 'Two Year'), 0);
check('0–12 months churn', rate(a.byTenure, '0–12 months'), 100);
check('13–24 months churn', rate(a.byTenure, '13–24 months'), 20);
check('25+ months churn', rate(a.byTenure, '25+ months'), 0);
check('UPI churn', rate(a.byPayment, 'UPI'), 75);
check('Credit Card churn', rate(a.byPayment, 'Credit Card'), 33.33);
check('Debit Card churn', rate(a.byPayment, 'Debit Card'), 100);
check('Bank Transfer churn', rate(a.byPayment, 'Bank Transfer'), 0);
check('avg tickets churned', a.avgTicketsChurned, 4.2857);
check('avg tickets retained', a.avgTicketsRetained, 1.0);

// Scenarios: customers are rounded to whole numbers first.
const s5 = scenario(a, 5);
const s10 = scenario(a, 10);
const s15 = scenario(a, 15);
const s50 = scenario(a, 50);
check('5% customers', s5.customers, 0);
check('10% customers', s10.customers, 1);
check('15% customers', s15.customers, 1);
check('50% customers', s50.customers, 4);
check('10% monthly revenue', s10.monthly, 58.56);
check('10% annualized', s10.annual, 702.74);
check('50% annualized', s50.annual, 2810.95);

check('five insights', buildInsights(a).length, 5);

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
