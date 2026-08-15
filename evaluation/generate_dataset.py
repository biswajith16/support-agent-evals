"""Generate deterministic, synthetic support-agent evaluation records.

Run from the repository root:
    python3 -m evaluation.generate_dataset
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from evaluation.metrics import (
    calculate_correctness,
    calculate_groundedness,
    calculate_latency_metrics,
    calculate_overall_score,
    calculate_recall_at_k,
    calculate_retrieval_score,
    detect_hallucination,
    determine_escalation,
    determine_result,
    generate_failure_signals,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "data" / "evaluations.json"

SCENARIOS = [
    ("Account Access", "How do I reset my password?", "Use the Forgot password link on the sign-in page. We send a reset email that expires after 30 minutes.", "Password reset links are sent from the sign-in page and expire after 30 minutes."),
    ("Account Access", "Why can't I access my account?", "Check your email and password first. Five failed attempts lock an account for 15 minutes; an administrator can also disable access.", "Account access can fail after five unsuccessful attempts, which causes a 15-minute lockout."),
    ("Account Access", "Can an administrator reset MFA for another user?", "Organization administrators can reset a member's MFA after verifying the member identity in the admin console.", "An organization administrator can reset a member's MFA after identity verification."),
    ("Billing", "Why was I charged twice this month?", "Duplicate charges can be pending authorizations. If both charges settle after five business days, contact billing with the invoice numbers.", "A duplicate-looking charge may be pending. Contact billing if both charges settle after five business days."),
    ("Billing", "How do I update my billing information?", "Account owners can update billing details under Settings, Billing, and Payment method. Changes apply to future invoices.", "The account owner can update payment details in Settings > Billing > Payment method."),
    ("Billing", "Where can I download my invoices?", "Account owners can download invoices from Settings, Billing, and Invoices. Invoices remain available for the account lifetime.", "Invoices are available to the account owner under Settings > Billing > Invoices."),
    ("Technical Support", "Why is the desktop app not syncing?", "Check the status page, confirm the app is online, and restart it. Sync requires app version 4.2 or later.", "Confirm the app is online and updated to version 4.2 or later, then restart it."),
    ("Technical Support", "How do I export my workspace data?", "Workspace owners can request an export from Settings, Data controls. The download is prepared within 24 hours.", "A workspace owner can request an export in Settings > Data controls; it is prepared within 24 hours."),
    ("Technical Support", "Why am I seeing an upload error?", "Uploads support files up to 2 GB. Check your connection and try a file under the size limit.", "Check the connection and confirm the file is no larger than 2 GB."),
    ("Product Information", "Does the platform support SSO?", "Single sign-on is available on Business and Enterprise plans with SAML 2.0 identity providers.", "SSO is available on Business and Enterprise plans using SAML 2.0."),
    ("Product Information", "Can I use the platform on mobile?", "The mobile app is available for iOS 16+ and Android 10+. Some administrator settings require the web app.", "The mobile app supports iOS 16+ and Android 10+, while some admin settings need the web app."),
    ("Product Information", "Do you offer a public API?", "The REST API is available on Pro, Business, and Enterprise plans. API keys are managed in developer settings.", "The REST API is offered on Pro and higher plans, with keys managed in developer settings."),
    ("Subscription", "Can I cancel my subscription immediately?", "Account owners can cancel in Settings, Billing. Paid access continues through the current billing period and is not prorated.", "Account owners can cancel from Billing; access remains until the billing period ends and refunds are not prorated."),
    ("Subscription", "How long does a refund take?", "Approved refunds return to the original payment method in 5 to 10 business days. Refund eligibility depends on the purchase terms.", "Approved refunds take 5–10 business days and return to the original payment method."),
    ("Subscription", "Can I downgrade my subscription?", "Account owners can schedule a downgrade in Billing. The lower plan takes effect at the next renewal date.", "An account owner can schedule a downgrade, which takes effect on the next renewal."),
    ("Security", "How do I report a security issue?", "Report suspected vulnerabilities through the security contact form. Do not include passwords or access tokens in the report.", "Use the security contact form and do not send passwords or access tokens."),
    ("Security", "Can support remove a former employee's access?", "Organization administrators can remove members in the admin console. Support may verify ownership before helping with account recovery.", "Organization administrators can remove former employees in the admin console."),
    ("Security", "What happens if I suspect unauthorized access?", "Change your password, review active sessions, enable MFA, and contact support if you cannot secure the account.", "Change your password, review sessions, enable MFA, and contact support if the account cannot be secured."),
]

REASONS = ["None", "Low Confidence", "Missing Knowledge", "Policy Restriction", "Customer Requested Human", "Sensitive Request", "System Failure"]


def response_for(reference: str, quality: str, unsupported: bool) -> str:
    if quality == "excellent":
        answer = reference + " Please use the relevant setting in your account to complete this."
    elif quality == "average":
        answer = reference.split(".")[0] + ". You can check your account settings for the next step."
    else:
        answer = "You should check your account settings or contact support for assistance."
    if unsupported:
        answer += " This is guaranteed to be resolved instantly and we automatically waive all related charges."
    return answer


def make_documents(context: str, retrieval_quality: str, index: int) -> tuple[list[dict[str, object]], int, int]:
    relevant = 3 if retrieval_quality == "excellent" else 2 if retrieval_quality == "average" else 1
    available = 3
    documents: list[dict[str, object]] = []
    for position in range(3):
        is_relevant = position < relevant
        excerpt = context if is_relevant else "General workspace guidance and account navigation information."
        documents.append({"id": f"DOC-{index:03d}-{position + 1}", "title": "Relevant support policy" if is_relevant else "General help article", "excerpt": excerpt, "relevant": is_relevant})
    return documents, relevant, available


def generate_record(index: int) -> dict[str, object]:
    category, question, context, reference = SCENARIOS[index % len(SCENARIOS)]
    problem = index in {4, 8, 12, 17, 21, 26, 30, 35, 39, 44, 49, 54, 59, 64, 69, 73}
    severe = index in {8, 17, 30, 44, 54, 64, 73}
    moderate = index in {2, 10, 15, 23, 32, 41, 52, 61}
    retrieval_quality = "poor" if index in {8, 21, 35, 54, 69} else "average" if problem else "excellent"
    quality = "poor" if severe else "average" if problem or moderate else "excellent"
    unsupported = index in {12, 17, 39, 44, 59, 64, 73}
    reason = REASONS[index % len(REASONS)] if problem else "None"
    escalated = determine_escalation(reason)
    escalation_appropriate: bool | None = None
    if escalated:
        escalation_appropriate = index not in {4, 26, 49, 69}
    elif severe and index == 8:
        escalation_appropriate = False
    documents, relevant, available = make_documents(context, retrieval_quality, index + 1)
    answer = response_for(reference, quality, unsupported)
    correctness = calculate_correctness(answer, reference, quality)
    retrieval = calculate_retrieval_score(relevant, 3, retrieval_quality)
    recall = calculate_recall_at_k(relevant, available)
    groundedness = calculate_groundedness(answer, context, unsupported)
    hallucination = detect_hallucination(unsupported, answer, context)
    latency = (780 + ((index * 317) % 1350)) if not problem else (2550 + ((index * 431) % 2900))
    overall = calculate_overall_score(correctness, retrieval, groundedness, latency, hallucination)
    result = determine_result(correctness, retrieval, groundedness, hallucination, escalation_appropriate)
    signals = generate_failure_signals(correctness, retrieval, groundedness, latency, hallucination, escalation_appropriate, retrieval_quality)
    timestamp = datetime(2026, 7, 1, 9, 0, tzinfo=timezone.utc) + timedelta(hours=index * 5 + (index % 4))
    return {
        "id": f"EVAL-{index + 1:03d}", "timestamp": timestamp.isoformat().replace("+00:00", "Z"), "question": question, "category": category,
        "retrieved_context": context, "retrieved_documents": documents, "reference_answer": reference, "generated_answer": answer,
        "correctness_score": correctness, "retrieval_score": retrieval, "recall_at_k": recall,
        "relevant_documents_retrieved": relevant, "total_documents_retrieved": 3, "groundedness_score": groundedness,
        "hallucination_detected": hallucination, "latency_ms": latency, "escalated": escalated, "escalation_reason": reason,
        "escalation_appropriate": escalation_appropriate, "overall_score": overall, "result": result, "failure_signals": signals,
    }


def main() -> None:
    records = [generate_record(index) for index in range(75)]
    latency_metrics = calculate_latency_metrics([record["latency_ms"] for record in records])
    payload = {
        "metadata": {
            "generated_at": "2026-08-15T12:00:00Z", "record_count": len(records), "synthetic": True,
            "methodology": "Deterministic demonstration heuristics; not production-grade AI evaluation.",
            "latency_metrics": latency_metrics,
            "result_thresholds": {"pass": "No major signals; correctness >= 80, retrieval >= 65, groundedness >= 75", "review": "Moderate metric weakness needing investigation", "fail": "Hallucination, low score, poor retrieval, or inappropriate escalation"},
        },
        "evaluations": records,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    counts = {label: sum(record["result"] == label for record in records) for label in ("PASS", "REVIEW", "FAIL")}
    print(f"Wrote {len(records)} synthetic evaluations to {OUTPUT_PATH.relative_to(ROOT)}")
    print(f"Results: {counts}; latency: {latency_metrics}")


if __name__ == "__main__":
    main()
