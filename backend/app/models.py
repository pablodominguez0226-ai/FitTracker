from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    muscle_group: Mapped[str] = mapped_column(String(80), default="General")
    min_reps: Mapped[int] = mapped_column(Integer, default=8)
    max_reps: Mapped[int] = mapped_column(Integer, default=12)
    default_sets: Mapped[int] = mapped_column(Integer, default=4)
    last_suggested_weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_global: Mapped[bool] = mapped_column(Boolean, default=False)
    user_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role: Mapped[str] = mapped_column(String(20), default="user")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Routine(Base):
    __tablename__ = "routines"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    days: Mapped[str] = mapped_column(String(80))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    exercises: Mapped[list["RoutineExercise"]] = relationship(
        back_populates="routine", cascade="all, delete-orphan", order_by="RoutineExercise.position"
    )


class RoutineExercise(Base):
    __tablename__ = "routine_exercises"
    __table_args__ = (UniqueConstraint("routine_id", "exercise_id", name="uq_routine_exercise"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    routine_id: Mapped[int] = mapped_column(ForeignKey("routines.id"))
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"))
    position: Mapped[int] = mapped_column(Integer)
    routine: Mapped[Routine] = relationship(back_populates="exercises")
    exercise: Mapped[Exercise] = relationship()


class Workout(Base):
    __tablename__ = "workouts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    routine_id: Mapped[int | None] = mapped_column(ForeignKey("routines.id"), nullable=True)
    performed_at: Mapped[date] = mapped_column(Date, default=date.today, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    routine: Mapped[Routine | None] = relationship()
    entries: Mapped[list["WorkoutEntry"]] = relationship(back_populates="workout", cascade="all, delete-orphan")


class WorkoutEntry(Base):
    __tablename__ = "workout_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    workout_id: Mapped[int] = mapped_column(ForeignKey("workouts.id"))
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"))
    set_number: Mapped[int] = mapped_column(Integer)
    weight: Mapped[float] = mapped_column(Float)
    reps: Mapped[int] = mapped_column(Integer)
    suggestion_weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    suggestion_reason: Mapped[str | None] = mapped_column(String(120), nullable=True)
    workout: Mapped[Workout] = relationship(back_populates="entries")
    exercise: Mapped[Exercise] = relationship()


class Measurement(Base):
    __tablename__ = "measurements"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    measured_at: Mapped[date] = mapped_column(Date, default=date.today, index=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    waist: Mapped[float | None] = mapped_column(Float, nullable=True)
    chest: Mapped[float | None] = mapped_column(Float, nullable=True)
    arm: Mapped[float | None] = mapped_column(Float, nullable=True)
    leg: Mapped[float | None] = mapped_column(Float, nullable=True)
    calf: Mapped[float | None] = mapped_column(Float, nullable=True)
    goal_weight: Mapped[float | None] = mapped_column(Float, nullable=True)


class ProgressPhoto(Base):
    __tablename__ = "photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    taken_at: Mapped[date] = mapped_column(Date, default=date.today, index=True)
    view: Mapped[str] = mapped_column(String(20))
    file_path: Mapped[str] = mapped_column(String(255))


class PersonalRecord(Base):
    __tablename__ = "personal_records"
    __table_args__ = (UniqueConstraint("user_id", "exercise_id", "record_type", name="uq_user_exercise_record_type"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"))
    record_type: Mapped[str] = mapped_column(String(20))
    value: Mapped[float] = mapped_column(Float)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    achieved_at: Mapped[date] = mapped_column(Date, default=date.today)
    exercise: Mapped[Exercise] = relationship()
