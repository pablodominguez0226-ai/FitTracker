from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db

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
    if limit is not None:
        query = query.limit(limit)
    exercises = query.order_by(models.Exercise.name.asc()).all()

    return [
        schemas.ExerciseOut(
            id=ex.id,
            name=ex.name,
            muscle_group_id=ex.muscle_group_id,
            muscle_group_name=ex.muscle_group.name if ex.muscle_group else None,
            is_active=ex.is_active,
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
            db.commit()
            db.refresh(existing)
        return schemas.ExerciseOut(
            id=existing.id,
            name=existing.name,
            muscle_group_id=existing.muscle_group_id,
            muscle_group_name=group.name,
            is_active=existing.is_active,
        )

    exercise = models.Exercise(name=clean_name, muscle_group_id=payload.muscle_group_id, is_active=True)
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return schemas.ExerciseOut(
        id=exercise.id,
        name=exercise.name,
        muscle_group_id=exercise.muscle_group_id,
        muscle_group_name=group.name,
        is_active=exercise.is_active,
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

