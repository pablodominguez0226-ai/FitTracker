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
        <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#1C1C1E] p-6 sm:p-8 text-center space-y-6">
            {/* Header Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#8E8E93]">
                FitTracker OLED • Error Boundary
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Algo interrumpió la aplicación
              </h1>
              <p className="text-xs sm:text-sm text-[#8E8E93] leading-relaxed">
                React capturó una excepción al montar la interfaz. Tus datos están a salvo en la base de datos.
              </p>
            </div>

            {/* Error Message Box */}
            <div className="text-left rounded-2xl border border-red-500/20 bg-[#121212] p-4 text-xs space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400 block">
                Detalle del Error:
              </span>
              <p className="font-mono text-xs text-red-200 break-words leading-relaxed">
                {errorMessage}
              </p>

              {this.state.errorInfo?.componentStack && (
                <details className="mt-3 pt-2 border-t border-white/10 text-[11px] text-[#8E8E93]">
                  <summary className="cursor-pointer font-medium hover:text-white select-none">
                    Ver pila de componentes (Stack Trace)
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-zinc-400 p-2 rounded-xl bg-[#000000] custom-scrollbar">
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
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] py-3.5 px-4 text-xs font-semibold text-white transition hover:opacity-90 active:scale-95"
              >
                <RefreshCw size={15} />
                <span>Recargar Aplicación</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetSession}
                className="flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 py-3.5 px-4 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 active:scale-95"
                title="Borra tokens corruptos o drafts dañados de localStorage y vuelve al inicio"
              >
                <Trash2 size={15} />
                <span>Limpiar Caché y Sesión</span>
              </button>
            </div>

            <button
              type="button"
              onClick={this.handleRetry}
              className="text-xs text-[#8E8E93] hover:text-white transition inline-flex items-center gap-1 font-medium"
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
