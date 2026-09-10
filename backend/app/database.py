from pathlib import Path

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_URL = f"sqlite:///{DATA_DIR / 'fittracker.db'}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 20},
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA busy_timeout=5000;")
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_database_migration() -> None:
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS muscle_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL UNIQUE
            )
        """))

        default_groups = ["Pecho", "Espalda", "Pierna", "Hombro", "Brazos", "Core"]
        for name in default_groups:
            connection.execute(
                text("INSERT OR IGNORE INTO muscle_groups (name) VALUES (:name)"),
                {"name": name}
            )

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                muscle_group_id INTEGER NOT NULL,
                name VARCHAR(120) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                FOREIGN KEY(muscle_group_id) REFERENCES muscle_groups(id) ON DELETE CASCADE
            )
        """))

        # Safe idempotent migrations for exercises
        exercise_cols_result = connection.execute(text("PRAGMA table_info(exercises)"))
        exercise_cols = {row[1] for row in exercise_cols_result.fetchall()}
        if "is_active" not in exercise_cols:
            connection.execute(text("ALTER TABLE exercises ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS workout_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE NOT NULL,
                muscle_group_id INTEGER,
                notes TEXT,
                FOREIGN KEY(muscle_group_id) REFERENCES muscle_groups(id) ON DELETE SET NULL
            )
        """))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS workout_sets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workout_session_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                set_number INTEGER NOT NULL DEFAULT 1,
                weight FLOAT NOT NULL DEFAULT 0.0,
                reps INTEGER NOT NULL DEFAULT 0,
                completed BOOLEAN NOT NULL DEFAULT 1,
                created_at DATETIME,
                FOREIGN KEY(workout_session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
            )
        """))

        # Safe idempotent migrations for workout_sessions
        session_cols_result = connection.execute(text("PRAGMA table_info(workout_sessions)"))
        session_cols = {row[1] for row in session_cols_result.fetchall()}

        if "status" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'completed'"))
        if "started_at" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN started_at DATETIME"))
        if "completed_at" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN completed_at DATETIME"))
        if "readiness_energy" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN readiness_energy INTEGER"))
        if "readiness_motivation" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN readiness_motivation INTEGER"))
        if "mental_effort" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN mental_effort INTEGER"))
        if "sport_type" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN sport_type VARCHAR(30) NOT NULL DEFAULT 'strength'"))
        if "distance_km" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN distance_km FLOAT"))
        if "duration_minutes" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN duration_minutes INTEGER"))
        if "pace_min_per_km" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN pace_min_per_km VARCHAR(30)"))
        if "calories_burned" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN calories_burned INTEGER"))
        if "user_id" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE"))
            connection.execute(text("UPDATE workout_sessions SET user_id = 1 WHERE user_id IS NULL"))

        # Safe idempotent migrations for workout_sets
        set_cols_result = connection.execute(text("PRAGMA table_info(workout_sets)"))
        set_cols = {row[1] for row in set_cols_result.fetchall()}
        if "created_at" not in set_cols:
            connection.execute(text("ALTER TABLE workout_sets ADD COLUMN created_at DATETIME"))
        if "rest_effort" not in set_cols:
            connection.execute(text("ALTER TABLE workout_sets ADD COLUMN rest_effort VARCHAR(30)"))

        # Support requests table
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS support_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                username VARCHAR(80),
                email VARCHAR(160),
                subject VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(30) NOT NULL DEFAULT 'pending',
                admin_notes TEXT,
                created_at DATETIME,
                resolved_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        """))

        # User Table (Backwards compatible with existing users)
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(80) UNIQUE,
                email VARCHAR(160),
                hashed_password VARCHAR(255),
                is_active BOOLEAN NOT NULL DEFAULT 1,
                role VARCHAR(20) NOT NULL DEFAULT 'user',
                experience_level VARCHAR(20) NOT NULL DEFAULT 'intermedio',
                bodyweight FLOAT,
                height FLOAT,
                training_goal VARCHAR(40) NOT NULL DEFAULT 'hipertrofia',
                created_at DATETIME,
                updated_at DATETIME
            )
        """))
        user_cols_result = connection.execute(text("PRAGMA table_info(users)"))
        user_cols = {row[1] for row in user_cols_result.fetchall()}
        if "experience_level" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN experience_level VARCHAR(20) NOT NULL DEFAULT 'intermedio'"))
        if "bodyweight" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN bodyweight FLOAT"))
        if "height" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN height FLOAT"))
        if "training_goal" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN training_goal VARCHAR(40) NOT NULL DEFAULT 'hipertrofia'"))

        connection.execute(text("""
            INSERT OR IGNORE INTO users (id, username, is_active, role, experience_level, training_goal, created_at, updated_at)
            VALUES (1, 'pablo', 1, 'admin', 'intermedio', 'hipertrofia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """))

        # Ensure at least one admin exists
        has_admin = connection.execute(text("SELECT COUNT(*) FROM users WHERE role = 'admin'")).scalar()
        if not has_admin:
            connection.execute(text("UPDATE users SET role = 'admin' WHERE id = 1"))

        # User Profile Table (experience level: principiante, intermedio, avanzado; bodyweight, height, training_goal)
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS user_profile (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                experience_level VARCHAR(20) NOT NULL DEFAULT 'intermedio',
                bodyweight FLOAT,
                height FLOAT,
                training_goal VARCHAR(40) NOT NULL DEFAULT 'hipertrofia',
                updated_at DATETIME
            )
        """))
        profile_cols_result = connection.execute(text("PRAGMA table_info(user_profile)"))
        profile_cols = {row[1] for row in profile_cols_result.fetchall()}
        if "experience_level" not in profile_cols:
            connection.execute(text("ALTER TABLE user_profile ADD COLUMN experience_level VARCHAR(20) NOT NULL DEFAULT 'intermedio'"))
        if "bodyweight" not in profile_cols:
            connection.execute(text("ALTER TABLE user_profile ADD COLUMN bodyweight FLOAT"))
        if "height" not in profile_cols:
            connection.execute(text("ALTER TABLE user_profile ADD COLUMN height FLOAT"))
        if "training_goal" not in profile_cols:
            connection.execute(text("ALTER TABLE user_profile ADD COLUMN training_goal VARCHAR(40) NOT NULL DEFAULT 'hipertrofia'"))

        connection.execute(text("""
            INSERT OR IGNORE INTO user_profile (id, experience_level, training_goal, updated_at)
            VALUES (1, 'intermedio', 'hipertrofia', CURRENT_TIMESTAMP)
        """))

        # Sync existing users level if user_profile was updated
        connection.execute(text("""
            UPDATE users SET experience_level = (
                SELECT experience_level FROM user_profile WHERE id = 1
            ) WHERE id = 1 AND EXISTS (SELECT 1 FROM user_profile WHERE id = 1)
        """))

        # Drop truly obsolete tables, keeping users and user_profile intact
        for lt in ["measurements", "photos", "routines", "routine_exercises", "personal_records", "workouts", "workout_entries"]:
            connection.execute(text(f"DROP TABLE IF EXISTS {lt}"))

        # Live Battle 1 vs 1 tables
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS live_battles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exercise_id INTEGER NOT NULL,
                creator_user_id INTEGER,
                opponent_user_id INTEGER,
                pin_code VARCHAR(10) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'waiting',
                current_turn_user_name VARCHAR(80),
                winner_user_id INTEGER,
                winner_user_name VARCHAR(80),
                target_rounds INTEGER NOT NULL DEFAULT 3,
                created_at DATETIME,
                FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
                FOREIGN KEY(creator_user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY(opponent_user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY(winner_user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        """))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS battle_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                battle_id INTEGER NOT NULL,
                user_id INTEGER,
                user_name VARCHAR(80) NOT NULL,
                bodyweight FLOAT NOT NULL,
                completed_series INTEGER NOT NULL DEFAULT 0,
                is_creator BOOLEAN NOT NULL DEFAULT 0,
                FOREIGN KEY(battle_id) REFERENCES live_battles(id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        """))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS battle_rounds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                battle_id INTEGER NOT NULL,
                participant_name VARCHAR(80) NOT NULL,
                weight_lifted FLOAT NOT NULL,
                reps INTEGER NOT NULL,
                is_validated BOOLEAN NOT NULL DEFAULT 0,
                round_number INTEGER NOT NULL DEFAULT 1,
                relative_score FLOAT NOT NULL DEFAULT 0.0,
                bodyweight_ratio FLOAT NOT NULL DEFAULT 0.0,
                created_at DATETIME,
                FOREIGN KEY(battle_id) REFERENCES live_battles(id) ON DELETE CASCADE
            )
        """))


