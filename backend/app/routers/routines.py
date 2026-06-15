from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter()


def sync_routine_exercises(db: Session, routine: models.Routine, exercise_ids: list[int]) -> None:
    if len(exercise_ids) != len(set(exercise_ids)):
        raise HTTPException(status_code=400, detail="Routine exercises cannot be duplicated")

    routine.exercises.clear()
    db.flush()
    for index, exercise_id in enumerate(exercise_ids, start=1):
        if not db.get(models.Exercise, exercise_id):
            raise HTTPException(status_code=404, detail=f"Exercise {exercise_id} not found")
        routine.exercises.append(models.RoutineExercise(exercise_id=exercise_id, position=index))


@router.get("", response_model=list[schemas.RoutineOut])
def list_routines(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return (
        db.query(models.Routine)
        .options(selectinload(models.Routine.exercises).selectinload(models.RoutineExercise.exercise))
        .filter(models.Routine.user_id == current_user.id)
        .order_by(models.Routine.id.asc())
        .all()
    )


@router.post("", response_model=schemas.RoutineOut)
def create_routine(payload: schemas.RoutineCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    routine = models.Routine(name=payload.name, days=payload.days, user_id=current_user.id)
    db.add(routine)
    db.flush()
    sync_routine_exercises(db, routine, payload.exercise_ids)
    db.commit()
    db.refresh(routine)
    return routine


@router.get("/{routine_id}", response_model=schemas.RoutineOut)
def get_routine(routine_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    routine = (
        db.query(models.Routine)
        .options(selectinload(models.Routine.exercises).selectinload(models.RoutineExercise.exercise))
        .filter(models.Routine.id == routine_id, models.Routine.user_id == current_user.id)
        .first()
    )
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    return routine


@router.put("/{routine_id}", response_model=schemas.RoutineOut)
def update_routine(routine_id: int, payload: schemas.RoutineUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    routine = db.query(models.Routine).filter(models.Routine.id == routine_id, models.Routine.user_id == current_user.id).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        routine.name = data["name"]
    if "days" in data:
        routine.days = data["days"]
    if "exercise_ids" in data and data["exercise_ids"] is not None:
        sync_routine_exercises(db, routine, data["exercise_ids"])
    db.commit()
    db.refresh(routine)
    return routine


@router.delete("/{routine_id}")
def delete_routine(routine_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    routine = db.query(models.Routine).filter(models.Routine.id == routine_id, models.Routine.user_id == current_user.id).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    db.delete(routine)
    db.commit()
    return {"deleted": True}
