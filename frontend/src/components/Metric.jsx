import React from "react";

export default function Metric({ label, value, suffix = "", detail }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-3.5 shadow-card sm:p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2.5 text-2xl font-black leading-none text-fitText sm:text-3xl">{value ?? "--"}{value !== null && value !== undefined ? suffix : ""}</p>
      {detail ? <p className="mt-2 text-xs text-slate-400">{detail}</p> : null}
    </div>
  );
}
