import React from "react";

export default function Metric({ label, value, suffix = "", detail, highlight = true }) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-bento">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">{label}</p>
      <p
        className={`mt-2.5 text-2xl font-extrabold tracking-tight leading-none sm:text-3xl ${
          highlight ? "text-red-500" : "text-[#0F172A]"
        }`}
      >
        {value ?? "--"}
        {value !== null && value !== undefined ? suffix : ""}
      </p>
      {detail ? <p className="mt-2 text-xs text-[#64748B]">{detail}</p> : null}
    </div>
  );
}

export { Metric as MetricsCard };
