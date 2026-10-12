from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db
from ..security import get_optional_current_user

router = APIRouter()


@router.get("", response_model=list[schemas.ExerciseOut])
def list_exercises(
    muscle_group_id: int | None = Query(None, description="Filtrar por ID de grupo muscular"),
    include_archived: bool = Query(False, description="Incluir ejercicios archivados"),
    limit: int | None = Query(None, description="Límite opcional de resultados"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Exercise).options(joinedload(models.Exercise.muscle_group))
    if not include_archived:
        query = query.filter(models.Exercise.is_active == True)
    if muscle_group_id is not None:
        query = query.filter(models.Exercise.muscle_group_id == muscle_group_id)
    query = query.order_by(models.Exercise.name.asc())
    if limit is not None:
        query = query.limit(limit)
    exercises = query.all()

    return [
        schemas.ExerciseOut(
            id=ex.id,
            name=ex.name,
            muscle_group_id=ex.muscle_group_id,
            muscle_group_name=ex.muscle_group.name if ex.muscle_group else None,
            is_active=ex.is_active,
            execution_tips=ex.execution_tips,
            target_tempo=ex.target_tempo,
            primary_muscles=ex.primary_muscles,
            equipment_type=ex.equipment_type,
            mechanics_type=ex.mechanics_type,
            image_url=ex.image_url,
            key_cue=ex.key_cue,
            replacement_id=ex.replacement_id,
        )
        for ex in exercises
    ]


@router.post("", response_model=schemas.ExerciseOut)
def create_exercise(payload: schemas.ExerciseCreate, db: Session = Depends(get_db)):
    clean_name = payload.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="El nombre del ejercicio no puede estar vacío.")

    group = db.get(models.MuscleGroup, payload.muscle_group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo muscular no encontrado.")

    existing = (
        db.query(models.Exercise)
        .filter(
            models.Exercise.muscle_group_id == payload.muscle_group_id,
            func.lower(models.Exercise.name) == clean_name.lower()
        )
        .first()
    )
    if existing:
        if not existing.is_active:
            existing.is_active = True
        if payload.execution_tips is not None:
            existing.execution_tips = payload.execution_tips
        if payload.target_tempo is not None:
            existing.target_tempo = payload.target_tempo
        if payload.primary_muscles is not None:
            existing.primary_muscles = payload.primary_muscles
        if payload.equipment_type is not None:
            existing.equipment_type = payload.equipment_type
        if payload.mechanics_type is not None:
            existing.mechanics_type = payload.mechanics_type
        if payload.image_url is not None:
            existing.image_url = payload.image_url
        if payload.key_cue is not None:
            existing.key_cue = payload.key_cue
        if payload.replacement_id is not None:
            existing.replacement_id = payload.replacement_id
        db.commit()
        db.refresh(existing)
        return schemas.ExerciseOut(
            id=existing.id,
            name=existing.name,
            muscle_group_id=existing.muscle_group_id,
            muscle_group_name=group.name,
            is_active=existing.is_active,
            execution_tips=existing.execution_tips,
            target_tempo=existing.target_tempo,
            primary_muscles=existing.primary_muscles,
            equipment_type=existing.equipment_type,
            mechanics_type=existing.mechanics_type,
            image_url=existing.image_url,
            key_cue=existing.key_cue,
            replacement_id=existing.replacement_id,
        )

    exercise = models.Exercise(
        name=clean_name,
        muscle_group_id=payload.muscle_group_id,
        is_active=True,
        execution_tips=payload.execution_tips,
        target_tempo=payload.target_tempo,
        primary_muscles=payload.primary_muscles,
        equipment_type=payload.equipment_type or "barra",
        mechanics_type=payload.mechanics_type or "compuesto",
        image_url=payload.image_url,
        key_cue=payload.key_cue,
        replacement_id=payload.replacement_id,
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return schemas.ExerciseOut(
        id=exercise.id,
        name=exercise.name,
        muscle_group_id=exercise.muscle_group_id,
        muscle_group_name=group.name,
        is_active=exercise.is_active,
        execution_tips=exercise.execution_tips,
        target_tempo=exercise.target_tempo,
        primary_muscles=exercise.primary_muscles,
        equipment_type=exercise.equipment_type,
        mechanics_type=exercise.mechanics_type,
        image_url=exercise.image_url,
        key_cue=exercise.key_cue,
        replacement_id=exercise.replacement_id,
    )


@router.get("/{exercise_id}/guide", response_model=schemas.ExerciseGuideOut)
def get_exercise_guide(
    exercise_id: int,
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    exercise = (
        db.query(models.Exercise)
        .options(joinedload(models.Exercise.muscle_group))
        .filter(models.Exercise.id == exercise_id)
        .first()
    )
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")

    level = "estándar"

    mg_name = exercise.muscle_group.name if exercise.muscle_group else "General"

    raw_tips = exercise.execution_tips or ""
    tempo = exercise.target_tempo or "3-0-1-0 (3s bajada / 1s subida)"
    muscles = exercise.primary_muscles or (f"{mg_name}, estabilizadores sinergistas")

    # Extract bullet points
    lines = [line.strip().lstrip("•-* ").strip() for line in raw_tips.split("\n") if line.strip()]

    setup = None
    execution = None
    breathing = None

    for line in lines:
        lower = line.lower()
        if lower.startswith("setup:") or lower.startswith("preparación:"):
            setup = line.split(":", 1)[1].strip()
        elif lower.startswith("ejecución:") or lower.startswith("movimiento:"):
            execution = line.split(":", 1)[1].strip()
        elif lower.startswith("respiración:") or lower.startswith("aire:"):
            breathing = line.split(":", 1)[1].strip()

    # Fallback to lines if prefixes weren't used
    if not setup and len(lines) > 0:
        setup = lines[0]
    if not execution and len(lines) > 1:
        execution = lines[1]
    if not breathing and len(lines) > 2:
        breathing = lines[2]

    # Default biomechanical points if none found
    if not setup:
        setup = "Postura estable, base firme y anclaje escapular o de cadera antes de iniciar."
    if not execution:
        execution = "Fase concéntrica acelerada y fase excéntrica estricta (3s) sin rebotes articulares."
    if not breathing:
        breathing = "Inhalación diafragmática en la fase excéntrica; exhalar superando el punto de estancamiento."

    key_points = [
        f"Setup: {setup}",
        f"Ejecución: {execution}",
        f"Respiración: {breathing}",
    ]

    level_rec = "Asegurá tensión mecánica continua en todo el rango completo, aceleración concéntrica controlando la fase excéntrica (3s) y manteniendo RIR 1-2."


    return schemas.ExerciseGuideOut(
        exercise_id=exercise.id,
        exercise_name=exercise.name,
        muscle_group_name=mg_name,
        primary_muscles=muscles,
        target_tempo=tempo,
        execution_tips=raw_tips or "\n".join(f"• {kp}" for kp in key_points),
        key_points=key_points,
        setup=setup,
        execution=execution,
        breathing=breathing,
        user_level=level,
        level_recommendation=level_rec,
    )


@router.get("/{exercise_id}/previous-session", response_model=schemas.PreviousExerciseSessionOut | None)
def get_previous_session_for_exercise(
    exercise_id: int,
    exclude_session_id: int | None = Query(None, description="ID de sesión a excluir (ej. sesión en progreso)"),
    db: Session = Depends(get_db)
):
    exercise = db.get(models.Exercise, exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")

    # Find the most recent COMPLETED workout session that has sets for this exercise
    query = (
        db.query(models.WorkoutSession)
        .join(models.WorkoutSet, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
        .filter(
            models.WorkoutSet.exercise_id == exercise_id,
            models.WorkoutSession.status == "completed",
        )
    )
    if exclude_session_id is not None:
        query = query.filter(models.WorkoutSession.id != exclude_session_id)

    last_session = query.order_by(models.WorkoutSession.date.desc(), models.WorkoutSession.id.desc()).first()
    if not last_session:
        return None

    sets = (
        db.query(models.WorkoutSet)
        .filter(
            models.WorkoutSet.workout_session_id == last_session.id,
            models.WorkoutSet.exercise_id == exercise_id,
        )
        .order_by(models.WorkoutSet.set_number.asc(), models.WorkoutSet.id.asc())
        .all()
    )

    total_volume = sum((s.weight * s.reps) for s in sets if s.completed)
    if total_volume == 0 and sets:
        total_volume = sum((s.weight * s.reps) for s in sets)

    return schemas.PreviousExerciseSessionOut(
        exercise_id=exercise.id,
        exercise_name=exercise.name,
        session_id=last_session.id,
        date=last_session.date,
        total_volume=round(total_volume, 1),
        sets=[
            schemas.PreviousSessionSetOut(
                set_number=s.set_number,
                weight=s.weight,
                reps=s.reps,
                completed=s.completed,
            )
            for s in sets
        ],
    )


@router.delete("/{exercise_id}")
def delete_exercise(exercise_id: int, db: Session = Depends(get_db)):
    exercise = db.get(models.Exercise, exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")

    # Check if there are historical sets recorded with this exercise
    has_sets = (
        db.query(models.WorkoutSet)
        .filter(models.WorkoutSet.exercise_id == exercise_id)
        .first()
    )
    if has_sets:
        # Soft delete: archive the exercise without wiping historical sets
        exercise.is_active = False
        db.commit()
        return {
            "deleted": True,
            "archived": True,
            "message": "Ejercicio archivado. Tu historial de series previas se mantiene intacto.",
        }

    db.delete(exercise)
    db.commit()
    return {"deleted": True, "archived": False, "message": "Ejercicio eliminado exitosamente."}


@router.put("/{exercise_id}", response_model=schemas.ExerciseOut)
@router.patch("/{exercise_id}", response_model=schemas.ExerciseOut)
def update_exercise(
    exercise_id: int,
    payload: schemas.ExerciseUpdate,
    db: Session = Depends(get_db)
):
    exercise = (
        db.query(models.Exercise)
        .options(joinedload(models.Exercise.muscle_group))
        .filter(models.Exercise.id == exercise_id)
        .first()
    )
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")

    if payload.name is not None:
        clean_name = payload.name.strip()
        if clean_name:
            exercise.name = clean_name
    if payload.muscle_group_id is not None:
        group = db.get(models.MuscleGroup, payload.muscle_group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Grupo muscular no encontrado.")
        exercise.muscle_group_id = payload.muscle_group_id
    if payload.execution_tips is not None:
        exercise.execution_tips = payload.execution_tips
    if payload.target_tempo is not None:
        exercise.target_tempo = payload.target_tempo
    if payload.primary_muscles is not None:
        exercise.primary_muscles = payload.primary_muscles
    if payload.equipment_type is not None:
        exercise.equipment_type = payload.equipment_type
    if payload.mechanics_type is not None:
        exercise.mechanics_type = payload.mechanics_type
    if payload.image_url is not None:
        exercise.image_url = payload.image_url.strip() if payload.image_url else None
    if payload.key_cue is not None:
        exercise.key_cue = payload.key_cue
    if payload.replacement_id is not None:
        exercise.replacement_id = payload.replacement_id

    db.commit()
    db.refresh(exercise)

    return schemas.ExerciseOut(
        id=exercise.id,
        name=exercise.name,
        muscle_group_id=exercise.muscle_group_id,
        muscle_group_name=exercise.muscle_group.name if exercise.muscle_group else None,
        is_active=exercise.is_active,
        execution_tips=exercise.execution_tips,
        target_tempo=exercise.target_tempo,
        primary_muscles=exercise.primary_muscles,
        equipment_type=exercise.equipment_type,
        mechanics_type=exercise.mechanics_type,
        image_url=exercise.image_url,
        key_cue=exercise.key_cue,
        replacement_id=exercise.replacement_id,
    )



@router.get("/{exercise_id}/guidance", response_model=schemas.ExerciseGuidanceOut)
def get_exercise_guidance(
    exercise_id: int,
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna analítica de guía para el ejercicio:
    - 1RM previo estimado (Epley y Brzycki) a partir del historial real de series
    - Meta sugerida para hoy según sobrecarga progresiva (+2.5 kg o +1 rep) o descarga (-30% si fatiga detectada)
    - Ejercicio sustituto directo equivalente del mismo grupo muscular
    """
    from ..services.biometrics import (
        calculate_1rm_epley,
        calculate_1rm_brzycki,
        calculate_progressive_overload_guidance,
    )

    exercise = (
        db.query(models.Exercise)
        .options(
            joinedload(models.Exercise.muscle_group),
            joinedload(models.Exercise.replacement).joinedload(models.Exercise.muscle_group)
        )
        .filter(models.Exercise.id == exercise_id)
        .first()
    )
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")

    # 1. Sustituto directo o alternativa por mismo grupo muscular
    substitute_out = None
    sub_ex = exercise.replacement
    if not sub_ex and exercise.replacement_id:
        sub_ex = db.get(models.Exercise, exercise.replacement_id)

    if not sub_ex and exercise.muscle_group_id:
        sub_ex = (
            db.query(models.Exercise)
            .filter(
                models.Exercise.muscle_group_id == exercise.muscle_group_id,
                models.Exercise.id != exercise.id,
                models.Exercise.is_active == True,
            )
            .order_by(models.Exercise.name.asc())
            .first()
        )

    if sub_ex:
        mg_sub_name = sub_ex.muscle_group.name if sub_ex.muscle_group else None
        substitute_out = schemas.ExerciseSubstituteOut(
            id=sub_ex.id,
            name=sub_ex.name,
            muscle_group_name=mg_sub_name,
            equipment_type=sub_ex.equipment_type,
            mechanics_type=sub_ex.mechanics_type,
            key_cue=sub_ex.key_cue,
            image_url=sub_ex.image_url,
        )

    # 2. Historial de series del usuario para este ejercicio
    user_id = current_user.id if current_user else 1

    sets_query = (
        db.query(models.WorkoutSet, models.WorkoutSession.date)
        .join(models.WorkoutSession, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
        .filter(
            models.WorkoutSet.exercise_id == exercise_id,
            models.WorkoutSet.completed == True,
            models.WorkoutSession.user_id == user_id,
            models.WorkoutSession.status == "completed",
        )
        .order_by(models.WorkoutSession.date.desc(), models.WorkoutSession.id.desc(), models.WorkoutSet.id.desc())
        .all()
    )

    best_1rm_epley = None
    best_1rm_brzycki = None
    last_weight = 0.0
    last_reps = 0
    last_date = None

    if sets_query:
        # Última serie registrada
        first_set, first_date = sets_query[0]
        last_weight = float(first_set.weight or 0.0)
        last_reps = int(first_set.reps or 0)
        last_date = first_date

        max_epley = 0.0
        max_brzycki = 0.0
        for st, _ in sets_query:
            w = float(st.weight or 0.0)
            r = int(st.reps or 0)
            if w > 0 and r > 0:
                e1 = calculate_1rm_epley(w, r)
                b1 = calculate_1rm_brzycki(w, r)
                if e1 > max_epley:
                    max_epley = e1
                if b1 > max_brzycki:
                    max_brzycki = b1

        if max_epley > 0:
            best_1rm_epley = max_epley
            best_1rm_brzycki = max_brzycki

    # 3. Detección de fatiga en la última sesión realizada por el usuario
    last_session = (
        db.query(models.WorkoutSession)
        .filter(
            models.WorkoutSession.user_id == user_id,
            models.WorkoutSession.status == "completed",
        )
        .order_by(models.WorkoutSession.date.desc(), models.WorkoutSession.id.desc())
        .first()
    )

    fatigue_detected = False
    if last_session:
        if last_session.readiness_energy is not None and last_session.readiness_energy <= 2:
            fatigue_detected = True
        elif last_session.mental_effort is not None and last_session.mental_effort >= 4:
            fatigue_detected = True

    # 4. Cálculo de meta sugerida
    guidance = calculate_progressive_overload_guidance(
        last_weight=last_weight,
        last_reps=last_reps,
        fatigue_detected=fatigue_detected,
        mechanics_type=exercise.mechanics_type or "compuesto",
    )

    suggested_goal = schemas.SuggestedGoalOut(
        type=guidance["type"],
        suggested_weight=guidance["suggested_weight"],
        suggested_reps=guidance["suggested_reps"],
        reason=guidance["reason"],
        overload_weight=guidance["overload_weight"],
        overload_reps=guidance["overload_reps"],
        deload_weight=guidance["deload_weight"],
        fatigue_detected=guidance["fatigue_detected"],
    )

    return schemas.ExerciseGuidanceOut(
        exercise_id=exercise.id,
        exercise_name=exercise.name,
        equipment_type=exercise.equipment_type,
        mechanics_type=exercise.mechanics_type,
        key_cue=exercise.key_cue,
        image_url=exercise.image_url,
        previous_1rm=best_1rm_epley,
        previous_1rm_epley=best_1rm_epley,
        previous_1rm_brzycki=best_1rm_brzycki,
        last_weight=last_weight if last_weight > 0 else None,
        last_reps=last_reps if last_reps > 0 else None,
        last_date=last_date,
        fatigue_detected=fatigue_detected,
        suggested_goal=suggested_goal,
        substitute_exercise=substitute_out,
    )

