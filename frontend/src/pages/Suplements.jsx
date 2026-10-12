import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Flame,
  FlaskConical,
  HeartPulse,
  Info,
  Loader2,
  Lock,
  Pencil,
  Pill,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Sun,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  createChemistryCompound,
  createLabAnalysis,
  createSupplement,
  deleteChemistryCompound,
  deleteLabAnalysis,
  deleteSupplement,
  getChemistryCompounds,
  getLabAnalyses,
  getSupplements,
  getTodaySupplementChecklist,
  toggleSupplementToday,
  updateChemistryCompound,
  updateLabAnalysis,
  updateSupplement,
} from "../api/client";
import { showToast } from "../components/Toast";
import { formatDateSafe, getLocalDateString } from "../utils/dateUtils";

export default function Suplements() {
  const [activeTab, setActiveTab] = useState("hoy"); // hoy | suplementos | quimica | analisis
  const [loading, setLoading] = useState(true);

  // 1. SUPLEMENTOS & CHECKLIST
  const [supplements, setSupplements] = useState([]);
  const [checklist, setChecklist] = useState({ total: 0, completed: 0, percent: 0, items: [] });
  const [isSuppModalOpen, setIsSuppModalOpen] = useState(false);
  const [editingSupp, setEditingSupp] = useState(null);
  const [suppForm, setSuppForm] = useState({
    name: "",
    dose: "",
    timing: "mañana",
    is_active: true,
  });

  // 2. QUÍMICA
  const [chemistryList, setChemistryList] = useState([]);
  const [isChemistryUnlocked, setIsChemistryUnlocked] = useState(true); // Opcional y Privado
  const [isChemModalOpen, setIsChemModalOpen] = useState(false);
  const [editingChem, setEditingChem] = useState(null);
  const [chemForm, setChemForm] = useState({
    name: "",
    weekly_dose: "",
    dose_unit: "mg",
    application_days: "Lunes, Jueves",
    notes: "",
    is_active: true,
  });

  // 3. ANÁLISIS
  const [labSummary, setLabSummary] = useState({
    analyses: [],
    latest_date: null,
    days_since_last: null,
    alert_level: "critical",
    alert_message: "Cargando análisis...",
  });
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [labForm, setLabForm] = useState({
    date: getLocalDateString(),
    hematocrit: "",
    got_ast: "",
    gpt_alt: "",
    total_cholesterol: "",
    hdl: "",
    ldl: "",
    triglycerides: "",
    testosterone: "",
    notes: "",
  });

  // CARGAR DATOS
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [suppsData, checkData, chemData, labData] = await Promise.all([
        getSupplements().catch(() => []),
        getTodaySupplementChecklist().catch(() => ({ total: 0, completed: 0, percent: 0, items: [] })),
        getChemistryCompounds().catch(() => []),
        getLabAnalyses().catch(() => ({
          analyses: [],
          latest_date: null,
          days_since_last: null,
          alert_level: "critical",
          alert_message: "Sin análisis registrados",
        })),
      ]);

      setSupplements(suppsData || []);
      setChecklist(checkData || { total: 0, completed: 0, percent: 0, items: [] });
      setChemistryList(chemData || []);
      setLabSummary(labData || {
        analyses: [],
        latest_date: null,
        days_since_last: null,
        alert_level: "critical",
        alert_message: "Sin análisis registrados",
      });
    } catch (err) {
      console.error("Error al cargar datos del módulo suple:", err);
      showToast("Error al cargar datos de suplementos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // TOGGLE SUPLEMENTO EN HOY
  const handleToggleToday = async (suppId, currentStatus) => {
    try {
      // Optimistic update
      setChecklist((prev) => {
        const nextItems = prev.items.map((it) =>
          it.id === suppId ? { ...it, taken: !currentStatus } : it
        );
        const completed = nextItems.filter((it) => it.taken).length;
        const total = nextItems.length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { ...prev, items: nextItems, completed, percent };
      });

      await toggleSupplementToday(suppId, { taken: !currentStatus });
    } catch (err) {
      console.error("Error al tildar suplemento:", err);
      showToast("Error al actualizar suplemento", "error");
      loadAllData();
    }
  };

  // GUARDAR SUPLEMENTO (CREAR / EDITAR)
  const handleSaveSupplement = async (e) => {
    e.preventDefault();
    if (!suppForm.name.trim() || !suppForm.dose.trim()) {
      showToast("Nombre y dosis son requeridos", "info");
      return;
    }
    try {
      if (editingSupp) {
        await updateSupplement(editingSupp.id, suppForm);
        showToast("Suplemento actualizado con éxito", "success");
      } else {
        await createSupplement(suppForm);
        showToast("Suplemento añadido correctamente", "success");
      }
      setIsSuppModalOpen(false);
      setEditingSupp(null);
      setSuppForm({ name: "", dose: "", timing: "mañana", is_active: true });
      loadAllData();
    } catch (err) {
      console.error("Error guardando suplemento:", err);
      showToast("Error al guardar suplemento", "error");
    }
  };

  // ELIMINAR SUPLEMENTO
  const handleDeleteSupplement = async (id) => {
    if (!confirm("¿Eliminar este suplemento de la lista?")) return;
    try {
      await deleteSupplement(id);
      showToast("Suplemento eliminado", "info");
      loadAllData();
    } catch (err) {
      console.error("Error eliminando suplemento:", err);
      showToast("Error al eliminar suplemento", "error");
    }
  };

  // GUARDAR COMPUESTO QUÍMICO
  const handleSaveChemistry = async (e) => {
    e.preventDefault();
    if (!chemForm.name.trim() || !chemForm.weekly_dose.trim()) {
      showToast("Compuesto y dosis semanal son requeridos", "info");
      return;
    }
    try {
      if (editingChem) {
        await updateChemistryCompound(editingChem.id, chemForm);
        showToast("Compuesto actualizado", "success");
      } else {
        await createChemistryCompound(chemForm);
        showToast("Compuesto registrado con éxito", "success");
      }
      setIsChemModalOpen(false);
      setEditingChem(null);
      setChemForm({
        name: "",
        weekly_dose: "",
        dose_unit: "mg",
        application_days: "Lunes, Jueves",
        notes: "",
        is_active: true,
      });
      loadAllData();
    } catch (err) {
      console.error("Error guardando compuesto:", err);
      showToast("Error al guardar compuesto", "error");
    }
  };

  // ELIMINAR COMPUESTO
  const handleDeleteChemistry = async (id) => {
    if (!confirm("¿Eliminar este registro farmacológico?")) return;
    try {
      await deleteChemistryCompound(id);
      showToast("Compuesto eliminado", "info");
      loadAllData();
    } catch (err) {
      console.error("Error eliminando compuesto:", err);
      showToast("Error al eliminar compuesto", "error");
    }
  };

  // GUARDAR ANÁLISIS
  const handleSaveLab = async (e) => {
    e.preventDefault();
    if (!labForm.date) {
      showToast("La fecha es requerida", "info");
      return;
    }
    try {
      const payload = {
        date: labForm.date,
        hematocrit: labForm.hematocrit ? parseFloat(labForm.hematocrit) : null,
        got_ast: labForm.got_ast ? parseFloat(labForm.got_ast) : null,
        gpt_alt: labForm.gpt_alt ? parseFloat(labForm.gpt_alt) : null,
        total_cholesterol: labForm.total_cholesterol ? parseFloat(labForm.total_cholesterol) : null,
        hdl: labForm.hdl ? parseFloat(labForm.hdl) : null,
        ldl: labForm.ldl ? parseFloat(labForm.ldl) : null,
        triglycerides: labForm.triglycerides ? parseFloat(labForm.triglycerides) : null,
        testosterone: labForm.testosterone ? parseFloat(labForm.testosterone) : null,
        notes: labForm.notes,
      };

      if (editingLab) {
        await updateLabAnalysis(editingLab.id, payload);
        showToast("Análisis actualizado", "success");
      } else {
        await createLabAnalysis(payload);
        showToast("Análisis registrado con éxito", "success");
      }
      setIsLabModalOpen(false);
      setEditingLab(null);
      setLabForm({
        date: getLocalDateString(),
        hematocrit: "",
        got_ast: "",
        gpt_alt: "",
        total_cholesterol: "",
        hdl: "",
        ldl: "",
        triglycerides: "",
        testosterone: "",
        notes: "",
      });
      loadAllData();
    } catch (err) {
      console.error("Error guardando análisis:", err);
      showToast("Error al guardar análisis clínico", "error");
    }
  };

  // ELIMINAR ANÁLISIS
  const handleDeleteLab = async (id) => {
    if (!confirm("¿Eliminar este registro de análisis clínico?")) return;
    try {
      await deleteLabAnalysis(id);
      showToast("Análisis eliminado", "info");
      loadAllData();
    } catch (err) {
      console.error("Error eliminando análisis:", err);
      showToast("Error al eliminar análisis", "error");
    }
  };

  // AGRUPAR CHECKLIST DE HOY POR TIMING
  const groupedChecklist = useMemo(() => {
    const groups = {
      mañana: [],
      pre_entreno: [],
      noche: [],
      otros: [],
    };
    (checklist.items || []).forEach((item) => {
      const t = (item.timing || "").toLowerCase().replace(/[^a-z_]/g, "");
      if (t.includes("mañana") || t.includes("desayuno")) {
        groups.mañana.push(item);
      } else if (t.includes("pre") || t.includes("entreno") || t.includes("intra")) {
        groups.pre_entreno.push(item);
      } else if (t.includes("noche") || t.includes("cena") || t.includes("dormir")) {
        groups.noche.push(item);
      } else {
        groups.otros.push(item);
      }
    });
    return groups;
  }, [checklist.items]);

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* CABECERA OLED */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2C2C2E] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white shadow-lg shadow-[#FF5722]/20">
              <Pill size={18} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Módulo Suple & Salud
              </h1>
              <p className="text-xs text-[#8E8E93]">
                Control diario de suplementación, farmacología y análisis clínicos
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadAllData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 rounded-xl border border-[#2C2C2E] bg-[#121212] px-3 py-2 text-xs font-semibold text-[#8E8E93] hover:text-white hover:border-white/20 transition active:scale-95"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* PESTAÑAS SUPERIORES OLED: [ HOY | SUPLEMENTOS | QUÍMICA | ANÁLISIS ] */}
      <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[#121212] border border-[#2C2C2E]">
        {[
          { id: "hoy", label: "HOY", icon: CheckCircle2 },
          { id: "suplementos", label: "SUPLEMENTOS", icon: Pill },
          { id: "quimica", label: "QUÍMICA", icon: FlaskConical },
          { id: "analisis", label: "ANÁLISIS", icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                isActive
                  ? "bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white shadow-md shadow-[#FF5722]/25"
                  : "text-[#8E8E93] hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={14} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* 1. PESTAÑA: HOY (CHECKLIST INTERACTIVO) */}
      {/* ==================================================================== */}
      {activeTab === "hoy" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Card Resumen de Cumplimiento OLED */}
          <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 shadow-xl">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF5722]">
                  Checklist de Hoy
                </span>
                <h3 className="text-lg font-bold text-white">
                  {checklist.completed} de {checklist.total} suplementos consumidos
                </h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF5722] to-[#7C4DFF]">
                  {checklist.percent}%
                </span>
              </div>
            </div>

            {/* Barra de progreso OLED */}
            <div className="h-3 w-full bg-[#1C1C1E] rounded-full overflow-hidden p-0.5 border border-[#2C2C2E]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FF5722] via-[#FF7043] to-[#7C4DFF] transition-all duration-500 ease-out"
                style={{ width: `${checklist.percent}%` }}
              />
            </div>
          </div>

          {checklist.items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#2C2C2E] bg-[#121212]/50 p-8 text-center space-y-3">
              <Pill size={32} className="mx-auto text-[#8E8E93]" />
              <p className="text-sm font-semibold text-white">No tienes suplementos activos hoy</p>
              <p className="text-xs text-[#8E8E93]">
                Agrega suplementos en la pestaña "SUPLEMENTOS" para activar tu checklist diario.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("suplementos");
                  setIsSuppModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#FF5722]/20 hover:opacity-95 transition active:scale-95"
              >
                <Plus size={14} />
                <span>Crear Suplemento</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bloque Mañana */}
              {groupedChecklist.mañana.length > 0 && (
                <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <Sun size={15} />
                    <span>🌅 MAÑANA / DESAYUNO</span>
                  </div>
                  <div className="space-y-2">
                    {groupedChecklist.mañana.map((item) => (
                      <ChecklistItem
                        key={item.id}
                        item={item}
                        onToggle={() => handleToggleToday(item.id, item.taken)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Bloque Pre-Entreno */}
              {groupedChecklist.pre_entreno.length > 0 && (
                <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#FF5722]">
                    <Zap size={15} />
                    <span>⚡ PRE-ENTRENO / ACTIVACIÓN</span>
                  </div>
                  <div className="space-y-2">
                    {groupedChecklist.pre_entreno.map((item) => (
                      <ChecklistItem
                        key={item.id}
                        item={item}
                        onToggle={() => handleToggleToday(item.id, item.taken)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Bloque Noche */}
              {groupedChecklist.noche.length > 0 && (
                <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#7C4DFF]">
                    <Clock size={15} />
                    <span>🌙 NOCHE / RECUPERACIÓN</span>
                  </div>
                  <div className="space-y-2">
                    {groupedChecklist.noche.map((item) => (
                      <ChecklistItem
                        key={item.id}
                        item={item}
                        onToggle={() => handleToggleToday(item.id, item.taken)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Otros */}
              {groupedChecklist.otros.length > 0 && (
                <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#8E8E93]">
                    <Pill size={15} />
                    <span>📦 OTRAS TOMAS DEL DÍA</span>
                  </div>
                  <div className="space-y-2">
                    {groupedChecklist.otros.map((item) => (
                      <ChecklistItem
                        key={item.id}
                        item={item}
                        onToggle={() => handleToggleToday(item.id, item.taken)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. PESTAÑA: SUPLEMENTOS (GESTIÓN DE CATÁLOGO) */}
      {/* ==================================================================== */}
      {activeTab === "suplementos" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Catálogo de Suplementos</h3>
              <p className="text-xs text-[#8E8E93]">
                Define compuestos, dosis y timing para el checklist diario
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingSupp(null);
                setSuppForm({ name: "", dose: "", timing: "mañana", is_active: true });
                setIsSuppModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-[#FF5722]/20 hover:opacity-95 transition active:scale-95"
            >
              <Plus size={15} />
              <span>Nuevo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {supplements.map((supp) => (
              <div
                key={supp.id}
                className={`rounded-2xl border p-4 flex items-center justify-between gap-3 transition ${
                  supp.is_active
                    ? "bg-[#121212] border-[#2C2C2E]"
                    : "bg-[#121212]/40 border-[#2C2C2E]/40 opacity-60"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{supp.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        supp.timing === "mañana"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : supp.timing === "pre_entreno"
                          ? "bg-[#FF5722]/10 text-[#FF5722] border border-[#FF5722]/20"
                          : "bg-[#7C4DFF]/10 text-[#7C4DFF] border border-[#7C4DFF]/20"
                      }`}
                    >
                      {supp.timing}
                    </span>
                  </div>
                  <p className="text-xs text-[#8E8E93]">Dosis: {supp.dose}</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSupp(supp);
                      setSuppForm({
                        name: supp.name,
                        dose: supp.dose,
                        timing: supp.timing,
                        is_active: supp.is_active,
                      });
                      setIsSuppModalOpen(true);
                    }}
                    className="p-2 text-[#8E8E93] hover:text-white rounded-lg hover:bg-white/5 transition"
                    title="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSupplement(supp.id)}
                    className="p-2 text-[#8E8E93] hover:text-red-400 rounded-lg hover:bg-red-500/10 transition"
                    title="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. PESTAÑA: QUÍMICA (FARMACOLOGÍA / PRIVADO) */}
      {/* ==================================================================== */}
      {activeTab === "quimica" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Alerta de Privacidad OLED */}
          <div className="rounded-3xl border border-[#7C4DFF]/30 bg-gradient-to-r from-[#7C4DFF]/10 to-[#121212] p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7C4DFF]/20 text-[#7C4DFF] border border-[#7C4DFF]/30 flex-shrink-0">
                <Lock size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Módulo Farmacológico (Privado & Opcional)
                </h4>
                <p className="text-[11px] text-[#8E8E93]">
                  Registro confidencial de compuestos, dosificación y días de aplicación programados.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsChemistryUnlocked(!isChemistryUnlocked)}
              className="flex items-center gap-1.5 rounded-xl border border-[#2C2C2E] bg-[#121212] px-3 py-1.5 text-xs font-semibold text-[#8E8E93] hover:text-white transition"
            >
              {isChemistryUnlocked ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{isChemistryUnlocked ? "Ocultar" : "Mostrar"}</span>
            </button>
          </div>

          {isChemistryUnlocked ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">Compuestos en Uso</h3>
                  <p className="text-xs text-[#8E8E93]">
                    Frecuencia de inyección o toma semanal y control de días
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingChem(null);
                    setChemForm({
                      name: "",
                      weekly_dose: "",
                      dose_unit: "mg",
                      application_days: "Lunes, Jueves",
                      notes: "",
                      is_active: true,
                    });
                    setIsChemModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-[#FF5722]/20 hover:opacity-95 transition active:scale-95"
                >
                  <Plus size={15} />
                  <span>Nuevo Compuesto</span>
                </button>
              </div>

              {chemistryList.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#2C2C2E] bg-[#121212]/50 p-8 text-center space-y-2">
                  <FlaskConical size={32} className="mx-auto text-[#8E8E93]" />
                  <p className="text-sm font-semibold text-white">No hay compuestos registrados</p>
                  <p className="text-xs text-[#8E8E93]">
                    Registra tus compuestos para recibir recordatorios en los días de aplicación programados.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {chemistryList.map((chem) => (
                    <div
                      key={chem.id}
                      className="rounded-2xl border border-[#2C2C2E] bg-[#121212] p-4 space-y-3 shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-base">{chem.name}</h4>
                            {chem.is_application_today && (
                              <span className="flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                💉 HOY TOCA
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#FF5722] font-semibold mt-0.5">
                            Dosis: {chem.weekly_dose} {chem.dose_unit} / semana
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingChem(chem);
                              setChemForm({
                                name: chem.name,
                                weekly_dose: chem.weekly_dose,
                                dose_unit: chem.dose_unit,
                                application_days: chem.application_days,
                                notes: chem.notes || "",
                                is_active: chem.is_active,
                              });
                              setIsChemModalOpen(true);
                            }}
                            className="p-1.5 text-[#8E8E93] hover:text-white rounded-lg hover:bg-white/5 transition"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteChemistry(chem.id)}
                            className="p-1.5 text-[#8E8E93] hover:text-red-400 rounded-lg hover:bg-red-500/10 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#1C1C1E] p-2.5 border border-[#2C2C2E] flex items-center justify-between text-xs">
                        <span className="text-[#8E8E93]">Días de aplicación:</span>
                        <span className="font-semibold text-white">{chem.application_days}</span>
                      </div>

                      {chem.notes && (
                        <p className="text-[11px] text-[#8E8E93] italic border-t border-white/5 pt-2">
                          "{chem.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-10 text-center space-y-3">
              <Lock size={32} className="mx-auto text-[#7C4DFF]" />
              <h4 className="text-base font-bold text-white">Sección Farmacológica Oculta</h4>
              <p className="text-xs text-[#8E8E93]">
                Haz clic en "Mostrar" para acceder al registro de compuestos y recordatorios.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. PESTAÑA: ANÁLISIS (LAB VALUES & ALERTA DE TIEMPO) */}
      {/* ==================================================================== */}
      {activeTab === "analisis" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* BANNER DE ALERTA DE TIEMPO TRANSCURRIDO OLED */}
          <div
            className={`rounded-3xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl ${
              labSummary.alert_level === "ok"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : labSummary.alert_level === "warning"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-2xl flex-shrink-0 ${
                  labSummary.alert_level === "ok"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : labSummary.alert_level === "warning"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                <HeartPulse size={24} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Control Analítico & Salud Sistémica
                </span>
                <h4 className="text-sm sm:text-base font-bold text-white">
                  {labSummary.alert_message}
                </h4>
                {labSummary.latest_date && (
                  <p className="text-xs text-[#8E8E93]">
                    Último registro: {formatDateSafe(labSummary.latest_date)} (Hace {labSummary.days_since_last} días)
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingLab(null);
                setLabForm({
                  date: getLocalDateString(),
                  hematocrit: "",
                  got_ast: "",
                  gpt_alt: "",
                  total_cholesterol: "",
                  hdl: "",
                  ldl: "",
                  triglycerides: "",
                  testosterone: "",
                  notes: "",
                });
                setIsLabModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[#FF5722]/20 hover:opacity-95 transition active:scale-95 self-start sm:self-auto"
            >
              <Plus size={15} />
              <span>Cargar Análisis</span>
            </button>
          </div>

          {/* HISTORIAL TABULAR DE ANÁLISIS */}
          {labSummary.analyses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#2C2C2E] bg-[#121212]/50 p-8 text-center space-y-2">
              <Activity size={32} className="mx-auto text-[#8E8E93]" />
              <p className="text-sm font-semibold text-white">No tienes análisis de sangre registrados</p>
              <p className="text-xs text-[#8E8E93]">
                Haz un seguimiento de Hematocrito, Transaminasas, Perfil Lipídico y Testosterona.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Historial de Laboratorio</h3>

              <div className="overflow-x-auto rounded-3xl border border-[#2C2C2E] bg-[#121212]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#2C2C2E] bg-[#1C1C1E]/60 text-[#8E8E93] uppercase font-bold">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Hematocrito (%)</th>
                      <th className="px-4 py-3">Transaminasas (GOT / GPT)</th>
                      <th className="px-4 py-3">Lípidos (HDL / LDL)</th>
                      <th className="px-4 py-3">Testosterona (ng/dL)</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2C2C2E] text-white">
                    {labSummary.analyses.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">
                          {formatDateSafe(item.date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.hematocrit ? (
                            <span
                              className={`font-mono font-bold ${
                                item.hematocrit > 52 ? "text-red-400" : "text-white"
                              }`}
                            >
                              {item.hematocrit}%
                            </span>
                          ) : (
                            <span className="text-[#8E8E93]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.got_ast || item.gpt_alt ? (
                            <span className="font-mono text-white">
                              {item.got_ast ?? "-"} / {item.gpt_alt ?? "-"} U/L
                            </span>
                          ) : (
                            <span className="text-[#8E8E93]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.hdl || item.ldl ? (
                            <span className="font-mono text-white">
                              {item.hdl ?? "-"} / {item.ldl ?? "-"} mg/dL
                            </span>
                          ) : (
                            <span className="text-[#8E8E93]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.testosterone ? (
                            <span className="font-mono font-bold text-[#FF5722]">
                              {item.testosterone} ng/dL
                            </span>
                          ) : (
                            <span className="text-[#8E8E93]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLab(item);
                              setLabForm({
                                date: item.date,
                                hematocrit: item.hematocrit ?? "",
                                got_ast: item.got_ast ?? "",
                                gpt_alt: item.gpt_alt ?? "",
                                total_cholesterol: item.total_cholesterol ?? "",
                                hdl: item.hdl ?? "",
                                ldl: item.ldl ?? "",
                                triglycerides: item.triglycerides ?? "",
                                testosterone: item.testosterone ?? "",
                                notes: item.notes || "",
                              });
                              setIsLabModalOpen(true);
                            }}
                            className="p-1.5 text-[#8E8E93] hover:text-white transition"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLab(item.id)}
                            className="p-1.5 text-[#8E8E93] hover:text-red-400 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL CREAR/EDITAR SUPLEMENTO */}
      {/* ==================================================================== */}
      {isSuppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#2C2C2E] bg-[#121212] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingSupp ? "Editar Suplemento" : "Nuevo Suplemento"}
              </h3>
              <button
                type="button"
                onClick={() => setIsSuppModalOpen(false)}
                className="text-[#8E8E93] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSupplement} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#8E8E93] font-semibold mb-1">Nombre</label>
                <input
                  type="text"
                  value={suppForm.name}
                  onChange={(e) => setSuppForm({ ...suppForm, name: e.target.value })}
                  placeholder="Ej: Creatina Creapure, Omega 3, Vitamina D3"
                  className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3.5 py-2.5 text-white focus:border-[#FF5722] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[#8E8E93] font-semibold mb-1">Dosis habitual</label>
                <input
                  type="text"
                  value={suppForm.dose}
                  onChange={(e) => setSuppForm({ ...suppForm, dose: e.target.value })}
                  placeholder="Ej: 5g, 2 cápsulas (2000 UI)"
                  className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3.5 py-2.5 text-white focus:border-[#FF5722] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[#8E8E93] font-semibold mb-1">Momento de ingesta (Timing)</label>
                <select
                  value={suppForm.timing}
                  onChange={(e) => setSuppForm({ ...suppForm, timing: e.target.value })}
                  className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3.5 py-2.5 text-white focus:border-[#FF5722] focus:outline-none"
                >
                  <option value="mañana">🌅 Mañana / Desayuno</option>
                  <option value="pre_entreno">⚡ Pre-Entreno</option>
                  <option value="noche">🌙 Noche / Antes de dormir</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="supp_active"
                  checked={suppForm.is_active}
                  onChange={(e) => setSuppForm({ ...suppForm, is_active: e.target.checked })}
                  className="rounded border-[#2C2C2E] accent-[#FF5722]"
                />
                <label htmlFor="supp_active" className="text-white font-semibold">
                  Activo en checklist diario
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsSuppModalOpen(false)}
                  className="rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-4 py-2 font-semibold text-[#8E8E93] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] px-5 py-2 font-bold text-white shadow-md shadow-[#FF5722]/20"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL CREAR/EDITAR COMPUESTO QUÍMICO */}
      {/* ==================================================================== */}
      {isChemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#2C2C2E] bg-[#121212] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingChem ? "Editar Compuesto" : "Nuevo Compuesto"}
              </h3>
              <button
                type="button"
                onClick={() => setIsChemModalOpen(false)}
                className="text-[#8E8E93] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveChemistry} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#8E8E93] font-semibold mb-1">Compuesto</label>
                <input
                  type="text"
                  value={chemForm.name}
                  onChange={(e) => setChemForm({ ...chemForm, name: e.target.value })}
                  placeholder="Ej: Testosterona Enantato, Nandrolona"
                  className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3.5 py-2.5 text-white focus:border-[#7C4DFF] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">Dosis semanal</label>
                  <input
                    type="text"
                    value={chemForm.weekly_dose}
                    onChange={(e) => setChemForm({ ...chemForm, weekly_dose: e.target.value })}
                    placeholder="Ej: 250"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3.5 py-2.5 text-white focus:border-[#7C4DFF] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">Unidad</label>
                  <select
                    value={chemForm.dose_unit}
                    onChange={(e) => setChemForm({ ...chemForm, dose_unit: e.target.value })}
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3.5 py-2.5 text-white focus:border-[#7C4DFF] focus:outline-none"
                  >
                    <option value="mg">mg</option>
                    <option value="ml">ml</option>
                    <option value="UI">UI</option>
                    <option value="mcg">mcg</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#8E8E93] font-semibold mb-1">Días de aplicación (Recordatorio)</label>
                <input
                  type="text"
                  value={chemForm.application_days}
                  onChange={(e) => setChemForm({ ...chemForm, application_days: e.target.value })}
                  placeholder="Ej: Lunes, Jueves"
                  className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3.5 py-2.5 text-white focus:border-[#7C4DFF] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[#8E8E93] font-semibold mb-1">Notas / Semana de ciclo</label>
                <textarea
                  value={chemForm.notes}
                  onChange={(e) => setChemForm({ ...chemForm, notes: e.target.value })}
                  placeholder="Ej: Semana 6 de 12. Laboratorio X."
                  rows={2}
                  className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3.5 py-2.5 text-white focus:border-[#7C4DFF] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsChemModalOpen(false)}
                  className="rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-4 py-2 font-semibold text-[#8E8E93] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] px-5 py-2 font-bold text-white shadow-md shadow-[#FF5722]/20"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL CARGAR ANÁLISIS DE LABORATORIO */}
      {/* ==================================================================== */}
      {isLabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-[#2C2C2E] bg-[#121212] p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingLab ? "Editar Análisis" : "Registrar Análisis de Sangre"}
              </h3>
              <button
                type="button"
                onClick={() => setIsLabModalOpen(false)}
                className="text-[#8E8E93] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLab} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#8E8E93] font-semibold mb-1">Fecha del análisis</label>
                <input
                  type="date"
                  value={labForm.date}
                  onChange={(e) => setLabForm({ ...labForm, date: e.target.value })}
                  className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3.5 py-2.5 text-white focus:border-[#FF5722] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">Hematocrito (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labForm.hematocrit}
                    onChange={(e) => setLabForm({ ...labForm, hematocrit: e.target.value })}
                    placeholder="Ref: 40-52%"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3 py-2 text-white focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">Testosterona (ng/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labForm.testosterone}
                    onChange={(e) => setLabForm({ ...labForm, testosterone: e.target.value })}
                    placeholder="Ref: 300-1000"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3 py-2 text-white focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">GOT / AST (U/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labForm.got_ast}
                    onChange={(e) => setLabForm({ ...labForm, got_ast: e.target.value })}
                    placeholder="Transaminasa AST"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3 py-2 text-white focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">GPT / ALT (U/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labForm.gpt_alt}
                    onChange={(e) => setLabForm({ ...labForm, gpt_alt: e.target.value })}
                    placeholder="Transaminasa ALT"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3 py-2 text-white focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">HDL (mg/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labForm.hdl}
                    onChange={(e) => setLabForm({ ...labForm, hdl: e.target.value })}
                    placeholder="HDL"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-2.5 py-2 text-white focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">LDL (mg/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labForm.ldl}
                    onChange={(e) => setLabForm({ ...labForm, ldl: e.target.value })}
                    placeholder="LDL"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-2.5 py-2 text-white focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8E8E93] font-semibold mb-1">Triglicéridos</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labForm.triglycerides}
                    onChange={(e) => setLabForm({ ...labForm, triglycerides: e.target.value })}
                    placeholder="TG"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-2.5 py-2 text-white focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#8E8E93] font-semibold mb-1">Notas clínicas / Médico</label>
                <textarea
                  value={labForm.notes}
                  onChange={(e) => setLabForm({ ...labForm, notes: e.target.value })}
                  placeholder="Observaciones de laboratorio, hemograma general..."
                  rows={2}
                  className="w-full rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-3.5 py-2.5 text-white focus:border-[#FF5722] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsLabModalOpen(false)}
                  className="rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-4 py-2 font-semibold text-[#8E8E93] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] px-5 py-2 font-bold text-white shadow-md shadow-[#FF5722]/20"
                >
                  Guardar Análisis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponente ChecklistItem
function ChecklistItem({ item, onToggle }) {
  return (
    <div
      onClick={onToggle}
      className={`rounded-2xl border p-3 flex items-center justify-between gap-3 cursor-pointer transition active:scale-[0.99] ${
        item.taken
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-[#2C2C2E] bg-[#1C1C1E] hover:border-white/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-xl border transition ${
            item.taken
              ? "bg-emerald-500 border-emerald-400 text-black shadow-sm"
              : "border-[#2C2C2E] bg-[#121212] text-transparent"
          }`}
        >
          <Check size={14} strokeWidth={3} />
        </div>
        <div>
          <span
            className={`text-xs font-bold transition ${
              item.taken ? "line-through text-[#8E8E93]" : "text-white"
            }`}
          >
            {item.name}
          </span>
          <span className="block text-[11px] text-[#8E8E93]">{item.dose}</span>
        </div>
      </div>

      <span
        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          item.taken
            ? "bg-emerald-500/20 text-emerald-300"
            : "bg-white/5 text-[#8E8E93]"
        }`}
      >
        {item.taken ? "Completado" : "Pendiente"}
      </span>
    </div>
  );
}
