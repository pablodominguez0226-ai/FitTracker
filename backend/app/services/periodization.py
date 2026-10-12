"""
Motor de Periodización y Detección Biológica 100% Automática para FitTracker.
Analiza el historial de entrenamiento de los últimos 14 días para determinar
si el usuario debe estar en Fase de Sobrecarga o en Semana de Descarga sin
intervención manual.
"""
from __future__ import annotations

import datetime as dt
from typing import Any
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from .. import models
from .biometrics import calculate_1rm_epley


def detect_workout_cycle_status(db: Session, user_id: int) -> dict[str, Any]:
    """
    Evalúa el estado del ciclo biológico del usuario en base a los últimos 14 días:
    - Deload Trigger (Descarga Automática):
        Criterio A: El 1RM estimado en los ejercicios clave cae durante 2 sesiones seguidas.
        Criterio B: El porcentaje de series llevadas a RIR 0 (fallo absoluto) supera el 35% del volumen semanal.
    - Overload Trigger (Fase de Sobrecarga):
        Si no hay indicadores de fatiga y la tasa de cumplimiento de series es > 85%.
    """
    today = dt.date.today()
    two_weeks_ago = today - dt.timedelta(days=14)
    one_week_ago = today - dt.timedelta(days=7)

    # 1. Obtener sesiones completadas en los últimos 14 días
    sessions = (
        db.query(models.WorkoutSession)
        .options(
            joinedload(models.WorkoutSession.sets).joinedload(models.WorkoutSet.exercise)
        )
        .filter(
            models.WorkoutSession.user_id == user_id,
            models.WorkoutSession.date >= two_weeks_ago,
            models.WorkoutSession.status == "completed",
        )
        .order_by(models.WorkoutSession.date.asc(), models.WorkoutSession.id.asc())
        .all()
    )

    # Si hay pocas o ninguna sesión, devolver sobrecarga por defecto
    if not sessions:
        # Buscar las últimas sesiones históricas sin límite de fecha
        fallback_sessions = (
            db.query(models.WorkoutSession)
            .options(
                joinedload(models.WorkoutSession.sets).joinedload(models.WorkoutSet.exercise)
            )
            .filter(
                models.WorkoutSession.user_id == user_id,
                models.WorkoutSession.status == "completed",
            )
            .order_by(models.WorkoutSession.date.desc())
            .limit(5)
            .all()
        )
        if not fallback_sessions:
            return {
                "status": "overload",
                "message": "⚡ Fase de sobrecarga activa",
                "deload_recommended": False,
                "fatigue_detected": False,
                "trigger_reason": None,
                "failure_percentage": 0.0,
                "completion_rate": 100.0,
                "active_days_14d": 0,
            }
        sessions = sorted(fallback_sessions, key=lambda s: (s.date, s.id))

    # 2. Análisis del Criterio B: Porcentaje de series al fallo (RIR 0) en los últimos 7 días
    weekly_sets = []
    all_sets_14d = []

    for s in sessions:
        is_last_7d = s.date >= one_week_ago
        for st in s.sets:
            all_sets_14d.append(st)
            if is_last_7d:
                weekly_sets.append(st)

    # Si en los últimos 7 días hay pocas series, usamos el rango de 14 días para mayor robustez
    target_sets_eval = weekly_sets if len(weekly_sets) >= 6 else all_sets_14d

    total_eval_sets = len(target_sets_eval)
    completed_sets = sum(1 for st in target_sets_eval if st.completed)
    completion_rate = round((completed_sets / total_eval_sets * 100.0), 1) if total_eval_sets > 0 else 100.0

    failure_sets = sum(
        1
        for st in target_sets_eval
        if st.completed and (
            st.rir == 0
            or (st.set_type or "").lower() == "failure"
            or (st.rest_effort or "").lower() in ("fallo", "failure", "al fallo")
        )
    )
    failure_pct = round((failure_sets / total_eval_sets * 100.0), 1) if total_eval_sets > 0 else 0.0

    criterion_b_triggered = total_eval_sets >= 5 and failure_pct > 35.0

    # 3. Análisis del Criterio A: 1RM estimado cae durante 2 sesiones seguidas en ejercicios clave
    # Identificar series por ejercicio ordenadas cronológicamente
    exercise_session_1rms: dict[int, list[float]] = {}

    for s in sessions:
        # Calcular el mejor 1RM de cada ejercicio en esta sesión
        session_exercise_bests: dict[int, float] = {}
        for st in s.sets:
            if st.completed and (st.weight or 0) > 0 and (st.reps or 0) > 0:
                calc_1rm = calculate_1rm_epley(st.weight, st.reps)
                ex_id = st.exercise_id
                if ex_id not in session_exercise_bests or calc_1rm > session_exercise_bests[ex_id]:
                    session_exercise_bests[ex_id] = calc_1rm

        for ex_id, best_val in session_exercise_bests.items():
            if ex_id not in exercise_session_1rms:
                exercise_session_1rms[ex_id] = []
            exercise_session_1rms[ex_id].append(best_val)

    criterion_a_triggered = False
    declining_exercise_name = None

    for ex_id, 1rm_list in exercise_session_1rms.items():
        # Si el usuario tiene al menos 3 sesiones registradas con este ejercicio
        if len(1rm_list) >= 3:
            r1, r2, r3 = 1rm_list[-3], 1rm_list[-2], 1rm_list[-1]
            # Caída estricta durante 2 sesiones consecutivas (r3 < r2 < r1)
            if r3 < r2 and r2 < r1:
                criterion_a_triggered = True
                ex_obj = db.get(models.Exercise, ex_id)
                declining_exercise_name = ex_obj.name if ex_obj else "ejercicio principal"
                break

    # 4. Decisión Biológica 100% Automática
    if criterion_b_triggered or criterion_a_triggered:
        reason = (
            f"Frecuencia al fallo excesiva ({failure_pct}% de series a RIR 0)"
            if criterion_b_triggered
            else f"Caída de 1RM durante 2 sesiones seguidas en {declining_exercise_name}"
        )
        return {
            "status": "deload",
            "message": "🛡️ Recuperación activa recomendada (-30% de carga sugerido)",
            "deload_recommended": True,
            "fatigue_detected": True,
            "trigger_reason": reason,
            "failure_percentage": failure_pct,
            "completion_rate": completion_rate,
            "active_days_14d": len(set(s.date for s in sessions)),
        }

    # De lo contrario: Fase de Sobrecarga activa
    return {
        "status": "overload",
        "message": "⚡ Fase de sobrecarga activa",
        "deload_recommended": False,
        "fatigue_detected": False,
        "trigger_reason": None,
        "failure_percentage": failure_pct,
        "completion_rate": completion_rate,
        "active_days_14d": len(set(s.date for s in sessions)),
    }
