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
    <div className="min-h-screen bg-[#09060E] text-white flex flex-col justify-center px-4 py-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[#9333EA]/10 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[10%] w-[350px] h-[350px] rounded-full bg-[#A855F7]/10 blur-[100px]" />

      <div className="relative mx-auto w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#9333EA] to-[#A855F7] text-white shadow-neon">
            <Dumbbell size={28} />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-black tracking-wider text-white">
              FIT<span className="text-[#A855F7]">TRACKER</span>
            </span>
            <span className="rounded-full border border-[#A855F7]/40 bg-[#9333EA]/15 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#C084FC]">
              OLED GYM
            </span>
          </div>
          <p className="mt-2 text-xs text-[#A1A1AA]">
            {mode === "login"
              ? "Ingresá a tu espacio individual de entrenamiento"
              : "Creá tu cuenta para registrar tus cargas y récords"}
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl border border-[#2D1B4E] bg-[#140E24]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#2D1B4E] bg-[#09060E] p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg("");
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
                mode === "login"
                  ? "border border-[#A855F7]/40 bg-[#1C1433] text-[#C084FC] shadow-neon"
                  : "text-[#71717A] hover:text-white"
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
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
                mode === "register"
                  ? "border border-[#A855F7]/40 bg-[#1C1433] text-[#C084FC] shadow-neon"
                  : "text-[#71717A] hover:text-white"
              }`}
            >
              <UserPlus size={15} />
              Crear Cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5 flex items-center gap-1.5">
                <User size={13} className="text-[#A855F7]" />
                Usuario
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Ej. pablo"
                autoComplete="username"
                className="w-full rounded-xl border border-[#2D1B4E] bg-[#09060E] px-4 py-2.5 text-sm text-white placeholder-[#52525B] focus:border-[#A855F7] focus:outline-none transition"
                required
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5 flex items-center gap-1.5">
                  <Mail size={13} className="text-[#A855F7]" />
                  Email (opcional para soporte)
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="tuemail@ejemplo.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-[#2D1B4E] bg-[#09060E] px-4 py-2.5 text-sm text-white placeholder-[#52525B] focus:border-[#A855F7] focus:outline-none transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5 flex items-center gap-1.5">
                <Lock size={13} className="text-[#A855F7]" />
                Contraseña
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="w-full rounded-xl border border-[#2D1B4E] bg-[#09060E] px-4 py-2.5 text-sm text-white placeholder-[#52525B] focus:border-[#A855F7] focus:outline-none transition"
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
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#A855F7] py-3 text-sm font-bold text-white shadow-neon transition hover:opacity-95 active:scale-95 disabled:opacity-50"
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
          <div className="mt-6 pt-5 border-t border-[#2D1B4E]/60 text-center">
            <button
              type="button"
              onClick={() => setIsSupportOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-[#A855F7] hover:text-[#C084FC] transition hover:underline"
            >
              <HelpCircle size={13} />
              <span>¿Olvidaste tu contraseña o necesitás ayuda con tu cuenta?</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[10px] text-[#71717A]">
          <div className="p-2 rounded-xl border border-[#2D1B4E]/40 bg-[#140E24]/40">
            <span className="block font-bold text-[#A1A1AA]">Privacidad</span>
            Espacio individual
          </div>
          <div className="p-2 rounded-xl border border-[#2D1B4E]/40 bg-[#140E24]/40">
            <span className="block font-bold text-[#A1A1AA]">Soporte</span>
            Admin disponible
          </div>
          <div className="p-2 rounded-xl border border-[#2D1B4E]/40 bg-[#140E24]/40">
            <span className="block font-bold text-[#A1A1AA]">Récords</span>
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
