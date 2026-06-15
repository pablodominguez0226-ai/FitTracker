from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter()


@router.get("", response_model=list[schemas.PersonalRecordOut])
def list_records(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return (
        db.query(models.PersonalRecord)
        .options(selectinload(models.PersonalRecord.exercise))
        .filter(models.PersonalRecord.user_id == current_user.id)
        .order_by(models.PersonalRecord.achieved_at.desc())
        .all()
    )


@router.get("/{record_id}", response_model=schemas.PersonalRecordOut)
def get_record(record_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    record = db.query(models.PersonalRecord).filter(models.PersonalRecord.id == record_id, models.PersonalRecord.user_id == current_user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.delete("/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    record = db.query(models.PersonalRecord).filter(models.PersonalRecord.id == record_id, models.PersonalRecord.user_id == current_user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
    return {"deleted": True}
