import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Dumbbell,
  Minus,
  Plus,
  RefreshCw,
  Scale,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  createCheckin,
  deleteCheckin,
  getCheckinStatus,
  getCheckins,
  updateCheckinFrequency,
} from "../api/client";
import { showToast } from "./Toast";
import { formatDateSafe, getLocalDateString } from "../utils/dateUtils";

export default function CheckInModal({ isOpen, onClose, onCheckinSaved, currentUser }) {
  const [frequency, setFrequency] = useState("weekly"); // 'weekly' | 'biweekly' | 'monthly'
  const [statusInfo, setStatusInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario rápido de control
  const [form, setForm] = useState({
    date: getLocalDateString(),
    weight: currentUser?.bodyweight || "",
    waist: currentUser?.waist_girth || "",
    arm: currentUser?.biceps_girth || "",
    strength_feeling: "8/10 Fuerte",
    notes: "",
  });

  const loadCheckinData = async () => {
    try {
      setLoading(true);
      const [histData, statData] = await Promise.all([
        getCheckins().catch(() => []),
        getCheckinStatus().catch(() => null),
      ]);
      setHistory(histData || []);
      if (statData) {
        setStatusInfo(statData);
        setFrequency(statData.frequency || "weekly");
      }
    } catch (err) {
      console.error("Error cargando check-ins:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCheckinData();
      if (currentUser?.bodyweight) {
        setForm((prev) => ({
          ...prev,
          weight: currentUser.bodyweight,
          waist: currentUser.waist_girth || prev.waist,
          arm: currentUser.biceps_girth || prev.arm,
        }));
      }
    }
  }, [isOpen, currentUser]);

  // Cambiar frecuencia
  const handleFrequencyChange = async (newFreq) => {
    try {
      setFrequency(newFreq);
      const updatedStatus = await updateCheckinFrequency(newFreq);
      setStatusInfo(updatedStatus);
      showToast(`Frecuencia de control actualizada a ${newFreq === "weekly" ? "Semanal (7 días)" : newFreq === "biweekly" ? "Quincenal (14 días)" : "Mensual (30 días)"}`, "success");
    } catch (err) {
      console.error("Error al actualizar frecuencia:", err);
      showToast("Error al guardar frecuencia", "error");
    }
  };

  // Enviar nuevo Check-In
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.weight || parseFloat(form.weight) <= 0) {
      showToast("El peso corporal es requerido", "info");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        date: form.date,
        frequency: frequency,
        weight: parseFloat(form.weight),
        waist: form.waist ? parseFloat(form.waist) : null,
        arm: form.arm ? parseFloat(form.arm) : null,
        strength_feeling: form.strength_feeling,
        notes: form.notes,
      };

      await createCheckin(payload);
      showToast("¡Check-in registrado con éxito!", "success");

      // Notificar al padre para sincronizar peso corporal del usuario
      if (onCheckinSaved) {
        onCheckinSaved({
          bodyweight: parseFloat(form.weight),
          waist_girth: form.waist ? parseFloat(form.waist) : null,
          biceps_girth: form.arm ? parseFloat(form.arm) : null,
        });
      }

      await loadCheckinData();
    } catch (err) {
      console.error("Error al guardar check-in:", err);
      showToast("Error al guardar check-in", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar Check-In
  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este registro de control?")) return;
    try {
      await deleteCheckin(id);
      showToast("Registro eliminado", "info");
      loadCheckinData();
    } catch (err) {
      console.error("Error eliminando check-in:", err);
      showToast("Error al eliminar", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto select-none animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-3xl border border-[#2C2C2E] bg-[#121212] p-6 space-y-6 shadow-2xl my-8">
        {/* HEADER MODAL OLED */}
        <div className="flex items-start justify-between gap-4 border-b border-[#2C2C2E] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white shadow-lg shadow-[#FF5722]/20">
              <Scale size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white">
                Sistema de Check-Ins Periódicos
              </h2>
              <p className="text-xs text-[#8E8E93]">
                Control biométrico, cintura, brazo y sensación de fuerza
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#8E8E93] hover:text-white p-1 rounded-lg hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>

        {/* 1. SELECTOR DE FRECUENCIA OLED: [ Semanal | Quincenal | Mensual ] */}
        <div className="rounded-2xl bg-[#1C1C1E] p-4 border border-[#2C2C2E] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#8E8E93] mb-1">
            <span>Frecuencia Programada de Control:</span>
            {statusInfo?.is_due && (
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px]">
                <Clock size={12} /> ¡Toca Check-In Hoy!
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "weekly", label: "Semanal (7 días)", days: 7 },
              { id: "biweekly", label: "Quincenal (14 días)", days: 14 },
              { id: "monthly", label: "Mensual (30 días)", days: 30 },
            ].map((f) => {
              const isSelected = frequency === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleFrequencyChange(f.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition active:scale-95 ${
                    isSelected
                      ? "bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white shadow-md shadow-[#FF5722]/20"
                      : "bg-[#121212] text-[#8E8E93] border border-[#2C2C2E] hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {statusInfo?.next_due_date && (
            <p className="text-[11px] text-[#8E8E93] pt-1">
              Próximo control previsto: <b className="text-white">{formatDateSafe(statusInfo.next_due_date)}</b>
              {statusInfo.days_since_last !== null && (
                <span> (Último registro hace {statusInfo.days_since_last} días)</span>
              )}
            </p>
          )}
        </div>

        {/* 2. FORMULARIO RÁPIDO DE CONTROL */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-[#2C2C2E] bg-[#121212] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#FF5722]">
              Nuevo Registro de Control
            </h3>
            <span className="text-[11px] text-[#8E8E93]">Fecha: {form.date}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[#8E8E93] font-semibold mb-1">
                Peso corporal (kg) *
              </label>
              <input
                type="number"
                step="0.1"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                placeholder="Ej: 80.5"
                className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3 py-2 text-white font-bold focus:border-[#FF5722] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[#8E8E93] font-semibold mb-1">
                Cintura (cm)
              </label>
              <input
                type="number"
                step="0.5"
                value={form.waist}
                onChange={(e) => setForm({ ...form, waist: e.target.value })}
                placeholder="Ej: 82.0"
                className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3 py-2 text-white font-bold focus:border-[#FF5722] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#8E8E93] font-semibold mb-1">
                Brazo (cm)
              </label>
              <input
                type="number"
                step="0.5"
                value={form.arm}
                onChange={(e) => setForm({ ...form, arm: e.target.value })}
                placeholder="Ej: 39.5"
                className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3 py-2 text-white font-bold focus:border-[#FF5722] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#8E8E93] font-semibold mb-1">
                Sensación de Fuerza
              </label>
              <select
                value={form.strength_feeling}
                onChange={(e) => setForm({ ...form, strength_feeling: e.target.value })}
                className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-2 py-2 text-white font-semibold focus:border-[#FF5722] focus:outline-none text-xs"
              >
                <option value="10/10 Excelente (Récord)">⚡ 10/10 Excelente</option>
                <option value="8/10 Fuerte (En progreso)">💪 8/10 Fuerte</option>
                <option value="6/10 Normal / Estable">⚖️ 6/10 Estable</option>
                <option value="4/10 Fatigado / Pesado">😴 4/10 Fatigado</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas opcionales (recuperación, sensaciones, descanso...)"
              className="flex-1 w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3 py-2 text-xs text-white focus:border-[#FF5722] focus:outline-none"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#FF5722]/20 hover:opacity-95 transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Check size={15} />
              <span>{isSubmitting ? "Guardando..." : "Registrar Check-In"}</span>
            </button>
          </div>
        </form>

        {/* 3. HISTORIAL TABULAR CON VARIACIÓN NETA (+/- kg y +/- cm) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Historial de Variación Biométrica
            </h3>
            <span className="text-[11px] text-[#8E8E93]">
              {history.length} registros computados
            </span>
          </div>

          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#2C2C2E] bg-[#1C1C1E]/40 p-6 text-center text-xs text-[#8E8E93]">
              No hay registros de control previos. Registra tu primer check-in arriba.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#2C2C2E] bg-[#121212]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#2C2C2E] bg-[#1C1C1E]/80 text-[#8E8E93] font-bold">
                  <tr>
                    <th className="px-3.5 py-2.5">Fecha</th>
                    <th className="px-3.5 py-2.5">Peso (kg)</th>
                    <th className="px-3.5 py-2.5">Cintura (cm)</th>
                    <th className="px-3.5 py-2.5">Brazo (cm)</th>
                    <th className="px-3.5 py-2.5">Fuerza</th>
                    <th className="px-3.5 py-2.5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2C2C2E] text-white">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-semibold">
                        {formatDateSafe(item.date)}
                      </td>

                      {/* Peso con variación neta */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="font-mono font-bold">{item.weight} kg</span>
                        {item.weight_diff !== null && item.weight_diff !== undefined && (
                          <span
                            className={`ml-2 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                              item.weight_diff > 0
                                ? "text-emerald-400 bg-emerald-500/10"
                                : item.weight_diff < 0
                                ? "text-amber-400 bg-amber-500/10"
                                : "text-[#8E8E93] bg-white/5"
                            }`}
                          >
                            {item.weight_diff > 0 ? `+${item.weight_diff}` : item.weight_diff} kg
                          </span>
                        )}
                      </td>

                      {/* Cintura con variación neta */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {item.waist ? (
                          <>
                            <span className="font-mono">{item.waist} cm</span>
                            {item.waist_diff !== null && item.waist_diff !== undefined && (
                              <span
                                className={`ml-2 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                  item.waist_diff < 0
                                    ? "text-emerald-400 bg-emerald-500/10"
                                    : item.waist_diff > 0
                                    ? "text-amber-400 bg-amber-500/10"
                                    : "text-[#8E8E93] bg-white/5"
                                }`}
                              >
                                {item.waist_diff > 0 ? `+${item.waist_diff}` : item.waist_diff} cm
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[#8E8E93]">-</span>
                        )}
                      </td>

                      {/* Brazo con variación neta */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {item.arm ? (
                          <>
                            <span className="font-mono">{item.arm} cm</span>
                            {item.arm_diff !== null && item.arm_diff !== undefined && (
                              <span
                                className={`ml-2 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                  item.arm_diff > 0
                                    ? "text-emerald-400 bg-emerald-500/10"
                                    : item.arm_diff < 0
                                    ? "text-amber-400 bg-amber-500/10"
                                    : "text-[#8E8E93] bg-white/5"
                                }`}
                              >
                                {item.arm_diff > 0 ? `+${item.arm_diff}` : item.arm_diff} cm
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[#8E8E93]">-</span>
                        )}
                      </td>

                      {/* Sensación de Fuerza */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-[11px] text-[#8E8E93]">
                        {item.strength_feeling || "-"}
                      </td>

                      {/* Acciones */}
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-[#8E8E93] hover:text-red-400 rounded transition"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end pt-2 border-t border-[#2C2C2E]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-5 py-2 text-xs font-semibold text-[#8E8E93] hover:text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
