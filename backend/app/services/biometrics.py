"""
Motor Matemático Puro de Biometría y Rendimiento para FitTracker.
Sin dependencias pesadas: cálculo de 1RM (Epley, Brzycki), fuerza relativa normalizada,
límite muscular natural (FFMI Casey Butt) y requerimientos nutricionales (Katch-McArdle).
"""

from typing import Any, Literal

TARGET_GOALS = ["powerlifting", "hipertrofia", "alto_rendimiento", "definicion"]
MAX_NATURAL_FFMI_CEILING = 25.0
DEFAULT_BODY_FAT_PERCENTAGE = 15.0  # Referencia atlética por defecto si no se indica


def calculate_1rm_epley(weight: float, reps: int) -> float:
    """
    Calcula el 1RM estimado según la fórmula de Epley:
    1RM = peso * (1 + reps / 30)
    """
    if weight <= 0 or reps <= 0:
        return 0.0
    if reps == 1:
        return round(float(weight), 2)
    return round(float(weight) * (1.0 + (float(reps) / 30.0)), 2)


def calculate_1rm_brzycki(weight: float, reps: int) -> float:
    """
    Calcula el 1RM estimado según la fórmula de Brzycki:
    1RM = peso / (1.0278 - 0.0278 * reps)
    Para reps >= 36 se protege contra división por cero o números negativos,
    usando como salvaguarda la fórmula de Epley.
    """
    if weight <= 0 or reps <= 0:
        return 0.0
    if reps == 1:
        return round(float(weight), 2)
    
    denom = 1.0278 - (0.0278 * float(reps))
    if denom <= 0.02:
        return calculate_1rm_epley(weight, reps)
    return round(float(weight) / denom, 2)


def calculate_1rm(weight: float, reps: int, formula: Literal["epley", "brzycki"] = "epley") -> float:
    """
    Calcula 1RM según la fórmula seleccionada.
    """
    if formula.lower() == "brzycki":
        return calculate_1rm_brzycki(weight, reps)
    return calculate_1rm_epley(weight, reps)


def calculate_relative_strength(one_rm: float, bodyweight: float) -> float:
    """
    Calcula el coeficiente de Fuerza Relativa Normalizada:
    Coeficiente = 1RM / (bodyweight ** 0.67)
    Normaliza la fuerza independientemente de la masa corporal mediante alometría.
    """
    if bodyweight <= 0 or one_rm <= 0:
        return 0.0
    return round(float(one_rm) / (float(bodyweight) ** 0.67), 2)


def calculate_lean_mass(bodyweight: float, body_fat_percentage: float | None = None) -> float:
    """
    Calcula la masa magra (LBM) en kg:
    MasaMagra = bodyweight * (1 - (body_fat_percentage / 100))
    """
    if bodyweight <= 0:
        return 0.0
    bf = body_fat_percentage if body_fat_percentage is not None and 0 < body_fat_percentage < 100 else DEFAULT_BODY_FAT_PERCENTAGE
    lean = float(bodyweight) * (1.0 - (float(bf) / 100.0))
    return round(max(0.0, lean), 2)


def calculate_ffmi(
    bodyweight: float,
    height: float,
    body_fat_percentage: float | None = None
) -> dict[str, Any]:
    """
    Calcula el Límite Muscular Natural (FFMI normalizado de Casey Butt):
    MasaMagra = bodyweight * (1 - (body_fat_percentage / 100))
    FFMI = (MasaMagra / ((height / 100) ** 2)) + 6.1 * (1.8 - (height / 100))

    Retorna un diccionario con FFMI, masa magra, potencial remanente y porcentaje alcanzado.
    """
    if bodyweight <= 0 or height <= 0:
        return {
            "lean_mass_kg": 0.0,
            "fat_mass_kg": 0.0,
            "raw_ffmi": 0.0,
            "normalized_ffmi": 0.0,
            "ffmi": 0.0,
            "max_natural_ffmi": MAX_NATURAL_FFMI_CEILING,
            "remaining_potential": MAX_NATURAL_FFMI_CEILING,
            "potential_percentage": 0.0,
            "is_natural_limit_reached": False,
        }

    bf = body_fat_percentage if body_fat_percentage is not None and 0 < body_fat_percentage < 100 else DEFAULT_BODY_FAT_PERCENTAGE
    lean_mass = calculate_lean_mass(bodyweight, bf)
    fat_mass = round(max(0.0, float(bodyweight) - lean_mass), 2)
    height_m = float(height) / 100.0

    raw_ffmi = lean_mass / (height_m ** 2)
    normalized_ffmi = raw_ffmi + (6.1 * (1.8 - height_m))

    ffmi_val = round(normalized_ffmi, 2)
    remaining_pot = round(max(0.0, MAX_NATURAL_FFMI_CEILING - ffmi_val), 2)
    pot_pct = round(min(100.0, max(0.0, (ffmi_val / MAX_NATURAL_FFMI_CEILING) * 100.0)), 1)

    return {
        "lean_mass_kg": lean_mass,
        "fat_mass_kg": fat_mass,
        "raw_ffmi": round(raw_ffmi, 2),
        "normalized_ffmi": ffmi_val,
        "ffmi": ffmi_val,
        "max_natural_ffmi": MAX_NATURAL_FFMI_CEILING,
        "remaining_potential": remaining_pot,
        "potential_percentage": pot_pct,
        "is_natural_limit_reached": ffmi_val >= MAX_NATURAL_FFMI_CEILING,
    }


