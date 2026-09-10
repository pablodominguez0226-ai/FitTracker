import datetime as dt
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import (
    create_access_token,
    get_current_user,
    get_optional_current_user,
    hash_password,
    verify_password,
)

router = APIRouter()


def normalize_username(username: str) -> str:
    clean = username.strip().lower()
    if len(clean) < 3:
        raise HTTPException(
            status_code=400,
            detail="El nombre de usuario debe tener al menos 3 caracteres.",
        )
    if not re.match(r"^[a-z0-9_.-]+$", clean):
        raise HTTPException(
            status_code=400,
            detail="El usuario solo puede contener letras, números, guiones y puntos.",
        )
    return clean


def validate_password(password: str) -> None:
    if len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail="La contraseña debe tener al menos 6 caracteres.",
        )


@router.post("/register", response_model=schemas.TokenOut)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    username = normalize_username(payload.username)
    validate_password(payload.password)
    email = payload.email.strip().lower() if payload.email and payload.email.strip() else None

    # Check if username already exists
    existing = db.query(models.User).filter(models.User.username == username).first()
    if existing:
        if not existing.hashed_password:
            # Reclaim legacy unhashed user slot (e.g. default 'pablo' or 'atleta')
            existing.hashed_password = hash_password(payload.password)
            if email:
                existing.email = email
            existing.role = "admin"  # first reclaim is admin
            existing.updated_at = dt.datetime.now(dt.timezone.utc)
            db.commit()
            db.refresh(existing)
            token = create_access_token({"sub": existing.username})
            return schemas.TokenOut(access_token=token, user=existing)
        raise HTTPException(status_code=409, detail="El nombre de usuario ya está registrado.")

    # Determine role: If no user with a password or admin exists, this first user is admin!
    has_active_admin = (
        db.query(models.User)
        .filter(models.User.role == "admin", models.User.hashed_password != None)
        .first()
    )
    user_role = "admin" if not has_active_admin else "user"

    new_user = models.User(
        username=username,
        email=email,
        hashed_password=hash_password(payload.password),
        is_active=True,
        role=user_role,
        experience_level="intermedio",
        created_at=dt.datetime.now(dt.timezone.utc),
        updated_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Assign any orphan legacy sessions if this is the only real user
    total_users_with_pass = db.query(models.User).filter(models.User.hashed_password != None).count()
    if total_users_with_pass == 1:
        db.query(models.WorkoutSession).filter(models.WorkoutSession.user_id == None).update(
            {"user_id": new_user.id}
        )
        db.commit()

    token = create_access_token({"sub": new_user.username})
    return schemas.TokenOut(access_token=token, user=new_user)


@router.post("/login", response_model=schemas.TokenOut)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    clean_username = payload.username.strip().lower()
    user = (
        db.query(models.User)
        .filter(
            (models.User.username == clean_username)
            | (models.User.email == clean_username)
        )
        .first()
    )

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos. Si perdiste tu acceso, contactá al administrador mediante el botón de ayuda.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta cuenta se encuentra desactivada. Por favor comunicate con el administrador.",
        )

    token = create_access_token({"sub": user.username})
    return schemas.TokenOut(access_token=token, user=user)


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.get("/profile", response_model=schemas.ProfileOut)
def get_auth_profile(current_user: models.User = Depends(get_current_user)):
    return schemas.ProfileOut(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        experience_level=current_user.experience_level or "intermedio",
        bodyweight=current_user.bodyweight,
        height=current_user.height,
        training_goal=current_user.training_goal or "hipertrofia",
        updated_at=current_user.updated_at,
    )


@router.put("/profile", response_model=schemas.ProfileOut)
def update_auth_profile(
    payload: schemas.ProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.bodyweight is not None:
        if payload.bodyweight <= 0:
            raise HTTPException(status_code=400, detail="El peso corporal debe ser mayor a 0 kg.")
        current_user.bodyweight = round(payload.bodyweight, 2)

    if payload.height is not None:
        if payload.height <= 0:
            raise HTTPException(status_code=400, detail="La altura debe ser mayor a 0 cm.")
        current_user.height = round(payload.height, 2)

    if payload.training_goal is not None:
        goal = payload.training_goal.strip().lower()
        if goal not in schemas.VALID_TRAINING_GOALS:
            raise HTTPException(
                status_code=400,
                detail=f"Objetivo de entrenamiento no válido. Opciones: {', '.join(schemas.VALID_TRAINING_GOALS)}"
            )
        current_user.training_goal = goal

    if payload.experience_level is not None:
        lvl = payload.experience_level.strip().lower()
        if lvl not in ["principiante", "intermedio", "avanzado"]:
            raise HTTPException(
                status_code=400,
                detail="Nivel de experiencia no válido. Opciones: principiante, intermedio, avanzado"
            )
        current_user.experience_level = lvl

    current_user.updated_at = dt.datetime.now(dt.timezone.utc)

    # Sync user_profile row 1 for backwards compatibility
    profile = db.get(models.UserProfile, 1)
    if not profile:
        profile = models.UserProfile(
            id=1,
            experience_level=current_user.experience_level or "intermedio",
            bodyweight=current_user.bodyweight,
            height=current_user.height,
            training_goal=current_user.training_goal or "hipertrofia",
            updated_at=dt.datetime.now(dt.timezone.utc),
        )
        db.add(profile)
    else:
        profile.experience_level = current_user.experience_level or "intermedio"
        profile.bodyweight = current_user.bodyweight
        profile.height = current_user.height
        profile.training_goal = current_user.training_goal or "hipertrofia"
        profile.updated_at = dt.datetime.now(dt.timezone.utc)

    db.commit()
    db.refresh(current_user)

    return schemas.ProfileOut(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        experience_level=current_user.experience_level or "intermedio",
        bodyweight=current_user.bodyweight,
        height=current_user.height,
        training_goal=current_user.training_goal or "hipertrofia",
        updated_at=current_user.updated_at,
    )


@router.post("/support-request", response_model=schemas.SupportRequestOut)
def submit_support_request(
    payload: schemas.SupportRequestCreate,
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    username = current_user.username if current_user else payload.username
    email = current_user.email if current_user and current_user.email else payload.email

    req = models.SupportRequest(
        user_id=user_id,
        username=username,
        email=email,
        subject=payload.subject.strip(),
        message=payload.message.strip(),
        status="pending",
        created_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req
