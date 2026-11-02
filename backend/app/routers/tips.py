from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter()

EXPERIENCE_TIPS = {
    "principiante": [
        schemas.ContextualTipOut(
            id="exp_principiante_tecnica",
            category="technique",
            title="Control Excéntrico",
            message="Controlá la bajada en 2 segundos sin balancear el cuerpo.",
            icon="shield",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_principiante_series_reps",
            category="concept",
            title="Series y Repeticiones",
            message="Realizá 3 a 4 series de 8 a 12 repeticiones controladas.",
            icon="repeat",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_principiante_volumen",
            category="volume",
            title="Volumen Semanal",
            message="Completá 6 a 10 series semanales por grupo muscular con buena técnica.",
            icon="layers",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_principiante_pr",
            category="records",
            title="Récords Personales (PR)",
            message="Priorizá sumar repeticiones limpias antes de subir el peso.",
            icon="trophy",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_principiante_descanso",
            category="recovery",
            title="Descanso entre Series",
            message="Descansá 90 a 120 segundos entre series para rendir mejor.",
            icon="shield",
            priority=3,
        ),
    ],
    "intermedio": [
        schemas.ContextualTipOut(
            id="exp_intermedio_progresion",
            category="overload",
            title="Sobrecarga Progresiva",
            message="Si completás el tope de repeticiones en tus series, subí 1.25 kg a 2.5 kg.",
            icon="trending-up",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_intermedio_volumen",
            category="volume",
            title="Volumen Óptimo",
            message="Apuntá a 10-16 series efectivas semanales por grupo muscular.",
            icon="bar-chart-2",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_intermedio_cargas",
            category="loads",
            title="Micro-Incrementos",
            message="Usá aumentos de 1.25 kg en básicos manteniendo 1-2 reps en reserva.",
            icon="dumbbell",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_intermedio_consistencia",
            category="consistency",
            title="Consistencia",
            message="En días de baja energía, cumplí las series sin forzar récords.",
            icon="flame",
            priority=2,
        ),
    ],
    "avanzado": [
        schemas.ContextualTipOut(
            id="exp_avanzado_rendimiento",
            category="performance",
            title="Control de Fatiga",
            message="Si la primera serie pesa demasiado, dejá 2 reps en reserva hoy.",
            icon="activity",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_avanzado_volumen_mrv",
            category="volume",
            title="Gestión de Volumen",
            message="Alterná bloques intensos con 1 semana de descarga (-40% series).",
            icon="layers",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_avanzado_pr_peaking",
            category="records",
            title="Nuevos Récords",
            message="Buscá récords tras días de buen descanso, no con fatiga acumulada.",
            icon="trophy",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_avanzado_estancamientos",
            category="plateaus",
            title="Romper Mesetas",
            message="Usá pausas de 2 segundos o cambiá a mancuernas por 3 semanas.",
            icon="zap",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_avanzado_tecnica",
            category="technique",
            title="Precisión Técnica",
            message="Mantené recorrido completo y velocidad constante en cada serie.",
            icon="target",
            priority=2,
        ),
    ],
}


@router.get("/contextual", response_model=list[schemas.ContextualTipOut])
def get_contextual_tips(
    exercise_id: int | None = Query(None),
    muscle_group_id: int | None = Query(None),
    readiness_energy: int | None = Query(None),
    readiness_motivation: int | None = Query(None),
    db: Session = Depends(get_db),
):
    tips: list[schemas.ContextualTipOut] = []

    profile = db.get(models.UserProfile, 1)
    exp_level = (
        profile.experience_level.strip().lower()
        if profile and profile.experience_level
        else "intermedio"
    )

    if readiness_energy is not None:
        if readiness_energy <= 2:
            tips.append(
                schemas.ContextualTipOut(
                    id="wp_low_energy",
                    category="willpower",
                    title="Energía Baja",
                    message="Descansá 2-3 minutos entre series y cumplí el volumen sin ir al fallo.",
                    icon="brain",
                    priority=1,
                )
            )
        elif readiness_energy == 5:
            tips.append(
                schemas.ContextualTipOut(
                    id="wp_max_energy",
                    category="overload",
                    title="Energía al 100%",
                    message="Buen día para buscar +1 repetición o sumar 2.5 kg en tu serie principal.",
                    icon="zap",
                    priority=1,
                )
            )

    if (
        readiness_motivation is not None
        and readiness_motivation <= 2
        and (readiness_energy is None or readiness_energy >= 3)
    ):
        tips.append(
            schemas.ContextualTipOut(
                id="wp_low_motivation",
                category="willpower",
                title="Enfoque Directo",
                message="Completá las primeras 2 series de calentamiento para entrar en ritmo.",
                icon="flame",
                priority=1,
            )
        )

    if exercise_id:
        ex = db.get(models.Exercise, exercise_id)
        if ex:
            past_sessions = (
                db.query(models.WorkoutSession)
                .join(models.WorkoutSet)
                .filter(
                    models.WorkoutSet.exercise_id == exercise_id,
                    models.WorkoutSession.status == "completed",
                )
                .distinct()
                .order_by(models.WorkoutSession.date.desc(), models.WorkoutSession.id.desc())
                .limit(4)
                .all()
            )

            if past_sessions:
                last_s = past_sessions[0]
                last_sets = [
                    st for st in last_s.sets if st.exercise_id == exercise_id and st.completed
                ]

                if last_sets:
                    top_set = max(last_sets, key=lambda s: s.weight or 0.0)
                    top_weight = top_set.weight
                    top_reps = top_set.reps

                    if len(past_sessions) >= 2:
                        prev_s = past_sessions[1]
                        prev_sets = [
                            st
                            for st in prev_s.sets
                            if st.exercise_id == exercise_id and st.completed
                        ]
                        if prev_sets:
                            prev_top = max(prev_sets, key=lambda s: s.weight or 0.0)

                            if top_weight == prev_top.weight and top_reps >= prev_top.reps:
                                tips.append(
                                    schemas.ContextualTipOut(
                                        id=f"overload_consolidated_{exercise_id}",
                                        category="overload",
                                        title=f"Progreso en {ex.name}",
                                        message=f"Mantuviste {top_weight} kg × {top_reps} reps. Hoy buscá +1 rep o sumá 1.25 kg.",
                                        icon="trending-up",
                                        priority=1,
                                    )
                                )

                            prev_vol = sum((st.weight or 0.0) * (st.reps or 0) for st in prev_sets)
                            last_vol = sum((st.weight or 0.0) * (st.reps or 0) for st in last_sets)
                            if prev_vol > 0 and (last_vol / prev_vol) < 0.75:
                                tips.append(
                                    schemas.ContextualTipOut(
                                        id=f"recovery_drop_{exercise_id}",
                                        category="recovery",
                                        title=f"Ajuste en {ex.name}",
                                        message=f"Bajó el volumen en la última sesión de {ex.name}. Priorizá técnica controlada hoy.",
                                        icon="shield",
                                        priority=2,
                                    )
                                )

    exp_pool = EXPERIENCE_TIPS.get(exp_level, EXPERIENCE_TIPS["intermedio"])
    for tip in exp_pool:
        if not any(t.id == tip.id for t in tips):
            tips.append(tip)

    tips.sort(key=lambda t: t.priority)
    return tips
