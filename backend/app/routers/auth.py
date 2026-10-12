import datetime as dt
import logging
import os
import re
import secrets
import smtplib
from email.message import EmailMessage
from fastapi import APIRouter, Depends, HTTPException, Request, status
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

logger = logging.getLogger("fittracker.auth")
router = APIRouter()
EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"


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
        raise HTTPException(status_code=409, detail="El nombre de usuario ya está registrado.")

    if email:
        existing_email = db.query(models.User).filter(models.User.email == email).first()
        if existing_email:
            raise HTTPException(status_code=409, detail="El correo electrónico ya está registrado.")

    new_user = models.User(
        username=username,
        email=email,
        hashed_password=hash_password(payload.password),
        is_active=True,
        role="user",
        is_admin=False,  # FORZAR SIEMPRE FALSE
        experience_level="intermedio",
        created_at=dt.datetime.now(dt.timezone.utc),
        updated_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": new_user.username, "is_admin": new_user.is_admin})
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

    token = create_access_token({"sub": user.username, "is_admin": user.is_admin})
    return schemas.TokenOut(access_token=token, user=user)


@router.post("/token", response_model=schemas.TokenOut)
def token_login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    return login(payload, db)


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
        target_goal=current_user.target_goal or current_user.training_goal or "hipertrofia",
        body_fat_percentage=current_user.body_fat_percentage,
        biceps_girth=current_user.biceps_girth,
        waist_girth=current_user.waist_girth,
        target_protein_g=current_user.target_protein_g,
        target_water_l=current_user.target_water_l,
        nutrition_context=current_user.nutrition_context or "no_especifica",
        supplements=current_user.supplements,
        health_notes=current_user.health_notes,
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

    if payload.target_goal is not None:
        tg = payload.target_goal.strip().lower()
        if tg in ["powerlifting", "hipertrofia", "alto_rendimiento", "definicion"]:
            current_user.target_goal = tg
            if not payload.training_goal:
                current_user.training_goal = tg

    if payload.body_fat_percentage is not None:
        current_user.body_fat_percentage = round(payload.body_fat_percentage, 1)

    if payload.biceps_girth is not None:
        current_user.biceps_girth = round(payload.biceps_girth, 1)

    if payload.waist_girth is not None:
        current_user.waist_girth = round(payload.waist_girth, 1)

    if payload.target_protein_g is not None:
        current_user.target_protein_g = round(payload.target_protein_g, 1)

    if payload.target_water_l is not None:
        current_user.target_water_l = round(payload.target_water_l, 1)

    if payload.email is not None:
        raw_email = payload.email.strip()
        if raw_email == "":
            current_user.email = None
        else:
            clean_email = raw_email.lower()
            if not re.match(EMAIL_REGEX, clean_email):
                raise HTTPException(
                    status_code=400,
                    detail="Formato de correo electrónico inválido.",
                )
            existing = (
                db.query(models.User)
                .filter(models.User.email == clean_email, models.User.id != current_user.id)
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=409,
                    detail="Este correo electrónico ya se encuentra vinculado a otra cuenta.",
                )
            current_user.email = clean_email

    if payload.experience_level is not None:
        current_user.experience_level = payload.experience_level.strip().lower()

    if payload.nutrition_context is not None:
        nc = payload.nutrition_context.strip().lower()
        if nc not in schemas.VALID_NUTRITION_CONTEXTS:
            raise HTTPException(
                status_code=400,
                detail=f"Contexto nutricional no válido. Opciones: {', '.join(schemas.VALID_NUTRITION_CONTEXTS)}"
            )
        current_user.nutrition_context = nc

    if payload.supplements is not None:
        clean_supp = payload.supplements.strip()
        current_user.supplements = clean_supp if clean_supp else None

    if payload.health_notes is not None:
        clean_health = payload.health_notes.strip()
        current_user.health_notes = clean_health if clean_health else None

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
            target_goal=current_user.target_goal or "hipertrofia",
            body_fat_percentage=current_user.body_fat_percentage,
            biceps_girth=current_user.biceps_girth,
            waist_girth=current_user.waist_girth,
            target_protein_g=current_user.target_protein_g,
            target_water_l=current_user.target_water_l,
            nutrition_context=current_user.nutrition_context or "no_especifica",
            supplements=current_user.supplements,
            health_notes=current_user.health_notes,
            updated_at=dt.datetime.now(dt.timezone.utc),
        )
        db.add(profile)
    else:
        profile.experience_level = current_user.experience_level or "intermedio"
        profile.bodyweight = current_user.bodyweight
        profile.height = current_user.height
        profile.training_goal = current_user.training_goal or "hipertrofia"
        profile.target_goal = current_user.target_goal or "hipertrofia"
        profile.body_fat_percentage = current_user.body_fat_percentage
        profile.biceps_girth = current_user.biceps_girth
        profile.waist_girth = current_user.waist_girth
        profile.target_protein_g = current_user.target_protein_g
        profile.target_water_l = current_user.target_water_l
        profile.nutrition_context = current_user.nutrition_context or "no_especifica"
        profile.supplements = current_user.supplements
        profile.health_notes = current_user.health_notes
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
        target_goal=current_user.target_goal or current_user.training_goal or "hipertrofia",
        body_fat_percentage=current_user.body_fat_percentage,
        biceps_girth=current_user.biceps_girth,
        waist_girth=current_user.waist_girth,
        target_protein_g=current_user.target_protein_g,
        target_water_l=current_user.target_water_l,
        nutrition_context=current_user.nutrition_context or "no_especifica",
        supplements=current_user.supplements,
        health_notes=current_user.health_notes,
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


