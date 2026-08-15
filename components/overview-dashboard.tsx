"use client";

import { Activity, AlertTriangle, ArrowUpRight, Bot, CheckCircle2, Clock3, Gauge, SearchCheck, ShieldAlert, Timer, UserRoundCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dashboardMetrics, evaluationDataset, evaluations, formatDate, formatLatency, percentage } from "@/lib/evaluation-data";
import { ResultBadge } from "@/components/result-badge";
import { DetailDrawer } from "@/components/evaluation-explorer";
import type { Evaluation } from "@/types/evaluation";

const metrics = dashboardMetrics(evaluations);
const lineColors = { correctness: "#7dd3fc", retrieval: "#a78bfa", hallucination: "#fb7185" };
const tooltipStyle = { background: "#142137", border: "1px solid #2b3d58", borderRadius: 10, color: "#e7edf7", fontSize: 12 };

const trendData = Object.values(evaluations.reduce<Record<string, { date: string; correctness: number[]; retrieval: number[]; hallucinations: number; total: number }>>((groups, record) => {
  const date = formatDate(record.timestamp);
  const group = groups[date] ?? { date, correctness: [], retrieval: [], hallucinations: 0, total: 0 };
  group.correctness.push(record.correctness_score);
  group.retrieval.push(record.retrieval_score);
  group.hallucinations += Number(record.hallucination_detected);
  group.total += 1;
  groups[date] = group;
  return groups;
}, {})).map((group) => ({ date: group.date, correctness: Math.round(group.correctness.reduce((a, b) => a + b, 0) / group.total), retrieval: Math.round(group.retrieval.reduce((a, b) => a + b, 0) / group.total), hallucinationRate: percentage(group.hallucinations, group.total) }));

const categoryData = Array.from(new Set(evaluations.map((record) => record.category))).map((category) => {
  const records = evaluations.filter((record) => record.category === category);
  const labels: Record<string, string> = { "Account Access": "Account", "Technical Support": "Technical", "Product Information": "Product" };
  return { category: labels[category] ?? category, correctness: Math.round(records.reduce((sum, record) => sum + record.correctness_score, 0) / records.length), retrieval: Math.round(records.reduce((sum, record) => sum + record.retrieval_score, 0) / records.length) };
});

const latencyData = trendData.map((point, index) => {
  const date = point.date;
  const records = evaluations.filter((record) => formatDate(record.timestamp) === date);
  return { date, latency: Math.round(records.reduce((sum, record) => sum + record.latency_ms, 0) / records.length) / 1000, highlight: index === trendData.length - 1 };
});

const escalationReasons = Object.entries(evaluations.filter((record) => record.escalated).reduce<Record<string, number>>((counts, record) => {
  counts[record.escalation_reason] = (counts[record.escalation_reason] ?? 0) + 1;
  return counts;
}, {})).map(([name, value]) => ({ name, value }));
const escalated = evaluations.filter((record) => record.escalated);
const escalationPie = [
  { name: "Appropriate", value: escalated.filter((record) => record.escalation_appropriate).length, color: "#34d399" },
  { name: "Unnecessary", value: escalated.filter((record) => record.escalation_appropriate === false).length, color: "#fb7185" },
];
const grounded = evaluations.filter((record) => !record.hallucination_detected).length;
const hallucinations = evaluations.length - grounded;

const kpis = [
  { label: "Overall Quality", value: `${metrics.overall}%`, detail: "weighted evaluation score", icon: Gauge, tone: "text-sky-300", trend: "Quality signal" },
  { label: "Answer Correctness", value: `${metrics.correctness}%`, detail: "against reference answers", icon: CheckCircle2, tone: "text-emerald-300", trend: "Primary metric" },
  { label: "Retrieval Quality", value: `${metrics.retrieval}%`, detail: "supporting knowledge found", icon: SearchCheck, tone: "text-violet-300", trend: "RAG health" },
  { label: "Average Latency", value: formatLatency(metrics.latency), detail: `P95 ${formatLatency(evaluationDataset.metadata.latency_metrics.p95_ms)}`, icon: Timer, tone: "text-amber-200", trend: "Response time" },
  { label: "Escalation Rate", value: `${metrics.escalationRate}%`, detail: `${escalated.length} of ${evaluations.length} evaluated`, icon: UserRoundCheck, tone: "text-cyan-300", trend: "Human handoff" },
  { label: "Hallucination Rate", value: `${metrics.hallucinationRate}%`, detail: `${hallucinations} unsupported responses`, icon: ShieldAlert, tone: "text-rose-300", trend: "Grounding risk" },
];

