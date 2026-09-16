import React, { useState } from "react";
import { CheckCircle2, HelpCircle, Mail, MessageSquare, Send, X } from "lucide-react";
import { submitSupportRequest } from "../api/client";

export default function SupportModal({ isOpen, onClose, initialUsername = "", initialEmail = "" }) {
  const [username, setUsername] = useState(initialUsername);
  const [email, setEmail] = useState(initialEmail);
  const [subject, setSubject] = useState("Recuperación de contraseña / Acceso");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMsg("Por favor describí lo que necesitás en el mensaje.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      await submitSupportRequest({
        username: username.trim() || null,
        email: email.trim() || null,
        subject,
        message: message.trim(),
      });
      setSentSuccess(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "No se pudo enviar la solicitud. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSentSuccess(false);
    setMessage("");
    setErrorMsg("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#1C1C1E] p-5 sm:p-6 text-white">
        {/* Close button */}
        <button
          onClick={handleReset}
          className="absolute top-4 right-4 text-[#8E8E93] hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition"
        >
          <X size={20} />
        </button>

        {sentSuccess ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">¡Solicitud enviada!</h3>
            <p className="text-sm text-[#8E8E93] max-w-sm mx-auto mb-6">
              El administrador recibió tu mensaje y te contactará o actualizará tu cuenta a la brevedad.
            </p>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] font-semibold text-sm text-white hover:opacity-90 transition"
            >
              Entendido
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF5722]/10 text-[#FF5722]">
                <HelpCircle size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Contactar al Administrador</h3>
                <p className="text-xs text-[#8E8E93]">Soporte para restablecer contraseñas o consultas</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8E8E93] mb-1">Tu Usuario</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej. pablo"
                    className="w-full rounded-2xl border border-white/10 bg-[#121212] px-3.5 py-2.5 text-white placeholder-[#8E8E93] focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8E8E93] mb-1">Email de contacto</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full rounded-2xl border border-white/10 bg-[#121212] px-3.5 py-2.5 text-white placeholder-[#8E8E93] focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8E8E93] mb-1">Motivo / Asunto</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#121212] px-3 py-2.5 text-white focus:border-[#FF5722] focus:outline-none"
                >
                  <option value="Recuperación de contraseña / Acceso">Olvidé mi contraseña / No puedo ingresar</option>
                  <option value="Problema con mi cuenta">Problema con mi cuenta o activación</option>
                  <option value="Consulta sobre entrenamientos">Consulta sobre rutinas o ejercicios</option>
                  <option value="Otro motivo">Otro motivo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8E8E93] mb-1">Mensaje o detalle</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Explicá lo que te sucede para que el administrador pueda ayudarte rápidamente..."
                  className="w-full rounded-2xl border border-white/10 bg-[#121212] px-3.5 py-2.5 text-white placeholder-[#8E8E93] focus:border-[#FF5722] focus:outline-none resize-none"
                  required
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 text-xs font-semibold text-[#8E8E93] hover:text-white hover:bg-white/5 rounded-2xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] px-5 py-2.5 text-xs font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
                >
                  <Send size={14} />
                  {loading ? "Enviando..." : "Enviar Solicitud"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
