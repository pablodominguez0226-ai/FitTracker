import datetime as dt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db

router = APIRouter()


def _get_athlete_training_summary(db: Session, days: int = 14) -> dict:
    """Extracts recent training, volume, PRs, and readiness for AI synthesis."""
    cutoff = dt.date.today() - dt.timedelta(days=days)
    sessions = (
        db.query(models.WorkoutSession)
        .options(
            joinedload(models.WorkoutSession.muscle_group),
            joinedload(models.WorkoutSession.sets).joinedload(models.WorkoutSet.exercise),
        )
        .filter(
            models.WorkoutSession.status == "completed",
            models.WorkoutSession.date >= cutoff,
        )
        .order_by(models.WorkoutSession.date.desc())
        .all()
    )

    profile = db.get(models.UserProfile, 1)
    exp_level = profile.experience_level if profile and profile.experience_level else "intermedio"

    total_volume = 0.0
    total_sets = 0
    strength_sessions = 0
    cardio_sessions = 0
    total_distance_km = 0.0
    willpower_sessions = 0
    exercise_maxes = {}

    for s in sessions:
        if s.sport_type == "strength":
            strength_sessions += 1
        else:
            cardio_sessions += 1
            if s.distance_km:
                total_distance_km += s.distance_km

        is_wp = (s.readiness_energy is not None and s.readiness_energy <= 2) or (
            s.mental_effort is not None and s.mental_effort >= 4
        )
        if is_wp:
            willpower_sessions += 1

        for st in s.sets:
            if st.completed:
                total_sets += 1
                vol = (st.weight or 0.0) * (st.reps or 0)
                total_volume += vol
                ex_name = st.exercise.name if st.exercise else f"Ejercicio #{st.exercise_id}"
                if ex_name not in exercise_maxes or (st.weight or 0.0) > exercise_maxes[ex_name]["weight"]:
                    exercise_maxes[ex_name] = {
                        "weight": st.weight or 0.0,
                        "reps": st.reps or 0,
                        "date": s.date,
                    }

    return {
        "experience_level": exp_level,
        "total_workouts": len(sessions),
        "strength_sessions": strength_sessions,
        "cardio_sessions": cardio_sessions,
        "total_distance_km": round(total_distance_km, 1),
        "total_volume_kg": round(total_volume, 1),
        "total_sets": total_sets,
        "willpower_sessions": willpower_sessions,
        "top_exercises": [
            {"name": k, "weight": v["weight"], "reps": v["reps"]}
            for k, v in list(exercise_maxes.items())[:5]
        ],
    }


@router.get("/weekly-briefing", response_model=schemas.AIWeeklyBriefingOut)
def get_weekly_briefing(db: Session = Depends(get_db)):
    summary = _get_athlete_training_summary(db, days=14)
    exp = summary["experience_level"]
    tot_w = summary["total_workouts"]
    tot_vol = summary["total_volume_kg"]
    wp_count = summary["willpower_sessions"]
    top_exs = summary["top_exercises"]

    achievements = []
    if tot_w > 0:
        achievements.append(f"Completaste {tot_w} sesiones con {tot_vol:,.0f} kg acumulados.")
    if top_exs:
        top_ex = top_exs[0]
        achievements.append(f"Mejor marca reciente: {top_ex['name']} con {top_ex['weight']} kg × {top_ex['reps']} reps.")
    if not achievements:
        achievements.append("Registrá tu primera sesión para obtener feedback directo.")

    if top_exs:
        top_ex = top_exs[0]
        wp_analysis = f"Buen ritmo de entrenamiento ({tot_w} sesiones). Destacaste en {top_ex['name']} con {top_ex['weight']} kg."
    elif tot_w > 0:
        wp_analysis = f"Completaste {tot_w} sesiones recientes. Mantené la constancia y sumá 1 repetición en tu próximo entreno."
    else:
        wp_analysis = "Listo para entrenar. Registrá tus series de hoy para medir tu progreso."

    recommendations = [
        "Buscá sumar 1 repetición o +1.25 kg en tu ejercicio principal de hoy.",
    ]

    recovery_status = "Óptima" if wp_count < 3 else "Priorizar descanso"
    headline = f"Resumen Conciso · {exp.capitalize()}"

    return schemas.AIWeeklyBriefingOut(
        period="Últimas 2 Semanas",
        headline=headline,
        experience_level=exp,
        total_workouts=tot_w,
        total_volume_kg=tot_vol,
        willpower_sessions=wp_count,
        achievements=achievements[:2],
        willpower_analysis=wp_analysis,
        overload_recommendations=recommendations,
        recovery_status=recovery_status,
        generated_at=dt.datetime.utcnow(),
    )


