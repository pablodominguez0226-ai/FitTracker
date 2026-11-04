import React, { useEffect, useMemo, useState } from "react";
import {
  Apple,
  Calculator,
  ChefHat,
  Coffee,
  Droplet,
  FileText,
  Loader2,
  Moon,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Utensils,
  UtensilsCrossed,
  X,
  Download,
} from "lucide-react";
import {
  calculateMacros,
  getNutritionPlan,
  getTodayNutrition,
  updateTodayNutrition,
  uploadDietPdf,
  searchFoods,
  getCustomRecipes,
  createCustomRecipe,
  deleteCustomRecipe,
  logFood,
  getFoodLogs,
  deleteFoodLog,
} from "../api/client";
import { showToast } from "../components/Toast";
import { getLocalDateString } from "../utils/dateUtils";
import FoodLoggerModal from "../components/FoodLoggerModal";
import CustomRecipeModal from "../components/CustomRecipeModal";

const DEFAULT_DAILY_LIMIT = 1500;
const TOTAL_WATER_GLASSES = 8;

const SIDE_DISH_OPTIONS = [
  { name: "Puré de papa con agua", cals100: 75, prot100: 1.5, carbs100: 17, fat100: 0.2, defaultGrams: 200 },
  { name: "Puré de papa con leche y manteca", cals100: 125, prot100: 2, carbs100: 18, fat100: 5, defaultGrams: 200 },
  { name: "Puré de calabaza", cals100: 45, prot100: 1.2, carbs100: 9.5, fat100: 0.3, defaultGrams: 200 },
  { name: "Ensalada mixta (lechuga, tomate, cebolla)", cals100: 25, prot100: 1.2, carbs100: 4.5, fat100: 0.2, defaultGrams: 150 },
  { name: "Arroz blanco cocido", cals100: 130, prot100: 2.7, carbs100: 28, fat100: 0.3, defaultGrams: 150 },
];

const MEAL_SLOTS = [
  {
    id: "desayuno",
    title: "Desayuno",
    icon: Coffee,
    iconBg: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    matchTypes: ["desayuno", "breakfast"],
  },
  {
    id: "almuerzo",
    title: "Almuerzo",
    icon: Utensils,
    iconBg: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    matchTypes: ["almuerzo", "lunch", "comida"],
  },
  {
    id: "cena",
    title: "Cena",
    icon: Moon,
    iconBg: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    matchTypes: ["cena", "dinner"],
  },
  {
    id: "snacks",
    title: "Snacks",
    icon: Apple,
    iconBg: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    matchTypes: ["snack", "snacks", "merienda", "colacion", "colación"],
  },
];

/**
 * 1. Card Superior de Calorías
 */
