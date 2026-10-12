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


def get_exercise_prime_multiplier(exercise_name: str) -> float:
    """Returns the theoretical prime strength multiplier relative to bodyweight."""
    name = (exercise_name or "").lower()
    # Sentadillas / Tren inferior pesado
    if any(k in name for k in ("sentadilla", "squat", "hack", "prensa")):
        return 2.00
    # Peso Muerto
    if any(k in name for k in ("peso muerto", "deadlift")):
        return 2.30
    # Hip Thrust
    if "hip thrust" in name:
        return 2.50
    # Press Banca / Empuje pectoral
    if any(k in name for k in ("banca", "bench", "press plano", "press declinado", "press inclinado")):
        return 1.50
    # Press Militar / Empuje vertical de hombro
    if any(k in name for k in ("militar", "overhead", "press de hombro", "press hombro", "arnold")):
        return 0.90
    # Remos / Tracción horizontal
    if any(k in name for k in ("remo", "row", "seal row")):
        return 1.35
    # Dominadas / Tracción vertical (carga añadida / lastre)
    if any(k in name for k in ("dominada", "pull-up", "chin-up")):
        return 0.50
    # Jalón
    if any(k in name for k in ("jalón", "jalon", "pulldown")):
        return 1.25
    # Fondos (lastre)
    if any(k in name for k in ("fondo", "dip")):
        return 0.60
    # Aislamiento (curls, elevaciones, tríceps, extensiones)
    if any(k in name for k in ("curl", "martillo", "lateral", "pájaro", "pajaro", "francés", "frances", "tríceps", "triceps", "polea")):
        return 0.50
    # Default press/empuje
    if "press" in name:
        return 1.40
    return 1.50


def calculate_prime_target(exercise_name: str, bodyweight: float, height: float | None = None) -> float:
    """Calculates the theoretical prime target weight directly as bodyweight * factor_biomecanico."""
    bw = max(30.0, float(bodyweight or 75.0))
    multiplier = get_exercise_prime_multiplier(exercise_name)
    target = round(bw * multiplier * 2.0) / 2.0
    return target


def calculate_relative_league(current_weight: float | None, bodyweight: float):
    """Calculates relative strength league and next tier target based on load / bodyweight ratio."""
    bw = max(30.0, float(bodyweight or 75.0))
    w = max(0.0, float(current_weight or 0.0))
    ratio = round(w / bw, 2)

    # 🥉 Liga Bronce: < 0.9x peso corporal
    # 🥈 Liga Plata: 0.9x a 1.2x peso corporal
    # 🥇 Liga Oro: 1.2x a 1.5x peso corporal
    # 💎 Liga Diamante: 1.5x a 1.8x peso corporal
    # 👑 Liga Prime (Élite Natural): > 1.8x peso corporal
    if ratio < 0.9:
        league_id = "bronce"
        league_name = "Liga Bronce"
        league_icon = "🥉"
        league_color = "#CD7F32"
        next_league_name = "Liga Plata"
        next_target = round(0.9 * bw * 2.0) / 2.0
        kg_to_next = max(0.5, round((next_target - w) * 10.0) / 10.0)
        progress_pct = min(100.0, max(0.0, round((ratio / 0.9) * 100.0, 1)))
    elif ratio < 1.2:
        league_id = "plata"
        league_name = "Liga Plata"
        league_icon = "🥈"
        league_color = "#CBD5E1"
        next_league_name = "Liga Oro"
        next_target = round(1.2 * bw * 2.0) / 2.0
        kg_to_next = max(0.5, round((next_target - w) * 10.0) / 10.0)
        span = 1.2 - 0.9
        progress_pct = min(100.0, max(0.0, round(((ratio - 0.9) / span) * 100.0, 1)))
    elif ratio < 1.5:
        league_id = "oro"
        league_name = "Liga Oro"
        league_icon = "🥇"
        league_color = "#F59E0B"
        next_league_name = "Liga Diamante"
        next_target = round(1.5 * bw * 2.0) / 2.0
        kg_to_next = max(0.5, round((next_target - w) * 10.0) / 10.0)
        span = 1.5 - 1.2
        progress_pct = min(100.0, max(0.0, round(((ratio - 1.2) / span) * 100.0, 1)))
    elif ratio < 1.8:
        league_id = "diamante"
        league_name = "Liga Diamante"
        league_icon = "💎"
        league_color = "#38BDF8"
        next_league_name = "Liga Prime"
        next_target = round(1.8 * bw * 2.0) / 2.0
        kg_to_next = max(0.5, round((next_target - w) * 10.0) / 10.0)
        span = 1.8 - 1.5
        progress_pct = min(100.0, max(0.0, round(((ratio - 1.5) / span) * 100.0, 1)))
    else:
        league_id = "prime"
        league_name = "Liga Prime (Élite Natural)"
        league_icon = "👑"
        league_color = "#A855F7"
        next_league_name = None
        next_target = None
        kg_to_next = 0.0
        progress_pct = 100.0

    return {
        "relative_ratio": ratio,
        "league_id": league_id,
        "league_name": league_name,
        "league_icon": league_icon,
        "league_color": league_color,
        "next_league_name": next_league_name,
        "next_league_target_kg": next_target,
        "kg_to_next_league": kg_to_next,
        "league_progress_pct": progress_pct,
    }


