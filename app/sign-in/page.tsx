"use client";

import { ArrowRight, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const { error } = await getSupabaseBrowserClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/imports` },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
    setMessage("Check your inbox for a secure sign-in link. It will return you to your import workspace.");
  }

  return <main className="grid min-h-screen place-items-center bg-[#09111f] px-5 py-12 text-slate-100">
    <section className="w-full max-w-md rounded-2xl border border-[#24324a] bg-[#0c1627] p-7 shadow-2xl shadow-black/20">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-sky-200">← Back to dashboard</Link>
      <div className="mb-7 grid size-12 place-items-center rounded-xl bg-sky-300 text-[#07111f]"><ShieldCheck size={25} /></div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Private workspace</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to import runs</h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">Use a magic link—there is no password to manage. Your imported runs are visible only to your account.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block text-sm font-medium text-slate-300">Work email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="mt-2 w-full rounded-lg border border-[#2a3a55] bg-[#09111f] px-3 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-sky-300" /></label>
        <button disabled={status === "sending"} className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-300 px-4 py-3 text-sm font-semibold text-[#07111f] transition hover:bg-sky-200 disabled:cursor-wait disabled:opacity-70">{status === "sending" ? "Sending secure link…" : <>Email me a sign-in link <ArrowRight size={16} /></>}</button>
      </form>
      {status !== "idle" && <p className={`mt-5 flex gap-2 rounded-lg border p-3 text-sm ${status === "error" ? "border-rose-400/30 bg-rose-400/10 text-rose-200" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"}`}><CheckCircle2 size={17} className="mt-0.5 shrink-0" />{message}</p>}
      <p className="mt-7 flex items-center gap-2 text-xs text-slate-500"><Mail size={14} /> Magic links expire and can only be used once.</p>
    </section>
  </main>;
}
