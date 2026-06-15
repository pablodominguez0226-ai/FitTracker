from collections import defaultdict
from datetime import date

from sqlalchemy.orm import Session

from . import models


def calculate_suggestions(entries: list[models.WorkoutEntry]) -> dict[int, tuple[float, str]]:
    grouped: dict[int, list[models.WorkoutEntry]] = defaultdict(list)
    for entry in entries:
        grouped[entry.exercise_id].append(entry)

    suggestions: dict[int, tuple[float, str]] = {}
    for exercise_id, sets in grouped.items():
        exercise = sets[0].exercise
        last_weight = sets[-1].weight
        if all(item.reps >= exercise.max_reps for item in sets):
            suggestions[exercise_id] = (last_weight + 2.5, "Subir 2.5kg: todas las series llegaron al máximo")
        elif any(item.reps < exercise.min_reps for item in sets):
            suggestions[exercise_id] = (max(0, last_weight - 2.5), "Bajar 2.5kg: alguna serie quedó debajo del rango")
        else:
            suggestions[exercise_id] = (last_weight, "Mantener peso: rendimiento dentro del rango")
    return suggestions


def upsert_personal_record(db: Session, user_id: int | None, exercise_id: int, record_type: str, value: float, weight: float, reps: int, achieved_at: date) -> None:
    record = (
        db.query(models.PersonalRecord)
        .filter(
            models.PersonalRecord.user_id == user_id,
            models.PersonalRecord.exercise_id == exercise_id,
            models.PersonalRecord.record_type == record_type,
        )
        .first()
    )
    if record is None:
        db.add(models.PersonalRecord(
            user_id=user_id, exercise_id=exercise_id, record_type=record_type, value=value, weight=weight, reps=reps, achieved_at=achieved_at
        ))
        db.flush()
        return
    if value > record.value:
        record.value = value
        record.weight = weight
        record.reps = reps
        record.achieved_at = achieved_at


def update_records_and_exercise_suggestions(db: Session, workout: models.Workout) -> None:
    suggestions = calculate_suggestions(workout.entries)
    record_candidates: dict[tuple[int, str], tuple[float, float, int]] = {}

    for entry in workout.entries:
        suggested_weight, reason = suggestions[entry.exercise_id]
        entry.suggestion_weight = suggested_weight
        entry.suggestion_reason = reason
        entry.exercise.last_suggested_weight = suggested_weight

        candidates = {
            "weight": entry.weight,
            "reps": float(entry.reps),
            "volume": entry.weight * entry.reps,
        }
        for record_type, value in candidates.items():
            key = (entry.exercise_id, record_type)
            current = record_candidates.get(key)
            if current is None or value > current[0]:
                record_candidates[key] = (value, entry.weight, entry.reps)

    for (exercise_id, record_type), (value, weight, reps) in record_candidates.items():
        upsert_personal_record(db, workout.user_id, exercise_id, record_type, value, weight, reps, workout.performed_at)