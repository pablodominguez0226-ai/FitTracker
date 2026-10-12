from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from .database import Base, engine, ensure_database_migration, SessionLocal
from .routers import auth, admin, muscle_groups, exercises, workouts, records, profile, analytics, tips, ai_coach, battles, routines, metrics, supplements, nutrition, checkins
from . import schemas
from .seed import seed_initial_data

Base.metadata.create_all(bind=engine)
ensure_database_migration()
with SessionLocal() as db:
    seed_initial_data(db)

app = FastAPI(title="FitTracker API", version="2.0.0")


@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=400,
        content={"detail": f"Error de restricción o integridad en base de datos: {str(exc.orig) if hasattr(exc, 'orig') else str(exc)}"},
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    return JSONResponse(
        status_code=400,
        content={"detail": f"Error en la base de datos: {str(exc.orig) if hasattr(exc, 'orig') else str(exc)}"},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(muscle_groups.router, prefix="/api/muscle-groups", tags=["muscle-groups"])
app.include_router(exercises.router, prefix="/api/exercises", tags=["exercises"])
app.include_router(routines.router, prefix="/api/routines", tags=["routines"])
app.include_router(workouts.router, prefix="/api/workouts", tags=["workouts"])
app.include_router(battles.router, prefix="/api/battles", tags=["battles"])
app.include_router(records.router, prefix="/api/records", tags=["records"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(analytics.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(tips.router, prefix="/api/tips", tags=["tips"])
app.include_router(ai_coach.router, prefix="/api/ai", tags=["ai"])
app.include_router(metrics.router, prefix="/api", tags=["metrics"])
app.include_router(supplements.router, prefix="/api/supplements", tags=["supplements"])
app.include_router(nutrition.router, prefix="/api/nutrition", tags=["nutrition"])
app.include_router(checkins.router, prefix="/api/checkins", tags=["checkins"])
app.add_api_route(
    "/api/training-guidelines",
    profile.get_training_guidelines,
    methods=["GET"],
    response_model=schemas.TrainingGuidelinesOut,
    tags=["guidelines"],
)
app.add_api_route(
    "/api/history",
    workouts.list_workouts,
    methods=["GET"],
    response_model=list[schemas.WorkoutSessionOut],
    tags=["workouts"],
)
app.add_api_route(
    "/api/workout/cycle-status",
    workouts.get_cycle_status,
    methods=["GET"],
    response_model=schemas.CycleStatusOut,
    tags=["workouts"],
)


workout_sets_router = APIRouter()
workout_sets_router.add_api_route("", workouts.record_workout_set, methods=["POST"], response_model=schemas.WorkoutSetOut)
workout_sets_router.add_api_route("/{set_id}", workouts.update_workout_set, methods=["PATCH"], response_model=schemas.WorkoutSetOut)
workout_sets_router.add_api_route("/{set_id}", workouts.delete_workout_set, methods=["DELETE"])
app.include_router(workout_sets_router, prefix="/api/workout-sets", tags=["workout-sets"])


@app.get("/api/health")
def health():
    return {"status": "ok"}

