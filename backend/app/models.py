import datetime as dt

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym

from .database import Base


class MuscleGroup(Base):
    __tablename__ = "muscle_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)

    exercises: Mapped[list["Exercise"]] = relationship(
        back_populates="muscle_group", cascade="all, delete-orphan", order_by="Exercise.name"
    )
    sessions: Mapped[list["WorkoutSession"]] = relationship(
        back_populates="muscle_group"
    )


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    muscle_group_id: Mapped[int] = mapped_column(ForeignKey("muscle_groups.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    execution_tips: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_tempo: Mapped[str | None] = mapped_column(String(100), nullable=True)
    primary_muscles: Mapped[str | None] = mapped_column(String(200), nullable=True)
    equipment_type: Mapped[str | None] = mapped_column(String(50), default="barra", nullable=True)
    mechanics_type: Mapped[str | None] = mapped_column(String(50), default="compuesto", nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    key_cue: Mapped[str | None] = mapped_column(String(80), nullable=True)
    replacement_id: Mapped[int | None] = mapped_column(ForeignKey("exercises.id", ondelete="SET NULL"), nullable=True, index=True)

    muscle_group: Mapped[MuscleGroup] = relationship(back_populates="exercises")
    sets: Mapped[list["WorkoutSet"]] = relationship(back_populates="exercise")
    replacement: Mapped["Exercise | None"] = relationship("Exercise", remote_side="Exercise.id")


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    date: Mapped[dt.date] = mapped_column(Date, default=dt.date.today, nullable=False, index=True)
    muscle_group_id: Mapped[int | None] = mapped_column(ForeignKey("muscle_groups.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False, index=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="0", index=True)
    started_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    readiness_energy: Mapped[int | None] = mapped_column(Integer, nullable=True)
    readiness_motivation: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mental_effort: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sport_type: Mapped[str] = mapped_column(String(30), default="strength", nullable=False, index=True)
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration_minutes: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)
    pace_min_per_km: Mapped[str | None] = mapped_column(String(30), nullable=True)
    calories_burned: Mapped[float | None] = mapped_column(Float, nullable=True)

    muscle_group: Mapped[MuscleGroup | None] = relationship(back_populates="sessions")
    user: Mapped["User | None"] = relationship(back_populates="sessions")
    routine_id: Mapped[int | None] = mapped_column(ForeignKey("routines.id", ondelete="SET NULL"), nullable=True, index=True)
    routine: Mapped["Routine | None"] = relationship()
    sets: Mapped[list["WorkoutSet"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="WorkoutSet.id"
    )


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    workout_session_id: Mapped[int] = mapped_column(ForeignKey("workout_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id", ondelete="RESTRICT"), nullable=False, index=True)
    set_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    weight: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    reps: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    rest_effort: Mapped[str | None] = mapped_column(String(30), nullable=True)
    rir: Mapped[int | None] = mapped_column(Integer, nullable=True)
    set_type: Mapped[str] = mapped_column(String(20), default="normal", nullable=False)
    is_valid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")
    invalidation_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)

    session: Mapped[WorkoutSession] = relationship(back_populates="sets")
    exercise: Mapped[Exercise] = relationship(back_populates="sets")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str | None] = mapped_column(String(80), unique=True, nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(160), unique=True, nullable=True, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role: Mapped[str] = mapped_column(String(20), default="user")
    is_admin = Column(Boolean, default=False, nullable=False, server_default="0")
    is_admin_col = synonym("is_admin")
    experience_level: Mapped[str] = mapped_column(String(20), default="intermedio", nullable=False)
    bodyweight: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    height: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    training_goal: Mapped[str] = mapped_column(String(40), default="hipertrofia", nullable=False)
    nutrition_context: Mapped[str | None] = mapped_column(String(50), default="no_especifica", nullable=True)
    supplements: Mapped[str | None] = mapped_column(Text, nullable=True)
    health_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reset_token: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    reset_token_expires: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    body_fat_percentage: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    biceps_girth: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    waist_girth: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    target_goal: Mapped[str | None] = mapped_column(String(40), default="hipertrofia", nullable=True)
    target_protein_g: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    target_water_l: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    checkin_frequency: Mapped[str | None] = mapped_column(String(20), default="weekly", nullable=True)
    created_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)
    updated_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), onupdate=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)

    sessions: Mapped[list["WorkoutSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    support_requests: Mapped[list["SupportRequest"]] = relationship(back_populates="user")
    routines: Mapped[list["Routine"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    supplements_list: Mapped[list["Supplement"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    chemistry_compounds: Mapped[list["ChemistryCompound"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    lab_analyses: Mapped[list["LabAnalysis"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    check_ins: Mapped[list["CheckIn"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    nutrition_plans: Mapped[list["NutritionPlan"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    daily_nutrition_logs: Mapped[list["DailyNutritionLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Routine(Base):
    __tablename__ = "routines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_preset: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)

    user: Mapped["User | None"] = relationship(back_populates="routines")
    exercises: Mapped[list["RoutineExercise"]] = relationship(
        back_populates="routine", cascade="all, delete-orphan", order_by="RoutineExercise.order_index"
    )


class RoutineExercise(Base):
    __tablename__ = "routine_exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    routine_id: Mapped[int] = mapped_column(ForeignKey("routines.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False, index=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    target_sets: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    target_reps: Mapped[str] = mapped_column(String(50), default="8-12", nullable=False)

    routine: Mapped[Routine] = relationship(back_populates="exercises")
    exercise: Mapped[Exercise] = relationship()


class SupportRequest(Base):
    __tablename__ = "support_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    username: Mapped[str | None] = mapped_column(String(80), nullable=True)
    email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False, index=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)
    resolved_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped[User | None] = relationship(back_populates="support_requests")


class UserProfile(Base):
    __tablename__ = "user_profile"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    experience_level: Mapped[str] = mapped_column(String(20), default="intermedio", nullable=False)
    bodyweight: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    height: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    training_goal: Mapped[str] = mapped_column(String(40), default="hipertrofia", nullable=False)
    nutrition_context: Mapped[str | None] = mapped_column(String(50), default="no_especifica", nullable=True)
    supplements: Mapped[str | None] = mapped_column(Text, nullable=True)
    health_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    body_fat_percentage: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    biceps_girth: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    waist_girth: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    target_goal: Mapped[str | None] = mapped_column(String(40), default="hipertrofia", nullable=True)
    target_protein_g: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    target_water_l: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    updated_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), onupdate=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)


class LiveBattle(Base):
    __tablename__ = "live_battles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False, index=True)
    creator_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    opponent_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    pin_code: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="waiting", nullable=False, index=True)  # waiting, in_progress, finished
    current_turn_user_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    winner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    winner_user_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    target_rounds: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    created_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)

    exercise: Mapped[Exercise] = relationship()
    creator: Mapped[User | None] = relationship(foreign_keys=[creator_user_id])
    opponent: Mapped[User | None] = relationship(foreign_keys=[opponent_user_id])
    participants: Mapped[list["BattleParticipant"]] = relationship(
        back_populates="battle", cascade="all, delete-orphan", order_by="BattleParticipant.id"
    )
    rounds: Mapped[list["BattleRound"]] = relationship(
        back_populates="battle", cascade="all, delete-orphan", order_by="BattleRound.id"
    )


class BattleParticipant(Base):
    __tablename__ = "battle_participants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    battle_id: Mapped[int] = mapped_column(ForeignKey("live_battles.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_name: Mapped[str] = mapped_column(String(80), nullable=False)
    bodyweight: Mapped[float] = mapped_column(Float, nullable=False)  # in kg
    completed_series: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_creator: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    battle: Mapped[LiveBattle] = relationship(back_populates="participants")


class BattleRound(Base):
    __tablename__ = "battle_rounds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    battle_id: Mapped[int] = mapped_column(ForeignKey("live_battles.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_name: Mapped[str] = mapped_column(String(80), nullable=False)
    weight_lifted: Mapped[float] = mapped_column(Float, nullable=False)
    reps: Mapped[int] = mapped_column(Integer, nullable=False)
    is_validated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    round_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    relative_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    bodyweight_ratio: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)

    battle: Mapped[LiveBattle] = relationship(back_populates="rounds")


class Supplement(Base):
    __tablename__ = "supplements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    dose: Mapped[str] = mapped_column(String(80), nullable=False)
    timing: Mapped[str] = mapped_column(String(50), default="mañana", nullable=False)  # mañana, pre_entreno, noche, etc.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)

    user: Mapped["User | None"] = relationship(back_populates="supplements_list")
    logs: Mapped[list["SupplementLog"]] = relationship(back_populates="supplement", cascade="all, delete-orphan")


class SupplementLog(Base):
    __tablename__ = "supplement_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    supplement_id: Mapped[int] = mapped_column(ForeignKey("supplements.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[dt.date] = mapped_column(Date, default=dt.date.today, nullable=False, index=True)
    taken: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    taken_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)

    supplement: Mapped[Supplement] = relationship(back_populates="logs")


class ChemistryCompound(Base):
    __tablename__ = "chemistry_compounds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    weekly_dose: Mapped[str] = mapped_column(String(80), nullable=False)
    dose_unit: Mapped[str] = mapped_column(String(20), default="mg", nullable=False)
    application_days: Mapped[str] = mapped_column(String(120), nullable=False)  # e.g. "Lunes, Jueves"
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)

    user: Mapped["User"] = relationship(back_populates="chemistry_compounds")


class LabAnalysis(Base):
    __tablename__ = "lab_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[dt.date] = mapped_column(Date, default=dt.date.today, nullable=False, index=True)
    hematocrit: Mapped[float | None] = mapped_column(Float, nullable=True)
    got_ast: Mapped[float | None] = mapped_column(Float, nullable=True)
    gpt_alt: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_cholesterol: Mapped[float | None] = mapped_column(Float, nullable=True)
    hdl: Mapped[float | None] = mapped_column(Float, nullable=True)
    ldl: Mapped[float | None] = mapped_column(Float, nullable=True)
    triglycerides: Mapped[float | None] = mapped_column(Float, nullable=True)
    testosterone: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)

    user: Mapped["User"] = relationship(back_populates="lab_analyses")


class CheckIn(Base):
    __tablename__ = "check_ins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[dt.date] = mapped_column(Date, default=dt.date.today, nullable=False, index=True)
    frequency: Mapped[str] = mapped_column(String(20), default="weekly", nullable=False)  # weekly, biweekly, monthly
    weight: Mapped[float] = mapped_column(Float, nullable=False)
    waist: Mapped[float | None] = mapped_column(Float, nullable=True)
    arm: Mapped[float | None] = mapped_column(Float, nullable=True)
    strength_feeling: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)

    user: Mapped["User"] = relationship(back_populates="check_ins")


class NutritionPlan(Base):
    __tablename__ = "nutrition_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(120), default="Plan Nutricional", nullable=False)
    pdf_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pdf_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    meals_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)
    updated_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), onupdate=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)

    user: Mapped["User"] = relationship(back_populates="nutrition_plans")


class DailyNutritionLog(Base):
    __tablename__ = "daily_nutrition_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[dt.date] = mapped_column(Date, default=dt.date.today, nullable=False, index=True)
    calories_consumed: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    protein_consumed: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    carbs_consumed: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    fats_consumed: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    target_calories: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    target_protein: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    target_carbs: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    target_fats: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)

    user: Mapped["User"] = relationship(back_populates="daily_nutrition_logs")


