import React, { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Dumbbell, HelpCircle, KeyRound, Lock, LogIn, Mail, ShieldCheck, User, UserPlus } from "lucide-react";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, forgotPassword, loginUser, registerUser, resetPassword } from "../api/client";
import SupportModal from "../components/SupportModal";
import { showToast } from "../components/Toast";
import { ThemeToggle } from "../context/ThemeContext";

export default function Login({ onAuthenticated }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register' | 'forgot' | 'reset'
  const [form, setForm] = useState({ username: "", password: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState("");

  // Reset password state
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Detect ?reset_token= in URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("reset_token");
      if (token) {
        setResetToken(token);
        setMode("reset");
        setErrorMsg("");
      }
    } catch (e) {
      console.warn("Error leyendo reset_token:", e);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      let res;
      if (mode === "login") {
        res = await loginUser(form.username, form.password);
      } else {
        res = await registerUser(form.username, form.password, form.email);
      }

      localStorage.setItem(AUTH_TOKEN_KEY, res.access_token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
      if (onAuthenticated) {
        onAuthenticated(res.user);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setErrorMsg(detail);
      } else {
        setErrorMsg("Error al conectar con el servidor. Verificá tus credenciales.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setForgotSuccessMsg("");
    setForgotLoading(true);

    try {
      const res = await forgotPassword(forgotEmail);
      setForgotSuccessMsg(res.message || "Si el correo está registrado, recibirás las instrucciones de recuperación.");
      showToast("Instrucciones de recuperación enviadas", { variant: "red" });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === "string" ? detail : "Error al solicitar la recuperación de contraseña.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (newPassword.length < 6) {
      setErrorMsg("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await resetPassword(resetToken, newPassword);
      showToast(res.message || "¡Contraseña restablecida correctamente!", { variant: "red" });
      try {
        window.history.replaceState({}, "", window.location.pathname);
      } catch {}
      setMode("login");
      setForm((prev) => ({ ...prev, password: "" }));
      setErrorMsg("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === "string" ? detail : "Error al restablecer la contraseña.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col justify-center px-4 py-8 relative overflow-x-hidden transition-colors duration-200">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="icon" />
      </div>
      <div className="relative mx-auto w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/20">
            <Dumbbell size={28} />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-bold tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
              FIT<span className="text-red-500">TRACKER</span>
            </span>
            <span className="rounded-full border border-red-500/30 bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">
              OLED GYM
            </span>
          </div>
          <p className="mt-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
            {mode === "login"
              ? "Ingresá a tu espacio individual de entrenamiento"
              : mode === "register"
              ? "Creá tu cuenta para registrar tus cargas y récords"
              : mode === "forgot"
              ? "Recuperá el acceso a tu cuenta mediante tu correo"
              : "Definí una nueva contraseña para tu cuenta"}
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl border border-[#F1F5F9] dark:border-[#1E293B]/60 bg-[#FFFFFF] dark:bg-[#121824] p-6 sm:p-8 backdrop-blur-xl shadow-bento">
          {/* Mode Switcher (only for login / register) */}
          {(mode === "login" || mode === "register") && (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#F1F5F9] dark:border-[#1E293B]/60 bg-[#F8FAFC] dark:bg-[#0B0F17] p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg("");
                }}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition ${
                  mode === "login"
                    ? "bg-red-600 text-white font-bold"
                    : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
                }`}
              >
                <LogIn size={15} />
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setErrorMsg("");
                }}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition ${
                  mode === "register"
                    ? "bg-red-600 text-white font-bold"
                    : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
                }`}
              >
                <UserPlus size={15} />
                Crear Cuenta
              </button>
            </div>
          )}

          {/* VISTA 1 & 2: LOGIN O REGISTRO */}
          {(mode === "login" || mode === "register") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1.5 flex items-center gap-1.5">
                  <User size={13} className="text-red-500" />
                  Usuario
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="Ej. pablo"
                  autoComplete="username"
                  className="h-11 w-full rounded-xl border border-slate-100 bg-[#F9FAFB] px-4 py-2 text-sm text-[#0F172A] placeholder-[#52525B] focus:border-red-500 focus:outline-none transition font-medium"
                  required
                />
              </div>

              {mode === "register" && (
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1.5 flex items-center gap-1.5">
                    <Mail size={13} className="text-red-500" />
                    Email (opcional para soporte y recuperación)
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="tuemail@ejemplo.com"
                    autoComplete="email"
                    className="h-11 w-full rounded-xl border border-slate-100 bg-[#F9FAFB] px-4 py-2 text-sm text-[#0F172A] placeholder-[#52525B] focus:border-red-500 focus:outline-none transition font-medium"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1.5 flex items-center gap-1.5">
                  <Lock size={13} className="text-red-500" />
                  Contraseña
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="h-11 w-full rounded-xl border border-slate-100 bg-[#F9FAFB] px-4 py-2 text-sm text-[#0F172A] placeholder-[#52525B] focus:border-red-500 focus:outline-none transition font-medium"
                  required
                />
                {mode === "login" && (
                  <div className="flex justify-end pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setErrorMsg("");
                        setForgotSuccessMsg("");
                      }}
                      className="text-[#64748B] hover:text-[#0F172A] text-xs transition underline-offset-2 hover:underline cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Procesando...</span>
                ) : mode === "login" ? (
                  <>
                    <LogIn size={17} />
                    <span>Ingresar a Entrenar</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={17} />
                    <span>Crear Cuenta &amp; Empezar</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* VISTA 3: RECUPERAR CONTRASEÑA (FORGOT) */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <h3 className="text-base font-bold text-[#0F172A]">Recuperar Contraseña</h3>
                <p className="text-xs text-[#64748B] mt-1">
                  Ingresá el correo electrónico vinculado a tu cuenta para recibir el enlace de recuperación.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1.5 flex items-center gap-1.5">
                  <Mail size={13} className="text-red-500" />
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="tuemail@ejemplo.com"
                  className="h-11 w-full rounded-xl border border-slate-100 bg-[#F9FAFB] px-4 py-2 text-sm text-[#0F172A] placeholder-[#52525B] focus:border-red-500 focus:outline-none transition font-medium"
                  required
                />
              </div>

              {forgotSuccessMsg && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
                  {forgotSuccessMsg}
                </div>
              )}

              {errorMsg && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={forgotLoading}
                className="h-11 w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {forgotLoading ? <span>Enviando...</span> : <span>Enviar Instrucciones</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg("");
                  setForgotSuccessMsg("");
                }}
                className="w-full text-center text-xs text-[#64748B] hover:text-[#0F172A] pt-2 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Volver a Iniciar Sesión</span>
              </button>
            </form>
          )}

          {/* VISTA 4: RESTABLECER CONTRASEÑA POR TOKEN (RESET) */}
          {mode === "reset" && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <h3 className="text-base font-bold text-[#0F172A]">Nueva Contraseña</h3>
                <p className="text-xs text-[#64748B] mt-1">
                  Ingresá tu nueva clave para restablecer el acceso a tu cuenta.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1.5 flex items-center gap-1.5">
                  <Lock size={13} className="text-red-500" />
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="h-11 w-full rounded-xl border border-slate-100 bg-[#F9FAFB] px-4 py-2 text-sm text-[#0F172A] placeholder-[#52525B] focus:border-red-500 focus:outline-none transition font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1.5 flex items-center gap-1.5">
                  <Lock size={13} className="text-red-500" />
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetí tu nueva contraseña"
                  className="h-11 w-full rounded-xl border border-slate-100 bg-[#F9FAFB] px-4 py-2 text-sm text-[#0F172A] placeholder-[#52525B] focus:border-red-500 focus:outline-none transition font-medium"
                  required
                />
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="h-11 w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {resetLoading ? <span>Guardando...</span> : <span>Guardar Nueva Contraseña</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg("");
                }}
                className="w-full text-center text-xs text-[#64748B] hover:text-[#0F172A] pt-2 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Cancelar y Volver al Login</span>
              </button>
            </form>
          )}

          {/* Support Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setIsSupportOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#0F172A] transition hover:underline"
            >
              <HelpCircle size={13} />
              <span>¿Olvidaste tu contraseña o necesitás ayuda con tu cuenta?</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[10px] text-[#64748B]">
          <div className="p-2.5 rounded-xl border border-slate-100 bg-white">
            <span className="block font-semibold text-[#0F172A]">Privacidad</span>
            Espacio individual
          </div>
          <div className="p-2.5 rounded-xl border border-slate-100 bg-white">
            <span className="block font-semibold text-[#0F172A]">Soporte</span>
            Admin disponible
          </div>
          <div className="p-2.5 rounded-xl border border-slate-100 bg-white">
            <span className="block font-semibold text-[#0F172A]">Récords</span>
            Tus PRs protegidos
          </div>
        </div>
      </div>

      {/* Support Modal */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        initialUsername={form.username}
      />
    </div>
  );
}
