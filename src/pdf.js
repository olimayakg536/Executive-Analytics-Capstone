import { jsPDF } from 'jspdf';
import {
  SCENARIOS,
  SOURCE_URL,
  buildActions,
  buildInsights,
  buildLimitations,
  buildSummary,
  fmtInt,
  fmtNum,
  fmtPct,
  scenario,
} from './analytics.js';

const NAVY = [11, 31, 58];
const BLUE = [37, 99, 235];
const GREY = [90, 100, 120];

export function downloadExecutivePdf(a) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const maxW = W - M * 2;
  let y = M;

  const ensure = (needed) => {
    if (y + needed > H - 50) {
      doc.addPage();
      y = M;
    }
  };

  const heading = (text) => {
    ensure(40);
    y += 8;
    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...BLUE);
    doc.text(text, M, y);
    y += 6;
    doc.setDrawColor(...BLUE).setLineWidth(1).line(M, y, M + 40, y);
    y += 16;
  };

  const para = (text, opts = {}) => {
    const { bold = false, size = 10.5, color = NAVY, indent = 0, gap = 6 } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(size).setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxW - indent);
    lines.forEach((line) => {
      ensure(size + 4);
      doc.text(line, M + indent, y);
      y += size + 3;
    });
    y += gap;
  };

  // Title
  doc.setFont('helvetica', 'bold').setFontSize(22).setTextColor(...NAVY);
  doc.text('Executive Analytics Capstone', M, y + 6);
  y += 28;
  doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(...GREY);
  doc.text('Customer Churn: Executive Report', M, y);
  y += 14;
  doc.setFontSize(9);
  doc.text(`Source: Edvyro customer_churn_sample.csv (${a.total} customers)`, M, y);
  y += 12;

  // KPIs
  heading('Executive Overview');
  const kpis = [
    ['Total Customers', fmtInt(a.total)],
    ['Churn Rate', fmtPct(a.churnRate)],
    ['Retention Rate', fmtPct(a.retentionRate)],
    ['Revenue at Risk / month', a.revenueReliable ? fmtNum(a.revenueAtRisk) : 'n/a'],
  ];
  const boxW = (maxW - 3 * 8) / 4;
  kpis.forEach(([label, value], i) => {
    const x = M + i * (boxW + 8);
    doc.setDrawColor(200, 212, 232).setFillColor(244, 247, 252).roundedRect(x, y, boxW, 52, 4, 4, 'FD');
    doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...GREY);
    doc.text(label, x + 8, y + 16);
    doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...NAVY);
    doc.text(value, x + 8, y + 38);
  });
  y += 70;
  para(
    'Revenue at risk is the monthly recurring charge of customers who have already churned. It is not a guaranteed future loss or a forecast of preventable revenue. Amounts are in dataset units (currency not specified).',
    { size: 9, color: GREY }
  );

  buildSummary(a).forEach((s) => {
    para(s.q, { bold: true, gap: 2 });
    para(s.a);
  });

  // Insights
  heading('Five Key Insights');
  buildInsights(a).forEach((ins) => {
    para(`${ins.id}. ${ins.title}`, { bold: true, gap: 2 });
    para(`Finding: ${ins.finding}`, { indent: 12, gap: 2 });
    para(`Metric: ${ins.metric}`, { indent: 12, gap: 2 });
    para(`Meaning: ${ins.meaning}`, { indent: 12, gap: 2 });
    para(`Action: ${ins.action}`, { indent: 12 });
  });

  // Business impact
  heading('Business Impact (Illustrative Scenarios)');
  if (a.revenueReliable) {
    para(
      `${a.churned} churned customers, average monthly charge ${fmtNum(a.avgChurnCharge)}. Scenarios are hypothetical, not predictions.`,
      { gap: 4 }
    );
    doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...NAVY);
    ensure(20);
    const cols = [M, M + 90, M + 210, M + 340];
    ['Scenario', 'Customers', 'Monthly revenue', 'Annualized revenue'].forEach((t, i) =>
      doc.text(t, cols[i], y)
    );
    y += 14;
    doc.setFont('helvetica', 'normal');
    SCENARIOS.forEach((pct) => {
      const s = scenario(a, pct);
      ensure(16);
      [`${pct}%`, `${s.customers}`, fmtNum(s.monthly), fmtNum(s.annual)].forEach((t, i) =>
        doc.text(t, cols[i], y)
      );
      y += 14;
    });
    y += 4;
    para(
      'Assumptions: customer counts are rounded to whole numbers before revenue is calculated; retained customers would keep paying the average monthly charge of churned customers. This is revenue, not profit, and does not show that these customers can actually be recovered.',
      { size: 9, color: GREY }
    );
  } else {
    para('Scenario estimates are not shown because monthly charge data for churned customers is missing or incomplete.');
  }

  // Actions
  heading('Recommended Actions');
  buildActions(a).forEach((act, i) => {
    para(`${i + 1}. [${act.priority}] ${act.title}`, { bold: true, gap: 2 });
    para(`Why: ${act.why}`, { indent: 12, gap: 2 });
    para(`How: ${act.how}`, { indent: 12 });
  });

  // Limitations
  heading('Limitations and Assumptions');
  buildLimitations(a).forEach((l) => para(`•  ${l}`, { gap: 3 }));

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...GREY);
    doc.text(`Executive Analytics Capstone · Data: ${SOURCE_URL}`, M, H - 28);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 28, { align: 'right' });
  }

  doc.save('Executive-Analytics-Capstone-Report.pdf');
}
