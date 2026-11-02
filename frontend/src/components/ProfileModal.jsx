import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Activity,
  Apple,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  FileText,
  Flame,
  HeartPulse,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Pill,
  Ruler,
  Save,
  Scale,
  User,
  X,
} from "lucide-react";
import {
  changePassword,
  getProfile,
  getProfileAnalytics,
  updateProfile,
} from "../api/client";
import { showToast } from "./Toast.jsx";
import { ThemeToggle } from "../context/ThemeContext.jsx";

export const NUTRITION_OPTIONS = [
  {
    id: "superavit_volumen",
    label: "Superávit / Volumen",
    shortLabel: "Superávit",
    emoji: "⚡",
    description: "Superávit calórico enfocado en hipertrofia y fuerza",
  },
  {
    id: "mantenimiento",
    label: "Mantenimiento",
    shortLabel: "Mantenimiento",
    emoji: "⚖️",
    description: "Normocalórico para recomposición o sostenimiento de marcas",
  },
  {
    id: "deficit_definicion",
    label: "Déficit / Definición",
    shortLabel: "Déficit",
    emoji: "🔥",
    description: "Restricción calórica protegiendo la masa magra",
  },
  {
    id: "no_especifica",
    label: "Sin especificar",
    shortLabel: "Flexible",
    emoji: "🔘",
    description: "Alimentación libre o flexible",
  },
];