function Panel({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-[#25354e] bg-[#101b2e] p-5 shadow-[0_12px_28px_rgba(0,0,0,0.12)] ${className}`}><div className="mb-5"><h2 className="text-sm font-semibold text-slate-100">{title}</h2>{subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}</div>{children}</section>;
}

export function OverviewDashboard() {
  const [feedMode, setFeedMode] = useState<"recent" | "attention">("recent");
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const feedRecords = useMemo(() => {
    const source = feedMode === "recent" ? [...evaluations].slice(-6).reverse() : evaluations.filter((record) => record.result !== "PASS").slice(-6).reverse();
    return source;
  }, [feedMode]);
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">AI evaluation dashboard</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-100">Support agent performance</h1><p className="mt-2 text-sm text-slate-400">Monitor the quality, reliability, and performance of AI support agents.</p></div><div className="flex flex-wrap items-center gap-2"><button onClick={() => setFeedMode("recent")} className={`rounded-lg px-3 py-2 text-xs transition ${feedMode === "recent" ? "bg-sky-300/15 text-sky-100" : "text-slate-400 hover:bg-slate-800"}`}>Latest activity</button><button onClick={() => setFeedMode("attention")} className={`rounded-lg px-3 py-2 text-xs transition ${feedMode === "attention" ? "bg-rose-400/10 text-rose-200" : "text-slate-400 hover:bg-slate-800"}`}>Needs attention</button><div className="flex items-center gap-2 rounded-lg border border-sky-300/15 bg-sky-300/5 px-3 py-2 text-xs text-sky-100"><span className="size-2 rounded-full bg-sky-300" /> {evaluations.length} simulated evaluations</div></div></header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{kpis.map(({ label, value, detail, icon: Icon, tone, trend }) => <section key={label} className="rounded-xl border border-[#25354e] bg-[#101b2e] p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-slate-400">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-100">{value}</p></div><div className={`rounded-lg bg-[#182741] p-2.5 ${tone}`}><Icon size={18} /></div></div><div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500"><ArrowUpRight size={13} className={tone} /><span>{trend}</span><span className="text-slate-600">·</span><span>{detail}</span></div></section>)}</div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5"><Panel title="Performance over time" subtitle="Correctness, retrieval quality, and hallucination rate" className="xl:col-span-3"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData} margin={{ left: 2, right: 12, top: 8, bottom: 0 }}><CartesianGrid stroke="#263852" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="date" tick={{ fill: "#8495ad", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#8495ad", fontSize: 11 }} axisLine={false} tickLine={false} width={36} /><Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="correctness" name="Correctness" stroke={lineColors.correctness} strokeWidth={2.2} dot={false} /><Line type="monotone" dataKey="retrieval" name="Retrieval Quality" stroke={lineColors.retrieval} strokeWidth={2.2} dot={false} /><Line type="monotone" dataKey="hallucinationRate" name="Hallucination Rate" stroke={lineColors.hallucination} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400"><span><i className="mr-1.5 inline-block size-2 rounded-full bg-sky-300" />Correctness</span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-violet-400" />Retrieval Quality</span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-rose-400" />Hallucination Rate</span></div></Panel>
      <Panel title="Groundedness" subtitle="Answers supported by retrieved knowledge" className="xl:col-span-2"><div className="flex h-72 flex-col justify-center"><div className="flex items-end justify-between"><div><p className="text-5xl font-semibold tracking-tight text-slate-100">{percentage(grounded, evaluations.length)}%</p><p className="mt-2 text-sm text-slate-400">Grounded responses</p></div><Bot size={48} className="text-sky-300/70" /></div><div className="mt-7 h-3 overflow-hidden rounded-full bg-[#1b2b45]"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${percentage(grounded, evaluations.length)}%` }} /></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-lg border border-emerald-400/15 bg-emerald-400/5 p-3"><p className="text-xl font-semibold text-emerald-300">{grounded}</p><p className="mt-1 text-xs text-slate-400">Supported responses</p></div><div className="rounded-lg border border-rose-400/15 bg-rose-400/5 p-3"><p className="text-xl font-semibold text-rose-300">{hallucinations}</p><p className="mt-1 text-xs text-slate-400">Unsupported claims</p></div></div></div></Panel></div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5"><Panel title="Performance by category" subtitle="Correctness and retrieval score" className="xl:col-span-3"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData} margin={{ left: 2, right: 10, top: 8, bottom: 0 }}><CartesianGrid stroke="#263852" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="category" tick={{ fill: "#8495ad", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} /><YAxis domain={[0, 100]} tick={{ fill: "#8495ad", fontSize: 11 }} axisLine={false} tickLine={false} width={36} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="correctness" name="Correctness" fill="#7dd3fc" radius={[4, 4, 0, 0]} maxBarSize={22} /><Bar dataKey="retrieval" name="Retrieval Quality" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={22} /></BarChart></ResponsiveContainer></div></Panel>
      <Panel title="Latency" subtitle="Daily average response time" className="xl:col-span-2"><div className="h-40"><ResponsiveContainer width="100%" height="100%"><BarChart data={latencyData} margin={{ left: 2, right: 5, top: 0 }}><XAxis dataKey="date" hide /><YAxis tick={{ fill: "#8495ad", fontSize: 11 }} axisLine={false} tickLine={false} width={36} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}s`, "Average latency"]} /><Bar dataKey="latency" radius={[4, 4, 0, 0]}>{latencyData.map((entry) => <Cell key={entry.date} fill={entry.latency > 3.5 ? "#fbbf24" : "#38bdf8"} />)}</Bar></BarChart></ResponsiveContainer></div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#25354e] pt-4"><div><p className="text-xs text-slate-500">Average</p><p className="mt-1 text-lg font-semibold text-slate-100">{formatLatency(evaluationDataset.metadata.latency_metrics.average_ms)}</p></div><div><p className="text-xs text-slate-500">P50</p><p className="mt-1 text-lg font-semibold text-slate-100">{formatLatency(evaluationDataset.metadata.latency_metrics.p50_ms)}</p></div><div><p className="text-xs text-slate-500">P95</p><p className="mt-1 text-lg font-semibold text-amber-200">{formatLatency(evaluationDataset.metadata.latency_metrics.p95_ms)}</p></div></div></Panel></div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5"><Panel title="Escalations" subtitle={`${metrics.escalationRate}% of evaluations were handed to a human`} className="xl:col-span-2"><div className="flex items-center gap-5"><div className="h-36 w-36 shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={escalationPie} dataKey="value" innerRadius={42} outerRadius={62} paddingAngle={3}>{escalationPie.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer></div><div className="space-y-3">{escalationPie.map((item) => <div key={item.name} className="flex items-center gap-2 text-sm"><span className="size-2 rounded-full" style={{ background: item.color }} /><span className="text-slate-400">{item.name}</span><span className="ml-auto font-medium text-slate-100">{item.value}</span></div>)}</div></div><div className="mt-4 border-t border-[#25354e] pt-4"><p className="mb-2 text-xs font-medium text-slate-400">Top escalation reasons</p><div className="space-y-2">{escalationReasons.slice(0, 3).map((reason) => <div key={reason.name} className="flex justify-between text-xs"><span className="text-slate-500">{reason.name}</span><span className="text-slate-200">{reason.value}</span></div>)}</div></div></Panel>
      <Panel title={feedMode === "recent" ? "Recent evaluations" : "Attention queue"} subtitle={feedMode === "recent" ? "Click any answer to investigate it" : "Most recent records requiring investigation"} className="overflow-hidden xl:col-span-3"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="border-b border-[#25354e] text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="pb-3 font-medium">ID</th><th className="pb-3 font-medium">Question</th><th className="pb-3 font-medium">Category</th><th className="pb-3 font-medium">Correctness</th><th className="pb-3 font-medium">Latency</th><th className="pb-3 font-medium">Result</th></tr></thead><tbody>{feedRecords.map((record) => <tr key={record.id} onClick={() => setSelectedEvaluation(record)} className="cursor-pointer border-b border-[#1d2b42] transition hover:bg-sky-300/[0.05] last:border-0"><td className="py-3 font-mono text-slate-400">{record.id}</td><td className="max-w-48 truncate py-3 pr-4 text-slate-200">{record.question}</td><td className="py-3 pr-4 text-slate-400">{record.category}</td><td className="py-3 pr-4 text-slate-200">{record.correctness_score}%</td><td className="py-3 pr-4 text-slate-400">{formatLatency(record.latency_ms)}</td><td className="py-3"><ResultBadge result={record.result} /></td></tr>)}</tbody></table></div></Panel></div>
      <p className="mt-6 text-center text-xs text-slate-600">Simulated support-agent evaluation data for demonstration purposes.</p>
      {selectedEvaluation && <DetailDrawer evaluation={selectedEvaluation} onClose={() => setSelectedEvaluation(null)} />}
    </div>
  );
}
