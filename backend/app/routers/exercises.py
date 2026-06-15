from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter()


@router.get("", response_model=list[schemas.ExerciseOut])
def list_exercises(db: Session = Depends(get_db)):
    return db.query(models.Exercise).order_by(models.Exercise.is_global.desc(), models.Exercise.name.asc()).all()


@router.post("", response_model=schemas.ExerciseOut)
def create_exercise(payload: schemas.ExerciseCreate, db: Session = Depends(get_db)):
    exercise = models.Exercise(**payload.model_dump(), is_global=False)
    db.add(exercise)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Exercise name already exists") from exc
    db.refresh(exercise)
    return exercise


@router.get("/{exercise_id}", response_model=schemas.ExerciseOut)
def get_exercise(exercise_id: int, db: Session = Depends(get_db)):
    exercise = db.get(models.Exercise, exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise


@router.put("/{exercise_id}", response_model=schemas.ExerciseOut)
def update_exercise(exercise_id: int, payload: schemas.ExerciseUpdate, db: Session = Depends(get_db)):
    exercise = db.get(models.Exercise, exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    if exercise.is_global:
        raise HTTPException(status_code=403, detail="Global exercises are protected")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(exercise, key, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Exercise name already exists") from exc
    db.refresh(exercise)
    return exercise


@router.delete("/{exercise_id}")
def delete_exercise(exercise_id: int, db: Session = Depends(get_db)):
    exercise = db.get(models.Exercise, exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    if exercise.is_global:
        raise HTTPException(status_code=403, detail="Global exercises are protected")
    has_workouts = db.query(models.WorkoutEntry).filter(models.WorkoutEntry.exercise_id == exercise_id).first()
    has_routines = db.query(models.RoutineExercise).filter(models.RoutineExercise.exercise_id == exercise_id).first()
    has_records = db.query(models.PersonalRecord).filter(models.PersonalRecord.exercise_id == exercise_id).first()
    if has_workouts or has_routines or has_records:
        raise HTTPException(status_code=409, detail="Exercise is in use and cannot be deleted")
    db.delete(exercise)
    db.commit()
    return {"deleted": True}
