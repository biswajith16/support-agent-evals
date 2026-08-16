import { Sidebar } from "./sidebar";
import Link from "next/link";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-[#09111f] md:flex-row"><Sidebar /><div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#24324a] bg-[#0c1627]/95 px-4 py-3 backdrop-blur md:hidden"><span className="text-sm font-semibold text-slate-100">Support Agent Evals</span><nav className="flex gap-3 text-xs text-slate-400"><Link href="/">Overview</Link><Link href="/evaluations">Evals</Link><Link href="/imports">Import</Link><Link href="/lab">Lab</Link></nav></div><main className="min-w-0 flex-1">{children}</main></div>;
}
