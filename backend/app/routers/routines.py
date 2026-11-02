from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import models, schemas
from ..database import get_db
from ..security import get_optional_current_user

router = APIRouter()

ROUTINE_DEFINITIONS: list[dict] = []


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
                    equipment=None,
                    suggested_sets=ex_item.get("target_sets", 1),
                    suggested_reps=ex_item.get("target_reps", "6-10"),
                    rest_seconds=180,
                    target_tempo="3-1-2-0 (Controlado)",
                    execution_tips=execution_tips,
                    primary_muscles=primary_muscles,
                    search_terms=ex_item.get("search_terms", []),
                )
            )

        summary = f"{len(exercise_list)} ejercicios · Series efectivas controladas"

        suggested_routines.append(
            schemas.SuggestedRoutine(
                id=rdef["id"],
                title=rdef["title"],
                category=rdef["category"],
                tag=rdef["tag"],
                summary=summary,
                is_recommended=True,
                recommended_badge="🔥 Rutina Oficial",
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


def get_effective_user_id(current_user: models.User | None, db: Session) -> int | None:
    if current_user:
        return current_user.id
    first_user = db.query(models.User.id).first()
    return first_user[0] if first_user else None


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

    effective_uid = get_effective_user_id(current_user, db)
    if effective_uid:
        user_filter = (models.Routine.is_preset == True) | (models.Routine.user_id == effective_uid) | (models.Routine.user_id.is_(None))
    else:
        user_filter = (models.Routine.is_preset == True) | (models.Routine.user_id.is_(None))

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
    user_id = get_effective_user_id(current_user, db)

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
    db.expire_all()
    from sqlalchemy.orm import joinedload
    saved = (
        db.query(models.Routine)
        .options(
            joinedload(models.Routine.exercises)
            .joinedload(models.RoutineExercise.exercise)
            .joinedload(models.Exercise.muscle_group)
        )
        .filter(models.Routine.id == routine.id)
        .first()
    )
    return format_routine_out(saved or routine)


@router.put("/{routine_id}", response_model=schemas.RoutineOut)
@router.patch("/{routine_id}", response_model=schemas.RoutineOut)
def update_routine(
    routine_id: int,
    routine_in: schemas.RoutineUpdate,
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Editar nombre, descripción o ejercicios de una rutina del usuario.
    """
    from sqlalchemy.orm import joinedload

    routine = db.get(models.Routine, routine_id)
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada.")

    if routine.is_preset:
        raise HTTPException(
            status_code=400, detail="No se pueden editar las rutinas base del sistema."
        )

    user_id = get_effective_user_id(current_user, db)
    is_admin = getattr(current_user, "is_admin", False)
    if routine.user_id is not None and routine.user_id != user_id and not is_admin:
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
        db.query(models.RoutineExercise).filter(
            models.RoutineExercise.routine_id == routine.id
        ).delete(synchronize_session=False)
        db.flush()
        for idx, ex_in in enumerate(routine_in.exercises):
            ex_exists = db.get(models.Exercise, ex_in.exercise_id)
            if not ex_exists:
                continue
            re_entry = models.RoutineExercise(
                routine_id=routine.id,
                exercise_id=ex_in.exercise_id,
                order_index=ex_in.order_index if ex_in.order_index is not None else idx,
                target_sets=ex_in.target_sets or 3,
                target_reps=str(ex_in.target_reps or "8-12").strip(),
            )
            db.add(re_entry)

    db.commit()
    db.expire_all()
    updated = (
        db.query(models.Routine)
        .options(
            joinedload(models.Routine.exercises)
            .joinedload(models.RoutineExercise.exercise)
            .joinedload(models.Exercise.muscle_group)
        )
        .filter(models.Routine.id == routine.id)
        .first()
    )
    return format_routine_out(updated or routine)


@router.put("/{routine_id}/exercises", response_model=schemas.RoutineOut)
@router.patch("/{routine_id}/exercises", response_model=schemas.RoutineOut)
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
    from sqlalchemy.orm import joinedload

    routine = db.get(models.Routine, routine_id)
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada.")

    user_id = get_effective_user_id(current_user, db)
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
    elif routine.user_id is not None and routine.user_id != user_id and not is_admin:
        raise HTTPException(
            status_code=403, detail="No tienes permiso para modificar esta rutina."
        )
    else:
        db.query(models.RoutineExercise).filter(
            models.RoutineExercise.routine_id == target_routine.id
        ).delete(synchronize_session=False)
        db.flush()

    for idx, ex_in in enumerate(payload.exercises):
        ex_exists = db.get(models.Exercise, ex_in.exercise_id)
        if not ex_exists:
            continue
        re_entry = models.RoutineExercise(
            routine_id=target_routine.id,
            exercise_id=ex_in.exercise_id,
            order_index=ex_in.order_index if ex_in.order_index is not None else idx,
            target_sets=ex_in.target_sets or 3,
            target_reps=str(ex_in.target_reps or "8-12").strip(),
        )
        db.add(re_entry)

    db.commit()
    db.expire_all()
    updated = (
        db.query(models.Routine)
        .options(
            joinedload(models.Routine.exercises)
            .joinedload(models.RoutineExercise.exercise)
            .joinedload(models.Exercise.muscle_group)
        )
        .filter(models.Routine.id == target_routine.id)
        .first()
    )
    return format_routine_out(updated or target_routine)


@router.delete("/{routine_id}")
def delete_routine(
    routine_id: int,
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Eliminar una rutina creada por el usuario y desvincular sus ejercicios y sesiones.
    """
    routine = db.get(models.Routine, routine_id)
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada.")

    if routine.is_preset:
        raise HTTPException(
            status_code=400, detail="No se pueden eliminar las rutinas base del sistema."
        )

    user_id = get_effective_user_id(current_user, db)
    is_admin = getattr(current_user, "is_admin", False)
    if routine.user_id is not None and routine.user_id != user_id and not is_admin:
        raise HTTPException(
            status_code=403, detail="No tienes permiso para eliminar esta rutina."
        )

    # Desvincular sesiones que apunten a esta rutina y eliminar sus ejercicios asociados
    db.query(models.WorkoutSession).filter(
        models.WorkoutSession.routine_id == routine.id
    ).update({models.WorkoutSession.routine_id: None}, synchronize_session=False)
    db.query(models.RoutineExercise).filter(
        models.RoutineExercise.routine_id == routine.id
    ).delete(synchronize_session=False)

    db.delete(routine)
    db.commit()
    return {"message": "Rutina eliminada correctamente", "deleted": True, "id": routine_id}

