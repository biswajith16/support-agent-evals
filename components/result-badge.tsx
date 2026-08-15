import type { Result } from "@/types/evaluation";

const styles: Record<Result, string> = {
  PASS: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  REVIEW: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  FAIL: "border-rose-400/20 bg-rose-400/10 text-rose-300",
};

export function ResultBadge({ result }: { result: Result }) {
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${styles[result]}`}>{result}</span>;
}
