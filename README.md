# Executive Analytics Capstone

A browser-only executive report that turns customer churn analysis into a short, plain-English story for a nontechnical decision-maker: the problem, five insights, illustrative financial impact, recommended actions and limitations.

Built with React, Vite, Recharts, plain CSS, Lucide icons and jsPDF. No backend, no database, no paid services.

## What is on the website

1. **Executive Overview**: four KPI cards (Total Customers, Churn Rate, Retention Rate, Revenue at Risk) and a four-question executive summary
2. **Five Key Insights**: finding, supporting metric, business meaning and recommended action for each
3. **Business Impact**: churn charts by group and illustrative retention scenarios with assumptions shown beside the results
4. **Recommended Actions**
5. **Limitations and Assumptions**
6. **Downloadable Executive PDF**: generated in the browser
7. **Presentation Slides**: built-in slide viewer (arrow keys or buttons)
8. **Data and Methodology**: source, definitions, formulas and data quality checks

## Dataset

Edvyro customer churn sample: <https://edvyro.in/datasets/customer_churn_sample.csv>

The real file was accessed and inspected: **15 customers, 11 columns** (CustomerID, Gender, Age, TenureMonths, SubscriptionType, MonthlyCharges, TotalCharges, ContractType, SupportTickets, PaymentMethod, Churn). A copy is stored in `public/data/customer_churn_sample.csv` and every number on the site is calculated from it. Nothing is synthetic.

## Headline results

| Metric | Value |
| --- | --- |
| Total customers | 15 |
| Churned / retained | 7 / 8 |
| Churn rate | 46.7% |
| Retention rate | 53.3% |
| Revenue at risk (monthly charges of churned customers) | 409.93 |

Revenue at risk is the monthly recurring charge of customers who have **already churned**. It is not a forecast or a guaranteed loss. The dataset does not state a currency, so amounts are in dataset units.

## Definitions

- Churn Rate = Churned ÷ Total × 100
- Retention Rate = Retained ÷ Total × 100
- Revenue at Risk = sum of MonthlyCharges where Churn = Yes
- Scenario customers retained = churned customers × scenario %, rounded to a whole number
- Scenario monthly revenue = customers retained × average monthly charge of churned customers
- Scenario annualized revenue = monthly revenue × 12

Scenarios (5%, 10%, 15%, 25%, 50% or your own) are **hypothetical, not predictions**, and show revenue, not profit.

## Important limitations

- Only 15 customers, so one customer moves a percentage a lot. Nothing is statistically tested.
- Results are associations, not causes. Contract type, tenure and payment method overlap heavily.
- No dates in the file, so the order of events (for example, tickets versus the decision to leave) is unknown.
- No cost data, so nothing here is profit.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev        # development server
npm run build      # production build in dist/
npm run preview    # preview the production build
npm test           # re-checks every calculation against hand-counted values
```

## Project structure

```
public/data/customer_churn_sample.csv   dataset copy
src/analytics.js    all calculations, insights, actions, limitations
src/App.jsx         page layout and charts
src/Slides.jsx      slide viewer
src/pdf.js          PDF report generator
src/styles.css      styles
scripts/verify.mjs  calculation checks (npm test)
```

## 🌐 Live Demo

**[Click here to visit the live website](https://executive-analytics-capstone.vercel.app/)**