@router.post("/ask", response_model=schemas.AIAskOut)
def ask_ai_coach(payload: schemas.AIAskIn, db: Session = Depends(get_db)):
    q = payload.question.strip()
    if not q:
        raise HTTPException(status_code=400, detail="La consulta no puede estar vacía.")

    summary = _get_athlete_training_summary(db, days=30)
    exp = summary["experience_level"]
    tot_w = summary["total_workouts"]
    tot_vol = summary["total_volume_kg"]
    top_exs = summary["top_exercises"]
    q_norm = q.lower()

    cited_data = [
        f"Nivel: {exp.capitalize()}",
        f"Sesiones (30d): {tot_w}",
    ]
    for te in top_exs[:2]:
        cited_data.append(f"{te['name']}: {te['weight']}kg × {te['reps']}")

    if any(k in q_norm for k in ["sobrecarga", "progres", "peso", "subir", "kilos", "kg", "fuerza"]):
        category = "overload"
        if top_exs:
            t = top_exs[0]
            answer = f"Venís sólido en {t['name']} ({t['weight']} kg × {t['reps']}). Sumá 1 repetición o +2.5 kg en la próxima sesión manteniendo buena técnica."
        else:
            answer = "Completá 8 a 12 repeticiones controladas en tus series. Al llegar a 12 reps en todas, subí 2.5 kg."

    elif any(k in q_norm for k in ["energia", "cansad", "fatiga", "sueno", "dormi", "baja", "animo", "desgano"]):
        category = "willpower"
        answer = "Hoy priorizá cumplir sin ir al fallo. Descansá 2-3 minutos entre series y mantené el peso controlado."

    elif any(k in q_norm for k in ["serie", "repeticion", "reps", "cuantas rep"]):
        category = "concept"
        answer = "Trabajá entre 3 y 4 series de 8 a 12 repeticiones controladas. Dejá 1 o 2 repeticiones en reserva (RIR 1-2)."

    elif any(k in q_norm for k in ["volumen", "tonelaje", "cuantas series"]):
        category = "volume"
        answer = f"Acumulaste {tot_vol:,.0f} kg en {tot_w} sesiones. Apuntá a 10-16 series efectivas semanales por grupo muscular."

    elif any(k in q_norm for k in ["pr", "record", "1rm", "maxima"]):
        category = "records"
        answer = "Buscá superar primero tus repeticiones actuales antes de subir kilos. Cuando domines el peso, sumá 1.25 kg a 2.5 kg."

    elif any(k in q_norm for k in ["tecnica", "postura", "forma", "biomecanica"]):
        category = "technique"
        answer = "Controlá la bajada en 2 segundos y evitá impulsos. Si la postura se pierde, cortá la serie."

    elif any(k in q_norm for k in ["estancad", "meseta", "no subo", "trancad", "bloquead"]):
        category = "overload"
        answer = "Reducí las series a la mitad por una semana para disipar fatiga. Luego retomá usando micro-cargas de 1.25 kg."

    elif any(k in q_norm for k in ["recuperac", "descans", "descarga", "dolor", "agujet", "molestia"]):
        category = "recovery"
        answer = "Asegurá 7-8 horas de sueño y 48 horas de descanso antes de repetir el mismo músculo."

    elif any(k in q_norm for k in ["cardio", "correr", "running", "bici", "futbol", "resistencia"]):
        category = "multisport"
        answer = "Separá el cardio intenso del día de piernas o hacelo después de las pesas."

    else:
        category = "general"
        if top_exs:
            t = top_exs[0]
            answer = f"Llevás {tot_w} sesiones recientes y buena marca en {t['name']} ({t['weight']} kg). Buscá +1 rep en tu próximo entrenamiento."
        else:
            answer = f"Llevás {tot_w} sesiones registradas este mes. Mantené la constancia y buscá superar en 1 rep tu marca anterior."

    return schemas.AIAskOut(
        question=q,
        answer=answer,
        category=category,
        cited_data=cited_data,
        generated_at=dt.datetime.utcnow(),
    )
