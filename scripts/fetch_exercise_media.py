#!/usr/bin/env python3
"""
Script automatizado de descarga, normalización y sincronización de assets multimedia
de ejercicios en formato "Modelo Anatómico 3D Ilustrado" (escala de grises con fibras
musculares y músculo activo resaltado en rojo sobre fondo blanco #FFFFFF).

Fuente Open Source:
- Repositorio público de animaciones 3D anatómicas:
  https://raw.githubusercontent.com/JahelCuadrado/ExerciseGymGifsDB/main/

Acciones:
1. Descarga en paralelo los GIFs 3D anatómicos hacia:
   - frontend/public/media/pecho/<slug>.gif
   - frontend/public/media/espalda/<slug>.gif
   - frontend/public/media/brazos/<slug>.gif
   - frontend/public/media/piernas/<slug>.gif
2. Crea alias compatibles sin prefijo si difieren del slug completo.
3. Actualiza exercises_master.json (backend y frontend), fallbackCatalog.json,
   backend/app/db/catalog.py y la base de datos SQLite (data/fittracker.db)
   para que cada ejercicio apunte a /media/<categoria>/<slug>.gif.
"""

from __future__ import annotations

import concurrent.futures
import io
import json
import os
import re
import shutil
import sqlite3
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_MEDIA_DIR = BASE_DIR / "frontend" / "public" / "media"
BACKEND_MASTER_JSON = BASE_DIR / "backend" / "app" / "db" / "exercises_master.json"
FRONTEND_MASTER_JSON = BASE_DIR / "frontend" / "src" / "data" / "exercises_master.json"
FALLBACK_CATALOG_JSON = BASE_DIR / "frontend" / "src" / "services" / "fallbackCatalog.json"
BACKEND_CATALOG_PY = BASE_DIR / "backend" / "app" / "db" / "catalog.py"
DB_PATHS = [
    BASE_DIR / "data" / "fittracker.db",
    BASE_DIR / "fittracker.db",
]

REPO_RAW_BASE = "https://raw.githubusercontent.com/JahelCuadrado/ExerciseGymGifsDB/main"

