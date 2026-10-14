import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  BarChart3,
  Download,
  FileText,
  Lightbulb,
  ListChecks,
  Presentation,
  Database,
  TrendingUp,
  Users,
  UserCheck,
  Percent,
  Wallet,
} from 'lucide-react';
import Slides from './Slides.jsx';
import {
  SCENARIOS,
  SOURCE_URL,
  analyze,
  buildActions,
  buildInsights,
  buildLimitations,
  buildSummary,
  fmtInt,
  fmtNum,
  fmtPct,
  parseCsv,
  scenario,
} from './analytics.js';

const NAV = [
  ['overview', 'Overview'],
  ['insights', 'Insights'],
  ['impact', 'Impact'],
  ['actions', 'Actions'],
  ['limitations', 'Limitations'],
  ['pdf', 'PDF'],
  ['slides', 'Slides'],
  ['method', 'Methodology'],
];

function Section({ id, icon: Icon, title, children }) {
  return (
    <section id={id} className="section">
      <h2>
        <Icon size={22} aria-hidden="true" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Kpi({ icon: Icon, label, value, note }) {
  return (
    <div className="card kpi">
      <Icon size={20} className="kpi-icon" aria-hidden="true" />
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-note">{note}</div>
    </div>
  );
}

function ChurnChart({ title, data }) {
  const top = Math.max(...data.map((d) => d.rate));
  return (
    <div className="card chart-card">
      <h4>{title}</h4>
      <div className="chart-box" role="img" aria-label={`Bar chart: ${title}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 22, right: 8, left: -12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe3f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#0b1f3a' }} interval={0} />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12, fill: '#5a6478' }}
            />
            <Tooltip
              formatter={(v, _n, p) => [
                `${v.toFixed(1)}% (${p.payload.churned} of ${p.payload.total})`,
                'Churn rate',
              ]}
            />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.rate === top ? '#1d4ed8' : '#93b4f5'} />
              ))}
              <LabelList
                dataKey="rate"
                position="top"
                formatter={(v) => `${v.toFixed(0)}%`}
                style={{ fontSize: 12, fill: '#0b1f3a', fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function App() {
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [customPct, setCustomPct] = useState(20);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/customer_churn_sample.csv`)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load the dataset (HTTP ${r.status}).`);
        return r.text();
      })
      .then((text) => {
        const rows = parseCsv(text);
        if (!rows.length) throw new Error('The dataset file is empty.');
        setAnalytics(analyze(rows));
      })
      .catch((e) => setError(e.message));
  }, []);

  const content = useMemo(() => {
    if (!analytics) return null;
    return {
      summary: buildSummary(analytics),
      insights: buildInsights(analytics),
      actions: buildActions(analytics),
      limitations: buildLimitations(analytics),
    };
  }, [analytics]);

  if (error) {
    return (
      <div className="page">
        <div className="card notice">
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  if (!analytics) {
    return (
      <div className="page">
        <p className="muted">Loading dataset…</p>
      </div>
    );
  }

  const a = analytics;
  const downloadPdf = async () => {
    const { downloadExecutivePdf } = await import('./pdf.js');
    downloadExecutivePdf(a);
  };
  const customRows = Math.min(100, Math.max(0, Number(customPct) || 0));
  const custom = scenario(a, customRows);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <strong className="brand">Executive Analytics Capstone</strong>
          <nav aria-label="Sections">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="page">
        <div className="hero">
          <p className="eyebrow">Customer Churn Analytics Internship</p>
          <h1>Executive Analytics Capstone</h1>
          <p className="lead">
            A short executive report on customer churn: the problem, five insights, illustrative
            financial impact, recommended actions and limitations.
          </p>
        </div>

        {/* 1. Executive Overview */}
        <Section id="overview" icon={BarChart3} title="1. Executive Overview">
          <div className="kpi-grid">
            <Kpi icon={Users} label="Total Customers" value={fmtInt(a.total)} note="Rows in the dataset" />
            <Kpi
              icon={Percent}
              label="Churn Rate"
              value={fmtPct(a.churnRate)}
              note={`${a.churned} churned ÷ ${a.total} customers`}
            />
            <Kpi
              icon={UserCheck}
              label="Retention Rate"
              value={fmtPct(a.retentionRate)}
              note={`${a.retained} retained ÷ ${a.total} customers`}
            />
            <Kpi
              icon={Wallet}
              label="Revenue at Risk"
              value={a.revenueReliable ? fmtNum(a.revenueAtRisk) : 'n/a'}
              note="Monthly charges, dataset units"
            />
          </div>
          <p className="callout">
            <strong>What “Revenue at Risk” means:</strong> the monthly recurring charge associated with
            customers who have already churned. It is not a guaranteed future loss or a forecast of
            preventable revenue.
          </p>
          <div className="summary-grid">
            {content.summary.map((s) => (
              <div className="card" key={s.q}>
                <h4>{s.q}</h4>
                <p>{s.a}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 2. Five Key Insights */}
        <Section id="insights" icon={Lightbulb} title="2. Five Key Insights">
          <p className="muted">
            Each insight is calculated from the dataset. These are associations, not proven causes.
          </p>
          <div className="insight-list">
            {content.insights.map((ins) => (
              <article className="card insight" key={ins.id}>
                <div className="insight-num">{ins.id}</div>
                <div>
                  <h3>{ins.title}</h3>
                  <dl>
                    <dt>Finding</dt>
                    <dd>{ins.finding}</dd>
                    <dt>Supporting metric</dt>
                    <dd>{ins.metric}</dd>
                    <dt>Business meaning</dt>
                    <dd>{ins.meaning}</dd>
                    <dt>Recommended action</dt>
                    <dd>{ins.action}</dd>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        </Section>

        {/* 3. Business Impact */}
        <Section id="impact" icon={TrendingUp} title="3. Business Impact">
          <div className="chart-grid">
            <ChurnChart title="Churn rate by contract type" data={a.byContract} />
            <ChurnChart
              title="Churn rate by tenure"
              data={a.byTenure.filter((g) => g.name !== 'Unknown')}
            />
            <ChurnChart title="Churn rate by payment method" data={a.byPayment} />
            <ChurnChart title="Churn rate by subscription type" data={a.bySubscription} />
          </div>
          <p className="muted small">
            Darker bar = highest churn rate in that chart. Hover or tap a bar to see customer counts.
            Groups are small, so rates move a lot with a single customer.
          </p>

          <h3 className="sub">Illustrative retention scenarios</h3>
          {a.revenueReliable ? (
            <div className="impact-grid">
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Scenario: retain…</th>
                        <th>Customers retained</th>
                        <th>Monthly revenue</th>
                        <th>Annualized revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SCENARIOS.map((pct) => {
                        const s = scenario(a, pct);
                        return (
                          <tr key={pct}>
                            <td>{pct}% of churned customers</td>
                            <td>{s.customers}</td>
                            <td>{fmtNum(s.monthly)}</td>
                            <td>{fmtNum(s.annual)}</td>
                          </tr>
                        );
                      })}
                      <tr className="custom-row">
                        <td>
                          <label>
                            Your own:{' '}
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={customPct}
                              onChange={(e) => setCustomPct(e.target.value)}
                              aria-label="Custom retention percentage"
                            />{' '}
                            %
                          </label>
                        </td>
                        <td>{custom.customers}</td>
                        <td>{fmtNum(custom.monthly)}</td>
                        <td>{fmtNum(custom.annual)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="muted small">
                  With only {a.churned} churned customers, small percentages round to 0 or 1 whole
                  customer.
                </p>
              </div>

              <div className="card assumptions">
                <h4>
                  <AlertTriangle size={18} aria-hidden="true" /> Assumptions
                </h4>
                <ul>
                  <li>
                    These percentages are <strong>hypothetical scenarios, not predictions</strong>.
                  </li>
                  <li>
                    Customers retained = churned customers ({a.churned}) × scenario %, rounded to a
                    whole number.
                  </li>
                  <li>
                    Monthly revenue = customers retained × {fmtNum(a.avgChurnCharge)} (average monthly
                    charge of churned customers).
                  </li>
                  <li>Annualized revenue = monthly revenue × 12.</li>
                  <li>
                    Assumes retained customers would keep paying that average charge. It does not show
                    these customers can actually be recovered.
                  </li>
                  <li>
                    This is revenue, <strong>not profit</strong>, and not a guaranteed return, causal
                    impact or statistically validated forecast.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="card notice">
              <p>
                Scenario estimates are not shown because monthly charge data for churned customers is
                missing or incomplete.
              </p>
            </div>
          )}
        </Section>

        {/* 4. Recommended Actions */}
        <Section id="actions" icon={ListChecks} title="4. Recommended Actions">
          <div className="action-list">
            {content.actions.map((act, i) => (
              <div className="card action" key={act.title}>
                <span className={`pill pill-${act.priority.toLowerCase()}`}>{act.priority}</span>
                <h3>
                  {i + 1}. {act.title}
                </h3>
                <p>
                  <strong>Why:</strong> {act.why}
                </p>
                <p>
                  <strong>How:</strong> {act.how}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* 5. Limitations */}
        <Section id="limitations" icon={AlertTriangle} title="5. Limitations and Assumptions">
          <div className="card">
            <ul className="plain-list">
              {content.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </Section>

        {/* 6. PDF */}
        <Section id="pdf" icon={FileText} title="6. Downloadable Executive PDF">
          <div className="card pdf-card">
            <p>
              Download a multi-page executive report with the KPIs, summary, five insights, scenarios,
              actions and limitations. It is generated in your browser from the same calculated
              numbers shown on this page.
            </p>
            <button className="btn" onClick={downloadPdf}>
              <Download size={18} /> Download Executive PDF
            </button>
          </div>
        </Section>

        {/* 7. Slides */}
        <Section id="slides" icon={Presentation} title="7. Presentation Slides">
          <Slides analytics={a} />
        </Section>

        {/* 8. Methodology */}
        <Section id="method" icon={Database} title="8. Data and Methodology">
          <div className="method-grid">
            <div className="card">
              <h4>Data source</h4>
              <p>
                Edvyro customer churn sample dataset (
                <a href={SOURCE_URL} target="_blank" rel="noreferrer">
                  customer_churn_sample.csv
                </a>
                ). A copy is bundled with this site and read in the browser. All results are calculated
                from the real file; none are synthetic.
              </p>
              <p>
                {a.rowCount} rows, {a.fields.length} columns: {a.fields.join(', ')}.
              </p>
            </div>
            <div className="card">
              <h4>Definitions</h4>
              <ul>
                <li>Churn Rate = Churned ÷ Total customers × 100</li>
                <li>Retention Rate = Retained ÷ Total customers × 100</li>
                <li>Revenue at Risk = Sum of MonthlyCharges where Churn = “Yes”</li>
                <li>Tenure bands: 0–12, 13–24, 25+ months</li>
                <li>Ticket bands: 0–2 and 3+ support tickets</li>
              </ul>
            </div>
            <div className="card">
              <h4>Scenario formulas</h4>
              <ul>
                <li>Customers retained = Churned × scenario % (rounded to whole number)</li>
                <li>Monthly revenue retained = Customers retained × average churned monthly charge</li>
                <li>Annualized revenue = Monthly revenue retained × 12</li>
              </ul>
            </div>
            <div className="card">
              <h4>Data quality checks</h4>
              <ul>
                <li>Invalid Churn labels: {a.invalidChurnRows}</li>
                <li>
                  Blank values:{' '}
                  {Object.values(a.missingByField).reduce((s, v) => s + v, 0)} across all columns
                </li>
                <li>Churned customers missing a monthly charge: {a.churnedMissingCharge}</li>
              </ul>
            </div>
          </div>
        </Section>
      </main>

      <footer className="footer">
        Executive Analytics Capstone · Runs entirely in your browser · {a.total} customers analysed
      </footer>
    </>
  );
}
