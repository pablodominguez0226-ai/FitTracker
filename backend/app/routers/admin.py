import datetime as dt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import hash_password, require_admin

router = APIRouter(dependencies=[Depends(require_admin)])
VALID_ROLES = {"user", "admin"}


@router.get("/users", response_model=list[schemas.AdminUserStatsOut])
def list_users(db: Session = Depends(get_db)):
    users = db.query(models.User).order_by(models.User.id.asc()).all()
    results = []
    for u in users:
        # Workout stats
        stats = (
            db.query(
                func.count(models.WorkoutSession.id).label("total"),
                func.max(models.WorkoutSession.date).label("last_date"),
            )
            .filter(models.WorkoutSession.user_id == u.id)
            .first()
        )
        total_w = stats.total if stats else 0
        last_d = stats.last_date if stats else None

        results.append(
            schemas.AdminUserStatsOut(
                id=u.id,
                username=u.username,
                email=u.email,
                is_active=u.is_active,
                role=u.role,
                experience_level=u.experience_level,
                total_workouts=total_w,
                last_workout_date=last_d,
                created_at=u.created_at,
            )
        )
    return results


@router.patch("/users/{user_id}/status", response_model=schemas.UserOut)
def update_user_status(
    user_id: int,
    payload: schemas.UserActiveUpdate,
    current_admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == current_admin.id and not payload.is_active:
        raise HTTPException(
            status_code=400,
            detail="No podés desactivar tu propia cuenta de administrador.",
        )

    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user.is_active = payload.is_active
    user.updated_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/role", response_model=schemas.UserOut)
def update_user_role(
    user_id: int,
    payload: schemas.UserRoleUpdate,
    current_admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    role = payload.role.strip().lower()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Rol inválido. Opciones: {', '.join(VALID_ROLES)}")

    if user_id == current_admin.id and role != "admin":
        # Check if there are other admins
        other_admins = (
            db.query(models.User)
            .filter(models.User.role == "admin", models.User.id != user_id, models.User.is_active == True)
            .count()
        )
        if other_admins == 0:
            raise HTTPException(
                status_code=400,
                detail="No podés revocar tus propios permisos de administrador si sos el único administrador activo.",
            )

    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user.role = role
    user.updated_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    payload: schemas.UserPasswordReset,
    db: Session = Depends(get_db),
):
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="La nueva contraseña debe tener al menos 6 caracteres.",
        )

    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user.hashed_password = hash_password(payload.new_password)
    user.updated_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    return {"message": f"Contraseña actualizada exitosamente para '{user.username}'."}


@router.get("/support-requests", response_model=list[schemas.SupportRequestOut])
def list_support_requests(db: Session = Depends(get_db)):
    return (
        db.query(models.SupportRequest)
        .order_by(
            models.SupportRequest.status.asc(),
            models.SupportRequest.created_at.desc(),
        )
        .all()
    )


@router.patch("/support-requests/{request_id}", response_model=schemas.SupportRequestOut)
def update_support_request(
    request_id: int,
    payload: schemas.SupportRequestUpdate,
    db: Session = Depends(get_db),
):
    req = db.get(models.SupportRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada.")

    if payload.status is not None:
        req.status = payload.status
        if payload.status == "resolved":
            req.resolved_at = dt.datetime.now(dt.timezone.utc)
        else:
            req.resolved_at = None

    if payload.admin_notes is not None:
        req.admin_notes = payload.admin_notes

    db.commit()
    db.refresh(req)
    return req
