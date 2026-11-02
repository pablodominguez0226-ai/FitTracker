import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getExercises, getMuscleGroups, getRecords } from "../api/client";
import { ExerciseList } from "../components/ExerciseCatalogModal";
import { showToast } from "../components/Toast";

export default function Exercises() {
  const navigate = useNavigate();
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [recordsMap, setRecordsMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    Promise.all([
      getMuscleGroups().catch(() => []),
      getExercises().catch(() => []),
      getRecords().catch(() => []),
    ])
      .then(([groups, exList, recs]) => {
        if (!isMounted) return;
        setMuscleGroups(Array.isArray(groups) ? groups : []);
        setExercises(Array.isArray(exList) ? exList : []);
        const rMap = {};
        if (Array.isArray(recs)) {
          recs.forEach((r) => {
            if (r?.exercise_id) rMap[r.exercise_id] = r;
          });
        }
        setRecordsMap(rMap);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-red-600 dark:text-red-400">
        <Loader2 size={32} className="animate-spin" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Cargando catálogo de ejercicios...
        </p>
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-2">
      <ExerciseList
        title="Agregar"
        allExercises={exercises}
        muscleGroups={muscleGroups}
        recordsMap={recordsMap}
        onBack={() => navigate(-1)}
        onSelectMultiple={(selectedList) => {
          if (!selectedList || selectedList.length === 0) return;
          const routinePayload = {
            name: "Sesión Personalizada",
            title: "Sesión Personalizada",
            exercises: selectedList.map((ex) => ({
              exercise_id: ex.id,
              id: ex.id,
              name: ex.name,
              muscle: ex.muscle_group_name || "General",
              target_sets: 4,
              target_reps: "8-12",
            })),
          };
          showToast(
            `⚡ ${selectedList.length} ${
              selectedList.length === 1 ? "ejercicio agregado" : "ejercicios agregados"
            }`,
            "info"
          );
          navigate("/workouts", {
            state: {
              loadRoutine: routinePayload,
              enterFocus: true,
            },
          });
        }}
        onExerciseCreated={(newEx) => {
          setExercises((prev) => [newEx, ...prev]);
        }}
        isStandalonePage={true}
      />
    </div>
  );
}
