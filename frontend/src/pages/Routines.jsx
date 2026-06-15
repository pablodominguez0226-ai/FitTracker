import React, { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "../api/client";
import Card from "../components/Card";
import Header from "../components/Header";

const emptyForm = {
  id: null,
  name: "",
  days: "",
  exerciseIds: []
};

export default function Routines() {
  const [routines, setRoutines] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [exerciseToAdd, setExerciseToAdd] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    const [routinesRes, exercisesRes] = await Promise.all([api.get("/routines"), api.get("/exercises")]);
    setRoutines(routinesRes.data);
    setExercises(exercisesRes.data);
  }

  useEffect(() => {
    loadData();
  }, []);

  const exerciseById = useMemo(() => {
    return exercises.reduce((acc, exercise) => {
      acc[exercise.id] = exercise;
      return acc;
    }, {});
  }, [exercises]);

  const availableExercises = useMemo(() => {
    const selected = new Set(form.exerciseIds);
    return exercises.filter((exercise) => !selected.has(exercise.id));
  }, [exercises, form.exerciseIds]);

  function startCreate() {
    setForm({ ...emptyForm });
    setExerciseToAdd("");
    setMessage("");
  }

  function startEdit(routine) {
    setForm({
      id: routine.id,
      name: routine.name,
      days: routine.days,
      exerciseIds: routine.exercises.map((item) => item.exercise.id)
    });
    setExerciseToAdd("");
    setMessage("");
  }

  function addExercise() {
    const id = Number(exerciseToAdd || availableExercises[0]?.id);
    if (!id || form.exerciseIds.includes(id)) return;
    setForm((current) => ({ ...current, exerciseIds: [...current.exerciseIds, id] }));
    setExerciseToAdd("");
  }

  function removeExercise(id) {
    setForm((current) => ({ ...current, exerciseIds: current.exerciseIds.filter((exerciseId) => exerciseId !== id) }));
  }

  function moveExercise(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= form.exerciseIds.length) return;
    const next = [...form.exerciseIds];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setForm((current) => ({ ...current, exerciseIds: next }));
  }

  async function saveRoutine(event) {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      days: form.days.trim(),
      exercise_ids: form.exerciseIds
    };
    if (!payload.name || !payload.days) {
      setMessage("Completá nombre y días antes de guardar.");
      return;
    }

    if (form.id) {
      await api.put(`/routines/${form.id}`, payload);
      setMessage("Rutina actualizada.");
    } else {
      const res = await api.post("/routines", payload);
      setForm((current) => ({ ...current, id: res.data.id }));
      setMessage("Rutina creada.");
    }
    await loadData();
  }

  async function deleteRoutine(routine) {
    const confirmed = window.confirm(`¿Eliminar la rutina "${routine.name}"?`);
    if (!confirmed) return;
    await api.delete(`/routines/${routine.id}`);
    if (form.id === routine.id) {
      startCreate();
    }
    setMessage("Rutina eliminada.");
    await loadData();
  }

  return (
    <>
      <Header title="Rutinas" subtitle="Construye sesiones propias y ordena cada ejercicio" />

      <div className="ft-scrollbar-hide mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={startCreate}
          className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-semibold transition ${form.id ? "border-white/10 bg-white/[0.04] text-slate-300" : "border-blue-400/30 bg-blue-500/12 text-blue-100"}`}
        >
          <Plus size={17} /> Crear rutina
        </button>
        {routines.map((routine) => (
          <button
            key={routine.id}
            onClick={() => startEdit(routine)}
            className={`shrink-0 rounded-2xl border px-3.5 py-2 text-sm font-semibold transition ${form.id === routine.id ? "border-blue-400/30 bg-blue-500/12 text-blue-100" : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]"}`}
          >
            {routine.name}
          </button>
        ))}
      </div>

      <Card>
        <form onSubmit={saveRoutine} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="ft-label">
              Nombre de rutina
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Ej: Push fuerza"
                className="ft-input mt-2"
              />
            </label>
            <label className="ft-label">
              Días
              <input
                value={form.days}
                onChange={(event) => setForm({ ...form, days: event.target.value })}
                placeholder="Ej: Lunes,Jueves"
                className="ft-input mt-2"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <div className="flex gap-2">
              <select
                value={exerciseToAdd}
                onChange={(event) => setExerciseToAdd(event.target.value)}
                className="ft-select min-w-0 flex-1"
              >
                <option value="">Agregar ejercicio</option>
                {availableExercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
                ))}
              </select>
              <button type="button" onClick={addExercise} className="ft-button px-4">
                <Plus size={20} />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {form.exerciseIds.map((id, index) => {
                const exercise = exerciseById[id];
                return (
                  <div key={id} className="grid grid-cols-[1.75rem_minmax(0,1fr)_2.35rem_2.35rem_2.35rem] items-center gap-1.5 rounded-2xl border border-white/10 bg-fitSurface/80 p-2">
                    <span className="text-center text-sm font-black text-blue-200">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{exercise?.name ?? "Ejercicio"}</p>
                      <p className="truncate text-xs text-slate-500">{exercise?.muscle_group ?? "General"}</p>
                    </div>
                    <IconButton label="Subir" disabled={index === 0} onClick={() => moveExercise(index, -1)} icon={ArrowUp} />
                    <IconButton label="Bajar" disabled={index === form.exerciseIds.length - 1} onClick={() => moveExercise(index, 1)} icon={ArrowDown} />
                    <IconButton label="Quitar" onClick={() => removeExercise(id)} icon={X} danger />
                  </div>
                );
              })}
              {!form.exerciseIds.length ? (
                <p className="rounded-2xl border border-dashed border-white/10 px-3 py-7 text-center text-sm text-slate-500">Agregá ejercicios para armar la rutina.</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <button className="ft-button">
              <Save size={19} /> Guardar
            </button>
            {form.id ? (
              <button type="button" onClick={() => deleteRoutine({ id: form.id, name: form.name })} className="ft-button-danger">
                <Trash2 size={19} /> Eliminar
              </button>
            ) : null}
          </div>
        </form>
        {message ? <p className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">{message}</p> : null}
      </Card>

      <div className="mt-4 space-y-3">
        {routines.map((routine) => (
          <Card key={routine.id} className="p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-black sm:text-lg">{routine.name}</h2>
                <p className="text-sm text-slate-400">{routine.days} · {routine.exercises.length} ejercicios</p>
              </div>
              <button onClick={() => startEdit(routine)} className="ft-button-ghost px-3.5 py-2 text-sm">Editar</button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function IconButton({ label, icon: Icon, disabled = false, danger = false, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`ft-icon-button ${danger ? "border-red-500/40 text-red-200 hover:bg-red-500/10" : ""}`}
    >
      <Icon size={16} />
    </button>
  );
}
