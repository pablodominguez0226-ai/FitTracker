from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter()


@router.get("", response_model=list[schemas.MeasurementOut])
def list_measurements(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Measurement).filter(models.Measurement.user_id == current_user.id).order_by(models.Measurement.measured_at.asc()).all()


@router.post("", response_model=schemas.MeasurementOut)
def create_measurement(payload: schemas.MeasurementCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    measurement = models.Measurement(**{**payload.model_dump(exclude={"measured_at"}), "measured_at": payload.measured_at or date.today(), "user_id": current_user.id})
    db.add(measurement)
    db.commit()
    db.refresh(measurement)
    return measurement


@router.get("/{measurement_id}", response_model=schemas.MeasurementOut)
def get_measurement(measurement_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    measurement = db.query(models.Measurement).filter(models.Measurement.id == measurement_id, models.Measurement.user_id == current_user.id).first()
    if not measurement:
        raise HTTPException(status_code=404, detail="Measurement not found")
    return measurement


@router.put("/{measurement_id}", response_model=schemas.MeasurementOut)
def update_measurement(measurement_id: int, payload: schemas.MeasurementCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    measurement = db.query(models.Measurement).filter(models.Measurement.id == measurement_id, models.Measurement.user_id == current_user.id).first()
    if not measurement:
        raise HTTPException(status_code=404, detail="Measurement not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "measured_at" and value is None:
            continue
        setattr(measurement, key, value)
    db.commit()
    db.refresh(measurement)
    return measurement


@router.delete("/{measurement_id}")
def delete_measurement(measurement_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    measurement = db.query(models.Measurement).filter(models.Measurement.id == measurement_id, models.Measurement.user_id == current_user.id).first()
    if not measurement:
        raise HTTPException(status_code=404, detail="Measurement not found")
    db.delete(measurement)
    db.commit()
    return {"deleted": True}
