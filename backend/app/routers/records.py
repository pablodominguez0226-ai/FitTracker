import datetime as dt
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter()


def calculate_1rm(w: float, r: int) -> float:
    if w <= 0 or r <= 0:
        return 0.0
    if r == 1:
        return float(w)
    # Epley formula: w * (1 + r / 30)
    return round(float(w) * (1.0 + float(r) / 30.0), 1)


def compute_user_records(
    db: Session,
    current_user: models.User,
    exercise_id: int | None = None,
    muscle_group_id: int | None = None,
) -> list[schemas.RecordOut]:
    """Computes PRs and 1RM progression for user exercises.
    Sanitizes exercise_id and muscle_group_id so FastAPI Query defaults or non-ints are never passed to SQL.
    """
    clean_exercise_id = exercise_id if isinstance(exercise_id, int) else None
    clean_muscle_group_id = muscle_group_id if isinstance(muscle_group_id, int) else None

    # Fetch exercises performed by the authenticated user with strict user isolation
    query = (
        db.query(models.Exercise)
        .options(joinedload(models.Exercise.muscle_group))
        .join(models.WorkoutSet, models.WorkoutSet.exercise_id == models.Exercise.id)
        .join(models.WorkoutSession, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
        .filter(
            models.WorkoutSession.user_id == current_user.id,
            models.Exercise.is_active == True,
            (models.WorkoutSet.weight > 0) | (models.WorkoutSet.reps > 0),
        )
    )

    if clean_exercise_id is not None:
        query = query.filter(models.Exercise.id == clean_exercise_id)
    if clean_muscle_group_id is not None:
        query = query.filter(models.Exercise.muscle_group_id == clean_muscle_group_id)

    exercises = query.distinct().order_by(models.Exercise.name.asc()).all()
    if not exercises:
        return []

    ex_ids = [e.id for e in exercises]
    sets_data = (
        db.query(
            models.WorkoutSet.exercise_id,
            models.WorkoutSet.weight,
            models.WorkoutSet.reps,
            models.WorkoutSet.completed,
            models.WorkoutSet.set_number,
            models.WorkoutSet.set_type,
            models.WorkoutSession.date,
            models.WorkoutSession.id.label("session_id"),
        )
        .join(models.WorkoutSession, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
        .filter(
            models.WorkoutSet.exercise_id.in_(ex_ids),
            models.WorkoutSession.user_id == current_user.id,
        )
        .order_by(
            models.WorkoutSession.date.asc(),
            models.WorkoutSession.id.asc(),
            models.WorkoutSet.set_number.asc(),
        )
        .all()
    )

    grouped_sets = {eid: [] for eid in ex_ids}
    for row in sets_data:
        grouped_sets[row.exercise_id].append(row)

    records = []
    for ex in exercises:
        ex_sets = grouped_sets.get(ex.id, [])
        if not ex_sets:
            continue

        # Exclude warmup sets from records and 1RM calculations
        valid_non_warmup = [s for s in ex_sets if getattr(s, "set_type", "normal") not in ("warmup", "W")]
        if not valid_non_warmup:
            continue

        # Valid sets: completed first if available, otherwise any with weight > 0 or reps > 0
        valid_completed = [s for s in valid_non_warmup if s.completed and (s.weight > 0 or s.reps > 0)]
        valid_sets = valid_completed if valid_completed else [s for s in valid_non_warmup if (s.weight > 0 or s.reps > 0)]

        if not valid_sets:
            continue

        # 1. Best estimated 1RM across all valid sets
        best_estimated_1rm = max(
            (calculate_1rm(s.weight, s.reps) for s in valid_sets),
            default=0.0,
        )

        # 2. Track chronological PR milestones by session
        sessions_map = {}
        for s in valid_sets:
            if s.session_id not in sessions_map:
                sessions_map[s.session_id] = {
                    "date": s.date,
                    "sets": [],
                }
            sessions_map[s.session_id]["sets"].append(s)

        milestones = []
        running_max_w = 0.0
        running_max_r = 0

        for sess_id, sess_info in sessions_map.items():
            sess_sets = sess_info["sets"]
            best_sess_set = max(sess_sets, key=lambda s: (s.weight, s.reps))
            sw = float(best_sess_set.weight)
            sr = int(best_sess_set.reps)
            sdate = sess_info["date"]

            is_new_milestone = False
            if sw > running_max_w:
                is_new_milestone = True
            elif sw == running_max_w and sw > 0 and sr > running_max_r:
                is_new_milestone = True
            elif running_max_w == 0 and sr > running_max_r:
                is_new_milestone = True

            if is_new_milestone:
                milestones.append({
                    "weight": sw,
                    "reps": sr,
                    "date": sdate,
                })
                running_max_w = max(running_max_w, sw)
                running_max_r = max(running_max_r, sr)

        if not milestones:
            best_s = max(valid_sets, key=lambda s: (s.weight, s.reps))
            milestones.append({
                "weight": float(best_s.weight),
                "reps": int(best_s.reps),
                "date": best_s.date,
            })

        current_pr = milestones[-1]
        pr_weight = current_pr["weight"]
        pr_reps = current_pr["reps"]
        pr_date = current_pr["date"]

        previous_pr_weight = None
        previous_pr_date = None
        if len(milestones) >= 2:
            prev_milestone = milestones[-2]
            previous_pr_weight = prev_milestone["weight"]
            previous_pr_date = prev_milestone["date"]

        if best_estimated_1rm <= 0.0 and pr_weight > 0:
            best_estimated_1rm = calculate_1rm(pr_weight, pr_reps)

        # Last session info (most recent session in chronological order)
        latest_session_id = ex_sets[-1].session_id
        latest_session_sets = [s for s in ex_sets if s.session_id == latest_session_id]
        last_weight = None
        last_reps = None
        last_date = None
        if latest_session_sets:
            best_last = max(latest_session_sets, key=lambda s: (s.weight, s.reps))
            last_weight = best_last.weight
            last_reps = best_last.reps
            last_date = best_last.date

        muscle_name = ex.muscle_group.name if ex.muscle_group else ""

        records.append(
            schemas.RecordOut(
                exercise_id=ex.id,
                exercise_name=ex.name,
                muscle_group=muscle_name,
                muscle_group_id=ex.muscle_group_id,
                muscle_group_name=muscle_name,
                pr_weight=pr_weight,
                pr_reps=pr_reps,
                pr_date=pr_date,
                previous_pr_weight=previous_pr_weight,
                previous_pr_date=previous_pr_date,
                best_estimated_1rm=best_estimated_1rm,
                last_weight=last_weight,
                last_reps=last_reps,
                last_date=last_date,
            )
        )

    return records


@router.get("", response_model=list[schemas.RecordOut])
def get_records(
    exercise_id: int | None = Query(None, description="Filtrar por ID de ejercicio"),
    muscle_group_id: int | None = Query(None, description="Filtrar por grupo muscular"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return compute_user_records(
        db=db,
        current_user=current_user,
        exercise_id=exercise_id,
        muscle_group_id=muscle_group_id,
    )
