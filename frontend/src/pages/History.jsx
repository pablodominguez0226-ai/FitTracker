import React, { useEffect, useState } from "react";
import { Brain, Calendar, ChevronDown, ChevronUp, Dumbbell, Flame, Loader2, Sparkles, Trash2, Trophy, Zap } from "lucide-react";
import { deleteWorkout, getWorkouts } from "../api/client";
import Header from "../components/Header";
import { formatDateSafe } from "../utils/dateUtils";

export default function History() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await getWorkouts();
      setWorkouts(data);
    } catch (err) {
      console.error("Error cargando historial:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que querés eliminar esta sesión del historial?")) return;
    const backup = workouts;
    // Optimistic UI update: immediate removal
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    try {
      await deleteWorkout(id);
    } catch (err) {
      console.error("Error eliminando sesión de historial:", err);
      setWorkouts(backup);
      alert("No se pudo eliminar el entrenamiento del servidor.");
    }
  };

  const formatDate = (val) =>
    formatDateSafe(val, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[#A855F7]">
        <Loader2 size={32} className="animate-spin" />
        <p className="text-sm font-semibold text-[#94A3B8]">Cargando historial...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <Header
        title="Historial de Sesiones"
        subtitle="Registro cronológico de todos tus entrenamientos completados"
        rightElement={
          <div className="rounded-xl border border-[#2B2146] bg-[#161126] px-4 py-2 text-right">
            <span className="text-[10px] uppercase font-bold text-[#64748B] block">Total Sesiones</span>
            <span className="text-lg font-black text-[#F8FAFC]">{workouts.length}</span>
          </div>
        }
      />

      {workouts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#2B2146] bg-[#161126]/50 p-12 text-center">
          <Dumbbell size={36} className="mx-auto text-[#64748B]" />
          <h3 className="mt-3 text-base font-bold text-[#F8FAFC]">Aún no hay sesiones guardadas</h3>
          <p className="mt-1 text-xs text-[#94A3B8]">Comenzá tu primer entrenamiento desde la pantalla Entrenar.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {workouts.map((w) => {
            const isExpanded = expandedId === w.id;
            const grouped = {};
            (w.sets || []).forEach((s) => {
              const name = s.exercise_name || `Ejercicio #${s.exercise_id}`;
              if (!grouped[name]) grouped[name] = [];
              grouped[name].push(s);
            });

            const totalVol = (w.sets || []).reduce((acc, s) => acc + (s.weight * s.reps), 0);
            const isWillpowerDay = Boolean(
              (w.readiness_energy && w.readiness_energy <= 2) ||
              (w.mental_effort && w.mental_effort >= 4)
            );

            return (
              <div
                key={w.id}
                className="rounded-2xl border border-[#2B2146] bg-[#161126] overflow-hidden shadow-card transition hover:border-[#A855F7]/30"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : w.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 cursor-pointer hover:bg-[#1E1735]/60 transition"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#9333EA] to-[#A855F7] text-white shadow-neon flex-shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-black capitalize text-white">
                          {formatDate(w.date)}
                        </h3>
                        {w.muscle_group_name && (
                          <span className="rounded-md border border-[#2B2146] bg-[#120D20] px-2 py-0.5 text-[11px] font-bold text-[#C084FC]">
                            {w.muscle_group_name}
                          </span>
                        )}
                        {isWillpowerDay && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300 shadow-sm">
                            <Sparkles size={11} className="text-amber-400" />
                            <span>Voluntad de Hierro</span>
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[#94A3B8]">
                        {Object.keys(grouped).length} ejercicios · {(w.sets || []).length} series · ~{Math.round(totalVol)} kg de volumen
                      </p>
                      {(w.readiness_energy || w.readiness_motivation || w.mental_effort) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {w.readiness_energy && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-[#120D20] px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                              ⚡ {w.readiness_energy}/5
                            </span>
                          )}
                          {w.readiness_motivation && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-[#120D20] px-1.5 py-0.5 text-[10px] font-bold text-orange-300">
                              🔥 {w.readiness_motivation}/5
                            </span>
                          )}
                          {w.mental_effort && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-[#120D20] px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                              🧠 {w.mental_effort}/5
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(w.id);
                      }}
                      className="text-[#64748B] hover:text-red-400 transition p-1.5"
                      title="Eliminar sesión"
                    >
                      <Trash2 size={16} />
                    </button>
                    <span className="text-[#A855F7]">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[#2B2146] bg-[#120D20]/80 p-4 sm:p-5 space-y-4">
                    {isWillpowerDay && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-center gap-2">
                        <Sparkles size={16} className="text-amber-400 flex-shrink-0" />
                        <span><strong>Sesión de Voluntad de Hierro:</strong> Superaste el entrenamiento en condiciones de alta exigencia mental o baja energía inicial.</span>
                      </div>
                    )}
                    {w.notes && (
                      <div className="rounded-xl border border-[#2B2146] bg-[#161126] p-3 text-xs text-[#94A3B8]">
                        <span className="font-bold text-white block mb-0.5">Notas de la sesión:</span>
                        {w.notes}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(grouped).map(([exName, sets]) => (
                        <div
                          key={exName}
                          className="rounded-xl border border-[#2B2146] bg-[#161126] p-3.5 space-y-2"
                        >
                          <h4 className="text-sm font-bold text-[#F8FAFC]">{exName}</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {sets.map((s) => (
                              <span
                                key={s.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#2B2146] bg-[#120D20] px-2.5 py-1 text-xs font-semibold text-white"
                              >
                                <span className="text-[#64748B]">#{s.set_number}</span>
                                <span>{s.weight}kg × {s.reps}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
