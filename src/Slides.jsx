import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  SCENARIOS,
  buildActions,
  buildInsights,
  fmtInt,
  fmtNum,
  fmtPct,
  scenario,
} from './analytics.js';

function buildSlides(a) {
  const insights = buildInsights(a);
  const actions = buildActions(a);
  const s10 = scenario(a, 10);
  return [
    {
      title: 'Customer Churn: Executive Briefing',
      bullets: [
        `${fmtInt(a.total)} customers analysed from the Edvyro sample file`,
        `${fmtPct(a.churnRate)} have churned (${a.churned} customers)`,
        `Monthly charges linked to churned customers: ${a.revenueReliable ? fmtNum(a.revenueAtRisk) : 'n/a'}`,
      ],
    },
    ...insights.map((ins) => ({
      title: `Insight ${ins.id}: ${ins.title}`,
      bullets: [ins.finding, ins.metric, `Action: ${ins.action}`],
    })),
    {
      title: 'Illustrative Business Impact',
      bullets: a.revenueReliable
        ? [
            ...SCENARIOS.slice(0, 3).map((p) => {
              const s = scenario(a, p);
              return `Retain ${p}% of churned customers: ${s.customers} customer(s), ${fmtNum(s.annual)} annualized revenue`;
            }),
            'Hypothetical scenarios, not forecasts. Revenue, not profit.',
          ]
        : ['Not shown: monthly charge data for churned customers is incomplete.'],
    },
    {
      title: 'Recommended Actions',
      bullets: actions.slice(0, 4).map((x) => `${x.title}`),
    },
    {
      title: 'Limitations',
      bullets: [
        `Only ${a.total} customers; patterns are associations, not proven causes`,
        'No dates, so the order of events is unknown',
        'Pilot offers with a controlled test before committing budget',
      ],
    },
  ];
}

export default function Slides({ analytics }) {
  const slides = buildSlides(analytics);
  const [i, setI] = useState(0);
  const last = slides.length - 1;

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, last));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [last]);

  const slide = slides[i];
  return (
    <div className="slides">
      <div className="slide" aria-live="polite">
        <span className="slide-count">
          {i + 1} / {slides.length}
        </span>
        <h3>{slide.title}</h3>
        <ul>
          {slide.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
      <div className="slide-controls">
        <button className="btn btn-ghost" onClick={() => setI(Math.max(i - 1, 0))} disabled={i === 0}>
          <ChevronLeft size={18} /> Previous
        </button>
        <span className="muted small">Use the arrow keys or buttons</span>
        <button className="btn btn-ghost" onClick={() => setI(Math.min(i + 1, last))} disabled={i === last}>
          Next <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
