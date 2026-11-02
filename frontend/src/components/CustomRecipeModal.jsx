import React, { useState, useMemo, useEffect } from "react";
import { ChefHat, X, Plus, Trash2, Search, Bookmark, Loader2 } from "lucide-react";
import { createCustomRecipe } from "../api/client";
import { showToast } from "./Toast";

export default function CustomRecipeModal({
  isOpen,
  onClose,
  foodsList = [],
  onSaveRecipe,
  isSaving = false,
}) {
  // 1. Nombre de la preparación
  const [recipeName, setRecipeName] = useState("");

  // 2. Peso de la unidad o porción (ej: 40g)
  const [portionWeightG, setPortionWeightG] = useState(40);

  // 3. Lista de ingredientes dinámicos
  const [ingredients, setIngredients] = useState([]);

  // Panel de búsqueda y adición de ingredientes
  const [isAddingIngredient, setIsAddingIngredient] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFoodForAdd, setSelectedFoodForAdd] = useState(null);
  const [gramsToAdd, setGramsToAdd] = useState(25);
  const [localSaving, setLocalSaving] = useState(false);

  // Resetear estado al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setRecipeName("");
      setPortionWeightG(40);
      setIngredients([]);
      setIsAddingIngredient(false);
      setSearchTerm("");
      setSelectedFoodForAdd(null);
      setGramsToAdd(25);
      setLocalSaving(false);
    }
  }, [isOpen]);

  // Filtrado reactivo en el catálogo completo de ingredientes crudos
  const filteredCatalog = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const rawFoods = (foodsList || []).filter((f) => f && !f.is_custom);
    if (!q) return rawFoods.slice(0, 15);
    return rawFoods
      .filter((f) => (f.name || "").toLowerCase().includes(q))
      .slice(0, 20);
  }, [foodsList, searchTerm]);

  // Lista efectiva de ingredientes (incluye el ingrediente seleccionado en el panel si tiene > 0g y aún no se pulsó "Añadir")
  const effectiveIngredients = useMemo(() => {
    const base = [...ingredients];
    const pendingG = parseFloat(gramsToAdd) || 0;
    if (selectedFoodForAdd && pendingG > 0) {
      base.push({
        food_id: selectedFoodForAdd.id,
        name: selectedFoodForAdd.name,
        category: selectedFoodForAdd.category,
        grams: pendingG,
        cals100: Number(selectedFoodForAdd.calories_100g) || 0,
        prot100: Number(selectedFoodForAdd.protein_100g) || 0,
        carbs100: Number(selectedFoodForAdd.carbs_100g) || 0,
        fat100: Number(selectedFoodForAdd.fat_100g) || 0,
      });
    }
    return base;
  }, [ingredients, selectedFoodForAdd, gramsToAdd]);

  // CÁLCULO EN VIVO DE MACROS POR UNIDAD / PORCIÓN
  const liveCalculation = useMemo(() => {
    let totalBatchGrams = 0;
    let totalBatchCals = 0;
    let totalBatchProt = 0;
    let totalBatchCarbs = 0;
    let totalBatchFat = 0;

    for (const ing of effectiveIngredients) {
      const g = Math.max(0, parseFloat(ing.grams) || 0);
      totalBatchGrams += g;
      totalBatchCals += g * ((Number(ing.cals100) || 0) / 100);
      totalBatchProt += g * ((Number(ing.prot100) || 0) / 100);
      totalBatchCarbs += g * ((Number(ing.carbs100) || 0) / 100);
      totalBatchFat += g * ((Number(ing.fat100) || 0) / 100);
    }

    const parsedPortion = parseFloat(portionWeightG);
    const unitWeight = parsedPortion > 0 ? parsedPortion : (totalBatchGrams > 0 ? totalBatchGrams : 100);
    const ratio = totalBatchGrams > 0 && unitWeight > 0 ? unitWeight / totalBatchGrams : 1.0;
    const estimatedUnits =
      totalBatchGrams > 0 && unitWeight > 0
        ? Math.round((totalBatchGrams / unitWeight) * 10) / 10
        : 1;

    return {
      unitWeight,
      totalBatchGrams: Math.round(totalBatchGrams * 10) / 10,
      estimatedUnits,
      unitCals: Math.round(totalBatchCals * ratio * 10) / 10,
      unitProt: Math.round(totalBatchProt * ratio * 10) / 10,
      unitCarbs: Math.round(totalBatchCarbs * ratio * 10) / 10,
      unitFat: Math.round(totalBatchFat * ratio * 10) / 10,
      batchCals: Math.round(totalBatchCals * 10) / 10,
    };
  }, [effectiveIngredients, portionWeightG]);

  // Validación defensiva: habilitar si el nombre tiene texto y los ingredientes suman > 0 gramos
  const canSaveRecipe = Boolean(
    recipeName.trim().length > 0 && liveCalculation.totalBatchGrams > 0
  );

  if (!isOpen) return null;

  // Agregar ingrediente seleccionado
  const handleAddIngredient = () => {
    if (!selectedFoodForAdd) {
      showToast("Selecciona un ingrediente del catálogo", "error");
      return;
    }
    const g = parseFloat(gramsToAdd);
    if (!g || g <= 0) {
      showToast("Ingresa los gramos en crudo para este ingrediente", "error");
      return;
    }

    setIngredients((prev) => [
      ...prev,
      {
        food_id: selectedFoodForAdd.id,
        name: selectedFoodForAdd.name,
        category: selectedFoodForAdd.category,
        grams: g,
        cals100: Number(selectedFoodForAdd.calories_100g) || 0,
        prot100: Number(selectedFoodForAdd.protein_100g) || 0,
        carbs100: Number(selectedFoodForAdd.carbs_100g) || 0,
        fat100: Number(selectedFoodForAdd.fat_100g) || 0,
      },
    ]);

    setSelectedFoodForAdd(null);
    setSearchTerm("");
    setGramsToAdd(25);
    setIsAddingIngredient(false);
  };

  // Actualizar gramos inline de un ingrediente ya agregado
  const handleUpdateIngredientGrams = (index, newGrams) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, grams: newGrams } : ing))
    );
  };

  // Remover ingrediente
  const handleRemoveIngredient = (index) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Guardar receta en Mis Comidas con handler explícito
  const handleSaveRecipe = async () => {
    if (!recipeName.trim()) {
      showToast("Ingresa un nombre para la preparación", "error");
      return;
    }

    const validIngredients = effectiveIngredients.filter(
      (ing) => (parseFloat(ing.grams) || 0) > 0
    );
    if (validIngredients.length === 0 || liveCalculation.totalBatchGrams <= 0) {
      showToast("Agrega ingredientes que sumen más de 0 gramos", "error");
      return;
    }

    const weightG =
      parseFloat(portionWeightG) > 0
        ? parseFloat(portionWeightG)
        : liveCalculation.totalBatchGrams || 100;

    const payload = {
      name: recipeName.trim(),
      total_weight_g: weightG,
      ingredients: validIngredients.map((ing) => {
        const g = parseFloat(ing.grams) || 0;
        return {
          food_id: ing.food_id || null,
          name: ing.name,
          grams: g,
          calories: Math.round(g * ((Number(ing.cals100) || 0) / 100) * 10) / 10,
          protein: Math.round(g * ((Number(ing.prot100) || 0) / 100) * 10) / 10,
          carbs: Math.round(g * ((Number(ing.carbs100) || 0) / 100) * 10) / 10,
          fat: Math.round(g * ((Number(ing.fat100) || 0) / 100) * 10) / 10,
        };
      }),
      servings: Math.max(1, Math.round(liveCalculation.totalBatchGrams / weightG)),
      calculated_calories: liveCalculation.unitCals,
      calculated_protein: liveCalculation.unitProt,
      calculated_carbs: liveCalculation.unitCarbs,
      calculated_fat: liveCalculation.unitFat,
    };

    try {
      setLocalSaving(true);
      if (typeof onSaveRecipe === "function") {
        await onSaveRecipe(payload);
      } else {
        await createCustomRecipe(payload);
        if (onClose) onClose();
      }
    } catch (err) {
      console.error("Error al guardar receta casera:", err);
      showToast("Error al guardar la receta", "error");
    } finally {
      setLocalSaving(false);
    }
  };

  const savingState = isSaving || localSaving;

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-lg bg-white border border-slate-100 rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[92dvh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex-shrink-0">
              <ChefHat size={16} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#0F172A] leading-tight">
                Creador de Comidas Caseras
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Arma recetas por ingredientes crudos y calcula macros por unidad
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

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 space-y-4 flex-1 overflow-y-auto overscroll-contain text-xs">
            {/* 1. INPUT: NOMBRE DE LA PREPARACIÓN */}
            <div>
              <label className="block text-[#64748B] font-semibold mb-1">
                1. Nombre de la preparación
              </label>
              <input
                type="text"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder='Ej: "Burger de zapallo coreano, carne y zanahoria"'
                className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-3.5 text-[#0F172A] font-medium focus:border-red-500 focus:outline-none"
              />
            </div>

            {/* 2. INPUT: PESO DE LA UNIDAD O PORCIÓN */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[#64748B] font-semibold">
                  2. Peso de la unidad o porción (gramos)
                </label>
                <span className="text-[10px] text-red-500 font-mono">
                  {liveCalculation.unitWeight ? `${liveCalculation.unitWeight}g c/u` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={portionWeightG}
                  onChange={(e) => setPortionWeightG(e.target.value)}
                  placeholder="Ej: 40"
                  className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-3.5 text-[#0F172A] font-bold focus:border-red-500 focus:outline-none font-mono"
                />
                <span className="text-xs text-[#64748B] whitespace-nowrap bg-slate-50 px-3.5 py-3 rounded-xl border border-slate-100">
                  g / unidad
                </span>
              </div>
              <p className="text-[10px] text-[#64748B] mt-1">
                Ejemplo: si armas medallones o hamburguesas de 40g cada una, ingresa 40g.
              </p>
            </div>

            {/* 3. LISTA DE INGREDIENTES DINÁMICOS */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-[#0F172A] font-bold">
                  3. Ingredientes de la preparación ({effectiveIngredients.length})
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingIngredient(true)}
                  className="h-8 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Plus size={13} />
                  <span>[ ＋ Agregar Ingrediente ]</span>
                </button>
              </div>

              {/* PANEL BUSCADOR Y SELECTOR DE INGREDIENTES */}
              {isAddingIngredient && (
                <div className="rounded-2xl border border-red-500/50 bg-[#F9FAFB] p-3.5 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-500 flex items-center gap-1.5">
                      <Search size={14} />
                      <span>Buscar en catálogo de ingredientes crudos</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingIngredient(false);
                        setSelectedFoodForAdd(null);
                      }}
                      className="text-[#64748B] hover:text-[#0F172A] p-1"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ej: Zapallo coreano, Carne picada especial, Zanahoria..."
                    className="w-full h-10 rounded-xl border border-slate-100 bg-white px-3.5 text-xs text-[#0F172A] placeholder-[#8E8E93] focus:border-red-500 focus:outline-none"
                    autoFocus
                  />

                  {/* Resultados del catálogo */}
                  <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-[#26262B]/30 scrollbar-thin">
                    {filteredCatalog.length === 0 ? (
                      <p className="text-[11px] text-[#64748B] py-2 text-center">
                        No se encontró ningún ingrediente con "{searchTerm}"
                      </p>
                    ) : (
                      filteredCatalog.map((food) => (
                        <div
                          key={food.id}
                          onClick={() => setSelectedFoodForAdd(food)}
                          className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition ${
                            selectedFoodForAdd?.id === food.id
                              ? "bg-red-600 hover:bg-red-700 text-white font-bold"
                              : "text-[#0F172A] hover:bg-white"
                          }`}
                        >
                          <div>
                            <span className="text-xs">{food.name}</span>
                            <span className={`block text-[10px] ${selectedFoodForAdd?.id === food.id ? "text-black/70" : "text-[#64748B]"}`}>
                              {(food.category || "").replace("_", " ")}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono">
                            {food.calories_100g} kcal / 100g
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Input de gramos del ingrediente seleccionado */}
                  {selectedFoodForAdd && (
                    <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2 animate-in fade-in duration-100">
                      <div className="flex-1">
                        <label className="block text-[11px] text-[#64748B] mb-1">
                          Gramos exactos de <span className="text-[#0F172A] font-bold">{selectedFoodForAdd.name}</span>:
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={gramsToAdd}
                          onChange={(e) => setGramsToAdd(e.target.value)}
                          placeholder="Ej: 25"
                          className="w-full h-10 rounded-xl border border-slate-100 bg-white px-3 text-xs text-[#0F172A] font-bold font-mono focus:border-red-500 focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddIngredient();
                            }
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddIngredient}
                        className="self-end h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs hover:bg-red-600 hover:bg-red-700 transition active:scale-95 cursor-pointer shadow-sm"
                      >
                        Añadir
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* LISTA DE INGREDIENTES AÑADIDOS */}
              {ingredients.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-100 bg-[#F9FAFB] p-5 text-center text-[#64748B] text-xs space-y-1">
                  <p className="font-semibold text-[#0F172A]">Ningún ingrediente agregado</p>
                  <p className="text-[11px]">
                    Presiona el botón <span className="text-red-500 font-semibold">[ ＋ Agregar Ingrediente ]</span> para buscar "Zapallo coreano", "Carne picada especial", "Zanahoria", etc.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ingredients.map((ing, idx) => {
                    const ingCals = Math.round((parseFloat(ing.grams) || 0) * (ing.cals100 / 100) * 10) / 10;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-100 bg-[#F9FAFB] p-3 flex items-center justify-between gap-3 hover:border-red-500/30 transition"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#0F172A]">{ing.name}</span>
                            <span className="text-[10px] text-[#64748B] bg-white px-1.5 py-0.5 rounded border border-slate-100">
                              {ing.category?.replace("_", " ")}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#64748B] font-mono">
                            Aporte: {ingCals} kcal ({ing.cals100} kcal / 100g)
                          </span>
                        </div>

                        {/* Input inline de gramos para edición rápida */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-100">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={ing.grams}
                              onChange={(e) => handleUpdateIngredientGrams(idx, e.target.value)}
                              className="w-14 text-right bg-transparent text-xs font-bold font-mono text-red-500 focus:outline-none"
                            />
                            <span className="text-[11px] text-[#64748B]">g</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(idx)}
                            className="p-1.5 text-[#64748B] hover:text-red-400 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                            title="Remover ingrediente"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. RESUMEN EN VIVO POR UNIDAD */}
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-500">
                  4. Resumen en Vivo por Unidad ({liveCalculation.unitWeight}g c/u)
                </span>
                <span className="text-[10px] text-[#64748B] font-mono">
                  Mezcla: {liveCalculation.totalBatchGrams}g | Rinde ~{liveCalculation.estimatedUnits} u.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-[#0F172A] font-black text-sm bg-black/40 px-2.5 py-1 rounded-lg border border-slate-100">
                  🔥 {liveCalculation.unitCals} kcal
                </span>
                <span className="text-red-500 font-bold bg-black/40 px-2 py-1 rounded-lg border border-slate-100">
                  🍗 {liveCalculation.unitProt}g Prot
                </span>
                <span className="text-red-400 font-bold bg-black/40 px-2 py-1 rounded-lg border border-slate-100">
                  🥔 {liveCalculation.unitCarbs}g Carb
                </span>
                <span className="text-cyan-400 font-bold bg-black/40 px-2 py-1 rounded-lg border border-slate-100">
                  🥑 {liveCalculation.unitFat}g Grasa
                </span>
              </div>

              <p className="text-[10px] text-[#64748B]">
                Calcula la suma proporcional exacta de macros por cada unidad conforme se tipea.
              </p>
            </div>
          </div>

          {/* 5. BOTÓN GUARDAR RECETA EN MIS COMIDAS */}
          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-white flex gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-12 px-5 rounded-xl border border-slate-100 bg-slate-50 font-semibold text-xs text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveRecipe}
              disabled={savingState || !canSaveRecipe}
              className="h-12 flex-1 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-xs text-white transition active:scale-95 cursor-pointer shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingState ? (
                <Loader2 size={16} className="animate-spin text-black" />
              ) : (
                <Bookmark size={16} />
              )}
              <span>Guardar Receta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
