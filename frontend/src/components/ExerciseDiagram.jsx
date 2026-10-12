import React from "react";

/**
 * ExerciseDiagram - Fallback Anatómico Vectorial Universal
 * Resalta el grupo muscular en función del grupo o nombre del ejercicio
 * con el degradado mate oficial de FitTracker (#FF5722 a #7C4DFF).
 */
export default function ExerciseDiagram({
  muscleGroup = "Pecho",
  exerciseName = "",
  className = "",
}) {
  const normGroup = (groupStr, nameStr) => {
    const text = `${groupStr || ""} ${nameStr || ""}`.toLowerCase();
    if (text.includes("pecho") || text.includes("banca") || text.includes("apertura") || text.includes("fondo") || text.includes("pectoral")) {
      return "pecho";
    }
    if (text.includes("espalda") || text.includes("remo") || text.includes("jalón") || text.includes("jalon") || text.includes("dominada") || text.includes("muerto") || text.includes("dorsal")) {
      return "espalda";
    }
    if (text.includes("pierna") || text.includes("sentadilla") || text.includes("prensa") || text.includes("femoral") || text.includes("gemelo") || text.includes("cuádriceps") || text.includes("cuadriceps") || text.includes("zancada")) {
      return "pierna";
    }
    if (text.includes("hombro") || text.includes("militar") || text.includes("lateral") || text.includes("pájaro") || text.includes("pajaro") || text.includes("deltoides")) {
      return "hombro";
    }
    if (text.includes("bíceps") || text.includes("biceps") || text.includes("curl")) {
      return "biceps";
    }
    if (text.includes("tríceps") || text.includes("triceps") || text.includes("pushdown") || text.includes("francés") || text.includes("frances")) {
      return "triceps";
    }
    if (text.includes("brazo")) {
      return "brazos";
    }
    if (text.includes("core") || text.includes("abdom") || text.includes("crunch") || text.includes("plancha") || text.includes("rueda")) {
      return "core";
    }
    return "pecho";
  };

  const key = normGroup(muscleGroup, exerciseName);

  const labels = {
    pecho: { title: "PECTORALES", sub: "Pectoral Mayor & Menor" },
    espalda: { title: "DORSALES", sub: "Dorsal Ancho & Trapecio" },
    pierna: { title: "TREN INFERIOR", sub: "Cuádriceps, Isquios & Gemelos" },
    hombro: { title: "DELTOIDES", sub: "Anterior, Lateral & Posterior" },
    brazos: { title: "BRAZOS", sub: "Bíceps, Tríceps & Antebrazo" },
    biceps: { title: "BÍCEPS", sub: "Bíceps Braquial & Braquiorradial" },
    triceps: { title: "TRÍCEPS", sub: "Tríceps Braquial" },
    core: { title: "CORE", sub: "Recto Abdominal & Oblicuos" },
  };

  const currentLabel = labels[key] || labels.pecho;

  return (
    <div
      className={`relative w-full h-full min-h-[180px] max-h-[240px] flex items-center justify-center select-none overflow-hidden rounded-2xl bg-[#0C0C0E] border border-white/5 p-3 ${className}`}
    >
      <svg
        viewBox="0 0 200 240"
        className="w-full h-full max-h-[220px] object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="diagramMuscleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF5722" />
            <stop offset="100%" stopColor="#7C4DFF" />
          </linearGradient>
          <filter id="diagramMuscleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Guías técnicas biomecánicas de fondo */}
        <g opacity="0.15" stroke="#FFFFFF" strokeWidth="0.5">
          <line x1="25" y1="0" x2="25" y2="240" />
          <line x1="100" y1="0" x2="100" y2="240" strokeDasharray="3 3" />
          <line x1="175" y1="0" x2="175" y2="240" />
          <line x1="0" y1="45" x2="200" y2="45" />
          <line x1="0" y1="120" x2="200" y2="120" />
          <line x1="0" y1="185" x2="200" y2="185" />
        </g>

        {/* Silueta anatómica base universal */}
        <g id="base-anatomy-body">
          {/* Cabeza y cuello */}
          <ellipse cx="100" cy="26" rx="12" ry="15" fill="#1C1C1F" stroke="#2C2C30" strokeWidth="1.2" />
          <path d="M 94 40 L 94 48 Q 100 50 106 48 L 106 40 Z" fill="#18181B" stroke="#2C2C30" strokeWidth="1" />

          {/* Clavícula / base */}
          <path
            d="M 94 47 L 70 60 L 64 66 L 76 70 L 95 66 L 100 68 L 105 66 L 124 70 L 136 66 L 130 60 L 106 47 Z"
            fill="#1C1C20"
            stroke="#2C2C30"
            strokeWidth="1"
          />

          {/* Torso / Costillas */}
          <path
            d="M 74 66 C 72 86 74 104 77 120 C 84 125 92 127 100 127 C 108 127 116 125 123 120 C 126 104 128 86 126 66 Z"
            fill="#141416"
            stroke="#2A2A2E"
            strokeWidth="1.2"
          />

          {/* Pelvis / Cadera */}
          <path
            d="M 77 119 L 75 132 C 84 138 100 138 100 138 C 100 138 116 138 125 132 L 123 119 Z"
            fill="#18181A"
            stroke="#28282C"
            strokeWidth="1"
          />

          {/* Brazos Silueta Base */}
          <path
            d="M 64 66 C 54 72 50 88 56 110 L 56 142 C 55 146 57 150 61 150 C 65 150 67 146 66 142 L 68 114 C 74 100 74 84 74 70 Z"
            fill="#18181B"
            stroke="#28282C"
            strokeWidth="1"
          />
          <path
            d="M 136 66 C 146 72 150 88 144 110 L 144 142 C 145 146 143 150 139 150 C 135 150 133 146 134 142 L 132 114 C 126 100 126 84 126 70 Z"
            fill="#18181B"
            stroke="#28282C"
            strokeWidth="1"
          />

          {/* Piernas Silueta Base */}
          <path
            d="M 75 131 C 67 154 68 180 74 186 L 73 218 C 73 223 76 225 80 225 C 84 225 87 222 86 216 L 86 187 C 92 178 96 156 96 134 Z"
            fill="#161618"
            stroke="#28282C"
            strokeWidth="1"
          />
          <path
            d="M 125 131 C 133 154 132 180 126 186 L 127 218 C 127 223 124 225 120 225 C 116 225 113 222 114 216 L 114 187 C 108 178 104 156 104 134 Z"
            fill="#161618"
            stroke="#28282C"
            strokeWidth="1"
          />
        </g>

        {/* Resaltado dinámico según grupo muscular */}
        <g id="muscle-highlight">
          {key === "pecho" && (
            <>
              <path
                d="M 72 66 C 82 63 97 68 97 88 C 87 95 73 91 68 80 C 67 74 69 68 72 66 Z"
                fill="url(#diagramMuscleGrad)"
                filter="url(#diagramMuscleGlow)"
                opacity="0.95"
              />
              <path
                d="M 128 66 C 118 63 103 68 103 88 C 113 95 127 91 132 80 C 133 74 131 68 128 66 Z"
                fill="url(#diagramMuscleGrad)"
                filter="url(#diagramMuscleGlow)"
                opacity="0.95"
              />
              <path d="M 80 67 Q 97 71 97 82" stroke="#FFF" strokeWidth="1" strokeLinecap="round" opacity="0.4" fill="none" />
              <path d="M 120 67 Q 103 71 103 82" stroke="#FFF" strokeWidth="1" strokeLinecap="round" opacity="0.4" fill="none" />
            </>
          )}

          {key === "espalda" && (
            <>
              <path d="M 86 46 L 100 64 L 114 46 L 100 40 Z" fill="url(#diagramMuscleGrad)" opacity="0.85" />
              <path d="M 86 46 L 74 60 L 86 66 L 100 64 Z" fill="url(#diagramMuscleGrad)" opacity="0.9" />
              <path d="M 114 46 L 126 60 L 114 66 L 100 64 Z" fill="url(#diagramMuscleGrad)" opacity="0.9" />
              <path
                d="M 70 70 C 72 94 84 112 95 116 C 91 96 81 78 70 70 Z"
                fill="url(#diagramMuscleGrad)"
                filter="url(#diagramMuscleGlow)"
                opacity="0.95"
              />
              <path
                d="M 130 70 C 128 94 116 112 105 116 C 109 96 119 78 130 70 Z"
                fill="url(#diagramMuscleGrad)"
                filter="url(#diagramMuscleGlow)"
                opacity="0.95"
              />
              <line x1="100" y1="64" x2="100" y2="120" stroke="#FF5722" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.6" />
            </>
          )}

          {key === "pierna" && (
            <>
              <path d="M 78 122 C 74 130 84 136 98 134 C 96 126 88 121 78 122 Z" fill="url(#diagramMuscleGrad)" opacity="0.75" />
              <path d="M 122 122 C 126 130 116 136 102 134 C 104 126 112 121 122 122 Z" fill="url(#diagramMuscleGrad)" opacity="0.75" />
              <path
                d="M 72 134 C 66 156 70 178 76 182 C 84 180 88 158 86 134 Z"
                fill="url(#diagramMuscleGrad)"
                filter="url(#diagramMuscleGlow)"
                opacity="0.95"
              />
              <path
                d="M 128 134 C 134 156 130 178 124 182 C 116 180 112 158 114 134 Z"
                fill="url(#diagramMuscleGrad)"
                filter="url(#diagramMuscleGlow)"
                opacity="0.95"
              />
              <path d="M 76 190 C 72 203 74 218 79 220 C 83 216 84 203 82 190 Z" fill="url(#diagramMuscleGrad)" opacity="0.9" />
              <path d="M 124 190 C 128 203 126 218 121 220 C 117 216 116 203 118 190 Z" fill="url(#diagramMuscleGrad)" opacity="0.9" />
            </>
          )}

          {key === "hombro" && (
            <>
              <path
                d="M 64 60 C 53 64 51 80 60 90 C 67 85 71 72 67 60 Z"
                fill="url(#diagramMuscleGrad)"
                filter="url(#diagramMuscleGlow)"
                opacity="0.95"
              />
              <path
                d="M 136 60 C 147 64 149 80 140 90 C 133 85 129 72 133 60 Z"
                fill="url(#diagramMuscleGrad)"
                filter="url(#diagramMuscleGlow)"
                opacity="0.95"
              />
              <path d="M 67 60 Q 59 73 62 84" stroke="#FFF" strokeWidth="1" strokeLinecap="round" opacity="0.5" fill="none" />
              <path d="M 133 60 Q 141 73 138 84" stroke="#FFF" strokeWidth="1" strokeLinecap="round" opacity="0.5" fill="none" />
            </>
          )}

          {key === "brazos" && (
            <>
              <path
                d="M 58 82 C 52 92 54 106 61 112 C 66 107 67 94 63 82 Z"
                fill="url(#diagramMuscleGrad)"
                filter="url(#diagramMuscleGlow)"
                opacity="0.95"
              />
              <path d="M 59 114 C 54 126 55 138 60 142 C 64 139 66 128 63 114 Z" fill="url(#diagramMuscleGrad)" opacity="0.8" />
              <path
                d="M 142 82 C 148 92 146 106 139 112 C 134 107 133 94 137 82 Z"
                fill="url(#diagramMuscleGrad)"
                filter="url(#diagramMuscleGlow)"
                opacity="0.95"
              />
              <path d="M 141 114 C 146 126 145 138 140 142 C 136 139 134 128 137 114 Z" fill="url(#diagramMuscleGrad)" opacity="0.8" />
            </>
          )}

          {key === "biceps" && (
            <>
              <path
                d="M 60 84 C 55 94 56 106 62 110 C 66 105 67 94 63 84 Z"
                fill="url(#diagramMuscleGrad)"
                filter="url(#diagramMuscleGlow)"
                opacity="0.95"
              />
              <path
                d="M 140 84 C 145 94 144 106 138 110 C 134 105 133 94 137 84 Z"
                fill="url(#diagramMuscleGrad)"
                filter="url(#diagramMuscleGlow)"
                opacity="0.95"
              />
            </>
          )}

          {key === "triceps" && (
            <>
              <path
                d="M 55 82 C 49 94 52 108 59 112 C 62 106 62 92 58 82 Z"
                fill="url(#diagramMuscleGrad)"
                filter="url(#diagramMuscleGlow)"
                opacity="0.95"
              />
              <path
                d="M 145 82 C 151 94 148 108 141 112 C 138 106 138 92 142 82 Z"
                fill="url(#diagramMuscleGrad)"
                filter="url(#diagramMuscleGlow)"
                opacity="0.95"
              />
            </>
          )}

          {key === "core" && (
            <>
              <rect x="91" y="90" width="7" height="6.5" rx="1.5" fill="url(#diagramMuscleGrad)" filter="url(#diagramMuscleGlow)" opacity="0.95" />
              <rect x="102" y="90" width="7" height="6.5" rx="1.5" fill="url(#diagramMuscleGrad)" filter="url(#diagramMuscleGlow)" opacity="0.95" />
              <rect x="91" y="99" width="7" height="6.5" rx="1.5" fill="url(#diagramMuscleGrad)" filter="url(#diagramMuscleGlow)" opacity="0.95" />
              <rect x="102" y="99" width="7" height="6.5" rx="1.5" fill="url(#diagramMuscleGrad)" filter="url(#diagramMuscleGlow)" opacity="0.95" />
              <rect x="91" y="108" width="7" height="7.5" rx="1.5" fill="url(#diagramMuscleGrad)" filter="url(#diagramMuscleGlow)" opacity="0.95" />
              <rect x="102" y="108" width="7" height="7.5" rx="1.5" fill="url(#diagramMuscleGrad)" filter="url(#diagramMuscleGlow)" opacity="0.95" />
              <path d="M 76 91 C 73 103 77 116 83 121 C 82 111 79 101 79 91 Z" fill="url(#diagramMuscleGrad)" opacity="0.85" />
              <path d="M 124 91 C 127 103 123 116 117 121 C 118 111 121 101 121 91 Z" fill="url(#diagramMuscleGrad)" opacity="0.85" />
            </>
          )}
        </g>

        {/* Badge inferior en el SVG */}
        <g transform="translate(100, 230)">
          <rect x="-65" y="-12" width="130" height="15" rx="7.5" fill="#18181B" stroke="#2C2C2E" strokeWidth="0.8" />
          <text
            textAnchor="middle"
            y="-1"
            fill="#E4E4E7"
            fontSize="7"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="700"
            letterSpacing="0.5"
          >
            {currentLabel.title} • {currentLabel.sub}
          </text>
        </g>
      </svg>
    </div>
  );
}
