import React, { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { api } from "../api/client";
import Card from "../components/Card";
import Header from "../components/Header";

export default function Workouts() {
  const [routines, setRoutines] = useState([]);
  const [routineId, setRoutineId] = useState("");
  const [sets, setSets] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/routines").then((res) => {
      setRoutines(res.data);
      setRoutineId(String(res.data[0]?.id ?? ""));
    });
  }, []);

  const routine = useMemo(() => routines.find((item) => String(item.id) === String(routineId)), [routines, routineId]);

  useEffect(() => {
    if (!routine) return;
    const next = {};
    routine.exercises.forEach(({ exercise }) => {
      const weight = exercise.last_suggested_weight ?? "";
      next[exercise.id] = Array.from({ length: exercise.default_sets }, (_, index) => ({
        set_number: index + 1,
        weight,
        reps: exercise.min_reps
      }));
    });
    setSets(next);
  }, [routine]);

  function updateSet(exerciseId, index, field, value) {
    setSets((current) => ({
      ...current,
      [exerciseId]: current[exerciseId].map((item, i) => (i === index ? { ...item, [field]: value } : item))
    }));
  }

  async function saveWorkout() {
    const entries = Object.entries(sets).flatMap(([exerciseId, rows]) =>
      rows.flatMap((row) => {
        if (row.weight === "" || row.reps === "") return [];

        const weight = Number(row.weight);
        const reps = Number(row.reps);
        if (!Number.isFinite(weight) || !Number.isFinite(reps)) return [];

        return [{
          exercise_id: Number(exerciseId),
          set_number: row.set_number,
          weight,
          reps
        }];
      })
    );

    if (!entries.length) {
      setMessage("Cargá al menos una serie con peso y repeticiones.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const res = await api.post("/workouts", { routine_id: Number(routineId), entries });
      const suggestions = new Map(res.data.entries.map((entry) => [entry.exercise_id, entry.suggestion_weight]));
      setMessage(`Entrenamiento guardado. Próximas sugerencias actualizadas para ${suggestions.size} ejercicios.`);
    } catch (error) {
      setMessage(error.response?.data?.detail ?? "No se pudo guardar el entrenamiento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Header title="Entrenar" subtitle="Carga tu sesión con inputs cómodos y sugerencias de progresión" />
      <Card>
        <label className="ft-label" htmlFor="routine">Rutina seleccionada</label>
        <select id="routine" value={routineId} onChange={(e) => setRoutineId(e.target.value)} className="ft-select mt-2">
          {routines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Card>

      <div className="mt-4 space-y-3">
        {routine?.exercises.map(({ exercise }) => (
          <Card key={exercise.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-black sm:text-lg">{exercise.name}</h2>
                <p className="mt-1 text-sm text-slate-400">Rango {exercise.min_reps}-{exercise.max_reps} reps</p>
              </div>
              <span className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-100">
                {exercise.last_suggested_weight != null ? `${exercise.last_suggested_weight}kg` : "Sin sugerencia"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-[3.25rem_1fr_1fr] gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span>Serie</span><span>Peso</span><span>Reps</span>
            </div>
            <div className="mt-2 space-y-2">
              {(sets[exercise.id] ?? []).map((row, index) => (
                <div key={row.set_number} className="grid grid-cols-[3.25rem_1fr_1fr] gap-2">
                  <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-slate-300">{row.set_number}</div>
                  <input type="number" step="2.5" value={row.weight} onChange={(e) => updateSet(exercise.id, index, "weight", e.target.value)} className="ft-input min-w-0 text-center font-bold" />
                  <input type="number" value={row.reps} onChange={(e) => updateSet(exercise.id, index, "reps", e.target.value)} className="ft-input min-w-0 text-center font-bold" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <button onClick={saveWorkout} disabled={saving} className="ft-button mt-5 w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-60">
        <Save size={20} /> {saving ? "Guardando..." : "Guardar"}
      </button>
      {message ? <p className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">{message}</p> : null}
    </>
  );
}