export default function ProfileModal({
  isOpen,
  onClose,
  userProfile = null,
  onRequestLogout,
  onOpenMasterPanel,
}) {
  const isAdmin = Boolean(
    userProfile?.is_admin === true ||
    userProfile?.is_admin === 1 ||
    userProfile?.role === "admin"
  );

  const [bodyweight, setBodyweight] = useState("");
  const [height, setHeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [bicepsGirth, setBicepsGirth] = useState("");
  const [waistGirth, setWaistGirth] = useState("");
  const [isSavingPhysical, setIsSavingPhysical] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Biological Context state
  const [nutritionContext, setNutritionContext] = useState("no_especifica");
  const [supplements, setSupplements] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [isBioContextOpen, setIsBioContextOpen] = useState(false);

  // Analytics & Profile Username
  const [analyticsData, setAnalyticsData] = useState(null);
  const [profileUsername, setProfileUsername] = useState("");

  // Email and Password Management State
  const [email, setEmail] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await getProfileAnalytics().catch(() => null);
      if (data) {
        setAnalyticsData(data);
      }
    } catch (err) {
      console.warn("Error cargando analítica de perfil:", err);
    }
  }, []);

  useEffect(() => {
    if (userProfile) {
      if (userProfile?.bodyweight !== null && userProfile?.bodyweight !== undefined) {
        setBodyweight(String(userProfile?.bodyweight ?? 70));
      }
      if (userProfile?.height !== null && userProfile?.height !== undefined) {
        setHeight(String(userProfile?.height ?? 170));
      }
      if (userProfile?.body_fat_percentage !== null && userProfile?.body_fat_percentage !== undefined) {
        setBodyFat(String(userProfile.body_fat_percentage));
      }
      if (userProfile?.biceps_girth !== null && userProfile?.biceps_girth !== undefined) {
        setBicepsGirth(String(userProfile.biceps_girth));
      }
      if (userProfile?.waist_girth !== null && userProfile?.waist_girth !== undefined) {
        setWaistGirth(String(userProfile.waist_girth));
      }
      if (userProfile?.nutrition_context) {
        setNutritionContext(userProfile.nutrition_context);
      }
      if (userProfile?.supplements !== undefined && userProfile?.supplements !== null) {
        setSupplements(userProfile.supplements);
        if (userProfile.supplements.trim()) {
          setIsBioContextOpen(true);
        }
      }
      if (userProfile?.health_notes !== undefined && userProfile?.health_notes !== null) {
        setHealthNotes(userProfile.health_notes);
        if (userProfile.health_notes.trim()) {
          setIsBioContextOpen(true);
        }
      }
      if (userProfile?.email) {
        setEmail(userProfile.email);
      }
      if (userProfile?.username) {
        setProfileUsername(userProfile.username);
      }
    }
  }, [userProfile, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();

      getProfile()
        .then((profile) => {
          if (profile) {
            if (profile?.bodyweight !== null && profile?.bodyweight !== undefined) {
              setBodyweight(String(profile?.bodyweight ?? 70));
            }
            if (profile?.height !== null && profile?.height !== undefined) {
              setHeight(String(profile?.height ?? 170));
            }
            if (profile?.body_fat_percentage !== null && profile?.body_fat_percentage !== undefined) {
              setBodyFat(String(profile.body_fat_percentage));
            }
            if (profile?.biceps_girth !== null && profile?.biceps_girth !== undefined) {
              setBicepsGirth(String(profile.biceps_girth));
            }
            if (profile?.waist_girth !== null && profile?.waist_girth !== undefined) {
              setWaistGirth(String(profile.waist_girth));
            }
            if (profile?.nutrition_context) {
              setNutritionContext(profile.nutrition_context);
            }
            if (profile?.supplements !== undefined && profile?.supplements !== null) {
              setSupplements(profile.supplements);
              if (profile.supplements.trim()) {
                setIsBioContextOpen(true);
              }
            }
            if (profile?.health_notes !== undefined && profile?.health_notes !== null) {
              setHealthNotes(profile.health_notes);
              if (profile.health_notes.trim()) {
                setIsBioContextOpen(true);
              }
            }
            if (profile?.email) {
              setEmail(profile.email);
            }
            if (profile?.username) {
              setProfileUsername(profile.username);
            }
          }
        })
        .catch((err) => {
          console.warn("Error cargando perfil:", err);
        });
    }
  }, [isOpen, fetchAnalytics]);

  const bmiData = useMemo(() => {
    const bw = parseFloat(bodyweight);
    const h = parseFloat(height);
    if (!bw || !h || bw <= 0 || h <= 0) return null;
    const hM = h / 100;
    const val = bw / (hM * hM);
    const bmi = Math.round(val * 10) / 10;
    let label = "Saludable";
    let badgeClass = "bg-red-500/10 text-red-500 border-red-500/20";
    if (bmi < 18.5) {
      label = "Bajo peso";
      badgeClass = "bg-red-500/10 text-red-400 border-red-400/20";
    } else if (bmi < 25) {
      label = "Saludable";
      badgeClass = "bg-red-500/10 text-red-500 border-red-500/20";
    } else if (bmi < 30) {
      label = "Robusto / Masa";
      badgeClass = "bg-red-500/10 text-red-500 border-red-500/30";
    } else {
      label = "Elevado";
      badgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
    return { bmi, label, badgeClass };
  }, [bodyweight, height]);

  const calculatedBiometrics = useMemo(() => {
    const bw = parseFloat(bodyweight) || analyticsData?.bodyweight || 75.0;
    const h = parseFloat(height) || analyticsData?.height || 175.0;
    const bf = bodyFat !== "" ? parseFloat(bodyFat) : (analyticsData?.body_fat_percentage ?? 15.0);

    // Casey Butt FFMI & Lean mass
    const leanMass = analyticsData?.lean_mass_kg ?? +(bw * (1 - (bf / 100))).toFixed(1);
    const hM = h / 100;
    const rawFfmi = leanMass / (hM * hM);
    const ffmi = analyticsData?.ffmi ?? +(rawFfmi + 6.1 * (1.8 - hM)).toFixed(2);
    const remainingPotentialKg = analyticsData?.remaining_muscular_potential_kg ?? +(Math.max(0, (25.0 - rawFfmi) * (hM * hM))).toFixed(1);

    // Katch-McArdle TMB & TDEE
    const bmr = analyticsData?.bmr_kcal ?? Math.round(370 + (21.6 * leanMass));
    const tdee = analyticsData?.tdee_kcal ?? Math.round(bmr * 1.55);

    let calorieDelta = 0;
    let calorieGoalLabel = "Mantenimiento";
    let proteinFactor = 2.0;

    if (nutritionContext === "deficit_definicion") {
      calorieDelta = -400;
      calorieGoalLabel = "Déficit (-400)";
      proteinFactor = 2.3;
    } else if (nutritionContext === "superavit_volumen") {
      calorieDelta = 300;
      calorieGoalLabel = "Superávit (+300)";
      proteinFactor = 2.0;
    }

    const targetCalories = Math.round(tdee + calorieDelta);
    const targetProtein = analyticsData?.target_protein_g ?? Math.round(bw * proteinFactor);
    const targetWater = analyticsData?.target_water_l ?? +((bw * 0.04) + 0.8).toFixed(1);

    return {
      bw,
      h,
      bf,
      leanMass,
      ffmi,
      remainingPotentialKg,
      bmr,
      tdee,
      targetCalories,
      calorieGoalLabel,
      targetProtein,
      targetWater,
    };
  }, [bodyweight, height, bodyFat, nutritionContext, analyticsData]);

  const handleSavePhysicalProfile = async (e) => {
    if (e) e.preventDefault();
    try {
      setIsSavingPhysical(true);
      const bw = bodyweight !== "" ? parseFloat(bodyweight) : null;
      const h = height !== "" ? parseFloat(height) : null;
      const bf = bodyFat !== "" ? parseFloat(bodyFat) : null;
      const bg = bicepsGirth !== "" ? parseFloat(bicepsGirth) : null;
      const wg = waistGirth !== "" ? parseFloat(waistGirth) : null;

      const updated = await updateProfile({
        bodyweight: bw,
        height: h,
        body_fat_percentage: bf,
        biceps_girth: bg,
        waist_girth: wg,
        nutrition_context: nutritionContext,
        supplements: supplements.trim() || null,
        health_notes: healthNotes.trim() || null,
      });

      window.dispatchEvent(
        new CustomEvent("fittracker:profileChanged", { detail: updated })
      );

      fetchAnalytics();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);

      showToast("Perfil físico y biométrico actualizado correctamente.", {
        variant: "red",
      });
    } catch (err) {
      console.error("Error guardando perfil físico:", err);
      alert(err.response?.data?.detail || "Error al guardar el perfil físico.");
    } finally {
      setIsSavingPhysical(false);
    }
  };

  const handleSaveEmail = async (e) => {
    if (e) e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean) {
      alert("Por favor ingresá un correo electrónico válido.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      alert("Formato de correo electrónico no válido.");
      return;
    }
    try {
      setIsSavingEmail(true);
      const updated = await updateProfile({ email: clean });
      if (updated?.email) setEmail(updated.email);
      showToast("Correo electrónico vinculado con éxito", { variant: "red" });
    } catch (err) {
      console.error("Error guardando email:", err);
      alert(err.response?.data?.detail || "Error al vincular el correo electrónico.");
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleChangePassword = async (e) => {
    if (e) e.preventDefault();
    setPasswordError("");
    if (!currentPassword) {
      setPasswordError("Ingresá tu contraseña actual.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }
    try {
      setIsSavingPassword(true);
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangePasswordOpen(false);
      showToast("Contraseña actualizada correctamente", { variant: "red" });
    } catch (err) {
      console.error("Error cambiando contraseña:", err);
      setPasswordError(
        err.response?.data?.detail || "Error al cambiar la contraseña."
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-[#F1F5F9] dark:border-[#1E293B]/60 bg-[#FFFFFF] dark:bg-[#121824] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#F1F5F9] dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0B0F17] p-4 sm:p-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white font-bold flex-shrink-0">
              <User size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {profileUsername ? `@${profileUsername}` : "Perfil Físico"}
                </h2>

                <span className="rounded-md border border-red-500/30 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400 font-mono">
                  FFMI {calculatedBiometrics.ffmi}
                </span>

                {bodyweight && (
                  <span className="rounded-md border border-red-500/30 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400 font-mono">
                    {bodyweight} kg
                  </span>
                )}
                {nutritionContext !== "no_especifica" && (
                  <span className="rounded-md border border-[#F1F5F9] dark:border-slate-800 bg-[#FFFFFF] dark:bg-[#121824] px-2 py-0.5 text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                    {NUTRITION_OPTIONS.find((n) => n.id === nutritionContext)?.shortLabel || nutritionContext}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Calibración biomecánica cuantitativa para fuerza relativa y requerimientos metabólicos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent("fittracker:openCheckIn"));
              }}
              className="flex items-center gap-1.5 bg-[#FFFFFF] dark:bg-[#121824] border border-[#F1F5F9] dark:border-slate-800 hover:border-red-500/60 text-[#0F172A] dark:text-[#F8FAFC] text-xs font-semibold px-3 py-1.5 rounded-full transition active:scale-95 cursor-pointer shadow-sm"
              title="Abrir Sistema de Check-Ins Periódicos"
            >
              <span className="text-red-500">⚖️</span>
              <span>Check-In</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenMasterPanel) {
                    onOpenMasterPanel();
                  } else {
                    onClose();
                    window.location.pathname = "/admin";
                  }
                }}
                className="flex items-center gap-1.5 bg-[#FFFFFF] dark:bg-[#121824] border border-red-500/40 text-red-600 dark:text-red-400 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 transition active:scale-95 cursor-pointer shadow-sm"
                title="Abrir Panel de Control de Administrador"
              >
                <span>🛡️</span>
                <span>Admin Panel</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition cursor-pointer"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrolleable */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 custom-scrollbar bg-[#F8FAFC] dark:bg-[#0B0F17]">
          {/* SECCIÓN 0: APARIENCIA / TEMA (CLARO / OSCURO / SISTEMA) */}
          <div className="rounded-2xl border border-[#F1F5F9] dark:border-[#1E293B]/60 bg-[#FFFFFF] dark:bg-[#121824] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
                Apariencia de la Interfaz
              </h3>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Alterná entre Modo Claro (Clean Bento) y Modo Oscuro (Deep Minimal OLED)
              </p>
            </div>
            <ThemeToggle variant="segmented" className="w-full sm:w-auto sm:min-w-[260px]" />
          </div>

          <form id="profile-physical-form" onSubmit={handleSavePhysicalProfile} className="space-y-5">
            {saveSuccess && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/15 p-3 flex items-center gap-2.5 text-xs text-red-500 animate-in fade-in">
                <Check size={16} className="text-red-500 flex-shrink-0" />
                <span className="font-bold">Datos físicos y biométricos actualizados correctamente.</span>
              </div>
            )}

            {/* SECCIÓN 1: BIOMETRÍA & ANTROPOMETRÍA */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                  <Scale size={14} className="text-red-500" />
                  <span>1. Biometría Cuantitativa &amp; Antropometría</span>
                </label>
                {bmiData && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${bmiData.badgeClass}`}>
                    <span>IMC {bmiData.bmi}</span>
                    <span>•</span>
                    <span>{bmiData.label}</span>
                  </span>
                )}
              </div>

              {/* Grid de 5 inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 1. Peso Corporal */}
                <div className="rounded-2xl border border-[#2C2C2E] bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                      <Scale size={13} className="text-red-500" />
                      <span>Peso Corporal</span>
                    </label>
                    <span className="text-[9px] font-mono text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">Base Prime</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(bodyweight) || 75;
                        setBodyweight(String(Math.max(20, Math.round((cur - 0.5) * 10) / 10)));
                      }}
                      className="oled-stepper-btn h-9 w-9 text-xs"
                      title="-0.5 kg"
                    >
                      -0.5
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="20"
                        max="350"
                        placeholder="75.0"
                        value={bodyweight}
                        onChange={(e) => setBodyweight(e.target.value)}
                        className="iron-input w-full text-center text-sm font-bold py-1.5 pr-7"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#64748B]">
                        kg
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(bodyweight) || 75;
                        setBodyweight(String(Math.min(300, Math.round((cur + 0.5) * 10) / 10)));
                      }}
                      className="oled-stepper-btn h-9 w-9 text-xs"
                      title="+0.5 kg"
                    >
                      +0.5
                    </button>
                  </div>
                </div>

                {/* 2. Altura */}
                <div className="rounded-2xl border border-[#2C2C2E] bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                      <Ruler size={13} className="text-red-500" />
                      <span>Altura</span>
                    </label>
                    <span className="text-[9px] font-mono text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">Palanca</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(height) || 175;
                        setHeight(String(Math.max(50, Math.round(cur - 1))));
                      }}
                      className="oled-stepper-btn h-9 w-9 text-xs"
                      title="-1 cm"
                    >
                      -1
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="1"
                        min="50"
                        max="250"
                        placeholder="175"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="iron-input w-full text-center text-sm font-bold py-1.5 pr-7"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#64748B]">
                        cm
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(height) || 175;
                        setHeight(String(Math.min(240, Math.round(cur + 1))));
                      }}
                      className="oled-stepper-btn h-9 w-9 text-xs"
                      title="+1 cm"
                    >
                      +1
                    </button>
                  </div>
                </div>

                {/* 3. % Grasa Corporal */}
                <div className="rounded-2xl border border-[#2C2C2E] bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                      <Flame size={13} className="text-red-400" />
                      <span>% Grasa Corporal</span>
                    </label>
                    <span className="text-[9px] text-[#64748B]">Opcional</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(bodyFat) || 15.0;
                        setBodyFat(String(Math.max(3, Math.round((cur - 0.5) * 10) / 10)));
                      }}
                      className="oled-stepper-btn h-9 w-9 text-xs"
                      title="-0.5 %"
                    >
                      -0.5
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="3"
                        max="60"
                        placeholder="15.0"
                        value={bodyFat}
                        onChange={(e) => setBodyFat(e.target.value)}
                        className="iron-input w-full text-center text-sm font-bold py-1.5 pr-7"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#64748B]">
                        %
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(bodyFat) || 15.0;
                        setBodyFat(String(Math.min(60, Math.round((cur + 0.5) * 10) / 10)));
                      }}
                      className="oled-stepper-btn h-9 w-9 text-xs"
                      title="+0.5 %"
                    >
                      +0.5
                    </button>
                  </div>
                </div>

                {/* 4. Perímetro Bíceps */}
                <div className="rounded-2xl border border-[#2C2C2E] bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                      <Dumbbell size={13} className="text-[#C084FC]" />
                      <span>Circunf. Bíceps</span>
                    </label>
                    <span className="text-[9px] text-[#64748B]">Opcional</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(bicepsGirth) || 35.0;
                        setBicepsGirth(String(Math.max(15, Math.round((cur - 0.5) * 10) / 10)));
                      }}
                      className="oled-stepper-btn h-9 w-9 text-xs"
                      title="-0.5 cm"
                    >
                      -0.5
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="15"
                        max="70"
                        placeholder="35.0"
                        value={bicepsGirth}
                        onChange={(e) => setBicepsGirth(e.target.value)}
                        className="iron-input w-full text-center text-sm font-bold py-1.5 pr-7"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#64748B]">
                        cm
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(bicepsGirth) || 35.0;
                        setBicepsGirth(String(Math.min(70, Math.round((cur + 0.5) * 10) / 10)));
                      }}
                      className="oled-stepper-btn h-9 w-9 text-xs"
                      title="+0.5 cm"
                    >
                      +0.5
                    </button>
                  </div>
                </div>

                {/* 5. Perímetro Cintura */}
                <div className="rounded-2xl border border-[#2C2C2E] bg-slate-50 p-3 space-y-2 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                      <Ruler size={13} className="text-cyan-400" />
                      <span>Circunf. Cintura</span>
                    </label>
                    <span className="text-[9px] text-[#64748B]">Opcional</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(waistGirth) || 80.0;
                        setWaistGirth(String(Math.max(40, Math.round((cur - 0.5) * 10) / 10)));
                      }}
                      className="oled-stepper-btn h-9 w-9 text-xs"
                      title="-0.5 cm"
                    >
                      -0.5
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="40"
                        max="160"
                        placeholder="80.0"
                        value={waistGirth}
                        onChange={(e) => setWaistGirth(e.target.value)}
                        className="iron-input w-full text-center text-sm font-bold py-1.5 pr-7"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#64748B]">
                        cm
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(waistGirth) || 80.0;
                        setWaistGirth(String(Math.min(160, Math.round((cur + 0.5) * 10) / 10)));
                      }}
                      className="oled-stepper-btn h-9 w-9 text-xs"
                      title="+0.5 cm"
                    >
                      +0.5
                    </button>
                  </div>
                </div>
              </div>

              {/* DASHBOARD BIOMÉTRICO TÉCNICO */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-red-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                      Dashboard Biométrico &amp; Nutricional
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#64748B] bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    Katch-McArdle • Casey Butt
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* FFMI actual */}
                  <div className="rounded-xl border border-slate-100 bg-[#F9FAFB] p-3 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#64748B]">FFMI / Límite Nat.</span>
                    <div className="my-1 flex items-baseline gap-1">
                      <span className="text-lg font-black text-[#0F172A]">{calculatedBiometrics.ffmi}</span>
                      <span className="text-[11px] font-bold text-[#64748B]">/ 25.0</span>
                    </div>
                    <div className="w-full bg-[#26262B] h-1.5 rounded-full overflow-hidden mb-1">
                      <div
                        className="bg-red-600 hover:bg-red-700 h-full"
                        style={{ width: `${Math.min(100, Math.round((calculatedBiometrics.ffmi / 25.0) * 100))}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#64748B] font-medium">
                      Masa Magra: <strong className="text-[#0F172A]">{calculatedBiometrics.leanMass} kg</strong>
                    </span>
                  </div>

                  {/* Potencial remanente */}
                  <div className="rounded-xl border border-slate-100 bg-[#F9FAFB] p-3 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#64748B]">Potencial Magro</span>
                    <div className="my-1">
                      <span className="text-lg font-black text-red-500">
                        +{calculatedBiometrics.remainingPotentialKg} <span className="text-xs font-bold">kg</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-[#64748B] font-medium">
                      Hasta techo 25.0 FFMI
                    </span>
                    <span className="text-[10px] text-red-500/80 font-mono">
                      {Math.min(100, Math.round((calculatedBiometrics.ffmi / 25.0) * 100))}% alcanzado
                    </span>
                  </div>

                  {/* TDEE & Meta calórica */}
                  <div className="rounded-xl border border-slate-100 bg-[#F9FAFB] p-3 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#64748B]">TDEE / Meta</span>
                    <div className="my-1 flex items-baseline gap-1">
                      <span className="text-lg font-black text-[#0F172A]">{calculatedBiometrics.targetCalories}</span>
                      <span className="text-[10px] font-bold text-[#64748B]">kcal/d</span>
                    </div>
                    <span className="text-[10px] text-[#64748B] font-medium">
                      Mant: <strong className="text-[#0F172A]">{calculatedBiometrics.tdee}</strong> (TMB {calculatedBiometrics.bmr})
                    </span>
                    <span className="text-[10px] text-red-500 font-semibold">
                      {calculatedBiometrics.calorieGoalLabel}
                    </span>
                  </div>

                  {/* Proteína & Agua */}
                  <div className="rounded-xl border border-slate-100 bg-[#F9FAFB] p-3 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#64748B]">Macro &amp; Hidratación</span>
                    <div className="my-1 flex flex-col gap-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#64748B]">Proteína:</span>
                        <span className="font-black text-[#0F172A]">{calculatedBiometrics.targetProtein} g/d</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#64748B]">Agua:</span>
                        <span className="font-black text-cyan-400">{calculatedBiometrics.targetWater} L/d</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#64748B] font-mono">
                      2.0 g/kg • 40ml/kg+0.8
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: CONTEXTO NUTRICIONAL & SALUD (COLAPSABLE) */}
            <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden transition">
              <button
                type="button"
                onClick={() => setIsBioContextOpen((prev) => !prev)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex-shrink-0">
                    <HeartPulse size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-[#0F172A]">
                        2. Contexto Nutricional &amp; Biológico
                      </h4>
                      {nutritionContext !== "no_especifica" && (
                        <span className="rounded-full bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 text-[9px] font-semibold">
                          {NUTRITION_OPTIONS.find((o) => o.id === nutritionContext)?.shortLabel || nutritionContext}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#64748B]">
                      Fase nutricional activa, suplementación y anotaciones privadas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[#64748B]">
                  <span className="text-[11px] font-medium hidden sm:inline">
                    {isBioContextOpen ? "Plegar" : "Expandir"}
                  </span>
                  {isBioContextOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {isBioContextOpen && (
                <div className="p-4 pt-2 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5">
                      <Apple size={14} className="text-red-500" />
                      <span>Fase o Contexto Nutricional</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {NUTRITION_OPTIONS.map((opt) => {
                        const isSelected = nutritionContext === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setNutritionContext(opt.id)}
                            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 active:scale-[0.98] cursor-pointer ${
                              isSelected
                                ? "border-red-500 bg-red-500/15 text-red-500"
                                : "border-slate-100 bg-slate-50 text-[#64748B] hover:text-[#0F172A] hover:border-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{opt.emoji}</span>
                              <span className="text-xs font-bold truncate">{opt.label}</span>
                            </div>
                            <p className="text-[10px] text-[#64748B] leading-snug line-clamp-2">
                              {opt.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#64748B] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Pill size={14} className="text-red-500" />
                        <span>Suplementación Habitual</span>
                      </span>
                      <span className="text-[10px] text-[#64748B] font-normal">Opcional</span>
                    </label>
                    <input
                      type="text"
                      value={supplements}
                      onChange={(e) => setSupplements(e.target.value)}
                      placeholder="ej. Creatina 5g, Proteína Whey, Omega 3, Magnesio"
                      className="iron-input w-full text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#64748B] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText size={14} className="text-red-400" />
                        <span>Notas de Salud y Biológicas (Privado)</span>
                      </span>
                      <span className="text-[10px] text-red-400/80 font-medium">Confidencial</span>
                    </label>
                    <textarea
                      rows={2}
                      value={healthNotes}
                      onChange={(e) => setHealthNotes(e.target.value)}
                      placeholder="Molestias previas, recomendaciones médicas, notas de descanso..."
                      className="iron-input w-full text-sm resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Save Physical Profile CTA Button */}
            <button
              type="submit"
              disabled={isSavingPhysical}
              className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-semibold text-sm flex items-center justify-center gap-2 transition select-none cursor-pointer shadow-sm"
            >
              {isSavingPhysical ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Guardando datos biométricos...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Guardar Mi Perfil Físico &amp; Biológico</span>
                </>
              )}
            </button>
          </form>

          {/* ACCESO DIRECTO PANEL MASTER (SOLO ADMINS) */}
          {isAdmin && (
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/30 text-lg flex-shrink-0">
                  👑
                </span>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                    <span>Privilegios de Administrador</span>
                  </h4>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">
                    Gestión de usuarios registrados, catálogo de ejercicios y métricas del servidor.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onOpenMasterPanel) {
                    onOpenMasterPanel();
                  } else {
                    onClose();
                    window.location.pathname = "/admin";
                  }
                }}
                className="h-11 px-4 rounded-xl bg-slate-50 border border-red-500/40 text-red-500 text-xs font-semibold hover:bg-red-500/10 transition active:scale-95 cursor-pointer whitespace-nowrap flex items-center justify-center self-stretch sm:self-auto"
              >
                <span>🛡️ Admin Panel</span>
              </button>
            </div>
          )}

          {/* TARJETA CUENTA, EMAIL & SEGURIDAD */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-4">
            {/* CORREO */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-red-500" />
                  <h3 className="text-sm font-bold text-[#0F172A]">Correo Electrónico</h3>
                </div>
                {email ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 rounded-full">
                    ✓ Vinculado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-400/30 px-2.5 py-0.5 rounded-full">
                    ⚠️ Sin vincular
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tuemail@ejemplo.com"
                  className="iron-input flex-1 text-sm h-11"
                />
                <button
                  type="button"
                  onClick={handleSaveEmail}
                  disabled={isSavingEmail}
                  className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-[#0F172A] text-xs font-semibold hover:border-red-500/40 transition active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {isSavingEmail ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Email</span>
                  )}
                </button>
              </div>
            </div>

            {/* CAMBIAR CONTRASEÑA */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-red-500" />
                  <h3 className="text-sm font-bold text-[#0F172A]">Seguridad de la Cuenta</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangePasswordOpen((prev) => !prev);
                    setPasswordError("");
                  }}
                  className="text-xs font-semibold text-red-500 hover:underline cursor-pointer"
                >
                  {isChangePasswordOpen ? "Ocultar formulario" : "Cambiar Contraseña"}
                </button>
              </div>

              {isChangePasswordOpen && (
                <form onSubmit={handleChangePassword} className="space-y-3 pt-2 animate-in fade-in duration-150">
                  <div>
                    <label className="text-xs text-[#64748B] mb-1 block font-medium">Contraseña actual</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Tu contraseña actual"
                      className="iron-input text-sm h-11"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs text-[#64748B] mb-1 block font-medium">Nueva contraseña</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="iron-input text-sm h-11"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#64748B] mb-1 block font-medium">Confirmar nueva contraseña</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repetí la contraseña"
                        className="iron-input text-sm h-11"
                        required
                      />
                    </div>
                  </div>

                  {passwordError && (
                    <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
                      {passwordError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-semibold text-sm flex items-center justify-center gap-2 transition select-none disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingPassword ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Actualizando contraseña...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={16} />
                        <span>Actualizar Contraseña</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Fijo */}
        <div className="border-t border-[#F1F5F9] dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0B0F17] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onRequestLogout) {
                onRequestLogout();
              } else {
                window.dispatchEvent(new CustomEvent("fittracker:requestLogout"));
              }
            }}
            className="h-11 inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-50 dark:bg-red-950/40 px-3.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/70 transition cursor-pointer active:scale-95"
            title="Cerrar sesión"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-[#F1F5F9] dark:border-slate-800 bg-[#FFFFFF] dark:bg-[#121824] hover:bg-slate-100 dark:hover:bg-slate-800 px-4 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="submit"
              form="profile-physical-form"
              disabled={isSavingPhysical}
              className="h-11 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 px-5 text-xs sm:text-sm font-semibold text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {isSavingPhysical ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
