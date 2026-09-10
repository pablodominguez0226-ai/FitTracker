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
      <div className="relative w-full max-w-lg rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-5 sm:p-6 shadow-2xl text-white">
        {/* Close button */}
        <button
          onClick={handleReset}
          className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
        >
          <X size={20} />
        </button>

        {sentSuccess ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">¡Solicitud enviada!</h3>
            <p className="text-sm text-[#A1A1AA] max-w-sm mx-auto mb-6">
              El administrador recibió tu mensaje y te contactará o actualizará tu cuenta a la brevedad.
            </p>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#A855F7] font-bold text-sm text-white shadow-neon hover:opacity-95 transition"
            >
              Entendido
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9333EA]/20 border border-[#A855F7]/30 text-[#C084FC]">
                <HelpCircle size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Contactar al Administrador</h3>
                <p className="text-xs text-[#A1A1AA]">Soporte para restablecer contraseñas o consultas</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">Tu Usuario</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej. pablo"
                    className="w-full rounded-xl border border-[#2D1B4E] bg-[#09060E] px-3.5 py-2 text-white placeholder-[#71717A] focus:border-[#A855F7] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">Email de contacto</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full rounded-xl border border-[#2D1B4E] bg-[#09060E] px-3.5 py-2 text-white placeholder-[#71717A] focus:border-[#A855F7] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">Motivo / Asunto</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-[#2D1B4E] bg-[#09060E] px-3 py-2 text-white focus:border-[#A855F7] focus:outline-none"
                >
                  <option value="Recuperación de contraseña / Acceso">Olvidé mi contraseña / No puedo ingresar</option>
                  <option value="Problema con mi cuenta">Problema con mi cuenta o activación</option>
                  <option value="Consulta sobre entrenamientos">Consulta sobre rutinas o ejercicios</option>
                  <option value="Otro motivo">Otro motivo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">Mensaje o detalle</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Explicá lo que te sucede para que el administrador pueda ayudarte rápidamente..."
                  className="w-full rounded-xl border border-[#2D1B4E] bg-[#09060E] px-3.5 py-2 text-white placeholder-[#71717A] focus:border-[#A855F7] focus:outline-none resize-none"
                  required
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-bold text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#A855F7] px-4 py-2 text-xs font-bold text-white shadow-neon hover:opacity-95 transition disabled:opacity-50"
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
