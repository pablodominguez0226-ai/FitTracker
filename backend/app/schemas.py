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
    execution_tips: str | None = None
    target_tempo: str | None = None
    primary_muscles: str | None = None
    equipment_type: str | None = "barra"
    mechanics_type: str | None = "compuesto"
    image_url: str | None = None
    key_cue: str | None = None
    replacement_id: int | None = None


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseUpdate(BaseModel):
    name: str | None = None
    muscle_group_id: int | None = None
    execution_tips: str | None = None
    target_tempo: str | None = None
    primary_muscles: str | None = None
    equipment_type: str | None = None
    mechanics_type: str | None = None
    image_url: str | None = None
    key_cue: str | None = None
    replacement_id: int | None = None



class ExerciseOut(ExerciseBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    muscle_group_id: int
    muscle_group_name: str | None = None
    is_active: bool = True
    execution_tips: str | None = None
    target_tempo: str | None = None
    primary_muscles: str | None = None
    equipment_type: str | None = "barra"
    mechanics_type: str | None = "compuesto"
    image_url: str | None = None
    key_cue: str | None = None
    replacement_id: int | None = None


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
    session_id: int | None = None
    workout_session_id: int | None = None
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
    duration_seconds: int | None = None
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
    duration_seconds: int | None = None
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
    duration_seconds: int | None = None
    pace_min_per_km: str | None = None
    calories_burned: float | None = None


class WorkoutSessionDateUpdate(BaseModel):
    date: dt.date


class WorkoutSessionReadinessUpdate(BaseModel):
    readiness_energy: int | None = Field(None, ge=1, le=5)
    readiness_motivation: int | None = Field(None, ge=1, le=5)


class CycleStatusOut(BaseModel):
    status: str  # "overload" | "deload"
    message: str
    deload_recommended: bool = False
    fatigue_detected: bool = False
    trigger_reason: str | None = None
    failure_percentage: float = 0.0
    completion_rate: float = 100.0
    active_days_14d: int = 0

    mental_effort: int | None = Field(None, ge=1, le=5)


class WorkoutSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date: dt.date
    status: str = "completed"
    is_completed: bool = False
    started_at: dt.datetime | None = None
    completed_at: dt.datetime | None = None
    readiness_energy: int | None = None
    readiness_motivation: int | None = None
    mental_effort: int | None = None
    sport_type: str = "strength"
    distance_km: float | None = None
    duration_minutes: float | None = None
    duration_seconds: int | None = 0
    total_volume: float | None = 0.0
    pr_count: int | None = 0
    broken_records: list[dict] | None = None
    pace_min_per_km: str | None = None
    calories_burned: float | None = None
    muscle_group_id: int | None = None
    muscle_group_name: str | None = None
    user_id: int | None = None
    routine_id: int | None = None
    routine_name: str | None = None
    notes: str | None = None
    sets: list[WorkoutSetOut] = []
    previous_history: dict | None = None
    records: list[RecordOut] | None = None


VALID_TRAINING_GOALS = ["hipertrofia", "fuerza", "potencia_rapidez", "definicion_adelgazar", "powerlifting", "alto_rendimiento", "definicion"]
VALID_TARGET_GOALS = ["powerlifting", "hipertrofia", "alto_rendimiento", "definicion"]
VALID_EXPERIENCE_LEVELS = ["principiante", "intermedio", "avanzado"]
VALID_NUTRITION_CONTEXTS = ["superavit_volumen", "mantenimiento", "deficit_definicion", "no_especifica"]


class UserProfileBase(BaseModel):
    experience_level: str = "intermedio"
    bodyweight: float | None = None
    height: float | None = None
    training_goal: str = "hipertrofia"
    target_goal: str | None = "hipertrofia"
    body_fat_percentage: float | None = None
    biceps_girth: float | None = None
    waist_girth: float | None = None
    target_protein_g: float | None = None
    target_water_l: float | None = None
    nutrition_context: str | None = "no_especifica"
    supplements: str | None = None
    health_notes: str | None = None


class UserProfileUpdate(BaseModel):
    experience_level: str | None = Field(None, description="principiante, intermedio o avanzado")
    bodyweight: float | None = Field(None, ge=20.0, le=400.0, description="Peso corporal en kg")
    height: float | None = Field(None, ge=50.0, le=260.0, description="Altura en cm")
    training_goal: str | None = Field(None, description="hipertrofia, fuerza, potencia_rapidez, definicion_adelgazar")
    target_goal: str | None = Field(None, description="powerlifting, hipertrofia, alto_rendimiento, definicion")
    body_fat_percentage: float | None = Field(None, ge=1.0, le=60.0, description="Porcentaje de grasa corporal (%)")
    biceps_girth: float | None = Field(None, ge=10.0, le=80.0, description="Perímetro de bíceps en cm")
    waist_girth: float | None = Field(None, ge=30.0, le=200.0, description="Perímetro de cintura en cm")
    target_protein_g: float | None = Field(None, ge=0.0, description="Proteína diaria en g")
    target_water_l: float | None = Field(None, ge=0.0, description="Agua diaria en litros")
    nutrition_context: str | None = Field(None, description="superavit_volumen, mantenimiento, deficit_definicion, no_especifica")
    supplements: str | None = Field(None, max_length=1000, description="Suplementos habituales")
    health_notes: str | None = Field(None, max_length=5000, description="Notas de salud, lesiones y análisis")


class UserProfileOut(UserProfileBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    updated_at: dt.datetime | None = None


class ProfileUpdate(UserProfileUpdate):
    email: str | None = None


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str | None = None
    email: str | None = None
    experience_level: str = "intermedio"
    bodyweight: float | None = None
    height: float | None = None
    training_goal: str = "hipertrofia"
    target_goal: str | None = "hipertrofia"
    body_fat_percentage: float | None = None
    biceps_girth: float | None = None
    waist_girth: float | None = None
    target_protein_g: float | None = None
    target_water_l: float | None = None
    nutrition_context: str | None = "no_especifica"
    supplements: str | None = None
    health_notes: str | None = None
    updated_at: dt.datetime | None = None


class ProfileAnalyticsOut(BaseModel):
    user_id: int | None = None
    username: str | None = None
    bodyweight: float | None = None
    height: float | None = None
    body_fat_percentage: float | None = None
    biceps_girth: float | None = None
    waist_girth: float | None = None
    target_goal: str = "hipertrofia"
    lean_mass_kg: float = 0.0
    fat_mass_kg: float = 0.0
    ffmi: float = 0.0
    raw_ffmi: float = 0.0
    normalized_ffmi: float = 0.0
    max_natural_ffmi: float = 25.0
    remaining_potential_ffmi: float = 25.0
    potential_percentage: float = 0.0
    is_natural_limit_reached: bool = False
    tmb: float = 0.0
    bmr: float = 0.0
    tdee: float = 0.0
    target_protein_g: float = 0.0
    target_water_l: float = 0.0
    notes: list[str] = []


class TrainingGuidelinesOut(BaseModel):
    training_goal: str
    experience_level: str
    nutrition_context: str | None = "no_especifica"
    optimal_rep_range: str
    rest_time: str
    recommended_rir: str
    weekly_sets_per_muscle: str
    technical_recommendations: list[str]
    nutrition_advice: str
    summary: str


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(..., min_length=3, max_length=80)
    password: str = Field(..., min_length=6, max_length=256)
    email: str | None = None


UserRegister = UserCreate


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
    is_admin: bool = False
    experience_level: str = "intermedio"
    bodyweight: float | None = None
    height: float | None = None
    training_goal: str = "hipertrofia"
    target_goal: str | None = "hipertrofia"
    body_fat_percentage: float | None = None
    biceps_girth: float | None = None
    waist_girth: float | None = None
    target_protein_g: float | None = None
    target_water_l: float | None = None
    nutrition_context: str | None = "no_especifica"
    supplements: str | None = None
    health_notes: str | None = None
    created_at: dt.datetime | None = None
    updated_at: dt.datetime | None = None


UserResponse = UserOut


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


class AdminUserUpdate(BaseModel):
    username: str | None = None
    email: str | None = None
    is_admin: bool | None = None
    is_active: bool | None = None
    role: str | None = None


class AdminStatsOut(BaseModel):
    total_users: int
    active_users: int
    total_workouts: int
    total_sets: int
    total_weight_lifted: float


class ChangePasswordIn(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=256)


class ForgotPasswordIn(BaseModel):
    email: str = Field(..., min_length=3, max_length=160)


class ResetPasswordIn(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=256)


class MessageResponse(BaseModel):
    message: str


class AdminUserStatsOut(BaseModel):
    id: int
    username: str | None = None
    email: str | None = None
    is_active: bool = True
    role: str = "user"
    is_admin: bool = False
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
    pr_weight: float | None = None
    pr_reps: int | None = None
    last_weight: float | None = None
    last_reps: int | None = None
    last_date: dt.date | None = None
    improved: bool = False
    diff_weight: float | None = None


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


class ExerciseGuideOut(BaseModel):
    exercise_id: int
    exercise_name: str
    muscle_group_name: str | None = None
    primary_muscles: str | None = None
    target_tempo: str | None = None
    execution_tips: str | None = None
    key_points: list[str] = []
    setup: str | None = None
    execution: str | None = None
    breathing: str | None = None
    user_level: str = "intermedio"
    level_recommendation: str | None = None


class SuggestedGoalOut(BaseModel):
    type: str  # "overload", "deload", "standard"
    suggested_weight: float
    suggested_reps: int
    reason: str
    overload_weight: float
    overload_reps: int
    deload_weight: float
    fatigue_detected: bool = False


class ExerciseSubstituteOut(BaseModel):
    id: int
    name: str
    muscle_group_name: str | None = None
    equipment_type: str | None = None
    mechanics_type: str | None = None
    key_cue: str | None = None
    image_url: str | None = None


class ExerciseGuidanceOut(BaseModel):
    exercise_id: int
    exercise_name: str
    equipment_type: str | None = None
    mechanics_type: str | None = None
    key_cue: str | None = None
    image_url: str | None = None
    previous_1rm: float | None = None
    previous_1rm_epley: float | None = None
    previous_1rm_brzycki: float | None = None
    last_weight: float | None = None
    last_reps: int | None = None
    last_date: dt.date | None = None
    fatigue_detected: bool = False
    suggested_goal: SuggestedGoalOut
    substitute_exercise: ExerciseSubstituteOut | None = None


class RoutineExerciseIn(BaseModel):
    exercise_id: int
    order_index: int = 0
    target_sets: int = 4
    target_reps: str = "8-12"


class RoutineExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    routine_id: int
    exercise_id: int
    exercise_name: str | None = None
    muscle_group_name: str | None = None
    order_index: int = 0
    target_sets: int = 4
    target_reps: str = "8-12"


class RoutineCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = None
    exercises: list[RoutineExerciseIn] = []


class RoutineUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    exercises: list[RoutineExerciseIn] | None = None


class RoutineExercisesUpdate(BaseModel):
    exercises: list[RoutineExerciseIn]


class StartFromRoutineOut(BaseModel):
    session: WorkoutSessionOut
    routine_id: int | str | None = None
    routine_name: str | None = None
    exercises: list[dict] = []


class RoutineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int | None = None
    name: str
    description: str | None = None
    is_preset: bool = False
    created_at: dt.datetime | None = None
    exercises: list[RoutineExerciseOut] = []


class SuggestedRoutineExercise(BaseModel):
    name: str
    muscle: str
    equipment: str
    suggested_sets: int
    suggested_reps: str
    rest_seconds: int
    target_tempo: str | None = None
    execution_tips: str | None = None
    primary_muscles: str | None = None
    search_terms: list[str] = []


class SuggestedRoutine(BaseModel):
    id: str
    title: str
    category: str
    tag: str
    summary: str
    is_recommended: bool = False
    recommended_badge: str | None = None
    training_goal: str
    experience_level: str
    suggested_sets: int
    suggested_reps: str
    rest_seconds: int
    exercises: list[SuggestedRoutineExercise] = []


class SuggestedRoutinesResponse(BaseModel):
    training_goal: str
    experience_level: str
    recommended_label: str
    routines: list[SuggestedRoutine] = []


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


# --- METRICS & LEADERBOARD SCHEMAS ---

class MuscleDistributionItem(BaseModel):
    muscle_group: str
    set_count: int
    percentage: float
    volume: float = 0.0
    color: str


class MuscleDistributionOut(BaseModel):
    total_sets: int
    total_volume: float = 0.0
    top_muscle: str | None = None
    top_percentage: float = 0.0
    distribution: list[MuscleDistributionItem] = []


class ExerciseSessionHistoryItem(BaseModel):
    session_id: int
    date: dt.date
    date_label: str
    max_weight: float
    max_reps: int
    estimated_1rm: float
    volume: float
    sets_count: int


class ExerciseHistoryOut(BaseModel):
    exercise_id: int
    exercise_name: str
    muscle_group_name: str | None = None
    history: list[ExerciseSessionHistoryItem] = []
    net_progress_kg: float = 0.0
    net_progress_pct: float = 0.0
    current_max_weight: float = 0.0
    first_max_weight: float = 0.0


# --- LEADERBOARD DYNAMIC SCHEMAS ---

class LeaderboardConstancyUser(BaseModel):
    rank: int
    user_id: int
    username: str
    display_name: str
    active_days: int
    total_workouts: int
    is_current_user: bool = False


class LeaderboardStrengthUser(BaseModel):
    rank: int
    user_id: int
    username: str
    display_name: str
    score: float
    bodyweight: float
    total_effective_volume: float
    is_current_user: bool = False


class LeaderboardEntry(BaseModel):
    rank_position: int
    user_id: int
    username: str
    display_name: str
    sessions_count: int
    total_volume_kg: float
    prs_count: int = 0
    is_current_user: bool = False


class LeaderboardOut(BaseModel):
    period: str = "weekly"  # daily, weekly, monthly
    period_label: str = "Esta Semana"
    current_user_id: int | None = None
    is_current_user_admin: bool = False
    current_user_sessions_this_month: int = 0
    rankings: list[LeaderboardEntry] = []
    month_name: str = ""
    constancy_ranking: list[LeaderboardConstancyUser] = []
    relative_strength_ranking: list[LeaderboardStrengthUser] = []


# --- ADMIN ANTI-CHEAT & MODERATION SCHEMAS ---

class FlaggedWorkoutSetOut(BaseModel):
    set_id: int
    workout_session_id: int
    user_id: int
    username: str
    display_name: str
    bodyweight: float | None = None
    exercise_id: int
    exercise_name: str
    muscle_group_name: str | None = None
    weight: float
    reps: int
    date: dt.date
    flag_reason: str
    is_valid: bool = True
    previous_session_weight: float | None = None
    weight_diff_kg: float | None = None
    bw_ratio: float | None = None


class WorkoutSetInvalidateOut(BaseModel):
    success: bool = True
    set_id: int
    is_valid: bool
    message: str


# ==========================================
# 1. SUPLEMENTOS & CHECKLIST SCHEMAS
# ==========================================
class SupplementBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    dose: str = Field(..., min_length=1, max_length=80)
    timing: str = Field("mañana", description="'mañana', 'pre_entreno', 'noche'")
    is_active: bool = True


class SupplementCreate(SupplementBase):
    pass


class SupplementUpdate(BaseModel):
    name: str | None = None
    dose: str | None = None
    timing: str | None = None
    is_active: bool | None = None


class SupplementOut(SupplementBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int | None = None
    taken_today: bool = False
    created_at: dt.datetime | None = None


class SupplementToggleTodayRequest(BaseModel):
    date: dt.date | None = None
    taken: bool | None = None


class SupplementTodayItem(BaseModel):
    id: int
    name: str
    dose: str
    timing: str
    taken: bool = False


class SupplementChecklistTodayOut(BaseModel):
    date: dt.date
    total: int = 0
    completed: int = 0
    percent: int = 0
    items: list[SupplementTodayItem] = []


# ==========================================
# 2. QUÍMICA (FARMACOLOGÍA / PEDS) SCHEMAS
# ==========================================
class ChemistryCompoundBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    weekly_dose: str = Field(..., min_length=1, max_length=80)
    dose_unit: str = Field("mg", max_length=20)
    application_days: str = Field(..., min_length=1, max_length=120)  # e.g., "Lunes, Jueves"
    notes: str | None = None
    is_active: bool = True


class ChemistryCompoundCreate(ChemistryCompoundBase):
    pass


class ChemistryCompoundUpdate(BaseModel):
    name: str | None = None
    weekly_dose: str | None = None
    dose_unit: str | None = None
    application_days: str | None = None
    notes: str | None = None
    is_active: bool | None = None


class ChemistryCompoundOut(ChemistryCompoundBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    is_application_today: bool = False
    created_at: dt.datetime | None = None


# ==========================================
# 3. ANÁLISIS DE LABORATORIO SCHEMAS
# ==========================================
class LabAnalysisBase(BaseModel):
    date: dt.date
    hematocrit: float | None = None
    got_ast: float | None = None
    gpt_alt: float | None = None
    total_cholesterol: float | None = None
    hdl: float | None = None
    ldl: float | None = None
    triglycerides: float | None = None
    testosterone: float | None = None
    notes: str | None = None


class LabAnalysisCreate(LabAnalysisBase):
    pass


class LabAnalysisUpdate(BaseModel):
    date: dt.date | None = None
    hematocrit: float | None = None
    got_ast: float | None = None
    gpt_alt: float | None = None
    total_cholesterol: float | None = None
    hdl: float | None = None
    ldl: float | None = None
    triglycerides: float | None = None
    testosterone: float | None = None
    notes: str | None = None


class LabAnalysisOut(LabAnalysisBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    created_at: dt.datetime | None = None


class LabAnalysesSummaryOut(BaseModel):
    analyses: list[LabAnalysisOut] = []
    latest_date: dt.date | None = None
    days_since_last: int | None = None
    alert_level: str = "ok"  # 'ok', 'warning' (>90 days), 'critical' (>180 days or no analyses)
    alert_message: str


# ==========================================
# 4. CHECK-INS PERIÓDICOS SCHEMAS
# ==========================================
class CheckInBase(BaseModel):
    date: dt.date
    frequency: str = Field("weekly", description="'weekly', 'biweekly', 'monthly'")
    weight: float = Field(..., gt=0, lt=400)
    waist: float | None = Field(None, gt=0, lt=300)
    arm: float | None = Field(None, gt=0, lt=100)
    strength_feeling: str | None = None
    notes: str | None = None


class CheckInCreate(CheckInBase):
    pass


class CheckInHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date: dt.date
    frequency: str
    weight: float
    weight_diff: float | None = None  # +/- kg vs anterior
    waist: float | None = None
    waist_diff: float | None = None   # +/- cm vs anterior
    arm: float | None = None
    arm_diff: float | None = None     # +/- cm vs anterior
    strength_feeling: str | None = None
    notes: str | None = None
    created_at: dt.datetime | None = None


class CheckInOut(CheckInBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    created_at: dt.datetime | None = None


class CheckInStatusOut(BaseModel):
    frequency: str = "weekly"
    days_interval: int = 7
    last_checkin_date: dt.date | None = None
    days_since_last: int | None = None
    is_due: bool = False
    next_due_date: dt.date | None = None


# ==========================================
# 5. NUTRICIÓN SCHEMAS
# ==========================================
class StructuredMealItem(BaseModel):
    meal_number: int = 1
    name: str = "Comida 1"
    time: str = "08:00"
    description: str = ""
    protein_g: float | None = None
    carbs_g: float | None = None
    fats_g: float | None = None
    calories: float | None = None


class NutritionPlanBase(BaseModel):
    title: str = "Mi Plan Nutricional"
    notes: str | None = None
    meals_json: str | None = None


class NutritionPlanCreate(NutritionPlanBase):
    pass


class NutritionPlanUpdate(BaseModel):
    title: str | None = None
    notes: str | None = None
    meals_json: str | None = None


class NutritionPlanOut(NutritionPlanBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    pdf_filename: str | None = None
    pdf_url: str | None = None
    created_at: dt.datetime | None = None
    updated_at: dt.datetime | None = None


class DailyNutritionLogBase(BaseModel):
    date: dt.date
    calories_consumed: float = 0.0
    protein_consumed: float = 0.0
    carbs_consumed: float = 0.0
    fats_consumed: float = 0.0
    target_calories: float = 0.0
    target_protein: float = 0.0
    target_carbs: float = 0.0
    target_fats: float = 0.0
    notes: str | None = None


class DailyNutritionLogCreate(DailyNutritionLogBase):
    pass


class DailyNutritionLogUpdate(BaseModel):
    calories_consumed: float | None = None
    protein_consumed: float | None = None
    carbs_consumed: float | None = None
    fats_consumed: float | None = None
    target_calories: float | None = None
    target_protein: float | None = None
    target_carbs: float | None = None
    target_fats: float | None = None
    notes: str | None = None


class DailyNutritionLogOut(DailyNutritionLogBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    created_at: dt.datetime | None = None


class MacroCalculateRequest(BaseModel):
    bodyweight: float = Field(..., gt=30, lt=300)
    goal: str = Field("hipertrofia", description="'hipertrofia', 'definicion', 'mantenimiento'")
    activity_level: str = Field("moderado", description="'ligero', 'moderado', 'alto'")
    protein_per_kg: float | None = None
    fats_per_kg: float | None = None


class MacroCalculateResult(BaseModel):
    calories: int
    protein_g: int
    carbs_g: int
    fats_g: int
    protein_per_kg: float
    fats_per_kg: float
    goal: str








