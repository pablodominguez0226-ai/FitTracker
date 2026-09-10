import React from "react";
import { AlertTriangle, RefreshCw, Trash2, Home } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("FitTracker Error Boundary interceptó una excepción:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetSession = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn("Error al limpiar storage:", e);
    }
    window.location.href = "/";
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage =
        this.state.error?.message ||
        (typeof this.state.error === "string" ? this.state.error : "Error desconocido");

      return (
        <div className="min-h-screen bg-[#09060E] text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
          {/* Background Ambient Glow */}
          <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[#9333EA]/15 blur-[120px]" />
          <div className="pointer-events-none absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-red-600/10 blur-[100px]" />

          <div className="relative w-full max-w-lg rounded-3xl border border-[#2D1B4E] bg-[#140E24]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
            {/* Header Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10 text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.25)]">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#A855F7]/40 bg-[#9333EA]/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#C084FC]">
                FitTracker OLED • Error Boundary
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Algo interrumpió la aplicación
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                React capturó una excepción al montar la interfaz. Tus datos están a salvo en la base de datos.
              </p>
            </div>

            {/* Error Message Box */}
            <div className="text-left rounded-2xl border border-red-500/30 bg-[#0E0919] p-4 text-xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-400 block">
                Detalle del Error:
              </span>
              <p className="font-mono text-xs text-red-200 break-words leading-relaxed">
                {errorMessage}
              </p>

              {this.state.errorInfo?.componentStack && (
                <details className="mt-3 pt-2 border-t border-[#2D1B4E] text-[11px] text-[#71717A]">
                  <summary className="cursor-pointer font-bold hover:text-[#A1A1AA] select-none">
                    Ver pila de componentes (Stack Trace)
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-zinc-400 p-2 rounded-lg bg-[#09060E] custom-scrollbar">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#A855F7] py-3 px-4 text-xs font-bold text-white shadow-neon transition hover:opacity-95 active:scale-95"
              >
                <RefreshCw size={15} />
                <span>Recargar Aplicación</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetSession}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 py-3 px-4 text-xs font-bold text-red-300 transition hover:bg-red-500/20 active:scale-95"
                title="Borra tokens corruptos o drafts dañados de localStorage y vuelve al inicio"
              >
                <Trash2 size={15} />
                <span>Limpiar Caché y Sesión</span>
              </button>
            </div>

            <button
              type="button"
              onClick={this.handleRetry}
              className="text-xs text-[#71717A] hover:text-[#C084FC] transition inline-flex items-center gap-1 font-semibold"
            >
              <Home size={12} />
              <span>Intentar reanudar sin recargar</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
