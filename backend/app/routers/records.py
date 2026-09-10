from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter()


@router.get("", response_model=list[schemas.RecordOut])
def get_records(
    exercise_id: int | None = Query(None, description="Filtrar por ID de ejercicio"),
    muscle_group_id: int | None = Query(None, description="Filtrar por grupo muscular"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.Exercise).options(joinedload(models.Exercise.muscle_group)).filter(models.Exercise.is_active == True)
    if exercise_id is not None:
        query = query.filter(models.Exercise.id == exercise_id)
    if muscle_group_id is not None:
        query = query.filter(models.Exercise.muscle_group_id == muscle_group_id)

    exercises = query.order_by(models.Exercise.name.asc()).all()
    if not exercises:
        return []

    ex_ids = [e.id for e in exercises]
    sets_data = (
        db.query(
            models.WorkoutSet.exercise_id,
            models.WorkoutSet.weight,
            models.WorkoutSet.reps,
            models.WorkoutSet.completed,
            models.WorkoutSession.date,
            models.WorkoutSession.id.label("session_id"),
        )
        .join(models.WorkoutSession, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
        .filter(
            models.WorkoutSet.exercise_id.in_(ex_ids),
            models.WorkoutSession.user_id == current_user.id,
        )
        .order_by(models.WorkoutSession.date.desc(), models.WorkoutSession.id.desc(), models.WorkoutSet.set_number.desc())
        .all()
    )

    grouped_sets = {eid: [] for eid in ex_ids}
    for row in sets_data:
        grouped_sets[row.exercise_id].append(row)

    records = []
    for ex in exercises:
        ex_sets = grouped_sets.get(ex.id, [])
        pr_weight = None
        pr_reps = None
        pr_date = None
        last_weight = None
        last_reps = None
        last_date = None

        if ex_sets:
            # Valid set for PR: completed with positive weight or reps (supports bodyweight exercises like pull-ups)
            valid_sets = [
                s for s in ex_sets
                if s.completed and (s.weight > 0 or s.reps > 0)
            ] or [
                s for s in ex_sets
                if (s.weight > 0 or s.reps > 0)
            ]
            if valid_sets:
                best_set = max(valid_sets, key=lambda s: (s.weight, s.reps, str(s.date or "")))
                pr_weight = best_set.weight
                pr_reps = best_set.reps
                pr_date = best_set.date

            latest_session_id = ex_sets[0].session_id
            latest_session_sets = [s for s in ex_sets if s.session_id == latest_session_id]
            if latest_session_sets:
                best_last = max(latest_session_sets, key=lambda s: (s.weight, s.reps))
                last_weight = best_last.weight
                last_reps = best_last.reps
                last_date = best_last.date

        records.append(
            schemas.RecordOut(
                exercise_id=ex.id,
                exercise_name=ex.name,
                muscle_group_id=ex.muscle_group_id,
                muscle_group_name=ex.muscle_group.name if ex.muscle_group else None,
                pr_weight=pr_weight,
                pr_reps=pr_reps,
                pr_date=pr_date,
                last_weight=last_weight,
                last_reps=last_reps,
                last_date=last_date,
            )
        )

    return records
