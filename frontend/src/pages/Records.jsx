import React, { useEffect, useMemo, useState } from "react";
import { Search, Trophy } from "lucide-react";
import { api } from "../api/client";
import Card from "../components/Card";
import Header from "../components/Header";

export default function Records() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("all");

  useEffect(() => {
    api.get("/records").then((res) => setRecords(res.data));
  }, []);

  const groupedRecords = useMemo(() => {
    const groups = records.reduce((acc, record) => {
      const id = record.exercise_id;
      if (!acc[id]) {
        acc[id] = {
          exercise: record.exercise,
          weight: null,
          reps: null,
          volume: null,
          lastDate: record.achieved_at
        };
      }

      const group = acc[id];
      const weight = Number(record.weight ?? 0);
      const reps = Number(record.reps ?? 0);
      const volume = record.record_type === "volume" ? Number(record.value ?? 0) : weight > 0 && reps > 0 ? weight * reps : null;

      if (record.achieved_at > group.lastDate) {
        group.lastDate = record.achieved_at;
      }
      if (record.record_type === "weight" && (!group.weight || weight > Number(group.weight.weight ?? 0))) {
        group.weight = record;
      }
      if (record.record_type === "reps" && (!group.reps || reps > Number(group.reps.reps ?? 0))) {
        group.reps = record;
      }
      if (volume && (!group.volume || volume > group.volume.value)) {
        group.volume = { value: volume, weight, reps, achieved_at: record.achieved_at };
      }

      return acc;
    }, {});

    return Object.values(groups).sort((a, b) => a.exercise.name.localeCompare(b.exercise.name));
  }, [records]);

  const muscleGroups = useMemo(() => {
    return [...new Set(groupedRecords.map((item) => item.exercise.muscle_group).filter(Boolean))].sort();
  }, [groupedRecords]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return groupedRecords.filter((item) => {
      const matchesSearch = item.exercise.name.toLowerCase().includes(query);
      const matchesGroup = muscleGroup === "all" || item.exercise.muscle_group === muscleGroup;
      return matchesSearch && matchesGroup;
    });
  }, [groupedRecords, muscleGroup, search]);

  return (
    <>
      <Header title="PRs" subtitle="Récords agrupados por ejercicio" />

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
        {muscleGroups.length ? (
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
        ) : null}
      </Card>

      <div className="space-y-3">
        {filteredGroups.map((group) => (
          <Card key={group.exercise.id}>
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-2.5 text-blue-100">
                <Trophy size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-black sm:text-lg">{group.exercise.name}</h2>
                  {group.exercise.muscle_group ? (
                    <span className="ft-chip">
                      {group.exercise.muscle_group}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-slate-400">Último PR · {formatDate(group.lastDate)}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <RecordStat
                label="Mayor peso"
                value={group.weight ? `${formatNumber(group.weight.weight)}kg` : "--"}
                detail={group.weight ? `${group.weight.reps ?? 0} reps · ${formatDate(group.weight.achieved_at)}` : "Sin dato"}
              />
              <RecordStat
                label="Más repeticiones"
                value={group.reps ? `${group.reps.reps ?? 0}` : "--"}
                detail={group.reps ? `${formatNumber(group.reps.weight)}kg · ${formatDate(group.reps.achieved_at)}` : "Sin dato"}
              />
              <RecordStat
                label="Mejor volumen"
                value={group.volume ? `${formatNumber(group.volume.value)}kg` : "--"}
                detail={group.volume ? `${formatNumber(group.volume.weight)}kg x ${group.volume.reps}` : "Sin dato"}
              />
            </div>
          </Card>
        ))}
        {!records.length ? <Card><p className="text-slate-300">Guarda un entrenamiento para crear tus primeros récords.</p></Card> : null}
        {records.length && !filteredGroups.length ? <Card><p className="text-slate-300">No hay PRs para ese filtro.</p></Card> : null}
      </div>
    </>
  );
}

function RecordStat({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-fitText sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function formatNumber(value) {
  const number = Number(value ?? 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatDate(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}
