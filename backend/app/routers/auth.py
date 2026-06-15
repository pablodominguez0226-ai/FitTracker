from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import assign_legacy_data_to_first_user, get_db
from ..security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter()


def validate_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")
    if len(password) > 256:
        raise HTTPException(status_code=400, detail="La contraseña no puede superar los 256 caracteres")


def normalize_username(username: str) -> str:
    normalized = username.strip().lower()
    if len(normalized) < 3:
        raise HTTPException(status_code=400, detail="El usuario debe tener al menos 3 caracteres")
    return normalized


@router.post("/register", response_model=schemas.TokenOut)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    username = normalize_username(payload.username)
    validate_password(payload.password)

    user = models.User(
        username=username,
        email=payload.email.strip().lower() if payload.email else None,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="El usuario ya existe") from exc

    db.refresh(user)
    if db.query(models.User).count() == 1:
        assign_legacy_data_to_first_user()
        db.refresh(user)
    token = create_access_token({"sub": user.username})
    return schemas.TokenOut(access_token=token, user=user)


@router.post("/login", response_model=schemas.TokenOut)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    username = normalize_username(payload.username)
    validate_password(payload.password)
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario o contraseña incorrectos")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")

    token = create_access_token({"sub": user.username})
    return schemas.TokenOut(access_token=token, user=user)


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user
