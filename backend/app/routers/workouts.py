import datetime as dt
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, selectinload

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter()


def _format_workout_session(s: models.WorkoutSession) -> schemas.WorkoutSessionOut:
    sets_out = [
        schemas.WorkoutSetOut(
            id=ws.id,
            workout_session_id=ws.workout_session_id,
            exercise_id=ws.exercise_id,
            exercise_name=ws.exercise.name if ws.exercise else None,
            set_number=ws.set_number,
            weight=ws.weight,
            reps=ws.reps,
            completed=ws.completed,
            rest_effort=ws.rest_effort,
            created_at=ws.created_at,
        )
        for ws in s.sets
    ]
    return schemas.WorkoutSessionOut(
        id=s.id,
        user_id=s.user_id,
        date=s.date,
        status=s.status,
        started_at=s.started_at,
        completed_at=s.completed_at,
        readiness_energy=s.readiness_energy,
        readiness_motivation=s.readiness_motivation,
        mental_effort=s.mental_effort,
        sport_type=s.sport_type or "strength",
        distance_km=s.distance_km,
        duration_minutes=s.duration_minutes,
        pace_min_per_km=s.pace_min_per_km,
        calories_burned=s.calories_burned,
        muscle_group_id=s.muscle_group_id,
        muscle_group_name=s.muscle_group.name if s.muscle_group else None,
        notes=s.notes,
        sets=sets_out,
    )


