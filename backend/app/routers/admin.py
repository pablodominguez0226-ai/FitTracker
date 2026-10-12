import datetime as dt
import re
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db
from ..security import get_current_admin_user, hash_password

router = APIRouter(dependencies=[Depends(get_current_admin_user)])
VALID_ROLES = {"user", "admin"}
EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"


# ==========================================
# 1. GESTIÓN DE USUARIOS
# ==========================================

@router.get("/users", response_model=list[schemas.AdminUserStatsOut])
def list_users(db: Session = Depends(get_db)):
    users = db.query(models.User).order_by(models.User.id.asc()).all()
    results = []
    for u in users:
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
                is_admin=bool(u.is_admin),
                experience_level=u.experience_level,
                total_workouts=total_w,
                last_workout_date=last_d,
                created_at=u.created_at,
            )
        )
    return results


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


@router.put("/users/{user_id}", response_model=schemas.UserOut)
def update_user_by_admin(
    user_id: int,
    payload: schemas.AdminUserUpdate,
    current_admin: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if payload.username is not None:
        clean_u = payload.username.strip().lower()
        if len(clean_u) < 3:
            raise HTTPException(status_code=400, detail="El usuario debe tener al menos 3 caracteres.")
        if not re.match(r"^[a-z0-9_.-]+$", clean_u):
            raise HTTPException(status_code=400, detail="El usuario solo puede contener letras, números, guiones y puntos.")
        existing = db.query(models.User).filter(models.User.username == clean_u, models.User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=409, detail="El nombre de usuario ya está en uso.")
        user.username = clean_u

    if payload.email is not None:
        clean_email = payload.email.strip().lower() if payload.email.strip() else None
        if clean_email:
            if not re.match(EMAIL_REGEX, clean_email):
                raise HTTPException(status_code=400, detail="Formato de correo inválido.")
            existing_e = db.query(models.User).filter(models.User.email == clean_email, models.User.id != user_id).first()
            if existing_e:
                raise HTTPException(status_code=409, detail="El correo electrónico ya está en uso.")
        user.email = clean_email

    if payload.is_admin is not None:
        if user_id == current_admin.id and not payload.is_admin:
            other_admins = (
                db.query(models.User)
                .filter(
                    (models.User.role == "admin") | (models.User.is_admin == True),
                    models.User.id != user_id,
                    models.User.is_active == True,
                )
                .count()
            )
            if other_admins == 0:
                raise HTTPException(
                    status_code=400,
                    detail="No podés revocar tus propios permisos si sos el único administrador activo.",
                )
        user.is_admin = bool(payload.is_admin)
        user.role = "admin" if payload.is_admin else "user"
    elif payload.role is not None:
        is_adm = (payload.role.strip().lower() == "admin")
        user.role = "admin" if is_adm else "user"
        user.is_admin = is_adm

    if payload.is_active is not None:
        if user_id == current_admin.id and not payload.is_active:
            raise HTTPException(
                status_code=400,
                detail="No podés desactivar tu propia cuenta de administrador.",
            )
        user.is_active = payload.is_active

    user.updated_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user_by_admin(
    user_id: int,
    current_admin: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=400,
            detail="No podés eliminar tu propia cuenta de administrador.",
        )

    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    username = user.username or f"Usuario #{user.id}"

    # Limpiar dependencias para borrado en cascada seguro
    db.query(models.BattleParticipant).filter(models.BattleParticipant.user_id == user_id).delete()
    db.query(models.LiveBattle).filter(models.LiveBattle.creator_user_id == user_id).update({"creator_user_id": None})
    db.query(models.LiveBattle).filter(models.LiveBattle.opponent_user_id == user_id).update({"opponent_user_id": None})
    db.query(models.LiveBattle).filter(models.LiveBattle.winner_user_id == user_id).update({"winner_user_id": None})
    db.query(models.SupportRequest).filter(models.SupportRequest.user_id == user_id).delete()

    sessions = db.query(models.WorkoutSession).filter(models.WorkoutSession.user_id == user_id).all()
    for s in sessions:
        db.delete(s)

    db.delete(user)
    db.commit()

    return {"message": f"Usuario '{username}' y todos sus registros fueron eliminados correctamente."}


# Backwards compatibility for patch endpoints
@router.patch("/users/{user_id}/status", response_model=schemas.UserOut)
def update_user_status(
    user_id: int,
    payload: schemas.UserActiveUpdate,
    current_admin: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    return update_user_by_admin(
        user_id,
        schemas.AdminUserUpdate(is_active=payload.is_active),
        current_admin=current_admin,
        db=db,
    )


@router.patch("/users/{user_id}/role", response_model=schemas.UserOut)
def update_user_role(
    user_id: int,
    payload: schemas.UserRoleUpdate,
    current_admin: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    return update_user_by_admin(
        user_id,
        schemas.AdminUserUpdate(role=payload.role),
        current_admin=current_admin,
        db=db,
    )


# ==========================================
# 2. CATÁLOGO GLOBAL DE EJERCICIOS
# ==========================================

@router.post("/exercises", response_model=schemas.ExerciseOut)
def create_global_exercise(
    payload: schemas.ExerciseCreate,
    db: Session = Depends(get_db),
):
    clean_name = payload.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="El nombre del ejercicio no puede estar vacío.")

    group = db.get(models.MuscleGroup, payload.muscle_group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo muscular no encontrado.")

    existing = (
        db.query(models.Exercise)
        .filter(
            models.Exercise.muscle_group_id == payload.muscle_group_id,
            func.lower(models.Exercise.name) == clean_name.lower()
        )
        .first()
    )
    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
            db.refresh(existing)
        return schemas.ExerciseOut(
            id=existing.id,
            name=existing.name,
            muscle_group_id=existing.muscle_group_id,
            muscle_group_name=group.name,
            is_active=existing.is_active,
        )

    exercise = models.Exercise(name=clean_name, muscle_group_id=payload.muscle_group_id, is_active=True)
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return schemas.ExerciseOut(
        id=exercise.id,
        name=exercise.name,
        muscle_group_id=exercise.muscle_group_id,
        muscle_group_name=group.name,
        is_active=exercise.is_active,
    )


@router.delete("/exercises/{exercise_id}")
def delete_global_exercise(
    exercise_id: int,
    force: bool = Query(False, description="Eliminar permanentemente incluso si tiene series"),
    db: Session = Depends(get_db),
):
    exercise = db.get(models.Exercise, exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")

    sets_count = db.query(models.WorkoutSet).filter(models.WorkoutSet.exercise_id == exercise_id).count()

    if sets_count > 0:
        if force:
            db.query(models.WorkoutSet).filter(models.WorkoutSet.exercise_id == exercise_id).delete()
            db.delete(exercise)
            db.commit()
            return {
                "deleted": True,
                "archived": False,
                "message": f"Ejercicio '{exercise.name}' y sus {sets_count} series asociadas fueron eliminados permanentemente.",
            }
        else:
            exercise.is_active = False
            db.commit()
            return {
                "deleted": True,
                "archived": True,
                "message": f"Ejercicio '{exercise.name}' archivado de la lista global ({sets_count} series históricas preservadas).",
            }

    db.delete(exercise)
    db.commit()
    return {"deleted": True, "archived": False, "message": f"Ejercicio '{exercise.name}' eliminado exitosamente."}


# ==========================================
# 3. DIAGNÓSTICO Y MÉTRICAS DEL SERVIDOR
# ==========================================

@router.get("/stats", response_model=schemas.AdminStatsOut)
def get_server_stats(db: Session = Depends(get_db)):
    total_users = db.query(models.User).count()
    active_users = db.query(models.User).filter(models.User.is_active == True).count()
    total_workouts = db.query(models.WorkoutSession).count()
    total_sets = db.query(models.WorkoutSet).count()

    total_weight = (
        db.query(func.sum(models.WorkoutSet.weight * models.WorkoutSet.reps))
        .filter(models.WorkoutSet.completed == True)
        .scalar()
    ) or 0.0

    return schemas.AdminStatsOut(
        total_users=total_users,
        active_users=active_users,
        total_workouts=total_workouts,
        total_sets=total_sets,
        total_weight_lifted=round(float(total_weight), 2),
    )


# ==========================================
# 4. BUZÓN DE SOPORTE
# ==========================================

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


# ==========================================
# 5. AUDITORÍA ANTI-CHEAT Y ANOMALÍAS
# ==========================================

@router.get("/flagged-workouts", response_model=list[schemas.FlaggedWorkoutSetOut])
def get_flagged_workouts(
    db: Session = Depends(get_db),
):
    """
    Detecta y lista series sospechosas según dos criterios:
    a) El peso levantado supera 2.5x el peso corporal del usuario en básicos
       (o > 2.0x en ejercicios aislados).
    b) El salto de peso respecto a la sesión previa del mismo ejercicio sea > 15 kg.
    """
    # Consultar todas las series completadas con peso > 0 ordenadas cronológicamente
    all_sets = (
        db.query(models.WorkoutSet)
        .join(models.WorkoutSession, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
        .join(models.User, models.WorkoutSession.user_id == models.User.id)
        .join(models.Exercise, models.WorkoutSet.exercise_id == models.Exercise.id)
        .options(
            joinedload(models.WorkoutSet.session).joinedload(models.WorkoutSession.user),
            joinedload(models.WorkoutSet.exercise).joinedload(models.Exercise.muscle_group),
        )
        .filter(
            models.WorkoutSet.completed != False,
            models.WorkoutSet.weight > 0,
        )
        .order_by(
            models.WorkoutSession.user_id.asc(),
            models.WorkoutSet.exercise_id.asc(),
            models.WorkoutSession.date.asc(),
            models.WorkoutSession.id.asc(),
            models.WorkoutSet.id.asc(),
        )
        .all()
    )

    # Agrupar por (user_id, exercise_id) para calcular cronológicamente saltos respecto a la sesión anterior
    user_exercise_sessions = defaultdict(lambda: defaultdict(lambda: {"date": None, "max_w": 0.0, "sets": []}))
    for st in all_sets:
        s = st.session
        if not s or not s.user:
            continue
        u_id = s.user_id
        ex_id = st.exercise_id
        entry = user_exercise_sessions[(u_id, ex_id)][s.id]
        entry["date"] = s.date
        w = float(st.weight or 0.0)
        if w > entry["max_w"]:
            entry["max_w"] = w
        entry["sets"].append(st)

    flagged_results = []
    BASIC_EXERCISE_KEYWORDS = [
        "sentadilla", "squat", "banca", "bench", "press plano", "press banca",
        "peso muerto", "deadlift", "militar", "overhead", "press militar",
        "remo con barra", "barbell row", "hip thrust"
    ]

    # Analizar cada usuario y ejercicio
    for (u_id, ex_id), sessions_dict in user_exercise_sessions.items():
        # Ordenar sesiones cronológicamente por (date, session_id)
        sorted_sessions = sorted(sessions_dict.items(), key=lambda x: (x[1]["date"], x[0]))

        prev_session_max_weight = None

        for s_id, s_data in sorted_sessions:
            current_date = s_data["date"]
            s_sets = s_data["sets"]

            for st in s_sets:
                u = st.session.user
                ex = st.exercise
                bw = float(u.bodyweight or 75.0)
                st_weight = float(st.weight or 0.0)
                reasons = []

                # Criterio a: Peso levantado > 2.5x peso corporal en básicos (o > 2.0x en aislados)
                ex_name_lower = (ex.name or "").lower()
                is_basic = any(k in ex_name_lower for k in BASIC_EXERCISE_KEYWORDS)
                bw_ratio = round(st_weight / bw, 2) if bw > 0 else 0.0

                if is_basic and st_weight > (2.5 * bw):
                    reasons.append(f"Carga excesiva ({st_weight:g} kg > 2.5x peso corporal [{bw:g} kg])")
                elif not is_basic and st_weight > (2.0 * bw):
                    reasons.append(f"Carga desproporcionada ({st_weight:g} kg vs {bw:g} kg corporal)")

                # Criterio b: Salto de peso respecto a la sesión previa del mismo ejercicio > 15 kg
                weight_diff = None
                if prev_session_max_weight is not None and prev_session_max_weight > 0:
                    diff = round(st_weight - prev_session_max_weight, 1)
                    if diff > 15.0:
                        weight_diff = diff
                        reasons.append(f"Salto abrupto de carga (+{diff:g} kg vs sesión previa [{prev_session_max_weight:g} kg])")

                if reasons:
                    flag_reason_str = " | ".join(reasons)
                    mg_name = ex.muscle_group.name if ex.muscle_group else None
                    flagged_results.append(
                        schemas.FlaggedWorkoutSetOut(
                            set_id=st.id,
                            workout_session_id=s_id,
                            user_id=u.id,
                            username=u.username or f"Usuario #{u.id}",
                            display_name=(u.username or f"Usuario #{u.id}").capitalize(),
                            bodyweight=bw,
                            exercise_id=ex.id,
                            exercise_name=ex.name,
                            muscle_group_name=mg_name,
                            weight=st_weight,
                            reps=int(st.reps or 0),
                            date=current_date,
                            flag_reason=flag_reason_str,
                            is_valid=bool(getattr(st, "is_valid", True)),
                            previous_session_weight=prev_session_max_weight,
                            weight_diff_kg=weight_diff,
                            bw_ratio=bw_ratio,
                        )
                    )

            # Actualizar prev_session_max_weight para la siguiente sesión
            prev_session_max_weight = s_data["max_w"]

    # Ordenar por fecha descendente (las anomalías más recientes arriba)
    flagged_results.sort(key=lambda x: (x.date, x.set_id), reverse=True)
    return flagged_results





# ==========================================
# 7. ANULACIÓN Y VALIDACIÓN DE SERIES (ANTI-CHEAT)
# ==========================================

@router.put("/workouts/set/{set_id}/invalidate", response_model=schemas.WorkoutSetInvalidateOut)
def invalidate_workout_set(
    set_id: int,
    current_admin: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Invalida una serie fraudulenta o errónea para que no cuente
    en rankings, récords ni volumen.
    """
    st = db.get(models.WorkoutSet, set_id)
    if not st:
        raise HTTPException(status_code=404, detail="Serie no encontrada.")

    st.is_valid = False
    st.invalidation_reason = "Anulada por moderación administrativa (Anti-Cheat)"
    db.commit()
    return schemas.WorkoutSetInvalidateOut(
        success=True,
        set_id=set_id,
        is_valid=False,
        message=f"Serie #{set_id} anulada correctamente. No contará en rankings ni récords.",
    )


@router.put("/workouts/set/{set_id}/approve", response_model=schemas.WorkoutSetInvalidateOut)
def approve_workout_set(
    set_id: int,
    current_admin: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Aprueba y restaura una serie marcada para que vuelva a contar con normalidad.
    """
    st = db.get(models.WorkoutSet, set_id)
    if not st:
        raise HTTPException(status_code=404, detail="Serie no encontrada.")

    st.is_valid = True
    st.invalidation_reason = None
    db.commit()
    return schemas.WorkoutSetInvalidateOut(
        success=True,
        set_id=set_id,
        is_valid=True,
        message=f"Serie #{set_id} aprobada y validada correctamente.",
    )


@router.delete("/workouts/set/{set_id}", response_model=schemas.WorkoutSetInvalidateOut)
def delete_admin_workout_set(
    set_id: int,
    current_admin: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Elimina físicamente una serie del sistema.
    """
    st = db.get(models.WorkoutSet, set_id)
    if not st:
        raise HTTPException(status_code=404, detail="Serie no encontrada.")

    db.delete(st)
    db.commit()
    return schemas.WorkoutSetInvalidateOut(
        success=True,
        set_id=set_id,
        is_valid=False,
        message=f"Serie #{set_id} eliminada permanentemente del sistema.",
    )

