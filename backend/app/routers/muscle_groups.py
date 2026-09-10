from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter()


@router.get("", response_model=list[schemas.MuscleGroupOut])
def list_muscle_groups(db: Session = Depends(get_db)):
    groups = db.query(models.MuscleGroup).order_by(models.MuscleGroup.id.asc()).all()
    # compute active exercise counts
    counts = dict(
        db.query(models.Exercise.muscle_group_id, func.count(models.Exercise.id))
        .filter(models.Exercise.is_active == True)
        .group_by(models.Exercise.muscle_group_id)
        .all()
    )
    result = []
    for g in groups:
        result.append(
            schemas.MuscleGroupOut(
                id=g.id,
                name=g.name,
                exercise_count=counts.get(g.id, 0),
            )
        )
    return result


@router.post("", response_model=schemas.MuscleGroupOut)
def create_muscle_group(payload: schemas.MuscleGroupCreate, db: Session = Depends(get_db)):
    clean_name = payload.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="El nombre no puede estar vacío.")

    existing = db.query(models.MuscleGroup).filter(func.lower(models.MuscleGroup.name) == clean_name.lower()).first()
    if existing:
        count = db.query(func.count(models.Exercise.id)).filter(models.Exercise.muscle_group_id == existing.id, models.Exercise.is_active == True).scalar() or 0
        return schemas.MuscleGroupOut(id=existing.id, name=existing.name, exercise_count=count)

    new_group = models.MuscleGroup(name=clean_name)
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    return schemas.MuscleGroupOut(id=new_group.id, name=new_group.name, exercise_count=0)


@router.put("/{group_id}", response_model=schemas.MuscleGroupOut)
def update_muscle_group(
    group_id: int, payload: schemas.MuscleGroupCreate, db: Session = Depends(get_db)
):
    group = db.get(models.MuscleGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo muscular no encontrado.")

    clean_name = payload.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="El nombre no puede estar vacío.")

    existing = (
        db.query(models.MuscleGroup)
        .filter(
            func.lower(models.MuscleGroup.name) == clean_name.lower(),
            models.MuscleGroup.id != group_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe otro grupo muscular con ese nombre.")

    group.name = clean_name
    db.commit()
    db.refresh(group)

    count = (
        db.query(func.count(models.Exercise.id))
        .filter(models.Exercise.muscle_group_id == group.id)
        .scalar()
        or 0
    )
    return schemas.MuscleGroupOut(id=group.id, name=group.name, exercise_count=count)


@router.delete("/{group_id}")
def delete_muscle_group(
    group_id: int,
    force: bool = False,
    db: Session = Depends(get_db),
):
    group = db.get(models.MuscleGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo muscular no encontrado.")

    # Check dependencies
    exercise_count = (
        db.query(func.count(models.Exercise.id))
        .filter(models.Exercise.muscle_group_id == group_id)
        .scalar()
        or 0
    )
    session_count = (
        db.query(func.count(models.WorkoutSession.id))
        .filter(models.WorkoutSession.muscle_group_id == group_id)
        .scalar()
        or 0
    )

    if (exercise_count > 0 or session_count > 0) and not force:
        raise HTTPException(
            status_code=409,
            detail={
                "message": f"El grupo '{group.name}' tiene {exercise_count} ejercicios y {session_count} sesiones asociadas. Se requiere confirmación para eliminarlo en cascada.",
                "exercise_count": exercise_count,
                "session_count": session_count,
                "requires_confirmation": True,
            },
        )

    # Controlled cascade delete:
    # 1. Unlink workout sessions (set muscle_group_id = NULL) to keep workout history intact
    db.query(models.WorkoutSession).filter(
        models.WorkoutSession.muscle_group_id == group_id
    ).update({models.WorkoutSession.muscle_group_id: None}, synchronize_session=False)

    # 2. For exercises belonging to this group, delete their sets and then the exercises
    exercises = db.query(models.Exercise).filter(models.Exercise.muscle_group_id == group_id).all()
    ex_ids = [ex.id for ex in exercises]
    if ex_ids:
        db.query(models.WorkoutSet).filter(
            models.WorkoutSet.exercise_id.in_(ex_ids)
        ).delete(synchronize_session=False)
        db.query(models.Exercise).filter(
            models.Exercise.id.in_(ex_ids)
        ).delete(synchronize_session=False)

    # 3. Delete the muscle group
    db.delete(group)
    db.commit()

    return {
        "deleted": True,
        "message": f"Grupo muscular '{group.name}' eliminado exitosamente.",
        "exercises_deleted": exercise_count,
    }