# Mapeo 1:1 de cada ejercicio (slug normalizado) al GIF anatómico 3D oficial
ANATOMICAL_3D_GIF_MAP: dict[str, str] = {
    # =========================================================================
    # 1. PECHO (frontend/public/media/pecho/<slug>.gif)
    # =========================================================================
    "pecho-press-banca-barra": "pectorals/barbell-bench-press.gif",
    "pecho-press-banca-mancuerna": "pectorals/dumbbell-bench-press.gif",
    "pecho-press-inclinado-barra": "pectorals/barbell-incline-bench-press.gif",
    "pecho-press-inclinado-mancuerna": "pectorals/dumbbell-incline-bench-press.gif",
    "pecho-press-declinado-barra": "pectorals/barbell-decline-bench-press.gif",
    "pecho-press-declinado-mancuerna": "pectorals/dumbbell-decline-bench-press.gif",
    "pecho-press-maquina": "pectorals/lever-chest-press.gif",
    "pecho-press-smith-plano": "pectorals/smith-bench-press.gif",
    "pecho-press-smith-inclinado": "pectorals/smith-incline-bench-press.gif",
    "pecho-fondos-paralelas": "pectorals/chest-dip.gif",
    "pecho-aperturas-mancuerna": "pectorals/dumbbell-fly.gif",
    "pecho-aperturas-inclinadas": "pectorals/dumbbell-incline-fly.gif",
    "pecho-cruces-polea-alta": "pectorals/cable-decline-fly.gif",
    "pecho-cruces-polea-media": "pectorals/cable-middle-fly.gif",
    "pecho-cruces-polea-baja": "pectorals/cable-low-fly.gif",
    "pecho-pec-deck": "pectorals/lever-seated-fly.gif",
    "pecho-pullover-mancuerna": "pectorals/dumbbell-pullover.gif",
    "pecho-flexiones-suelo": "pectorals/deep-push-up.gif",

    # =========================================================================
    # 2. ESPALDA (frontend/public/media/espalda/<slug>.gif)
    # =========================================================================
    "espalda-dominadas-prono": "lats/assisted-pull-up.gif",
    "espalda-dominadas-supinas": "lats/chin-up.gif",
    "espalda-dominadas-neutras": "lats/pull-up-neutral-grip.gif",
    "espalda-jalon-pecho-prono": "lats/cable-bar-lateral-pulldown.gif",
    "espalda-jalon-neutro": "lats/cable-pulldown-pro-lat-bar.gif",
    "espalda-pullover-polea": "lats/cable-straight-arm-pulldown.gif",
    "espalda-remo-barra-prono": "upper-back/barbell-bent-over-row.gif",
    "espalda-remo-pendlay": "upper-back/barbell-pendlay-row.gif",
    "espalda-remo-barra-t": "upper-back/lever-t-bar-row.gif",
    "espalda-remo-mancuerna-unilateral": "upper-back/dumbbell-one-arm-bent-over-row.gif",
    "espalda-remo-gironda": "upper-back/cable-seated-row.gif",
    "espalda-remo-maquina": "upper-back/lever-seated-row.gif",
    "espalda-peso-muerto-convencional": "glutes/barbell-deadlift.gif",
    "espalda-hiperextensiones": "spine/hyperextension-on-bench.gif",
    "espalda-encogimientos-barra": "traps/barbell-shrug.gif",
    "espalda-encogimientos-mancuerna": "traps/dumbbell-incline-shrug.gif",

    # =========================================================================
    # 3. BRAZOS - HOMBROS, BÍCEPS Y TRÍCEPS (frontend/public/media/brazos/<slug>.gif)
    # =========================================================================
    "brazos-press-militar-barra": "delts/barbell-standing-wide-military-press.gif",
    "brazos-press-hombros-mancuerna": "delts/dumbbell-seated-shoulder-press.gif",
    "brazos-press-arnold": "delts/dumbbell-arnold-press.gif",
    "brazos-elevaciones-laterales-mancuerna": "delts/dumbbell-lateral-raise.gif",
    "brazos-elevaciones-laterales-polea": "delts/cable-lateral-raise.gif",
    "brazos-elevaciones-frontales-mancuerna": "delts/dumbbell-front-raise.gif",
    "brazos-pajaros-mancuerna": "delts/dumbbell-rear-fly.gif",
    "brazos-reverse-pec-deck": "delts/lever-seated-reverse-fly.gif",
    "brazos-face-pull": "delts/cable-standing-rear-delt-row-with-rope.gif",
    "brazos-remo-menton-barra": "delts/barbell-upright-row.gif",
    "brazos-curl-biceps-barra": "biceps/barbell-curl.gif",
    "brazos-curl-biceps-barra-z": "biceps/ez-barbell-curl.gif",
    "brazos-curl-alterno-mancuerna": "biceps/dumbbell-alternate-biceps-curl.gif",
    "brazos-curl-martillo-mancuerna": "biceps/dumbbell-hammer-curl-v-2.gif",
    "brazos-curl-scott-barra-z": "biceps/ez-barbell-close-grip-preacher-curl.gif",
    "brazos-curl-inclinado-mancuerna": "biceps/dumbbell-incline-biceps-curl.gif",
    "brazos-curl-concentrado": "biceps/dumbbell-concentration-curl.gif",
    "brazos-curl-arana": "biceps/ez-barbell-spider-curl.gif",
    "brazos-curl-polea-baja": "biceps/cable-curl.gif",
    "brazos-curl-inverso-barra": "biceps/barbell-reverse-curl.gif",
    "brazos-press-cerrado-barra": "triceps/barbell-close-grip-bench-press.gif",
    "brazos-press-frances-barra-z": "triceps/barbell-lying-triceps-extension-skull-crusher.gif",
    "brazos-extension-triceps-cuerda": "triceps/cable-pushdown-with-rope-attachment.gif",
    "brazos-extension-triceps-barra": "triceps/cable-pushdown.gif",
    "brazos-extension-trasnuca-mancuerna": "triceps/dumbbell-seated-reverse-grip-one-arm-overhead-tricep-extension.gif",
    "brazos-extension-trasnuca-polea": "triceps/cable-overhead-triceps-extension-rope-attachment.gif",
    "brazos-patada-triceps-mancuerna": "triceps/dumbbell-kickback.gif",
    "brazos-fondos-bancos": "triceps/triceps-dip-between-benches.gif",
    "brazos-fondos-paralelas-triceps": "triceps/triceps-dip.gif",

    # =========================================================================
    # 4. PIERNAS (frontend/public/media/piernas/<slug>.gif)
    # =========================================================================
    "piernas-sentadilla-trasera": "glutes/barbell-full-squat.gif",
    "piernas-sentadilla-frontal": "glutes/barbell-front-squat.gif",
    "piernas-sentadilla-goblet": "quads/dumbbell-goblet-squat.gif",
    "piernas-sentadilla-hack": "glutes/sled-hack-squat.gif",
    "piernas-prensa-45": "glutes/sled-45-leg-press.gif",
    "piernas-sentadilla-bulgara": "quads/dumbbell-single-leg-split-squat.gif",
    "piernas-zancadas-mancuerna": "glutes/dumbbell-lunge.gif",
    "piernas-extensiones-cuadriceps": "quads/lever-leg-extension.gif",
    "piernas-peso-muerto-rumano-barra": "glutes/barbell-romanian-deadlift.gif",
    "piernas-peso-muerto-rumano-mancuerna": "glutes/dumbbell-romanian-deadlift.gif",
    "piernas-curl-femoral-tumbado": "hamstrings/lever-lying-leg-curl.gif",
    "piernas-curl-femoral-sentado": "hamstrings/lever-seated-leg-curl.gif",
    "piernas-hip-thrust-barra": "glutes/barbell-glute-bridge.gif",
    "piernas-patada-gluteo-polea": "glutes/cable-standing-hip-extension.gif",
    "piernas-abductores-maquina": "abductors/lever-seated-hip-abduction.gif",
    "piernas-aductores-maquina": "adductors/lever-seated-hip-adduction.gif",
    "piernas-gemelos-pie-maquina": "calves/lever-standing-calf-raise.gif",
    "piernas-gemelos-sentado": "calves/lever-seated-calf-raise.gif",
}


