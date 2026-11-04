import React, { useState, useEffect } from "react";
import { Calendar, Check, Clock, Loader2, Settings, ShieldCheck, Sparkles, X } from "lucide-react";
import { getWeeklyPattern, updateWeeklyPattern } from "../api/client";
import { showToast } from "./Toast";

export const DAYS_CONFIG = [
  { key: "lunes", label: "Lunes", short: "Lun" },
  { key: "martes", label: "Martes", short: "Mar" },
  { key: "miercoles", label: "Miércoles", short: "Mié" },
  { key: "jueves", label: "Jueves", short: "Jue" },
  { key: "viernes", label: "Viernes", short: "Vie" },
  { key: "sabado", label: "Sábado", short: "Sáb" },
  { key: "domingo", label: "Domingo", short: "Dom" },
];

export const DEFAULT_PATTERN = {
  lunes: "entreno",
  martes: "entreno",
  miercoles: "flexible",
  jueves: "entreno",
  viernes: "entreno",
  sabado: "descanso",
  domingo: "descanso",
};

/**
 * WeeklyPatternModal.jsx - Configurador del Patrón de Entrenamiento Semanal
 * Permite seleccionar el rol de cada día: [ Entreno | Flexible | Descanso ]
 * Persiste en user_profiles.weekly_pattern vía API.
 */
export default function WeeklyPatternModal({
  isOpen,
  onClose,
  initialPattern = null,
  onPatternSaved = null,
}) {
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialPattern && typeof initialPattern === "object") {
        setPattern({ ...DEFAULT_PATTERN, ...initialPattern });
      } else {
        setLoading(true);
        getWeeklyPattern()
          .then((data) => {
            if (data && typeof data === "object") {
              setPattern({ ...DEFAULT_PATTERN, ...data });
            }
          })
          .catch((err) => {
            console.error("Error al cargar patrón semanal:", err);
          })
          .finally(() => setLoading(false));
      }
    }
  }, [isOpen, initialPattern]);

  const handleStateChange = (dayKey, newState) => {
    setPattern((prev) => ({
      ...prev,
      [dayKey]: newState,
    }));
  };

  const trainCount = Object.values(pattern).filter((s) => s === "entreno").length;
  const flexCount = Object.values(pattern).filter((s) => s === "flexible").length;
  const restCount = Object.values(pattern).filter((s) => s === "descanso").length;

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateWeeklyPattern(pattern);
      showToast("Patrón semanal actualizado correctamente", "success");
      if (onPatternSaved) {
        onPatternSaved(pattern);
      }
      onClose();
    } catch (err) {
      console.error("Error guardando patrón semanal:", err);
      showToast("Error al guardar el patrón semanal", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md sm:max-w-lg md:max-w-xl bg-white border border-slate-100 rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[88dvh] md:max-h-[85vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 md:my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Fija */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 text-red-500 border border-red-500/30 font-bold">
              <Settings size={18} />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight">
                Patrón de Entrenamiento Semanal
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Configura tus días activos, flexibles y de descanso fijo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-[#64748B] hover:text-[#0F172A] hover:border-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Cuerpo Scrolleable */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3.5 custom-scrollbar">
          {/* Resumen rápido de días */}
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl border border-slate-100 bg-[#F9FAFB] text-center">
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 py-1.5 px-2">
              <span className="text-[10px] uppercase font-bold text-red-500 block">Entreno</span>
              <span className="text-sm font-extrabold text-[#0F172A]">{trainCount} días</span>
            </div>
            <div className="rounded-lg bg-red-500/10 border border-red-400/20 py-1.5 px-2">
              <span className="text-[10px] uppercase font-bold text-red-400 block">Flexible</span>
              <span className="text-sm font-extrabold text-[#0F172A]">{flexCount} días</span>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 py-1.5 px-2">
              <span className="text-[10px] uppercase font-bold text-[#64748B] block">Descanso</span>
              <span className="text-sm font-extrabold text-[#0F172A]">{restCount} días</span>
            </div>
          </div>

          {/* Selector interactivo de 7 días */}
          <div className="space-y-2">
            {DAYS_CONFIG.map(({ key, label }) => {
              const currentVal = pattern[key] || "descanso";

              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-100 bg-[#F9FAFB] hover:border-slate-100 transition"
                >
                  <span className="text-xs font-semibold text-[#0F172A] w-24">
                    {label}
                  </span>

                  {/* Segmented Chips [ Entreno | Flexible | Descanso ] */}
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleStateChange(key, "entreno")}
                      className={`h-7 px-2.5 text-[11px] font-bold rounded-md transition active:scale-95 cursor-pointer ${
                        currentVal === "entreno"
                          ? "bg-red-600 hover:bg-red-700 text-white shadow-sm"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Entreno
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStateChange(key, "flexible")}
                      className={`h-7 px-2 text-[11px] font-bold rounded-md transition active:scale-95 cursor-pointer ${
                        currentVal === "flexible"
                          ? "bg-red-500/10 text-red-400 border border-red-400/40"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Flexible
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStateChange(key, "descanso")}
                      className={`h-7 px-2 text-[11px] font-medium rounded-md transition active:scale-95 cursor-pointer ${
                        currentVal === "descanso"
                          ? "bg-[#26262B] text-[#0F172A]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Descanso
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nota informativa no punitiva */}
          <div className="rounded-xl border border-slate-100 bg-[#F9FAFB] p-3 text-[11px] text-[#64748B] leading-relaxed flex items-start gap-2">
            <ShieldCheck size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <span>
              Tu consistencia se evalúa exclusivamente contra los días marcados como <strong className="text-red-500">Entreno</strong>. Los descansos programados de sábado y domingo nunca penalizan tu estadística.
            </span>
          </div>
        </div>

        {/* Pie Fijo Anclado */}
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-white flex gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex-1 h-12 bg-red-600 hover:bg-red-700 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition active:scale-[0.98] cursor-pointer shadow-md shadow-red-500/20 flex items-center justify-center gap-1.5 text-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Check size={16} strokeWidth={2.5} />
                <span>Guardar Patrón</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
