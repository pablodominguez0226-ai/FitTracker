import React, { useState, useMemo, useEffect } from "react";
import { Utensils, X, Plus, Flame, Loader2, Sparkles, ChefHat } from "lucide-react";

export const COOKING_METHODS = [
  {
    id: "crudo_vapor_hervido",
    label: "Crudo / Al vapor / Hervido (+0 kcal, +0g grasas)",
    shortLabel: "Crudo / Al vapor / Hervido",
    type: "none",
    calorieDelta: 0,
    fatDelta: 0,
  },
  {
    id: "horno_sin_grasa",
    label: "Al horno sin materia grasa (+0 kcal, +0g grasas)",
    shortLabel: "Al horno sin materia grasa",
    type: "none",
    calorieDelta: 0,
    fatDelta: 0,
  },
  {
    id: "plancha_rocio",
    label: "A la plancha con rocío vegetal (+5 kcal, +0.5g grasas)",
    shortLabel: "A la plancha con rocío vegetal",
    type: "plancha",
    calorieDelta: 5,
    fatDelta: 0.5,
  },
  {
    id: "salteado_aceite",
    label: "Salteado / Al horno con aceite (+90 kcal y +10g grasas por cucharada)",
    shortLabel: "Salteado / Al horno con aceite",
    type: "oil_tablespoons",
    caloriesPerTbsp: 90,
    fatPerTbsp: 10,
  },
  {
    id: "frito",
    label: "Frito (+120 kcal y +12g grasas cada 100g)",
    shortLabel: "Frito",
    type: "fried_per_100g",
    caloriesPer100g: 120,
    fatPer100g: 12,
  },
];

const RAW_FOOD_CATEGORIES = ["verduras", "carnes_vaca", "carnes_pollo", "carnes_cerdo"];

