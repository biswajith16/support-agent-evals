# Support Agent Evals

An AI support-agent evaluation dashboard that demonstrates how teams can monitor answer quality, retrieval quality, groundedness, latency, and human escalation behavior.

> All support conversations and evaluation data in this project are synthetic and created solely for demonstration purposes.

## Why I Built This

An AI support agent is only valuable when its answers can be trusted. A production team needs to know whether the agent answered correctly, retrieved useful knowledge, stayed grounded in that knowledge, responded quickly, and escalated to a person when appropriate.

This project is a focused proof of work for AI-agent evaluation, RAG evaluation, observability, failure analysis, and production-minded dashboard design.

## Demo

Live demo: [Support Agent Evals](https://support-agent-evals-6hhgvj9i1-biswa-projects1.vercel.app)

## What It Measures

- **Answer Correctness** — how accurately the answer addresses the reference answer.
- **Retrieval Quality** — whether useful support knowledge was retrieved.
- **Recall@K** — how much relevant knowledge was found in the retrieved document set.
- **Groundedness** — whether the generated answer is supported by retrieved context.
- **Hallucination Rate** — the proportion of answers with simulated unsupported claims.
- **Latency** — average, P50, and P95 response time.
- **Escalation Rate** — the proportion of cases handed to a human.
- **Escalation Appropriateness** — whether the handoff decision made sense.

## Architecture

```text
Support Question
  → Knowledge Retrieval
  → Retrieved Documents
  → AI Support Agent Answer
  → Python Evaluation Engine
  → Evaluation JSON Dataset
  → Next.js Dashboard
  → Analytics + Failure Investigation
```

## Evaluation Pipeline

`evaluation/generate_dataset.py` creates 75 deterministic, synthetic support scenarios. For each record it creates retrieved documents, a reference answer, a generated answer, evaluation metrics, a result, and reviewer-friendly failure signals.

The generated [data/evaluations.json](data/evaluations.json) is static. The Next.js application reads it directly, so a deployed site does not need Python running continuously.

## Evaluation Methodology

This is an intentionally transparent demonstration evaluator, not a production-grade judging system.

- Correctness uses keyword overlap plus a controlled synthetic quality level.
- Retrieval uses relevant-document coverage and Recall@K.
- Groundedness compares generated-answer terms with retrieved context and applies known synthetic unsupported-claim flags.
- Hallucination detection uses controlled synthetic flags and simple unsupported markers.
- Overall score is a weighted combination of correctness, retrieval, and groundedness, with penalties for slow responses and hallucinations.
- `PASS`, `REVIEW`, and `FAIL` use published, deterministic thresholds visible in the dashboard.

In production, these signals could be improved through LLM-as-a-judge, embedding similarity, semantic evaluation, human evaluation, RAG evaluation frameworks, and production tracing.

## Tech Stack

- Python
- Next.js
- React
- TypeScript
- Tailwind CSS
- Recharts
- Lucide React

## Running Locally

1. Install Node.js 20 or newer and Python 3.10 or newer.
2. In a terminal, move into this project folder:

   ```bash
   cd "/Users/biswajithyetukuri/Documents/ChatGPT/Support Agent Dashboard"
   ```

3. Install frontend packages:

   ```bash
   npm install
   ```

4. Generate the synthetic evaluation data:

   ```bash
   python3 -m evaluation.generate_dataset
   ```

5. Start the dashboard:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

## Generate Evaluation Data

Whenever you change the Python evaluator or synthetic scenarios, run:

```bash
python3 -m evaluation.generate_dataset
```

The generated JSON is written to `data/evaluations.json`.

## Production Evolution

This small prototype could evolve with:

- Live agent traces and conversation events
- Real retrieval and vector-database telemetry
- LLM-as-a-judge and embedding-based evaluations
- Human review queues and feedback collection
- Persistent evaluation storage and versioning
- Alerting for hallucinations, latency, or retrieval regressions
- Real-time dashboards

## Limitations

- All data is synthetic.
- No production LLM is called.
- Metrics use simplified deterministic heuristics.
- Hallucination detection is demonstrative, not production-grade.
- The app is designed as a static-dashboard proof of work, not a complete support system.

## Disclaimer

All support conversations and evaluation data in this project are synthetic and created solely for demonstration purposes.
