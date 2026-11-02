import React from "react";
import { Dumbbell } from "lucide-react";

export default function Header({ title, subtitle, rightElement }) {
  return (
    <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-50 dark:bg-red-950/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
          <Dumbbell size={13} className="text-red-600 dark:text-red-400" />
          <span>FITRACKER</span>
        </div>
        <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-xs sm:text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
            {subtitle}
          </p>
        )}
      </div>
      {rightElement && <div>{rightElement}</div>}
    </header>
  );
}
