from __future__ import annotations
import datetime as dt
from pydantic import BaseModel, ConfigDict, Field


class MuscleGroupBase(BaseModel):
    name: str


class MuscleGroupCreate(MuscleGroupBase):
    name: str = Field(..., min_length=1, max_length=100)


class MuscleGroupOut(MuscleGroupBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    exercise_count: int = 0


class ExerciseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    muscle_group_id: int


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseOut(ExerciseBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    muscle_group_id: int
    muscle_group_name: str | None = None
    is_active: bool = True


class WorkoutSetIn(BaseModel):
    exercise_id: int
    set_number: int = 1
    weight: float = 0.0
    reps: int = 0
    completed: bool = True
    rest_effort: str | None = None
    rir: int | None = None
    set_type: str | None = "normal"


class WorkoutSetCreate(BaseModel):
    exercise_id: int
    set_number: int = 1
    weight: float = 0.0
    reps: int = 0
    completed: bool = False
    rest_effort: str | None = None
    rir: int | None = None
    set_type: str | None = "normal"


class WorkoutSetUpdate(BaseModel):
    weight: float | None = None
    reps: int | None = None
    completed: bool | None = None
    set_number: int | None = None
    rest_effort: str | None = None
    rir: int | None = None
    set_type: str | None = None


class WorkoutSetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    workout_session_id: int
    exercise_id: int
    exercise_name: str | None = None
    set_number: int
    weight: float
    reps: int
    completed: bool
    rest_effort: str | None = None
    rir: int | None = None
    set_type: str | None = "normal"
    created_at: dt.datetime | None = None


class WorkoutCreate(BaseModel):
    date: dt.date | None = None
    muscle_group_id: int | None = None
    notes: str | None = None
    readiness_energy: int | None = Field(None, ge=1, le=5)
    readiness_motivation: int | None = Field(None, ge=1, le=5)
    mental_effort: int | None = Field(None, ge=1, le=5)
    sport_type: str = "strength"
    distance_km: float | None = None
    duration_minutes: float | None = None
    pace_min_per_km: str | None = None
    calories_burned: float | None = None
    sets: list[WorkoutSetIn] = []


class WorkoutSessionStart(BaseModel):
    date: dt.date | None = None
    muscle_group_id: int | None = None
    notes: str | None = None
    readiness_energy: int | None = Field(None, ge=1, le=5)
    readiness_motivation: int | None = Field(None, ge=1, le=5)
    sport_type: str = "strength"
    distance_km: float | None = None
    duration_minutes: float | None = None
    pace_min_per_km: str | None = None
    calories_burned: float | None = None


class WorkoutSessionFinish(BaseModel):
    date: dt.date | None = None
    notes: str | None = None
    completed_at: dt.datetime | None = None
    mental_effort: int | None = Field(None, ge=1, le=5)
    readiness_energy: int | None = Field(None, ge=1, le=5)
    readiness_motivation: int | None = Field(None, ge=1, le=5)
    sport_type: str | None = None
    distance_km: float | None = None
    duration_minutes: float | None = None
    pace_min_per_km: str | None = None
    calories_burned: float | None = None


class WorkoutSessionDateUpdate(BaseModel):
    date: dt.date


class WorkoutSessionReadinessUpdate(BaseModel):
    readiness_energy: int | None = Field(None, ge=1, le=5)
    readiness_motivation: int | None = Field(None, ge=1, le=5)
    mental_effort: int | None = Field(None, ge=1, le=5)


class WorkoutSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date: dt.date
    status: str = "completed"
    started_at: dt.datetime | None = None
    completed_at: dt.datetime | None = None
    readiness_energy: int | None = None
    readiness_motivation: int | None = None
    mental_effort: int | None = None
    sport_type: str = "strength"
    distance_km: float | None = None
    duration_minutes: float | None = None
    pace_min_per_km: str | None = None
    calories_burned: float | None = None
    muscle_group_id: int | None = None
    muscle_group_name: str | None = None
    user_id: int | None = None
    notes: str | None = None
    sets: list[WorkoutSetOut] = []
    previous_history: dict | None = None
    records: list[RecordOut] | None = None


VALID_TRAINING_GOALS = ["hipertrofia", "fuerza", "potencia_rapidez", "definicion_adelgazar"]


class UserProfileBase(BaseModel):
    experience_level: str = "intermedio"
    bodyweight: float | None = None
    height: float | None = None
    training_goal: str = "hipertrofia"


class UserProfileUpdate(BaseModel):
    experience_level: str | None = Field(None, description="principiante, intermedio o avanzado")
    bodyweight: float | None = Field(None, ge=20.0, le=400.0, description="Peso corporal en kg")
    height: float | None = Field(None, ge=50.0, le=260.0, description="Altura en cm")
    training_goal: str | None = Field(None, description="hipertrofia, fuerza, potencia_rapidez, definicion_adelgazar")


class UserProfileOut(UserProfileBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    updated_at: dt.datetime | None = None


class ProfileUpdate(UserProfileUpdate):
    pass


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str | None = None
    email: str | None = None
    experience_level: str = "intermedio"
    bodyweight: float | None = None
    height: float | None = None
    training_goal: str = "hipertrofia"
    updated_at: dt.datetime | None = None


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=80)
    password: str = Field(..., min_length=6, max_length=256)
    email: str | None = None


class UserLogin(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str | None = None
    email: str | None = None
    is_active: bool = True
    role: str = "user"
    experience_level: str = "intermedio"
    bodyweight: float | None = None
    height: float | None = None
    training_goal: str = "hipertrofia"
    created_at: dt.datetime | None = None
    updated_at: dt.datetime | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserActiveUpdate(BaseModel):
    is_active: bool


class UserRoleUpdate(BaseModel):
    role: str = Field(..., description="'user' o 'admin'")


class UserPasswordReset(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=256)


class AdminUserStatsOut(BaseModel):
    id: int
    username: str | None = None
    email: str | None = None
    is_active: bool = True
    role: str = "user"
    experience_level: str = "intermedio"
    total_workouts: int = 0
    last_workout_date: dt.date | None = None
    created_at: dt.datetime | None = None


class SupportRequestCreate(BaseModel):
    username: str | None = None
    email: str | None = None
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=5)


class SupportRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int | None = None
    username: str | None = None
    email: str | None = None
    subject: str
    message: str
    status: str = "pending"
    admin_notes: str | None = None
    created_at: dt.datetime | None = None
    resolved_at: dt.datetime | None = None


class SupportRequestUpdate(BaseModel):
    status: str | None = None
    admin_notes: str | None = None


class ExplanationItem(BaseModel):
    id: str
    topic: str
    title: str
    summary: str
    details: list[str]
    icon: str


class ExperienceLevelDetail(BaseModel):
    id: str
    title: str
    subtitle: str
    badge: str
    description: str
    topics: list[str]
    explanations: list[ExplanationItem]
    recommendations: list[str]


class ProfileExplanationsResponse(BaseModel):
    current_level: str
    levels: dict[str, ExperienceLevelDetail]



class RecordOut(BaseModel):
    exercise_id: int
    exercise_name: str
    muscle_group: str | None = None
    muscle_group_id: int | None = None
    muscle_group_name: str | None = None
    pr_weight: float | None = None
    pr_reps: int | None = None
    pr_date: dt.date | None = None
    previous_pr_weight: float | None = None
    previous_pr_date: dt.date | None = None
    best_estimated_1rm: float | None = None
    last_weight: float | None = None
    last_reps: int | None = None
    last_date: dt.date | None = None


class PreviousSessionSetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    set_number: int
    weight: float
    reps: int
    completed: bool = True


class PreviousExerciseSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    exercise_id: int
    exercise_name: str
    session_id: int
    date: dt.date
    total_volume: float
    sets: list[PreviousSessionSetOut] = []


class VolumeComparison(BaseModel):
    normal_avg_volume: float
    low_energy_avg_volume: float
    retention_percentage: float


class WeeklyConsistencyItem(BaseModel):
    week_label: str
    start_date: str
    sessions_count: int
    total_volume: float


class MuscleDistributionItem(BaseModel):
    muscle_group_id: int | None = None
    name: str
    volume: float
    percentage: float
    sessions_count: int


class DayOfWeekItem(BaseModel):
    day_name: str
    count: int


class WillpowerAchievement(BaseModel):
    session_id: int
    date: dt.date
    muscle_group_name: str | None = None
    readiness_energy: int | None = None
    readiness_motivation: int | None = None
    mental_effort: int | None = None
    total_volume: float
    sets_count: int


class AnalyticsDashboardOut(BaseModel):
    total_workouts: int
    total_volume_kg: float
    total_sets: int
    total_reps: int
    willpower_sessions_count: int
    willpower_percentage: float
    volume_comparison: VolumeComparison
    weekly_consistency: list[WeeklyConsistencyItem]
    muscle_distribution: list[MuscleDistributionItem]
    day_of_week_distribution: list[DayOfWeekItem]
    recent_willpower_sessions: list[WillpowerAchievement]


class ContextualTipOut(BaseModel):
    id: str
    category: str
    title: str
    message: str
    icon: str
    priority: int = 2


class AIWeeklyBriefingOut(BaseModel):
    period: str
    headline: str
    experience_level: str
    total_workouts: int
    total_volume_kg: float
    willpower_sessions: int
    achievements: list[str]
    willpower_analysis: str
    overload_recommendations: list[str]
    recovery_status: str
    generated_at: dt.datetime


class AIAskIn(BaseModel):
    question: str


class AIAskOut(BaseModel):
    question: str
    answer: str
    category: str
    cited_data: list[str] = []
    generated_at: dt.datetime


MuscleGroupUpdate = MuscleGroupCreate


# --- LIVE BATTLE (DUELO 1 VS 1) SCHEMAS ---

class BattleCreate(BaseModel):
    exercise_id: int
    user_name: str = Field(..., min_length=1, max_length=80)
    bodyweight: float = Field(..., gt=0, description="Peso corporal en kg")
    target_rounds: int = Field(3, ge=1, le=10)


class BattleJoin(BaseModel):
    pin_code: str = Field(..., min_length=4, max_length=10)
    user_name: str = Field(..., min_length=1, max_length=80)
    bodyweight: float = Field(..., gt=0, description="Peso corporal en kg")


class BattleRoundSubmit(BaseModel):
    weight_lifted: float = Field(..., ge=0, description="Peso levantado en kg")
    reps: int = Field(..., ge=1, description="Repeticiones logradas")


class BattleRoundValidate(BaseModel):
    round_id: int
    reps: int | None = Field(None, ge=0, description="Repeticiones limpias validadas")
    is_validated: bool = True


class BattleParticipantOut(BaseModel):
    id: int
    user_id: int | None = None
    user_name: str
    bodyweight: float
    completed_series: int
    is_creator: bool
    total_score: float = 0.0
    best_ratio: float = 0.0
    max_weight: float = 0.0


class BattleRoundOut(BaseModel):
    id: int
    participant_name: str
    weight_lifted: float
    reps: int
    is_validated: bool
    round_number: int
    relative_score: float
    bodyweight_ratio: float
    created_at: dt.datetime | None = None


class BattleOut(BaseModel):
    id: int
    exercise_id: int
    exercise_name: str
    pin_code: str
    status: str
    current_turn_user_name: str | None = None
    winner_user_name: str | None = None
    target_rounds: int = 3
    current_round: int = 1
    participants: list[BattleParticipantOut] = []
    rounds: list[BattleRoundOut] = []
    created_at: dt.datetime | None = None







