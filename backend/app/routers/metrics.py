import datetime as dt
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user, get_optional_current_user

router = APIRouter()

# Colores de la paleta degradada sólida canónica (6 ejes del Radar)
CANONICAL_MUSCLES_CONFIG = [
    {"name": "Piernas", "color": "#9C27B0"},
    {"name": "Espalda", "color": "#C84218"},
    {"name": "Pecho", "color": "#FF5722"},
    {"name": "Hombros", "color": "#7C4DFF"},
    {"name": "Brazos", "color": "#00BCD4"},
    {"name": "Core", "color": "#4CAF50"},
]

SPANISH_MONTHS = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
]

FULL_SPANISH_MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]


def match_canonical_muscle(exercise_name: str = "", muscle_group_name: str = "") -> str | None:
    """
    Mapea estrictamente según el muscle_group real de la tabla exercises a los 6 ejes del Radar:
    [Piernas, Espalda, Pecho, Hombros, Brazos, Core].
    Los ejercicios de Bíceps y Tríceps computan al 100% en el eje de "Brazos".
    Nunca asigna "Pecho" por defecto si no corresponde.
    """
    mg = (muscle_group_name or "").strip().lower()
    if mg:
        if any(k in mg for k in ["pierna", "cuádriceps", "cuadriceps", "femoral", "isquio", "glúteo", "gluteo", "gemelo", "abductor", "aductor"]):
            return "Piernas"
        if any(k in mg for k in ["espalda", "dorsal", "trapecio"]):
            return "Espalda"
        if any(k in mg for k in ["pecho", "pectoral"]):
            return "Pecho"
        if any(k in mg for k in ["hombro", "deltoid"]):
            return "Hombros"
        if any(k in mg for k in ["brazo", "bíceps", "biceps", "bicep", "tríceps", "triceps", "tricep", "antebrazo"]):
            return "Brazos"
        if any(k in mg for k in ["core", "abdom", "lumbar", "oblicuo"]):
            return "Core"

    ex = (exercise_name or "").strip().lower()
    if not ex:
        return None
    if any(k in ex for k in ["tríceps", "triceps", "tricep", "francés", "frances", "pushdown", "patada", "katana", "bíceps", "biceps", "bicep", "curl", "martillo", "predicador", "zottman"]):
        return "Brazos"
    if any(k in ex for k in ["pierna", "leg", "sentadilla", "squat", "prensa", "femoral", "isquio", "cuádriceps", "cuadriceps", "gemelo", "hack", "hip thrust", "aductor", "abductor", "zancada", "búlgara", "bulgara"]):
        return "Piernas"
    if any(k in ex for k in ["espalda", "back", "remo", "jalón", "jalon", "dominada", "pulldown", "dorsal", "pullover", "pull over"]):
        return "Espalda"
    if any(k in ex for k in ["hombro", "shoulder", "militar", "deltoid", "vuelo lateral", "elevaciones laterales", "pájaro", "pajaro", "face pull"]):
        return "Hombros"
    if any(k in ex for k in ["core", "abs", "abdom", "plancha", "crunch", "lumbar", "rueda abdominal", "leñador", "pallof"]):
        return "Core"
    if any(k in ex for k in ["pecho", "chest", "press banca", "press plano", "press inclinado", "press declinado", "aperturas", "cruces en polea", "pec"]):
        return "Pecho"
    return None


def calculate_1rm(weight: float, reps: int) -> float:
    if weight <= 0 or reps <= 0:
        return 0.0
    if reps == 1:
        return float(weight)
    return round(float(weight) * (1.0 + float(reps) / 30.0), 1)


