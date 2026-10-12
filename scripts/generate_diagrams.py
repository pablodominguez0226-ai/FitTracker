#!/usr/bin/env python3
"""
Genera diagramas anatómicos vectoriales SVG estáticos para FitTracker.
Los archivos se guardan en frontend/public/assets/diagrams/ y frontend/src/assets/exercise_diagrams/
con la paleta oficial (#FF5722 a #7C4DFF).
"""
import os

DIAGRAMS = {
    "pecho": {
        "title": "PECHO / PECTORAL",
        "badge": "Pectoral Mayor & Menor",
        "target_svg": """
            <!-- Pectoral Izquierdo -->
            <path d="M 72 68 C 82 65 97 70 97 90 C 87 97 73 93 68 82 C 67 76 69 70 72 68 Z" 
                  fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <!-- Pectoral Derecho -->
            <path d="M 128 68 C 118 65 103 70 103 90 C 113 97 127 93 132 82 C 133 76 131 70 128 68 Z" 
                  fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <!-- Separación esternal y fibras claviculares -->
            <path d="M 80 69 Q 97 73 97 84" stroke="#FFF" stroke-width="1" stroke-linecap="round" opacity="0.4" fill="none" />
            <path d="M 120 69 Q 103 73 103 84" stroke="#FFF" stroke-width="1" stroke-linecap="round" opacity="0.4" fill="none" />
        """,
    },
    "espalda": {
        "title": "ESPALDA / DORSAL",
        "badge": "Dorsal Ancho & Trapecio",
        "target_svg": """
            <!-- Trapecio Superior y Medio -->
            <path d="M 86 48 L 100 66 L 114 48 L 100 42 Z" 
                  fill="url(#muscleGrad)" opacity="0.85" />
            <path d="M 86 48 L 74 62 L 86 68 L 100 66 Z" 
                  fill="url(#muscleGrad)" opacity="0.9" />
            <path d="M 114 48 L 126 62 L 114 68 L 100 66 Z" 
                  fill="url(#muscleGrad)" opacity="0.9" />
            <!-- Dorsal Ancho (Lats) Izquierdo -->
            <path d="M 70 72 C 72 96 84 116 95 120 C 91 100 81 82 70 72 Z" 
                  fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <!-- Dorsal Ancho (Lats) Derecho -->
            <path d="M 130 72 C 128 96 116 116 105 120 C 109 100 119 82 130 72 Z" 
                  fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <!-- Columna & Espinales centrales -->
            <line x1="100" y1="66" x2="100" y2="124" stroke="#FF5722" stroke-width="1.5" stroke-dasharray="2 3" opacity="0.6" />
        """,
    },
    "pierna": {
        "title": "PIERNA / TREN INFERIOR",
        "badge": "Cuádriceps, Isquios & Gemelos",
        "target_svg": """
            <!-- Glúteos / Cadera superior -->
            <path d="M 78 126 C 74 134 84 140 98 138 C 96 130 88 125 78 126 Z" fill="url(#muscleGrad)" opacity="0.75" />
            <path d="M 122 126 C 126 134 116 140 102 138 C 104 130 112 125 122 126 Z" fill="url(#muscleGrad)" opacity="0.75" />
            <!-- Cuádriceps Izquierdo -->
            <path d="M 72 138 C 66 160 70 182 76 186 C 84 184 88 162 86 138 Z" 
                  fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <!-- Cuádriceps Derecho -->
            <path d="M 128 138 C 134 160 130 182 124 186 C 116 184 112 162 114 138 Z" 
                  fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <!-- Gemelo Izquierdo -->
            <path d="M 76 195 C 72 208 74 224 79 226 C 83 222 84 208 82 195 Z" 
                  fill="url(#muscleGrad)" opacity="0.9" />
            <!-- Gemelo Derecho -->
            <path d="M 124 195 C 128 208 126 224 121 226 C 117 222 116 208 118 195 Z" 
                  fill="url(#muscleGrad)" opacity="0.9" />
        """,
    },
    "hombro": {
        "title": "HOMBRO / DELTOIDES",
        "badge": "Deltoides Anterior, Lateral & Posterior",
        "target_svg": """
            <!-- Deltoides Izquierdo -->
            <path d="M 64 62 C 53 66 51 82 60 92 C 67 87 71 74 67 62 Z" 
                  fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <!-- Deltoides Derecho -->
            <path d="M 136 62 C 147 66 149 82 140 92 C 133 87 129 74 133 62 Z" 
                  fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <!-- Fibras superiores de articulación escapular -->
            <path d="M 67 62 Q 59 75 62 86" stroke="#FFF" stroke-width="1" stroke-linecap="round" opacity="0.5" fill="none" />
            <path d="M 133 62 Q 141 75 138 86" stroke="#FFF" stroke-width="1" stroke-linecap="round" opacity="0.5" fill="none" />
        """,
    },
    "brazos": {
        "title": "BRAZOS / BÍCEPS & TRÍCEPS",
        "badge": "Bíceps, Tríceps & Antebrazo",
        "target_svg": """
            <!-- Bíceps / Tríceps Brazo Izquierdo -->
            <path d="M 58 84 C 52 94 54 108 61 114 C 66 109 67 96 63 84 Z" 
                  fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <!-- Antebrazo Izquierdo -->
            <path d="M 59 116 C 54 128 55 142 60 146 C 64 143 66 130 63 116 Z" 
                  fill="url(#muscleGrad)" opacity="0.8" />
            <!-- Bíceps / Tríceps Brazo Derecho -->
            <path d="M 142 84 C 148 94 146 108 139 114 C 134 109 133 96 137 84 Z" 
                  fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <!-- Antebrazo Derecho -->
            <path d="M 141 116 C 146 128 145 142 140 146 C 136 143 134 130 137 116 Z" 
                  fill="url(#muscleGrad)" opacity="0.8" />
        """,
    },
    "biceps": {
        "title": "BÍCEPS",
        "badge": "Bíceps Braquial & Braquiorradial",
        "target_svg": """
            <!-- Bíceps Izquierdo -->
            <path d="M 60 86 C 55 96 56 108 62 112 C 66 107 67 96 63 86 Z" 
                  fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <!-- Bíceps Derecho -->
            <path d="M 140 86 C 145 96 144 108 138 112 C 134 107 133 96 137 86 Z" 
                  fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
        """,
    },
    "triceps": {
        "title": "TRÍCEPS",
        "badge": "Tríceps Braquial (Cabeza Larga y Lateral)",
        "target_svg": """
            <!-- Tríceps Izquierdo -->
            <path d="M 55 84 C 49 96 52 110 59 114 C 62 108 62 94 58 84 Z" 
                  fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <!-- Tríceps Derecho -->
            <path d="M 145 84 C 151 96 148 110 141 114 C 138 108 138 94 142 84 Z" 
                  fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
        """,
    },
    "core": {
        "title": "CORE / ABDOMINALES",
        "badge": "Recto Abdominal & Oblicuos",
        "target_svg": """
            <!-- Recto Abdominal - Segmentos superiores -->
            <rect x="91" y="93" width="7" height="6.5" rx="1.5" fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <rect x="102" y="93" width="7" height="6.5" rx="1.5" fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <!-- Recto Abdominal - Segmentos medios -->
            <rect x="91" y="102" width="7" height="6.5" rx="1.5" fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <rect x="102" y="102" width="7" height="6.5" rx="1.5" fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <!-- Recto Abdominal - Segmentos inferiores -->
            <rect x="91" y="111" width="7" height="8" rx="1.5" fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <rect x="102" y="111" width="7" height="8" rx="1.5" fill="url(#muscleGrad)" filter="url(#muscleGlow)" opacity="0.95" />
            <!-- Oblicuos Izquierdos -->
            <path d="M 76 94 C 73 106 77 119 83 124 C 82 114 79 104 79 94 Z" 
                  fill="url(#muscleGrad)" opacity="0.85" />
            <!-- Oblicuos Derechos -->
            <path d="M 124 94 C 127 106 123 119 117 124 C 118 114 121 104 121 94 Z" 
                  fill="url(#muscleGrad)" opacity="0.85" />
        """,
    },
}

