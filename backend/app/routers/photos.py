from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import DATA_DIR, get_db
from ..security import get_current_user

router = APIRouter()
PHOTO_DIR = DATA_DIR / "photos"
PHOTO_DIR.mkdir(parents=True, exist_ok=True)
VALID_VIEWS = {"frente", "perfil", "espalda"}


@router.get("", response_model=list[schemas.PhotoOut])
def list_photos(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.ProgressPhoto).filter(models.ProgressPhoto.user_id == current_user.id).order_by(models.ProgressPhoto.taken_at.desc(), models.ProgressPhoto.view.asc()).all()


@router.post("", response_model=schemas.PhotoOut)
async def create_photo(
    view: str = Form(...),
    taken_at: date | None = Form(None),
    image: UploadFile | None = File(None),
    file_path: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    normalized_view = view.strip().lower()
    if normalized_view not in VALID_VIEWS:
        raise HTTPException(status_code=400, detail="View must be frente, perfil or espalda")

    stored_path = file_path
    if image is not None:
        suffix = Path(image.filename or "").suffix.lower() or ".jpg"
        filename = f"{uuid4().hex}{suffix}"
        target = PHOTO_DIR / filename
        target.write_bytes(await image.read())
        stored_path = f"/uploads/{filename}"
    if not stored_path:
        raise HTTPException(status_code=400, detail="image or file_path is required")

    photo = models.ProgressPhoto(user_id=current_user.id, taken_at=taken_at or date.today(), view=normalized_view, file_path=stored_path)
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.get("/{photo_id}", response_model=schemas.PhotoOut)
def get_photo(photo_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    photo = db.query(models.ProgressPhoto).filter(models.ProgressPhoto.id == photo_id, models.ProgressPhoto.user_id == current_user.id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return photo


@router.put("/{photo_id}", response_model=schemas.PhotoOut)
def update_photo(photo_id: int, payload: schemas.PhotoCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    photo = db.query(models.ProgressPhoto).filter(models.ProgressPhoto.id == photo_id, models.ProgressPhoto.user_id == current_user.id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    photo.taken_at = payload.taken_at or photo.taken_at
    photo.view = payload.view
    photo.file_path = payload.file_path
    db.commit()
    db.refresh(photo)
    return photo


@router.delete("/{photo_id}")
def delete_photo(photo_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    photo = db.query(models.ProgressPhoto).filter(models.ProgressPhoto.id == photo_id, models.ProgressPhoto.user_id == current_user.id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    db.delete(photo)
    db.commit()
    return {"deleted": True}
