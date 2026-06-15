from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, DATA_DIR, engine, ensure_database_schema, assign_legacy_data_to_first_user, SessionLocal
from .routers import admin, auth, dashboard, exercises, measurements, photos, records, routines, workouts
from .seed import seed_initial_data

Base.metadata.create_all(bind=engine)
ensure_database_schema()
assign_legacy_data_to_first_user()
with SessionLocal() as db:
    seed_initial_data(db)

app = FastAPI(title="FitTracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PHOTO_DIR = DATA_DIR / "photos"
PHOTO_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=PHOTO_DIR), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(exercises.router, prefix="/api/exercises", tags=["exercises"])
app.include_router(routines.router, prefix="/api/routines", tags=["routines"])
app.include_router(workouts.router, prefix="/api/workouts", tags=["workouts"])
app.include_router(measurements.router, prefix="/api/measurements", tags=["measurements"])
app.include_router(photos.router, prefix="/api/photos", tags=["photos"])
app.include_router(records.router, prefix="/api/records", tags=["records"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
