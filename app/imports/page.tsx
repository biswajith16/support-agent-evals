"use client";

import { FileJson2, FileUp, LoaderCircle, LogOut, ShieldCheck, UploadCloud } from "lucide-react";
import Papa from "papaparse";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { normalizeImport, type ImportedEvaluation } from "@/lib/import-evaluation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { DashboardShell } from "@/components/dashboard-shell";

type Run = { id: string; source_filename: string; source_format: string; total_records: number; passed_records: number; review_records: number; failed_records: number; created_at: string };

const acceptedFields = ["question", "category", "generated_answer", "reference_answer", "retrieved_context", "latency_ms", "correctness_score", "retrieval_score", "groundedness_score", "overall_score", "result"];

export default function ImportsPage() {
  const [email, setEmail] = useState<string>();
  const [runs, setRuns] = useState<Run[]>([]);
  const [file, setFile] = useState<File>();
  const [records, setRecords] = useState<ImportedEvaluation[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const breakdown = useMemo(() => ({
    pass: records.filter((record) => record.result === "PASS").length,
    review: records.filter((record) => record.result === "REVIEW").length,
    fail: records.filter((record) => record.result === "FAIL").length,
  }), [records]);

  async function loadWorkspace() {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setEmail(user.email);
    const { data, error: runError } = await supabase.from("evaluation_runs").select("id, source_filename, source_format, total_records, passed_records, review_records, failed_records, created_at").order("created_at", { ascending: false }).limit(8);
    if (runError) setError(runError.message);
    else setRuns((data ?? []) as Run[]);
    setLoading(false);
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    // Magic-link sessions are attached from the URL asynchronously. Listening here prevents
    // the import screen from showing the signed-out state during that brief handoff.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        window.setTimeout(() => { void loadWorkspace(); }, 0);
      }
    });
    void loadWorkspace();
    return () => subscription.unsubscribe();
  }, []);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setFile(selected); setError(""); setRecords([]); setWarnings([]);
    try {
      const text = await selected.text();
      const raw = selected.name.toLowerCase().endsWith(".csv")
        ? Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: "greedy" }).data
        : JSON.parse(text);
      const imported = normalizeImport(raw);
      setRecords(imported.records);
      setWarnings(imported.warnings);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not read that file.");
    }
  }

  async function saveRun() {
    if (!file || !records.length) return;
    setBusy(true); setError("");
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const { data: run, error: runError } = await supabase.from("evaluation_runs").insert({
      owner_id: user.id,
      source_filename: file.name,
      source_format: file.name.toLowerCase().endsWith(".csv") ? "csv" : "json",
      status: "completed",
      total_records: records.length,
      passed_records: breakdown.pass,
      review_records: breakdown.review,
      failed_records: breakdown.fail,
      metadata: { evaluator: "transparent-client-heuristic-v1", imported_at: new Date().toISOString() },
    }).select("id").single();
    if (runError || !run) { setError(runError?.message ?? "Unable to create the evaluation run."); setBusy(false); return; }

    const payload = records.map((record) => ({
      owner_id: user.id,
      run_id: run.id,
      event_timestamp: record.timestamp,
      question: record.question,
      category: record.category,
      retrieved_context: record.retrieved_context,
      retrieved_documents: record.retrieved_documents,
      reference_answer: record.reference_answer,
      generated_answer: record.generated_answer,
      correctness_score: record.correctness_score,
      retrieval_score: record.retrieval_score,
      recall_at_k: record.recall_at_k,
      groundedness_score: record.groundedness_score,
      hallucination_detected: record.hallucination_detected,
      latency_ms: record.latency_ms,
      escalated: record.escalated,
      escalation_reason: record.escalation_reason || "None",
      escalation_appropriate: record.escalation_appropriate,
      overall_score: record.overall_score,
      result: record.result,
      failure_signals: record.failure_signals,
      source_record: record,
    }));
    const { error: recordsError } = await supabase.from("agent_evaluations").insert(payload);
    if (recordsError) {
      await supabase.from("evaluation_runs").update({ status: "failed" }).eq("id", run.id);
      setError(recordsError.message);
      setBusy(false);
      return;
    }
    setFile(undefined); setRecords([]); setWarnings([]); setBusy(false);
    await loadWorkspace();
  }

  async function signOut() { await getSupabaseBrowserClient().auth.signOut(); setEmail(undefined); setRuns([]); }

  if (loading) return <DashboardShell><div className="grid min-h-screen place-items-center text-sm text-slate-400"><LoaderCircle className="mr-2 inline animate-spin" size={17} />Loading secure workspace…</div></DashboardShell>;
  if (!email) return <DashboardShell><section className="mx-auto max-w-2xl px-5 py-16 md:px-10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Private data workspace</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-100">Bring your evaluation runs to life.</h1><p className="mt-4 max-w-xl leading-7 text-slate-400">Import synthetic or approved test conversations as CSV or JSON, then keep each run isolated to the signed-in evaluator.</p><Link href="/sign-in" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-sky-300 px-4 py-3 text-sm font-semibold text-[#07111f]">Sign in to import <ShieldCheck size={17} /></Link></section></DashboardShell>;

  return <DashboardShell><div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-10">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Authenticated workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-100">Import evaluation runs</h1><p className="mt-3 text-sm text-slate-400">Signed in as {email}. Data is scoped to your account.</p></div><button onClick={signOut} className="inline-flex items-center gap-2 self-start rounded-lg border border-[#2a3a55] px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"><LogOut size={16} />Sign out</button></div>

    <section className="mt-8 rounded-2xl border border-[#24324a] bg-[#0c1627] p-5 md:p-7"><div className="flex flex-col justify-between gap-4 md:flex-row"><div><div className="flex items-center gap-2 text-sky-200"><UploadCloud size={19} /><h2 className="font-semibold">New evaluation run</h2></div><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">CSV or JSON, up to 500 records. A dashboard JSON export can be re-imported directly. For agent-response CSVs, <code className="text-slate-300">generated_answer</code> is required; optional scores use deterministic, transparent defaults.</p></div><label className="inline-flex h-fit cursor-pointer items-center justify-center gap-2 rounded-lg bg-sky-300 px-4 py-3 text-sm font-semibold text-[#07111f] transition hover:bg-sky-200"><FileUp size={17} />Choose CSV or JSON<input type="file" accept=".csv,.json,application/json,text/csv" onChange={handleFile} className="hidden" /></label></div>
      {file && <div className="mt-6 rounded-xl border border-[#2a3a55] bg-[#09111f] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><FileJson2 className="text-sky-300" size={20} /><div><p className="text-sm font-medium text-slate-200">{file.name}</p><p className="text-xs text-slate-500">{records.length ? `${records.length} records ready to save` : "Checking file…"}</p></div></div>{records.length > 0 && <button onClick={saveRun} disabled={busy} className="rounded-lg bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-[#07111f] disabled:cursor-wait disabled:opacity-70">{busy ? "Saving run…" : "Save secure run"}</button>}</div></div>}
      {warnings.map((warning) => <p key={warning} className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">{warning}</p>)}
      {error && <p className="mt-4 rounded-lg border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</p>}
      {records.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-3"><Stat label="Pass" value={breakdown.pass} tone="text-emerald-300" /><Stat label="Review" value={breakdown.review} tone="text-amber-300" /><Stat label="Fail" value={breakdown.fail} tone="text-rose-300" /></div>}
    </section>
    <section className="mt-8"><div className="flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-100">Recent runs</h2><p className="mt-1 text-sm text-slate-500">Only runs created by your account appear here.</p></div><span className="text-xs text-slate-500">Accepted fields: {acceptedFields.slice(0, 4).join(", ")}…</span></div><div className="mt-4 overflow-hidden rounded-xl border border-[#24324a]"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-[#101d31] text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium">Source</th><th className="px-4 py-3 font-medium">Imported</th><th className="px-4 py-3 font-medium">Records</th><th className="px-4 py-3 font-medium">Outcome</th></tr></thead><tbody className="divide-y divide-[#24324a] bg-[#0c1627]">{runs.length ? runs.map((run) => <tr key={run.id} className="text-slate-300"><td className="px-4 py-4"><p className="font-medium text-slate-200">{run.source_filename}</p><p className="mt-1 text-xs text-slate-500">{run.source_format.toUpperCase()}</p></td><td className="px-4 py-4 text-slate-400">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(run.created_at))}</td><td className="px-4 py-4">{run.total_records}</td><td className="px-4 py-4"><span className="text-emerald-300">{run.passed_records} pass</span><span className="mx-2 text-slate-600">/</span><span className="text-amber-300">{run.review_records} review</span><span className="mx-2 text-slate-600">/</span><span className="text-rose-300">{run.failed_records} fail</span></td></tr>) : <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No saved runs yet. Import an approved synthetic evaluation file to create your first private run.</td></tr>}</tbody></table></div></section>
  </div></DashboardShell>;
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className="rounded-lg border border-[#24324a] bg-[#101d31] p-3"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p></div>; }