def compute_user_records(
    db: Session,
    current_user: models.User,
    exercise_id: int | None = None,
    muscle_group_id: int | None = None,
) -> list[schemas.RecordOut]:
    """Computes PRs and last session progression for user exercises.
    Returns clean, simplified RecordOut structure filtered by current_user.id.
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
            models.WorkoutSet.is_valid != False,
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
            models.WorkoutSet.is_valid != False,
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

    records: list[schemas.RecordOut] = []
    for ex in exercises:
        ex_sets = grouped_sets.get(ex.id, [])
        if not ex_sets:
            continue

        # Exclude warmup sets from records
        valid_non_warmup = [s for s in ex_sets if getattr(s, "set_type", "normal") not in ("warmup", "W")]
        if not valid_non_warmup:
            continue

        valid_completed = [s for s in valid_non_warmup if s.completed and (s.weight > 0 or s.reps > 0)]
        valid_sets = valid_completed if valid_completed else [s for s in valid_non_warmup if (s.weight > 0 or s.reps > 0)]

        if not valid_sets:
            continue

        # Best Personal Record (PR) across all valid sets
        best_pr_set = max(valid_sets, key=lambda s: (float(s.weight or 0), int(s.reps or 0)))
        pr_weight = float(best_pr_set.weight or 0)
        pr_reps = int(best_pr_set.reps or 0)

        # Group chronologically by session
        sessions_map = {}
        for s in valid_sets:
            if s.session_id not in sessions_map:
                sessions_map[s.session_id] = {
                    "date": s.date,
                    "sets": [],
                }
            sessions_map[s.session_id]["sets"].append(s)

        sessions_list = list(sessions_map.values())
        if not sessions_list:
            continue

        latest_session = sessions_list[-1]
        best_last_set = max(
            latest_session["sets"],
            key=lambda s: (float(s.weight or 0), int(s.reps or 0)),
        )
        last_weight = float(best_last_set.weight or 0)
        last_reps = int(best_last_set.reps or 0)
        last_date = latest_session["date"]

        improved = False
        diff_weight = 0.0

        if len(sessions_list) >= 2:
            prev_session = sessions_list[-2]
            best_prev_set = max(
                prev_session["sets"],
                key=lambda s: (float(s.weight or 0), int(s.reps or 0)),
            )
            prev_weight = float(best_prev_set.weight or 0)
            prev_reps = int(best_prev_set.reps or 0)

            diff = round(last_weight - prev_weight, 1)
            if diff > 0:
                improved = True
                diff_weight = diff
            elif diff == 0 and last_reps > prev_reps:
                improved = True
                diff_weight = 0.0
            else:
                improved = False
                diff_weight = diff if diff < 0 else 0.0

        muscle_name = ex.muscle_group.name if ex.muscle_group else ""

        records.append(
            schemas.RecordOut(
                exercise_id=ex.id,
                exercise_name=ex.name,
                muscle_group=muscle_name,
                pr_weight=pr_weight,
                pr_reps=pr_reps,
                last_weight=last_weight,
                last_reps=last_reps,
                last_date=last_date,
                improved=improved,
                diff_weight=diff_weight,
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
