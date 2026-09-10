import datetime as dt

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

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

    muscle_group: Mapped[MuscleGroup] = relationship(back_populates="exercises")
    sets: Mapped[list["WorkoutSet"]] = relationship(back_populates="exercise")


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    date: Mapped[dt.date] = mapped_column(Date, default=dt.date.today, nullable=False, index=True)
    muscle_group_id: Mapped[int | None] = mapped_column(ForeignKey("muscle_groups.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False, index=True)
    started_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    readiness_energy: Mapped[int | None] = mapped_column(Integer, nullable=True)
    readiness_motivation: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mental_effort: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sport_type: Mapped[str] = mapped_column(String(30), default="strength", nullable=False, index=True)
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration_minutes: Mapped[float | None] = mapped_column(Float, nullable=True)
    pace_min_per_km: Mapped[str | None] = mapped_column(String(30), nullable=True)
    calories_burned: Mapped[float | None] = mapped_column(Float, nullable=True)

    muscle_group: Mapped[MuscleGroup | None] = relationship(back_populates="sessions")
    user: Mapped["User | None"] = relationship(back_populates="sessions")
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
    created_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)

    session: Mapped[WorkoutSession] = relationship(back_populates="sets")
    exercise: Mapped[Exercise] = relationship(back_populates="sets")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str | None] = mapped_column(String(80), unique=True, nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role: Mapped[str] = mapped_column(String(20), default="user")
    experience_level: Mapped[str] = mapped_column(String(20), default="intermedio", nullable=False)
    bodyweight: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    height: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    training_goal: Mapped[str] = mapped_column(String(40), default="hipertrofia", nullable=False)
    created_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)
    updated_at: Mapped[dt.datetime | None] = mapped_column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc), onupdate=lambda: dt.datetime.now(dt.timezone.utc), nullable=True)

    sessions: Mapped[list["WorkoutSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    support_requests: Mapped[list["SupportRequest"]] = relationship(back_populates="user")


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

