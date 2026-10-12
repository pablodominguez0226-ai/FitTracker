import datetime as dt
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter()

FREQUENCY_DAYS = {
    "weekly": 7,
    "biweekly": 14,
    "monthly": 30,
}


@router.get("", response_model=list[schemas.CheckInHistoryItem])
def get_checkins(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Obtiene el historial de check-ins del usuario con la variación neta
    (+/- kg y +/- cm) calculada entre cada registro consecutivo.
    """
    # Obtenemos en orden cronológico ascendente para calcular diferencias
    records = (
        db.query(models.CheckIn)
        .filter(models.CheckIn.user_id == current_user.id)
        .order_by(asc(models.CheckIn.date), asc(models.CheckIn.id))
        .all()
    )

    items: list[schemas.CheckInHistoryItem] = []
    prev_item: models.CheckIn | None = None

    for r in records:
        w_diff = round(r.weight - prev_item.weight, 2) if prev_item and prev_item.weight else None
        waist_diff = (
            round(r.waist - prev_item.waist, 2)
            if prev_item and prev_item.waist is not None and r.waist is not None
            else None
        )
        arm_diff = (
            round(r.arm - prev_item.arm, 2)
            if prev_item and prev_item.arm is not None and r.arm is not None
            else None
        )

        item = schemas.CheckInHistoryItem(
            id=r.id,
            date=r.date,
            frequency=r.frequency,
            weight=r.weight,
            weight_diff=w_diff,
            waist=r.waist,
            waist_diff=waist_diff,
            arm=r.arm,
            arm_diff=arm_diff,
            strength_feeling=r.strength_feeling,
            notes=r.notes,
            created_at=r.created_at,
        )
        items.append(item)
        prev_item = r

    # Devolvemos invertido (más reciente primero para la UI tabular)
    items.reverse()
    return items


@router.post("", response_model=schemas.CheckInOut, status_code=status.HTTP_201_CREATED)
def create_checkin(
    payload: schemas.CheckInCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Registra un nuevo check-in periódico y sincroniza el peso corporal en el perfil."""
    freq = payload.frequency if payload.frequency in FREQUENCY_DAYS else "weekly"

    checkin = models.CheckIn(
        user_id=current_user.id,
        date=payload.date,
        frequency=freq,
        weight=round(payload.weight, 2),
        waist=round(payload.waist, 2) if payload.waist is not None else None,
        arm=round(payload.arm, 2) if payload.arm is not None else None,
        strength_feeling=payload.strength_feeling,
        notes=payload.notes,
        created_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(checkin)

    # Actualizar biometría del usuario en tiempo real
    current_user.bodyweight = round(payload.weight, 2)
    current_user.checkin_frequency = freq
    if payload.waist is not None:
        current_user.waist_girth = round(payload.waist, 2)
    if payload.arm is not None:
        current_user.biceps_girth = round(payload.arm, 2)

    db.commit()
    db.refresh(checkin)
    return schemas.CheckInOut.model_validate(checkin)


@router.delete("/{checkin_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checkin(
    checkin_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Elimina un registro de check-in."""
    record = (
        db.query(models.CheckIn)
        .filter(models.CheckIn.id == checkin_id, models.CheckIn.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Check-in no encontrado.")
    db.delete(record)
    db.commit()
    return None


class FrequencyUpdate(BaseModel):
    frequency: str = Field(..., description="'weekly', 'biweekly', 'monthly'")


@router.post("/frequency", response_model=schemas.CheckInStatusOut)
def update_frequency(
    payload: FrequencyUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Actualiza la frecuencia programada para los check-ins."""
    freq = payload.frequency.lower()
    if freq not in FREQUENCY_DAYS:
        freq = "weekly"

    current_user.checkin_frequency = freq
    db.commit()

    return get_checkin_status(db=db, current_user=current_user)


@router.get("/status", response_model=schemas.CheckInStatusOut)
def get_checkin_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Verifica si corresponde realizar un check-in según la frecuencia configurada."""
    freq = current_user.checkin_frequency or "weekly"
    interval = FREQUENCY_DAYS.get(freq, 7)

    latest = (
        db.query(models.CheckIn)
        .filter(models.CheckIn.user_id == current_user.id)
        .order_by(desc(models.CheckIn.date), desc(models.CheckIn.id))
        .first()
    )

    today = dt.date.today()
    if not latest:
        return schemas.CheckInStatusOut(
            frequency=freq,
            days_interval=interval,
            last_checkin_date=None,
            days_since_last=None,
            is_due=True,
            next_due_date=today,
        )

    days_since = (today - latest.date).days
    next_due = latest.date + dt.timedelta(days=interval)
    is_due = days_since >= interval or today >= next_due

    return schemas.CheckInStatusOut(
        frequency=freq,
        days_interval=interval,
        last_checkin_date=latest.date,
        days_since_last=days_since,
        is_due=is_due,
        next_due_date=next_due,
    )
