from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user
from ..services import update_records_and_exercise_suggestions

router = APIRouter()


@router.get("", response_model=list[schemas.WorkoutOut])
def list_workouts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return (
        db.query(models.Workout)
        .options(selectinload(models.Workout.entries).selectinload(models.WorkoutEntry.exercise))
        .filter(models.Workout.user_id == current_user.id)
        .order_by(models.Workout.performed_at.desc(), models.Workout.id.desc())
        .all()
    )


@router.post("", response_model=schemas.WorkoutOut)
def create_workout(payload: schemas.WorkoutCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not payload.entries:
        raise HTTPException(status_code=400, detail="Cargá al menos una serie con peso y repeticiones.")
    if payload.routine_id and not db.query(models.Routine).filter(models.Routine.id == payload.routine_id, models.Routine.user_id == current_user.id).first():
        raise HTTPException(status_code=404, detail="Routine not found")
    workout = models.Workout(user_id=current_user.id, routine_id=payload.routine_id, performed_at=payload.performed_at or date.today(), notes=payload.notes)
    db.add(workout)
    db.flush()
    for item in payload.entries:
        exercise = db.get(models.Exercise, item.exercise_id)
        if not exercise:
            raise HTTPException(status_code=404, detail=f"Exercise {item.exercise_id} not found")
        workout.entries.append(models.WorkoutEntry(**item.model_dump()))
    db.flush()
    update_records_and_exercise_suggestions(db, workout)
    db.commit()
    db.refresh(workout)
    return workout


@router.get("/{workout_id}", response_model=schemas.WorkoutOut)
def get_workout(workout_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    workout = (
        db.query(models.Workout)
        .options(selectinload(models.Workout.entries).selectinload(models.WorkoutEntry.exercise))
        .filter(models.Workout.id == workout_id, models.Workout.user_id == current_user.id)
        .first()
    )
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout


@router.put("/{workout_id}", response_model=schemas.WorkoutOut)
def update_workout(workout_id: int, payload: schemas.WorkoutCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not payload.entries:
        raise HTTPException(status_code=400, detail="Cargá al menos una serie con peso y repeticiones.")
    workout = db.query(models.Workout).filter(models.Workout.id == workout_id, models.Workout.user_id == current_user.id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    if payload.routine_id and not db.query(models.Routine).filter(models.Routine.id == payload.routine_id, models.Routine.user_id == current_user.id).first():
        raise HTTPException(status_code=404, detail="Routine not found")
    workout.routine_id = payload.routine_id
    workout.performed_at = payload.performed_at or workout.performed_at
    workout.notes = payload.notes
    workout.entries.clear()
    db.flush()
    for item in payload.entries:
        if not db.get(models.Exercise, item.exercise_id):
            raise HTTPException(status_code=404, detail=f"Exercise {item.exercise_id} not found")
        workout.entries.append(models.WorkoutEntry(**item.model_dump()))
    db.flush()
    update_records_and_exercise_suggestions(db, workout)
    db.commit()
    db.refresh(workout)
    return workout


@router.delete("/{workout_id}")
def delete_workout(workout_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    workout = db.query(models.Workout).filter(models.Workout.id == workout_id, models.Workout.user_id == current_user.id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    db.delete(workout)
    db.commit()
    return {"deleted": True}
