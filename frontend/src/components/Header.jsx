import React from "react";
import { Dumbbell } from "lucide-react";

export default function Header({ title, subtitle, rightElement }) {
  return (
    <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#A855F7]/30 bg-[#9333EA]/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#C084FC]">
          <Dumbbell size={13} className="text-[#A855F7]" />
          <span>FITTRACKER • OLED GYM</span>
        </div>
        <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-xs sm:text-sm font-medium text-[#A1A1AA]">
            {subtitle}
          </p>
        )}
      </div>
      {rightElement && <div>{rightElement}</div>}
    </header>
  );
}


