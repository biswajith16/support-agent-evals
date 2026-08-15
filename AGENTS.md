# Support Agent Evals — Agent Guide

## Purpose
Portfolio-quality, synthetic dashboard showing how an AI customer-support agent can be evaluated for answer quality, retrieval, groundedness, latency, and escalation behavior.

## Architecture
- `evaluation/`: standalone Python logic generates JSON evaluation data.
- `data/`: generated JSON consumed statically by the Next.js frontend.
- `app/` and `components/`: Next.js App Router UI.
- No backend, database, paid API, live model, or customer data.

## Conventions
- Use TypeScript with small, focused React components.
- Use Tailwind CSS for styling and Lucide React for icons.
- Derive dashboard metrics from the generated JSON; do not hard-code metric values.
- Preserve the dark, calm, enterprise-observability visual language.
- Keep all support conversations and data synthetic.
- Keep Python evaluation logic transparent, deterministic, and honest about limitations.
- Avoid scope expansion and minimize dependencies.

## Before completing work
- Run the relevant Python generator when data changes.
- Run `npm run build` for frontend validation.
- Visually inspect significant UI work for layout, readability, overflow, and responsive behavior.
