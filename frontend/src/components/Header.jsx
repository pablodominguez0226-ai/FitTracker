import React from "react";
import { Dumbbell } from "lucide-react";

export default function Header({ title, subtitle, rightElement }) {
  return (
    <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
          <Dumbbell size={13} className="text-[#FF5722]" />
          <span>FITTRACKER • OLED</span>
        </div>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-xs sm:text-sm font-medium text-[#8E8E93]">
            {subtitle}
          </p>
        )}
      </div>
      {rightElement && <div>{rightElement}</div>}
    </header>
  );
}


