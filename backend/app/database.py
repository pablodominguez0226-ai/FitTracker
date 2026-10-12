import os
from pathlib import Path

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

db_env = os.getenv("FITTRACKER_DB_PATH")
if db_env:
    DB_PATH = Path(db_env)
    DATA_DIR = DB_PATH.parent
elif (Path(__file__).resolve().parents[2] / "data" / "fittracker.db").exists():
    DATA_DIR = Path(__file__).resolve().parents[2] / "data"
    DB_PATH = DATA_DIR / "fittracker.db"
else:
    DATA_DIR = Path(__file__).resolve().parents[1] / "data"
    DB_PATH = DATA_DIR / "fittracker.db"

DATA_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_URL = f"sqlite:///{DB_PATH}"

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

        default_groups = ["Pecho", "Espalda", "Piernas", "Hombros", "Bíceps", "Tríceps", "Core"]
        for name in default_groups:
            connection.execute(
                text("INSERT OR IGNORE INTO muscle_groups (name) VALUES (:name)"),
                {"name": name}
            )
        connection.execute(text("DELETE FROM muscle_groups WHERE LOWER(name) IN ('brazo', 'brazos')"))

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
        if "execution_tips" not in exercise_cols:
            connection.execute(text("ALTER TABLE exercises ADD COLUMN execution_tips TEXT"))
        if "target_tempo" not in exercise_cols:
            connection.execute(text("ALTER TABLE exercises ADD COLUMN target_tempo VARCHAR(100)"))
        if "primary_muscles" not in exercise_cols:
            connection.execute(text("ALTER TABLE exercises ADD COLUMN primary_muscles VARCHAR(200)"))
        if "equipment_type" not in exercise_cols:
            connection.execute(text("ALTER TABLE exercises ADD COLUMN equipment_type VARCHAR(50) DEFAULT 'barra'"))
        if "mechanics_type" not in exercise_cols:
            connection.execute(text("ALTER TABLE exercises ADD COLUMN mechanics_type VARCHAR(50) DEFAULT 'compuesto'"))
        if "image_url" not in exercise_cols:
            connection.execute(text("ALTER TABLE exercises ADD COLUMN image_url VARCHAR(255)"))
        if "key_cue" not in exercise_cols:
            connection.execute(text("ALTER TABLE exercises ADD COLUMN key_cue VARCHAR(80)"))
        if "replacement_id" not in exercise_cols:
            connection.execute(text("ALTER TABLE exercises ADD COLUMN replacement_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL"))

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
        if "is_completed" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN is_completed BOOLEAN NOT NULL DEFAULT 0"))
            connection.execute(text("UPDATE workout_sessions SET is_completed = (CASE WHEN status = 'completed' THEN 1 ELSE 0 END)"))
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
        if "duration_seconds" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN duration_seconds INTEGER DEFAULT 0"))
        if "pace_min_per_km" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN pace_min_per_km VARCHAR(30)"))
        if "calories_burned" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN calories_burned INTEGER"))
        if "user_id" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE"))
            connection.execute(text("UPDATE workout_sessions SET user_id = 1 WHERE user_id IS NULL"))
        if "routine_id" not in session_cols:
            connection.execute(text("ALTER TABLE workout_sessions ADD COLUMN routine_id INTEGER REFERENCES routines(id) ON DELETE SET NULL"))

        # Safe idempotent migrations for workout_sets
        set_cols_result = connection.execute(text("PRAGMA table_info(workout_sets)"))
        set_cols = {row[1] for row in set_cols_result.fetchall()}
        if "created_at" not in set_cols:
            connection.execute(text("ALTER TABLE workout_sets ADD COLUMN created_at DATETIME"))
        if "rest_effort" not in set_cols:
            connection.execute(text("ALTER TABLE workout_sets ADD COLUMN rest_effort VARCHAR(30)"))
        if "rir" not in set_cols:
            connection.execute(text("ALTER TABLE workout_sets ADD COLUMN rir INTEGER"))
        if "set_type" not in set_cols:
            connection.execute(text("ALTER TABLE workout_sets ADD COLUMN set_type VARCHAR(20) DEFAULT 'normal'"))
        if "is_valid" not in set_cols:
            connection.execute(text("ALTER TABLE workout_sets ADD COLUMN is_valid BOOLEAN NOT NULL DEFAULT 1"))
        if "invalidation_reason" not in set_cols:
            connection.execute(text("ALTER TABLE workout_sets ADD COLUMN invalidation_reason VARCHAR(255)"))

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
        if "email" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(160)"))
        if "reset_token" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN reset_token TEXT"))
        if "reset_token_expires" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME"))
        if "is_admin" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0"))
        connection.execute(text("UPDATE users SET is_admin = 1 WHERE role = 'admin'"))
        if "nutrition_context" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN nutrition_context VARCHAR(50) DEFAULT 'no_especifica'"))
        if "supplements" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN supplements TEXT"))
        if "health_notes" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN health_notes TEXT"))
        # Safe cleanup: Drop reward_points if still present
        if "reward_points" in user_cols:
            try:
                connection.execute(text("ALTER TABLE users DROP COLUMN reward_points"))
            except Exception:
                pass
        if "body_fat_percentage" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN body_fat_percentage FLOAT"))
        if "biceps_girth" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN biceps_girth FLOAT"))
        if "waist_girth" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN waist_girth FLOAT"))
        if "target_goal" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN target_goal VARCHAR(40) DEFAULT 'hipertrofia'"))
            connection.execute(text("UPDATE users SET target_goal = training_goal WHERE target_goal IS NULL AND training_goal IS NOT NULL"))
        if "target_protein_g" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN target_protein_g FLOAT"))
        if "target_water_l" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN target_water_l FLOAT"))

        connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL"))

        connection.execute(text("""
            INSERT OR IGNORE INTO users (id, username, is_active, role, experience_level, training_goal, created_at, updated_at)
            VALUES (1, 'pablo', 1, 'admin', 'intermedio', 'hipertrofia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """))

        # Ensure at least one admin exists
        has_admin = connection.execute(text("SELECT COUNT(*) FROM users WHERE role = 'admin'")).scalar()
        if not has_admin:
            connection.execute(text("UPDATE users SET role = 'admin' WHERE id = 1"))

        # Drop point_transactions table if exists
        connection.execute(text("DROP TABLE IF EXISTS point_transactions"))

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
        if "nutrition_context" not in profile_cols:
            connection.execute(text("ALTER TABLE user_profile ADD COLUMN nutrition_context VARCHAR(50) DEFAULT 'no_especifica'"))
        if "supplements" not in profile_cols:
            connection.execute(text("ALTER TABLE user_profile ADD COLUMN supplements TEXT"))
        if "health_notes" not in profile_cols:
            connection.execute(text("ALTER TABLE user_profile ADD COLUMN health_notes TEXT"))
        if "reward_points" in profile_cols:
            try:
                connection.execute(text("ALTER TABLE user_profile DROP COLUMN reward_points"))
            except Exception:
                pass
        if "body_fat_percentage" not in profile_cols:
            connection.execute(text("ALTER TABLE user_profile ADD COLUMN body_fat_percentage FLOAT"))
        if "biceps_girth" not in profile_cols:
            connection.execute(text("ALTER TABLE user_profile ADD COLUMN biceps_girth FLOAT"))
        if "waist_girth" not in profile_cols:
            connection.execute(text("ALTER TABLE user_profile ADD COLUMN waist_girth FLOAT"))
        if "target_goal" not in profile_cols:
            connection.execute(text("ALTER TABLE user_profile ADD COLUMN target_goal VARCHAR(40) DEFAULT 'hipertrofia'"))
            connection.execute(text("UPDATE user_profile SET target_goal = training_goal WHERE target_goal IS NULL AND training_goal IS NOT NULL"))
        if "target_protein_g" not in profile_cols:
            connection.execute(text("ALTER TABLE user_profile ADD COLUMN target_protein_g FLOAT"))
        if "target_water_l" not in profile_cols:
            connection.execute(text("ALTER TABLE user_profile ADD COLUMN target_water_l FLOAT"))

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

        # Drop truly obsolete tables, keeping users, routines, and user_profile intact
        for lt in ["measurements", "photos", "personal_records", "workouts", "workout_entries"]:
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

        # Routines Table
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS routines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name VARCHAR(120) NOT NULL,
                description TEXT,
                is_preset BOOLEAN NOT NULL DEFAULT 0,
                created_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))

        routine_cols_result = connection.execute(text("PRAGMA table_info(routines)"))
        routine_cols = {row[1] for row in routine_cols_result.fetchall()}
        if "description" not in routine_cols:
            connection.execute(text("ALTER TABLE routines ADD COLUMN description TEXT"))
        if "is_preset" not in routine_cols:
            connection.execute(text("ALTER TABLE routines ADD COLUMN is_preset BOOLEAN NOT NULL DEFAULT 0"))
        if "created_at" not in routine_cols:
            connection.execute(text("ALTER TABLE routines ADD COLUMN created_at DATETIME"))
        if "user_id" not in routine_cols:
            connection.execute(text("ALTER TABLE routines ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE"))

        # Routine Exercises Table
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS routine_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                routine_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                order_index INTEGER NOT NULL DEFAULT 0,
                target_sets INTEGER NOT NULL DEFAULT 4,
                target_reps VARCHAR(50) NOT NULL DEFAULT '8-12',
                FOREIGN KEY(routine_id) REFERENCES routines(id) ON DELETE CASCADE,
                FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
            )
        """))

        re_cols_result = connection.execute(text("PRAGMA table_info(routine_exercises)"))
        re_cols = {row[1] for row in re_cols_result.fetchall()}
        if "order_index" not in re_cols:
            connection.execute(text("ALTER TABLE routine_exercises ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0"))
        if "target_sets" not in re_cols:
            connection.execute(text("ALTER TABLE routine_exercises ADD COLUMN target_sets INTEGER NOT NULL DEFAULT 4"))
        if "target_reps" not in re_cols:
            connection.execute(text("ALTER TABLE routine_exercises ADD COLUMN target_reps VARCHAR(50) NOT NULL DEFAULT '8-12'"))

        # Supplements Table
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS supplements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name VARCHAR(120) NOT NULL,
                dose VARCHAR(80) NOT NULL,
                timing VARCHAR(50) NOT NULL DEFAULT 'mañana',
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))

        # Supplement Daily Logs Table
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS supplement_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                supplement_id INTEGER NOT NULL,
                date DATE NOT NULL,
                taken BOOLEAN NOT NULL DEFAULT 1,
                taken_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(supplement_id) REFERENCES supplements(id) ON DELETE CASCADE
            )
        """))

        # Chemistry (PEDs / Compuestos) Table
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS chemistry_compounds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name VARCHAR(120) NOT NULL,
                weekly_dose VARCHAR(80) NOT NULL,
                dose_unit VARCHAR(20) DEFAULT 'mg',
                application_days VARCHAR(120) NOT NULL,
                notes TEXT,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))

        # Lab Analyses (Análisis Clínicos) Table
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS lab_analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date DATE NOT NULL,
                hematocrit FLOAT,
                got_ast FLOAT,
                gpt_alt FLOAT,
                total_cholesterol FLOAT,
                hdl FLOAT,
                ldl FLOAT,
                triglycerides FLOAT,
                testosterone FLOAT,
                notes TEXT,
                created_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))

        # Check-Ins Table
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS check_ins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date DATE NOT NULL,
                frequency VARCHAR(20) NOT NULL DEFAULT 'weekly',
                weight FLOAT NOT NULL,
                waist FLOAT,
                arm FLOAT,
                strength_feeling VARCHAR(50),
                notes TEXT,
                created_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))

        # Nutrition Plans Table
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS nutrition_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title VARCHAR(120) DEFAULT 'Plan Nutricional',
                pdf_filename VARCHAR(255),
                pdf_url VARCHAR(500),
                notes TEXT,
                meals_json TEXT,
                created_at DATETIME,
                updated_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))

        # Daily Nutrition Logs Table
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS daily_nutrition_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date DATE NOT NULL,
                calories_consumed FLOAT DEFAULT 0,
                protein_consumed FLOAT DEFAULT 0,
                carbs_consumed FLOAT DEFAULT 0,
                fats_consumed FLOAT DEFAULT 0,
                target_calories FLOAT DEFAULT 0,
                target_protein FLOAT DEFAULT 0,
                target_carbs FLOAT DEFAULT 0,
                target_fats FLOAT DEFAULT 0,
                notes TEXT,
                created_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))

        # Check users columns for checkin_frequency
        user_cols_res = connection.execute(text("PRAGMA table_info(users)"))
        user_cols = {row[1] for row in user_cols_res.fetchall()}
        if "checkin_frequency" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN checkin_frequency VARCHAR(20) DEFAULT 'weekly'"))




