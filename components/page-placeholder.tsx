import { Construction } from "lucide-react";

export function PagePlaceholder({ title, description, phase }: { title: string; description: string; phase: string }) {
  return (
    <section className="mx-auto max-w-6xl px-8 py-10 lg:px-12">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">{phase}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-100">{title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">{description}</p>
      <div className="mt-10 flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-[#30415d] bg-[#0d1728]">
        <div className="text-center"><Construction className="mx-auto text-sky-300" size={28} /><p className="mt-4 text-sm font-medium text-slate-200">This workspace is ready for the next build phase.</p><p className="mt-1 text-sm text-slate-500">The live data and analytics will be added incrementally.</p></div>
      </div>
    </section>
  );
}
