import React, { useEffect, useMemo, useState } from "react";
import {
  Apple,
  ArrowRight,
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Flame,
  Info,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";
import {
  calculateMacros,
  getNutritionPlan,
  getTodayNutrition,
  updateNutritionPlan,
  updateTodayNutrition,
  uploadDietPdf,
} from "../api/client";
import { showToast } from "../components/Toast";
import { getLocalDateString } from "../utils/dateUtils";

export default function Nutrition({ currentUser }) {
  const [activeMode, setActiveMode] = useState("macros"); // 'macros' | 'plan'
  const [loading, setLoading] = useState(true);

  // 1. MODO MACROS
  const [todayLog, setTodayLog] = useState({
    calories_consumed: 0,
    protein_consumed: 0,
    carbs_consumed: 0,
    fats_consumed: 0,
    target_calories: 2500,
    target_protein: 160,
    target_carbs: 280,
    target_fats: 70,
  });

  const [calcBodyweight, setCalcBodyweight] = useState(
    currentUser?.bodyweight || 75
  );
  const [calcGoal, setCalcGoal] = useState(
    currentUser?.training_goal || "hipertrofia"
  );
  const [calcActivity, setCalcActivity] = useState("moderado");
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [quickLogForm, setQuickLogForm] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
  });

  // 2. PLAN DE COMIDAS & PDF
  const [plan, setPlan] = useState({
    title: "Plan Nutricional",
    notes: "",
    meals_json: "[]",
    pdf_filename: null,
    pdf_url: null,
  });

  const [mealsList, setMealsList] = useState([]);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [editingMealIndex, setEditingMealIndex] = useState(null);
  const [mealForm, setMealForm] = useState({
    meal_number: 1,
    name: "Comida 1",
    time: "08:00",
    description: "",
    protein_g: "",
    carbs_g: "",
    fats_g: "",
    calories: "",
  });

  // CARGAR DATOS
  const loadData = async () => {
    try {
      setLoading(true);
      const [todayData, planData] = await Promise.all([
        getTodayNutrition(getLocalDateString()).catch(() => null),
        getNutritionPlan().catch(() => null),
      ]);

      if (todayData) {
        setTodayLog(todayData);
      }
      if (planData) {
        setPlan(planData);
        try {
          const parsed = planData.meals_json ? JSON.parse(planData.meals_json) : [];
          setMealsList(Array.isArray(parsed) ? parsed : []);
        } catch {
          setMealsList([]);
        }
      }
    } catch (err) {
      console.error("Error al cargar nutrición:", err);
      showToast("Error al cargar datos de nutrición", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // CALCULAR MACROS
  const handleCalculateMacros = async () => {
    try {
      const res = await calculateMacros({
        bodyweight: parseFloat(calcBodyweight),
        goal: calcGoal,
        activity_level: calcActivity,
      });

      // Actualizar metas en el log del día
      const updated = await updateTodayNutrition({
        target_calories: res.calories,
        target_protein: res.protein_g,
        target_carbs: res.carbs_g,
        target_fats: res.fats_g,
      });

      setTodayLog(updated);
      showToast(
        `Objetivos calculados: ${res.calories} kcal (${res.protein_g}g P / ${res.carbs_g}g C / ${res.fats_g}g G)`,
        "success"
      );
    } catch (err) {
      console.error("Error calculando macros:", err);
      showToast("Error al calcular macros", "error");
    }
  };

  // SUMAR INGESTA RÁPIDA DE MACROS
  const handleAddQuickLog = async (e) => {
    e.preventDefault();
    try {
      const addCal = parseFloat(quickLogForm.calories) || 0;
      const addProt = parseFloat(quickLogForm.protein) || 0;
      const addCarb = parseFloat(quickLogForm.carbs) || 0;
      const addFat = parseFloat(quickLogForm.fats) || 0;

      const newLog = await updateTodayNutrition({
        calories_consumed: (todayLog.calories_consumed || 0) + addCal,
        protein_consumed: (todayLog.protein_consumed || 0) + addProt,
        carbs_consumed: (todayLog.carbs_consumed || 0) + addCarb,
        fats_consumed: (todayLog.fats_consumed || 0) + addFat,
      });

      setTodayLog(newLog);
      setQuickLogForm({ calories: "", protein: "", carbs: "", fats: "" });
      setIsQuickLogOpen(false);
      showToast("Consumo de macros registrado", "success");
    } catch (err) {
      console.error("Error registrando consumo:", err);
      showToast("Error al registrar macros", "error");
    }
  };

  // SUBIR PDF
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      showToast("El archivo debe ser un PDF", "error");
      return;
    }

    try {
      setIsUploadingPdf(true);
      const updatedPlan = await uploadDietPdf(file);
      setPlan(updatedPlan);
      showToast("Plan en PDF subido correctamente", "success");
    } catch (err) {
      console.error("Error subiendo PDF:", err);
      showToast("Error al subir archivo PDF", "error");
    } finally {
      setIsUploadingPdf(false);
    }
  };

  // GUARDAR / EDITAR COMIDA
  const handleSaveMeal = async (e) => {
    e.preventDefault();
    try {
      let nextList = [...mealsList];
      const newMeal = {
        meal_number: parseInt(mealForm.meal_number, 10) || nextList.length + 1,
        name: mealForm.name.trim() || `Comida ${nextList.length + 1}`,
        time: mealForm.time || "12:00",
        description: mealForm.description.trim(),
        protein_g: mealForm.protein_g ? parseFloat(mealForm.protein_g) : null,
        carbs_g: mealForm.carbs_g ? parseFloat(mealForm.carbs_g) : null,
        fats_g: mealForm.fats_g ? parseFloat(mealForm.fats_g) : null,
        calories: mealForm.calories ? parseFloat(mealForm.calories) : null,
      };

      if (editingMealIndex !== null) {
        nextList[editingMealIndex] = newMeal;
      } else {
        nextList.push(newMeal);
      }

      // Ordenar por meal_number
      nextList.sort((a, b) => a.meal_number - b.meal_number);

      const updated = await updateNutritionPlan({
        meals_json: JSON.stringify(nextList),
      });

      setPlan(updated);
      setMealsList(nextList);
      setIsMealModalOpen(false);
      setEditingMealIndex(null);
      setMealForm({
        meal_number: 1,
        name: "",
        time: "08:00",
        description: "",
        protein_g: "",
        carbs_g: "",
        fats_g: "",
        calories: "",
      });
      showToast("Comida guardada en el plan", "success");
    } catch (err) {
      console.error("Error guardando comida:", err);
      showToast("Error al guardar comida", "error");
    }
  };

  // ELIMINAR COMIDA
  const handleDeleteMeal = async (index) => {
    if (!confirm("¿Eliminar esta comida del plan?")) return;
    try {
      const nextList = mealsList.filter((_, i) => i !== index);
      const updated = await updateNutritionPlan({
        meals_json: JSON.stringify(nextList),
      });
      setPlan(updated);
      setMealsList(nextList);
      showToast("Comida eliminada", "info");
    } catch (err) {
      console.error("Error eliminando comida:", err);
      showToast("Error al eliminar comida", "error");
    }
  };

  // CÁLCULOS DE PORCENTAJES DE CUMPLIMIENTO
  const calsPercent = Math.min(
    100,
    Math.round(((todayLog.calories_consumed || 0) / (todayLog.target_calories || 1)) * 100)
  );
  const protPercent = Math.min(
    100,
    Math.round(((todayLog.protein_consumed || 0) / (todayLog.target_protein || 1)) * 100)
  );
  const carbsPercent = Math.min(
    100,
    Math.round(((todayLog.carbs_consumed || 0) / (todayLog.target_carbs || 1)) * 100)
  );
  const fatsPercent = Math.min(
    100,
    Math.round(((todayLog.fats_consumed || 0) / (todayLog.target_fats || 1)) * 100)
  );

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* CABECERA OLED */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2C2C2E] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white shadow-lg shadow-[#FF5722]/20">
            <Utensils size={18} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Módulo Nutrición
            </h1>
            <p className="text-xs text-[#8E8E93]">
              Calculadora de macros, seguimiento calórico y plan estructurado
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 rounded-xl border border-[#2C2C2E] bg-[#121212] px-3 py-2 text-xs font-semibold text-[#8E8E93] hover:text-white transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* SELECTOR DE MODO OLED: [ Modo Macros | Plan de Comidas ] */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#121212] border border-[#2C2C2E]">
        <button
          type="button"
          onClick={() => setActiveMode("macros")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition active:scale-95 ${
            activeMode === "macros"
              ? "bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white shadow-md shadow-[#FF5722]/25"
              : "text-[#8E8E93] hover:text-white hover:bg-white/5"
          }`}
        >
          <Calculator size={15} />
          <span>Modo Macros</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode("plan")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition active:scale-95 ${
            activeMode === "plan"
              ? "bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white shadow-md shadow-[#FF5722]/25"
              : "text-[#8E8E93] hover:text-white hover:bg-white/5"
          }`}
        >
          <FileText size={15} />
          <span>Plan de Comidas</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 1. MODO MACROS */}
      {/* ==================================================================== */}
      {activeMode === "macros" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* BARRA DE PROGRESO DE CUMPLIMIENTO DIARIO OLED */}
          <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF5722]">
                  Cumplimiento de Hoy
                </span>
                <h3 className="text-lg font-bold text-white">
                  {Math.round(todayLog.calories_consumed || 0)} / {Math.round(todayLog.target_calories || 0)} kcal
                </h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF5722] to-[#7C4DFF]">
                  {calsPercent}%
                </span>
              </div>
            </div>

            {/* Barra General de Calorías */}
            <div className="h-3 w-full bg-[#1C1C1E] rounded-full overflow-hidden p-0.5 border border-[#2C2C2E]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FF5722] via-[#FF7043] to-[#7C4DFF] transition-all duration-500 ease-out"
                style={{ width: `${calsPercent}%` }}
              />
            </div>

            {/* Barras de Desglose de Macronutrientes */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              {/* Proteína */}
              <div className="rounded-2xl bg-[#1C1C1E] p-3 border border-[#2C2C2E] space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-[#FF5722]">Proteínas</span>
                  <span className="text-white">{protPercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#121212] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#FF5722] transition-all duration-300"
                    style={{ width: `${protPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#8E8E93]">
                  {Math.round(todayLog.protein_consumed || 0)}g / {Math.round(todayLog.target_protein || 0)}g
                </p>
              </div>

              {/* Carbohidratos */}
              <div className="rounded-2xl bg-[#1C1C1E] p-3 border border-[#2C2C2E] space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-amber-400">Carbos</span>
                  <span className="text-white">{carbsPercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#121212] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${carbsPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#8E8E93]">
                  {Math.round(todayLog.carbs_consumed || 0)}g / {Math.round(todayLog.target_carbs || 0)}g
                </p>
              </div>

              {/* Grasas */}
              <div className="rounded-2xl bg-[#1C1C1E] p-3 border border-[#2C2C2E] space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-[#7C4DFF]">Grasas</span>
                  <span className="text-white">{fatsPercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#121212] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#7C4DFF] transition-all duration-300"
                    style={{ width: `${fatsPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#8E8E93]">
                  {Math.round(todayLog.fats_consumed || 0)}g / {Math.round(todayLog.target_fats || 0)}g
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsQuickLogOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] border border-[#FF5722]/30 py-2.5 text-xs font-bold text-white hover:bg-[#FF5722]/10 transition active:scale-98"
              >
                <Plus size={15} className="text-[#FF5722]" />
                <span>Registrar Comida / Sumar Macros</span>
              </button>
            </div>
          </div>

          {/* CALCULADORA DE MACROS BASADA EN PESO CORPORAL */}
          <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF5722]/20 text-[#FF5722]">
                <Calculator size={16} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Calculador de Macros</h3>
                <p className="text-xs text-[#8E8E93]">
                  Ajuste personalizado según peso corporal y objetivo de entrenamiento
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#8E8E93] mb-1">
                  Peso Corporal (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={calcBodyweight}
                  onChange={(e) => setCalcBodyweight(e.target.value)}
                  className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3.5 py-2.5 text-xs font-bold text-white focus:border-[#FF5722] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8E8E93] mb-1">
                  Objetivo
                </label>
                <select
                  value={calcGoal}
                  onChange={(e) => setCalcGoal(e.target.value)}
                  className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3.5 py-2.5 text-xs font-semibold text-white focus:border-[#FF5722] focus:outline-none"
                >
                  <option value="hipertrofia">💪 Hipertrofia (Masa Magra)</option>
                  <option value="definicion">🔥 Definición (Déficit)</option>
                  <option value="mantenimiento">⚖️ Mantenimiento</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8E8E93] mb-1">
                  Actividad Física
                </label>
                <select
                  value={calcActivity}
                  onChange={(e) => setCalcActivity(e.target.value)}
                  className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3.5 py-2.5 text-xs font-semibold text-white focus:border-[#FF5722] focus:outline-none"
                >
                  <option value="moderado">Pesas 3-4 días (Moderado)</option>
                  <option value="alto">Heavy Duty Alta Intensidad</option>
                  <option value="ligero">Ligero / Sedentario</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCalculateMacros}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] py-3 text-xs font-bold text-white shadow-lg shadow-[#FF5722]/20 hover:opacity-95 transition active:scale-98"
            >
              <Sparkles size={16} />
              <span>Calcular & Guardar Metas Diarias</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. PLAN DE COMIDAS & SUBIR PLAN DE NUTRICIONISTA (PDF) */}
      {/* ==================================================================== */}
      {activeMode === "plan" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* CAJA PARA CARGAR PDF DE DIETA OLED */}
          <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C4DFF]">
                  Plan Oficial del Profesional
                </span>
                <h3 className="text-base font-bold text-white">Subir Plan de Nutricionista (PDF)</h3>
              </div>
              {plan.pdf_url && (
                <a
                  href={plan.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition"
                >
                  <Download size={14} />
                  <span>Ver PDF ({plan.pdf_filename || "Dieta"})</span>
                </a>
              )}
            </div>

            <div className="rounded-2xl border border-dashed border-[#2C2C2E] bg-[#1C1C1E]/50 p-5 text-center space-y-2">
              <Upload size={28} className="mx-auto text-[#7C4DFF]" />
              <p className="text-xs font-semibold text-white">
                {plan.pdf_filename ? `Archivo actual: ${plan.pdf_filename}` : "Selecciona el archivo PDF de tu dieta"}
              </p>
              <p className="text-[11px] text-[#8E8E93]">
                El plan queda almacenado en tu cuenta para consulta inmediata
              </p>

              <label className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#FF5722] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#7C4DFF]/20 cursor-pointer hover:opacity-95 transition active:scale-95">
                {isUploadingPdf ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Upload size={15} />
                )}
                <span>{isUploadingPdf ? "Subiendo..." : "Cargar Archivo PDF"}</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfUpload}
                  disabled={isUploadingPdf}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* LISTADO DE COMIDAS ESTRUCTURADAS POR ORDEN DE INGESTA */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Comidas Diarias Estructuradas</h3>
                <p className="text-xs text-[#8E8E93]">
                  Organizadas por orden de ingesta y horario
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingMealIndex(null);
                  setMealForm({
                    meal_number: mealsList.length + 1,
                    name: `Comida ${mealsList.length + 1}`,
                    time: "08:00",
                    description: "",
                    protein_g: "",
                    carbs_g: "",
                    fats_g: "",
                    calories: "",
                  });
                  setIsMealModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-[#FF5722]/20 hover:opacity-95 transition active:scale-95"
              >
                <Plus size={15} />
                <span>Agregar Comida</span>
              </button>
            </div>

            {mealsList.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#2C2C2E] bg-[#121212]/50 p-8 text-center space-y-2">
                <UtensilsCrossed size={32} className="mx-auto text-[#8E8E93]" />
                <p className="text-sm font-semibold text-white">No hay comidas estructuradas</p>
                <p className="text-xs text-[#8E8E93]">
                  Carga tus ingestas del día para tener la pauta a mano en cada momento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {mealsList.map((meal, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-[#2C2C2E] bg-[#121212] p-4 space-y-2 shadow-md hover:border-white/20 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white text-xs font-bold">
                            {meal.meal_number || idx + 1}
                          </span>
                          <h4 className="font-bold text-white text-sm">{meal.name}</h4>
                          <span className="text-[11px] font-semibold text-[#8E8E93] bg-[#1C1C1E] px-2 py-0.5 rounded-full border border-[#2C2C2E]">
                            🕒 {meal.time || "Sin horario"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMealIndex(idx);
                            setMealForm({
                              meal_number: meal.meal_number || idx + 1,
                              name: meal.name,
                              time: meal.time,
                              description: meal.description,
                              protein_g: meal.protein_g ?? "",
                              carbs_g: meal.carbs_g ?? "",
                              fats_g: meal.fats_g ?? "",
                              calories: meal.calories ?? "",
                            });
                            setIsMealModalOpen(true);
                          }}
                          className="p-1.5 text-[#8E8E93] hover:text-white rounded-lg hover:bg-white/5 transition"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMeal(idx)}
                          className="p-1.5 text-[#8E8E93] hover:text-red-400 rounded-lg hover:bg-red-500/10 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-[#E5E5EA] whitespace-pre-line pl-8 leading-relaxed">
                      {meal.description || "Sin descripción de alimentos."}
                    </p>

                    {(meal.calories || meal.protein_g || meal.carbs_g || meal.fats_g) && (
                      <div className="flex flex-wrap gap-2 pl-8 pt-1 text-[11px] font-mono">
                        {meal.calories && (
                          <span className="text-white font-bold bg-[#1C1C1E] px-2 py-0.5 rounded border border-[#2C2C2E]">
                            {meal.calories} kcal
                          </span>
                        )}
                        {meal.protein_g && (
                          <span className="text-[#FF5722] font-semibold">
                            {meal.protein_g}g Prot
                          </span>
                        )}
                        {meal.carbs_g && (
                          <span className="text-amber-400 font-semibold">
                            {meal.carbs_g}g Carb
                          </span>
                        )}
                        {meal.fats_g && (
                          <span className="text-[#7C4DFF] font-semibold">
                            {meal.fats_g}g Gras
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL REGISTRAR CONSUMO RÁPIDO */}
      {/* ==================================================================== */}
      {isQuickLogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-[#2C2C2E] bg-[#121212] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Sumar Ingesta de Hoy</h3>
              <button
                type="button"
                onClick={() => setIsQuickLogOpen(false)}
                className="text-[#8E8E93] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddQuickLog} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#8E8E93] font-semibold mb-1">Calorías (kcal)</label>
                <input
                  type="number"
                  value={quickLogForm.calories}
                  onChange={(e) => setQuickLogForm({ ...quickLogForm, calories: e.target.value })}
                  placeholder="Ej: 500"
                  className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3.5 py-2.5 text-white focus:border-[#FF5722] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">Proteínas (g)</label>
                  <input
                    type="number"
                    value={quickLogForm.protein}
                    onChange={(e) => setQuickLogForm({ ...quickLogForm, protein: e.target.value })}
                    placeholder="P"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-2.5 py-2 text-white focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">Carbos (g)</label>
                  <input
                    type="number"
                    value={quickLogForm.carbs}
                    onChange={(e) => setQuickLogForm({ ...quickLogForm, carbs: e.target.value })}
                    placeholder="C"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-2.5 py-2 text-white focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">Grasas (g)</label>
                  <input
                    type="number"
                    value={quickLogForm.fats}
                    onChange={(e) => setQuickLogForm({ ...quickLogForm, fats: e.target.value })}
                    placeholder="G"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-2.5 py-2 text-white focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsQuickLogOpen(false)}
                  className="rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-4 py-2 font-semibold text-[#8E8E93] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] px-5 py-2 font-bold text-white shadow-md shadow-[#FF5722]/20"
                >
                  Sumar Ingesta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL CREAR / EDITAR COMIDA ESTRUCTURADA */}
      {/* ==================================================================== */}
      {isMealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#2C2C2E] bg-[#121212] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingMealIndex !== null ? "Editar Comida" : "Nueva Comida Estructurada"}
              </h3>
              <button
                type="button"
                onClick={() => setIsMealModalOpen(false)}
                className="text-[#8E8E93] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMeal} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">Orden</label>
                  <input
                    type="number"
                    value={mealForm.meal_number}
                    onChange={(e) => setMealForm({ ...mealForm, meal_number: e.target.value })}
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3 py-2 text-white focus:border-[#7C4DFF] focus:outline-none"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[#8E8E93] font-semibold mb-1">Nombre</label>
                  <input
                    type="text"
                    value={mealForm.name}
                    onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
                    placeholder="Ej: Desayuno, Almuerzo"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3 py-2 text-white focus:border-[#7C4DFF] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#8E8E93] font-semibold mb-1">Horario estimado</label>
                <input
                  type="time"
                  value={mealForm.time}
                  onChange={(e) => setMealForm({ ...mealForm, time: e.target.value })}
                  className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3.5 py-2 text-white focus:border-[#7C4DFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#8E8E93] font-semibold mb-1">
                  Alimentos / Detalle por porción
                </label>
                <textarea
                  value={mealForm.description}
                  onChange={(e) => setMealForm({ ...mealForm, description: e.target.value })}
                  placeholder="Ej: 200g pechuga de pollo, 150g arroz blanco, 1 taza ensalada verde con 1 cda aceite de oliva"
                  rows={3}
                  className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3 py-2 text-white focus:border-[#7C4DFF] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">Kcal</label>
                  <input
                    type="number"
                    value={mealForm.calories}
                    onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })}
                    placeholder="kcal"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-2 py-1.5 text-white focus:border-[#7C4DFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">P (g)</label>
                  <input
                    type="number"
                    value={mealForm.protein_g}
                    onChange={(e) => setMealForm({ ...mealForm, protein_g: e.target.value })}
                    placeholder="g"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-2 py-1.5 text-white focus:border-[#7C4DFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">C (g)</label>
                  <input
                    type="number"
                    value={mealForm.carbs_g}
                    onChange={(e) => setMealForm({ ...mealForm, carbs_g: e.target.value })}
                    placeholder="g"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-2 py-1.5 text-white focus:border-[#7C4DFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">G (g)</label>
                  <input
                    type="number"
                    value={mealForm.fats_g}
                    onChange={(e) => setMealForm({ ...mealForm, fats_g: e.target.value })}
                    placeholder="g"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-2 py-1.5 text-white focus:border-[#7C4DFF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsMealModalOpen(false)}
                  className="rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-4 py-2 font-semibold text-[#8E8E93] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] px-5 py-2 font-bold text-white shadow-md shadow-[#FF5722]/20"
                >
                  Guardar Comida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
