from datetime import date

from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    username: str
    password: str
    email: str | None = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: str | None = None
    is_active: bool
    role: str = "user"


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserActiveUpdate(BaseModel):
    is_active: bool


class UserRoleUpdate(BaseModel):
    role: str


class ExerciseBase(BaseModel):
    name: str
    muscle_group: str = "General"
    min_reps: int = 8
    max_reps: int = 12
    default_sets: int = 4
    last_suggested_weight: float | None = None


class ExerciseCreate(ExerciseBase):
    user_id: str | None = None


class ExerciseUpdate(BaseModel):
    name: str | None = None
    muscle_group: str | None = None
    min_reps: int | None = None
    max_reps: int | None = None
    default_sets: int | None = None
    last_suggested_weight: float | None = None
    user_id: str | None = None


class ExerciseOut(ExerciseBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_global: bool = False
    user_id: str | None = None


class RoutineExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    position: int
    exercise: ExerciseOut


class RoutineBase(BaseModel):
    name: str
    days: str


class RoutineCreate(RoutineBase):
    exercise_ids: list[int] = []


class RoutineUpdate(BaseModel):
    name: str | None = None
    days: str | None = None
    exercise_ids: list[int] | None = None


class RoutineOut(RoutineBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    exercises: list[RoutineExerciseOut] = []


class WorkoutSetIn(BaseModel):
    exercise_id: int
    set_number: int
    weight: float
    reps: int


class WorkoutCreate(BaseModel):
    routine_id: int | None = None
    performed_at: date | None = None
    notes: str | None = None
    entries: list[WorkoutSetIn]


class WorkoutEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    exercise_id: int
    set_number: int
    weight: float
    reps: int
    suggestion_weight: float | None
    suggestion_reason: str | None
    exercise: ExerciseOut


class WorkoutOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    routine_id: int | None
    performed_at: date
    notes: str | None
    entries: list[WorkoutEntryOut]


class MeasurementBase(BaseModel):
    measured_at: date | None = None
    weight: float | None = None
    waist: float | None = None
    chest: float | None = None
    arm: float | None = None
    leg: float | None = None
    calf: float | None = None
    goal_weight: float | None = None


class MeasurementCreate(MeasurementBase):
    pass


class MeasurementOut(MeasurementBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    measured_at: date


class PhotoCreate(BaseModel):
    taken_at: date | None = None
    view: str
    file_path: str


class PhotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    taken_at: date
    view: str
    file_path: str


class PersonalRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    exercise_id: int
    record_type: str
    value: float
    weight: float | None
    reps: int | None
    achieved_at: date
    exercise: ExerciseOut