@router.get("", response_model=list[schemas.WorkoutSessionOut])
def list_workouts(
    status: str | None = Query(None, description="Filtrar por estado ('completed', 'in_progress')"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        db.query(models.WorkoutSession)
        .options(
            joinedload(models.WorkoutSession.muscle_group),
            selectinload(models.WorkoutSession.sets).joinedload(models.WorkoutSet.exercise),
        )
        .filter(models.WorkoutSession.user_id == current_user.id)
    )
    if status:
        query = query.filter(models.WorkoutSession.status == status)

    sessions = query.order_by(models.WorkoutSession.date.desc(), models.WorkoutSession.id.desc()).all()
    return [_format_workout_session(s) for s in sessions]


@router.get("/active", response_model=schemas.WorkoutSessionOut | None)
def get_active_workout(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = (
        db.query(models.WorkoutSession)
        .options(
            joinedload(models.WorkoutSession.muscle_group),
            selectinload(models.WorkoutSession.sets).joinedload(models.WorkoutSet.exercise),
        )
        .filter(
            models.WorkoutSession.user_id == current_user.id,
            models.WorkoutSession.status == "in_progress",
        )
        .order_by(models.WorkoutSession.id.desc())
        .first()
    )
    if not session:
        return None
    return _format_workout_session(session)


@router.post("/start", response_model=schemas.WorkoutSessionOut)
def start_workout(
    payload: schemas.WorkoutSessionStart,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    active = (
        db.query(models.WorkoutSession)
        .options(
            joinedload(models.WorkoutSession.muscle_group),
            selectinload(models.WorkoutSession.sets).joinedload(models.WorkoutSet.exercise),
        )
        .filter(
            models.WorkoutSession.user_id == current_user.id,
            models.WorkoutSession.status == "in_progress",
        )
        .order_by(models.WorkoutSession.id.desc())
        .first()
    )
    if active:
        if payload.date is not None:
            active.date = payload.date
        if payload.muscle_group_id and not active.muscle_group_id:
            active.muscle_group_id = payload.muscle_group_id
        if payload.readiness_energy is not None:
            active.readiness_energy = payload.readiness_energy
        if payload.readiness_motivation is not None:
            active.readiness_motivation = payload.readiness_motivation
        if payload.sport_type is not None:
            active.sport_type = payload.sport_type
        if payload.distance_km is not None:
            active.distance_km = payload.distance_km
        if payload.duration_minutes is not None:
            active.duration_minutes = payload.duration_minutes
        if payload.pace_min_per_km is not None:
            active.pace_min_per_km = payload.pace_min_per_km
        if payload.calories_burned is not None:
            active.calories_burned = payload.calories_burned
        db.commit()
        db.refresh(active)
        return _format_workout_session(active)

    session = models.WorkoutSession(
        user_id=current_user.id,
        date=payload.date or dt.date.today(),
        muscle_group_id=payload.muscle_group_id,
        notes=payload.notes.strip() if payload.notes else None,
        status="in_progress",
        started_at=dt.datetime.now(dt.timezone.utc),
        readiness_energy=payload.readiness_energy,
        readiness_motivation=payload.readiness_motivation,
        sport_type=payload.sport_type or "strength",
        distance_km=payload.distance_km,
        duration_minutes=payload.duration_minutes,
        pace_min_per_km=payload.pace_min_per_km,
        calories_burned=payload.calories_burned,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    saved = (
        db.query(models.WorkoutSession)
        .options(
            joinedload(models.WorkoutSession.muscle_group),
            selectinload(models.WorkoutSession.sets).joinedload(models.WorkoutSet.exercise),
        )
        .filter(models.WorkoutSession.id == session.id)
        .first()
    )
    return _format_workout_session(saved)


@router.post("/{workout_id}/sets", response_model=schemas.WorkoutSetOut)
def add_workout_set(
    workout_id: int,
    payload: schemas.WorkoutSetCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.get(models.WorkoutSession, workout_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión de entrenamiento no encontrada.")
    if session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tenés permiso para modificar esta sesión.")

    exercise = db.get(models.Exercise, payload.exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")

    if payload.set_number <= 1:
        existing_count = (
            db.query(models.WorkoutSet)
            .filter(
                models.WorkoutSet.workout_session_id == workout_id,
                models.WorkoutSet.exercise_id == payload.exercise_id,
            )
            .count()
        )
        set_number = existing_count + 1
    else:
        set_number = payload.set_number

    workout_set = models.WorkoutSet(
        workout_session_id=workout_id,
        exercise_id=payload.exercise_id,
        set_number=set_number,
        weight=float(payload.weight),
        reps=int(payload.reps),
        completed=bool(payload.completed),
        rest_effort=payload.rest_effort,
        created_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(workout_set)
    db.commit()
    db.refresh(workout_set)

    return schemas.WorkoutSetOut(
        id=workout_set.id,
        workout_session_id=workout_set.workout_session_id,
        exercise_id=workout_set.exercise_id,
        exercise_name=exercise.name,
        set_number=workout_set.set_number,
        weight=workout_set.weight,
        reps=workout_set.reps,
        completed=workout_set.completed,
        rest_effort=workout_set.rest_effort,
        created_at=workout_set.created_at,
    )


@router.patch("/sets/{set_id}", response_model=schemas.WorkoutSetOut)
def update_workout_set(
    set_id: int,
    payload: schemas.WorkoutSetUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    workout_set = (
        db.query(models.WorkoutSet)
        .options(
            joinedload(models.WorkoutSet.exercise),
            joinedload(models.WorkoutSet.session),
        )
        .filter(models.WorkoutSet.id == set_id)
        .first()
    )
    if not workout_set:
        raise HTTPException(status_code=404, detail="Serie no encontrada.")

    if workout_set.session and workout_set.session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tenés permiso para modificar esta serie.")

    if payload.weight is not None:
        workout_set.weight = float(payload.weight)
    if payload.reps is not None:
        workout_set.reps = int(payload.reps)
    if payload.completed is not None:
        workout_set.completed = bool(payload.completed)
    if payload.set_number is not None:
        workout_set.set_number = int(payload.set_number)
    if payload.rest_effort is not None:
        workout_set.rest_effort = payload.rest_effort

    db.commit()
    db.refresh(workout_set)

    return schemas.WorkoutSetOut(
        id=workout_set.id,
        workout_session_id=workout_set.workout_session_id,
        exercise_id=workout_set.exercise_id,
        exercise_name=workout_set.exercise.name if workout_set.exercise else None,
        set_number=workout_set.set_number,
        weight=workout_set.weight,
        reps=workout_set.reps,
        completed=workout_set.completed,
        rest_effort=workout_set.rest_effort,
        created_at=workout_set.created_at,
    )


@router.delete("/sets/{set_id}")
def delete_workout_set(
    set_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    workout_set = (
        db.query(models.WorkoutSet)
        .options(joinedload(models.WorkoutSet.session))
        .filter(models.WorkoutSet.id == set_id)
        .first()
    )
    if not workout_set:
        raise HTTPException(status_code=404, detail="Serie no encontrada.")

    if workout_set.session and workout_set.session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tenés permiso para eliminar esta serie.")

    db.delete(workout_set)
    db.commit()
    return {"deleted": True, "id": set_id}


@router.post("/{workout_id}/finish", response_model=schemas.WorkoutSessionOut)
def finish_workout(
    workout_id: int,
    payload: schemas.WorkoutSessionFinish,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = (
        db.query(models.WorkoutSession)
        .options(
            joinedload(models.WorkoutSession.muscle_group),
            selectinload(models.WorkoutSession.sets).joinedload(models.WorkoutSet.exercise),
        )
        .filter(models.WorkoutSession.id == workout_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada.")
    if session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tenés permiso para finalizar esta sesión.")

    session.status = "completed"
    session.completed_at = payload.completed_at or dt.datetime.now(dt.timezone.utc)
    if payload.date is not None:
        session.date = payload.date
    if payload.notes is not None:
        session.notes = payload.notes.strip() or None
    if payload.mental_effort is not None:
        session.mental_effort = payload.mental_effort
    if payload.readiness_energy is not None:
        session.readiness_energy = payload.readiness_energy
    if payload.readiness_motivation is not None:
        session.readiness_motivation = payload.readiness_motivation
    if payload.sport_type is not None:
        session.sport_type = payload.sport_type
    if payload.distance_km is not None:
        session.distance_km = payload.distance_km
    if payload.duration_minutes is not None:
        session.duration_minutes = payload.duration_minutes
    if payload.pace_min_per_km is not None:
        session.pace_min_per_km = payload.pace_min_per_km
    if payload.calories_burned is not None:
        session.calories_burned = payload.calories_burned

    db.commit()
    db.refresh(session)
    return _format_workout_session(session)


@router.patch("/{workout_id}/date", response_model=schemas.WorkoutSessionOut)
def update_workout_date(
    workout_id: int,
    payload: schemas.WorkoutSessionDateUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = (
        db.query(models.WorkoutSession)
        .options(
            joinedload(models.WorkoutSession.muscle_group),
            selectinload(models.WorkoutSession.sets).joinedload(models.WorkoutSet.exercise),
        )
        .filter(models.WorkoutSession.id == workout_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada.")
    if session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tenés permiso para modificar esta sesión.")

    session.date = payload.date
    db.commit()
    db.refresh(session)
    return _format_workout_session(session)


@router.patch("/{workout_id}/readiness", response_model=schemas.WorkoutSessionOut)
def update_workout_readiness(
    workout_id: int,
    payload: schemas.WorkoutSessionReadinessUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = (
        db.query(models.WorkoutSession)
        .options(
            joinedload(models.WorkoutSession.muscle_group),
            selectinload(models.WorkoutSession.sets).joinedload(models.WorkoutSet.exercise),
        )
        .filter(models.WorkoutSession.id == workout_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada.")
    if session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tenés permiso para modificar esta sesión.")

    if payload.readiness_energy is not None:
        session.readiness_energy = payload.readiness_energy
    if payload.readiness_motivation is not None:
        session.readiness_motivation = payload.readiness_motivation
    if payload.mental_effort is not None:
        session.mental_effort = payload.mental_effort

    db.commit()
    db.refresh(session)
    return _format_workout_session(session)


@router.post("", response_model=schemas.WorkoutSessionOut)
def create_workout(
    payload: schemas.WorkoutCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.sets and payload.sport_type == "strength":
        raise HTTPException(status_code=400, detail="Registrá al menos una serie para guardar el entrenamiento.")

    session = models.WorkoutSession(
        user_id=current_user.id,
        date=payload.date or dt.date.today(),
        muscle_group_id=payload.muscle_group_id,
        notes=payload.notes.strip() if payload.notes else None,
        status="completed",
        started_at=dt.datetime.now(dt.timezone.utc),
        completed_at=dt.datetime.now(dt.timezone.utc),
        readiness_energy=payload.readiness_energy,
        readiness_motivation=payload.readiness_motivation,
        mental_effort=payload.mental_effort,
        sport_type=payload.sport_type or "strength",
        distance_km=payload.distance_km,
        duration_minutes=payload.duration_minutes,
        pace_min_per_km=payload.pace_min_per_km,
        calories_burned=payload.calories_burned,
    )
    db.add(session)
    db.flush()

    for item in payload.sets:
        exercise = db.get(models.Exercise, item.exercise_id)
        if not exercise:
            raise HTTPException(status_code=404, detail=f"Ejercicio ID {item.exercise_id} no encontrado.")

        workout_set = models.WorkoutSet(
            workout_session_id=session.id,
            exercise_id=item.exercise_id,
            set_number=item.set_number,
            weight=float(item.weight),
            reps=int(item.reps),
            completed=bool(item.completed),
            rest_effort=item.rest_effort,
            created_at=dt.datetime.now(dt.timezone.utc),
        )
        session.sets.append(workout_set)

    db.commit()
    db.refresh(session)

    saved = (
        db.query(models.WorkoutSession)
        .options(
            joinedload(models.WorkoutSession.muscle_group),
            selectinload(models.WorkoutSession.sets).joinedload(models.WorkoutSet.exercise),
        )
        .filter(models.WorkoutSession.id == session.id)
        .first()
    )
    return _format_workout_session(saved)


@router.get("/{workout_id}", response_model=schemas.WorkoutSessionOut)
def get_workout(
    workout_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    saved = (
        db.query(models.WorkoutSession)
        .options(
            joinedload(models.WorkoutSession.muscle_group),
            selectinload(models.WorkoutSession.sets).joinedload(models.WorkoutSet.exercise),
        )
        .filter(models.WorkoutSession.id == workout_id)
        .first()
    )
    if not saved:
        raise HTTPException(status_code=404, detail="Entrenamiento no encontrado.")
    if saved.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tenés permiso para ver esta sesión.")

    return _format_workout_session(saved)


@router.delete("/{workout_id}")
def delete_workout(
    workout_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.get(models.WorkoutSession, workout_id)
    if not session:
        raise HTTPException(status_code=404, detail="Entrenamiento no encontrado.")
    if session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tenés permiso para eliminar esta sesión.")

    db.delete(session)
    db.commit()
    return {"deleted": True}
