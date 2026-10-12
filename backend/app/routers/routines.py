from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import models, schemas
from ..database import get_db
from ..security import get_optional_current_user

router = APIRouter()

ROUTINE_DEFINITIONS = [
    {
        "id": "heavy-duty-day-1",
        "title": "Heavy Duty Oficial - Día 1 (Lunes): Pecho & Espalda",
        "category": "Pecho & Espalda",
        "tag": "Pecho • Espalda",
        "summary": "Peck Deck, Press Inclinado, Pullover, Jalón Supino, Remo con Barra (1x al fallo)",
        "exercises": [
            {
                "name": "Aperturas en máquina Peck Deck",
                "muscle": "Pecho",
                "equipment": "Máquina",
                "search_terms": ["aperturas en máquina peck deck", "peck deck", "aperturas", "aperturas con mancuernas"],
                "target_sets": 1,
                "target_reps": "6-10",
                "cadence": "4-2-4",
            },
            {
                "name": "Press inclinado con barra",
                "muscle": "Pecho",
                "equipment": "Barra",
                "search_terms": ["press inclinado con barra", "press inclinado", "inclinado con barra"],
                "target_sets": 1,
                "target_reps": "4-8",
                "cadence": "4-2-4",
            },
            {
                "name": "Pullover en polea alta",
                "muscle": "Espalda",
                "equipment": "Polea",
                "search_terms": ["pullover en polea alta", "pullover", "pullover con mancuerna"],
                "target_sets": 1,
                "target_reps": "6-10",
                "cadence": "4-2-4",
            },
            {
                "name": "Jalón al pecho agarre neutro/estrecho",
                "muscle": "Espalda",
                "equipment": "Polea",
                "search_terms": ["jalón al pecho agarre neutro/estrecho", "jalón al pecho", "jalon al pecho", "jalón neutro", "jalón supino"],
                "target_sets": 1,
                "target_reps": "6-10",
                "cadence": "4-2-4",
            },
            {
                "name": "Remo con barra (prono/supino)",
                "muscle": "Espalda",
                "equipment": "Barra",
                "search_terms": ["remo con barra (prono/supino)", "remo con barra", "remo agarre recto"],
                "target_sets": 1,
                "target_reps": "6-8",
                "cadence": "4-2-4",
            },
        ],
    },
    {
        "id": "heavy-duty-day-2",
        "title": "Heavy Duty Oficial - Día 2 (Martes): Piernas & Core",
        "category": "Piernas & Core",
        "tag": "Cuádriceps • Femoral • Gemelos • Core",
        "summary": "Extensión cuádriceps, Prensa inclinada, Curl femoral, Gemelos, Crunch polea (1x al fallo)",
        "exercises": [
            {
                "name": "Extensión de cuádriceps en máquina",
                "muscle": "Piernas",
                "equipment": "Máquina",
                "search_terms": ["extensión de cuádriceps en máquina", "extensión de cuádriceps", "extensiones"],
                "target_sets": 1,
                "target_reps": "8-12",
                "cadence": "4-2-4",
            },
            {
                "name": "Prensa inclinada con discos",
                "muscle": "Piernas",
                "equipment": "Máquina",
                "search_terms": ["prensa inclinada con discos", "prensa", "prensa de piernas"],
                "target_sets": 1,
                "target_reps": "6-10",
                "cadence": "4-2-4",
            },
            {
                "name": "Curl femoral acostado en máquina",
                "muscle": "Piernas",
                "equipment": "Máquina",
                "search_terms": ["curl femoral acostado en máquina", "curl femoral", "femoral"],
                "target_sets": 1,
                "target_reps": "6-10",
                "cadence": "4-2-4",
            },
            {
                "name": "Elevación de talones de pie en máquina",
                "muscle": "Piernas",
                "equipment": "Máquina",
                "search_terms": ["elevación de talones de pie en máquina", "elevación de talones", "pantorrillas", "gemelos"],
                "target_sets": 1,
                "target_reps": "12-15",
                "cadence": "4-2-4",
            },
            {
                "name": "Crunch en polea alta de rodillas",
                "muscle": "Core",
                "equipment": "Polea",
                "search_terms": ["crunch en polea alta de rodillas", "crunch en polea", "crunch"],
                "target_sets": 1,
                "target_reps": "10-15",
                "cadence": "4-2-4",
            },
        ],
    },
    {
        "id": "heavy-duty-day-3",
        "title": "Heavy Duty Oficial - Día 3 (Jueves): Hombros & Brazos",
        "category": "Hombros & Brazos",
        "tag": "Hombros • Tríceps • Bíceps",
        "summary": "Elevaciones laterales, Press militar, Pájaros, Extensión tríceps, Fondos lastrados, Curl Z (1x al fallo)",
        "exercises": [
            {
                "name": "Elevaciones laterales con mancuernas",
                "muscle": "Hombros",
                "equipment": "Mancuerna",
                "search_terms": ["elevaciones laterales con mancuernas", "elevaciones laterales", "vuelo lateral"],
                "target_sets": 1,
                "target_reps": "6-10",
                "cadence": "4-2-4",
            },
            {
                "name": "Press militar de pie con barra",
                "muscle": "Hombros",
                "equipment": "Barra",
                "search_terms": ["press militar de pie con barra", "press militar", "militar"],
                "target_sets": 1,
                "target_reps": "4-8",
                "cadence": "4-2-4",
            },
            {
                "name": "Pájaros para deltoides posterior con mancuernas",
                "muscle": "Hombros",
                "equipment": "Mancuerna",
                "search_terms": ["pájaros para deltoides posterior con mancuernas", "pájaros", "deltoides posterior"],
                "target_sets": 1,
                "target_reps": "6-10",
                "cadence": "4-2-4",
            },
            {
                "name": "Extensión en polea con barra (pushdown)",
                "muscle": "Tríceps",
                "equipment": "Polea",
                "search_terms": ["extensión en polea con barra (pushdown)", "extensión en polea con barra", "pushdown"],
                "target_sets": 1,
                "target_reps": "6-10",
                "cadence": "4-2-4",
            },
            {
                "name": "Fondos en paralelas lastrados",
                "muscle": "Tríceps",
                "equipment": "Corporal",
                "search_terms": ["fondos en paralelas lastrados", "fondos en paralelas", "fondos"],
                "target_sets": 1,
                "target_reps": "4-8",
                "cadence": "4-2-4",
            },
            {
                "name": "Curl con barra Z",
                "muscle": "Bíceps",
                "equipment": "Barra",
                "search_terms": ["curl con barra z", "curl barra z", "curl z"],
                "target_sets": 1,
                "target_reps": "6-10",
                "cadence": "4-2-4",
            },
        ],
    },
    {
        "id": "heavy-duty-day-4",
        "title": "Heavy Duty Oficial - Día 4 (Viernes): Espalda Baja & Consolidación",
        "category": "Espalda Baja & Consolidación",
        "tag": "Espalda Baja • Trapecio • Core",
        "summary": "Peso muerto convencional, Encogimientos mancuernas, Rueda abdominal (1x al fallo)",
        "exercises": [
            {
                "name": "Peso muerto convencional con barra",
                "muscle": "Espalda",
                "equipment": "Barra",
                "search_terms": ["peso muerto convencional con barra", "peso muerto", "deadlift"],
                "target_sets": 1,
                "target_reps": "5-8",
                "cadence": "4-2-4",
            },
            {
                "name": "Encogimientos con mancuernas",
                "muscle": "Hombros",
                "equipment": "Mancuerna",
                "search_terms": ["encogimientos con mancuernas", "encogimientos", "trapecio"],
                "target_sets": 1,
                "target_reps": "8-12",
                "cadence": "4-2-4",
            },
            {
                "name": "Rueda abdominal (Ab Wheel rollout)",
                "muscle": "Core",
                "equipment": "Corporal",
                "search_terms": ["rueda abdominal (ab wheel rollout)", "rueda abdominal", "ab wheel"],
                "target_sets": 1,
                "target_reps": "10-15",
                "cadence": "4-2-4",
            },
        ],
    },
]