BASE_ANATOMY_BODY = """
    <!-- Cabeza y Cuello -->
    <ellipse cx="100" cy="28" rx="13" ry="16" fill="#1C1C1F" stroke="#2C2C30" stroke-width="1.2" />
    <path d="M 94 43 L 94 51 Q 100 53 106 51 L 106 43 Z" fill="#18181B" stroke="#2C2C30" stroke-width="1" />

    <!-- Trapecio / Clavícula base -->
    <path d="M 94 49 L 70 62 L 64 68 L 76 72 L 95 68 L 100 70 L 105 68 L 124 72 L 136 68 L 130 62 L 106 49 Z" 
          fill="#1C1C20" stroke="#2C2C30" stroke-width="1" />

    <!-- Torso / Caja Torácica -->
    <path d="M 74 68 C 72 88 74 108 77 125 C 84 130 92 132 100 132 C 108 132 116 130 123 125 C 126 108 128 88 126 68 Z" 
          fill="#141416" stroke="#2A2A2E" stroke-width="1.2" />

    <!-- Pelvis / Cintura -->
    <path d="M 77 124 L 75 138 C 84 144 100 144 100 144 C 100 144 116 144 125 138 L 123 124 Z" 
          fill="#18181A" stroke="#28282C" stroke-width="1" />

    <!-- Brazos Base (Silueta) -->
    <!-- Izquierdo -->
    <path d="M 64 68 C 54 74 50 92 56 114 L 56 148 C 55 152 57 156 61 156 C 65 156 67 152 66 148 L 68 118 C 74 104 74 86 74 72 Z" 
          fill="#18181B" stroke="#28282C" stroke-width="1" />
    <!-- Derecho -->
    <path d="M 136 68 C 146 74 150 92 144 114 L 144 148 C 145 152 143 156 139 156 C 135 156 133 152 134 148 L 132 118 C 126 104 126 86 126 72 Z" 
          fill="#18181B" stroke="#28282C" stroke-width="1" />

    <!-- Piernas Base (Silueta) -->
    <!-- Izquierda -->
    <path d="M 75 137 C 67 160 68 188 74 194 L 73 228 C 73 233 76 235 80 235 C 84 235 87 232 86 226 L 86 195 C 92 186 96 162 96 140 Z" 
          fill="#161618" stroke="#28282C" stroke-width="1" />
    <!-- Derecha -->
    <path d="M 125 137 C 133 160 132 188 126 194 L 127 228 C 127 233 124 235 120 235 C 116 235 113 232 114 226 L 114 195 C 108 186 104 162 104 140 Z" 
          fill="#161618" stroke="#28282C" stroke-width="1" />

    <!-- Líneas guía biomecánicas sutiles -->
    <line x1="100" y1="52" x2="100" y2="132" stroke="#2A2A2E" stroke-width="1" stroke-dasharray="2 3" opacity="0.6" />
"""

