export type Result = "PASS" | "REVIEW" | "FAIL";

export type RetrievedDocument = {
  id: string;
  title: string;
  excerpt: string;
  relevant: boolean;
};

export type Evaluation = {
  id: string;
  timestamp: string;
  question: string;
  category: string;
  retrieved_context: string;
  retrieved_documents: RetrievedDocument[];
  reference_answer: string;
  generated_answer: string;
  correctness_score: number;
  retrieval_score: number;
  recall_at_k: number;
  relevant_documents_retrieved: number;
  total_documents_retrieved: number;
  groundedness_score: number;
  hallucination_detected: boolean;
  latency_ms: number;
  escalated: boolean;
  escalation_reason: string;
  escalation_appropriate: boolean | null;
  overall_score: number;
  result: Result;
  failure_signals: string[];
};

export type EvaluationDataset = {
  metadata: {
    generated_at: string;
    record_count: number;
    synthetic: boolean;
    methodology: string;
    latency_metrics: { average_ms: number; p50_ms: number; p95_ms: number };
    result_thresholds: Record<string, string>;
  };
  evaluations: Evaluation[];
};