def calculate_nutritional_requirements(
    bodyweight: float,
    body_fat_percentage: float | None = None,
    target_goal: str | None = "hipertrofia",
    height: float | None = None,
) -> dict[str, Any]:
    """
    Calcula los Requerimientos Nutricionales Automáticos (Katch-McArdle):
    TMB = 370 + (21.6 * MasaMagra)
    TDEE = TMB * 1.55 (activo)
    Proteína sugerida = bodyweight * 2.0 (o 2.3 si target_goal == 'definicion')
    Hidratación sugerida = (bodyweight * 0.04) + 0.8 L
    """
    if bodyweight <= 0:
        return {
            "tmb": 0.0,
            "bmr": 0.0,
            "tdee": 0.0,
            "target_protein_g": 0.0,
            "target_water_l": 0.0,
            "lean_mass_kg": 0.0,
        }

    bf = body_fat_percentage if body_fat_percentage is not None and 0 < body_fat_percentage < 100 else DEFAULT_BODY_FAT_PERCENTAGE
    lean_mass = calculate_lean_mass(bodyweight, bf)

    tmb = 370.0 + (21.6 * lean_mass)
    tdee = tmb * 1.55

    # Prescripción nutricional e hidratación automática pura (sin clasificaciones de atleta)
    target_protein = float(bodyweight) * 2.0
    target_water = (float(bodyweight) * 0.04) + 0.8

    return {
        "tmb": round(tmb, 1),
        "bmr": round(tmb, 1),
        "tdee": round(tdee, 1),
        "target_protein_g": round(target_protein, 1),
        "target_water_l": round(target_water, 2),
        "lean_mass_kg": lean_mass,
    }


def calculate_progressive_overload_guidance(
    last_weight: float,
    last_reps: int,
    fatigue_detected: bool = False,
    mechanics_type: str = "compuesto",
) -> dict[str, Any]:
    """
    Calcula metas sugeridas para la sesión de hoy según sobrecarga progresiva o descarga:
    - Sobrecarga: +2.5 kg (compuesto) o +1 rep
    - Descarga: -30% si fatiga detectada
    """
    if last_weight <= 0 and last_reps <= 0:
        return {
            "type": "standard",
            "suggested_weight": 0.0,
            "suggested_reps": 10,
            "reason": "Primer registro para este ejercicio. Iniciá con carga moderada para calibrar RIR 2.",
            "overload_weight": 0.0,
            "overload_reps": 10,
            "deload_weight": 0.0,
            "fatigue_detected": fatigue_detected,
        }

    # Opciones de sobrecarga
    increment_weight = 2.5 if mechanics_type.lower() == "compuesto" else 1.25
    overload_weight = round(last_weight + increment_weight, 2)
    overload_reps = last_reps + 1

    # Descarga (-30%)
    deload_weight = round(last_weight * 0.70, 2)

    if fatigue_detected:
        return {
            "type": "deload",
            "suggested_weight": deload_weight,
            "suggested_reps": last_reps,
            "reason": "Fatiga del SNC detectada en sesiones recientes. Descarga activa recomendada (-30% carga) para preservar recuperación articular.",
            "overload_weight": overload_weight,
            "overload_reps": overload_reps,
            "deload_weight": deload_weight,
            "fatigue_detected": True,
        }

    # Si completó un número alto de reps (>= 12), sugerir subir peso; de lo contrario +1 rep
    if last_reps >= 10:
        suggested_w = overload_weight
        suggested_r = max(6, last_reps - 2)
        reason = f"Sobrecarga de carga: +{increment_weight} kg consolidando rango efectivo ({suggested_r} reps)."
    else:
        suggested_w = last_weight
        suggested_r = overload_reps
        reason = f"Sobrecarga de volumen: +1 repetición ({overload_reps} reps) manteniendo la misma carga ({last_weight} kg)."

    return {
        "type": "overload",
        "suggested_weight": suggested_w,
        "suggested_reps": suggested_r,
        "reason": reason,
        "overload_weight": overload_weight,
        "overload_reps": overload_reps,
        "deload_weight": deload_weight,
        "fatigue_detected": False,
    }
