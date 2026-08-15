"""Small, deterministic demonstration metrics for synthetic support-agent evaluations.

These keyword and metadata-based rules make the project easy to explain. They are
not production-grade evaluators: a real system would also use semantic methods,
LLM-as-a-judge checks, human review, and live traces.
"""

from __future__ import annotations

from statistics import mean


def keyword_overlap(answer: str, reference: str) -> float:
    """Return the portion of meaningful reference words found in an answer."""
    ignored = {"the", "and", "for", "with", "your", "you", "can", "will", "this", "that", "from", "when", "into", "then", "are", "our"}
    reference_words = {word.strip(".,?!:;").lower() for word in reference.split()} - ignored
    answer_words = {word.strip(".,?!:;").lower() for word in answer.split()}
    return len(reference_words & answer_words) / max(len(reference_words), 1)


def calculate_correctness(answer: str, reference: str, quality: str) -> int:
    """Combine answer/reference overlap with the known synthetic response quality."""
    baselines = {"excellent": 93, "average": 71, "poor": 47}
    overlap_adjustment = round((keyword_overlap(answer, reference) - 0.45) * 12)
    return max(0, min(100, baselines[quality] + overlap_adjustment))


def calculate_retrieval_score(relevant_documents: int, total_documents: int, retrieval_quality: str) -> int:
    """Score useful documents retrieved, with a small deterministic quality adjustment."""
    base = (relevant_documents / max(total_documents, 1)) * 82
    adjustment = {"excellent": 14, "average": 2, "poor": -18}[retrieval_quality]
    return max(0, min(100, round(base + adjustment)))


def calculate_recall_at_k(relevant_documents: int, available_relevant_documents: int) -> float:
    """Recall@K: how much of the relevant knowledge was found in the top K results."""
    return round(relevant_documents / max(available_relevant_documents, 1), 2)


def calculate_groundedness(answer: str, retrieved_context: str, has_unsupported_claim: bool) -> int:
    """Estimate whether the answer is supported by the retrieved context."""
    support = keyword_overlap(answer, retrieved_context)
    score = 79 + round(support * 20)
    if has_unsupported_claim:
        score -= 39
    return max(0, min(100, score))


def detect_hallucination(has_unsupported_claim: bool, answer: str, retrieved_context: str) -> bool:
    """Flag known synthetic unsupported claims; not a real hallucination detector."""
    unsupported_markers = ("guaranteed", "lifetime", "instant cash", "automatically waive")
    marker_found = any(marker in answer.lower() and marker not in retrieved_context.lower() for marker in unsupported_markers)
    return has_unsupported_claim or marker_found


def determine_escalation(reason: str) -> bool:
    """An issue is escalated whenever its synthetic escalation reason is not None."""
    return reason != "None"


def calculate_latency_metrics(latencies: list[int]) -> dict[str, int]:
    """Return average, P50, and P95 in milliseconds using nearest-rank percentiles."""
    ordered = sorted(latencies)

    def percentile(percent: float) -> int:
        index = max(0, min(len(ordered) - 1, round((len(ordered) - 1) * percent)))
        return ordered[index]

    return {"average_ms": round(mean(latencies)), "p50_ms": percentile(0.50), "p95_ms": percentile(0.95)}


def calculate_overall_score(correctness: int, retrieval: int, groundedness: int, latency_ms: int, hallucination: bool) -> int:
    """Weighted quality score with transparent penalties for severe signals."""
    score = round(correctness * 0.45 + retrieval * 0.25 + groundedness * 0.30)
    if latency_ms > 3500:
        score -= 7
    if hallucination:
        score -= 20
    return max(0, min(100, score))


def determine_result(correctness: int, retrieval: int, groundedness: int, hallucination: bool, escalation_appropriate: bool | None) -> str:
    """Apply the dashboard's published PASS, REVIEW, and FAIL rules."""
    if hallucination or correctness < 55 or retrieval < 40 or groundedness < 55 or escalation_appropriate is False:
        return "FAIL"
    if correctness < 80 or retrieval < 65 or groundedness < 75:
        return "REVIEW"
    return "PASS"


def generate_failure_signals(correctness: int, retrieval: int, groundedness: int, latency_ms: int, hallucination: bool, escalation_appropriate: bool | None, retrieval_quality: str) -> list[str]:
    """Create reviewer-friendly, deterministic reasons for investigation."""
    signals: list[str] = []
    if retrieval_quality == "poor" or retrieval < 40:
        signals.append("Poor retrieval: relevant knowledge was not retrieved")
    if hallucination:
        signals.append("Unsupported claim detected in generated answer")
    if correctness < 70:
        signals.append("Correctness below threshold")
    if groundedness < 70:
        signals.append("Groundedness below threshold")
    if latency_ms > 3500:
        signals.append("Latency exceeded 3.5 second threshold")
    if escalation_appropriate is False:
        signals.append("Escalation decision was inappropriate")
    return signals
