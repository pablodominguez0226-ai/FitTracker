import React, { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import Card from "../components/Card";
import Header from "../components/Header";
import Metric from "../components/Metric";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");

  useEffect(() => {
    Promise.all([api.get("/dashboard"), api.get("/workouts"), api.get("/records")]).then(([dashboardRes, workoutsRes, recordsRes]) => {
      setData(dashboardRes.data);
      setWorkouts(workoutsRes.data);
      setRecords(recordsRes.data);
    });
  }, []);

  const measurements = data?.measurements ?? [];
  const strengthExercises = useMemo(() => {
    const exercises = new Map();
    workouts.forEach((workout) => {
      workout.entries.forEach((entry) => {
        if (entry.exercise) {
          exercises.set(entry.exercise_id, entry.exercise.name);
        }
      });
    });
    return [...exercises.entries()]
      .map(([id, name]) => ({ id: String(id), name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [workouts]);

  useEffect(() => {
    if (!selectedExerciseId && strengthExercises.length) {
      setSelectedExerciseId(strengthExercises[0].id);
    }
  }, [selectedExerciseId, strengthExercises]);

  const strengthProgress = useMemo(() => {
    if (!selectedExerciseId) return [];
    const bestByDate = new Map();

    workouts.forEach((workout) => {
      workout.entries
        .filter((entry) => String(entry.exercise_id) === selectedExerciseId)
        .forEach((entry) => {
          const currentBest = bestByDate.get(workout.performed_at) ?? 0;
          const weight = Number(entry.weight ?? 0);
          if (weight > currentBest) {
            bestByDate.set(workout.performed_at, weight);
          }
        });
    });

    return [...bestByDate.entries()]
      .map(([date, weight]) => ({ date, weight }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedExerciseId, workouts]);

  const weeklyVolume = workouts
    .filter((workout) => {
      const date = new Date(`${workout.performed_at}T00:00:00`);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    })
    .reduce((total, workout) => total + workout.entries.reduce((sum, entry) => sum + Number(entry.weight ?? 0) * Number(entry.reps ?? 0), 0), 0);

  return (
    <>
      <Header title="Panel" subtitle="Tu progreso de fuerza, cuerpo y consistencia en una vista rápida" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <Metric label="Peso actual" value={data?.current_weight} suffix="kg" detail="Última medición" />
        <Metric label="Entrenamientos" value={workouts.length} detail="Total registrado" />
        <Metric label="Volumen semanal" value={formatCompact(weeklyVolume)} suffix="kg" detail="Últimos 7 días" />
        <Metric label="PRs Totales" value={records.length} detail={data?.latest_record?.exercise ?? "Sin PRs"} />
      </div>

      <Card className="mt-4 bg-gradient-to-br from-blue-500/10 via-fitCard to-fitCard sm:mt-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">Última sesión</p>
          <h2 className="mt-2 text-lg font-black sm:text-xl">{data?.latest_workout?.routine ?? "Sin entrenamientos todavía"}</h2>
          <p className="mt-1 text-sm text-slate-400">{data?.latest_workout?.date ?? "Guardá tu primera sesión para activar el seguimiento"}</p>
        </div>
      </Card>

      <ChartCard title="Evolución de peso" data={measurements} dataKey="weight" suffix="kg" />
      <StrengthChart
        data={strengthProgress}
        exercises={strengthExercises}
        selectedExerciseId={selectedExerciseId}
        onSelectExercise={setSelectedExerciseId}
      />
    </>
  );
}

function ChartCard({ title, data, dataKey, suffix }) {
  return (
    <Card className="mt-4 sm:mt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black">{title}</h2>
        <span className="ft-chip">{suffix}</span>
      </div>
      <div className="h-52 sm:h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={false} tickMargin={10} />
            <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
            <Tooltip contentStyle={{ background: "#0D111C", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, color: "#F8FAFC" }} formatter={(value) => [`${value}${suffix}`, title]} />
            <Line type="monotone" dataKey={dataKey} stroke="#60A5FA" strokeWidth={3} dot={{ r: 3, fill: "#60A5FA", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#93C5FD" }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function StrengthChart({ data, exercises, selectedExerciseId, onSelectExercise }) {
  return (
    <Card className="mt-4 sm:mt-5">
      <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_16rem] sm:items-center">
        <div>
          <h2 className="text-lg font-black">Evolución de fuerza</h2>
          <p className="mt-1 text-sm text-slate-400">Mayor peso levantado por fecha</p>
        </div>
        <select
          value={selectedExerciseId}
          onChange={(event) => onSelectExercise(event.target.value)}
          className="ft-select"
          disabled={!exercises.length}
        >
          {!exercises.length ? <option value="">Sin entrenamientos</option> : null}
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
          ))}
        </select>
      </div>

      <div className="h-52 sm:h-60">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
              <Tooltip contentStyle={{ background: "#0D111C", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, color: "#F8FAFC" }} formatter={(value) => [`${value}kg`, "Mayor peso"]} />
              <Line type="monotone" dataKey="weight" stroke="#60A5FA" strokeWidth={3} dot={{ r: 3, fill: "#60A5FA", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#93C5FD" }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-center text-sm text-slate-500">
            Guardá entrenamientos para ver el progreso de cargas.
          </div>
        )}
      </div>
    </Card>
  );
}

function formatCompact(value) {
  if (!value) return 0;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return Math.round(value);
}
