import React, { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Dumbbell, HelpCircle, KeyRound, Lock, LogIn, Mail, ShieldCheck, User, UserPlus } from "lucide-react";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, forgotPassword, loginUser, registerUser, resetPassword } from "../api/client";
import SupportModal from "../components/SupportModal";
import { showToast } from "../components/Toast";

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
      showToast("Instrucciones de recuperación enviadas", { variant: "emerald" });
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
      showToast(res.message || "¡Contraseña restablecida correctamente!", { variant: "emerald" });
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
    <div className="min-h-[100dvh] bg-[#050505] text-white flex flex-col justify-center px-4 py-8 relative overflow-x-hidden">
      <div className="relative mx-auto w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white">
            <Dumbbell size={28} />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-bold tracking-wider text-white">
              FIT<span className="text-[#FF5722]">TRACKER</span>
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[#FF5722]">
              OLED GYM
            </span>
          </div>
          <p className="mt-2 text-xs text-[#8E8E93]">
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
        <div className="rounded-3xl border border-white/5 bg-[#1C1C1E] p-6 sm:p-8 backdrop-blur-xl">
          {/* Mode Switcher (only for login / register) */}
          {(mode === "login" || mode === "register") && (
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/5 bg-[#121212] p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg("");
                }}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
                  mode === "login"
                    ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                    : "text-[#8E8E93] hover:text-white"
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
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
                  mode === "register"
                    ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                    : "text-[#8E8E93] hover:text-white"
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
                <label className="text-xs font-semibold text-[#8E8E93] mb-1.5 flex items-center gap-1.5">
                  <User size={13} className="text-[#FF5722]" />
                  Usuario
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="Ej. pablo"
                  autoComplete="username"
                  className="w-full rounded-2xl border border-white/10 bg-[#121212] px-4 py-2.5 text-sm text-white placeholder-[#52525B] focus:border-[#FF5722] focus:outline-none transition font-medium"
                  required
                />
              </div>

              {mode === "register" && (
                <div>
                  <label className="text-xs font-semibold text-[#8E8E93] mb-1.5 flex items-center gap-1.5">
                    <Mail size={13} className="text-[#FF5722]" />
                    Email (opcional para soporte y recuperación)
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="tuemail@ejemplo.com"
                    autoComplete="email"
                    className="w-full rounded-2xl border border-white/10 bg-[#121212] px-4 py-2.5 text-sm text-white placeholder-[#52525B] focus:border-[#FF5722] focus:outline-none transition font-medium"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#8E8E93] mb-1.5 flex items-center gap-1.5">
                  <Lock size={13} className="text-[#FF5722]" />
                  Contraseña
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full rounded-2xl border border-white/10 bg-[#121212] px-4 py-2.5 text-sm text-white placeholder-[#52525B] focus:border-[#FF5722] focus:outline-none transition font-medium"
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
                      className="text-[#8E8E93] hover:text-white text-xs transition underline-offset-2 hover:underline cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
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
                <h3 className="text-base font-bold text-white">Recuperar Contraseña</h3>
                <p className="text-xs text-[#8E8E93] mt-1">
                  Ingresá el correo electrónico vinculado a tu cuenta para recibir el enlace de recuperación.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8E8E93] mb-1.5 flex items-center gap-1.5">
                  <Mail size={13} className="text-[#FF5722]" />
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="tuemail@ejemplo.com"
                  className="w-full rounded-2xl border border-white/10 bg-[#121212] px-4 py-2.5 text-sm text-white placeholder-[#52525B] focus:border-[#FF5722] focus:outline-none transition font-medium"
                  required
                />
              </div>

              {forgotSuccessMsg && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  {forgotSuccessMsg}
                </div>
              )}

              {errorMsg && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
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
                className="w-full text-center text-xs text-[#8E8E93] hover:text-white pt-2 transition flex items-center justify-center gap-1.5 cursor-pointer"
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
                <h3 className="text-base font-bold text-white">Nueva Contraseña</h3>
                <p className="text-xs text-[#8E8E93] mt-1">
                  Ingresá tu nueva clave para restablecer el acceso a tu cuenta.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8E8E93] mb-1.5 flex items-center gap-1.5">
                  <Lock size={13} className="text-[#FF5722]" />
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-2xl border border-white/10 bg-[#121212] px-4 py-2.5 text-sm text-white placeholder-[#52525B] focus:border-[#FF5722] focus:outline-none transition font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8E8E93] mb-1.5 flex items-center gap-1.5">
                  <Lock size={13} className="text-[#FF5722]" />
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetí tu nueva contraseña"
                  className="w-full rounded-2xl border border-white/10 bg-[#121212] px-4 py-2.5 text-sm text-white placeholder-[#52525B] focus:border-[#FF5722] focus:outline-none transition font-medium"
                  required
                />
              </div>

              {errorMsg && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {resetLoading ? <span>Guardando...</span> : <span>Guardar Nueva Contraseña</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg("");
                }}
                className="w-full text-center text-xs text-[#8E8E93] hover:text-white pt-2 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Cancelar y Volver al Login</span>
              </button>
            </form>
          )}

          {/* Support Link */}
          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <button
              type="button"
              onClick={() => setIsSupportOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-[#8E8E93] hover:text-white transition hover:underline"
            >
              <HelpCircle size={13} />
              <span>¿Olvidaste tu contraseña o necesitás ayuda con tu cuenta?</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[10px] text-[#8E8E93]">
          <div className="p-2.5 rounded-2xl border border-white/5 bg-[#1C1C1E]">
            <span className="block font-semibold text-white">Privacidad</span>
            Espacio individual
          </div>
          <div className="p-2.5 rounded-2xl border border-white/5 bg-[#1C1C1E]">
            <span className="block font-semibold text-white">Soporte</span>
            Admin disponible
          </div>
          <div className="p-2.5 rounded-2xl border border-white/5 bg-[#1C1C1E]">
            <span className="block font-semibold text-white">Récords</span>
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