function CaloriesSummaryCard({
  consumedKcal = 0,
  dailyLimitKcal = DEFAULT_DAILY_LIMIT,
  proteinConsumed = 0,
  carbsConsumed = 0,
  fatsConsumed = 0,
  onEditLimit,
}) {
  const safeConsumed = Math.max(0, Math.round(consumedKcal));
  const safeLimit = Math.max(1, Math.round(dailyLimitKcal || DEFAULT_DAILY_LIMIT));
  const remainingKcal = Math.max(0, safeLimit - safeConsumed);
  const progressRatio = Math.min(1, safeConsumed / safeLimit);

  const size = 104;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <section className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-5">
        {/* Progress ring circular central con 0 Kcal centrado en tipografía bold */}
        <div className="relative w-[104px] h-[104px] flex items-center justify-center flex-shrink-0">
          <svg
            className="w-[104px] h-[104px] -rotate-90"
            viewBox={`0 0 ${size} ${size}`}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-[#F1F5F9] dark:text-slate-800"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#DC2626"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
            <span className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
              {safeConsumed} Kcal
            </span>
          </div>
        </div>

        {/* Panel lateral derecho */}
        <div className="flex-1 min-w-0 space-y-2">
          <button
            type="button"
            onClick={onEditLimit}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition cursor-pointer"
          >
            <span>Límite diario:</span>
            <span className="text-red-600 font-bold">{safeLimit} Kcal</span>
          </button>

          <div>
            <span className="text-xs font-medium text-slate-400 block">
              Restante hoy:
            </span>
            <p className="text-xl font-black text-slate-900 tracking-tight leading-snug">
              Restante hoy:{" "}
              <span className="text-red-600">{remainingKcal} Kcal</span>
            </p>
          </div>

          <div className="flex items-center gap-3 pt-0.5 text-[11px] font-semibold text-slate-500">
            <span>P: {Math.round(proteinConsumed)}g</span>
            <span>•</span>
            <span>C: {Math.round(carbsConsumed)}g</span>
            <span>•</span>
            <span>G: {Math.round(fatsConsumed)}g</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * 2. Widget de Hidratación
 */
function HydrationWidget({ glassesCount = 0, onToggleGlass }) {
  return (
    <section className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
            <Droplet size={18} strokeWidth={2.25} />
          </div>
          <h2 className="text-sm font-bold text-slate-900 truncate">
            Registro de agua • 250 ml/vaso
          </h2>
        </div>

        <span className="text-xs font-extrabold text-red-600 flex-shrink-0">
          {glassesCount}/{TOTAL_WATER_GLASSES} Vasos
        </span>
      </div>

      {/* Fila de 8 cápsulas redondeadas verticales */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        {Array.from({ length: TOTAL_WATER_GLASSES }).map((_, index) => {
          const isFilled = index < glassesCount;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onToggleGlass(index)}
              aria-label={`Vaso ${index + 1}`}
              className={`w-7 h-10 rounded-2xl transition-all duration-200 active:scale-90 flex items-center justify-center cursor-pointer ${
                isFilled
                  ? "bg-red-100 border border-red-200 text-red-600 shadow-xs"
                  : "bg-slate-100 border border-transparent text-slate-300 hover:bg-slate-200/70"
              }`}
            >
              <Droplet
                size={13}
                strokeWidth={2.25}
                className={isFilled ? "fill-red-500 text-red-500" : "text-slate-300"}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * 3. Lista de Comidas (Desayuno, Almuerzo, Cena, Snacks)
 */
function MealCardsList({ mealSlots, logsByMeal, onAddMeal, onDeleteLog }) {
  return (
    <section className="space-y-3">
      {mealSlots.map((slot) => {
        const Icon = slot.icon;
        const slotLogs = logsByMeal[slot.id] || [];
        const totalSlotKcal = Math.round(
          slotLogs.reduce((acc, item) => acc + (Number(item.calories) || 0), 0)
        );

        const statusText =
          slotLogs.length === 0
            ? "Sin registrar"
            : `${totalSlotKcal} Kcal • ${
                slotLogs.length === 1
                  ? "1 alimento"
                  : `${slotLogs.length} alimentos`
              }`;

        return (
          <div key={slot.id} className="space-y-1.5">
            <div
              onClick={() => onAddMeal(slot.id)}
              className="rounded-2xl bg-white border border-slate-100 p-4 flex items-center justify-between shadow-xs hover:border-slate-200 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${slot.iconBg}`}
                >
                  <Icon size={20} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {slot.title}
                  </h3>
                  <p
                    className={`text-xs mt-0.5 truncate ${
                      slotLogs.length > 0
                        ? "text-red-600 font-semibold"
                        : "text-slate-400 font-normal"
                    }`}
                  >
                    {statusText}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddMeal(slot.id);
                }}
                aria-label={`Agregar a ${slot.title}`}
                className="w-9 h-9 rounded-full bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-100 flex items-center justify-center transition active:scale-90 cursor-pointer flex-shrink-0"
              >
                <Plus size={18} strokeWidth={2.25} />
              </button>
            </div>

            {/* Si hay alimentos registrados en esta comida, mostrarlos de forma compacta */}
            {slotLogs.length > 0 && (
              <div className="pl-4 pr-1 space-y-1">
                {slotLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl bg-white/80 border border-slate-100 px-3 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 truncate">
                      <span className="font-semibold text-slate-800">
                        {log.food_name}
                      </span>
                      {log.grams_or_units && (
                        <span className="text-slate-400 ml-1.5">
                          ({log.grams_or_units})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-red-600">
                        {Math.round(log.calories || 0)} Kcal
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteLog(log.id)}
                        className="text-slate-400 hover:text-red-500 p-1 transition cursor-pointer"
                        title="Eliminar registro"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

export default function Nutrition({ currentUser }) {
  const todayStr = useMemo(() => getLocalDateString(), []);

  const [todayLog, setTodayLog] = useState({
    calories_consumed: 0,
    protein_consumed: 0,
    carbs_consumed: 0,
    fats_consumed: 0,
    target_calories: DEFAULT_DAILY_LIMIT,
    target_protein: 140,
    target_carbs: 160,
    target_fats: 50,
  });

  // Hidratación persistida por fecha
  const [waterGlasses, setWaterGlasses] = useState(() => {
    try {
      const saved = localStorage.getItem(`fittracker_water_${todayStr}`);
      const parsed = parseInt(saved, 10);
      return !isNaN(parsed) && parsed >= 0 && parsed <= TOTAL_WATER_GLASSES
        ? parsed
        : 0;
    } catch {
      return 0;
    }
  });

  const [foodsList, setFoodsList] = useState([]);
  const [customRecipes, setCustomRecipes] = useState([]);
  const [dailyFoodLogs, setDailyFoodLogs] = useState([]);

  // Selector de alimento para una comida (Desayuno, Almuerzo, Cena, Snacks)
  const [activeMealSlot, setActiveMealSlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickCalories, setQuickCalories] = useState("");
  const [quickFoodName, setQuickFoodName] = useState("");

  // Modales detallados de alimento y receta
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedFoodForLog, setSelectedFoodForLog] = useState(null);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);

  // Modal de ajuste de límite diario / calculadora
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [limitInput, setLimitInput] = useState(String(DEFAULT_DAILY_LIMIT));
  const [calcBodyweight, setCalcBodyweight] = useState(
    currentUser?.bodyweight || 75
  );
  const [calcGoal, setCalcGoal] = useState(
    currentUser?.training_goal || "definicion"
  );
  const [calcActivity, setCalcActivity] = useState("moderado");

  // Plan PDF opcional
  const [plan, setPlan] = useState({
    pdf_filename: null,
    pdf_url: null,
  });
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  const loadData = async () => {
    try {
      const [todayData, planData, foodsData, recipesData, logsData] =
        await Promise.all([
          getTodayNutrition(todayStr).catch(() => null),
          getNutritionPlan().catch(() => null),
          searchFoods().catch(() => []),
          getCustomRecipes().catch(() => []),
          getFoodLogs(todayStr).catch(() => []),
        ]);

      if (todayData) {
        const loadedTarget =
          Number(todayData.target_calories) > 0
            ? Number(todayData.target_calories)
            : DEFAULT_DAILY_LIMIT;
        setTodayLog({
          calories_consumed: Number(todayData.calories_consumed) || 0,
          protein_consumed: Number(todayData.protein_consumed) || 0,
          carbs_consumed: Number(todayData.carbs_consumed) || 0,
          fats_consumed: Number(todayData.fats_consumed) || 0,
          target_calories: loadedTarget,
          target_protein: Number(todayData.target_protein) || 140,
          target_carbs: Number(todayData.target_carbs) || 160,
          target_fats: Number(todayData.target_fats) || 50,
        });
        setLimitInput(String(Math.round(loadedTarget)));
      }

      if (planData) {
        setPlan(planData);
      }
      if (Array.isArray(foodsData)) {
        setFoodsList(foodsData);
      }
      if (Array.isArray(recipesData)) {
        setCustomRecipes(recipesData);
      }
      if (Array.isArray(logsData)) {
        setDailyFoodLogs(logsData);
      }
    } catch (err) {
      console.warn("Error cargando datos de nutrición:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleWaterGlass = (index) => {
    setWaterGlasses((prev) => {
      const next = prev === index + 1 ? index : index + 1;
      try {
        localStorage.setItem(`fittracker_water_${todayStr}`, String(next));
      } catch {}
      return next;
    });
  };

  // Agrupar registros de comida del día por slot (Desayuno, Almuerzo, Cena, Snacks)
  const logsByMeal = useMemo(() => {
    const grouped = {
      desayuno: [],
      almuerzo: [],
      cena: [],
      snacks: [],
    };

    dailyFoodLogs.forEach((log) => {
      const rawType = String(log.meal_type || "almuerzo")
        .trim()
        .toLowerCase();
      const matchedSlot = MEAL_SLOTS.find((s) =>
        s.matchTypes.includes(rawType)
      );
      const targetKey = matchedSlot ? matchedSlot.id : "snacks";
      grouped[targetKey].push(log);
    });

    return grouped;
  }, [dailyFoodLogs]);

  // Catálogo combinado para el buscador del modal de comidas
  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const customFormatted = customRecipes.map((r) => ({
      ...r,
      is_custom: true,
      category: "mis_comidas",
      serving_unit: `porción (~${r.total_weight_g}g)`,
      serving_weight_g: r.total_weight_g,
      calories_100g:
        r.total_weight_g > 0
          ? (r.calculated_calories / r.total_weight_g) * 100
          : r.calculated_calories,
      protein_100g:
        r.total_weight_g > 0
          ? (r.calculated_protein / r.total_weight_g) * 100
          : r.calculated_protein,
      carbs_100g:
        r.total_weight_g > 0
          ? (r.calculated_carbs / r.total_weight_g) * 100
          : r.calculated_carbs,
      fat_100g:
        r.total_weight_g > 0
          ? (r.calculated_fat / r.total_weight_g) * 100
          : r.calculated_fat,
    }));

    const all = [...customFormatted, ...foodsList];
    if (!q) return all.slice(0, 20);
    return all.filter((item) => item.name.toLowerCase().includes(q));
  }, [foodsList, customRecipes, searchQuery]);

  // Confirmar registro detallado desde FoodLoggerModal
  const handleConfirmLogFood = async (payload) => {
    try {
      setIsSubmittingLog(true);
      const finalPayload = {
        ...payload,
        meal_type: activeMealSlot || payload.meal_type || "almuerzo",
      };
      const newEntry = await logFood(finalPayload);

      setDailyFoodLogs((prev) => [newEntry, ...prev]);
      setTodayLog((prev) => ({
        ...prev,
        calories_consumed:
          Math.round(((prev.calories_consumed || 0) + finalPayload.calories) * 10) / 10,
        protein_consumed:
          Math.round(((prev.protein_consumed || 0) + finalPayload.protein) * 10) / 10,
        carbs_consumed:
          Math.round(((prev.carbs_consumed || 0) + finalPayload.carbs) * 10) / 10,
        fats_consumed:
          Math.round(((prev.fats_consumed || 0) + finalPayload.fat) * 10) / 10,
      }));

      setIsLogModalOpen(false);
      setSelectedFoodForLog(null);
      setActiveMealSlot(null);
      showToast(`¡${finalPayload.food_name} registrado!`, "success");
    } catch (err) {
      console.error("Error registrando plato:", err);
      showToast("Error al registrar comida", "error");
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // Registro rápido de calorías en la comida seleccionada
  const handleQuickMealSubmit = async (e) => {
    e.preventDefault();
    const kcal = parseFloat(quickCalories);
    if (!kcal || kcal <= 0) return;
    const mealSlotObj = MEAL_SLOTS.find((s) => s.id === activeMealSlot);
    const foodTitle =
      quickFoodName.trim() || `${mealSlotObj?.title || "Comida"} rápida`;

    try {
      setIsSubmittingLog(true);
      const payload = {
        food_name: foodTitle,
        meal_type: activeMealSlot || "almuerzo",
        grams_or_units: "1 porción",
        calories: kcal,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
      const newEntry = await logFood(payload).catch(() => ({
        id: `local_${Date.now()}`,
        ...payload,
      }));

      setDailyFoodLogs((prev) => [newEntry, ...prev]);
      const nextCalories = (todayLog.calories_consumed || 0) + kcal;
      setTodayLog((prev) => ({
        ...prev,
        calories_consumed: nextCalories,
      }));
      await updateTodayNutrition({
        calories_consumed: nextCalories,
      }).catch(() => {});

      setQuickCalories("");
      setQuickFoodName("");
      setActiveMealSlot(null);
      showToast(`${foodTitle} (+${Math.round(kcal)} Kcal) registrado`, "success");
    } catch (err) {
      showToast("Error al registrar comida", "error");
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // Eliminar un alimento registrado
  const handleDeleteFoodLog = async (logId) => {
    try {
      const toDelete = dailyFoodLogs.find((l) => l.id === logId);
      if (!String(logId).startsWith("local_")) {
        await deleteFoodLog(logId);
      }
      setDailyFoodLogs((prev) => prev.filter((l) => l.id !== logId));

      if (toDelete) {
        setTodayLog((prev) => ({
          ...prev,
          calories_consumed: Math.max(
            0,
            Math.round(((prev.calories_consumed || 0) - (toDelete.calories || 0)) * 10) / 10
          ),
          protein_consumed: Math.max(
            0,
            Math.round(((prev.protein_consumed || 0) - (toDelete.protein || 0)) * 10) / 10
          ),
          carbs_consumed: Math.max(
            0,
            Math.round(((prev.carbs_consumed || 0) - (toDelete.carbs || 0)) * 10) / 10
          ),
          fats_consumed: Math.max(
            0,
            Math.round(((prev.fats_consumed || 0) - (toDelete.fat || 0)) * 10) / 10
          ),
        }));
      }
      showToast("Registro eliminado", "info");
    } catch (err) {
      showToast("Error al eliminar registro", "error");
    }
  };

  // Guardar nuevo límite diario de calorías
  const handleSaveLimit = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(limitInput);
    if (!parsed || parsed <= 0) return;
    try {
      setTodayLog((prev) => ({ ...prev, target_calories: parsed }));
      await updateTodayNutrition({ target_calories: parsed }).catch(() => {});
      setIsLimitModalOpen(false);
      showToast(`Límite diario actualizado a ${Math.round(parsed)} Kcal`, "success");
    } catch {
      setIsLimitModalOpen(false);
    }
  };

  // Calcular límite según peso y objetivo
  const handleCalculateMacros = async () => {
    try {
      const res = await calculateMacros({
        bodyweight: parseFloat(calcBodyweight),
        goal: calcGoal,
        activity_level: calcActivity,
      });
      const updated = await updateTodayNutrition({
        target_calories: res.calories,
        target_protein: res.protein_g,
        target_carbs: res.carbs_g,
        target_fats: res.fats_g,
      });
      setTodayLog(updated);
      setLimitInput(String(Math.round(res.calories)));
      setIsLimitModalOpen(false);
      showToast(`Meta actualizada: ${res.calories} Kcal`, "success");
    } catch {
      showToast("Error al calcular metas", "error");
    }
  };

  const handleSaveCustomRecipe = async (payload) => {
    try {
      setIsSavingRecipe(true);
      const created = await createCustomRecipe(payload);
      setCustomRecipes((prev) => [created, ...prev]);
      setIsRecipeModalOpen(false);
      showToast(`¡Receta "${created.name}" guardada!`, "success");
    } catch {
      showToast("Error al guardar la receta", "error");
    } finally {
      setIsSavingRecipe(false);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPdf(true);
      const updatedPlan = await uploadDietPdf(file);
      setPlan(updatedPlan);
      showToast("Plan PDF subido correctamente", "success");
    } catch {
      showToast("Error al subir PDF", "error");
    } finally {
      setIsUploadingPdf(false);
    }
  };

  return (
    <div className="w-full space-y-5 pb-10 select-none">
      {/* Encabezado limpio de la vista Calorías y Macros */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-black text-2xl tracking-tight text-slate-900">
            Calorías y Macros
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Balance energético, hidratación y comidas de hoy
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsLimitModalOpen(true)}
          className="h-9 px-3.5 rounded-full bg-white border border-slate-100 text-xs font-bold text-slate-700 hover:text-red-600 hover:border-red-100 flex items-center gap-1.5 shadow-xs transition cursor-pointer"
        >
          <Calculator size={14} className="text-red-600" />
          <span>Metas</span>
        </button>
      </header>

      {/* 1. Card Superior de Calorías */}
      <CaloriesSummaryCard
        consumedKcal={todayLog.calories_consumed}
        dailyLimitKcal={todayLog.target_calories || DEFAULT_DAILY_LIMIT}
        proteinConsumed={todayLog.protein_consumed}
        carbsConsumed={todayLog.carbs_consumed}
        fatsConsumed={todayLog.fats_consumed}
        onEditLimit={() => setIsLimitModalOpen(true)}
      />

      {/* 2. Widget de Hidratación */}
      <HydrationWidget
        glassesCount={waterGlasses}
        onToggleGlass={handleToggleWaterGlass}
      />

      {/* 3. Lista de Comidas (Desayuno, Almuerzo, Cena, Snacks) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
            Comidas de hoy
          </h2>
          <button
            type="button"
            onClick={() => setIsRecipeModalOpen(true)}
            className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
          >
            <ChefHat size={14} />
            <span>Crear receta</span>
          </button>
        </div>

        <MealCardsList
          mealSlots={MEAL_SLOTS}
          logsByMeal={logsByMeal}
          onAddMeal={(slotId) => {
            setActiveMealSlot(slotId);
            setSearchQuery("");
            setQuickCalories("");
            setQuickFoodName("");
          }}
          onDeleteLog={handleDeleteFoodLog}
        />
      </div>

      {/* Acceso compacto a Plan PDF si existe o desea cargarse */}
      <div className="rounded-2xl bg-white border border-slate-100 p-4 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-900 truncate">
              Plan Nutricional (PDF)
            </h3>
            <p className="text-[11px] text-slate-400 truncate">
              {plan.pdf_filename || "Sube la pauta de tu nutricionista"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {plan.pdf_url && (
            <a
              href={plan.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3 rounded-full bg-red-50 text-red-600 text-xs font-bold flex items-center gap-1"
            >
              <Download size={13} />
              <span>Ver</span>
            </a>
          )}
          <label className="h-9 px-3 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer transition">
            {isUploadingPdf ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Upload size={13} />
            )}
            <span>PDF</span>
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

      {/* Modal para registrar alimentos en la comida seleccionada */}
      {activeMealSlot && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md md:max-w-xl bg-white rounded-t-[28px] sm:rounded-2xl border border-slate-100 flex flex-col max-h-[85dvh] md:max-h-[85vh] overflow-hidden shadow-xl md:my-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
                  Registrar ingesta
                </span>
                <h3 className="text-base font-extrabold text-slate-900 capitalize">
                  {MEAL_SLOTS.find((s) => s.id === activeMealSlot)?.title ||
                    activeMealSlot}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveMealSlot(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Registro rápido de Kcal */}
              <form
                onSubmit={handleQuickMealSubmit}
                className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5 space-y-2.5"
              >
                <span className="text-xs font-bold text-slate-700 block">
                  Registro rápido de calorías
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={quickFoodName}
                    onChange={(e) => setQuickFoodName(e.target.value)}
                    placeholder="Descripción (opcional)"
                    className="flex-1 h-10 rounded-xl bg-white border border-slate-200 px-3 text-xs font-medium text-slate-900 outline-none focus:border-red-500"
                  />
                  <input
                    type="number"
                    value={quickCalories}
                    onChange={(e) => setQuickCalories(e.target.value)}
                    placeholder="Kcal"
                    className="w-24 h-10 rounded-xl bg-white border border-slate-200 px-3 text-xs font-bold text-slate-900 outline-none focus:border-red-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingLog}
                    className="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </form>

              {/* Buscador en catálogo */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar alimento o receta casera..."
                    className="w-full h-11 rounded-2xl bg-slate-50 border border-slate-200 pl-10 pr-4 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-red-500"
                  />
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                  {filteredCatalog.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      <UtensilsCrossed size={24} className="mx-auto mb-1.5 opacity-60" />
                      No se encontraron alimentos
                    </div>
                  ) : (
                    filteredCatalog.map((item) => {
                      const isCustom = !!item.is_custom;
                      const cals = isCustom
                        ? Math.round(item.calculated_calories || 0)
                        : Math.round(item.calories_100g || 0);
                      return (
                        <div
                          key={isCustom ? `c-${item.id}` : `f-${item.id}`}
                          onClick={() => {
                            setSelectedFoodForLog(item);
                            setIsLogModalOpen(true);
                          }}
                          className="rounded-2xl border border-slate-100 bg-white p-3 flex items-center justify-between gap-3 hover:border-red-200 cursor-pointer transition"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {cals} Kcal •{" "}
                              {isCustom
                                ? `porción ~${item.total_weight_g}g`
                                : "cada 100g"}
                            </p>
                          </div>
                          <span className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                            <Plus size={15} />
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de ajuste de Límite Diario y Calculadora */}
      {isLimitModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md md:max-w-xl bg-white rounded-t-[28px] sm:rounded-2xl border border-slate-100 p-5 space-y-4 shadow-xl md:my-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                Meta Diaria de Calorías
              </h3>
              <button
                type="button"
                onClick={() => setIsLimitModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveLimit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Límite diario manual (Kcal)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    className="flex-1 h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    className="h-11 px-5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </form>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                O calcular según tu peso y objetivo
              </span>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={calcBodyweight}
                  onChange={(e) => setCalcBodyweight(e.target.value)}
                  placeholder="Peso (kg)"
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900"
                />
                <select
                  value={calcGoal}
                  onChange={(e) => setCalcGoal(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-900"
                >
                  <option value="definicion">Definición</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="hipertrofia">Volumen</option>
                </select>
                <select
                  value={calcActivity}
                  onChange={(e) => setCalcActivity(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-900"
                >
                  <option value="ligero">Ligero</option>
                  <option value="moderado">Moderado</option>
                  <option value="alto">Alto</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleCalculateMacros}
                className="w-full h-11 rounded-full bg-slate-100 hover:bg-red-50 text-slate-800 hover:text-red-600 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Calcular automáticamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detallado de porción/cocción */}
      <FoodLoggerModal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setSelectedFoodForLog(null);
        }}
        selectedItem={selectedFoodForLog}
        onConfirmLog={handleConfirmLogFood}
        isSubmitting={isSubmittingLog}
        sideDishOptions={SIDE_DISH_OPTIONS}
      />

      {/* Modal de recetas caseras */}
      <CustomRecipeModal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        foodsList={foodsList}
        onSaveRecipe={handleSaveCustomRecipe}
        isSaving={isSavingRecipe}
      />
    </div>
  );
}
