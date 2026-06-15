import React, { useState } from "react";
import { Activity, LogIn, UserPlus } from "lucide-react";
import { api, AUTH_TOKEN_KEY, AUTH_USER_KEY } from "../api/client";
import Card from "../components/Card";

export default function Login({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload = mode === "login"
        ? { username: form.username, password: form.password }
        : { username: form.username, email: form.email || null, password: form.password };
      const res = await api.post(endpoint, payload);
      localStorage.setItem(AUTH_TOKEN_KEY, res.data.access_token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.data.user));
      onAuthenticated(res.data.user);
    } catch (error) {
      setMessage(error.response?.data?.detail ?? "No se pudo autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-fitBg px-4 py-8 text-fitText">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(47,128,255,0.16),transparent_70%)]" />
      <main className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <header className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-blue-400/20 bg-blue-500/10 text-blue-100">
            <Activity size={28} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">FitTracker</p>
          <h1 className="mt-3 text-3xl font-black">Accedé a tu progreso</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Entrenamientos, medidas y récords en un solo lugar.</p>
        </header>

        <Card>
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${mode === "login" ? "bg-blue-500/15 text-blue-100" : "text-slate-400"}`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${mode === "register" ? "bg-blue-500/15 text-blue-100" : "text-slate-400"}`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <label className="ft-label">
              Usuario
              <input
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                className="ft-input mt-2"
                autoComplete="username"
                required
              />
            </label>
            {mode === "register" ? (
              <label className="ft-label">
                Email opcional
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  className="ft-input mt-2"
                  autoComplete="email"
                />
              </label>
            ) : null}
            <label className="ft-label">
              Contraseña
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className="ft-input mt-2"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </label>

            <button className="ft-button w-full" disabled={loading}>
              {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
              {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          </form>

          {message ? <p className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{message}</p> : null}
        </Card>
      </main>
    </div>
  );
}
