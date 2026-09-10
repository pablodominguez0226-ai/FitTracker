import datetime as dt
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
            title="Técnica: Control Excéntrico",
            message="El estímulo muscular óptimo se logra controlando la bajada (2 a 3 segundos), no balanceando pesos excesivos con mala postura.",
            icon="shield",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_principiante_series_reps",
            category="concept",
            title="Concepto: Series y Repeticiones",
            message="Una repetición es el movimiento completo; una serie es el bloque de reps antes de pausar. Buscá 8 a 12 reps controladas.",
            icon="repeat",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_principiante_volumen",
            category="volume",
            title="Concepto: Volumen de Entrenamiento",
            message="El volumen es Series × Reps × Peso. Como principiante, 6 a 10 series semanales bien ejecutadas por grupo muscular son ideales.",
            icon="layers",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_principiante_pr",
            category="records",
            title="Concepto: Récords Personales (PR)",
            message="Tu PR es tu mejor marca histórica. No lo busques en cada serie: progresará naturalmente a medida que consolides tu técnica.",
            icon="trophy",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_principiante_descanso",
            category="recovery",
            title="Descanso entre Series",
            message="Descansá entre 90 y 120 segundos entre series para reponer energía y mantener la intensidad técnica en cada repetición.",
            icon="shield",
            priority=3,
        ),
    ],
    "intermedio": [
        schemas.ContextualTipOut(
            id="exp_intermedio_progresion",
            category="overload",
            title="Sobrecarga Progresiva Sistemática",
            message="Si completás todas tus series en el rango alto de repeticiones, es momento de sumar 1 repetición o subir 1.25kg a 2.5kg.",
            icon="trending-up",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_intermedio_volumen",
            category="volume",
            title="Volumen Óptimo de Hipertrofia",
            message="Apuntá a 10-16 series efectivas semanales por grupo muscular, distribuidas preferentemente en frecuencia 2.",
            icon="bar-chart-2",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_intermedio_cargas",
            category="loads",
            title="Manejo de Cargas & Micro-Incrementos",
            message="Usá micro-cargas de 1.25kg en básicos para afianzar cada escalón de fuerza sin comprometer tu proximidad al fallo (RIR 1-2).",
            icon="dumbbell",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_intermedio_consistencia",
            category="consistency",
            title="Consistencia & Disciplina",
            message="La adherencia semanal vence a los picos de intensidad desmedidos. En días de baja energía, cumplí el volumen sin forzar récords.",
            icon="flame",
            priority=2,
        ),
    ],
    "avanzado": [
        schemas.ContextualTipOut(
            id="exp_avanzado_rendimiento",
            category="performance",
            title="Análisis de Rendimiento & SNC",
            message="Monitoreá la velocidad de ejecución y tu RPE. Si la primera serie se percibe a RPE 9, autorregulá el volumen para cuidar tu SNC.",
            icon="activity",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_avanzado_volumen_mrv",
            category="volume",
            title="Gestión de MEV, MAV y MRV",
            message="Alterná semanas de acumulación acercándote a tu MRV con semanas de descarga activa (-40% volumen) para disipar fatiga profunda.",
            icon="layers",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_avanzado_pr_peaking",
            category="records",
            title="Estrategia de PRs & Peaking",
            message="Los PRs absolutos requieren semanas previas de potenciación neuromuscular y peaking, no intentos fortuitos en fatiga.",
            icon="trophy",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_avanzado_estancamientos",
            category="plateaus",
            title="Ruptura de Estancamientos",
            message="Ante mesetas de 4+ semanas, introducí pausas isométricas de 2s en sticking points o rotá variantes de implemento por 1 mesociclo.",
            icon="zap",
            priority=2,
        ),
        schemas.ContextualTipOut(
            id="exp_avanzado_tecnica",
            category="technique",
            title="Técnica Biomecánica de Precisión",
            message="Alineá perfiles de resistencia con las palancas articulares y minimizá la fatiga axial para optimizar el estímulo hipertrófico.",
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

    # 1. Fetch user experience level
    profile = db.get(models.UserProfile, 1)
    exp_level = (
        profile.experience_level.strip().lower()
        if profile and profile.experience_level
        else "intermedio"
    )

    # 2. Heurística de Voluntad y Estado del Día (Readiness)
    if readiness_energy is not None:
        if readiness_energy <= 2:
            tips.append(
                schemas.ContextualTipOut(
                    id="wp_low_energy",
                    category="willpower",
                    title="Disciplina sobre Motivación",
                    message="Entrenando con energía baja. Hoy tu mayor mérito es cumplir: tomá descansos generosos (2-3 min) y enfocate en series de calidad técnica.",
                    icon="brain",
                    priority=1,
                )
            )
        elif readiness_energy == 5:
            tips.append(
                schemas.ContextualTipOut(
                    id="wp_max_energy",
                    category="overload",
                    title="Energía al 100% · Día de Ataque",
                    message="Excelente recuperación. Si las series de aproximación se sienten livianas, hoy es el día propicio para intentar sobrecarga progresiva (+1 rep o +1.25kg).",
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
                title="La Inercia del Movimiento",
                message="Tu combustible físico está listo aunque la mente dude. Tras las primeras 2 series, el cuerpo entrará en sintonía con el esfuerzo.",
                icon="flame",
                priority=1,
            )
        )

    # 3. Heurística de Ejercicio Específico (Sobrecarga Progresiva / Consolidación / Recuperación)
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

                            # Carga consolidada
                            if top_weight == prev_top.weight and top_reps >= prev_top.reps:
                                tips.append(
                                    schemas.ContextualTipOut(
                                        id=f"overload_consolidated_{exercise_id}",
                                        category="overload",
                                        title=f"Carga Consolidada en {ex.name}",
                                        message=f"Mantuviste {top_weight}kg × {top_reps} reps en tus últimas sesiones. En tu 1ª serie de hoy, intentá buscar 1 rep extra o sumar 1.25kg.",
                                        icon="trending-up",
                                        priority=1,
                                    )
                                )

                            # Caída de volumen / recuperación
                            prev_vol = sum((st.weight or 0.0) * (st.reps or 0) for st in prev_sets)
                            last_vol = sum((st.weight or 0.0) * (st.reps or 0) for st in last_sets)
                            if prev_vol > 0 and (last_vol / prev_vol) < 0.75:
                                tips.append(
                                    schemas.ContextualTipOut(
                                        id=f"recovery_drop_{exercise_id}",
                                        category="recovery",
                                        title=f"Ajuste de Recuperación en {ex.name}",
                                        message=f"Notamos una reducción de volumen en la última sesión de {ex.name}. Asegurá buena hidratación y priorizá técnica sólida sin forzar límites hoy.",
                                        icon="shield",
                                        priority=2,
                                    )
                                )

    # 4. Complementar con tips según nivel de experiencia del atleta
    exp_pool = EXPERIENCE_TIPS.get(exp_level, EXPERIENCE_TIPS["intermedio"])
    for tip in exp_pool:
        if not any(t.id == tip.id for t in tips):
            tips.append(tip)

    # Sort by priority
    tips.sort(key=lambda t: t.priority)
    return tips