@router.post("/change-password", response_model=schemas.MessageResponse)
def change_password(
    payload: schemas.ChangePasswordIn,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.hashed_password or not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="La contraseña actual ingresada es incorrecta.",
        )
    validate_password(payload.new_password)
    current_user.hashed_password = hash_password(payload.new_password)
    current_user.updated_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    return schemas.MessageResponse(message="Contraseña actualizada exitosamente.")


@router.post("/forgot-password", response_model=schemas.MessageResponse)
def forgot_password(
    payload: schemas.ForgotPasswordIn,
    request: Request,
    db: Session = Depends(get_db),
):
    clean_email = payload.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == clean_email).first()
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=1)
        db.commit()

        origin = request.headers.get("origin")
        if not origin:
            host = request.headers.get("host") or "localhost"
            proto = request.headers.get("x-forwarded-proto", "http")
            origin = f"{proto}://{host}"
        reset_link = f"{origin}/?reset_token={token}"

        # SMTP Sending
        smtp_host = os.getenv("SMTP_HOST")
        sent = False
        if smtp_host:
            try:
                smtp_port = int(os.getenv("SMTP_PORT", "587"))
                smtp_user = os.getenv("SMTP_USER")
                smtp_password = os.getenv("SMTP_PASSWORD")
                smtp_from = os.getenv("SMTP_FROM", smtp_user or "noreply@fittracker.app")

                msg = EmailMessage()
                msg["Subject"] = "Recuperación de contraseña - FitTracker"
                msg["From"] = smtp_from
                msg["To"] = user.email
                msg.set_content(
                    f"Hola {user.username},\n\n"
                    f"Recibimos una solicitud para restablecer tu contraseña en FitTracker.\n\n"
                    f"Ingresá al siguiente enlace para definir tu nueva contraseña (válido por 1 hora):\n"
                    f"{reset_link}\n\n"
                    f"Si no solicitaste este cambio, podés ignorar este correo.\n\n"
                    f"FitTracker • OLED GYM"
                )
                with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                    server.starttls()
                    if smtp_user and smtp_password:
                        server.login(smtp_user, smtp_password)
                    server.send_message(msg)
                sent = True
                logger.info(f"Correo de recuperación enviado exitosamente a {user.email}")
            except Exception as e:
                logger.warning(f"Error enviando correo SMTP a {user.email}: {e}")

        if not sent:
            logger.info(
                f"[PASSWORD RESET] Usuario: {user.username} | Token: {token} | Link: {reset_link}"
            )
            print(
                f"\n==================================================================\n"
                f"[PASSWORD RESET] Usuario: {user.username} | Token: {token}\n"
                f"Link: {reset_link}\n"
                f"==================================================================\n",
                flush=True,
            )

    return schemas.MessageResponse(
        message="Si el correo está registrado, recibirás las instrucciones de recuperación."
    )


@router.post("/reset-password", response_model=schemas.MessageResponse)
def reset_password(
    payload: schemas.ResetPasswordIn,
    db: Session = Depends(get_db),
):
    validate_password(payload.new_password)
    user = (
        db.query(models.User)
        .filter(models.User.reset_token == payload.token)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=400,
            detail="El token de recuperación no es válido o ya fue utilizado.",
        )

    now = dt.datetime.now(dt.timezone.utc)
    expires = user.reset_token_expires
    if expires:
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=dt.timezone.utc)
        if now > expires:
            user.reset_token = None
            user.reset_token_expires = None
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="El enlace de recuperación ha expirado. Por favor solicitá uno nuevo.",
            )
    else:
        raise HTTPException(
            status_code=400,
            detail="Token de recuperación no válido.",
        )

    user.hashed_password = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    user.updated_at = dt.datetime.now(dt.timezone.utc)
    db.commit()

    return schemas.MessageResponse(
        message="Contraseña restablecida correctamente. Ya podés iniciar sesión con tu nueva contraseña."
    )