GOAL_CONFIGS = {
    "hipertrofia": {
        "label": "Hipertrofia",
        "reps": "8-12 reps",
        "rest_seconds": 90,
        "sets_by_level": {"principiante": 3, "intermedio": 4, "avanzado": 4},
        "rest_display": "90s descanso",
    },
    "fuerza": {
        "label": "Fuerza",
        "reps": "3-6 reps",
        "rest_seconds": 180,
        "sets_by_level": {"principiante": 4, "intermedio": 4, "avanzado": 5},
        "rest_display": "3-5 min descanso",
    },
    "definicion_adelgazar": {
        "label": "Definición",
        "reps": "10-15 reps",
        "rest_seconds": 60,
        "sets_by_level": {"principiante": 3, "intermedio": 3, "avanzado": 4},
        "rest_display": "60s descanso",
    },
    "potencia_rapidez": {
        "label": "Potencia",
        "reps": "2-5 reps",
        "rest_seconds": 180,
        "sets_by_level": {"principiante": 3, "intermedio": 4, "avanzado": 4},
        "rest_display": "3 min descanso",
    },
}


@router.get("/suggested", response_model=schemas.SuggestedRoutinesResponse)
def get_suggested_routines(
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    # 1. Determinar perfil de usuario (auth user o fallback user_profile)
    goal = "hipertrofia"
    level = "intermedio"

    if current_user:
        goal = current_user.training_goal or "hipertrofia"
        level = current_user.experience_level or "intermedio"
    else:
        profile = db.get(models.UserProfile, 1)
        if profile:
            goal = profile.training_goal or "hipertrofia"
            level = profile.experience_level or "intermedio"

    goal_key = goal.lower()
    if goal_key not in GOAL_CONFIGS:
        goal_key = "hipertrofia"

    config = GOAL_CONFIGS[goal_key]
    goal_label = config["label"]
    suggested_reps = config["reps"]
    rest_seconds = config["rest_seconds"]
    suggested_sets = config["sets_by_level"].get(level.lower(), 4)

    recommended_badge = f"✨ Recomendado para tu objetivo actual: {goal_label}"

    # Pre-cargar ejercicios del catálogo para adjuntar datos de biomecánica reales
    all_db_exercises = db.query(models.Exercise).filter(models.Exercise.is_active == True).all()
    db_ex_map = {ex.name.lower().strip(): ex for ex in all_db_exercises}

    suggested_routines = []
    for rdef in ROUTINE_DEFINITIONS:
        exercise_list = []
        for ex_item in rdef["exercises"]:
            # Buscar si el ejercicio existe en DB para enriquecer con tips y tempo
            matched_ex = db_ex_map.get(ex_item["name"].lower().strip())
            target_tempo = matched_ex.target_tempo if matched_ex and matched_ex.target_tempo else "3-0-1-0"
            execution_tips = matched_ex.execution_tips if matched_ex and matched_ex.execution_tips else None
            primary_muscles = matched_ex.primary_muscles if matched_ex and matched_ex.primary_muscles else ex_item["muscle"]

            exercise_list.append(
                schemas.SuggestedRoutineExercise(
                    name=ex_item["name"],
                    muscle=ex_item["muscle"],
                    equipment=ex_item["equipment"],
                    suggested_sets=ex_item.get("target_sets", 1),
                    suggested_reps=ex_item.get("target_reps", "6-10"),
                    rest_seconds=180,
                    target_tempo="4-2-4-0 (Cadencia Mentzer 4-2-4)",
                    execution_tips=execution_tips,
                    primary_muscles=primary_muscles,
                    search_terms=ex_item.get("search_terms", []),
                )
            )

        # Resumen detallado Heavy Duty: 1 serie efectiva al fallo muscular
        summary = f"{len(exercise_list)} ejercicios · 1 serie al fallo (Cadencia Mentzer 4-2-4)"

        suggested_routines.append(
            schemas.SuggestedRoutine(
                id=rdef["id"],
                title=rdef["title"],
                category=rdef["category"],
                tag=rdef["tag"],
                summary=summary,
                is_recommended=True,
                recommended_badge="🔥 Heavy Duty Oficial (Mike Mentzer)",
                training_goal=goal_key,
                experience_level=level,
                suggested_sets=1,
                suggested_reps="6-10",
                rest_seconds=180,
                exercises=exercise_list,
            )
        )

    return schemas.SuggestedRoutinesResponse(
        training_goal=goal_key,
        experience_level=level,
        recommended_label=recommended_badge,
        routines=suggested_routines,
    )


def format_routine_out(routine: models.Routine) -> schemas.RoutineOut:
    exercises_out = []
    sorted_exercises = sorted(routine.exercises or [], key=lambda x: x.order_index)
    for re in sorted_exercises:
        ex_name = re.exercise.name if re.exercise else None
        muscle_name = re.exercise.muscle_group.name if re.exercise and re.exercise.muscle_group else None
        exercises_out.append(
            schemas.RoutineExerciseOut(
                id=re.id,
                routine_id=re.routine_id,
                exercise_id=re.exercise_id,
                exercise_name=ex_name,
                muscle_group_name=muscle_name,
                order_index=re.order_index,
                target_sets=re.target_sets,
                target_reps=re.target_reps,
            )
        )
    return schemas.RoutineOut(
        id=routine.id,
        user_id=routine.user_id,
        name=routine.name,
        description=routine.description,
        is_preset=routine.is_preset,
        created_at=routine.created_at,
        exercises=exercises_out,
    )


@router.get("", response_model=list[schemas.RoutineOut])
def get_all_routines(
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna las rutinas rápidas del sistema (is_preset=True) +
    las rutinas creadas por el usuario autenticado.
    """
    from sqlalchemy.orm import joinedload

    if current_user:
        user_filter = (models.Routine.is_preset == True) | (models.Routine.user_id == current_user.id)
    else:
        user_filter = (models.Routine.is_preset == True) | (models.Routine.user_id == 1)

    routines = (
        db.query(models.Routine)
        .options(
            joinedload(models.Routine.exercises)
            .joinedload(models.RoutineExercise.exercise)
            .joinedload(models.Exercise.muscle_group)
        )
        .filter(user_filter)
        .order_by(models.Routine.is_preset.desc(), models.Routine.id.desc())
        .all()
    )

    return [format_routine_out(r) for r in routines]


@router.post("", response_model=schemas.RoutineOut, status_code=status.HTTP_201_CREATED)
def create_routine(
    routine_in: schemas.RoutineCreate,
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Crear una nueva rutina personalizada con su lista de ejercicios ordenados.
    """
    user_id = current_user.id if current_user else 1

    clean_name = routine_in.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="El nombre de la rutina es requerido.")

    routine = models.Routine(
        user_id=user_id,
        name=clean_name,
        description=routine_in.description.strip() if routine_in.description else None,
        is_preset=False,
    )
    db.add(routine)
    db.flush()

    for idx, ex_in in enumerate(routine_in.exercises):
        ex_exists = db.get(models.Exercise, ex_in.exercise_id)
        if not ex_exists:
            continue

        re_entry = models.RoutineExercise(
            routine_id=routine.id,
            exercise_id=ex_in.exercise_id,
            order_index=ex_in.order_index if ex_in.order_index is not None else idx,
            target_sets=ex_in.target_sets or 4,
            target_reps=str(ex_in.target_reps or "8-12").strip(),
        )
        db.add(re_entry)

    db.commit()
    db.refresh(routine)
    return format_routine_out(routine)


@router.put("/{routine_id}", response_model=schemas.RoutineOut)
def update_routine(
    routine_id: int,
    routine_in: schemas.RoutineUpdate,
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Editar nombre, descripción o ejercicios de una rutina del usuario.
    """
    routine = db.get(models.Routine, routine_id)
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada.")

    if routine.is_preset:
        raise HTTPException(
            status_code=400, detail="No se pueden editar las rutinas base del sistema."
        )

    user_id = current_user.id if current_user else 1
    is_admin = getattr(current_user, "is_admin", False)
    if routine.user_id != user_id and not is_admin:
        raise HTTPException(
            status_code=403, detail="No tienes permiso para modificar esta rutina."
        )

    if routine_in.name is not None:
        clean_name = routine_in.name.strip()
        if not clean_name:
            raise HTTPException(status_code=400, detail="El nombre de la rutina no puede estar vacío.")
        routine.name = clean_name

    if routine_in.description is not None:
        routine.description = routine_in.description.strip() if routine_in.description else None

    if routine_in.exercises is not None:
        db.query(models.RoutineExercise).filter(models.RoutineExercise.routine_id == routine.id).delete()
        for idx, ex_in in enumerate(routine_in.exercises):
            ex_exists = db.get(models.Exercise, ex_in.exercise_id)
            if not ex_exists:
                continue
            re_entry = models.RoutineExercise(
                routine_id=routine.id,
                exercise_id=ex_in.exercise_id,
                order_index=ex_in.order_index if ex_in.order_index is not None else idx,
                target_sets=ex_in.target_sets or 4,
                target_reps=str(ex_in.target_reps or "8-12").strip(),
            )
            db.add(re_entry)

    db.commit()
    db.refresh(routine)
    return format_routine_out(routine)


@router.put("/{routine_id}/exercises", response_model=schemas.RoutineOut)
def update_routine_exercises(
    routine_id: int,
    payload: schemas.RoutineExercisesUpdate,
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Modificar, reordenar, reemplazar o añadir ejercicios a una rutina existente.
    Si la rutina es del sistema (preset), crea una copia personalizada para el usuario.
    """
    routine = db.get(models.Routine, routine_id)
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada.")

    user_id = current_user.id if current_user else 1
    is_admin = getattr(current_user, "is_admin", False)

    target_routine = routine
    if routine.is_preset and not is_admin:
        target_routine = models.Routine(
            user_id=user_id,
            name=f"{routine.name} (Personalizada)",
            description=routine.description,
            is_preset=False,
        )
        db.add(target_routine)
        db.flush()
    elif routine.user_id != user_id and not is_admin:
        raise HTTPException(
            status_code=403, detail="No tienes permiso para modificar esta rutina."
        )
    else:
        db.query(models.RoutineExercise).filter(
            models.RoutineExercise.routine_id == target_routine.id
        ).delete()

    for idx, ex_in in enumerate(payload.exercises):
        ex_exists = db.get(models.Exercise, ex_in.exercise_id)
        if not ex_exists:
            continue
        re_entry = models.RoutineExercise(
            routine_id=target_routine.id,
            exercise_id=ex_in.exercise_id,
            order_index=ex_in.order_index if ex_in.order_index is not None else idx,
            target_sets=ex_in.target_sets or 4,
            target_reps=str(ex_in.target_reps or "8-12").strip(),
        )
        db.add(re_entry)

    db.commit()
    db.refresh(target_routine)
    return format_routine_out(target_routine)


@router.delete("/{routine_id}")
def delete_routine(
    routine_id: int,
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Eliminar una rutina creada por el usuario.
    """
    routine = db.get(models.Routine, routine_id)
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada.")

    if routine.is_preset:
        raise HTTPException(
            status_code=400, detail="No se pueden eliminar las rutinas base del sistema."
        )

    user_id = current_user.id if current_user else 1
    is_admin = getattr(current_user, "is_admin", False)
    if routine.user_id != user_id and not is_admin:
        raise HTTPException(
            status_code=403, detail="No tienes permiso para eliminar esta rutina."
        )

    db.delete(routine)
    db.commit()
    return {"message": "Rutina eliminada correctamente", "id": routine_id}

