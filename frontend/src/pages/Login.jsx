import React, { useState } from "react";
import { Dumbbell, HelpCircle, KeyRound, Lock, LogIn, Mail, ShieldCheck, User, UserPlus } from "lucide-react";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, loginUser, registerUser } from "../api/client";
import SupportModal from "../components/SupportModal";

export default function Login({ onAuthenticated }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [form, setForm] = useState({ username: "", password: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSupportOpen, setIsSupportOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-center px-4 py-8 relative overflow-hidden">
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
              : "Creá tu cuenta para registrar tus cargas y récords"}
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl border border-white/5 bg-[#1C1C1E] p-6 sm:p-8 backdrop-blur-xl">
          {/* Mode Switcher */}
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
                  Email (opcional para soporte)
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
            </div>

            {errorMsg && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-50"
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
