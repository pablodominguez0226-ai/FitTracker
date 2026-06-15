import React, { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Save, Search, Trash2, X } from "lucide-react";
import { api } from "../api/client";
import Card from "../components/Card";
import Header from "../components/Header";

const emptyForm = {
  id: null,
  name: "",
  muscle_group: "",
  min_reps: 8,
  max_reps: 12,
  default_sets: 4
};

export default function Exercises() {
  const [exercises, setExercises] = useState([]);
  const [search, setSearch] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("all");
  const [form, setForm] = useState({ ...emptyForm });
  const [message, setMessage] = useState("");

  async function loadExercises() {
    const res = await api.get("/exercises");
    setExercises(res.data);
  }

  useEffect(() => {
    loadExercises();
  }, []);

  const muscleGroups = useMemo(() => {
    return [...new Set(exercises.map((exercise) => exercise.muscle_group).filter(Boolean))].sort();
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    return exercises.filter((exercise) => {
      const matchesSearch = exercise.name.toLowerCase().includes(query);
      const matchesGroup = muscleGroup === "all" || exercise.muscle_group === muscleGroup;
      return matchesSearch && matchesGroup;
    });
  }, [exercises, muscleGroup, search]);

  function startCreate() {
    setForm({ ...emptyForm });
    setMessage("");
  }

  function startEdit(exercise) {
    if (exercise.is_global) {
      setMessage("Los ejercicios globales están protegidos.");
      return;
    }
    setForm({
      id: exercise.id,
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      min_reps: exercise.min_reps,
      max_reps: exercise.max_reps,
      default_sets: exercise.default_sets
    });
    setMessage("");
  }

  async function saveExercise(event) {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      muscle_group: form.muscle_group.trim() || "General",
      min_reps: Number(form.min_reps),
      max_reps: Number(form.max_reps),
      default_sets: Number(form.default_sets)
    };

    if (!payload.name) {
      setMessage("Completá el nombre del ejercicio.");
      return;
    }
    if (payload.min_reps > payload.max_reps) {
      setMessage("El mínimo de reps no puede ser mayor al máximo.");
      return;
    }

    try {
      if (form.id) {
        await api.put(`/exercises/${form.id}`, payload);
        setMessage("Ejercicio actualizado.");
      } else {
        await api.post("/exercises", payload);
        setMessage("Ejercicio creado.");
      }
      setForm({ ...emptyForm });
      await loadExercises();
    } catch (error) {
      setMessage(error.response?.data?.detail ?? "No se pudo guardar el ejercicio.");
    }
  }

  async function deleteExercise(exercise) {
    const confirmed = window.confirm(`¿Eliminar "${exercise.name}"?`);
    if (!confirmed) return;
    try {
      await api.delete(`/exercises/${exercise.id}`);
      if (form.id === exercise.id) {
        setForm({ ...emptyForm });
      }
      setMessage("Ejercicio eliminado.");
      await loadExercises();
    } catch (error) {
      setMessage(error.response?.data?.detail ?? "No se pudo eliminar el ejercicio.");
    }
  }

  return (
    <>
      <Header title="Ejercicios" subtitle="Gestiona movimientos globales y personalizados" />

      <Card className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar ejercicio"
            className="ft-input py-3 pl-10"
          />
        </div>
        <select
          value={muscleGroup}
          onChange={(event) => setMuscleGroup(event.target.value)}
          className="ft-select mt-3"
        >
          <option value="all">Todos los grupos musculares</option>
          {muscleGroups.map((group) => (
            <option key={group} value={group}>{group}</option>
          ))}
        </select>
      </Card>

      <Card className="mb-4">
        <form onSubmit={saveExercise} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black sm:text-lg">{form.id ? "Editar ejercicio" : "Crear ejercicio"}</h2>
            {form.id ? (
              <button type="button" onClick={startCreate} className="ft-icon-button h-10 w-10" aria-label="Cancelar edición">
                <X size={18} />
              </button>
            ) : null}
          </div>
          <label className="ft-label">
            Nombre
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Ej: Aperturas en máquina"
              className="ft-input mt-2"
            />
          </label>
          <label className="ft-label">
            Grupo muscular
            <input
              value={form.muscle_group}
              onChange={(event) => setForm({ ...form, muscle_group: event.target.value })}
              placeholder="Ej: Pecho"
              className="ft-input mt-2"
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Min reps" value={form.min_reps} onChange={(value) => setForm({ ...form, min_reps: value })} />
            <NumberField label="Max reps" value={form.max_reps} onChange={(value) => setForm({ ...form, max_reps: value })} />
            <NumberField label="Series" value={form.default_sets} onChange={(value) => setForm({ ...form, default_sets: value })} />
          </div>
          <button className="ft-button w-full">
            {form.id ? <Save size={19} /> : <Plus size={19} />} {form.id ? "Guardar cambios" : "Crear ejercicio"}
          </button>
        </form>
        {message ? <p className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">{message}</p> : null}
      </Card>

      <div className="space-y-3">
        {filteredExercises.map((exercise) => (
          <Card key={exercise.id} className="p-3.5 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-black">{exercise.name}</h2>
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${exercise.is_global ? "border-white/10 bg-white/[0.04] text-slate-300" : "border-blue-400/30 bg-blue-500/15 text-blue-100"}`}>
                    {exercise.is_global ? "Global" : "Personal"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  {exercise.muscle_group} · {exercise.default_sets} series · {exercise.min_reps}-{exercise.max_reps} reps
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(exercise)}
                  disabled={exercise.is_global}
                  className="ft-icon-button h-10 w-10"
                  aria-label="Editar"
                  title="Editar"
                >
                  <Edit3 size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteExercise(exercise)}
                  disabled={exercise.is_global}
                  className="ft-icon-button h-10 w-10 border-red-500/40 text-red-200 hover:bg-red-500/10"
                  aria-label="Eliminar"
                  title="Eliminar"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          </Card>
        ))}
        {!filteredExercises.length ? <Card><p className="text-slate-300">No hay ejercicios para ese filtro.</p></Card> : null}
      </div>
    </>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="ft-label">
      {label}
      <input
        type="number"
        min="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="ft-input mt-2 text-center font-bold"
      />
    </label>
  );
}
