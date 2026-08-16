"use client";

import { Activity, AlertTriangle, BarChart3, BookOpen, Bot, ChevronRight, FlaskConical, UploadCloud } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Overview", icon: BarChart3 },
  { href: "/evaluations", label: "Evaluations", icon: Activity },
  { href: "/failures", label: "Failures", icon: AlertTriangle },
  { href: "/lab", label: "Evaluation Lab", icon: FlaskConical },
  { href: "/imports", label: "Import runs", icon: UploadCloud },
  { href: "/about", label: "About", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 flex-col border-r border-[#24324a] bg-[#0c1627] p-5 md:flex">
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="grid size-10 place-items-center rounded-xl bg-sky-300 text-[#07111f] shadow-lg shadow-sky-400/10"><Bot size={22} /></div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-slate-100">Support Agent Evals</p>
          <p className="mt-0.5 text-xs text-slate-400">Quality observability</p>
        </div>
      </div>

      <div className="mb-5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Workspace</div>
      <nav className="space-y-1">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? "bg-sky-300/10 text-sky-200" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"}`}>
              <Icon size={17} strokeWidth={active ? 2.3 : 1.9} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={15} />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-[#24324a] bg-[#101d31] p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-sky-200"><span className="size-1.5 rounded-full bg-sky-300" /> Demo dataset</div>
        <p className="text-xs leading-5 text-slate-400">Simulated support-agent evaluation data for demonstration purposes.</p>
      </div>
    </aside>
  );
}
