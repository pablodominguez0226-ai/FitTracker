import datetime as dt
from collections import defaultdict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter()


@router.get("/dashboard", response_model=schemas.AnalyticsDashboardOut)
@router.get("/willpower-correlation", response_model=schemas.AnalyticsDashboardOut)
def get_analytics_dashboard(
    today: dt.date | None = Query(None, description="Fecha local actual del usuario (YYYY-MM-DD)"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch completed sessions with sets, exercise, and exercise muscle_group for current user
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
            models.WorkoutSession.status == "completed",
        )
        .order_by(models.WorkoutSession.date.desc(), models.WorkoutSession.id.desc())
        .all()
    )

    total_workouts = len(sessions)
    total_sets = 0
    total_reps = 0
    total_volume_kg = 0.0

    session_volumes = {}
    willpower_sessions = []
    normal_volumes = []
    low_energy_volumes = []

    muscle_vols = defaultdict(lambda: {"volume": 0.0, "sessions": set(), "name": ""})
    dow_counts = {i: 0 for i in range(7)}

    for s in sessions:
        s_vol = 0.0
        for st in s.sets:
            total_sets += 1
            total_reps += st.reps or 0
            vol = (st.weight or 0.0) * (st.reps or 0)
            total_volume_kg += vol
            s_vol += vol

            # Attribute volume directly to the exercise's muscle group
            ex = st.exercise
            if ex and ex.muscle_group:
                mg_id = ex.muscle_group_id
                mg_name = ex.muscle_group.name
            elif s.muscle_group:
                mg_id = s.muscle_group_id
                mg_name = s.muscle_group.name
            else:
                mg_id = 0
                mg_name = "General / Mixto"

            muscle_vols[mg_id]["volume"] += vol
            muscle_vols[mg_id]["sessions"].add(s.id)
            muscle_vols[mg_id]["name"] = mg_name

        session_volumes[s.id] = s_vol

        # Check willpower condition: energy <= 2 or mental_effort >= 4
        is_wp = False
        if s.readiness_energy is not None and s.readiness_energy <= 2:
            is_wp = True
        elif s.mental_effort is not None and s.mental_effort >= 4:
            is_wp = True

        if is_wp:
            willpower_sessions.append(s)

        # Low energy vs normal energy volume
        if s.readiness_energy is not None and s.readiness_energy <= 2:
            low_energy_volumes.append(s_vol)
        else:
            normal_volumes.append(s_vol)

        # Day of week (0=Monday, 6=Sunday)
        dow_counts[s.date.weekday()] += 1

    # Willpower percentage
    wp_count = len(willpower_sessions)
    wp_pct = round((wp_count / total_workouts * 100), 1) if total_workouts > 0 else 0.0

    # Volume comparison
    norm_avg = round(sum(normal_volumes) / len(normal_volumes), 1) if normal_volumes else 0.0
    low_avg = round(sum(low_energy_volumes) / len(low_energy_volumes), 1) if low_energy_volumes else 0.0
    retention_pct = round((low_avg / norm_avg * 100), 1) if norm_avg > 0 else (100.0 if low_avg > 0 else 0.0)

    volume_comparison = schemas.VolumeComparison(
        normal_avg_volume=norm_avg,
        low_energy_avg_volume=low_avg,
        retention_percentage=retention_pct,
    )

    # Weekly consistency (last 8 calendar weeks)
    ref_today = today or dt.date.today()
    current_monday = ref_today - dt.timedelta(days=ref_today.weekday())
    weekly_items = []

    # Months in Spanish for clean OLED formatting
    spanish_months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

    for i in range(7, -1, -1):
        week_monday = current_monday - dt.timedelta(weeks=i)
        week_sunday = week_monday + dt.timedelta(days=6)

        week_sessions = [s for s in sessions if week_monday <= s.date <= week_sunday]
        week_vol = sum(session_volumes[s.id] for s in week_sessions)

        m_name = spanish_months[week_monday.month - 1]
        label = f"{week_monday.day} {m_name}"

        weekly_items.append(
            schemas.WeeklyConsistencyItem(
                week_label=label,
                start_date=week_monday.isoformat(),
                sessions_count=len(week_sessions),
                total_volume=round(week_vol, 1),
            )
        )

    # Muscle distribution
    muscle_distribution = []
    for mg_id, data in muscle_vols.items():
        pct = round(data["volume"] / total_volume_kg * 100, 1) if total_volume_kg > 0 else 0.0
        muscle_distribution.append(
            schemas.MuscleDistributionItem(
                muscle_group_id=mg_id,
                name=data["name"],
                volume=round(data["volume"], 1),
                percentage=pct,
                sessions_count=len(data["sessions"]),
            )
        )
    muscle_distribution.sort(key=lambda x: x.volume, reverse=True)

    # Day of week items
    day_names = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    dow_distribution = [
        schemas.DayOfWeekItem(day_name=day_names[i], count=dow_counts[i])
        for i in range(7)
    ]

    # Recent willpower sessions (top 5)
    recent_wp = []
    for s in willpower_sessions[:5]:
        recent_wp.append(
            schemas.WillpowerAchievement(
                session_id=s.id,
                date=s.date,
                muscle_group_name=s.muscle_group.name if s.muscle_group else None,
                readiness_energy=s.readiness_energy,
                readiness_motivation=s.readiness_motivation,
                mental_effort=s.mental_effort,
                total_volume=round(session_volumes[s.id], 1),
                sets_count=len(s.sets),
            )
        )

    return schemas.AnalyticsDashboardOut(
        total_workouts=total_workouts,
        total_volume_kg=round(total_volume_kg, 1),
        total_sets=total_sets,
        total_reps=total_reps,
        willpower_sessions_count=wp_count,
        willpower_percentage=wp_pct,
        volume_comparison=volume_comparison,
        weekly_consistency=weekly_items,
        muscle_distribution=muscle_distribution,
        day_of_week_distribution=dow_distribution,
        recent_willpower_sessions=recent_wp,
    )
