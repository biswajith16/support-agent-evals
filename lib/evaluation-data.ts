import dataset from "@/data/evaluations.json";
import type { Evaluation, EvaluationDataset } from "@/types/evaluation";

export const evaluationDataset = dataset as EvaluationDataset;
export const evaluations = evaluationDataset.evaluations;

export const average = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1));
export const percentage = (numerator: number, denominator: number) => Math.round((numerator / Math.max(denominator, 1)) * 100);

export function formatLatency(milliseconds: number) {
  return `${(milliseconds / 1000).toFixed(milliseconds < 1000 ? 1 : 2)}s`;
}

export function formatDate(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(timestamp));
}

export function dashboardMetrics(records: Evaluation[]) {
  return {
    overall: average(records.map((record) => record.overall_score)),
    correctness: average(records.map((record) => record.correctness_score)),
    retrieval: average(records.map((record) => record.retrieval_score)),
    latency: average(records.map((record) => record.latency_ms)),
    escalationRate: percentage(records.filter((record) => record.escalated).length, records.length),
    hallucinationRate: percentage(records.filter((record) => record.hallucination_detected).length, records.length),
  };
}
