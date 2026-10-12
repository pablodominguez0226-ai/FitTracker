#!/usr/bin/env python3
"""
Actualiza las URLs de imágenes y diagramas técnicos en data/fittracker.db.
Asigna URLs públicas estables de Wikimedia Commons a los ejercicios principales,
y rutas locales /assets/diagrams/[músculo].svg para el resto.
"""
import sqlite3
import os

DB_PATH = "data/fittracker.db"

STABLE_EXERCISE_IMAGES = {
    # Pecho
    "press banca plano con barra": "https://upload.wikimedia.org/wikipedia/commons/9/9c/Bench-press-1.png",
    "press plano con mancuernas": "/assets/diagrams/pecho.svg",
    "press inclinado con barra": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Bench_press_2.svg/800px-Bench_press_2.svg.png",
    "press inclinado con mancuernas": "/assets/diagrams/pecho.svg",
    "press declinado con barra": "/assets/diagrams/pecho.svg",
    "fondos en paralelas para pecho": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Dips.svg/800px-Dips.svg.png",
    "aperturas en banco con mancuernas": "/assets/diagrams/pecho.svg",
    "cruces en polea alta (haz inferior)": "/assets/diagrams/pecho.svg",
    # Espalda
    "peso muerto convencional con barra": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Deadlift.svg/800px-Deadlift.svg.png",
    "dominadas": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Pull-up-1.svg/800px-Pull-up-1.svg.png",
    "remo con barra (prono/supino)": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bent-over-row-1.png/800px-Bent-over-row-1.png",
    "remo pendlay con barra": "/assets/diagrams/espalda.svg",
    "jalón al pecho prono en polea alta": "/assets/diagrams/espalda.svg",
    "peso muerto rumano con barra": "/assets/diagrams/espalda.svg",
    # Pierna
    "sentadilla trasera con barra (back squat)": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Squats.svg/800px-Squats.svg.png",
    "sentadilla frontal con barra": "/assets/diagrams/pierna.svg",
    "prensa inclinada con discos": "/assets/diagrams/pierna.svg",
    "hip thrust con barra": "/assets/diagrams/pierna.svg",
    "curl femoral acostado en máquina": "/assets/diagrams/pierna.svg",
    "extensión de cuádriceps en máquina": "/assets/diagrams/pierna.svg",
    "elevación de talones de pie en máquina": "/assets/diagrams/pierna.svg",
    # Hombro
    "press militar de pie con barra": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Overhead-press-1.svg/800px-Overhead-press-1.svg.png",
    "press de hombros sentado con mancuernas": "/assets/diagrams/hombro.svg",
    "elevaciones laterales con mancuernas": "/assets/diagrams/hombro.svg",
    "pájaros para deltoides posterior con mancuernas": "/assets/diagrams/hombro.svg",
    "face pulls en polea alta con cuerda": "/assets/diagrams/hombro.svg",
    # Brazos
    "curl con barra z": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Biceps-curl-1.png/800px-Biceps-curl-1.png",
    "curl martillo con mancuernas": "/assets/diagrams/biceps.svg",
    "press francés con barra z": "/assets/diagrams/triceps.svg",
    "extensiones en polea alta con cuerda": "/assets/diagrams/triceps.svg",
    "extensión en polea con barra (pushdown)": "/assets/diagrams/triceps.svg",
    # Core
    "crunch abdominal en máquina": "/assets/diagrams/core.svg",
    "elevación de piernas colgado": "/assets/diagrams/core.svg",
    "plancha isométrica": "/assets/diagrams/core.svg",
    "rueda abdominal (ab wheel)": "/assets/diagrams/core.svg",
}

def get_image_url(name: str, group_name: str | None) -> str:
    clean_name = (name or "").strip().lower()
    if clean_name in STABLE_EXERCISE_IMAGES:
        return STABLE_EXERCISE_IMAGES[clean_name]

    for k, v in STABLE_EXERCISE_IMAGES.items():
        if k in clean_name or clean_name in k:
            return v

    mg = (group_name or "").strip().lower()
    if "pecho" in mg or "pectoral" in mg or "banca" in clean_name:
        return "/assets/diagrams/pecho.svg"
    elif "espalda" in mg or "dorsal" in mg or "remo" in clean_name or "jalón" in clean_name or "jalon" in clean_name:
        return "/assets/diagrams/espalda.svg"
    elif "pierna" in mg or "cuádriceps" in mg or "cuadriceps" in mg or "sentadilla" in clean_name or "prensa" in clean_name:
        return "/assets/diagrams/pierna.svg"
    elif "hombro" in mg or "deltoid" in mg or "militar" in clean_name:
        return "/assets/diagrams/hombro.svg"
    elif "bíceps" in mg or "biceps" in mg or "curl" in clean_name:
        return "/assets/diagrams/biceps.svg"
    elif "tríceps" in mg or "triceps" in mg or "fondo" in clean_name or "pushdown" in clean_name:
        return "/assets/diagrams/triceps.svg"
    elif "brazo" in mg:
        return "/assets/diagrams/brazos.svg"
    elif "core" in mg or "abdom" in mg or "crunch" in clean_name:
        return "/assets/diagrams/core.svg"

    return "/assets/diagrams/pecho.svg"

def main():
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found.")
        return

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    cur.execute("""
        SELECT e.id, e.name, mg.name, e.image_url
        FROM exercises e
        LEFT JOIN muscle_groups mg ON e.muscle_group_id = mg.id
    """)
    rows = cur.fetchall()

    updated_count = 0
    for ex_id, name, group_name, current_img in rows:
        target_img = get_image_url(name, group_name)
        # Update if None, empty, or outdated
        if not current_img or not current_img.strip() or "example.com" in current_img:
            cur.execute("UPDATE exercises SET image_url = ? WHERE id = ?", (target_img, ex_id))
            updated_count += 1

    con.commit()
    print(f"Total exercises checked: {len(rows)}. Successfully updated image_url for: {updated_count} exercises.")

    # Verification
    cur.execute("SELECT COUNT(*), COUNT(image_url) FROM exercises")
    print("Post-update verification (total, with image_url):", cur.fetchone())

    cur.execute("SELECT name, image_url FROM exercises LIMIT 10")
    for r in cur.fetchall():
        print("  ->", r)

    con.close()

if __name__ == "__main__":
    main()