export default function FoodLoggerModal({
  isOpen,
  onClose,
  selectedItem,
  onConfirmLog,
  isSubmitting = false,
  sideDishOptions = [],
}) {
  if (!isOpen || !selectedItem) return null;

  const isCustom = !!selectedItem.is_custom;
  const isRawFood = !isCustom && RAW_FOOD_CATEGORIES.includes(selectedItem.category);

  // Estados de cantidad
  const [quantityMode, setQuantityMode] = useState("units"); // 'units' | 'grams'
  const [unitsCount, setUnitsCount] = useState(1);
  const [gramsInput, setGramsInput] = useState(
    isCustom ? (selectedItem.total_weight_g || 40) : (selectedItem.serving_weight_g || 100)
  );

  // Estados de cocción
  const [cookingMethodId, setCookingMethodId] = useState("crudo_vapor_hervido");
  const [oilTablespoons, setOilTablespoons] = useState(1);

  // Momento de ingesta
  const [mealType, setMealType] = useState("almuerzo");

  // Acompañamiento
  const [addSideDish, setAddSideDish] = useState(false);
  const [selectedSideDish, setSelectedSideDish] = useState(sideDishOptions[0] || null);
  const [sideDishGrams, setSideDishGrams] = useState(200);

  // Reset al cambiar de alimento seleccionado
  useEffect(() => {
    if (selectedItem) {
      setQuantityMode("units");
      setUnitsCount(1);
      setGramsInput(
        selectedItem.is_custom
          ? (selectedItem.total_weight_g || 40)
          : (selectedItem.serving_weight_g || 100)
      );
      setCookingMethodId("crudo_vapor_hervido");
      setOilTablespoons(1);
      setAddSideDish(false);
      if (sideDishOptions.length > 0) {
        setSelectedSideDish(sideDishOptions[0]);
        setSideDishGrams(sideDishOptions[0].defaultGrams || 200);
      }
    }
  }, [selectedItem]);

  // Método de cocción activo
  const selectedCookingMethod = useMemo(() => {
    return COOKING_METHODS.find((m) => m.id === cookingMethodId) || COOKING_METHODS[0];
  }, [cookingMethodId]);

  // CÁLCULO EN TIEMPO REAL
  const calculation = useMemo(() => {
    let rawGrams = 0;
    let baseCals = 0;
    let baseProt = 0;
    let baseCarbs = 0;
    let baseFat = 0;

    if (isCustom) {
      const unitWeight = Number(selectedItem.total_weight_g) || 40;
      if (quantityMode === "units") {
        const units = Math.max(0.1, parseFloat(unitsCount) || 1);
        rawGrams = unitWeight * units;
        baseCals = (Number(selectedItem.calculated_calories) || 0) * units;
        baseProt = (Number(selectedItem.calculated_protein) || 0) * units;
        baseCarbs = (Number(selectedItem.calculated_carbs) || 0) * units;
        baseFat = (Number(selectedItem.calculated_fat) || 0) * units;
      } else {
        const grams = Math.max(1, parseFloat(gramsInput) || unitWeight);
        const factor = grams / unitWeight;
        rawGrams = grams;
        baseCals = (Number(selectedItem.calculated_calories) || 0) * factor;
        baseProt = (Number(selectedItem.calculated_protein) || 0) * factor;
        baseCarbs = (Number(selectedItem.calculated_carbs) || 0) * factor;
        baseFat = (Number(selectedItem.calculated_fat) || 0) * factor;
      }
    } else {
      const servingWeight = Number(selectedItem.serving_weight_g) || 100;
      if (quantityMode === "units") {
        const units = Math.max(0.1, parseFloat(unitsCount) || 1);
        rawGrams = servingWeight * units;
      } else {
        rawGrams = Math.max(1, parseFloat(gramsInput) || 100);
      }

      const factor = rawGrams / 100.0;
      baseCals = (Number(selectedItem.calories_100g) || 0) * factor;
      baseProt = (Number(selectedItem.protein_100g) || 0) * factor;
      baseCarbs = (Number(selectedItem.carbs_100g) || 0) * factor;
      baseFat = (Number(selectedItem.fat_100g) || 0) * factor;
    }

    // Incremento por método de cocción
    let cookingCals = 0;
    let cookingFat = 0;

    if (isRawFood) {
      if (selectedCookingMethod.id === "plancha_rocio") {
        cookingCals = 5.0;
        cookingFat = 0.5;
      } else if (selectedCookingMethod.id === "salteado_aceite") {
        const tbsp = Math.max(0.5, parseFloat(oilTablespoons) || 1);
        cookingCals = tbsp * 90.0;
        cookingFat = tbsp * 10.0;
      } else if (selectedCookingMethod.id === "frito") {
        // Incremento estándar: +120 kcal y +12g grasas por cada 100g
        cookingCals = (rawGrams / 100.0) * 120.0;
        cookingFat = (rawGrams / 100.0) * 12.0;
      }
    }

    // Acompañamiento
    let sideCals = 0;
    let sideProt = 0;
    let sideCarbs = 0;
    let sideFat = 0;

    if (addSideDish && selectedSideDish) {
      const sGrams = Math.max(0, parseFloat(sideDishGrams) || 0);
      const sideFactor = sGrams / 100.0;
      sideCals = (selectedSideDish.cals100 || 0) * sideFactor;
      sideProt = (selectedSideDish.prot100 || 0) * sideFactor;
      sideCarbs = (selectedSideDish.carbs100 || 0) * sideFactor;
      sideFat = (selectedSideDish.fat100 || 0) * sideFactor;
    }

    const totalCals = Math.round((baseCals + cookingCals + sideCals) * 10) / 10;
    const totalProt = Math.round((baseProt + sideProt) * 10) / 10;
    const totalCarbs = Math.round((baseCarbs + sideCarbs) * 10) / 10;
    const totalFat = Math.round((baseFat + cookingFat + sideFat) * 10) / 10;

    return {
      rawGrams: Math.round(rawGrams),
      baseCals: Math.round(baseCals * 10) / 10,
      baseFat: Math.round(baseFat * 10) / 10,
      cookingCals: Math.round(cookingCals * 10) / 10,
      cookingFat: Math.round(cookingFat * 10) / 10,
      sideCals: Math.round(sideCals * 10) / 10,
      totalCals,
      totalProt,
      totalCarbs,
      totalFat,
    };
  }, [
    selectedItem,
    isCustom,
    isRawFood,
    quantityMode,
    unitsCount,
    gramsInput,
    selectedCookingMethod,
    oilTablespoons,
    addSideDish,
    selectedSideDish,
    sideDishGrams,
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();

    let quantityLabel = "";
    if (quantityMode === "units") {
      const u = parseFloat(unitsCount) || 1;
      quantityLabel = `${u} ${u === 1 ? "unidad" : "unidades"} (~${calculation.rawGrams}g)`;
    } else {
      quantityLabel = `${calculation.rawGrams}g crudo`;
    }

    let foodNameLogged = selectedItem.name;
    if (isRawFood && selectedCookingMethod.id !== "crudo_vapor_hervido") {
      if (selectedCookingMethod.id === "salteado_aceite") {
        foodNameLogged = `${selectedItem.name} (${selectedCookingMethod.shortLabel} - ${oilTablespoons} cda${oilTablespoons > 1 ? "s" : ""})`;
      } else {
        foodNameLogged = `${selectedItem.name} (${selectedCookingMethod.shortLabel})`;
      }
    }

    const payload = {
      food_name: foodNameLogged,
      grams_or_units: quantityLabel,
      calories: calculation.totalCals,
      protein: calculation.totalProt,
      carbs: calculation.totalCarbs,
      fat: calculation.totalFat,
      side_dish_name:
        addSideDish && selectedSideDish
          ? `${selectedSideDish.name} (${sideDishGrams}g)`
          : null,
      side_dish_grams: addSideDish ? parseFloat(sideDishGrams) : null,
      meal_type: mealType,
      recipe_id: isCustom ? selectedItem.id : null,
      food_id: !isCustom ? selectedItem.id : null,
    };

    onConfirmLog(payload);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg md:max-w-xl bg-white border border-slate-100 rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[92dvh] md:max-h-[85vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 md:my-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex-shrink-0">
              {isCustom ? <ChefHat size={16} /> : <Utensils size={15} />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#0F172A] leading-tight">
                Registrar en el Diario
              </h3>
              <p className="text-[11px] text-[#64748B] truncate max-w-[280px]">
                {selectedItem.name} {isCustom ? "(Receta Casera)" : "(Alimento Puro)"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-slate-50 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 space-y-4 flex-1 overflow-y-auto overscroll-contain text-xs">
            {/* CAMPO 1: PESO EN CRUDO (G) O PORCIONES */}
            <div className="space-y-2 rounded-xl border border-slate-100 bg-[#F9FAFB] p-3.5">
              <label className="block text-[#0F172A] font-bold">
                1. Cantidad y peso en crudo
              </label>

              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white border border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuantityMode("units")}
                  className={`h-9 rounded-lg text-xs font-bold transition cursor-pointer ${
                    quantityMode === "units"
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-sm"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  Por Unidades / Porciones
                </button>
                <button
                  type="button"
                  onClick={() => setQuantityMode("grams")}
                  className={`h-9 rounded-lg text-xs font-bold transition cursor-pointer ${
                    quantityMode === "grams"
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-sm"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  Por Gramos Totales (crudo)
                </button>
              </div>

              {quantityMode === "units" ? (
                <div>
                  <div className="flex items-center justify-between text-[#64748B] text-[11px] mb-1">
                    <span>Número de unidades:</span>
                    <span>
                      1 unidad ≈ {isCustom ? (selectedItem.total_weight_g || 40) : (selectedItem.serving_weight_g || 100)}g
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={unitsCount}
                      onChange={(e) => setUnitsCount(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-100 bg-white px-3.5 text-[#0F172A] font-bold focus:border-red-500 focus:outline-none"
                      required
                    />
                    <span className="text-xs text-red-500 whitespace-nowrap bg-slate-50 px-3.5 py-3 rounded-xl border border-slate-100 font-mono font-bold">
                      ≈ {calculation.rawGrams}g en crudo
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between text-[#64748B] text-[11px] mb-1">
                    <span>Gramos consumidos en crudo:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      step="5"
                      value={gramsInput}
                      onChange={(e) => setGramsInput(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-100 bg-white px-3.5 text-[#0F172A] font-bold focus:border-red-500 focus:outline-none"
                      required
                    />
                    <span className="text-xs text-[#64748B] whitespace-nowrap bg-slate-50 px-3.5 py-3 rounded-xl border border-slate-100">
                      gramos
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* CAMPO 2: MÉTODO DE COCCIÓN Y PREPARACIÓN (DINÁMICO PARA VERDURAS, TUBÉRCULOS Y CARNES) */}
            {isRawFood && (
              <div className="space-y-2.5 rounded-xl border border-slate-100 bg-[#F9FAFB] p-3.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[#0F172A] font-bold">
                    2. Método de cocción / preparación
                  </label>
                  <span className="text-[10px] text-red-500 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full font-semibold">
                    Dinámico en vivo
                  </span>
                </div>

                <select
                  value={cookingMethodId}
                  onChange={(e) => setCookingMethodId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-100 bg-white px-3.5 text-[#0F172A] font-medium focus:border-red-500 focus:outline-none"
                >
                  {COOKING_METHODS.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.label}
                    </option>
                  ))}
                </select>

                {/* Sub-selector para Salteado / Al horno con aceite */}
                {cookingMethodId === "salteado_aceite" && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#0F172A]">
                        Cucharadas de aceite:
                      </label>
                      <span className="text-xs font-mono font-bold text-red-400">
                        +{oilTablespoons * 90} kcal | +{oilTablespoons * 10}g grasas
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={oilTablespoons}
                        onChange={(e) => setOilTablespoons(e.target.value)}
                        className="w-full h-10 rounded-xl border border-slate-100 bg-white px-3.5 text-[#0F172A] font-bold focus:border-red-500 focus:outline-none"
                      />
                      <span className="text-xs text-[#64748B] whitespace-nowrap bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100">
                        cucharada(s)
                      </span>
                    </div>
                    <p className="text-[10px] text-[#64748B]">
                      Cada cucharada aporta +90 kcal y +10g grasas añadidas a la cocción.
                    </p>
                  </div>
                )}

                {/* Info para Frito */}
                {cookingMethodId === "frito" && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-red-400 space-y-0.5 animate-in fade-in duration-150 font-mono">
                    <p className="font-bold">
                      🔥 +{calculation.cookingCals} kcal y +{calculation.cookingFat}g grasas por fritura
                    </p>
                    <p className="text-[10px] text-[#64748B]">
                      (Aplica incremento estándar de +120 kcal y +12g grasas cada 100g de alimento en crudo)
                    </p>
                  </div>
                )}

                {/* Info para Rocío Vegetal */}
                {cookingMethodId === "plancha_rocio" && (
                  <div className="pt-1 text-[11px] text-red-500 font-mono animate-in fade-in duration-150">
                    +5 kcal y +0.5g grasas aplicadas por rocío vegetal.
                  </div>
                )}
              </div>
            )}

            {/* MOMENTO DE INGESTA */}
            <div>
              <label className="block text-[#64748B] font-semibold mb-1">
                Momento de ingesta
              </label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-3.5 text-[#0F172A] font-medium focus:border-red-500 focus:outline-none"
              >
                <option value="desayuno">☕ Desayuno</option>
                <option value="almuerzo">🍽️ Almuerzo</option>
                <option value="merienda">🥪 Merienda / Colación</option>
                <option value="cena">🌙 Cena</option>
              </select>
            </div>

            {/* ACOMPAÑAMIENTO / GUARNICIÓN */}
            {sideDishOptions.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-[#F9FAFB] p-3.5 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-[#0F172A]">
                  <input
                    type="checkbox"
                    checked={addSideDish}
                    onChange={(e) => setAddSideDish(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-100 text-red-500 focus:ring-red-500 bg-white accent-[#EF4444]"
                  />
                  <span>[ ] Agregar acompañamiento / guarnición</span>
                </label>

                {addSideDish && selectedSideDish && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[#64748B] font-semibold mb-1">
                        Tipo de guarnición
                      </label>
                      <select
                        value={selectedSideDish.name}
                        onChange={(e) => {
                          const found = sideDishOptions.find((s) => s.name === e.target.value);
                          if (found) {
                            setSelectedSideDish(found);
                            setSideDishGrams(found.defaultGrams || 200);
                          }
                        }}
                        className="w-full h-11 rounded-xl border border-slate-100 bg-white px-3.5 text-[#0F172A] font-medium focus:border-red-500 focus:outline-none"
                      >
                        {sideDishOptions.map((side) => (
                          <option key={side.name} value={side.name}>
                            {side.name} ({side.cals100} kcal / 100g)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#64748B] font-semibold mb-1">
                        Cantidad de guarnición (gramos)
                      </label>
                      <input
                        type="number"
                        step="10"
                        min="10"
                        value={sideDishGrams}
                        onChange={(e) => setSideDishGrams(e.target.value)}
                        className="w-full h-11 rounded-xl border border-slate-100 bg-white px-3.5 text-[#0F172A] font-bold focus:border-red-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-red-500 mt-1 font-mono">
                        +{calculation.sideCals} kcal aportadas por la guarnición
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TARJETA RESUMEN EN VIVO DE MACROS DEL PLATO COMPLETO */}
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-500">
                  Total a Registrar en el Diario
                </span>
                <span className="text-[10px] text-[#64748B] font-mono">
                  Peso total: {calculation.rawGrams}g crudo
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-[#0F172A] font-black text-base bg-black/40 px-2.5 py-1 rounded-lg border border-slate-100">
                  🔥 {calculation.totalCals} kcal
                </span>
                <span className="text-red-500 font-bold bg-black/40 px-2 py-1 rounded-lg border border-slate-100">
                  🍗 {calculation.totalProt}g Prot
                </span>
                <span className="text-red-400 font-bold bg-black/40 px-2 py-1 rounded-lg border border-slate-100">
                  🥔 {calculation.totalCarbs}g Carb
                </span>
                <span className="text-cyan-400 font-bold bg-black/40 px-2 py-1 rounded-lg border border-slate-100">
                  🥑 {calculation.totalFat}g Grasa
                </span>
              </div>

              {/* Desglose explicativo en vivo */}
              {isRawFood && selectedCookingMethod.id !== "crudo_vapor_hervido" && (
                <div className="text-[10px] text-[#64748B] pt-1 border-t border-red-500/20 flex items-center justify-between">
                  <span>Base alimento: {calculation.baseCals} kcal | {calculation.baseFat}g G</span>
                  <span className="text-red-500 font-bold font-mono">
                    +{calculation.cookingCals} kcal cocción (+{calculation.cookingFat}g G)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-white flex gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-12 px-5 rounded-xl border border-slate-100 bg-slate-50 font-semibold text-xs text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || calculation.totalCals <= 0}
              className="h-12 flex-1 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-xs text-white transition active:scale-95 cursor-pointer shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin text-black" />
              ) : (
                <Plus size={16} />
              )}
              <span>Registrar en el Diario</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