def generate_svg(key: str, data: dict) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250" width="100%" height="100%" className="w-full h-full">
  <defs>
    <!-- Degradado mate oficial FitTracker -->
    <linearGradient id="muscleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF5722" />
      <stop offset="100%" stop-color="#7C4DFF" />
    </linearGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#121214" />
      <stop offset="100%" stop-color="#09090B" />
    </linearGradient>
    <filter id="muscleGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Fondo tecnológico oscuro -->
  <rect width="200" height="250" rx="16" fill="url(#bgGrad)" />
  <rect width="198" height="248" x="1" y="1" rx="15" fill="none" stroke="#2C2C2E" stroke-width="1" opacity="0.6" />

  <!-- Cuadrícula técnica sutil -->
  <g opacity="0.12" stroke="#FFF" stroke-width="0.5">
    <line x1="20" y1="0" x2="20" y2="250" />
    <line x1="100" y1="0" x2="100" y2="250" stroke-dasharray="3 3" />
    <line x1="180" y1="0" x2="180" y2="250" />
    <line x1="0" y1="50" x2="200" y2="50" />
    <line x1="0" y1="125" x2="200" y2="125" />
    <line x1="0" y1="195" x2="200" y2="195" />
  </g>

  <!-- Silueta anatómica base -->
  <g id="base-anatomy">
    {BASE_ANATOMY_BODY}
  </g>

  <!-- Músculo objetivo activado con degradado FitTracker -->
  <g id="target-muscle">
    {data["target_svg"]}
  </g>

  <!-- Etiqueta técnica biomecánica inferior -->
  <g transform="translate(100, 238)">
    <rect x="-70" y="-14" width="140" height="15" rx="7.5" fill="#18181B" stroke="#2C2C2E" stroke-width="0.8" />
    <text text-anchor="middle" y="-3" fill="#E4E4E7" font-size="7.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" letter-spacing="0.5">
      {data["badge"].upper()}
    </text>
  </g>
</svg>"""

def main():
    dirs = [
        "frontend/public/assets/diagrams",
        "frontend/src/assets/exercise_diagrams"
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

    for name, info in DIAGRAMS.items():
        svg_content = generate_svg(name, info)
        for d in dirs:
            file_path = os.path.join(d, f"{name}.svg")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(svg_content)
            print(f"Generated: {file_path}")

if __name__ == "__main__":
    main()
