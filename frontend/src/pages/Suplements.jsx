import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Flame,
  FlaskConical,
  HeartPulse,
  Info,
  Loader2,
  Lock,
  Minus,
  Pencil,
  Pill,
  Plus,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sparkles,
  Sun,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
  Zap,
} from "lucide-react";
import {
  createBloodTest,
  createChemistryCompound,
  createLabAnalysis,
  createSupplement,
  deleteBloodTest,
  deleteChemistryCompound,
  deleteLabAnalysis,
  deleteSupplement,
  getBloodTests,
  getChemistryCompounds,
  getLabAnalyses,
  getSupplements,
  getTodaySupplementChecklist,
  toggleSupplementToday,
  updateChemistryCompound,
  updateLabAnalysis,
  updateSupplement,
  uploadBloodTestPdf,
} from "../api/client";
import { showToast } from "../components/Toast";
import { formatDateSafe, formatLabStudyLabel, getLocalDateString, parseDateSafe } from "../utils/dateUtils";

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

  // 4. ANÁLISIS DE SANGRE (PDF AUTOMÁTICO & MANUAL)
  const [bloodTests, setBloodTests] = useState([]);
  const [selectedBloodTestId, setSelectedBloodTestId] = useState(null);
  const [bloodViewMode, setBloodViewMode] = useState("individual"); // individual | comparativa
  const [compareBaseId, setCompareBaseId] = useState(null);
  const [compareTargetId, setCompareTargetId] = useState(null);
  const [isUploadingBloodPdf, setIsUploadingBloodPdf] = useState(false);
  const [isBloodManualModalOpen, setIsBloodManualModalOpen] = useState(false);
  const bloodPdfInputRef = React.useRef(null);
  const [bloodManualForm, setBloodManualForm] = useState({
    test_date: getLocalDateString(),
    hematocrit: "",
    hemoglobin: "",
    glucose: "",
    creatinine: "",
    urea: "",
    got_ast: "",
    gpt_alt: "",
    cholesterol_total: "",
    cholesterol_hdl: "",
    cholesterol_ldl: "",
    triglycerides: "",
    sodium: "",
    potassium: "",
    notes: "",
  });

  const selectedBloodTest = useMemo(() => {
    if (!bloodTests || bloodTests.length === 0) return null;
    if (selectedBloodTestId) {
      const found = bloodTests.find((t) => t.id === selectedBloodTestId);
      if (found) return found;
    }
    return bloodTests[0];
  }, [bloodTests, selectedBloodTestId]);

  const sortedBloodTestsChronological = useMemo(() => {
    if (!bloodTests || bloodTests.length === 0) return [];
    return [...bloodTests].sort((a, b) => {
      const dateA = parseDateSafe(a.entry_date || a.test_date)?.getTime?.() || 0;
      const dateB = parseDateSafe(b.entry_date || b.test_date)?.getTime?.() || 0;
      return dateA - dateB;
    });
  }, [bloodTests]);

  const compareBaseStudy = useMemo(() => {
    if (sortedBloodTestsChronological.length < 2) return null;
    if (compareBaseId) {
      const found = sortedBloodTestsChronological.find((t) => t.id === compareBaseId);
      if (found) return found;
    }
    return sortedBloodTestsChronological[sortedBloodTestsChronological.length - 2];
  }, [sortedBloodTestsChronological, compareBaseId]);

  const compareTargetStudy = useMemo(() => {
    if (sortedBloodTestsChronological.length < 2) return null;
    if (compareTargetId) {
      const found = sortedBloodTestsChronological.find((t) => t.id === compareTargetId);
      if (found) return found;
    }
    return sortedBloodTestsChronological[sortedBloodTestsChronological.length - 1];
  }, [sortedBloodTestsChronological, compareTargetId]);

  // CARGAR DATOS
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [suppsData, checkData, chemData, labData, bloodData] = await Promise.all([
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
        getBloodTests().catch(() => []),
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
      setBloodTests(bloodData || []);
      if (bloodData && bloodData.length > 0) {
        setSelectedBloodTestId(bloodData[0].id);
      }
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

  // EVALUADOR DE RANGOS DE REFERENCIA CLÍNICOS
  const evaluateRange = (param, value) => {
    if (value === null || value === undefined || value === "") return null;
    const num = parseFloat(value);
    if (isNaN(num)) return null;

    switch (param) {
      case "hematocrit":
        return { isNormal: num >= 39 && num <= 50, rangeStr: "39 - 50 %" };
      case "hemoglobin":
        return { isNormal: num >= 13.0 && num <= 17.5, rangeStr: "13.0 - 17.5 g/dL" };
      case "leukocytes":
        return { isNormal: num >= 4.0 && num <= 10.0, rangeStr: "4.0 - 10.0 x10^3/µL" };
      case "platelets":
        return { isNormal: num >= 150 && num <= 450, rangeStr: "150 - 450 x10^3/µL" };
      case "erythrocyte_sedimentation":
        return { isNormal: num <= 20, rangeStr: "≤ 20 mm/h" };
      case "got_ast":
        return { isNormal: num <= 40, rangeStr: "≤ 40 UI/L" };
      case "gpt_alt":
        return { isNormal: num <= 45, rangeStr: "≤ 45 UI/L" };
      case "bilirubin_total":
        return { isNormal: num <= 1.2, rangeStr: "≤ 1.2 mg/dL" };
      case "alkaline_phosphatase":
        return { isNormal: num >= 40 && num <= 129, rangeStr: "40 - 129 UI/L" };
      case "creatinine":
        return { isNormal: num >= 0.7 && num <= 1.3, rangeStr: "0.7 - 1.3 mg/dL" };
      case "urea":
        return { isNormal: num >= 15 && num <= 45, rangeStr: "15 - 45 mg/dL" };
      case "uric_acid":
        return { isNormal: num >= 3.4 && num <= 7.0, rangeStr: "3.4 - 7.0 mg/dL" };
      case "gfr_mdrd":
        return { isNormal: num >= 60, rangeStr: "≥ 60 mL/min" };
      case "cholesterol_total":
        return { isNormal: num < 200, rangeStr: "< 200 mg/dL" };
      case "cholesterol_hdl":
        return { isNormal: num >= 40, rangeStr: "≥ 40 mg/dL" };
      case "cholesterol_ldl":
        return { isNormal: num < 130, rangeStr: "< 130 mg/dL" };
      case "triglycerides":
        return { isNormal: num < 150, rangeStr: "< 150 mg/dL" };
      case "glucose":
        return { isNormal: num >= 70 && num <= 100, rangeStr: "70 - 100 mg/dL" };
      case "sodium":
        return { isNormal: num >= 135 && num <= 145, rangeStr: "135 - 145 mEq/L" };
      case "potassium":
        return { isNormal: num >= 3.5 && num <= 5.0, rangeStr: "3.5 - 5.0 mEq/L" };
      case "chloride":
        return { isNormal: num >= 98 && num <= 107, rangeStr: "98 - 107 mEq/L" };
      case "aelo":
        return { isNormal: num <= 200, rangeStr: "≤ 200 UI/mL" };
      case "depuration":
        return { isNormal: num >= 60, rangeStr: "≥ 60 mL/min" };
      case "creatinine_urine_24h":
        return { isNormal: num >= 0.8 && num <= 2.0, rangeStr: "0.8 - 2.0 g/24 hs" };
      default:
        return null;
    }
  };

  // SUBIR PDF DE ANÁLISIS DE SANGRE
  const handleBloodPdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      showToast("El archivo debe ser un documento PDF (.pdf)", "error");
      return;
    }

    try {
      setIsUploadingBloodPdf(true);
      const newTest = await uploadBloodTestPdf(file);
      setBloodTests((prev) => [newTest, ...prev]);
      setSelectedBloodTestId(newTest.id);
      showToast("¡Análisis de sangre extraído y guardado!", "success");
    } catch (err) {
      console.error("Error al procesar PDF de sangre:", err);
      showToast("Error al extraer valores del PDF", "error");
    } finally {
      setIsUploadingBloodPdf(false);
      if (bloodPdfInputRef.current) {
        bloodPdfInputRef.current.value = "";
      }
    }
  };

  // GUARDAR ANÁLISIS DE SANGRE MANUAL
  const handleSaveBloodManual = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        test_date: bloodManualForm.test_date || getLocalDateString(),
        hematocrit: bloodManualForm.hematocrit ? parseFloat(bloodManualForm.hematocrit) : null,
        hemoglobin: bloodManualForm.hemoglobin ? parseFloat(bloodManualForm.hemoglobin) : null,
        glucose: bloodManualForm.glucose ? parseFloat(bloodManualForm.glucose) : null,
        creatinine: bloodManualForm.creatinine ? parseFloat(bloodManualForm.creatinine) : null,
        urea: bloodManualForm.urea ? parseFloat(bloodManualForm.urea) : null,
        got_ast: bloodManualForm.got_ast ? parseFloat(bloodManualForm.got_ast) : null,
        gpt_alt: bloodManualForm.gpt_alt ? parseFloat(bloodManualForm.gpt_alt) : null,
        cholesterol_total: bloodManualForm.cholesterol_total ? parseFloat(bloodManualForm.cholesterol_total) : null,
        cholesterol_hdl: bloodManualForm.cholesterol_hdl ? parseFloat(bloodManualForm.cholesterol_hdl) : null,
        cholesterol_ldl: bloodManualForm.cholesterol_ldl ? parseFloat(bloodManualForm.cholesterol_ldl) : null,
        triglycerides: bloodManualForm.triglycerides ? parseFloat(bloodManualForm.triglycerides) : null,
        sodium: bloodManualForm.sodium ? parseFloat(bloodManualForm.sodium) : null,
        potassium: bloodManualForm.potassium ? parseFloat(bloodManualForm.potassium) : null,
        notes: bloodManualForm.notes ? bloodManualForm.notes.trim() : null,
      };

      const created = await createBloodTest(payload);
      setBloodTests((prev) => [created, ...prev]);
      setSelectedBloodTestId(created.id);
      setIsBloodManualModalOpen(false);
      setBloodManualForm({
        test_date: getLocalDateString(),
        hematocrit: "",
        hemoglobin: "",
        glucose: "",
        creatinine: "",
        urea: "",
        got_ast: "",
        gpt_alt: "",
        cholesterol_total: "",
        cholesterol_hdl: "",
        cholesterol_ldl: "",
        triglycerides: "",
        sodium: "",
        potassium: "",
        notes: "",
      });
      showToast("Análisis registrado con éxito", "success");
    } catch (err) {
      console.error("Error guardando análisis manual:", err);
      showToast("Error al guardar análisis", "error");
    }
  };

  // ELIMINAR ANÁLISIS DE SANGRE
  const handleDeleteBloodTest = async (testId) => {
    if (!confirm("¿Eliminar este análisis de sangre del historial?")) return;
    try {
      await deleteBloodTest(testId);
      setBloodTests((prev) => prev.filter((t) => t.id !== testId));
      if (selectedBloodTestId === testId) {
        setSelectedBloodTestId(null);
      }
      showToast("Análisis eliminado", "info");
    } catch (err) {
      console.error("Error al eliminar análisis:", err);
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
    <div className="w-full space-y-6 pb-36 select-none">
      {/* CABECERA OLED */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20">
              <Pill size={18} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0F172A]">
                Módulo Suple & Salud
              </h1>
              <p className="text-xs text-[#64748B]">
                Control diario de suplementación, farmacología y análisis clínicos
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadAllData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:border-slate-100 transition active:scale-95 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* PESTAÑAS SUPERIORES OLED: [ HOY | SUPLEMENTOS | QUÍMICA | ANÁLISIS ] */}
      <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-white border border-slate-100">
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
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                isActive
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50"
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
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-500">
                  Checklist de Hoy
                </span>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  {checklist.completed} de {checklist.total} suplementos consumidos
                </h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-red-500">
                  {checklist.percent}%
                </span>
              </div>
            </div>

            {/* Barra de progreso OLED */}
            <div className="h-3 w-full bg-[#F9FAFB] rounded-full overflow-hidden p-0.5 border border-slate-100">
              <div
                className="h-full rounded-full bg-red-600 hover:bg-red-700 transition-all duration-500 ease-out"
                style={{ width: `${checklist.percent}%` }}
              />
            </div>
          </div>

          {checklist.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-100 bg-white/50 p-8 text-center space-y-3">
              <Pill size={32} className="mx-auto text-[#64748B]" />
              <p className="text-sm font-semibold text-[#0F172A]">No tienes suplementos activos hoy</p>
              <p className="text-xs text-[#64748B]">
                Agrega suplementos en la pestaña "SUPLEMENTOS" para activar tu checklist diario.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("suplementos");
                  setIsSuppModalOpen(true);
                }}
                className="h-11 inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white transition active:scale-95 cursor-pointer"
              >
                <Plus size={14} />
                <span>Crear Suplemento</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bloque Mañana */}
              {groupedChecklist.mañana.length > 0 && (
                <div className="rounded-3xl border border-[#2C2C2E] bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-400">
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
                <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-500">
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
                <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-500">
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
                <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#64748B]">
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
              <h3 className="text-base font-bold text-[#0F172A]">Catálogo de Suplementos</h3>
              <p className="text-xs text-[#64748B]">
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
              className="h-11 flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white transition active:scale-95 cursor-pointer"
            >
              <Plus size={15} />
              <span>Nuevo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {supplements.map((supp) => (
              <div
                key={supp.id}
                className={`rounded-xl border p-4 flex items-center justify-between gap-3 transition ${
                  supp.is_active
                    ? "bg-white border-slate-100"
                    : "bg-white/40 border-slate-100/40 opacity-60"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0F172A] text-sm">{supp.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        supp.timing === "mañana"
                          ? "bg-red-500/10 text-red-400 border border-red-400/20"
                          : supp.timing === "pre_entreno"
                          ? "bg-red-500/10 text-red-500 border border-red-500/20"
                          : "bg-red-500/10 text-red-500 border border-red-500/20"
                      }`}
                    >
                      {supp.timing}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B]">Dosis: {supp.dose}</p>
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
                    className="p-2 text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-slate-50 transition"
                    title="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSupplement(supp.id)}
                    className="p-2 text-[#64748B] hover:text-red-400 rounded-lg hover:bg-red-500/10 transition"
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
          <div className="rounded-xl border border-slate-100 bg-white p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/30 flex-shrink-0">
                <Lock size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Módulo Farmacológico (Privado & Opcional)
                </h4>
                <p className="text-[11px] text-[#64748B]">
                  Registro confidencial de compuestos, dosificación y días de aplicación programados.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsChemistryUnlocked(!isChemistryUnlocked)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
            >
              {isChemistryUnlocked ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{isChemistryUnlocked ? "Ocultar" : "Mostrar"}</span>
            </button>
          </div>

          {isChemistryUnlocked ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Compuestos en Uso</h3>
                  <p className="text-xs text-[#64748B]">
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
                  className="h-11 flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white transition active:scale-95 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Nuevo Compuesto</span>
                </button>
              </div>

              {chemistryList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-100 bg-white/50 p-8 text-center space-y-2">
                  <FlaskConical size={32} className="mx-auto text-[#64748B]" />
                  <p className="text-sm font-semibold text-[#0F172A]">No hay compuestos registrados</p>
                  <p className="text-xs text-[#64748B]">
                    Registra tus compuestos para recibir recordatorios en los días de aplicación programados.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {chemistryList.map((chem) => (
                    <div
                      key={chem.id}
                      className="rounded-xl border border-slate-100 bg-white p-4 space-y-3 shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-[#0F172A] text-base">{chem.name}</h4>
                            {chem.is_application_today && (
                              <span className="flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                💉 HOY TOCA
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-red-500 font-semibold mt-0.5">
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
                            className="p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-slate-50 transition"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteChemistry(chem.id)}
                            className="p-1.5 text-[#64748B] hover:text-red-400 rounded-lg hover:bg-red-500/10 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#F9FAFB] p-2.5 border border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[#64748B]">Días de aplicación:</span>
                        <span className="font-semibold text-[#0F172A]">{chem.application_days}</span>
                      </div>

                      {chem.notes && (
                        <p className="text-[11px] text-[#64748B] italic border-t border-slate-100 pt-2">
                          "{chem.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-100 bg-white p-10 text-center space-y-3">
              <Lock size={32} className="mx-auto text-red-500" />
              <h4 className="text-base font-bold text-[#0F172A]">Sección Farmacológica Oculta</h4>
              <p className="text-xs text-[#64748B]">
                Haz clic en "Mostrar" para acceder al registro de compuestos y recordatorios.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* ==================================================================== */}
      {/* 4. PESTAÑA: ANÁLISIS (BIOMARCADORES, PDF PARSER & RANGOS) */}
      {/* ==================================================================== */}
      {activeTab === "analisis" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* CABECERA DE LA PESTAÑA CON ACCIONES */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <HeartPulse size={18} className="text-red-500" />
                <span>Análisis de Sangre y Laboratorio</span>
              </h3>
              <p className="text-xs text-[#64748B]">
                Lector de PDF con extracción automática de biomarcadores o carga manual
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={bloodPdfInputRef}
                accept=".pdf"
                className="hidden"
                onChange={handleBloodPdfUpload}
              />
              <button
                type="button"
                onClick={() => bloodPdfInputRef.current?.click()}
                disabled={isUploadingBloodPdf}
                className="h-11 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-none disabled:opacity-50"
              >
                {isUploadingBloodPdf ? (
                  <Loader2 size={16} className="animate-spin text-black" />
                ) : (
                  <FileText size={16} />
                )}
                <span>📄 Subir PDF de Análisis de Sangre</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBloodManualForm({
                    test_date: getLocalDateString(),
                    hematocrit: "",
                    hemoglobin: "",
                    glucose: "",
                    creatinine: "",
                    urea: "",
                    got_ast: "",
                    gpt_alt: "",
                    cholesterol_total: "",
                    cholesterol_hdl: "",
                    cholesterol_ldl: "",
                    triglycerides: "",
                    sodium: "",
                    potassium: "",
                    notes: "",
                  });
                  setIsBloodManualModalOpen(true);
                }}
                className="h-11 px-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:border-red-500/40 text-[#0F172A] font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Plus size={15} className="text-red-500" />
                <span>＋ Cargar a mano</span>
              </button>
            </div>
          </div>

          {/* SPINNER / BARRA DE CARGA AL SUBIR PDF */}
          {isUploadingBloodPdf && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 flex items-center gap-3">
              <Loader2 className="animate-spin text-red-500 flex-shrink-0" size={24} />
              <div>
                <p className="text-xs font-bold text-[#0F172A]">Extrayendo valores de laboratorio...</p>
                <p className="text-[11px] text-[#64748B]">
                  El motor analiza el documento PDF para detectar Hemograma, Transaminasas, Riñón, Perfil Lipídico y Electrolitos.
                </p>
              </div>
            </div>
          )}

          {/* BANNER DE ALERTA DE TIEMPO TRANSCURRIDO OLED */}
          <div
            className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl ${
              bloodTests.length > 0 || labSummary.alert_level === "ok"
                ? "border-red-500/30 bg-red-500/10 text-red-500"
                : "border-red-400/30 bg-red-500/10 text-red-400"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl flex-shrink-0 ${
                  bloodTests.length > 0 || labSummary.alert_level === "ok"
                    ? "bg-red-500/20 text-red-500"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                <HeartPulse size={22} />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F172A]/70">
                  Control Analítico & Salud Sistémica
                </span>
                <h4 className="text-sm font-bold text-[#0F172A]">
                  {bloodTests.length > 0
                    ? `Tienes ${bloodTests.length} análisis de sangre registrado${bloodTests.length > 1 ? "s" : ""}. Último chequeo: ${formatLabStudyLabel(bloodTests[0])}.`
                    : labSummary.alert_message}
                </h4>
              </div>
            </div>
          </div>

          {/* TOGGLE MODO INDIVIDUAL VS MODO COMPARATIVA (SI HAY 2 O MÁS ESTUDIOS) */}
          {bloodTests.length >= 2 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-2xl bg-white border border-slate-100">
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setBloodViewMode("individual")}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    bloodViewMode === "individual"
                      ? "bg-[#26262B] text-[#0F172A] shadow-sm border border-[#3E3E44]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <FileText size={15} />
                  <span>📄 Ver Análisis Individual</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBloodViewMode("comparativa")}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    bloodViewMode === "comparativa"
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-sm font-extrabold"
                      : "text-red-500/80 hover:text-red-500"
                  }`}
                >
                  <Scale size={15} />
                  <span>⚖️ Modo Comparativa</span>
                </button>
              </div>

              <span className="text-[11px] text-[#64748B] px-2 hidden md:inline">
                {bloodViewMode === "comparativa" ? "Comparación evolutiva de biomarcadores" : "Estudio individual y parámetros completos"}
              </span>
            </div>
          )}

          {/* VISTA PRINCIPAL DE ANÁLISIS (INDIVIDUAL O COMPARATIVA) */}
          {bloodTests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-100 bg-white/50 p-8 text-center space-y-3">
              <Activity size={32} className="mx-auto text-[#64748B]" />
              <p className="text-sm font-semibold text-[#0F172A]">
                No tienes análisis de sangre registrados
              </p>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                Sube tu informe en PDF para extraer de forma automática Hemograma, Transaminasas, Riñón, Perfil Lipídico, Clearance 24h e Inmunología, o regístralo manualmente.
              </p>
            </div>
          ) : bloodViewMode === "comparativa" && bloodTests.length >= 2 ? (
            <BloodTestComparisonView
              baseStudy={compareBaseStudy}
              targetStudy={compareTargetStudy}
              allStudies={sortedBloodTestsChronological}
              setCompareBaseId={setCompareBaseId}
              setCompareTargetId={setCompareTargetId}
            />
          ) : (
            <BloodTestIndividualView
              selectedBloodTest={selectedBloodTest}
              bloodTests={bloodTests}
              setSelectedBloodTestId={setSelectedBloodTestId}
              evaluateRange={evaluateRange}
            />
          )}

          {/* HISTORIAL COMPLETO DE ANÁLISIS DE SANGRE */}
          {bloodTests.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-bold text-[#0F172A]">
                Historial de Analíticas ({bloodTests.length})
              </h4>
              <div className="space-y-2">
                {bloodTests.map((test) => (
                  <div
                    key={test.id}
                    className={`rounded-2xl border p-3.5 flex items-center justify-between gap-3 transition cursor-pointer ${
                      selectedBloodTest?.id === test.id
                        ? "border-red-500/50 bg-white"
                        : "border-slate-100 bg-white/60 hover:border-slate-100"
                    }`}
                    onClick={() => {
                      setSelectedBloodTestId(test.id);
                      setBloodViewMode("individual");
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-[#F9FAFB] border border-slate-100 flex items-center justify-center text-xs font-bold text-red-500">
                        📄
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0F172A]">
                            {formatLabStudyLabel(test)}
                          </span>
                          {test.pdf_filename && (
                            <span className="text-[10px] text-[#64748B] bg-[#F9FAFB] px-2 py-0.2 rounded-full border border-slate-100">
                              PDF
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#64748B]">
                          Hto: {test.hematocrit ? `${test.hematocrit}%` : "-"} · Hb: {test.hemoglobin ? `${test.hemoglobin}g/dL` : "-"} · Col: {test.cholesterol_total ? `${test.cholesterol_total}mg/dL` : "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleDeleteBloodTest(test.id)}
                        className="p-2 text-[#64748B] hover:text-red-400 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                        title="Eliminar análisis"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
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
          <div className="w-full max-w-md rounded-3xl border border-[#2C2C2E] bg-slate-50 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0F172A]">
                {editingSupp ? "Editar Suplemento" : "Nuevo Suplemento"}
              </h3>
              <button
                type="button"
                onClick={() => setIsSuppModalOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSupplement} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#64748B] font-semibold mb-1">Nombre</label>
                <input
                  type="text"
                  value={suppForm.name}
                  onChange={(e) => setSuppForm({ ...suppForm, name: e.target.value })}
                  placeholder="Ej: Creatina Creapure, Omega 3, Vitamina D3"
                  className="w-full rounded-xl border border-[#2C2C2E] bg-white px-3.5 py-2.5 text-[#0F172A] focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[#64748B] font-semibold mb-1">Dosis habitual</label>
                <input
                  type="text"
                  value={suppForm.dose}
                  onChange={(e) => setSuppForm({ ...suppForm, dose: e.target.value })}
                  placeholder="Ej: 5g, 2 cápsulas (2000 UI)"
                  className="w-full rounded-xl border border-[#2C2C2E] bg-white px-3.5 py-2.5 text-[#0F172A] focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[#64748B] font-semibold mb-1">Momento de ingesta (Timing)</label>
                <select
                  value={suppForm.timing}
                  onChange={(e) => setSuppForm({ ...suppForm, timing: e.target.value })}
                  className="w-full rounded-xl border border-[#2C2C2E] bg-white px-3.5 py-2.5 text-[#0F172A] focus:border-red-500 focus:outline-none"
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
                  className="rounded border-[#2C2C2E] accent-[#EF4444]"
                />
                <label htmlFor="supp_active" className="text-[#0F172A] font-semibold">
                  Activo en checklist diario
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsSuppModalOpen(false)}
                  className="rounded-xl border border-[#2C2C2E] bg-white px-4 py-2 font-semibold text-[#64748B] hover:text-[#0F172A]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-11 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2 font-bold text-white transition active:scale-95 cursor-pointer"
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
          <div className="w-full max-w-md rounded-3xl border border-[#2C2C2E] bg-slate-50 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0F172A]">
                {editingChem ? "Editar Compuesto" : "Nuevo Compuesto"}
              </h3>
              <button
                type="button"
                onClick={() => setIsChemModalOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveChemistry} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#64748B] font-semibold mb-1">Compuesto</label>
                <input
                  type="text"
                  value={chemForm.name}
                  onChange={(e) => setChemForm({ ...chemForm, name: e.target.value })}
                  placeholder="Ej: Testosterona Enantato, Nandrolona"
                  className="w-full rounded-xl border border-[#2C2C2E] bg-white px-3.5 py-2.5 text-[#0F172A] focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#64748B] font-semibold mb-1">Dosis semanal</label>
                  <input
                    type="text"
                    value={chemForm.weekly_dose}
                    onChange={(e) => setChemForm({ ...chemForm, weekly_dose: e.target.value })}
                    placeholder="Ej: 250"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-white px-3.5 py-2.5 text-[#0F172A] focus:border-red-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] font-semibold mb-1">Unidad</label>
                  <select
                    value={chemForm.dose_unit}
                    onChange={(e) => setChemForm({ ...chemForm, dose_unit: e.target.value })}
                    className="w-full rounded-xl border border-[#2C2C2E] bg-white px-3.5 py-2.5 text-[#0F172A] focus:border-red-500 focus:outline-none"
                  >
                    <option value="mg">mg</option>
                    <option value="ml">ml</option>
                    <option value="UI">UI</option>
                    <option value="mcg">mcg</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#64748B] font-semibold mb-1">Días de aplicación (Recordatorio)</label>
                <input
                  type="text"
                  value={chemForm.application_days}
                  onChange={(e) => setChemForm({ ...chemForm, application_days: e.target.value })}
                  placeholder="Ej: Lunes, Jueves"
                  className="w-full rounded-xl border border-[#2C2C2E] bg-white px-3.5 py-2.5 text-[#0F172A] focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[#64748B] font-semibold mb-1">Notas / Semana de ciclo</label>
                <textarea
                  value={chemForm.notes}
                  onChange={(e) => setChemForm({ ...chemForm, notes: e.target.value })}
                  placeholder="Ej: Semana 6 de 12. Laboratorio X."
                  rows={2}
                  className="w-full rounded-xl border border-[#2C2C2E] bg-white px-3.5 py-2.5 text-[#0F172A] focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsChemModalOpen(false)}
                  className="rounded-xl border border-[#2C2C2E] bg-white px-4 py-2 font-semibold text-[#64748B] hover:text-[#0F172A]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-11 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2 font-bold text-white transition active:scale-95 cursor-pointer"
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
          <div className="w-full max-w-lg rounded-3xl border border-[#2C2C2E] bg-slate-50 p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0F172A]">
                {editingLab ? "Editar Análisis" : "Registrar Análisis de Sangre"}
              </h3>
              <button
                type="button"
                onClick={() => setIsLabModalOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLab} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#64748B] font-semibold mb-1">Fecha del análisis</label>
                <input
                  type="date"
                  value={labForm.date}
                  onChange={(e) => setLabForm({ ...labForm, date: e.target.value })}
                  className="w-full rounded-xl border border-[#2C2C2E] bg-white px-3.5 py-2.5 text-[#0F172A] focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#64748B] font-semibold mb-1">Hematocrito (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labForm.hematocrit}
                    onChange={(e) => setLabForm({ ...labForm, hematocrit: e.target.value })}
                    placeholder="Ref: 40-52%"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-white px-3 py-2 text-[#0F172A] focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] font-semibold mb-1">Testosterona (ng/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labForm.testosterone}
                    onChange={(e) => setLabForm({ ...labForm, testosterone: e.target.value })}
                    placeholder="Ref: 300-1000"
                    className="w-full rounded-xl border border-[#2C2C2E] bg-white px-3 py-2 text-[#0F172A] focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#64748B] font-semibold mb-1">GOT / AST (U/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labForm.got_ast}
                    onChange={(e) => setLabForm({ ...labForm, got_ast: e.target.value })}
                    placeholder="Transaminasa AST"
                    className="w-full rounded-xl border border-slate-100 bg-[#F9FAFB] px-3 py-2 text-[#0F172A] focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] font-semibold mb-1">GPT / ALT (U/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labForm.gpt_alt}
                    onChange={(e) => setLabForm({ ...labForm, gpt_alt: e.target.value })}
                    placeholder="Transaminasa ALT"
                    className="w-full rounded-xl border border-slate-100 bg-[#F9FAFB] px-3 py-2 text-[#0F172A] focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[#64748B] font-semibold mb-1">HDL (mg/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labForm.hdl}
                    onChange={(e) => setLabForm({ ...labForm, hdl: e.target.value })}
                    placeholder="HDL"
                    className="w-full rounded-xl border border-slate-100 bg-[#F9FAFB] px-2.5 py-2 text-[#0F172A] focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] font-semibold mb-1">LDL (mg/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labForm.ldl}
                    onChange={(e) => setLabForm({ ...labForm, ldl: e.target.value })}
                    placeholder="LDL"
                    className="w-full rounded-xl border border-slate-100 bg-[#F9FAFB] px-2.5 py-2 text-[#0F172A] focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] font-semibold mb-1">Triglicéridos</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labForm.triglycerides}
                    onChange={(e) => setLabForm({ ...labForm, triglycerides: e.target.value })}
                    placeholder="TG"
                    className="w-full rounded-xl border border-slate-100 bg-[#F9FAFB] px-2.5 py-2 text-[#0F172A] focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#64748B] font-semibold mb-1">Notas clínicas / Médico</label>
                <textarea
                  value={labForm.notes}
                  onChange={(e) => setLabForm({ ...labForm, notes: e.target.value })}
                  placeholder="Observaciones de laboratorio, hemograma general..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-100 bg-[#F9FAFB] px-3.5 py-2.5 text-[#0F172A] focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsLabModalOpen(false)}
                  className="h-11 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 font-semibold text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-11 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2 font-bold text-white transition active:scale-95 cursor-pointer"
                >
                  Guardar Análisis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ==================================================================== */}
      {/* MODAL CARGA MANUAL DE ANÁLISIS DE SANGRE */}
      {/* ==================================================================== */}
      {isBloodManualModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md sm:max-w-lg bg-white border border-slate-100 rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[88dvh] overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-[#0F172A]">
                Cargar Análisis de Sangre Manual
              </h3>
              <button
                type="button"
                onClick={() => setIsBloodManualModalOpen(false)}
                className="p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-slate-50 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBloodManual} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 space-y-3.5 flex-1 overflow-y-auto overscroll-contain text-xs">
                <div>
                  <label className="block text-[#64748B] font-semibold mb-1">Fecha del Análisis</label>
                  <input
                    type="date"
                    value={bloodManualForm.test_date}
                    onChange={(e) => setBloodManualForm({ ...bloodManualForm, test_date: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-3.5 text-[#0F172A] focus:border-red-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Hemograma */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                    Hemograma
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[#64748B] mb-1">Hematocrito (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bloodManualForm.hematocrit}
                        onChange={(e) => setBloodManualForm({ ...bloodManualForm, hematocrit: e.target.value })}
                        placeholder="Ej: 45.0"
                        className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-3 text-[#0F172A] focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[#64748B] mb-1">Hemoglobina (g/dL)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bloodManualForm.hemoglobin}
                        onChange={(e) => setBloodManualForm({ ...bloodManualForm, hemoglobin: e.target.value })}
                        placeholder="Ej: 15.2"
                        className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-3 text-[#0F172A] focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Transaminasas */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                    Hígado (Transaminasas)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[#64748B] mb-1">GOT / AST (UI/L)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bloodManualForm.got_ast}
                        onChange={(e) => setBloodManualForm({ ...bloodManualForm, got_ast: e.target.value })}
                        placeholder="Ej: 24"
                        className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-3 text-[#0F172A] focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[#64748B] mb-1">GPT / ALT (UI/L)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bloodManualForm.gpt_alt}
                        onChange={(e) => setBloodManualForm({ ...bloodManualForm, gpt_alt: e.target.value })}
                        placeholder="Ej: 28"
                        className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-3 text-[#0F172A] focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Riñón */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                    Riñón
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[#64748B] mb-1">Creatinina (mg/dL)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={bloodManualForm.creatinine}
                        onChange={(e) => setBloodManualForm({ ...bloodManualForm, creatinine: e.target.value })}
                        placeholder="Ej: 0.95"
                        className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-3 text-[#0F172A] focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[#64748B] mb-1">Uremia (mg/dL)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bloodManualForm.urea}
                        onChange={(e) => setBloodManualForm({ ...bloodManualForm, urea: e.target.value })}
                        placeholder="Ej: 32"
                        className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-3 text-[#0F172A] focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Perfil Lipídico */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                    Perfil Lipídico
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[#64748B] mb-1">Colesterol Total</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bloodManualForm.cholesterol_total}
                        onChange={(e) => setBloodManualForm({ ...bloodManualForm, cholesterol_total: e.target.value })}
                        placeholder="mg/dL"
                        className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-3 text-[#0F172A] focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[#64748B] mb-1">Colesterol HDL</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bloodManualForm.cholesterol_hdl}
                        onChange={(e) => setBloodManualForm({ ...bloodManualForm, cholesterol_hdl: e.target.value })}
                        placeholder="mg/dL"
                        className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-3 text-[#0F172A] focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[#64748B] mb-1">Colesterol LDL</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bloodManualForm.cholesterol_ldl}
                        onChange={(e) => setBloodManualForm({ ...bloodManualForm, cholesterol_ldl: e.target.value })}
                        placeholder="mg/dL"
                        className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-3 text-[#0F172A] focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[#64748B] mb-1">Triglicéridos</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bloodManualForm.triglycerides}
                        onChange={(e) => setBloodManualForm({ ...bloodManualForm, triglycerides: e.target.value })}
                        placeholder="mg/dL"
                        className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-3 text-[#0F172A] focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Electrolitos & Glucosa */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                    Electrolitos & Glucosa
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[#64748B] mb-1">Glucemia</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bloodManualForm.glucose}
                        onChange={(e) => setBloodManualForm({ ...bloodManualForm, glucose: e.target.value })}
                        placeholder="mg/dL"
                        className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-2.5 text-[#0F172A] focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[#64748B] mb-1">Sodio (Na)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bloodManualForm.sodium}
                        onChange={(e) => setBloodManualForm({ ...bloodManualForm, sodium: e.target.value })}
                        placeholder="mEq/L"
                        className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-2.5 text-[#0F172A] focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[#64748B] mb-1">Potasio (K)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bloodManualForm.potassium}
                        onChange={(e) => setBloodManualForm({ ...bloodManualForm, potassium: e.target.value })}
                        placeholder="mEq/L"
                        className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] px-2.5 text-[#0F172A] focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[#64748B] mb-1">Notas u observaciones</label>
                  <textarea
                    value={bloodManualForm.notes}
                    onChange={(e) => setBloodManualForm({ ...bloodManualForm, notes: e.target.value })}
                    placeholder="Médico solicitante, indicaciones..."
                    rows={2}
                    className="w-full rounded-xl border border-slate-100 bg-[#F9FAFB] px-3.5 py-2 text-[#0F172A] focus:border-red-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-white flex gap-2.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBloodManualModalOpen(false)}
                  className="h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 font-semibold text-xs text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-12 flex-1 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-xs text-white transition active:scale-95 cursor-pointer shadow-none"
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

// Subcomponente LabMetricCard
function LabMetricCard({ label, value, valueText, unit, param, evaluateRange, customRef }) {
  const evalResult = evaluateRange ? evaluateRange(param, value) : null;
  const hasValue = (value !== null && value !== undefined && value !== "") || Boolean(valueText);
  const displayVal = valueText || (hasValue ? value : "-");

  return (
    <div className="rounded-xl border border-slate-100 bg-[#F9FAFB] p-3 flex flex-col justify-between space-y-2">
      <div className="flex items-start justify-between gap-1">
        <span className="text-[11px] font-semibold text-[#64748B]">{label}</span>
        {hasValue && evalResult && (
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider flex-shrink-0 ${
              evalResult.isNormal
                ? "bg-red-500/15 text-red-500 border border-red-500/30"
                : "bg-red-500/10 text-red-400 border border-red-400/30"
            }`}
          >
            {evalResult.isNormal ? "Normal" : "Atención"}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-base font-mono font-bold text-[#0F172A]">
          {displayVal}
        </span>
        {hasValue && unit && !valueText && (
          <span className="text-[10px] text-[#64748B]">{unit}</span>
        )}
      </div>

      {(evalResult || customRef) && (
        <span className="text-[9px] text-[#64748B]">
          Ref: {customRef || evalResult?.rangeStr}
        </span>
      )}
    </div>
  );
}

// Biomarcadores estándar para seguimiento evolutivo
const ALL_COMPARABLE_BIOMARKERS = [
  // Hemograma
  { key: "hematocrit", label: "Hematocrito", unit: "%", section: "Hemograma", direction: "stable", tolerance: 1.5, decimals: 1 },
  { key: "hemoglobin", label: "Hemoglobina", unit: "g/dL", section: "Hemograma", direction: "stable", tolerance: 0.5, decimals: 1 },
  { key: "leukocytes", label: "Leucocitos", unit: "x10^3/µL", section: "Hemograma", direction: "stable", tolerance: 0.8, decimals: 2 },
  { key: "platelets", label: "Plaquetas", unit: "x10^3/µL", section: "Hemograma", direction: "stable", tolerance: 20, decimals: 0 },
  { key: "erythrocyte_sedimentation", label: "Eritrosedimentación", unit: "mm/h", section: "Hemograma", direction: "lower", tolerance: 2, decimals: 0 },

  // Riñón & Química
  { key: "glucose", label: "Glucemia", unit: "mg/dL", section: "Riñón & Química", direction: "stable", tolerance: 6, decimals: 1 },
  { key: "urea", label: "Uremia", unit: "mg/dL", section: "Riñón & Química", direction: "lower", tolerance: 3, decimals: 2 },
  { key: "creatinine", label: "Creatinina", unit: "mg/dL", section: "Riñón & Química", direction: "stable", tolerance: 0.15, decimals: 2 },
  { key: "uric_acid", label: "Ácido Úrico en Suero", unit: "mg/dL", section: "Riñón & Química", direction: "lower", tolerance: 0.4, decimals: 2 },
  { key: "gfr_mdrd", label: "Filtrado Glomerular (MDRD)", unit: "mL/min", section: "Riñón & Química", direction: "higher", tolerance: 5, decimals: 1 },

  // Hepatograma
  { key: "got_ast", label: "GOT / AST", unit: "UI/L", section: "Hepatograma", direction: "lower", tolerance: 2.5, decimals: 2 },
  { key: "gpt_alt", label: "GPT / ALT", unit: "UI/L", section: "Hepatograma", direction: "lower", tolerance: 2.5, decimals: 2 },
  { key: "bilirubin_total", label: "Bilirrubina Total", unit: "mg/dL", section: "Hepatograma", direction: "lower", tolerance: 0.1, decimals: 2 },
  { key: "bilirubin_direct", label: "Bilirrubina Directa", unit: "mg/dL", section: "Hepatograma", direction: "lower", tolerance: 0.05, decimals: 2 },
  { key: "bilirubin_indirect", label: "Bilirrubina Indirecta", unit: "mg/dL", section: "Hepatograma", direction: "lower", tolerance: 0.05, decimals: 2 },
  { key: "alkaline_phosphatase", label: "Fosfatasa Alcalina", unit: "UI/L", section: "Hepatograma", direction: "lower", tolerance: 5, decimals: 1 },

  // Perfil Lipídico
  { key: "cholesterol_total", label: "Colesterol Total", unit: "mg/dL", section: "Perfil Lipídico", direction: "lower", tolerance: 4, decimals: 2 },
  { key: "cholesterol_hdl", label: "Colesterol HDL", unit: "mg/dL", section: "Perfil Lipídico", direction: "higher", tolerance: 3, decimals: 2 },
  { key: "cholesterol_ldl", label: "Colesterol LDL", unit: "mg/dL", section: "Perfil Lipídico", direction: "lower", tolerance: 4, decimals: 2 },
  { key: "triglycerides", label: "Triglicéridos", unit: "mg/dL", section: "Perfil Lipídico", direction: "lower", tolerance: 5, decimals: 2 },

  // Electrolitos
  { key: "sodium", label: "Sodio (Na)", unit: "mEq/L", section: "Electrolitos", direction: "stable", tolerance: 2.5, decimals: 1 },
  { key: "potassium", label: "Potasio (K)", unit: "mEq/L", section: "Electrolitos", direction: "stable", tolerance: 0.3, decimals: 2 },
  { key: "chloride", label: "Cloro (Cl)", unit: "mEq/L", section: "Electrolitos", direction: "stable", tolerance: 2.5, decimals: 1 },

  // Clearance 24h
  { key: "diuresis", label: "Diuresis 24h", unit: "mL", section: "Clearance 24h", direction: "stable", tolerance: 200, decimals: 0 },
  { key: "creatinine_urine_24h", label: "Creatinina en orina 24 hs", unit: "g/24 hs", section: "Clearance 24h", direction: "stable", tolerance: 0.3, decimals: 2 },
  { key: "depuration", label: "Depuración de creatinina", unit: "mL/min", section: "Clearance 24h", direction: "higher", tolerance: 10, decimals: 2 },
  { key: "dce_sup_corp", label: "DCE Corr. sup. Corporal", unit: "mL/min", section: "Clearance 24h", direction: "higher", tolerance: 10, decimals: 2 },
  { key: "creatininuria", label: "Creatininuria", unit: "mg/dL", section: "Clearance 24h", direction: "stable", tolerance: 10, decimals: 1 },
  { key: "creatinine_excretion", label: "Excreción de Creatinina", unit: "mg/Kg/24 hs", section: "Clearance 24h", direction: "stable", tolerance: 5, decimals: 2 },

  // Inmunología
  { key: "aelo", label: "AELO Cuantitativo", unit: "UI/mL", section: "Inmunología", direction: "lower", tolerance: 20, decimals: 1 },
];

function getStudyBiomarkerValue(study, key) {
  if (!study) return null;
  if (study[key] !== null && study[key] !== undefined && study[key] !== "") {
    const n = parseFloat(study[key]);
    if (!isNaN(n)) return n;
  }
  const dj = study.data_json;
  if (dj) {
    if (dj[key] !== null && dj[key] !== undefined && dj[key] !== "") {
      const n = typeof dj[key] === "number" ? dj[key] : parseFloat(dj[key]);
      if (!isNaN(n)) return n;
    }
    if (dj.clearance_creatinina?.[key]?.value !== undefined) {
      const n = parseFloat(dj.clearance_creatinina[key].value);
      if (!isNaN(n)) return n;
    }
    if (dj.inmunologia?.[key]?.value !== undefined) {
      const n = parseFloat(dj.inmunologia[key].value);
      if (!isNaN(n)) return n;
    }
    if (dj.electrolitos?.[key]?.value !== undefined) {
      const n = parseFloat(dj.electrolitos[key].value);
      if (!isNaN(n)) return n;
    }
    for (const sKey of Object.keys(dj.sections || {})) {
      const item = dj.sections[sKey]?.items?.[key];
      if (item?.value !== undefined && item?.value !== null && item?.value !== "") {
        const n = parseFloat(item.value);
        if (!isNaN(n)) return n;
      }
    }
  }
  return null;
}

function computeEvolutionBadge(bio, valOld, valNew) {
  const diff = valNew - valOld;
  const absDiff = Math.abs(diff);
  const tol = bio.tolerance ?? 0.1;

  if (absDiff <= tol) {
    return {
      type: "stable",
      text: "📊 Estable",
      className: "bg-[#26262B] text-zinc-300 border border-[#3E3E44]",
    };
  }

  const sign = diff > 0 ? "+" : "-";
  const formattedDiff = `${sign}${absDiff.toFixed(bio.decimals === 0 ? 0 : 1)} ${bio.unit}`;

  if (bio.direction === "lower") {
    if (diff < 0) {
      const isLipidImprovement = ["cholesterol_total", "cholesterol_ldl", "triglycerides"].includes(bio.key);
      return {
        type: "improvement",
        text: `📉 ${formattedDiff}${isLipidImprovement ? " Mejora" : ""}`,
        className: "bg-red-500/15 text-red-500 border border-red-500/30 font-bold",
      };
    } else {
      return {
        type: "worse",
        text: `📈 ${formattedDiff}`,
        className: "bg-red-500/10 text-red-400 border border-red-400/30 font-semibold",
      };
    }
  } else if (bio.direction === "higher") {
    if (diff > 0) {
      return {
        type: "improvement",
        text: `📈 ${formattedDiff} Mejora`,
        className: "bg-red-500/15 text-red-500 border border-red-500/30 font-bold",
      };
    } else {
      return {
        type: "worse",
        text: `📉 ${formattedDiff}`,
        className: "bg-red-500/10 text-red-400 border border-red-400/30 font-semibold",
      };
    }
  } else {
    // stable expected
    return {
      type: "change",
      text: `${diff > 0 ? "📈" : "📉"} ${formattedDiff}`,
      className: "bg-sky-500/15 text-sky-400 border border-sky-500/30 font-medium",
    };
  }
}

// Subcomponente Vista Individual con Renderizado Dinámico por Bloques
function BloodTestIndividualView({
  selectedBloodTest,
  bloodTests,
  setSelectedBloodTestId,
  evaluateRange,
}) {
  if (!selectedBloodTest) return null;

  const patient = selectedBloodTest.data_json?.patient || {};

  // 1. Hemograma
  const hematocrit = getStudyBiomarkerValue(selectedBloodTest, "hematocrit");
  const hemoglobin = getStudyBiomarkerValue(selectedBloodTest, "hemoglobin");
  const leukocytes = getStudyBiomarkerValue(selectedBloodTest, "leukocytes");
  const platelets = getStudyBiomarkerValue(selectedBloodTest, "platelets");
  const erythrocyteSed = getStudyBiomarkerValue(selectedBloodTest, "erythrocyte_sedimentation");
  const hasHemograma = [hematocrit, hemoglobin, leukocytes, platelets, erythrocyteSed].some((v) => v !== null);

  // 2. Hepatograma
  const gotAst = getStudyBiomarkerValue(selectedBloodTest, "got_ast");
  const gptAlt = getStudyBiomarkerValue(selectedBloodTest, "gpt_alt");
  const bilirubinTotal = getStudyBiomarkerValue(selectedBloodTest, "bilirubin_total");
  const bilirubinDirect = getStudyBiomarkerValue(selectedBloodTest, "bilirubin_direct");
  const bilirubinIndirect = getStudyBiomarkerValue(selectedBloodTest, "bilirubin_indirect");
  const alkalinePhosphatase = getStudyBiomarkerValue(selectedBloodTest, "alkaline_phosphatase");
  const hasHepatograma = [gotAst, gptAlt, bilirubinTotal, bilirubinDirect, bilirubinIndirect, alkalinePhosphatase].some((v) => v !== null);

  // 3. Riñón & Química
  const creatinine = getStudyBiomarkerValue(selectedBloodTest, "creatinine");
  const urea = getStudyBiomarkerValue(selectedBloodTest, "urea");
  const glucose = getStudyBiomarkerValue(selectedBloodTest, "glucose");
  const uricAcid = getStudyBiomarkerValue(selectedBloodTest, "uric_acid");
  const gfrMdrd = getStudyBiomarkerValue(selectedBloodTest, "gfr_mdrd");
  const hasQuimica = [creatinine, urea, glucose, uricAcid, gfrMdrd].some((v) => v !== null);

  // 4. Perfil Lipídico
  const cholesterolTotal = getStudyBiomarkerValue(selectedBloodTest, "cholesterol_total");
  const cholesterolHdl = getStudyBiomarkerValue(selectedBloodTest, "cholesterol_hdl");
  const cholesterolLdl = getStudyBiomarkerValue(selectedBloodTest, "cholesterol_ldl");
  const triglycerides = getStudyBiomarkerValue(selectedBloodTest, "triglycerides");
  const hasLipidos = [cholesterolTotal, cholesterolHdl, cholesterolLdl, triglycerides].some((v) => v !== null);

  // 5. Electrolitos
  const sodium = getStudyBiomarkerValue(selectedBloodTest, "sodium");
  const potassium = getStudyBiomarkerValue(selectedBloodTest, "potassium");
  const chloride = getStudyBiomarkerValue(selectedBloodTest, "chloride");
  const hasElectrolitos = [sodium, potassium, chloride].some((v) => v !== null);

  // 6. Clearance 24h
  const diuresis = getStudyBiomarkerValue(selectedBloodTest, "diuresis");
  const creatinineUrine24h = getStudyBiomarkerValue(selectedBloodTest, "creatinine_urine_24h");
  const depuration = getStudyBiomarkerValue(selectedBloodTest, "depuration");
  const dceSupCorp = getStudyBiomarkerValue(selectedBloodTest, "dce_sup_corp");
  const creatininuria = getStudyBiomarkerValue(selectedBloodTest, "creatininuria");
  const creatinineExcretion = getStudyBiomarkerValue(selectedBloodTest, "creatinine_excretion");
  const hasClearance = [diuresis, creatinineUrine24h, depuration, dceSupCorp, creatininuria, creatinineExcretion].some((v) => v !== null);

  // 7. Inmunología
  const aelo = getStudyBiomarkerValue(selectedBloodTest, "aelo");
  const hiv =
    selectedBloodTest.data_json?.inmunologia?.hiv?.value_text ||
    selectedBloodTest.data_json?.sections?.inmunologia?.items?.hiv?.value_text ||
    null;
  const hasInmuno = aelo !== null || Boolean(hiv);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-5">
      {/* Cabecera del estudio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-600 hover:bg-red-700" />
          <h4 className="text-sm sm:text-base font-bold text-[#0F172A]">
            {formatLabStudyLabel(selectedBloodTest)}
          </h4>
          {selectedBloodTest.pdf_filename && (
            <span className="text-[10px] text-[#64748B] bg-[#F9FAFB] px-2.5 py-0.5 rounded-full border border-slate-100">
              📄 {selectedBloodTest.pdf_filename}
            </span>
          )}
        </div>

        {bloodTests.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#64748B]">Estudio:</span>
            <select
              value={selectedBloodTest.id}
              onChange={(e) => setSelectedBloodTestId(parseInt(e.target.value, 10))}
              className="bg-[#F9FAFB] border border-slate-100 text-[#0F172A] rounded-lg px-2.5 py-1.5 text-xs focus:border-red-500 focus:outline-none"
            >
              {bloodTests.map((t) => (
                <option key={t.id} value={t.id}>
                  {formatLabStudyLabel(t)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Datos del paciente si están presentes */}
      {(patient.name || patient.dni || patient.birth_date || selectedBloodTest.birth_date || selectedBloodTest.petition_number) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs bg-[#F9FAFB] px-3.5 py-2.5 rounded-xl border border-slate-100 text-[#64748B]">
          {patient.name && (
            <span><strong className="text-[#0F172A] font-medium">Paciente:</strong> {patient.name}</span>
          )}
          {patient.dni && (
            <span><strong className="text-[#0F172A] font-medium">DNI:</strong> <span className="font-mono text-zinc-300">{patient.dni}</span></span>
          )}
          {(patient.birth_date || selectedBloodTest.birth_date) && (
            <span><strong className="text-[#0F172A] font-medium">F. Nacimiento:</strong> <span className="font-mono text-zinc-300">{formatDateSafe(patient.birth_date || selectedBloodTest.birth_date)}</span></span>
          )}
          {(patient.petition_number || selectedBloodTest.petition_number) && (
            <span><strong className="text-[#0F172A] font-medium">Petición:</strong> <span className="font-mono text-red-500">#{patient.petition_number || selectedBloodTest.petition_number}</span></span>
          )}
        </div>
      )}

      {/* BLOQUE 1: HEMOGRAMA */}
      {hasHemograma && (
        <div className="space-y-2.5">
          <h5 className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
            <span>🩸</span> Hemograma
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {hematocrit !== null && <LabMetricCard label="Hematocrito" value={hematocrit} unit="%" param="hematocrit" evaluateRange={evaluateRange} />}
            {hemoglobin !== null && <LabMetricCard label="Hemoglobina" value={hemoglobin} unit="g/dL" param="hemoglobin" evaluateRange={evaluateRange} />}
            {leukocytes !== null && <LabMetricCard label="Leucocitos" value={leukocytes} unit="x10^3/µL" param="leukocytes" evaluateRange={evaluateRange} />}
            {platelets !== null && <LabMetricCard label="Plaquetas" value={platelets} unit="x10^3/µL" param="platelets" evaluateRange={evaluateRange} />}
            {erythrocyteSed !== null && <LabMetricCard label="Eritrosedimentación" value={erythrocyteSed} unit="mm/h" param="erythrocyte_sedimentation" evaluateRange={evaluateRange} />}
          </div>
        </div>
      )}

      {/* BLOQUE 2: HÍGADO (TRANSAMINASAS) */}
      {hasHepatograma && (
        <div className="space-y-2.5">
          <h5 className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
            <span>🧬</span> Hígado (Transaminasas)
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {gotAst !== null && <LabMetricCard label="GOT / AST" value={gotAst} unit="UI/L" param="got_ast" evaluateRange={evaluateRange} />}
            {gptAlt !== null && <LabMetricCard label="GPT / ALT" value={gptAlt} unit="UI/L" param="gpt_alt" evaluateRange={evaluateRange} />}
            {bilirubinTotal !== null && <LabMetricCard label="Bilirrubina Total" value={bilirubinTotal} unit="mg/dL" param="bilirubin_total" evaluateRange={evaluateRange} />}
            {bilirubinDirect !== null && <LabMetricCard label="Bilirrubina Directa" value={bilirubinDirect} unit="mg/dL" param="bilirubin_direct" customRef="0.0 - 0.30" />}
            {bilirubinIndirect !== null && <LabMetricCard label="Bilirrubina Indirecta" value={bilirubinIndirect} unit="mg/dL" param="bilirubin_indirect" customRef="0.0 - 1.00" />}
            {alkalinePhosphatase !== null && <LabMetricCard label="Fosfatasa Alcalina" value={alkalinePhosphatase} unit="UI/L" param="alkaline_phosphatase" evaluateRange={evaluateRange} />}
          </div>
        </div>
      )}

      {/* BLOQUE 3: RIÑÓN & QUÍMICA CLÍNICA */}
      {hasQuimica && (
        <div className="space-y-2.5">
          <h5 className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
            <span>🧪</span> Riñón & Química Clínica
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {creatinine !== null && <LabMetricCard label="Creatinina en sangre" value={creatinine} unit="mg/dL" param="creatinine" evaluateRange={evaluateRange} />}
            {urea !== null && <LabMetricCard label="Uremia / Urea" value={urea} unit="mg/dL" param="urea" evaluateRange={evaluateRange} />}
            {uricAcid !== null && <LabMetricCard label="Ácido Úrico en Suero" value={uricAcid} unit="mg/dL" param="uric_acid" evaluateRange={evaluateRange} />}
            {gfrMdrd !== null && <LabMetricCard label="Filtrado Glomerular (MDRD)" value={gfrMdrd} unit="mL/min" param="gfr_mdrd" evaluateRange={evaluateRange} />}
            {glucose !== null && <LabMetricCard label="Glucemia" value={glucose} unit="mg/dL" param="glucose" evaluateRange={evaluateRange} />}
          </div>
        </div>
      )}

      {/* BLOQUE 4: PERFIL LIPÍDICO */}
      {hasLipidos && (
        <div className="space-y-2.5">
          <h5 className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
            <span>🫀</span> Perfil Lipídico
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {cholesterolTotal !== null && <LabMetricCard label="Colesterol Total" value={cholesterolTotal} unit="mg/dL" param="cholesterol_total" evaluateRange={evaluateRange} />}
            {cholesterolHdl !== null && <LabMetricCard label="Colesterol HDL" value={cholesterolHdl} unit="mg/dL" param="cholesterol_hdl" evaluateRange={evaluateRange} />}
            {cholesterolLdl !== null && <LabMetricCard label="Colesterol LDL" value={cholesterolLdl} unit="mg/dL" param="cholesterol_ldl" evaluateRange={evaluateRange} />}
            {triglycerides !== null && <LabMetricCard label="Triglicéridos" value={triglycerides} unit="mg/dL" param="triglycerides" evaluateRange={evaluateRange} />}
          </div>
        </div>
      )}

      {/* BLOQUE 5: ELECTROLITOS */}
      {hasElectrolitos && (
        <div className="space-y-2.5">
          <h5 className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
            <span>⚡</span> Electrolitos (Ionograma)
          </h5>
          <div className="grid grid-cols-3 gap-2.5">
            {sodium !== null && <LabMetricCard label="Sodio (Na)" value={sodium} unit="mEq/L" param="sodium" evaluateRange={evaluateRange} />}
            {potassium !== null && <LabMetricCard label="Potasio (K)" value={potassium} unit="mEq/L" param="potassium" evaluateRange={evaluateRange} />}
            {chloride !== null && <LabMetricCard label="Cloro (Cl)" value={chloride} unit="mEq/L" param="chloride" evaluateRange={evaluateRange} />}
          </div>
        </div>
      )}

      {/* BLOQUE 6: FUNCIÓN RENAL & CLEARANCE 24H (TARJETA ESPECIAL) */}
      {hasClearance && (
        <div className="rounded-2xl border border-red-500/30 bg-[#F9FAFB] p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h5 className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
              <span>🚰</span> Función Renal & Clearance 24h
            </h5>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/30">
              Estudio Especial de Orina 24h
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {diuresis !== null && <LabMetricCard label="Diuresis 24h" value={diuresis} unit="mL" param="diuresis" evaluateRange={evaluateRange} />}
            {creatinineUrine24h !== null && <LabMetricCard label="Creatinina en orina 24 hs" value={creatinineUrine24h} unit="g/24 hs" param="creatinine_urine_24h" evaluateRange={evaluateRange} customRef="0.8 - 2.0" />}
            {depuration !== null && <LabMetricCard label="Depuración de creatinina" value={depuration} unit="mL/min" param="depuration" evaluateRange={evaluateRange} customRef="≥ 60" />}
            {dceSupCorp !== null && <LabMetricCard label="DCE Corr. sup. Corporal" value={dceSupCorp} unit="mL/min" param="dce_sup_corp" />}
            {creatininuria !== null && <LabMetricCard label="Creatininuria" value={creatininuria} unit="mg/dL" param="creatininuria" />}
            {creatinineExcretion !== null && <LabMetricCard label="Excreción de Creatinina" value={creatinineExcretion} unit="mg/Kg/24 hs" param="creatinine_excretion" />}
          </div>
        </div>
      )}

      {/* BLOQUE 7: INMUNOLOGÍA (TARJETA ESPECIAL) */}
      {hasInmuno && (
        <div className="rounded-2xl border border-red-500/30 bg-[#F9FAFB] p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h5 className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
              <span>🛡️</span> Inmunología
            </h5>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/30">
              Serología Especial
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {aelo !== null && <LabMetricCard label="AELO (Cuantitativo)" value={aelo} unit="UI/mL" param="aelo" evaluateRange={evaluateRange} customRef="Hasta 200" />}
            {hiv && <LabMetricCard label="HIV-P-24 Combo" valueText={hiv} param="hiv" />}
          </div>
        </div>
      )}

      {selectedBloodTest.notes && (
        <div className="rounded-xl bg-[#F9FAFB] p-3 border border-slate-100 text-xs text-[#64748B]">
          <span className="font-semibold text-[#0F172A]">Notas: </span>
          {selectedBloodTest.notes}
        </div>
      )}
    </div>
  );
}

// Subcomponente Vista Comparativa Evolutiva Estilo Napsix
function BloodTestComparisonView({
  baseStudy,
  targetStudy,
  allStudies,
  setCompareBaseId,
  setCompareTargetId,
}) {
  if (!baseStudy || !targetStudy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-100 bg-white/50 p-8 text-center space-y-3">
        <Scale size={32} className="mx-auto text-[#64748B]" />
        <p className="text-sm font-semibold text-[#0F172A]">
          Se requieren al menos 2 análisis de sangre para la comparativa evolutiva
        </p>
      </div>
    );
  }

  const dBase = parseDateSafe(baseStudy.entry_date || baseStudy.test_date);
  const dTarget = parseDateSafe(targetStudy.entry_date || targetStudy.test_date);
  const yearBase = dBase?.getFullYear?.() || "Base";
  const yearTarget = dTarget?.getFullYear?.() || "Actual";

  // Biomarcadores compartidos coincidentes
  const matchedBiomarkers = useMemo(() => {
    const list = [];
    for (const bio of ALL_COMPARABLE_BIOMARKERS) {
      const valOld = getStudyBiomarkerValue(baseStudy, bio.key);
      const valNew = getStudyBiomarkerValue(targetStudy, bio.key);
      if (valOld !== null && valNew !== null) {
        const badge = computeEvolutionBadge(bio, valOld, valNew);
        list.push({ bio, valOld, valNew, badge });
      }
    }
    return list;
  }, [baseStudy, targetStudy]);

  // Biomarcadores únicos de cada estudio
  const uniqueBiomarkers = useMemo(() => {
    const uniques = [];

    // Únicos del targetStudy (Reciente)
    for (const bio of ALL_COMPARABLE_BIOMARKERS) {
      const valNew = getStudyBiomarkerValue(targetStudy, bio.key);
      const valOld = getStudyBiomarkerValue(baseStudy, bio.key);
      if (valNew !== null && valOld === null) {
        uniques.push({
          label: bio.label,
          value: valNew.toFixed(bio.decimals),
          unit: bio.unit,
          section: bio.section,
          studyLabel: formatLabStudyLabel(targetStudy),
          studyId: targetStudy.id,
        });
      }
    }

    // Únicos del baseStudy (Anterior)
    for (const bio of ALL_COMPARABLE_BIOMARKERS) {
      const valOld = getStudyBiomarkerValue(baseStudy, bio.key);
      const valNew = getStudyBiomarkerValue(targetStudy, bio.key);
      if (valOld !== null && valNew === null) {
        uniques.push({
          label: bio.label,
          value: valOld.toFixed(bio.decimals),
          unit: bio.unit,
          section: bio.section,
          studyLabel: formatLabStudyLabel(baseStudy),
          studyId: baseStudy.id,
        });
      }
    }

    // Textos de inmunología (HIV combo, etc.)
    const hivBase = baseStudy.data_json?.inmunologia?.hiv?.value_text;
    const hivTarget = targetStudy.data_json?.inmunologia?.hiv?.value_text;
    if (hivBase && !hivTarget) {
      uniques.push({
        label: "HIV-P-24 Combo",
        valueText: hivBase,
        section: "Inmunología",
        studyLabel: formatLabStudyLabel(baseStudy),
        studyId: baseStudy.id,
      });
    } else if (hivTarget && !hivBase) {
      uniques.push({
        label: "HIV-P-24 Combo",
        valueText: hivTarget,
        section: "Inmunología",
        studyLabel: formatLabStudyLabel(targetStudy),
        studyId: targetStudy.id,
      });
    }

    return uniques;
  }, [baseStudy, targetStudy]);

  return (
    <div className="space-y-5">
      {/* Selector de estudios a contrastar */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scale size={20} className="text-red-500 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Comparativa Evolutiva
            </h4>
            <p className="text-[11px] text-[#64748B]">
              Evolución clínica entre dos puntos de control
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#64748B]">Base:</span>
            <select
              value={baseStudy.id}
              onChange={(e) => setCompareBaseId(parseInt(e.target.value, 10))}
              className="bg-[#F9FAFB] border border-slate-100 text-[#0F172A] rounded-lg px-2.5 py-1.5 text-xs focus:border-red-500 focus:outline-none"
            >
              {allStudies.map((t) => (
                <option key={t.id} value={t.id}>
                  {formatLabStudyLabel(t)}
                </option>
              ))}
            </select>
          </div>

          <span className="hidden sm:inline text-red-500 font-bold">➔</span>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#64748B]">Actual:</span>
            <select
              value={targetStudy.id}
              onChange={(e) => setCompareTargetId(parseInt(e.target.value, 10))}
              className="bg-[#F9FAFB] border border-slate-100 text-[#0F172A] rounded-lg px-2.5 py-1.5 text-xs focus:border-red-500 focus:outline-none"
            >
              {allStudies.map((t) => (
                <option key={t.id} value={t.id}>
                  {formatLabStudyLabel(t)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLA COMPARATIVA LIMPIA ESTILO NAPSIX */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-600 hover:bg-red-700" />
            <h4 className="text-sm sm:text-base font-bold text-[#0F172A]">
              Evolución de Biomarcadores Compartidos ({matchedBiomarkers.length})
            </h4>
          </div>
          <span className="text-xs text-[#64748B]">
            {yearBase} ➔ {yearTarget}
          </span>
        </div>

        {/* Tabla responsive estilo Napsix (#16161A, texto blanco y verde neón #EF4444) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[#64748B]">
                <th className="py-2.5 px-3 font-semibold">Biomarcador</th>
                <th className="py-2.5 px-3 font-semibold text-right">{yearBase}</th>
                <th className="py-2.5 px-2 text-center"></th>
                <th className="py-2.5 px-3 font-semibold text-left">{yearTarget}</th>
                <th className="py-2.5 px-3 font-semibold text-right">Evolución / Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26262B]/60">
              {matchedBiomarkers.map((m) => (
                <tr key={m.bio.key} className="hover:bg-[#F9FAFB]/60 transition">
                  <td className="py-3 px-3">
                    <div className="font-bold text-[#0F172A]">{m.bio.label}</div>
                    <div className="text-[10px] text-[#64748B]">{m.bio.section}</div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-300">
                    {m.valOld.toFixed(m.bio.decimals)} <span className="text-[10px] text-[#64748B]">{m.bio.unit}</span>
                  </td>
                  <td className="py-3 px-2 text-center text-red-500">
                    <ArrowRight size={13} className="mx-auto text-red-500" />
                  </td>
                  <td className="py-3 px-3 text-left font-mono font-bold text-[#0F172A]">
                    <span className="text-red-500 font-bold">{m.valNew.toFixed(m.bio.decimals)}</span> <span className="text-[10px] text-[#64748B]">{m.bio.unit}</span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${m.badge.className}`}>
                      {m.badge.text}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN DE BIOMARCADORES ÚNICOS DE CADA ESTUDIO */}
      {uniqueBiomarkers.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-600 hover:bg-red-700" />
              <h4 className="text-sm font-bold text-[#0F172A]">
                Biomarcadores Exclusivos ({uniqueBiomarkers.length})
              </h4>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Medidos exclusivamente en uno de los estudios seleccionados
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {uniqueBiomarkers.map((u, idx) => (
              <div key={idx} className="rounded-xl border border-slate-100 bg-[#F9FAFB] p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-bold text-[#0F172A]">{u.label}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/30 whitespace-nowrap">
                    [ Exclusivo de este estudio ]
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-mono font-bold text-[#0F172A]">
                    {u.valueText || u.value}
                  </span>
                  {u.unit && !u.valueText && (
                    <span className="text-[10px] text-[#64748B]">{u.unit}</span>
                  )}
                </div>

                <div className="text-[10px] text-[#64748B] pt-1 border-t border-slate-100/50 truncate">
                  {u.studyLabel}
                </div>
              </div>
            ))}
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
          ? "border-red-500/30 bg-red-500/10"
          : "border-[#2C2C2E] bg-white hover:border-slate-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-xl border transition ${
            item.taken
              ? "bg-red-600 border-red-500 text-white shadow-sm"
              : "border-[#2C2C2E] bg-slate-50 text-transparent"
          }`}
        >
          <Check size={14} strokeWidth={3} />
        </div>
        <div>
          <span
            className={`text-xs font-bold transition ${
              item.taken ? "line-through text-[#64748B]" : "text-[#0F172A]"
            }`}
          >
            {item.name}
          </span>
          <span className="block text-[11px] text-[#64748B]">{item.dose}</span>
        </div>
      </div>

      <span
        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          item.taken
            ? "bg-red-500/20 text-red-500"
            : "bg-slate-50 text-[#64748B]"
        }`}
      >
        {item.taken ? "Completado" : "Pendiente"}
      </span>
    </div>
  );
}
