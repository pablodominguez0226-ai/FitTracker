import React, { useState, useEffect, useMemo } from "react";
import { X, Check, Loader2, Dumbbell } from "lucide-react";
import { getMuscleGroups, createExercise, findSimilarExercises } from "../api/client";
import { getCachedExercises } from "../services/exerciseCache";
import { showToast } from "./Toast";

const OFFICIAL_MUSCLES = [
  "Pecho",
  "Espalda",
  "Brazos",
  "Piernas",
];

const STOPWORDS = new Set([
  "de", "del", "en", "con", "al", "la", "el", "los", "las",
  "un", "una", "unos", "unas", "para", "por", "a", "y", "o", "u", "se", "su",
]);

function normalizeText(str = "") {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stemWord(w = "") {
  if (w.length > 5 && w.endsWith("iones")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("es") && !w.endsWith("ps")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

function tokenize(str = "") {
  const norm = normalizeText(str);
  if (!norm) return [];
  return norm
    .split(" ")
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
    .map(stemWord);
}

function findLocalSimilarExercises(inputName, muscleGroupId) {
  const cleanInput = normalizeText(inputName);
  if (cleanInput.length < 3) return [];
  const inputTokens = new Set(tokenize(inputName));
  if (inputTokens.size === 0) return [];

  const catalog = getCachedExercises() || [];
  const matches = [];

  for (const ex of catalog) {
    if (!ex || !ex.name) continue;
    const candNorm = normalizeText(ex.name);
    if (!candNorm) continue;

    if (candNorm === cleanInput) {
      matches.push({ ...ex, similarity_score: 1.0 });
      continue;
    }

    const candTokens = new Set(tokenize(ex.name));
    if (candTokens.size === 0) continue;

    let overlap = 0;
    inputTokens.forEach((t) => {
      if (candTokens.has(t)) overlap += 1;
    });

    const candCoverage = overlap / Math.max(candTokens.size, 1);
    const inputCoverage = overlap / Math.max(inputTokens.size, 1);
    const unionSize = new Set([...inputTokens, ...candTokens]).size;
    const jaccard = overlap / Math.max(unionSize, 1);
    const substrBoost = cleanInput.includes(candNorm) || candNorm.includes(cleanInput) ? 0.25 : 0;

    let mgBoost = 0;
    if (muscleGroupId) {
      mgBoost = Number(ex.muscle_group_id) === Number(muscleGroupId) ? 0.12 : -0.15;
    }

    const score = Math.max(candCoverage * 0.65 + inputCoverage * 0.35, jaccard) + substrBoost + mgBoost;

    const isRelevant =
      (overlap >= 2 && score >= 0.52) ||
      (overlap >= 1 && candTokens.size <= 2 && score >= 0.62) ||
      (substrBoost > 0 && cleanInput.length >= 4);

    if (muscleGroupId && Number(ex.muscle_group_id) !== Number(muscleGroupId) && score < 0.72) {
      continue;
    }

    if (isRelevant) {
      matches.push({ ...ex, similarity_score: score });
    }
  }

  matches.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
  return matches.slice(0, 3);
}

export default function CreateExerciseModal({
  isOpen,
  onClose,
  onExerciseCreated,
  initialMuscleId = null,
  muscleGroups: propMuscleGroups = null,
}) {
  const [name, setName] = useState("");
  const [muscleGroups, setMuscleGroups] = useState(propMuscleGroups || []);
  const [selectedMuscleId, setSelectedMuscleId] = useState(initialMuscleId);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [similarExercises, setSimilarExercises] = useState([]);
  const [ignoreSimilarForSignature, setIgnoreSimilarForSignature] = useState("");

  const currentSignature = useMemo(
    () => `${normalizeText(name)}|${selectedMuscleId || ""}`,
    [name, selectedMuscleId]
  );

  // Cargar grupos musculares si no se pasaron como prop
  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setName("");
    setSimilarExercises([]);
    setIgnoreSimilarForSignature("");

    if (propMuscleGroups && propMuscleGroups.length > 0) {
      setMuscleGroups(propMuscleGroups);
      if (!initialMuscleId && propMuscleGroups.length > 0) {
        setSelectedMuscleId(propMuscleGroups[0].id);
      } else if (initialMuscleId) {
        setSelectedMuscleId(initialMuscleId);
      }
    } else {
      getMuscleGroups()
        .then((groups) => {
          const list = Array.isArray(groups) ? groups : [];
          setMuscleGroups(list);
          if (list.length > 0) {
            if (initialMuscleId) {
              setSelectedMuscleId(initialMuscleId);
            } else {
              setSelectedMuscleId(list[0].id);
            }
          }
        })
        .catch((err) => {
          console.error("Error cargando grupos musculares:", err);
        });
    }
  }, [isOpen, propMuscleGroups, initialMuscleId]);

  // Búsqueda predictiva de similitud en tiempo real al completar nombre y músculo
  useEffect(() => {
    if (!isOpen) return;
    const clean = name.trim();
    if (clean.length < 3) {
      setSimilarExercises([]);
      return;
    }

    // Coincidencia inmediata local
    const localMatches = findLocalSimilarExercises(clean, selectedMuscleId);
    setSimilarExercises(localMatches);

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const remoteMatches = await findSimilarExercises({
          name: clean,
          muscle_group_id: selectedMuscleId,
          limit: 3,
        });
        if (!cancelled && Array.isArray(remoteMatches) && remoteMatches.length > 0) {
          setSimilarExercises(remoteMatches);
        }
      } catch {
        // Mantener resultado local si falla red
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, name, selectedMuscleId]);

  if (!isOpen) return null;

  const topSimilar = similarExercises.length > 0 ? similarExercises[0] : null;
  const showSimilarWarning = Boolean(topSimilar && ignoreSimilarForSignature !== currentSignature);

  const handleUseExistingExercise = (existingEx) => {
    if (!existingEx) return;
    showToast(`Usando "${existingEx.name}"`, "info");
    if (onExerciseCreated) {
      onExerciseCreated(existingEx);
    }
    onClose();
  };

  const executeCreateNewExercise = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Por favor ingresá un nombre para el ejercicio.");
      return;
    }
    if (!selectedMuscleId) {
      setError("Por favor seleccioná un grupo muscular.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      const created = await createExercise(cleanName, selectedMuscleId, true);
      showToast(`Ejercicio "${cleanName}" creado con éxito`, "success");
      if (onExerciseCreated) {
        onExerciseCreated(created);
      }
      onClose();
    } catch (err) {
      console.error("Error al crear ejercicio:", err);
      const detail = err.response?.data?.detail || err.message || "Error al crear el ejercicio.";
      setError(detail);
      showToast(detail, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Por favor ingresá un nombre para el ejercicio.");
      return;
    }
    if (!selectedMuscleId) {
      setError("Por favor seleccioná un grupo muscular.");
      return;
    }

    // Si aún no se verificó o hay coincidencia similar activa, consultar antes de guardar
    if (ignoreSimilarForSignature !== currentSignature) {
      let matches = similarExercises;
      if (!matches || matches.length === 0) {
        const remote = await findSimilarExercises({
          name: cleanName,
          muscle_group_id: selectedMuscleId,
          limit: 3,
        });
        matches = remote.length > 0 ? remote : findLocalSimilarExercises(cleanName, selectedMuscleId);
      }
      if (matches && matches.length > 0) {
        setSimilarExercises(matches);
        return;
      }
    }

    await executeCreateNewExercise();
  };

  // Mapear grupos musculares para asegurar orden amigable
  const displayGroups = OFFICIAL_MUSCLES.map((mName) => {
    const found = muscleGroups.find(
      (g) => g.name.toLowerCase().trim() === mName.toLowerCase().trim()
    );
    return found || { id: null, name: mName };
  }).filter((g) => g.id !== null);

  // Si hay grupos adicionales no estándar, incluirlos al final
  const extraGroups = muscleGroups.filter(
    (g) => !OFFICIAL_MUSCLES.some((m) => m.toLowerCase() === g.name.toLowerCase().trim())
  );
  const allDisplayGroups = [...displayGroups, ...extraGroups];

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-150">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md sm:max-w-lg bg-white border border-slate-100 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[88dvh] overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
      >
        {/* CABECERA */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">
              <Dumbbell size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#0F172A]">
                Crear Nuevo Ejercicio
              </h3>
              <p className="text-xs text-[#64748B]">
                Añadí un nuevo movimiento a tu catálogo personal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[#64748B] hover:text-[#0F172A] transition active:scale-95 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* CUERPO SCROLLEABLE */}
        <div className="p-4 space-y-3.5 overflow-y-auto overscroll-contain flex-1">
          {error && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-semibold text-rose-300">
              {error}
            </div>
          )}

          {/* 1. Nombre del Ejercicio */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] block">
              Nombre del ejercicio <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Aperturas en banco inclinado"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-4 text-sm font-medium text-[#0F172A] placeholder:text-[#636366] outline-none transition focus:border-red-500"
            />
          </div>

          {/* 2. Selector de Grupo Muscular */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] block">
              Grupo muscular <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allDisplayGroups.map((g) => {
                const isSelected = selectedMuscleId === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedMuscleId(g.id)}
                    className={`h-9 px-3 rounded-xl text-xs font-semibold transition active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm"
                        : "border border-slate-100 bg-slate-50 text-[#64748B] hover:border-slate-100 hover:text-[#0F172A]"
                    }`}
                  >
                    <span>{g.name}</span>
                    {isSelected && <Check size={13} strokeWidth={3} className="text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Detector inteligente de duplicados */}
          {showSimilarWarning && topSimilar && (
            <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-3.5 space-y-2.5 animate-in fade-in duration-150">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-red-400 leading-snug">
                  💡 Ejercicio similar encontrado: &apos;{topSimilar.name}&apos;
                </p>
                {topSimilar.muscle_group_name && (
                  <p className="text-[11px] text-red-400/80 font-medium">
                    Músculo: {topSimilar.muscle_group_name}
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleUseExistingExercise(topSimilar)}
                  className="flex-1 h-10 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition active:scale-95 cursor-pointer flex items-center justify-center"
                >
                  Usar este ejercicio
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setIgnoreSimilarForSignature(currentSignature);
                    executeCreateNewExercise();
                  }}
                  className="flex-1 h-10 px-3 rounded-xl border border-red-400/40 bg-slate-50 hover:bg-[#26262B] text-red-400 font-semibold text-xs transition active:scale-95 cursor-pointer flex items-center justify-center"
                >
                  Continuar y crear nuevo
                </button>
              </div>
            </div>
          )}

        </div>

        {/* PIE FIJO ANCLADO */}
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-white flex gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 text-[#0F172A] font-semibold text-xs hover:bg-[#26262B] transition active:scale-95 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving || !name.trim()}
            className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 hover:bg-red-700 text-white font-bold text-sm transition active:scale-[0.98] cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 shadow-md shadow-red-500/20"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>＋ Guardar Ejercicio</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