@router.get("/metrics/muscle-distribution", response_model=schemas.MuscleDistributionOut)
def get_muscle_distribution(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna conteo y porcentaje de series efectivas por grupo muscular
    en los últimos 30 días para el usuario activo.
    """
    thirty_days_ago = dt.date.today() - dt.timedelta(days=30)

    # 1. Buscar sesiones completadas del usuario en los últimos 30 días
    sessions = (
        db.query(models.WorkoutSession)
        .options(
            joinedload(models.WorkoutSession.muscle_group),
            joinedload(models.WorkoutSession.sets)
            .joinedload(models.WorkoutSet.exercise)
            .joinedload(models.Exercise.muscle_group),
        )
        .filter(
            models.WorkoutSession.user_id == current_user.id,
            models.WorkoutSession.date >= thirty_days_ago,
            (models.WorkoutSession.is_completed == True) | (models.WorkoutSession.status == "completed"),
        )
        .all()
    )

    # Verificar si contienen series completadas efectivas
    has_valid_sets = any(
        any(st.completed and getattr(st, "is_valid", True) for st in s.sets)
        for s in sessions
    )

    # Si no hay series en los últimos 30 días, evaluar TODAS las sesiones finalizadas del usuario
    # (independientemente de si provienen de sesión libre o de rutina)
    if not has_valid_sets:
        sessions = (
            db.query(models.WorkoutSession)
            .options(
                joinedload(models.WorkoutSession.muscle_group),
                joinedload(models.WorkoutSession.sets)
                .joinedload(models.WorkoutSet.exercise)
                .joinedload(models.Exercise.muscle_group),
            )
            .filter(
                models.WorkoutSession.user_id == current_user.id,
                (models.WorkoutSession.is_completed == True) | (models.WorkoutSession.status == "completed"),
            )
            .order_by(models.WorkoutSession.date.desc())
            .all()
        )
        has_valid_sets = any(
            any(st.completed and getattr(st, "is_valid", True) for st in s.sets)
            for s in sessions
        )

    # Si aún no hay sesiones completadas, considerar la última sesión con series completadas
    if not has_valid_sets:
        latest = (
            db.query(models.WorkoutSession)
            .options(
                joinedload(models.WorkoutSession.muscle_group),
                joinedload(models.WorkoutSession.sets)
                .joinedload(models.WorkoutSet.exercise)
                .joinedload(models.Exercise.muscle_group),
            )
            .filter(models.WorkoutSession.user_id == current_user.id)
            .order_by(models.WorkoutSession.id.desc())
            .first()
        )
        if latest and any(st.completed for st in latest.sets):
            sessions = [latest]

    counts = defaultdict(int)
    volumes = defaultdict(float)

    for s in sessions:
        for st in s.sets:
            if st.completed is False or getattr(st, "is_valid", True) is False:
                continue
            if (st.set_type or "").lower() in ["warmup", "w"]:
                continue

            ex_name = st.exercise.name if st.exercise else ""
            mg_name = ""
            if st.exercise and st.exercise.muscle_group:
                mg_name = st.exercise.muscle_group.name

            canonical = match_canonical_muscle(ex_name, mg_name)
            if not canonical:
                continue

            counts[canonical] += 1
            w = float(st.weight or 0.0)
            r = int(st.reps or 0)
            volumes[canonical] += w * r

    total_sets = sum(counts.values())
    total_volume = round(sum(volumes.values()), 1)
    all_trained_have_volume = total_volume > 0 and all(
        volumes[m] > 0 for m, c in counts.items() if c > 0
    )

    distribution_items = []
    for cfg in CANONICAL_MUSCLES_CONFIG:
        name = cfg["name"]
        color = cfg["color"]
        cnt = counts[name]
        vol = round(volumes[name], 1) if cnt > 0 else 0.0
        if cnt == 0:
            pct = 0.0
        elif all_trained_have_volume and total_volume > 0:
            pct = round((volumes[name] / total_volume) * 100, 1)
        elif total_sets > 0:
            pct = round((cnt / total_sets) * 100, 1)
        else:
            pct = 0.0

        distribution_items.append(
            schemas.MuscleDistributionItem(
                muscle_group=name,
                set_count=cnt,
                percentage=pct,
                volume=vol,
                color=color,
            )
        )

    # Ordenar por porcentaje / volumen descendente
    distribution_items.sort(key=lambda x: (x.percentage, x.volume, x.set_count), reverse=True)

    top_muscle = distribution_items[0].muscle_group if total_sets > 0 else None
    top_percentage = distribution_items[0].percentage if total_sets > 0 else 0.0

    return schemas.MuscleDistributionOut(
        total_sets=total_sets,
        total_volume=total_volume,
        top_muscle=top_muscle,
        top_percentage=top_percentage,
        distribution=distribution_items,
    )


@router.get("/metrics/exercise-history/{exercise_id}", response_model=schemas.ExerciseHistoryOut)
def get_exercise_history(
    exercise_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna fecha, peso máximo y 1RM estimado de las últimas 10 sesiones de ese ejercicio.
    """
    exercise = (
        db.query(models.Exercise)
        .options(joinedload(models.Exercise.muscle_group))
        .filter(models.Exercise.id == exercise_id)
        .first()
    )
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")

    # Obtener sesiones con sets válidos de este ejercicio realizadas por el usuario
    sets = (
        db.query(models.WorkoutSet)
        .join(models.WorkoutSession, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
        .filter(
            models.WorkoutSession.user_id == current_user.id,
            models.WorkoutSet.exercise_id == exercise_id,
            models.WorkoutSet.completed != False,
            models.WorkoutSet.is_valid != False,
        )
        .options(joinedload(models.WorkoutSet.session))
        .all()
    )

    # Agrupar por sesión
    sessions_map = defaultdict(list)
    for st in sets:
        if (st.set_type or "").lower() in ["warmup", "w"]:
            continue
        sessions_map[st.workout_session_id].append(st)

    session_history = []
    # Obtener las sesiones ordenadas por fecha
    session_ids = list(sessions_map.keys())
    if session_ids:
        sessions_db = (
            db.query(models.WorkoutSession)
            .filter(
                models.WorkoutSession.id.in_(session_ids),
                models.WorkoutSession.user_id == current_user.id,
            )
            .order_by(models.WorkoutSession.date.asc(), models.WorkoutSession.id.asc())
            .all()
        )

        for s in sessions_db:
            s_sets = sessions_map.get(s.id, [])
            if not s_sets:
                continue

            max_set = max(s_sets, key=lambda x: (x.weight or 0.0, x.reps or 0))
            max_w = round(float(max_set.weight or 0.0), 1)
            max_r = int(max_set.reps or 0)

            # Mejor 1RM de la sesión
            best_1rm = max([calculate_1rm(st.weight or 0.0, st.reps or 0) for st in s_sets] or [0.0])
            s_vol = round(sum((float(st.weight or 0.0) * int(st.reps or 0)) for st in s_sets), 1)

            month_str = SPANISH_MONTHS[s.date.month - 1]
            date_label = f"{s.date.day} {month_str}"

            session_history.append(
                schemas.ExerciseSessionHistoryItem(
                    session_id=s.id,
                    date=s.date,
                    date_label=date_label,
                    max_weight=max_w,
                    max_reps=max_r,
                    estimated_1rm=best_1rm,
                    volume=s_vol,
                    sets_count=len(s_sets),
                )
            )

    # Conservar las últimas 10 sesiones
    if len(session_history) > 10:
        session_history = session_history[-10:]

    net_progress_kg = 0.0
    net_progress_pct = 0.0
    current_max_w = 0.0
    first_max_w = 0.0

    if session_history:
        first_max_w = session_history[0].max_weight
        current_max_w = session_history[-1].max_weight
        net_progress_kg = round(current_max_w - first_max_w, 1)
        if first_max_w > 0:
            net_progress_pct = round((net_progress_kg / first_max_w) * 100, 1)

    mg_name = exercise.muscle_group.name if exercise.muscle_group else None

    return schemas.ExerciseHistoryOut(
        exercise_id=exercise.id,
        exercise_name=exercise.name,
        muscle_group_name=mg_name,
        history=session_history,
        net_progress_kg=net_progress_kg,
        net_progress_pct=net_progress_pct,
        current_max_weight=current_max_w,
        first_max_weight=first_max_w,
    )


# Leaderboard routes deactivated
def get_leaderboard(
    period: str = Query("weekly", description="daily | weekly | monthly"),
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna el ranking dinámico del gimnasio según período:
    - daily: Quienes entrenaron hoy, ordenados por tonelaje del día.
    - weekly: Últimos 7 días, días entrenados + volumen acumulado.
    - monthly: Mes activo, podio con puntos (+500, +300, +150) y bono de 16 días.
    """
    period_norm = (period or "weekly").lower()
    if period_norm not in ["daily", "weekly", "monthly"]:
        period_norm = "weekly"

    today = dt.date.today()
    month_start = dt.date(today.year, today.month, 1)
    month_name = FULL_SPANISH_MONTHS[today.month - 1]
    thirty_days_ago = today - dt.timedelta(days=30)

    if period_norm == "daily":
        start_date = today
        end_date = today
        period_label = "☀️ Hoy"
    elif period_norm == "monthly":
        start_date = month_start
        end_date = today
        period_label = "🏆 Este Mes"
    else:  # weekly
        start_date = today - dt.timedelta(days=7)
        end_date = today
        period_label = "📅 Esta Semana"

    # EXCLUSIÓN ESTRICTA DE ADMINISTRADORES EN RANKINGS:
    # WHERE users.is_admin = 0 AND users.is_active = 1
    users = (
        db.query(models.User)
        .filter(
            models.User.is_active == True,
            models.User.is_admin == False,
            models.User.role != "admin",
        )
        .all()
    )

    is_admin_user = bool(
        current_user and (getattr(current_user, "is_admin", False) or current_user.role == "admin")
    )

    # Pre-calcular récords históricos previos para conteo de PRs
    # Diccionario: (user_id, exercise_id) -> max_weight_before_period
    prev_max_weights = defaultdict(float)
    prior_sets = (
        db.query(
            models.WorkoutSession.user_id,
            models.WorkoutSet.exercise_id,
            models.WorkoutSet.weight,
        )
        .join(models.WorkoutSet, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
        .filter(
            models.WorkoutSession.date < start_date,
            models.WorkoutSet.completed != False,
            models.WorkoutSet.is_valid != False,
        )
        .all()
    )
    for u_id, ex_id, w in prior_sets:
        w_val = float(w or 0.0)
        if w_val > prev_max_weights[(u_id, ex_id)]:
            prev_max_weights[(u_id, ex_id)] = w_val

    # Calcular métricas dinámicas para cada usuario en el período seleccionado
    rank_entries = []
    constancy_list = []
    strength_list = []

    current_user_sessions_this_month = 0
    if current_user:
        # Sesiones del usuario en el mes corriente
        my_month_sessions = (
            db.query(models.WorkoutSession)
            .filter(
                models.WorkoutSession.user_id == current_user.id,
                models.WorkoutSession.date >= month_start,
                models.WorkoutSession.date <= today,
            )
            .all()
        )
        current_user_sessions_this_month = len({s.date for s in my_month_sessions})

    for u in users:
        uname = u.username or f"Usuario #{u.id}"
        display_name = uname.capitalize()
        bw = float(u.bodyweight or 75.0)
        is_me = current_user is not None and u.id == current_user.id

        # Sesiones dentro del período
        period_sessions = (
            db.query(models.WorkoutSession)
            .options(
                joinedload(models.WorkoutSession.sets)
            )
            .filter(
                models.WorkoutSession.user_id == u.id,
                models.WorkoutSession.date >= start_date,
                models.WorkoutSession.date <= end_date,
            )
            .all()
        )

        active_dates_in_period = {s.date for s in period_sessions}
        sessions_count = len(active_dates_in_period) if period_norm == "monthly" else len(period_sessions)

        total_volume = 0.0
        prs_count = 0
        seen_period_max = defaultdict(float)

        for s in period_sessions:
            for st in s.sets:
                if (
                    st.completed is False
                    or (st.set_type or "").lower() in ["warmup", "w"]
                    or getattr(st, "is_valid", True) is False
                ):
                    continue
                w_val = float(st.weight or 0.0)
                r_val = int(st.reps or 0)
                total_volume += w_val * r_val

                # Detección de nuevo récord personal en el período
                if w_val > 0:
                    prior_max = prev_max_weights.get((u.id, st.exercise_id), 0.0)
                    if w_val > prior_max and w_val > seen_period_max[(u.id, st.exercise_id)]:
                        prs_count += 1
                        seen_period_max[(u.id, st.exercise_id)] = w_val

        total_volume = round(total_volume, 1)

        rank_entries.append({
            "user_id": u.id,
            "username": uname,
            "display_name": display_name,
            "sessions_count": sessions_count,
            "total_volume_kg": total_volume,
            "prs_count": prs_count,
            "is_current_user": is_me,
        })

        # Para backward compatibility (constancia mensual y fuerza relativa 30d)
        month_sessions = (
            db.query(models.WorkoutSession)
            .filter(
                models.WorkoutSession.user_id == u.id,
                models.WorkoutSession.date >= month_start,
                models.WorkoutSession.date <= today,
            )
            .all()
        )
        month_active_days = len({s.date for s in month_sessions})
        constancy_list.append({
            "user_id": u.id,
            "username": uname,
            "display_name": display_name,
            "active_days": month_active_days,
            "total_workouts": len(month_sessions),
            "is_current_user": is_me,
        })

        sets_30d = (
            db.query(models.WorkoutSet)
            .join(models.WorkoutSession, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
            .filter(
                models.WorkoutSession.user_id == u.id,
                models.WorkoutSession.date >= thirty_days_ago,
                models.WorkoutSet.completed != False,
                models.WorkoutSet.is_valid != False,
            )
            .all()
        )
        eff_vol = sum(
            float(st.weight or 0.0) * int(st.reps or 0)
            for st in sets_30d
            if (st.set_type or "").lower() not in ["warmup", "w"]
        )
        eff_vol = round(eff_vol, 1)
        ratio = round(eff_vol / bw, 1) if bw > 0 else 0.0

        strength_list.append({
            "user_id": u.id,
            "username": uname,
            "display_name": display_name,
            "score": ratio,
            "bodyweight": bw,
            "total_effective_volume": eff_vol,
            "is_current_user": is_me,
        })

    # Criterio de ordenamiento según el período
    if period_norm == "daily":
        # Ordenar por tonelaje del día (quiénes entrenaron hoy)
        rank_entries.sort(key=lambda x: (x["total_volume_kg"], x["sessions_count"]), reverse=True)
    elif period_norm == "monthly":
        # Ordenar por días activos en el mes, luego volumen
        rank_entries.sort(key=lambda x: (x["sessions_count"], x["total_volume_kg"]), reverse=True)
    else:  # weekly
        # Ordenar por volumen acumulado en la semana, luego sesiones
        rank_entries.sort(key=lambda x: (x["total_volume_kg"], x["sessions_count"]), reverse=True)

    # Construir listado de rankings
    final_rankings = []
    for idx, item in enumerate(rank_entries, start=1):
        final_rankings.append(
            schemas.LeaderboardEntry(
                rank_position=idx,
                user_id=item["user_id"],
                username=item["username"],
                display_name=item["display_name"],
                sessions_count=item["sessions_count"],
                total_volume_kg=item["total_volume_kg"],
                prs_count=item["prs_count"],
                is_current_user=item["is_current_user"],
            )
        )

    # Legacy rankings
    constancy_list.sort(key=lambda x: (x["active_days"], x["total_workouts"]), reverse=True)
    constancy_ranking = [
        schemas.LeaderboardConstancyUser(
            rank=i,
            user_id=item["user_id"],
            username=item["username"],
            display_name=item["display_name"],
            active_days=item["active_days"],
            total_workouts=item["total_workouts"],
            is_current_user=item["is_current_user"],
        )
        for i, item in enumerate(constancy_list, start=1)
    ]

    strength_list.sort(key=lambda x: (x["score"], x["total_effective_volume"]), reverse=True)
    relative_strength_ranking = [
        schemas.LeaderboardStrengthUser(
            rank=i,
            user_id=item["user_id"],
            username=item["username"],
            display_name=item["display_name"],
            score=item["score"],
            bodyweight=item["bodyweight"],
            total_effective_volume=item["total_effective_volume"],
            is_current_user=item["is_current_user"],
        )
        for i, item in enumerate(strength_list, start=1)
    ]

    return schemas.LeaderboardOut(
        period=period_norm,
        period_label=period_label,
        current_user_id=current_user.id if current_user else None,
        is_current_user_admin=is_admin_user,
        current_user_sessions_this_month=current_user_sessions_this_month,
        rankings=final_rankings,
        month_name=month_name,
        constancy_ranking=constancy_ranking,
        relative_strength_ranking=relative_strength_ranking,
    )


@router.get("/metrics/summary")
@router.get("/metrics")
def get_user_metrics_summary(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(models.WorkoutSession)
        .filter(
            models.WorkoutSession.user_id == current_user.id,
            (models.WorkoutSession.is_completed == True) | (models.WorkoutSession.status == "completed"),
        )
        .order_by(models.WorkoutSession.date.desc(), models.WorkoutSession.id.desc())
        .all()
    )
    sets = (
        db.query(models.WorkoutSet)
        .join(models.WorkoutSession, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
        .filter(
            models.WorkoutSession.user_id == current_user.id,
            (models.WorkoutSession.is_completed == True) | (models.WorkoutSession.status == "completed"),
            models.WorkoutSet.completed == True,
            models.WorkoutSet.is_valid != False,
        )
        .all()
    )

    # Si no hay sesiones marcadas como completed pero hay series completadas registradas
    if not sets:
        sets = (
            db.query(models.WorkoutSet)
            .join(models.WorkoutSession, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
            .filter(
                models.WorkoutSession.user_id == current_user.id,
                models.WorkoutSet.completed == True,
                models.WorkoutSet.is_valid != False,
            )
            .all()
        )
        if sets and not sessions:
            s_ids = {st.workout_session_id for st in sets}
            sessions = (
                db.query(models.WorkoutSession)
                .filter(models.WorkoutSession.id.in_(s_ids))
                .order_by(models.WorkoutSession.date.desc(), models.WorkoutSession.id.desc())
                .all()
            )

    total_volume = sum(
        float(s.weight or 0) * int(s.reps or 0)
        for s in sets
        if (s.set_type or "").lower() not in ["warmup", "w"]
    )
    total_reps = sum(int(s.reps or 0) for s in sets)
    distinct_dates = {s.date for s in sessions if s.date}

    last_session_info = None
    if sessions:
        ls = sessions[0]
        ls_sets = [st for st in sets if st.workout_session_id == ls.id]
        ls_vol = sum(
            float(st.weight or 0) * int(st.reps or 0)
            for st in ls_sets
            if (st.set_type or "").lower() not in ["warmup", "w"]
        )
        last_session_info = {
            "id": ls.id,
            "date": str(ls.date),
            "total_volume": round(ls_vol, 1),
            "sets_count": len(ls_sets),
        }

    return {
        "user_id": current_user.id,
        "total_workouts": len(sessions),
        "workout_days_count": len(distinct_dates),
        "total_sets": len(sets),
        "total_reps": total_reps,
        "total_volume_kg": round(total_volume, 1),
        "last_session": last_session_info,
    }


