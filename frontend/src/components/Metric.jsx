import React from "react";

export default function Metric({ label, value, suffix = "", detail }) {
  return (
    <div className="rounded-2xl sm:rounded-3xl border border-white/5 bg-[#1C1C1E] p-3.5 sm:p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">{label}</p>
      <p className="mt-2.5 text-2xl font-semibold tracking-tight leading-none text-white sm:text-3xl">{value ?? "--"}{value !== null && value !== undefined ? suffix : ""}</p>
      {detail ? <p className="mt-2 text-xs text-[#8E8E93]">{detail}</p> : null}
    </div>
  );
}
