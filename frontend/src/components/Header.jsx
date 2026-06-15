import React from "react";

export default function Header({ title, subtitle }) {
  return (
    <header className="mb-5 sm:mb-6">
      <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200">
        <span className="h-1.5 w-1.5 rounded-full bg-fitPrimary" />
        FitTracker
      </div>
      <h1 className="mt-3 text-3xl font-black tracking-normal text-fitText sm:text-5xl">{title}</h1>
      {subtitle ? <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">{subtitle}</p> : null}
    </header>
  );
}