def resolve_category_from_slug(slug: str, muscle_group: str = "") -> str:
    slug_low = (slug or "").strip().lower()
    if slug_low.startswith("pecho-"):
        return "pecho"
    if slug_low.startswith("espalda-"):
        return "espalda"
    if slug_low.startswith("brazos-"):
        return "brazos"
    if slug_low.startswith("piernas-"):
        return "piernas"

    mg = (muscle_group or "").strip().lower()
    if "pecho" in mg or "pectoral" in mg:
        return "pecho"
    if "espalda" in mg or "dorsal" in mg or "trapecio" in mg:
        return "espalda"
    if "pierna" in mg or "cuadriceps" in mg or "cuádriceps" in mg or "isquio" in mg or "gluteo" in mg or "glúteo" in mg or "gemelo" in mg:
        return "piernas"
    return "brazos"


def generate_fallback_anatomical_gif(dest_path: Path, category: str) -> None:
    """
    Genera un GIF animado anatómico 3D de respaldo en caso de fallo de red.
    """
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return

    frames = []
    for pulse in (0, 25, 50, 25):
        img = Image.new("RGB", (360, 360), (255, 255, 255))
        draw = ImageDraw.Draw(img)

        # Silueta anatómica 3D en escala de grises
        draw.ellipse((150, 35, 210, 95), fill=(185, 194, 206), outline=(100, 116, 139), width=2)
        draw.rounded_rectangle((140, 98, 220, 215), radius=18, fill=(203, 213, 225), outline=(100, 116, 139), width=2)
        draw.rounded_rectangle((108, 104, 138, 205), radius=12, fill=(185, 194, 206), outline=(100, 116, 139), width=2)
        draw.rounded_rectangle((222, 104, 252, 205), radius=12, fill=(185, 194, 206), outline=(100, 116, 139), width=2)
        draw.rounded_rectangle((144, 215, 176, 330), radius=14, fill=(185, 194, 206), outline=(100, 116, 139), width=2)
        draw.rounded_rectangle((184, 215, 216, 330), radius=14, fill=(185, 194, 206), outline=(100, 116, 139), width=2)

        # Músculo activo en rojo anatómico
        red_color = (220 + min(35, pulse // 2), 38, 38)
        if category == "pecho":
            draw.rounded_rectangle((146, 108, 214, 152), radius=10, fill=red_color)
        elif category == "espalda":
            draw.polygon([(142, 106), (218, 106), (206, 185), (154, 185)], fill=red_color)
        elif category == "piernas":
            draw.rounded_rectangle((146, 220, 174, 295), radius=10, fill=red_color)
            draw.rounded_rectangle((186, 220, 214, 295), radius=10, fill=red_color)
        else:
            draw.rounded_rectangle((110, 112, 136, 175), radius=10, fill=red_color)
            draw.rounded_rectangle((224, 112, 250, 175), radius=10, fill=red_color)

        frames.append(img)

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        dest_path,
        save_all=True,
        append_images=frames[1:],
        duration=220,
        loop=0,
    )


def download_single_gif(item: dict) -> tuple[str, bool, str]:
    slug = item["slug"]
    category = resolve_category_from_slug(slug, item.get("muscleGroup", ""))
    old_media_url = item.get("mediaUrl") or item.get("image_url") or ""
    old_filename = os.path.basename(old_media_url) if old_media_url.endswith(".gif") else ""

    target_dir = PUBLIC_MEDIA_DIR / category
    target_dir.mkdir(parents=True, exist_ok=True)

    normalized_path = target_dir / f"{slug}.gif"
    legacy_alias_path = target_dir / old_filename if old_filename and old_filename != f"{slug}.gif" else None

    repo_rel_path = ANATOMICAL_3D_GIF_MAP.get(slug)
    if not repo_rel_path:
        generate_fallback_anatomical_gif(normalized_path, category)
        if legacy_alias_path:
            shutil.copy2(normalized_path, legacy_alias_path)
        return (slug, False, "Fallback generated (no mapping)")

    # Si ya fue descargado y tiene un tamaño válido (>15KB), reutilizar
    if normalized_path.exists() and normalized_path.stat().st_size > 15000:
        if legacy_alias_path and not legacy_alias_path.exists():
            shutil.copy2(normalized_path, legacy_alias_path)
        return (slug, True, "Cached")

    url = f"{REPO_RAW_BASE}/{repo_rel_path}"
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (FitTracker-AssetSync/2.0)"},
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
                if len(data) > 5000:
                    normalized_path.write_bytes(data)
                    if legacy_alias_path:
                        legacy_alias_path.write_bytes(data)
                    return (slug, True, f"Downloaded ({len(data) // 1024} KB)")
        except Exception as exc:
            last_err = str(exc)

    # En caso de error de red tras reintentos, generar fallback válido
    generate_fallback_anatomical_gif(normalized_path, category)
    if legacy_alias_path and normalized_path.exists():
        shutil.copy2(normalized_path, legacy_alias_path)
    return (slug, False, f"Fallback generated ({last_err})")


def update_json_And_catalog_files(exercises: list[dict]) -> None:
    """
    Actualiza los archivos JSON maestros y backend/app/db/catalog.py para que cada
    ejercicio apunte a /media/<categoria>/<slug>.gif.
    """
    for ex in exercises:
        slug = ex["slug"]
        cat = resolve_category_from_slug(slug, ex.get("muscleGroup", ""))
        canonical_media = f"/media/{cat}/{slug}.gif"
        ex["mediaUrl"] = canonical_media
        ex["image_url"] = canonical_media

    for path in (BACKEND_MASTER_JSON, FRONTEND_MASTER_JSON):
        if path.parent.exists():
            path.write_text(json.dumps(exercises, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"[JSON] Actualizado: {path}")

    if FALLBACK_CATALOG_JSON.exists():
        fb_data = json.loads(FALLBACK_CATALOG_JSON.read_text(encoding="utf-8"))
        fb_data["exercises"] = exercises
        FALLBACK_CATALOG_JSON.write_text(
            json.dumps(fb_data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"[JSON] Actualizado: {FALLBACK_CATALOG_JSON}")

    if BACKEND_CATALOG_PY.exists():
        catalog_text = BACKEND_CATALOG_PY.read_text(encoding="utf-8")
        for ex in exercises:
            slug = ex["slug"]
            cat = resolve_category_from_slug(slug, ex.get("muscleGroup", ""))
            canonical_media = f"/media/{cat}/{slug}.gif"
            # Reemplazar la línea media_url correspondiente a ese bloque de slug
            pattern = rf'("slug":\s*"{re.escape(slug)}"[\s\S]*?"media_url":\s*")([^"]+)(")'
            catalog_text = re.sub(pattern, rf"\g<1>{canonical_media}\g<3>", catalog_text, count=1)
        BACKEND_CATALOG_PY.write_text(catalog_text, encoding="utf-8")
        print(f"[PY] Actualizado: {BACKEND_CATALOG_PY}")


def update_sqlite_databases(exercises: list[dict]) -> None:
    """
    Actualiza la columna image_url (y slug si falta) en las bases de datos SQLite
    para que todos los ejercicios apunten a /media/<categoria>/<slug>.gif.
    """
    by_slug = {ex["slug"].lower(): ex for ex in exercises}
    by_name = {ex["name"].strip().lower(): ex for ex in exercises}

    for db_path in DB_PATHS:
        if not db_path.exists():
            continue
        con = sqlite3.connect(str(db_path))
        cur = con.cursor()
        try:
            cur.execute("SELECT id, name, slug, image_url FROM exercises")
            rows = cur.fetchall()
        except Exception as exc:
            print(f"[DB] Omitiendo {db_path}: {exc}")
            con.close()
            continue

        updated = 0
        for ex_id, name, slug, current_img in rows:
            slug_key = (slug or "").strip().lower()
            name_key = (name or "").strip().lower()
            matched = by_slug.get(slug_key) or by_name.get(name_key)

            if matched:
                target_slug = matched["slug"]
                cat = resolve_category_from_slug(target_slug, matched.get("muscleGroup", ""))
                target_url = f"/media/{cat}/{target_slug}.gif"
                if current_img != target_url or slug != target_slug:
                    cur.execute(
                        "UPDATE exercises SET image_url = ?, slug = ? WHERE id = ?",
                        (target_url, target_slug, ex_id),
                    )
                    updated += 1
            elif current_img and (
                current_img.startswith("http")
                or current_img.startswith("/assets/diagrams/")
                or not current_img.startswith("/media/")
            ):
                # Mapear ejercicios personalizados o históricos a un GIF anatómico válido de su grupo
                n_low = name_key
                if "pecho" in n_low or "banca" in n_low or "apertura" in n_low or "cruce" in n_low or "flexion" in n_low:
                    fallback_url = "/media/pecho/pecho-press-banca-barra.gif"
                elif "espalda" in n_low or "remo" in n_low or "jalon" in n_low or "jalón" in n_low or "dominada" in n_low or "pull" in n_low:
                    fallback_url = "/media/espalda/espalda-jalon-pecho-prono.gif"
                elif "pierna" in n_low or "sentadilla" in n_low or "prensa" in n_low or "femoral" in n_low or "cuadriceps" in n_low or "abductor" in n_low or "aductor" in n_low or "gemelo" in n_low or "zancada" in n_low:
                    fallback_url = "/media/piernas/piernas-sentadilla-trasera.gif"
                else:
                    fallback_url = "/media/brazos/brazos-curl-biceps-barra.gif"
                cur.execute(
                    "UPDATE exercises SET image_url = ? WHERE id = ?",
                    (fallback_url, ex_id),
                )
                updated += 1

        con.commit()
        con.close()
        print(f"[DB] {db_path.name}: {updated} ejercicios actualizados (de {len(rows)} totales).")


def main() -> None:
    print("=== FitTracker: Sincronizando Assets Multimedia Anatómicos 3D ===")
    if not BACKEND_MASTER_JSON.exists():
        raise FileNotFoundError(f"No se encontró {BACKEND_MASTER_JSON}")

    exercises = json.loads(BACKEND_MASTER_JSON.read_text(encoding="utf-8"))
    print(f"Total de ejercicios en catálogo maestro: {len(exercises)}")

    downloaded_ok = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        futures = [pool.submit(download_single_gif, item) for item in exercises]
        for fut in concurrent.futures.as_completed(futures):
            slug, ok, msg = fut.result()
            if ok:
                downloaded_ok += 1
            print(f"  - {slug}: {msg}")

    print(f"\nAssets listos: {downloaded_ok}/{len(exercises)} descargados desde repositorio 3D.")
    update_json_And_catalog_files(exercises)
    update_sqlite_databases(exercises)
    print("=== Sincronización completada con éxito ===")


if __name__ == "__main__":
    main()
