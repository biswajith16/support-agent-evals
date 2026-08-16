import type { Evaluation, Result } from "@/types/evaluation";

export type ImportedEvaluation = Omit<Evaluation, "id">;

export type ImportSummary = {
  records: ImportedEvaluation[];
  warnings: string[];
};

type UnknownRecord = Record<string, unknown>;

const categories = new Set(["Account", "Billing", "Delivery", "Returns", "Technical", "Product"]);
const resultValues = new Set<Result>(["PASS", "REVIEW", "FAIL"]);

const asString = (value: unknown, fallback = "") => typeof value === "string" ? value.trim() : value == null ? fallback : String(value);
const asNumber = (value: unknown, fallback: number) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : fallback;
};
const asLatency = (value: unknown, fallback: number) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
};
const asBoolean = (value: unknown, fallback = false) => value === true || value === "true" || value === "TRUE" || value === "1" ? true : value === false || value === "false" || value === "FALSE" || value === "0" ? false : fallback;
const list = (value: unknown) => Array.isArray(value) ? value.map((item) => asString(item)).filter(Boolean) : asString(value).split("|").map((item) => item.trim()).filter(Boolean);

function documents(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const document = item as UnknownRecord;
      return {
        id: asString(document.id, `document-${index + 1}`),
        title: asString(document.title, `Retrieved document ${index + 1}`),
        excerpt: asString(document.excerpt ?? document.content),
        relevant: asBoolean(document.relevant),
      };
    });
  }
  return [];
}

function normalizeRecord(record: UnknownRecord, index: number): ImportedEvaluation {
  const generatedAnswer = asString(record.generated_answer ?? record.answer ?? record.response);
  const referenceAnswer = asString(record.reference_answer ?? record.expected_answer);
  const retrievedContext = asString(record.retrieved_context ?? record.context);
  const hallucinationDetected = asBoolean(record.hallucination_detected);
  const latency = asLatency(record.latency_ms ?? record.latency, 0);
  const correctness = asNumber(record.correctness_score, referenceAnswer ? 70 : generatedAnswer ? 60 : 0);
  const retrieval = asNumber(record.retrieval_score, retrievedContext ? 70 : 0);
  const groundedness = asNumber(record.groundedness_score, retrievedContext && generatedAnswer ? 70 : 0);
  const overall = asNumber(record.overall_score, Math.round(correctness * 0.45 + retrieval * 0.25 + groundedness * 0.3 - (hallucinationDetected ? 20 : 0) - (latency > 5000 ? 8 : 0)));
  const suggestedResult: Result = overall >= 80 ? "PASS" : overall >= 60 ? "REVIEW" : "FAIL";
  const result = asString(record.result).toUpperCase() as Result;
  const escalated = asBoolean(record.escalated);
  const retrievedDocuments = documents(record.retrieved_documents);
  const failureSignals = list(record.failure_signals);

  if (!generatedAnswer) throw new Error(`Row ${index + 1} is missing generated_answer (or answer/response).`);

  return {
    timestamp: asString(record.timestamp, new Date().toISOString()),
    question: asString(record.question ?? record.prompt, "Imported support conversation"),
    category: categories.has(asString(record.category)) ? asString(record.category) : "Technical",
    retrieved_context: retrievedContext,
    retrieved_documents: retrievedDocuments,
    reference_answer: referenceAnswer,
    generated_answer: generatedAnswer,
    correctness_score: correctness,
    retrieval_score: retrieval,
    recall_at_k: asNumber(record.recall_at_k, retrievedDocuments.length ? Math.round((retrievedDocuments.filter((document) => document.relevant).length / retrievedDocuments.length) * 100) : 0),
    relevant_documents_retrieved: asNumber(record.relevant_documents_retrieved, retrievedDocuments.filter((document) => document.relevant).length),
    total_documents_retrieved: asNumber(record.total_documents_retrieved, retrievedDocuments.length),
    groundedness_score: groundedness,
    hallucination_detected: hallucinationDetected,
    latency_ms: latency,
    escalated,
    escalation_reason: asString(record.escalation_reason),
    escalation_appropriate: record.escalation_appropriate == null || record.escalation_appropriate === "" ? null : asBoolean(record.escalation_appropriate),
    overall_score: overall,
    result: resultValues.has(result) ? result : suggestedResult,
    failure_signals: failureSignals,
  };
}

export function normalizeImport(raw: unknown): ImportSummary {
  const source = Array.isArray(raw) ? raw : (raw as { evaluations?: unknown[] })?.evaluations;
  if (!Array.isArray(source) || source.length === 0) throw new Error("Use a JSON array, a dashboard export with an evaluations array, or a CSV with an answer column.");
  if (source.length > 500) throw new Error("Imports are limited to 500 records at a time.");

  const records = source.map((item, index) => normalizeRecord(item as UnknownRecord, index));
  const warnings = records.filter((record) => !record.reference_answer).length
    ? ["Some records have no reference answer, so their default correctness score is only a transparent heuristic."]
    : [];
  return { records, warnings };
}
